import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getSettings } from '../db';
import type { Settings } from '../types';
import { exportBundle, importBundle, type Bundle } from '../lib/actions';
import { sampleBundle } from '../lib/sample';
import { Button, Card, Field, SectionTitle, inputCls, useToast } from '../components/ui';

export function MorePage() {
  const toast = useToast();
  const [raw, setRaw] = useState('');
  const stored = useLiveQuery(() => getSettings());
  const [s, setS] = useState<Settings | null>(null);
  useEffect(() => {
    if (stored && !s) setS(stored);
  }, [stored, s]);

  async function doImport(text: string) {
    try {
      const b = JSON.parse(text) as Bundle;
      const r = await importBundle(b);
      toast(`Imported: ${r.added} new, ${r.updated} updated, ${r.reportsReady} reports ready, ${r.drafts} Claude drafts.`);
      setRaw('');
    } catch (e) {
      toast(`Could not import: ${(e as Error).message}`);
    }
  }

  async function doExport() {
    const b = await exportBundle();
    const blob = new Blob([JSON.stringify(b, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `insta-engage-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const list = (v: string[]) => v.join(', ');
  const parse = (v: string) => v.split(',').map((x) => x.trim()).filter(Boolean);

  return (
    <div>
      <SectionTitle>Import a collection run</SectionTitle>
      <Card className="space-y-3">
        <p className="text-sm text-ink-soft">
          Paste the JSON from a Claude collection or drafting run (likers, followers, profile notes, reports, drafts). Existing people are merged by handle; do-not-contact flags are never cleared.
        </p>
        <textarea className={`${inputCls} font-mono text-xs`} rows={5} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder='{"version":1,"contacts":[…]}' />
        <div className="grid grid-cols-2 gap-2">
          <Button kind="primary" disabled={!raw.trim()} onClick={() => doImport(raw)}>
            Import
          </Button>
          <label className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-line bg-surface text-sm font-semibold">
            Choose file
            <input type="file" accept="application/json,.json" className="hidden" onChange={async (e) => e.target.files?.[0] && doImport(await e.target.files[0].text())} />
          </label>
        </div>
        <Button kind="ghost" className="w-full" onClick={() => doImport(JSON.stringify(sampleBundle()))}>
          Load 8 sample leads to try it
        </Button>
      </Card>

      <SectionTitle>Backup</SectionTitle>
      <Card className="space-y-2">
        <p className="text-sm text-ink-soft">Everything lives on this phone until the database is connected. Export a backup now and then.</p>
        <Button className="w-full" onClick={doExport}>
          Export everything (JSON)
        </Button>
      </Card>

      {s && (
        <>
          <SectionTitle>Rules</SectionTitle>
          <Card className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Field label="New / day">
                <input className={inputCls} inputMode="numeric" value={s.dailyCap} onChange={(e) => setS({ ...s, dailyCap: Number(e.target.value) || 0 })} />
              </Field>
              <Field label="Batch size">
                <input className={inputCls} inputMode="numeric" value={s.topN} onChange={(e) => setS({ ...s, topN: Number(e.target.value) || 0 })} />
              </Field>
              <Field label="Cohort staff">
                <input className={inputCls} inputMode="numeric" value={s.cohortThreshold} onChange={(e) => setS({ ...s, cohortThreshold: Number(e.target.value) || 0 })} />
              </Field>
            </div>
            <p className="text-[11px] text-ink-faint">Companies under the cohort headcount get a whole-company example; larger ones get the function the person cares about.</p>
            <Field label="Target functions">
              <input className={inputCls} value={list(s.targetFunctions)} onChange={(e) => setS({ ...s, targetFunctions: parse(e.target.value) })} />
            </Field>
            <Field label="Blocked sectors" hint="No reports or outreach for people in these sectors">
              <input className={inputCls} value={list(s.blockedSectors)} onChange={(e) => setS({ ...s, blockedSectors: parse(e.target.value) })} />
            </Field>
            <Field label="Blocked companies">
              <input className={inputCls} value={list(s.blockedCompanies)} onChange={(e) => setS({ ...s, blockedCompanies: parse(e.target.value) })} />
            </Field>
            <Field label="Salesy words to flag">
              <textarea className={inputCls} rows={3} value={list(s.bannedWords)} onChange={(e) => setS({ ...s, bannedWords: parse(e.target.value) })} />
            </Field>
            <Button
              kind="primary"
              className="w-full"
              onClick={async () => {
                await db.settings.put(s);
                toast('Rules saved.');
              }}
            >
              Save rules
            </Button>
          </Card>
        </>
      )}

      <SectionTitle>How to message</SectionTitle>
      <Card className="text-sm leading-relaxed text-ink-soft">
        <ol className="list-decimal space-y-1 pl-4">
          <li>First message ≤45 words, follow-up ≤30, sharing the example ≤60, offer ≤70.</li>
          <li>One question, at the end, answerable in one word. Say one word is plenty.</li>
          <li>Personalise on what they did. Mention their company once they reply or it is in their bio.</li>
          <li>No links or files in the first message. Ask "want me to send it?" first.</li>
          <li>Every ask has an easy out. No price until they have seen the example and said yes.</li>
          <li>Two follow-ups at most, then stop. Non-followers get one message only. Any no ends it.</li>
          <li>Send by hand, at most 20 new conversations a day, never the same text twice in a row.</li>
        </ol>
        <p className="mt-2 text-xs text-ink-faint">Full research: insta-engage/docs/messaging-principles.md</p>
      </Card>
    </div>
  );
}
