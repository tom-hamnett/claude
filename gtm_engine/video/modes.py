"""Content modes — the one choice that drives a reel's whole B-roll strategy.

Instead of tuning a dozen knobs per reel, the user picks what KIND of reel this
is, and the mode sets: whether a data-analysis step runs, what the B-roll should
be made of, how much stock is allowed, and how presenter-heavy the cut is. This is
the answer to "it should depend on the clip" — the mode is the clip's character.

  insight   — an insight/result drives it. Reads your data, builds charts, proof-heavy.
  story     — it's about you (origin, belief, build-in-public). Presenter-led; charts off.
  explainer — explaining the problem you solve. Mixed: a chart where it helps, concepts.

A mode profile (used by the choreographer + UI):
  data_step      : run the data-analysis step (turn a spreadsheet into charts + insight)
  broll_priority : ordered visuals the choreographer should prefer for cutaways
  stock_cap      : max stock clips in the whole reel (texture, not the show)
  presenter_ratio: rough share of screen time on the presenter
  broll_note     : one line injected into the choreographer prompt (the mode's B-roll intent)
  charts         : whether auto data-viz is on the table at all
"""

MODES = {
    "insight": {
        "label": "Insight / Proof",
        "icon": "📊",
        "blurb": "An insight or result drives it — your data becomes the proof on screen.",
        "data_step": True,
        "charts": True,
        "broll_priority": ["screenshot", "chart", "presenter", "card"],
        "stock_cap": 0,
        "presenter_ratio": 0.5,
        "broll_note": (
            "This reel is DATA-DRIVEN. The B-roll IS the presentation: every number/result "
            "must appear as the user's real screenshot or as a data visual (chart) built from "
            "the analysed figures. Do NOT use stock footage. Come back to the presenter to "
            "anchor, but the proof beats carry the reel."
        ),
    },
    "story": {
        "label": "Story / Origin",
        "icon": "🎬",
        "blurb": "It's about you — origin, belief, building in public. Presenter-led.",
        "data_step": False,
        "charts": False,
        "broll_priority": ["presenter", "stock", "card"],
        "stock_cap": 2,
        "presenter_ratio": 0.8,
        "broll_note": (
            "This is a PERSONAL / ORIGIN story — the presenter (you) carries it. Stay on the "
            "presenter for most beats; vary the energy across beats (a close, confident line vs "
            "a reflective one) as if cutting between different takes/angles. Do NOT force charts "
            "or product screens. A little ABSTRACT, atmospheric stock is fine for mood on an "
            "example/place beat (max two), or use a clean card for a single stark line. Never "
            "put up a data chart here."
        ),
    },
    "explainer": {
        "label": "Problem / Explainer",
        "icon": "🧩",
        "blurb": "Explaining the problem you solve — concepts, a chart where it helps.",
        "data_step": False,       # optional — user can attach data to switch charts on
        "charts": True,
        "broll_priority": ["presenter", "chart", "screenshot", "stock", "card"],
        "stock_cap": 1,
        "presenter_ratio": 0.6,
        "broll_note": (
            "This reel EXPLAINS a problem. Mix the presenter with illustration: a concept card "
            "for an idea, a data visual (chart) where a real number sharpens the point, one "
            "conceptual stock shot at most for a place/mood beat. Keep it concrete, not decorative."
        ),
    },
}

DEFAULT_MODE = "insight"


def profile(mode: str) -> dict:
    """Return the mode profile, defaulting safely."""
    return MODES.get(mode or DEFAULT_MODE, MODES[DEFAULT_MODE])
