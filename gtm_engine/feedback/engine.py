"""Layer 4b — Feedback ingestion and reprioritisation logic.

This is the closed-loop intelligence layer. It:
1. Ingests raw performance metrics from deployment channels
2. Normalises them into a comparable scoring system
3. Identifies what's working (and more importantly, what's not)
4. Uses Claude to reason about WHY patterns exist
5. Recommends concrete strategy adjustments
6. Logs every change with plain-English reasoning

The engine gets smarter every cycle. Every content piece is tagged,
so when something performs, we know exactly which segment, channel,
content type, and edginess principle drove the result.
"""

import json
import logging
from datetime import datetime, timezone

from gtm_engine.config import OUTPUT_DIR
from gtm_engine.strategy.models import GTMStrategy
from gtm_engine.utils.ai_client import call_claude
from gtm_engine.utils.file_io import load_json, save_json, save_markdown
from gtm_engine.utils.logger import log_decision

logger = logging.getLogger(__name__)

# Normalisation weights per channel — how to compare apples to oranges
METRIC_WEIGHTS = {
    "linkedin": {"likes": 1, "comments": 5, "shares": 8, "clicks": 10},
    "twitter": {"likes": 1, "retweets": 5, "replies": 8, "impressions": 0.01},
    "reddit": {"score": 1, "num_comments": 5, "upvote_ratio": 50},
    "email": {"opens": 2, "clicks": 10, "replies": 20, "unsubscribes": -15},
}

REPRIORITISATION_SYSTEM = """You are a data-driven growth strategist analysing content performance.

Given:
1. Performance data across channels, segments, and content types
2. The current GTM strategy (channel weights, segment priorities)
3. What's working and what's not

Your job is to recommend specific, actionable strategy adjustments.

For each recommendation:
- State what to change (channel weight, segment priority, content type mix, posting cadence, tone)
- Explain WHY using the data
- Quantify the expected impact where possible
- Flag any signals that suggest deeper issues (wrong audience, wrong positioning, etc.)

RULES:
- Be ruthlessly honest. If a channel isn't working, say so.
- Look for non-obvious patterns. A low-engagement post that drives high conversion is valuable.
- Consider the INTERACTION between channels — does LinkedIn content drive email signups?
- Distinguish between "not working yet" and "not going to work". New channels need time.
- Always recommend at least one thing to STOP doing and one thing to DO MORE of.

Return a JSON object:
{
    "summary": "2-3 sentence executive summary",
    "channel_adjustments": [{"channel": "...", "action": "increase|decrease|pause|maintain", "reasoning": "..."}],
    "segment_adjustments": [{"segment": "...", "action": "...", "reasoning": "..."}],
    "content_adjustments": [{"content_type": "...", "action": "...", "reasoning": "..."}],
    "stop_doing": ["..."],
    "do_more_of": ["..."],
    "signals_to_watch": ["..."],
    "confidence_level": "low|medium|high"
}"""


def normalise_metrics(channel: str, raw_metrics: dict) -> float:
    """Convert raw platform metrics into a comparable engagement score.

    Uses channel-specific weights so a LinkedIn comment is worth more
    than a LinkedIn like (comments signal deeper engagement).
    """
    weights = METRIC_WEIGHTS.get(channel.lower(), {})
    score = 0.0
    for metric, value in raw_metrics.items():
        if metric in weights and isinstance(value, (int, float)):
            score += value * weights[metric]
    return round(score, 2)


