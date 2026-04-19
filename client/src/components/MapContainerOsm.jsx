import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import L from 'leaflet';
import { MapContainer as LeafletMap, TileLayer, Circle, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { formatTimeAgo } from '../lib/time';
import ReportModal from './ReportModal';
import ReportSidebar from './ReportSidebar';
import ReportDetailsModal from './ReportDetailsModal';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DEFAULT_CENTER = { lat: 17.385, lng: 78.4867 };
const DEFAULT_ZOOM = 12;

function toLatLngLiteral(report) {
  const lat = Number(report?.lat);
  const lng = Number(report?.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };

  const coords = report?.location?.coordinates;
  if (Array.isArray(coords) && coords.length === 2) {
    const [cLng, cLat] = coords;
    if (Number.isFinite(cLat) && Number.isFinite(cLng)) return { lat: cLat, lng: cLng };
  }
  return null;
}

function normalizeLevel(value) {
  const v = String(value || '').trim().toLowerCase();
  if (!v) return null;
  if (v === 'low') return 'Low';
  if (v === 'medium') return 'Medium';
  if (v === 'high') return 'High';

  if (v === 'ankle' || v === 'ankle level') return 'Low';
  if (v === 'knee' || v === 'knee level') return 'Medium';
  if (v === 'vehicle risk' || v === 'vehicle_risk' || v === 'vehiclerisk') return 'High';
  return null;
}

function levelStyle(level) {
  const v = normalizeLevel(level);
  if (v === 'High') return { stroke: '#ff3b30', fill: '#ff3b30', radius: 500 };
  if (v === 'Medium') return { stroke: '#facc15', fill: '#facc15', radius: 350 };
  return { stroke: '#34d399', fill: '#34d399', radius: 220 };
}

function parseLatLng(text) {
  const v = String(text || '').trim();
  const m = v.match(/^\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[3]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

async function geocodeNominatim(query) {
  const q = String(query || '').trim();
  if (!q) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
    q
  )}&countrycodes=in`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const first = Array.isArray(data) ? data[0] : null;
  const lat = Number(first?.lat);
  const lng = Number(first?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

async function reverseGeocodeNominatim({ lat, lng }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&zoom=16&addressdetails=1&lat=${encodeURIComponent(
    String(lat)
  )}&lon=${encodeURIComponent(String(lng))}`;

  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });
  if (!res.ok) return null;
  const data = await res.json();

  const a = data?.address || {};
  const primary =
    a.neighbourhood ||
    a.suburb ||
    a.village ||
    a.town ||
    a.city_district ||
    a.city ||
    a.county;

  if (primary) return String(primary);

  const display = String(data?.display_name || '').trim();
  if (!display) return null;
  return display.split(',').slice(0, 2).join(',').trim() || null;
}

