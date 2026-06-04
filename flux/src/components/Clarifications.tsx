import { useState } from 'react';
import { putProcess } from '../store';
import { refineProcess } from '../services/fluxAI';
import Icon from './Icon';
import { AIError_, Spinner } from './AIRun';
import type { Clarification, ClarificationCategory, Process, Project } from '../types';

const CAT: Record<ClarificationCategory, { label: string; chip: string }> = {
  gap: { label: 'Gap', chip: 'bg-nva-100 text-nva-700' },
  assumption: { label: 'Assumption', chip: 'bg-bva-100 text-bva-700' },
  conflict: { label: 'Conflict', chip: 'bg-hot-100 text-hot-700' },
  suggestion: { label: 'Suggestion', chip: 'bg-flux-100 text-flux-700' },
};

export default function Clarifications({ process, project }: { process: Process; project: Project }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  const all = process.clarifications ?? [];
  const open = all.filter((c) => c.status === 'open').sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0));
  if (!open.length && !summary) return null;

  async function dismiss(id: string) {
    await putProcess({ ...process, clarifications: all.map((c) => (c.id === id ? { ...c, status: 'dismissed' } : c)) });
  }

  async function applyRefine() {
    const answered = open.filter((c) => answers[c.id]?.trim());
    if (!answered.length) {
      setError('Answer at least one clarification first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await refineProcess({
        project,
        process,
        answers: answered.map((c) => ({ question: c.question, answer: answers[c.id] })),
      });
      const history = all.filter((c) => c.status !== 'open');
      const answeredNow: Clarification[] = answered.map((c) => ({ ...c, status: 'answered', answer: answers[c.id] }));
      await putProcess({
        ...process,
        steps: result.steps,
        clarifications: [...history, ...answeredNow, ...result.clarifications],
      });
      setAnswers({});
      setSummary(result.changeSummary || 'Map refined.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Refine failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card border-l-4 border-flux-500 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon name="warning" className="h-5 w-5 text-flux-600" />
        <h3 className="font-semibold text-ink-800">Clarifications &amp; follow-ups</h3>
        {open.length > 0 && <span className="chip bg-flux-100 text-flux-700">{open.length} open</span>}
      </div>

      {summary && (
        <div className="mb-3 rounded-lg bg-va-100/50 p-2 text-sm text-va-700">
          <Icon name="check" className="mr-1 inline h-4 w-4" /> {summary}
        </div>
      )}

      {open.length > 0 ? (
        <>
          <p className="mb-3 text-sm text-ink-500">Answer what you can and FLUX will refine the map. Leave the rest to chase with the client.</p>
          <div className="space-y-3">
            {open.map((c) => (
              <div key={c.id} className="rounded-lg border border-ink-100 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`chip ${CAT[c.category].chip}`}>{CAT[c.category].label}</span>
                    {c.severity ? <span className="ml-1 text-xs text-ink-400">impact {c.severity}/5</span> : null}
                    <p className="mt-1 text-sm font-medium text-ink-800">{c.question}</p>
                    {c.rationale && <p className="text-xs text-ink-500">{c.rationale}</p>}
                  </div>
                  <button className="shrink-0 text-xs text-ink-400 hover:text-ink-600" onClick={() => dismiss(c.id)}>
                    Dismiss
                  </button>
                </div>
                <input
                  className="input mt-2"
                  placeholder="Your answer…"
                  value={answers[c.id] ?? ''}
                  onChange={(e) => setAnswers({ ...answers, [c.id]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <AIError_ message={error} />
          <div className="mt-3 flex justify-end">
            <button className="btn-flux" onClick={applyRefine} disabled={busy}>
              {busy ? <Spinner label="Refining…" /> : <><Icon name="spark" className="h-4 w-4" /> Apply answers &amp; refine map</>}
            </button>
          </div>
        </>
      ) : (
        <p className="text-sm text-ink-500">No open clarifications. 🎉</p>
      )}
    </div>
  );
}
