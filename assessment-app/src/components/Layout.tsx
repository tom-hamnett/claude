import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Icon, type IconName } from './Icon';
import { OnboardingPicker } from './OnboardingPicker';
import { getSettings } from '../db';
import type { ReactNode } from 'react';

type NavItem = { to: string; label: string; icon: IconName };

const items: NavItem[] = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/groups', label: 'Groups', icon: 'group' },
  { to: '/templates', label: 'Templates', icon: 'template' },
  { to: '/sessions', label: 'Sessions', icon: 'session' },
  { to: '/reports', label: 'Reports', icon: 'reports' },
];

function NavInner({ icon, label }: { icon: IconName; label: string }) {
  return (
    <>
      <Icon name={icon} size={26} />
      <span className="text-[11px] font-semibold tracking-wide md:text-sm">{label}</span>
    </>
  );
}

function SideNav() {
  return (
    <nav className="hidden md:flex md:flex-col md:w-60 md:shrink-0 md:border-r md:border-ink-100 md:bg-white md:py-6 md:px-3 md:gap-1 print:hidden">
      <div className="px-3 pb-6 flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center text-white shadow-soft font-bold text-lg">
          Σ
        </div>
        <div>
          <div className="font-bold text-ink-800 leading-tight">Sigma</div>
          <div className="text-[11px] text-ink-400 leading-tight">Clipboard for the field</div>
        </div>
      </div>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition ${
              isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-50'
            }`
          }
        >
          <Icon name={item.icon} size={22} />
          {item.label}
        </NavLink>
      ))}
      <NavLink
        to="/settings"
        className={({ isActive }) =>
          `flex items-center gap-3 px-4 py-3 mt-auto rounded-xl font-semibold text-sm transition ${
            isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-50'
          }`
        }
      >
        <Icon name="sparkles" size={22} />
        Settings
      </NavLink>
      <div className="px-3 pt-3 text-[11px] text-ink-400 leading-tight">
        Local-first. Offline-ready.
        <br />
        Part of{' '}
        <a
          className="text-brand-600 font-semibold"
          href="https://quantumtools.ai"
          target="_blank"
          rel="noopener noreferrer"
        >
          Quantum Tools
        </a>
        .
      </div>
    </nav>
  );
}

function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-ink-100 pb-[env(safe-area-inset-bottom)] z-30 print:hidden">
      <div className="grid grid-cols-5">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 py-2 ${isActive ? 'text-brand-600' : 'text-ink-500'}`
            }
          >
            <NavInner icon={item.icon} label={item.label} />
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-ink-800">{title}</h1>
        {subtitle ? <p className="text-ink-500 mt-1">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

function OfflineBadge() {
  const [online, setOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  if (online) return null;
  return (
    <div className="fixed bottom-24 md:bottom-3 right-3 z-40 bg-ink-800 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lift flex items-center gap-1.5 print:hidden">
      <Icon name="cloud-off" size={14} />
      Offline — your work is saved locally
    </div>
  );
}

function QTFooter() {
  return (
    <footer className="px-4 md:px-8 pb-6 pt-12 text-xs text-ink-400 print:hidden">
      <div className="max-w-5xl mx-auto border-t border-ink-100 pt-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-brand-500 text-white inline-flex items-center justify-center text-[10px] font-bold">
            Σ
          </span>
          <span>Sigma · part of</span>
          <a
            className="text-brand-600 font-semibold"
            href="https://quantumtools.ai"
            target="_blank"
            rel="noopener noreferrer"
          >
            Quantum Tools
          </a>
        </div>
        <div className="flex items-center gap-4">
          <a
            className="hover:text-brand-600"
            href="https://quantumtools.ai/sigma"
            target="_blank"
            rel="noopener noreferrer"
          >
            What is Sigma?
          </a>
          <a
            className="hover:text-brand-600"
            href="https://quantumtools.ai/sigma/pricing"
            target="_blank"
            rel="noopener noreferrer"
          >
            Pricing
          </a>
          <a
            className="hover:text-brand-600"
            href="https://quantumtools.ai/sigma/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy
          </a>
        </div>
      </div>
    </footer>
  );
}

export default function Layout() {
  const settings = useLiveQuery(() => getSettings(), []);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Open onboarding on first launch (after settings hydrate).
  useEffect(() => {
    if (!settings) return;
    if (!settings.onboarded) setShowOnboarding(true);
  }, [settings]);

  return (
    <div className="min-h-screen-safe md:flex">
      <SideNav />
      <main className="flex-1 min-w-0 pb-24 md:pb-10">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-10">
          <Outlet />
        </div>
        <QTFooter />
      </main>
      <BottomNav />
      <OfflineBadge />
      <OnboardingPicker open={showOnboarding} onClose={() => setShowOnboarding(false)} />
    </div>
  );
}
