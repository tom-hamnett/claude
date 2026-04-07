"""Layer 2 — Strategy Engine.

Takes a completed GTM Brief and generates:
- Customer segmentation map with ranked priority
- Positioning statements per segment
- Channel strategy stack-ranked by impact-to-effort
- Content architecture per channel per segment
- Edginess framework calibrated to this brand

Every decision shows its reasoning so it's auditable. Each sub-generation
is a separate Claude call so we get deep, focused output per component.
"""

import json
import logging
from datetime import datetime, timezone

from gtm_engine.config import OUTPUT_DIR
from gtm_engine.discovery.models import GTMBrief
from gtm_engine.strategy.models import (
    GTMStrategy,
    SegmentProfile,
    PositioningStatement,
    ChannelStrategy,
    ContentArchitectureItem,
    EdginessFramework,
)
from gtm_engine.utils.ai_client import call_claude
from gtm_engine.utils.file_io import save_json, save_markdown
from gtm_engine.utils.logger import log_decision

logger = logging.getLogger(__name__)

# --- System prompts for each sub-generation ---

SEGMENTATION_SYSTEM = """You are an elite GTM strategist generating customer segmentation.

Given a GTM Brief, produce a ranked list of customer segments. For each segment:
- Name and description
- Priority rank (1 = highest priority)
- Estimated TAM (qualitative is fine)
- Key pain points this product solves for them
- Buying triggers — what events make them actively seek a solution
- Likely objections
- Channels they frequent
- Willingness to pay (low/medium/high + reasoning)
- Your reasoning for this ranking — show your working

RULES:
- Maximum 5 segments. Focus beats breadth.
- Rank by IMPACT-TO-EFFORT. The segment that's easiest to reach AND most valuable goes first.
- Be specific. "SMBs" is not a segment. "Solo consultants running strategy engagements for mid-market PE portfolio companies" is.
- Every ranking decision must have explicit reasoning.

Return ONLY a JSON array of segment objects."""

POSITIONING_SYSTEM = """You are an elite positioning strategist.

Given a GTM Brief and customer segments, generate a positioning statement for EACH segment.

For each:
- headline: 8 words max, punchy, specific
- subheadline: one sentence expanding the headline
- value_proposition: the core promise in plain language
- proof_points: 2-3 concrete reasons to believe
- differentiation: what makes this different from the old way (never name competitors)
- emotional_hook: the feeling this creates
- reasoning: why this positioning works for this segment

RULES:
- Write UP. Assume the reader is sophisticated.
- Never be generic. Every word must be specific to THIS product for THIS segment.
- Punch at the CATEGORY, never at named competitors.
- Each positioning must pass the "uncomfortable truth" test — it should say something the market knows but nobody says.

Return ONLY a JSON array of positioning objects."""

CHANNEL_SYSTEM = """You are an elite growth strategist building a channel strategy.

Given a GTM Brief and customer segments, produce a stack-ranked channel strategy.

For each channel:
- channel name
- priority_rank (1 = do this first)
- impact_score (1-10): potential revenue/growth impact
- effort_score (1-10): time/money/skill required. 1=trivial, 10=massive
- impact_to_effort_ratio: impact / effort
- primary_segments: which segments this channel reaches
- content_formats: what works on this channel
- posting_cadence: realistic for a resource-constrained founder
- tone_notes: how to sound on this channel specifically
- quick_win: the single first action to take on this channel
- reasoning: why this ranking, show your working

RULES:
- No paid advertising channels. All organic/content-led.
- Maximum 6 channels. Resource-constrained founders can't be everywhere.
- Rank by impact-to-effort ratio. Quick wins first.
- Be brutally honest about effort. "Just post on LinkedIn" is not low-effort if you have no audience.
- Include at least one unconventional/guerrilla channel if appropriate.

Return ONLY a JSON array of channel objects."""

CONTENT_ARCH_SYSTEM = """You are a content strategist building a content architecture.

Given a GTM Brief, segments, and channel strategy, produce a content plan for each
channel-segment combination that matters (skip low-value combinations).

For each:
- channel and segment
- content_types: specific formats (not generic like "blog posts" — say "technical teardown posts showing methodology")
- cadence: how often, realistic for constraints
- tone: specific to this channel-segment combo
- edginess_level: 1-10 calibrated to this audience on this platform
- example_topics: 3-5 specific, concrete topic ideas ready to write
- strategic_objective: what this content achieves (awareness, trust, conversion, etc.)

RULES:
- Every topic must be specific enough to write immediately. Not "talk about the product" but "why 90% of company analysis is backwards — and what outside-in means"
- Follow the edginess principles: say the uncomfortable thing, show your work, have a POV, punch at the category, respect intelligence
- Content must TEACH and DEMONSTRATE. Never sell.
- Consider content repurposing — a long-form piece should feed multiple channels

Return ONLY a JSON array of content architecture objects."""

