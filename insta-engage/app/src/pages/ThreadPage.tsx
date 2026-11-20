import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { db, getSettings } from '../db';
import type { Intent } from '../types';
import { advance, stageOf } from '../lib/actions';
import { MessageCard } from '../components/MessageCard';
import { Button, Card, Chip, Field, SectionTitle, inputCls, timeAgo, useToast } from '../components/ui';

export const INTENTS: { id: Intent; label: string }[] = [
  { id: 'interested', label: 'Interested' },
  { id: 'yes', label: 'Yes' },
  { id: 'named_company', label: 'Named a company' },
  { id: 'question', label: 'Asked a question' },
  { id: 'not_now', label: 'Not now' },
  { id: 'no', label: 'No / stop' },
];

export function ThreadPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const toast = useToast();
  const data = useLiveQuery(async () => {
    const t = await db.threads.get(id!);
    if (!t) return null;
    const [c, f, s, r] = await Promise.all([db.contacts.get(t.contactId), db.funnels.get(t.funnelId), getSettings(), t.reportId ? db.reports.get(t.reportId) : undefined]);
    return { t, c, f, s, r };
  }, [id]);
  const [reply, setReply] = useState('');
  const [intent, setIntent] = useState<Intent | null>(null);
  const [companies, setCompanies] = useState('');
  const [func, setFunc] = useState('');
  const [open, setOpen] = useState(params.get('reply') === '1');

  if (data === undefined) return null;
  if (!data || !data.c || !data.f) return <p>Not found.</p>;
  const { t, c, f, s, r } = data;
  const stage = stageOf(f, t.stageId);

  async function submit() {
    const list = companies.split(',').map((x) => x.trim()).filter(Boolean);
    const eff: Intent | null = list.length && intent !== 'no' ? 'named_company' : intent;
    if (!eff) return;
    const next = await advance(structuredClone(t), eff, reply.trim(), list, func || undefined);
    setReply('');
    setIntent(null);
    setCompanies('');
    setOpen(false);
    toast(next.status === 'stopped' ? 'Logged. Conversation closed.' : `Logged. Moved to "${stageOf(f, next.stageId)?.name}".`);
  }

  return (
    <div>
      <Link to={`/c/${c.id}`} className="block">
        <p className="font-display text-2xl font-bold">@{c.handle}</p>
        <p className="text-sm text-ink-soft">{[c.name, c.role, c.employer].filter(Boolean).join(' · ')}</p>
      </Link>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Chip tone="dark">{f.name}</Chip>
        <Chip tone="brand">{stage?.name}</Chip>
        <Chip>{t.status === 'to_draft' ? 'needs report' : t.status}</Chip>
        {t.dueAt && <Chip tone="signal">follow-up {timeAgo(t.dueAt)}</Chip>}
      </div>

      {t.status === 'ready' && t.draft !== undefined && (
        <div className="mt-4">
          <MessageCard thread={t} contact={c} funnel={f} settings={s} />
        </div>
      )}

      {(t.status === 'waiting' || t.status === 'replied' || t.status === 'ready') && (
        <>
          <SectionTitle>They replied?</SectionTitle>
          {!open ? (
            <Button className="w-full" onClick={() => setOpen(true)}>
              Log their reply
            </Button>
          ) : (
            <Card className="space-y-3">
              <Field label="Their reply (paste, optional)">
                <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} className={inputCls} />
              </Field>
              <div className="flex flex-wrap gap-1.5">
                {INTENTS.map((i) => (
                  <Chip key={i.id} active={intent === i.id} onClick={() => setIntent(i.id)}>
                    {i.label}
                  </Chip>
                ))}
              </div>
              <Field label="Companies they mentioned" hint="Comma separated. The first becomes the report subject.">
                <input value={companies} onChange={(e) => setCompanies(e.target.value)} className={inputCls} placeholder={c.employer ?? 'e.g. Atlassian'} />
              </Field>
              <Field label="Function they care about (optional)" hint={`Over ${s.cohortThreshold.toLocaleString()} staff gets a function view; smaller companies get the whole company.`}>
                <input value={func} onChange={(e) => setFunc(e.target.value)} className={inputCls} placeholder={c.func ?? 'procurement, finance, whole company…'} />
              </Field>
              <Button kind="primary" className="w-full" disabled={!intent && !companies} onClick={submit}>
                Log and draft next message
              </Button>
            </Card>
          )}
        </>
      )}

      {r && (
        <>
          <SectionTitle>Report</SectionTitle>
          <Card className="text-sm">
            <p>
              <b>{r.subject || 'No company yet'}</b> · {r.view === 'function' ? `${r.func} function` : 'whole company'} · <span className="text-ink-soft">{r.status}</span>
            </p>
            {r.peers.length > 0 && <p className="mt-1 text-ink-soft">Peers: {r.peers.join(', ')}</p>}
            {r.note && <p className="mt-1 text-ink-faint">{r.note}</p>}
            {r.pdfUrl && (
              <a className="mt-2 inline-block font-semibold text-brand" href={r.pdfUrl} target="_blank" rel="noreferrer">
                Open PDF
              </a>
            )}
          </Card>
        </>
      )}

      <SectionTitle>History</SectionTitle>
      <div className="space-y-2">
        {t.history.length === 0 && <p className="px-1 text-sm text-ink-faint">Nothing sent yet.</p>}
        {[...t.history].reverse().map((h, i) => (
          <div key={i} className={`rounded-2xl px-3.5 py-2.5 text-sm ${h.dir === 'out' ? 'ml-8 bg-brand text-white' : h.dir === 'in' ? 'mr-8 bg-surface border border-line' : 'bg-paper text-ink-faint'}`}>
            <p className="whitespace-pre-wrap">{h.text || <i>(no text)</i>}</p>
            <p className={`mt-1 text-[11px] ${h.dir === 'out' ? 'text-white/70' : 'text-ink-faint'}`}>
              {stageOf(f, h.stageId)?.name} · {timeAgo(h.at)}
              {h.intent ? ` · ${h.intent.replace('_', ' ')}` : ''}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
