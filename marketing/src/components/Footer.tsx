import { Link } from 'react-router-dom';
import { Mark } from './Nav';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-white/10 bg-bg-900/60">
      <div className="container-w py-12 grid md:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2.5">
            <Mark size={28} />
            <div className="leading-tight">
              <div className="font-display font-bold text-ink-50">Quantum Tools</div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-ink-400 font-bold">
                Show your work
              </div>
            </div>
          </div>
          <p className="text-sm text-ink-300 mt-3 leading-relaxed">
            AI tools that make professionals smarter, not lazier. Every output shows its
            working.
          </p>
        </div>

        <FooterCol
          title="Sigma"
          items={[
            { label: 'Overview', to: '/sigma' },
            { label: 'Pricing', to: '/sigma/pricing' },
            { label: 'Unlock', to: '/sigma/unlock' },
            { label: 'Privacy', to: '/sigma/privacy' },
          ]}
        />

        <FooterCol
          title="Quantum Tools"
          items={[
            { label: 'PRISM', href: 'https://quantumtools.ai/prism', soon: true },
            { label: 'Analyst\'s Edge', href: 'https://quantumtools.ai/analysts-edge', soon: true },
            { label: 'APEX', href: 'https://quantumtools.ai/apex', soon: true },
            { label: 'ATLAS', href: 'https://quantumtools.ai/atlas', soon: true },
          ]}
        />

        <FooterCol
          title="Company"
          items={[
            { label: 'Manifesto', href: 'https://quantumtools.ai/manifesto' },
            { label: 'Substack', href: 'https://quantumtools.substack.com' },
            { label: 'GitHub', href: 'https://github.com/tom-hamnett/claude' },
            { label: 'Contact', href: 'mailto:hello@quantumtools.ai' },
          ]}
        />
      </div>
      <div className="container-w pb-8 pt-2 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs text-ink-400">
        <div>© 2026 Quantum Tools. All rights reserved.</div>
        <div className="flex items-center gap-3">
          <span>Built local-first.</span>
          <span className="opacity-50">·</span>
          <span>Offline by design.</span>
          <span className="opacity-50">·</span>
          <a
            href="https://quantumtools.ai/manifesto"
            className="hover:text-ink-100"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read the manifesto →
          </a>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  items,
}: {
  title: string;
  items: { label: string; to?: string; href?: string; soon?: boolean }[];
}) {
  return (
    <div>
      <div className="h-eyebrow mb-3 text-ink-300/80">{title}</div>
      <ul className="space-y-2 text-sm">
        {items.map((it) => (
          <li key={it.label} className="flex items-center gap-2">
            {it.to ? (
              <Link to={it.to} className="text-ink-200 hover:text-ink-50">
                {it.label}
              </Link>
            ) : (
              <a
                href={it.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink-200 hover:text-ink-50"
              >
                {it.label}
              </a>
            )}
            {it.soon ? <span className="text-[10px] text-ink-500 font-mono">soon</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