EDGINESS_SYSTEM = """You are a brand strategist calibrating an edginess framework.

Given everything you know about this business, produce a brand edginess framework:
- overall_level: 1-10 (1=corporate safe, 10=deliberately provocative)
- uncomfortable_truths: 5-7 market truths everyone knows but nobody says
- category_norms_to_break: specific conventions in this space that deserve to be challenged
- transparency_angles: what this company can show that others hide
- point_of_view_statements: 5-7 clear, arguable perspectives this brand holds
- topics_to_avoid: lines not to cross
- tone_guardrails: brief description of where the edge is

RULES:
- Be specific to THIS business. Generic brand advice is worthless.
- Uncomfortable truths should make the founder slightly nervous — that's how you know they're real.
- POV statements should be genuinely arguable. "We believe in quality" is not a POV.
- Calibrate to the audience — a quant trading audience has different edge tolerance than MBA students.

Return ONLY a JSON object."""

REPORT_SYSTEM = """You are a senior strategist writing a human-readable strategy report.

Given the full GTM strategy (segments, positioning, channels, content architecture,
edginess framework), write a compelling, readable Markdown report.

Structure:
# GTM Strategy Report
## Executive Summary (3-4 sentences — the whole strategy in a nutshell)
## Customer Segments (ranked table + detail per segment)
## Positioning (per segment, with the headline prominently displayed)
## Channel Strategy (ranked table + detail with quick wins)
## Content Architecture (what to create, where, how often)
## Edginess Framework (the brand's edge, uncomfortable truths, POV statements)
## Assumptions & Risks
## Recommended First 30 Days (prioritised action list)

RULES:
- Write for an intelligent founder who wants to ACT, not just read.
- Bold the most important insight in each section.
- Every recommendation must be specific and actionable.
- The 30-day plan should be sequenced: what to do in week 1, week 2, week 3, week 4.
"""


