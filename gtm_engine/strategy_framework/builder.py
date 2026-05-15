"""Strategy Builder — 5-stage guided framework generation.

Each stage takes the user's natural-language input and uses Claude to
produce structured output that feeds the next stage. The user can
re-run any stage at any time.

Stage 1: Audience Definition
Stage 2: Content Pillars
Stage 3: Channel Strategy
Stage 4: Funnel Mapping
Stage 5: Capacity & Sequencing
"""

import json
import logging
import re

from gtm_engine.strategy_framework import (
    AudienceSegment, Pillar, ChannelConfig, FunnelStageConfig,
    SequencingPhase, ContentStrategy, StrategyStore,
    PILLAR_ARCHETYPES, FUNNEL_STAGES, CHANNEL_CATALOGUE, BUSINESS_PHASES,
    get_business_phase,
)
from gtm_engine.utils.ai_client import call_claude
from gtm_engine.utils.logger import log_decision

logger = logging.getLogger(__name__)


def _slug(text: str) -> str:
    """Convert text to a slug suitable for ids."""
    s = re.sub(r"[^a-zA-Z0-9\s_-]", "", text.lower().strip())
    s = re.sub(r"\s+", "_", s)
    return s[:40] or "pillar"


def _parse_json_response(text: str) -> dict | list:
    """Parse Claude's JSON response, stripping markdown fences."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].rstrip()

    # Find JSON object or array
    for opener, closer in [("[", "]"), ("{", "}")]:
        start = cleaned.find(opener)
        end = cleaned.rfind(closer)
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(cleaned[start : end + 1])
            except json.JSONDecodeError:
                continue
    return json.loads(cleaned)


# ---------------------------------------------------------------------------
# STAGE 1: AUDIENCE DEFINITION
# ---------------------------------------------------------------------------

AUDIENCE_SYSTEM = """You are an elite go-to-market strategist helping a founder
define their audience for a content marketing engine.

The founder will give you natural-language answers about who they are trying
to reach. Your job is to translate that into 2-5 distinct audience segments,
each with:
- A clear short name (e.g. "Independent Strategy Consultants")
- A one-sentence description of who they are
- Their typical job title or role
- 3-5 pain points they actually feel
- 3-5 buying triggers (events that make them seek a solution)
- The channels they typically use
- Common objections they will raise

Be specific. "SMBs" is not a segment. "Solo consultants running strategy
engagements for mid-market PE portfolio companies" is. If the founder is
vague, invent the specificity — they will edit it.

Return ONLY a JSON array of segment objects with these keys:
  id, name, description, job_title, pain_points, buying_triggers,
  channels_they_use, objections."""


def build_audience(user_input: str) -> list[AudienceSegment]:
    """Run Stage 1 — turn natural language about audience into structured segments."""
    response = call_claude(
        user_input,
        system=AUDIENCE_SYSTEM,
        max_tokens=4096,
        temperature=0.5,
    )
    raw = _parse_json_response(response)
    if not isinstance(raw, list):
        raw = [raw]

    segments = []
    for item in raw:
        seg_id = item.get("id") or _slug(item.get("name", "segment"))
        segments.append(
            AudienceSegment(
                id=seg_id,
                name=item.get("name", "Unnamed segment"),
                description=item.get("description", ""),
                job_title=item.get("job_title", ""),
                pain_points=item.get("pain_points", []),
                buying_triggers=item.get("buying_triggers", []),
                channels_they_use=item.get("channels_they_use", []),
                objections=item.get("objections", []),
            )
        )

    log_decision(
        "strategy_audience",
        f"Built {len(segments)} audience segments",
        "Stage 1 of strategy builder",
    )
    return segments


# ---------------------------------------------------------------------------
# STAGE 2: CONTENT PILLARS
# ---------------------------------------------------------------------------

PILLARS_SYSTEM = """You are an elite content marketing strategist designing
the recurring content themes (pillars) for a founder's content engine.

Each pillar is a TERRITORY they will own — not a single post, but a recurring
theme that every piece of content fits under.

You will be given:
1. The founder's audience segments
2. A description of what they sell and their worldview
3. A set of universal pillar ARCHETYPES as starting vocabulary

