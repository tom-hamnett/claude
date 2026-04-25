import Dexie, { type Table } from 'dexie';
import type { Group, Mark, Person, Session, Template } from './types';

export class SigmaDB extends Dexie {
  groups!: Table<Group, string>;
  people!: Table<Person, string>;
  templates!: Table<Template, string>;
  sessions!: Table<Session, string>;
  marks!: Table<Mark, string>;

  constructor() {
    super('sigma');
    this.version(1).stores({
      groups: 'id, name, createdAt, updatedAt',
      people: 'id, groupId, name, archived, createdAt',
      templates: 'id, name, createdAt, updatedAt, *tags',
      sessions: 'id, groupId, templateId, date, status, createdAt',
      marks: 'id, sessionId, personId, criterionId, [sessionId+personId], [sessionId+personId+criterionId]',
    });
  }
}

export const db = new SigmaDB();

export const uid = (): string =>
  // crypto.randomUUID is widely supported on iPad Safari 16+
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const now = (): number => Date.now();
