import { Link } from 'react-router-dom';
import { Halo } from '../components/Halo';
import { Section } from '../components/Section';

export default function SigmaLanding() {
  return (
    <>
      <Hero />
      <ProblemSection />
      <FeaturesSection />
      <VerticalsSection />
      <ManifestoSection />
      <PricingSection />
      <FAQSection />
      <CTASection />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* faint grid */}
      <div className="absolute inset-0 bg-grid-faint [background-size:40px_40px] opacity-[0.6] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      {/* coloured wash */}
      <div
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[600px] rounded-full blur-3xl opacity-60 pointer-events-none"
        style={{
          background:
            'radial-gradient(closest-side, rgba(108,99,255,0.45), rgba(255,209,102,0.20) 50%, transparent 75%)',
        }}
      />
      <div className="container-w relative pt-20 pb-24 md:pt-28 md:pb-32 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <div className="h-eyebrow mb-5 flex items-center gap-2">
            <span>Quantum Tools</span>
            <span className="opacity-50">·</span>
            <span>Sigma</span>
            <span className="chip ml-1">v0.2 — public beta</span>
          </div>
          <h1 className="h-display text-5xl md:text-7xl leading-[0.98] mb-6">
            The clipboard for{' '}
            <span className="grad-text">spotty WiFi,</span>{' '}
            not conference rooms.
          </h1>
          <p className="text-xl text-ink-200 leading-relaxed max-w-xl">
            Sigma is the offline-first assessment app for anyone evaluating people in the field.
            Schools, sites, clinics, pitches, shops. Built for the practitioner with a phone in
            their pocket — not the executive in the boardroom.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/sigma/unlock" className="btn-primary">
              Open Sigma free
            </Link>
            <Link to="/sigma/pricing" className="btn-ghost">
              See pricing →
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-4 text-xs text-ink-400">
            <Stat n="Offline-first" l="No WiFi? Doesn't matter." />
            <Stat n="6 verticals" l="One platform." />
            <Stat n="£0 forever" l="Free clipboard product." />
          </div>
        </div>
        <div className="relative">
          <Halo />
          {/* tag */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 chip">
            <span className="text-brand-300">●</span> Local-first by design
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-display text-ink-50 text-base">{n}</span>
      <span className="text-ink-400">{l}</span>
    </div>
  );
}

function ProblemSection() {
  return (
    <Section
      eyebrow="The problem"
      title={
        <>
          Every <span className="grad-text">"clipboard app"</span> assumes you have WiFi.
        </>
      }
      lede={
        <>
          The market leaders were built for HR offices, head-office auditors and conference rooms.
          When the WiFi drops on a building site, in a classroom, on a sports pitch or in a home
          visit — they degrade to unusable. Sigma starts from the opposite assumption.
        </>
      }
    >
      <div className="grid md:grid-cols-3 gap-4 mt-8">
        <Problem
          title="The session ends before the form syncs"
          body="Your clipboard rival expects a clean upload at the end. Sigma expects the device to be the source of truth, and treats the network as a courier."
        />
        <Problem
          title="The rubric you need doesn't exist"
          body="You spend the first ten minutes wishing you'd built one. Sigma generates a credible rubric for any vertical from a one-line brief, in 30 seconds."
        />
        <Problem
          title="The report still has to be written"
          body="Half an hour at the kitchen table after a long day. Sigma drafts the parent / manager / trainee / client / your-own-notes version while the marks are still warm."
        />
      </div>
    </Section>
  );
}

function Problem({ title, body }: { title: string; body: string }) {
  return (
    <div className="card p-5">
      <div className="font-display text-lg text-ink-50 mb-2">{title}</div>
      <p className="text-ink-300 text-sm leading-relaxed">{body}</p>
    </div>
  );
}

