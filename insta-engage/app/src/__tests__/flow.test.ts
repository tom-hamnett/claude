import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, ensureSeeded } from '../db';
import { advance, enrolAllActive, enrolTop, importBundle, markSent, dueFollowUps } from '../lib/actions';
import { chooseView, lintMessage, wordCount } from '../lib/draft';
import { scoreContact } from '../lib/score';
import { sampleBundle } from '../lib/sample';
import { DEFAULT_SETTINGS, analystsEdgeFunnel } from '../lib/seed';

const stage = (id: string) => analystsEdgeFunnel().stages.find((s) => s.id === id)!;

beforeEach(async () => {
  await db.delete();
  await db.open();
  await ensureSeeded();
});

describe('rules', () => {
  it('cohort: small company gets whole-company view, large gets function', () => {
    expect(chooseView(800, 'procurement', 5000)).toBe('whole_company');
    expect(chooseView(12000, 'procurement', 5000)).toBe('function');
    expect(chooseView(12000, undefined, 5000)).toBe('whole_company');
    expect(chooseView(undefined, 'finance', 5000)).toBe('function');
  });

  it('lint blocks links in first message and flags length, questions, salesy words', () => {
    const first = stage('thanks');
    expect(lintMessage('Hi, see https://x.com?', first, DEFAULT_SETTINGS).some((i) => i.level === 'block')).toBe(true);
    const long = Array(60).fill('word').join(' ') + '?';
    expect(lintMessage(long, first, DEFAULT_SETTINGS).some((i) => i.msg.includes('words'))).toBe(true);
    expect(lintMessage('One? Two?', first, DEFAULT_SETTINGS).some((i) => i.msg.includes('questions'))).toBe(true);
    expect(lintMessage('Want a free quick call?', first, DEFAULT_SETTINGS).some((i) => i.msg.startsWith('Salesy'))).toBe(true);
    expect(wordCount('a b https://x.y c')).toBe(3);
  });
});

describe('funnel flow', () => {
  it('imports, scores (hotel sector at face value), enrols top N with drafts that pass lint', async () => {
    const r = await importBundle(sampleBundle());
    expect(r.added).toBe(8);
    const hotel = await db.contacts.where('handle').equals('sample_hotelier').first();
    expect(scoreContact(hotel!, DEFAULT_SETTINGS).total).toBeGreaterThan(0);
    expect(scoreContact(hotel!, { ...DEFAULT_SETTINGS, blockedSectors: ['hotels'] }).total).toBe(0);
    const n = await enrolTop('ae-example-report', 5);
    expect(n).toBe(5);
    const threads = await db.threads.toArray();
    expect(threads.every((t) => t.status === 'ready' && t.draft && !/\{\w+\}/.test(t.draft))).toBe(true);
    for (const t of threads) {
      const issues = lintMessage(t.draft!, stage('thanks'), DEFAULT_SETTINGS);
      expect(issues.filter((i) => i.level === 'block')).toEqual([]);
      expect(wordCount(t.draft!)).toBeLessThanOrEqual(45);
    }
    // top lead is the procurement director who commented
    const top = (await db.contacts.bulkGet(threads.map((t) => t.contactId))).map((c) => c!.handle);
    expect(top).toContain('sample_priya.ops');
    const priyaThread = threads[top.indexOf('sample_priya.ops')];
    expect(priyaThread.draft).toContain('thanks for the comment on the procurement 30% reel');
  });

  it('send → reply naming a company → report requested → report ready → share draft', async () => {
    await importBundle(sampleBundle());
    await enrolTop('ae-example-report', 1);
    let t = (await db.threads.toArray())[0];
    await markSent(t, t.draft!);
    t = (await db.threads.get(t.id))!;
    expect(t.status).toBe('waiting');
    expect(t.dueAt).toBeTruthy();
    t = await advance(t, 'named_company', 'Can you do Northwind vs DHL?', ['Northwind Logistics'], 'procurement');
    expect(t.stageId).toBe('share');
    expect(t.status).toBe('to_draft');
    const rep = (await db.reports.get(t.reportId!))!;
    expect(rep.subject).toBe('Northwind Logistics');
    expect(rep.view).toBe('function'); // 12k staff
    await importBundle({ version: 1, reports: [{ ...rep, status: 'ready', peers: ['DHL', 'Kuehne+Nagel', 'DSV'], pdfUrl: 'https://example.org/r.pdf' }] });
    t = (await db.threads.get(t.id))!;
    expect(t.status).toBe('ready');
    expect(t.draft).toContain('Northwind Logistics');
    expect(t.draft).toContain('DHL');
  });

  it('non-follower with no reply is stopped after one message; "no" sets do-not-contact', async () => {
    await importBundle(sampleBundle());
    const amelia = (await db.contacts.where('handle').equals('sample_amelia.fp').first())!;
    await enrolTop('ae-example-report', 8);
    let t = (await db.threads.where('contactId').equals(amelia.id).first())!;
    await markSent(t, t.draft!);
    t = (await db.threads.get(t.id))!;
    t.dueAt = new Date(Date.now() - 1000).toISOString();
    await db.threads.put(t);
    expect((await dueFollowUps()).map((x) => x.id)).toContain(t.id);
    t = await advance(t, 'no_reply');
    expect(t.status).toBe('stopped');

    const priya = (await db.contacts.where('handle').equals('sample_priya.ops').first())!;
    let p = (await db.threads.where('contactId').equals(priya.id).first())!;
    p = await advance(p, 'no', 'not for me');
    expect(p.status).toBe('stopped');
    expect((await db.contacts.get(priya.id))!.doNotContact).toBe(true);
  });

  it('routes people to the funnel of the reel they engaged with', async () => {
    const at = new Date().toISOString();
    await importBundle({
      version: 1,
      content: [
        { id: 'Dfk8muKM4pb', title: 'defendable reason', funnelId: 'ae-example-report' },
        { id: 'DfEtmlnOhGC', title: 'five AIs', funnelId: 'atlas-experiment' },
      ],
      contacts: [
        { handle: 'ops_lead', role: 'Head of Operations', seniority: 'director', followsUs: true, engagements: [{ type: 'like', contentId: 'Dfk8muKM4pb', at }] },
        { handle: 'quant_curious', role: 'Analyst', seniority: 'ic', followsUs: true, engagements: [{ type: 'comment', contentId: 'DfEtmlnOhGC', at, text: 'how?' }] },
      ],
    });
    expect(await enrolAllActive()).toBe(2);
    const threads = await db.threads.toArray();
    const byHandle = new Map(await Promise.all(threads.map(async (t) => [(await db.contacts.get(t.contactId))!.handle, t] as const)));
    expect(byHandle.get('ops_lead')!.funnelId).toBe('ae-example-report');
    expect(byHandle.get('quant_curious')!.funnelId).toBe('atlas-experiment');
    expect(byHandle.get('quant_curious')!.draft).toContain('five AIs');
    expect(await enrolAllActive()).toBe(0); // nobody enrolled twice
  });
});
