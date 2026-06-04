import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAllOpportunities, useAllProcesses, useProjects } from '../store';
import Icon from '../components/Icon';
import { computeMetrics, opportunityValue } from '../lib/metrics';
import { fmtDuration, fmtMoney, fmtPct } from '../lib/format';
import { downloadText } from '../lib/export';
import type { Opportunity, Process, Project } from '../types';

type Row = {
  process: Process;
  project: Project;
  pce: number;
  leadTime: number;
  ca: number;
  automation: number;
  steps: number;
  oppCount: number;
  oppValue: number;
};

const COLS: { key: keyof Row | 'name'; label: string }[] = [
  { key: 'name', label: 'Process' },
  { key: 'steps', label: 'Steps' },
  { key: 'leadTime', label: 'Lead time' },
  { key: 'pce', label: 'PCE' },
  { key: 'ca', label: '%C&A' },
  { key: 'automation', label: 'Auto idx' },
  { key: 'oppCount', label: 'Opps' },
  { key: 'oppValue', label: 'Value' },
];

export default function PortfolioPage() {
  const nav = useNavigate();
  const processes = useAllProcesses();
  const projects = useProjects();
  const opps = useAllOpportunities();
  const [sort, setSort] = useState<{ key: keyof Row | 'name'; dir: 1 | -1 }>({ key: 'oppValue', dir: -1 });

  const rows: Row[] = useMemo(() => {
    if (!processes || !projects || !opps) return [];
    const projById = new Map(projects.map((p) => [p.id, p]));
    const oppByProc = new Map<string, Opportunity[]>();
    for (const o of opps) {
      if (!oppByProc.has(o.processId)) oppByProc.set(o.processId, []);
      oppByProc.get(o.processId)!.push(o);
    }
    return processes.map((proc) => {
      const project = projById.get(proc.projectId)!;
      const m = computeMetrics(proc, project?.org);
      const po = oppByProc.get(proc.id) ?? [];
      const ov = opportunityValue(po);
      return {
        process: proc,
        project,
        pce: m.pce,
        leadTime: m.totalLeadTimeMin,
        ca: m.rolledCompleteAccurate,
        automation: m.automationIndex,
        steps: m.stepCount,
        oppCount: ov.count,
        oppValue: ov.total,
      };
    });
  }, [processes, projects, opps]);

  const sorted = useMemo(() => {
    const r = [...rows];
    r.sort((a, b) => {
      const av = sort.key === 'name' ? a.process.name : (a[sort.key] as number);
      const bv = sort.key === 'name' ? b.process.name : (b[sort.key] as number);
      if (typeof av === 'string') return av.localeCompare(bv as string) * sort.dir;
      return ((av as number) - (bv as number)) * sort.dir;
    });
    return r;
  }, [rows, sort]);

  const totalValue = rows.reduce((a, r) => a + r.oppValue, 0);

  function exportCsv() {
    const header = ['Process', 'Client', 'Industry', 'Steps', 'LeadTimeMin', 'PCE', 'RolledCA', 'AutomationIndex', 'Opportunities', 'AnnualValue'];
    const lines = [header.join(',')];
    for (const r of sorted) {
      lines.push(
        [
          esc(r.process.name),
          esc(r.project?.client ?? ''),
          esc(r.project?.industry ?? ''),
          r.steps,
          Math.round(r.leadTime),
          r.pce.toFixed(3),
          r.ca.toFixed(3),
          r.automation,
          r.oppCount,
          Math.round(r.oppValue),
        ].join(','),
      );
    }
    downloadText('flux-portfolio.csv', lines.join('\n'), 'text/csv');
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Portfolio</h1>
          <p className="text-ink-500">Every process on the same standardized metrics — directly comparable.</p>
        </div>
        <button className="btn-outline" onClick={exportCsv} disabled={!rows.length}>
          <Icon name="download" className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Processes" value={`${rows.length}`} />
        <Kpi label="Avg PCE" value={fmtPct(avg(rows.map((r) => r.pce)))} />
        <Kpi label="Opportunities" value={`${rows.reduce((a, r) => a + r.oppCount, 0)}`} />
        <Kpi label="Total value" value={fmtMoney(totalValue)} tone />
      </div>

      {!rows.length ? (
        <div className="card p-10 text-center text-ink-400">No processes mapped yet.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400">
                {COLS.map((c) => (
                  <th
                    key={c.key}
                    className="cursor-pointer px-3 py-2 hover:text-ink-700"
                    onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key && s.dir === -1 ? 1 : -1 }))}
                  >
                    {c.label} {sort.key === c.key ? (sort.dir === -1 ? '▾' : '▴') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.process.id} className="cursor-pointer border-b border-ink-50 hover:bg-ink-50" onClick={() => nav(`/processes/${r.process.id}`)}>
                  <td className="px-3 py-2">
                    <div className="font-medium text-ink-800">{r.process.name}</div>
                    <div className="text-xs text-ink-400">{r.project?.client}</div>
                  </td>
                  <td className="px-3 py-2 text-ink-600">{r.steps}</td>
                  <td className="px-3 py-2 text-ink-600">{fmtDuration(r.leadTime)}</td>
                  <td className="px-3 py-2"><Bar value={r.pce} good={0.25} /></td>
                  <td className="px-3 py-2"><Bar value={r.ca} good={0.9} /></td>
                  <td className="px-3 py-2 text-ink-600">{r.automation}</td>
                  <td className="px-3 py-2 text-ink-600">{r.oppCount}</td>
                  <td className="px-3 py-2 font-medium text-flux-700">{r.oppValue ? fmtMoney(r.oppValue, r.project?.org?.currency) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Bar({ value, good }: { value: number; good: number }) {
  const pct = Math.min(100, value * 100);
  const color = value >= good ? '#16a34a' : value >= good * 0.5 ? '#d97706' : '#dc2626';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ink-100">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs text-ink-500">{fmtPct(value)}</span>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: boolean }) {
  return (
    <div className="card p-4">
      <div className="label">{label}</div>
      <div className={`font-display text-2xl font-bold ${tone ? 'text-flux-600' : 'text-ink-800'}`}>{value}</div>
    </div>
  );
}

function avg(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
function esc(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
