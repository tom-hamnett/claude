"""Channel derivatives from an essay — one per channel, each REFERENCING the essay's named
visual library rather than inventing its own graphics.

  reel_prompt(essay)     -> the locked-template HeyGen prompt (STYLE + Scene/VO/Visual table)
  x_thread(essay)        -> a numbered X thread
  linkedin_post(essay)   -> a condensed LinkedIn post (Substack = the essay itself)
  carousel_specs(essay)  -> square-slide specs (rendered with content_studio.carousel)
"""

import json

from gtm_engine.essay.engine import visual_library_text

# The reel STYLE block — LOCKED, verbatim, every time (the wording from the plan that worked).
REEL_STYLE = ("Minimalist, clean animated data graphics. Palette: background near-black #080F0C; "
              "text near-white #E9F2EC; accents signal-green #20C878 and gold #FFD166. Modern "
              "sans-serif typography. Alex Hormozi bold impactful captions. No stock business "
              "B-roll.")
HOOK_VISUAL = "Presenter only, framed right-of-centre. Captions track the line. No graphic yet."


def _handle() -> str:
    try:
        from gtm_engine.config import DATA_DIR
        from gtm_engine.utils.file_io import load_json
        bp = DATA_DIR / "brand_standards.json"
        if bp.exists():
            pos = (load_json(bp) or {}).get("positioning", {}) or {}
            return pos.get("handle") or pos.get("persona") or "The Rational Strategist"
    except Exception:
        pass
    return "The Rational Strategist"


def _scenes_for_reel(essay) -> list[dict]:
    """Ask Claude to lay out the reel scene-by-scene FROM the essay, choosing which named VIZ to
    show and when. Bookends are presenter; data scenes reference a VIZ id from the library."""
    from gtm_engine.content_studio.generator import _brand_voice
    from gtm_engine.utils.ai_client import call_claude
    lib = visual_library_text(essay)
    viz_ids = [v.id for v in (essay.visuals or [])]
    sys = ("You lay out a short vertical talking-head reel from an essay, for HeyGen. " +
           _brand_voice() + " Write short spoken lines for the ear. Open on the presenter (hook), "
           "intercut the presenter with the DATA scenes, and CLOSE with a plain conclusion that "
           "reflects the essay and tells people where to find more in pragmatic terms — NOT a "
           "hard sell. Each DATA scene must reference one of these existing visuals by id (do NOT "
           "invent new graphics): " + (", ".join(viz_ids) or "(none)") + ". Use ONLY numbers that "
           "appear in the essay/visuals. Return ONLY JSON: {\"scenes\":[{\"beat\":\"\",\"role\":"
           "\"presenter|data\",\"say\":\"the spoken lines\",\"viz\":\"VIZ n or empty\"}]}")
    raw = call_claude(f"ESSAY:\n{essay.body[:4000]}\n\nVISUAL LIBRARY:\n{lib}\n\nLay out the reel.",
                      system=sys, max_tokens=2500)
    s, e = raw.find("{"), raw.rfind("}")
    try:
        scenes = [sc for sc in json.loads(raw[s:e + 1]).get("scenes", []) if isinstance(sc, dict)]
    except Exception:
        scenes = []
    return scenes


