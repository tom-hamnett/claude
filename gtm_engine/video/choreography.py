"""Choreographer — turns an approved script into a timed shot list.

This is the "plan it up front" layer of the Reel Choreography Engine. Claude
splits the full narration into semantic beats (~2–4s each), labels each with the
job it does, and assigns the visual that does that job — the presenter, one of
your uploaded screenshots, an auto-sourced stock clip, or a data card — plus a
short on-screen caption. The compositor then cuts to this plan over one
continuous voice take.

A shot (dict):
  {
    "spoken":     "the exact words said during this shot (in script order)",
    "seconds":    3.0,                     # target on-screen duration
    "role":       "hook|claim|number|comparison|example|product|cta",
    "visual":     "presenter|screenshot|stock|card",
    "stock_query":"trading floor, dark"    # when visual == stock
    "media_index":0,                       # when visual == screenshot (into middle_media)
    "caption":    "short muted-friendly caption"
  }
"""

import json
import logging

logger = logging.getLogger(__name__)

VISUALS = {"presenter", "screenshot", "stock", "card", "generate"}

_SYSTEM = """You are a short-form video editor choreographing a vertical reel (TikTok/Reels/
Shorts) shot-by-shot against a fixed narration. You do NOT change the words — you cut the
picture to them.

Rules grounded in what actually holds attention:
  - A fresh visual every ~2–4 seconds. Split the script into that many beats.
  - ~60% of screen time is the PRESENTER (the face is the anchor); ~40% is cutaways.
  - The HOOK (first beat) and the CTA (last beat) are ALWAYS "presenter".
  - Intersperse the presenter — come back to them every few beats, not just the ends.
  - Every cutaway does ONE job:
      • a number/result → "screenshot" of the real data if one is available, else "card"
      • a product action/dashboard → "screenshot"
      • an example/mood/place → "stock" (write a 2–5 word stock search query)
      • a claim with no asset → "card" (the caption carries it) or back to "presenter"
  - Prefer the user's OWN screenshots for proof beats when the media list has them.
  - If NO screenshots are available: illustrate example/mood/place/claim beats with
    "stock" and write a concrete 2–5 word visual query (e.g. "rising stock chart",
    "trading desk dark", "city skyline dusk"); put specific numbers/results on a
    "card" (the caption shows the figure). Don't leave an illustrative beat as bare
    presenter unless it's the hook or CTA.
  - Caption: a SHORT muted-friendly line (≤ 8 words) — not the whole sentence.

Return ONLY JSON: {"shots":[ {shot}, ... ]}. Each shot:
{"spoken":"<words, in order>","seconds":<2-4>,"role":"hook|claim|number|comparison|example|product|cta",
 "visual":"presenter|screenshot|stock|card","stock_query":"<if stock>","media_index":<int if screenshot else null>,
 "caption":"<short caption>"}
The concatenation of every "spoken" in order MUST equal the full script. Aim for the target length."""


def choreograph(full_script: str, media_names: list[str], product: str = "",
                target_seconds: int = 25) -> list[dict]:
    """Ask Claude to choreograph the script into a shot list. Returns [] on failure."""
    from gtm_engine.utils.ai_client import call_claude
    media_block = ("\n".join(f"  media_index {i}: {n}" for i, n in enumerate(media_names))
                   if media_names else "  (none uploaded — use stock or cards for proof beats)")
    prompt = (
        f"PRODUCT: {product or 'a data product'}\n"
        f"TARGET LENGTH: ~{target_seconds}s, a cut every ~2–4s.\n"
        f"AVAILABLE SCREENSHOTS/FOOTAGE (map number/product beats to these):\n{media_block}\n\n"
        f"FULL SCRIPT (do not change the words):\n{full_script}\n\nReturn ONLY the JSON."
    )
    raw = call_claude(prompt, system=_SYSTEM, max_tokens=2000)
    s, e = raw.find("{"), raw.rfind("}")
    try:
        data = json.loads(raw[s:e + 1]) if s != -1 and e != -1 else {}
    except Exception:
        return []
    shots = data.get("shots") or []
    return [_clean(sh, len(media_names)) for sh in shots if (sh.get("spoken") or "").strip()]


def _clean(sh: dict, n_media: int) -> dict:
    visual = sh.get("visual") if sh.get("visual") in VISUALS else "presenter"
    mi = sh.get("media_index")
    if visual == "screenshot" and not (isinstance(mi, int) and 0 <= mi < n_media):
        visual = "card"          # asked for a screenshot we don't have → card
    try:
        secs = max(1.5, min(6.0, float(sh.get("seconds") or 3)))
    except (TypeError, ValueError):
        secs = 3.0
    return {
        "spoken": (sh.get("spoken") or "").strip(),
        "seconds": round(secs, 1),
        "role": sh.get("role") or "claim",
        "visual": visual,
        "stock_query": (sh.get("stock_query") or "").strip(),
        "media_index": mi if (visual == "screenshot") else None,
        "caption": (sh.get("caption") or "").strip()[:60],
    }
