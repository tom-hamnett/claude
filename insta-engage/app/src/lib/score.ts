import type { Contact, Engagement, Motivation, Seniority, Settings } from '../types';

export interface ScorePart {
  label: string;
  points: number;
}
export interface Score {
  total: number;
  parts: ScorePart[];
}

const ENGAGEMENT_POINTS: Record<Engagement['type'], number> = {
  dm: 30,
  comment: 25,
  story_reply: 25,
  share: 20,
  save: 15,
  follow: 12,
  like: 6,
};

const SENIORITY_POINTS: Record<Seniority, number> = {
  exec: 20,
  director: 20,
  founder: 16,
  consultant: 18,
  manager: 16,
  senior_ic: 12,
  ic: 8,
  student: 6,
  unknown: 0,
};

const MOTIVATION_POINTS: Record<Motivation, number> = {
  pitch: 10,
  sell: 10,
  make_a_case: 10,
  invest: 10,
  board: 10,
  promotion: 8,
  job_hunt: 6,
  learn: 2,
};

function daysAgo(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

/**
 * Priority score, 0..~100. Four transparent parts so the list can show why
 * someone ranks where they do: intent (what they did), fit (who they are),
 * reachability (follows us = main inbox) and recency.
 */
export function scoreContact(c: Contact, s: Pick<Settings, 'targetFunctions' | 'blockedSectors' | 'blockedCompanies'>): Score {
  const parts: ScorePart[] = [];
  if (c.doNotContact || isBlocked(c, s)) return { total: 0, parts: [{ label: c.doNotContact ? 'Do not contact' : 'Blocked sector/company', points: 0 }] };

  // Intent: best engagement counts fully, extras add a little (capped).
  const pts = c.engagements.map((e) => ENGAGEMENT_POINTS[e.type]).sort((a, b) => b - a);
  const intent = Math.min(40, (pts[0] ?? 0) + pts.slice(1).reduce((a, b) => a + b * 0.35, 0));
  if (intent) parts.push({ label: `Engagement (${summariseEngagements(c.engagements)})`, points: Math.round(intent) });

  const sen = SENIORITY_POINTS[c.seniority];
  if (sen) parts.push({ label: `Seniority: ${c.seniority.replace('_', ' ')}`, points: sen });

  if (c.func && s.targetFunctions.includes(c.func.toLowerCase())) parts.push({ label: `Target function: ${c.func}`, points: 10 });
  if (c.employer) parts.push({ label: 'Employer known (report can name it)', points: 8 });

  const mot = Math.min(12, Math.max(0, ...c.motivations.map((m) => MOTIVATION_POINTS[m])));
  if (mot) parts.push({ label: `Motivation: ${c.motivations.join(', ')}`, points: mot });

  if (c.followsUs) parts.push({ label: 'Follows us (main inbox, not requests)', points: 8 });

  const last = c.engagements.map((e) => e.at).sort().at(-1);
  if (last) {
    const d = daysAgo(last);
    const rec = d <= 3 ? 6 : d <= 10 ? 3 : 0;
    if (rec) parts.push({ label: `Recent (${Math.round(d)}d ago)`, points: rec });
  }
  return { total: parts.reduce((a, p) => a + p.points, 0), parts };
}

export function isBlocked(c: Contact, s: Pick<Settings, 'blockedSectors' | 'blockedCompanies'>): boolean {
  const sector = (c.sector ?? '').toLowerCase();
  const emp = (c.employer ?? '').toLowerCase();
  return (
    s.blockedSectors.some((b) => b && sector.includes(b.toLowerCase())) ||
    s.blockedCompanies.some((b) => b && emp === b.toLowerCase())
  );
}

export function summariseEngagements(es: Engagement[]): string {
  const counts = new Map<string, number>();
  es.forEach((e) => counts.set(e.type, (counts.get(e.type) ?? 0) + 1));
  return [...counts].map(([t, n]) => (n > 1 ? `${n} ${t}s` : t)).join(', ');
}