Your job is to produce 4-6 SPECIFIC pillars that fit THIS founder's offering,
using the archetypes as a base but renaming them to be punchy and specific
to the founder's domain.

For each pillar:
- name: punchy, specific to the founder's domain (NOT generic)
- description: one paragraph on what content fits this pillar
- archetype: which universal archetype this is based on (problem, solution,
  evidence, insight, story, enablement) — choose the closest match
- target_percentage: how much of total content should be this pillar (must
  sum to 100 across all pillars)
- funnel_stage: the primary funnel stage this pillar serves (awareness,
  consideration, trust, authority, connection, conversion, retention)
- why_it_matters: one sentence explaining the strategic role
- example_topics: 3-4 example topic titles for this pillar

Return ONLY a JSON array of pillar objects."""


def build_pillars(
    audience_segments: list[AudienceSegment],
    business_context: str,
) -> list[Pillar]:
    """Run Stage 2 — produce content pillars from audience + business context."""
    archetype_summary = "\n".join(
        f"- **{a['default_name']}** ({a['archetype_id']}): {a['description']}"
        for a in PILLAR_ARCHETYPES
    )

    audience_summary = "\n".join(
        f"- **{s.name}**: {s.description} | Pain: {', '.join(s.pain_points[:3])}"
        for s in audience_segments
    )

    prompt = (
        f"## BUSINESS CONTEXT\n{business_context}\n\n"
        f"## AUDIENCE\n{audience_summary}\n\n"
        f"## UNIVERSAL ARCHETYPES (starting vocabulary)\n{archetype_summary}\n\n"
        f"Produce 4-6 specific content pillars for this founder. Target percentages "
        f"must sum to 100."
    )

    response = call_claude(
        prompt, system=PILLARS_SYSTEM, max_tokens=4096, temperature=0.6,
    )
    raw = _parse_json_response(response)
    if not isinstance(raw, list):
        raw = [raw]

    pillars = []
    for item in raw:
        p_id = item.get("id") or _slug(item.get("name", "pillar"))
        pillars.append(
            Pillar(
                id=p_id,
                name=item.get("name", "Unnamed pillar"),
                description=item.get("description", ""),
                archetype=item.get("archetype", ""),
                target_percentage=float(item.get("target_percentage", 0)),
                funnel_stage=item.get("funnel_stage", "awareness"),
                why_it_matters=item.get("why_it_matters", ""),
                example_topics=item.get("example_topics", []),
            )
        )

    # Normalise percentages to sum to 100 (if Claude got it slightly off)
    total = sum(p.target_percentage for p in pillars)
    if total > 0 and abs(total - 100) > 0.5:
        for p in pillars:
            p.target_percentage = round(p.target_percentage * 100 / total, 1)

    log_decision(
        "strategy_pillars",
        f"Built {len(pillars)} content pillars",
        f"Archetypes used: {[p.archetype for p in pillars]}",
    )
    return pillars


# ---------------------------------------------------------------------------
# STAGE 3: CHANNEL STRATEGY
# ---------------------------------------------------------------------------

CHANNELS_SYSTEM = """You are a content distribution strategist recommending
which channels a founder should use, what cadence per channel, and which
content pillars map to each channel.

You will receive:
- The founder's audience segments
- The founder's content pillars
- A catalogue of available channels with their growth mechanics

Your job: recommend 3-6 channels (don't suggest all available — focus is
better). For each:
- channel_id: from the catalogue
- enabled: true
- cadence_per_week: realistic for a small team
- primary_pillars: which pillar ids work best on this channel
- audience_segments: which segment ids this channel reaches
- notes: one-line rationale

Pick channels that match where the audience actually spends time. Don't
suggest channels that don't fit. Return ONLY a JSON array."""


