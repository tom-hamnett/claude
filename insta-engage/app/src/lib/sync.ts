import Dexie from 'dexie';
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { db } from '../db';

/**
 * Offline-first sync. The phone keeps working from IndexedDB; every local
 * change is queued and upserted to Supabase `records` (one row per object,
 * owner-scoped by RLS). Pulls fetch rows changed since the last pull, so
 * Claude runs that write straight to Supabase appear on the phone.
 */

const KINDS = ['contacts', 'funnels', 'threads', 'reports', 'content', 'settings'] as const;
type Kind = (typeof KINDS)[number];

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
export const supabase: SupabaseClient | null = url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } }) : null;

const dirty = new Map<Kind, Set<string>>(KINDS.map((k) => [k, new Set<string>()]));
let pushTimer: number | undefined;
let started = false;
type Listener = (s: SyncState) => void;
export interface SyncState {
  enabled: boolean;
  signedIn: boolean;
  email?: string;
  busy: boolean;
  lastSync?: string;
  error?: string;
}
let state: SyncState = { enabled: !!supabase, signedIn: false, busy: false };
const listeners = new Set<Listener>();
const emit = (patch: Partial<SyncState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l(state));
};
export const getSyncState = () => state;
export function onSync(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const isRemoteTx = () => !!(Dexie.currentTransaction as unknown as { remote?: boolean } | null)?.remote;

function markDirty(kind: Kind, id: unknown) {
  if (isRemoteTx() || typeof id !== 'string') return;
  dirty.get(kind)!.add(id);
  schedulePush();
}

// Record every local write. Hooks run synchronously inside Dexie's transaction.
for (const kind of KINDS) {
  const table = db.table(kind);
  table.hook('creating', function (primKey, obj) {
    markDirty(kind, primKey ?? (obj as { id?: string }).id);
  });
  table.hook('updating', function (_mods, primKey) {
    markDirty(kind, primKey);
  });
}

function schedulePush() {
  if (!supabase || !state.signedIn) return;
  window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => void push(), 1200);
}

const lastPullKey = (uid: string) => `ie-last-pull-${uid}`;

async function push(): Promise<void> {
  if (!supabase || !state.signedIn) return;
  const rows: { kind: Kind; id: string; data: unknown }[] = [];
  for (const kind of KINDS) {
    const ids = [...dirty.get(kind)!];
    if (!ids.length) continue;
    const objs = await db.table(kind).bulkGet(ids);
    objs.forEach((o, i) => o && rows.push({ kind, id: ids[i], data: o }));
  }
  if (!rows.length) return;
  emit({ busy: true });
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await supabase.from('records').upsert(rows.slice(i, i + 200), { onConflict: 'owner,kind,id' });
    if (error) {
      emit({ busy: false, error: error.message });
      return; // keep dirty; retry next round
    }
  }
  rows.forEach((r) => dirty.get(r.kind)!.delete(r.id));
  emit({ busy: false, error: undefined, lastSync: new Date().toISOString() });
}

async function pull(uid: string): Promise<void> {
  if (!supabase) return;
  const since = localStorage.getItem(lastPullKey(uid)) ?? '1970-01-01T00:00:00Z';
  let newest = since;
  emit({ busy: true });
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('records')
      .select('kind,id,data,updated_at,deleted')
      .gt('updated_at', since)
      .order('updated_at', { ascending: true })
      .range(from, from + 999);
    if (error) {
      emit({ busy: false, error: error.message });
      return;
    }
    if (!data?.length) break;
    await db.transaction('rw', KINDS.map((k) => db.table(k)), async (tx) => {
      (tx as unknown as { remote: boolean }).remote = true;
      for (const r of data as { kind: Kind; id: string; data: unknown; updated_at: string; deleted: boolean }[]) {
        if (!KINDS.includes(r.kind)) continue;
        // Don't clobber an unsent local edit with an older server copy.
        if (dirty.get(r.kind)!.has(r.id)) continue;
        if (r.deleted) await db.table(r.kind).delete(r.id);
        else await db.table(r.kind).put(r.data);
        if (r.updated_at > newest) newest = r.updated_at;
      }
    });
    if (data.length < 1000) break;
  }
  localStorage.setItem(lastPullKey(uid), newest);
  emit({ busy: false, error: undefined, lastSync: new Date().toISOString() });
}

/** First sign-in on a device: queue everything local so nothing is lost. */
async function queueAllLocal() {
  for (const kind of KINDS) {
    const keys = (await db.table(kind).toCollection().primaryKeys()) as string[];
    keys.forEach((k) => dirty.get(kind)!.add(k));
  }
}

export async function syncNow(): Promise<void> {
  const uid = (await supabase?.auth.getSession())?.data.session?.user.id;
  if (!uid) return;
  await push();
  await pull(uid);
}

async function onSession(session: Session | null) {
  if (!session) {
    emit({ signedIn: false, email: undefined });
    return;
  }
  emit({ signedIn: true, email: session.user.email ?? undefined });
  const uid = session.user.id;
  if (!localStorage.getItem(lastPullKey(uid))) await queueAllLocal();
  await syncNow();
}

export function startSync() {
  if (!supabase || started) return;
  started = true;
  supabase.auth.getSession().then(({ data }) => onSession(data.session));
  supabase.auth.onAuthStateChange((evt, session) => {
    if (evt === 'SIGNED_IN' || evt === 'SIGNED_OUT') void onSession(session);
  });
  window.setInterval(() => void syncNow(), 60_000);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && void syncNow());
  window.addEventListener('online', () => void syncNow());
}

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error('Sync not configured');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUp(email: string, password: string) {
  if (!supabase) throw new Error('Sync not configured');
  const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
  if (error) throw error;
  return !!data.session; // false → confirm via email first
}

export async function signOut() {
  await supabase?.auth.signOut();
}
