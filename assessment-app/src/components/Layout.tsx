import { NavLink, Outlet } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import type { ReactNode } from 'react';

type NavItem = { to: string; label: string; icon: IconName };

const items: NavItem[] = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/groups', label: 'Classes', icon: 'group' },
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
    <nav className="hidden md:flex md:flex-col md:w-60 md:shrink-0 md:border-r md:border-ink-100 md:bg-white md:py-6 md:px-3 md:gap-1">
      <div className="px-3 pb-6 flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center text-white shadow-soft font-bold text-lg">
          Σ
        </div>
        <div>
          <div className="font-bold text-ink-800 leading-tight">Sigma</div>
          <div className="text-[11px] text-ink-400 leading-tight">Rapid Assessment</div>
        </div>
      </div>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition ${
              isActive
                ? 'bg-brand-50 text-brand-700'
                : 'text-ink-600 hover:bg-ink-50'
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
      <div className="px-3 pt-3 text-[11px] text-ink-400">
        Local-first. Data stays on this device.
      </div>
    </nav>
  );
}

function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-ink-100 pb-[env(safe-area-inset-bottom)] z-30">
      <div className="grid grid-cols-5">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 py-2 ${
                isActive ? 'text-brand-600' : 'text-ink-500'
              }`
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

export default function Layout() {
  return (
    <div className="min-h-screen-safe md:flex">
      <SideNav />
      <main className="flex-1 min-w-0 pb-24 md:pb-10">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-10">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
