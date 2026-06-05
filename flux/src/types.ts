/**
 * FLUX domain model — the standardized, comparable schema.
 *
 * Everything FLUX produces conforms to these shapes. That is the whole point:
 * a process mapped in Manila by one analyst and a process mapped in London by
 * another are described with the SAME fields, the SAME value taxonomy, and the
 * SAME metrics — so they can be scored, ranked and compared portfolio-wide.
 *
 * Schema version is stamped on every Process so future migrations stay safe.
 */

export type AIProviderId = 'anthropic' | 'openai' | 'gemini';

export const FLUX_SCHEMA_VERSION = 1 as const;

// ============================================================================
// Settings (singleton)
// ============================================================================

export interface OrgDefaults {
  /** Default fully-loaded labour cost per hour, used for waste costing. */
  loadedHourlyCost?: number;
  /** ISO currency code, e.g. GBP, USD. */
  currency?: string;
  /** Working hours per FTE per year (for capacity maths). Default 1760. */
  annualHoursPerFte?: number;
}

export interface AppSettings {
  id: 'singleton';
  onboarded: boolean;
  /** Primary provider/model used for reasoning (map, diagnose, design). */
  aiProvider?: AIProviderId;
  aiModel?: string;
  /** Legacy single-key fields (migrated into aiKeys on read). */
  aiKeyCipher?: string;
  aiKeyPlaintext?: boolean;
  /** BYOK keys per provider, so FLUX can route each task to the best model. */
  aiKeys?: Partial<Record<AIProviderId, { cipher: string; plaintext?: boolean }>>;
  org?: OrgDefaults;
  updatedAt: number;
}

// ============================================================================
// Project — an engagement / assessment containing one or more processes
// ============================================================================

