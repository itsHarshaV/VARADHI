import React from 'react';
import { X, MapPin, Droplets, Image as ImageIcon, Clock, Trash2 } from 'lucide-react';

function toLatLng(report) {
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

export default function ReportDetailsModal({ open, report, onClose, onDelete, deleting = false }) {
  if (!open || !report) return null;

  const level = report.waterLevel || report.intensity || 'Low';
  const ll = toLatLng(report);
  const ts = report.createdAt || report.timestamp || report.time;
  const place = report.placeName || report.address || 'This area';
  const canDelete = !!report?._id && typeof onDelete === 'function';

  return (
    <div className="fixed inset-0 z-[2000] grid place-items-center bg-black/50 p-4 backdrop-blur">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Droplets size={18} className="text-sky-700" />
              {place} is flooded
            </div>
            <div className="mt-1 text-xs text-slate-600">Water level: {level}</div>
          </div>
          <div className="flex items-center gap-2">
            {canDelete ? (
              <button
                type="button"
                onClick={() => onDelete?.(report)}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 size={16} />
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-600 hover:bg-slate-100"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {ll ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-slate-500" />
                <span className="font-medium">Location</span>
                <span className="text-slate-600">
                  ({ll.lat.toFixed(6)}, {ll.lng.toFixed(6)})
                </span>
              </div>
              {report.address ? <div className="mt-1 text-[11px] text-slate-600">{report.address}</div> : null}
            </div>
          ) : null}

          {ts ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-slate-500" />
                <span className="font-medium">Time</span>
                <span className="text-slate-600">{new Date(ts).toLocaleString()}</span>
              </div>
            </div>
          ) : null}

          {report.imageUrl ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-xs text-slate-700">
                <ImageIcon size={14} className="text-slate-500" />
                <span className="font-medium">Photo</span>
              </div>
              <img
                src={report.imageUrl}
                alt="Flood"
                className="mt-3 max-h-80 w-full rounded-2xl object-cover ring-1 ring-slate-200"
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              No photo for this report.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
