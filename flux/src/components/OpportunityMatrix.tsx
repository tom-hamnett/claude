/** Impact (y) vs Effort (x) bubble matrix with the four classic quadrants. */
import { DRIVER } from '../lib/frameworks';
import type { Opportunity } from '../types';

const SIZE = 360;
const PAD = 40;

export default function OpportunityMatrix({
  opps,
  selectedId,
  onSelect,
}: {
  opps: Opportunity[];
  selectedId?: string;
  onSelect?: (o: Opportunity) => void;
}) {
  const plot = SIZE - PAD * 2;
  // effort 1..5 -> x (low effort left); impact 1..5 -> y (high impact top)
  const x = (effort: number) => PAD + ((effort - 1) / 4) * plot;
  const y = (impact: number) => PAD + ((5 - impact) / 4) * plot;

  // jitter overlapping points deterministically by id hash
  const jitter = (id: string) => ((hash(id) % 17) - 8);

  return (
    <div className="card p-4">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto w-full max-w-md">
        {/* quadrant backgrounds */}
        <rect x={PAD} y={PAD} width={plot / 2} height={plot / 2} fill="#ecfeff" />
        <rect x={PAD + plot / 2} y={PAD} width={plot / 2} height={plot / 2} fill="#f3f1ff" />
        <rect x={PAD} y={PAD + plot / 2} width={plot / 2} height={plot / 2} fill="#f7f8fb" />
        <rect x={PAD + plot / 2} y={PAD + plot / 2} width={plot / 2} height={plot / 2} fill="#fff7f7" />

        {/* quadrant labels */}
        <text x={PAD + 6} y={PAD + 16} fontSize={10} fontWeight={700} className="fill-flux-700">QUICK WINS</text>
        <text x={PAD + plot / 2 + 6} y={PAD + 16} fontSize={10} fontWeight={700} className="fill-brand-700">MAJOR PROJECTS</text>
        <text x={PAD + 6} y={PAD + plot - 6} fontSize={10} fontWeight={700} className="fill-ink-400">FILL-INS</text>
        <text x={PAD + plot / 2 + 6} y={PAD + plot - 6} fontSize={10} fontWeight={700} className="fill-nva-600">THANKLESS</text>

        {/* axes */}
        <line x1={PAD} y1={SIZE - PAD} x2={SIZE - PAD} y2={SIZE - PAD} stroke="#b6bdcf" />
        <line x1={PAD} y1={PAD} x2={PAD} y2={SIZE - PAD} stroke="#b6bdcf" />
        <line x1={PAD + plot / 2} y1={PAD} x2={PAD + plot / 2} y2={SIZE - PAD} stroke="#dce0eb" strokeDasharray="4 4" />
        <line x1={PAD} y1={PAD + plot / 2} x2={SIZE - PAD} y2={PAD + plot / 2} stroke="#dce0eb" strokeDasharray="4 4" />
        <text x={SIZE / 2} y={SIZE - 8} fontSize={11} textAnchor="middle" className="fill-ink-500">Effort →</text>
        <text x={12} y={SIZE / 2} fontSize={11} textAnchor="middle" className="fill-ink-500" transform={`rotate(-90 12 ${SIZE / 2})`}>
          Impact →
        </text>

        {/* bubbles */}
        {opps.map((o) => {
          const j = jitter(o.id);
          const cx = x(o.effort) + j;
          const cy = y(o.impact) + j;
          const r = 7 + (o.confidence ?? 0.6) * 6;
          const c = DRIVER[o.driver].color;
          const sel = o.id === selectedId;
          return (
            <g key={o.id} className={onSelect ? 'cursor-pointer' : ''} onClick={() => onSelect?.(o)}>
              <circle cx={cx} cy={cy} r={r} fill={c} fillOpacity={0.7} stroke={sel ? '#0e1018' : c} strokeWidth={sel ? 2.5 : 1} />
              {o.quickWin && <text x={cx} y={cy + 3} fontSize={9} textAnchor="middle" className="fill-white">⚡</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
