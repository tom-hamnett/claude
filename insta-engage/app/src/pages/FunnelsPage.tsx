import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { db, nowIso, uid } from '../db';
import type { Branch, Funnel, Intent, Stage, StageKind } from '../types';
import { analystsEdgeFunnel } from '../lib/seed';
import { Button, Card, Chip, Field, SectionTitle, inputCls, useToast } from '../components/ui';

const KINDS: StageKind[] = ['first_touch', 'follow_up', 'discovery', 'share_report', 'offer', 'nurture', 'closed'];
const BRANCH_INTENTS: Intent[] = ['interested', 'yes', 'named_company', 'question', 'not_now', 'no', 'no_reply'];

export function FunnelsPage() {
  const nav = useNavigate();
  const funnels = useLiveQuery(() => db.funnels.toArray()) ?? [];
  const counts = useLiveQuery(async () => {
    const m = new Map<string, number>();
    (await db.threads.toArray()).forEach((t) => m.set(t.funnelId, (m.get(t.funnelId) ?? 0) + 1));
    return m;
  });

  async function duplicate(f: Funnel) {
    const copy: Funnel = { ...structuredClone(f), id: uid(), name: `${f.name} (copy)`, active: false, createdAt: nowIso() };
    await db.funnels.put(copy);
    nav(`/funnels/${copy.id}`);
  }

  return (
    <div>
      <p className="px-1 text-sm text-ink-soft">
        One funnel per artefact you share. Copy one to launch the next product, then edit its stages and wording.
      </p>
      <div className="mt-3 space-y-2">
        {funnels.map((f) => (
          <Card key={f.id} className="py-3">
            <div className="flex items-start justify-between gap-2">
              <Link to={`/funnels/${f.id}`} className="min-w-0">
                <p className="truncate font-display text-[16px] font-bold">{f.name}</p>
                <p className="truncate text-xs text-ink-soft">{f.artefact}</p>
              </Link>
              {f.active ? <Chip tone="brand">Active</Chip> : <Chip>Off</Chip>}
            </div>
            <p className="mt-2 text-xs text-ink-faint">
              {f.stages.map((s) => s.name).join(' → ')} · {counts?.get(f.id) ?? 0} people
            </p>
            <div className="mt-2 flex gap-2">
              <Link to={`/funnels/${f.id}`}>
                <Button className="min-h-[36px] px-3">Edit</Button>
              </Link>
              <Button className="min-h-[36px] px-3" onClick={() => duplicate(f)}>
                Copy
              </Button>
            </div>
          </Card>
        ))}
      </div>
      <Button
        className="mt-3 w-full"
        onClick={async () => {
          const f = { ...analystsEdgeFunnel(), id: uid(), name: 'New funnel', artefact: 'What are we sharing?', active: false };
          await db.funnels.put(f);
          nav(`/funnels/${f.id}`);
        }}
      >
        New funnel from the standard shape
      </Button>
    </div>
  );
}

