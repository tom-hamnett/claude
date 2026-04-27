import { Section } from '../components/Section';

export default function SigmaPrivacy() {
  return (
    <>
      <Section
        eyebrow="Privacy"
        title={<>Your data stays on the device.</>}
        lede={<>Sigma is local-first by design. Here's exactly what happens to data, and where.</>}
      />
      <div className="container-w pb-20 max-w-3xl text-ink-200 space-y-6 leading-relaxed">
        <Block title="What lives on your device">
          Groups, people, templates, sessions, marks, comments and any photo / voice / signature
          evidence you capture. All of it lives in IndexedDB on the device. There is no central
          Sigma database that holds your assessment data.
        </Block>
        <Block title="What leaves the device">
          Only what you actively choose to send. CSV / PDF / JSON exports are generated on-device
          and downloaded directly. AI calls — if you've unlocked them — are sent from your browser
          to your chosen provider (Anthropic, OpenAI or Google Gemini).
        </Block>
        <Block title="API keys (BYOK tier)">
          Stored locally and encrypted at rest with WebCrypto AES-GCM, derived from a passphrase
          you set via PBKDF2 (100k iterations). If you opt out of a passphrase, the key is stored
          in plaintext IndexedDB and clearly flagged in the UI.
        </Block>
        <Block title="AI calls">
          Sent browser-direct to your chosen provider. We do not see the prompt or the response.
          On the managed Sigma AI tier, your request is routed through our edge proxy with a session
          token; the proxy adds the platform key server-side and forwards to the provider. No
          assessment data is logged on the proxy.
        </Block>
        <Block title="Cookies and tracking">
          The Sigma app uses no cookies and no analytics. The marketing pages at quantumtools.ai
          use privacy-preserving analytics for aggregate page views; no individual tracking, no
          third-party advertising scripts.
        </Block>
        <Block title="Compliance posture">
          Sigma is suitable for low-risk assessment data out of the box. For health and education
          deployments where regulated personal data is in scope (HIPAA, FERPA, UK GDPR Article 9
          special category data), email <a className="text-brand-300" href="mailto:hello@quantumtools.ai">hello@quantumtools.ai</a> for a Data
          Processing Agreement and configuration guidance.
        </Block>
        <Block title="Right to deletion">
          Settings → Reset all data clears every Sigma row from the device immediately. There is
          no separate request to make — you control your own deletion.
        </Block>
        <p className="text-xs text-ink-400 pt-8">Last updated 27 April 2026.</p>
      </div>
    </>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-xl text-ink-50 mb-1.5">{title}</h2>
      <p className="text-ink-200">{children}</p>
    </div>
  );
}
