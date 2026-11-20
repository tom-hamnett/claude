import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(19,26,36,.04),0_8px_24px_-14px_rgba(19,26,36,.18)] ${className}`}>{children}</div>;
}

export function Chip({ children, tone = 'plain', onClick, active }: { children: ReactNode; tone?: 'plain' | 'brand' | 'signal' | 'danger' | 'dark'; onClick?: () => void; active?: boolean }) {
  const tones = {
    plain: 'bg-paper text-ink-soft border-line',
    brand: 'bg-brand-soft text-brand-dark border-brand/20',
    signal: 'bg-signal-soft text-[#8A5410] border-signal/30',
    danger: 'bg-[#F7E3E0] text-danger border-danger/20',
    dark: 'bg-navy text-white border-navy',
  };
  const cls = `inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${active ? tones.dark : tones[tone]}`;
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} active:scale-95 transition`}>
      {children}
    </button>
  ) : (
    <span className={cls}>{children}</span>
  );
}

export function Button({
  children,
  onClick,
  kind = 'secondary',
  className = '',
  disabled,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  const kinds = {
    primary: 'bg-brand text-white hover:bg-brand-dark',
    secondary: 'bg-surface text-ink border border-line hover:bg-paper',
    ghost: 'text-ink-soft hover:bg-paper',
    danger: 'text-danger border border-danger/30 bg-surface hover:bg-[#F7E3E0]',
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition active:scale-[.98] disabled:opacity-40 ${kinds[kind]} ${className}`}
    >
      {children}
    </button>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-baseline justify-between px-1">
      <h2 className="font-display text-[13px] font-bold uppercase tracking-[.08em] text-ink-soft">{children}</h2>
      {aside}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-ink-soft">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-ink-faint">{hint}</span>}
    </label>
  );
}

export const inputCls = 'w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15';

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-5 py-8 text-center">
      <p className="font-display text-base font-bold text-ink">{title}</p>
      {children && <div className="mt-2 text-sm text-ink-soft">{children}</div>}
    </div>
  );
}

// ---------- toast with optional undo ----------

interface ToastState {
  msg: string;
  undo?: () => void;
}
const ToastCtx = createContext<(msg: string, undo?: () => void) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<ToastState | null>(null);
  const show = useCallback((msg: string, undo?: () => void) => {
    setT({ msg, undo });
    window.setTimeout(() => setT((cur) => (cur?.msg === msg ? null : cur)), 6000);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {t && (
        <div className="fixed inset-x-4 bottom-[88px] z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl bg-navy px-4 py-3 text-sm text-white shadow-lg" role="status">
          <span>{t.msg}</span>
          {t.undo && (
            <button
              className="font-semibold text-[#7FD3BE]"
              onClick={() => {
                t.undo?.();
                setT(null);
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}
    </ToastCtx.Provider>
  );
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

export function timeAgo(iso?: string): string {
  if (!iso) return '';
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 0) {
    const f = -d / 86400;
    return f < 1 ? 'today' : `in ${Math.round(f)}d`;
  }
  if (d < 3600) return `${Math.max(1, Math.round(d / 60))}m ago`;
  if (d < 86400) return `${Math.round(d / 3600)}h ago`;
  return `${Math.round(d / 86400)}d ago`;
}