export function FunnelEditPage() {
  const { id } = useParams();
  const toast = useToast();
  const stored = useLiveQuery(() => db.funnels.get(id!), [id]);
  const [f, setF] = useState<Funnel | null>(null);
  const [openStage, setOpenStage] = useState<string | null>(null);
  useEffect(() => {
    if (stored && !f) setF(structuredClone(stored));
  }, [stored, f]);
  if (!f) return null;

  const setStage = (sid: string, patch: Partial<Stage>) => setF({ ...f, stages: f.stages.map((s) => (s.id === sid ? { ...s, ...patch } : s)) });
  const move = (i: number, d: number) => {
    const st = [...f.stages];
    const [x] = st.splice(i, 1);
    st.splice(i + d, 0, x);
    setF({ ...f, stages: st });
  };
  const setBranch = (s: Stage, when: Intent, goto: string) => {
    const others = s.branches.filter((b) => b.when !== when);
    const branches: Branch[] = goto ? [...others, { when, goto }] : others;
    setStage(s.id, { branches });
  };

  async function save() {
    if (f!.active) {
      // one active funnel at a time feeds "Draft for top N"
      await db.funnels.toCollection().modify((x) => {
        if (x.id !== f!.id) x.active = false;
      });
    }
    await db.funnels.put(f!);
    toast('Funnel saved. New drafts use it straight away.');
  }

  return (
    <div>
      <Card className="space-y-3">
        <Field label="Funnel name">
          <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <Field label="What we share (the artefact)">
          <input className={inputCls} value={f.artefact} onChange={(e) => setF({ ...f, artefact: e.target.value })} />
        </Field>
        <Field label="Order / product link" hint="Used in the closing message">
          <input className={inputCls} value={f.productUrl ?? ''} onChange={(e) => setF({ ...f, productUrl: e.target.value })} />
        </Field>
        <Chip active={f.active} onClick={() => setF({ ...f, active: !f.active })}>
          {f.active ? 'Active funnel' : 'Make active'}
        </Chip>
      </Card>

      <SectionTitle>Stages</SectionTitle>
      <p className="mb-2 px-1 text-xs text-ink-faint">
        Template variables: {'{first_name} {engagement_phrase} {interest_options} {topic} {employer} {employer_or_company} {report_subject} {peers_short} {challenge} {moment} {pack_name} {pack_price} {pack_what} {product_url}'}
      </p>
      <div className="space-y-2">
        {f.stages.map((s, i) => (
          <Card key={s.id} className="p-0">
            <button className="flex w-full items-center gap-2 px-4 py-3 text-left" onClick={() => setOpenStage(openStage === s.id ? null : s.id)}>
              <span className="grid h-6 w-6 place-items-center rounded-full bg-navy font-mono text-[11px] text-white">{i + 1}</span>
              <span className="flex-1 font-semibold">{s.name}</span>
              <Chip>{s.kind.replace('_', ' ')}</Chip>
            </button>
            {openStage === s.id && (
              <div className="space-y-3 border-t border-line px-4 py-3">
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Name">
                    <input className={inputCls} value={s.name} onChange={(e) => setStage(s.id, { name: e.target.value })} />
                  </Field>
                  <Field label="Kind">
                    <select className={inputCls} value={s.kind} onChange={(e) => setStage(s.id, { kind: e.target.value as StageKind })}>
                      {KINDS.map((k) => (
                        <option key={k}>{k}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Goal of this message">
                  <input className={inputCls} value={s.goal} onChange={(e) => setStage(s.id, { goal: e.target.value })} />
                </Field>
                <Field label="Message template">
                  <textarea className={inputCls} rows={4} value={s.template} onChange={(e) => setStage(s.id, { template: e.target.value })} />
                </Field>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Max words">
                    <input className={inputCls} inputMode="numeric" value={s.maxWords} onChange={(e) => setStage(s.id, { maxWords: Number(e.target.value) || 0 })} />
                  </Field>
                  <Field label="Follow-up days">
                    <input
                      className={inputCls}
                      inputMode="numeric"
                      value={s.followUpDays ?? ''}
                      onChange={(e) => setStage(s.id, { followUpDays: e.target.value ? Number(e.target.value) : null })}
                    />
                  </Field>
                  <Field label="Report">
                    <Chip active={s.attachReport} onClick={() => setStage(s.id, { attachReport: !s.attachReport })}>
                      {s.attachReport ? 'Attached' : 'None'}
                    </Chip>
                  </Field>
                </div>
                <Field label="When they reply… go to">
                  <div className="space-y-1.5">
                    {BRANCH_INTENTS.map((intent) => (
                      <div key={intent} className="grid grid-cols-[120px_1fr] items-center gap-2">
                        <span className="text-xs text-ink-soft">{intent.replace('_', ' ')}</span>
                        <select
                          className={`${inputCls} py-1.5 text-sm`}
                          value={s.branches.find((b) => b.when === intent)?.goto ?? ''}
                          onChange={(e) => setBranch(s, intent, e.target.value)}
                        >
                          <option value="">(stay)</option>
                          {f.stages.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name}
                            </option>
                          ))}
                          <option value="stop">Stop</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </Field>
                <div className="flex gap-2">
                  <Button className="min-h-[36px] px-3" disabled={i === 0} onClick={() => move(i, -1)}>
                    Up
                  </Button>
                  <Button className="min-h-[36px] px-3" disabled={i === f.stages.length - 1} onClick={() => move(i, 1)}>
                    Down
                  </Button>
                  <Button kind="danger" className="ml-auto min-h-[36px] px-3" onClick={() => setF({ ...f, stages: f.stages.filter((x) => x.id !== s.id) })}>
                    Remove
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
      <Button
        className="mt-2 w-full"
        onClick={() => {
          const s: Stage = { id: uid().slice(0, 8), name: 'New stage', kind: 'follow_up', goal: '', template: 'Hi {first_name}, ', maxWords: 40, attachReport: false, followUpDays: 4, branches: [] };
          setF({ ...f, stages: [...f.stages, s] });
          setOpenStage(s.id);
        }}
      >
        Add stage
      </Button>
      <div className="sticky bottom-[84px] mt-4">
        <Button kind="primary" className="w-full shadow-lg" onClick={save}>
          Save funnel
        </Button>
      </div>
    </div>
  );
}