function MapClickHandler({ onClick }) {
  useMapEvents({
    click(e) {
      onClick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function MapContainerOsm({
  apiBaseUrl = 'http://localhost:5000',
  auth,
  defaultOpenReportModal = false,
  onExit,
  onLogout,
}) {
  const mapRef = useRef(null);

  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [placeCache, setPlaceCache] = useState({});

  const [statusMsg, setStatusMsg] = useState('');

  const [reportModalOpen, setReportModalOpen] = useState(defaultOpenReportModal);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [originLocation, setOriginLocation] = useState(null);
  const [reportLocationQuery, setReportLocationQuery] = useState('');
  const [reportLocationHint, setReportLocationHint] = useState('');

  const [activeReport, setActiveReport] = useState(null);
  const [reportDetailsOpen, setReportDetailsOpen] = useState(false);
  const [deletingReport, setDeletingReport] = useState(false);

  const axiosClient = useMemo(() => {
    const instance = axios.create({ baseURL: apiBaseUrl });
    if (auth?.token) {
      instance.interceptors.request.use((config) => {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${auth.token}`;
        return config;
      });
    }
    return instance;
  }, [apiBaseUrl, auth?.token]);

  const enrichedReports = useMemo(() => {
    return reports.map((r) => {
      const id = r._id || `${r.lat}-${r.lng}-${r.createdAt || r.timestamp || r.time}`;
      const ts = r.createdAt || r.timestamp || r.time;
      return {
        ...r,
        _listId: id,
        timeAgo: formatTimeAgo(ts),
        placeName: placeCache[id] || r.address || '',
      };
    });
  }, [placeCache, reports]);

  useEffect(() => {
    let cancelled = false;
    const missing = enrichedReports
      .filter((r) => !r.address && !placeCache[r._listId] && toLatLngLiteral(r))
      .slice(0, 6);

    if (!missing.length) return () => {};

    (async () => {
      for (const r of missing) {
        const ll = toLatLngLiteral(r);
        if (!ll) continue;
        try {
          const name = await reverseGeocodeNominatim(ll);
          if (cancelled || !name) continue;
          setPlaceCache((prev) => ({ ...prev, [r._listId]: name }));
        } catch {
          // ignore
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enrichedReports, placeCache]);

  useEffect(() => {
    let cancelled = false;
    setLoadingReports(true);
    axiosClient
      .get('/api/reports/active')
      .then((res) => {
        if (!cancelled) setReports(res.data || []);
      })
      .catch(() => {
        if (!cancelled) setReports([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingReports(false);
      });
    return () => {
      cancelled = true;
    };
  }, [axiosClient]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const ll = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setOriginLocation(ll);
        setSelectedLocation(ll);
        mapRef.current?.setView([ll.lat, ll.lng], 13);
      },
      () => {}
    );
  }, []);

  const openReportDetails = (report) => {
    if (!report) return;
    setActiveReport(report);
    setReportDetailsOpen(true);
  };

  const focusReport = (report) => {
    const ll = toLatLngLiteral(report);
    if (!ll || !mapRef.current) return;
    mapRef.current.flyTo([ll.lat, ll.lng], 15, { duration: 0.6 });
  };

  const setReportLocationFromText = async () => {
    const q = reportLocationQuery.trim();
    if (!q) return;
    setReportLocationHint('Searching...');

    const parsed = parseLatLng(q);
    let ll = parsed;
    if (!ll) {
      try {
        ll = await geocodeNominatim(q);
      } catch {
        ll = null;
      }
    }

    if (!ll) {
      setReportLocationHint('Location not found. Try "lat,lng" or a more specific place name.');
      return;
    }

    setSelectedLocation(ll);
    mapRef.current?.setView([ll.lat, ll.lng], 14);
    setReportLocationHint(`Set to (${ll.lat.toFixed(6)}, ${ll.lng.toFixed(6)}).`);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const ll = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setOriginLocation(ll);
        setSelectedLocation(ll);
        mapRef.current?.setView([ll.lat, ll.lng], 13);
      },
      () => {}
    );
  };

  const submitReport = async ({ waterLevel, file }) => {
    if (!selectedLocation) return;
    setReportSubmitting(true);
    try {
      const address = reportLocationQuery.trim() || undefined;
      if (file) {
        const form = new FormData();
        form.append('waterLevel', waterLevel);
        form.append('lat', String(selectedLocation.lat));
        form.append('lng', String(selectedLocation.lng));
        if (address) form.append('address', address);
        form.append('image', file);
        await axiosClient.post(`/api/reports`, form);
      } else {
        await axiosClient.post(`/api/reports`, {
          waterLevel,
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
          address,
        });
      }

      const res = await axiosClient.get(`/api/reports/active`);
      setReports(res.data || []);
      setReportModalOpen(false);
      setReportLocationQuery('');
      setReportLocationHint('');
    } catch (e) {
      setStatusMsg(e?.response?.data?.msg || 'Report submit failed');
    } finally {
      setReportSubmitting(false);
    }
  };

  const deleteReport = async (report) => {
    const id = report?._id;
    if (!id) return;
    const ok = window.confirm('Delete this report? This cannot be undone.');
    if (!ok) return;

    setDeletingReport(true);
    try {
      await axiosClient.delete(`/api/reports/${id}`);
      const res = await axiosClient.get(`/api/reports/active`);
      setReports(res.data || []);
      setReportDetailsOpen(false);
      setActiveReport(null);
      setStatusMsg('Report deleted.');
    } catch (e) {
      setStatusMsg(e?.response?.data?.msg || 'Delete failed');
    } finally {
      setDeletingReport(false);
    }
  };

  useEffect(() => {
    if (defaultOpenReportModal) setReportModalOpen(true);
  }, [defaultOpenReportModal]);

  const onMapClick = (ll) => setSelectedLocation(ll);

  return (
    <div className="relative h-[calc(100vh-3.5rem)] w-full overflow-hidden">
      <LeafletMap
        center={[DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]}
        zoom={DEFAULT_ZOOM}
        maxZoom={20}
        style={{ height: '100%', width: '100%' }}
        whenCreated={(m) => {
          mapRef.current = m;
        }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          maxZoom={20}
          detectRetina
        />
        <MapClickHandler onClick={onMapClick} />

        {originLocation ? <Marker position={[originLocation.lat, originLocation.lng]} /> : null}
        {selectedLocation ? <Marker position={[selectedLocation.lat, selectedLocation.lng]} /> : null}

        {enrichedReports.map((r) => {
          const ll = toLatLngLiteral(r);
          if (!ll) return null;
          const style = levelStyle(r.waterLevel || r.intensity);
          return (
            <Circle
              key={r._listId || r._id}
              center={[ll.lat, ll.lng]}
              radius={style.radius}
              pathOptions={{ color: style.stroke, fillColor: style.fill, fillOpacity: 0.22, weight: 2 }}
              eventHandlers={{
                click: () => {
                  focusReport(r);
                  openReportDetails(r);
                },
              }}
            />
          );
        })}

      </LeafletMap>

      <div className="pointer-events-none absolute inset-0 z-[1200]">
        <div className="pointer-events-auto absolute left-4 top-4">
          <ReportSidebar
            reports={enrichedReports}
            loading={loadingReports}
            onPickReport={(r) => {
              focusReport(r);
              openReportDetails(r);
            }}
            onOpenReport={() => setReportModalOpen(true)}
            onBack={() => onExit?.()}
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={detectLocation}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Re-detect Location
            </button>
            <button
              type="button"
              onClick={() => onLogout?.()}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="pointer-events-auto absolute right-4 top-4 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-xs text-slate-700 shadow-soft backdrop-blur">
          {statusMsg || 'Click map to set report location'}
        </div>
      </div>

      <ReportModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        onSubmit={submitReport}
        location={selectedLocation}
        locationQuery={reportLocationQuery}
        onLocationQueryChange={setReportLocationQuery}
        onSetLocationFromText={setReportLocationFromText}
        locationHint={reportLocationHint}
        onDetectLocation={detectLocation}
        submitting={reportSubmitting}
      />

      <ReportDetailsModal
        open={reportDetailsOpen}
        report={activeReport}
        onClose={() => setReportDetailsOpen(false)}
        onDelete={deleteReport}
        deleting={deletingReport}
      />
    </div>
  );
}
