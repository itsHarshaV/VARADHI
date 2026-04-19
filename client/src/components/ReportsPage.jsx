import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { MapPin, Siren, Trash2 } from 'lucide-react';
import { formatTimeAgo } from '../lib/time';
import BackButton from './BackButton';

function levelBadge(level) {
  if (level === 'High') return 'bg-red-50 text-red-700 ring-1 ring-red-200';
  if (level === 'Medium') return 'bg-amber-50 text-amber-800 ring-1 ring-amber-200';
  return 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200';
}

export default function ReportsPage({ apiBaseUrl, auth, onOpenLive, onGiveReport, onBack }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState('');

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
        if (!cancelled) setReports(res.data || []);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.response?.data?.msg || 'Failed to load reports');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [axiosClient]);

  const deleteReport = async (report) => {
    const id = report?._id;
    if (!id) return;
    const ok = window.confirm('Delete this report? This cannot be undone.');
    if (!ok) return;

    setDeletingId(id);
    setError('');
    try {
      await axiosClient.delete(`/api/reports/${id}`);
      const res = await axiosClient.get('/api/reports/active');
      setReports(res.data || []);
    } catch (e) {
      setError(e?.response?.data?.msg || 'Delete failed');
    } finally {
      setDeletingId('');
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BackButton onClick={() => onBack?.()} />
          <div>
          <div className="text-xl font-bold tracking-tight text-slate-900">Reports</div>
          <div className="mt-1 text-sm text-slate-600">Last 24 hours</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onGiveReport?.()}
            className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
          >
            <Siren size={16} />
            Submit New Report
          </button>
          <button
            type="button"
            onClick={() => onOpenLive?.()}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            <MapPin size={16} />
            Open Live Map
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
        {loading ? (
          <div className="p-4 text-sm text-slate-600">Loading...</div>
        ) : error ? (
          <div className="p-4 text-sm text-red-700">{error}</div>
        ) : reports.length === 0 ? (
          <div className="p-4 text-sm text-slate-600">No reports yet.</div>
        ) : (
          <div className="grid gap-3">
            {reports.map((r) => {
              const level = r.waterLevel || r.intensity || 'Low';
              const ts = r.createdAt || r.timestamp || r.time;
              const name = r.address || 'Unknown location';
              const coords = r?.location?.coordinates;
              const lng = r.lng ?? (Array.isArray(coords) ? coords[0] : undefined);
              const lat = r.lat ?? (Array.isArray(coords) ? coords[1] : undefined);
              return (
                <div
                  key={r._id || `${lat}-${lng}-${ts}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-xl px-2 py-1 text-xs font-semibold ${levelBadge(level)}`}>
                        {level}
                      </span>
                      <span className="text-xs font-semibold text-slate-900">{name}</span>
                      <span className="text-xs text-slate-500">{formatTimeAgo(ts)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-slate-500">
                        {Number.isFinite(lat) && Number.isFinite(lng)
                          ? `(${lat.toFixed(5)}, ${lng.toFixed(5)})`
                          : ''}
                      </div>
                      {r._id ? (
                        <button
                          type="button"
                          onClick={() => deleteReport(r)}
                          disabled={deletingId === r._id}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label="Delete report"
                          title="Delete report"
                        >
                          <Trash2 size={16} />
                          {deletingId === r._id ? 'Deleting…' : 'Delete'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {r.imageUrl ? (
                    <img
                      src={r.imageUrl}
                      alt="Report"
                      className="mt-3 max-h-56 w-full rounded-2xl object-cover ring-1 ring-slate-200"
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
