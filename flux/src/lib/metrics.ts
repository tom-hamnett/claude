/**
 * Pure functions that turn a Process into comparable, standardized metrics.
 * No I/O, no React — easy to test and reason about.
 */
import { AUTOMATION } from './frameworks';
import type {
  ImpactEffort,
  OrgDefaults,
  Opportunity,
  Process,
  ProcessMetrics,
  ProcessStep,
} from '../types';

const DEFAULT_ANNUAL_HOURS = 1760;

export function computeMetrics(p: Process, org?: OrgDefaults): ProcessMetrics {
  const steps = p.steps ?? [];
  const totalProcessTimeMin = sum(steps.map((s) => s.processTimeMin ?? 0));
  const totalWaitTimeMin = sum(steps.map((s) => s.waitTimeMin ?? 0));
  const totalLeadTimeMin = totalProcessTimeMin + totalWaitTimeMin;

  const vaTimeMin = sum(steps.filter((s) => s.valueClass === 'VA').map((s) => s.processTimeMin ?? 0));
  const pce = totalLeadTimeMin > 0 ? vaTimeMin / totalLeadTimeMin : 0;

  // Rolled %C&A — product of per-step quality, only across steps that declared it.
  const caSteps = steps.filter((s) => typeof s.pctCompleteAccurate === 'number');
  const rolledCompleteAccurate = caSteps.length
    ? caSteps.reduce((acc, s) => acc * ((s.pctCompleteAccurate ?? 100) / 100), 1)
    : 1;

  const vaCount = steps.filter((s) => s.valueClass === 'VA').length;
  const bvaCount = steps.filter((s) => s.valueClass === 'BVA').length;
  const nvaCount = steps.filter((s) => s.valueClass === 'NVA').length;
  const handoffCount = steps.filter((s) => s.type === 'handoff').length;
  const decisionCount = steps.filter((s) => s.type === 'decision').length;
  const reworkLoopCount = steps.filter((s) => (s.reworkRate ?? 0) > 0).length;

  const vaTimeShare = totalProcessTimeMin > 0 ? vaTimeMin / totalProcessTimeMin : 0;

  const automationIndex = steps.length
    ? Math.round(sum(steps.map((s) => AUTOMATION[s.automation].score)) / steps.length)
    : 0;

  // Costing — only when we can annualise.
  let annualCost: number | undefined;
  let annualWasteCost: number | undefined;
  const hourly = org?.loadedHourlyCost;
  const volume = p.annualVolume;
  if (hourly && volume && totalProcessTimeMin > 0) {
    annualCost = (totalProcessTimeMin / 60) * hourly * volume;
    const nvaTimeMin = sum(steps.filter((s) => s.valueClass === 'NVA').map((s) => s.processTimeMin ?? 0));
    annualWasteCost = (nvaTimeMin / 60) * hourly * volume;
  }

  return {
    totalProcessTimeMin,
    totalWaitTimeMin,
    totalLeadTimeMin,
    pce,
    rolledCompleteAccurate,
    stepCount: steps.length,
    handoffCount,
    decisionCount,
    reworkLoopCount,
    vaCount,
    bvaCount,
    nvaCount,
    vaTimeShare,
    automationIndex,
    annualCost,
    annualWasteCost,
  };
}

export function fteEquivalent(annualHoursSaved: number, org?: OrgDefaults): number {
  const hrs = org?.annualHoursPerFte ?? DEFAULT_ANNUAL_HOURS;
  return hrs > 0 ? annualHoursSaved / hrs : 0;
}

/**
 * Priority score for an opportunity. Classic value/effort with confidence and
 * a quick-win nudge. Range ~0-100, higher = do sooner.
 */
export function scoreOpportunity(o: Pick<Opportunity, 'impact' | 'effort' | 'confidence' | 'quickWin'>): number {
  const impact = clamp(o.impact, 1, 5);
  const effort = clamp(o.effort, 1, 5);
  const base = (impact / effort) * 20; // 4 (5/1*20=100) .. (1/5*20=4)
  const conf = 0.5 + 0.5 * clamp01(o.confidence); // confidence dampens, never zeroes
  const quick = o.quickWin ? 1.1 : 1;
  return Math.round(Math.min(100, base * conf * quick));
}

export function prioritize(opps: Opportunity[]): Opportunity[] {
  return [...opps]
    .map((o) => ({ ...o, priority: o.priority ?? scoreOpportunity(o) }))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

/** Roll a set of opportunities up into headline numbers for a process/portfolio. */
export function opportunityValue(opps: Opportunity[]): { total: number; quickWins: number; count: number } {
  const total = sum(opps.map((o) => o.estAnnualValue ?? 0));
  const quickWins = opps.filter((o) => o.quickWin).length;
  return { total, quickWins, count: opps.length };
}

/** Bucket for the impact/effort matrix. */
export function matrixQuadrant(impact: ImpactEffort, effort: ImpactEffort): 'quickwin' | 'major' | 'fillin' | 'thankless' {
  const hiImpact = impact >= 3;
  const loEffort = effort <= 3;
  if (hiImpact && loEffort) return 'quickwin';
  if (hiImpact && !loEffort) return 'major';
  if (!hiImpact && loEffort) return 'fillin';
  return 'thankless';
}

// --- helpers ----------------------------------------------------------------

function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** Re-number steps 1..n in array order. Keeps the map tidy after edits. */
export function renumber(steps: ProcessStep[]): ProcessStep[] {
  return steps.map((s, i) => ({ ...s, order: i + 1 }));
}
