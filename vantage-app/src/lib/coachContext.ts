import { db } from '../db';
import { moduleByNumber } from '../content/curriculum';
import type { Evaluation } from '../types';

function summarise(e: Evaluation): string {
  const r = e.result;
  const priorities = r.priorities.map((p) => p.title).join('; ') || '—';
  const findings = r.findings.slice(0, 4).map((f) => `${f.type}: "${f.quote}" (${f.note})`).join(' | ');
  return `• ${e.title} — ${new Date(e.createdAt).toLocaleDateString()}, ${e.interactionType.replace('-', ' ')}, overall ${r.overall.toFixed(1)}/4. Focus: ${priorities}. Evidence: ${findings}`;
}

/** Builds the coach's memory: the focus evaluation (if any), recent history,
 *  trend, and completed modules — so it can discuss everything that's gone before. */
export async function buildCoachContext(focusEvalId?: string): Promise<string> {
  const parts: string[] = [];
  const recent = await db.evaluations.orderBy('createdAt').reverse().limit(6).toArray();

  if (focusEvalId) {
    const e = await db.evaluations.get(focusEvalId);
    if (e) parts.push(`THE USER OPENED THE COACH FROM THIS EVALUATION — focus on it:\n${summarise(e)}\nSituation: ${e.result.situation}`);
  }
  if (recent.length) {
    parts.push('RECENT EVALUATIONS (most recent first):\n' + recent.map(summarise).join('\n'));
  }
  if (recent.length >= 2) {
    const last = recent[0].result.overall;
    const first = recent[recent.length - 1].result.overall;
    parts.push(`Overall trend: ${first.toFixed(1)} → ${last.toFixed(1)} across ${recent.length} recent evaluations.`);
  }
  const progress = await db.progress.toArray();
  const done = progress.filter((p) => p.completedAt).map((p) => `M${p.moduleNumber} ${moduleByNumber(p.moduleNumber)?.title ?? ''}`);
  if (done.length) parts.push(`Modules completed: ${done.join(', ')}.`);

  return parts.length ? parts.join('\n\n') : '';
}
