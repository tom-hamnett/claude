export function fmtMoney(n: number | undefined, currency = 'GBP'): string {
  if (n === undefined || Number.isNaN(n)) return '—';
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      maximumFractionDigits: n >= 10000 ? 0 : 0,
    }).format(n);
  } catch {
    return `${Math.round(n).toLocaleString()}`;
  }
}

export function fmtPct(n: number | undefined, digits = 0): string {
  if (n === undefined || Number.isNaN(n)) return '—';
  return `${(n * 100).toFixed(digits)}%`;
}

export function fmtNum(n: number | undefined): string {
  if (n === undefined || Number.isNaN(n)) return '—';
  return Math.round(n).toLocaleString();
}

/** Minutes → a human duration like "2d 3h", "45m", "1h 20m". */
export function fmtDuration(min: number | undefined): string {
  if (min === undefined || Number.isNaN(min) || min <= 0) return '—';
  const m = Math.round(min);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h < 8) return rem ? `${h}h ${rem}m` : `${h}h`;
  // Use 8h working days for lead-time legibility.
  const d = Math.floor(h / 8);
  const remH = h % 8;
  return remH ? `${d}d ${remH}h` : `${d}d`;
}

export function fmtDate(ts: number | undefined): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function relativeTime(ts: number | undefined): string {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return fmtDate(ts);
}