function FeaturesSection() {
  return (
    <Section
      eyebrow="The four hero features"
      title={
        <>
          AI as a <span className="grad-text">domain coach.</span> Not a chatbot.
        </>
      }
      lede={
        <>
          Each one is small, scoped, and shows its working. Use them, ignore them, or bring your
          own provider key — whichever fits your day.
        </>
      }
      bg="panel"
    >
      <div className="grid md:grid-cols-2 gap-4">
        <Feature
          n="01"
          name="Rubric Generator"
          accent="brand"
          headline="One line in. A credible rubric out."
          body="Type 'Y9 Spanish 5-min unprepared talk on family' or 'safety walk on a steel-frame build'. Get 4-7 criteria with a sliding scale and behavioural anchors. Edit, save, run."
          example="Brief: U13 rugby tackling drill, wet pitch."
        />
        <Feature
          n="02"
          name="Calibration Coach"
          accent="brand"
          headline="A peer's quiet sidebar while you mark."
          body="Spots score inflation, compression, contradictory marks, and high marks without supporting evidence — three short notes max, never patronising. You stay in flow."
          example="6 of 8 students have 5/5 on Resilience — calibrate?"
        />
        <Feature
          n="03"
          name="Report Drafter"
          accent="gold"
          headline="The narrative you'd type at the kitchen table."
          body="Five audiences: parent, manager, trainee, client, your own notes. Real names, real numbers, no invented evidence. Under 350 words. Copyable straight to email."
          example="Parents' evening voice. Specific. Direct. No jargon."
        />
        <Feature
          n="04"
          name="Insight Surfacer"
          accent="gold"
          headline="The patterns you'd otherwise miss."
          body="Reads your roll-up across sessions and flags trends, risks, strengths and cohort patterns in plain English. Three to five sharp bullets, not a wall of text."
          example="Confidence ↑ 22% term-on-term. Tackling stagnant."
        />
      </div>

      <div className="mt-10 card p-5 flex items-start gap-4">
        <div className="chip-brand shrink-0">Provider-flexible</div>
        <p className="text-ink-200 text-sm leading-relaxed">
          Every AI feature works with <strong className="text-ink-50">Anthropic Claude</strong>,{' '}
          <strong className="text-ink-50">OpenAI</strong> or{' '}
          <strong className="text-ink-50">Google Gemini</strong>. Bring your own key
          (<span className="font-mono text-brand-300">£4.99</span> one-time unlock) or let Sigma
          manage it for you (<span className="font-mono text-gold-300">£9.99/mo</span>). Free
          clipboard product stays free either way.
        </p>
      </div>
    </Section>
  );
}

function Feature({
  n,
  name,
  headline,
  body,
  example,
  accent,
}: {
  n: string;
  name: string;
  headline: string;
  body: string;
  example: string;
  accent: 'brand' | 'gold';
}) {
  const accentText = accent === 'gold' ? 'text-gold-300' : 'text-brand-300';
  return (
    <div className="card p-6 group hover:border-white/15 transition">
      <div className="flex items-center gap-3 mb-2">
        <span className={`font-mono text-xs ${accentText}`}>{n}</span>
        <span className="h-eyebrow !text-ink-300">{name}</span>
      </div>
      <h3 className="font-display text-2xl md:text-3xl text-ink-50 leading-tight">{headline}</h3>
      <p className="text-ink-200 mt-3 leading-relaxed">{body}</p>
      <div className="mt-4 rounded-lg bg-bg-700/60 border border-white/10 p-3 font-mono text-xs text-ink-300">
        {example}
      </div>
    </div>
  );
}

const VERTICALS = [
  { emoji: '🎓', name: 'Schools', tag: 'PE, MFL oracy, behaviour, SEN observation' },
  { emoji: '📚', name: '1:1 Tutoring', tag: 'Per-session progress, parent updates, mastery checks' },
  { emoji: '⚽', name: 'Sport', tag: 'Pitchside skill assessment for coaches' },
  { emoji: '🏥', name: 'Health', tag: 'OSCEs, observed practice, community visits' },
  { emoji: '🏗️', name: 'Construction', tag: 'Safety walks, snagging, toolbox audits' },
  { emoji: '💼', name: 'Corporate', tag: 'Customer conversations, competency, L&D' },
];

