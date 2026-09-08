"""The essay wave pipeline (build brief §5).

Intake → Wave Zero (comprehension & research, Pole A/B) → Wave One (provocation hunt) →
Wave Two (evidence dig) → Wave Three (personality layer) → five-beat Draft → Human-voice pass.

Every wave EXTRACTS from Tom and can PROPOSE candidates from research, so he's never blocked.
AI is a MODE (led / adjacent / none), flagged at intake, not a fixed section.
"""

import json

# The five-beat provocation structure — FIXED. (SCQA was explicitly rejected.)
BEATS = ["The Wrong Belief", "The Twist", "The Evidence", "The Stakes", "The Turn"]

WAVE1_QUESTIONS = [
    "What does everyone in your world believe about this that you think is wrong?",
    "What surprised you most when you actually did the work?",
    "What do people consistently get wrong — and pay for?",
]
WAVE2_QUESTIONS = [
    "What's the number that proves your point?",
    "What's the qualitative pattern you've seen that a number couldn't capture?",
    "What's the comparison, benchmark or before/after that makes it land?",
]
WAVE3_QUESTIONS = [
    "What makes you genuinely incredulous here?",
    "What would you be sarcastic about?",
    "Which cultural reference lands — and which lazy one should we disqualify?",
]

# Prohibited constructions for the human-voice pass (§8).
_PROHIBITED = ("the \"it's not X, it's Y\" framing; em-dash asides used as a tic; colon-then-"
               "reveal sentences; scare quotes around invented labels; 'worth noting', 'it's "
               "important to remember', 'in today's fast-paced world'; tricolon abuse (the "
               "reflexive rule of three); any sentence that could open a LinkedIn post written "
               "by someone with nothing to say")


def _dump(essay) -> str:
    parts = [essay.topic or essay.title]
    if essay.brain_dump:
        parts.append("BRAIN DUMP:\n" + "\n".join(essay.brain_dump))
    if essay.exclusions:
        parts.append("MUST NOT BE ABOUT: " + "; ".join(essay.exclusions))
    return "\n\n".join(p for p in parts if p)


def _json_call(prompt: str, system: str, max_tokens: int = 2000) -> dict:
    from gtm_engine.utils.ai_client import call_claude
    raw = call_claude(prompt, system=system, max_tokens=max_tokens)
    s, e = raw.find("{"), raw.rfind("}")
    if s == -1:
        return {}
    try:
        return json.loads(raw[s:e + 1])
    except Exception:
        return {}


# ── [0] Intake ────────────────────────────────────────────────────────────────
def intake_proposals(essay) -> dict:
    """Immediately (before research): 3–5 titles, 2–3 alternative angles, a first-pass AI mode."""
    from gtm_engine.content_studio.generator import _brand_voice
    sys = ("You are an operational-strategy editor. From a messy topic dump, respond with 3-5 "
           "sharp working titles, 2-3 alternative angles, and a first call on the AI mode: 'led' "
           "(AI is the subject), 'adjacent' (AI is one lever), or 'none' (pure strategy). "
           + _brand_voice() + " Return ONLY JSON: {\"titles\":[..],\"angles\":[..],"
           "\"ai_mode\":\"led|adjacent|none\"}")
    d = _json_call(_dump(essay), sys, 900)
    return {"titles": d.get("titles", []), "angles": d.get("angles", []),
            "ai_mode": d.get("ai_mode", "adjacent")}


# ── [1] Wave Zero — comprehension & research ─────────────────────────────────
def wave0_research(essay) -> dict:
    """Prove comprehension before challenging: what it is, the standard practice, what people
    already say (Pole A prestige / Pole B raw), and what's missing. Context, not essay content."""
    from gtm_engine.content_studio.generator import _brand_voice
    sys = ("Research a topic before an essay is written about it. Reflect back: what the concept "
           "IS; the accepted standard practice in the field; what people already write and "
           "complain about — split into POLE A (prestige: major consultancies, frameworks, "
           "academic/industry research) and POLE B (raw: practitioner blogs, forums, comment "
           "sections — the real questions people lose sleep over: how do I deliver this, "
           "navigate the politics, get promoted); and the GAPS you think are missing from the "
           "conversation. Draw on your own knowledge; label clearly. " + _brand_voice()
           + " Return ONLY JSON: {\"comprehension\":\"\",\"standard_practice\":\"\",\"pole_a\":"
           "[..],\"pole_b\":[..],\"gaps\":[..]}")
    d = _json_call(_dump(essay), sys, 2500)
    return {"comprehension": d.get("comprehension", ""),
            "standard_practice": d.get("standard_practice", ""),
            "pole_a": d.get("pole_a", []), "pole_b": d.get("pole_b", []),
            "gaps": d.get("gaps", [])}


# ── propose-mode for waves 1 & 3 (candidates when Tom shrugs) ────────────────
def propose_provocations(essay) -> list:
    """Candidate wrong-beliefs/twists from the research — for when Tom has none to offer."""
    from gtm_engine.content_studio.generator import _brand_voice
    ctx = _dump(essay) + "\n\nRESEARCH:\n" + json.dumps(essay.research or {}, ensure_ascii=False)[:2500]
    sys = ("Propose 3 candidate PROVOCATIONS for an essay — each a widely-held wrong belief plus "
           "the counterintuitive twist that makes it backwards. The gap between prestige and raw "
           "practice is often where it lives. " + _brand_voice() + " Return ONLY JSON: "
           "{\"candidates\":[{\"wrong_belief\":\"\",\"twist\":\"\"}]}")
    return _json_call(ctx, sys, 1200).get("candidates", [])


