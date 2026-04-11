"""Idea Generator — Claude-powered batch content concept generator.

Produces N structured content ideas spanning the funnel hierarchy:
    umbrella → product → feature → proof

Each idea is tagged with: hook, angle, data requirement, target segment,
Core-Five segment type, strategic objective, and edginess score.

The generator is deliberately heavy on context — it loads the GTM strategy,
brand standards, and Core-Five segment definitions so every idea fits the
Quantum Tools voice and architecture.
"""

import json
import logging
from pathlib import Path

from gtm_engine.config import OUTPUT_DIR
from gtm_engine.ideas import Idea, IdeaBank, FUNNEL_LEVELS
from gtm_engine.segments import load_segments
from gtm_engine.utils.ai_client import call_claude
from gtm_engine.utils.file_io import load_json
from gtm_engine.utils.logger import log_decision

logger = logging.getLogger(__name__)

IDEA_GENERATION_SYSTEM = """You are an elite GTM strategist generating content ideas for Quantum Tools,
an AI-powered professional intelligence product studio. The founder has four products:
PRISM (workforce intelligence), Analyst's Edge (outside-in company diagnostics),
APEX (AI-native programme management), and ATLAS (autonomous trading research).

BRAND VOICE:
- Sharp, transparent, anti-guru. Quiet authority.
- Edginess 8/10. Say the uncomfortable thing. Show your work.
- Never corporate, never salesy, never condescending.
- Writes UP — assumes sophisticated reader.
- Philosophy: Teach, demonstrate, make them reach for it.

FORBIDDEN:
- Naming competitors
- Hype language (game-changer, revolutionary, disruptive, innovative, cutting-edge)
- Generic advice
- Pandering

CONTENT STRUCTURE (Core-Five framework, 20-second reels):
Every idea must fit ONE of these segment types:

1. HOOK (0-4s) — Pattern interrupt, provocative question or uncomfortable truth.
   Works as a standalone post or the opening of a reel.

2. TENSION (4-8s) — Name the pain, name the cost, name the hidden trade-off.
   Data-led or text-led. Shows what's wrong with the current way.

3. PIVOT (8-12s) — The solution via unarguable logic. The new way.
   Works best with specific data points or frameworks.

4. PROOF (12-16s) — Actual product output, real data, concrete artefact.
   Shows — never claims. Requires specific data or screen recording reference.

5. BOOKEND (16-20s) — Return, close the loop, land the CTA.
   Typically not a standalone — it pairs with a Hook.

6. STANDALONE — For ideas that work as single LinkedIn posts, articles, or threads
   without being part of a reel.

FUNNEL LEVELS (wide to narrow):

1. UMBRELLA — Quantum Tools identity, founder worldview, market thesis, brand story.
   "Why this studio exists. Why now. What we believe."

2. PRODUCT — One of the four products positioned against the category.
   "What PRISM does. Why Analyst's Edge replaces a consultant. What APEX sees."

3. FEATURE — A specific capability or architectural decision within a product.
   "Why PRISM uses 5 sources for validation. How Atlas argues with itself."

4. PROOF — Concrete data points, benchmarks, real case examples, audit trails.
   "Here is the actual workforce tree for Microsoft. Here is a real trade log."

OUTPUT REQUIREMENTS:

Every idea must have:
- title: Short internal label (not the published headline)
- hook: The exact scroll-stopper line (max 12 words)
- angle: The specific argument or perspective (1-2 sentences)
- data_requirement: What concrete data/source this needs, or "none"
- funnel_level: umbrella | product | feature | proof
- product: "" if umbrella, or PRISM | Analyst's Edge | APEX | ATLAS
- target_segment: Which customer segment (consultants, PE analysts, PMO directors, traders, MBA students, enterprise buyers)
- segment_type: hook | tension | pivot | proof | bookend | standalone
- strategic_objective: awareness | trust | conversion
- edginess_score: 1-10 (aim for 6-9 across the batch — some safer, some sharper)
- estimated_reach: low | medium | high
- tags: 2-4 short tags

Return ONLY a JSON array of idea objects. No preamble. No explanation."""


