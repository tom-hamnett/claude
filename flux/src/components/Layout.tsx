import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Icon, { type IconName } from './Icon';
import { hasAnyAIKey } from '../services/aiKey';

const NAV: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: 'Dashboard', icon: 'home', end: true },
  { to: '/projects', label: 'Engagements', icon: 'projects' },
  { to: '/portfolio', label: 'Portfolio', icon: 'portfolio' },
  { to: '/knowledge', label: 'Knowledge', icon: 'knowledge' },
  { to: '/methodology', label: 'The FLUX Standard', icon: 'book' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

export default function Layout() {
  const [keySet, setKeySet] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    hasAnyAIKey().then(setKeySet);
  }, [loc.pathname]);

  useEffect(() => setMobileOpen(false), [loc.pathname]);

  return (
    <div className="flex h-full min-h-screen bg-ink-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 transform bg-ink-900 text-ink-100 transition-transform md:static md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-2 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-flux-500 font-display text-lg font-bold text-ink-900">
            F
          </div>
          <div>
            <div className="font-display text-lg font-bold leading-none tracking-tight">FLUX</div>
            <div className="text-[10px] uppercase tracking-widest text-flux-300">Execution Intelligence</div>
          </div>
        </div>
        <nav className="mt-4 space-y-1 px-3">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-flux-500/15 text-flux-200' : 'text-ink-300 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon name={n.icon} className="h-5 w-5" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute inset-x-0 bottom-0 p-4 text-[11px] text-ink-400">
          <div className="rounded-lg bg-white/5 p-3">
            <div className="font-semibold text-ink-200">Quantum Tools</div>
            FLUX maps how work really flows, finds the waste, and designs the future state.
          </div>
        </div>
      </aside>

      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-ink-200 bg-white px-4 md:px-8">
          <button className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 md:hidden" onClick={() => setMobileOpen(true)}>
            <Icon name="grip" />
          </button>
          <div className="hidden text-sm text-ink-400 md:block">AI-native process mapping &amp; opportunity identification</div>
          {!keySet && (
            <NavLink to="/settings" className="chip bg-bva-100 text-bva-700">
              <Icon name="key" className="h-4 w-4" /> Add an AI key to unlock intelligence
            </NavLink>
          )}
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
