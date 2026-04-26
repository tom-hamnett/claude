import { useState } from 'react';
import { Modal } from './Modal';
import { Icon } from './Icon';
import { AIBadge } from './AIBadge';
import { PaywallModal } from './PaywallModal';
import { generateRubric, type GeneratedRubric } from '../services/sigmaAI';
import { canUseAI } from '../services/license';
import type { Vertical } from '../types';
import { AIError } from '../services/ai';

const VERTICAL_PROMPTS: Record<Vertical, string> = {
  school: 'e.g. Year 9 Spanish speaking and listening assessment',
  tuition: 'e.g. Year 11 GCSE maths algebra problem-solving',
  sport: 'e.g. U13 rugby tackling technique and decision-making',
  health: 'e.g. Second-year nursing student bedside handover (SBAR)',
  construction: 'e.g. Daily site safety walk for a multi-trade build',
  field: 'e.g. Retail store visit for a high-street fashion brand',
  corporate: 'e.g. Frontline customer call for a UK retail bank',
  other: 'Describe what you\'re assessing — be specific',
};

export function RubricGeneratorModal({
  open,
  onClose,
  vertical,
  onAccept,
}: {
  open: boolean;
  onClose: () => void;
  vertical?: Vertical;
  onAccept: (rubric: GeneratedRubric) => void;
}) {
  const [brief, setBrief] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<GeneratedRubric | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState<string | undefined>();

  const onGenerate = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const gate = await canUseAI();
      if (!gate.ok) {
        setPaywallReason(gate.reason);
        setShowPaywall(true);
        return;
      }
      const r = await generateRubric(brief, vertical);
      setResult(r);
    } catch (err) {
      const msg = err instanceof AIError ? err.message : err instanceof Error ? err.message : 'Generation failed.';
      if (msg.toLowerCase().includes('locked') || msg.toLowerCase().includes('unlock')) {
        setPaywallReason(msg);
        setShowPaywall(true);
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setResult(null);
    setBrief('');
    setError(null);
  };

  return (
    <>
      <Modal
        open={open}
        onClose={() => {
          reset();
          onClose();
        }}
        title={
          <div className="flex items-center gap-2">
            <Icon name="wand" size={20} className="text-brand-600" />
            <span>AI Rubric Generator</span>
            <AIBadge />
          </div>
        }
        size="lg"
        footer={
          result ? (
            <>
              <button className="btn-secondary" onClick={reset}>
                <Icon name="wand" size={16} />
                Try another
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  onAccept(result);
                  reset();
                  onClose();
                }}
              >
                <Icon name="check" size={16} />
                Use this rubric
              </button>
            </>
          ) : (
            <>
              <button className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button className="btn-primary" disabled={busy || brief.trim().length < 5} onClick={onGenerate}>
                {busy ? 'Generating…' : 'Generate'}
                {!busy && <Icon name="sparkles" size={16} />}
              </button>
            </>
          )
        }
      >
        {!result ? (
          <div className="space-y-3">
            <p className="text-ink-600">
              Describe what you want to assess in one sentence. The AI will draft a 4-7 criterion rubric with a sliding scale, ready to use.
            </p>
            <textarea
              className="input min-h-[110px]"
              placeholder={vertical ? VERTICAL_PROMPTS[vertical] : VERTICAL_PROMPTS.other}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              autoFocus
            />
            {error ? (
              <div className="text-sm text-hot-600 bg-hot-50 border border-hot-100 rounded-xl p-3">{error}</div>
            ) : null}
            <div className="text-xs text-ink-400">
              Tip: include the audience and the context. "Y9 oracy assessment" is OK; "Y9 Spanish 5-min unprepared talk on family topic" is better.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="label">Name</div>
              <div className="font-bold text-ink-800 text-lg">{result.name}</div>
              <div className="text-sm text-ink-600">{result.description}</div>
            </div>
            <div>
              <div className="label">Scale</div>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className="chip">{result.scale.min}–{result.scale.max}</span>
                {result.scale.labels?.map((l, i) => (
                  <span key={i} className="chip-brand">{i + 1}. {l}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="label mb-2">Criteria</div>
              <div className="space-y-2">
                {result.criteria.map((c, i) => (
                  <div key={i} className="border border-ink-100 rounded-xl p-3 bg-ink-50/40">
                    <div className="font-bold text-ink-800">{c.name}</div>
                    <div className="text-sm text-ink-600">{c.description}</div>
                  </div>
                ))}
              </div>
            </div>
            {result.tags?.length ? (
              <div>
                <div className="label mb-1">Tags</div>
                <div className="flex flex-wrap gap-1.5">
                  {result.tags.map((t) => <span key={t} className="chip">{t}</span>)}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </Modal>
      <PaywallModal
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        reason={paywallReason}
      />
    </>
  );
}
