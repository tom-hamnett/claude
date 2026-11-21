import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Contact, Funnel, Settings, Thread } from '../types';
import { dmUrl, markResume, markSent, redraft, stageOf, stopThread, undoSent } from '../lib/actions';
import { lintMessage, wordCount } from '../lib/draft';
import { scoreContact, summariseEngagements } from '../lib/score';
import { Button, Card, Chip, copyText, useToast } from './ui';

/**
 * One drafted message, ready to go. The primary button copies the text,
 * logs the person as contacted, schedules the follow-up and opens their
 * Instagram DM thread, so sending is: tap, long-press, paste, send.
 */
export function MessageCard({ thread, contact, funnel, settings }: { thread: Thread; contact: Contact; funnel: Funnel; settings: Settings }) {
  const toast = useToast();
  const stage = stageOf(funnel, thread.stageId)!;
  const [text, setText] = useState(thread.draft ?? '');
  const [showWhy, setShowWhy] = useState(false);
  useEffect(() => setText(thread.draft ?? ''), [thread.draft]);
  const report = useLiveQuery(() => (thread.reportId ? db.reports.get(thread.reportId) : undefined), [thread.reportId]);
  const issues = useMemo(() => lintMessage(text, stage, settings), [text, stage, settings]);
  const blocked = issues.some((i) => i.level === 'block');
  const score = scoreContact(contact, settings);
  const words = wordCount(text);

  async function send() {
    if (!(await copyText(text))) {
      toast('Could not copy. Long-press the message to copy it.');
      return;
    }
    const snapshot = structuredClone(thread);
    await markSent(snapshot, text);
    toast(`Copied. Logged @${contact.handle} as contacted.`, () => undoSent(snapshot));
    const url = dmUrl(contact.handle, settings.dmOpen ?? 'web');
    const phone = /Android|iPhone|iPad/i.test(navigator.userAgent);
    // Coming back should land on Today with the next card on top, wherever the OS reopens us.
    markResume();
    if (phone) window.location.href = url;
    else window.open(url, '_blank', 'noopener');
  }

  async function shareReport() {
    if (!report?.pdfUrl && !report?.imageUrls?.length) return;
    try {
      const urls = report.imageUrls?.length ? report.imageUrls : [report.pdfUrl!];
      const files = await Promise.all(
        urls.map(async (u, i) => {
          const blob = await (await fetch(u)).blob();
          const ext = blob.type.includes('pdf') ? 'pdf' : 'png';
          return new File([blob], `example-${report.subject.replace(/\W+/g, '-')}-${i + 1}.${ext}`, { type: blob.type });
        }),
      );
      if (navigator.canShare?.({ files })) {
        await navigator.share({ files });
        return;
      }
    } catch {
      /* fall back to opening the link */
    }
    window.open(report.pdfUrl ?? report.imageUrls![0], '_blank', 'noopener');
  }

  return (
    <Card className="p-0">
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <Link to={`/t/${thread.id}`} className="min-w-0">
          <p className="truncate font-display text-[17px] font-bold text-ink">@{contact.handle}</p>
          <p className="truncate text-[13px] text-ink-soft">
            {[contact.role, contact.employer].filter(Boolean).join(' · ') || contact.name || 'No profile details yet'}
          </p>
        </Link>
        <button onClick={() => setShowWhy((v) => !v)} className="shrink-0" aria-label="Why this score">
          <Chip tone="brand">{score.total}</Chip>
        </button>
      </div>
      {showWhy && (
        <ul className="mx-4 mt-2 space-y-0.5 rounded-xl bg-paper p-3 text-xs text-ink-soft">
          {score.parts.map((p) => (
            <li key={p.label} className="flex justify-between gap-2">
              <span>{p.label}</span>
              <span className="font-mono">+{p.points}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5 px-4">
        <Chip tone="dark">{stage.name}</Chip>
        <Chip>{summariseEngagements(contact.engagements) || 'no engagement logged'}</Chip>
        {!contact.followsUs && <Chip tone="signal">Request folder: one message only</Chip>}
        {thread.draftBy === 'claude' && <Chip tone="brand">Claude draft</Chip>}
      </div>

      <div className="px-4 pt-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={Math.min(8, Math.max(3, Math.ceil(text.length / 38)))}
          className="w-full resize-none rounded-xl border border-line bg-white p-3 text-[15px] leading-relaxed text-ink outline-none focus:border-brand"
        />
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className={`font-mono ${words > stage.maxWords ? 'text-danger' : 'text-ink-faint'}`}>
            {words}/{stage.maxWords} words
          </span>
          {issues.map((i) => (
            <Chip key={i.msg} tone={i.level === 'block' ? 'danger' : 'signal'}>
              {i.msg}
            </Chip>
          ))}
        </div>
      </div>

      {stage.attachReport && (
        <div className="mx-4 mt-3 rounded-xl border border-line bg-paper p-3 text-sm">
          {report?.status === 'ready' ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-ink-soft">
                Example: <b className="text-ink">{report.subject}</b>
                {report.view === 'function' && report.func ? ` · ${report.func}` : ' · whole company'}
              </span>
              <Button kind="secondary" onClick={shareReport} className="min-h-[36px] px-3">
                Share report
              </Button>
            </div>
          ) : (
            <span className="text-ink-soft">Report {report?.status ?? 'not requested'}{report?.note ? `: ${report.note}` : ''}</span>
          )}
        </div>
      )}

      <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-2 border-t border-line p-3">
        <Button kind="primary" onClick={send} disabled={blocked || !text.trim()}>
          Copy &amp; open DM
        </Button>
        <Button kind="ghost" onClick={async () => setText((await redraft(structuredClone(thread))).draft ?? '')} className="px-3">
          Redraft
        </Button>
        <Button
          kind="ghost"
          className="px-3"
          onClick={async () => {
            const snap = structuredClone(thread);
            await stopThread(snap);
            toast(`Skipped @${contact.handle}.`, () => db.threads.put(thread));
          }}
        >
          Skip
        </Button>
      </div>
    </Card>
  );
}
