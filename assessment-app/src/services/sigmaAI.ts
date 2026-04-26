/**
 * High-level orchestration for Sigma's four hero AI features.
 *
 * Each function:
 *   1. Checks license (canUseAI)
 *   2. Resolves provider + model + key
 *   3. Calls the provider's `complete` method with a tightly-scoped system prompt
 *   4. Increments usage on success (managed tier)
 *
 * All four features fail gracefully when offline or AI is locked: callers see
 * an AIError with a friendly `.message` and surface it next to the trigger.
 */
import { getSettings } from '../db';
import { getProvider } from './ai';
import type { AIMessage } from './ai';
import { AIError } from './ai';
import { getAIKey } from './aiKey';
import { bumpUsage, canUseAI } from './license';
import type { AIProviderId, Mark, Person, Session, SessionCriterion, Vertical } from '../types';

interface ResolvedAI {
  providerId: AIProviderId;
  model: string;
  apiKey: string;
}

async function resolveAI(opts?: { promptForPassphrase?: () => Promise<string> }): Promise<ResolvedAI> {
  const gate = await canUseAI();
  if (!gate.ok) throw new AIError(gate.reason ?? 'AI is unavailable.');
  const settings = await getSettings();
  const providerId = settings.aiProvider ?? 'anthropic';
  const provider = getProvider(providerId);
  const model = settings.aiModel ?? provider.defaultModel;
  // BYOK uses the user's stored key. Managed tier would route through QT proxy
  // with a session token; the proxy is a v2 thing so for now we fall through
  // to BYOK behaviour and require a key.
  const apiKey = await getAIKey(opts?.promptForPassphrase);
  if (!apiKey) throw new AIError('No AI provider key set. Add one in Settings.');
  return { providerId, model, apiKey };
}

async function callAI<T>(
  system: string,
  messages: AIMessage[],
  opts: { jsonSchema?: object; maxTokens?: number; temperature?: number; signal?: AbortSignal },
): Promise<{ result: T; raw: string; provider: AIProviderId; model: string }> {
  const { providerId, model, apiKey } = await resolveAI();
  const provider = getProvider(providerId);
  const r = await provider.complete(
    {
      system,
      messages,
      jsonSchema: opts.jsonSchema,
      maxTokens: opts.maxTokens,
      temperature: opts.temperature,
      signal: opts.signal,
    },
    { apiKey, model },
  );
  await bumpUsage();
  return {
    result: (opts.jsonSchema ? r.json : r.text) as T,
    raw: r.text,
    provider: providerId,
    model,
  };
}

// ============================================================================
// HERO FEATURE 1 — Rubric Generator
// One-line domain prompt → criteria + scale, ready to save as a Template.
// ============================================================================

export interface GeneratedRubric {
  name: string;
  description: string;
  scale: { min: number; max: number; step: number; labels: string[] };
  criteria: { name: string; description: string }[];
  tags: string[];
}

const RUBRIC_SCHEMA = {
  type: 'object',
  required: ['name', 'description', 'scale', 'criteria', 'tags'],
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    scale: {
      type: 'object',
      required: ['min', 'max', 'step', 'labels'],
      properties: {
        min: { type: 'integer' },
        max: { type: 'integer' },
        step: { type: 'integer' },
        labels: { type: 'array', items: { type: 'string' } },
      },
    },
    criteria: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'description'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
        },
      },
    },
    tags: { type: 'array', items: { type: 'string' } },
  },
};

export async function generateRubric(
  brief: string,
  vertical: Vertical | undefined,
): Promise<GeneratedRubric> {
  const verticalHint = vertical ? `\nDomain: ${verticalLabel(vertical)}.` : '';
  const system = `You are a senior practitioner in the user's domain. The user is about to assess people in the field with a clipboard app. Design a tight, useful rubric that they can use straight away.

Rules:
- 4 to 7 criteria. Bias to fewer. Each criterion is observable in 30 seconds.
- Criterion names are 1-3 words, plain English, action-oriented.
- Each description is one sentence describing what "good" looks like in the field.
- The scale is integer 1-5 unless the domain demands otherwise (e.g. yes/no/NO triple = 1-3).
- Scale labels are concrete behaviours, not "Bad/Good" abstractions.
- Tags include the domain plus 2-3 specifics.

Return ONLY the structured rubric.${verticalHint}`;
  const { result } = await callAI<GeneratedRubric>(
    system,
    [{ role: 'user', content: `Brief: ${brief}` }],
    { jsonSchema: RUBRIC_SCHEMA, maxTokens: 1200, temperature: 0.5 },
  );
  if (!result || !Array.isArray(result.criteria)) {
    throw new AIError('The AI returned an unexpected shape. Try rephrasing the brief.');
  }
  return result;
}

// ============================================================================
// HERO FEATURE 2 — Report Drafter
// Session results → a polished markdown narrative.
// ============================================================================

