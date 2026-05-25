import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveProfile } from '../db';
import { MODULES, moduleByNumber } from '../content/curriculum';
import { Logo } from '../components/ui';
import type { Profile } from '../types';

const GOALS = [
  { id: 'promotion', label: 'Get promoted / seen as senior', mods: [1, 2, 3] },
  { id: 'lead', label: 'Lead a team well', mods: [5, 6, 7] },
  { id: 'deals', label: 'Win deals & negotiate', mods: [8, 9] },
  { id: 'present', label: 'Present to executives', mods: [2, 1] },
  { id: 'influence', label: 'Influence without authority', mods: [3, 5] },
  { id: 'conflict', label: 'Handle conflict & feedback', mods: [6, 7] },
];

const PAINS = [
  { id: 'gravitas', label: '"You lack gravitas / presence"', mods: [1] },
  { id: 'ramble', label: 'I ramble / bury the point', mods: [2] },
  { id: 'talk', label: 'I talk too much, listen too little', mods: [5] },
  { id: 'defensive', label: 'I get defensive under pressure', mods: [4] },
  { id: 'avoid', label: 'I avoid hard conversations', mods: [6] },
  { id: 'ask', label: "I don't ask for what I need", mods: [7] },
];

export default function Onboarding() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [seniority, setSeniority] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [pains, setPains] = useState<string[]>([]);
  const [style, setStyle] = useState('');

  const toggle = (arr: string[], set: (a: string[]) => void, id: string) =>
    set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  function computeWeights(): Record<number, number> {
    const w: Record<number, number> = {};
    for (const m of MODULES) w[m.number] = 1;
    const bump = (mods: number[], by: number) => mods.forEach((m) => (w[m] = Math.min(3, (w[m] ?? 1) + by)));
    goals.forEach((g) => bump(GOALS.find((x) => x.id === g)?.mods ?? [], 1));
    pains.forEach((p) => bump(PAINS.find((x) => x.id === p)?.mods ?? [], 1));
    return w;
  }

  async function finish() {
    const weights = computeWeights();
    const profile: Profile = {
      id: 'me',
      displayName: name.trim() || 'there',
      role: role.trim(),
      seniority: seniority.trim(),
      goals: goals.map((g) => GOALS.find((x) => x.id === g)?.label ?? g),
      painPoints: pains.map((p) => PAINS.find((x) => x.id === p)?.label ?? p),
      styleBaseline: style.trim(),
      assessmentMode: 'ai',
      weights,
      onboarded: true,
      createdAt: Date.now(),
    };
    await saveProfile(profile);
    nav('/');
  }

  const weights = computeWeights();
  const top = Object.entries(weights)
    .sort((a, b) => b[1] - a[1])
    .filter(([, v]) => v >= 2)
    .slice(0, 4)
    .map(([n]) => moduleByNumber(Number(n))!);

  return (
    <div className="min-h-screen-safe grid place-items-center px-4 py-10 bg-gradient-to-br from-brand-50 via-white to-gold-50/40">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <Logo />
          <button onClick={finish} className="text-sm text-ink-400 hover:text-ink-700">Skip</button>
        </div>

        <div className="card p-6 animate-fade-up">
          <Dots step={step} total={4} />

          {step === 0 && (
            <Step title="Let's tailor your coach" subtitle="A couple of details so feedback fits your world.">
              <Field label="Your name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex" /></Field>
              <Field label="Your role"><input className="input" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Product lead, founder, sales director…" /></Field>
              <Field label="Seniority"><input className="input" value={seniority} onChange={(e) => setSeniority(e.target.value)} placeholder="Manager, senior IC, exec…" /></Field>
            </Step>
          )}

          {step === 1 && (
            <Step title="What are you aiming for?" subtitle="Pick any that fit — this shapes which modules we weight.">
              <Chips items={GOALS} selected={goals} onToggle={(id) => toggle(goals, setGoals, id)} />
            </Step>
          )}

          {step === 2 && (
            <Step title="What feels hardest right now?" subtitle="Be honest — this is private and it sharpens your focus.">
              <Chips items={PAINS} selected={pains} onToggle={(id) => toggle(pains, setPains, id)} />
            </Step>
          )}

          {step === 3 && (
            <Step title="Your authentic style" subtitle='Optional "this is me" baseline. We score effectiveness toward your goals in your style — never penalising accent, introversion, or being soft-spoken.'>
              <textarea className="input min-h-[110px]" value={style} onChange={(e) => setStyle(e.target.value)} placeholder="e.g. I'm naturally quiet and thoughtful; I don't want to become loud, I want to be heard." />
              {top.length > 0 && (
                <div className="ai-card mt-4">
                  <div className="label mb-1">Your tailored focus</div>
                  <p className="text-sm text-ink-600 mb-2">Based on what you told us, we'll emphasise:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {top.map((m) => <span key={m.number} className="chip-brand">M{m.number} {m.title}</span>)}
                  </div>
                </div>
              )}
            </Step>
          )}

          <div className="flex items-center justify-between mt-6">
            <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="btn-ghost">← Back</button>
            {step < 3 ? (
              <button onClick={() => setStep((s) => s + 1)} className="btn-primary">Continue →</button>
            ) : (
              <button onClick={finish} className="btn-primary">Start coaching →</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Dots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex gap-1.5 mb-5">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={`h-1.5 rounded-full flex-1 ${i <= step ? 'bg-brand-500' : 'bg-ink-100'}`} />
      ))}
    </div>
  );
}
function Step({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="font-display text-2xl text-ink-900 mb-1">{title}</h1>
      <p className="text-ink-500 text-sm mb-5">{subtitle}</p>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<label className="block"><span className="label block mb-1.5">{label}</span>{children}</label>);
}
function Chips({ items, selected, onToggle }: { items: { id: string; label: string }[]; selected: string[]; onToggle: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => {
        const on = selected.includes(it.id);
        return (
          <button key={it.id} onClick={() => onToggle(it.id)} className={`px-3 py-2 rounded-xl border text-sm font-medium transition ${on ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-ink-200 bg-white text-ink-600 hover:border-brand-300'}`}>
            {on ? '✓ ' : ''}{it.label}
          </button>
        );
      })}
    </div>
  );
}
