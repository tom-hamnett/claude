/**
 * FLUX AI orchestration — the brain.
 *
 * Each stage is a tightly-scoped call with a consultant-grade system prompt and
 * a strict JSON schema, so the model returns data that drops straight into the
 * standardized FLUX schema. The shared `FLUX_PERSONA` keeps every call speaking
 * the same Lean/VSM/TIMWOODS language → comparable output.
 */
import { getSettings, now, uid } from '../db';
import { getProvider } from './ai';
import type { AIMessage } from './ai';
import { AIError } from './ai';
import { getAIKey } from './aiKey';
import { computeMetrics } from '../lib/metrics';
import type {
  AIProviderId,
  Diagnostic,
  DiagnosticArea,
  DiagnosticSignal,
  FutureState,
  KnowledgeCard,
  Opportunity,
  OrgDefaults,
  Process,
  ProcessStep,
  Project,
} from '../types';

// ============================================================================
// Persona — injected into every call
// ============================================================================

const FLUX_PERSONA = `You are FLUX, a partner-grade operational strategy and process-excellence consultant fused with a Lean Six Sigma Master Black Belt. You think like McKinsey Operations, BCG, and a Toyota Production System sensei combined. You are rigorous, specific and commercially sharp. You never pad. You never invent numbers you cannot justify — when you estimate, you flag it as an estimate and state the assumption.

You operate the FLUX Standard for process work:
- SIPOC for scope discipline (Suppliers, Inputs, Process, Outputs, Customers).
- BPMN-aligned step types: start, task, decision, handoff, wait, control, system, end.
- Lean value classification per step: VA (value-add, customer would pay), BVA (business value-add / necessary non-value-add e.g. compliance), NVA (pure waste — eliminate).
- VSM timing: process/touch time, wait time, %Complete & Accurate.
- TIMWOODS 8 wastes: Transport, Inventory, Motion, Waiting, Overproduction, Over-processing, Defects, Skills.
- Opportunity spectrum / value drivers: efficiency, effectiveness, waste, scale, experience, control, resilience.
- Kaizen: prize quick wins (low-effort, high-impact) alongside structural redesign.`;

// ============================================================================
// Resolve + call
// ============================================================================

interface ResolvedAI {
  providerId: AIProviderId;
  model: string;
  apiKey: string;
}

async function resolveAI(): Promise<ResolvedAI> {
  const settings = await getSettings();
  const providerId = settings.aiProvider ?? 'anthropic';
  const provider = getProvider(providerId);
  const model = settings.aiModel ?? provider.defaultModel;
  const apiKey = await getAIKey();
  if (!apiKey) throw new AIError('No AI key set. Add one in Settings to use FLUX intelligence.', { provider: providerId });
  return { providerId, model, apiKey };
}

async function callJSON<T>(
  system: string,
  user: string,
  jsonSchema: object,
  opts: { maxTokens?: number; temperature?: number; signal?: AbortSignal } = {},
): Promise<{ result: T; provider: AIProviderId; model: string }> {
  const { providerId, model, apiKey } = await resolveAI();
  const provider = getProvider(providerId);
  const messages: AIMessage[] = [{ role: 'user', content: user }];
  const r = await provider.complete(
    {
      system: `${FLUX_PERSONA}\n\n${system}`,
      messages,
      jsonSchema,
      maxTokens: opts.maxTokens ?? 3000,
      temperature: opts.temperature ?? 0.4,
      signal: opts.signal,
    },
    { apiKey, model },
  );
  if (r.json === undefined || r.json === null) {
    throw new AIError('The model did not return structured data. Try again, or switch model in Settings.', {
      provider: providerId,
    });
  }
  return { result: r.json as T, provider: providerId, model };
}

