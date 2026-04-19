import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { MapPin } from 'lucide-react';
import { formatTimeAgo } from '../lib/time';
import BackButton from './BackButton';

export default function AlertsPage({ apiBaseUrl, auth, onOpenLive, onBack }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const toLatLng = (r) => {
    const coords = r?.location?.coordinates;
    const lng = r.lng ?? (Array.isArray(coords) ? coords[0] : undefined);
    const lat = r.lat ?? (Array.isArray(coords) ? coords[1] : undefined);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  };

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
    setLoading(true);
    setError('');
    axiosClient
      .get('/api/reports/active')
      .then((res) => {
        const data = res.data || [];
        const filtered = data.filter((r) => {
          const level = String(r.waterLevel || r.intensity || '').toLowerCase();
          return level === 'high' || level === 'medium' || level === 'vehicle_risk' || level === 'knee';
        });
        if (!cancelled) setAlerts(filtered);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.response?.data?.msg || 'Failed to load alerts');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [axiosClient]);

  return (
    <div className="mx-auto w-full max-w-5xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BackButton onClick={() => onBack?.()} />
          <div>
            <div className="text-xl font-bold tracking-tight text-slate-900">Alerts</div>
            <div className="mt-1 text-sm text-slate-600">Medium/High reports (last 24 hours)</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onOpenLive?.()}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          <MapPin size={16} />
          Open Live Map
        </button>
      </div>

      <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
        {loading ? (
          <div className="p-4 text-sm text-slate-600">Loading...</div>
        ) : error ? (
          <div className="p-4 text-sm text-red-700">{error}</div>
        ) : alerts.length === 0 ? (
          <div className="p-4 text-sm text-slate-600">No alerts right now.</div>
        ) : (
          <div className="grid gap-3">
            {alerts.map((r) => {
              const level = r.waterLevel || r.intensity || 'Alert';
              const ts = r.createdAt || r.timestamp || r.time;
              const ll = toLatLng(r);
              return (
                <div key={r._id || `${r.lat}-${r.lng}-${ts}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-900">{level}</div>
                    <div className="text-xs text-slate-500">{formatTimeAgo(ts)}</div>
                  </div>
                  {r.address ? <div className="mt-1 text-xs text-slate-600">{r.address}</div> : null}
                  {ll ? (
                    <div className="mt-1 text-[11px] text-slate-500">
                      ({ll.lat.toFixed(6)}, {ll.lng.toFixed(6)})
                    </div>
                  ) : null}
                  {r.imageUrl ? (
                    <img
                      src={r.imageUrl}
                      alt="Alert"
                      className="mt-3 max-h-48 w-full rounded-2xl object-cover ring-1 ring-slate-200"
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

