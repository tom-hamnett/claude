import { useState } from 'react';
import { putProcess, putProject } from '../store';
import { computeMetrics } from '../lib/metrics';
import { fmtDuration, fmtMoney } from '../lib/format';
import Icon from './Icon';
import type { Process, Project } from '../types';

/**
 * Makes the cost maths transparent and editable. The annual numbers are a plain
 * deterministic formula from three inputs the user controls here. (Opportunity
 * £ values, by contrast, are AI estimates — flagged as such elsewhere.)
 */
export default function CostBasis({ process, project }: { process: Process; project: Project }) {
  const [open, setOpen] = useState(false);
  const org = project.org ?? {};
  const m = computeMetrics(process, org);
  const currency = org.currency ?? 'GBP';

  async function setVolume(v: string) {
    await putProcess({ ...process, annualVolume: v ? Number(v) : undefined });
  }
  async function setOrg(patch: Partial<typeof org>) {
    await putProject({ ...project, org: { ...org, ...patch } });
  }

  const touchMinPerRun = m.totalProcessTimeMin;
  const nvaMinPerRun = process.steps.filter((s) => s.valueClass === 'NVA').reduce((a, s) => a + (s.processTimeMin ?? 0), 0);
  const hourly = org.loadedHourlyCost;
  const volume = process.annualVolume;
  const complete = hourly && volume;

  return (
    <div className="card overflow-hidden">
      <button className="flex w-full items-center justify-between p-4 text-left" onClick={() => setOpen((o) => !o)}>
        <div className="flex items-center gap-2">
          <Icon name="portfolio" className="h-5 w-5 text-flux-600" />
          <span className="font-semibold text-ink-800">Cost basis</span>
          {complete ? (
            <span className="text-sm text-ink-500">{fmtMoney(m.annualCost, currency)}/yr · {fmtMoney(m.annualWasteCost, currency)} waste</span>
          ) : (
            <span className="chip bg-bva-100 text-bva-700">add volume &amp; hourly cost</span>
          )}
        </div>
        <Icon name="chevron" className={`h-5 w-5 text-ink-300 transition ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-ink-100 p-4">
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Field label={`Loaded cost / hour (${currency})`} value={hourly?.toString() ?? ''} onSave={(v) => setOrg({ loadedHourlyCost: v ? Number(v) : undefined })} placeholder="35" />
            <Field label="Annual volume (runs/yr)" value={volume?.toString() ?? ''} onSave={setVolume} placeholder="24000" />
            <Field label="Currency" value={currency} onSave={(v) => setOrg({ currency: v || 'GBP' })} placeholder="GBP" type="text" />
          </div>

          <div className="rounded-lg bg-ink-50 p-3 text-sm text-ink-600">
            <div className="mb-2 font-semibold text-ink-700">How the annual numbers are calculated</div>
            <Row label="Touch time per run" value={`${touchMinPerRun} min (${fmtDuration(touchMinPerRun)})`} />
            <Row label="× Loaded cost/hour" value={hourly ? fmtMoney(hourly, currency) : '— set above'} />
            <Row label="× Annual volume" value={volume ? `${volume.toLocaleString()} runs/yr` : '— set above'} />
            <div className="my-2 border-t border-ink-200" />
            <Row label="= Annual run-cost" value={complete ? fmtMoney(m.annualCost, currency) : '—'} strong />
            <div className="mt-2 text-xs text-ink-400">
              Annual run-cost = (touch time ÷ 60) × cost/hour × volume. Waste applies the same formula to the {nvaMinPerRun} min of NVA (waste) steps only ⇒ <strong>{complete ? fmtMoney(m.annualWasteCost, currency) : '—'}</strong>.
            </div>
            <div className="mt-2 text-xs text-ink-400">
              Note: opportunity £ values in the Diagnose tab are AI estimates to validate — they are not derived from this formula.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onSave, placeholder, type = 'number' }: { label: string; value: string; onSave: (v: string) => void; placeholder?: string; type?: string }) {
  const [v, setV] = useState(value);
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" type={type} defaultValue={value} placeholder={placeholder} onChange={(e) => setV(e.target.value)} onBlur={() => onSave(v)} />
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span>{label}</span>
      <span className={strong ? 'font-bold text-ink-800' : 'font-medium text-ink-700'}>{value}</span>
    </div>
  );
}
