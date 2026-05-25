import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { MODULES, moduleByNumber } from '../content/curriculum';
import { Page } from '../components/Shell';
import { Meter, ScoreBadge, Empty } from '../components/ui';

export default function Progress() {
  const evals = useLiveQuery(() => db.evaluations.orderBy('createdAt').toArray(), []);
  const progress = useLiveQuery(() => db.progress.toArray(), []);

  if (evals === undefined) return <div className="max-w-3xl mx-auto px-6 py-10"><div className="skeleton h-40" /></div>;

  const completed = (progress || []).filter((p) => p.completedAt).length;
  const series = evals.map((e) => e.result.overall);

  // latest score per module across all evaluations
  const latestByModule = new Map<number, number>();
  for (const e of evals) for (const ms of e.result.moduleScores) latestByModule.set(ms.moduleNumber, ms.score);

  return (
    <Page title="Progress" subtitle="Your trend over time and how far through the curriculum you are. This is the transfer made visible.">
      {evals.length === 0 ? (
        <Empty icon="📈" title="No data yet" body="Run an evaluation and complete a module to start seeing trends." action={<Link to="/evaluate" className="btn-primary">Run an evaluation</Link>} />
      ) : (
        <>
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            <Stat label="Evaluations" value={String(evals.length)} />
            <Stat label="Latest overall" value={evals[evals.length - 1].result.overall.toFixed(1) + ' /4'} />
            <Stat label="Modules completed" value={`${completed} / ${MODULES.length}`} />
          </div>

          {series.length > 1 && (
            <section className="card p-5 mb-8">
              <div className="label mb-2">Overall score over time</div>
              <Spark values={series} />
            </section>
          )}

          <section className="mb-8">
            <h2 className="font-display text-xl text-ink-900 mb-3">Latest by capability</h2>
            <div className="card divide-y divide-ink-100">
              {[...latestByModule.entries()].sort((a, b) => a[1] - b[1]).map(([n, s]) => {
                const m = moduleByNumber(n);
                return (
                  <div key={n} className="flex items-center gap-4 p-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm font-semibold text-ink-900">M{n} {m?.title}</span>
                        <ScoreBadge value={s} />
                      </div>
                      <Meter value={s} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {(progress || []).some((p) => p.quizScore != null) && (
            <section className="mb-8">
              <h2 className="font-display text-xl text-ink-900 mb-3">Module self-checks</h2>
              <div className="card divide-y divide-ink-100">
                {(progress || [])
                  .filter((p) => p.quizScore != null)
                  .sort((a, b) => (a.quizScore ?? 0) - (b.quizScore ?? 0))
                  .map((p) => {
                    const m = moduleByNumber(p.moduleNumber);
                    const pct = Math.round((p.quizScore ?? 0) * 100);
                    return (
                      <Link key={p.moduleNumber} to={m ? `/learn/${m.slug}` : '#'} className="flex items-center gap-4 p-4 hover:bg-ink-50 transition">
                        <span className="flex-1 text-sm font-semibold text-ink-900">M{p.moduleNumber} {m?.title}</span>
                        <span className={`text-sm font-semibold ${pct >= 75 ? 'text-teal-700' : pct >= 50 ? 'text-gold-700' : 'text-hot-600'}`}>{pct}%</span>
                      </Link>
                    );
                  })}
              </div>
            </section>
          )}

          <section>
            <h2 className="font-display text-xl text-ink-900 mb-3">All evaluations</h2>
            <div className="space-y-2">
              {[...evals].reverse().map((e) => (
                <div key={e.id} className="card p-4 flex items-center gap-4">
                  <Link to={`/evaluate/${e.id}`} className="flex-1 min-w-0">
                    <div className="font-semibold text-ink-900 truncate">{e.title}</div>
                    <div className="text-xs text-ink-400">{new Date(e.createdAt).toLocaleDateString()} · {e.interactionType.replace('-', ' ')}{e.demo && ' · preview'}</div>
                  </Link>
                  <ScoreBadge value={e.result.overall} />
                  <button onClick={() => db.evaluations.delete(e.id)} className="text-ink-300 hover:text-hot-500" title="Delete">✕</button>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </Page>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <div className="label mb-1">{label}</div>
      <div className="font-display text-2xl text-ink-900">{value}</div>
    </div>
  );
}

function Spark({ values }: { values: number[] }) {
  const W = 600, H = 80, pad = 8;
  const max = 4, min = 1;
  const pts = values.map((v, i) => {
    const x = pad + (i / Math.max(1, values.length - 1)) * (W - pad * 2);
    const y = H - pad - ((v - min) / (max - min)) * (H - pad * 2);
    return [x, y];
  });
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20">
      <path d={d} fill="none" stroke="#6c63ff" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill="#6c63ff" />)}
    </svg>
  );
}
