# FLUX — Session Handoff

**What this is:** context transfer for continuing the **FLUX** build in a new
Cowork session. FLUX is an AI-native competitor to **OptiQ** (Jabian Consulting's
execution-management / process-mapping tool). The full blow-by-blow is in
`TRANSCRIPT.md` (same folder); screenshots are in `attachments/`.

**To resume in Cowork:** open the repo `tom-hamnett/claude` on branch
`claude/optiq-competitor-process-mapping-U8Zte`, then paste this file (or point
Claude at `flux/docs/handoff/HANDOFF.md`) as the first message.

---

## Project at a glance
- **App:** `flux/` — React + Vite + TypeScript + Tailwind, Supabase backend.
- **Branch:** `claude/optiq-competitor-process-mapping-U8Zte`.
- **Repo:** `tom-hamnett/claude`.
- **AI routing (dual, shared-key server proxy):**
  - **Claude Opus 4.8** → reasoning / process diagnosis / opportunity ID.
  - **Gemini 3 Pro** → media ingest (video / PDF / images).
- **Product framing:** standardised, comparable process maps + opportunity
  identification across efficiency / effectiveness / waste / scale, grounded in
  Lean (TIMWOODS 8 wastes) and Kaizen best practice.

## Recent commits (newest first)
- Docs: mandatory OTP email-template fix + SMTP notes
- Dual shared-key routing — Claude Opus 4.8 reasoning + Gemini 3 Pro media
- Shared-key server proxy + cross-org project access (SaaS foundation)
- Per-project access control (private projects + member invites)
- Project front page (progress, aggregate findings, data-needed) + repository

---

## 🔴 ACTIVE BLOCKER: cloud sign-in email fails
**Symptom:** sign-in shows **"Error sending confirmation email"** after *Send code*.

**Diagnosis (confirmed):** app code is fine — `flux/src/services/auth.tsx:95`
just surfaces Supabase's own error. That string is Supabase Auth's **SMTP send
failure**, i.e. the Supabase → **Resend** handoff failing. Most likely cause:
Supabase is on Resend's **test sender `onboarding@resend.dev`**, which only
delivers to the Resend account's **own** email; any other recipient → Resend 403.
So the recipient address is not the problem — the **sender** must be fixed.

**Fix (permanent):**
1. Resend → **Domains** → verify a domain you control now (not v2ogroup).
2. Resend → **API Keys** → new key (`re_…`).
3. Supabase → **Authentication → SMTP Settings**: host `smtp.resend.com`,
   port `465`, user `resend`, password = new key, **sender = @your-verified-domain**.
4. Supabase → **Authentication → Emails → Templates → Magic Link**: body must
   print **`{{ .Token }}`** (see `flux/docs/DEPLOYMENT.md:54-60`), else the email
   contains a link, not the 6-digit code the app expects.

**Diagnostic shortcut:** Resend → **Emails/Logs** after a failed attempt.
403 = wrong recipient/test-sender; 401 = stale API key in Supabase; no entry =
Supabase isn't using Resend (built-in mailer, rate-limited).

## ⚠️ Account context (important)
- Owner **no longer controls V2O Sports** — **no access to `tom@v2ogroup.com`
  or any `v2ogroup.com` email**. Don't route anything to that domain.
- **Resend and Supabase are under the owner's own email and ARE accessible.**
- Stale `v2ogroup.com` examples in `flux/docs/DEPLOYMENT.md` should be repointed
  to a controlled domain (cleanup task, not urgent).

## Verification plan once signed in
1. **Diagnose a process** → should route to **Claude Opus 4.8**.
2. **Upload a short video / PDF** → should route to **Gemini 3 Pro**.

## Suggested next steps
- [ ] Fix Resend sender (verify domain + new key) → confirm code email arrives.
- [ ] Confirm Magic Link template prints `{{ .Token }}`.
- [ ] Sign in; run the two routing tests above.
- [ ] Repoint stale `v2ogroup.com` references in docs.
