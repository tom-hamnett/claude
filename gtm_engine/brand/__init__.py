"""Layer 8 — Brand and Standards Module.

Configured once during setup. Referenced at every content benchmark check.
Sits above all content generation as the permanent guardrail layer.

brand_standards.json contains voice, edginess, visual standards, content
standards, and approval workflow config. benchmark_check() validates
every piece of content before it enters the queue.
"""

import json
import logging
from pathlib import Path

from gtm_engine.config import DATA_DIR, OUTPUT_DIR
from gtm_engine.utils.ai_client import call_claude
from gtm_engine.utils.file_io import save_json, load_json

logger = logging.getLogger(__name__)

BRAND_STANDARDS_PATH = DATA_DIR / "brand_standards.json"

DEFAULT_BRAND_STANDARDS = {
    "voice": {
        "tone_descriptors": [
            "sharp", "transparent", "authoritative", "anti-guru",
            "confident without arrogance", "calm", "direct", "precise",
        ],
        "forbidden_phrases": [
            "game-changer", "revolutionary", "unlock your potential",
            "disruptive", "innovative", "cutting-edge", "best-in-class",
            "synergy", "leverage", "paradigm shift", "thought leader",
            "circle back", "deep dive into",
        ],
        "vocabulary_level": "Write up. Assume intelligent, sophisticated reader. Never condescend.",
        "sentence_style": "Short and punchy by default. Considered and layered for long-form.",
        "philosophy": "Teach, demonstrate, make them reach for it. Never sell. Never push.",
    },
    "edginess": {
        "level": 8,
        "principles": {
            "say_the_uncomfortable_thing": {
                "weight": "high",
                "description": "Find the market truth everyone knows but nobody says, and say it first.",
            },
            "show_your_work": {
                "weight": "high",
                "description": "Transparency about methodology is more disruptive than any bold claim.",
            },
            "have_a_point_of_view": {
                "weight": "high",
                "description": "Every piece must contain a clear, arguable perspective.",
            },
            "punch_at_the_category": {
                "weight": "medium",
                "description": "Challenge the old way of doing things. Never name competitors.",
            },
            "respect_the_reader": {
                "weight": "high",
                "description": "Write up. Assume sophistication. Never condescend.",
            },
        },
        "category_norms_to_break": [
            "Professional tools should be enterprise-priced and enterprise-sold",
            "Workforce data should be priced per record, scaling with company size",
            "AI outputs should look confident even when fabricated",
            "Consulting methodology should be a black box that justifies opacity",
            "PMO tools should require weeks of configuration before delivering value",
            "Trading education should come from gurus who claim to never lose",
        ],
        "topics_requiring_approval": [
            "Named companies in critical context",
            "Legal or financial claims",
            "Specific return figures for ATLAS",
            "Client case studies (even anonymised)",
        ],
    },
    "visual": {
        "colours": {
            "background": "#0a0a0f",
            "primary_accent": "#6c63ff",
            "hot_accent": "#ff6b6b",
            "gold_accent": "#ffd166",
            "text": "#e8e8f0",
            "muted": "#8888a0",
        },
        "typography": {
            "headings": "Playfair Display",
            "body": "DM Sans",
        },
        "image_style": "Data visualisation and clean diagrams over stock photography. Dark backgrounds.",
        "video_aesthetic": "Talking head with data overlay. Clean B-roll of screens and dashboards. "
                          "On-screen text for key stats. No flashy transitions.",
    },
    "content_standards": {
        "minimum_word_count": {
            "long_form_article": 800,
            "substack_post": 600,
            "linkedin_post": 100,
            "email": 150,
            "reddit_post": 200,
        },
        "cta_standards": {
            "linkedin": "Soft question or discussion prompt. Never 'sign up now'.",
            "reddit": "No CTA. Value only. Link in profile if asked.",
            "email": "Single clear action. Never multiple CTAs.",
            "substack": "Reply to this email. Or: early access mention, understated.",
            "twitter": "Thread ends with perspective, not pitch.",
        },
        "disclosure_requirements": [
            "ATLAS: 'This is a research tool, not financial advice' on all trading content",
            "AI-generated content: No disclosure required (it's our methodology, not a deception)",
            "Data sources: Always cite when using public data",
            "Affiliate/sponsored: Not applicable (no paid promotion model)",
        ],
    },
    "approval_workflow": {
        "auto_approve": "Content above quality threshold passing benchmark check",
        "flag_for_review": [
            "Content below quality threshold",
            "High-stakes channels (Hacker News, Product Hunt)",
            "Boosted Instagram/TikTok posts",
            "Content referencing specific companies critically",
        ],
        "always_require_approval": [
            "Named companies in negative context",
            "Legal or financial claims",
            "Content claiming specific returns or outcomes",
            "White-label partner communications",
        ],
    },
}

