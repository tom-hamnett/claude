"""Layer 5 — Stage Gate & Reporting System.

Forces human re-engagement at configurable intervals. Asks sharp questions
to inject fresh founder signal back into the engine.
"""

import logging
from datetime import datetime, timezone

from gtm_engine.config import STAGE_GATE_INTERVAL_DAYS

logger = logging.getLogger(__name__)

STAGE_GATE_QUESTIONS = [
    "What's happened in your business this week?",
    "Have any customers said anything surprising?",
    "What do you now believe that you didn't believe before?",
    "What's the most uncomfortable truth about your product right now?",
]


def check_gate_trigger(last_gate_time: datetime | None) -> bool:
    """Return True if it's time for a stage gate review."""
    if last_gate_time is None:
        return True
    elapsed = datetime.now(timezone.utc) - last_gate_time
    return elapsed.days >= STAGE_GATE_INTERVAL_DAYS


def generate_report(performance_log: list, decisions_log: list) -> str:
    """Generate a human-readable report: what ran, what performed,
    what changed, why, and what's next."""
    # TODO: Implement in Layer 5 build phase
    raise NotImplementedError
