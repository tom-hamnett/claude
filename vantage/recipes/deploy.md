# Deploy the Vantage agent into the assistant you already have

No installs, no admin rights, no IT ticket. You "regenerate" the same Vantage agent
(`extraction-recipe.md`) inside whichever AI assistant your organisation already
provides, point it at a meeting transcript that already exists, and run it. The
analysis happens inside your tenant's sanctioned assistant; only the result you
choose to share comes back to Vantage.

> Paste the block between `=== BEGIN VANTAGE AGENT ===` and `=== END VANTAGE AGENT ===`
> from `extraction-recipe.md` wherever each platform asks for "instructions".

---

## Microsoft Copilot (Microsoft 365 / Teams)

Teams meeting recordings and **transcripts** save automatically (to OneDrive/
SharePoint), and Copilot can already read them.

**Quickest (no setup):**
1. Open **Copilot** (in Teams, Office, or copilot.microsoft.com signed in with work).
2. Reference the meeting (e.g. open the meeting's recap/transcript, or in Copilot
   chat point it at the meeting file).
3. Paste the recipe and add: *"Apply this to my last meeting's transcript."* Run.

**Reusable (if your tenant allows user-built agents — usually no admin needed):**
1. Open **Copilot Studio → Agents → New agent** (or "Create a copilot/agent").
2. Paste the recipe into the agent's **Instructions**.
3. Add your meeting transcripts/recordings folder as **Knowledge** (OneDrive/
   SharePoint).
4. Save as **"Vantage Coach"**. Run it after meetings: *"Evaluate me in <meeting>."*

---

## Google Gemini (Google Workspace) — a Gem

Meet recordings/transcripts save to **Drive**; Gemini can read them. **Gems** are
user-created custom Geminis — no admin needed.

1. Open **Gemini → Gems → New Gem** (gemini.google.com, signed in with work).
2. Paste the recipe into the Gem's **instructions**; name it **"Vantage Coach"**.
3. In a chat with the Gem, attach or reference the **Meet transcript** (from Drive/
   the Docs transcript) and run: *"Evaluate me in this meeting."*
4. (Optional) Keep the Gem; reuse it after every meeting.

---

## Claude — a Project (or Skill)

1. Open **Claude → Projects → New Project** (claude.ai, your work account).
2. Paste the recipe into the Project's **custom instructions**; name it **"Vantage
   Coach"**.
3. Add the meeting transcript (paste, or upload the transcript/recording file) and
   run.
4. Reuse the Project for future meetings. (Power users: package the recipe as a
   Claude **Skill** for one-click reuse.)

---

## Any other assistant (generic)

Paste the recipe, then paste or attach the meeting transcript, and run. The recipe is
self-contained.

---

## Bringing results into Vantage (optional)

The assistant returns either a full self-only report (**Mode A**) or a minimal
redacted evidence package (**Mode B**). Paste that JSON into Vantage to add it to your
private history and trends. Nothing is sent automatically; you stay in control of what
leaves your environment.

## Honest limits
- **Visual presence** (eye contact, posture) needs an assistant that analyses the
  *recording*, not just the transcript. Gemini/Copilot can sometimes use the video in-
  tenant; otherwise these recipes evaluate verbal + (where the transcript implies it)
  vocal behaviour. Full visual remains a per-tenant capability question.
- **Scoring consistency:** Mode A uses your assistant's model (varies by platform);
  Mode B routes the redacted package to Vantage's calibrated judge for comparable
  scores over time.
- **Tenant policy:** some organisations restrict custom agents/Gems; the "quickest"
  paste-and-run path works even where building reusable agents is disabled.
