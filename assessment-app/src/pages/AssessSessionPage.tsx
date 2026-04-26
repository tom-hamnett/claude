import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getSettings, now, uid } from '../db';
import type { Mark, Person, SessionCriterion } from '../types';
import { Icon } from '../components/Icon';
import { Avatar } from '../components/Avatar';
import { CriterionSlider } from '../components/CriterionSlider';
import { ConfirmDialog, Modal } from '../components/Modal';
import { EvidenceCapture } from '../components/EvidenceCapture';
import { AIBadge } from '../components/AIBadge';
import { PaywallModal } from '../components/PaywallModal';
import { calibrationCoach, type CalibrationNote } from '../services/sigmaAI';
import { canUseAI } from '../services/license';
import { AIError } from '../services/ai';

/** Per-mark debounced upsert so the slider feels instant but writes are coalesced. */
const writeQueue = new Map<string, ReturnType<typeof setTimeout>>();
const queueWrite = (key: string, fn: () => Promise<void> | void, delay = 200) => {
  const existing = writeQueue.get(key);
  if (existing) clearTimeout(existing);
  writeQueue.set(
    key,
    setTimeout(async () => {
      writeQueue.delete(key);
      await fn();
    }, delay),
  );
};

type Mode = 'by-person' | 'by-criterion';

