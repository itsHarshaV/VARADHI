import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { LogIn, Map, Siren } from 'lucide-react';

export default function Landing({ apiBaseUrl, auth, onAuthed, onPickMode }) {
  const [email, setEmail] = useState(auth?.email || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const canLogin = useMemo(() => email.trim().includes('@') && !busy, [busy, email]);
  const canUseActions = !!auth?.token;

  const login = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await axios.post(`${apiBaseUrl}/api/auth/login`, { email: email.trim() });
      onAuthed?.(res.data);
    } catch (e) {
      if (!e?.response) {
        setError('Server not reachable. Make sure the server is running on http://localhost:5000');
      } else {
        setError(e?.response?.data?.msg || 'Login failed');
      }
    } finally {
      setBusy(false);
    }
  };

  if (canUseActions) {
    return (
      <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-4xl flex-col items-center justify-center px-4">
        <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex flex-col gap-2">
            <div className="text-2xl font-bold tracking-tight">Varadhi</div>
            <div className="text-sm text-slate-600">Choose what you want to do next.</div>
            <div className="text-xs text-slate-500">
              Signed in as <span className="font-semibold text-slate-700">{auth?.email}</span>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => onPickMode?.('give')}
              className="flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-4 text-sm font-semibold text-white transition hover:bg-sky-500"
            >
              <Siren size={16} />
              Give Report
            </button>
            <button
              type="button"
              onClick={() => onPickMode?.('view')}
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              <Map size={16} />
              View Reports / Map
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-5xl flex-col items-center justify-center px-4">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-2">
          <div className="text-2xl font-bold tracking-tight">Varadhi</div>
          <div className="text-sm text-slate-600">Report urban flooding with location + water level.</div>
        </div>

        <div className="mt-6">
          <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold">Email Login</div>
            <div className="mt-1 text-xs text-slate-600">Enter your email to continue.</div>
            <div className="mt-3 grid gap-2">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-sky-600"
              />
              <button
                type="button"
                onClick={login}
                disabled={!canLogin}
                className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogIn size={16} />
                {busy ? 'Signing in...' : 'Login'}
              </button>
              {error ? <div className="text-xs text-red-700">{error}</div> : null}
            </div>
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-600">
          Tip: In the Live Map, click on the map to set the report location, then submit a water level + optional photo.
        </div>
      </div>
    </div>
  );
}
