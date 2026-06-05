import { useMemo, useState } from 'react';
import { putProcess } from '../store';
import { tidyProcess } from '../services/fluxAI';
import Icon from './Icon';
import Modal from './Modal';
import { AIError_, Spinner, useAIRun } from './AIRun';
import type { Process, Project } from '../types';

/**
 * Two complementary clean-up tools for a mapped process:
 *  1) Roles — deterministic rename/merge of swimlanes (give two roles the same
 *     name to merge them). Instant, precise, no AI.
 *  2) AI tidy — consolidates near-duplicate roles, standardises naming and fixes
 *     obvious issues across the whole map.
 */
export default function TidyTools({ process, project }: { process: Process; project: Project }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn-tint-flux text-sm" onClick={() => setOpen(true)}>
        <Icon name="edit" className="h-4 w-4" /> Tidy up
      </button>
      {open && <TidyModal process={process} project={project} onClose={() => setOpen(false)} />}
    </>
  );
}

function TidyModal({ process, project, onClose }: { process: Process; project: Project; onClose: () => void }) {
  const { loading, error, run } = useAIRun();
  const [guidance, setGuidance] = useState('');
  const [summary, setSummary] = useState<string | null>(null);

  // Distinct actors with usage counts.
  const actors = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of process.steps) {
      const a = s.actor || 'Unassigned';
      m.set(a, (m.get(a) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [process.steps]);

  const [edits, setEdits] = useState<Record<string, string>>({});
  const nameFor = (orig: string) => edits[orig] ?? orig;

  // Preview: how many distinct roles after applying the edits.
  const resultingRoles = useMemo(() => new Set(actors.map(([a]) => nameFor(a).trim()).filter(Boolean)).size, [actors, edits]);

  async function applyRoles() {
    const steps = process.steps.map((s) => {
      const orig = s.actor || 'Unassigned';
      const nn = nameFor(orig).trim();
      return { ...s, actor: nn === 'Unassigned' ? '' : nn };
    });
    await putProcess({ ...process, steps });
    setEdits({});
  }

  async function aiTidy() {
    await run(
      () => tidyProcess({ project, process, instructions: guidance || undefined }),
      async (r) => {
        await putProcess({ ...process, steps: r.steps });
        setSummary(r.changeSummary || 'Map tidied.');
      },
    );
  }

  const dirty = Object.keys(edits).some((k) => (edits[k] ?? '').trim() !== k);

  return (
    <Modal open onClose={onClose} title="Tidy up the map" wide>
      {/* Roles */}
      <section>
        <h3 className="font-semibold text-ink-800">Roles &amp; swimlanes</h3>
        <p className="mb-3 text-sm text-ink-500">
          Rename a role to fix it everywhere. <strong>Give two roles the same name to merge them</strong> into one swimlane.
        </p>
        <div className="space-y-2">
          {actors.map(([orig, count]) => {
            const merging = nameFor(orig).trim() !== orig && actors.some(([o]) => o !== orig && nameFor(o).trim() === nameFor(orig).trim());
            return (
              <div key={orig} className="flex items-center gap-2">
                <span className="w-8 shrink-0 text-right text-xs text-ink-400">{count}×</span>
                <input
                  className="input"
                  value={nameFor(orig)}
                  onChange={(e) => setEdits({ ...edits, [orig]: e.target.value })}
                />
                {merging && <span className="chip shrink-0 bg-flux-100 text-flux-700">merge</span>}
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-ink-400">{actors.length} roles → {resultingRoles} after changes</span>
          <button className="btn-primary" onClick={applyRoles} disabled={!dirty}>
            <Icon name="check" className="h-4 w-4" /> Apply role changes
          </button>
        </div>
      </section>

      <hr className="my-5 border-ink-100" />

      {/* AI tidy */}
      <section>
        <h3 className="font-semibold text-ink-800">Tidy with AI</h3>
        <p className="mb-3 text-sm text-ink-500">
          Describe <strong>any</strong> correction in plain English — roles, step names, ordering, types, value class, systems, or timings &amp; their units. FLUX rewrites the map accordingly (without inventing new activity).
        </p>
        <textarea
          className="input min-h-[80px]"
          placeholder={"e.g. The touch times are in seconds, not minutes — rescale them all. Also merge 'Designated Member' into 'Invoice Processor', and step 3 happens before step 2."}
          value={guidance}
          onChange={(e) => setGuidance(e.target.value)}
        />
        {summary && (
          <div className="mt-2 rounded-lg bg-va-100/50 p-2 text-sm text-va-700">
            <Icon name="check" className="mr-1 inline h-4 w-4" /> {summary}
          </div>
        )}
        <AIError_ message={error} />
        <div className="mt-3 flex justify-end">
          <button className="btn-flux" onClick={aiTidy} disabled={loading}>
            {loading ? <Spinner label="Tidying…" /> : <><Icon name="spark" className="h-4 w-4" /> Tidy with AI</>}
          </button>
        </div>
      </section>

      <div className="mt-5 flex justify-end">
        <button className="btn-ghost" onClick={onClose}>Done</button>
      </div>
    </Modal>
  );
}
