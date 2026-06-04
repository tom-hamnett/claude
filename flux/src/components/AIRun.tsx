/** Consistent loading/error UX for any AI action across the app. */
import { useState } from 'react';
import Icon from './Icon';
import { AIError } from '../services/ai';

export function useAIRun() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run<T>(fn: () => Promise<T>, onDone?: (r: T) => void | Promise<void>): Promise<T | undefined> {
    setLoading(true);
    setError(null);
    try {
      const r = await fn();
      onDone?.(r);
      return r;
    } catch (e) {
      const msg = e instanceof AIError ? e.message : e instanceof Error ? e.message : 'Something went wrong.';
      setError(msg);
      return undefined;
    } finally {
      setLoading(false);
    }
  }

  return { loading, error, run, setError };
}

export function AIError_({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="mt-3 flex items-start gap-2 rounded-lg border border-nva-100 bg-nva-100/40 px-3 py-2 text-sm text-nva-700">
      <Icon name="warning" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4z" />
      </svg>
      {label}
    </span>
  );
}

export function AIThinking({ label = 'FLUX is thinking…' }: { label?: string }) {
  return (
    <div className="card flex items-center gap-3 p-5 text-sm text-ink-500">
      <Spinner />
      <div>
        <div className="font-medium text-ink-700">{label}</div>
        <div className="text-xs text-ink-400">Applying Lean / VSM / TIMWOODS reasoning…</div>
      </div>
    </div>
  );
}
