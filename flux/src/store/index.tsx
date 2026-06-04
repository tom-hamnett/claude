/**
 * Unified data layer. Pages import ONLY from here and never touch Dexie or
 * Supabase directly. Two backends sit behind the same hooks + mutations:
 *
 *   - Local mode  (no Supabase env): Dexie/IndexedDB, reactive via dexie-react-hooks.
 *   - Cloud mode  (Supabase configured): Postgres rows {id, workspace_id, data jsonb},
 *     workspace-scoped by RLS, reactive via realtime + the sync signal.
 *
 * `isCloud` is a build-time constant, so the branch each hook takes is stable
 * for the life of the app (Rules of Hooks safe).
 */
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, now } from '../db';
import { buildDemo } from '../lib/seed';
import { isCloud, supabase, type CloudTable } from '../services/supabase';
import { getWorkspaceId } from '../services/auth';
import { bumpSync, useSyncVersion } from './signal';
import type { KnowledgeCard, Opportunity, Process, Project } from '../types';

// ===========================================================================
// Cloud primitives
// ===========================================================================

async function cloudListAll<T>(table: CloudTable): Promise<T[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from(table).select('data');
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => (r as { data: T }).data);
}

function requireWs(): string {
  const ws = getWorkspaceId();
  if (!ws) throw new Error('No workspace — please sign in again.');
  return ws;
}

async function cloudUpsert(table: CloudTable, entity: { id: string }): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from(table)
    .upsert({ id: entity.id, workspace_id: requireWs(), data: entity, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  bumpSync();
}

async function cloudUpsertMany(table: CloudTable, entities: { id: string }[]): Promise<void> {
  if (!supabase || !entities.length) return;
  const ws = requireWs();
  const ts = new Date().toISOString();
  const { error } = await supabase
    .from(table)
    .upsert(entities.map((e) => ({ id: e.id, workspace_id: ws, data: e, updated_at: ts })));
  if (error) throw new Error(error.message);
  bumpSync();
}

async function cloudDeleteIds(table: CloudTable, ids: string[]): Promise<void> {
  if (!supabase || !ids.length) return;
  const { error } = await supabase.from(table).delete().in('id', ids);
  if (error) throw new Error(error.message);
  bumpSync();
}

// ===========================================================================
// Generic cloud query hook
// ===========================================================================

function useCloudQuery<T>(table: CloudTable, transform: (rows: unknown[]) => T, deps: unknown[]): T | undefined {
  const v = useSyncVersion();
  const [val, setVal] = useState<T | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    cloudListAll(table)
      .then((rows) => alive && setVal(transform(rows)))
      .catch(() => alive && setVal(transform([])));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v, table, ...deps]);
  return val;
}

/** Wire realtime → sync signal once, after the workspace is known. */
export function useRealtimeSync(workspaceId: string | null): void {
  useEffect(() => {
    if (!isCloud || !supabase || !workspaceId) return;
    const channel = supabase.channel(`flux-${workspaceId}`);
    for (const table of ['projects', 'processes', 'opportunities', 'knowledge'] as CloudTable[]) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => bumpSync());
    }
    channel.subscribe();
    return () => {
      supabase!.removeChannel(channel);
    };
  }, [workspaceId]);
}

// ===========================================================================
// Read hooks
// ===========================================================================

export function useProjects(): Project[] | undefined {
  if (isCloud) {
    return useCloudQuery('projects', (rows) => (rows as Project[]).slice().sort((a, b) => b.updatedAt - a.updatedAt), []);
  }
  return useLiveQuery(() => db.projects.orderBy('updatedAt').reverse().toArray(), []);
}

export function useProject(id: string): Project | null | undefined {
  if (isCloud) {
    return useCloudQuery('projects', (rows) => (rows as Project[]).find((p) => p.id === id) ?? null, [id]);
  }
  return useLiveQuery(() => db.projects.get(id), [id]);
}

export function useAllProcesses(): Process[] | undefined {
  if (isCloud) return useCloudQuery('processes', (rows) => rows as Process[], []);
  return useLiveQuery(() => db.processes.toArray(), []);
}

export function useProcessesByProject(projectId: string): Process[] | undefined {
  if (isCloud) {
    return useCloudQuery('processes', (rows) => (rows as Process[]).filter((p) => p.projectId === projectId), [projectId]);
  }
  return useLiveQuery(() => db.processes.where('projectId').equals(projectId).toArray(), [projectId]);
}

export function useProcess(id: string): Process | null | undefined {
  if (isCloud) {
    return useCloudQuery('processes', (rows) => (rows as Process[]).find((p) => p.id === id) ?? null, [id]);
  }
  return useLiveQuery(() => db.processes.get(id), [id]);
}

export function useOpportunitiesByProcess(processId: string): Opportunity[] | undefined {
  if (isCloud) {
    return useCloudQuery('opportunities', (rows) => (rows as Opportunity[]).filter((o) => o.processId === processId), [processId]);
  }
  return useLiveQuery(() => db.opportunities.where('processId').equals(processId).toArray(), [processId]);
}

export function useAllOpportunities(): Opportunity[] | undefined {
  if (isCloud) return useCloudQuery('opportunities', (rows) => rows as Opportunity[], []);
  return useLiveQuery(() => db.opportunities.toArray(), []);
}

