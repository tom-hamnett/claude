import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getSettings, now } from '../db';
import type { Evidence, Mark, Person } from '../types';
import { Icon } from '../components/Icon';
import { Avatar } from '../components/Avatar';
import { fmtDateTime, formatMark, labelForValue, buildCSV, downloadFile } from '../lib/format';
import { ConfirmDialog } from '../components/Modal';
import { EvidenceTile } from '../components/EvidenceCapture';
import { SignaturePadModal } from '../components/SignaturePad';
import { AIBadge } from '../components/AIBadge';
import { PaywallModal } from '../components/PaywallModal';
import { draftReport } from '../services/sigmaAI';
import { canUseAI } from '../services/license';
import { AIError } from '../services/ai';

type Audience = 'parent' | 'manager' | 'trainee' | 'client' | 'self';

export default function SessionResultsPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const session = useLiveQuery(() => db.sessions.get(id), [id]);
  const group = useLiveQuery(
    () => (session ? db.groups.get(session.groupId) : undefined),
    [session?.groupId],
  );
  const people = useLiveQuery(
    async () => {
      if (!session) return [];
      return db.people.where('groupId').equals(session.groupId).sortBy('name');
    },
    [session?.groupId],
  );
  const marks = useLiveQuery(() => db.marks.where('sessionId').equals(id).toArray(), [id]);
  const evidence = useLiveQuery(() => db.evidence.where('sessionId').equals(id).toArray(), [id]);
  const settings = useLiveQuery(() => getSettings(), []);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showSign, setShowSign] = useState(false);
  const [draftBusy, setDraftBusy] = useState(false);
  const [draftAudience, setDraftAudience] = useState<Audience>('parent');
  const [draftError, setDraftError] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState<string | undefined>();

  const personMap = useMemo(() => {
    const map = new Map<string, Map<string, Mark>>();
    for (const m of marks ?? []) {
      if (!map.has(m.personId)) map.set(m.personId, new Map());
      map.get(m.personId)!.set(m.criterionId, m);
    }
    return map;
  }, [marks]);

  const evidenceById = useMemo(() => {
    const map = new Map<string, Evidence>();
    for (const e of evidence ?? []) map.set(e.id, e);
    return map;
  }, [evidence]);

  const signatureEv = session?.signatureEvidenceId
    ? evidenceById.get(session.signatureEvidenceId)
    : undefined;

  const peopleWithMarks: Person[] = (people ?? []).filter((p) => personMap.has(p.id));

  const personAvg = (p: Person): number | undefined => {
    if (!people) return undefined;
    const m = personMap.get(p.id);
    if (!m || m.size === 0) return undefined;
    let sum = 0;
    for (const v of m.values()) sum += v.value;
    return sum / m.size;
  };

  const criterionStats = (session?.criteria ?? []).map((c) => {
    const vals: number[] = [];
    for (const pm of personMap.values()) {
      const mk = pm.get(c.id);
      if (mk) vals.push(mk.value);
    }
    const avg = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : undefined;
    return { criterion: c, count: vals.length, avg };
  });

  const commentCount = useMemo(
    () => (marks ?? []).filter((m) => m.comment && m.comment.trim().length > 0).length,
    [marks],
  );
  const evidenceCount = evidence?.length ?? 0;

  if (!session) return <div className="text-ink-500">Loading…</div>;

  const exportCSV = () => {
    const header = ['Person', ...session.criteria.map((c) => c.name), 'Average', 'Comments', 'Evidence'];
    const rows = (people ?? []).map((p) => {
      const m = personMap.get(p.id);
      const cells = session.criteria.map((c) => {
        const mk = m?.get(c.id);
        return mk ? formatMark(mk.value, session.scale) : '';
      });
      const avg = personAvg(p);
      const comments = session.criteria
        .map((c) => {
          const mk = m?.get(c.id);
          return mk?.comment ? `${c.name}: ${mk.comment}` : '';
        })
        .filter(Boolean)
        .join(' | ');
      const evCount = session.criteria
        .map((c) => m?.get(c.id)?.evidenceIds?.length ?? 0)
        .reduce((s, n) => s + n, 0);
      return [
        p.name,
        ...cells,
        avg !== undefined ? avg.toFixed(2) : '',
        comments,
        evCount > 0 ? `${evCount} attached` : '',
      ];
    });
    const csv = buildCSV([header, ...rows]);
    const filename = `${session.title.replace(/[^\w]+/g, '-')}_${new Date(session.date)
      .toISOString()
      .slice(0, 10)}.csv`;
    downloadFile(filename, csv);
  };

  const deleteSession = async () => {
    await db.transaction('rw', db.sessions, db.marks, db.evidence, async () => {
      await db.marks.where('sessionId').equals(session.id).delete();
      await db.evidence.where('sessionId').equals(session.id).delete();
      await db.sessions.delete(session.id);
    });
    navigate('/sessions');
  };

  const generateDraft = async () => {
    if (!people) return;
    setDraftBusy(true);
    setDraftError(null);
    try {
      const gate = await canUseAI();
      if (!gate.ok) {
        setDraftBusy(false);
        setPaywallReason(gate.reason);
        setShowPaywall(true);
        return;
      }
      const r = await draftReport({
        session,
        group: { name: group?.name ?? 'Group', vertical: group?.vertical ?? settings?.defaultVertical },
        people,
        marks: marks ?? [],
        audience: draftAudience,
      });
      await db.sessions.update(session.id, {
        aiNarrative: { draftedAt: now(), provider: r.provider, model: r.model, markdown: r.markdown },
        updatedAt: now(),
      });
    } catch (err) {
      setDraftError(err instanceof AIError ? err.message : err instanceof Error ? err.message : 'Draft failed.');
    } finally {
      setDraftBusy(false);
    }
  };

  const copyDraft = async () => {
    if (!session.aiNarrative) return;
    try {
      await navigator.clipboard.writeText(session.aiNarrative.markdown);
    } catch {
      /* ignore */
    }
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 print:hidden">
        <Link to="/sessions" className="btn-ghost">
          <Icon name="chevron-left" size={18} />
          Sessions
        </Link>
      </div>

      <div className="card p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`chip ${
                  session.status === 'complete'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {session.status === 'complete' ? 'Complete' : 'In progress'}
              </span>
              {commentCount > 0 ? <span className="chip">{commentCount} comments</span> : null}
              {evidenceCount > 0 ? (
                <span className="chip-brand">
                  <Icon name="camera" size={12} />
                  {evidenceCount} evidence
                </span>
              ) : null}
            </div>
            <h1 className="mt-2 text-2xl font-extrabold text-ink-800 truncate">{session.title}</h1>
            <div className="text-ink-500 text-sm mt-1">
              {group?.name ?? '—'} · {fmtDateTime(session.date)}
            </div>
            {session.notes ? (
              <div className="mt-3 p-3 rounded-xl bg-ink-50 text-ink-700 text-sm whitespace-pre-wrap">
                {session.notes}
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 shrink-0 print:hidden">
            <Link to={`/sessions/${session.id}/assess`} className="btn-secondary">
              <Icon name="pencil" size={16} />
              Edit marks
            </Link>
            <button className="btn-secondary" onClick={exportCSV}>
              <Icon name="export" size={16} />
              Export CSV
            </button>
            <button className="btn-secondary" onClick={printReport}>
              <Icon name="document" size={16} />
              Print / PDF
            </button>
            <button className="btn-secondary" onClick={() => setShowSign(true)}>
              <Icon name="signature" size={16} />
              {signatureEv ? 'Re-sign' : 'Sign off'}
            </button>
            <button
              className="btn-danger"
              onClick={() =>
                window.confirm('Delete this session? All marks and evidence will be removed.') &&
                deleteSession()
              }
            >
              <Icon name="trash" size={16} />
              Delete
            </button>
          </div>
        </div>
      </div>

      <AIDraftCard
        session={session}
        draftAudience={draftAudience}
        setDraftAudience={setDraftAudience}
        draftBusy={draftBusy}
        draftError={draftError}
        generateDraft={generateDraft}
        copyDraft={copyDraft}
      />

      <section>
        <h2 className="font-bold text-ink-800 mb-2">Criterion averages</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {criterionStats.map((s) => (
            <div key={s.criterion.id} className="card p-4">
              <div className="font-semibold text-ink-800 truncate">{s.criterion.name}</div>
              <div className="mt-2 flex items-end justify-between">
                <div className="text-3xl font-extrabold text-ink-800 tabular-nums">
                  {s.avg !== undefined ? s.avg.toFixed(1) : '—'}
                </div>
                <div className="text-xs text-ink-500 text-right">
                  <div>{s.count} marks</div>
                  {s.avg !== undefined ? (
                    <div className="font-semibold text-brand-600">
                      {labelForValue(Math.round(s.avg), session.scale) ?? ''}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-bold text-ink-800 mb-2">Per-person marks</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-ink-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left p-3 font-semibold sticky left-0 bg-ink-50">Person</th>
                {session.criteria.map((c) => (
                  <th key={c.id} className="text-left p-3 font-semibold whitespace-nowrap">
                    {c.name}
                  </th>
                ))}
                <th className="text-left p-3 font-semibold">Avg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {(people ?? []).map((p) => {
                const m = personMap.get(p.id);
                const avg = personAvg(p);
                return (
                  <tr key={p.id} className={!m ? 'opacity-50' : ''}>
                    <td className="p-3 sticky left-0 bg-white">
                      <div className="flex items-center gap-2">
                        <Avatar name={p.name} size={28} />
                        <span className="font-semibold text-ink-800">{p.name}</span>
                      </div>
                    </td>
                    {session.criteria.map((c) => {
                      const mk = m?.get(c.id);
                      return (
                        <td key={c.id} className="p-3 tabular-nums">
                          {mk ? (
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-ink-800">
                                {formatMark(mk.value, session.scale)}
                              </span>
                              {mk.evidenceIds && mk.evidenceIds.length > 0 ? (
                                <span className="text-brand-500" title={`${mk.evidenceIds.length} evidence`}>
                                  <Icon name="camera" size={12} />
                                </span>
                              ) : null}
                              {mk.comment ? (
                                <span className="text-ink-400" title={mk.comment}>
                                  <Icon name="document" size={12} />
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-ink-300">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="p-3 tabular-nums font-bold text-ink-800">
                      {avg !== undefined ? avg.toFixed(1) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {peopleWithMarks.length === 0 && (
          <div className="text-ink-500 text-sm mt-3">No marks recorded yet.</div>
        )}
      </section>

      {evidenceCount > 0 && (
        <section className="print:hidden">
          <h2 className="font-bold text-ink-800 mb-2">Evidence ({evidenceCount})</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {(evidence ?? [])
              .filter((e) => e.kind !== 'signature')
              .map((ev) => (
                <EvidenceTile key={ev.id} evidence={ev} />
              ))}
          </div>
        </section>
      )}

      {signatureEv && (
        <section className="card p-4 print:break-inside-avoid">
          <div className="font-bold text-ink-800 mb-2 flex items-center gap-2">
            <Icon name="signature" size={18} />
            Signed off
            {signatureEv.transcript ? (
              <span className="text-ink-500 text-sm font-normal">— {signatureEv.transcript}</span>
            ) : null}
          </div>
          <SignaturePreview evidence={signatureEv} />
          <div className="text-xs text-ink-400 mt-2">
            Captured {fmtDateTime(signatureEv.capturedAt)}
          </div>
        </section>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this session?"
        message="All marks and evidence for this session will be deleted. This can't be undone."
        confirmLabel="Delete session"
        onConfirm={deleteSession}
        onClose={() => setConfirmDelete(false)}
      />

      <SignaturePadModal
        open={showSign}
        onClose={() => setShowSign(false)}
        sessionId={session.id}
        onSave={async (evId) => {
          await db.sessions.update(session.id, { signatureEvidenceId: evId, updatedAt: now() });
        }}
      />

      <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} reason={paywallReason} />
    </div>
  );
}

function SignaturePreview({ evidence }: { evidence: Evidence }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const u = URL.createObjectURL(evidence.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [evidence.blob]);
  return <img src={url} alt="Signature" className="max-h-32 bg-white border border-ink-100 rounded-lg" />;
}

function AIDraftCard({
  session,
  draftAudience,
  setDraftAudience,
  draftBusy,
  draftError,
  generateDraft,
  copyDraft,
}: {
  session: { aiNarrative?: { draftedAt: number; provider: string; model: string; markdown: string } };
  draftAudience: Audience;
  setDraftAudience: (a: Audience) => void;
  draftBusy: boolean;
  draftError: string | null;
  generateDraft: () => void;
  copyDraft: () => void;
}) {
  const audiences: { id: Audience; label: string }[] = [
    { id: 'parent', label: 'Parent' },
    { id: 'manager', label: 'Manager' },
    { id: 'trainee', label: 'Trainee/Subject' },
    { id: 'client', label: 'External client' },
    { id: 'self', label: 'My notes' },
  ];

  return (
    <section className="ai-card print:bg-white print:border-ink-200">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-ink-800">AI report drafter</h2>
            <AIBadge provider={session.aiNarrative?.provider} model={session.aiNarrative?.model} />
          </div>
          <div className="text-sm text-ink-600 mt-1">
            Turn this session's marks and comments into a polished narrative for the audience you choose.
          </div>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          {session.aiNarrative ? (
            <button className="btn-secondary" onClick={copyDraft}>
              <Icon name="copy" size={14} />
              Copy
            </button>
          ) : null}
          <button className="btn-primary" onClick={generateDraft} disabled={draftBusy}>
            {draftBusy ? 'Drafting…' : session.aiNarrative ? 'Re-draft' : 'Draft report'}
            {!draftBusy && <Icon name="sparkles" size={16} />}
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 flex-wrap print:hidden">
        {audiences.map((a) => (
          <button
            key={a.id}
            onClick={() => setDraftAudience(a.id)}
            className={`chip ${draftAudience === a.id ? 'chip-brand' : ''}`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {draftError ? (
        <div className="text-sm text-hot-600 mt-3 print:hidden">{draftError}</div>
      ) : null}

      {session.aiNarrative ? (
        <article className="mt-4 prose prose-sm max-w-none whitespace-pre-wrap text-ink-700 leading-relaxed">
          {session.aiNarrative.markdown}
        </article>
      ) : (
        <div className="mt-3 text-sm text-ink-500 print:hidden">
          No draft yet. Pick an audience and tap Draft report.
        </div>
      )}
    </section>
  );
}
