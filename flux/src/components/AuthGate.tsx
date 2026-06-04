import { useState, type ReactNode } from 'react';
import { useAuth } from '../services/auth';
import { useRealtimeSync } from '../store';
import { Spinner } from './AIRun';

/**
 * In local mode this is a transparent passthrough. In cloud mode it blocks the
 * app behind a foolproof email one-time-code sign-in, then keeps realtime sync
 * wired for the signed-in workspace.
 */
export default function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  useRealtimeSync(auth.workspaceId);

  if (!auth.cloud) return <>{children}</>;
  if (!auth.ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-ink-50 text-ink-400">
        <Spinner label="Loading…" />
      </div>
    );
  }
  if (!auth.userEmail) return <SignIn />;
  if (!auth.workspaceId) {
    return (
      <div className="flex h-screen items-center justify-center bg-ink-50 p-6 text-center text-ink-500">
        <div className="card max-w-sm p-6">
          <p className="font-semibold text-ink-800">Setting up your workspace…</p>
          <p className="mt-2 text-sm">If this persists, sign out and back in. Your workspace is keyed to your email domain so your team shares data automatically.</p>
          <button className="btn-ghost mt-4" onClick={() => auth.signOut()}>Sign out</button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

function SignIn() {
  const auth = useAuth();
  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      await auth.sendCode(email);
      setStage('code');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send code.');
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      await auth.verifyCode(email, code);
      // onAuthStateChange takes over from here.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid or expired code.');
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-900 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3 text-white">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-flux-500 font-display text-2xl font-bold text-ink-900">F</div>
          <div>
            <div className="font-display text-2xl font-bold leading-none">FLUX</div>
            <div className="text-[11px] uppercase tracking-widest text-flux-300">Execution Intelligence</div>
          </div>
        </div>
        <div className="card p-6">
          {stage === 'email' ? (
            <>
              <h1 className="text-lg font-semibold text-ink-800">Sign in</h1>
              <p className="mt-1 text-sm text-ink-500">Enter your work email. We'll send a one-time code. Colleagues on your domain share the same workspace.</p>
              <label className="label mt-4">Work email</label>
              <input
                className="input"
                type="email"
                autoFocus
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && email.includes('@') && send()}
              />
              <button className="btn-primary mt-4 w-full" onClick={send} disabled={busy || !email.includes('@')}>
                {busy ? <Spinner label="Sending…" /> : 'Send code'}
              </button>
            </>
          ) : (
            <>
              <h1 className="text-lg font-semibold text-ink-800">Enter your code</h1>
              <p className="mt-1 text-sm text-ink-500">We sent a 6-digit code to <strong>{email}</strong>. Check your inbox (and spam).</p>
              <label className="label mt-4">Code</label>
              <input
                className="input text-center text-lg tracking-[0.4em]"
                inputMode="numeric"
                autoFocus
                placeholder="••••••"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={(e) => e.key === 'Enter' && code.length >= 6 && verify()}
              />
              <button className="btn-primary mt-4 w-full" onClick={verify} disabled={busy || code.length < 6}>
                {busy ? <Spinner label="Verifying…" /> : 'Verify & sign in'}
              </button>
              <button className="btn-ghost mt-2 w-full text-sm" onClick={() => { setStage('email'); setCode(''); setError(null); }}>
                Use a different email
              </button>
            </>
          )}
          {error && <div className="mt-3 text-sm text-nva-600">{error}</div>}
        </div>
        <p className="mt-4 text-center text-xs text-ink-400">FLUX · Quantum Tools</p>
      </div>
    </div>
  );
}
