import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, now, uid } from '../db';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import { AIError_, AIThinking, Spinner, useAIRun } from '../components/AIRun';
import { DRIVER } from '../lib/frameworks';
import { FLUX_SCHEMA_VERSION } from '../types';
import { buildProcess, mapProcessFromText, researchBenchmarks, runDiagnostic } from '../services/fluxAI';
import { computeMetrics } from '../lib/metrics';
import { fmtPct } from '../lib/format';
import type { DiagnosticSignal, Process, Project } from '../types';

export default function ProjectPage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const project = useLiveQuery(() => db.projects.get(id), [id]);
  const processes = useLiveQuery(() => db.processes.where('projectId').equals(id).toArray(), [id]);

  if (project === undefined) return <div className="text-ink-400">Loading…</div>;
  if (!project) return <div className="card p-8 text-center text-ink-400">Engagement not found.</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <Link to="/projects" className="mb-2 inline-flex items-center gap-1 text-sm text-ink-400 hover:text-ink-600">
          <Icon name="back" className="h-4 w-4" /> Engagements
        </Link>
        <h1 className="font-display text-2xl font-bold text-ink-900">{project.name}</h1>
        <p className="text-ink-500">
          {project.client} · {project.industry || '—'} · {project.scope || '—'}
        </p>
        {project.objective && <p className="mt-1 text-sm text-ink-500"><span className="font-medium">Objective:</span> {project.objective}</p>}
      </div>

      <DiagnosticPanel project={project} />
      <ProcessPanel project={project} processes={processes ?? []} onOpen={(p) => nav(`/processes/${p.id}`)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stage 1 — SPOT diagnostic
// ---------------------------------------------------------------------------

function DiagnosticPanel({ project }: { project: Project }) {
  const { loading, error, run } = useAIRun();
  const signals = project.diagnostic?.signals ?? [];
  const [draft, setDraft] = useState({ role: '', symptom: '', severity: 3, frequency: 3 });

  async function patch(p: Partial<Project>) {
    await db.projects.put({ ...project, ...p, updatedAt: now() });
  }

  async function addSignal() {
    if (!draft.symptom.trim()) return;
    const s: DiagnosticSignal = {
      id: uid(),
      role: draft.role.trim() || 'Unspecified',
      symptom: draft.symptom.trim(),
      severity: draft.severity,
      frequency: draft.frequency,
    };
    await patch({ diagnostic: { ...(project.diagnostic ?? { areas: [] }), signals: [...signals, s] } });
    setDraft({ role: '', symptom: '', severity: 3, frequency: 3 });
  }

  async function removeSignal(sid: string) {
    await patch({ diagnostic: { ...(project.diagnostic ?? { areas: [] }), signals: signals.filter((x) => x.id !== sid) } });
  }

  async function runScan() {
    await run(
      () => runDiagnostic(project, signals),
      (d) => patch({ diagnostic: d }),
    );
  }

  const areas = project.diagnostic?.areas ?? [];

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-flux-100 text-xs font-bold text-flux-700">01</span>
        <h2 className="font-display text-lg font-bold text-ink-800">SPOT — Diagnostic</h2>
      </div>

      <div className="card p-4">
        <p className="mb-3 text-sm text-ink-500">
          Capture friction signals from multiple roles, then let FLUX isolate where execution drag concentrates.
        </p>

        {/* Signal list */}
        {signals.length > 0 && (
          <div className="mb-3 space-y-2">
            {signals.map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-lg border border-ink-100 bg-ink-50 px-3 py-2 text-sm">
                <span className="chip bg-brand-100 text-brand-700">{s.role}</span>
                <span className="flex-1 text-ink-700">{s.symptom}</span>
                <span className="text-xs text-ink-400">sev {s.severity} · freq {s.frequency}</span>
                <button className="text-ink-300 hover:text-nva-600" onClick={() => removeSignal(s.id)}>
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add signal */}
        <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto_auto_auto]">
          <input className="input" placeholder="Role" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} />
          <input className="input" placeholder="Symptom / friction" value={draft.symptom} onChange={(e) => setDraft({ ...draft, symptom: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addSignal()} />
          <select className="input" value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: Number(e.target.value) })} title="Severity">
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>Sev {n}</option>)}
          </select>
          <select className="input" value={draft.frequency} onChange={(e) => setDraft({ ...draft, frequency: Number(e.target.value) })} title="Frequency">
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>Frq {n}</option>)}
          </select>
          <button className="btn-outline" onClick={addSignal}><Icon name="plus" className="h-4 w-4" /></button>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-ink-400">{signals.length} signal{signals.length === 1 ? '' : 's'}{project.diagnostic?.ranAt ? ' · last run saved' : ''}</span>
          <button className="btn-flux" onClick={runScan} disabled={loading}>
            {loading ? <Spinner label="Scanning…" /> : <><Icon name="search" className="h-4 w-4" /> Run diagnostic</>}
          </button>
        </div>
        <AIError_ message={error} />
      </div>

      {loading && <AIThinking label="Isolating execution drag…" />}

      {project.diagnostic?.summary && (
        <div className="card border-l-4 border-flux-500 p-4">
          <div className="label">Diagnostic summary</div>
          <p className="text-sm text-ink-700">{project.diagnostic.summary}</p>
        </div>
      )}

      {areas.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {areas.map((a) => (
            <div key={a.id} className={`card p-4 ${a.recommended ? 'ring-2 ring-flux-200' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="font-semibold text-ink-800">{a.name}</div>
                <span className="chip bg-nva-100 text-nva-700">drag {a.drag}/5</span>
              </div>
              <p className="mt-1 text-sm text-ink-500">{a.rationale}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {a.drivers.map((d) => (
                  <span key={d} className={`chip ${DRIVER[d].chip}`}>{DRIVER[d].label}</span>
                ))}
                {a.recommended && <span className="chip bg-flux-100 text-flux-700">★ Map next</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Stage 2 entry — processes
// ---------------------------------------------------------------------------

function ProcessPanel({ project, processes, onOpen }: { project: Project; processes: Process[]; onOpen: (p: Process) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-flux-100 text-xs font-bold text-flux-700">02</span>
          <h2 className="font-display text-lg font-bold text-ink-800">MAP — Processes</h2>
        </div>
        <button className="btn-primary" onClick={() => setOpen(true)}>
          <Icon name="plus" className="h-4 w-4" /> New process
        </button>
      </div>

      {!processes.length ? (
        <div className="card p-8 text-center text-ink-400">No processes yet. Describe one and FLUX will map it.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {processes.map((p) => {
            const m = computeMetrics(p, project.org);
            return (
              <button key={p.id} onClick={() => onOpen(p)} className="card group p-4 text-left transition hover:shadow-lift">
                <div className="flex items-start justify-between">
                  <div className="font-semibold text-ink-800 group-hover:text-brand-700">{p.name}</div>
                  <StatusChip status={p.status} />
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                  <Mini label="Steps" value={`${m.stepCount}`} />
                  <Mini label="PCE" value={fmtPct(m.pce)} />
                  <Mini label="Auto" value={`${m.automationIndex}`} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      <NewProcessModal project={project} open={open} onClose={() => setOpen(false)} onCreated={onOpen} />
    </section>
  );
}

function NewProcessModal({ project, open, onClose, onCreated }: { project: Project; open: boolean; onClose: () => void; onCreated: (p: Process) => void }) {
  const { loading, error, run, setError } = useAIRun();
  const [desc, setDesc] = useState('');
  const [researching, setResearching] = useState(false);
  const [researched, setResearched] = useState<number | null>(null);

  async function doResearch() {
    setResearching(true);
    setError(null);
    try {
      const name = desc.split('\n')[0]?.slice(0, 80) || project.scope || 'Process';
      const cards = await researchBenchmarks({ project, processName: name });
      await db.knowledge.bulkPut(cards);
      setResearched(cards.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Research failed.');
    } finally {
      setResearching(false);
    }
  }

  async function doMap() {
    if (!desc.trim()) return;
    const knowledge = await db.knowledge.where('projectId').equals(project.id).toArray();
    await run(
      () => mapProcessFromText({ project, description: desc, knowledge }),
      async ({ map }) => {
        const proc = buildProcess(project.id, map, FLUX_SCHEMA_VERSION);
        await db.processes.put(proc);
        setDesc('');
        setResearched(null);
        onClose();
        onCreated(proc);
      },
    );
  }

  async function blank() {
    const proc: Process = {
      id: uid(),
      projectId: project.id,
      schemaVersion: FLUX_SCHEMA_VERSION,
      name: 'New process',
      steps: [],
      status: 'draft',
      createdAt: now(),
      updatedAt: now(),
    };
    await db.processes.put(proc);
    onClose();
    onCreated(proc);
  }

  return (
    <Modal open={open} onClose={onClose} title="Map a new process" wide>
      <p className="mb-3 text-sm text-ink-500">
        Describe the process in plain English — how it really works, including the messy bits. FLUX maps it to the standard: SIPOC, BPMN steps, value classification and VSM timing.
      </p>
      <textarea
        className="input min-h-[160px]"
        placeholder={'e.g. When a supplier invoice arrives by email, the AP clerk logs it in a spreadsheet, matches it to the PO in the ERP, chases the requester if it doesn’t match, emails it for approval, re-keys it into the ERP, then runs payment…'}
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button className="btn-outline" onClick={doResearch} disabled={researching || !desc.trim()}>
          {researching ? <Spinner label="Researching…" /> : <><Icon name="knowledge" className="h-4 w-4" /> Research benchmarks first</>}
        </button>
        {researched !== null && <span className="chip bg-va-100 text-va-700"><Icon name="check" className="h-3.5 w-3.5" /> {researched} knowledge cards added</span>}
      </div>

      <AIError_ message={error} />

      <div className="mt-5 flex items-center justify-between">
        <button className="btn-ghost" onClick={blank}>Start blank instead</button>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={doMap} disabled={loading || !desc.trim()}>
            {loading ? <Spinner label="Mapping…" /> : <><Icon name="map" className="h-4 w-4" /> Map with AI</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function StatusChip({ status }: { status: Process['status'] }) {
  const map: Record<Process['status'], string> = {
    draft: 'bg-ink-100 text-ink-500',
    mapped: 'bg-flux-100 text-flux-700',
    diagnosed: 'bg-brand-100 text-brand-700',
    designed: 'bg-va-100 text-va-700',
  };
  return <span className={`chip ${map[status]} capitalize`}>{status}</span>;
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-ink-50 py-1.5">
      <div className="font-semibold text-ink-800">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-ink-400">{label}</div>
    </div>
  );
}