def _parse_json_response(text: str) -> dict | list:
    """Parse a JSON response from Claude, handling markdown fencing."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        # Remove opening fence (with optional language tag)
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].rstrip()
    return json.loads(cleaned)


def generate_segmentation(brief: GTMBrief) -> list[SegmentProfile]:
    """Generate customer segmentation with priority ranking and reasoning."""
    logger.info("Generating customer segmentation...")
    prompt = f"GTM Brief:\n{json.dumps(brief.model_dump(), indent=2)}"
    response = call_claude(prompt, system=SEGMENTATION_SYSTEM, max_tokens=4096)
    raw = _parse_json_response(response)
    segments = [SegmentProfile(**s) for s in raw]
    segments.sort(key=lambda s: s.priority_rank)

    log_decision(
        "segmentation",
        f"Identified {len(segments)} segments",
        f"Top segment: {segments[0].name} — {segments[0].reasoning}" if segments else "No segments",
    )
    return segments


def generate_positioning(brief: GTMBrief, segments: list[SegmentProfile]) -> list[PositioningStatement]:
    """Generate positioning statements per segment."""
    logger.info("Generating positioning statements...")
    prompt = (
        f"GTM Brief:\n{json.dumps(brief.model_dump(), indent=2)}\n\n"
        f"Segments:\n{json.dumps([s.model_dump() for s in segments], indent=2)}"
    )
    response = call_claude(prompt, system=POSITIONING_SYSTEM, max_tokens=4096)
    raw = _parse_json_response(response)
    positioning = [PositioningStatement(**p) for p in raw]

    log_decision(
        "positioning",
        f"Generated {len(positioning)} positioning statements",
        "; ".join(f"{p.segment_name}: {p.headline}" for p in positioning),
    )
    return positioning


def generate_channel_strategy(brief: GTMBrief, segments: list[SegmentProfile]) -> list[ChannelStrategy]:
    """Generate channel strategy stack-ranked by impact-to-effort."""
    logger.info("Generating channel strategy...")
    prompt = (
        f"GTM Brief:\n{json.dumps(brief.model_dump(), indent=2)}\n\n"
        f"Segments:\n{json.dumps([s.model_dump() for s in segments], indent=2)}"
    )
    response = call_claude(prompt, system=CHANNEL_SYSTEM, max_tokens=4096)
    raw = _parse_json_response(response)

    channels = []
    for c in raw:
        ch = ChannelStrategy(**c)
        if ch.impact_score > 0 and ch.effort_score > 0:
            ch.impact_to_effort_ratio = round(ch.impact_score / ch.effort_score, 2)
        channels.append(ch)

    channels.sort(key=lambda c: c.priority_rank)

    log_decision(
        "channel_strategy",
        f"Ranked {len(channels)} channels",
        f"Top channel: {channels[0].channel} (ratio: {channels[0].impact_to_effort_ratio})" if channels else "None",
    )
    return channels


def generate_content_architecture(
    brief: GTMBrief,
    segments: list[SegmentProfile],
    channels: list[ChannelStrategy],
) -> list[ContentArchitectureItem]:
    """Generate content architecture: formats, cadence, tone per channel per segment."""
    logger.info("Generating content architecture...")
    prompt = (
        f"GTM Brief:\n{json.dumps(brief.model_dump(), indent=2)}\n\n"
        f"Segments:\n{json.dumps([s.model_dump() for s in segments], indent=2)}\n\n"
        f"Channel Strategy:\n{json.dumps([c.model_dump() for c in channels], indent=2)}"
    )
    response = call_claude(prompt, system=CONTENT_ARCH_SYSTEM, max_tokens=8192)
    raw = _parse_json_response(response)
    architecture = [ContentArchitectureItem(**item) for item in raw]

    log_decision(
        "content_architecture",
        f"Generated {len(architecture)} content plans",
        f"Covering {len(set(a.channel for a in architecture))} channels x {len(set(a.segment for a in architecture))} segments",
    )
    return architecture


def generate_edginess_framework(brief: GTMBrief, segments: list[SegmentProfile]) -> EdginessFramework:
    """Generate a brand-specific edginess calibration."""
    logger.info("Generating edginess framework...")
    prompt = (
        f"GTM Brief:\n{json.dumps(brief.model_dump(), indent=2)}\n\n"
        f"Segments:\n{json.dumps([s.model_dump() for s in segments], indent=2)}"
    )
    response = call_claude(prompt, system=EDGINESS_SYSTEM, max_tokens=4096)
    raw = _parse_json_response(response)
    framework = EdginessFramework(**raw)

    log_decision(
        "edginess",
        f"Edginess level set to {framework.overall_level}/10",
        f"{len(framework.uncomfortable_truths)} uncomfortable truths, {len(framework.point_of_view_statements)} POV statements",
    )
    return framework


def generate_strategy_report(strategy: GTMStrategy, brief: GTMBrief) -> str:
    """Generate the human-readable Markdown strategy report."""
    logger.info("Generating strategy report...")
    prompt = (
        f"GTM Brief Summary:\n{json.dumps(brief.model_dump(), indent=2)}\n\n"
        f"Full Strategy:\n{json.dumps(strategy.model_dump(), indent=2)}"
    )
    return call_claude(prompt, system=REPORT_SYSTEM, max_tokens=8192, temperature=0.5)


def generate_strategy(brief: GTMBrief) -> GTMStrategy:
    """Generate the full GTM strategy from a completed brief.

    Runs all sub-generators in sequence (each builds on the previous),
    assembles the complete strategy, and saves both JSON and Markdown.
    """
    logger.info("=== Starting Strategy Generation ===")

    # Step 1: Segmentation (everything else builds on this)
    segments = generate_segmentation(brief)

    # Step 2: Positioning per segment
    positioning = generate_positioning(brief, segments)

    # Step 3: Channel strategy
    channels = generate_channel_strategy(brief, segments)

    # Step 4: Content architecture
    content_arch = generate_content_architecture(brief, segments, channels)

    # Step 5: Edginess framework
    edginess = generate_edginess_framework(brief, segments)

    # Assemble the full strategy
    strategy = GTMStrategy(
        brief_summary=f"Strategy for {brief.product.name}: {brief.product.core_value_prop}",
        segments=segments,
        positioning=positioning,
        channels=channels,
        content_architecture=content_arch,
        edginess=edginess,
        assumptions=[
            "All acquisition is organic — no paid ads",
            "Founder is resource-constrained — prioritise ruthlessly",
            f"Budget: {brief.constraints.monthly_budget}",
            f"Tech stack: {', '.join(brief.constraints.tech_stack)}",
        ],
    )

    # Save structured output
    strategy_path = OUTPUT_DIR / "gtm_strategy.json"
    save_json(strategy.model_dump(), strategy_path)
    logger.info("Strategy JSON saved to %s", strategy_path)

    # Generate and save human-readable report
    report = generate_strategy_report(strategy, brief)
    report_path = OUTPUT_DIR / "gtm_strategy_report.md"
    save_markdown(report, report_path)
    logger.info("Strategy report saved to %s", report_path)

    log_decision(
        "strategy_complete",
        "Full GTM strategy generated",
        f"{len(segments)} segments, {len(channels)} channels, {len(content_arch)} content plans",
        {"timestamp": datetime.now(timezone.utc).isoformat()},
    )

    return strategy