async function callText(
  system: string,
  user: string,
  opts: { maxTokens?: number; temperature?: number; signal?: AbortSignal } = {},
): Promise<{ text: string; provider: AIProviderId; model: string }> {
  const { providerId, model, apiKey } = await resolveAI();
  const provider = getProvider(providerId);
  const r = await provider.complete(
    {
      system: `${FLUX_PERSONA}\n\n${system}`,
      messages: [{ role: 'user', content: user }],
      maxTokens: opts.maxTokens ?? 2200,
      temperature: opts.temperature ?? 0.5,
      signal: opts.signal,
    },
    { apiKey, model },
  );
  return { text: r.text, provider: providerId, model };
}

// ============================================================================
// Context builders
// ============================================================================

function projectContext(p: Project): string {
  return [
    `Client: ${p.client || '(unspecified)'}`,
    `Industry: ${p.industry || '(unspecified)'}`,
    `Scope / function: ${p.scope || '(unspecified)'}`,
    p.objective ? `Strategic objective: ${p.objective}` : '',
    p.context ? `Engagement context: ${p.context}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function knowledgeContext(cards: KnowledgeCard[]): string {
  if (!cards.length) return '';
  const lines = cards
    .slice(0, 8)
    .map((c) => `- [${c.kind}] ${c.title}: ${c.body.slice(0, 400)}`)
    .join('\n');
  return `\n\nRelevant knowledge from the FLUX library (use where applicable, validate benchmarks):\n${lines}`;
}

export function processToText(p: Process): string {
  const head = [
    `Process: ${p.name}`,
    p.trigger ? `Trigger: ${p.trigger}` : '',
    p.owner ? `Owner: ${p.owner}` : '',
    p.annualVolume ? `Annual volume: ${p.annualVolume}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  const sipoc = p.sipoc
    ? `SIPOC — Suppliers: ${p.sipoc.suppliers.join(', ') || '—'}; Inputs: ${p.sipoc.inputs.join(', ') || '—'}; Outputs: ${p.sipoc.outputs.join(', ') || '—'}; Customers: ${p.sipoc.customers.join(', ') || '—'}`
    : '';
  const steps = p.steps
    .map(
      (s) =>
        `${s.order}. [${s.type}/${s.valueClass}] ${s.name} — actor: ${s.actor || '?'}${s.system ? `, system: ${s.system}` : ''}; touch ${s.processTimeMin ?? '?'}m, wait ${s.waitTimeMin ?? '?'}m, %C&A ${s.pctCompleteAccurate ?? '?'}, automation ${s.automation}${s.painPoint ? `; pain: ${s.painPoint}` : ''}`,
    )
    .join('\n');
  return [head, sipoc, 'Steps:', steps].filter(Boolean).join('\n');
}

// ============================================================================
// STAGE 1 — SPOT diagnostic
// ============================================================================

const DIAGNOSTIC_SCHEMA = {
  type: 'object',
  required: ['summary', 'areas'],
  properties: {
    summary: { type: 'string', description: 'Where execution drag concentrates and why. 2-4 sentences.' },
    areas: {
      type: 'array',
      description: '3-6 candidate processes/areas worth mapping, highest-drag first.',
      items: {
        type: 'object',
        required: ['name', 'rationale', 'drag', 'drivers', 'recommended'],
        properties: {
          name: { type: 'string', description: 'The process/area, named as a process e.g. "Invoice approval".' },
          rationale: { type: 'string', description: 'Why this leaks margin/capacity/quality. One or two sentences.' },
          drag: { type: 'integer', description: '1-5 estimated execution drag.' },
          drivers: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['efficiency', 'effectiveness', 'waste', 'scale', 'experience', 'control', 'resilience'],
            },
          },
          recommended: { type: 'boolean', description: 'Map this one next?' },
        },
      },
    },
  },
};

