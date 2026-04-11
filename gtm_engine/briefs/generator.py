"""Brief-driven Idea Generator — turn a natural-language brief into a batch of ideas.

Unlike the generic idea generator (which produces a funnel-balanced batch
from the strategy), this generator takes a specific Brief and produces
ideas that serve ONLY that brief.

Example: a Brief titled "Founder Introduction Series" with 5 pieces
produces 5 ideas that introduce the founder, his worldview, and why
Quantum Tools exists — in sequence.

Every idea produced from a brief is tagged with the brief_id in its
notes field and the brief tracks the generated_idea_ids for review.
"""

import json
import logging

from gtm_engine.briefs import Brief, BriefQueue
from gtm_engine.data_vault import DataVault
from gtm_engine.ideas import Idea, IdeaBank
from gtm_engine.ideas.generator import (
    IDEA_GENERATION_SYSTEM,
    _load_full_context,
    _format_context_for_prompt,
    _parse_json_array,
)
from gtm_engine.utils.ai_client import call_claude
from gtm_engine.utils.logger import log_decision

logger = logging.getLogger(__name__)


BRIEF_SYSTEM_ADDITION = """

SPECIFIC BRIEF MODE:
The operator has submitted a specific content brief. Your job is NOT to
produce a funnel-balanced batch — your job is to produce exactly the
ideas the brief asks for, in the exact number requested, each one
serving the brief's stated purpose.

The ideas should feel like a coherent set (a series), not a random batch.
Consider sequencing: how should these pieces roll out? The first idea
sets up the arc, the last one closes it.

If the brief references specific data sources, incorporate them. If no
data exists yet for a required reference, flag it in the data_requirement
field so the operator knows what to gather.
"""


def generate_ideas_from_brief(brief: Brief) -> list[Idea]:
    """Generate ideas that serve a specific brief.

    Returns a list of Idea objects tagged with the brief_id.
    """
    queue = BriefQueue()
    queue.update_status(brief.id, "generating")

    context = _load_full_context()

    # Load any referenced data sources into the prompt
    data_context = ""
    if brief.data_source_ids:
        vault = DataVault()
        sources = [vault.get(sid) for sid in brief.data_source_ids]
        sources = [s for s in sources if s is not None]
        if sources:
            data_context = "\n\n## REFERENCED DATA SOURCES\n\n"
            for s in sources:
                data_context += f"### {s.name} ({s.source_type})\n"
                data_context += f"{s.description}\n"
                if s.content:
                    data_context += f"\n```\n{s.content[:2000]}\n```\n"
                data_context += "\n"

    # Build the base context and append the brief-specific block
    base_context = _format_context_for_prompt(context, funnel_level="mixed")

    brief_block = (
        f"\n\n## THIS BRIEF\n\n"
        f"**Title:** {brief.title}\n"
        f"**Type:** {brief.brief_type}\n"
        f"**Target pieces:** {brief.target_count}\n"
    )
    if brief.target_products:
        brief_block += f"**Target products:** {', '.join(brief.target_products)}\n"
    if brief.target_segments:
        brief_block += f"**Target segments:** {', '.join(brief.target_segments)}\n"
    brief_block += f"\n**Operator's request (verbatim):**\n\n> {brief.description}\n"

    prompt = (
        f"{base_context}\n"
        f"{data_context}\n"
        f"{brief_block}\n\n"
        f"## TASK\n\n"
        f"Generate exactly {brief.target_count} content ideas that serve the brief above.\n"
        f"These ideas should feel like a coherent set with sequencing, not a random batch.\n"
        f"Consider: what's the arc? The first piece hooks, middle pieces develop, the last lands.\n\n"
        f"Every idea must still include all required fields (title, hook, angle, "
        f"data_requirement, funnel_level, product, target_segment, segment_type, "
        f"strategic_objective, edginess_score, estimated_reach, tags, narrative_anchor).\n\n"
        f"If the brief requires data that isn't in the referenced sources, flag "
        f"explicitly in data_requirement with 'NEEDS: ...' prefix.\n\n"
        f"Return ONLY a JSON array."
    )

    try:
        response = call_claude(
            prompt,
            system=IDEA_GENERATION_SYSTEM + BRIEF_SYSTEM_ADDITION,
            max_tokens=8192,
            temperature=0.85,
        )
    except Exception as e:
        logger.error("Brief idea generation failed: %s", e)
        queue.update_status(brief.id, "draft")
        return []

    raw = _parse_json_array(response)

    ideas: list[Idea] = []
    for item in raw:
        notes = item.get("notes", "")
        anchor = item.get("narrative_anchor", "")
        notes_parts = []
        if notes:
            notes_parts.append(notes)
        if anchor:
            notes_parts.append(f"[Anchor: {anchor}]")
        notes_parts.append(f"[Brief: #{brief.id} {brief.title}]")

        try:
            idea = Idea(
                title=item.get("title", ""),
                hook=item.get("hook", ""),
                angle=item.get("angle", ""),
                data_requirement=item.get("data_requirement", ""),
                funnel_level=item.get("funnel_level", "product"),
                product=item.get("product", ""),
                target_segment=item.get("target_segment", ""),
                segment_type=item.get("segment_type", "standalone"),
                strategic_objective=item.get("strategic_objective", "awareness"),
                edginess_score=int(item.get("edginess_score", 7)),
                estimated_reach=item.get("estimated_reach", "medium"),
                tags=item.get("tags", []) or [],
                notes="\n".join(notes_parts),
            )
            ideas.append(idea)
        except Exception as e:
            logger.warning("Failed to parse brief idea: %s", e)

    # Save ideas, attach to brief, update status
    bank = IdeaBank()
    idea_ids = bank.create_many(ideas)
    queue.attach_generated_ideas(brief.id, idea_ids)
    queue.update_status(brief.id, "complete")

    log_decision(
        "brief_executed",
        f"Brief #{brief.id} '{brief.title}' generated {len(ideas)} ideas",
        f"Type: {brief.brief_type}, Target count: {brief.target_count}",
    )

    return ideas
