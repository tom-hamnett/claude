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

## ✅ SIGN-IN RESOLVED (2026-10-07) — do not re-chase

Cloud sign-in is **working end-to-end**. The chain of blockers and their fixes:

1. **"Load failed"** — the Supabase project (`szhbqwazcnlmwoidzkqv`) had
   **auto-paused** after inactivity. Fixed by restoring it (status now
   `ACTIVE_HEALTHY`). *If "Load failed" ever returns, the project has paused
   again — restore it (Supabase dashboard, or `restore_project` via the Supabase
   connector).*
2. **"Error sending confirmation email"** — Resend's **test sender
   `onboarding@resend.dev`** only delivers to the account-owner email. Solo path:
   sign in with **`tomhamnett85@gmail.com`** (the Resend account email). Email
   now sends and delivers (verified via the Resend connector). The Magic Link
   template already prints `{{ .Token }}`, so the code shows correctly.
3. **Code wouldn't verify** — Supabase was set to **8-digit** OTPs but the app's
   code box hard-caps at **6** (`auth.tsx` `slice(0,6)`), so it silently
   truncated and failed. Fixed by setting **Email OTP Length = 6** in Supabase
   (Authentication → Sign In / Providers → Email).
4. **Blank page after login** — NOT a bug. The app renders fully when the bundle
   loads (verified headlessly with a real session: full dashboard, all four
   Supabase queries 200). It was a **transient bundle-load blip**; Vercel serves
   reliably (20/20 200s direct). A reload fixes it.

**Still TODO (to onboard anyone other than the owner):** verify a real domain in
Resend + point the sender at it (the test sender only reaches the owner's inbox).

**Hardening worth doing (code, future):** add a top-level ErrorBoundary + a
retry/"failed to load" fallback so a bundle-load blip shows a message instead of a
blank; add a `.catch` on `getSession()` in `auth.tsx` so a bad stored session
can't leave the app stuck on the loading spinner; relax the OTP box to accept the
configured code length instead of hard-coding 6.

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
