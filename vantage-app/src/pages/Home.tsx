import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getProfile, getSettings } from '../db';
import { MODULES } from '../content/curriculum';
import { Page } from '../components/Shell';
import { ScoreBadge } from '../components/ui';

export default function Home() {
  const profile = useLiveQuery(() => getProfile(), []);
  const settings = useLiveQuery(() => getSettings(), []);
  const evals = useLiveQuery(() => db.evaluations.orderBy('createdAt').reverse().limit(5).toArray(), []);
  const progress = useLiveQuery(() => db.progress.toArray(), []);

  const done = (progress || []).filter((p) => p.completedAt).length;
  const hasKey = !!settings?.apiKey?.trim();

  return (
    <Page
      title={profile?.displayName ? `Welcome back, ${profile.displayName.split(' ')[0]}` : 'Welcome to VANTAGE'}
      subtitle="Master the full range of executive presence — gravitas and influence through difficult conversations, negotiation and consultative selling — then get holistic, self-only AI feedback on your real conversations."
    >
      {!profile?.onboarded && (
        <div className="ai-card mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="label mb-1">Get started</div>
            <p className="text-ink-700">
              Tell the coach about your role and goals, and it will tailor which modules matter most for you.
            </p>
          </div>
          <Link to="/onboarding" className="btn-primary">Set up my coach →</Link>
        </div>
      )}

      <Link to="/playbook" className="ai-card mb-6 flex items-center gap-4 hover:shadow-lift transition group">
        <div className="text-3xl">📕</div>
        <div className="flex-1">
          <div className="label mb-0.5">Free playbook</div>
          <p className="text-ink-700"><span className="font-semibold">The Executive Presence Playbook</span> — the 10-module framework, distilled from the executive canon. Great to share.</p>
        </div>
        <span className="text-brand-600 font-semibold text-sm group-hover:underline whitespace-nowrap">Get it →</span>
      </Link>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <Link to="/learn" className="card p-5 hover:shadow-lift transition group">
          <div className="text-2xl mb-2">📚</div>
          <h3 className="font-display text-xl text-ink-900 mb-1">1 · Learn the modules</h3>
          <p className="text-ink-500 text-sm mb-3">
            Ten deeply-taught modules — presence, communication, influence, listening, difficult conversations, negotiation and sales — with named frameworks from the executive canon and real-world practice.
          </p>
          <span className="text-brand-600 font-semibold text-sm group-hover:underline">
            Browse the curriculum ({done}/{MODULES.length} completed) →
          </span>
        </Link>
        <Link to="/evaluate" className="card p-5 hover:shadow-lift transition group">
          <div className="text-2xl mb-2">🎙️</div>
          <h3 className="font-display text-xl text-ink-900 mb-1">2 · Evaluate a conversation</h3>
          <p className="text-ink-500 text-sm mb-3">
            Then upload audio/video, paste, or record a real conversation. Get a strengths-vs-focus dashboard with the exact moments and the modules to work on.
          </p>
          <span className="text-brand-600 font-semibold text-sm group-hover:underline">Start a diagnostic →</span>
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl text-ink-900">Recent evaluations</h2>
            <Link to="/progress" className="text-sm text-brand-600 font-semibold">See trends →</Link>
          </div>
          {evals && evals.length > 0 ? (
            <div className="space-y-2">
              {evals.map((e) => (
                <Link key={e.id} to={`/evaluate/${e.id}`} className="card p-4 flex items-center gap-4 hover:shadow-lift transition">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-ink-900 truncate">{e.title}</div>
                    <div className="text-xs text-ink-400">
                      {new Date(e.createdAt).toLocaleString()} · {e.interactionType.replace('-', ' ')}
                      {e.demo && ' · offline preview'}
                    </div>
                  </div>
                  <ScoreBadge value={e.result.overall} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="card p-6 text-center text-ink-500">
              No evaluations yet. <Link to="/evaluate" className="text-brand-600 font-semibold">Run your first →</Link>
            </div>
          )}
        </section>

        <section>
          <h2 className="font-display text-xl text-ink-900 mb-3">Set-up</h2>
          <div className="card p-4 space-y-3">
            <Row label="AI engine" value={hasKey ? 'Live (Claude)' : 'Offline preview'} ok={hasKey} />
            <Row label="Coach profile" value={profile?.onboarded ? 'Personalised' : 'Not set'} ok={!!profile?.onboarded} />
            <Row label="Passive agent" value={settings?.passiveAgent ? 'On' : 'Off (manual)'} ok={true} />
            {!hasKey && (
              <Link to="/settings" className="btn-secondary w-full btn-sm">Add API key for full analysis</Link>
            )}
          </div>
        </section>
      </div>
    </Page>
  );
}

function Row({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink-500">{label}</span>
      <span className={`font-semibold ${ok ? 'text-teal-700' : 'text-gold-700'}`}>{value}</span>
    </div>
  );
}
