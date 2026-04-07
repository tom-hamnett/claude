"""Deployment scheduler — manages timing and autonomous publishing.

Handles the scheduling loop: picks content from the queue, checks timing
optimisation rules, publishes through the appropriate connector, and
records results for the feedback engine.
"""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from gtm_engine.config import CONTENT_QUEUE_DIR, OUTPUT_DIR
from gtm_engine.content_factory.models import ContentPiece
from gtm_engine.deployment.channels import get_connector, CONNECTORS
from gtm_engine.utils.file_io import load_json, save_json
from gtm_engine.utils.logger import log_decision

logger = logging.getLogger(__name__)

# Optimal posting times per channel (UTC hours).
# These are starting defaults — the feedback engine overrides them with data.
OPTIMAL_TIMES = {
    "linkedin": [8, 10, 12, 17],   # Business hours, morning and lunch peaks
    "twitter": [9, 12, 15, 18],     # Spread through the day
    "reddit": [10, 14, 18],         # US timezone peaks
    "email": [6, 10, 14],           # Early morning, mid-morning, post-lunch
}


class DeploymentScheduler:
    """Manages the content deployment queue and publishing cycle."""

    def __init__(self):
        self.deployment_log: list[dict] = []

    def get_pending_content(self) -> list[ContentPiece]:
        """Load all draft/approved content from the queue directory."""
        pieces = []
        for path in sorted(CONTENT_QUEUE_DIR.glob("*.json")):
            if path.name == "batch_manifest.json":
                continue
            try:
                data = load_json(path)
                piece = ContentPiece(**data)
                if piece.status in ("draft", "approved"):
                    pieces.append(piece)
            except Exception as e:
                logger.warning("Failed to load content piece %s: %s", path, e)
        return pieces

    def publish_piece(self, piece: ContentPiece, **kwargs) -> dict:
        """Publish a single content piece through the appropriate connector."""
        channel = piece.tags.channel
        if not channel:
            return {"status": "error", "error": "No channel specified in content tags"}

        try:
            connector = get_connector(channel)
        except ValueError as e:
            return {"status": "error", "error": str(e)}

        result = connector.publish(piece, **kwargs)

        # Record in deployment log
        log_entry = {
            "piece_id": piece.id,
            "channel": channel,
            "segment": piece.tags.segment,
            "content_type": piece.tags.content_type,
            "result": result,
            "deployed_at": datetime.now(timezone.utc).isoformat(),
        }
        self.deployment_log.append(log_entry)

        # Update piece status
        if result.get("status") == "published":
            piece.status = "published"

        return result

    def run_deployment_cycle(self, auto_publish: bool = False) -> list[dict]:
        """Run a full deployment cycle.

        If auto_publish is False (default), only reports what would be published.
        If True, actually publishes approved content.
        """
        pending = self.get_pending_content()
        logger.info("Deployment cycle: %d pieces pending", len(pending))

        results = []
        for piece in pending:
            if auto_publish and piece.status == "approved":
                result = self.publish_piece(piece)
                results.append(result)
            else:
                results.append({
                    "piece_id": piece.id,
                    "status": "dry_run",
                    "would_publish_to": piece.tags.channel,
                    "content_type": piece.tags.content_type,
                    "title": piece.title[:80],
                })

        # Save deployment log
        if self.deployment_log:
            log_path = OUTPUT_DIR / "deployment_log.json"
            save_json(self.deployment_log, log_path)
            logger.info("Deployment log saved: %d entries", len(self.deployment_log))

        return results

    def collect_metrics(self) -> list[dict]:
        """Collect performance metrics for all published content."""
        metrics = []
        for entry in self.deployment_log:
            if entry["result"].get("status") != "published":
                continue

            platform_id = entry["result"].get("platform_post_id")
            if not platform_id:
                continue

            try:
                connector = get_connector(entry["channel"])
                channel_metrics = connector.get_metrics(platform_id)
                metrics.append({
                    "piece_id": entry["piece_id"],
                    "channel": entry["channel"],
                    "platform_post_id": platform_id,
                    "metrics": channel_metrics,
                    "collected_at": datetime.now(timezone.utc).isoformat(),
                })
            except Exception as e:
                logger.warning("Failed to collect metrics for %s: %s", platform_id, e)

        if metrics:
            metrics_path = OUTPUT_DIR / "performance_log.json"
            save_json(metrics, metrics_path)

        return metrics
