# Quantum Tools — Marketing Site

> Sigma launch site. PRISM, Analyst's Edge, APEX and ATLAS to follow under the same roof.

## What's here

- `/` and `/sigma` — Sigma landing page (hero, problem, four hero AI features, six verticals, manifesto, pricing, FAQ, CTA)
- `/sigma/pricing` — three-tier pricing with full comparison table and FAQ
- `/sigma/unlock` — Stripe handoff + dev-only preview that mints valid offline-verifiable license codes
- `/sigma/privacy` — privacy notice tailored to the local-first design

## Stack

Vite + React + TypeScript + Tailwind. Locked QT brand palette: vantablack `#0a0a0f`, brand purple `#6c63ff`, gold `#ffd166`, hot coral `#ff6b6b`. Playfair Display headings, DM Sans body.

## Run locally

```bash
npm install
npm run dev
# http://localhost:5174
```

## Stripe wiring (when ready)

1. Create two Payment Links in Stripe:
   - £4.99 one-time → metadata `tier=byok`
   - £9.99/month → metadata `tier=managed`
2. Drop the URLs into `.env`:
   ```
   VITE_STRIPE_LINK_BYOK=https://buy.stripe.com/...
   VITE_STRIPE_LINK_MANAGED=https://buy.stripe.com/...
   ```
3. Wire a webhook (Cloudflare Worker / Vercel function) that on
   `checkout.session.completed` calls `mintCode(tier)` from
   `marketing/src/lib/license.ts` (it's the same algorithm as the app), then
   emails the customer the resulting `SIG-(BYOK|MAN)-...` code.

The Sigma app validates these codes locally (mod-26 checksum, see
`assessment-app/src/services/license.ts`) so users can activate offline.

## Deploy

- **Vercel** — set framework preset to "Vite", root directory `marketing`, leave defaults. `vercel.json` handles SPA rewrites.
- **Netlify** — `netlify.toml` already configured. Set base `marketing`, publish `dist`.

## Adding more QT product pages

When PRISM / Analyst's Edge / APEX / ATLAS pages are built, add them as siblings to `/sigma`:

```
/prism            → PRISM landing
/analysts-edge    → Analyst's Edge landing
/apex             → APEX landing
/atlas            → ATLAS landing
```

Reuse `Section`, `Halo`, `Nav`, `Footer` components and the locked palette so all five products share a consistent look.
