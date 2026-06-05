/**
 * FLUX AI orchestration — the brain.
 *
 * Each stage is a tightly-scoped call with a consultant-grade system prompt and
 * a strict JSON schema, so the model returns data that drops straight into the
 * standardized FLUX schema. The shared `FLUX_PERSONA` keeps every call speaking
 * the same Lean/VSM/TIMWOODS language → comparable output.
 */
import { getSettings, now, uid } from '../db';
import { getProvider, providerList, uploadFileToGemini } from './ai';
import type { AIMessage, Attachment, AttachmentKind } from './ai';
import { AIError } from './ai';
import { configuredProviders, getAIKey } from './aiKey';
import { computeMetrics } from '../lib/metrics';
import { readFileAsBase64 } from '../lib/files';
import type {
  AIProviderId,
  Clarification,
  ClarificationCategory,
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
  Source,
  SourceKind,
  SourceObservation,
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

/** Resolve the primary reasoning provider (map/diagnose/design). */
async function resolveAI(provider?: AIProviderId): Promise<ResolvedAI> {
  const settings = await getSettings();
  const providerId = provider ?? settings.aiProvider ?? 'anthropic';
  const p = getProvider(providerId);
  // Use the configured model only when it belongs to the chosen provider.
  const model = !provider && settings.aiModel ? settings.aiModel : p.defaultModel;
  const apiKey = await getAIKey(providerId);
  if (!apiKey) {
    throw new AIError(`No ${p.label} key set. Add one in Settings to use FLUX intelligence.`, { provider: providerId });
  }
  return { providerId, model, apiKey };
}

/**
 * Pick the optimal provider for a given attachment kind from the keys the user
 * has configured. Preference order favours the strongest reader for each type.
 */
async function resolveForAttachment(kind: AttachmentKind): Promise<ResolvedAI> {
  const available = await configuredProviders();
  const prefs: Record<AttachmentKind, AIProviderId[]> = {
    image: ['anthropic', 'gemini', 'openai'],
    document: ['anthropic', 'gemini'],
    audio: ['gemini'],
    video: ['gemini'],
  };
  for (const pid of prefs[kind]) {
    if (available.includes(pid) && getProvider(pid).supports.includes(kind)) {
      return resolveAI(pid);
    }
  }
  const need = providerList.filter((p) => p.supports.includes(kind)).map((p) => p.label).join(' or ');
  throw new AIError(`To ingest ${kind} files, add a ${need} key in Settings.`, { provider: 'gemini' });
}

async function callJSON<T>(
  system: string,
  user: string,
  jsonSchema: object,
  opts: { maxTokens?: number; temperature?: number; signal?: AbortSignal; resolved?: ResolvedAI; attachments?: Attachment[] } = {},
): Promise<{ result: T; provider: AIProviderId; model: string }> {
  const { providerId, model, apiKey } = opts.resolved ?? (await resolveAI());
  const provider = getProvider(providerId);
  const messages: AIMessage[] = [{ role: 'user', content: user }];
  const r = await provider.complete(
    {
      system: `${FLUX_PERSONA}\n\n${system}`,
      messages,
      attachments: opts.attachments,
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

/** Turn raw AI steps into domain steps with stable ids + 1-based order. */
export function rawToSteps(raw: Array<Omit<ProcessStep, 'id' | 'order'>>): ProcessStep[] {
  return (raw ?? []).map((s, i) => ({
    ...s,
    id: uid(),
    order: i + 1,
    automation: s.automation ?? 'none',
    valueClass: s.valueClass ?? 'BVA',
    type: s.type ?? 'task',
    actor: s.actor ?? '',
  }));
}

/** Assemble a Process domain object from an AI map result. */
export function buildProcess(projectId: string, map: MapResult, schemaVersion: number): Process {
  const steps = rawToSteps(map.steps ?? []);
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
          valueBasis: { type: 'string', description: 'REQUIRED when estAnnualValue is set: show your working as a short calculation with explicit assumptions, e.g. "~6 min rework removed × 24,000 invoices/yr ÷ 60 × £35/hr ≈ £84k". State the driver (time saved / error rate / FTE / penalty avoided), the volume and the rate.' },
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
  valueBasis?: string;
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
- Whenever you give an estAnnualValue, you MUST fill valueBasis with the explicit calculation and assumptions (driver × volume × rate). Use the engagement's volume and loaded hourly cost where given. No unexplained numbers.
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
    valueBasis: o.valueBasis,
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
// INGESTION — multimodal source processing
// ============================================================================

const OBSERVATION_PROPS = {
  steps: { type: 'array', items: { type: 'string' }, description: 'Process steps/activities observed, in order if discernible.' },
  actors: { type: 'array', items: { type: 'string' }, description: 'Roles/people/teams involved.' },
  systems: { type: 'array', items: { type: 'string' }, description: 'Systems, tools or documents used.' },
  pains: { type: 'array', items: { type: 'string' }, description: 'Pain points, frustrations, rework, delays mentioned.' },
  timings: { type: 'array', items: { type: 'string' }, description: 'Any durations, frequencies, volumes or wait times stated.' },
  metrics: { type: 'array', items: { type: 'string' }, description: 'Any numbers/KPIs/costs mentioned.' },
};

const INGEST_SCHEMA = {
  type: 'object',
  required: ['extraction', 'summary', 'observations'],
  properties: {
    extraction: { type: 'string', description: 'A thorough, well-structured DIGEST of the process-relevant content — what happens step by step, who does it, in which systems, with any timings, volumes, costs and pain points mentioned. Paraphrase freely; a verbatim transcript is NOT required and should be avoided for long recordings. Aim for completeness of process detail, not length.' },
    summary: { type: 'string', description: 'One or two sentences on what this source tells us about the process.' },
    observations: { type: 'object', properties: OBSERVATION_PROPS },
  },
};

/** Generous output budget — long recordings need room for a full digest. */
const INGEST_MAX_TOKENS = 8192;

const ATTACH_KIND: Record<SourceKind, AttachmentKind | null> = {
  text: null,
  eventlog: null,
  document: 'document',
  image: 'image',
  audio: 'audio',
  video: 'video',
};

export interface IngestResult {
  extraction: string;
  summary: string;
  observations: SourceObservation;
  providerUsed: string;
}

export async function ingestSource(opts: {
  project: Project;
  kind: SourceKind;
  name: string;
  mime?: string;
  /** Raw file/blob for binary sources (document/image/audio/video). Streamed; never fully base64'd unless inlined. */
  file?: Blob;
  /** Raw text for text/eventlog/pasted sources. */
  text?: string;
  signal?: AbortSignal;
}): Promise<IngestResult> {
  const attachKind = ATTACH_KIND[opts.kind];
  const guidance =
    opts.kind === 'audio' || opts.kind === 'video'
      ? 'Watch/listen to the WHOLE recording and produce detailed, structured notes on the process discussed (you do NOT need a verbatim transcript — capture the process content, decisions, systems, roles, timings and pain points).'
      : opts.kind === 'eventlog'
        ? 'This is a system/event-log export. Infer the real end-to-end flow, case variants, rework loops and bottlenecks from the data.'
        : opts.kind === 'document' || opts.kind === 'image'
          ? 'Read the document/image carefully and extract everything relevant to how the process works.'
          : 'Extract everything relevant to how the process works.';
  const system = `SOURCE INGESTION. You are processing one raw source for a process-mapping engagement. ${guidance}
Be faithful — do not invent. Capture exactly what the source says (and flag where it is unclear). Use the FLUX vocabulary (steps, actors, systems, pains, timings).`;
  const baseUser = `ENGAGEMENT\n${projectContext(opts.project)}\n\nSOURCE: ${opts.name} (${opts.kind})`;

  if (attachKind && opts.file) {
    const resolved = await resolveForAttachment(attachKind);
    const mime = opts.mime || opts.file.type || 'application/octet-stream';
    const bytes = opts.file.size;
    let attachment: Attachment;
    if (resolved.providerId === 'gemini' && bytes > GEMINI_INLINE_LIMIT) {
      // Large media → resumable Files API (streamed), then reference by URI.
      const up = await uploadFileToGemini({ apiKey: resolved.apiKey, blob: opts.file, mime, name: opts.name, signal: opts.signal });
      attachment = { kind: attachKind, mime: up.mimeType, fileUri: up.fileUri, name: opts.name };
    } else if (resolved.providerId !== 'gemini' && bytes > NON_GEMINI_INLINE_LIMIT) {
      throw new AIError(
        `${opts.name} is ~${Math.round(bytes / 1024 / 1024)}MB — over ${getProvider(resolved.providerId).label}'s inline limit. Add a Google Gemini key in Settings to ingest large ${attachKind} files.`,
        { provider: resolved.providerId },
      );
    } else {
      // Small enough to inline — read base64 only now.
      const dataB64 = await readFileAsBase64(opts.file);
      attachment = { kind: attachKind, mime, dataB64, name: opts.name };
    }
    const { result, model, provider } = await callJSON<IngestResult>(system, `${baseUser}\n\n(The file is attached.)`, INGEST_SCHEMA, {
      resolved,
      attachments: [attachment],
      maxTokens: INGEST_MAX_TOKENS,
      temperature: 0.2,
      signal: opts.signal,
    });
    return { ...result, providerUsed: `${provider}/${model}` };
  }

  // Text / event-log: send the content inline.
  const { result, model, provider } = await callJSON<IngestResult>(
    system,
    `${baseUser}\n\nCONTENT:\n${opts.text ?? ''}`,
    INGEST_SCHEMA,
    { maxTokens: INGEST_MAX_TOKENS, temperature: 0.2, signal: opts.signal },
  );
  return { ...result, providerUsed: `${provider}/${model}` };
}

// ============================================================================
// SYNTHESIS — sources → standardized map + clarifications
// ============================================================================

const CLARIFICATION_PROPS = {
  question: { type: 'string', description: 'The specific question or gap to resolve with the client.' },
  category: { type: 'string', enum: ['gap', 'assumption', 'conflict', 'suggestion'], description: 'gap = missing info; assumption = something inferred; conflict = sources disagree; suggestion = recommended extra input.' },
  rationale: { type: 'string', description: 'Why it matters / what it would change in the map or numbers.' },
  severity: { type: 'integer', description: '1-5 how much this affects the result.' },
};

const SYNTH_SCHEMA = {
  type: 'object',
  required: ['name', 'sipoc', 'steps', 'clarifications'],
  properties: {
    name: { type: 'string' },
    trigger: { type: 'string' },
    owner: { type: 'string' },
    annualVolume: { type: 'number' },
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
      description: 'Ordered current-state steps synthesised from ALL sources. Make handoffs, waits and controls explicit.',
      items: { type: 'object', required: ['name', 'type', 'actor', 'valueClass', 'automation'], properties: STEP_PROPS },
    },
    clarifications: {
      type: 'array',
      description: '4-10 open questions, gaps, assumptions and conflicts that, once resolved, would tighten the map and numbers. Be specific.',
      items: { type: 'object', required: ['question', 'category'], properties: CLARIFICATION_PROPS },
    },
  },
};

interface RawClarification {
  question: string;
  category: ClarificationCategory;
  rationale?: string;
  severity?: number;
}

function sourcesToText(sources: Source[]): string {
  const ready = sources.filter((s) => s.status === 'ready');
  if (!ready.length) return '(no processed sources)';
  return ready
    .map((s, i) => {
      const obs = s.observations
        ? `\n  observed — steps: ${(s.observations.steps ?? []).join('; ') || '—'}; actors: ${(s.observations.actors ?? []).join(', ') || '—'}; systems: ${(s.observations.systems ?? []).join(', ') || '—'}; pains: ${(s.observations.pains ?? []).join('; ') || '—'}; timings: ${(s.observations.timings ?? []).join('; ') || '—'}`
        : '';
      return `SOURCE ${i + 1} [${s.kind}] "${s.name}"${obs}\n  extract: ${(s.extraction ?? '').slice(0, 4000)}`;
    })
    .join('\n\n');
}

export async function synthesizeProcess(opts: {
  project: Project;
  sources: Source[];
  extraNotes?: string;
  knowledge?: KnowledgeCard[];
  signal?: AbortSignal;
}): Promise<{ map: MapResult; clarifications: Clarification[] }> {
  const system = `STAGE 2 — CURRENT-STATE MAPPING (multi-source synthesis). Synthesise ALL the ingested sources into ONE standardized FLUX current-state map. Map how work ACTUALLY flows, reconciling what different sources say. Rules:
- Make handoffs, waits and controls into their own explicit steps.
- Classify every step VA/BVA/NVA honestly; estimate process/wait/%C&A realistically.
- Where you infer or estimate, raise it as a clarification (category 'assumption').
- Where sources disagree, raise a 'conflict'. Where key data is missing, raise a 'gap'.
- Suggest additional inputs that would sharpen the map as 'suggestion'.`;
  const user = `ENGAGEMENT\n${projectContext(opts.project)}\n\nINGESTED SOURCES\n${sourcesToText(opts.sources)}${opts.extraNotes ? `\n\nANALYST NOTES\n${opts.extraNotes}` : ''}${knowledgeContext(opts.knowledge ?? [])}`;
  const { result } = await callJSON<MapResult & { clarifications: RawClarification[] }>(system, user, SYNTH_SCHEMA, {
    maxTokens: 4000,
    temperature: 0.3,
    signal: opts.signal,
  });
  return { map: result, clarifications: rawToClarifications(result.clarifications ?? []) };
}

// ============================================================================
// REFINE — answered clarifications → revised map
// ============================================================================

const REFINE_SCHEMA = {
  type: 'object',
  required: ['steps', 'clarifications', 'changeSummary'],
  properties: {
    changeSummary: { type: 'string', description: 'One short paragraph on what changed and why.' },
    steps: {
      type: 'array',
      description: 'The FULL revised ordered step list (not a diff).',
      items: { type: 'object', required: ['name', 'type', 'actor', 'valueClass', 'automation'], properties: STEP_PROPS },
    },
    clarifications: {
      type: 'array',
      description: 'Remaining open clarifications after applying the answers, plus any NEW ones the answers surfaced.',
      items: { type: 'object', required: ['question', 'category'], properties: CLARIFICATION_PROPS },
    },
  },
};

export async function refineProcess(opts: {
  project: Project;
  process: Process;
  answers: { question: string; answer: string }[];
  signal?: AbortSignal;
}): Promise<{ steps: ProcessStep[]; clarifications: Clarification[]; changeSummary: string }> {
  const system = `REFINEMENT. The analyst has answered some open clarifications. Revise the current-state map to incorporate the answers. Return the FULL revised step list, the remaining open clarifications (drop the resolved ones; add any new ones the answers reveal), and a short change summary. Keep step ids implicit (re-output all steps).`;
  const qa = opts.answers.map((a) => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n');
  const user = `ENGAGEMENT\n${projectContext(opts.project)}\n\nCURRENT MAP\n${processToText(opts.process)}\n\nANSWERED CLARIFICATIONS\n${qa}`;
  const { result } = await callJSON<{ steps: Array<Omit<ProcessStep, 'id' | 'order'>>; clarifications: RawClarification[]; changeSummary: string }>(
    system,
    user,
    REFINE_SCHEMA,
    { maxTokens: 4000, temperature: 0.3, signal: opts.signal },
  );
  return {
    steps: rawToSteps(result.steps ?? opts.process.steps),
    clarifications: rawToClarifications(result.clarifications ?? []),
    changeSummary: result.changeSummary ?? '',
  };
}

// ============================================================================
// TIDY — consolidate roles / clean the map (no fabrication)
// ============================================================================

const TIDY_SCHEMA = {
  type: 'object',
  required: ['steps', 'changeSummary'],
  properties: {
    changeSummary: { type: 'string', description: 'Short paragraph on what you consolidated/cleaned — especially which roles you merged.' },
    steps: {
      type: 'array',
      description: 'The FULL cleaned step list, in order.',
      items: { type: 'object', required: ['name', 'type', 'actor', 'valueClass', 'automation'], properties: STEP_PROPS },
    },
  },
};

export async function tidyProcess(opts: {
  project: Project;
  process: Process;
  instructions?: string;
  signal?: AbortSignal;
}): Promise<{ steps: ProcessStep[]; changeSummary: string }> {
  const system = `MAP TIDY-UP. Clean, correct and consolidate this current-state map. You may edit ANY element of the map:
- CONSOLIDATE near-duplicate actors/swimlanes into a single canonical role where they clearly refer to the same person/team (e.g. "Invoice Processor", "Invoice Processing Team", "Designated Member" → one role) — unless genuinely distinct.
- Standardise naming of roles and systems (consistent terms/casing).
- Fix ordering, duplication, mislabelled step types or value classes, and merge/split steps where the flow is clearly wrong.
- Correct TIMINGS and their UNITS when the analyst says they're off — e.g. if values are really seconds rather than minutes, rescale every step's touch/wait time accordingly (FLUX stores time in MINUTES, so 30 seconds = 0.5). Apply such rescaling consistently across all steps.
- Do NOT invent brand-new activity the map doesn't support — but DO fully apply the analyst's corrections below.
Re-output ALL steps in order.${opts.instructions ? '' : ' If no guidance is given, focus on role consolidation and naming/labelling clean-up only (leave timings as they are).'}`;
  const user = `ENGAGEMENT\n${projectContext(opts.project)}\n\nCURRENT MAP\n${processToText(opts.process)}${opts.instructions ? `\n\nANALYST GUIDANCE\n${opts.instructions}` : ''}`;
  const { result } = await callJSON<{ steps: Array<Omit<ProcessStep, 'id' | 'order'>>; changeSummary: string }>(
    system,
    user,
    TIDY_SCHEMA,
    { maxTokens: 4000, temperature: 0.2, signal: opts.signal },
  );
  return { steps: rawToSteps(result.steps ?? opts.process.steps), changeSummary: result.changeSummary ?? '' };
}

function rawToClarifications(raw: RawClarification[]): Clarification[] {
  return (raw ?? []).map((c) => ({
    id: uid(),
    question: c.question,
    category: c.category ?? 'gap',
    rationale: c.rationale,
    severity: c.severity,
    status: 'open' as const,
    createdAt: now(),
  }));
}

// ============================================================================
// helpers
// ============================================================================

/** Above this, Gemini media goes via the resumable Files API instead of inline. */
const GEMINI_INLINE_LIMIT = 15 * 1024 * 1024;
/** Hard inline ceiling for providers without a Files API (Claude/OpenAI). */
const NON_GEMINI_INLINE_LIMIT = 18 * 1024 * 1024;

function clampScale(n: number): 1 | 2 | 3 | 4 | 5 {
  const v = Math.round(n);
  return (Math.max(1, Math.min(5, v)) as 1 | 2 | 3 | 4 | 5);
}
function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export { AIError };
