import { useState } from 'react';
import type { QuizQuestion } from '../types';

export function ModuleQuiz({
  questions,
  prevScore,
  onScore,
}: {
  questions: QuizQuestion[];
  prevScore?: number;
  onScore?: (fraction: number) => void;
}) {
  const [picks, setPicks] = useState<Record<number, number>>({});
  const total = questions.length;
  const answered = Object.keys(picks).length;
  const correct = questions.reduce((n, q, qi) => {
    const p = picks[qi];
    return n + (p != null && q.options[p]?.correct ? 1 : 0);
  }, 0);
  const done = answered === total && total > 0;

  function pick(qi: number, oi: number) {
    if (picks[qi] != null) return;
    const next = { ...picks, [qi]: oi };
    setPicks(next);
    if (Object.keys(next).length === total) {
      const score = questions.reduce((n, q, i) => n + (q.options[next[i]]?.correct ? 1 : 0), 0);
      onScore?.(score / total);
    }
  }

  function reset() {
    setPicks({});
  }

  return (
    <div>
      {prevScore != null && answered === 0 && (
        <p className="text-sm text-ink-500 mb-3">
          Last attempt: <span className="font-semibold text-ink-700">{Math.round(prevScore * 100)}%</span>. Have another go.
        </p>
      )}
      <div className="space-y-4">
        {questions.map((q, qi) => {
          const picked = picks[qi];
          const reveal = picked != null;
          return (
            <div key={qi} className="rounded-2xl border border-ink-200 bg-white p-4">
              <p className="font-semibold text-ink-900 mb-3">
                <span className="text-ink-400 mr-1.5">{qi + 1}.</span>
                {q.q}
              </p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  const isPicked = picked === oi;
                  const tone = reveal
                    ? opt.correct
                      ? 'border-teal-300 bg-teal-50'
                      : isPicked
                        ? 'border-hot-300 bg-hot-50'
                        : 'border-ink-100 bg-white opacity-70'
                    : 'border-ink-200 bg-white hover:border-brand-300';
                  return (
                    <button
                      key={oi}
                      onClick={() => pick(qi, oi)}
                      disabled={reveal}
                      className={`w-full text-left rounded-xl border ${tone} px-3 py-2.5 transition`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 text-sm">{reveal ? (opt.correct ? '✅' : isPicked ? '❌' : '○') : '○'}</span>
                        <div>
                          <div className="text-ink-800 text-sm">{opt.text}</div>
                          {reveal && (isPicked || opt.correct) && <div className="text-xs text-ink-500 mt-1">{opt.why}</div>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-ink-500">
          {done ? (
            <span className="font-semibold text-ink-800">
              Score: {correct} / {total} ({Math.round((correct / total) * 100)}%)
              {correct === total ? ' — nailed it.' : correct / total >= 0.5 ? ' — solid.' : ' — worth a re-read.'}
            </span>
          ) : (
            <span>{answered} / {total} answered</span>
          )}
        </div>
        {answered > 0 && (
          <button onClick={reset} className="text-sm text-brand-600 font-semibold hover:text-brand-700">
            {done ? 'Retake' : 'Reset'}
          </button>
        )}
      </div>
    </div>
  );
}
