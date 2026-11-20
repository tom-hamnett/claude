import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db, getSettings } from '../db';
import { advance, enrolTop, stageOf } from '../lib/actions';
import { scoreContact } from '../lib/score';
import { MessageCard } from '../components/MessageCard';
import { Button, Card, Chip, Empty, SectionTitle, timeAgo, useToast } from '../components/ui';

export function TodayPage() {
  const toast = useToast();
  const data = useLiveQuery(async () => {
    const [settings, threads, contacts, funnels] = await Promise.all([getSettings(), db.threads.toArray(), db.contacts.toArray(), db.funnels.toArray()]);
    return { settings, threads, contacts: new Map(contacts.map((c) => [c.id, c])), funnels: new Map(funnels.map((f) => [f.id, f])), contactCount: contacts.length };
  });
  if (!data) return null;
  const { settings, threads, contacts, funnels } = data;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const todayIso = start.toISOString();
  const sent = threads.reduce((n, t) => n + t.history.filter((h) => h.dir === 'out' && h.at >= todayIso).length, 0);
  const newConvs = threads.filter((t) => (t.history.find((h) => h.dir === 'out')?.at ?? '') >= todayIso).length;
  const now = new Date().toISOString();

  const ready = threads
    .filter((t) => t.status === 'ready' && contacts.get(t.contactId))
    .map((t) => ({ t, c: contacts.get(t.contactId)!, score: scoreContact(contacts.get(t.contactId)!, settings).total }))
    // replies in progress first, then by score
    .sort((a, b) => Number(b.t.history.length > 0) - Number(a.t.history.length > 0) || b.score - a.score);
  const due = threads.filter((t) => t.status === 'waiting' && t.dueAt && t.dueAt <= now);
  const waitingReport = threads.filter((t) => t.status === 'to_draft');
  const capHit = newConvs >= settings.dailyCap;
  const activeFunnel = [...funnels.values()].find((f) => f.active);

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="New today" value={`${newConvs}/${settings.dailyCap}`} warn={capHit} />
        <Stat label="Sent today" value={String(sent)} />
        <Stat label="Ready" value={String(ready.length)} />
      </div>

      {due.length > 0 && (
        <>
          <SectionTitle aside={<Chip tone="signal">{due.length}</Chip>}>Follow-ups due</SectionTitle>
          <div className="space-y-2">
            {due.map((t) => {
              const c = contacts.get(t.contactId);
              const f = funnels.get(t.funnelId);
              if (!c || !f) return null;
              return (
                <Card key={t.id} className="flex items-center justify-between gap-3 py-3">
                  <Link to={`/t/${t.id}`} className="min-w-0">
                    <p className="truncate font-semibold">@{c.handle}</p>
                    <p className="text-xs text-ink-soft">
                      {stageOf(f, t.stageId)?.name} · sent {timeAgo(t.history.filter((h) => h.dir === 'out').at(-1)?.at)}
                    </p>
                  </Link>
                  <div className="flex shrink-0 gap-1.5">
                    <Link to={`/t/${t.id}?reply=1`}>
                      <Button className="min-h-[38px] px-3">Replied</Button>
                    </Link>
                    <Button kind="primary" className="min-h-[38px] px-3" onClick={() => advance(structuredClone(t), 'no_reply')}>
                      No reply
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <SectionTitle aside={capHit ? <Chip tone="signal">Daily cap reached</Chip> : undefined}>Ready to send</SectionTitle>
      {ready.length === 0 ? (
        <Empty title="Nothing drafted yet">
          {data.contactCount === 0 ? (
            <p>
              Import leads first: <Link className="font-semibold text-brand" to="/more">More → Import</Link>.
            </p>
          ) : activeFunnel ? (
            <Button
              kind="primary"
              className="mt-3"
              onClick={async () => {
                const n = await enrolTop(activeFunnel.id);
                toast(n ? `Drafted messages for the top ${n}.` : 'Everyone scored is already in this funnel.');
              }}
            >
              Draft for top {settings.topN}
            </Button>
          ) : null}
        </Empty>
      ) : (
        <div className="space-y-3">
          {ready.map(({ t, c }) => {
            const f = funnels.get(t.funnelId);
            return f ? <MessageCard key={t.id} thread={t} contact={c} funnel={f} settings={settings} /> : null;
          })}
        </div>
      )}

      {waitingReport.length > 0 && (
        <>
          <SectionTitle>Waiting on a report</SectionTitle>
          <Card className="space-y-1 py-3 text-sm">
            {waitingReport.map((t) => (
              <Link key={t.id} to={`/t/${t.id}`} className="block text-ink-soft">
                @{contacts.get(t.contactId)?.handle}: {t.interestCompanies[0] ?? contacts.get(t.contactId)?.employer ?? 'company not named yet'}
              </Link>
            ))}
            <p className="pt-1 text-xs text-ink-faint">Reports are built by the daily Claude run and appear here when ready.</p>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`rounded-2xl border px-3 py-2.5 ${warn ? 'border-signal/40 bg-signal-soft' : 'border-line bg-surface'}`}>
      <p className="font-display text-xl font-bold tabular-nums text-ink">{value}</p>
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">{label}</p>
    </div>
  );
}