def generate_idea_batch(
    n: int = 50,
    brief_path: Path | None = None,
    strategy_path: Path | None = None,
    distribution: dict[str, int] | None = None,
) -> list[Idea]:
    """Generate a batch of N content ideas using Claude.

    Args:
        n: Number of ideas to generate (default 50)
        brief_path: Path to gtm_brief.json (defaults to OUTPUT_DIR/gtm_brief.json)
        strategy_path: Path to gtm_strategy.json
        distribution: Optional override, e.g. {"umbrella": 10, "product": 15, "feature": 15, "proof": 10}

    Returns:
        List of Idea objects (NOT yet saved to the database)
    """
    brief_path = brief_path or (OUTPUT_DIR / "gtm_brief.json")
    strategy_path = strategy_path or (OUTPUT_DIR / "gtm_strategy.json")

    brief = load_json(brief_path) if brief_path.exists() else {}
    strategy = load_json(strategy_path) if strategy_path.exists() else {}

    # Default distribution across funnel levels
    if distribution is None:
        distribution = {
            "umbrella": max(5, n // 5),      # 20% umbrella
            "product": max(10, n * 3 // 10), # 30% product
            "feature": max(10, n * 3 // 10), # 30% feature
            "proof": max(5, n // 5),         # 20% proof
        }
        # Normalise to exactly n
        total = sum(distribution.values())
        if total != n:
            diff = n - total
            distribution["product"] += diff

    logger.info("Generating %d ideas with distribution: %s", n, distribution)

    segments = load_segments()
    segment_ids = [s["id"] for s in segments["segments"]] + ["standalone"]

    all_ideas: list[Idea] = []

    for funnel_level, count in distribution.items():
        if count <= 0:
            continue

        prompt = _build_prompt(
            funnel_level=funnel_level,
            count=count,
            brief=brief,
            strategy=strategy,
            segment_ids=segment_ids,
        )

        logger.info("  Generating %d %s ideas...", count, funnel_level)

        try:
            response = call_claude(
                prompt,
                system=IDEA_GENERATION_SYSTEM,
                max_tokens=8192,
                temperature=0.85,
            )
        except Exception as e:
            logger.error("  Claude call failed for %s: %s", funnel_level, e)
            continue

        raw = _parse_json_array(response)

        for item in raw:
            try:
                idea = Idea(
                    title=item.get("title", ""),
                    hook=item.get("hook", ""),
                    angle=item.get("angle", ""),
                    data_requirement=item.get("data_requirement", ""),
                    funnel_level=item.get("funnel_level", funnel_level),
                    product=item.get("product", ""),
                    target_segment=item.get("target_segment", ""),
                    segment_type=item.get("segment_type", "standalone"),
                    strategic_objective=item.get("strategic_objective", "awareness"),
                    edginess_score=int(item.get("edginess_score", 7)),
                    estimated_reach=item.get("estimated_reach", "medium"),
                    tags=item.get("tags", []),
                    notes=item.get("notes", ""),
                )
                all_ideas.append(idea)
            except Exception as e:
                logger.warning("  Failed to parse idea: %s", e)
                continue

    log_decision(
        "ideas_generated",
        f"Generated {len(all_ideas)} ideas across {len(distribution)} funnel levels",
        f"Distribution: {distribution}",
    )

    return all_ideas


def generate_and_save(n: int = 50) -> list[int]:
    """Generate and persist a batch of ideas. Returns the list of new ids."""
    ideas = generate_idea_batch(n=n)
    bank = IdeaBank()
    ids = bank.create_many(ideas)
    logger.info("Saved %d ideas to database", len(ids))
    return ids


def _build_prompt(
    funnel_level: str,
    count: int,
    brief: dict,
    strategy: dict,
    segment_ids: list[str],
) -> str:
    """Build the user prompt for idea generation at a specific funnel level."""
    brief_context = ""
    if brief:
        brief_context = (
            f"PRODUCTS:\n{json.dumps([p.get('name') for p in brief.get('products', [])], indent=2)}\n\n"
            f"UMBRELLA: {brief.get('umbrella_brand', '')[:500]}\n\n"
            f"BRAND TONE: {brief.get('brand', {}).get('tone', '')[:300]}\n"
        )

    strategy_context = ""
    if strategy:
        segments_list = strategy.get("segments", [])[:5]
        strategy_context = (
            f"TOP SEGMENTS:\n"
            + "\n".join(
                f"- {s.get('name')}: {s.get('description', '')[:150]}"
                for s in segments_list
            )
            + "\n\n"
            f"UNCOMFORTABLE TRUTHS TO DRAW FROM:\n"
            + "\n".join(
                f"- {t}" for t in strategy.get("edginess", {}).get("uncomfortable_truths", [])[:8]
            )
        )

    funnel_guidance = {
        "umbrella": (
            "UMBRELLA level — the brand thesis. Ideas about why Quantum Tools exists, "
            "the market worldview, what's broken in professional services, the founder's "
            "POV on AI in professional intelligence. No product names as the primary subject — "
            "these are about the category and the worldview."
        ),
        "product": (
            "PRODUCT level — each idea introduces or repositions one of the four products. "
            "The angle must show what the product makes possible that wasn't before. "
            "Vary across all four products (PRISM, Analyst's Edge, APEX, ATLAS)."
        ),
        "feature": (
            "FEATURE level — specific capabilities. The 5-source validation in PRISM. "
            "The entity disambiguation in Analyst's Edge. The provider-agnostic AI in APEX. "
            "The adversarial review in ATLAS. Show WHY the feature matters, not just WHAT it does."
        ),
        "proof": (
            "PROOF level — concrete data points, actual outputs, real benchmarks. "
            "These ideas REQUIRE specific data in the data_requirement field. "
            "Examples: 'Microsoft workforce tree by function and geography', "
            "'F1 grid benchmark revenue per employee comparison', 'Atlas live performance log'. "
            "Every idea at this level should name a specific company, dataset, or artefact."
        ),
    }

    return (
        f"{brief_context}\n"
        f"{strategy_context}\n\n"
        f"FUNNEL LEVEL: {funnel_level}\n"
        f"GUIDANCE: {funnel_guidance.get(funnel_level, '')}\n\n"
        f"Segment types available: {', '.join(segment_ids)}\n\n"
        f"Generate exactly {count} content ideas at the {funnel_level} funnel level.\n"
        f"Vary the hooks, vary the angles, vary the edginess within 6-9 range.\n"
        f"Distribute across segment types — mix standalone posts with hooks, tensions, pivots, proofs.\n\n"
        f"Return ONLY a JSON array. No preamble, no explanation."
    )


def _parse_json_array(text: str) -> list[dict]:
    """Parse Claude's response, stripping code fences and finding the JSON array."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].rstrip()

    # Find the JSON array within the text
    start = cleaned.find("[")
    end = cleaned.rfind("]")
    if start == -1 or end == -1:
        logger.error("No JSON array found in response")
        return []

    try:
        return json.loads(cleaned[start : end + 1])
    except json.JSONDecodeError as e:
        logger.error("JSON parse failed: %s", e)
        return []
