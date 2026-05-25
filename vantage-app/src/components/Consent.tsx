import { PERMISSIONS, PROMISES, type Permission } from '../content/permissions';

// The up-front privacy promise — shown before we ask for anything.
export function PromiseScreen() {
  return (
    <div className="space-y-3">
      {PROMISES.map((p, i) => (
        <div key={i} className="ai-card">
          <div className="font-display text-base text-ink-900 mb-0.5">{p.title}</div>
          <p className="text-sm text-ink-600">{p.body}</p>
        </div>
      ))}
      <p className="text-xs text-ink-400 px-1">These aren’t fine print — they’re built into how Vantage works.</p>
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      className={`relative w-12 h-7 rounded-full transition shrink-0 ${on ? 'bg-brand-500' : 'bg-ink-200'}`}
    >
      <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition ${on ? 'left-[1.375rem]' : 'left-0.5'}`} />
    </button>
  );
}

// One permission, told as Benefit · Problem · Advantage · Safety.
export function PermissionCard({ perm, on, onToggle }: { perm: Permission; on: boolean; onToggle: () => void }) {
  return (
    <div className={`rounded-2xl border p-4 transition ${on ? 'border-brand-200 bg-brand-50/40' : 'border-ink-200 bg-white'}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl leading-none mt-0.5">{perm.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-ink-900">{perm.title}</span>
            <span className={`chip ${perm.optUp ? 'chip-gold' : 'chip-teal'}`}>{perm.cost}</span>
            {perm.optUp && <span className="text-[10px] uppercase tracking-wide font-semibold text-ink-400">opt-in</span>}
          </div>
        </div>
        <Toggle on={on} onClick={onToggle} />
      </div>
      <dl className="mt-3 grid sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <Beat term="What you get" desc={perm.benefit} />
        <Beat term="Why it matters" desc={perm.problem} />
        <Beat term="How we do it" desc={perm.advantage} />
        <Beat term="Your safety" desc={perm.safety} accent />
      </dl>
    </div>
  );
}

function Beat({ term, desc, accent }: { term: string; desc: string; accent?: boolean }) {
  return (
    <div>
      <dt className={`label ${accent ? 'text-teal-700' : 'text-ink-400'} mb-0.5`}>{term}</dt>
      <dd className="text-ink-600 leading-snug">{desc}</dd>
    </div>
  );
}

export function PermissionsList({ values, onToggle }: { values: Record<string, boolean>; onToggle: (id: string) => void }) {
  return (
    <div className="space-y-3">
      {PERMISSIONS.map((p) => (
        <PermissionCard key={p.id} perm={p} on={!!values[p.id]} onToggle={() => onToggle(p.id)} />
      ))}
    </div>
  );
}