def reel_prompt(essay) -> str:
    """The paste-ready HeyGen reel prompt on the LOCKED template: header + STYLE + a three-column
    Scene / Voiceover / Visual table (data rows reference VIZ ids) + the visual library."""
    from gtm_engine.utils.text_clean import clean_text
    scenes = _scenes_for_reel(essay)
    viz_by_id = {v.id: v for v in (essay.visuals or [])}
    handle = _handle()
    out = [
        "Create a vertical (9:16) short-form video for LinkedIn and Instagram — a talking-head "
        "presenter intercut with clean, animated data visualisations.",
        "FIRST, give me a scene-by-scene plan to review before you generate (don't auto-proceed).",
        "STYLE: " + REEL_STYLE,
    ]
    rows, angles, ai = [], ["front", "slight left angle", "slight right angle", "closer"], 0
    for i, sc in enumerate(scenes, 1):
        role = (sc.get("role") or "").lower()
        say = clean_text((sc.get("say") or "").strip())
        viz = (sc.get("viz") or "").strip()
        if role == "data" and viz in viz_by_id:
            v = viz_by_id[viz]
            vis = f"{v.id} — {v.chart_type}: {clean_text(v.spec)}"
            if v.caption:
                vis += f" (caption: {clean_text(v.caption)})"
            if v.is_illustrative():
                vis += " — label this graphic 'illustrative'"
        elif i == 1:
            vis = HOOK_VISUAL
        elif i == len(scenes):
            vis = (f"Presenter returns, right-of-centre. End card with the conclusion, "
                   f"lower-third handle '{handle}' and a signal-green underline.")
        else:
            vis = f"Avatar — {angles[ai % len(angles)]}"
            ai += 1
        block = f"{i}. Scene: {clean_text(sc.get('beat') or '')}"
        if say:
            block += f'\n   Voiceover: "{say}"'
        block += f"\n   Visual: {vis}"
        rows.append(block)
    if rows:
        out.append("SCENE / VOICEOVER / VISUAL:\n\n" + "\n\n".join(rows))
    lib = visual_library_text(essay)
    if lib:
        out.append("VISUAL LIBRARY (the named graphics referenced above — build exactly these, "
                   "don't invent others):\n" + lib)
    out.append("Only use numbers that appear above; never invent a figure.")
    return "\n\n".join(out)


def x_thread(essay) -> str:
    """A numbered X thread derived from the essay — plain, Manson/Tomassi, no hard sell."""
    from gtm_engine.content_studio.generator import _brand_voice
    from gtm_engine.utils.ai_client import call_claude
    from gtm_engine.utils.text_clean import clean_text
    sys = ("You turn an essay into an X (Twitter) thread. " + _brand_voice() + " 5-8 tweets, each "
           "under 275 characters, numbered 'n/'. Tweet 1 is the hook. Plain and sharp, no hard "
           "sell; the last tweet is a quiet pointer to the full essay. Return the thread as plain "
           "text, one tweet per paragraph.")
    raw = call_claude(f"ESSAY:\n{essay.body[:4000]}\n\nWrite the thread.", system=sys, max_tokens=1200)
    return clean_text(raw or "")


def linkedin_post(essay) -> str:
    """A condensed LinkedIn post from the essay (Substack uses the full essay body)."""
    from gtm_engine.content_studio.generator import _brand_voice
    from gtm_engine.utils.ai_client import call_claude
    from gtm_engine.utils.text_clean import clean_text
    sys = ("You condense an essay into a LinkedIn post. " + _brand_voice() + " Short paragraphs, "
           "a strong first line, plain text (no markdown symbols), ~150-250 words, ending with a "
           "quiet pointer to the full essay. No hashtags spam — at most two. No hard sell.")
    raw = call_claude(f"ESSAY:\n{essay.body[:4000]}\n\nWrite the LinkedIn post.",
                      system=sys, max_tokens=900)
    return clean_text(raw or "")


def carousel_specs(essay) -> list[dict]:
    """Square-slide specs for an Instagram/LinkedIn carousel, using the essay + one data slide
    per illustrative/real VIZ. Rendered by gtm_engine.content_studio.carousel.render_carousel."""
    from gtm_engine.content_studio.generator import _brand_voice
    from gtm_engine.utils.ai_client import call_claude
    lib = visual_library_text(essay)
    sys = ("You design a SQUARE carousel from an essay — 5-7 slides, mostly insight, opening on a "
           "cover hook and closing on a plain takeaway (no hard sell). Include AT MOST one 'data' "
           "slide, and only if a visual in the library has a clear number. " + _brand_voice() +
           " Return ONLY JSON: {\"slides\":[{\"type\":\"cover|insight|data|cta\",\"title\":\"\","
           "\"body\":\"\",\"value\":\"(data only)\",\"label\":\"(data only)\"}]}")
    raw = call_claude(f"ESSAY:\n{essay.body[:3500]}\n\nVISUAL LIBRARY:\n{lib}\n\nDesign it.",
                      system=sys, max_tokens=1500)
    s, e = raw.find("{"), raw.rfind("}")
    try:
        slides = json.loads(raw[s:e + 1]).get("slides") or []
    except Exception:
        slides = []
    return [sl for sl in slides if isinstance(sl, dict) and (sl.get("title") or sl.get("value"))]