export interface Project {
  id: string;
  name: string;
  client: string;
  industry: string;
  /** The business function in scope, e.g. "Order to Cash", "HR Onboarding". */
  scope: string;
  /** Strategic objective this engagement serves. */
  objective?: string;
  /** Free-text engagement context the AI uses across all stages. */
  context?: string;
  org?: OrgDefaults;
  /** Stage 1 SPOT diagnostic (signals + AI-surfaced high-drag areas). */
  diagnostic?: Diagnostic;
  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// SPOT diagnostic (Stage 1)
// ============================================================================

export interface DiagnosticSignal {
  id: string;
  /** Role the signal came from, e.g. "Frontline operator", "Finance lead". */
  role: string;
  /** The friction / symptom described. */
  symptom: string;
  /** 1-5 felt severity. */
  severity: number;
  /** 1-5 how often it bites. */
  frequency: number;
}

export interface DiagnosticArea {
  id: string;
  name: string;
  rationale: string;
  /** Estimated drag: 1-5. */
  drag: number;
  /** Which value driver leaks here. */
  drivers: ValueDriver[];
  /** Recommended to map next? */
  recommended: boolean;
}

export interface Diagnostic {
  signals: DiagnosticSignal[];
  /** AI-surfaced high-drag areas worth mapping. */
  areas: DiagnosticArea[];
  /** AI narrative summary of where drag concentrates. */
  summary?: string;
  ranAt?: number;
}

// ============================================================================
// Process — the central comparable artifact (Stage 2: MAP)
// ============================================================================

/** Lean value classification of a step. */
export type ValueClass = 'VA' | 'BVA' | 'NVA';
//  VA  = Value-Add (customer would pay for it)
//  BVA = Business Value-Add (necessary non-value-add: compliance, controls)
//  NVA = Non-Value-Add (pure waste — eliminate)

/** BPMN-aligned, deliberately small and unambiguous. */
export type StepType = 'task' | 'decision' | 'handoff' | 'wait' | 'control' | 'system' | 'start' | 'end';

/** Automation readiness of a step. */
export type AutomationType = 'none' | 'assisted' | 'rpa' | 'ai' | 'full';

/** The 8 wastes of Lean — TIMWOODS. */
export type WasteType =
  | 'transport'
  | 'inventory'
  | 'motion'
  | 'waiting'
  | 'overproduction'
  | 'overprocessing'
  | 'defects'
  | 'skills';

/** Where value leaks / can be created. The opportunity "spectrum". */
export type ValueDriver =
  | 'efficiency' // do it faster / cheaper (cost, cycle time, FTE)
  | 'effectiveness' // do it better (quality, outcome, decision)
  | 'waste' // remove non-value-add
  | 'scale' // make it repeatable / leverageable / volume-proof
  | 'experience' // customer / employee experience
  | 'control' // risk, compliance, auditability
  | 'resilience'; // continuity, single-points-of-failure

export interface ProcessStep {
  id: string;
  /** 1-based display order. */
  order: number;
  name: string;
  description?: string;
  type: StepType;
  /** Swimlane: the role/actor accountable. */
  actor: string;
  /** System or tool used (Excel, SAP, email...). Drives "underutilised tech" insight. */
  system?: string;
  valueClass: ValueClass;
  /** Touch / process time in minutes (hands-on work). */
  processTimeMin?: number;
  /** Elapsed wait time before/within this step in minutes (queue, approval lag). */
  waitTimeMin?: number;
  /** % Complete & Accurate — passes downstream without rework. 0-100. VSM metric. */
  pctCompleteAccurate?: number;
  /** Times this step is reworked / looped per occurrence (>0 signals a rework loop). */
  reworkRate?: number;
  automation: AutomationType;
  /** Free-text pain captured in the field. */
  painPoint?: string;
  /** For decision steps: branch labels. */
  branches?: string[];
}

export interface ProcessMetrics {
  totalProcessTimeMin: number;
  totalWaitTimeMin: number;
  totalLeadTimeMin: number;
  /** Process Cycle Efficiency = VA time / lead time. The headline Lean KPI. */
  pce: number;
  /** Rolled %C&A across steps (product of per-step %C&A). */
  rolledCompleteAccurate: number;
  stepCount: number;
  handoffCount: number;
  decisionCount: number;
  reworkLoopCount: number;
  vaCount: number;
  bvaCount: number;
  nvaCount: number;
  /** Share of touch time that is VA (0-1). */
  vaTimeShare: number;
  /** Automation index 0-100 — how automatable the process is today. */
  automationIndex: number;
  /** Estimated annual labour cost of running this process, if volume + cost known. */
  annualCost?: number;
  /** Estimated annual NVA (waste) cost. */
  annualWasteCost?: number;
}

export interface Process {
  id: string;
  projectId: string;
  schemaVersion: number;
  name: string;
  /** What kicks the process off. */
  trigger?: string;
  /** Process owner role. */
  owner?: string;
  function?: string;
  /** Occurrences per year — needed to annualise cost/waste. */
  annualVolume?: number;
  /** SIPOC scoping (Stage 2 boundary discipline). */
  sipoc?: Sipoc;
  steps: ProcessStep[];
  /** Stage 4 future-state design (AI-drafted, human-edited). */
  futureState?: FutureState;
  /** Maturity 1-5 self/AI-rated against the FLUX standard. */
  maturity?: number;
  /** Ingested raw material (interviews, docs, logs…) the map was synthesised from. */
  sources?: Source[];
  /** Open questions / gaps / assumptions surfaced during ingestion. */
  clarifications?: Clarification[];
  /** Has a human checked/tidied the AI-generated map? Drives the review prompt. */
  reviewed?: boolean;
  status: 'draft' | 'mapped' | 'diagnosed' | 'designed';
  createdAt: number;
  updatedAt: number;
}

export interface Sipoc {
  suppliers: string[];
  inputs: string[];
  outputs: string[];
  customers: string[];
}

// ============================================================================
// Opportunities (Stage 3: DIAGNOSE)
// ============================================================================

export type ImpactEffort = 1 | 2 | 3 | 4 | 5;

export interface Opportunity {
  id: string;
  processId: string;
  title: string;
  /** What's wrong and why it matters. */
  description: string;
  /** Primary value driver / lens. */
  driver: ValueDriver;
  /** Lean waste category, if applicable. */
  waste?: WasteType;
  /** Step ids this opportunity is evidenced by. */
  stepRefs: string[];
  /** Recommended intervention. */
  recommendation: string;
  /** What kind of automation, if any, unlocks it. */
  automation: AutomationType;
  impact: ImpactEffort;
  effort: ImpactEffort;
  /** 0-1 AI confidence. */
  confidence: number;
  /** Estimated annualised value (currency), if quantifiable. */
  estAnnualValue?: number;
  /** The working behind estAnnualValue — drivers, volume, rate, assumptions. */
  valueBasis?: string;
  /** Kaizen "just-do-it" quick win? */
  quickWin: boolean;
  /** Computed priority score (see metrics.ts). */
  priority?: number;
  source: 'ai' | 'human';
  createdAt: number;
}

// ============================================================================
// Future state (Stage 4: DESIGN)
// ============================================================================

export interface FutureState {
  /** Markdown narrative of the redesigned process. */
  narrative: string;
  /** Redesigned step list (optional — narrative is the minimum). */
  steps?: ProcessStep[];
  /** AI-projected metrics after redesign. */
  projected?: Partial<ProcessMetrics>;
  /** Business case markdown (ROI, payback). */
  businessCase?: string;
  /** Implementation roadmap markdown. */
  roadmap?: string;
  ranAt?: number;
}

// ============================================================================
// Knowledge cards — the self-upskilling library
// ============================================================================

export type KnowledgeKind = 'benchmark' | 'reference-model' | 'best-practice' | 'risk' | 'note';

// ============================================================================
// Ingestion — multimodal sources + the clarification loop
// ============================================================================

export type SourceKind = 'text' | 'document' | 'image' | 'audio' | 'video' | 'eventlog';

/** What the AI pulled out of one source, in the FLUX vocabulary. */
export interface SourceObservation {
  steps?: string[];
  actors?: string[];
  systems?: string[];
  pains?: string[];
  timings?: string[];
  metrics?: string[];
}

export interface Source {
  id: string;
  kind: SourceKind;
  /** File name or a short label for pasted text. */
  name: string;
  mime?: string;
  sizeBytes?: number;
  status: 'processing' | 'ready' | 'error';
  /** One-line summary of what this source contributes. */
  summary?: string;
  /** Full transcript / extracted text. */
  extraction?: string;
  observations?: SourceObservation;
  error?: string;
  /** Which provider/model processed it. */
  providerUsed?: string;
  createdAt: number;
}

export type ClarificationCategory = 'gap' | 'assumption' | 'conflict' | 'suggestion';

export interface Clarification {
  id: string;
  question: string;
  category: ClarificationCategory;
  /** Why it matters / what it would change. */
  rationale?: string;
  /** 1-5 how much it affects the result. */
  severity?: number;
  status: 'open' | 'answered' | 'dismissed';
  answer?: string;
  createdAt: number;
}

export interface KnowledgeCard {
  id: string;
  /** Optional scope: tied to a project/process, or global. */
  projectId?: string;
  processId?: string;
  kind: KnowledgeKind;
  title: string;
  /** Industry / process domain this applies to (for retrieval). */
  domain: string;
  body: string;
  /** Where it came from. AI-generated content is flagged for validation. */
  source: 'ai-research' | 'user' | 'engagement';
  /** Has a human validated this AI-generated knowledge? */
  validated: boolean;
  tags: string[];
  createdAt: number;
}
