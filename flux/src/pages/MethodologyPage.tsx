import Markdown from '../components/Markdown';
import { AUTOMATION, DRIVER, DRIVER_ORDER, MATURITY_LEVELS, VALUE_CLASS, WASTE, WASTE_ORDER } from '../lib/frameworks';

const INTRO = `# The FLUX Standard (v1)

A process map is only useful if it is **honest, complete, and comparable**. FLUX enforces one standard so a process mapped by any analyst, in any function, can be scored and compared on the same basis.

## The seven principles

1. **Map reality, not the SOP.** Capture how work *actually* flows — including the rework, the waiting and the workarounds. The gap between the official process and the real one is where the value hides.
2. **Scope before you map (SIPOC).** Agree Suppliers, Inputs, Outputs and Customers first, so the boundaries are explicit and the map is the right size.
3. **One unambiguous notation.** Every step is one of eight BPMN-aligned types. No bespoke symbols, no ambiguity.
4. **Classify every step's value.** Lean VA / BVA / NVA on every step forces an honest view of where value is created and destroyed.
5. **Measure flow, not just activity (VSM).** Capture process time, wait time and %Complete-&-Accurate so we can compute cycle efficiency and first-time-right — the metrics that actually move.
6. **Name the waste (TIMWOODS).** Tag opportunities against the eight wastes so improvement is systematic, not anecdotal.
7. **Quantify and prioritise.** Score every opportunity on impact, effort and confidence; estimate value conservatively; always separate quick wins from structural change.`;

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="card p-6">
        <Markdown source={INTRO} />
      </div>

      <Section title="Step types (BPMN-aligned)">
        <p className="mb-3 text-sm text-ink-500">Every step is exactly one of these. That constraint is what keeps maps comparable.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {(['start', 'task', 'decision', 'control', 'handoff', 'wait', 'system', 'end'] as const).map((t) => (
            <Row key={t} symbol={SYM[t]} label={LBL[t]} help={HELP[t]} />
          ))}
        </div>
      </Section>

      <Section title="Value classification (Lean)">
        <div className="space-y-2">
          {(['VA', 'BVA', 'NVA'] as const).map((v) => (
            <div key={v} className="flex items-start gap-3">
              <span className={`chip ${VALUE_CLASS[v].chip} min-w-[110px] justify-center`}>{VALUE_CLASS[v].label}</span>
              <span className="text-sm text-ink-600">{VALUE_CLASS[v].help}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="The VSM metrics we standardise on">
        <ul className="space-y-2 text-sm text-ink-600">
          <li><strong>Lead time</strong> — total elapsed time end to end (touch + wait).</li>
          <li><strong>Process / touch time</strong> — hands-on work time.</li>
          <li><strong>Process Cycle Efficiency (PCE)</strong> — value-add time ÷ lead time. World-class office processes rarely exceed 25%.</li>
          <li><strong>Rolled %Complete &amp; Accurate</strong> — the product of per-step first-time-right rates. Reveals hidden rework drag.</li>
          <li><strong>Automation index</strong> — 0 (fully manual) to 100 (straight-through).</li>
        </ul>
      </Section>

      <Section title="The 8 wastes (TIMWOODS)">
        <div className="grid gap-2 sm:grid-cols-2">
          {WASTE_ORDER.map((w) => (
            <div key={w} className="flex items-start gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-nva-100 text-xs font-bold text-nva-700">{WASTE[w].letter}</span>
              <div>
                <div className="text-sm font-medium text-ink-800">{WASTE[w].label}</div>
                <div className="text-xs text-ink-500">{WASTE[w].help}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="The opportunity spectrum (value drivers)">
        <p className="mb-3 text-sm text-ink-500">We deliberately look beyond cost. Every opportunity is tagged to one of seven drivers.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {DRIVER_ORDER.map((d) => (
            <div key={d} className="flex items-start gap-2">
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: DRIVER[d].color }} />
              <div>
                <div className="text-sm font-medium text-ink-800">{DRIVER[d].label}</div>
                <div className="text-xs text-ink-500">{DRIVER[d].help}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Automation ladder">
        <div className="space-y-2">
          {(['none', 'assisted', 'rpa', 'ai', 'full'] as const).map((a) => (
            <div key={a} className="flex items-center gap-3">
              <span className="chip bg-flux-100 text-flux-700 min-w-[120px] justify-center">{AUTOMATION[a].label}</span>
              <span className="text-sm text-ink-600">{AUTOMATION[a].help}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Process maturity ladder">
        <div className="space-y-2">
          {MATURITY_LEVELS.map((m) => (
            <div key={m.level} className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-900 text-xs font-bold text-white">{m.level}</span>
              <div>
                <div className="text-sm font-medium text-ink-800">{m.label}</div>
                <div className="text-xs text-ink-500">{m.help}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

const SYM: Record<string, string> = { start: '○', task: '▢', decision: '◇', control: '✓', handoff: '⇄', wait: '⏱', system: '⚙', end: '◉' };
const LBL: Record<string, string> = { start: 'Start', task: 'Task', decision: 'Decision', control: 'Control', handoff: 'Handoff', wait: 'Wait', system: 'System', end: 'End' };
const HELP: Record<string, string> = {
  start: 'Trigger / start event.',
  task: 'A unit of work performed by an actor.',
  decision: 'A branch / gateway where the path splits.',
  control: 'A check, approval or compliance gate.',
  handoff: 'Work passes between roles/teams — a key risk point.',
  wait: 'A queue or delay where nothing is being done.',
  system: 'Automated / system-performed step.',
  end: 'End event / outcome delivered.',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-6">
      <h2 className="mb-3 font-display text-lg font-bold text-ink-800">{title}</h2>
      {children}
    </section>
  );
}

function Row({ symbol, label, help }: { symbol: string; label: string; help: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-ink-100 text-ink-700">{symbol}</span>
      <div>
        <div className="text-sm font-medium text-ink-800">{label}</div>
        <div className="text-xs text-ink-500">{help}</div>
      </div>
    </div>
  );
}
