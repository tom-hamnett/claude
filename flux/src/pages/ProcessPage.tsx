import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { uid } from '../db';
import {
  deleteProcessCascade,
  getKnowledgeForProject,
  putProcess,
  replaceAiOpportunities,
  useOpportunitiesByProcess,
  useProcess,
  useProject,
} from '../store';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import Markdown from '../components/Markdown';
import Scorecard from '../components/Scorecard';
import ProcessMap from '../components/ProcessMap';
import OpportunityMatrix from '../components/OpportunityMatrix';
import IngestStudio from '../components/IngestStudio';
import Clarifications from '../components/Clarifications';
import TidyTools from '../components/TidyTools';
import CostBasis from '../components/CostBasis';
import { AIError_, AIThinking, Spinner, useAIRun } from '../components/AIRun';
import { AUTOMATION, DRIVER, DRIVER_ORDER, STEP_TYPE, STEP_TYPE_ORDER, VALUE_CLASS, WASTE } from '../lib/frameworks';
import { computeMetrics, prioritize, renumber } from '../lib/metrics';
import { buildProcessReport, downloadJSON, downloadText, slugify } from '../lib/export';
import { fmtMoney } from '../lib/format';
import { designFutureState, scanOpportunities } from '../services/fluxAI';
import { StatusChip } from './ProjectPage';
import type { Opportunity, Process, ProcessStep, Project } from '../types';

type Tab = 'ingest' | 'map' | 'diagnose' | 'design' | 'report';

