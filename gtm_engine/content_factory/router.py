"""Layer 3 — Content Factory with multi-AI routing.

Routes content generation to the right model:
- Claude: strategy pieces, long-form, thought leadership, email sequences
- GPT-4o: high-volume variation, social copy, A/B variants
- Gemini: SEO content, YouTube scripts, multimodal

Every piece is tagged with: segment, channel, strategic objective,
edginess principle, and AI model used. Tagging enables the feedback loop.
"""

import json
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path

from gtm_engine.config import CONTENT_QUEUE_DIR
from gtm_engine.content_factory.models import ContentPiece, ContentTag
from gtm_engine.content_factory.templates import get_template, TEMPLATES
from gtm_engine.discovery.models import GTMBrief
from gtm_engine.strategy.models import GTMStrategy, ContentArchitectureItem
from gtm_engine.utils.ai_client import call_ai
from gtm_engine.utils.file_io import save_json
from gtm_engine.utils.logger import log_decision

logger = logging.getLogger(__name__)


def generate_content_piece(
    content_type: str,
    topic: str,
    brief: GTMBrief,
    segment: str = "",
    channel: str = "",
    strategic_objective: str = "",
    edginess_principle: str = "",
    extra_context: str = "",
) -> ContentPiece:
    """Generate a single content piece using the appropriate AI model.

    The template determines which provider to use. The prompt is built from
    the brief context + topic + any extra context.
    """
    template = get_template(content_type)
    provider = template["provider"]

    # Build the prompt with full context
    prompt_parts = [
        f"PRODUCT: {brief.product.name} — {brief.product.core_value_prop}",
        f"TARGET SEGMENT: {segment}" if segment else "",
        f"CHANNEL: {channel}" if channel else "",
        f"STRATEGIC OBJECTIVE: {strategic_objective}" if strategic_objective else "",
        f"BRAND TONE: {brief.brand.tone}",
        f"EDGINESS LEVEL: {brief.brand.edginess_level}/10",
        f"\nTOPIC: {topic}",
    ]
    if extra_context:
        prompt_parts.append(f"\nADDITIONAL CONTEXT: {extra_context}")
    prompt_parts.append("\nGenerate the content now. Return ONLY valid JSON.")

    prompt = "\n".join(p for p in prompt_parts if p)

    logger.info("Generating %s via %s: %s", content_type, provider, topic[:80])

    response = call_ai(
        prompt=prompt,
        system=template["system"],
        provider=provider,
        max_tokens=template.get("max_tokens", 4096),
        temperature=template.get("temperature", 0.7),
    )

    # Parse the response
    cleaned = response.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].rstrip()
    raw = json.loads(cleaned)

    # Build the content piece
    piece = ContentPiece(
        id=str(uuid.uuid4())[:8],
        title=raw.get("title", raw.get("subject", topic[:80])),
        body=raw.get("body", raw.get("script", raw.get("content", ""))),
        format=content_type,
        tags=ContentTag(
            segment=segment,
            channel=channel,
            content_type=content_type,
            strategic_objective=strategic_objective,
            edginess_principle=edginess_principle,
            ai_provider=provider,
            ai_model=template.get("model", "default"),
        ),
        metadata=raw,  # Preserve the full raw response for channel-specific fields
    )

    log_decision(
        "content_generated",
        f"Generated {content_type} for {segment}/{channel}",
        f"Provider: {provider}, Topic: {topic[:80]}",
        {"piece_id": piece.id, "content_type": content_type},
    )

    return piece


def generate_ab_variants(original: ContentPiece, brief: GTMBrief) -> list[ContentPiece]:
    """Generate A/B test variants of an existing content piece.

    Always uses OpenAI for variation generation — it's faster and
    better at producing diverse creative variants.
    """
    template = get_template("ab_test_variant")

    prompt = (
        f"Original content (type: {original.format}):\n"
        f"Title: {original.title}\n"
        f"Body: {original.body[:2000]}\n\n"
        f"Product: {brief.product.name} — {brief.product.core_value_prop}\n"
        f"Segment: {original.tags.segment}\n"
        f"Channel: {original.tags.channel}\n\n"
        "Generate 2-3 A/B test variants. Return ONLY valid JSON array."
    )

    response = call_ai(
        prompt=prompt,
        system=template["system"],
        provider="openai",
        max_tokens=template.get("max_tokens", 2048),
        temperature=0.9,
    )

    cleaned = response.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].rstrip()
    variants_raw = json.loads(cleaned)

    variants = []
    for v in variants_raw:
        variant = ContentPiece(
            id=str(uuid.uuid4())[:8],
            title=v.get("content", original.title)[:80] if isinstance(v.get("content"), str) else original.title,
            body=v.get("content", ""),
            format=original.format,
            tags=ContentTag(
                **original.tags.model_dump(),
                ai_provider="openai",
            ) if False else ContentTag(
                segment=original.tags.segment,
                channel=original.tags.channel,
                content_type=original.tags.content_type,
                strategic_objective=original.tags.strategic_objective,
                edginess_principle=original.tags.edginess_principle,
                ai_provider="openai",
                ai_model="gpt-4o",
            ),
            parent_id=original.id,
            metadata=v,
        )
        variants.append(variant)

    return variants


