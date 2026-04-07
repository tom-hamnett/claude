"""Structured logging setup for the engine.

Every decision, reprioritisation, and deployment action is logged with
a timestamp and plain-English reasoning so humans can audit the engine.
"""

import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

from gtm_engine.config import LOG_LEVEL, LOGS_DIR


def setup_logging() -> logging.Logger:
    """Configure and return the root engine logger."""
    logger = logging.getLogger("gtm_engine")
    logger.setLevel(getattr(logging, LOG_LEVEL.upper(), logging.INFO))

    # Console handler
    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(logging.Formatter(
        "%(asctime)s | %(name)s | %(levelname)s | %(message)s"
    ))
    logger.addHandler(console)

    # File handler
    file_handler = logging.FileHandler(LOGS_DIR / "engine.log")
    file_handler.setFormatter(logging.Formatter(
        "%(asctime)s | %(name)s | %(levelname)s | %(message)s"
    ))
    logger.addHandler(file_handler)

    return logger


def log_decision(category: str, decision: str, reasoning: str, data: dict | None = None) -> None:
    """Log a strategic or operational decision with full context.

    These entries go into a structured JSON log so the stage gate system
    can surface them in human-readable reports.
    """
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "category": category,
        "decision": decision,
        "reasoning": reasoning,
    }
    if data:
        entry["data"] = data

    log_path = LOGS_DIR / "decisions.jsonl"
    with open(log_path, "a") as f:
        f.write(json.dumps(entry) + "\n")
