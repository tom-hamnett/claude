import Dexie, { type Table } from 'dexie';
import type { Contact, ContentItem, Funnel, ReportRequest, Settings, Thread } from './types';
import { DEFAULT_SETTINGS, analystsEdgeFunnel } from './lib/seed';

class EngageDB extends Dexie {
  contacts!: Table<Contact, string>;
  funnels!: Table<Funnel, string>;
  threads!: Table<Thread, string>;
  reports!: Table<ReportRequest, string>;
  content!: Table<ContentItem, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super('insta-engage');
    this.version(1).stores({
      contacts: 'id, &handle, updatedAt',
      funnels: 'id',
      threads: 'id, contactId, funnelId, stageId, status, dueAt',
      reports: 'id, contactId, status',
      content: 'id, funnelId',
      settings: 'id',
    });
  }
}

export const db = new EngageDB();

export async function ensureSeeded(): Promise<void> {
  await db.transaction('rw', db.settings, db.funnels, async () => {
    if (!(await db.settings.get('settings'))) await db.settings.put(DEFAULT_SETTINGS);
    if ((await db.funnels.count()) === 0) await db.funnels.put(analystsEdgeFunnel());
  });
}

export async function getSettings(): Promise<Settings> {
  return (await db.settings.get('settings')) ?? DEFAULT_SETTINGS;
}

export const uid = () => crypto.randomUUID();
export const nowIso = () => new Date().toISOString();
