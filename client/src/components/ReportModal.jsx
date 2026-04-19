import React, { useMemo, useState } from 'react';
import { Camera, Crosshair, X } from 'lucide-react';

const WATER_LEVELS = [
  { key: 'Low', label: 'Low', color: 'bg-emerald-50 ring-emerald-200 text-emerald-800' },
  { key: 'Medium', label: 'Medium', color: 'bg-amber-50 ring-amber-200 text-amber-800' },
  { key: 'High', label: 'High', color: 'bg-red-50 ring-red-200 text-red-700' },
];

export default function ReportModal({
  open,
  onClose,
  onSubmit,
  location,
  locationQuery,
  onLocationQueryChange,
  onSetLocationFromText,
  locationHint,
  onDetectLocation,
  submitting,
}) {
  const [waterLevel, setWaterLevel] = useState('Low');
  const [file, setFile] = useState(null);

  const canSubmit = useMemo(() => {
    return open && location?.lat != null && location?.lng != null && !submitting;
  }, [location, open, submitting]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] grid place-items-center bg-black/60 p-4 backdrop-blur">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">Submit Flood Report</div>
            <div className="mt-1 text-xs text-slate-600">
              Your report helps others stay safe.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-600 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4">
          <div className="text-xs font-semibold text-slate-700">Location</div>
          <div className="mt-2 grid gap-2">
            {onSetLocationFromText ? (
              <div className="grid gap-2">
                <input
                  value={locationQuery || ''}
                  onChange={(e) => onLocationQueryChange?.(e.target.value)}
                  placeholder='Type a place or "lat,lng"'
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-sky-600"
                />
                <button
                  type="button"
                  onClick={() => onSetLocationFromText?.()}
                  disabled={submitting}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Set Location
                </button>
                {locationHint ? <div className="text-[11px] text-slate-600">{locationHint}</div> : null}
              </div>
            ) : null}
            <button
              type="button"
              onClick={onDetectLocation}
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 hover:bg-slate-50"
            >
              <Crosshair size={16} className="text-slate-600" />
              Detect Current Location
            </button>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-sky-400" />
                <span className="font-medium">Lat</span>
                <span className="text-slate-600">{location?.lat ?? '—'}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-sky-400" />
                <span className="font-medium">Lng</span>
                <span className="text-slate-600">{location?.lng ?? '—'}</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-600">
                Tip: you can also click the map to set the report location.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xs font-semibold text-slate-700">Water Level</div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {WATER_LEVELS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setWaterLevel(opt.key)}
                className={[
                  'rounded-2xl px-3 py-3 text-center text-sm font-semibold ring-1 transition',
                  waterLevel === opt.key
                    ? opt.color
                    : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50',
                ].join(' ')}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xs font-semibold text-slate-700">Photo (optional)</div>
          <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 hover:bg-slate-100">
            <Camera size={16} className="text-slate-600" />
            {file ? file.name : 'Choose file'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
        </div>

        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={() => onSubmit({ waterLevel, file })}
            disabled={!canSubmit}
            className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

