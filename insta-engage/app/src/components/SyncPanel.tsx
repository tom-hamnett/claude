import { useEffect, useState } from 'react';
import { getSyncState, onSync, signIn, signOut, signUp, syncNow, type SyncState } from '../lib/sync';
import { Button, Card, Field, inputCls, timeAgo, useToast } from './ui';

export function useSyncState() {
  const [s, setS] = useState<SyncState>(getSyncState());
  useEffect(() => {
    const off = onSync(setS);
    return () => {
      off();
    };
  }, []);
  return s;
}

export function SyncPanel() {
  const s = useSyncState();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  if (!s.enabled) return <Card className="text-sm text-ink-soft">Sync is not configured in this build. Data stays on this device.</Card>;

  if (s.signedIn)
    return (
      <Card className="space-y-2 text-sm">
        <p>
          Syncing as <b>{s.email}</b>. {s.busy ? 'Syncing…' : s.lastSync ? `Last sync ${timeAgo(s.lastSync)}.` : ''}
        </p>
        {s.error && <p className="text-danger">{s.error}</p>}
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => syncNow().then(() => toast('Synced.'))}>Sync now</Button>
          <Button kind="ghost" onClick={() => signOut()}>
            Sign out
          </Button>
        </div>
      </Card>
    );

  return (
    <Card className="space-y-3">
      <p className="text-sm text-ink-soft">Sign in to back up to your Supabase project and let Claude runs drop leads, reports and drafts straight into the app.</p>
      <Field label="Email">
        <input className={inputCls} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Password">
        <input className={inputCls} type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Button
          kind="primary"
          disabled={!email || pw.length < 8}
          onClick={() => signIn(email, pw).then(() => toast('Signed in. Syncing…')).catch((e: Error) => toast(e.message))}
        >
          Sign in
        </Button>
        <Button
          disabled={!email || pw.length < 8}
          onClick={() =>
            signUp(email, pw)
              .then((ok) => toast(ok ? 'Account created. Syncing…' : 'Check your email to confirm, then sign in.'))
              .catch((e: Error) => toast(e.message))
          }
        >
          Create account
        </Button>
      </div>
      <p className="text-[11px] text-ink-faint">Password at least 8 characters.</p>
    </Card>
  );
}
