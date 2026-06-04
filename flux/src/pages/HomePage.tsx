import { Link, useNavigate } from 'react-router-dom';
import { useAllOpportunities, useAllProcesses, useProjects } from '../store';
import Icon from '../components/Icon';
import { fmtMoney, relativeTime } from '../lib/format';
import { opportunityValue } from '../lib/metrics';

const STAGES = [
  { icon: 'search', name: 'SPOT', desc: 'Rapid diagnostic — isolate where execution drag concentrates.' },
  { icon: 'map', name: 'MAP', desc: 'AI-assisted current-state mapping to the FLUX Standard.' },
  { icon: 'spark', name: 'DIAGNOSE', desc: 'TIMWOODS + VSM opportunity engine, scored and prioritised.' },
  { icon: 'design', name: 'DESIGN', desc: 'Automation-ready future state, business case and roadmap.' },
] as const;

export default function HomePage() {
  const nav = useNavigate();
  const projects = useProjects();
  const processes = useAllProcesses();
  const opps = useAllOpportunities();

  const totalValue = opps ? opportunityValue(opps).total : 0;
  const quickWins = opps ? opps.filter((o) => o.quickWin).length : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-900">Execution Intelligence</h1>
          <p className="mt-1 text-ink-500">See how work really flows. Find the waste. Design the future state.</p>
        </div>
        <button className="btn-primary" onClick={() => nav('/projects')}>
          <Icon name="plus" className="h-4 w-4" /> New engagement
        </button>
      </div>

      {/* Portfolio KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Engagements" value={`${projects?.length ?? 0}`} />
        <Kpi label="Processes mapped" value={`${processes?.length ?? 0}`} />
        <Kpi label="Opportunities found" value={`${opps?.length ?? 0}`} sub={`${quickWins} quick wins`} />
        <Kpi label="Identified value" value={fmtMoney(totalValue)} sub="annualised, est." tone />
      </div>

      {/* How it works */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-400">The FLUX pipeline</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STAGES.map((s, i) => (
            <div key={s.name} className="card p-4">
              <div className="flex items-center gap-2 text-flux-600">
                <Icon name={s.icon as never} className="h-5 w-5" />
                <span className="text-xs font-bold tracking-widest text-ink-300">0{i + 1}</span>
              </div>
              <div className="mt-2 font-display text-lg font-bold text-ink-800">{s.name}</div>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent engagements */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-400">Engagements</h2>
          <Link to="/projects" className="text-sm font-medium text-brand-600 hover:underline">
            View all
          </Link>
        </div>
        {!projects?.length ? (
          <div className="card p-8 text-center text-ink-400">No engagements yet. Create one to get started.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {projects.slice(0, 6).map((p) => {
              const pc = processes?.filter((x) => x.projectId === p.id).length ?? 0;
              return (
                <Link key={p.id} to={`/projects/${p.id}`} className="card group p-4 transition hover:shadow-lift">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-ink-800 group-hover:text-brand-700">{p.name}</div>
                      <div className="text-sm text-ink-500">
                        {p.client} · {p.industry}
                      </div>
                    </div>
                    <Icon name="chevron" className="h-5 w-5 text-ink-300" />
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-xs text-ink-400">
                    <span>{pc} process{pc === 1 ? '' : 'es'}</span>
                    <span>·</span>
                    <span>{relativeTime(p.updatedAt)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: boolean }) {
  return (
    <div className="card p-4">
      <div className="label">{label}</div>
      <div className={`font-display text-2xl font-bold ${tone ? 'text-flux-600' : 'text-ink-800'}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-ink-400">{sub}</div>}
    </div>
  );
}