export default function ProcessPage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const process = useProcess(id);
  const project = useProject(process?.projectId ?? '');
  const opportunities = useOpportunitiesByProcess(id) ?? [];
  const [tab, setTab] = useState<Tab>('map');
  const [tabInit, setTabInit] = useState(false);

  // First time the process loads, land drafts on Ingest, mapped ones on Map.
  useEffect(() => {
    if (!tabInit && process) {
      setTab((process.steps?.length ?? 0) === 0 ? 'ingest' : 'map');
      setTabInit(true);
    }
  }, [process, tabInit]);

  if (process === undefined) return <div className="text-ink-400">Loading…</div>;
  if (!process) return <div className="card p-8 text-center text-ink-400">Process not found.</div>;
  if (!project) return <div className="text-ink-400">Loading engagement…</div>;

  const openClar = (process.clarifications ?? []).filter((c) => c.status === 'open').length;
  const TABS: { id: Tab; label: string; icon: 'map' | 'spark' | 'design' | 'download' | 'flow'; badge?: number }[] = [
    { id: 'ingest', label: 'Ingest', icon: 'flow', badge: process.sources?.length || undefined },
    { id: 'map', label: 'Map', icon: 'map', badge: openClar || undefined },
    { id: 'diagnose', label: 'Diagnose', icon: 'spark' },
    { id: 'design', label: 'Design', icon: 'design' },
    { id: 'report', label: 'Report', icon: 'download' },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to={`/projects/${project.id}`} className="mb-2 inline-flex items-center gap-1 text-sm text-ink-400 hover:text-ink-600">
            <Icon name="back" className="h-4 w-4" /> {project.name}
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-ink-900">{process.name}</h1>
            <StatusChip status={process.status} />
          </div>
          <p className="text-sm text-ink-500">{process.trigger ? `Trigger: ${process.trigger}` : 'No trigger set'}{process.owner ? ` · Owner: ${process.owner}` : ''}{process.annualVolume ? ` · ${process.annualVolume.toLocaleString()}/yr` : ''}</p>
        </div>
        <button
          className="btn-ghost text-nva-600"
          onClick={async () => {
            if (confirm('Delete this process and its opportunities? This cannot be undone.')) {
              await deleteProcessCascade(process.id);
              nav(`/projects/${project.id}`);
            }
          }}
        >
          <Icon name="trash" className="h-4 w-4" /> Delete
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-ink-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              tab === t.id ? 'border-flux-500 text-flux-700' : 'border-transparent text-ink-400 hover:text-ink-600'
            }`}
          >
            <Icon name={t.icon} className="h-4 w-4" /> {t.label}
            {t.badge ? <span className="ml-1 rounded-full bg-flux-100 px-1.5 text-[11px] font-semibold text-flux-700">{t.badge}</span> : null}
          </button>
        ))}
      </div>

      {tab === 'ingest' && <IngestStudio process={process} project={project} onSynthesized={() => setTab('map')} />}
      {tab === 'map' && <MapTab process={process} project={project} />}
      {tab === 'diagnose' && <DiagnoseTab process={process} project={project} opportunities={opportunities} />}
      {tab === 'design' && <DesignTab process={process} project={project} opportunities={opportunities} />}
      {tab === 'report' && <ReportTab process={process} project={project} opportunities={opportunities} />}
    </div>
  );
}

// ===========================================================================
// MAP TAB
// ===========================================================================

function MapTab({ process, project }: { process: Process; project: Project }) {
  const metrics = useMemo(() => computeMetrics(process, project.org), [process, project.org]);
  const [editing, setEditing] = useState<ProcessStep | null>(null);
  const [details, setDetails] = useState(false);

  async function updateSteps(steps: ProcessStep[]) {
    await putProcess({ ...process, steps: renumber(steps) });
  }

  async function saveStep(s: ProcessStep) {
    const exists = process.steps.some((x) => x.id === s.id);
    const steps = exists ? process.steps.map((x) => (x.id === s.id ? s : x)) : [...process.steps, s];
    await updateSteps(steps);
    setEditing(null);
  }

  function addStep() {
    setEditing({
      id: uid(),
      order: process.steps.length + 1,
      name: '',
      type: 'task',
      actor: '',
      valueClass: 'BVA',
      automation: 'none',
    });
  }

  async function move(idx: number, dir: -1 | 1) {
    const steps = [...process.steps].sort((a, b) => a.order - b.order);
    const j = idx + dir;
    if (j < 0 || j >= steps.length) return;
    [steps[idx], steps[j]] = [steps[j], steps[idx]];
    await updateSteps(steps);
  }

  async function del(sid: string) {
    await updateSteps(process.steps.filter((x) => x.id !== sid));
  }

  const sorted = [...process.steps].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-5">
      <Clarifications process={process} project={project} />
      <Scorecard m={metrics} currency={project.org?.currency} />
      <CostBasis process={process} project={project} />

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-400">Swimlane map</h3>
        <div className="flex items-center gap-2">
          <TidyTools process={process} project={project} />
          <button className="btn-tint-brand text-sm" onClick={() => setDetails((d) => !d)}>
            <Icon name="edit" className="h-4 w-4" /> {details ? 'Hide' : 'Edit'} details &amp; SIPOC
          </button>
        </div>
      </div>
      <ProcessMap process={process} selectedId={editing?.id} onSelect={(s) => setEditing(s)} />

      {details && <ProcessDetails process={process} />}

      {/* Step table */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-400">Steps ({sorted.length})</h3>
        <button className="btn-outline text-sm" onClick={addStep}>
          <Icon name="plus" className="h-4 w-4" /> Add step
        </button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Step</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Actor</th>
              <th className="px-3 py-2">Value</th>
              <th className="px-3 py-2">Touch (min)</th>
              <th className="px-3 py-2">Wait (min)</th>
              <th className="px-3 py-2">%C&A</th>
              <th className="px-3 py-2">Auto</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, i) => (
              <tr key={s.id} className="border-b border-ink-50 hover:bg-ink-50">
                <td className="px-3 py-2 text-ink-400">{s.order}</td>
                <td className="px-3 py-2 font-medium text-ink-800">
                  <button className="text-left hover:text-brand-700" onClick={() => setEditing(s)}>
                    {STEP_TYPE[s.type].symbol} {s.name || <span className="text-ink-300">untitled</span>}
                  </button>
                  {s.painPoint && <div className="text-xs text-nva-600">⚠ {s.painPoint}</div>}
                </td>
                <td className="px-3 py-2 text-ink-500">{STEP_TYPE[s.type].label}</td>
                <td className="px-3 py-2 text-ink-500">{s.actor || '—'}</td>
                <td className="px-3 py-2"><span className={`chip ${VALUE_CLASS[s.valueClass].chip}`}>{s.valueClass}</span></td>
                <td className="px-3 py-2 text-ink-500">{s.processTimeMin ?? '—'}</td>
                <td className="px-3 py-2 text-ink-500">{s.waitTimeMin ?? '—'}</td>
                <td className="px-3 py-2 text-ink-500">{s.pctCompleteAccurate ?? '—'}</td>
                <td className="px-3 py-2 text-xs text-ink-500">{AUTOMATION[s.automation].label}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1 text-ink-300">
                    <button className="hover:text-ink-600" onClick={() => move(i, -1)} title="Move up">↑</button>
                    <button className="hover:text-ink-600" onClick={() => move(i, 1)} title="Move down">↓</button>
                    <button className="hover:text-nva-600" onClick={() => del(s.id)} title="Delete"><Icon name="trash" className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!sorted.length && (
              <tr><td colSpan={10} className="px-3 py-8 text-center text-ink-400">No steps yet. Add one to build the map.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && <StepEditorModal step={editing} process={process} onSave={saveStep} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ProcessDetails({ process }: { process: Process }) {
  const [f, setF] = useState({
    name: process.name,
    trigger: process.trigger ?? '',
    owner: process.owner ?? '',
    annualVolume: process.annualVolume?.toString() ?? '',
  });
  const sipoc = process.sipoc ?? { suppliers: [], inputs: [], outputs: [], customers: [] };
  const [sip, setSip] = useState({
    suppliers: sipoc.suppliers.join(', '),
    inputs: sipoc.inputs.join(', '),
    outputs: sipoc.outputs.join(', '),
    customers: sipoc.customers.join(', '),
  });

  async function save() {
    await putProcess({
      ...process,
      name: f.name.trim() || process.name,
      trigger: f.trigger.trim() || undefined,
      owner: f.owner.trim() || undefined,
      annualVolume: f.annualVolume ? Number(f.annualVolume) : undefined,
      sipoc: {
        suppliers: splitList(sip.suppliers),
        inputs: splitList(sip.inputs),
        outputs: splitList(sip.outputs),
        customers: splitList(sip.customers),
      },
    });
  }

  return (
    <div className="card space-y-4 p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <L label="Name"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} onBlur={save} /></L>
        <L label="Trigger"><input className="input" value={f.trigger} onChange={(e) => setF({ ...f, trigger: e.target.value })} onBlur={save} /></L>
        <L label="Owner"><input className="input" value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} onBlur={save} /></L>
        <L label="Annual volume"><input className="input" type="number" value={f.annualVolume} onChange={(e) => setF({ ...f, annualVolume: e.target.value })} onBlur={save} /></L>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <L label="Suppliers"><input className="input" value={sip.suppliers} onChange={(e) => setSip({ ...sip, suppliers: e.target.value })} onBlur={save} /></L>
        <L label="Inputs"><input className="input" value={sip.inputs} onChange={(e) => setSip({ ...sip, inputs: e.target.value })} onBlur={save} /></L>
        <L label="Outputs"><input className="input" value={sip.outputs} onChange={(e) => setSip({ ...sip, outputs: e.target.value })} onBlur={save} /></L>
        <L label="Customers"><input className="input" value={sip.customers} onChange={(e) => setSip({ ...sip, customers: e.target.value })} onBlur={save} /></L>
      </div>
      <p className="text-xs text-ink-400">Comma-separated. Changes save when you click away.</p>
    </div>
  );
}

function StepEditorModal({ step, process, onSave, onClose }: { step: ProcessStep; process: Process; onSave: (s: ProcessStep) => void; onClose: () => void }) {
  const [s, setS] = useState<ProcessStep>(step);
  const actors = Array.from(new Set(process.steps.map((x) => x.actor).filter(Boolean)));

  function num(v: string): number | undefined {
    return v === '' ? undefined : Number(v);
  }

  return (
    <Modal open onClose={onClose} title={process.steps.some((x) => x.id === step.id) ? 'Edit step' : 'Add step'} wide>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><L label="Step name"><input className="input" autoFocus value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} /></L></div>
        <L label="Type">
          <select className="input" value={s.type} onChange={(e) => setS({ ...s, type: e.target.value as ProcessStep['type'] })}>
            {STEP_TYPE_ORDER.map((t) => <option key={t} value={t}>{STEP_TYPE[t].symbol} {STEP_TYPE[t].label}</option>)}
          </select>
        </L>
        <L label="Actor / swimlane">
          <input className="input" list="actors" value={s.actor} onChange={(e) => setS({ ...s, actor: e.target.value })} />
          <datalist id="actors">{actors.map((a) => <option key={a} value={a} />)}</datalist>
        </L>
        <L label="Value class">
          <select className="input" value={s.valueClass} onChange={(e) => setS({ ...s, valueClass: e.target.value as ProcessStep['valueClass'] })}>
            {(['VA', 'BVA', 'NVA'] as const).map((v) => <option key={v} value={v}>{VALUE_CLASS[v].label}</option>)}
          </select>
        </L>
        <L label="System / tool"><input className="input" value={s.system ?? ''} onChange={(e) => setS({ ...s, system: e.target.value })} /></L>
        <L label="Touch time (min)"><input className="input" type="number" value={s.processTimeMin ?? ''} onChange={(e) => setS({ ...s, processTimeMin: num(e.target.value) })} /></L>
        <L label="Wait time (min)"><input className="input" type="number" value={s.waitTimeMin ?? ''} onChange={(e) => setS({ ...s, waitTimeMin: num(e.target.value) })} /></L>
        <L label="%Complete & Accurate"><input className="input" type="number" value={s.pctCompleteAccurate ?? ''} onChange={(e) => setS({ ...s, pctCompleteAccurate: num(e.target.value) })} /></L>
        <L label="Rework rate (per run)"><input className="input" type="number" step="0.1" value={s.reworkRate ?? ''} onChange={(e) => setS({ ...s, reworkRate: num(e.target.value) })} /></L>
        <L label="Automation">
          <select className="input" value={s.automation} onChange={(e) => setS({ ...s, automation: e.target.value as ProcessStep['automation'] })}>
            {(['none', 'assisted', 'rpa', 'ai', 'full'] as const).map((a) => <option key={a} value={a}>{AUTOMATION[a].label}</option>)}
          </select>
        </L>
        <div className="sm:col-span-2"><L label="Pain point"><input className="input" value={s.painPoint ?? ''} onChange={(e) => setS({ ...s, painPoint: e.target.value })} /></L></div>
      </div>
      <div className="mt-2 text-xs text-ink-400">{VALUE_CLASS[s.valueClass].help}</div>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={() => onSave(s)} disabled={!s.name.trim()}>Save step</button>
      </div>
    </Modal>
  );
}

// ===========================================================================
// DIAGNOSE TAB
// ===========================================================================

function DiagnoseTab({ process, project, opportunities }: { process: Process; project: Project; opportunities: Opportunity[] }) {
  const { loading, error, run } = useAIRun();
  const [selected, setSelected] = useState<string | undefined>();
  const opps = useMemo(() => prioritize(opportunities), [opportunities]);

  async function scan() {
    const knowledge = await getKnowledgeForProject(project.id);
    await run(
      () => scanOpportunities({ project, process, knowledge, org: project.org }),
      async (newOpps) => {
        await replaceAiOpportunities(process.id, newOpps);
        await putProcess({ ...process, status: 'diagnosed' });
      },
    );
  }

  const byDriver = DRIVER_ORDER.map((d) => ({ d, n: opps.filter((o) => o.driver === d).length })).filter((x) => x.n > 0);
  const totalValue = opps.reduce((a, o) => a + (o.estAnnualValue ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <div className="font-semibold text-ink-800">Opportunity engine</div>
          <p className="text-sm text-ink-500">Runs TIMWOODS + VSM + the value-driver spectrum over the map and scores everything.</p>
        </div>
        <button className="btn-flux" onClick={scan} disabled={loading || !process.steps.length}>
          {loading ? <Spinner label="Diagnosing…" /> : <><Icon name="spark" className="h-4 w-4" /> {opps.length ? 'Re-run diagnose' : 'Run diagnose'}</>}
        </button>
      </div>
      <AIError_ message={error} />
      {loading && <AIThinking label="Hunting waste and opportunity…" />}

      {!opps.length && !loading ? (
        <div className="card p-8 text-center text-ink-400">No opportunities yet. Run the diagnostic to surface them.</div>
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
            <div className="space-y-4">
              <OpportunityMatrix opps={opps} selectedId={selected} onSelect={(o) => setSelected(o.id)} />
              <div className="card p-4">
                <div className="label">Value identified</div>
                <div className="font-display text-2xl font-bold text-flux-600">{fmtMoney(totalValue, project.org?.currency)}</div>
                <div className="mt-3 space-y-1.5">
                  {byDriver.map(({ d, n }) => (
                    <div key={d} className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: DRIVER[d].color }} />
                      <span className="flex-1 text-ink-600">{DRIVER[d].label}</span>
                      <span className="font-medium text-ink-800">{n}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {opps.map((o) => (
                <OpportunityCard key={o.id} o={o} process={process} currency={project.org?.currency} selected={selected === o.id} onSelect={() => setSelected(o.id)} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function OpportunityCard({ o, process, currency, selected, onSelect }: { o: Opportunity; process: Process; currency?: string; selected: boolean; onSelect: () => void }) {
  const refs = o.stepRefs.map((id) => process.steps.find((s) => s.id === id)?.order).filter(Boolean);
  return (
    <div className={`card p-4 transition ${selected ? 'ring-2 ring-flux-300' : ''}`} onClick={onSelect}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-900 text-xs font-bold text-white">{o.priority ?? '—'}</span>
          <h4 className="font-semibold text-ink-800">{o.title} {o.quickWin && <span title="Quick win">⚡</span>}</h4>
        </div>
        {o.estAnnualValue ? <span className="chip bg-va-100 text-va-700">{fmtMoney(o.estAnnualValue, currency)}</span> : null}
      </div>
      <p className="mt-2 text-sm text-ink-600">{o.description}</p>
      <p className="mt-2 text-sm text-ink-700"><span className="font-medium text-ink-800">Recommendation:</span> {o.recommendation}</p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
        <span className={`chip ${DRIVER[o.driver].chip}`}>{DRIVER[o.driver].label}</span>
        {o.waste && <span className="chip bg-nva-100 text-nva-700">{WASTE[o.waste].label}</span>}
        <span className="chip bg-ink-100 text-ink-600">Impact {o.impact}</span>
        <span className="chip bg-ink-100 text-ink-600">Effort {o.effort}</span>
        <span className="chip bg-ink-100 text-ink-600">{AUTOMATION[o.automation].label}</span>
        {refs.length > 0 && <span className="chip bg-flux-100 text-flux-700">Steps {refs.join(', ')}</span>}
        <span className="chip bg-ink-100 text-ink-400">conf {(o.confidence * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

// ===========================================================================
// DESIGN TAB
// ===========================================================================

function DesignTab({ process, project, opportunities }: { process: Process; project: Project; opportunities: Opportunity[] }) {
  const { loading, error, run } = useAIRun();
  const opps = useMemo(() => prioritize(opportunities), [opportunities]);

  async function design() {
    await run(
      () => designFutureState({ project, process, opportunities: opps, org: project.org }),
      async (fs) => {
        await putProcess({ ...process, futureState: fs, status: 'designed' });
      },
    );
  }

  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <div className="font-semibold text-ink-800">Automation-ready design</div>
          <p className="text-sm text-ink-500">Turns the prioritised opportunities into a future-state narrative, business case and roadmap.</p>
        </div>
        <button className="btn-flux" onClick={design} disabled={loading}>
          {loading ? <Spinner label="Designing…" /> : <><Icon name="design" className="h-4 w-4" /> {process.futureState ? 'Regenerate' : 'Generate future state'}</>}
        </button>
      </div>
      <AIError_ message={error} />
      {loading && <AIThinking label="Designing the future state…" />}

      {process.futureState?.narrative ? (
        <div className="card p-6">
          <Markdown source={process.futureState.narrative} />
        </div>
      ) : (
        !loading && <div className="card p-8 text-center text-ink-400">No design yet. Diagnose first, then generate the future state.</div>
      )}
    </div>
  );
}

// ===========================================================================
// REPORT TAB
// ===========================================================================

function ReportTab({ process, project, opportunities }: { process: Process; project: Project; opportunities: Opportunity[] }) {
  const md = useMemo(() => buildProcessReport(project, process, opportunities, project.org), [project, process, opportunities]);
  const base = slugify(`flux-${project.client}-${process.name}`);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-400">Standardized report</h3>
        <div className="flex gap-2">
          <button className="btn-outline" onClick={() => downloadText(`${base}.md`, md)}>
            <Icon name="download" className="h-4 w-4" /> Markdown
          </button>
          <button className="btn-outline" onClick={() => downloadJSON(`${base}.json`, { project, process, opportunities })}>
            <Icon name="download" className="h-4 w-4" /> JSON
          </button>
          <button className="btn-primary" onClick={() => window.print()}>
            <Icon name="download" className="h-4 w-4" /> Print / PDF
          </button>
        </div>
      </div>
      <div className="card p-4">
        <h2 className="mb-3 font-display text-lg font-bold text-ink-800">Current-State Map</h2>
        <ProcessMap process={process} />
      </div>
      <div className="card p-6">
        <Markdown source={md} />
      </div>
    </div>
  );
}

// ===========================================================================
// helpers
// ===========================================================================

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function splitList(s: string): string[] {
  return s.split(',').map((x) => x.trim()).filter(Boolean);
}
