/**
 * SVG swimlane renderer — the signature current-state visual.
 * Lanes = actors. Columns = step order. Node colour = Lean value class.
 * Horizontally scrollable on screen; scales to fit the page when printing.
 */
import { useRef } from 'react';
import Icon from './Icon';
import { valueClassInfo, stepTypeInfo } from '../lib/frameworks';
import type { Process, ProcessStep } from '../types';

const COL_W = 160;
const COL_GAP = 28;
const LANE_H = 92;
const NODE_W = 140;
const NODE_H = 58;
const LEFT = 150;
const TOP = 36;

// Inline colours (not Tailwind classes) so the SVG renders correctly when
// serialised to a standalone PNG for download.
const INK_800 = '#1f2937';
const INK_500 = '#6b7280';
const INK_400 = '#9ca3af';

export default function ProcessMap({
  process,
  selectedId,
  onSelect,
}: {
  process: Process;
  selectedId?: string;
  onSelect?: (s: ProcessStep) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
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
    <div className="card p-2">
      <div className="no-print mb-1 flex items-center justify-between px-2">
        <span className="text-xs text-ink-400">Scroll sideways to see all steps →</span>
        <button className="btn-ghost text-xs" onClick={() => downloadMapPng(svgRef.current, process.name, width, height)}>
          <Icon name="download" className="h-3.5 w-3.5" /> PNG
        </button>
      </div>
      <div className="overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          className="block print:h-auto print:w-full"
          style={{ maxWidth: 'none' }}
        >
          <rect x={0} y={0} width={width} height={height} fill="#ffffff" />
          {/* Lane bands + labels */}
          {lanes.map((lane, li) => (
            <g key={lane}>
              <rect x={0} y={TOP + li * LANE_H - 8} width={width} height={LANE_H} fill={li % 2 === 0 ? '#f7f8fb' : '#ffffff'} />
              <text x={10} y={TOP + li * LANE_H + NODE_H / 2} fill={INK_500} fontSize={12} fontWeight={600}>
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
            const vc = valueClassInfo(s.valueClass);
            const selected = s.id === selectedId;
            return (
              <g
                key={s.id}
                transform={`translate(${p.x}, ${p.y})`}
                className={onSelect ? 'cursor-pointer' : ''}
                onClick={() => onSelect?.(s)}
              >
                <rect width={NODE_W} height={NODE_H} rx={10} fill="#fff" stroke={selected ? '#06b6d4' : vc.color} strokeWidth={selected ? 3 : 1.6} />
                <rect width={6} height={NODE_H} rx={3} fill={vc.color} />
                <text x={14} y={20} fontSize={11} fill={INK_400}>
                  {s.order}. {stepTypeInfo(s.type).symbol} {stepTypeInfo(s.type).label}
                </text>
                <text x={14} y={38} fontSize={12.5} fontWeight={600} fill={INK_800}>
                  {truncate(s.name, 17)}
                </text>
                <text x={14} y={52} fontSize={10} fill={INK_400}>
                  {(s.processTimeMin ?? 0) + 'm'} · {vc.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

/** Serialise the swimlane SVG to a high-res PNG and trigger a download. */
function downloadMapPng(svg: SVGSVGElement | null, name: string, w: number, h: number) {
  if (!svg) return;
  const scale = 2;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(w));
  clone.setAttribute('height', String(h));
  const data = new XMLSerializer().serializeToString(clone);
  const svg64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(data)));
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flux-map-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };
  img.src = svg64;
}
