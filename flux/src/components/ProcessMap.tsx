/**
 * SVG swimlane renderer — the signature current-state visual.
 * Lanes = actors. Columns = step order. Node colour = Lean value class.
 * Pure presentational; horizontally scrollable for long processes.
 */
import { VALUE_CLASS, STEP_TYPE } from '../lib/frameworks';
import type { Process, ProcessStep } from '../types';

const COL_W = 160;
const COL_GAP = 28;
const LANE_H = 92;
const NODE_W = 140;
const NODE_H = 58;
const LEFT = 150;
const TOP = 36;

export default function ProcessMap({
  process,
  selectedId,
  onSelect,
}: {
  process: Process;
  selectedId?: string;
  onSelect?: (s: ProcessStep) => void;
}) {
  const steps = [...process.steps].sort((a, b) => a.order - b.order);
  if (!steps.length) {
    return <div className="card p-8 text-center text-sm text-ink-400">No steps yet — map the process to see the swimlane.</div>;
  }

  // Lanes in order of first appearance.
  const lanes: string[] = [];
  for (const s of steps) {
    const a = s.actor || 'Unassigned';
    if (!lanes.includes(a)) lanes.push(a);
  }
  const laneIndex = (actor: string) => Math.max(0, lanes.indexOf(actor || 'Unassigned'));

  const pos = (s: ProcessStep, i: number) => ({
    x: LEFT + i * (COL_W + COL_GAP),
    y: TOP + laneIndex(s.actor) * LANE_H,
  });

  const width = LEFT + steps.length * (COL_W + COL_GAP) + 20;
  const height = TOP + lanes.length * LANE_H + 20;

  return (
    <div className="card overflow-x-auto p-2">
      <svg width={width} height={height} className="min-w-full">
        {/* Lane bands + labels */}
        {lanes.map((lane, li) => (
          <g key={lane}>
            <rect
              x={0}
              y={TOP + li * LANE_H - 8}
              width={width}
              height={LANE_H}
              fill={li % 2 === 0 ? '#f7f8fb' : '#ffffff'}
            />
            <text x={10} y={TOP + li * LANE_H + NODE_H / 2} className="fill-ink-500" fontSize={12} fontWeight={600}>
              {truncate(lane, 18)}
            </text>
            <line x1={LEFT - 12} y1={TOP + li * LANE_H - 8} x2={LEFT - 12} y2={TOP + (li + 1) * LANE_H - 8} stroke="#dce0eb" />
          </g>
        ))}

        {/* Connectors (order i -> i+1) */}
        {steps.slice(0, -1).map((s, i) => {
          const a = pos(s, i);
          const b = pos(steps[i + 1], i + 1);
          const ax = a.x + NODE_W;
          const ay = a.y + NODE_H / 2;
          const bx = b.x;
          const by = b.y + NODE_H / 2;
          const midX = (ax + bx) / 2;
          return (
            <path
              key={`c${i}`}
              d={`M ${ax} ${ay} C ${midX} ${ay}, ${midX} ${by}, ${bx} ${by}`}
              fill="none"
              stroke="#b6bdcf"
              strokeWidth={1.6}
              markerEnd="url(#arrow)"
            />
          );
        })}
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#b6bdcf" />
          </marker>
        </defs>

        {/* Nodes */}
        {steps.map((s, i) => {
          const p = pos(s, i);
          const vc = VALUE_CLASS[s.valueClass];
          const selected = s.id === selectedId;
          return (
            <g
              key={s.id}
              transform={`translate(${p.x}, ${p.y})`}
              className={onSelect ? 'cursor-pointer' : ''}
              onClick={() => onSelect?.(s)}
            >
              <rect
                width={NODE_W}
                height={NODE_H}
                rx={10}
                fill="#fff"
                stroke={selected ? '#06b6d4' : vc.color}
                strokeWidth={selected ? 3 : 1.6}
              />
              <rect width={6} height={NODE_H} rx={3} fill={vc.color} />
              <text x={14} y={20} fontSize={11} className="fill-ink-400">
                {s.order}. {STEP_TYPE[s.type].symbol} {STEP_TYPE[s.type].label}
              </text>
              <text x={14} y={38} fontSize={12.5} fontWeight={600} className="fill-ink-800">
                {truncate(s.name, 17)}
              </text>
              <text x={14} y={52} fontSize={10} className="fill-ink-400">
                {(s.processTimeMin ?? 0) + 'm'} · {vc.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
