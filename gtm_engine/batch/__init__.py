"""Batch Operations — bulk-approve, bulk-generate, bulk-deploy.

These are the workhorse functions the Streamlit dashboard calls when the
operator hits "approve selected" or "generate selected". They handle the
orchestration between the idea bank, the content factory, and the
deployment scheduler.
"""

import logging
from pathlib import Path

from gtm_engine.approval import (
    approve_idea,
    mark_content_generated,
    approve_content,
    schedule_deployment,
    bulk_transition,
)
from gtm_engine.ideas import IdeaBank, Idea

logger = logging.getLogger(__name__)


def bulk_approve_ideas(idea_ids: list[int], reason: str = "Bulk approval") -> dict:
    """Approve many ideas for content generation in one operation."""
    report = bulk_transition(idea_ids, "idea_approved", reason=reason)
    logger.info(
        "Bulk approved %d/%d ideas",
        len(report["successful"]),
        len(idea_ids),
    )
    return report


def bulk_reject_ideas(idea_ids: list[int], reason: str = "Bulk rejection") -> dict:
    report = bulk_transition(idea_ids, "idea_rejected", reason=reason)
    logger.info(
        "Bulk rejected %d/%d ideas",
        len(report["successful"]),
        len(idea_ids),
    )
    return report


def bulk_generate_content(
    idea_ids: list[int],
    content_type: str = "linkedin_post",
) -> dict:
    """Generate content pieces for a batch of approved ideas.

    Uses the existing derivative pipeline — each idea becomes a content piece
    via Claude generation with the idea's hook and angle as the seed.

    Returns a report with successes and the piece ids.
    """
    from gtm_engine.content_factory.master_asset import generate_master_asset
    from gtm_engine.content_factory.derivatives import generate_derivative
    from gtm_engine.discovery.models import GTMBrief
    from gtm_engine.strategy.models import GTMStrategy
    from gtm_engine.config import OUTPUT_DIR
    from gtm_engine.utils.file_io import load_json

    report = {"successful": [], "failed": []}

    bank = IdeaBank()

    # Load brief + strategy once (reused across ideas)
    brief_path = OUTPUT_DIR / "gtm_brief.json"
    strategy_path = OUTPUT_DIR / "gtm_strategy.json"

    try:
        brief = GTMBrief(**load_json(brief_path))
        strategy = GTMStrategy(**load_json(strategy_path))
    except Exception as e:
        logger.error("Cannot load brief/strategy: %s", e)
        return {"successful": [], "failed": [{"error": str(e)}]}

    for idea_id in idea_ids:
        idea = bank.get(idea_id)
        if not idea:
            report["failed"].append({"id": idea_id, "error": "Not found"})
            continue

        if idea.status != "idea_approved":
            report["failed"].append(
                {"id": idea_id, "error": f"Not approved (status: {idea.status})"}
            )
            continue

        try:
            # Build the master asset topic from the idea
            topic = f"{idea.title}: {idea.angle}"
            extra_context = (
                f"Hook: {idea.hook}\n"
                f"Target segment: {idea.target_segment}\n"
                f"Data requirement: {idea.data_requirement}\n"
                f"Strategic objective: {idea.strategic_objective}\n"
                f"Edginess target: {idea.edginess_score}/10"
            )

            # Generate a master asset seeded by the idea
            asset = generate_master_asset(
                topic=topic,
                brief=brief,
                strategy=strategy,
                segment=idea.target_segment,
                extra_context=extra_context,
            )

            # Generate the primary derivative for this idea
            derivative = generate_derivative(
                master_asset=asset,
                format_name=content_type,
                run_benchmark=False,
                generate_media=False,
            )

            # Link and mark
            mark_content_generated(idea_id, content_piece_id=derivative["id"])
            report["successful"].append(
                {"idea_id": idea_id, "piece_id": derivative["id"]}
            )

        except Exception as e:
            logger.error("Content generation failed for idea %d: %s", idea_id, e)
            report["failed"].append({"id": idea_id, "error": str(e)})

    logger.info(
        "Bulk content generation: %d successful, %d failed",
        len(report["successful"]),
        len(report["failed"]),
    )
    return report


def bulk_approve_content(idea_ids: list[int], reason: str = "Content approved") -> dict:
    return bulk_transition(idea_ids, "content_approved", reason=reason)


def bulk_schedule_deployment(idea_ids: list[int], reason: str = "Scheduled") -> dict:
    return bulk_transition(idea_ids, "deployment_scheduled", reason=reason)
