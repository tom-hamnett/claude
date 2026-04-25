import { useEffect, useState } from 'react';
import type { Scale } from '../types';
import { formatMark, labelForValue } from '../lib/format';

export function CriterionSlider({
  scale,
  value,
  onChange,
}: {
  scale: Scale;
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  // Local state lets the slider feel snappy while we batch DB writes.
  const [local, setLocal] = useState<number>(value ?? Math.round((scale.min + scale.max) / 2));

  useEffect(() => {
    if (value !== undefined && value !== local) setLocal(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const lbl = labelForValue(local, scale);
  const set = (v: number) => {
    setLocal(v);
    onChange(v);
  };

  // Quick-tap chips for ordinal scales (≤ 7 marks). Big targets, no swiping needed.
  const stepCount = Math.round((scale.max - scale.min) / scale.step);
  const showChips = stepCount + 1 <= 7;
  const chips = showChips
    ? Array.from({ length: stepCount + 1 }, (_, i) => +(scale.min + i * scale.step).toFixed(4))
    : [];

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <div className="text-3xl font-extrabold text-ink-800 tabular-nums">
          {value !== undefined ? formatMark(local, scale) : <span className="text-ink-300">—</span>}
        </div>
        {lbl ? (
          <div className="text-sm font-semibold text-brand-600 truncate ml-3 text-right">{lbl}</div>
        ) : null}
      </div>

      <input
        type="range"
        className="assess-slider"
        min={scale.min}
        max={scale.max}
        step={scale.step}
        value={local}
        onChange={(e) => set(Number(e.target.value))}
      />

      <div className="flex justify-between text-[11px] text-ink-400 mt-1 px-1">
        <span>{scale.min}</span>
        <span>{scale.max}</span>
      </div>

      {showChips && (
        <div className="mt-2 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${chips.length}, minmax(0, 1fr))` }}>
          {chips.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => set(v)}
              className={`py-2 rounded-lg text-sm font-bold transition ${
                value !== undefined && Math.abs(local - v) < scale.step / 2
                  ? 'bg-brand-500 text-white shadow-soft'
                  : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
              }`}
            >
              {formatMark(v, scale)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