export function useKnowledge(): KnowledgeCard[] | undefined {
  if (isCloud) {
    return useCloudQuery('knowledge', (rows) => (rows as KnowledgeCard[]).slice().sort((a, b) => b.createdAt - a.createdAt), []);
  }
  return useLiveQuery(() => db.knowledge.orderBy('createdAt').reverse().toArray(), []);
}

export async function getKnowledgeForProject(projectId: string): Promise<KnowledgeCard[]> {
  if (isCloud) {
    const all = await cloudListAll<KnowledgeCard>('knowledge');
    return all.filter((c) => c.projectId === projectId);
  }
  return db.knowledge.where('projectId').equals(projectId).toArray();
}

// ===========================================================================
// Mutations
// ===========================================================================

export async function putProject(p: Project): Promise<void> {
  if (isCloud) return cloudUpsert('projects', p);
  await db.projects.put(p);
}

export async function deleteProjectCascade(projectId: string): Promise<void> {
  if (isCloud) {
    const procs = (await cloudListAll<Process>('processes')).filter((p) => p.projectId === projectId);
    const procIds = new Set(procs.map((p) => p.id));
    const opps = (await cloudListAll<Opportunity>('opportunities')).filter((o) => procIds.has(o.processId));
    const know = (await cloudListAll<KnowledgeCard>('knowledge')).filter((k) => k.projectId === projectId);
    await cloudDeleteIds('opportunities', opps.map((o) => o.id));
    await cloudDeleteIds('processes', procs.map((p) => p.id));
    await cloudDeleteIds('knowledge', know.map((k) => k.id));
    await cloudDeleteIds('projects', [projectId]);
    return;
  }
  await db.transaction('rw', db.projects, db.processes, db.opportunities, db.knowledge, async () => {
    const procs = await db.processes.where('projectId').equals(projectId).toArray();
    for (const p of procs) await db.opportunities.where('processId').equals(p.id).delete();
    await db.processes.where('projectId').equals(projectId).delete();
    await db.knowledge.where('projectId').equals(projectId).delete();
    await db.projects.delete(projectId);
  });
}

export async function putProcess(p: Process): Promise<void> {
  const withTs = { ...p, updatedAt: now() };
  if (isCloud) return cloudUpsert('processes', withTs);
  await db.processes.put(withTs);
}

export async function deleteProcessCascade(processId: string): Promise<void> {
  if (isCloud) {
    const opps = (await cloudListAll<Opportunity>('opportunities')).filter((o) => o.processId === processId);
    const know = (await cloudListAll<KnowledgeCard>('knowledge')).filter((k) => k.processId === processId);
    await cloudDeleteIds('opportunities', opps.map((o) => o.id));
    await cloudDeleteIds('knowledge', know.map((k) => k.id));
    await cloudDeleteIds('processes', [processId]);
    return;
  }
  await db.transaction('rw', db.processes, db.opportunities, db.knowledge, async () => {
    await db.opportunities.where('processId').equals(processId).delete();
    await db.knowledge.where('processId').equals(processId).delete();
    await db.processes.delete(processId);
  });
}

export async function putOpportunity(o: Opportunity): Promise<void> {
  if (isCloud) return cloudUpsert('opportunities', o);
  await db.opportunities.put(o);
}

export async function deleteOpportunity(id: string): Promise<void> {
  if (isCloud) return cloudDeleteIds('opportunities', [id]);
  await db.opportunities.delete(id);
}

/** Replace AI-sourced opportunities for a process (keeps human-added ones). */
export async function replaceAiOpportunities(processId: string, fresh: Opportunity[]): Promise<void> {
  if (isCloud) {
    const stale = (await cloudListAll<Opportunity>('opportunities')).filter((o) => o.processId === processId && o.source === 'ai');
    await cloudDeleteIds('opportunities', stale.map((o) => o.id));
    await cloudUpsertMany('opportunities', fresh);
    return;
  }
  await db.opportunities.where('processId').equals(processId).filter((o) => o.source === 'ai').delete();
  await db.opportunities.bulkPut(fresh);
}

export async function putKnowledge(card: KnowledgeCard): Promise<void> {
  if (isCloud) return cloudUpsert('knowledge', card);
  await db.knowledge.put(card);
}

export async function putKnowledgeMany(cards: KnowledgeCard[]): Promise<void> {
  if (isCloud) return cloudUpsertMany('knowledge', cards);
  await db.knowledge.bulkPut(cards);
}

export async function deleteKnowledge(id: string): Promise<void> {
  if (isCloud) return cloudDeleteIds('knowledge', [id]);
  await db.knowledge.delete(id);
}

// ===========================================================================
// Demo + reset
// ===========================================================================

export async function loadDemo(): Promise<Project> {
  const { project, process, opportunities } = buildDemo();
  if (isCloud) {
    await cloudUpsert('projects', project);
    await cloudUpsert('processes', process);
    await cloudUpsertMany('opportunities', opportunities);
  } else {
    await db.projects.put(project);
    await db.processes.put(process);
    await db.opportunities.bulkPut(opportunities);
  }
  return project;
}

export async function clearAllData(): Promise<void> {
  if (isCloud) {
    if (!supabase) return;
    const ws = requireWs();
    for (const table of ['opportunities', 'processes', 'knowledge', 'projects'] as CloudTable[]) {
      await supabase.from(table).delete().eq('workspace_id', ws);
    }
    bumpSync();
    return;
  }
  await db.delete();
}
