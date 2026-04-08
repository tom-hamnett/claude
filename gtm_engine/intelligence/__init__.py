"""Layer 6 — Live Intelligence Feed.

Always-open founder signal input. Can be triggered at any time — not just
at stage gates. Accepts raw input in any format, assesses significance,
generates content briefs, and queues with urgency tags.

This is how the engine stays current with founder insights, market events,
customer conversations, and competitive moves.
"""

import json
import logging
import uuid
from datetime import datetime, timezone

from gtm_engine.config import DATA_DIR, OUTPUT_DIR
from gtm_engine.utils.ai_client import call_claude
from gtm_engine.utils.file_io import save_json
from gtm_engine.utils.logger import log_decision

logger = logging.getLogger(__name__)

INTELLIGENCE_DIR = DATA_DIR / "intelligence_feed"
INTELLIGENCE_DIR.mkdir(parents=True, exist_ok=True)

SIGNAL_ASSESSMENT_SYSTEM = """You are a GTM intelligence analyst for Quantum Tools.

The founder has shared a raw signal — a customer conversation, data finding,
market event, competitor move, or personal insight. Your job is to assess it.

Evaluate:
1. SIGNIFICANCE: What does this change or confirm about the GTM strategy?
2. CONTENT OPPORTUNITY: Can this become compelling content? How urgent?
3. STRATEGY IMPACT: Should this change channel priorities, segment focus, or positioning?

Priority scale:
- 5 (BREAKING): Immediately actionable, time-sensitive, displaces scheduled content
- 4 (HIGH): Should generate a full master asset + all derivatives within 48 hours
- 3 (MEDIUM): Master asset + top 3 derivatives, queued normally
- 2 (LOW): Single best-fit derivative, queued normally
- 1 (NOTE): Log for context, no immediate content action

Return JSON:
{
    "priority": 1-5,
    "significance_summary": "one paragraph on what this means",
    "content_opportunity_score": 1-10,
    "recommended_action": "what to do with this",
    "master_asset_topic": "suggested master asset title if priority >= 3",
    "derivative_formats": ["best formats for this signal"],
    "strategy_implications": ["any GTM strategy changes this suggests"],
    "target_segments": ["which segments care about this"],
    "urgency": "standard|priority|breaking",
    "reasoning": "why this priority level"
}"""


def submit_signal(raw_input: str, signal_type: str = "general") -> dict:
    """Submit a raw intelligence signal for assessment.

    Accepts any format: text, paste, data, conversation transcript.
    The engine extracts the signal and assesses significance.

    signal_type: general, customer_conversation, data_finding,
                 competitor_move, market_event, product_insight
    """
    signal_id = f"SIG-{str(uuid.uuid4())[:6].upper()}"

    logger.info("Assessing signal %s (type: %s)", signal_id, signal_type)

    prompt = (
        f"SIGNAL TYPE: {signal_type}\n"
        f"RAW INPUT:\n{raw_input}\n\n"
        f"CONTEXT: Quantum Tools builds AI-powered professional intelligence tools "
        f"(PRISM, Analyst's Edge, APEX, ATLAS). Target segments include management "
        f"consultants, PE/VC analysts, PMO directors, and sophisticated traders.\n\n"
        "Assess this signal and return your analysis as JSON."
    )

    response = call_claude(prompt, system=SIGNAL_ASSESSMENT_SYSTEM, max_tokens=2048, temperature=0.5)

    cleaned = response.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].rstrip()

    try:
        assessment = json.loads(cleaned)
    except json.JSONDecodeError:
        assessment = {
            "priority": 2,
            "significance_summary": "Assessment parsing failed — review manually",
            "content_opportunity_score": 5,
            "recommended_action": "Manual review",
            "urgency": "standard",
        }

    signal_record = {
        "id": signal_id,
        "type": signal_type,
        "raw_input": raw_input,
        "assessment": assessment,
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "status": "assessed",
        "content_generated": False,
    }

    save_json(signal_record, INTELLIGENCE_DIR / f"{signal_id}.json")

    log_decision(
        "intelligence_feed",
        f"Signal {signal_id}: Priority {assessment.get('priority', '?')}/5",
        assessment.get("significance_summary", ""),
        {"signal_id": signal_id, "urgency": assessment.get("urgency", "standard")},
    )

    return signal_record


def list_signals(min_priority: int = 1) -> list[dict]:
    """List all intelligence signals, optionally filtered by minimum priority."""
    signals = []
    for path in sorted(INTELLIGENCE_DIR.glob("SIG-*.json"), reverse=True):
        try:
            from gtm_engine.utils.file_io import load_json
            data = load_json(path)
            priority = data.get("assessment", {}).get("priority", 0)
            if priority >= min_priority:
                signals.append({
                    "id": data["id"],
                    "type": data.get("type"),
                    "priority": priority,
                    "urgency": data.get("assessment", {}).get("urgency"),
                    "summary": data.get("assessment", {}).get("significance_summary", "")[:100],
                    "submitted_at": data.get("submitted_at"),
                    "content_generated": data.get("content_generated", False),
                })
        except Exception:
            pass
    return signals


def run_cli_signal_input():
    """Interactive CLI for submitting intelligence signals."""
    from rich.console import Console
    from rich.panel import Panel

    console = Console()
    console.print(Panel(
        "[bold]Live Intelligence Feed[/bold]\n\n"
        "Share a signal: customer quote, data finding, market event, insight.\n"
        "Paste anything — the engine will assess significance and suggest content.\n"
        "Type 'quit' to exit.",
        title="Intelligence Feed",
        border_style="cyan",
    ))

    signal_types = ["general", "customer_conversation", "data_finding",
                    "competitor_move", "market_event", "product_insight"]

    while True:
        console.print("\n[bold]Signal type?[/bold]")
        for i, t in enumerate(signal_types, 1):
            console.print(f"  {i}. {t}")
        choice = console.input("> ").strip()

        if choice.lower() == "quit":
            break

        try:
            signal_type = signal_types[int(choice) - 1]
        except (ValueError, IndexError):
            signal_type = "general"

        console.print(f"\n[bold]Paste your signal ({signal_type}):[/bold]")
        console.print("[dim]Enter a blank line when done.[/dim]")

        lines = []
        while True:
            line = console.input()
            if line.strip() == "":
                break
            lines.append(line)

        raw_input = "\n".join(lines)
        if not raw_input.strip():
            continue

        with console.status("Assessing signal..."):
            record = submit_signal(raw_input, signal_type)

        assessment = record.get("assessment", {})
        priority = assessment.get("priority", 0)
        colour = {5: "red", 4: "yellow", 3: "cyan", 2: "dim", 1: "dim"}.get(priority, "white")

        console.print(Panel(
            f"[bold]Priority: {priority}/5[/bold] ({assessment.get('urgency', 'standard')})\n\n"
            f"{assessment.get('significance_summary', 'N/A')}\n\n"
            f"[bold]Recommended:[/bold] {assessment.get('recommended_action', 'N/A')}\n"
            f"[bold]Content opportunity:[/bold] {assessment.get('content_opportunity_score', 'N/A')}/10\n"
            f"[bold]Topic:[/bold] {assessment.get('master_asset_topic', 'N/A')}",
            title=f"Signal {record['id']}",
            border_style=colour,
        ))
