import { db, getSettings, nowIso, uid } from '../db';
import type { Contact, ContentItem, Funnel, Intent, ReportRequest, Settings, Stage, Thread } from '../types';
import { chooseView, draftFor, inferMotivations, keyEngagement } from './draft';
import { isBlocked, scoreContact } from './score';

const DAY = 86_400_000;

export function stageOf(f: Funnel, id: string): Stage | undefined {
  return f.stages.find((s) => s.id === id);
}

async function contentTitleFor(c: Contact): Promise<string | undefined> {
  const id = keyEngagement(c)?.contentId;
  return id ? (await db.content.get(id))?.title : undefined;
}

/** (Re)write the draft for a thread's current stage. Waits for the report if the stage needs one. */
export async function redraft(t: Thread): Promise<Thread> {
  const [c, f] = await Promise.all([db.contacts.get(t.contactId), db.funnels.get(t.funnelId)]);
  if (!c || !f) return t;
  const stage = stageOf(f, t.stageId);
  if (!stage) return t;
  let report = t.reportId ? await db.reports.get(t.reportId) : undefined;
  if (stage.attachReport && !report) {
    report = await requestReport(c, t);
    t.reportId = report.id;
  }
  if (stage.attachReport && report && report.status !== 'ready') {
    t.status = 'to_draft';
    t.draft = undefined;
  } else {
    t.draft = draftFor(stage, c, t, f, report, await contentTitleFor(c));
    t.draftBy = 'template';
    t.status = 'ready';
  }
  t.updatedAt = nowIso();
  await db.threads.put(t);
  return t;
}

export async function requestReport(c: Contact, t: Thread): Promise<ReportRequest> {
  const s = await getSettings();
  const subject = t.interestCompanies[0] ?? c.employer ?? '';
  const func = t.interestFunction ?? c.func;
  const view = chooseView(c.employerStaff, func, s.cohortThreshold);
  const blocked = !subject || isBlocked({ ...c, employer: subject }, s);
  const r: ReportRequest = {
    id: uid(),
    contactId: c.id,
    view,
    func: view === 'function' ? func : undefined,
    subject,
    peers: [],
    status: blocked ? 'blocked' : 'requested',
    note: !subject ? 'No company yet: ask which company they want' : blocked ? 'Blocked sector or company' : undefined,
    createdAt: nowIso(),
  };
  await db.reports.put(r);
  return r;
}

/** Enrol the top-N unenrolled contacts into a funnel at its first stage, with drafts. */
export async function enrolTop(funnelId: string, n?: number): Promise<number> {
  const s = await getSettings();
  const f = await db.funnels.get(funnelId);
  if (!f) return 0;
  const enrolled = new Set((await db.threads.where('funnelId').equals(funnelId).toArray()).map((t) => t.contactId));
  const ranked = (await db.contacts.toArray())
    .filter((c) => !enrolled.has(c.id) && !c.doNotContact && !isBlocked(c, s))
    .map((c) => ({ c, score: scoreContact(c, s).total }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n ?? s.topN);
  for (const { c } of ranked) {
    const t: Thread = {
      id: uid(),
      contactId: c.id,
      funnelId,
      stageId: f.stages[0].id,
      status: 'to_draft',
      interestCompanies: [],
      history: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await redraft(t);
  }
  return ranked.length;
}

/** The one-tap action: record the message as sent and schedule the follow-up. */
export async function markSent(t: Thread, text: string): Promise<void> {
  const f = await db.funnels.get(t.funnelId);
  const stage = f && stageOf(f, t.stageId);
  t.history.push({ at: nowIso(), stageId: t.stageId, dir: 'out', text, reportId: stage?.attachReport ? t.reportId : undefined });
  t.status = stage?.kind === 'closed' ? 'won' : 'waiting';
  const days = stage?.followUpDays ?? (stage?.kind === 'nurture' || stage?.kind === 'closed' ? null : 6);
  t.dueAt = days ? new Date(Date.now() + days * DAY).toISOString() : undefined;
  t.draft = undefined;
  t.updatedAt = nowIso();
  await db.threads.put(t);
}

export async function undoSent(t: Thread): Promise<void> {
  const last = t.history.at(-1);
  if (!last || last.dir !== 'out') return;
  t.history.pop();
  t.status = 'ready';
  t.draft = last.text;
  t.dueAt = undefined;
  await db.threads.put(t);
}

/** Log a reply (or a no-reply) and move the thread along the matching branch. */
export async function advance(t: Thread, intent: Intent, replyText?: string, companies?: string[], func?: string): Promise<Thread> {
  const [f, c] = await Promise.all([db.funnels.get(t.funnelId), db.contacts.get(t.contactId)]);
  if (!f || !c) return t;
  const stage = stageOf(f, t.stageId);
  if (intent !== 'no_reply') t.history.push({ at: nowIso(), stageId: t.stageId, dir: 'in', text: replyText ?? '', intent });
  if (companies?.length) {
    t.interestCompanies = [...new Set([...companies, ...t.interestCompanies])];
    t.reportId = undefined; // new company: new report
  }
  if (func) t.interestFunction = func;

  let goto = stage?.branches.find((b) => b.when === intent)?.goto ?? (intent === 'no_reply' ? 'stop' : stage?.id ?? 'stop');
  // Instagram rule: a non-follower who never accepted the request gets one message only.
  if (intent === 'no_reply' && stage?.kind === 'first_touch' && !c.followsUs) goto = 'stop';

  if (intent === 'no') {
    c.doNotContact = true;
    c.updatedAt = nowIso();
    await db.contacts.put(c);
  }
  t.dueAt = undefined;
  if (goto === 'stop') {
    t.status = 'stopped';
    t.draft = undefined;
    t.updatedAt = nowIso();
    await db.threads.put(t);
    return t;
  }
  t.stageId = goto;
  return redraft(t);
}

export async function stopThread(t: Thread): Promise<void> {
  t.status = 'stopped';
  t.draft = undefined;
  t.dueAt = undefined;
  t.history.push({ at: nowIso(), stageId: t.stageId, dir: 'note', text: 'Skipped' });
  t.updatedAt = nowIso();
  await db.threads.put(t);
}

/** Threads whose follow-up date has passed with no reply. */
export async function dueFollowUps(): Promise<Thread[]> {
  const now = nowIso();
  return (await db.threads.where('status').equals('waiting').toArray()).filter((t) => t.dueAt && t.dueAt <= now);
}

export async function sentToday(): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const iso = start.toISOString();
  const threads = await db.threads.toArray();
  return threads.reduce((n, t) => n + t.history.filter((h) => h.dir === 'out' && h.at >= iso).length, 0);
}

export async function newConversationsToday(): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const iso = start.toISOString();
  const threads = await db.threads.toArray();
  return threads.filter((t) => {
    const first = t.history.find((h) => h.dir === 'out');
    return !!first && first.at >= iso;
  }).length;
}