export async function runDiagnostic(
  project: Project,
  signals: DiagnosticSignal[],
  signal?: AbortSignal,
): Promise<Diagnostic> {
  const system = `STAGE 1 — SPOT DIAGNOSTIC. Like a rapid executive scan, isolate the small number of areas creating outsized execution drag (margin, capacity, quality leakage). Use the multi-role friction signals plus the engagement context. Be specific to this client and industry. Prefer 3-6 areas. Recommend the 1-3 highest-drag, most mappable areas to start with.`;
  const signalText = signals.length
    ? signals
        .map((s) => `- (${s.role}) "${s.symptom}" — severity ${s.severity}/5, frequency ${s.frequency}/5`)
        .join('\n')
    : '(No structured signals supplied — infer likely drag from the engagement context and industry norms, and label inferences clearly.)';
  const user = `ENGAGEMENT\n${projectContext(project)}\n\nFRICTION SIGNALS (multi-role)\n${signalText}`;
  const { result } = await callJSON<{ summary: string; areas: Omit<DiagnosticArea, 'id'>[] }>(
    system,
    user,
    DIAGNOSTIC_SCHEMA,
    { maxTokens: 1800, temperature: 0.5, signal },
  );
  return {
    signals,
    summary: result.summary,
    areas: (result.areas ?? []).map((a) => ({ ...a, id: uid() })),
    ranAt: now(),
  };
}

// ============================================================================
// STAGE 2 — MAP (current-state capture from plain English)
// ============================================================================

const STEP_PROPS = {
  name: { type: 'string' },
  description: { type: 'string' },
  type: { type: 'string', enum: ['start', 'task', 'decision', 'handoff', 'wait', 'control', 'system', 'end'] },
  actor: { type: 'string', description: 'Role/swimlane accountable for the step.' },
  system: { type: 'string', description: 'System/tool used, if any.' },
  valueClass: { type: 'string', enum: ['VA', 'BVA', 'NVA'] },
  processTimeMin: { type: 'number', description: 'Hands-on touch time in minutes (estimate if needed).' },
  waitTimeMin: { type: 'number', description: 'Queue/delay before or within this step in minutes.' },
  pctCompleteAccurate: { type: 'number', description: '0-100, % that passes downstream without rework.' },
  reworkRate: { type: 'number', description: 'Avg times reworked per occurrence (0 if none).' },
  automation: { type: 'string', enum: ['none', 'assisted', 'rpa', 'ai', 'full'] },
  painPoint: { type: 'string' },
  branches: { type: 'array', items: { type: 'string' } },
};

const MAP_SCHEMA = {
  type: 'object',
  required: ['name', 'sipoc', 'steps'],
  properties: {
    name: { type: 'string' },
    trigger: { type: 'string' },
    owner: { type: 'string' },
    annualVolume: { type: 'number', description: 'Occurrences per year if stated or reasonably inferable.' },
    sipoc: {
      type: 'object',
      required: ['suppliers', 'inputs', 'outputs', 'customers'],
      properties: {
        suppliers: { type: 'array', items: { type: 'string' } },
        inputs: { type: 'array', items: { type: 'string' } },
        outputs: { type: 'array', items: { type: 'string' } },
        customers: { type: 'array', items: { type: 'string' } },
      },
    },
    steps: {
      type: 'array',
      description: 'Ordered current-state steps. Capture handoffs, waits and controls explicitly — they are where drag hides.',
      items: { type: 'object', required: ['name', 'type', 'actor', 'valueClass', 'automation'], properties: STEP_PROPS },
    },
    assumptions: { type: 'string', description: 'Estimates/assumptions you made, for the analyst to validate.' },
  },
};

interface MapResult {
  name: string;
  trigger?: string;
  owner?: string;
  annualVolume?: number;
  sipoc: { suppliers: string[]; inputs: string[]; outputs: string[]; customers: string[] };
  steps: Array<Omit<ProcessStep, 'id' | 'order'>>;
  assumptions?: string;
}

