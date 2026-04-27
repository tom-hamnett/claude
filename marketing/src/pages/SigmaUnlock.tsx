import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Section } from '../components/Section';
import { mintCode } from '../lib/license';

/**
 * Unlock flow.
 *
 * In production: Stripe Checkout link → webhook → email with code.
 * Pre-Stripe (today): clear "we'll email your code" UI + dev preview that
 * generates a valid code in-browser so the loop is testable end-to-end.
 *
 * The dev preview is gated by ?preview=1 OR running on localhost. It's not
 * shown on the live marketing site by default.
 */
export default function SigmaUnlock() {
  const [params, setParams] = useSearchParams();
  const tier = (params.get('tier') as 'byok' | 'managed') ?? 'byok';
  const preview = params.get('preview') === '1' || (typeof window !== 'undefined' && window.location.hostname === 'localhost');

  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // The Stripe payment link URLs to be filled in once Stripe is wired up.
  // Until then the buttons jump to a placeholder route on quantumtools.ai
  // that explains "checkout opening soon" so we don't 404 anyone.
  const checkoutUrl = useMemo(() => {
    const env = (import.meta.env as Record<string, string | undefined>);
    if (tier === 'managed') return env.VITE_STRIPE_LINK_MANAGED ?? 'https://quantumtools.ai/sigma/checkout-soon?tier=managed';
    return env.VITE_STRIPE_LINK_BYOK ?? 'https://quantumtools.ai/sigma/checkout-soon?tier=byok';
  }, [tier]);

  useEffect(() => {
    if (!preview) setPreviewCode(null);
  }, [preview]);

  const generatePreview = () => {
    setPreviewCode(mintCode(tier));
    setCopied(false);
  };

  const copyCode = async () => {
    if (!previewCode) return;
    try {
      await navigator.clipboard.writeText(previewCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <Section
        eyebrow={tier === 'managed' ? 'Sigma AI · monthly' : 'BYOK · one-time'}
        title={tier === 'managed' ? <>Subscribe to Sigma AI.</> : <>Unlock with your own key.</>}
        lede={
          tier === 'managed'
            ? <>£9.99 / month. Managed AI, no provider key required, 200 calls per day. Cancel any time.</>
            : <>£4.99 once. Paste your Anthropic, OpenAI or Gemini key into Sigma. Pay your own inference cost.</>
        }
        align="center"
      />

      <div className="container-w max-w-2xl -mt-4">
        <div className="card p-6 vignette">
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setParams({ tier: 'byok' })}
              className={`chip ${tier === 'byok' ? 'chip-brand' : ''}`}
            >
              BYOK · £4.99
            </button>
            <button
              onClick={() => setParams({ tier: 'managed' })}
              className={`chip ${tier === 'managed' ? 'chip-gold' : ''}`}
            >
              Sigma AI · £9.99 / mo
            </button>
          </div>

          <ol className="space-y-4 text-ink-200">
            <Step n={1} title="Pay with Stripe">
              We hand you straight to Stripe Checkout — we never see your card. Apple Pay, Google
              Pay and standard cards all work.
            </Step>
            <Step n={2} title="We email your unlock code">
              {tier === 'byok' ? (
                <>A one-time SIG-BYOK code lands in your inbox immediately. It works offline.</>
              ) : (
                <>A SIG-MAN code lands in your inbox immediately. Sigma re-checks your subscription
                online once a day; offline grace is 30 days.</>
              )}
            </Step>
            <Step n={3} title="Activate inside Sigma">
              Open the app, go to Settings → Sigma AI, paste the code. AI features go live
              instantly.
            </Step>
          </ol>

          <a
            href={checkoutUrl}
            className={`mt-6 w-full ${tier === 'managed' ? 'btn-gold' : 'btn-primary'}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {tier === 'managed' ? 'Subscribe — £9.99 / month' : 'Pay £4.99 once'}
          </a>

          <p className="text-xs text-ink-400 text-center mt-3">
            By continuing you agree to the{' '}
            <Link to="/sigma/privacy" className="text-brand-300 hover:text-brand-200">
              privacy notice
            </Link>
            . VAT shown at checkout where applicable.
          </p>
        </div>

        {preview && (
          <div className="card p-5 mt-5 border-gold-300/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="chip-gold">Dev preview</span>
              <span className="text-ink-400 text-xs font-mono">localhost only</span>
            </div>
            <p className="text-sm text-ink-300 mb-3">
              This generates a valid {tier.toUpperCase()} code in-browser using the same algorithm
              the real webhook will use. For testing the activation loop end-to-end before Stripe
              is wired up.
            </p>
            <div className="flex items-center gap-2">
              <button className="btn-outline" onClick={generatePreview}>
                Generate code
              </button>
              {previewCode ? (
                <>
                  <code className="font-mono text-sm bg-bg-700 px-3 py-2 rounded-lg border border-white/10 text-ink-50 select-all">
                    {previewCode}
                  </code>
                  <button className="btn-ghost text-xs" onClick={copyCode}>
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        )}

        <div className="mt-6 grid sm:grid-cols-3 gap-3 text-xs">
          <Trust title="No card stored">Stripe holds the payment details. Sigma never sees them.</Trust>
          <Trust title="Cancel any time">Managed plan cancels with one click. BYOK is one-and-done.</Trust>
          <Trust title="Offline-verified">Codes carry a checksum so they work without WiFi.</Trust>
        </div>

        <div className="mt-10 text-center">
          <Link to="/sigma" className="text-ink-400 hover:text-ink-100 text-sm">
            ← Back to Sigma
          </Link>
        </div>
      </div>
    </>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <div className="shrink-0 w-7 h-7 rounded-full bg-brand-500/20 border border-brand-400/30 text-brand-200 text-xs font-bold flex items-center justify-center">
        {n}
      </div>
      <div>
        <div className="font-display text-ink-50">{title}</div>
        <div className="text-sm text-ink-300 mt-0.5">{children}</div>
      </div>
    </li>
  );
}

function Trust({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-3">
      <div className="text-ink-50 font-bold">{title}</div>
      <div className="text-ink-400 mt-1 leading-snug">{children}</div>
    </div>
  );
}
