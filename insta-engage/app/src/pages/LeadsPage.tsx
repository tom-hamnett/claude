import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db, getSettings } from '../db';
import { enrolTop, scoreAll } from '../lib/actions';
import { summariseEngagements } from '../lib/score';
import { Button, Card, Chip, Empty, inputCls, useToast } from '../components/ui';

export function LeadsPage() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [content, setContent] = useState<string>('');
  const data = useLiveQuery(async () => ({
    contacts: await db.contacts.toArray(),
    settings: await getSettings(),
    content: await db.content.toArray(),
    funnels: await db.funnels.toArray(),
    enrolled: new Set((await db.threads.toArray()).map((t) => t.contactId)),
  }));
  const ranked = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    return scoreAll(data.contacts, data.settings).filter(
      ({ c }) =>
        (!content || c.engagements.some((e) => e.contentId === content)) &&
        (!needle || [c.handle, c.name, c.employer, c.role, c.func, c.bio].some((x) => x?.toLowerCase().includes(needle))),
    );
  }, [data, q, content]);
  if (!data) return null;
  const active = data.funnels.find((f) => f.active);

  return (
    <div>
      <div className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, company, role…" className={inputCls} />
      </div>
      {data.content.length > 0 && (
        <div className="no-scrollbar -mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4">
          <Chip active={!content} onClick={() => setContent('')}>
            All content
          </Chip>
          {data.content.map((ct) => (
            <Chip key={ct.id} active={content === ct.id} onClick={() => setContent(ct.id)}>
              {ct.title}
            </Chip>
          ))}
        </div>
      )}
      {active && (
        <Button
          kind="primary"
          className="mt-3 w-full"
          onClick={async () => {
            const n = await enrolTop(active.id);
            toast(n ? `Drafted first messages for the top ${n}. See Today.` : 'Nobody new to enrol.');
          }}
        >
          Draft first message for top {data.settings.topN} (not yet contacted)
        </Button>
      )}
      <p className="mt-3 px-1 text-xs text-ink-faint">{ranked.length} leads, ranked by priority. Tap a score to see why.</p>
      <div className="mt-2 space-y-2">
        {ranked.length === 0 && <Empty title="No leads yet">Import a collection run from More → Import.</Empty>}
        {ranked.map(({ c, score }, i) => (
          <Link key={c.id} to={`/c/${c.id}`} className="block">
            <Card className={`flex items-center gap-3 py-3 ${c.doNotContact ? 'opacity-50' : ''}`}>
              <span className="w-6 text-right font-mono text-xs text-ink-faint">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">
                  @{c.handle} {data.enrolled.has(c.id) && <span className="text-xs font-normal text-brand">· in funnel</span>}
                </p>
                <p className="truncate text-xs text-ink-soft">{[c.role, c.employer].filter(Boolean).join(' · ') || c.bio || '—'}</p>
                <p className="truncate text-[11px] text-ink-faint">{summariseEngagements(c.engagements)}</p>
              </div>
              <Chip tone={score.total >= 60 ? 'brand' : score.total >= 35 ? 'plain' : 'plain'}>{score.total}</Chip>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
