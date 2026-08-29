"""Hook Library + direction dials — the science of the first 1.3 seconds.

Adapted from what the best operators actually do (Hormozi's Hook→Retain→Reward,
MrBeast's open loops + retention resets, the 2026 viral-hook data) to a
sophisticated, anti-guru B2B brand — no cringe "POV" clickbait.

The engine rotates hook archetypes so no two reels open the same way, and the
user can pick one (or "rotate") per reel and steer tone + passion.
"""

# Each archetype: how it works + a worked example in a punchy, credible voice.
HOOK_ARCHETYPES = [
    {
        "id": "uncomfortable_truth",
        "name": "Uncomfortable Truth",
        "what": "Say the thing everyone thinks but nobody says. Category-punch, never at a person.",
        "example": "Your strategy framework is now a $20 API call.",
        "guidance": "Open with a flat, confident claim that stings because it's true. No hedging.",
    },
    {
        "id": "named_number",
        "name": "Named Number",
        "what": "A concrete, specific, slightly surprising figure. Specificity beats generality.",
        "example": "52 weeks of trades, published in full. Here's the one number nobody shows.",
        "guidance": "Lead with a real, precise number and imply a payoff behind it (open loop).",
    },
    {
        "id": "mistake_warning",
        "name": "Mistake Warning",
        "what": "Name a costly mistake the viewer might be making right now.",
        "example": "Most diligence dies on one hidden slide. Here's the slide.",
        "guidance": "Make it self-relevant: 'if you're still doing X…'. Then promise the fix.",
    },
    {
        "id": "open_loop",
        "name": "Open Loop",
        "what": "Start mid-tension, unresolved. Don't close the loop until the end.",
        "example": "I stopped trusting management commentary years ago. This is the moment I saw why.",
        "guidance": "Begin at the turning point; the viewer stays to find out how it resolves.",
    },
    {
        "id": "named_mechanism",
        "name": "Named Mechanism",
        "what": "Tease a specific method/system by name. Curiosity about 'how'.",
        "example": "There's a five-source check that kills the LinkedIn-only trap.",
        "guidance": "Name the mechanism, promise to show how it works. Reward with the actual method.",
    },
    {
        "id": "category_punch",
        "name": "Category Punch",
        "what": "Us vs the old way. Challenge the category norm, never a named competitor.",
        "example": "Consultants sell you a framework. We sell you the answer.",
        "guidance": "Contrast the tired old way with your way in one clean line.",
    },
    {
        "id": "proof_first",
        "name": "Proof-First",
        "what": "Lead with the artefact, not the claim. Show, don't tell.",
        "example": "A real FTSE company, run outside-in, live. Watch.",
        "guidance": "Open on the concrete output; let the evidence create the curiosity.",
    },
    {
        "id": "founder_pov",
        "name": "Founder POV",
        "what": "Human, personal, a little candid. Emotional hooks out-engage logical ones.",
        "example": "I'm building this in the open — including the parts that embarrass me.",
        "guidance": "First person, a real point of view or admission. Warmth over polish.",
    },
]

ROTATE = "rotate"  # special value: let the engine pick/vary the hook per reel

TONES = ["sharp", "measured", "warm", "provocative", "conversational"]
DEFAULT_TONE = "sharp"
DEFAULT_PASSION = 0.5   # 0 = calm/considered, 1 = fired-up

_BY_ID = {h["id"]: h for h in HOOK_ARCHETYPES}


def list_hooks() -> list[dict]:
    return HOOK_ARCHETYPES


def get_hook(hook_id: str) -> dict | None:
    return _BY_ID.get(hook_id)


def passion_label(p: float) -> str:
    if p <= 0.33:
        return "calm, considered"
    if p >= 0.66:
        return "high-energy, fired-up"
    return "engaged, warm"


_PITCHY = ["buy now", "sign up now", "limited time", "don't miss", "act now",
           "click the link", "dm me", "🔥", "💥", "🚀"]
_PROBLEM_WORDS = ["problem", "truth", "mistake", "stop", "why", "cost", "slow",
                  "hidden", "trap", "broken", "risk", "lose", "waste", "can't", "fail"]


def evaluate_dna(hook: str, bookend: str, full_script: str, product: str = "") -> list[dict]:
    """The 5-point content DNA check (advisory). Returns [{label, ok, note}].

    Ensures every piece earns its place: a hook, a real problem, a payoff, a
    subtle sell, and a soft (not pushy) CTA. It flags — it never blocks.
    """
    s = (full_script or "").lower()
    checks = []
    checks.append({
        "label": "Has a hook",
        "ok": bool(hook.strip()),
        "note": "Present." if hook.strip() else "Add a scroll-stopping opening line.",
    })
    has_problem = any(w in s for w in _PROBLEM_WORDS)
    checks.append({
        "label": "Names a real problem",
        "ok": has_problem,
        "note": "A felt pain is named." if has_problem
                else "Make the pain explicit — what does the viewer actually struggle with?",
    })
    checks.append({
        "label": "Clear payoff / one takeaway",
        "ok": bool(bookend.strip()),
        "note": "Lands a point." if bookend.strip() else "End on one clear takeaway.",
    })
    has_sell = bool(product) and product.lower() in s
    checks.append({
        "label": "Subtle sell woven in",
        "ok": has_sell,
        "note": f"{product} referenced as the answer." if has_sell
                else "Reference the product once, lightly, as the natural answer.",
    })
    pitchy = [p for p in _PITCHY if p in s]
    checks.append({
        "label": "Soft, not pushy",
        "ok": not pitchy,
        "note": "Soft-sell tone." if not pitchy else f"Too salesy — drop: {', '.join(pitchy)}",
    })
    return checks


def hook_brief(hook_id: str) -> str:
    """A one-line instruction for the script writer for a given hook id."""
    if hook_id in ("", ROTATE, None):
        return ("Choose the single best hook archetype for this idea from: "
                + ", ".join(h["name"] for h in HOOK_ARCHETYPES)
                + ". Open with a scroll-stopping line in that style.")
    h = _BY_ID.get(hook_id)
    if not h:
        return "Open with a scroll-stopping hook."
    return f"HOOK ARCHETYPE = {h['name']}: {h['guidance']} (e.g. \"{h['example']}\")"