def propose_references(essay) -> dict:
    """2–3 cultural references (film/music/lit/TV/memes) + the obvious one to DISQUALIFY."""
    from gtm_engine.content_studio.generator import _brand_voice
    sys = ("Propose 2-3 cultural references for an essay — from ANY of film, music/lyrics, "
           "literature (highbrow welcome), TV, memes/internet — broadly recognisable and earning "
           "their place, each with a one-line rationale. Also name the OBVIOUS overused reference "
           "to explicitly disqualify (the 'everyone reaches for X and it's wrong' move). "
           + _brand_voice() + " Return ONLY JSON: {\"references\":[{\"ref\":\"\",\"why\":\"\"}],"
           "\"disqualify\":\"\"}")
    d = _json_call(_dump(essay) + "\n\n" + (essay.body or essay.draft or ""), sys, 900)
    return {"references": d.get("references", []), "disqualify": d.get("disqualify", "")}


# ── AI three-beat (led mode only) ────────────────────────────────────────────
_AI_THREEBEAT = (
    "AI THREE-BEAT (weave in, don't bolt on): (1) what consultants used to charge a fortune for, "
    "opaquely — research, driver analysis, benchmarking, best-practice scans, options appraisal; "
    "(2) what AI opens up now — the same work, transparent, fast, in-house; (3) MANDATORY "
    "credibility beat — where it STILL bites you: the judgement calls, the context AI can't see, "
    "why 'I want this from AI' is never as simple as it sounds. Also watch for the seam: in a "
    "corporate environment, politics is as hard to navigate as data — and politics is the bit AI "
    "can't touch.")


def _ai_mode_instruction(mode: str) -> str:
    if mode == "led":
        return "AI is the SUBJECT of this essay. " + _AI_THREEBEAT
    if mode == "adjacent":
        return ("AI appears as ONE lever among several — light touch, no evangelism. Only mention "
                "it where it genuinely belongs.")
    return "PURE STRATEGY — no AI content; reference tools only if genuinely relevant."


# ── [5] Draft (five beats) ───────────────────────────────────────────────────
def draft_essay(essay, words: int = 550) -> str:
    """Assemble the five-beat draft — Wrong Belief → Twist → Evidence → Stakes → Turn — with the
    analysis peppered where it proves a point, and the AI mode applied. Returns the draft."""
    from gtm_engine.essay import EssayStore
    from gtm_engine.content_studio.generator import _brand_voice
    from gtm_engine.essay.engine import visual_library_text
    from gtm_engine.utils.text_clean import clean_text
    from gtm_engine.utils.ai_client import call_claude
    store = EssayStore()
    e = store.get(essay.id) if getattr(essay, "id", None) else essay
    lib = visual_library_text(e)
    sys = (f"Write a {max(300, words - 60)}-{min(900, words + 60)} word essay for 'The Rational "
           "Strategist'. " + _brand_voice() + " STRUCTURE (fixed, five beats): 1) THE WRONG "
           "BELIEF — open on what everyone already believes, grab the collar in the first line, "
           "no scene-setting. 2) THE TWIST — why it's backwards (the counterintuitive turn; if it "
           "isn't surprising, say so). 3) THE EVIDENCE — the analysis, PEPPERED through the "
           "argument where it proves a claim, never a single block; reference the visuals below "
           "by id. 4) THE STAKES — why it matters now, what it costs to keep believing the wrong "
           "thing, urgency without hype. 5) THE TURN — what to do differently, concrete not "
           "aspirational. " + _ai_mode_instruction(e.ai_mode) + " Challenging, provocative, "
           "incredulous, direct. Markdown, strong H1 title.")
    ctx = (f"TOPIC: {e.title}\n\nRESEARCH:\n{json.dumps(e.research or {}, ensure_ascii=False)[:2500]}\n\n"
           f"PROVOCATION:\n{json.dumps(e.provocation or {}, ensure_ascii=False)}\n\n"
           f"PERSONALITY:\n{json.dumps(e.personality or {}, ensure_ascii=False)}\n\n"
           f"VISUAL LIBRARY (reference by id):\n{lib}\n\nWrite the essay.")
    e.draft = clean_text(call_claude(ctx, system=sys, max_tokens=3500) or "")
    e.status = "draft"
    store.save(e)
    return e.draft


# ── [6] Human-voice pass ─────────────────────────────────────────────────────
def human_voice_pass(essay) -> str:
    """A separate, explicit pass: rewrite the draft to read as human-written per the style rules.
    Writes the result to essay.body and sets status 'final'. Returns the body."""
    from gtm_engine.essay import EssayStore
    from gtm_engine.utils.text_clean import clean_text
    from gtm_engine.utils.ai_client import call_claude
    store = EssayStore()
    e = store.get(essay.id) if getattr(essay, "id", None) else essay
    src = e.draft or e.body
    if not src.strip():
        return ""
    sys = ("Rewrite an essay so it reads as genuinely human-written. Rhetorical technique only "
           "(no imported worldview): second person, direct address; short declaratives that land; "
           "incredulity as a legitimate register; sarcasm used surgically; cultural reference as "
           "argument not decoration; treat the reader as an adult who can be told they're wrong. "
           "PROHIBITED: " + _PROHIBITED + ". REQUIRED: varied sentence length (some very short); "
           "at least one paragraph that is a single line; concrete nouns over abstract; British "
           "English. Keep the five-beat shape and the argument intact. Return the rewritten essay "
           "in Markdown, nothing else.")
    e.body = clean_text(call_claude(f"DRAFT:\n{src}\n\nRewrite it.", system=sys, max_tokens=3500) or "")
    if e.body:
        e.status = "final"
    store.save(e)
    return e.body
