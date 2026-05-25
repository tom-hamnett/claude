import Dexie, { type Table } from 'dexie';
import type { Profile, Settings, Evaluation, Progress, CoachMessage, UsageDay, Module } from './types';
import { DEFAULT_PERMISSIONS } from './content/permissions';

class VantageDB extends Dexie {
  settings!: Table<Settings, string>;
  profile!: Table<Profile, string>;
  evaluations!: Table<Evaluation, string>;
  progress!: Table<Progress, number>;
  coach!: Table<CoachMessage, string>;
  usage!: Table<UsageDay, string>;
  media!: Table<{ id: string; blob: Blob }, string>;
  curriculum!: Table<Module, number>;

  constructor() {
    super('vantage');
    this.version(1).stores({
      settings: 'id',
      profile: 'id',
      evaluations: 'id, createdAt',
      progress: 'moduleNumber',
      coach: 'id, threadId, createdAt',
    });
    this.version(2).stores({
      settings: 'id',
      profile: 'id',
      evaluations: 'id, createdAt',
      progress: 'moduleNumber',
      coach: 'id, threadId, createdAt',
      usage: 'date',
    });
    this.version(3).stores({
      settings: 'id',
      profile: 'id',
      evaluations: 'id, createdAt',
      progress: 'moduleNumber',
      coach: 'id, threadId, createdAt',
      usage: 'date',
      media: 'id',
    });
    this.version(4).stores({
      settings: 'id',
      profile: 'id',
      evaluations: 'id, createdAt',
      progress: 'moduleNumber',
      coach: 'id, threadId, createdAt',
      usage: 'date',
      media: 'id',
      curriculum: 'number',
    });
  }
}

export const db = new VantageDB();

export const DEFAULT_SETTINGS: Settings = {
  id: 'app',
  aiMode: 'byo',
  vantageKey: '',
  apiKey: (import.meta as any).env?.VITE_ANTHROPIC_API_KEY ?? '',
  model: 'claude-opus-4-7',
  coachModel: 'claude-opus-4-7',
  asrKey: '',
  geminiKey: '',
  passiveAgent: false,
  retentionDays: 0,
  effort: 'high',
  dailyVideoMinutes: 60,
  permissions: DEFAULT_PERMISSIONS,
  consentedAt: 0,
};

export async function recordUsage(patch: { videoSec?: number; audioSec?: number; transcripts?: number; estUsd?: number }) {
  const date = new Date().toISOString().slice(0, 10);
  const cur = (await db.usage.get(date)) ?? { date, videoSec: 0, audioSec: 0, transcripts: 0, estUsd: 0 };
  await db.usage.put({
    date,
    videoSec: cur.videoSec + (patch.videoSec ?? 0),
    audioSec: cur.audioSec + (patch.audioSec ?? 0),
    transcripts: cur.transcripts + (patch.transcripts ?? 0),
    estUsd: cur.estUsd + (patch.estUsd ?? 0),
  });
}

export async function getTodayUsage() {
  const date = new Date().toISOString().slice(0, 10);
  return (await db.usage.get(date)) ?? { date, videoSec: 0, audioSec: 0, transcripts: 0, estUsd: 0 };
}

export async function getSettings(): Promise<Settings> {
  // Read-only: must be safe to call inside a Dexie liveQuery (no writes here).
  const s = await db.settings.get('app');
  return s ? { ...DEFAULT_SETTINGS, ...s } : DEFAULT_SETTINGS;
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

/** Store media for in-report playback. Skips very large files to protect quota. */
export async function saveMedia(id: string, blob: Blob): Promise<void> {
  if (blob.size > 250 * 1024 * 1024) return; // >250MB: skip to avoid quota issues
  try { await db.media.put({ id, blob }); } catch { /* quota — skip */ }
}
export async function getMedia(id: string): Promise<Blob | undefined> {
  return (await db.media.get(id))?.blob;
}

export async function wipeAllData(): Promise<void> {
  await Promise.all([
    db.evaluations.clear(),
    db.progress.clear(),
    db.coach.clear(),
    db.profile.clear(),
    db.media.clear(),
  ]);
}
