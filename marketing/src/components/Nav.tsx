import { Link, NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all ${
        scrolled
          ? 'backdrop-blur-md bg-bg/85 border-b border-white/10'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="container-w h-16 flex items-center justify-between">
        <Link to="/sigma" className="flex items-center gap-2.5 group">
          <Mark />
          <div className="leading-tight">
            <div className="font-display font-bold text-ink-50">Sigma</div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-brand-300/80 font-bold">
              Quantum Tools
            </div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <NavItem to="/sigma">Overview</NavItem>
          <NavItem to="/sigma/pricing">Pricing</NavItem>
          <a
            href="https://github.com/tom-hamnett/claude/tree/claude/student-assessment-app-SZfol/assessment-app"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-full text-sm font-semibold text-ink-300 hover:text-ink-50 transition"
          >
            Source
          </a>
          <NavItem to="/sigma/privacy">Privacy</NavItem>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="/app"
            className="hidden sm:inline-flex btn-ghost text-xs"
            title="Open the app"
          >
            Open app
          </a>
          <Link to="/sigma/unlock" className="btn-primary text-xs">
            Get Sigma AI
          </Link>
        </div>
      </div>
    </header>
  );
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `px-3 py-2 rounded-full text-sm font-semibold transition ${
          isActive ? 'text-ink-50 bg-white/5' : 'text-ink-300 hover:text-ink-50'
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export function Mark({ size = 32 }: { size?: number }) {
  return (
    <span
      className="relative inline-flex items-center justify-center group-hover:scale-105 transition"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span
        className="absolute inset-0 rounded-xl bg-bg-700"
        style={{
          background:
            'conic-gradient(from 220deg at 50% 50%, rgba(108,99,255,0.55), rgba(255,209,102,0.45), rgba(108,99,255,0.55))',
          filter: 'blur(8px)',
          opacity: 0.7,
        }}
      />
      <span className="absolute inset-0 rounded-xl bg-bg-800 border border-white/10" />
      <span
        className="relative font-display font-bold text-ink-50"
        style={{ fontSize: size * 0.55 }}
      >
        Σ
      </span>
    </span>
  );
}