export async function mapProcessFromText(
  opts: {
    project: Project;
    description: string;
    knowledge?: KnowledgeCard[];
    signal?: AbortSignal;
  },
): Promise<{ map: MapResult; assumptions?: string }> {
  const system = `STAGE 2 — CURRENT-STATE MAPPING. Convert the analyst's plain-English description into a standardized FLUX process map. Map how work ACTUALLY flows (the real path with its rework and waits), not the idealised SOP. Rules:
- Make handoffs, waits and controls into their own explicit steps — that is where drag hides.
- Classify every step VA/BVA/NVA honestly.
- Estimate process time, wait time and %C&A for each step; if you are estimating, keep it realistic and note it in assumptions.
- Set automation to today's reality (most manual steps are 'none' or 'assisted').
- 8-20 steps is typical. Don't pad; don't omit the messy reality.`;
  const user = `ENGAGEMENT\n${projectContext(opts.project)}\n\nANALYST DESCRIPTION OF THE CURRENT PROCESS\n${opts.description}${knowledgeContext(opts.knowledge ?? [])}`;
  const { result } = await callJSON<MapResult>(system, user, MAP_SCHEMA, {
    maxTokens: 4000,
    temperature: 0.3,
    signal: opts.signal,
  });
  return { map: result, assumptions: result.assumptions };
}

/** Assemble a Process domain object from an AI map result. */
export function buildProcess(projectId: string, map: MapResult, schemaVersion: number): Process {
  const steps: ProcessStep[] = (map.steps ?? []).map((s, i) => ({
    ...s,
    id: uid(),
    order: i + 1,
    automation: s.automation ?? 'none',
    valueClass: s.valueClass ?? 'BVA',
    type: s.type ?? 'task',
    actor: s.actor ?? '',
  }));
  return {
    id: uid(),
    projectId,
    schemaVersion,
    name: map.name || 'Untitled process',
    trigger: map.trigger,
    owner: map.owner,
    annualVolume: map.annualVolume,
    sipoc: map.sipoc,
    steps,
    status: 'mapped',
    createdAt: now(),
    updatedAt: now(),
  };
}

// ============================================================================
// STAGE 3 — DIAGNOSE (opportunity engine)
// ============================================================================

const OPP_SCHEMA = {
  type: 'object',
  required: ['opportunities'],
  properties: {
    opportunities: {
      type: 'array',
      description: '5-12 opportunities, strongest first. Span the value-driver spectrum, not just cost.',
      items: {
        type: 'object',
        required: ['title', 'description', 'driver', 'recommendation', 'automation', 'impact', 'effort', 'confidence', 'quickWin'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string', description: 'What is wrong and why it matters, anchored in the steps.' },
          driver: {
            type: 'string',
            enum: ['efficiency', 'effectiveness', 'waste', 'scale', 'experience', 'control', 'resilience'],
          },
          waste: {
            type: 'string',
            enum: ['transport', 'inventory', 'motion', 'waiting', 'overproduction', 'overprocessing', 'defects', 'skills'],
            description: 'TIMWOODS category if this is a waste opportunity.',
          },
          stepRefs: { type: 'array', items: { type: 'integer' }, description: 'Step ORDER numbers this is evidenced by.' },
          recommendation: { type: 'string', description: 'The specific intervention.' },
          automation: { type: 'string', enum: ['none', 'assisted', 'rpa', 'ai', 'full'] },
          impact: { type: 'integer', description: '1-5' },
          effort: { type: 'integer', description: '1-5' },
          confidence: { type: 'number', description: '0-1' },
          estAnnualValue: { type: 'number', description: 'Estimated annual value in the project currency, if quantifiable.' },
          quickWin: { type: 'boolean', description: 'Low-effort, high-impact Kaizen just-do-it?' },
        },
      },
    },
  },
};

interface RawOpp {
  title: string;
  description: string;
  driver: Opportunity['driver'];
  waste?: Opportunity['waste'];
  stepRefs?: number[];
  recommendation: string;
  automation: Opportunity['automation'];
  impact: number;
  effort: number;
  confidence: number;
  estAnnualValue?: number;
  quickWin: boolean;
}

