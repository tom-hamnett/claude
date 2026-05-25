import type { EvaluationResult, Finding, Profile, InteractionType, ModuleScore, Priority } from '../types';
import { COMPETENCIES, competencyById } from '../content/rubric';
import { moduleByNumber } from '../content/curriculum';
import { runAnalysis, buildAnalysisPayload, extractText, stripFences } from './ai';
import { managedAnthropic } from './managed';
import { getSettings } from '../db';

export interface AnalyzeRequest {
  transcript: string;
  profile?: Profile;
  activeModules: number[];
  interaction: InteractionType;
  deliveryContext?: string;
}

export async function analyze(req: AnalyzeRequest): Promise<{ result: EvaluationResult; demo: boolean }> {
  const settings = await getSettings();
  if ((settings.aiMode === 'managed' && settings.vantageKey?.trim()) || settings.aiMode === 'local') {
    const payload = buildAnalysisPayload({
      apiKey: '', model: settings.model, effort: settings.effort,
      transcript: req.transcript, profile: req.profile, activeModules: req.activeModules,
      interaction: req.interaction, deliveryContext: req.deliveryContext,
    });
    const res = await managedAnthropic(payload, settings.vantageKey || 'local');
    return { result: JSON.parse(stripFences(extractText(res))) as EvaluationResult, demo: false };
  }
  if (settings.apiKey && settings.apiKey.trim()) {
    const result = await runAnalysis({
      apiKey: settings.apiKey,
      model: settings.model,
      effort: settings.effort,
      transcript: req.transcript,
      profile: req.profile,
      activeModules: req.activeModules,
      interaction: req.interaction,
      deliveryContext: req.deliveryContext,
    });
    return { result, demo: false };
  }
  return { result: heuristic(req), demo: true };
}

// ---------------------------------------------------------------------------
// Offline heuristic engine — transparent, deterministic, clearly labelled.
// Not a substitute for the Claude judge; gives a usable preview without a key.
// ---------------------------------------------------------------------------

