import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { darkMapStyle } from '../lib/darkMapStyle';
import { formatTimeAgo } from '../lib/time';
import ReportModal from './ReportModal';
import ReportSidebar from './ReportSidebar';

const DEFAULT_CENTER = { lat: 17.385, lng: 78.4867 };

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

  // Back-compat
  if (v === 'ankle' || v === 'ankle level') return 'Low';
  if (v === 'knee' || v === 'knee level') return 'Medium';
  if (v === 'vehicle risk' || v === 'vehicle_risk') return 'High';
  if (v === 'ankle' || v === 'low') return 'Low';
  if (v === 'knee' || v === 'medium') return 'Medium';
  if (v === 'vehiclerisk' || v === 'high') return 'High';
  return null;
}

function levelStyle(level) {
  const v = normalizeLevel(level);
  if (v === 'High') {
    return { stroke: '#ff3b30', fill: '#ff3b30', radius: 500 };
  }
  if (v === 'Medium') {
    return { stroke: '#facc15', fill: '#facc15', radius: 350 };
  }
  return { stroke: '#34d399', fill: '#34d399', radius: 220 };
}

function loadGoogleMaps({ apiKey }) {
  if (!apiKey) return Promise.reject(new Error('Missing REACT_APP_GOOGLE_MAPS_API_KEY'));
  if (window.google?.maps?.Map) return Promise.resolve(window.google);
  if (window.__varadhiMapsPromise) return window.__varadhiMapsPromise;

  window.__varadhiMapsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-varadhi-maps="1"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google));
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps')));
      return;
    }

    const script = document.createElement('script');
    script.dataset.varadhiMaps = '1';
    script.async = true;
    script.defer = true;
    const libs = ['geometry', 'places'].join(',');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&libraries=${encodeURIComponent(libs)}`;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });

  return window.__varadhiMapsPromise;
}

export default function MapContainer({
  apiBaseUrl = 'http://localhost:5000',
  auth,
  defaultOpenReportModal = false,
  onExit,
  onLogout,
}) {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const geocoderRef = useRef(null);
  const infoWindowRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const circlesRef = useRef([]);
  const clickListenerRef = useRef(null);
  const selectedMarkerRef = useRef(null);

  const [googleReady, setGoogleReady] = useState(false);
  const [mapsLoadError, setMapsLoadError] = useState('');

  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [placeCache, setPlaceCache] = useState({});

  const [destination, setDestination] = useState('');
  const [routeStatus, setRouteStatus] = useState('');

  const [reportModalOpen, setReportModalOpen] = useState(defaultOpenReportModal);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [originLocation, setOriginLocation] = useState(null);

  const [toasts, setToasts] = useState([]);

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

  useEffect(() => {
    let cancelled = false;
    setMapsLoadError('');
    loadGoogleMaps({ apiKey })
      .then(() => {
        if (!cancelled) setGoogleReady(true);
      })
      .catch((e) => {
        if (!cancelled) {
          setGoogleReady(false);
          setMapsLoadError(e?.message || 'Failed to load Google Maps');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const ll = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setOriginLocation(ll);
        setSelectedLocation(ll);
        mapRef.current?.panTo(ll);
      },
      () => {}
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadActive() {
      setLoadingReports(true);
      try {
        const res = await axiosClient.get(`/api/reports/active`);
        if (!cancelled) setReports(res.data || []);
      } catch {
        if (!cancelled) setReports([]);
      } finally {
        if (!cancelled) setLoadingReports(false);
      }
    }

    loadActive();
    const id = setInterval(loadActive, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [axiosClient]);

  useEffect(() => {
    if (!googleReady || !mapDivRef.current || mapRef.current) return;
    const google = window.google;

    mapRef.current = new google.maps.Map(mapDivRef.current, {
      center: DEFAULT_CENTER,
      zoom: 12,
      styles: darkMapStyle,
      disableDefaultUI: true,
      zoomControl: true,
      fullscreenControl: true,
      clickableIcons: false,
    });

    geocoderRef.current = new google.maps.Geocoder();
    infoWindowRef.current = new google.maps.InfoWindow();

    clickListenerRef.current = mapRef.current.addListener('click', (e) => {
      if (!e?.latLng) return;
      setSelectedLocation({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    });
  }, [googleReady]);

  useEffect(() => {
    if (!googleReady || !mapRef.current) return;
    const google = window.google;

    if (!selectedMarkerRef.current) {
      selectedMarkerRef.current = new google.maps.Marker({
        map: mapRef.current,
        clickable: false,
        opacity: 0.9,
      });
    }

    if (selectedLocation) {
      selectedMarkerRef.current.setPosition(selectedLocation);
      selectedMarkerRef.current.setVisible(true);
    } else {
      selectedMarkerRef.current.setVisible(false);
    }
  }, [googleReady, selectedLocation]);

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
    if (!googleReady || !geocoderRef.current) return;
    let cancelled = false;

    const toResolve = enrichedReports
      .map((r) => ({ id: r._listId, ll: toLatLngLiteral(r) }))
      .filter((x) => x.ll && !placeCache[x.id])
      .slice(0, 8);

    async function resolveAll() {
      for (const item of toResolve) {
        if (cancelled) return;
        await new Promise((resolve) => {
          geocoderRef.current.geocode({ location: item.ll }, (results, status) => {
            const formatted = status === 'OK' ? results?.[0]?.formatted_address : '';
            setPlaceCache((prev) => ({ ...prev, [item.id]: formatted || prev[item.id] || '' }));
            resolve();
          });
        });
      }
    }

    resolveAll();
    return () => {
      cancelled = true;
    };
  }, [enrichedReports, googleReady, placeCache]);

  useEffect(() => {
    if (!googleReady || !mapRef.current) return;
    const google = window.google;

    for (const c of circlesRef.current) c.setMap(null);
    circlesRef.current = [];

    for (const r of enrichedReports) {
      const ll = toLatLngLiteral(r);
      if (!ll) continue;
      const style = levelStyle(r.waterLevel || r.intensity);

      const circle = new google.maps.Circle({
        map: mapRef.current,
        center: ll,
        radius: style.radius,
        strokeColor: style.stroke,
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: style.fill,
        fillOpacity: 0.18,
        clickable: true,
      });

      circle.addListener('click', () => {
        const time = r.createdAt || r.timestamp || r.time;
        const title = r.placeName || r.address || 'Flood report';
        const img = r.imageUrl ? `<img src="${r.imageUrl}" style="width:240px;max-width:100%;border-radius:12px;margin-top:8px;" />` : '';
        const html = `
          <div style="font-family: ui-sans-serif, system-ui; max-width: 260px;">
            <div style="font-weight: 700; margin-bottom: 4px;">${title}</div>
            <div style="font-size: 12px; color: #666;">
              ${normalizeLevel(r.waterLevel || r.intensity) || ''} • ${time ? new Date(time).toLocaleString() : ''}
            </div>
            ${img}
          </div>
        `;
        infoWindowRef.current.setContent(html);
        infoWindowRef.current.setPosition(ll);
        infoWindowRef.current.open({ map: mapRef.current });
      });

      circlesRef.current.push(circle);
    }
  }, [enrichedReports, googleReady]);

  const findSafeRoute = async () => {
    if (!googleReady || !window.google) return;
    if (!destination.trim()) {
      setRouteStatus('Enter a destination.');
      return;
    }
    if (!originLocation) {
      setRouteStatus('Current location not available (allow location permission).');
      return;
    }

    const google = window.google;
    const ds = new google.maps.DirectionsService();
    setRouteStatus('Calculating route…');

    const zones = enrichedReports
      .map((r) => {
        const ll = toLatLngLiteral(r);
        if (!ll) return null;
        const style = levelStyle(r.waterLevel || r.intensity);
        const level = normalizeLevel(r.waterLevel || r.intensity);
        if (level !== 'High' && level !== 'Medium') return null;
        return { center: new google.maps.LatLng(ll.lat, ll.lng), radius: style.radius, level };
      })
      .filter(Boolean);

    const intersectsZones = (route) => {
      const path = route?.overview_path || [];
      for (const p of path) {
        for (const z of zones) {
          const d = google.maps.geometry.spherical.computeDistanceBetween(p, z.center);
          if (d <= z.radius) return true;
        }
      }
      return false;
    };

    ds.route(
      {
        origin: originLocation,
        destination: destination.trim(),
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true,
      },
      (result, status) => {
        if (status !== 'OK' || !result?.routes?.length) {
          if (status === 'REQUEST_DENIED') {
            setRouteStatus(
              'Directions failed: REQUEST_DENIED. Enable billing + Directions API in Google Cloud, and ensure your API key allows Maps JavaScript API requests from http://localhost:3000.'
            );
          } else if (status === 'OVER_QUERY_LIMIT') {
            setRouteStatus(
              'Directions failed: OVER_QUERY_LIMIT. Try again later or use a different Google API key/project.'
            );
          } else {
            setRouteStatus(`Directions failed: ${status}`);
          }
          return;
        }

        let chosen = 0;
        let foundSafe = false;
        for (let i = 0; i < result.routes.length; i += 1) {
          if (!intersectsZones(result.routes[i])) {
            chosen = i;
            foundSafe = true;
            break;
          }
        }

        if (!directionsRendererRef.current) {
          directionsRendererRef.current = new google.maps.DirectionsRenderer({
            map: mapRef.current,
            suppressMarkers: false,
            polylineOptions: { strokeColor: '#2d9cdb', strokeOpacity: 0.95, strokeWeight: 5 },
          });
        }

        directionsRendererRef.current.setDirections(result);
        directionsRendererRef.current.setRouteIndex(chosen);

        setRouteStatus(
          foundSafe
            ? chosen === 0
              ? 'Route ready.'
              : `Picked alternative route #${chosen + 1} to avoid flood zones.`
            : 'Flood warning: all available routes intersect Medium/High flood zones.'
        );
      }
    );
  };

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const ll = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setOriginLocation(ll);
        setSelectedLocation(ll);
        mapRef.current?.panTo(ll);
      },
      () => {}
    );
  };

  const submitReport = async ({ waterLevel, file }) => {
    if (!selectedLocation) return;
    setReportSubmitting(true);
    try {
      if (file) {
        const form = new FormData();
        form.append('waterLevel', waterLevel);
        form.append('lat', String(selectedLocation.lat));
        form.append('lng', String(selectedLocation.lng));
        form.append('image', file);
        await axiosClient.post(`/api/reports`, form);
      } else {
        await axiosClient.post(`/api/reports`, {
          waterLevel,
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
        });
      }

      const res = await axiosClient.get(`/api/reports/active`);
      setReports(res.data || []);
      setReportModalOpen(false);
    } catch (e) {
      setRouteStatus(e?.response?.data?.msg || 'Report submit failed');
    } finally {
      setReportSubmitting(false);
    }
  };

  useEffect(() => {
    if (defaultOpenReportModal) setReportModalOpen(true);
  }, [defaultOpenReportModal]);

  useEffect(() => {
    if (!toasts.length) return;
    const t = setTimeout(() => setToasts((prev) => prev.slice(0, -1)), 3500);
    return () => clearTimeout(t);
  }, [toasts]);

  if (!apiKey) {
    return (
      <div className="p-4">
        Missing <code className="rounded bg-white/10 px-1 py-0.5">REACT_APP_GOOGLE_MAPS_API_KEY</code> in{' '}
        <code className="rounded bg-white/10 px-1 py-0.5">client/.env</code>.
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-3.5rem)] w-full overflow-hidden">
      <div ref={mapDivRef} className="h-full w-full" />

      <div className="pointer-events-none absolute inset-0">
        <div className="pointer-events-auto absolute left-4 top-4">
          <ReportSidebar
            reports={enrichedReports}
            loading={loadingReports}
            onPickReport={(r) => {
              const ll = toLatLngLiteral(r);
              if (!ll || !mapRef.current) return;
              mapRef.current.panTo(ll);
              mapRef.current.setZoom(14);
            }}
            onOpenReport={() => setReportModalOpen(true)}
          />

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={detectLocation}
              className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10"
            >
              Re-detect Location
            </button>
            <button
              type="button"
              onClick={() => onExit?.()}
              className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => onLogout?.()}
              className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="pointer-events-auto absolute bottom-4 left-4 rounded-2xl border border-white/10 bg-slate-950/75 px-3 py-2 text-xs text-slate-200 shadow-soft backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500" /> High
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-yellow-400" /> Medium
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> Low
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-sky-400" /> Route
            </span>
          </div>
        </div>

        <div className="pointer-events-auto absolute right-4 top-4 rounded-2xl border border-white/10 bg-slate-950/75 px-3 py-2 text-xs text-slate-300 shadow-soft backdrop-blur">
          {mapsLoadError
            ? `Maps error: ${mapsLoadError}`
            : googleReady
              ? 'Click map to set report location'
              : 'Loading Google Maps…'}
        </div>

        <div className="pointer-events-auto absolute right-4 top-16 grid gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 shadow-soft backdrop-blur"
            >
              {t.text}
            </div>
          ))}
        </div>
      </div>

      <ReportModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        onSubmit={submitReport}
        location={selectedLocation}
        onDetectLocation={detectLocation}
        submitting={reportSubmitting}
      />
    </div>
  );
}