function VerticalsSection() {
  return (
    <Section
      eyebrow="Horizontal by design"
      title={<>One platform. <span className="grad-text">Six verticals.</span></>}
      lede={
        <>
          Most "clipboard apps" pick one vertical and ignore the rest. Sigma ships seeded templates
          for each, with AI prompts tuned to the language of the domain. You're never starting
          from a blank page.
        </>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {VERTICALS.map((v) => (
          <div
            key={v.name}
            className="card p-5 hover:border-brand-400/30 hover:bg-white/[0.05] transition"
          >
            <div className="text-3xl">{v.emoji}</div>
            <div className="font-display text-xl text-ink-50 mt-2">{v.name}</div>
            <div className="text-sm text-ink-300 mt-1">{v.tag}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 text-sm text-ink-400 text-center max-w-2xl mx-auto">
        Don't see your vertical? Pick the closest fit, then use the AI rubric generator. The
        prompts adapt to the brief you write.
      </div>
    </Section>
  );
}

function ManifestoSection() {
  return (
    <Section
      eyebrow="What we believe"
      title={
        <>
          Professional tools should make you <span className="grad-text">smarter</span>, not lazier.
        </>
      }
      bg="pop"
    >
      <div className="grid md:grid-cols-2 gap-4 mt-2">
        <Belief
          n="01"
          title="Local-first is not a compromise."
          body="The device is the source of truth. The cloud is a courier. Your data is yours; it shouldn't disappear when the WiFi drops, when the SaaS pivots, or when the vendor goes under."
        />
        <Belief
          n="02"
          title="Show your working."
          body="Every AI output in Sigma cites the marks, comments and dates that produced it. No black boxes. No invented evidence. If the AI doesn't know, it says so."
        />
        <Belief
          n="03"
          title="Free where it should be free."
          body="A teacher with one iPad shouldn't pay for the right to use a clipboard. The clipboard product is free, forever. Pay for AI if you want it; don't if you don't."
        />
        <Belief
          n="04"
          title="Bought by individuals. Adopted upward."
          body="The best professional tools are picked up by one person who gets value, then spread. We don't do enterprise demos and committee approvals. We do good products."
        />
      </div>
    </Section>
  );
}

function Belief({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="border-l-2 border-brand-400/40 pl-5">
      <div className="font-mono text-xs text-brand-300 mb-1">{n}</div>
      <div className="font-display text-2xl text-ink-50">{title}</div>
      <p className="text-ink-200 mt-2 leading-relaxed">{body}</p>
    </div>
  );
}

function PricingSection() {
  return (
    <Section
      eyebrow="Pricing"
      title={<>Simple. <span className="grad-text">No tricks.</span></>}
      lede={<>Free clipboard, paid AI. That's it.</>}
      align="center"
    >
      <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
        <PriceCard
          name="Free"
          price="£0"
          suffix="forever"
          tagline="Full clipboard product, every vertical."
          cta={{ label: 'Open Sigma', to: '/sigma/unlock' }}
        />
        <PriceCard
          name="BYOK Unlock"
          price="£4.99"
          suffix="one-time"
          tagline="All AI features. Bring your own provider key."
          cta={{ label: 'Get BYOK code', to: '/sigma/unlock?tier=byok' }}
          accent="brand"
        />
        <PriceCard
          name="Sigma AI"
          price="£9.99"
          suffix="/month"
          tagline="Managed AI. No key, no quota juggling."
          cta={{ label: 'Subscribe', to: '/sigma/unlock?tier=managed' }}
          accent="gold"
          recommended
        />
      </div>
      <div className="text-center mt-8">
        <Link to="/sigma/pricing" className="text-ink-300 hover:text-ink-50 text-sm">
          Detailed comparison →
        </Link>
      </div>
    </Section>
  );
}

function PriceCard({
  name,
  price,
  suffix,
  tagline,
  cta,
  accent,
  recommended,
}: {
  name: string;
  price: string;
  suffix: string;
  tagline: string;
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
      <Link to={cta.to} className={`mt-6 w-full ${accent === 'gold' ? 'btn-gold' : 'btn-primary'}`}>
        {cta.label}
      </Link>
    </div>
  );
}

function FAQSection() {
  return (
    <Section eyebrow="Common questions" title="Things people ask before they buy" align="center">
      <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
        <FAQ
          q="Does the free product nag me?"
          a="No. AI features sit in their own buttons; tap them and a paywall comes up if you haven't unlocked. The rest of the app never reminds you."
        />
        <FAQ
          q="Will my data leave the device?"
          a="Only if you choose to share it. CSV / PDF / JSON exports are local. AI calls go from your browser to your provider — we don't see them."
        />
        <FAQ
          q="What happens if I'm offline?"
          a="The clipboard works the same. Cached AI narratives stay readable. Live AI features pause until you're back online."
        />
        <FAQ
          q="Can I switch AI providers?"
          a="Yes — Anthropic, OpenAI, Gemini. Pick per-account in Settings."
        />
        <FAQ
          q="Why a one-time unlock and a subscription?"
          a="Two real audiences. Power users with their own key just want the unlock. Everyone else wants it to work without setup."
        />
        <FAQ
          q="What about regulated data (health, schools)?"
          a={
            <>
              Email <a href="mailto:hello@quantumtools.ai" className="text-brand-300">hello@quantumtools.ai</a>.
              The local-first design makes the compliance conversation a lot shorter than a typical
              SaaS one.
            </>
          }
        />
      </div>
    </Section>
  );
}

function FAQ({ q, a }: { q: string; a: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="font-display text-lg text-ink-50">{q}</div>
      <div className="text-ink-300 text-sm mt-2 leading-relaxed">{a}</div>
    </div>
  );
}

function CTASection() {
  return (
    <Section align="center">
      <div className="card p-10 md:p-14 vignette text-center">
        <div className="h-eyebrow mb-3">Ready to try it</div>
        <h3 className="h-display text-4xl md:text-5xl mb-4 grad-text">
          Open Sigma. It's free.
        </h3>
        <p className="text-ink-200 max-w-xl mx-auto">
          One iPad. One group. One template. Five minutes. If it earns its keep, upgrade. If it
          doesn't, walk away — you've lost nothing.
        </p>
        <div className="mt-8 flex justify-center gap-3 flex-wrap">
          <Link to="/sigma/unlock" className="btn-primary">
            Open Sigma free
          </Link>
          <Link to="/sigma/pricing" className="btn-ghost">
            See pricing
          </Link>
        </div>
      </div>
    </Section>
  );
}
