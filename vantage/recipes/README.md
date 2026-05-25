# Vantage agent recipes — capture with the assistant they already have

**The adoption insight:** people won't install software on a work machine or raise an
IT ticket. But most already have a **sanctioned AI assistant** in their environment —
Microsoft Copilot, Google Gemini, or Claude — that already has governed access to
their meetings and transcripts. So instead of shipping a binary, Vantage ships a
**portable agent recipe** the user *regenerates inside their own assistant* and runs.

Why this is the right default:
- **Zero install, zero IT.** Nothing to download; the assistant is already approved.
- **Data stays in the compliance boundary.** Teams/Meet/Zoom already transcribed the
  meeting; the in-tenant assistant reads it and synthesises. Only the minimal,
  redacted result leaves — and only if the user pastes it into Vantage.
- **No ASR to build or run.** The transcript already exists.
- **Self-only + redacted by construction** (baked into the recipe).

## Files
- `extraction-recipe.md` — the canonical, platform-neutral agent (paste-ready), with
  Mode A (full self-only evaluation, max privacy) and Mode B (minimal evidence package
  for Vantage to score).
- `deploy.md` — 2-minute "regenerate and run" steps for Copilot, Gemini (Gem), Claude,
  and any other assistant.

## Where the installed agent fits now
The native folder-watching agent (`vantage-app/local-agent/`) is **no longer the
default** — it's an optional power-user / self-hoster path for people who *want* a
local binary. The assistant-recipe approach is the primary, friction-free route for
the large majority in managed work environments.
