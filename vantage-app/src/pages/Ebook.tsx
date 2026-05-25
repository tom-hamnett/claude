import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/ui';
import { moduleByNumber } from '../content/curriculum';
import { ALL_SOURCE_TITLES } from '../content/library';
import { saveLead, db } from '../db';
import type { Lead } from '../types';

// Progressive profiling: the user "builds their own case" before the email ask.
const CHALLENGES: { id: string; label: string; modules: number[] }[] = [
  { id: 'presence', label: 'Be taken more seriously — have real gravitas', modules: [1, 4] },
  { id: 'concise', label: 'Stop rambling and land my point fast', modules: [2] },
  { id: 'influence', label: 'Influence and persuade without authority', modules: [3] },
  { id: 'pressure', label: 'Stay calm and composed under pressure', modules: [4] },
  { id: 'listen', label: 'Listen better and build trust', modules: [5] },
  { id: 'difficult', label: 'Handle difficult conversations & feedback', modules: [6] },
  { id: 'assert', label: 'Ask for what I need / set boundaries', modules: [7] },
  { id: 'negotiate', label: 'Negotiate and protect value', modules: [8] },
  { id: 'sell', label: 'Sell and run sharper discovery calls', modules: [9] },
  { id: 'habit', label: 'Actually change my habits, not just learn', modules: [10] },
];
const SENIORITY = ['IC / specialist', 'Manager', 'Senior leader', 'Exec / C-suite', 'Founder'];

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function Ebook() {
  const [step, setStep] = useState(0);
  const [challenges, setChallenges] = useState<string[]>([]);
  const [seniority, setSeniority] = useState('');
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [lead, setLead] = useState<Lead | null>(null);
  const [busy, setBusy] = useState(false);

  const recModules = [...new Set(challenges.flatMap((id) => CHALLENGES.find((c) => c.id === id)?.modules ?? []))].slice(0, 4);
  const toggle = (id: string) => setChallenges((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  const emailOk = EMAIL_RE.test(email.trim());

  async function submit() {
    if (!emailOk) return;
    setBusy(true);
    const l: Lead = {
      id: crypto.randomUUID(),
      email: email.trim().toLowerCase(),
      company: company.trim() || undefined,
      role: role.trim() || undefined,
      seniority: seniority || undefined,
      challenges,
      recommendedModules: recModules,
      source: 'playbook',
      createdAt: Date.now(),
      downloaded: false,
    };
    await saveLead(l);
    setLead(l);
    setBusy(false);
    setStep(3);
  }

  async function markDownloaded() {
    if (lead) { try { await db.leads.update(lead.id, { downloaded: true }); } catch { /* ignore */ } }
  }

  return (
    <div className="min-h-screen-safe bg-gradient-to-br from-brand-50 via-white to-gold-50/40">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Logo />
          <Link to="/" className="text-sm text-ink-400 hover:text-ink-700">Skip to the app →</Link>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Marketing / cover */}
          <div className="lg:sticky lg:top-8">
            <span className="chip-gold mb-3 inline-block">Free playbook</span>
            <h1 className="font-display text-4xl text-ink-900 leading-tight">The Executive Presence Playbook</h1>
            <p className="text-ink-600 text-lg mt-3">Gravitas, influence and the conversations that move careers — a 10-module framework distilled from the executive canon.</p>
            <div className="mt-5 aspect-[1.6/1] rounded-2xl ai-grad shadow-lift grid place-items-center text-center p-6">
              <div className="text-white">
                <div className="font-display text-2xl">VANTAGE</div>
                <div className="text-white/80 text-sm mt-1">The Executive Presence Playbook</div>
                <div className="mt-4 text-white/90 text-xs">10 modules · {ALL_SOURCE_TITLES.length}+ canonical sources</div>
              </div>
            </div>
            <ul className="mt-5 space-y-2 text-sm text-ink-700">
              {['Presence & gravitas, not posture tips', 'Influence, difficult conversations & negotiation', 'Named methods from Cialdini, Voss, Brown, Hewlett & more', 'What "good" looks like in your real conversations'].map((b, i) => (
                <li key={i} className="flex gap-2"><span className="text-brand-500">✓</span>{b}</li>
              ))}
            </ul>
          </div>

          {/* Progressive capture */}
          <div className="card p-6">
            {step < 3 && <Dots step={step} total={3} />}

            {step === 0 && (
              <div>
                <h2 className="font-display text-2xl text-ink-900 mb-1">What do you most want to get better at?</h2>
                <p className="text-ink-500 text-sm mb-4">Pick what matters now — we’ll tailor the playbook to you. (No email needed yet.)</p>
                <div className="space-y-2">
                  {CHALLENGES.map((c) => {
                    const on = challenges.includes(c.id);
                    return (
                      <button key={c.id} onClick={() => toggle(c.id)} className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition ${on ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-700 hover:border-brand-300'}`}>
                        {on ? '✓ ' : ''}{c.label}
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => setStep(1)} disabled={!challenges.length} className="btn-primary w-full mt-5">Continue →</button>
              </div>
            )}

            {step === 1 && (
              <div>
                <h2 className="font-display text-2xl text-ink-900 mb-1">A little about you</h2>
                <p className="text-ink-500 text-sm mb-4">So we pitch the playbook at the right altitude.</p>
                <label className="block mb-3"><span className="label block mb-1.5">Seniority</span>
                  <div className="grid grid-cols-2 gap-2">
                    {SENIORITY.map((s) => (
                      <button key={s} onClick={() => setSeniority(s)} className={`py-2 rounded-xl border text-sm font-medium transition ${seniority === s ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-600 hover:border-brand-300'}`}>{s}</button>
                    ))}
                  </div>
                </label>
                <label className="block mb-3"><span className="label block mb-1.5">Role <span className="text-ink-300">(optional)</span></span>
                  <input className="input" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Product lead, Sales director" />
                </label>
                <label className="block mb-1"><span className="label block mb-1.5">Company <span className="text-ink-300">(optional)</span></span>
                  <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name" />
                </label>
                <div className="flex gap-2 mt-5">
                  <button onClick={() => setStep(0)} className="btn-ghost">← Back</button>
                  <button onClick={() => setStep(2)} className="btn-primary flex-1">Continue →</button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="font-display text-2xl text-ink-900 mb-1">Where should we send it?</h2>
                <p className="text-ink-500 text-sm mb-4">Your tailored playbook, plus the occasional sharp idea on executive presence. Unsubscribe anytime.</p>
                {recModules.length > 0 && (
                  <div className="ai-card mb-4">
                    <div className="label mb-1">Your playbook will start with</div>
                    <div className="flex flex-wrap gap-1.5">
                      {recModules.map((n) => <span key={n} className="chip-brand">M{n} {moduleByNumber(n)?.title}</span>)}
                    </div>
                  </div>
                )}
                <label className="block"><span className="label block mb-1.5">Work email</span>
                  <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" onKeyDown={(e) => e.key === 'Enter' && submit()} />
                </label>
                <p className="text-xs text-ink-400 mt-2">We’ll never share your email. This is also stored privately on your device.</p>
                <div className="flex gap-2 mt-5">
                  <button onClick={() => setStep(1)} className="btn-ghost">← Back</button>
                  <button onClick={submit} disabled={!emailOk || busy} className="btn-primary flex-1">{busy ? 'Preparing…' : 'Get the playbook →'}</button>
                </div>
              </div>
            )}

            {step === 3 && lead && (
              <div className="text-center py-2">
                <div className="text-4xl mb-2">🎉</div>
                <h2 className="font-display text-2xl text-ink-900 mb-1">Your playbook is ready</h2>
                <p className="text-ink-500 text-sm mb-5">Tailored to {recModules.length} focus area{recModules.length === 1 ? '' : 's'} — start there.</p>
                <a href="/playbook.pdf" download onClick={markDownloaded} className="btn-primary w-full">⬇ Download the playbook (PDF)</a>
                <div className="ai-card mt-5 text-left">
                  <div className="label mb-1">Now make it stick</div>
                  <p className="text-ink-600 text-sm mb-3">Reading changes what you notice; practice changes what you do. Run one real conversation through VANTAGE and get the one thing to change next — privately, on your terms.</p>
                  <Link to="/onboarding" className="btn-secondary w-full">Set up my coach (free) →</Link>
                </div>
                <p className="text-xs text-ink-400 mt-4">Your recommended modules: {recModules.map((n) => `M${n}`).join(', ')}.</p>
              </div>
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
