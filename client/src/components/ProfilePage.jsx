import React from 'react';
import { LogOut } from 'lucide-react';
import BackButton from './BackButton';

export default function ProfilePage({ auth, onLogout, onBack }) {
  return (
    <div className="mx-auto w-full max-w-3xl p-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <BackButton onClick={() => onBack?.()} />
            <div>
              <div className="text-xl font-bold tracking-tight text-slate-900">User Profile</div>
              <div className="mt-1 text-sm text-slate-600">Local demo session.</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onLogout?.()}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>

        <div className="mt-6 grid gap-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold text-slate-500">Email</div>
            <div className="mt-1 break-all text-sm font-semibold text-slate-900">
              {auth?.email || '—'}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold text-slate-500">Token</div>
            <div className="mt-1 break-all font-mono text-[12px] text-slate-700">
              {auth?.token || '—'}
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              This is a local in-memory session on the server (dev/demo).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

