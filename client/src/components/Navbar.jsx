import React from 'react';
import { Bell, LayoutDashboard, MapPin, ShieldAlert, User } from 'lucide-react';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'live', label: 'Live Map', icon: MapPin },
  { key: 'reports', label: 'Reports', icon: ShieldAlert },
  { key: 'alerts', label: 'Alerts', icon: Bell },
  { key: 'profile', label: 'User Profile', icon: User },
];

export default function Navbar({ activeKey = 'live', onNavigate }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-sky-600/10 ring-1 ring-sky-600/20">
            <span className="text-sm font-extrabold tracking-wide text-sky-700">V</span>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-wide text-slate-900">VARADHI</div>
            <div className="text-[11px] text-slate-500">Flood reporting & safe routing</div>
          </div>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.key === activeKey;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate?.(item.key)}
                className={[
                  'flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition',
                  active
                    ? 'bg-sky-50 text-slate-900 ring-1 ring-sky-200'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                ].join(' ')}
              >
                <Icon size={16} className={active ? 'text-sky-700' : 'text-slate-400'} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