export async function draftReport(opts: {
  session: Session;
  group: { name: string; vertical?: Vertical };
  people: Person[];
  marks: Mark[];
  audience: 'parent' | 'manager' | 'trainee' | 'client' | 'self';
}): Promise<{ markdown: string; provider: AIProviderId; model: string }> {
  const { session, group, people, marks, audience } = opts;
  const peopleById = new Map(people.map((p) => [p.id, p]));
  const criteriaById = new Map(session.criteria.map((c) => [c.id, c]));

  const summary = summariseMarks(session.criteria, people, marks);
  const audienceVoice: Record<typeof audience, string> = {
    parent: 'a parent at a parents\' evening — warm, specific, direct, no jargon',
    manager: 'a senior manager reviewing the result — concise, factual, decision-oriented',
    trainee: 'the person being assessed — supportive but honest, with concrete next steps',
    client: 'an external client receiving the report — professional, careful, with evidence',
    self: 'the marker themselves writing notes — terse, observational, no fluff',
  };

  const system = `You are drafting an assessment report from raw marks recorded in the field.

Write for: ${audienceVoice[audience]}.
Domain: ${group.vertical ? verticalLabel(group.vertical) : 'general'}.

Constraints:
- Markdown.
- Headline summary first (1-2 sentences). Then per-criterion paragraph. Then a "Notable" section if any individual stood out.
- Use real names from the data, not placeholders.
- No invented evidence. If something is unclear, say "unclear from data".
- Under 350 words.`;

  const userMsg = `Session: ${session.title}
Date: ${new Date(session.date).toISOString().slice(0, 10)}
Group: ${group.name}
Scale: ${session.scale.min}-${session.scale.max}${session.scale.labels?.length ? ' (' + session.scale.labels.join(' / ') + ')' : ''}
Notes: ${session.notes ?? '(none)'}

Criteria + averages:
${summary.criteriaSummary}

Per-person averages (top 5 high, bottom 5 low):
${summary.personSummary}

Comments captured:
${marks.filter((m) => m.comment).map((m) => `- ${peopleById.get(m.personId)?.name ?? '?'} on ${criteriaById.get(m.criterionId)?.name ?? '?'}: ${m.comment}`).join('\n') || '(none)'}`;

  const { raw, provider, model } = await callAI<string>(
    system,
    [{ role: 'user', content: userMsg }],
    { maxTokens: 1200, temperature: 0.5 },
  );
  return { markdown: raw, provider, model };
}

// ============================================================================
// HERO FEATURE 3 — Calibration Coach (in-flow, during marking)
// Looks at the marks-so-far and surfaces calibration risks.
// ============================================================================

export interface CalibrationNote {
  kind: 'inflation' | 'compression' | 'inconsistency' | 'missing-evidence' | 'pattern';
  message: string;
  /** Optional person/criterion id to scroll to. */
  personId?: string;
  criterionId?: string;
}

const CALIBRATION_SCHEMA = {
  type: 'object',
  required: ['notes'],
  properties: {
    notes: {
      type: 'array',
      items: {
        type: 'object',
        required: ['kind', 'message'],
        properties: {
          kind: { type: 'string', enum: ['inflation', 'compression', 'inconsistency', 'missing-evidence', 'pattern'] },
          message: { type: 'string' },
          personId: { type: 'string' },
          criterionId: { type: 'string' },
        },
      },
    },
  },
};

export async function calibrationCoach(opts: {
  session: Session;
  people: Person[];
  marks: Mark[];
  vertical?: Vertical;
}): Promise<CalibrationNote[]> {
  const { session, people, marks, vertical } = opts;
  if (marks.length < 6) return [];
  const summary = summariseMarks(session.criteria, people, marks);
  const system = `You are a quiet calibration coach for someone marking people on a clipboard. You help them notice unintentional bias in their marking — not lecture them.

Output up to 3 short notes. Each note is one of:
- inflation: scores skewing high across the board
- compression: too many people clumped at one mark
- inconsistency: a person ranked very differently across similar criteria
- missing-evidence: a high or low mark without a comment that justifies it
- pattern: a notable pattern that the marker would want to know about

Tone: a peer's quiet sidebar. Maximum one sentence per note. Never patronising.

Domain: ${vertical ? verticalLabel(vertical) : 'general'}.`;

  const userMsg = `Scale ${session.scale.min}-${session.scale.max}.
Criteria + distribution:
${summary.criteriaSummary}

Per-person summary:
${summary.personSummary}

Comment coverage: ${summary.markedWithComment} of ${marks.length} marks have a comment.`;

  try {
    const { result } = await callAI<{ notes: CalibrationNote[] }>(
      system,
      [{ role: 'user', content: userMsg }],
      { jsonSchema: CALIBRATION_SCHEMA, maxTokens: 600, temperature: 0.3 },
    );
    return result?.notes ?? [];
  } catch (err) {
    if (err instanceof AIError) throw err;
    throw new AIError('Could not run calibration coach.');
  }
}

