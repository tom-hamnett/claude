import { Link, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { moduleByNumber } from '../content/curriculum';
import { competencyById } from '../content/rubric';
import { Meter, ScoreBadge, Empty } from '../components/ui';
import type { Finding } from '../types';

export default function Report() {
  const { id } = useParams();
  const evalRec = useLiveQuery(() => (id ? db.evaluations.get(id) : undefined), [id]);

  if (evalRec === undefined) return <div className="max-w-3xl mx-auto px-6 py-10"><div className="skeleton h-40" /></div>;
  if (!evalRec) return <Empty icon="🔍" title="Evaluation not found" body="It may have been deleted." action={<Link to="/evaluate" className="btn-primary">New evaluation</Link>} />;

  const r = evalRec.result;
  const strengths = r.findings.filter((f) => f.type === 'strength');
  const growth = r.findings.filter((f) => f.type === 'growth');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 animate-fade-up">
      <Link to="/progress" className="text-sm text-ink-400 hover:text-ink-700">← All evaluations</Link>

      <header className="mt-3 mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-ink-900">{evalRec.title}</h1>
          <p className="text-ink-400 text-sm mt-1">
            {new Date(evalRec.createdAt).toLocaleString()} · {evalRec.interactionType.replace('-', ' ')}
            {evalRec.delivery && ' · 🎬 tone & flow measured'}
            {evalRec.demo && ' · offline preview'}
          </p>
        </div>
        <Link to="/coach" className="btn-secondary">✦ Discuss with coach</Link>
      </header>

      {/* Overall + headline */}
      <div className="ai-card mb-6 flex items-center gap-5">
        <div className="text-center flex-none">
          <div className="text-4xl font-display text-ink-900">{r.overall.toFixed(1)}</div>
          <div className="text-[10px] uppercase tracking-wide text-ink-400 font-semibold">/ 4 overall</div>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-ink-900">{r.headline}</p>
        </div>
      </div>

      {/* Situation narrative */}
      <section className="card p-5 mb-6">
        <div className="label mb-1.5">How you handled the situation</div>
        <p className="text-ink-700 leading-relaxed">{r.situation}</p>
      </section>

      {/* Module scores */}
      <section className="mb-6">
        <h2 className="font-display text-xl text-ink-900 mb-3">By capability</h2>
        <div className="card divide-y divide-ink-100">
          {r.moduleScores.sort((a, b) => a.score - b.score).map((ms) => {
            const m = moduleByNumber(ms.moduleNumber);
            return (
              <Link key={ms.moduleNumber} to={m ? `/learn/${m.slug}` : '#'} className="flex items-center gap-4 p-4 hover:bg-ink-50 transition">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-semibold text-ink-900 truncate">M{ms.moduleNumber} {m?.title}</span>
                    <ScoreBadge value={ms.score} />
                  </div>
                  <Meter value={ms.score} />
                  <p className="text-xs text-ink-500 mt-1.5">{ms.summary}</p>
                </div>
                <span className="text-ink-300">›</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Priorities */}
      <section className="mb-6">
        <h2 className="font-display text-xl text-ink-900 mb-3">Your focus — start here</h2>
        <div className="space-y-3">
          {r.priorities.map((p, i) => (
            <div key={i} className="card p-5 border-l-4 border-brand-300">
              <div className="flex items-start gap-3">
                <span className="flex-none w-7 h-7 rounded-full bg-brand-500 text-white grid place-items-center font-bold text-sm">{i + 1}</span>
                <div className="flex-1">
                  <h3 className="font-display text-lg text-ink-900">{p.title}</h3>
                  <p className="text-ink-600 text-sm mt-0.5 mb-2">{p.why}</p>
                  <div className="rounded-xl bg-gold-50 border border-gold-200 p-3 text-sm text-ink-700 mb-2">
                    <span className="label text-gold-700">Drill</span>
                    <p className="mt-0.5">{p.drill}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {p.moduleNumbers.map((n) => {
                      const m = moduleByNumber(n);
                      return m ? <Link key={n} to={`/learn/${m.slug}`} className="chip-brand hover:bg-brand-200">M{n} {m.title} →</Link> : null;
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Findings */}
      <div className="grid md:grid-cols-2 gap-6">
        <FindingColumn title="Strengths" tone="teal" findings={strengths} empty="No specific strengths surfaced — add an API key for richer detail." />
        <FindingColumn title="Growth moments" tone="hot" findings={growth} empty="No growth moments surfaced." />
      </div>
    </div>
  );
}

function FindingColumn({ title, tone, findings, empty }: { title: string; tone: 'teal' | 'hot'; findings: Finding[]; empty: string }) {
  return (
    <section>
      <h2 className="font-display text-xl text-ink-900 mb-3">{title}</h2>
      {findings.length === 0 ? (
        <p className="text-ink-400 text-sm">{empty}</p>
      ) : (
        <div className="space-y-3">
          {findings.map((f, i) => {
            const comp = f.competencyId ? competencyById(f.competencyId) : undefined;
            const m = f.moduleNumber ? moduleByNumber(f.moduleNumber) : undefined;
            return (
              <div key={i} className={`card p-4 border-l-4 ${tone === 'teal' ? 'border-teal-300' : 'border-hot-300'}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  {comp && <span className="chip">{comp.name}</span>}
                  {f.timestampLabel && <span className="text-[11px] text-ink-400">{f.timestampLabel}</span>}
                </div>
                <blockquote className="text-sm italic text-ink-600 border-l-2 border-ink-200 pl-3 mb-2">“{f.quote}”</blockquote>
                <p className="text-sm text-ink-700">{f.note}</p>
                {f.suggestion && <p className="text-sm text-ink-600 mt-1.5"><span className="font-semibold">Try:</span> {f.suggestion}</p>}
                {m && <Link to={`/learn/${m.slug}`} className="text-xs text-brand-600 font-semibold mt-2 inline-block">Learn: M{m.number} {m.title} →</Link>}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
