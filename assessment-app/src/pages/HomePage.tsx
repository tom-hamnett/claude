import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Icon } from '../components/Icon';
import { fmtRelative } from '../lib/format';
import { Avatar } from '../components/Avatar';

export default function HomePage() {
  const groups = useLiveQuery(() => db.groups.orderBy('updatedAt').reverse().toArray(), []);
  const recentSessions = useLiveQuery(
    () => db.sessions.orderBy('date').reverse().limit(5).toArray(),
    []
  );
  const inProgress = useLiveQuery(
    () => db.sessions.where('status').equals('in_progress').toArray(),
    []
  );
  const totalPeople = useLiveQuery(() => db.people.count(), []);
  const totalMarks = useLiveQuery(() => db.marks.count(), []);
  const groupsById = useLiveQuery(async () => {
    const all = await db.groups.toArray();
    return new Map(all.map((g) => [g.id, g.name]));
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-500 flex items-center justify-center text-white shadow-soft font-bold text-2xl">
            Σ
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink-800">Sigma</h1>
            <p className="text-ink-500">Rapid, customisable assessment for any context.</p>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Classes" value={groups?.length ?? 0} icon="group" />
        <StatCard label="People" value={totalPeople ?? 0} icon="group" />
        <StatCard label="Sessions" value={recentSessions?.length ?? 0} icon="session" />
        <StatCard label="Marks recorded" value={totalMarks ?? 0} icon="reports" />
      </section>

      <section className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-ink-800">Start an assessment</h2>
          <Link to="/sessions/new" className="btn-primary">
            <Icon name="plus" size={18} />
            New session
          </Link>
        </div>
        <p className="text-ink-500 text-sm">
          Pick a class, choose a template (or define criteria on the spot), set the sliding scale,
          then sweep through your students with one tap per criterion.
        </p>
      </section>

      {inProgress && inProgress.length > 0 && (
        <section>
          <h2 className="font-bold text-ink-800 mb-3">Continue where you left off</h2>
          <div className="space-y-2">
            {inProgress.map((s) => (
              <Link
                key={s.id}
                to={`/sessions/${s.id}/assess`}
                className="card flex items-center gap-4 p-4 hover:shadow-lift transition"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Icon name="play" size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink-800 truncate">{s.title}</div>
                  <div className="text-xs text-ink-500">
                    {groupsById?.get(s.groupId) ?? '—'} · started {fmtRelative(s.createdAt)}
                  </div>
                </div>
                <Icon name="chevron-right" size={20} />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-ink-800">Your classes</h2>
          <Link to="/groups" className="text-sm font-semibold text-brand-600">View all</Link>
        </div>
        {groups && groups.length === 0 ? (
          <div className="card p-6 text-ink-500">
            No classes yet.{' '}
            <Link to="/groups" className="text-brand-600 font-semibold">Create your first class →</Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {groups?.slice(0, 4).map((g) => (
              <Link
                key={g.id}
                to={`/groups/${g.id}`}
                className="card p-4 flex items-center gap-3 hover:shadow-lift transition"
              >
                <Avatar name={g.name} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink-800 truncate">{g.name}</div>
                  {g.subject ? <div className="text-xs text-ink-500 truncate">{g.subject}</div> : null}
                </div>
                <Icon name="chevron-right" size={18} />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-ink-800">Recent sessions</h2>
          <Link to="/sessions" className="text-sm font-semibold text-brand-600">View all</Link>
        </div>
        {recentSessions && recentSessions.length === 0 ? (
          <div className="card p-6 text-ink-500">No sessions recorded yet.</div>
        ) : (
          <div className="space-y-2">
            {recentSessions?.map((s) => (
              <Link
                key={s.id}
                to={`/sessions/${s.id}`}
                className="card flex items-center gap-4 p-4 hover:shadow-lift transition"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                  <Icon name="session" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink-800 truncate">{s.title}</div>
                  <div className="text-xs text-ink-500">
                    {groupsById?.get(s.groupId) ?? '—'} · {fmtRelative(s.date)}
                  </div>
                </div>
                <span
                  className={`chip ${
                    s.status === 'complete' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {s.status === 'complete' ? 'Complete' : 'In progress'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: 'group' | 'session' | 'reports' | 'template';
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div className="text-ink-500 text-xs font-semibold uppercase tracking-wide">{label}</div>
        <Icon name={icon} size={18} className="text-ink-300" />
      </div>
      <div className="mt-2 text-2xl font-extrabold text-ink-800">{value}</div>
    </div>
  );
}
