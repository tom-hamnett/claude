import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ToastProvider } from './components/ui';
import { TodayPage } from './pages/TodayPage';
import { PipelinePage } from './pages/PipelinePage';
import { LeadsPage } from './pages/LeadsPage';
import { ContactPage } from './pages/ContactPage';
import { ThreadPage } from './pages/ThreadPage';
import { FunnelEditPage, FunnelsPage } from './pages/FunnelsPage';
import { MorePage } from './pages/MorePage';
import { useSyncState } from './components/SyncPanel';

const TABS = [
  { to: '/', label: 'Today', icon: 'M4 12h4l3-8 4 16 3-8h2' },
  { to: '/pipeline', label: 'Pipeline', icon: 'M4 5h16M7 12h10M10 19h4' },
  { to: '/leads', label: 'Leads', icon: 'M16 19v-1a4 4 0 0 0-8 0v1M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z' },
  { to: '/funnels', label: 'Funnels', icon: 'M4 4h16l-6 8v6l-4 2v-8z' },
  { to: '/more', label: 'More', icon: 'M5 12h.01M12 12h.01M19 12h.01' },
];

const TITLES: [RegExp, string][] = [
  [/^\/$/, 'Today'],
  [/^\/pipeline/, 'Pipeline'],
  [/^\/leads/, 'Leads'],
  [/^\/funnels\/.+/, 'Edit funnel'],
  [/^\/funnels/, 'Funnels'],
  [/^\/more/, 'Import & rules'],
  [/^\/t\//, 'Conversation'],
  [/^\/c\//, 'Lead'],
];

export default function App() {
  const loc = useLocation();
  const nav = useNavigate();
  const title = TITLES.find(([r]) => r.test(loc.pathname))?.[1] ?? '';
  const isTab = TABS.some((t) => t.to === loc.pathname);
  const sync = useSyncState();
  return (
    <ToastProvider>
      <div className="mx-auto min-h-[100dvh] max-w-xl pb-28">
        <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/90 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur">
          <div className="flex items-center gap-2">
            {!isTab && (
              <button onClick={() => nav(-1)} className="-ml-2 grid h-9 w-9 place-items-center rounded-full text-ink-soft hover:bg-surface" aria-label="Back">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
            )}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[.16em] text-brand">The Rational Strategist · Insta Engage</p>
              <h1 className="font-display text-[22px] font-bold leading-tight">{title}</h1>
            </div>
            {sync.enabled && (
              <span
                className={`ml-auto h-2.5 w-2.5 rounded-full ${sync.error ? 'bg-danger' : sync.signedIn ? (sync.busy ? 'bg-signal' : 'bg-brand') : 'bg-line'}`}
                title={sync.error ?? (sync.signedIn ? 'Synced' : 'Not signed in: data on this device only')}
              />
            )}
          </div>
        </header>
        <main className="px-4 pt-4">
          <Routes>
            <Route path="/" element={<TodayPage />} />
            <Route path="/pipeline" element={<PipelinePage />} />
            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/c/:id" element={<ContactPage />} />
            <Route path="/t/:id" element={<ThreadPage />} />
            <Route path="/funnels" element={<FunnelsPage />} />
            <Route path="/funnels/:id" element={<FunnelEditPage />} />
            <Route path="/more" element={<MorePage />} />
          </Routes>
        </main>
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
          <div className="mx-auto grid max-w-xl grid-cols-5">
            {TABS.map((t) => (
              <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${isActive ? 'text-brand' : 'text-ink-faint'}`}>
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={t.icon} /></svg>
                {t.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </ToastProvider>
  );
}
