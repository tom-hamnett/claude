import type { Scale } from '../types';

const PRESETS: { name: string; scale: Scale }[] = [
  { name: '1–4 (Below → Exceeding)', scale: { min: 1, max: 4, step: 1, labels: ['Below', 'Approaching', 'Meeting', 'Exceeding'] } },
  { name: '1–5 (Emerging → Mastery)', scale: { min: 1, max: 5, step: 1, labels: ['Emerging', 'Developing', 'Secure', 'Strong', 'Mastery'] } },
  { name: '1–10 (numeric)', scale: { min: 1, max: 10, step: 1 } },
  { name: '0–100 (%)', scale: { min: 0, max: 100, step: 5 } },
];

export function ScaleEditor({
  scale,
  onChange,
}: {
  scale: Scale;
  onChange: (s: Scale) => void;
}) {
  const range = scale.max - scale.min;
  const tickCount = Math.min(11, Math.floor(range / scale.step) + 1);

  const setLabel = (i: number, val: string) => {
    const labels = scale.labels?.slice() ?? [];
    while (labels.length < tickCount) labels.push('');
    labels[i] = val;
    // trim trailing empties
    while (labels.length > 0 && labels[labels.length - 1] === '') labels.pop();
    onChange({ ...scale, labels: labels.length > 0 ? labels : undefined });
  };

  const labels = (scale.labels && scale.labels.length > 0) ? scale.labels : new Array(tickCount).fill('');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            className="chip hover:bg-brand-100 hover:text-brand-700"
            onClick={() => onChange(p.scale)}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Min</label>
          <input
            className="input mt-1"
            type="number"
            value={scale.min}
            onChange={(e) => onChange({ ...scale, min: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="label">Max</label>
          <input
            className="input mt-1"
            type="number"
            value={scale.max}
            onChange={(e) => onChange({ ...scale, max: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="label">Step</label>
          <input
            className="input mt-1"
            type="number"
            min={0.1}
            step={0.1}
            value={scale.step}
            onChange={(e) => onChange({ ...scale, step: Number(e.target.value) || 1 })}
          />
        </div>
      </div>

      <div>
        <label className="label">Anchor labels (optional)</label>
        <p className="text-xs text-ink-500 mt-1 mb-2">
          Add words for the slider's anchor points. Leave blank for purely numeric marks.
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          {labels.slice(0, tickCount).map((lbl, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-8 text-right text-sm font-semibold text-ink-500">
                {Math.round(scale.min + (i * range) / Math.max(1, tickCount - 1))}
              </span>
              <input
                className="input"
                placeholder={`Label ${i + 1}`}
                value={lbl}
                onChange={(e) => setLabel(i, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
