import Dexie, { type Table } from 'dexie';
import type {
  AppSettings,
  Evidence,
  Group,
  Mark,
  Person,
  Session,
  Template,
} from './types';

export class SigmaDB extends Dexie {
  groups!: Table<Group, string>;
  people!: Table<Person, string>;
  templates!: Table<Template, string>;
  sessions!: Table<Session, string>;
  marks!: Table<Mark, string>;
  evidence!: Table<Evidence, string>;
  settings!: Table<AppSettings, 'singleton'>;

  constructor() {
    super('sigma');
    this.version(1).stores({
      groups: 'id, name, createdAt, updatedAt',
      people: 'id, groupId, name, archived, createdAt',
      templates: 'id, name, createdAt, updatedAt, *tags',
      sessions: 'id, groupId, templateId, date, status, createdAt',
      marks:
        'id, sessionId, personId, criterionId, [sessionId+personId], [sessionId+personId+criterionId]',
    });
    // v2: vertical taxonomy + evidence + settings table.
    this.version(2)
      .stores({
        groups: 'id, name, vertical, createdAt, updatedAt',
        people: 'id, groupId, name, archived, createdAt',
        templates: 'id, name, vertical, source, createdAt, updatedAt, *tags',
        sessions: 'id, groupId, templateId, date, status, createdAt',
        marks:
          'id, sessionId, personId, criterionId, [sessionId+personId], [sessionId+personId+criterionId]',
        evidence: 'id, sessionId, personId, criterionId, kind, capturedAt',
        settings: 'id',
      })
      .upgrade(async (tx) => {
        // No data transformation needed; new fields are optional. Just bootstrap settings doc.
        const settingsTable = tx.table('settings');
        const existing = await settingsTable.get('singleton');
        if (!existing) {
          await settingsTable.put({
            id: 'singleton',
            onboarded: false,
            updatedAt: Date.now(),
          } satisfies AppSettings);
        }
      });
  }
}

export const db = new SigmaDB();

export const uid = (): string =>
  // crypto.randomUUID is widely supported on iPad Safari 16+
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const now = (): number => Date.now();

/** Read-or-init the settings singleton. */
export async function getSettings(): Promise<AppSettings> {
  const existing = await db.settings.get('singleton');
  if (existing) return existing;
  const fresh: AppSettings = {
    id: 'singleton',
    onboarded: false,
    updatedAt: now(),
  };
  await db.settings.put(fresh);
  return fresh;
}

/** Patch the settings singleton, merging with current value. */
export async function patchSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const merged: AppSettings = { ...current, ...patch, id: 'singleton', updatedAt: now() };
  await db.settings.put(merged);
  return merged;
}