function splitSpeakers(transcript: string): { userText: string; total: number; userWords: number } {
  const lines = transcript.split(/\r?\n/);
  const labelled = lines.filter((l) => /^[A-Za-z][\w .'’-]{0,30}:\s/.test(l));
  const totalWords = wordCount(transcript);
  if (labelled.length >= 2) {
    const userLines = lines.filter((l) => /^(me|you|self)\s*:/i.test(l.trim()));
    const userText = userLines.map((l) => l.replace(/^[^:]+:\s*/, '')).join(' ');
    if (userText.trim()) return { userText, total: totalWords, userWords: wordCount(userText) };
  }
  return { userText: transcript, total: totalWords, userWords: totalWords };
}

const wordCount = (s: string) => (s.trim().match(/\b[\w’']+\b/g) || []).length;
const countMatches = (s: string, re: RegExp) => (s.match(re) || []).length;

function sentences(s: string): string[] {
  return s
    .split(/(?<=[.!?])\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function clamp(n: number) {
  return Math.max(1, Math.min(4, Math.round(n * 10) / 10));
}

function heuristic(req: AnalyzeRequest): EvaluationResult {
  const { userText, total, userWords } = splitSpeakers(req.transcript);
  const sents = sentences(userText);
  const nSent = Math.max(1, sents.length);
  const words = Math.max(1, wordCount(userText));

  const questions = countMatches(userText, /\?/g);
  const openQ = sents.filter((s) => /\?$/.test(s) && /^\s*(what|how|why|where|when|who|tell me|walk me|help me)/i.test(s)).length;
  const fillers = countMatches(userText, /\b(um|uh|like|you know|sort of|kind of|basically|literally|just)\b/gi);
  const hedges = countMatches(userText, /\b(maybe|might|i think|i guess|possibly|perhaps|a bit|i'?m not sure|i feel like)\b/gi);
  const absolutes = countMatches(userText, /\b(always|never|everyone|nobody|nothing|everything)\b/gi);
  const apologies = countMatches(userText, /\b(sorry|apologi[sz]e|my bad)\b/gi);
  const reflectBacks = countMatches(userText, /\b(so (what|the|you|if)|it sounds like|if i understand|what i'?m hearing|you said|let me make sure)\b/gi);
  const requests = countMatches(userText, /\b(could you|would you|can you|by (monday|tuesday|wednesday|thursday|friday|\d))\b/gi);
  const avgSentLen = words / nSent;
  const talkRatio = total > 0 ? userWords / total : 1;
  const fillerRate = fillers / nSent;
  const hedgeRate = hedges / nSent;
  const qRate = questions / nSent;

  const scores: Record<string, number> = {};
  scores.inquiry = clamp(1.5 + qRate * 5 + (questions > 0 ? openQ / questions : 0));
  scores.listening = clamp(2 + reflectBacks * 0.4 - Math.max(0, talkRatio - 0.6) * 3);
  scores.conciseness = clamp(4 - Math.max(0, avgSentLen - 14) * 0.12);
  scores.gravitas = clamp(3.2 - hedgeRate * 2.5 - fillerRate * 1.2);
  scores.composure = clamp(3 - fillerRate * 1.5 - (countMatches(userText, /\bwell,? actually\b/gi) ? 0.6 : 0));
  scores.observation = clamp(3.4 - absolutes * 0.5);
  scores.assertiveness = clamp(2 + requests * 0.5 - apologies * 0.3);
  // metrics we cannot measure well offline — neutral-ish estimates
  scores.regulation = scores.composure;
  scores.calibration = clamp(2.4 + qRate * 2);
  scores.trust = clamp(2.4 + reflectBacks * 0.3);
  scores.difficult = clamp((scores.observation + scores.composure) / 2);
  scores.negotiation = clamp((scores.inquiry + scores.assertiveness) / 2);
  scores.consultative = clamp((scores.inquiry + scores.listening) / 2);
  scores['self-awareness'] = 2.5;

  const active = req.activeModules.length ? req.activeModules : COMPETENCIES.flatMap((c) => c.moduleNumbers);
  const activeSet = new Set(active);

  const moduleScores: ModuleScore[] = [];
  for (const m of [...activeSet].sort((a, b) => a - b)) {
    const mod = moduleByNumber(m);
    if (!mod) continue;
    const cs = mod.competencyIds.map((id) => scores[id] ?? 2.5);
    const score = clamp(cs.reduce((a, b) => a + b, 0) / Math.max(1, cs.length));
    moduleScores.push({ moduleNumber: m, score, summary: heuristicModuleSummary(m, score) });
  }
  const overall = clamp(moduleScores.reduce((a, b) => a + b.score, 0) / Math.max(1, moduleScores.length));

  const findings: Finding[] = [];
  const firstQ = sents.find((s) => /\?$/.test(s));
  if (firstQ && scores.inquiry >= 2.5)
    findings.push({ type: 'strength', competencyId: 'inquiry', moduleNumber: 5, quote: firstQ, note: 'You asked a genuine question and opened space rather than just advocating.', timestampLabel: 'in the conversation' });
  const absSent = sents.find((s) => /\b(always|never|everyone|nobody)\b/i.test(s));
  if (absSent)
    findings.push({ type: 'growth', competencyId: 'observation', moduleNumber: 6, quote: absSent, note: 'This uses an absolute/character framing. Swapping to a specific observation lowers defensiveness.', suggestion: 'Describe the specific thing that happened instead of "always/never".', timestampLabel: 'in the conversation' });
  const hedgeSent = sents.find((s) => /\b(maybe|i think|sort of|i guess|just)\b/i.test(s));
  if (hedgeSent && scores.gravitas < 3)
    findings.push({ type: 'growth', competencyId: 'gravitas', moduleNumber: 1, quote: hedgeSent, note: 'Hedging language softens your authority here.', suggestion: 'State the position cleanly — drop "maybe/just/I think".', timestampLabel: 'in the conversation' });
  if (reflectBacks > 0) {
    const rb = sents.find((s) => /\b(so the|it sounds like|what i'?m hearing|you said)\b/i.test(s));
    if (rb) findings.push({ type: 'strength', competencyId: 'listening', moduleNumber: 5, quote: rb, note: 'You reflected back what you heard — strong listening that builds trust.', timestampLabel: 'in the conversation' });
  }
  if (talkRatio > 0.75 && total !== userWords)
    findings.push({ type: 'growth', competencyId: 'listening', moduleNumber: 5, quote: '(you held most of the airtime)', note: `You spoke roughly ${Math.round(talkRatio * 100)}% of the words. More space invites more from others.`, suggestion: 'Ask one open question and let the silence sit.', timestampLabel: 'overall' });
  if (!findings.length)
    findings.push({ type: 'growth', competencyId: 'self-awareness', moduleNumber: 10, quote: '(offline preview)', note: 'Add an API key in Settings for evidence-level, behaviour-by-behaviour analysis of this exact conversation.', timestampLabel: 'overall' });

  const priorities = buildPriorities(scores, activeSet);

  return {
    overall,
    headline: heuristicHeadline(overall),
    situation:
      'This is an offline preview based on text-pattern heuristics (question rate, hedging, absolutes, talk-time, reflect-backs). Add your Anthropic API key in Settings for a holistic, evidence-quoted, self-only evaluation of how you actually handled this situation.',
    moduleScores,
    findings,
    priorities,
  };
}

function buildPriorities(scores: Record<string, number>, activeSet: Set<number>): Priority[] {
  const ranked = COMPETENCIES.filter((c) => c.moduleNumbers.some((m) => activeSet.has(m)))
    .map((c) => ({ c, s: scores[c.id] ?? 2.5 }))
    .sort((a, b) => a.s - b.s)
    .slice(0, 3);
  return ranked.map(({ c }) => {
    const mod = moduleByNumber(c.moduleNumbers[0]);
    const drill = mod?.practice.find((p) => p.kind === 'experiment') || mod?.practice[0];
    return {
      title: `Strengthen: ${c.name}`,
      why: c.definition,
      moduleNumbers: c.moduleNumbers,
      drill: drill ? `${drill.title} — ${drill.body}` : 'Pick one focus and practise it in your next real conversation.',
    };
  });
}

function heuristicHeadline(overall: number): string {
  if (overall >= 3.3) return 'Strong overall — a few precise tweaks will sharpen the edges.';
  if (overall >= 2.6) return 'Solid foundation — one or two focused changes will move the needle.';
  return 'Clear, specific opportunities here — pick one focus and start there.';
}

function heuristicModuleSummary(_m: number, score: number): string {
  if (score >= 3.3) return 'Looking strong on this dimension.';
  if (score >= 2.6) return 'Competent, with room to sharpen.';
  return 'A high-leverage area to focus on.';
}

export function findingCompetencyName(f: Finding): string {
  return f.competencyId ? competencyById(f.competencyId)?.name ?? '' : '';
}
