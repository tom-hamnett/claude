import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, now, uid } from '../db';
import type { Mark, Person } from '../types';
import { Icon } from '../components/Icon';
import { Avatar } from '../components/Avatar';
import { CriterionSlider } from '../components/CriterionSlider';
import { ConfirmDialog } from '../components/Modal';

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
    }, delay)
  );
};

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
    [session?.groupId]
  );
  const marks = useLiveQuery(() => db.marks.where('sessionId').equals(id).toArray(), [id]);

  const [personIdx, setPersonIdx] = useState(0);
  const [confirmFinish, setConfirmFinish] = useState(false);

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

  if (!session) return <div className="text-ink-500">Loading session…</div>;
  if (!people) return <div className="text-ink-500">Loading people…</div>;

  if (people.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="text-ink-600 mb-3">There are no people in this class.</p>
        <Link to={`/groups/${session.groupId}`} className="btn-primary">
          Add people
        </Link>
      </div>
    );
  }

  const safeIdx = Math.min(personIdx, people.length - 1);
  const person: Person = people[safeIdx]!;
  const pMarks = personMarks.get(person.id) ?? new Map<string, Mark>();
  const personComplete = session.criteria.every((c) => pMarks.has(c.id));

  const setMark = (criterionId: string, value: number) => {
    const existing = pMarks.get(criterionId);
    const t = now();
    if (existing) {
      const updated: Mark = { ...existing, value, updatedAt: t };
      queueWrite(`${session.id}:${person.id}:${criterionId}`, () => {
        void db.marks.put(updated);
      });
    } else {
      const created: Mark = {
        id: uid(),
        sessionId: session.id,
        personId: person.id,
        criterionId,
        value,
        updatedAt: t,
      };
      // Add immediately so subsequent rapid changes find the row to update.
      void db.marks.add(created);
    }
  };

  const setComment = async (criterionId: string, comment: string) => {
    const existing = pMarks.get(criterionId);
    if (!existing) return; // require a value first
    await db.marks.update(existing.id, { comment, updatedAt: now() });
  };

  const goPrev = () => setPersonIdx((i) => Math.max(0, i - 1));
  const goNext = () => setPersonIdx((i) => Math.min(people.length - 1, i + 1));

  const finish = async () => {
    await db.sessions.update(session.id, { status: 'complete', updatedAt: now() });
    navigate(`/sessions/${session.id}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/sessions" className="btn-ghost">
          <Icon name="chevron-left" size={18} />
          Sessions
        </Link>
        <button className="btn-primary" onClick={() => setConfirmFinish(true)}>
          <Icon name="check" size={18} />
          Finish
        </button>
      </div>

      <header className="card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-ink-500 font-semibold uppercase tracking-wide">
              {session.title}
            </div>
            <div className="text-sm text-ink-500 truncate">
              Scale {session.scale.min}–{session.scale.max} · {session.criteria.length} criteria
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-ink-500 font-semibold uppercase tracking-wide">
              Progress
            </div>
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
            <div className="text-2xl font-extrabold text-ink-800 truncate">{person.name}</div>
            <div className="text-xs text-ink-500">
              Person {safeIdx + 1} of {people.length}
              {personComplete ? ' · all criteria marked' : ''}
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-5">
          {session.criteria.map((c) => {
            const m = pMarks.get(c.id);
            return (
              <div key={c.id} className="border border-ink-100 rounded-2xl p-4 bg-ink-50/40">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="font-bold text-ink-800">{c.name}</div>
                    {c.description ? (
                      <div className="text-xs text-ink-500 mt-0.5">{c.description}</div>
                    ) : null}
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
                <CriterionSlider
                  scale={session.scale}
                  value={m?.value}
                  onChange={(v) => setMark(c.id, v)}
                />
                {m ? (
                  <input
                    className="input mt-3 text-sm"
                    placeholder="Add a note (optional)"
                    defaultValue={m.comment ?? ''}
                    onBlur={(e) => setComment(c.id, e.target.value)}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="sticky bottom-20 md:bottom-4 z-10">
        <div className="card p-3 grid grid-cols-3 gap-2">
          <button className="btn-secondary" onClick={goPrev} disabled={safeIdx === 0}>
            <Icon name="chevron-left" size={18} />
            Previous
          </button>
          <div className="flex items-center justify-center text-sm text-ink-500">
            {safeIdx + 1} / {people.length}
          </div>
          <button
            className="btn-primary"
            onClick={goNext}
            disabled={safeIdx >= people.length - 1}
          >
            Next
            <Icon name="chevron-right" size={18} />
          </button>
        </div>
      </div>

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
    </div>
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
              aria-label={p.name}
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
