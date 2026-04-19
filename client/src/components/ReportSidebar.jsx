import React from 'react';
import { ArrowLeft, Droplets, Timer } from 'lucide-react';

function riskMeta(intensity) {
  const v = String(intensity || '').toUpperCase();
  if (v === 'HIGH' || v === 'VEHICLE_RISK') {
    return { label: 'Vehicle Risk', color: 'bg-red-50 text-red-700 ring-red-200' };
  }
  if (v === 'MEDIUM' || v === 'KNEE') {
    return { label: 'Knee Level', color: 'bg-amber-50 text-amber-800 ring-amber-200' };
  }
  return { label: 'Ankle Level', color: 'bg-emerald-50 text-emerald-800 ring-emerald-200' };
}

export default function ReportSidebar({ reports, loading, onPickReport, onOpenReport, onBack }) {
  return (
    <div className="w-[360px] max-w-[calc(100vw-32px)] rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-soft backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={() => onBack?.()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
              aria-label="Back"
              title="Back"
            >
              <ArrowLeft size={16} />
            </button>
          ) : null}
          <div>
            <div className="text-base font-semibold text-slate-900">Active Flood Alerts</div>
            <div className="mt-1 text-xs text-slate-600">Reports from the last 24 hours</div>
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 px-2 py-1 text-xs text-slate-700 ring-1 ring-slate-200">
          {loading ? 'Loading...' : `${reports.length} alerts`}
        </div>
      </div>

      <div className="mt-4 max-h-[42vh] overflow-auto pr-1">
        <div className="grid gap-2">
          {!loading && reports.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
              No active reports yet. Submit one to see it on the map.
            </div>
          ) : null}

          {reports.map((r) => {
            const meta = riskMeta(r.intensity || r.waterLevel);
            return (
              <button
                key={r._listId || r._id || `${r.lat}-${r.lng}-${r.timestamp || r.time}`}
                type="button"
                onClick={() => onPickReport?.(r)}
                className="group w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:bg-slate-100"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Droplets size={16} className="text-slate-500" />
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {r.address || r.placeName || 'Unknown location'}
                      </div>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <Timer size={14} />
                      <span>{r.timeAgo || '—'}</span>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-xl px-2 py-1 text-[11px] ring-1 ${meta.color}`}>
                    {meta.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenReport}
        className="mt-4 w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-500"
      >
        Submit New Report
      </button>
    </div>
  );
}

