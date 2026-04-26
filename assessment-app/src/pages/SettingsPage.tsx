import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getSettings, patchSettings } from '../db';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/Layout';
import { ConfirmDialog } from '../components/Modal';
import { downloadFile } from '../lib/format';
import { providerList } from '../services/ai';
import type { AIProviderId } from '../types';
import { activateLicense, deactivateLicense, validateCode } from '../services/license';
import { clearAIKey, setAIKey } from '../services/aiKey';
import { OnboardingPicker } from '../components/OnboardingPicker';
import { VERTICAL_LABELS } from '../services/seeds/galleryTemplates';

export default function SettingsPage() {
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [importErr, setImportErr] = useState<string | null>(null);
  const settings = useLiveQuery(() => getSettings(), []);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // AI provider state.
  const [provider, setProvider] = useState<AIProviderId>('anthropic');
  const [model, setModel] = useState<string>('');
  const [keyDraft, setKeyDraft] = useState('');
  const [usePassphrase, setUsePassphrase] = useState(false);
  const [passDraft, setPassDraft] = useState('');
  const [keyMsg, setKeyMsg] = useState<string | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);

  // License state.
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [licenseError, setLicenseError] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setProvider(settings.aiProvider ?? 'anthropic');
      setModel(settings.aiModel ?? '');
      setEmail(settings.license?.email ?? '');
    }
  }, [settings]);

  // Smooth-scroll to #ai when navigated from elsewhere.
  useEffect(() => {
    if (window.location.hash === '#ai') {
      const el = document.getElementById('ai');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const tier = settings?.license?.tier ?? 'free';
  const hasKey = !!settings?.aiKeyCipher;

  const exportAll = async () => {
    setBusy(true);
    try {
      const [groups, people, templates, sessions, marks] = await Promise.all([
        db.groups.toArray(),
        db.people.toArray(),
        db.templates.toArray(),
        db.sessions.toArray(),
        db.marks.toArray(),
      ]);
      const payload = {
        version: 2,
        exportedAt: Date.now(),
        groups,
        people,
        templates,
        sessions,
        marks,
        // Evidence binary blobs are intentionally omitted from JSON backup —
        // they'd inflate the file by orders of magnitude. Use the UI to print
        // the report or re-attach evidence on the new device.
      };
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      downloadFile(`sigma-backup-${stamp}.json`, JSON.stringify(payload, null, 2), 'application/json');
    } finally {
      setBusy(false);
    }
  };

  const importAll = async (file: File) => {
    setBusy(true);
    setImportErr(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data || (data.version !== 1 && data.version !== 2)) throw new Error('Unsupported backup format');
      await db.transaction('rw', [db.groups, db.people, db.templates, db.sessions, db.marks], async () => {
        if (Array.isArray(data.groups)) await db.groups.bulkPut(data.groups);
        if (Array.isArray(data.people)) await db.people.bulkPut(data.people);
        if (Array.isArray(data.templates)) await db.templates.bulkPut(data.templates);
        if (Array.isArray(data.sessions)) await db.sessions.bulkPut(data.sessions);
        if (Array.isArray(data.marks)) await db.marks.bulkPut(data.marks);
      });
    } catch (e) {
      setImportErr(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  const wipeAll = async () => {
    setBusy(true);
    try {
      await db.transaction(
        'rw',
        [db.groups, db.people, db.templates, db.sessions, db.marks, db.evidence, db.settings],
        async () => {
          await Promise.all([
            db.marks.clear(),
            db.sessions.clear(),
            db.people.clear(),
            db.groups.clear(),
            db.templates.clear(),
            db.evidence.clear(),
            db.settings.clear(),
          ]);
        },
      );
      window.location.reload();
    } finally {
      setBusy(false);
    }
  };

  const onProviderSelect = async (id: AIProviderId) => {
    setProvider(id);
    const next = providerList.find((p) => p.id === id)!;
    setModel(next.defaultModel);
    await patchSettings({ aiProvider: id, aiModel: next.defaultModel });
  };

  const onModelSelect = async (m: string) => {
    setModel(m);
    await patchSettings({ aiModel: m });
  };

  const onSaveKey = async () => {
    setKeyMsg(null);
    setKeyError(null);
    const provObj = providerList.find((p) => p.id === provider)!;
    const validation = provObj.validateKey(keyDraft.trim());
    if (!validation.ok) {
      setKeyError(validation.reason ?? 'Key looks invalid.');
      return;
    }
    if (usePassphrase && passDraft.length < 6) {
      setKeyError('Passphrase must be at least 6 characters.');
      return;
    }
    try {
      await setAIKey(keyDraft.trim(), usePassphrase ? passDraft : undefined);
      setKeyDraft('');
      setPassDraft('');
      setKeyMsg('Key saved.');
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : 'Could not save key.');
    }
  };

  const onClearKey = async () => {
    await clearAIKey();
    setKeyMsg('Key removed.');
  };

  const onActivate = async () => {
    setLicenseError(null);
    const v = validateCode(code);
    if (!v.ok) {
      setLicenseError(v.reason);
      return;
    }
    try {
      await activateLicense(code, email || undefined);
      setCode('');
    } catch (err) {
      setLicenseError(err instanceof Error ? err.message : 'Activation failed.');
    }
  };
  const onDeactivate = async () => {
    await deactivateLicense();
    setLicenseError(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="AI, brand, backup, and local data." />

      {/* AI section */}
      <section id="ai" className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-ink-800 flex items-center gap-2">
            <Icon name="sparkles" size={18} className="text-brand-600" />
            Sigma AI
          </h2>
          <span
            className={`chip ${
              tier === 'managed'
                ? 'bg-emerald-100 text-emerald-700'
                : tier === 'byok'
                ? 'chip-brand'
                : 'chip-gold'
            }`}
          >
            {tier === 'managed' ? 'Sigma AI subscription' : tier === 'byok' ? 'BYOK unlocked' : 'AI locked'}
          </span>
        </div>

        {tier === 'free' ? (
          <div className="ai-card">
            <p className="text-ink-700">
              The clipboard product is free, forever. AI features cost extra:
            </p>
            <ul className="text-sm text-ink-600 mt-2 list-disc pl-5 space-y-1">
              <li>
                <strong>£4.99 BYOK</strong> — paste your own Anthropic / OpenAI / Gemini key.
              </li>
              <li>
                <strong>£9.99 / month</strong> — Sigma AI managed, no key needed, 200 calls/day.
              </li>
            </ul>
            <div className="flex gap-2 mt-3">
              <a
                className="btn-gold"
                href="https://quantumtools.ai/sigma/unlock?tier=byok"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="unlock" size={16} />
                Get BYOK code
              </a>
              <a
                className="btn-primary"
                href="https://quantumtools.ai/sigma/unlock?tier=managed"
                target="_blank"
                rel="noopener noreferrer"
              >
                Subscribe to Sigma AI
                <Icon name="arrow-up-right" size={14} />
              </a>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 flex items-center gap-2">
            <Icon name="shield" size={16} />
            <div className="flex-1">
              {tier === 'managed' ? 'Sigma AI subscription is active.' : 'BYOK unlock active — bring your own provider key below.'}
              {settings?.license?.email ? <> · <span className="font-mono">{settings.license.email}</span></> : null}
            </div>
            <button className="btn-ghost text-xs" onClick={onDeactivate}>
              Disconnect
            </button>
          </div>
        )}

        {tier === 'free' && (
          <div className="space-y-2">
            <label htmlFor="settings-code" className="label">
              Activate unlock code
            </label>
            <div className="flex gap-2">
              <input
                id="settings-code"
                className="input font-mono uppercase tracking-wider"
                placeholder="SIG-BYOK-XXXX-XXXX-XXXX"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
              <button className="btn-primary" onClick={onActivate} disabled={!code}>
                Activate
              </button>
            </div>
            <input
              className="input"
              type="email"
              placeholder="Email for receipts (optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {licenseError ? <div className="text-sm text-hot-600">{licenseError}</div> : null}
          </div>
        )}

        {(tier === 'byok' || tier === 'managed') && (
          <div className="space-y-3">
            <div>
              <div className="label mb-1">Provider</div>
              <div className="grid grid-cols-3 gap-2">
                {providerList.map((p) => (
                  <button
                    key={p.id}
                    className={`rounded-xl border p-3 text-left transition ${
                      provider === p.id
                        ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-200'
                        : 'border-ink-200 hover:border-brand-200'
                    }`}
                    onClick={() => onProviderSelect(p.id)}
                  >
                    <div className="font-bold text-ink-800 text-sm">{p.label}</div>
                    <div className="text-[11px] text-ink-500 mt-0.5">{p.defaultModel}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="settings-model" className="label">
                Model
              </label>
              <select
                id="settings-model"
                className="input mt-1"
                value={model}
                onChange={(e) => onModelSelect(e.target.value)}
              >
                {providerList
                  .find((p) => p.id === provider)!
                  .models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label} {m.notes ? ` — ${m.notes}` : ''}
                    </option>
                  ))}
              </select>
            </div>

            {tier === 'byok' && (
              <div>
                <div className="label mb-1">API key</div>
                {hasKey ? (
                  <div className="flex items-center gap-2 bg-ink-50 rounded-xl p-3 border border-ink-100">
                    <Icon
                      name={settings?.aiKeyPlaintext ? 'unlock' : 'lock'}
                      size={16}
                      className="text-brand-600"
                    />
                    <div className="text-sm text-ink-700 flex-1">
                      Key stored on this device
                      {settings?.aiKeyPlaintext ? ' (plaintext — set a passphrase below for at-rest encryption)' : ' (encrypted)'}
                    </div>
                    <button className="btn-ghost text-xs" onClick={onClearKey}>
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      className="input font-mono"
                      type="password"
                      placeholder={
                        provider === 'anthropic'
                          ? 'sk-ant-...'
                          : provider === 'openai'
                          ? 'sk-...'
                          : 'AIza...'
                      }
                      value={keyDraft}
                      onChange={(e) => setKeyDraft(e.target.value)}
                    />
                    <div className="flex items-center gap-2 text-sm text-ink-600">
                      <input
                        id="use-passphrase"
                        type="checkbox"
                        checked={usePassphrase}
                        onChange={(e) => setUsePassphrase(e.target.checked)}
                      />
                      <label htmlFor="use-passphrase">Encrypt with a passphrase (recommended)</label>
                    </div>
                    {usePassphrase ? (
                      <input
                        className="input"
                        type="password"
                        placeholder="Passphrase (min 6 chars)"
                        value={passDraft}
                        onChange={(e) => setPassDraft(e.target.value)}
                      />
                    ) : null}
                    <button className="btn-primary" onClick={onSaveKey} disabled={!keyDraft}>
                      <Icon name="lock" size={16} />
                      Save key
                    </button>
                  </div>
                )}
                {keyMsg ? <div className="text-sm text-emerald-600 mt-1">{keyMsg}</div> : null}
                {keyError ? <div className="text-sm text-hot-600 mt-1">{keyError}</div> : null}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Vertical / domain */}
      <section className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-ink-800">Your context</h2>
          <button className="btn-ghost text-sm" onClick={() => setShowOnboarding(true)}>
            Change
          </button>
        </div>
        {settings?.defaultVertical ? (
          <div className="flex items-center gap-3">
            <div className="text-3xl">{VERTICAL_LABELS[settings.defaultVertical].emoji}</div>
            <div>
              <div className="font-bold text-ink-800">{VERTICAL_LABELS[settings.defaultVertical].label}</div>
              <div className="text-sm text-ink-600">{VERTICAL_LABELS[settings.defaultVertical].tagline}</div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-ink-500">
            Pick a domain so we can suggest the right templates and AI prompts.
          </div>
        )}
      </section>

      {/* Backup */}
      <section className="card p-5 space-y-3">
        <h2 className="font-bold text-ink-800">Backup & restore</h2>
        <p className="text-ink-500 text-sm">
          Your data lives on this device. Export a JSON backup to keep it safe, or move to another iPad.
          Photo/voice/signature evidence is excluded from JSON backups (too large) — use Print/PDF on a session to keep evidence.
        </p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={exportAll} disabled={busy}>
            <Icon name="export" size={18} />
            Export backup
          </button>
          <label className="btn-secondary cursor-pointer">
            <Icon name="import" size={18} />
            Import backup
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importAll(f);
                e.target.value = '';
              }}
            />
          </label>
        </div>
        {importErr ? <div className="text-sm text-hot-600">{importErr}</div> : null}
      </section>

      {/* About */}
      <section className="card p-5 space-y-2 text-sm text-ink-600">
        <h2 className="font-bold text-ink-800">About Sigma</h2>
        <p>
          Sigma is part of the <a className="text-brand-600 font-semibold" href="https://quantumtools.ai" target="_blank" rel="noopener noreferrer">Quantum Tools</a> family.
          Local-first. Offline-capable. Your data never leaves this device unless you choose to share it.
        </p>
        <div className="flex items-center gap-2 text-xs text-ink-400">
          <Icon name="cloud-off" size={14} />
          Sigma works fully offline.
        </div>
      </section>

      {/* Danger */}
      <section className="card p-5 space-y-3 border-hot-200">
        <h2 className="font-bold text-hot-700">Danger zone</h2>
        <p className="text-ink-500 text-sm">
          Permanently delete every group, person, template, session, mark, evidence file and setting on this device.
        </p>
        <button className="btn-danger" onClick={() => setConfirmReset(true)} disabled={busy}>
          <Icon name="trash" size={18} />
          Reset all data
        </button>
      </section>

      <ConfirmDialog
        open={confirmReset}
        title="Reset all data?"
        message="This permanently deletes everything stored on this device. You should export a backup first if you want to keep your data."
        confirmLabel="Yes, reset"
        onConfirm={wipeAll}
        onClose={() => setConfirmReset(false)}
      />

      <OnboardingPicker
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        initialVertical={settings?.defaultVertical}
      />
    </div>
  );
}
