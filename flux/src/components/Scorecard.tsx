import { fmtDuration, fmtMoney, fmtPct } from '../lib/format';
import type { ProcessMetrics } from '../types';

function Tile({ label, value, sub, tone = 'default' }: { label: string; value: string; sub?: string; tone?: 'default' | 'good' | 'warn' | 'bad' }) {
  const toneCls =
    tone === 'good' ? 'text-va-600' : tone === 'warn' ? 'text-bva-600' : tone === 'bad' ? 'text-nva-600' : 'text-ink-800';
  return (
    <div className="card p-4">
      <div className="label">{label}</div>
      <div className={`font-display text-2xl font-bold ${toneCls}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-ink-400">{sub}</div>}
    </div>
  );
}

export default function Scorecard({ m, currency = 'GBP' }: { m: ProcessMetrics; currency?: string }) {
  const pceTone = m.pce >= 0.25 ? 'good' : m.pce >= 0.1 ? 'warn' : 'bad';
  const caTone = m.rolledCompleteAccurate >= 0.9 ? 'good' : m.rolledCompleteAccurate >= 0.7 ? 'warn' : 'bad';
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <Tile label="Lead time" value={fmtDuration(m.totalLeadTimeMin)} sub={`${fmtDuration(m.totalProcessTimeMin)} touch`} />
      <Tile label="Cycle efficiency (PCE)" value={fmtPct(m.pce, 1)} sub="VA time ÷ lead time" tone={pceTone} />
      <Tile label="Rolled %C&A" value={fmtPct(m.rolledCompleteAccurate, 1)} sub="first-time-right" tone={caTone} />
      <Tile label="Automation index" value={`${m.automationIndex}`} sub="0 manual · 100 auto" />
      <Tile label="Steps" value={`${m.stepCount}`} sub={`${m.vaCount} VA · ${m.bvaCount} BVA · ${m.nvaCount} NVA`} />
      <Tile label="Handoffs" value={`${m.handoffCount}`} sub="coordination risk" tone={m.handoffCount > 4 ? 'warn' : 'default'} />
      <Tile label="Rework loops" value={`${m.reworkLoopCount}`} sub="defect signals" tone={m.reworkLoopCount > 0 ? 'bad' : 'good'} />
      {m.annualCost !== undefined ? (
        <Tile label="Annual run-cost" value={fmtMoney(m.annualCost, currency)} sub={m.annualWasteCost !== undefined ? `${fmtMoney(m.annualWasteCost, currency)} waste` : undefined} tone="warn" />
      ) : (
        <Tile label="Decisions" value={`${m.decisionCount}`} sub="branch points" />
      )}
    </div>
  );
}
