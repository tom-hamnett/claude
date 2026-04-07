"""Layer 5 — Stage Gate & Reporting System.

Forces human re-engagement at configurable intervals. The engine is autonomous
but not unsupervised — stage gates inject fresh founder signal that no amount
of data can replace.

Triggers:
- Time interval (default: weekly)
- Performance drop (engagement below threshold)
- Content diversity decay (too much of same type/channel)

At each gate, the engine asks sharp questions designed to surface information
the founder wouldn't think to volunteer.
"""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from gtm_engine.config import OUTPUT_DIR, STAGE_GATE_INTERVAL_DAYS
from gtm_engine.utils.ai_client import call_claude
from gtm_engine.utils.file_io import load_json, save_json, save_markdown
from gtm_engine.utils.logger import log_decision

logger = logging.getLogger(__name__)

STAGE_GATE_QUESTIONS = [
    "What's happened in your business this week that the engine doesn't know about?",
    "Have any customers said anything surprising — positive or negative?",
    "What do you now believe that you didn't believe before?",
    "What's the most uncomfortable truth about your product right now?",
    "Has your competitive landscape shifted? Any new entrants or departures?",
    "Which piece of content from the last cycle felt most 'you'? Which felt off?",
]

REPORT_SYSTEM = """You are a senior GTM strategist writing a weekly performance report.

Given performance data, deployment logs, decision logs, and reprioritisation history,
write a clear, actionable report.

Structure:
# Weekly GTM Report — [date range]

## What Ran
- Summary of all content published this cycle (counts by channel, segment, type)

## What Performed
- Top 3 performing pieces with WHY they worked
- Engagement trends by channel
- Any viral or breakout content

## What Changed
- Strategy adjustments made by the reprioritisation engine
- Reasoning for each change

## What's Next
- Prioritised action items for the coming week
- Content queue preview
- Any gates or blockers

## Founder Signal Needed
- Questions where your input would improve the engine's output

Keep it concise. Bold the most important insight in each section.
The founder is busy — make every sentence earn its place.
"""


def check_gate_trigger(
    last_gate_time: datetime | None,
    performance_log: list[dict] | None = None,
    content_log: list[dict] | None = None,
) -> dict:
    """Check if a stage gate should fire. Returns trigger info.

    Multiple triggers can fire simultaneously — the gate activates
    on ANY trigger.
    """
    triggers = []
    now = datetime.now(timezone.utc)

    # Trigger 1: Time interval
    if last_gate_time is None:
        triggers.append({"type": "first_run", "reason": "No previous gate on record"})
    else:
        elapsed = now - last_gate_time
        if elapsed.days >= STAGE_GATE_INTERVAL_DAYS:
            triggers.append({
                "type": "time_interval",
                "reason": f"{elapsed.days} days since last gate (threshold: {STAGE_GATE_INTERVAL_DAYS})",
            })

    # Trigger 2: Performance drop
    if performance_log and len(performance_log) >= 5:
        recent = performance_log[-5:]
        older = performance_log[-10:-5] if len(performance_log) >= 10 else performance_log[:5]

        recent_avg = _avg_score(recent)
        older_avg = _avg_score(older)

        if older_avg > 0 and recent_avg < older_avg * 0.7:
            triggers.append({
                "type": "performance_drop",
                "reason": f"Average engagement dropped {((older_avg - recent_avg) / older_avg) * 100:.0f}% "
                          f"(from {older_avg:.1f} to {recent_avg:.1f})",
            })

    # Trigger 3: Content diversity decay
    if content_log and len(content_log) >= 5:
        recent_types = [c.get("content_type", "") for c in content_log[-10:]]
        unique_ratio = len(set(recent_types)) / len(recent_types) if recent_types else 1
        if unique_ratio < 0.4:
            triggers.append({
                "type": "diversity_decay",
                "reason": f"Content type diversity dropped to {unique_ratio:.0%} — "
                          f"too much repetition in recent output",
            })

    return {
        "should_trigger": len(triggers) > 0,
        "triggers": triggers,
        "checked_at": now.isoformat(),
    }


