import type { Contact, Funnel, Motivation, ReportRequest, Stage, Settings, Thread } from '../types';
import { PACKS } from './seed';

// ---------- profile → phrases ----------

const OPTIONS_BY_MOTIVATION: Record<Motivation, string> = {
  make_a_case: 'making a case for budget',
  promotion: 'standing out for promotion',
  sell: 'finding a way in with prospects',
  job_hunt: 'interview prep',
  pitch: 'pitching clients',
  invest: 'screening companies',
  board: 'answering "are we efficient?"',
  learn: 'how the analysis works',
};

const CHALLENGE_BY_MOTIVATION: Record<Motivation, string> = {
  make_a_case: 'the case you are making',
  promotion: 'the next promotion round',
  sell: 'conversations with prospects',
  job_hunt: 'your next interview',
  pitch: 'your next pitch',
  invest: 'your screening',
  board: 'the board question',
  learn: 'what you are working on',
};

const MOMENT_BY_MOTIVATION: Record<Motivation, string> = {
  make_a_case: 'budget round',
  promotion: 'promotion round',
  sell: 'next prospect meeting',
  job_hunt: 'interview',
  pitch: 'pitch',
  invest: 'screen',
  board: 'board pre-read',
  learn: 'project',
};

const PACK_BY_MOTIVATION: Record<Motivation, keyof typeof PACKS> = {
  make_a_case: 'budget',
  promotion: 'budget',
  sell: 'onepager',
  job_hunt: 'interview',
  pitch: 'pitch',
  invest: 'deal',
  board: 'onepager',
  learn: 'onepager',
};

/** Guess motivations from a free-text bio/role when none are logged. */
export function inferMotivations(c: Pick<Contact, 'bio' | 'role' | 'seniority'>): Motivation[] {
  const t = `${c.bio ?? ''} ${c.role ?? ''}`.toLowerCase();
  const out = new Set<Motivation>();
  if (/consult|advis|partner|agency/.test(t)) out.add('pitch');
  if (/sales|account exec|business develop|bdr|sdr|recruit|talent partner/.test(t)) out.add('sell');
  if (/open to work|looking for|seeking|job hunt|graduate|mba candidate/.test(t)) out.add('job_hunt');
  if (/student|university|uni |studying|mba/.test(t)) out.add('learn');
  if (/invest|private equity|\bpe\b|venture|\bvc\b|m&a|deal/.test(t)) out.add('invest');
  if (/board|non-exec|\bned\b|chair/.test(t)) out.add('board');
  if (/head of|director|manager|lead/.test(t)) out.add('make_a_case');
  if (c.seniority === 'senior_ic' || c.seniority === 'ic') out.add('promotion');
  return [...out];
}