BENCHMARK_SYSTEM = """You are a brand standards reviewer for Quantum Tools.

You are given a piece of content and the brand standards. Your job is to check
whether the content meets the brand's voice, edginess, and quality standards.

Check for:
1. FORBIDDEN PHRASES — flag any that appear
2. TONE — does it match the brand voice? Is it writing up?
3. EDGINESS — does it apply at least one of the five principles?
4. POINT OF VIEW — does it contain a clear, arguable perspective?
5. CTA APPROPRIATENESS — does the CTA match the channel standard?
6. QUALITY — is it specific, opinionated, and built for context (not generic)?
7. CONDESCENSION — any trace of writing down or over-explaining?

Return a JSON object:
{
    "approved": true/false,
    "score": 1-10,
    "issues": ["list of specific issues found"],
    "forbidden_phrases_found": ["any forbidden phrases detected"],
    "edginess_principles_applied": ["which principles this content uses"],
    "suggested_improvements": ["specific, actionable improvements"],
    "verdict": "one-sentence summary"
}"""


def init_brand_standards(custom: dict | None = None) -> dict:
    """Initialise brand standards. Uses defaults if no custom provided."""
    standards = custom or DEFAULT_BRAND_STANDARDS
    save_json(standards, BRAND_STANDARDS_PATH)
    logger.info("Brand standards saved to %s", BRAND_STANDARDS_PATH)
    return standards


def load_brand_standards() -> dict:
    """Load brand standards from disk, or initialise defaults."""
    if BRAND_STANDARDS_PATH.exists():
        return load_json(BRAND_STANDARDS_PATH)
    return init_brand_standards()


def benchmark_check(content: str, channel: str = "", content_type: str = "") -> dict:
    """Run a content piece through the brand standards benchmark.

    Returns a structured verdict with approval status, score, issues,
    and suggested improvements. Every content piece must pass this
    before entering the deployment queue.
    """
    standards = load_brand_standards()

    prompt = (
        f"CONTENT TO REVIEW:\n{content[:4000]}\n\n"
        f"CHANNEL: {channel or 'not specified'}\n"
        f"CONTENT TYPE: {content_type or 'not specified'}\n\n"
        f"BRAND STANDARDS:\n{json.dumps(standards, indent=2)}\n\n"
        "Review this content against the brand standards and return your verdict as JSON."
    )

    response = call_claude(prompt, system=BENCHMARK_SYSTEM, max_tokens=2048, temperature=0.3)

    # Parse response
    cleaned = response.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].rstrip()

    try:
        result = json.loads(cleaned)
    except json.JSONDecodeError:
        result = {
            "approved": False,
            "score": 0,
            "issues": ["Failed to parse benchmark check response"],
            "verdict": "Review manually",
        }

    return result


def quick_forbidden_check(text: str) -> list[str]:
    """Fast local check for forbidden phrases — no API call needed.

    Returns a list of any forbidden phrases found in the text.
    """
    standards = load_brand_standards()
    forbidden = standards.get("voice", {}).get("forbidden_phrases", [])
    text_lower = text.lower()
    return [phrase for phrase in forbidden if phrase.lower() in text_lower]
