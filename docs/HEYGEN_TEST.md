# Testing the avatar video pipeline

There are two ways to test the Produce → Review loop. Start with the
simulation (no key, no spend), then do one real HeyGen render.

## 1. Simulation mode (no API key, no cost)

This exercises the whole loop offline — it renders a branded **preview
frame** instead of calling HeyGen.

1. Launch the app: `python -m streamlit run gtm_engine/ui/app.py`
2. **Settings → Avatar**: set **Provider = Simulation (offline preview)**,
   leave the rest, **Save**.
3. **CREATE**: on a card in **APPROVED**, click **Producer Brief** (needs an
   Anthropic key to write the script) — or use `python scripts/seed_quantum_demo.py`
   to load ready-made demo briefs.
4. Open the card's **🎬 Video** panel in **PRODUCED** → click **Render**.
   Status goes to **ready** and a preview frame appears.
5. Type a note in **Review note** → **Request revision** (needs an Anthropic
   key: Claude classifies the note into a script / delivery / visual change
   and re-renders). Then **Approve** to move it to **REVIEWED**.

## 2. Real HeyGen render (your key, kept private)

Never paste your key into a chat. Put it in `.env` (local) or Streamlit
**Settings → Secrets** (cloud).

**One-time setup in HeyGen (in their app):**
- Record a ~15s clip to create your avatar (Avatar V learns how you move).
- Optionally clone your voice.
- Note your **avatar_id** and, if cloned, your **voice_id**.

**In this tool:**
1. Add to `.env`:
   ```
   HEYGEN_API_KEY=<your key>
   ANTHROPIC_API_KEY=<your key>
   ```
2. **Settings → Avatar**: Provider = **HeyGen**. Pick your avatar and voice
   from the dropdowns (they load from your account), choose a **delivery
   mode** (voice-clone / record / hybrid), set expressiveness, **Save**.
3. **CREATE → PRODUCED → 🎬 Video → Render.** A ~90s script renders in ~2
   min; the finished clip appears in the panel.
4. Iterate with **Review note** → **Request revision**. **Approve** when happy.

**Hybrid mode:** it defaults to your cloned voice (hands-off). To use a real
take for a specific reel, record ~8s of audio and drop it in before rendering.

## What HeyGen renders vs. what the tool assembles

HeyGen renders only the **Hook + Bookend** (~8s of avatar footage). The
middle Core-Five segments (Tension / Pivot / Proof) are product screens and
data-viz. Stitching them into the final reel is the **assembly** step —
tracked by the engine, not yet auto-produced.
