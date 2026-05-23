import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { TRACKS, mergeModules } from '../content/curriculum';
import { Page } from '../components/Shell';
import type { Module, Lesson, TrackId } from '../types';

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'module';
const lines = (a: string[]) => a.join('\n');
const toList = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

export default function Admin() {
  const overrides = useLiveQuery(() => db.curriculum.toArray(), []) || [];
  const modules = mergeModules(overrides);
  const editedNumbers = new Set(overrides.map((o) => o.number));
  const [draft, setDraft] = useState<Module | null>(null);
  const [newLesson, setNewLesson] = useState({ title: '', estMin: 5, markdown: '' });

  function edit(m: Module) { setDraft(JSON.parse(JSON.stringify(m))); setNewLesson({ title: '', estMin: 5, markdown: '' }); }
  function addNew() {
    const number = Math.max(0, ...modules.map((m) => m.number)) + 1;
    edit({
      number, slug: `module-${number}`, title: '', track: 'presence', oneLiner: '', estReadMin: 10,
      whyItMatters: '', learningObjectives: [], keyTerms: [], subAreas: [], lessons: [], principles: [],
      practice: [], warningSigns: [], diagnosticSignals: [], furtherReading: [], grounding: [], competencyIds: [],
    });
  }
  async function save() {
    if (!draft) return;
    const m: Module = { ...draft, slug: draft.slug || slugify(draft.title) };
    await db.curriculum.put(m);
    setDraft(null);
  }
  async function resetModule(n: number) {
    if (confirm('Reset this module to the built-in default?')) { await db.curriculum.delete(n); setDraft(null); }
  }
  function patch(p: Partial<Module>) { setDraft((d) => (d ? { ...d, ...p } : d)); }
  function addLesson() {
    if (!draft || !newLesson.title.trim()) return;
    const l: Lesson = { id: crypto.randomUUID(), title: newLesson.title.trim(), estMin: newLesson.estMin || 5, blocks: [], markdown: newLesson.markdown };
    patch({ lessons: [...draft.lessons, l] });
    setNewLesson({ title: '', estMin: 5, markdown: '' });
  }

  return (
    <Page title="Admin — curriculum" subtitle="Add, tweak and evolve the modules and lessons without touching code. Changes apply to the Learn surface immediately; reset any module to the built-in default at any time.">
      {!draft && (
        <>
          <div className="flex justify-end mb-3"><button onClick={addNew} className="btn-primary">+ New module</button></div>
          <div className="space-y-2">
            {modules.map((m) => (
              <div key={m.number} className="card p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink-900 truncate">M{m.number} {m.title} {editedNumbers.has(m.number) && <span className="chip-gold ml-1">edited</span>}</div>
                  <div className="text-xs text-ink-400 truncate">{m.oneLiner} · {m.lessons.length} lessons</div>
                </div>
                <button onClick={() => edit(m)} className="btn-secondary btn-sm">Edit</button>
                {editedNumbers.has(m.number) && <button onClick={() => resetModule(m.number)} className="btn-ghost btn-sm">Reset</button>}
              </div>
            ))}
          </div>
        </>
      )}

      {draft && (
        <div className="space-y-4 max-w-2xl">
          <button onClick={() => setDraft(null)} className="text-sm text-ink-400 hover:text-ink-700">← Back to list</button>
          <Field label="Title"><input className="input" value={draft.title} onChange={(e) => patch({ title: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Track">
              <select className="input" value={draft.track} onChange={(e) => patch({ track: e.target.value as TrackId })}>
                {TRACKS.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </Field>
            <Field label="Est. read (min)"><input type="number" className="input" value={draft.estReadMin} onChange={(e) => patch({ estReadMin: Number(e.target.value) || 0 })} /></Field>
          </div>
          <Field label="One-liner"><input className="input" value={draft.oneLiner} onChange={(e) => patch({ oneLiner: e.target.value })} /></Field>
          <Field label="Why it matters"><textarea className="input min-h-[90px]" value={draft.whyItMatters} onChange={(e) => patch({ whyItMatters: e.target.value })} /></Field>
          <Field label="Learning objectives (one per line)"><textarea className="input min-h-[90px]" value={lines(draft.learningObjectives)} onChange={(e) => patch({ learningObjectives: toList(e.target.value) })} /></Field>
          <Field label="Principles (one per line)"><textarea className="input min-h-[80px]" value={lines(draft.principles)} onChange={(e) => patch({ principles: toList(e.target.value) })} /></Field>
          <Field label="Warning signs (one per line)"><textarea className="input min-h-[80px]" value={lines(draft.warningSigns)} onChange={(e) => patch({ warningSigns: toList(e.target.value) })} /></Field>

          <div>
            <span className="label block mb-2">Lessons</span>
            <div className="space-y-2 mb-3">
              {draft.lessons.map((l, i) => (
                <div key={l.id} className="flex items-center gap-2">
                  <input className="input flex-1" value={l.title} onChange={(e) => { const ls = [...draft.lessons]; ls[i] = { ...l, title: e.target.value }; patch({ lessons: ls }); }} />
                  <span className="text-xs text-ink-400 w-20">{l.blocks?.length ? 'built-in' : 'markdown'}</span>
                  <button onClick={() => patch({ lessons: draft.lessons.filter((x) => x.id !== l.id) })} className="text-ink-300 hover:text-hot-500">✕</button>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-ink-200 p-3 space-y-2">
              <div className="label">Add a lesson (markdown)</div>
              <input className="input" placeholder="Lesson title" value={newLesson.title} onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })} />
              <textarea className="input min-h-[120px]" placeholder="Write the lesson in markdown. Use **bold**, *italic*, and blank lines for paragraphs." value={newLesson.markdown} onChange={(e) => setNewLesson({ ...newLesson, markdown: e.target.value })} />
              <button onClick={addLesson} className="btn-secondary btn-sm">+ Add lesson</button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={save} className="btn-primary">Save module</button>
            {editedNumbers.has(draft.number) && <button onClick={() => resetModule(draft.number)} className="btn-ghost">Reset to default</button>}
          </div>
        </div>
      )}
    </Page>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<label className="block"><span className="label block mb-1.5">{label}</span>{children}</label>);
}