export function firstName(c: Contact): string {
  const n = (c.name ?? '').trim().split(/\s+/)[0];
  return n && /^[A-Za-zÀ-ÿ'-]+$/.test(n) ? n : 'there';
}

const WEIGHT: Record<string, number> = { dm: 7, comment: 6, story_reply: 6, share: 5, save: 4, follow: 3, like: 1 };

/** The engagement worth thanking them for: the strongest, then the most recent. */
export function keyEngagement(c: Pick<Contact, 'engagements'>) {
  return [...c.engagements].sort((a, b) => (WEIGHT[b.type] ?? 0) - (WEIGHT[a.type] ?? 0) || b.at.localeCompare(a.at))[0];
}

export function engagementPhrase(c: Contact, contentTitle?: string): string {
  const latest = keyEngagement(c);
  const what = contentTitle ? ` the ${contentTitle} reel` : ' the reel';
  switch (latest?.type) {
    case 'comment':
      return `the comment on${what}`;
    case 'follow':
      return 'the follow';
    case 'share':
      return `sharing${what}`;
    case 'save':
      return `saving${what}`;
    case 'story_reply':
      return 'the reply to my story';
    case 'dm':
      return 'the message';
    default:
      return `liking${what}`;
  }
}

/** Two or three options built from what we can see; always ends with a catch-all. */
export function interestOptions(c: Contact): string {
  const mots = c.motivations.length ? c.motivations : inferMotivations(c);
  const opts = mots.slice(0, 2).map((m) => OPTIONS_BY_MOTIVATION[m]);
  if (opts.length < 2) opts.push(c.func ? `how ${c.func} teams compare` : 'how companies compare');
  return `${opts.join(', ')}, or something else`;
}

function mainMotivation(c: Contact): Motivation {
  return (c.motivations[0] ?? inferMotivations(c)[0] ?? 'learn') as Motivation;
}

export interface DraftVars {
  [k: string]: string;
}

export function draftVars(c: Contact, t: Thread | undefined, f: Funnel, report?: ReportRequest, contentTitle?: string): DraftVars {
  const m = mainMotivation(c);
  const pack = PACKS[PACK_BY_MOTIVATION[m]];
  const subject = report?.subject ?? t?.interestCompanies[0] ?? c.employer ?? 'a company you pick';
  const peers = report?.peers ?? [];
  return {
    first_name: firstName(c),
    engagement_phrase: engagementPhrase(c, contentTitle),
    interest_options: interestOptions(c),
    topic: c.func ? `${c.func} benchmark` : 'benchmark',
    employer: c.employer ?? 'your company',
    employer_or_company: t?.interestCompanies[0] ?? c.employer ?? 'any company you name',
    report_subject: subject,
    peers_short: peers.length ? `${peers.slice(0, 2).join(', ')} and ${Math.max(peers.length - 2, 0)} others`.replace(' and 0 others', '') : 'its closest peers',
    challenge: CHALLENGE_BY_MOTIVATION[m],
    moment: MOMENT_BY_MOTIVATION[m],
    pack_name: pack.name,
    pack_price: pack.price,
    pack_what: pack.what,
    product_url: f.productUrl ?? '[order link]',
    report_link: report?.pdfUrl ?? '',
  };
}

export function fillTemplate(template: string, vars: DraftVars): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`).replace(/\s+([,.?!])/g, '$1').trim();
}

export function draftFor(stage: Stage, c: Contact, t: Thread | undefined, f: Funnel, report?: ReportRequest, contentTitle?: string): string {
  let text = fillTemplate(stage.template, draftVars(c, t, f, report, contentTitle));
  if (stage.attachReport && report?.pdfUrl) text += `\n${report.pdfUrl}`;
  return text;
}

// ---------- linting against the messaging principles ----------

export interface LintIssue {
  level: 'warn' | 'block';
  msg: string;
}

export function wordCount(text: string): number {
  return text.replace(/https?:\/\/\S+/g, '').trim().split(/\s+/).filter(Boolean).length;
}

export function lintMessage(text: string, stage: Stage, s: Pick<Settings, 'bannedWords'>): LintIssue[] {
  const issues: LintIssue[] = [];
  const words = wordCount(text);
  if (words > stage.maxWords) issues.push({ level: 'warn', msg: `${words} words, limit ${stage.maxWords}` });
  const qs = (text.match(/\?/g) ?? []).length;
  if (qs > 1) issues.push({ level: 'warn', msg: `${qs} questions: keep to one` });
  if (qs === 0 && stage.kind !== 'nurture' && stage.kind !== 'closed') issues.push({ level: 'warn', msg: 'No question: end with one easy ask' });
  if (stage.kind === 'first_touch' && /https?:\/\/|www\./i.test(text)) issues.push({ level: 'block', msg: 'No links in the first message' });
  if (stage.kind !== 'offer' && stage.kind !== 'closed' && /£\s?\d|\$\s?\d|price|cost you/i.test(text))
    issues.push({ level: 'warn', msg: 'Price before the offer stage' });
  if (/—/.test(text)) issues.push({ level: 'warn', msg: 'Em dash: use a comma or full stop' });
  if ((text.match(/!/g) ?? []).length > 1) issues.push({ level: 'warn', msg: 'More than one exclamation mark' });
  const emoji = text.match(/\p{Extended_Pictographic}/gu) ?? [];
  if (emoji.length > 1) issues.push({ level: 'warn', msg: 'More than one emoji' });
  const lower = text.toLowerCase();
  const banned = s.bannedWords.filter((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(lower));
  if (banned.length) issues.push({ level: 'warn', msg: `Salesy: ${banned.join(', ')}` });
  if (/\{\w+\}/.test(text)) issues.push({ level: 'block', msg: 'Unfilled {variable}' });
  return issues;
}

/** Report cohort rule: small companies get the whole-company view, large ones a function view. */
export function chooseView(staff: number | undefined, func: string | undefined, threshold: number): ReportRequest['view'] {
  const wantsFunction = !!func && func !== 'whole company';
  if (!wantsFunction) return 'whole_company';
  if (staff !== undefined && staff < threshold) return 'whole_company';
  return 'function';
}
