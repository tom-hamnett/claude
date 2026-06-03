import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, now, uid } from '../db';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import type { KnowledgeCard, KnowledgeKind } from '../types';

const KIND_LABEL: Record<KnowledgeKind, string> = {
  benchmark: 'Benchmark',
  'reference-model': 'Reference model',
  'best-practice': 'Best practice',
  risk: 'Risk',
  note: 'Note',
};

const KIND_CHIP: Record<KnowledgeKind, string> = {
  benchmark: 'bg-flux-100 text-flux-700',
  'reference-model': 'bg-brand-100 text-brand-700',
  'best-practice': 'bg-va-100 text-va-700',
  risk: 'bg-nva-100 text-nva-700',
  note: 'bg-ink-100 text-ink-600',
};

export default function KnowledgePage() {
  const cards = useLiveQuery(() => db.knowledge.orderBy('createdAt').reverse().toArray(), []);
  const [filter, setFilter] = useState<'all' | KnowledgeKind>('all');
  const [add, setAdd] = useState(false);

  const filtered = useMemo(() => (cards ?? []).filter((c) => filter === 'all' || c.kind === filter), [cards, filter]);
  const unvalidated = (cards ?? []).filter((c) => c.source === 'ai-research' && !c.validated).length;

  async function validate(c: KnowledgeCard) {
    await db.knowledge.put({ ...c, validated: true });
  }
  async function remove(id: string) {
    await db.knowledge.delete(id);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Knowledge library</h1>
          <p className="text-ink-500">FLUX upskills itself here — reference models, benchmarks and best practices accrue across engagements and feed back into every analysis.</p>
        </div>
        <button className="btn-primary" onClick={() => setAdd(true)}>
          <Icon name="plus" className="h-4 w-4" /> Add card
        </button>
      </div>

      {unvalidated > 0 && (
        <div className="card flex items-center gap-2 border-l-4 border-bva-500 p-3 text-sm text-bva-700">
          <Icon name="warning" className="h-4 w-4" />
          {unvalidated} AI-researched card{unvalidated === 1 ? '' : 's'} await human validation. Benchmarks are indicative until checked against client actuals.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(['all', 'benchmark', 'reference-model', 'best-practice', 'risk', 'note'] as const).map((k) => (
          <button
            key={k}
            className={`chip ${filter === k ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-600'}`}
            onClick={() => setFilter(k)}
          >
            {k === 'all' ? 'All' : KIND_LABEL[k]}
          </button>
        ))}
      </div>

      {!filtered.length ? (
        <div className="card p-10 text-center text-ink-400">
          No knowledge yet. Research benchmarks when mapping a process, or add a card manually.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((c) => (
            <div key={c.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className={`chip ${KIND_CHIP[c.kind]}`}>{KIND_LABEL[c.kind]}</span>
                  {c.source === 'ai-research' && (
                    <span className={`chip ml-1 ${c.validated ? 'bg-va-100 text-va-700' : 'bg-ink-100 text-ink-400'}`}>
                      {c.validated ? '✓ validated' : 'AI · unvalidated'}
                    </span>
                  )}
                </div>
                <button className="text-ink-300 hover:text-nva-600" onClick={() => remove(c.id)}>
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              </div>
              <h3 className="mt-2 font-semibold text-ink-800">{c.title}</h3>
              <div className="text-xs text-ink-400">{c.domain}</div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink-600">{c.body}</p>
              {c.tags?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {c.tags.map((t) => <span key={t} className="chip bg-ink-50 text-ink-400">{t}</span>)}
                </div>
              )}
              {c.source === 'ai-research' && !c.validated && (
                <button className="btn-outline mt-3 text-sm" onClick={() => validate(c)}>
                  <Icon name="check" className="h-4 w-4" /> Mark validated
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <AddCardModal open={add} onClose={() => setAdd(false)} />
    </div>
  );
}

function AddCardModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [f, setF] = useState({ kind: 'best-practice' as KnowledgeKind, title: '', domain: '', body: '', tags: '' });
  async function save() {
    if (!f.title.trim() || !f.body.trim()) return;
    const card: KnowledgeCard = {
      id: uid(),
      kind: f.kind,
      title: f.title.trim(),
      domain: f.domain.trim() || 'General',
      body: f.body.trim(),
      tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean),
      source: 'user',
      validated: true,
      createdAt: now(),
    };
    await db.knowledge.put(card);
    setF({ kind: 'best-practice', title: '', domain: '', body: '', tags: '' });
    onClose();
  }
  return (
    <Modal open={open} onClose={onClose} title="Add knowledge card">
      <div className="space-y-3">
        <div>
          <label className="label">Kind</label>
          <select className="input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as KnowledgeKind })}>
            {(Object.keys(KIND_LABEL) as KnowledgeKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
          </select>
        </div>
        <div><label className="label">Title</label><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div><label className="label">Domain</label><input className="input" value={f.domain} onChange={(e) => setF({ ...f, domain: e.target.value })} placeholder="Manufacturing / Procure-to-Pay" /></div>
        <div><label className="label">Body</label><textarea className="input min-h-[120px]" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></div>
        <div><label className="label">Tags (comma-separated)</label><input className="input" value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} /></div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={save} disabled={!f.title.trim() || !f.body.trim()}>Save card</button>
      </div>
    </Modal>
  );
}
