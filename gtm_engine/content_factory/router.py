"""Layer 3 — Content Factory with multi-AI routing.

Routes content generation to the right model:
- Claude: strategy pieces, long-form, thought leadership, email sequences
- GPT-4o: high-volume variation, social copy, A/B variants
- Gemini: SEO content, YouTube scripts, multimodal

Every piece is tagged with: segment, channel, strategic objective,
edginess principle, and AI model used.
"""

import logging

logger = logging.getLogger(__name__)

# Routing rules: content_type -> preferred provider
ROUTING_TABLE = {
    "thought_leadership": "claude",
    "long_form_article": "claude",
    "email_sequence": "claude",
    "substack_post": "claude",
    "strategy_breakdown": "claude",
    "social_post": "openai",
    "ad_copy_variant": "openai",
    "ab_test_variant": "openai",
    "linkedin_post": "openai",
    "seo_article": "gemini",
    "youtube_script": "gemini",
    "search_optimised_page": "gemini",
}


def route_content(content_type: str) -> str:
    """Determine which AI provider should generate this content type."""
    return ROUTING_TABLE.get(content_type, "claude")


def generate_content(content_type: str, brief: dict, strategy: dict, **kwargs) -> dict:
    """Generate a single content piece using the appropriate AI model.

    Returns a tagged content object ready for the content queue.
    """
    # TODO: Implement in Layer 3 build phase
    raise NotImplementedError("Content Factory not yet implemented")