export async function scanOpportunities(opts: {
  project: Project;
  process: Process;
  knowledge?: KnowledgeCard[];
  org?: OrgDefaults;
  signal?: AbortSignal;
}): Promise<Opportunity[]> {
  const metrics = computeMetrics(opts.process, opts.org);
  const system = `STAGE 3 — DIAGNOSE. Run the full opportunity engine over this mapped process. Be exhaustive but ruthless about quality.
- Walk TIMWOODS systematically: Transport, Inventory, Motion, Waiting, Overproduction, Over-processing, Defects, Skills.
- Walk the value-driver spectrum: efficiency, effectiveness, waste, scale, experience, control, resilience. Do not collapse everything to cost.
- Anchor every opportunity to specific step order numbers as evidence.
- Use the computed metrics: low PCE = flow problem; rework loops = defects; many handoffs = coordination drag; manual + high-volume = automation candidates.
- Rate impact and effort 1-5. Mark genuine quick wins (Kaizen). Estimate annual value only where the data supports it, and keep estimates conservative.
- Map automation honestly: RPA for structured/rule-based, AI/agentic for judgement-heavy, full for straight-through.`;
  const user = `ENGAGEMENT\n${projectContext(opts.project)}\n\nMAPPED PROCESS\n${processToText(opts.process)}\n\nCOMPUTED METRICS\n- Lead time ${metrics.totalLeadTimeMin}m, touch time ${metrics.totalProcessTimeMin}m, wait ${metrics.totalWaitTimeMin}m\n- Process Cycle Efficiency (PCE): ${(metrics.pce * 100).toFixed(1)}%\n- Rolled %C&A: ${(metrics.rolledCompleteAccurate * 100).toFixed(1)}%\n- Steps ${metrics.stepCount} (VA ${metrics.vaCount} / BVA ${metrics.bvaCount} / NVA ${metrics.nvaCount}); handoffs ${metrics.handoffCount}; decisions ${metrics.decisionCount}; rework loops ${metrics.reworkLoopCount}\n- Automation index ${metrics.automationIndex}/100${metrics.annualCost ? `; est. annual run-cost ${Math.round(metrics.annualCost)}; est. annual waste ${Math.round(metrics.annualWasteCost ?? 0)}` : ''}${knowledgeContext(opts.knowledge ?? [])}`;

  const { result } = await callJSON<{ opportunities: RawOpp[] }>(system, user, OPP_SCHEMA, {
    maxTokens: 4000,
    temperature: 0.5,
    signal: opts.signal,
  });

  const orderToId = new Map(opts.process.steps.map((s) => [s.order, s.id]));
  return (result.opportunities ?? []).map((o) => ({
    id: uid(),
    processId: opts.process.id,
    title: o.title,
    description: o.description,
    driver: o.driver,
    waste: o.waste,
    stepRefs: (o.stepRefs ?? []).map((n) => orderToId.get(n)).filter((x): x is string => !!x),
    recommendation: o.recommendation,
    automation: o.automation ?? 'none',
    impact: clampScale(o.impact),
    effort: clampScale(o.effort),
    confidence: clamp01(o.confidence ?? 0.6),
    estAnnualValue: o.estAnnualValue,
    quickWin: !!o.quickWin,
    source: 'ai',
    createdAt: now(),
  }));
}

// ============================================================================
// STAGE 4 — DESIGN (future state + business case + roadmap)
// ============================================================================

