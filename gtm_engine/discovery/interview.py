"""Adaptive conversational intake interview powered by Claude.

Asks ONE question at a time, adapts based on answers, makes sharp observations
between questions like a real advisor. Progressively builds a GTM Brief.
"""

import json
import logging
from pathlib import Path

from gtm_engine.config import OUTPUT_DIR
from gtm_engine.discovery.models import GTMBrief
from gtm_engine.utils.ai_client import call_claude
from gtm_engine.utils.file_io import save_json

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an elite GTM strategist conducting a discovery interview.
You are building a structured understanding of a founder's product, market, and constraints.

Rules:
- Ask ONE question at a time
- After each answer, make a sharp 1-2 sentence observation before your next question
- Your observations should show genuine insight — connect dots the founder might not see
- Adapt your questions based on what you've learned so far
- Cover all areas: product, founder background, market, competition, constraints, brand voice, monetisation, channels
- When you have enough information on a topic area, move to the next
- Be conversational but efficient — respect the founder's time

You will receive the current state of the interview as context.
Respond with a JSON object:
{
    "observation": "Your sharp insight based on the latest answer (empty string if first question)",
    "question": "Your next question",
    "topic_area": "product|founder|market|competition|constraints|brand|monetisation|channels",
    "brief_updates": {<partial GTMBrief fields to update based on the latest answer>},
    "interview_complete": false,
    "completion_summary": ""
}

When you believe you have enough information across all areas, set interview_complete to true
and provide a completion_summary with your top 3 strategic observations about this business."""


def run_interview_step(brief: GTMBrief, user_answer: str | None = None) -> dict:
    """Run one step of the adaptive interview.

    Takes the current brief state and the user's latest answer (None for the
    first question), calls Claude to generate the next question and any brief
    updates, and returns the structured response.
    """
    context = {
        "current_brief": brief.model_dump(),
        "latest_answer": user_answer,
        "questions_asked": len(brief.raw_interview_log),
    }

    prompt = f"""Interview context:\n{json.dumps(context, indent=2)}

Based on what you know so far, generate your next interview response.
Return ONLY valid JSON matching the schema described in your system prompt."""

    response_text = call_claude(prompt, system=SYSTEM_PROMPT, max_tokens=2048, temperature=0.7)

    # Parse the response — strip markdown fencing if present
    cleaned = response_text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]

    response = json.loads(cleaned)
    return response


def _deep_merge(base: dict, updates: dict) -> dict:
    """Recursively merge updates into base. Lists are extended, dicts merged."""
    for key, value in updates.items():
        if key in base and isinstance(base[key], dict) and isinstance(value, dict):
            _deep_merge(base[key], value)
        elif key in base and isinstance(base[key], list) and isinstance(value, list):
            existing_set = {json.dumps(item) if isinstance(item, dict) else item for item in base[key]}
            for item in value:
                serialised = json.dumps(item) if isinstance(item, dict) else item
                if serialised not in existing_set:
                    base[key].append(item)
        else:
            base[key] = value
    return base


def apply_brief_updates(brief: GTMBrief, updates: dict) -> GTMBrief:
    """Merge partial updates into the existing brief.

    Deep merge — new values override existing ones, lists are extended
    (not replaced), and fields not mentioned are preserved.
    """
    current = brief.model_dump()
    _deep_merge(current, updates)
    return GTMBrief(**current)


def run_cli_interview() -> GTMBrief:
    """Run the full discovery interview in CLI mode.

    Returns the completed GTM Brief and saves it to disk.
    """
    from rich.console import Console
    from rich.panel import Panel

    console = Console()
    brief = GTMBrief()

    console.print(Panel(
        "[bold]GTM Intelligence Engine — Discovery Interview[/bold]\n\n"
        "I'm going to ask you a series of questions to build your GTM strategy.\n"
        "Answer naturally — I'll adapt based on what you tell me.\n"
        "Type 'quit' at any time to save progress and exit.",
        title="Welcome",
        border_style="blue",
    ))

    user_answer = None  # First call gets no answer

    while True:
        try:
            response = run_interview_step(brief, user_answer)
        except (json.JSONDecodeError, KeyError) as e:
            logger.error("Failed to parse interview response: %s", e)
            console.print("[red]Hit a parsing issue, retrying...[/red]")
            continue

        # Show observation if present
        if response.get("observation"):
            console.print(f"\n[italic cyan]{response['observation']}[/italic cyan]\n")

        # Apply any brief updates from this step
        if response.get("brief_updates"):
            brief = apply_brief_updates(brief, response["brief_updates"])

        # Check if interview is complete
        if response.get("interview_complete"):
            console.print(Panel(
                f"[bold green]Interview Complete[/bold green]\n\n{response.get('completion_summary', '')}",
                border_style="green",
            ))
            break

        # Ask the question
        console.print(f"[bold]{response['question']}[/bold]")
        user_answer = console.input("\n> ").strip()

        if user_answer.lower() == "quit":
            console.print("[yellow]Saving progress...[/yellow]")
            break

        # Log the exchange
        brief.raw_interview_log.append({
            "topic": response.get("topic_area", ""),
            "question": response["question"],
            "answer": user_answer,
        })

    # Save the brief
    output_path = OUTPUT_DIR / "gtm_brief.json"
    save_json(brief.model_dump(), output_path)
    console.print(f"\n[green]GTM Brief saved to {output_path}[/green]")

    return brief


if __name__ == "__main__":
    run_cli_interview()
