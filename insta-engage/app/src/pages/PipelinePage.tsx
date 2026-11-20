import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '../db';
import { Card, Chip, Empty, timeAgo } from '../components/ui';
import type { ThreadStatus } from '../types';

const STATUS_TONE: Record<ThreadStatus, 'brand' | 'signal' | 'plain' | 'danger' | 'dark'> = {
  ready: 'brand',
  to_draft: 'signal',
  waiting: 'plain',
  replied: 'brand',
  stopped: 'danger',
  won: 'dark',
};

/** Funnel board: one lane per stage, people move down as they reply. */
export function PipelinePage() {
  const funnels = useLiveQuery(() => db.funnels.toArray()) ?? [];
  const [fid, setFid] = useState<string | null>(null);
  const funnel = funnels.find((f) => f.id === fid) ?? funnels.find((f) => f.active) ?? funnels[0];
  const [showStopped, setShowStopped] = useState(false);
  const data = useLiveQuery(async () => {
    if (!funnel) return null;
    const threads = await db.threads.where('funnelId').equals(funnel.id).toArray();
    const contacts = new Map((await db.contacts.bulkGet(threads.map((t) => t.contactId))).filter(Boolean).map((c) => [c!.id, c!]));
    return { threads, contacts };
  }, [funnel?.id]);
  if (!funnel) return <Empty title="No funnels yet" />;
  const threads = (data?.threads ?? []).filter((t) => showStopped || t.status !== 'stopped');

  return (
    <div>
      <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-2">
        {funnels.map((f) => (
          <Chip key={f.id} active={f.id === funnel.id} onClick={() => setFid(f.id)}>
            {f.name}
          </Chip>
        ))}
      </div>
      <div className="mb-3 flex items-center justify-between text-xs text-ink-soft">
        <span>{threads.length} people in this funnel</span>
        <button className="font-semibold text-brand" onClick={() => setShowStopped((v) => !v)}>
          {showStopped ? 'Hide stopped' : 'Show stopped'}
        </button>
      </div>
      <div className="space-y-4">
        {funnel.stages.map((s, i) => {
          const here = threads.filter((t) => t.stageId === s.id);
          return (
            <section key={s.id}>
              <div className="mb-1.5 flex items-center gap-2 px-1">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-navy font-mono text-[11px] text-white">{i + 1}</span>
                <h3 className="font-display text-[15px] font-bold">{s.name}</h3>
                <span className="ml-auto font-mono text-xs text-ink-faint">{here.length}</span>
              </div>
              {here.length === 0 ? (
                <p className="ml-8 text-xs text-ink-faint">Nobody here.</p>
              ) : (
                <Card className="ml-8 divide-y divide-line p-0">
                  {here.map((t) => {
                    const c = data?.contacts.get(t.contactId);
                    return (
                      <Link key={t.id} to={`/t/${t.id}`} className="flex items-center justify-between gap-2 px-3.5 py-2.5">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">@{c?.handle}</span>
                          <span className="block truncate text-xs text-ink-faint">
                            {c?.employer ?? '—'} · {timeAgo(t.updatedAt)}
                          </span>
                        </span>
                        <Chip tone={STATUS_TONE[t.status]}>{t.status === 'to_draft' ? 'needs report' : t.status}</Chip>
                      </Link>
                    );
                  })}
                </Card>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
