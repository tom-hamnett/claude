import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from './Modal';
import { Icon } from './Icon';
import { activateLicense } from '../services/license';

/**
 * Paywall shown when a user invokes an AI feature without an active license.
 * Two CTAs:
 *   - "I have a code"   → inline activation
 *   - "Get a code"      → opens marketing site (quantumtools.ai/sigma/unlock)
 *
 * The free product is uncompromised — we never block clipboard work behind
 * this. Only AI features.
 */
export function PaywallModal({
  open,
  onClose,
  reason,
}: {
  open: boolean;
  onClose: () => void;
  reason?: string;
}) {
  const [showActivate, setShowActivate] = useState(false);
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const onActivate = async () => {
    setBusy(true);
    setError(null);
    try {
      const license = await activateLicense(code, email || undefined);
      if (license.tier === 'byok') {
        navigate('/settings');
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not activate that code.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Unlock Sigma AI" size="md">
      {reason ? (
        <div className="mb-4 text-sm text-ink-600 bg-ink-50 rounded-xl p-3 border border-ink-100">
          {reason}
        </div>
      ) : null}

      {!showActivate ? (
        <div className="space-y-4">
          <p className="text-ink-700">
            Sigma stays free for clipboard work — always. AI features are an optional add-on
            that turns the tool into a domain coach: instant rubrics, in-flow calibration,
            polished reports.
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            <PriceCard
              title="Bring your own key"
              price="£4.99"
              suffix="one-time"
              description="Paste your Anthropic, OpenAI or Gemini key. Pay your own inference. No subscription."
              cta="Get a BYOK code"
              href="https://quantumtools.ai/sigma/unlock?tier=byok"
              accent="brand"
            />
            <PriceCard
              title="Sigma AI"
              price="£9.99"
              suffix="/month"
              description="Managed AI, no key needed. 200 calls/day, all features. Cancel anytime."
              cta="Subscribe to Sigma AI"
              href="https://quantumtools.ai/sigma/unlock?tier=managed"
              accent="gold"
              recommended
            />
          </div>

          <button
            className="btn-secondary w-full"
            onClick={() => setShowActivate(true)}
          >
            <Icon name="unlock" size={18} />
            I already have an unlock code
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label htmlFor="paywall-code" className="label mb-1 block">
              Unlock code
            </label>
            <input
              id="paywall-code"
              className="input font-mono uppercase tracking-wider"
              placeholder="SIG-BYOK-XXXX-XXXX-XXXX"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </div>
          <div>
            <label htmlFor="paywall-email" className="label mb-1 block">
              Email <span className="text-ink-400">(optional, for receipts)</span>
            </label>
            <input
              id="paywall-email"
              className="input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error ? <div className="text-sm text-hot-600">{error}</div> : null}
          <div className="flex items-center justify-between gap-2 pt-2">
            <button className="btn-ghost" onClick={() => setShowActivate(false)}>
              Back
            </button>
            <button className="btn-primary" disabled={busy || !code} onClick={onActivate}>
              {busy ? 'Activating…' : 'Activate'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function PriceCard({
  title,
  price,
  suffix,
  description,
  cta,
  href,
  accent,
  recommended,
}: {
  title: string;
  price: string;
  suffix: string;
  description: string;
  cta: string;
  href: string;
  accent: 'brand' | 'gold';
  recommended?: boolean;
}) {
  const ring =
    accent === 'gold'
      ? 'border-gold-300 bg-gradient-to-br from-gold-50 via-white to-brand-50/40'
      : 'border-brand-200 bg-gradient-to-br from-brand-50 via-white to-white';
  const button =
    accent === 'gold' ? 'btn-gold' : 'btn-primary';
  return (
    <div className={`rounded-2xl border p-4 ${ring} relative`}>
      {recommended ? (
        <div className="absolute -top-2 right-3 text-[10px] font-bold uppercase tracking-wide bg-ink-800 text-white rounded-full px-2 py-0.5">
          Recommended
        </div>
      ) : null}
      <div className="font-bold text-ink-800">{title}</div>
      <div className="mt-1">
        <span className="text-3xl font-extrabold text-ink-900">{price}</span>
        <span className="text-ink-500 text-sm ml-1">{suffix}</span>
      </div>
      <p className="text-sm text-ink-600 mt-2 leading-snug">{description}</p>
      <a className={`${button} w-full mt-3`} href={href} target="_blank" rel="noopener noreferrer">
        {cta}
        <Icon name="arrow-up-right" size={16} />
      </a>
    </div>
  );
}