// ============================================================================
// HERO FEATURE 4 — Insight Surfacer (Reports page)
// Group-level patterns across sessions over time.
// ============================================================================

export interface InsightBullet {
  headline: string;
  detail: string;
  kind: 'trend' | 'risk' | 'strength' | 'cohort';
}

const INSIGHT_SCHEMA = {
  type: 'object',
  required: ['bullets'],
  properties: {
    bullets: {
      type: 'array',
      items: {
        type: 'object',
        required: ['headline', 'detail', 'kind'],
        properties: {
          headline: { type: 'string' },
          detail: { type: 'string' },
          kind: { type: 'string', enum: ['trend', 'risk', 'strength', 'cohort'] },
        },
      },
    },
  },
};

export async function generateInsights(opts: {
  groupName: string;
  vertical?: Vertical;
  sessions: { title: string; date: number; criteria: SessionCriterion[]; scale: { min: number; max: number } }[];
  rolledUpAverages: { criterion: string; avg: number; count: number; trend: number[] }[];
}): Promise<InsightBullet[]> {
  const { groupName, vertical, sessions, rolledUpAverages } = opts;
  const system = `You are surfacing patterns from rolled-up assessment data for a group.

Output 3-5 short, sharp bullets. Each is one of: trend (improving / declining), risk (something to watch), strength (genuine high), cohort (cross-person pattern).

Tone: domain practitioner reviewing data with the marker. Avoid vague phrases like "consider focusing on". Be concrete.

Domain: ${vertical ? verticalLabel(vertical) : 'general'}.`;

  const userMsg = `Group: ${groupName}
Sessions on file: ${sessions.length}
Date range: ${sessions[0]?.date ? new Date(sessions[0].date).toISOString().slice(0, 10) : ''} → ${sessions[sessions.length - 1]?.date ? new Date(sessions[sessions.length - 1].date).toISOString().slice(0, 10) : ''}

Criterion roll-up (avg, count, trend over recent sessions):
${rolledUpAverages.map((r) => `- ${r.criterion}: avg ${r.avg.toFixed(2)} over ${r.count} marks. Trend: ${r.trend.map((t) => t.toFixed(1)).join(' → ')}`).join('\n')}`;

  const { result } = await callAI<{ bullets: InsightBullet[] }>(
    system,
    [{ role: 'user', content: userMsg }],
    { jsonSchema: INSIGHT_SCHEMA, maxTokens: 800, temperature: 0.4 },
  );
  return result?.bullets ?? [];
}

// ============================================================================
// Helpers
// ============================================================================

function summariseMarks(
  criteria: SessionCriterion[],
  people: Person[],
  marks: Mark[],
): { criteriaSummary: string; personSummary: string; markedWithComment: number } {
  const peopleById = new Map(people.map((p) => [p.id, p]));
  const byCriterion = new Map<string, number[]>();
  const byPerson = new Map<string, number[]>();
  let markedWithComment = 0;
  for (const m of marks) {
    if (m.comment && m.comment.trim().length > 0) markedWithComment++;
    if (!byCriterion.has(m.criterionId)) byCriterion.set(m.criterionId, []);
    byCriterion.get(m.criterionId)!.push(m.value);
    if (!byPerson.has(m.personId)) byPerson.set(m.personId, []);
    byPerson.get(m.personId)!.push(m.value);
  }
  const criteriaSummary = criteria
    .map((c) => {
      const vals = byCriterion.get(c.id) ?? [];
      const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      return `- ${c.name}: avg ${avg.toFixed(2)} from ${vals.length} marks`;
    })
    .join('\n');

  const personEntries = Array.from(byPerson.entries()).map(([pid, vals]) => ({
    name: peopleById.get(pid)?.name ?? '(unknown)',
    avg: vals.reduce((a, b) => a + b, 0) / vals.length,
    n: vals.length,
  }));
  personEntries.sort((a, b) => b.avg - a.avg);
  const top = personEntries.slice(0, 5);
  const bottom = personEntries.slice(-5).reverse();
  const personSummary = [
    'Top 5: ' + top.map((p) => `${p.name} ${p.avg.toFixed(2)}`).join(', '),
    'Bottom 5: ' + bottom.map((p) => `${p.name} ${p.avg.toFixed(2)}`).join(', '),
  ].join('\n');

  return { criteriaSummary, personSummary, markedWithComment };
}

export function verticalLabel(v: Vertical): string {
  switch (v) {
    case 'school': return 'school / classroom assessment';
    case 'tuition': return '1:1 tutoring';
    case 'sport': return 'sport coaching';
    case 'health': return 'clinical / health observation';
    case 'construction': return 'construction site / safety inspection';
    case 'field': return 'field service / retail visit';
    case 'corporate': return 'corporate L&D / competency';
    case 'other': return 'general assessment';
  }
}