def run_stage_gate_cli(
    performance_log: list[dict] | None = None,
    decisions_log: list[dict] | None = None,
) -> dict:
    """Run an interactive stage gate review via CLI.

    Asks the founder sharp questions and captures their responses.
    Returns the responses for injection back into the engine context.
    """
    from rich.console import Console
    from rich.panel import Panel

    console = Console()

    console.print(Panel(
        "[bold]Stage Gate Review[/bold]\n\n"
        "Time for a human checkpoint. The engine needs fresh signal from you.\n"
        "Your answers feed directly back into content strategy and prioritisation.\n"
        "Be honest — the more uncomfortable the truth, the more useful it is.",
        title="Stage Gate",
        border_style="yellow",
    ))

    responses = {}
    for question in STAGE_GATE_QUESTIONS:
        console.print(f"\n[bold]{question}[/bold]")
        answer = console.input("\n> ").strip()
        if answer.lower() == "skip":
            continue
        responses[question] = answer

    # Use Claude to synthesise the responses into actionable insights
    synthesis = _synthesise_gate_responses(responses, performance_log)

    # Save the gate record
    gate_record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "responses": responses,
        "synthesis": synthesis,
    }
    save_json(gate_record, OUTPUT_DIR / f"stage_gate_{datetime.now(timezone.utc).strftime('%Y%m%d')}.json")

    log_decision(
        "stage_gate",
        "Stage gate review completed",
        f"{len(responses)} questions answered, synthesis generated",
        {"key_insights": synthesis.get("key_insights", [])},
    )

    return gate_record


def _synthesise_gate_responses(responses: dict, performance_log: list[dict] | None) -> dict:
    """Use Claude to turn raw founder responses into structured strategy updates."""
    prompt = (
        f"FOUNDER RESPONSES FROM STAGE GATE:\n{json.dumps(responses, indent=2)}\n\n"
    )
    if performance_log:
        prompt += f"RECENT PERFORMANCE (last 5 entries):\n{json.dumps(performance_log[-5:], indent=2)}\n\n"

    prompt += """Synthesise these founder responses into actionable strategy updates.

Return a JSON object:
{
    "key_insights": ["insight 1", "insight 2", ...],
    "brief_updates": {<any GTM Brief fields that should be updated based on new info>},
    "content_implications": ["what this means for content strategy"],
    "tone_adjustments": "any shifts in brand voice or edginess",
    "new_topics": ["topic ideas sparked by founder input"],
    "warnings": ["any red flags or concerns"]
}"""

    response = call_claude(prompt, max_tokens=2048, temperature=0.5)
    cleaned = response.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].rstrip()
    return json.loads(cleaned)


def generate_report(
    performance_log: list[dict] | None = None,
    deployment_log: list[dict] | None = None,
    decisions_log: list[dict] | None = None,
    strategy_json: dict | None = None,
) -> str:
    """Generate a human-readable weekly report.

    Pulls together all engine activity into a single, scannable document.
    """
    logger.info("Generating weekly report...")

    context_parts = []
    if performance_log:
        context_parts.append(f"PERFORMANCE DATA ({len(performance_log)} entries):\n{json.dumps(performance_log[-20:], indent=2)}")
    if deployment_log:
        context_parts.append(f"DEPLOYMENT LOG ({len(deployment_log)} entries):\n{json.dumps(deployment_log[-20:], indent=2)}")
    if decisions_log:
        context_parts.append(f"DECISION LOG ({len(decisions_log)} entries):\n{json.dumps(decisions_log[-20:], indent=2)}")
    if strategy_json:
        context_parts.append(f"CURRENT STRATEGY SUMMARY:\n{json.dumps(strategy_json.get('brief_summary', ''), indent=2)}")

    if not context_parts:
        return "# Weekly GTM Report\n\nNo data available yet. Run the engine to generate performance data."

    prompt = "\n\n".join(context_parts) + "\n\nGenerate the weekly report."
    report = call_claude(prompt, system=REPORT_SYSTEM, max_tokens=4096, temperature=0.5)

    # Save report
    report_path = OUTPUT_DIR / f"weekly_report_{datetime.now(timezone.utc).strftime('%Y%m%d')}.md"
    save_markdown(report, report_path)
    logger.info("Weekly report saved to %s", report_path)

    return report


def _avg_score(entries: list[dict]) -> float:
    """Calculate average engagement score from performance log entries."""
    scores = []
    for entry in entries:
        metrics = entry.get("metrics", {})
        # Simple sum of all numeric metrics as a proxy
        score = sum(v for v in metrics.values() if isinstance(v, (int, float)))
        scores.append(score)
    return sum(scores) / len(scores) if scores else 0.0
