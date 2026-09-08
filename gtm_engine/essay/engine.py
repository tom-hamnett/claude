"""Visual-library helpers for the Essay Engine.

The essay's evidence lives in a named visual library (VIZ 1, VIZ 2, …). Uploaded/real charts
are the strongest proof; AI-proposed ones are clearly labelled 'illustrative'. Every channel
derivative references THESE by id rather than inventing its own graphics.
"""

import json
import logging

logger = logging.getLogger(__name__)


def visual_library_text(essay) -> str:
    """The named visual library as text, for injecting into derivative prompts."""
    lines = []
    for v in (essay.visuals or []):
        tag = " (illustrative)" if v.is_illustrative() else (
            " (uploaded)" if v.kind in ("uploaded", "real") else "")
        desc = v.spec or v.title
        cap = f" — caption: {v.caption}" if v.caption else ""
        lines.append(f"{v.id}{tag}: {v.chart_type} — {desc}{cap}")
    return "\n".join(lines)


def propose_visuals(essay_id: int, n: int = 3) -> list:
    """Propose a small visual library from the essay — simple chart types with values/labels/
    caption, marked 'illustrative'. Peppered as evidence, matched to the claims. Returns them."""
    from gtm_engine.essay import EssayStore, Visual, PROV_PROPOSED
    from gtm_engine.utils.ai_client import call_claude
    from gtm_engine.utils.text_clean import clean_text
    store = EssayStore()
    e = store.get(essay_id)
    if not e:
        return []
    sys = ("You propose DATA VISUALS as evidence for an essay — each proves a SPECIFIC claim in "
           "the argument. Use a SIMPLE type only: bar chart, column chart, table, word cloud, "
           "scatter/quadrant, single-stat callout, before/after. Give specific illustrative "
           "values/labels, the claim it proves, and a short caption. No gauges/dials/needles/"
           f"maps. Propose {n}. Return ONLY JSON: {{\"visuals\":[{{\"title\":\"\",\"claim\":\"\","
           "\"chart_type\":\"\",\"spec\":\"values/labels/comparison\",\"caption\":\"short "
           "kicker\"}}]}}")
    raw = call_claude(f"ESSAY:\n{e.body[:4000]}\n\nPropose the evidence visuals.",
                      system=sys, max_tokens=1500)
    s, en = raw.find("{"), raw.rfind("}")
    items = []
    if s != -1:
        try:
            items = json.loads(raw[s:en + 1]).get("visuals") or []
        except Exception:
            items = []
    start, new = len(e.visuals), []
    for i, it in enumerate(items):
        if not isinstance(it, dict):
            continue
        new.append(Visual(id=f"VIZ {start + i + 1}", title=clean_text(it.get("title", "")),
                          claim=clean_text(it.get("claim", "")),
                          chart_type=(it.get("chart_type") or "bar chart"),
                          spec=clean_text(it.get("spec", "")), caption=clean_text(it.get("caption", "")),
                          kind="illustrative", provenance=PROV_PROPOSED))
    e.visuals = list(e.visuals) + new
    store.save(e)
    return new


def add_uploaded_visual(essay_id: int, image_path: str, title: str = "", caption: str = "",
                        spec: str = "", claim: str = "") -> "object":
    """Add a real, uploaded chart to the library (preferred — strongest proof)."""
    from gtm_engine.essay import EssayStore, Visual, PROV_TOM
    store = EssayStore()
    e = store.get(essay_id)
    if not e:
        return None
    vid = f"VIZ {len(e.visuals) + 1}"
    e.visuals = list(e.visuals) + [Visual(id=vid, title=title or vid, claim=claim,
                                          chart_type="uploaded", spec=spec, caption=caption,
                                          kind="uploaded", provenance=PROV_TOM, image_path=image_path)]
    store.save(e)
    return e


def remove_visual(essay_id: int, visual_id: str) -> "object":
    from gtm_engine.essay import EssayStore
    store = EssayStore()
    e = store.get(essay_id)
    if not e:
        return None
    e.visuals = [v for v in e.visuals if v.id != visual_id]
    for i, v in enumerate(e.visuals, 1):
        v.id = f"VIZ {i}"
    store.save(e)
    return e
