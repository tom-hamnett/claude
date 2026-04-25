import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/Layout';
import { fmtDateTime } from '../lib/format';
import { EmptyState } from '../components/Empty';

export default function SessionsPage() {
  const sessions = useLiveQuery(() => db.sessions.orderBy('date').reverse().toArray(), []);
  const groups = useLiveQuery(async () => {
    const all = await db.groups.toArray();
    return new Map(all.map((g) => [g.id, g.name]));
  }, []);

  return (
    <div>
      <PageHeader
        title="Sessions"
        subtitle="Every assessment you've run, newest first."
        actions={
          <Link to="/sessions/new" className="btn-primary">
            <Icon name="plus" size={18} />
            New session
          </Link>
        }
      />

      {sessions && sessions.length === 0 ? (
        <EmptyState
          icon="session"
          title="No sessions yet"
          description="Start a session to mark your class against your chosen criteria."
          action={
            <Link to="/sessions/new" className="btn-primary">
              <Icon name="plus" size={18} />
              New session
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {sessions?.map((s) => (
            <Link
              key={s.id}
              to={s.status === 'in_progress' ? `/sessions/${s.id}/assess` : `/sessions/${s.id}`}
              className="card p-4 flex items-center gap-3 hover:shadow-lift"
            >
              <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                <Icon name="session" size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-ink-800 truncate">{s.title}</div>
                <div className="text-xs text-ink-500 truncate">
                  {groups?.get(s.groupId) ?? '—'} · {fmtDateTime(s.date)}
                </div>
              </div>
              <span
                className={`chip ${
                  s.status === 'complete'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {s.status === 'complete' ? 'Complete' : 'In progress'}
              </span>
              <Icon name="chevron-right" size={18} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
