import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { trackById, mergeModules } from '../content/curriculum';
import { competenciesForModule } from '../content/rubric';
import { frameworksForModule, sourcesForModule, drillsForModule, quizForModule } from '../content/library';
import { Blocks } from '../components/Blocks';
import { ModuleQuiz } from '../components/ModuleQuiz';
import { Markdown } from '../lib/markdown';
import { ACCENT, Empty } from '../components/ui';
import type { PracticeKind } from '../types';

const PRACTICE_META: Record<PracticeKind, { icon: string; label: string }> = {
  observe: { icon: '👁️', label: 'Observation drill' },
  experiment: { icon: '🧪', label: 'In-meeting experiment' },
  record: { icon: '🎙️', label: 'Self-recording challenge' },
  reflect: { icon: '📓', label: 'Reflection' },
};

export default function ModulePage() {
  const { slug } = useParams();
  const overrides = useLiveQuery(() => db.curriculum.toArray(), []) || [];
  const mod = slug ? mergeModules(overrides).find((m) => m.slug === slug) : undefined;
  const progress = useLiveQuery(() => (mod ? db.progress.get(mod.number) : undefined), [mod?.number]);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!mod) return;
    (async () => {
      const existing = await db.progress.get(mod.number);
      await db.progress.put({
        moduleNumber: mod.number,
        lessonsDone: existing?.lessonsDone ?? [],
        practiceDone: existing?.practiceDone ?? [],
        completedAt: existing?.completedAt,
        lastViewedAt: Date.now(),
      });
      setOpen(mod.lessons[0]?.id ?? null);
    })();
  }, [mod?.number]);

  if (!mod) return <Empty icon="🔍" title="Module not found" body="That module doesn't exist." action={<Link to="/learn" className="btn-primary">Back to curriculum</Link>} />;

  const track = trackById(mod.track)!;
  const ac = ACCENT[track.accent];
  const lessonsDone = new Set(progress?.lessonsDone ?? []);

  async function toggleLesson(id: string) {
    if (!mod) return;
    const cur = await db.progress.get(mod.number);
    const set = new Set(cur?.lessonsDone ?? []);
    set.has(id) ? set.delete(id) : set.add(id);
    const all = mod.lessons.every((l) => set.has(l.id));
    await db.progress.put({
      moduleNumber: mod.number,
      lessonsDone: [...set],
      practiceDone: cur?.practiceDone ?? [],
      completedAt: all ? (cur?.completedAt ?? Date.now()) : undefined,
      lastViewedAt: Date.now(),
    });
  }

  async function saveQuizScore(fraction: number) {
    if (!mod) return;
    const cur = await db.progress.get(mod.number);
    await db.progress.put({
      moduleNumber: mod.number,
      lessonsDone: cur?.lessonsDone ?? [],
      practiceDone: cur?.practiceDone ?? [],
      quizScore: fraction,
      quizDoneAt: Date.now(),
      completedAt: cur?.completedAt,
      lastViewedAt: Date.now(),
    });
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 animate-fade-up">
      <Link to="/learn" className="text-sm text-ink-400 hover:text-ink-700">← Curriculum</Link>

      <header className="mt-3 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className={ac.chip}>Module {mod.number}</span>
          <span className="chip">{track.title}</span>
          <span className="text-xs text-ink-400">{mod.estReadMin} min</span>
        </div>
        <h1 className="font-display text-3xl text-ink-900 leading-tight">{mod.title}</h1>
        <p className="text-ink-500 mt-1 text-lg">{mod.oneLiner}</p>
        {mod.book && (
          <p className="text-xs text-ink-400 mt-2">
            In <em>The Same Conversation</em> · Part {mod.book.part}, Chapter {mod.book.chapter} — {mod.book.chapterTitle}
          </p>
        )}
      </header>

      {/* Why it matters */}
      <div className={`rounded-2xl border ${ac.ring} ${ac.soft} p-5 mb-6`}>
        <div className="label mb-1">Why this matters</div>
        <p className="text-ink-700 leading-relaxed">{mod.whyItMatters}</p>
      </div>

      {/* Objectives */}
      <section className="card p-5 mb-6">
        <h2 className="font-display text-lg text-ink-900 mb-3">By the end you'll be able to</h2>
        <ul className="space-y-2">
          {mod.learningObjectives.map((o, i) => (
            <li key={i} className="flex gap-2.5 text-ink-700">
              <span className={`flex-none mt-1 w-1.5 h-1.5 rounded-full ${ac.dot}`} />
              {o}
            </li>
          ))}
        </ul>
      </section>

      {/* Lessons */}
      <h2 className="font-display text-2xl text-ink-900 mb-3">Lessons</h2>
      <div className="space-y-3 mb-8">
        {mod.lessons.map((lesson, i) => {
          const isOpen = open === lesson.id;
          const isDone = lessonsDone.has(lesson.id);
          return (
            <div key={lesson.id} className="card overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : lesson.id)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left"
              >
                <span className={`flex-none w-7 h-7 rounded-full grid place-items-center text-xs font-bold ${isDone ? 'bg-teal-500 text-white' : `${ac.soft} ${ac.text}`}`}>
                  {isDone ? '✓' : i + 1}
                </span>
                <span className="flex-1 font-semibold text-ink-900">{lesson.title}</span>
                <span className="text-xs text-ink-400">{lesson.estMin} min</span>
                <span className={`text-ink-300 transition ${isOpen ? 'rotate-90' : ''}`}>›</span>
              </button>
              {isOpen && (
                <div className="px-5 pb-5 border-t border-ink-100 pt-4">
                  {lesson.blocks?.length ? <Blocks blocks={lesson.blocks} /> : lesson.markdown ? <Markdown text={lesson.markdown} className="prose-learn" /> : null}
                  <button
                    onClick={() => toggleLesson(lesson.id)}
                    className={isDone ? 'btn-secondary btn-sm mt-2' : 'btn-primary btn-sm mt-2'}
                  >
                    {isDone ? '✓ Marked as read' : 'Mark as read'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Frameworks & methods from the literature */}
      {frameworksForModule(mod.number).length > 0 && (
        <Section title="Frameworks & methods from the literature">
          <p className="text-ink-500 text-sm mb-3 -mt-1">Named, battle-tested methods from the executive canon — the same lens the evaluation engine uses to read your real conversations.</p>
          <div className="space-y-3">
            {frameworksForModule(mod.number).map((f, i) => (
              <div key={i} className="rounded-2xl border border-ink-100 p-4">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <span className="font-semibold text-ink-900">{f.name}</span>
                  <span className="text-xs text-ink-400 italic">{f.source} · {f.author}</span>
                </div>
                <p className="text-ink-600 text-sm mt-1 leading-relaxed">{f.gist}</p>
                <ol className="mt-2 ml-4 list-decimal text-sm text-ink-700 space-y-0.5">
                  {f.steps.map((s, j) => <li key={j}>{s}</li>)}
                </ol>
                <p className="text-xs text-teal-700 mt-2"><span className="label text-teal-700">On the tape</span> {f.signal}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Quick drills tied to the frameworks */}
      {drillsForModule(mod.number).length > 0 && (
        <Section title="Quick drills — one rep at a time">
          <p className="text-ink-500 text-sm mb-3 -mt-1">Small reps done in real conversations (not role-play). Each is designed to show up in your next evaluation.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {drillsForModule(mod.number).map((d, i) => (
              <div key={i} className={`rounded-2xl border ${ac.ring} ${ac.soft} p-4`}>
                <div className="font-semibold text-ink-900 text-sm mb-1">{d.title}</div>
                <p className="text-ink-600 text-sm leading-relaxed">{d.body}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Self-check quiz */}
      {quizForModule(mod.number).length > 0 && (
        <Section title="Check your understanding">
          <p className="text-ink-500 text-sm mb-3 -mt-1">A quick self-check on the key ideas. Answer to see why — it’s for you, not a grade.</p>
          <ModuleQuiz
            questions={quizForModule(mod.number)}
            prevScore={progress?.quizScore}
            onScore={saveQuizScore}
          />
        </Section>
      )}

      {/* Principles */}
      <Section title="Principles to remember">
        <ul className="space-y-2">
          {mod.principles.map((p, i) => (
            <li key={i} className="flex gap-2.5 text-ink-700">
              <span className="text-brand-400">◆</span> {p}
            </li>
          ))}
        </ul>
      </Section>

      {/* Practice */}
      <Section title="Practice — in real life, not role-play">
        <div className="grid sm:grid-cols-2 gap-3">
          {mod.practice.map((pr, i) => (
            <div key={i} className="rounded-2xl border border-ink-100 p-4">
              <div className="flex items-center gap-2 mb-1">
                <span aria-hidden>{PRACTICE_META[pr.kind].icon}</span>
                <span className="label">{PRACTICE_META[pr.kind].label}</span>
              </div>
              <div className="font-semibold text-ink-900 text-sm mb-1">{pr.title}</div>
              <p className="text-ink-600 text-sm leading-relaxed">{pr.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Diagnostic link */}
      <div className="ai-card my-6">
        <div className="label mb-1">When you're ready</div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="flex-1 text-ink-700">
            See how these behaviours show up in your real conversations. The engine looks for:{' '}
            <span className="text-ink-500">{mod.diagnosticSignals.join(' · ')}</span>.
          </p>
          <Link to={`/evaluate?modules=${mod.number}`} className="btn-primary whitespace-nowrap">
            Evaluate yourself on this →
          </Link>
        </div>
      </div>

      {/* Key terms + grounding */}
      <div className="grid sm:grid-cols-2 gap-6">
        <Section title="Key terms">
          <dl className="space-y-3">
            {mod.keyTerms.map((t, i) => (
              <div key={i}>
                <dt className="font-semibold text-ink-900 text-sm">{t.term}</dt>
                <dd className="text-ink-600 text-sm">{t.def}</dd>
              </div>
            ))}
          </dl>
        </Section>
        <div>
          <Section title="Warning signs">
            <ul className="space-y-1.5">
              {mod.warningSigns.map((w, i) => (
                <li key={i} className="text-ink-600 text-sm flex gap-2"><span className="text-hot-400">▲</span>{w}</li>
              ))}
            </ul>
          </Section>
          <Section title="Grounded in">
            {sourcesForModule(mod.number).length > 0 ? (
              <ul className="space-y-1.5 mb-3">
                {sourcesForModule(mod.number).map((s, i) => (
                  <li key={i} className="text-ink-600 text-sm flex gap-2">
                    <span className="text-brand-300">📖</span>
                    <span><span className="text-ink-800 font-medium">{s.title}</span>{s.author ? <span className="text-ink-400"> — {s.author}</span> : null}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {mod.grounding.map((g, i) => <span key={i} className="chip">{g}</span>)}
              </div>
            )}
            <p className="text-xs text-ink-400 mt-1">
              Scored against: {competenciesForModule(mod.number).map((c) => c.name).join(', ')}.
            </p>
          </Section>
        </div>
      </div>

      {mod.furtherReading.length > 0 && (
        <Section title="Further reading">
          <ul className="space-y-1.5">
            {mod.furtherReading.map((r, i) => (
              <li key={i} className="text-ink-600 text-sm">• {r}</li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="font-display text-xl text-ink-900 mb-3">{title}</h2>
      {children}
    </section>
  );
}
