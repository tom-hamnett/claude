import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getSettings, patchSettings } from '../db';
import { clearAllData, loadDemo } from '../store';
import { getProvider, providerList } from '../services/ai';
import { clearAIKey, setAIKey } from '../services/aiKey';
import { useAuth } from '../services/auth';
import { isCloud } from '../services/supabase';
import Icon from '../components/Icon';
import { Spinner } from '../components/AIRun';
import type { AIProviderId } from '../types';

export default function SettingsPage() {
  const settings = useLiveQuery(() => getSettings(), []);
  const [providerId, setProviderId] = useState<AIProviderId>('anthropic');
  const [model, setModel] = useState('');
  const [usePass, setUsePass] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);
  const auth = useAuth();

  useEffect(() => {
    if (settings) {
      setProviderId(settings.aiProvider ?? 'anthropic');
      setModel(settings.aiModel ?? getProvider(settings.aiProvider ?? 'anthropic').defaultModel);
    }
  }, [settings?.aiProvider, settings?.aiModel]);

  const provider = getProvider(providerId);

  async function saveProviderModel(pid: AIProviderId, m: string) {
    setProviderId(pid);
    setModel(m);
    await patchSettings({ aiProvider: pid, aiModel: m, onboarded: true });
  }

  async function saveOrg(patch: Partial<NonNullable<typeof settings>['org']>) {
    const cur = (await getSettings()).org ?? {};
    await patchSettings({ org: { ...cur, ...patch } });
  }

  async function resetData() {
    const scope = isCloud ? "your team's entire workspace (shared!)" : 'all local';
    if (!confirm(`Clear ${scope} FLUX data — engagements, processes, opportunities, knowledge? This cannot be undone.`)) return;
    await clearAllData();
    location.reload();
  }

  async function addDemo() {
    await loadDemo();
    setStatus({ kind: 'ok', msg: 'Demo engagement loaded.' });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-2xl font-bold text-ink-900">Settings</h1>

      {isCloud && (
        <section className="card p-5">
          <h2 className="mb-1 font-semibold text-ink-800">Account</h2>
          <p className="mb-3 text-sm text-ink-500">
            Signed in as <strong>{auth.userEmail ?? '—'}</strong>. Your workspace is shared with everyone on your email domain.
          </p>
          <button className="btn-outline" onClick={() => auth.signOut()}>Sign out</button>
        </section>
      )}

      {/* Primary reasoning model */}
      <section className="card p-5">
        <h2 className="mb-1 font-semibold text-ink-800">Primary model</h2>
        <p className="mb-4 text-sm text-ink-500">
          Used for the reasoning stages (map, diagnose, design). FLUX automatically routes ingestion to the best model for each file type from the keys you've added below.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Provider</label>
            <select className="input" value={providerId} onChange={(e) => saveProviderModel(e.target.value as AIProviderId, getProvider(e.target.value as AIProviderId).defaultModel)}>
              {providerList.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Model</label>
            <select className="input" value={model} onChange={(e) => saveProviderModel(providerId, e.target.value)}>
              {provider.models.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
        </div>
        <p className="mt-1 text-xs text-ink-400">{provider.models.find((m) => m.id === model)?.notes}</p>
      </section>

      {/* API keys (per provider) */}
      <section className="card p-5">
        <h2 className="mb-1 font-semibold text-ink-800">API keys</h2>
        <p className="mb-3 text-sm text-ink-500">
          Add a key for each provider you want to use. Keys are stored on this device only (never in the cloud). Add a <strong>Google Gemini</strong> key to ingest audio &amp; video.
        </p>
        <label className="mb-3 flex items-center gap-2 text-sm text-ink-600">
          <input type="checkbox" checked={usePass} onChange={(e) => setUsePass(e.target.checked)} />
          Encrypt keys with a passphrase (recommended on shared machines)
        </label>
        {usePass && (
          <input className="input mb-3" type="password" placeholder="Passphrase" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />
        )}
        <div className="space-y-3">
          {providerList.map((p) => (
            <ProviderKeyRow
              key={p.id}
              providerId={p.id}
              entry={settings?.aiKeys?.[p.id]}
              passphrase={usePass ? passphrase : undefined}
              onStatus={setStatus}
            />
          ))}
        </div>
        {status && <div className={`mt-3 text-sm ${status.kind === 'ok' ? 'text-va-600' : 'text-nva-600'}`}>{status.msg}</div>}
      </section>

      {/* Org defaults */}
      <section className="card p-5">
        <h2 className="mb-1 font-semibold text-ink-800">Costing defaults</h2>
        <p className="mb-4 text-sm text-ink-500">Used to annualise cost and waste. New engagements inherit these (each engagement can override).</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Loaded cost / hour</label>
            <input className="input" type="number" defaultValue={settings?.org?.loadedHourlyCost ?? ''} onBlur={(e) => saveOrg({ loadedHourlyCost: e.target.value ? Number(e.target.value) : undefined })} />
          </div>
          <div>
            <label className="label">Currency</label>
            <input className="input" defaultValue={settings?.org?.currency ?? 'GBP'} onBlur={(e) => saveOrg({ currency: e.target.value || 'GBP' })} />
          </div>
          <div>
            <label className="label">Hours / FTE / year</label>
            <input className="input" type="number" defaultValue={settings?.org?.annualHoursPerFte ?? 1760} onBlur={(e) => saveOrg({ annualHoursPerFte: e.target.value ? Number(e.target.value) : 1760 })} />
          </div>
        </div>
      </section>

      {/* Data */}
      <section className="card p-5">
        <h2 className="mb-1 font-semibold text-ink-800">Data</h2>
        <p className="mb-3 text-sm text-ink-500">
          {isCloud
            ? 'Data is stored in your shared cloud workspace and syncs across devices and teammates.'
            : 'All data lives in this browser (IndexedDB).'}{' '}
          Export reports per process from the Report tab.
        </p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-outline" onClick={addDemo}>
            <Icon name="plus" className="h-4 w-4" /> Load demo engagement
          </button>
          <button className="btn-ghost text-nva-600" onClick={resetData}>
            <Icon name="trash" className="h-4 w-4" /> Clear {isCloud ? 'workspace' : 'local'} data
          </button>
        </div>
      </section>
    </div>
  );
}

function ProviderKeyRow({
  providerId,
  entry,
  passphrase,
  onStatus,
}: {
  providerId: AIProviderId;
  entry?: { cipher: string; plaintext?: boolean };
  passphrase?: string;
  onStatus: (s: { kind: 'ok' | 'err'; msg: string }) => void;
}) {
  const provider = getProvider(providerId);
  const [keyInput, setKeyInput] = useState('');
  const [saving, setSaving] = useState(false);
  const has = !!entry?.cipher;
  const placeholder = providerId === 'anthropic' ? 'sk-ant-…' : providerId === 'openai' ? 'sk-…' : 'AIza…';

  async function save() {
    const v = provider.validateKey(keyInput.trim());
    if (!v.ok) {
      onStatus({ kind: 'err', msg: `${provider.label}: ${v.reason}` });
      return;
    }
    setSaving(true);
    try {
      await setAIKey(providerId, keyInput.trim(), passphrase);
      setKeyInput('');
      onStatus({ kind: 'ok', msg: `${provider.label} key saved.` });
    } catch (e) {
      onStatus({ kind: 'err', msg: e instanceof Error ? e.message : 'Could not save key.' });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    await clearAIKey(providerId);
    onStatus({ kind: 'ok', msg: `${provider.label} key removed.` });
  }

  return (
    <div className="rounded-lg border border-ink-100 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium text-ink-800">{provider.label}</span>
        <span className={`chip ${has ? 'bg-va-100 text-va-700' : 'bg-ink-100 text-ink-400'}`}>
          <Icon name="key" className="h-3.5 w-3.5" /> {has ? (entry?.plaintext ? 'set (plaintext)' : 'set (encrypted)') : 'no key'}
        </span>
      </div>
      <div className="flex gap-2">
        <input className="input" type="password" placeholder={placeholder} value={keyInput} onChange={(e) => setKeyInput(e.target.value)} />
        <button className="btn-primary shrink-0" onClick={save} disabled={saving || !keyInput.trim()}>
          {saving ? <Spinner /> : 'Save'}
        </button>
        {has && <button className="btn-ghost shrink-0 text-nva-600" onClick={remove}>Remove</button>}
      </div>
      <p className="mt-1 text-[11px] text-ink-400">Handles: {provider.supports.join(', ') || 'text only'}.</p>
    </div>
  );
}
