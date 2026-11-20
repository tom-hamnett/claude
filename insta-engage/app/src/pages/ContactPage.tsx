import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useParams } from 'react-router-dom';
import { db, getSettings, nowIso } from '../db';
import type { Contact, Motivation, Seniority } from '../types';
import { scoreContact } from '../lib/score';
import { Button, Card, Chip, Field, SectionTitle, inputCls, timeAgo, useToast } from '../components/ui';

const SENIORITY: Seniority[] = ['student', 'ic', 'senior_ic', 'manager', 'director', 'exec', 'founder', 'consultant', 'unknown'];
const MOTIVATIONS: { id: Motivation; label: string }[] = [
  { id: 'make_a_case', label: 'Making a case' },
  { id: 'promotion', label: 'Promotion' },
  { id: 'sell', label: 'Sells to companies' },
  { id: 'job_hunt', label: 'Job hunting' },
  { id: 'pitch', label: 'Pitching clients' },
  { id: 'invest', label: 'Investing / deals' },
  { id: 'board', label: 'Board question' },
  { id: 'learn', label: 'Learning' },
];

export function ContactPage() {
  const { id } = useParams();
  const toast = useToast();
  const data = useLiveQuery(async () => ({
    c: await db.contacts.get(id!),
    s: await getSettings(),
    threads: await db.threads.where('contactId').equals(id!).toArray(),
  }), [id]);
  const [draft, setDraft] = useState<Contact | null>(null);
  useEffect(() => {
    if (data?.c) setDraft(structuredClone(data.c));
  }, [data?.c?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!data || !draft) return null;
  const score = scoreContact(draft, data.s);
  const set = <K extends keyof Contact>(k: K, v: Contact[K]) => setDraft({ ...draft, [k]: v });

  async function save() {
    await db.contacts.put({ ...draft!, updatedAt: nowIso() });
    toast('Saved.');
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-2xl font-bold">@{draft.handle}</p>
          <a href={`https://instagram.com/${draft.handle}`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand">
            Open profile
          </a>
        </div>
        <Chip tone="brand">Score {score.total}</Chip>
      </div>
      {draft.bio && <p className="mt-2 rounded-xl bg-paper p-3 text-sm text-ink-soft">{draft.bio}</p>}

      {data.threads.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {data.threads.map((t) => (
            <Link key={t.id} to={`/t/${t.id}`}>
              <Chip tone="dark">Conversation · {t.status}</Chip>
            </Link>
          ))}
        </div>
      )}

      <SectionTitle>Why this score</SectionTitle>
      <Card className="space-y-1 py-3 text-sm">
        {score.parts.map((p) => (
          <div key={p.label} className="flex justify-between gap-2">
            <span className="text-ink-soft">{p.label}</span>
            <span className="font-mono">+{p.points}</span>
          </div>
        ))}
      </Card>

      <SectionTitle>Profile</SectionTitle>
      <Card className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Name">
            <input className={inputCls} value={draft.name ?? ''} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label="Seniority">
            <select className={inputCls} value={draft.seniority} onChange={(e) => set('seniority', e.target.value as Seniority)}>
              {SENIORITY.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Role / title">
          <input className={inputCls} value={draft.role ?? ''} onChange={(e) => set('role', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Employer (report subject)">
            <input className={inputCls} value={draft.employer ?? ''} onChange={(e) => set('employer', e.target.value)} />
          </Field>
          <Field label="Employer staff" hint={`Under ${data.s.cohortThreshold.toLocaleString()} → whole-company report`}>
            <input
              className={inputCls}
              inputMode="numeric"
              value={draft.employerStaff ?? ''}
              onChange={(e) => set('employerStaff', e.target.value ? Number(e.target.value.replace(/\D/g, '')) : undefined)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Function">
            <input className={inputCls} value={draft.func ?? ''} onChange={(e) => set('func', e.target.value)} placeholder="procurement" />
          </Field>
          <Field label="Sector">
            <input className={inputCls} value={draft.sector ?? ''} onChange={(e) => set('sector', e.target.value)} />
          </Field>
        </div>
        <Field label="What they are probably trying to do">
          <div className="flex flex-wrap gap-1.5">
            {MOTIVATIONS.map((m) => (
              <Chip
                key={m.id}
                active={draft.motivations.includes(m.id)}
                onClick={() => set('motivations', draft.motivations.includes(m.id) ? draft.motivations.filter((x) => x !== m.id) : [...draft.motivations, m.id])}
              >
                {m.label}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Interests" hint="Comma separated">
          <input className={inputCls} value={draft.interests.join(', ')} onChange={(e) => set('interests', e.target.value.split(',').map((x) => x.trim()).filter(Boolean))} />
        </Field>
        <Field label="Likely challenges" hint="Comma separated, in their words">
          <input className={inputCls} value={draft.challenges.join(', ')} onChange={(e) => set('challenges', e.target.value.split(',').map((x) => x.trim()).filter(Boolean))} />
        </Field>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={draft.followsUs} onClick={() => set('followsUs', !draft.followsUs)}>
            Follows us
          </Chip>
          <Chip active={draft.doNotContact} onClick={() => set('doNotContact', !draft.doNotContact)}>
            Do not contact
          </Chip>
        </div>
        <Field label="Notes">
          <textarea className={inputCls} rows={2} value={draft.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
        </Field>
        <Button kind="primary" className="w-full" onClick={save}>
          Save
        </Button>
      </Card>

      <SectionTitle>Engagement log</SectionTitle>
      <Card className="space-y-1 py-3 text-sm">
        {draft.engagements.length === 0 && <p className="text-ink-faint">None logged.</p>}
        {[...draft.engagements].sort((a, b) => b.at.localeCompare(a.at)).map((e, i) => (
          <p key={i} className="text-ink-soft">
            <b className="text-ink">{e.type}</b> {e.contentId ? `on ${e.contentId}` : ''} · {timeAgo(e.at)}
            {e.text ? `: "${e.text}"` : ''}
          </p>
        ))}
      </Card>
    </div>
  );
}
