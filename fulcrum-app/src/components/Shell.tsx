import { NavLink } from 'react-router-dom';
import { Logo } from './ui';

const NAV = [
  { to: '/', label: 'Home', icon: '◆', end: true },
  { to: '/learn', label: 'Learn', icon: '📚' },
  { to: '/evaluate', label: 'Evaluate', icon: '🎙️' },
  { to: '/capture', label: 'Capture', icon: '🎥' },
  { to: '/coach', label: 'Coach', icon: '✦' },
  { to: '/progress', label: 'Progress', icon: '📈' },
  { to: '/settings', label: 'Settings', icon: '⚙︎' },
];

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen-safe flex flex-col md:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex md:w-64 flex-col border-r border-ink-100 bg-white px-4 py-5 sticky top-0 h-screen-safe">
        <Logo className="mb-7 px-2" />
        <nav className="flex-1 space-y-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
            >
              <span className="w-5 text-center" aria-hidden>{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="ai-card mt-4">
          <div className="label mb-1">Private by design</div>
          <p className="text-xs text-ink-500 leading-relaxed">
            Everything stays in your browser. We coach you, not the room.
          </p>
        </div>
      </aside>

      {/* Top bar (mobile) */}
      <header className="md:hidden sticky top-0 z-20 flex items-center justify-between px-4 h-14 border-b border-ink-100 bg-white/90 backdrop-blur">
        <Logo />
      </header>

      <main className="flex-1 min-w-0 pb-24 md:pb-10">{children}</main>

      {/* Bottom nav (mobile) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-white/95 backdrop-blur border-t border-ink-100 grid grid-cols-7">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold ${isActive ? 'text-brand-600' : 'text-ink-400'}`
            }
          >
            <span className="text-base" aria-hidden>{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function Page({ title, subtitle, children, action }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 animate-fade-up">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl text-ink-900">{title}</h1>
          {subtitle && <p className="text-ink-500 mt-1 max-w-2xl">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
