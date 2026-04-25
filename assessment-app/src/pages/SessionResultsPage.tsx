import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Mark, Person } from '../types';
import { Icon } from '../components/Icon';
import { Avatar } from '../components/Avatar';
import { fmtDateTime, formatMark, labelForValue, buildCSV, downloadFile } from '../lib/format';
import { ConfirmDialog } from '../components/Modal';

export default function SessionResultsPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const session = useLiveQuery(() => db.sessions.get(id), [id]);
  const group = useLiveQuery(
    () => (session ? db.groups.get(session.groupId) : undefined),
    [session?.groupId]
  );
  const people = useLiveQuery(
    async () => {
      if (!session) return [];
      return db.people.where('groupId').equals(session.groupId).sortBy('name');
    },
    [session?.groupId]
  );
  const marks = useLiveQuery(() => db.marks.where('sessionId').equals(id).toArray(), [id]);

  const [confirmDelete, setConfirmDelete] = useState(false);

  const personMap = useMemo(() => {
    const map = new Map<string, Map<string, Mark>>();
    for (const m of marks ?? []) {
      if (!map.has(m.personId)) map.set(m.personId, new Map());
      map.get(m.personId)!.set(m.criterionId, m);
    }
    return map;
  }, [marks]);

  if (!session) return <div className="text-ink-500">Loading…</div>;

  const peopleWithMarks: Person[] = (people ?? []).filter((p) => personMap.has(p.id));

  const personAvg = (p: Person): number | undefined => {
    const m = personMap.get(p.id);
    if (!m || m.size === 0) return undefined;
    let sum = 0;
    for (const v of m.values()) sum += v.value;
    return sum / m.size;
  };

  const criterionStats = session.criteria.map((c) => {
    const vals: number[] = [];
    for (const pm of personMap.values()) {
      const mk = pm.get(c.id);
      if (mk) vals.push(mk.value);
    }
    const avg = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : undefined;
    return { criterion: c, count: vals.length, avg };
  });

  const exportCSV = () => {
    const header = ['Person', ...session.criteria.map((c) => c.name), 'Average', 'Comments'];
    const rows = (people ?? []).map((p) => {
      const m = personMap.get(p.id);
      const cells = session.criteria.map((c) => {
        const mk = m?.get(c.id);
        return mk ? formatMark(mk.value, session.scale) : '';
      });
      const avg = personAvg(p);
      const comments = session.criteria
        .map((c) => {
          const mk = m?.get(c.id);
          return mk?.comment ? `${c.name}: ${mk.comment}` : '';
        })
        .filter(Boolean)
        .join(' | ');
      return [p.name, ...cells, avg !== undefined ? avg.toFixed(2) : '', comments];
    });
    const csv = buildCSV([header, ...rows]);
    const filename = `${session.title.replace(/[^\w]+/g, '-')}_${new Date(session.date)
      .toISOString()
      .slice(0, 10)}.csv`;
    downloadFile(filename, csv);
  };

  const deleteSession = async () => {
    await db.transaction('rw', db.sessions, db.marks, async () => {
      await db.marks.where('sessionId').equals(session.id).delete();
      await db.sessions.delete(session.id);
    });
    navigate('/sessions');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link to="/sessions" className="btn-ghost">
          <Icon name="chevron-left" size={18} />
          Sessions
        </Link>
      </div>

      <div className="card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span
              className={`chip ${
                session.status === 'complete'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {session.status === 'complete' ? 'Complete' : 'In progress'}
            </span>
            <h1 className="mt-2 text-2xl font-extrabold text-ink-800 truncate">{session.title}</h1>
            <div className="text-ink-500 text-sm mt-1">
              {group?.name ?? '—'} · {fmtDateTime(session.date)}
            </div>
            {session.notes ? (
              <div className="mt-3 p-3 rounded-xl bg-ink-50 text-ink-700 text-sm whitespace-pre-wrap">
                {session.notes}
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Link to={`/sessions/${session.id}/assess`} className="btn-secondary">
              <Icon name="pencil" size={16} />
              Edit marks
            </Link>
            <button className="btn-secondary" onClick={exportCSV}>
              <Icon name="export" size={16} />
              Export CSV
            </button>
            <button className="btn-danger" onClick={() => setConfirmDelete(true)}>
              <Icon name="trash" size={16} />
              Delete
            </button>
          </div>
        </div>
      </div>

      <section>
        <h2 className="font-bold text-ink-800 mb-2">Criterion averages</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {criterionStats.map((s) => (
            <div key={s.criterion.id} className="card p-4">
              <div className="font-semibold text-ink-800 truncate">{s.criterion.name}</div>
              <div className="mt-2 flex items-end justify-between">
                <div className="text-3xl font-extrabold text-ink-800 tabular-nums">
                  {s.avg !== undefined ? s.avg.toFixed(1) : '—'}
                </div>
                <div className="text-xs text-ink-500 text-right">
                  <div>{s.count} marks</div>
                  {s.avg !== undefined ? (
                    <div className="font-semibold text-brand-600">
                      {labelForValue(Math.round(s.avg), session.scale) ?? ''}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-bold text-ink-800 mb-2">Per-person marks</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-ink-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left p-3 font-semibold sticky left-0 bg-ink-50">Person</th>
                {session.criteria.map((c) => (
                  <th key={c.id} className="text-left p-3 font-semibold whitespace-nowrap">
                    {c.name}
                  </th>
                ))}
                <th className="text-left p-3 font-semibold">Avg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {(people ?? []).map((p) => {
                const m = personMap.get(p.id);
                const avg = personAvg(p);
                return (
                  <tr key={p.id} className={!m ? 'opacity-50' : ''}>
                    <td className="p-3 sticky left-0 bg-white">
                      <div className="flex items-center gap-2">
                        <Avatar name={p.name} size={28} />
                        <span className="font-semibold text-ink-800">{p.name}</span>
                      </div>
                    </td>
                    {session.criteria.map((c) => {
                      const mk = m?.get(c.id);
                      return (
                        <td key={c.id} className="p-3 tabular-nums">
                          {mk ? (
                            <span className="font-semibold text-ink-800">
                              {formatMark(mk.value, session.scale)}
                            </span>
                          ) : (
                            <span className="text-ink-300">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="p-3 tabular-nums font-bold text-ink-800">
                      {avg !== undefined ? avg.toFixed(1) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {peopleWithMarks.length === 0 && (
          <div className="text-ink-500 text-sm mt-3">No marks recorded yet.</div>
        )}
      </section>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this session?"
        message="All marks for this session will be deleted. This can't be undone."
        confirmLabel="Delete session"
        onConfirm={deleteSession}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}
