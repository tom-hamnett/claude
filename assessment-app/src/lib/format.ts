import type { Scale } from '../types';

export const fmtDate = (ts: number): string => {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

export const fmtDateTime = (ts: number): string => {
  const d = new Date(ts);
  return d.toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const fmtRelative = (ts: number): string => {
  const diff = Date.now() - ts;
  const m = 60_000, h = 3_600_000, d = 86_400_000;
  if (diff < m) return 'just now';
  if (diff < h) return `${Math.floor(diff / m)}m ago`;
  if (diff < d) return `${Math.floor(diff / h)}h ago`;
  if (diff < 7 * d) return `${Math.floor(diff / d)}d ago`;
  return fmtDate(ts);
};

export const formatMark = (value: number, scale: Scale): string => {
  if (Number.isInteger(scale.step) && scale.step >= 1) return `${value}`;
  return value.toFixed(1);
};

export const labelForValue = (value: number, scale: Scale): string | undefined => {
  if (!scale.labels || scale.labels.length === 0) return undefined;
  const range = scale.max - scale.min;
  if (range === 0) return scale.labels[0];
  const t = (value - scale.min) / range;
  const idx = Math.round(t * (scale.labels.length - 1));
  return scale.labels[Math.max(0, Math.min(scale.labels.length - 1, idx))];
};

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('') || '?';

export const avatarHue = (seed: string): number => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
};

/** Quote-and-comma-safe CSV cell. */
export const csvCell = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export const buildCSV = (rows: (string | number | null | undefined)[][]): string =>
  rows.map((r) => r.map(csvCell).join(',')).join('\n');

export const downloadFile = (filename: string, content: string, mime = 'text/csv;charset=utf-8') => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
};