export default function AssessSessionPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const session = useLiveQuery(() => db.sessions.get(id), [id]);
  const people = useLiveQuery(
    async () => {
      if (!session) return [];
      return db.people
        .where('groupId')
        .equals(session.groupId)
        .filter((p) => !p.archived)
        .sortBy('name');
    },
    [session?.groupId],
  );
  const marks = useLiveQuery(() => db.marks.where('sessionId').equals(id).toArray(), [id]);
  const settings = useLiveQuery(() => getSettings(), []);

  const [mode, setMode] = useState<Mode>('by-person');
  const [personIdx, setPersonIdx] = useState(0);
  const [criterionIdx, setCriterionIdx] = useState(0);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  const [coachBusy, setCoachBusy] = useState(false);
  const [coachNotes, setCoachNotes] = useState<CalibrationNote[] | null>(null);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState<string | undefined>();

  const personMarks = useMemo(() => {
    const map = new Map<string, Map<string, Mark>>();
    for (const m of marks ?? []) {
      if (!map.has(m.personId)) map.set(m.personId, new Map());
      map.get(m.personId)!.set(m.criterionId, m);
    }
    return map;
  }, [marks]);

  const completedCount = useMemo(() => {
    if (!session || !people) return 0;
    let c = 0;
    for (const p of people) {
      const pm = personMarks.get(p.id);
      if (pm && session.criteria.every((cr) => pm.has(cr.id))) c++;
    }
    return c;
  }, [people, personMarks, session]);

  // Keyboard shortcuts: ← → for prev/next, J K for criterion nav, M to toggle mode.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!people || !session) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (mode === 'by-person') setPersonIdx((i) => Math.min(people.length - 1, i + 1));
        else setCriterionIdx((i) => Math.min(session.criteria.length - 1, i + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (mode === 'by-person') setPersonIdx((i) => Math.max(0, i - 1));
        else setCriterionIdx((i) => Math.max(0, i - 1));
      } else if (e.key === 'm' || e.key === 'M') {
        setMode((m) => (m === 'by-person' ? 'by-criterion' : 'by-person'));
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mode, people, session]);

  if (!session) return <div className="text-ink-500">Loading session…</div>;
  if (!people) return <div className="text-ink-500">Loading people…</div>;

  if (people.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="text-ink-600 mb-3">There are no people in this group.</p>
        <Link to={`/groups/${session.groupId}`} className="btn-primary">
          Add people
        </Link>
      </div>
    );
  }

  const setMark = (personId: string, criterionId: string, value: number) => {
    const pm = personMarks.get(personId) ?? new Map<string, Mark>();
    const existing = pm.get(criterionId);
    const t = now();
    if (existing) {
      const updated: Mark = { ...existing, value, updatedAt: t };
      queueWrite(`${session.id}:${personId}:${criterionId}`, () => {
        void db.marks.put(updated);
      });
    } else {
      const created: Mark = {
        id: uid(),
        sessionId: session.id,
        personId,
        criterionId,
        value,
        updatedAt: t,
      };
      void db.marks.add(created);
    }
  };

  const setComment = async (personId: string, criterionId: string, comment: string) => {
    const pm = personMarks.get(personId);
    const existing = pm?.get(criterionId);
    if (!existing) return;
    await db.marks.update(existing.id, { comment, updatedAt: now() });
  };

  const attachEvidence = async (personId: string, criterionId: string, evId: string) => {
    const pm = personMarks.get(personId);
    const existing = pm?.get(criterionId);
    if (!existing) return;
    const next = Array.from(new Set([...(existing.evidenceIds ?? []), evId]));
    await db.marks.update(existing.id, { evidenceIds: next, updatedAt: now() });
  };
  const detachEvidence = async (personId: string, criterionId: string, evId: string) => {
    const pm = personMarks.get(personId);
    const existing = pm?.get(criterionId);
    if (!existing) return;
    const next = (existing.evidenceIds ?? []).filter((x) => x !== evId);
    await db.marks.update(existing.id, { evidenceIds: next, updatedAt: now() });
  };

  /** Copy the previous person's marks for the same criteria to this person. */
  const copyFromPrevious = async (toPersonId: string) => {
    const idx = people.findIndex((p) => p.id === toPersonId);
    if (idx <= 0) return;
    const fromId = people[idx - 1].id;
    const fromMap = personMarks.get(fromId);
    if (!fromMap) return;
    const t = now();
    const toMap = personMarks.get(toPersonId) ?? new Map<string, Mark>();
    const updates: Mark[] = [];
    const inserts: Mark[] = [];
    for (const c of session.criteria) {
      const src = fromMap.get(c.id);
      if (!src) continue;
      const existing = toMap.get(c.id);
      if (existing) updates.push({ ...existing, value: src.value, updatedAt: t });
      else
        inserts.push({
          id: uid(),
          sessionId: session.id,
          personId: toPersonId,
          criterionId: c.id,
          value: src.value,
          updatedAt: t,
        });
    }
    await db.transaction('rw', db.marks, async () => {
      if (inserts.length) await db.marks.bulkAdd(inserts);
      for (const u of updates) await db.marks.put(u);
    });
  };

  const finish = async () => {
    await db.sessions.update(session.id, { status: 'complete', updatedAt: now() });
    navigate(`/sessions/${session.id}`);
  };

  const runCoach = async () => {
    setShowCoach(true);
    setCoachBusy(true);
    setCoachError(null);
    setCoachNotes(null);
    try {
      const gate = await canUseAI();
      if (!gate.ok) {
        setCoachBusy(false);
        setShowCoach(false);
        setPaywallReason(gate.reason);
        setShowPaywall(true);
        return;
      }
      const notes = await calibrationCoach({
        session,
        people,
        marks: marks ?? [],
        vertical: settings?.defaultVertical,
      });
      setCoachNotes(notes);
    } catch (err) {
      const msg = err instanceof AIError ? err.message : err instanceof Error ? err.message : 'Coach failed.';
      setCoachError(msg);
    } finally {
      setCoachBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link to="/sessions" className="btn-ghost" aria-label="Back to sessions">
          <Icon name="chevron-left" size={18} />
          Sessions
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          <ModeToggle mode={mode} onChange={setMode} />
          <button
            className="btn-secondary"
            onClick={runCoach}
            title="Sigma AI calibration coach"
          >
            <Icon name="lightbulb" size={16} />
            Coach
          </button>
          <button className="btn-primary" onClick={() => setConfirmFinish(true)}>
            <Icon name="check" size={18} />
            Finish
          </button>
        </div>
      </div>

      <header className="card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-ink-500 font-semibold uppercase tracking-wide">{session.title}</div>
            <div className="text-sm text-ink-500 truncate">
              Scale {session.scale.min}–{session.scale.max} · {session.criteria.length} criteria
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-ink-500 font-semibold uppercase tracking-wide">Progress</div>
            <div className="font-bold text-ink-800">
              {completedCount} / {people.length}
            </div>
          </div>
        </div>
        <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden mt-3">
          <div
            className="h-full bg-brand-500 transition-all"
            style={{ width: `${people.length === 0 ? 0 : (completedCount / people.length) * 100}%` }}
          />
        </div>
      </header>

      {mode === 'by-person' ? (
        <ByPersonView
          session={session}
          people={people}
          personIdx={personIdx}
          setPersonIdx={setPersonIdx}
          personMarks={personMarks}
          setMark={setMark}
          setComment={setComment}
          attachEvidence={attachEvidence}
          detachEvidence={detachEvidence}
          copyFromPrevious={copyFromPrevious}
        />
      ) : (
        <ByCriterionView
          session={session}
          people={people}
          criterionIdx={criterionIdx}
          setCriterionIdx={setCriterionIdx}
          personMarks={personMarks}
          setMark={setMark}
        />
      )}

      <ConfirmDialog
        open={confirmFinish}
        title="Finish session?"
        message={
          completedCount < people.length
            ? `You've assessed ${completedCount} of ${people.length} people. You can still finish — incomplete people will simply have no marks.`
            : 'All people assessed. Mark this session complete?'
        }
        confirmLabel="Finish"
        destructive={false}
        onConfirm={finish}
        onClose={() => setConfirmFinish(false)}
      />

      <Modal
        open={showCoach}
        onClose={() => setShowCoach(false)}
        title={
          <div className="flex items-center gap-2">
            <Icon name="lightbulb" size={20} className="text-brand-600" />
            Calibration coach
            <AIBadge />
          </div>
        }
        size="md"
        footer={
          <button className="btn-secondary" onClick={() => setShowCoach(false)}>
            Close
          </button>
        }
      >
        {coachBusy ? (
          <div className="text-ink-500">Reviewing your marks…</div>
        ) : coachError ? (
          <div className="text-sm text-hot-600">{coachError}</div>
        ) : coachNotes && coachNotes.length === 0 ? (
          <div className="text-ink-600">
            No calibration concerns spotted. Marks look balanced for the data so far.
          </div>
        ) : coachNotes ? (
          <ul className="space-y-2">
            {coachNotes.map((n, i) => (
              <li key={i} className="border border-ink-100 rounded-xl p-3 bg-ink-50/40">
                <span className="chip-brand mr-2 capitalize">{n.kind.replace('-', ' ')}</span>
                <span className="text-ink-700">{n.message}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-ink-500">Add at least 6 marks to use the coach.</div>
        )}
      </Modal>

      <PaywallModal
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        reason={paywallReason}
      />
    </div>
  );
}

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div
      className="bg-white rounded-xl border border-ink-200 p-0.5 flex"
      role="tablist"
      aria-label="Assessment mode"
    >
      <button
        role="tab"
        aria-selected={mode === 'by-person'}
        className={`px-3 py-1.5 text-xs font-bold rounded-lg ${mode === 'by-person' ? 'bg-brand-500 text-white' : 'text-ink-600'}`}
        onClick={() => onChange('by-person')}
        title="One person at a time (M to toggle)"
      >
        By person
      </button>
      <button
        role="tab"
        aria-selected={mode === 'by-criterion'}
        className={`px-3 py-1.5 text-xs font-bold rounded-lg ${mode === 'by-criterion' ? 'bg-brand-500 text-white' : 'text-ink-600'}`}
        onClick={() => onChange('by-criterion')}
        title="One criterion at a time (M to toggle)"
      >
        By criterion
      </button>
    </div>
  );
}

function ByPersonView({
  session,
  people,
  personIdx,
  setPersonIdx,
  personMarks,
  setMark,
  setComment,
  attachEvidence,
  detachEvidence,
  copyFromPrevious,
}: {
  session: { id: string; criteria: SessionCriterion[]; scale: { min: number; max: number; step: number; labels?: string[] } };
  people: Person[];
  personIdx: number;
  setPersonIdx: (idx: number) => void;
  personMarks: Map<string, Map<string, Mark>>;
  setMark: (personId: string, criterionId: string, value: number) => void;
  setComment: (personId: string, criterionId: string, comment: string) => void;
  attachEvidence: (personId: string, criterionId: string, evId: string) => void;
  detachEvidence: (personId: string, criterionId: string, evId: string) => void;
  copyFromPrevious: (personId: string) => void;
}) {
  const safeIdx = Math.min(personIdx, people.length - 1);
  const person: Person = people[safeIdx]!;
  const pMarks = personMarks.get(person.id) ?? new Map<string, Mark>();
  const personComplete = session.criteria.every((c) => pMarks.has(c.id));
  const personHasAnyMark = session.criteria.some((c) => pMarks.has(c.id));

  return (
    <>
      <PersonStrip
        people={people}
        activeIdx={safeIdx}
        getStatus={(p) => {
          const pm = personMarks.get(p.id);
          if (!pm) return 'empty';
          if (session.criteria.every((c) => pm.has(c.id))) return 'complete';
          return 'partial';
        }}
        onSelect={(idx) => setPersonIdx(idx)}
      />

      <div className="card p-5">
        <div className="flex items-center gap-3">
          <Avatar name={person.name} size={56} />
          <div className="flex-1 min-w-0">
            <div className="text-2xl font-extrabold text-ink-800 truncate outdoor">{person.name}</div>
            <div className="text-xs text-ink-500">
              Person {safeIdx + 1} of {people.length}
              {personComplete ? ' · all criteria marked' : ''}
            </div>
          </div>
          {!personHasAnyMark && safeIdx > 0 && (
            <button
              className="btn-secondary text-xs"
              onClick={() => copyFromPrevious(person.id)}
              title="Copy marks from previous person"
            >
              <Icon name="copy" size={14} />
              Copy prev
            </button>
          )}
        </div>

        <div className="mt-5 space-y-5">
          {session.criteria.map((c) => {
            const m = pMarks.get(c.id);
            return (
              <div key={c.id} className="border border-ink-100 rounded-2xl p-4 bg-ink-50/40">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="font-bold text-ink-800">{c.name}</div>
                    {c.description ? <div className="text-xs text-ink-500 mt-0.5">{c.description}</div> : null}
                  </div>
                  {m ? (
                    <span className="chip bg-emerald-100 text-emerald-700">
                      <Icon name="check" size={12} />
                      Marked
                    </span>
                  ) : (
                    <span className="chip">Pending</span>
                  )}
                </div>
                <CriterionSlider scale={session.scale} value={m?.value} onChange={(v) => setMark(person.id, c.id, v)} />
                {m ? (
                  <>
                    <input
                      className="input mt-3 text-sm"
                      placeholder="Add a note (optional)"
                      defaultValue={m.comment ?? ''}
                      onBlur={(e) => setComment(person.id, c.id, e.target.value)}
                    />
                    <div className="mt-2">
                      <EvidenceCapture
                        sessionId={session.id}
                        personId={person.id}
                        criterionId={c.id}
                        evidenceIds={m.evidenceIds ?? []}
                        onAttach={(id) => attachEvidence(person.id, c.id, id)}
                        onDetach={(id) => detachEvidence(person.id, c.id, id)}
                        compact
                      />
                    </div>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="sticky bottom-20 md:bottom-4 z-10">
        <div className="card p-3 grid grid-cols-3 gap-2">
          <button className="btn-secondary" onClick={() => setPersonIdx(Math.max(0, safeIdx - 1))} disabled={safeIdx === 0}>
            <Icon name="chevron-left" size={18} />
            Previous
          </button>
          <div className="flex items-center justify-center text-sm text-ink-500">
            {safeIdx + 1} / {people.length}
          </div>
          <button
            className="btn-primary"
            onClick={() => setPersonIdx(Math.min(people.length - 1, safeIdx + 1))}
            disabled={safeIdx >= people.length - 1}
          >
            Next
            <Icon name="chevron-right" size={18} />
          </button>
        </div>
      </div>
    </>
  );
}

function ByCriterionView({
  session,
  people,
  criterionIdx,
  setCriterionIdx,
  personMarks,
  setMark,
}: {
  session: { id: string; criteria: SessionCriterion[]; scale: { min: number; max: number; step: number; labels?: string[] } };
  people: Person[];
  criterionIdx: number;
  setCriterionIdx: (idx: number) => void;
  personMarks: Map<string, Map<string, Mark>>;
  setMark: (personId: string, criterionId: string, value: number) => void;
}) {
  const safeIdx = Math.min(criterionIdx, session.criteria.length - 1);
  const criterion = session.criteria[safeIdx]!;
  const listRef = useRef<HTMLDivElement | null>(null);

  return (
    <>
      <div className="card p-2 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {session.criteria.map((c, i) => (
            <button
              key={c.id}
              onClick={() => setCriterionIdx(i)}
              className={`shrink-0 px-3 py-2 rounded-xl text-xs font-semibold ${
                i === safeIdx ? 'bg-brand-500 text-white' : 'text-ink-700 hover:bg-ink-100'
              }`}
            >
              {i + 1}. {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-ink-500 font-semibold uppercase tracking-wide">
              Criterion {safeIdx + 1} of {session.criteria.length}
            </div>
            <div className="text-2xl font-extrabold text-ink-800 outdoor">{criterion.name}</div>
            {criterion.description ? (
              <div className="text-sm text-ink-500 mt-1">{criterion.description}</div>
            ) : null}
          </div>
          <div className="text-xs text-ink-500">
            Mark each person on this criterion. Use ←/→ to switch criterion.
          </div>
        </div>
        <div ref={listRef} className="space-y-3">
          {people.map((p) => {
            const m = personMarks.get(p.id)?.get(criterion.id);
            return (
              <div key={p.id} className="border border-ink-100 rounded-2xl p-3 bg-ink-50/40">
                <div className="flex items-center gap-3 mb-2">
                  <Avatar name={p.name} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-ink-800 truncate">{p.name}</div>
                  </div>
                  {m ? (
                    <span className="chip bg-emerald-100 text-emerald-700">
                      <Icon name="check" size={12} />
                      {m.value}
                    </span>
                  ) : (
                    <span className="chip">—</span>
                  )}
                </div>
                <CriterionSlider scale={session.scale} value={m?.value} onChange={(v) => setMark(p.id, criterion.id, v)} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="sticky bottom-20 md:bottom-4 z-10">
        <div className="card p-3 grid grid-cols-3 gap-2">
          <button
            className="btn-secondary"
            onClick={() => setCriterionIdx(Math.max(0, safeIdx - 1))}
            disabled={safeIdx === 0}
          >
            <Icon name="chevron-left" size={18} />
            Previous
          </button>
          <div className="flex items-center justify-center text-sm text-ink-500">
            {safeIdx + 1} / {session.criteria.length}
          </div>
          <button
            className="btn-primary"
            onClick={() => setCriterionIdx(Math.min(session.criteria.length - 1, safeIdx + 1))}
            disabled={safeIdx >= session.criteria.length - 1}
          >
            Next
            <Icon name="chevron-right" size={18} />
          </button>
        </div>
      </div>
    </>
  );
}

function PersonStrip({
  people,
  activeIdx,
  getStatus,
  onSelect,
}: {
  people: Person[];
  activeIdx: number;
  getStatus: (p: Person) => 'empty' | 'partial' | 'complete';
  onSelect: (idx: number) => void;
}) {
  return (
    <div className="card p-2 overflow-x-auto">
      <div className="flex items-center gap-2 min-w-max">
        {people.map((p, i) => {
          const s = getStatus(p);
          const ring =
            s === 'complete'
              ? 'ring-2 ring-emerald-400'
              : s === 'partial'
              ? 'ring-2 ring-amber-400'
              : 'ring-1 ring-ink-200';
          return (
            <button
              key={p.id}
              onClick={() => onSelect(i)}
              className={`shrink-0 flex flex-col items-center gap-1 px-2 py-1 rounded-xl ${
                i === activeIdx ? 'bg-brand-50' : ''
              }`}
              aria-label={`Select ${p.name}`}
            >
              <div className={`rounded-full ${ring}`}>
                <Avatar name={p.name} size={36} />
              </div>
              <div className="text-[11px] font-semibold text-ink-600 max-w-[64px] truncate">
                {p.name.split(' ')[0]}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
