import { Link } from 'react-router-dom';
import { Section } from '../components/Section';

const ROWS: { feature: string; free: string | boolean; byok: string | boolean; managed: string | boolean }[] = [
  { feature: 'Unlimited groups, people, templates, sessions', free: true, byok: true, managed: true },
  { feature: 'All vertical template gallery (schools, sites, clinics, pitches)', free: true, byok: true, managed: true },
  { feature: 'Photo / voice / signature evidence', free: true, byok: true, managed: true },
  { feature: 'CSV + PDF exports, JSON backups', free: true, byok: true, managed: true },
  { feature: 'Offline-first, install to home screen', free: true, byok: true, managed: true },
  { feature: 'AI rubric generator', free: false, byok: true, managed: true },
  { feature: 'In-flow calibration coach', free: false, byok: true, managed: true },
  { feature: 'AI report drafter (5 audiences)', free: false, byok: true, managed: true },
  { feature: 'Cross-session insight surfacer', free: false, byok: true, managed: true },
  { feature: 'AI provider', free: '—', byok: 'Your key (Anthropic / OpenAI / Gemini)', managed: 'Sigma-managed' },
  { feature: 'Daily AI quota', free: '—', byok: 'Your provider\'s', managed: '200 calls' },
  { feature: 'Inference cost', free: '—', byok: 'Pay your provider', managed: 'Included' },
];

export default function SigmaPricing() {
  return (
    <>
      <Section
        eyebrow="Pricing"
        title={<>Free clipboard. Paid AI. <span className="grad-text">No tricks.</span></>}
        lede={
          <>
            The clipboard product is free, forever — for everyone, in every vertical. AI is the
            optional upgrade. Two ways to unlock it.
          </>
        }
        align="center"
      />

      <div className="container-w grid md:grid-cols-3 gap-4 -mt-4">
        <Tier
          name="Free"
          price="£0"
          suffix="forever"
          tagline="The full clipboard product."
          cta={{ label: 'Start free', to: '/sigma/unlock' }}
          features={[
            'Every vertical template',
            'Photo / voice / signature evidence',
            'PDF + CSV + JSON exports',
            'Offline-first, install to home',
          ]}
        />
        <Tier
          name="BYOK Unlock"
          price="£4.99"
          suffix="one-time"
          tagline="Bring your own AI provider key."
          cta={{ label: 'Get BYOK code', to: '/sigma/unlock?tier=byok' }}
          accent="brand"
          features={[
            'Everything in Free',
            'All four AI features',
            'Anthropic, OpenAI or Gemini',
            'Pay your own inference cost',
            'No subscription, ever',
          ]}
        />
        <Tier
          name="Sigma AI"
          price="£9.99"
          suffix="/month"
          tagline="Managed AI. No key needed."
          cta={{ label: 'Subscribe', to: '/sigma/unlock?tier=managed' }}
          accent="gold"
          recommended
          features={[
            'Everything in Free',
            'All four AI features',
            'No API key to manage',
            '200 AI calls / day',
            'Cancel anytime',
          ]}
        />
      </div>

      <Section title="What's actually different at each tier" align="center">
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10 text-ink-300">
              <tr>
                <th className="text-left p-4 font-semibold">Feature</th>
                <th className="text-center p-4 font-semibold">Free</th>
                <th className="text-center p-4 font-semibold text-brand-300">BYOK</th>
                <th className="text-center p-4 font-semibold text-gold-300">Sigma AI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {ROWS.map((r) => (
                <tr key={r.feature}>
                  <td className="p-4 text-ink-100">{r.feature}</td>
                  <Cell value={r.free} />
                  <Cell value={r.byok} />
                  <Cell value={r.managed} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Common questions" align="center">
        <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          <FAQ q="Why two paid tiers?" a="Because two real audiences exist. Power users with their own Anthropic / OpenAI / Gemini key just want the unlock — £4.99 once. Everyone else wants it to work without hunting for keys — £9.99 / month. We're not pretending there's only one." />
          <FAQ q="Will the free tier shrink?" a="No. The clipboard product stays free for everyone. AI features are the only thing behind the paywall. We're not playing the SaaS bait-and-switch game." />
          <FAQ q="What happens if my BYOK provider key runs out?" a="Sigma keeps working. Clipboard work is unaffected. AI features will surface a clear error and you can refill or swap providers in Settings." />
          <FAQ q="Can I switch tiers?" a="Yes. Free → BYOK → Sigma AI in either direction. The clipboard data is the same on every tier; only the AI gate moves." />
          <FAQ q="What if I'm offline?" a="Everything except AI keeps working. Cached AI narratives stay readable offline. Calibration coach and rubric generator pause until you're back online." />
          <FAQ q="Schools / health / regulated data?" a="Email hello@quantumtools.ai for a DPA and deployment guide. Sigma's local-first design makes the compliance conversation a lot shorter than the typical SaaS one." />
        </div>
      </Section>

      <Section align="center">
        <div className="card p-10 vignette">
          <div className="h-eyebrow mb-3">Ready</div>
          <h3 className="h-display text-3xl md:text-4xl mb-4">Start with the free product.</h3>
          <p className="text-ink-200 max-w-xl mx-auto">Use it for a week. If the AI features earn their keep, upgrade. If they don't, don't.</p>
          <div className="mt-6 flex justify-center gap-3 flex-wrap">
            <Link to="/sigma/unlock" className="btn-primary">Open Sigma</Link>
            <Link to="/sigma" className="btn-ghost">Read the manifesto</Link>
          </div>
        </div>
      </Section>
    </>
  );
}

function Cell({ value }: { value: string | boolean }) {
  if (typeof value === 'boolean') {
    return (
      <td className="p-4 text-center">
        {value ? <span className="text-brand-300">●</span> : <span className="text-ink-500">—</span>}
      </td>
    );
  }
  return <td className="p-4 text-center text-ink-200">{value}</td>;
}

function Tier({
  name,
  price,
  suffix,
  tagline,
  features,
  cta,
  accent,
  recommended,
}: {
  name: string;
  price: string;
  suffix: string;
  tagline: string;
  features: string[];
  cta: { label: string; to: string };
  accent?: 'brand' | 'gold';
  recommended?: boolean;
}) {
  const ring =
    accent === 'gold'
      ? 'border-gold-300/40 shadow-gold'
      : accent === 'brand'
      ? 'border-brand-400/40 shadow-glow'
      : 'border-white/10';
  return (
    <div className={`relative card p-6 ${ring}`}>
      {recommended ? (
        <div className="absolute -top-3 right-4 chip-gold">Most chosen</div>
      ) : null}
      <div className="text-ink-300 font-mono text-xs uppercase tracking-widest">{name}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-display text-4xl text-ink-50">{price}</span>
        <span className="text-ink-400 text-sm">{suffix}</span>
      </div>
      <p className="text-ink-200 mt-2">{tagline}</p>
      <ul className="mt-5 space-y-2 text-sm text-ink-200">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span className={accent === 'gold' ? 'text-gold-300' : 'text-brand-300'}>●</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link to={cta.to} className={`mt-6 w-full ${accent === 'gold' ? 'btn-gold' : 'btn-primary'}`}>
        {cta.label}
      </Link>
    </div>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <div className="card p-5">
      <div className="font-display text-lg text-ink-50">{q}</div>
      <p className="text-ink-300 text-sm mt-2 leading-relaxed">{a}</p>
    </div>
  );
}
