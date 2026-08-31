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

VISUALS = {"presenter", "screenshot", "chart", "stock", "card", "generate"}

_SYSTEM = """You are a short-form video editor choreographing a vertical reel (TikTok/Reels/
Shorts) shot-by-shot against a fixed narration. You do NOT change the words — you cut the
picture to them.

THE GOLDEN RULE for a DATA product: the B-roll IS the presentation. It must be PROOF, not
decoration. When the script says a number or a result, the viewer must SEE that number/result
on screen — as the user's real screenshot, or as a clean data visual you build from the figure
in the script. Never illustrate a hard number with generic stock footage, and never let a
number beat be just words. Stock footage of trading floors / skylines / money is the "guru"
cliché this brand is built against — use it almost never.

Rules grounded in what actually holds attention:
  - A fresh visual every ~2–4 seconds. Split the script into that many beats.
  - ~55% of screen time is the PRESENTER (the face is the anchor); ~45% is proof cutaways.
  - The HOOK (first beat) and the CTA (last beat) are ALWAYS "presenter".
  - Intersperse the presenter — come back to them every few beats, not just the ends.

CHOOSE THE VISUAL for each cutaway, in this strict priority order:
  1. "screenshot"  — the user's OWN uploaded screenshot/recording. Use whenever the media list
                     has one that fits a number/product/dashboard beat. Strongest proof.
  2. "chart"       — a data visual you BUILD from the real figure(s) in the script. This is the
                     DEFAULT for any number/result/comparison/trend beat when no screenshot fits.
                     Read the actual numbers out of the narration and put them in "data_spec".
  3. "stock"       — ONLY for a genuine place/mood/example with NO number (e.g. "a trader at 5am").
                     At most ONE stock shot in the whole reel. 2–5 word query. Prefer chart/presenter.
  4. "card"        — last resort: a pure claim with no number and no asset. The caption carries it.

data_spec (REQUIRED when visual=="chart") — pick the type that fits the sentence:
  • one headline figure  → {"chart_type":"stat","value":"-11.4%","label":"MAX DRAWDOWN","sub":"52-week live test"}
  • X vs Y comparison    → {"chart_type":"bar","title":"Return vs benchmark","unit":"%",
                            "bars":[{"label":"ATLAS","value":34.2},{"label":"S&P 500","value":11.0}]}
  • a trend / curve      → {"chart_type":"line","title":"Equity curve · 52 weeks","series":[100,103,101,108,115],"note":"every trade logged"}
  • a list / ledger      → {"chart_type":"table","title":"The log, losses and all","rows":[["Week 12","+2.3%"],["Week 13","-1.1%"]]}
  Use the REAL numbers spoken in the script. If the sentence has a number but no series data,
  use "stat". Only invent illustrative series values when the script clearly implies a trend
  and states no exact points.

  - Caption: a SHORT muted-friendly line (≤ 8 words) — not the whole sentence.

Return ONLY JSON: {"shots":[ {shot}, ... ]}. Each shot:
{"spoken":"<words, in order>","seconds":<2-4>,"role":"hook|claim|number|comparison|example|product|cta",
 "visual":"presenter|screenshot|chart|stock|card","stock_query":"<if stock>",
 "media_index":<int if screenshot else null>,"data_spec":{<if chart>},"caption":"<short caption>"}
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
    from gtm_engine.video.dataviz import clean_spec
    shots = data.get("shots") or []
    cleaned, stock_used = [], 0
    for sh in shots:
        if not (sh.get("spoken") or "").strip():
            continue
        c = _clean(sh, len(media_names))
        # Cap stock at one clip for the whole reel — extra stock beats become a chart
        # (if the model gave numbers for it) or a card. Stock is texture, not the show.
        if c["visual"] == "stock":
            if stock_used >= 1:
                spec = clean_spec(sh.get("data_spec"))
                c["visual"], c["data_spec"] = ("chart", spec) if spec else ("card", None)
            else:
                stock_used += 1
        cleaned.append(c)
    return cleaned


def _clean(sh: dict, n_media: int) -> dict:
    from gtm_engine.video.dataviz import clean_spec
    visual = sh.get("visual") if sh.get("visual") in VISUALS else "presenter"
    mi = sh.get("media_index")
    spec = clean_spec(sh.get("data_spec"))
    if visual == "screenshot" and not (isinstance(mi, int) and 0 <= mi < n_media):
        # asked for a screenshot we don't have → prefer a real data visual, else card
        visual = "chart" if spec else "card"
    if visual == "chart" and not spec:
        visual = "card"          # asked for a chart with no usable data → card
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
        "data_spec": spec if visual == "chart" else None,
        "caption": (sh.get("caption") or "").strip()[:60],
    }