// ---------- import / export ----------

export interface Bundle {
  version: 1;
  exportedAt?: string;
  contacts?: Partial<Contact>[];
  content?: ContentItem[];
  funnels?: Funnel[];
  threads?: Thread[];
  reports?: ReportRequest[];
  settings?: Settings;
  /** Claude-written drafts: replaces the template draft on a ready thread. */
  drafts?: { threadId?: string; handle?: string; text: string }[];
}

export interface ImportResult {
  added: number;
  updated: number;
  reportsReady: number;
  drafts: number;
}

function normaliseContact(p: Partial<Contact>, existing?: Contact): Contact {
  const base: Contact = existing ?? {
    id: uid(),
    handle: '',
    seniority: 'unknown',
    interests: [],
    challenges: [],
    motivations: [],
    followsUs: false,
    engagements: [],
    doNotContact: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  const merged: Contact = { ...base, ...Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== '')) } as Contact;
  merged.id = base.id;
  merged.handle = (p.handle ?? base.handle).replace(/^@/, '').trim().toLowerCase();
  const seen = new Set<string>();
  merged.engagements = [...base.engagements, ...(p.engagements ?? [])].filter((e) => {
    const k = `${e.type}|${e.contentId ?? ''}|${e.at.slice(0, 10)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  merged.interests = [...new Set([...(base.interests ?? []), ...(p.interests ?? [])])];
  merged.challenges = [...new Set([...(base.challenges ?? []), ...(p.challenges ?? [])])];
  merged.motivations = [...new Set([...(base.motivations ?? []), ...(p.motivations ?? [])])];
  if (!merged.motivations.length) merged.motivations = inferMotivations(merged);
  merged.doNotContact = base.doNotContact || !!p.doNotContact; // never un-flag by import
  merged.updatedAt = nowIso();
  return merged;
}

export async function importBundle(b: Bundle): Promise<ImportResult> {
  const res: ImportResult = { added: 0, updated: 0, reportsReady: 0, drafts: 0 };
  if (b.settings) await db.settings.put({ ...b.settings, id: 'settings' });
  if (b.funnels) await db.funnels.bulkPut(b.funnels);
  if (b.content) await db.content.bulkPut(b.content);
  for (const p of b.contacts ?? []) {
    if (!p.handle) continue;
    const handle = p.handle.replace(/^@/, '').trim().toLowerCase();
    const existing = await db.contacts.where('handle').equals(handle).first();
    await db.contacts.put(normaliseContact({ ...p, handle }, existing));
    existing ? res.updated++ : res.added++;
  }
  if (b.threads) await db.threads.bulkPut(b.threads);
  for (const r of b.reports ?? []) {
    const prev = await db.reports.get(r.id);
    await db.reports.put({ ...prev, ...r });
    if (r.status === 'ready' && prev?.status !== 'ready') {
      res.reportsReady++;
      for (const t of await db.threads.where('contactId').equals(r.contactId).toArray()) {
        if (t.reportId === r.id && t.status === 'to_draft') await redraft(t);
      }
    }
  }
  for (const d of b.drafts ?? []) {
    let t = d.threadId ? await db.threads.get(d.threadId) : undefined;
    if (!t && d.handle) {
      const c = await db.contacts.where('handle').equals(d.handle.replace(/^@/, '').toLowerCase()).first();
      t = c ? (await db.threads.where('contactId').equals(c.id).toArray()).find((x) => x.status === 'ready') : undefined;
    }
    if (t && t.status === 'ready') {
      t.draft = d.text;
      t.draftBy = 'claude';
      await db.threads.put(t);
      res.drafts++;
    }
  }
  return res;
}

export async function exportBundle(): Promise<Bundle> {
  return {
    version: 1,
    exportedAt: nowIso(),
    contacts: await db.contacts.toArray(),
    content: await db.content.toArray(),
    funnels: await db.funnels.toArray(),
    threads: await db.threads.toArray(),
    reports: await db.reports.toArray(),
    settings: await getSettings(),
  };
}

export function scoreAll(contacts: Contact[], s: Settings) {
  return contacts.map((c) => ({ c, score: scoreContact(c, s) })).sort((a, b) => b.score.total - a.score.total);
}

/** Instagram deep link: opens the DM thread in the app on iOS/Android. */
export function dmUrl(handle: string): string {
  return `https://ig.me/m/${encodeURIComponent(handle)}`;
}