def build_channels(
    audience_segments: list[AudienceSegment],
    pillars: list[Pillar],
) -> list[ChannelConfig]:
    """Run Stage 3 — recommend channels and per-channel pillar mapping."""
    channel_catalogue = "\n".join(
        f"- **{c['id']}** ({c['name']}): {c['audience_type']} | "
        f"cadence {c['recommended_cadence_low']}-{c['recommended_cadence_high']}/week | "
        f"growth: {c['growth_mechanic']}"
        for c in CHANNEL_CATALOGUE
    )

    audience_summary = "\n".join(
        f"- {s.id}: {s.name} | uses: {', '.join(s.channels_they_use)}"
        for s in audience_segments
    )

    pillar_summary = "\n".join(
        f"- {p.id}: {p.name} ({p.archetype})"
        for p in pillars
    )

    prompt = (
        f"## AUDIENCE\n{audience_summary}\n\n"
        f"## PILLARS\n{pillar_summary}\n\n"
        f"## CHANNEL CATALOGUE\n{channel_catalogue}\n\n"
        f"Recommend 3-6 channels. Return JSON array."
    )

    response = call_claude(
        prompt, system=CHANNELS_SYSTEM, max_tokens=3072, temperature=0.5,
    )
    raw = _parse_json_response(response)
    if not isinstance(raw, list):
        raw = [raw]

    channels = []
    for item in raw:
        channels.append(
            ChannelConfig(
                channel_id=item.get("channel_id", ""),
                enabled=item.get("enabled", True),
                cadence_per_week=int(item.get("cadence_per_week", 1)),
                primary_pillars=item.get("primary_pillars", []),
                audience_segments=item.get("audience_segments", []),
                notes=item.get("notes", ""),
            )
        )

    log_decision(
        "strategy_channels",
        f"Built {len(channels)} channel configs",
        f"Channels: {[c.channel_id for c in channels]}",
    )
    return channels


# ---------------------------------------------------------------------------
# STAGE 4: FUNNEL MAPPING
# ---------------------------------------------------------------------------

FUNNEL_SYSTEM = """You are mapping a founder's content pillars onto a universal
funnel of buyer belief.

The universal funnel stages are:
1. AWARENESS — they see you
2. CONSIDERATION — they get what you do
3. TRUST — they believe you can deliver
4. AUTHORITY — they respect your perspective
5. CONNECTION — they identify with you personally
6. CONVERSION — they're ready to act
7. RETENTION — they stay and bring others

For each stage, you'll customise:
- user_definition: a sentence-long restatement of what THIS founder's audience
  needs to believe at this stage (specific to their context)
- pillar_ids: which content pillars primarily serve this stage
- target_percentage: how much of total content should be at this stage

Not every stage needs all pillars. Allocate intentionally.

Return ONLY a JSON array. Percentages should sum to 100."""


def build_funnel(
    audience_segments: list[AudienceSegment],
    pillars: list[Pillar],
    business_context: str,
) -> list[FunnelStageConfig]:
    """Run Stage 4 — map pillars onto the universal funnel."""
    pillar_summary = "\n".join(
        f"- {p.id}: {p.name} ({p.archetype})"
        for p in pillars
    )

    stages_summary = "\n".join(
        f"- {s['id']}: {s['name']} — {s['description']}"
        for s in FUNNEL_STAGES
    )

    audience_summary = "\n".join(
        f"- {s.name}: {s.description}" for s in audience_segments
    )

    prompt = (
        f"## BUSINESS CONTEXT\n{business_context}\n\n"
        f"## AUDIENCE\n{audience_summary}\n\n"
        f"## PILLARS\n{pillar_summary}\n\n"
        f"## UNIVERSAL FUNNEL STAGES\n{stages_summary}\n\n"
        f"Map pillars to stages, customise the user_definition for each stage, "
        f"set target_percentage so they sum to 100. Return JSON array."
    )

    response = call_claude(
        prompt, system=FUNNEL_SYSTEM, max_tokens=3072, temperature=0.5,
    )
    raw = _parse_json_response(response)
    if not isinstance(raw, list):
        raw = [raw]

    stages = []
    for item in raw:
        sid = item.get("id", "")
        canonical = next((s for s in FUNNEL_STAGES if s["id"] == sid), None)
        stages.append(
            FunnelStageConfig(
                id=sid,
                name=canonical["name"] if canonical else item.get("name", sid),
                description=canonical["description"] if canonical else item.get("description", ""),
                user_definition=item.get("user_definition", ""),
                target_percentage=float(item.get("target_percentage", 0)),
                pillar_ids=item.get("pillar_ids", []),
            )
        )

    # Normalise
    total = sum(s.target_percentage for s in stages)
    if total > 0 and abs(total - 100) > 0.5:
        for s in stages:
            s.target_percentage = round(s.target_percentage * 100 / total, 1)

    log_decision(
        "strategy_funnel",
        f"Mapped {len(stages)} funnel stages",
        "",
    )
    return stages


