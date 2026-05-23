import Dexie, { type Table } from 'dexie';
import type { Profile, Settings, Evaluation, Progress, CoachMessage } from './types';

class FulcrumDB extends Dexie {
  settings!: Table<Settings, string>;
  profile!: Table<Profile, string>;
  evaluations!: Table<Evaluation, string>;
  progress!: Table<Progress, number>;
  coach!: Table<CoachMessage, string>;

  constructor() {
    super('fulcrum');
    this.version(1).stores({
      settings: 'id',
      profile: 'id',
      evaluations: 'id, createdAt',
      progress: 'moduleNumber',
      coach: 'id, threadId, createdAt',
    });
  }
}

export const db = new FulcrumDB();

export const DEFAULT_SETTINGS: Settings = {
  id: 'app',
  apiKey: (import.meta as any).env?.VITE_ANTHROPIC_API_KEY ?? '',
  model: 'claude-opus-4-7',
  coachModel: 'claude-opus-4-7',
  passiveAgent: false,
  retentionDays: 0,
  effort: 'high',
};

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get('app');
  if (s) return { ...DEFAULT_SETTINGS, ...s };
  await db.settings.put(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const s = await getSettings();
  await db.settings.put({ ...s, ...patch, id: 'app' });
}

export async function getProfile(): Promise<Profile | undefined> {
  return db.profile.get('me');
}

export async function saveProfile(p: Profile): Promise<void> {
  await db.profile.put({ ...p, id: 'me' });
}

export async function wipeAllData(): Promise<void> {
  await Promise.all([
    db.evaluations.clear(),
    db.progress.clear(),
    db.coach.clear(),
    db.profile.clear(),
  ]);
}
