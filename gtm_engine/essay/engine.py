"""Essay Engine logic — the Socratic Q&A, the SCQA essay, and the visual library.

The dialogue cycles a fixed set of insight questions (always threading in "what can AI now
do here cheaply"), then writes a punchy Situation–Complication–Question–Answer essay in the
brand voice. Analysis is mandatory: propose_visuals() drafts labelled-illustrative graphics,
add_uploaded_visual() takes a real chart; a channel derivative can't run until there's ≥1.
"""

import json
import logging

logger = logging.getLogger(__name__)

# The templated insight questions — asked one at a time, like a real advisor interview.
QUESTIONS = [
    "What's the counterintuitive truth here — the thing most people get wrong?",
    "Where's the labour-intensive, expensive part of this today — who spends the time and money?",
    "What can AI now do here that used to take people, months, or a big invoice?",
    "Why does this actually matter — what's the value at stake if you get it right?",
    "Why isn't this more widely known or done?",
    "Why is it hard — what's the real obstacle to acting on it?",
]


def next_question(essay) -> str | None:
    """The next unanswered question in the flow, or None when the interview is complete."""
    answered = len([x for x in (essay.qa or []) if x.get("a", "").strip()])
    return QUESTIONS[answered] if answered < len(QUESTIONS) else None


def record_answer(essay_id: int, answer: str, question: str = "") -> "object":
    """Store the user's answer to the current question and advance. Returns the essay."""
    from gtm_engine.essay import EssayStore
    store = EssayStore()
    e = store.get(essay_id)
    if not e:
        return None
    q = question or next_question(e) or "Anything else worth saying?"
    e.qa = list(e.qa or []) + [{"q": q, "a": (answer or "").strip()}]
    store.save(e)
    return e


def reflection(answer: str) -> str:
    """A one-line sharp advisor reflection on an answer (adds dialogue feel). '' on failure."""
    from gtm_engine.utils.ai_client import call_claude
    try:
        r = call_claude(f"The user said: \"{answer[:600]}\"\n\nReply with ONE short, sharp "
                        "sentence that reflects it back or pushes it further — like a smart "
                        "advisor. No preamble, no question.",
                        system="You are a sharp, dry strategy advisor. One sentence only.",
                        max_tokens=80)
        return (r or "").strip().strip('"')
    except Exception:
        return ""


def generate_essay(essay_id: int) -> "object":
    """Write the SCQA essay from the Q&A, in brand voice, threading the AI angle. Returns essay."""
    from gtm_engine.essay import EssayStore
    from gtm_engine.content_studio.generator import _brand_voice
    from gtm_engine.utils.ai_client import call_claude
    from gtm_engine.utils.text_clean import clean_text
    store = EssayStore()
    e = store.get(essay_id)
    if not e:
        return None
    qa_text = "\n".join(f"Q: {x.get('q','')}\nA: {x.get('a','')}" for x in (e.qa or []) if x.get("a"))
    sys = ("You write a punchy long-form essay for 'The Rational Strategist'. " + _brand_voice()
           + " STRUCTURE IT AS SCQA: Situation (the world as the reader knows it), Complication "
           "(the uncomfortable turn), Question (the sharp question that raises), Answer (the "
           "insight, the mechanism, the pragmatic move). Somewhere, make the point that the "
           "analysis behind this used to be slow and expensive and AI now makes it cheap — but "
           "don't force it. No hype, no hard sell. Markdown with a strong title (H1) and short "
           "sections. 700–1100 words.")
    raw = call_claude(f"TOPIC: {e.title}\n\nINSIGHT INTERVIEW:\n{qa_text}\n\nWrite the essay.",
                      system=sys, max_tokens=3500)
    e.body = clean_text(raw or "")
    if e.body and not e.status == "generated":
        e.status = "ready"
    store.save(e)
    return e


def propose_visuals(essay_id: int, n: int = 3) -> list:
    """Ask Claude to propose a small visual library from the essay — simple chart types with
    values/labels/caption — marked 'illustrative' (no real data). Adds them and returns them."""
    from gtm_engine.essay import EssayStore, Visual
    from gtm_engine.utils.ai_client import call_claude
    from gtm_engine.utils.text_clean import clean_text
    store = EssayStore()
    e = store.get(essay_id)
    if not e:
        return []
    sys = ("You propose a small library of DATA VISUALS for an essay — the analysis that makes "
           "its point land. Each is a SIMPLE chart from this allowed set only: bar chart, "
           "grouped bars, line chart, big number, before/after, stacked bar. Give real, specific "
           "illustrative values and labels, and a short caption. No gauges/dials/needles/maps. "
           f"Propose {n}. Return ONLY JSON: {{\"visuals\":[{{\"title\":\"\",\"chart_type\":\"\","
           "\"spec\":\"the values/labels/comparison\",\"caption\":\"short kicker\"}}]}}")
    raw = call_claude(f"ESSAY:\n{e.body[:4000]}\n\nPropose the visuals.", system=sys, max_tokens=1500)
    s, en = raw.find("{"), raw.rfind("}")
    items = []
    if s != -1:
        try:
            items = json.loads(raw[s:en + 1]).get("visuals") or []
        except Exception:
            items = []
    start = len(e.visuals)
    new = []
    for i, it in enumerate(items):
        if not isinstance(it, dict):
            continue
        v = Visual(id=f"VIZ {start + i + 1}", title=clean_text(it.get("title", "")),
                   chart_type=(it.get("chart_type") or "bar chart"),
                   spec=clean_text(it.get("spec", "")), caption=clean_text(it.get("caption", "")),
                   kind="illustrative")
        new.append(v)
    e.visuals = list(e.visuals) + new
    store.save(e)
    return new


def add_uploaded_visual(essay_id: int, image_path: str, title: str = "", caption: str = "",
                        spec: str = "") -> "object":
    """Add a real, uploaded chart to the library (the preferred, strongest-proof path)."""
    from gtm_engine.essay import EssayStore, Visual
    store = EssayStore()
    e = store.get(essay_id)
    if not e:
        return None
    vid = f"VIZ {len(e.visuals) + 1}"
    e.visuals = list(e.visuals) + [Visual(id=vid, title=title or vid, chart_type="uploaded",
                                          spec=spec, caption=caption, kind="uploaded",
                                          image_path=image_path)]
    store.save(e)
    return e


def remove_visual(essay_id: int, visual_id: str) -> "object":
    from gtm_engine.essay import EssayStore
    store = EssayStore()
    e = store.get(essay_id)
    if not e:
        return None
    e.visuals = [v for v in e.visuals if v.id != visual_id]
    # renumber so ids stay VIZ 1..n
    for i, v in enumerate(e.visuals, 1):
        v.id = f"VIZ {i}"
    store.save(e)
    return e


def visual_library_text(essay) -> str:
    """The named visual library as text, for injecting into derivative prompts. Every channel
    references THESE (never reinvents them)."""
    lines = []
    for v in (essay.visuals or []):
        tag = " (illustrative)" if v.is_illustrative() else (" (uploaded)" if v.kind == "uploaded" else "")
        desc = v.spec or v.title
        cap = f" — caption: {v.caption}" if v.caption else ""
        lines.append(f"{v.id}{tag}: {v.chart_type} — {desc}{cap}")
    return "\n".join(lines)