# ---------------------------------------------------------------------------
# STAGE 5: CAPACITY & SEQUENCING
# ---------------------------------------------------------------------------


def build_sequencing(
    capacity_per_week: int,
    business_phase: str,
    pillars: list[Pillar],
) -> list[SequencingPhase]:
    """Run Stage 5 — produce a phased rollout plan.

    This stage doesn't need Claude — it derives from canonical phase definitions
    weighted against the user's actual pillars.
    """
    phases = []

    for phase_def in BUSINESS_PHASES:
        # Adjust archetype-based weights to use the user's actual pillar ids
        pillar_weights: dict[str, float] = {}
        for pillar in pillars:
            archetype_weight = phase_def["pillar_weights"].get(pillar.archetype, 0)
            pillar_weights[pillar.id] = archetype_weight

        # Normalise to 100
        total = sum(pillar_weights.values())
        if total > 0:
            for k in pillar_weights:
                pillar_weights[k] = round(pillar_weights[k] * 100 / total, 1)

        phases.append(
            SequencingPhase(
                phase=phase_def["id"],
                label=phase_def["name"],
                weeks_duration=4,
                pillar_weights=pillar_weights,
            )
        )

    log_decision(
        "strategy_sequencing",
        f"Built {len(phases)} sequencing phases",
        f"Current phase: {business_phase}, capacity: {capacity_per_week}/week",
    )
    return phases


# ---------------------------------------------------------------------------
# Convenience: run all stages from existing brief/strategy
# ---------------------------------------------------------------------------


def autopopulate_from_existing_brief(business_context: str = "") -> ContentStrategy:
    """One-shot strategy generation from the existing GTM brief.

    If the user has already run the discovery interview / prefill and has
    a gtm_brief.json + gtm_strategy.json, we can pre-populate all 5 stages
    in one call so they have something to react to rather than starting blank.
    """
    from gtm_engine.config import OUTPUT_DIR
    from gtm_engine.utils.file_io import load_json

    brief_path = OUTPUT_DIR / "gtm_brief.json"
    strategy_path = OUTPUT_DIR / "gtm_strategy.json"

    brief = load_json(brief_path) if brief_path.exists() else {}
    strategy = load_json(strategy_path) if strategy_path.exists() else {}

    # Build a business context blurb if not provided
    if not business_context:
        product_names = [p.get("name", "") for p in brief.get("products", [])]
        business_context = (
            f"Umbrella brand: {brief.get('umbrella_brand', '')[:600]}. "
            f"Products: {', '.join(product_names)}. "
            f"Brand tone: {brief.get('brand', {}).get('tone', '')[:300]}"
        )

    # Stage 1: Audience — derive from existing segments
    audience_input = (
        f"My business: {business_context}\n\n"
        f"Existing target segments I've identified:\n"
    )
    for seg in strategy.get("segments", [])[:5]:
        audience_input += (
            f"\n- {seg.get('name', '')}: {seg.get('description', '')[:300]}\n"
            f"  Pain: {', '.join(seg.get('pain_points', [])[:3])}\n"
        )

    segments = build_audience(audience_input)

    # Stage 2: Pillars
    pillars = build_pillars(segments, business_context)

    # Stage 3: Channels
    channels = build_channels(segments, pillars)

    # Stage 4: Funnel
    funnel = build_funnel(segments, pillars, business_context)

    # Stage 5: Sequencing (no Claude call — derived)
    sequencing = build_sequencing(capacity_per_week=5, business_phase="pre_launch", pillars=pillars)

    content_strategy = ContentStrategy(
        audience_segments=segments,
        pillars=pillars,
        channels=channels,
        funnel_stages=funnel,
        sequencing=sequencing,
        capacity_per_week=5,
        business_phase="pre_launch",
        setup_complete=True,
        stages_completed=["audience", "pillars", "channels", "funnel", "sequencing"],
    )

    store = StrategyStore()
    store.save(content_strategy)

    return content_strategy
