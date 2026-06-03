import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, now, uid } from '../db';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import { relativeTime } from '../lib/format';
import type { Project } from '../types';

export default function ProjectsPage() {
  const nav = useNavigate();
  const projects = useLiveQuery(() => db.projects.orderBy('updatedAt').reverse().toArray(), []);
  const processes = useLiveQuery(() => db.processes.toArray(), []);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    client: '',
    industry: '',
    scope: '',
    objective: '',
    context: '',
    loadedHourlyCost: '',
    currency: 'GBP',
  });

  async function create() {
    if (!form.name.trim() || !form.client.trim()) return;
    const p: Project = {
      id: uid(),
      name: form.name.trim(),
      client: form.client.trim(),
      industry: form.industry.trim(),
      scope: form.scope.trim(),
      objective: form.objective.trim() || undefined,
      context: form.context.trim() || undefined,
      org: {
        loadedHourlyCost: form.loadedHourlyCost ? Number(form.loadedHourlyCost) : undefined,
        currency: form.currency,
        annualHoursPerFte: 1760,
      },
      createdAt: now(),
      updatedAt: now(),
    };
    await db.projects.put(p);
    setOpen(false);
    nav(`/projects/${p.id}`);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-ink-900">Engagements</h1>
        <button className="btn-primary" onClick={() => setOpen(true)}>
          <Icon name="plus" className="h-4 w-4" /> New engagement
        </button>
      </div>

      {!projects?.length ? (
        <div className="card p-10 text-center text-ink-400">
          No engagements yet. Create one to start mapping.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {projects.map((p) => {
            const pc = processes?.filter((x) => x.projectId === p.id).length ?? 0;
            return (
              <Link key={p.id} to={`/projects/${p.id}`} className="card group p-4 transition hover:shadow-lift">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-ink-800 group-hover:text-brand-700">{p.name}</div>
                    <div className="text-sm text-ink-500">{p.client} · {p.industry || '—'}</div>
                    {p.scope && <div className="mt-1 text-xs text-ink-400">{p.scope}</div>}
                  </div>
                  <Icon name="chevron" className="h-5 w-5 text-ink-300" />
                </div>
                <div className="mt-3 text-xs text-ink-400">
                  {pc} process{pc === 1 ? '' : 'es'} · {relativeTime(p.updatedAt)}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New engagement" wide>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Engagement name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Finance Ops Diagnostic" />
          <Field label="Client *" value={form.client} onChange={(v) => setForm({ ...form, client: v })} placeholder="Northwind Manufacturing" />
          <Field label="Industry" value={form.industry} onChange={(v) => setForm({ ...form, industry: v })} placeholder="Manufacturing" />
          <Field label="Scope / function" value={form.scope} onChange={(v) => setForm({ ...form, scope: v })} placeholder="Procure-to-Pay" />
          <div className="sm:col-span-2">
            <label className="label">Strategic objective</label>
            <input className="input" value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} placeholder="Recover margin and free capacity ahead of ERP migration." />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Context (the AI uses this everywhere)</label>
            <textarea className="input min-h-[80px]" value={form.context} onChange={(e) => setForm({ ...form, context: e.target.value })} placeholder="Size, volumes, team, systems, known pain points…" />
          </div>
          <Field label="Loaded labour cost / hour" value={form.loadedHourlyCost} onChange={(v) => setForm({ ...form, loadedHourlyCost: v })} placeholder="35" type="number" />
          <Field label="Currency" value={form.currency} onChange={(v) => setForm({ ...form, currency: v })} placeholder="GBP" />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={create} disabled={!form.name.trim() || !form.client.trim()}>
            Create engagement
          </button>
        </div>
      </Modal>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
