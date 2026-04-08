"""Layer 4 — Audience Development Module.

Each channel has fundamentally different growth mechanics. The engine
maintains a separate playbook per channel and adapts content strategy
based on current audience size and growth stage.

Includes email lifecycle sequence builder and Instagram boost scorer.
"""

import json
import logging
from datetime import datetime, timezone

from gtm_engine.config import DATA_DIR
from gtm_engine.utils.file_io import save_json, load_json

logger = logging.getLogger(__name__)

PLAYBOOKS_PATH = DATA_DIR / "audience_playbooks.json"

DEFAULT_PLAYBOOKS = {
    "reddit": {
        "growth_mechanic": "Algorithmic. Zero audience needed. Works day one.",
        "strategy": "Lead with genuine value. Never pitch. Build karma first.",
        "sequence": "10 value-add comments before first post. Monitor karma velocity.",
        "seo_parallel": "Every blog post targets a long-tail search query. Gemini optimises.",
        "metrics": ["upvotes", "comment_engagement", "traffic_to_owned"],
        "rules": [
            "Never link to product in first 3 posts in any subreddit",
            "Match community tone exactly — read 20 top posts before writing",
            "If it reads like marketing, rewrite until it doesn't",
        ],
        "target_subreddits": {
            "PRISM": ["r/consulting", "r/MBA"],
            "Analyst's Edge": ["r/consulting", "r/MBA", "r/SecurityAnalysis"],
            "APEX": ["r/projectmanagement", "r/PMO"],
            "ATLAS": ["r/algotrading", "r/investing", "r/UKInvesting", "r/stocks"],
        },
    },
    "linkedin": {
        "growth_mechanic": "Network-compounding. Consistent posting drives follower growth.",
        "strategy": "3x per week minimum. Mix short posts and long-form articles.",
        "connection_strategy": "Automated but personalised outreach to target segment profiles.",
        "metrics": ["follower_growth_rate", "post_impressions", "profile_visits", "connection_acceptance_rate"],
        "cadence": "3 posts/week + 10 targeted DMs/week",
        "rules": [
            "Strong hook in first 2 lines (visible before 'see more')",
            "No hashtag spam — max 3 relevant",
            "End with question or discussion prompt, not 'sign up'",
            "Carousel format for complex ideas",
        ],
    },
    "email": {
        "growth_mechanic": "Lifecycle-triggered sequences, NOT batch sends to small lists.",
        "rule": "Never send a broadcast until list exceeds 500 engaged subscribers.",
        "before_500": "All email is triggered lifecycle sequences based on subscriber actions.",
        "lifecycle_sequence": {
            "day_0": {"theme": "Welcome + strongest content piece", "asset": "MA-001"},
            "day_3": {"theme": "The uncomfortable truth (category punching)", "asset": "MA-001 derivative"},
            "day_7": {"theme": "Product demonstration / proof of concept"},
            "day_14": {"theme": "Social proof + case study"},
            "day_21": {"theme": "Soft conversion offer"},
            "ongoing": {"theme": "Weekly value email triggered by content calendar"},
        },
        "list_building": {
            "PRISM": "Free organisational benchmark sample report",
            "Analyst's Edge": "Free diagnostic sample — pick any public company",
            "APEX": "Free programme health check template",
            "ATLAS": "Free methodology guide — how adversarial AI review works",
        },
        "metrics": ["open_rate", "click_rate", "sequence_completion_rate", "conversion_rate"],
    },
    "instagram_tiktok": {
        "growth_mechanic": "Low organic reach without paid boost.",
        "strategy": "Every Reel gets a boost decision score 0-10 based on quality and segment fit.",
        "boost_threshold": 7,
        "boost_budget_per_post": "$20-50",
        "monthly_budget": "$200-500",
        "targeting": "Lookalike audiences from email list + interest targeting per segment.",
        "metrics": ["reach", "saves", "profile_visits", "link_clicks", "follower_growth"],
        "rules": [
            "Saves are the highest intent signal — optimise for saves",
            "Hook must work in first 2 seconds with no sound",
            "On-screen text mandatory for accessibility",
        ],
    },
    "substack": {
        "growth_mechanic": "Substack recommendations engine + SEO + cross-promotion.",
        "strategy": "Publish weekly. Every post optimised for Substack search.",
        "growth_levers": [
            "Recommend relevant Substacks, request recommendations in return",
            "Every post promoted on LinkedIn and Reddit",
            "Newsletter name: 'Quantum Tools Weekly' or product-specific",
        ],
        "metrics": ["subscriber_growth", "open_rate", "paid_conversion_rate"],
    },
    "twitter": {
        "growth_mechanic": "Retweet velocity + reply engagement.",
        "strategy": "ATLAS account posts daily. Market observations, methodology transparency, data.",
        "best_format": "Thread format performs best for this audience.",
        "metrics": ["follower_growth", "retweet_rate", "reply_quality"],
        "rules": [
            "Thread format for substantive content",
            "Single tweets for observations and data points",
            "Quote-tweet industry takes with added perspective",
        ],
    },
}


def init_playbooks(custom: dict | None = None) -> dict:
    """Initialise audience playbooks."""
    playbooks = custom or DEFAULT_PLAYBOOKS
    save_json(playbooks, PLAYBOOKS_PATH)
    logger.info("Audience playbooks saved to %s", PLAYBOOKS_PATH)
    return playbooks


def load_playbooks() -> dict:
    """Load audience playbooks from disk, or initialise defaults."""
    if PLAYBOOKS_PATH.exists():
        return load_json(PLAYBOOKS_PATH)
    return init_playbooks()


def get_playbook(channel: str) -> dict:
    """Get the playbook for a specific channel."""
    playbooks = load_playbooks()
    channel_lower = channel.lower().replace(" ", "_").replace("/", "_")
    for key in playbooks:
        if key in channel_lower or channel_lower in key:
            return playbooks[key]
    return {}


def score_boost(content: dict, channel: str = "instagram") -> dict:
    """Score a content piece for paid boost recommendation.

    Returns a 0-10 score with reasoning. Score >= 7 triggers boost recommendation.
    """
    playbook = get_playbook(channel)
    threshold = playbook.get("boost_threshold", 7)

    # Scoring factors
    score = 5  # baseline
    reasons = []

    # Quality signals
    benchmark = content.get("benchmark_result", {})
    if benchmark.get("score", 0) >= 8:
        score += 2
        reasons.append("High benchmark score")
    elif benchmark.get("score", 0) >= 6:
        score += 1

    # Segment breadth
    segments = content.get("tags", {}).get("target_segments", [])
    if len(segments) >= 3:
        score += 1
        reasons.append("Broad segment appeal")

    # Format fit
    fmt = content.get("format", "")
    if fmt in ("reel_script", "visual_brief"):
        score += 1
        reasons.append("Native visual format")

    # Edginess
    principles = content.get("tags", {}).get("edginess_principles", [])
    if len(principles) >= 2:
        score += 1
        reasons.append("Strong edginess signal")

    score = min(10, score)

    return {
        "score": score,
        "boost_recommended": score >= threshold,
        "budget_suggestion": playbook.get("boost_budget_per_post", "$20-50") if score >= threshold else "$0",
        "reasons": reasons,
        "threshold": threshold,
    }


def get_email_lifecycle_sequence() -> dict:
    """Get the configured email lifecycle sequence."""
    playbooks = load_playbooks()
    return playbooks.get("email", {}).get("lifecycle_sequence", {})
