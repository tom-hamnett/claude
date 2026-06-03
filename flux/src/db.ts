import Dexie, { type Table } from 'dexie';
import type { AppSettings, KnowledgeCard, Opportunity, Process, Project } from './types';

export class FluxDB extends Dexie {
  projects!: Table<Project, string>;
  processes!: Table<Process, string>;
  opportunities!: Table<Opportunity, string>;
  knowledge!: Table<KnowledgeCard, string>;
  settings!: Table<AppSettings, 'singleton'>;

  constructor() {
    super('flux');
    this.version(1).stores({
      projects: 'id, name, client, industry, createdAt, updatedAt',
      processes: 'id, projectId, status, name, createdAt, updatedAt',
      opportunities: 'id, processId, driver, waste, impact, effort, priority, createdAt',
      knowledge: 'id, projectId, processId, kind, domain, source, validated, createdAt',
      settings: 'id',
    });
  }
}

export const db = new FluxDB();

export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const now = (): number => Date.now();

export async function getSettings(): Promise<AppSettings> {
  const existing = await db.settings.get('singleton');
  if (existing) return existing;
  const fresh: AppSettings = { id: 'singleton', onboarded: false, updatedAt: now() };
  await db.settings.put(fresh);
  return fresh;
}

export async function patchSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const merged: AppSettings = { ...current, ...patch, id: 'singleton', updatedAt: now() };
  await db.settings.put(merged);
  return merged;
}

// --- Process helpers ---------------------------------------------------------

export async function saveProcess(p: Process): Promise<void> {
  await db.processes.put({ ...p, updatedAt: now() });
}

export async function deleteProcessCascade(processId: string): Promise<void> {
  await db.transaction('rw', db.processes, db.opportunities, db.knowledge, async () => {
    await db.opportunities.where('processId').equals(processId).delete();
    await db.knowledge.where('processId').equals(processId).delete();
    await db.processes.delete(processId);
  });
}

export async function deleteProjectCascade(projectId: string): Promise<void> {
  await db.transaction('rw', db.projects, db.processes, db.opportunities, db.knowledge, async () => {
    const procs = await db.processes.where('projectId').equals(projectId).toArray();
    for (const p of procs) {
      await db.opportunities.where('processId').equals(p.id).delete();
    }
    await db.processes.where('projectId').equals(projectId).delete();
    await db.knowledge.where('projectId').equals(projectId).delete();
    await db.projects.delete(projectId);
  });
}
