import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getSettings, patchSettings } from '../db';
import { getProvider, providerList } from '../services/ai';
import { clearAIKey, setAIKey } from '../services/aiKey';
import Icon from '../components/Icon';
import { Spinner } from '../components/AIRun';
import type { AIProviderId } from '../types';

export default function SettingsPage() {
  const settings = useLiveQuery(() => getSettings(), []);
  const [providerId, setProviderId] = useState<AIProviderId>('anthropic');
  const [model, setModel] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [usePass, setUsePass] = useState(false);
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setProviderId(settings.aiProvider ?? 'anthropic');
      setModel(settings.aiModel ?? getProvider(settings.aiProvider ?? 'anthropic').defaultModel);
    }
  }, [settings?.aiProvider, settings?.aiModel]);

  const provider = getProvider(providerId);
  const hasKey = !!settings?.aiKeyCipher;

  async function saveProviderModel(pid: AIProviderId, m: string) {
    setProviderId(pid);
    setModel(m);
    await patchSettings({ aiProvider: pid, aiModel: m });
  }

  async function saveKey() {
    const v = provider.validateKey(keyInput.trim());
    if (!v.ok) {
      setStatus({ kind: 'err', msg: v.reason ?? 'Invalid key.' });
      return;
    }
    setSaving(true);
    try {
      await setAIKey(keyInput.trim(), usePass && passphrase ? passphrase : undefined);
      await patchSettings({ aiProvider: providerId, aiModel: model, onboarded: true });
      setKeyInput('');
      setPassphrase('');
      setStatus({ kind: 'ok', msg: 'Key saved. FLUX intelligence is unlocked.' });
    } catch (e) {
      setStatus({ kind: 'err', msg: e instanceof Error ? e.message : 'Could not save key.' });
    } finally {
      setSaving(false);
    }
  }

  async function removeKey() {
    await clearAIKey();
    setStatus({ kind: 'ok', msg: 'Key removed.' });
  }

  async function saveOrg(patch: Partial<NonNullable<typeof settings>['org']>) {
    const cur = (await getSettings()).org ?? {};
    await patchSettings({ org: { ...cur, ...patch } });
  }

  async function resetDemo() {
    if (!confirm('Clear ALL local FLUX data (engagements, processes, knowledge)? This cannot be undone.')) return;
    await db.delete();
    location.reload();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-2xl font-bold text-ink-900">Settings</h1>

      {/* AI provider */}
      <section className="card p-5">
        <h2 className="mb-1 font-semibold text-ink-800">AI provider</h2>
        <p className="mb-4 text-sm text-ink-500">FLUX runs entirely in your browser. Your key is stored locally (optionally encrypted) and sent only to the provider you choose.</p>

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

        <div className="mt-4 border-t border-ink-100 pt-4">
          <div className="mb-2 flex items-center gap-2">
            <span className={`chip ${hasKey ? 'bg-va-100 text-va-700' : 'bg-bva-100 text-bva-700'}`}>
              <Icon name="key" className="h-3.5 w-3.5" /> {hasKey ? `Key set${settings?.aiKeyPlaintext ? ' (plaintext)' : ' (encrypted)'}` : 'No key'}
            </span>
          </div>
          <label className="label">{provider.label} API key</label>
          <input className="input" type="password" placeholder={providerId === 'anthropic' ? 'sk-ant-…' : providerId === 'openai' ? 'sk-…' : 'AIza…'} value={keyInput} onChange={(e) => setKeyInput(e.target.value)} />
          <label className="mt-3 flex items-center gap-2 text-sm text-ink-600">
            <input type="checkbox" checked={usePass} onChange={(e) => setUsePass(e.target.checked)} />
            Encrypt with a passphrase (recommended on shared machines)
          </label>
          {usePass && (
            <input className="input mt-2" type="password" placeholder="Passphrase" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />
          )}
          <div className="mt-3 flex items-center gap-2">
            <button className="btn-primary" onClick={saveKey} disabled={saving || !keyInput.trim()}>
              {saving ? <Spinner label="Saving…" /> : 'Save key'}
            </button>
            {hasKey && <button className="btn-ghost text-nva-600" onClick={removeKey}>Remove key</button>}
          </div>
          {status && (
            <div className={`mt-3 text-sm ${status.kind === 'ok' ? 'text-va-600' : 'text-nva-600'}`}>{status.msg}</div>
          )}
        </div>
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
        <p className="mb-3 text-sm text-ink-500">All data lives in this browser (IndexedDB). Export reports per process from the Report tab.</p>
        <button className="btn-ghost text-nva-600" onClick={resetDemo}>
          <Icon name="trash" className="h-4 w-4" /> Clear all local data
        </button>
      </section>
    </div>
  );
}
