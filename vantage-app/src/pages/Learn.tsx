import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { TRACKS, TRACK_ORDER, mergeModules } from '../content/curriculum';
import { Page } from '../components/Shell';
import { ACCENT } from '../components/ui';

export default function Learn() {
  const progress = useLiveQuery(() => db.progress.toArray(), []);
  const overrides = useLiveQuery(() => db.curriculum.toArray(), []) || [];
  const MODULES = mergeModules(overrides);
  const totalRead = MODULES.reduce((s, m) => s + m.estReadMin, 0);
  const doneByModule = new Map((progress || []).map((p) => [p.moduleNumber, p]));

  return (
    <Page
      title="The curriculum"
      subtitle={`${MODULES.length} modules, four tracks, ~${Math.round(totalRead / 5) * 5} minutes of teaching. Non-linear — start anywhere. Read and learn before you decide to evaluate yourself against any theme.`}
    >
      <div className="space-y-8">
        {TRACK_ORDER.map((tid) => {
          const track = TRACKS.find((t) => t.id === tid)!;
          const mods = MODULES.filter((m) => m.track === tid);
          if (!mods.length) return null;
          const ac = ACCENT[track.accent];
          return (
            <section key={tid}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-2.5 h-2.5 rounded-full ${ac.dot}`} />
                <h2 className="font-display text-xl text-ink-900">{track.title}</h2>
              </div>
              <p className="text-ink-500 text-sm mb-4 -mt-2">{track.subtitle}</p>
              <div className="grid sm:grid-cols-2 gap-4">
                {mods.map((m) => {
                  const p = doneByModule.get(m.number);
                  const lessonsDone = p?.lessonsDone.length ?? 0;
                  const pct = Math.round((lessonsDone / m.lessons.length) * 100);
                  return (
                    <Link
                      key={m.number}
                      to={`/learn/${m.slug}`}
                      className={`card p-5 hover:shadow-lift transition border-l-4 ${ac.ring}`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`${ac.chip}`}>Module {m.number}</span>
                        <span className="text-xs text-ink-400">{m.estReadMin} min</span>
                      </div>
                      <h3 className="font-display text-lg text-ink-900 leading-tight mb-1">{m.title}</h3>
                      <p className="text-ink-500 text-sm mb-3">{m.oneLiner}</p>
                      <div className="flex items-center gap-2">
                        <div className="meter flex-1">
                          <span className={ac.dot} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[11px] text-ink-400 w-16 text-right">
                          {p?.completedAt ? 'Complete ✓' : `${lessonsDone}/${m.lessons.length} lessons`}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </Page>
  );
}