export async function designFutureState(opts: {
  project: Project;
  process: Process;
  opportunities: Opportunity[];
  org?: OrgDefaults;
  signal?: AbortSignal;
}): Promise<FutureState> {
  const metrics = computeMetrics(opts.process, opts.org);
  const oppText = opts.opportunities
    .map((o) => `- [${o.driver}${o.waste ? '/' + o.waste : ''}] ${o.title}: ${o.recommendation} (impact ${o.impact}, effort ${o.effort}${o.estAnnualValue ? `, ~${Math.round(o.estAnnualValue)}` : ''})`)
    .join('\n');
  const system = `STAGE 4 — AUTOMATION-READY DESIGN. Produce a future-state design that turns the prioritised opportunities into an executable, automation-ready process — not endless documentation. Write in crisp Markdown with these sections, in order:
## Future-State Narrative
How the redesigned process flows end to end, calling out what is eliminated, simplified, automated and controlled. Reference the relevant opportunities.
## Projected Impact
A short table of before → after for: lead time, PCE, rolled %C&A, FTE/cost, automation index. Use the current metrics as the baseline and state your improvement assumptions.
## Business Case
Investment vs. annualised benefit, payback period, and the 2-3 risks. Conservative.
## Implementation Roadmap
A pragmatic sequence: quick wins (0-30 days), structural changes (1-3 months), automation build (3-6 months). Name owners by role.
Keep it tight and decision-ready. No filler.`;
  const user = `ENGAGEMENT\n${projectContext(opts.project)}\n\nCURRENT-STATE PROCESS\n${processToText(opts.process)}\n\nBASELINE METRICS\n- Lead time ${metrics.totalLeadTimeMin}m, touch ${metrics.totalProcessTimeMin}m, PCE ${(metrics.pce * 100).toFixed(1)}%, rolled %C&A ${(metrics.rolledCompleteAccurate * 100).toFixed(1)}%, automation ${metrics.automationIndex}/100${metrics.annualCost ? `, run-cost ~${Math.round(metrics.annualCost)}` : ''}\n\nPRIORITISED OPPORTUNITIES\n${oppText || '(none selected — design from first principles)'}`;
  const { text } = await callText(system, user, { maxTokens: 3000, temperature: 0.5, signal: opts.signal });
  return { narrative: text, ranAt: now() };
}

// ============================================================================
// SELF-UPSKILLING — benchmark & reference-model research
// ============================================================================

const RESEARCH_SCHEMA = {
  type: 'object',
  required: ['cards'],
  properties: {
    cards: {
      type: 'array',
      description: '4-7 knowledge cards: industry benchmarks, the standard reference process model, and best practices for this process/domain.',
      items: {
        type: 'object',
        required: ['kind', 'title', 'domain', 'body', 'tags'],
        properties: {
          kind: { type: 'string', enum: ['benchmark', 'reference-model', 'best-practice', 'risk', 'note'] },
          title: { type: 'string' },
          domain: { type: 'string', description: 'Industry/process domain this applies to.' },
          body: { type: 'string', description: 'The knowledge. For benchmarks, give typical ranges and the metric. Be concrete.' },
          tags: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
};

export async function researchBenchmarks(opts: {
  project: Project;
  processName: string;
  signal?: AbortSignal;
}): Promise<KnowledgeCard[]> {
  const system = `SELF-UPSKILLING RESEARCH. Before/while mapping a process, assemble the reference knowledge a top consultant would bring: (1) the standard reference process model for this process (the canonical stages, e.g. from APQC PCF thinking), (2) industry benchmarks with typical metric ranges (cycle time, cost-per-transaction, error rates, automation rates, FTE ratios), (3) best practices and common failure modes.
IMPORTANT: This is drawn from your training knowledge, not live data. Give realistic, defensible ranges and clearly frame benchmarks as indicative figures the team must validate against the client's actuals. Be specific to the industry and process.`;
  const user = `ENGAGEMENT\n${projectContext(opts.project)}\n\nPROCESS TO RESEARCH: ${opts.processName}\n\nProduce reference-model, benchmark, best-practice and risk cards for this process in this industry.`;
  const { result } = await callJSON<{ cards: Array<Omit<KnowledgeCard, 'id' | 'source' | 'validated' | 'createdAt'>> }>(
    system,
    user,
    RESEARCH_SCHEMA,
    { maxTokens: 2600, temperature: 0.5, signal: opts.signal },
  );
  return (result.cards ?? []).map((c) => ({
    ...c,
    id: uid(),
    projectId: opts.project.id,
    source: 'ai-research',
    validated: false,
    createdAt: now(),
  }));
}

// ============================================================================
// helpers
// ============================================================================

function clampScale(n: number): 1 | 2 | 3 | 4 | 5 {
  const v = Math.round(n);
  return (Math.max(1, Math.min(5, v)) as 1 | 2 | 3 | 4 | 5);
}
function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export { AIError };
