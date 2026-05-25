import { Link } from 'react-router-dom';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`}>
      <span className="w-8 h-8 rounded-xl ai-grad grid place-items-center shadow-soft">
        <svg viewBox="0 0 24 24" className="w-5 h-5">
          <rect x="4" y="7.5" width="16" height="2.4" rx="1.2" fill="#fff" />
          <path d="M12 10.5 L16 18 L8 18 Z" fill="#fff" />
        </svg>
      </span>
      <span className="font-display text-xl tracking-tight text-ink-900">VANTAGE</span>
    </Link>
  );
}

const BAND = (v: number) =>
  v >= 3.25 ? { c: 'bg-teal-500', t: 'text-teal-700', label: 'Advanced' } : v >= 2.5 ? { c: 'bg-brand-500', t: 'text-brand-700', label: 'Proficient' } : v >= 1.75 ? { c: 'bg-gold-400', t: 'text-gold-700', label: 'Developing' } : { c: 'bg-hot-500', t: 'text-hot-700', label: 'Novice' };

export function Meter({ value, max = 4 }: { value: number; max?: number }) {
  const band = BAND(value);
  return (
    <div className="meter" aria-label={`${value} of ${max}`}>
      <span className={band.c} style={{ width: `${(value / max) * 100}%` }} />
    </div>
  );
}

export function ScoreBadge({ value }: { value: number }) {
  const band = BAND(value);
  return (
    <span className={`inline-flex items-baseline gap-1 font-bold ${band.t}`}>
      {value.toFixed(1)}
      <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">/4</span>
    </span>
  );
}

export const ACCENT: Record<string, { chip: string; dot: string; ring: string; soft: string; text: string }> = {
  brand: { chip: 'chip-brand', dot: 'bg-brand-500', ring: 'border-brand-200', soft: 'bg-brand-50', text: 'text-brand-700' },
  teal: { chip: 'chip-teal', dot: 'bg-teal-500', ring: 'border-teal-200', soft: 'bg-teal-50', text: 'text-teal-700' },
  gold: { chip: 'chip-gold', dot: 'bg-gold-400', ring: 'border-gold-200', soft: 'bg-gold-50', text: 'text-gold-700' },
  hot: { chip: 'chip', dot: 'bg-hot-500', ring: 'border-hot-200', soft: 'bg-hot-50', text: 'text-hot-700' },
};

export function Empty({ icon, title, body, action }: { icon: string; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-12 px-6">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="font-display text-xl text-ink-900 mb-1">{title}</h3>
      <p className="text-ink-500 max-w-sm mx-auto mb-4">{body}</p>
      {action}
    </div>
  );
}