def aggregate_performance(performance_log: list[dict]) -> dict:
    """Aggregate raw performance data into insights by channel, segment, and content type.

    Returns a structured summary ready for the reprioritisation AI.
    """
    by_channel: dict[str, list[float]] = {}
    by_segment: dict[str, list[float]] = {}
    by_content_type: dict[str, list[float]] = {}
    by_piece: list[dict] = []

    for entry in performance_log:
        channel = entry.get("channel", "unknown")
        metrics = entry.get("metrics", {})
        score = normalise_metrics(channel, metrics)

        by_channel.setdefault(channel, []).append(score)

        # These tags come from the content piece
        segment = entry.get("segment", "unknown")
        content_type = entry.get("content_type", "unknown")
        by_segment.setdefault(segment, []).append(score)
        by_content_type.setdefault(content_type, []).append(score)

        by_piece.append({
            "piece_id": entry.get("piece_id"),
            "channel": channel,
            "segment": segment,
            "content_type": content_type,
            "score": score,
            "raw_metrics": metrics,
        })

    def _summarise(data: dict[str, list[float]]) -> dict:
        return {
            k: {
                "count": len(v),
                "avg_score": round(sum(v) / len(v), 2) if v else 0,
                "max_score": round(max(v), 2) if v else 0,
                "min_score": round(min(v), 2) if v else 0,
                "total_score": round(sum(v), 2),
            }
            for k, v in data.items()
        }

    return {
        "by_channel": _summarise(by_channel),
        "by_segment": _summarise(by_segment),
        "by_content_type": _summarise(by_content_type),
        "top_performers": sorted(by_piece, key=lambda x: x["score"], reverse=True)[:10],
        "bottom_performers": sorted(by_piece, key=lambda x: x["score"])[:5],
        "total_pieces_measured": len(by_piece),
    }


def reprioritise(performance_log: list[dict], current_strategy: GTMStrategy) -> dict:
    """Analyse accumulated performance and recommend strategy adjustments.

    Uses Claude to reason about patterns and generate actionable changes.
    Every adjustment is logged with its reasoning.
    """
    logger.info("Running reprioritisation analysis...")

    aggregated = aggregate_performance(performance_log)

    prompt = (
        f"PERFORMANCE DATA:\n{json.dumps(aggregated, indent=2)}\n\n"
        f"CURRENT STRATEGY:\n"
        f"Channels (ranked): {json.dumps([{'channel': c.channel, 'rank': c.priority_rank, 'ratio': c.impact_to_effort_ratio} for c in current_strategy.channels], indent=2)}\n\n"
        f"Segments (ranked): {json.dumps([{'name': s.name, 'rank': s.priority_rank} for s in current_strategy.segments], indent=2)}\n\n"
        f"Content Types in play: {json.dumps([{'type': a.content_types, 'channel': a.channel, 'segment': a.segment} for a in current_strategy.content_architecture], indent=2)}\n\n"
        "Analyse this data and recommend specific strategy adjustments."
    )

    response = call_claude(prompt, system=REPRIORITISATION_SYSTEM, max_tokens=4096, temperature=0.5)

    # Parse response
    cleaned = response.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].rstrip()
    recommendations = json.loads(cleaned)

    # Log every adjustment
    for adj in recommendations.get("channel_adjustments", []):
        log_decision(
            "reprioritisation",
            f"Channel {adj['channel']}: {adj['action']}",
            adj.get("reasoning", ""),
        )
    for adj in recommendations.get("segment_adjustments", []):
        log_decision(
            "reprioritisation",
            f"Segment {adj['segment']}: {adj['action']}",
            adj.get("reasoning", ""),
        )

    # Save the full reprioritisation report
    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "performance_summary": aggregated,
        "recommendations": recommendations,
    }
    save_json(report, OUTPUT_DIR / "reprioritisation_log.json")

    # Also save human-readable version
    md_lines = [
        "# Reprioritisation Report",
        f"\n_Generated: {report['timestamp']}_\n",
        f"## Summary\n{recommendations.get('summary', 'N/A')}\n",
        "## Channel Adjustments",
    ]
    for adj in recommendations.get("channel_adjustments", []):
        md_lines.append(f"- **{adj['channel']}**: {adj['action']} — {adj.get('reasoning', '')}")
    md_lines.append("\n## Do More Of")
    for item in recommendations.get("do_more_of", []):
        md_lines.append(f"- {item}")
    md_lines.append("\n## Stop Doing")
    for item in recommendations.get("stop_doing", []):
        md_lines.append(f"- {item}")
    md_lines.append(f"\n## Confidence: {recommendations.get('confidence_level', 'N/A')}")

    save_markdown("\n".join(md_lines), OUTPUT_DIR / "reprioritisation_report.md")

    logger.info("Reprioritisation complete. Confidence: %s", recommendations.get("confidence_level"))
    return recommendations
