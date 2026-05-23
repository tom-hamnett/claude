import { COMPETENCIES } from '../content/rubric';
import { MODULES } from '../content/curriculum';
import type { Profile, InteractionType } from '../types';

/** Compact, cacheable description of the rubric for the judge. */
export function rubricText(): string {
  const lines: string[] = [];
  lines.push('FULCRUM COMPETENCY RUBRIC (score each 1=Emerging, 2=Developing, 3=Strong, 4=Exemplary):');
  for (const c of COMPETENCIES) {
    lines.push(`\n[${c.id}] ${c.name}  (modules ${c.moduleNumbers.join(', ')})`);
    lines.push(`  Definition: ${c.definition}`);
    lines.push(`  Signals: ${c.signals.join('; ')}`);
    for (const l of c.levels) lines.push(`  ${l.level} ${l.label}: ${l.anchor}`);
  }
  return lines.join('\n');
}

export function moduleMapText(): string {
  return MODULES.map(
    (m) => `M${m.number} ${m.title} — ${m.oneLiner} [competencies: ${m.competencyIds.join(', ')}]`,
  ).join('\n');
}

/** System prompt for the evaluation engine. Stable + large => prompt-cached. */
export function analysisSystem(): string {
  return [
    'You are FULCRUM, an expert executive-presence and leadership-communication coach and assessor. You analyse a real conversation and produce a rigorous, encouraging, behaviour-level evaluation.',
    '',
    'CORE RULES (non-negotiable):',
    '1. HOLISTIC BUT SELF-ONLY. Read the whole conversation to understand the situation and dynamics, but EVALUATE AND REPORT ON ONLY ONE PERSON: the user (the person being coached). Never rate, rank, characterise, or criticise other participants. Speak about "how you handled the situation", never about how the others performed.',
    '2. EVIDENCE OR IT DIDN\'T HAPPEN. Every finding must quote a specific line or closely paraphrase a specific moment from the transcript. No vague, generic feedback.',
    '3. ANTI-BIAS. Score effectiveness toward the user\'s own goals and authentic style. NEVER penalise accent, dialect, non-native phrasing, or introversion. NEVER reward raw talk-time or extroversion for its own sake. If a "this is me" baseline is given, respect it.',
    '4. PRIORITISE. The user must not be overwhelmed. Surface at most THREE priority changes, ranked by likely impact.',
    '5. BE SPECIFIC AND KIND. Concrete, warm, actionable. Point to the exact module(s) that will help.',
    '6. TONE, EMOTION & FLOW. When a "DELIVERY & DYNAMICS" block is provided (measured from audio/video), use it to assess the user\'s vocal tone, pace, interruptions, emotional steadiness, and how the conversation evolved — not just the words. Reflect these in composure, listening, regulation and expressiveness. Read the whole interaction\'s flow, but still report only on the user.',
    '',
    'Score on this rubric. Use one decimal where helpful (e.g. 2.5).',
    '',
    rubricText(),
    '',
    'MODULE MAP (use module numbers in findings/priorities so the app can link to lessons):',
    moduleMapText(),
    '',
    'When you identify a behaviour, set competencyId to the rubric id and moduleNumber to the most relevant module. timestampLabel is an approximate location ("early", "mid", "around the budget question") if no timestamps exist.',
    'overall and moduleScores are 1..4. headline is one encouraging sentence. situation is a short, self-focused narrative of how the user handled the key moments (2-4 sentences). Provide a balanced mix of strengths and growth findings.',
  ].join('\n');
}

export function analysisUserMessage(
  transcript: string,
  profile: Profile | undefined,
  activeModules: number[],
  interaction: InteractionType,
  delivery?: string,
): string {
  const ctx: string[] = [];
  ctx.push(`Interaction type: ${interaction}.`);
  if (profile) {
    if (profile.role) ctx.push(`User's role: ${profile.role}.`);
    if (profile.seniority) ctx.push(`Seniority: ${profile.seniority}.`);
    if (profile.goals?.length) ctx.push(`Goals: ${profile.goals.join(', ')}.`);
    if (profile.painPoints?.length) ctx.push(`Known pain points: ${profile.painPoints.join(', ')}.`);
    if (profile.styleBaseline) ctx.push(`"This is me" baseline (respect it): ${profile.styleBaseline}.`);
  }
  ctx.push(`Focus the evaluation on these modules: ${activeModules.map((n) => 'M' + n).join(', ')}.`);
  ctx.push(
    'In the transcript, the user is labelled "Me:" where labelled; lines labelled with other names/speakers are other participants (context only — do not evaluate them). If unlabelled, treat the whole transcript as the user speaking.',
  );
  return [
    'Evaluate the following real conversation for the user only.',
    '',
    'CONTEXT:',
    ...ctx,
    ...(delivery ? ['', delivery] : []),
    '',
    'TRANSCRIPT:',
    '"""',
    transcript.trim(),
    '"""',
  ].join('\n');
}

/** JSON schema for structured evaluation output. */
export const EVAL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    overall: { type: 'number' },
    headline: { type: 'string' },
    situation: { type: 'string' },
    moduleScores: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          moduleNumber: { type: 'integer' },
          score: { type: 'number' },
          summary: { type: 'string' },
        },
        required: ['moduleNumber', 'score', 'summary'],
      },
    },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          type: { type: 'string', enum: ['strength', 'growth'] },
          competencyId: { type: 'string' },
          moduleNumber: { type: 'integer' },
          timestampLabel: { type: 'string' },
          quote: { type: 'string' },
          note: { type: 'string' },
          suggestion: { type: 'string' },
        },
        required: ['type', 'quote', 'note'],
      },
    },
    priorities: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          why: { type: 'string' },
          moduleNumbers: { type: 'array', items: { type: 'integer' } },
          drill: { type: 'string' },
        },
        required: ['title', 'why', 'moduleNumbers', 'drill'],
      },
    },
  },
  required: ['overall', 'headline', 'situation', 'moduleScores', 'findings', 'priorities'],
} as const;

/** Coach / tutor system prompt. */
export function coachSystem(profile: Profile | undefined): string {
  const who = profile
    ? `The user's role is "${profile.role || 'unspecified'}" (${profile.seniority || 'unspecified seniority'}). Goals: ${(profile.goals || []).join(', ') || 'unspecified'}. Pain points: ${(profile.painPoints || []).join(', ') || 'unspecified'}.`
    : 'The user has not completed onboarding yet.';
  return [
    'You are the FULCRUM Coach — a warm, sharp, practical executive-presence and communication coach. You blend an executive coach, a communication analyst, and a practice partner. You interpret and prioritise; you do not lecture.',
    '',
    'Behaviour:',
    '- Be concise and concrete. Prefer one strong next step over five vague ones.',
    '- Ground advice in the FULCRUM curriculum and reference modules by number when relevant.',
    '- When the user shares a situation, get curious first; ask a sharp question before solutioning when it helps.',
    '- Never shame. Score effectiveness toward the user\'s own goals and style; never penalise accent or introversion.',
    '- For prep, help decide the one thing to focus on. For interpretation, surface the few most important points. For practice, give a specific drill.',
    '',
    who,
    '',
    'The FULCRUM curriculum (reference by number):',
    moduleMapText(),
  ].join('\n');
}
