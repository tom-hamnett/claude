import { useState } from 'react';
import { db } from '../db';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/Layout';
import { ConfirmDialog } from '../components/Modal';
import { downloadFile } from '../lib/format';

export default function SettingsPage() {
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [importErr, setImportErr] = useState<string | null>(null);

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
      const payload = { version: 1, exportedAt: Date.now(), groups, people, templates, sessions, marks };
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
      if (!data || data.version !== 1) throw new Error('Unsupported backup format');
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
      await db.transaction('rw', [db.groups, db.people, db.templates, db.sessions, db.marks], async () => {
        await Promise.all([
          db.marks.clear(),
          db.sessions.clear(),
          db.people.clear(),
          db.groups.clear(),
          db.templates.clear(),
        ]);
      });
      window.location.reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Backup, restore, and manage your local data." />

      <div className="card p-5 space-y-3">
        <h2 className="font-bold text-ink-800">Backup & restore</h2>
        <p className="text-ink-500 text-sm">
          Your data lives only on this device. Export a JSON backup to keep it safe, or move it to
          another iPad.
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
        {importErr ? <div className="text-sm text-red-600">{importErr}</div> : null}
      </div>

      <div className="card p-5 space-y-3 border-red-100">
        <h2 className="font-bold text-red-700">Danger zone</h2>
        <p className="text-ink-500 text-sm">
          Permanently delete every class, person, template, session, and mark on this device.
        </p>
        <button className="btn-danger" onClick={() => setConfirmReset(true)} disabled={busy}>
          <Icon name="trash" size={18} />
          Reset all data
        </button>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset all data?"
        message="This permanently deletes everything stored on this device. You should export a backup first if you want to keep your data."
        confirmLabel="Yes, reset"
        onConfirm={wipeAll}
        onClose={() => setConfirmReset(false)}
      />
    </div>
  );
}
