/**
 * The encoded best-practice taxonomy that makes FLUX outputs comparable.
 *
 * These constants are the single source of truth for labels, colours, help text
 * and — crucially — the vocabulary fed into every AI prompt. Lean (TIMWOODS),
 * VSM value classification, BPMN-aligned step types, and the value-driver
 * spectrum all live here.
 */
import type {
  AutomationType,
  StepType,
  ValueClass,
  ValueDriver,
  WasteType,
} from '../types';

export const SCHEMA_NOTE =
  'FLUX Standard v1 — SIPOC scope, BPMN-aligned steps, VSM timing (process/wait/%C&A), Lean value classification, TIMWOODS waste tagging.';

// --- Value classification (Lean) --------------------------------------------

export const VALUE_CLASS: Record<ValueClass, { label: string; help: string; color: string; chip: string }> = {
  VA: {
    label: 'Value-Add',
    help: 'Transforms the product/service in a way the customer would pay for. Maximise.',
    color: '#16a34a',
    chip: 'bg-va-100 text-va-700',
  },
  BVA: {
    label: 'Business VA',
    help: 'Necessary non-value-add: required for compliance, control or to enable VA. Minimise.',
    color: '#d97706',
    chip: 'bg-bva-100 text-bva-700',
  },
  NVA: {
    label: 'Waste (NVA)',
    help: 'Pure non-value-add. Adds cost/time without value. Eliminate.',
    color: '#dc2626',
    chip: 'bg-nva-100 text-nva-700',
  },
};

// --- BPMN-aligned step types ------------------------------------------------

export const STEP_TYPE: Record<StepType, { label: string; symbol: string; help: string }> = {
  start: { label: 'Start', symbol: '○', help: 'Trigger / start event.' },
  task: { label: 'Task', symbol: '▢', help: 'A unit of work performed by an actor.' },
  decision: { label: 'Decision', symbol: '◇', help: 'A branch / gateway where the path splits.' },
  handoff: { label: 'Handoff', symbol: '⇄', help: 'Work passes between roles/teams — a key risk point.' },
  wait: { label: 'Wait', symbol: '⏱', help: 'A queue or delay where nothing is being done.' },
  control: { label: 'Control', symbol: '✓', help: 'A check, approval or compliance gate.' },
  system: { label: 'System', symbol: '⚙', help: 'Automated / system-performed step.' },
  end: { label: 'End', symbol: '◉', help: 'End event / outcome delivered.' },
};

export const STEP_TYPE_ORDER: StepType[] = [
  'start',
  'task',
  'decision',
  'control',
  'handoff',
  'wait',
  'system',
  'end',
];

// --- Automation readiness ----------------------------------------------------

export const AUTOMATION: Record<AutomationType, { label: string; score: number; help: string }> = {
  none: { label: 'Manual', score: 0, help: 'Entirely manual judgement / effort.' },
  assisted: { label: 'AI-Assisted', score: 25, help: 'Human in the loop, AI drafts/suggests.' },
  rpa: { label: 'RPA', score: 60, help: 'Rule-based robotic automation of structured steps.' },
  ai: { label: 'AI / Agentic', score: 80, help: 'AI handles judgement-heavy work with oversight.' },
  full: { label: 'Fully Automated', score: 100, help: 'Straight-through, no human touch.' },
};

// --- TIMWOODS — the 8 wastes of Lean ----------------------------------------

export const WASTE: Record<WasteType, { letter: string; label: string; help: string }> = {
  transport: { letter: 'T', label: 'Transport', help: 'Unnecessary movement of materials, data or documents between steps/systems.' },
  inventory: { letter: 'I', label: 'Inventory', help: 'Work-in-progress, backlogs, queues piling up between steps.' },
  motion: { letter: 'M', label: 'Motion', help: 'Unnecessary human movement: swivel-chair between systems, hunting for info.' },
  waiting: { letter: 'W', label: 'Waiting', help: 'Idle time waiting for approvals, inputs, systems or people.' },
  overproduction: { letter: 'O', label: 'Overproduction', help: 'Doing more, sooner or faster than needed — reports nobody reads.' },
  overprocessing: { letter: 'O', label: 'Over-processing', help: 'More work/checks/detail than the customer requires.' },
  defects: { letter: 'D', label: 'Defects', help: 'Errors and rework — work that has to be redone.' },
  skills: { letter: 'S', label: 'Skills (under-use)', help: 'Under-using people’s talent on low-value or wrong-grade work.' },
};

export const WASTE_ORDER: WasteType[] = [
  'transport',
  'inventory',
  'motion',
  'waiting',
  'overproduction',
  'overprocessing',
  'defects',
  'skills',
];

// --- Value drivers — the opportunity spectrum -------------------------------

export const DRIVER: Record<ValueDriver, { label: string; help: string; color: string; chip: string }> = {
  efficiency: { label: 'Efficiency', help: 'Faster / cheaper: cost, cycle time, FTE effort.', color: '#0891b2', chip: 'bg-flux-100 text-flux-700' },
  effectiveness: { label: 'Effectiveness', help: 'Better outcomes: quality, decisions, accuracy.', color: '#6c63ff', chip: 'bg-brand-100 text-brand-700' },
  waste: { label: 'Waste removal', help: 'Eliminate non-value-add activity (TIMWOODS).', color: '#dc2626', chip: 'bg-nva-100 text-nva-700' },
  scale: { label: 'Scale', help: 'Make repeatable, leverageable and volume-proof.', color: '#7c3aed', chip: 'bg-purple-100 text-purple-700' },
  experience: { label: 'Experience', help: 'Customer & employee experience and friction.', color: '#db2777', chip: 'bg-pink-100 text-pink-700' },
  control: { label: 'Control & Risk', help: 'Compliance, auditability, error-proofing.', color: '#d97706', chip: 'bg-bva-100 text-bva-700' },
  resilience: { label: 'Resilience', help: 'Continuity, removing single points of failure.', color: '#0d9488', chip: 'bg-teal-100 text-teal-700' },
};

export const DRIVER_ORDER: ValueDriver[] = [
  'efficiency',
  'effectiveness',
  'waste',
  'scale',
  'experience',
  'control',
  'resilience',
];

// --- Maturity ladder (FLUX Standard) ----------------------------------------

export const MATURITY_LEVELS = [
  { level: 1, label: 'Ad hoc', help: 'Undocumented, tribal knowledge, varies by person.' },
  { level: 2, label: 'Documented', help: 'Written down but not measured or standardised.' },
  { level: 3, label: 'Standardised', help: 'One agreed way, measured against the FLUX standard.' },
  { level: 4, label: 'Managed', help: 'Metrics monitored, controls in place, improving.' },
  { level: 5, label: 'Optimised / Automated', help: 'Continuously improved, automation-native.' },
];

// --- Impact / Effort labels --------------------------------------------------

export const SCALE_5 = ['', 'Very low', 'Low', 'Medium', 'High', 'Very high'];

export function wasteLabel(w?: WasteType): string {
  return w ? WASTE[w].label : '—';
}
