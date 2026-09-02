"""Approval State Machine — three-gate content production pipeline.

Every idea flows through three gates before going live:

    Gate 1 — IDEA APPROVAL
        idea_draft → idea_approved (proceed to content generation)
                  → idea_rejected (dead end)

    Gate 2 — CONTENT APPROVAL
        idea_approved → content_generated → content_approved (proceed to deployment)
                                         → content_rejected (back to idea_approved)

    Gate 3 — DEPLOYMENT APPROVAL
        content_approved → deployment_scheduled → deployed
                                                → content_approved (if schedule cancelled)

Each transition is logged with a timestamp, reason, and actor.
"""

import logging
from datetime import datetime, timezone

from gtm_engine.ideas import IdeaBank, STATES

logger = logging.getLogger(__name__)

# Valid state transitions — (from_state, to_state) pairs
VALID_TRANSITIONS = {
    "idea_draft": {"idea_approved", "idea_rejected", "archived"},
    "idea_rejected": {"idea_draft", "archived"},
    "idea_approved": {"content_generated", "idea_draft", "archived"},
    "content_generated": {"content_approved", "content_rejected", "archived"},
    "content_rejected": {"idea_approved", "content_generated", "archived"},
    "content_approved": {"deployment_scheduled", "content_rejected", "archived"},
    "deployment_scheduled": {"deployed", "content_approved", "archived"},
    "deployed": {"archived"},
    "archived": set(),
}


class ApprovalError(Exception):
    """Raised when an invalid state transition is attempted."""


def transition(
    idea_id: int,
    to_state: str,
    reason: str = "",
    force: bool = False,
) -> None:
    """Transition an idea to a new state.

    Args:
        idea_id: Primary key of the idea
        to_state: Target state
        reason: Plain English reason for the transition
        force: If True, skip validation (use sparingly)
    """
    bank = IdeaBank()
    idea = bank.get(idea_id)
    if not idea:
        raise ApprovalError(f"Idea {idea_id} not found")

    current = idea.status
    allowed = VALID_TRANSITIONS.get(current, set())

    if not force and to_state not in allowed:
        raise ApprovalError(
            f"Invalid transition: {current} -> {to_state}. "
            f"Allowed from {current}: {sorted(allowed)}"
        )

    bank.update_status(idea_id, to_state, reason)
    logger.info("Idea %d: %s -> %s (%s)", idea_id, current, to_state, reason or "no reason given")
    # Persist every funnel move to durable storage (no-op without Supabase).
    try:
        from gtm_engine.persistence import backup_quietly
        backup_quietly()
    except Exception:
        pass


def bulk_transition(idea_ids: list[int], to_state: str, reason: str = "") -> dict:
    """Transition many ideas at once. Returns a report of successes/failures."""
    report = {"successful": [], "failed": []}
    for idea_id in idea_ids:
        try:
            transition(idea_id, to_state, reason=reason)
            report["successful"].append(idea_id)
        except ApprovalError as e:
            report["failed"].append({"id": idea_id, "error": str(e)})
    return report


def approve_idea(idea_id: int, reason: str = "Approved for content generation") -> None:
    transition(idea_id, "idea_approved", reason=reason)


def reject_idea(idea_id: int, reason: str = "Not aligned with brand") -> None:
    transition(idea_id, "idea_rejected", reason=reason)


def mark_content_generated(idea_id: int, content_piece_id: str = "") -> None:
    """Mark an idea as having content generated and attach the content piece id."""
    bank = IdeaBank()
    if content_piece_id:
        bank.attach_content(idea_id, content_piece_id)
    transition(idea_id, "content_generated", reason=f"Content piece {content_piece_id}")


def approve_content(idea_id: int, reason: str = "Content approved for deployment") -> None:
    transition(idea_id, "content_approved", reason=reason)


def reject_content(idea_id: int, reason: str = "") -> None:
    transition(idea_id, "content_rejected", reason=reason)


def schedule_deployment(idea_id: int, reason: str = "") -> None:
    transition(idea_id, "deployment_scheduled", reason=reason)


def mark_deployed(idea_id: int, platform_post_id: str = "") -> None:
    transition(idea_id, "deployed", reason=f"Posted: {platform_post_id}")


def archive(idea_id: int, reason: str = "") -> None:
    transition(idea_id, "archived", reason=reason, force=True)


def get_allowed_transitions(current_state: str) -> list[str]:
    """Return the list of valid next states from a given state."""
    return sorted(VALID_TRANSITIONS.get(current_state, set()))


def get_pipeline_counts() -> dict[str, int]:
    """Count how many ideas are in each pipeline stage."""
    bank = IdeaBank()
    return bank.counts_by_status()
