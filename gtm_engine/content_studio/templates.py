"""Proven structural templates for the batch cascade.

A template is a STRUCTURE hint injected into the generation prompt. The user can
pick one (or paste their own example content to emulate, which takes precedence).
Structures are drawn from what actually performs for founder/anti-guru content:
proof over promises, one idea per piece, a soft close — never a hard pitch.
"""

BLOG_TEMPLATES = {
    "default": {
        "label": "Proof-led (recommended)",
        "structure": (
            "1. HOOK — an uncomfortable truth or a surprising claim, in the first two lines.\n"
            "2. THE TENSION — why the usual way is broken; name the problem the reader feels.\n"
            "3. THE SHIFT — the point of view: how to think about this differently.\n"
            "4. THE PROOF — concrete evidence: real numbers, a worked example, a screenshot-worthy fact.\n"
            "5. THE TAKEAWAY — one thing the reader should do or believe now.\n"
            "6. SOFT CLOSE — a quiet invitation, never a hard sell."),
    },
    "how_to": {
        "label": "How-to / Educational",
        "structure": (
            "1. HOOK — the outcome the reader wants, and why it's usually hard.\n"
            "2. THE MISTAKE — what most people get wrong.\n"
            "3. THE STEPS — a clear, numbered method they can follow.\n"
            "4. THE EXAMPLE — the method applied to a real case.\n"
            "5. THE TAKEAWAY — the one principle behind the steps.\n"
            "6. SOFT CLOSE."),
    },
    "story": {
        "label": "Origin / Story",
        "structure": (
            "1. THE MOMENT — a specific scene, in the first person.\n"
            "2. WHAT I BELIEVED — the assumption going in.\n"
            "3. WHAT HAPPENED — the turn, the uncomfortable bit included.\n"
            "4. THE LESSON — what it taught you, stated plainly.\n"
            "5. WHY IT MATTERS to the reader.\n"
            "6. SOFT CLOSE — an invitation to see it / follow along."),
    },
    "contrarian": {
        "label": "Contrarian / Myth-bust",
        "structure": (
            "1. THE MYTH — the thing everyone in the category repeats.\n"
            "2. WHY IT'S WRONG — the uncomfortable truth, with evidence.\n"
            "3. THE BETTER FRAME — what to do instead.\n"
            "4. THE PROOF — a number or example that lands it.\n"
            "5. THE TAKEAWAY.\n"
            "6. SOFT CLOSE."),
    },
}
DEFAULT_TEMPLATE = "default"


def template_choices() -> list[tuple[str, str]]:
    return [(k, v["label"]) for k, v in BLOG_TEMPLATES.items()]


def get_structure(template_id: str) -> str:
    return BLOG_TEMPLATES.get(template_id, BLOG_TEMPLATES[DEFAULT_TEMPLATE])["structure"]