def run_content_batch(
    brief: GTMBrief,
    strategy: GTMStrategy,
    max_pieces: int = 20,
) -> list[ContentPiece]:
    """Generate a batch of content based on the strategy's content architecture.

    Walks through the content architecture, picks topics, routes to the right
    AI provider, and builds a tagged content queue.
    """
    logger.info("=== Starting Content Batch Generation ===")
    pieces = []

    for arch_item in strategy.content_architecture:
        if len(pieces) >= max_pieces:
            break

        # Map content architecture types to template types
        for topic in arch_item.example_topics:
            if len(pieces) >= max_pieces:
                break

            # Find the best matching template for this content type
            content_type = _match_content_type(arch_item.content_types, arch_item.channel)

            try:
                piece = generate_content_piece(
                    content_type=content_type,
                    topic=topic,
                    brief=brief,
                    segment=arch_item.segment,
                    channel=arch_item.channel,
                    strategic_objective=arch_item.strategic_objective,
                )
                pieces.append(piece)

                # Save individual piece to content queue
                piece_path = CONTENT_QUEUE_DIR / f"{piece.id}_{content_type}.json"
                save_json(piece.model_dump(), piece_path)

            except Exception as e:
                logger.error("Failed to generate %s for topic '%s': %s", content_type, topic, e)
                continue

    # Save the full batch manifest
    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_pieces": len(pieces),
        "pieces": [p.model_dump() for p in pieces],
        "by_provider": _count_by(pieces, lambda p: p.tags.ai_provider),
        "by_channel": _count_by(pieces, lambda p: p.tags.channel),
        "by_segment": _count_by(pieces, lambda p: p.tags.segment),
    }
    save_json(manifest, CONTENT_QUEUE_DIR / "batch_manifest.json")

    log_decision(
        "content_batch",
        f"Generated {len(pieces)} content pieces",
        f"Providers: {manifest['by_provider']}, Channels: {manifest['by_channel']}",
    )

    logger.info("Content batch complete: %d pieces generated", len(pieces))
    return pieces


def _match_content_type(content_types: list[str], channel: str) -> str:
    """Match strategy content types to available templates.

    Uses the channel as a hint when content types don't match exactly.
    """
    # Direct matches first
    for ct in content_types:
        normalized = ct.lower().replace(" ", "_").replace("-", "_")
        if normalized in TEMPLATES:
            return normalized

    # Channel-based fallbacks
    channel_defaults = {
        "linkedin": "linkedin_post",
        "twitter": "social_post",
        "x": "social_post",
        "reddit": "reddit_post",
        "email": "email_sequence",
        "substack": "substack_post",
        "youtube": "youtube_script",
        "blog": "long_form_article",
        "seo": "seo_article",
        "newsletter": "substack_post",
    }

    channel_lower = channel.lower()
    for key, template_name in channel_defaults.items():
        if key in channel_lower:
            return template_name

    # Keyword matching as last resort
    type_text = " ".join(content_types).lower()
    if any(kw in type_text for kw in ["thought", "leadership", "opinion"]):
        return "thought_leadership"
    if any(kw in type_text for kw in ["long", "article", "deep", "breakdown"]):
        return "long_form_article"
    if any(kw in type_text for kw in ["social", "post", "short"]):
        return "social_post"
    if any(kw in type_text for kw in ["email", "sequence", "nurture"]):
        return "email_sequence"

    return "thought_leadership"  # Default to highest-quality output


def _count_by(pieces: list[ContentPiece], key_fn) -> dict[str, int]:
    """Count content pieces by an arbitrary key function."""
    counts: dict[str, int] = {}
    for p in pieces:
        k = key_fn(p) or "unknown"
        counts[k] = counts.get(k, 0) + 1
    return counts
