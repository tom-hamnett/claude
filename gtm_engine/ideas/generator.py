"""Idea Generator — Claude-powered, strategy-aware, narrative-anchored.

Every idea generated MUST connect to:
  - A specific Quantum Tools product OR the umbrella brand worldview
  - A named target segment from the GTM strategy
  - An uncomfortable truth from the edginess framework
  - The existing master asset narrative arc (MA-001 is the anchor — the
    Consultancy Death Spiral — and every new idea either extends it or
    builds a parallel thread into one of the four products)

The prompt is deliberately context-heavy. It loads:
  - Full GTM brief (all products, positioning, target users, features)
  - Full GTM strategy (segments, positioning statements, uncomfortable
    truths, category norms to break, point-of-view statements)
  - Existing master assets (as style benchmark and narrative memory)
  - Brand standards (voice, forbidden phrases, edginess principles)
  - Core-Five segment spec (so every idea knows where it fits)
  - Session context if present (founder voice, product history)
"""

import json
import logging
from pathlib import Path

from gtm_engine.config import OUTPUT_DIR, DATA_DIR
from gtm_engine.ideas import Idea, IdeaBank, FUNNEL_LEVELS
from gtm_engine.segments import load_segments
from gtm_engine.utils.ai_client import call_claude
from gtm_engine.utils.file_io import load_json
from gtm_engine.utils.logger import log_decision

logger = logging.getLogger(__name__)


IDEA_GENERATION_SYSTEM = """You are an elite GTM strategist generating content ideas for
Quantum Tools — an AI-powered professional intelligence product studio.

This is NOT a generic content brief. You are extending a LIVING narrative
that already has a canonical master asset (The Consultancy Death Spiral)
establishing the worldview. Every idea you generate must feel like it
belongs to this body of work — same voice, same POV, same standard.

STYLE BENCHMARK: The Consultancy Death Spiral (MA-001) is the quality
bar. Read it carefully — that's the level of specificity, sharpness,
and uncomfortable-truth-telling you must match. Generic GTM advice is
forbidden. Every idea must have a concrete subject, a specific claim,
and an arguable perspective.

VOICE GUARANTEES:
- Sharp, transparent, anti-guru. Quiet authority.
- Edginess 6-9 (vary within the batch).
- Say the uncomfortable thing. Show the methodology. Have a POV.
- Punch at the category (the old way of doing things). Never name
  specific competitor companies.
- Philosophy: teach, demonstrate, make them reach for it. Never sell.

FORBIDDEN LANGUAGE (do not use):
- Hype: game-changer, revolutionary, disruptive, innovative, cutting-edge,
  unlock your potential, synergy, leverage, paradigm shift
- Generic thought-leader: "Here are 5 tips for...", "The secret to...",
  "Unlock the power of..."
- Vague abstractions: "transformation", "excellence", "best-in-class"

NARRATIVE ANCHORS:
Every idea must connect back to at least ONE of:

1. The Consultancy Death Spiral thesis (MA-001):
   - AI has broken the information asymmetry consulting firms billed on
   - Transparency is the product now, not the bug
   - The smart firms are embedding AI infrastructure under their brand
     (white-label)
   - Black-box expertise is dying; auditable methodology is winning

2. A specific Quantum Tools product:
   - PRISM — workforce intelligence from LinkedIn + 5-source validation
   - Analyst's Edge — outside-in company diagnostics in minutes
   - APEX — AI-native programme management with knowledge graph
   - ATLAS — autonomous trading with 3-layer adversarial review

3. A specific segment from the strategy:
   - Independent consultants, PE/VC analysts, PMO directors, quant traders,
     MBA students, enterprise buyers, consulting firms (white-label)

CORE-FIVE SEGMENT FIT:
Every idea has a segment_type — which slot in the 20-second reel it
belongs to (or standalone for non-reel content):

  - hook: pattern interrupt, 0-4s, provocative scroll-stopper
  - tension: uncomfortable truth, 4-8s, data/text-forward
  - pivot: the solution via logic, 8-12s, data viz
  - proof: actual product output, 12-16s, real artefact
  - bookend: return to hook + CTA, 16-20s
  - standalone: works as a single LinkedIn post/article/thread

OUTPUT REQUIREMENTS:

Return a JSON array. Each idea object must have:
  - title: internal label (not the published headline)
  - hook: exact scroll-stopper line, max 12 words
  - angle: the specific argument or POV in 1-2 sentences
  - data_requirement: what concrete data/source this needs, or "none"
  - funnel_level: umbrella | product | feature | proof
  - product: "" if umbrella, or PRISM / Analyst's Edge / APEX / ATLAS
  - target_segment: the named segment this serves
  - segment_type: hook | tension | pivot | proof | bookend | standalone
  - strategic_objective: awareness | trust | conversion
  - edginess_score: 1-10 (vary across the batch)
  - estimated_reach: low | medium | high
  - tags: 2-4 short tags
  - narrative_anchor: which anchor above this connects to (brief explanation)

Return ONLY the JSON array. No preamble."""


def _load_full_context() -> dict:
    """Load every piece of strategic context available on disk.

    Returns a dict with: brief, strategy, master_assets, brand_standards,
    session_context, segments.
    """
    context = {}

    # GTM Brief (the prefilled Quantum Tools brief)
    brief_path = OUTPUT_DIR / "gtm_brief.json"
    context["brief"] = load_json(brief_path) if brief_path.exists() else {}

    # Generated GTM Strategy
    strategy_path = OUTPUT_DIR / "gtm_strategy.json"
    context["strategy"] = load_json(strategy_path) if strategy_path.exists() else {}

    # Brand Standards
    brand_path = DATA_DIR / "brand_standards.json"
    context["brand_standards"] = load_json(brand_path) if brand_path.exists() else {}

    # Core-Five segment spec
    context["segments"] = load_segments()

    # Existing master assets (narrative memory — MA-001 is the anchor)
    master_assets_dir = DATA_DIR / "master_assets"
    master_assets = []
    if master_assets_dir.exists():
        for path in sorted(master_assets_dir.glob("MA-*.json")):
            try:
                ma = load_json(path)
                # Pull just the fields needed for context
                master_assets.append({
                    "id": ma.get("id"),
                    "title": ma.get("title"),
                    "hook": ma.get("hook"),
                    "uncomfortable_truth": ma.get("uncomfortable_truth"),
                    "point_of_view": ma.get("point_of_view"),
                    "body_excerpt": (ma.get("body", "") or "")[:2000],
                })
            except Exception as e:
                logger.warning("Could not load master asset %s: %s", path, e)
    context["master_assets"] = master_assets

    # Session context (founder voice, product history) — from the
    # gtm_engine/data folder if it exists
    session_context_path = Path("gtm_engine/data/session_context.md")
    if session_context_path.exists():
        context["session_context"] = session_context_path.read_text(encoding="utf-8")[:6000]
    else:
        context["session_context"] = ""

    return context


def _format_context_for_prompt(context: dict, funnel_level: str) -> str:
    """Build the heavy context block injected into every Claude call."""
    parts = []

    brief = context.get("brief", {})
    strategy = context.get("strategy", {})

    # --- Business identity ---
    parts.append("## QUANTUM TOOLS — BUSINESS IDENTITY\n")
    parts.append(f"**Umbrella brand:** {brief.get('umbrella_brand', '')[:800]}\n")

    # All products with full detail (not just names)
    products = brief.get("products", [])
    if products:
        parts.append("\n## PRODUCT PORTFOLIO (all four — connect ideas to these)\n")
        for p in products:
            parts.append(f"\n### {p.get('name', 'Unknown')}")
            parts.append(f"- Stage: {p.get('current_stage', 'n/a')}")
            parts.append(f"- Description: {p.get('description', '')[:500]}")
            parts.append(f"- Core value prop: {p.get('core_value_prop', '')[:400]}")
            parts.append(f"- Positioning: {p.get('positioning', '')[:400]}")
            if p.get("key_features"):
                parts.append(f"- Key features: {'; '.join(p['key_features'][:6])}")
            if p.get("target_users"):
                parts.append(f"- Target users: {'; '.join(p['target_users'][:4])}")

    # Founder context
    founder = brief.get("founder", {})
    if founder:
        parts.append(f"\n## FOUNDER CONTEXT\n{founder.get('background', '')[:400]}\n")

    # --- Strategic positioning ---
    parts.append("\n## GTM STRATEGY — SEGMENTS AND POSITIONING\n")

    segments = strategy.get("segments", [])
    if segments:
        parts.append("\n### Target segments (in priority order):")
        for s in segments[:7]:
            parts.append(
                f"- **{s.get('name', '')}**: {s.get('description', '')[:300]}"
            )

    positioning = strategy.get("positioning", [])
    if positioning:
        parts.append("\n### Positioning statements per segment:")
        for p in positioning[:5]:
            parts.append(
                f"- *{p.get('segment_name', '')}*: **{p.get('headline', '')}** "
                f"— {p.get('value_proposition', '')[:200]}"
            )

    # --- Edginess framework (the sharp thinking) ---
    edginess = strategy.get("edginess", {})
    if edginess:
        parts.append("\n## EDGINESS FRAMEWORK — use these uncomfortable truths\n")
        truths = edginess.get("uncomfortable_truths", [])
        if truths:
            parts.append("### Uncomfortable truths:")
            for t in truths[:10]:
                parts.append(f"- {t}")
        pov = edginess.get("point_of_view_statements", [])
        if pov:
            parts.append("\n### Arguable POV statements:")
            for p in pov[:8]:
                parts.append(f"- {p}")
        norms = edginess.get("category_norms_to_break", [])
        if norms:
            parts.append("\n### Category norms to break:")
            for n in norms[:8]:
                parts.append(f"- {n}")

    # --- Existing master asset canon (STYLE ANCHOR) ---
    master_assets = context.get("master_assets", [])
    if master_assets:
        parts.append("\n## EXISTING MASTER ASSET CANON — STYLE ANCHOR\n")
        parts.append(
            "These are the approved pieces already in the library. New ideas "
            "must feel like they could have been written by the same person "
            "for the same audience. Extend the narrative, do not restart it.\n"
        )
        for ma in master_assets:
            parts.append(f"\n### {ma.get('id')}: {ma.get('title')}")
            if ma.get("hook"):
                parts.append(f"Hook: *{ma['hook']}*")
            if ma.get("uncomfortable_truth"):
                parts.append(f"Uncomfortable truth: {ma['uncomfortable_truth']}")
            if ma.get("point_of_view"):
                parts.append(f"POV: {ma['point_of_view']}")
            if ma.get("body_excerpt"):
                parts.append(f"\nExcerpt:\n> {ma['body_excerpt'][:1200]}")

    # --- Session context (founder history if available) ---
    if context.get("session_context"):
        parts.append(f"\n## FOUNDER SESSION CONTEXT\n{context['session_context'][:2500]}\n")

    # --- Funnel-level guidance ---
    parts.append(f"\n## THIS BATCH — FUNNEL LEVEL: {funnel_level.upper()}\n")
    parts.append(_funnel_guidance(funnel_level))

    return "\n".join(parts)


def _funnel_guidance(funnel_level: str) -> str:
    return {
        "umbrella": (
            "UMBRELLA level — ideas about the Quantum Tools worldview, why "
            "the studio exists, what's broken in professional services, the "
            "founder's POV on AI in professional intelligence, and the market "
            "thesis. These ideas extend the Consultancy Death Spiral thesis "
            "WITHOUT naming a specific product as the primary subject. They "
            "establish the intellectual territory."
        ),
        "product": (
            "PRODUCT level — each idea introduces or repositions ONE specific "
            "product (PRISM, Analyst's Edge, APEX, or ATLAS). The angle must "
            "show what the product makes possible that wasn't before. Vary "
            "across all four products. Connect back to the Consultancy Death "
            "Spiral thesis where it makes sense (e.g. 'PRISM is what the "
            "white-label exit actually looks like for workforce intelligence')."
        ),
        "feature": (
            "FEATURE level — specific capabilities within a product. The "
            "5-source validation in PRISM. The entity disambiguation in "
            "Analyst's Edge. The provider-agnostic AI in APEX. The adversarial "
            "review in ATLAS. Show WHY the feature matters — what it makes "
            "possible or prevents going wrong. Feature ideas should feel like "
            "'engineering-led marketing' — the kind of technical detail that "
            "establishes credibility with sophisticated buyers."
        ),
        "proof": (
            "PROOF level — concrete data points, actual outputs, real benchmarks. "
            "Every idea at this level MUST name a specific company, dataset, "
            "or artefact in the data_requirement field. Examples: 'Full F1 grid "
            "workforce benchmark showing revenue-per-employee', 'Atlas live "
            "performance log April 2026', 'Microsoft org tree by function "
            "reconciled against SEC filings'. These are evidence-first ideas."
        ),
    }.get(funnel_level, "")


def generate_idea_batch(
    n: int = 50,
    distribution: dict[str, int] | None = None,
) -> list[Idea]:
    """Generate a batch of N content ideas using Claude with full context.

    Returns:
        List of Idea objects (not yet saved to the database)
    """
    context = _load_full_context()

    if distribution is None:
        distribution = {
            "umbrella": max(5, n // 5),
            "product": max(10, n * 3 // 10),
            "feature": max(10, n * 3 // 10),
            "proof": max(5, n // 5),
        }
        total = sum(distribution.values())
        if total != n:
            distribution["product"] += (n - total)

    logger.info("Generating %d ideas with distribution: %s", n, distribution)
    logger.info(
        "Context loaded: %d master assets, %d segments, %d uncomfortable truths",
        len(context.get("master_assets", [])),
        len(context.get("strategy", {}).get("segments", [])),
        len(context.get("strategy", {}).get("edginess", {}).get("uncomfortable_truths", [])),
    )

    all_ideas: list[Idea] = []

    for funnel_level, count in distribution.items():
        if count <= 0:
            continue

        context_block = _format_context_for_prompt(context, funnel_level)
        prompt = (
            f"{context_block}\n\n"
            f"## TASK\n\n"
            f"Generate exactly {count} content ideas at the {funnel_level} funnel level.\n\n"
            f"Each idea MUST:\n"
            f"1. Name a specific product or worldview angle (no generic advice)\n"
            f"2. Connect to one of the uncomfortable truths or POV statements above\n"
            f"3. Feel like it belongs in the same body of work as MA-001\n"
            f"4. Include the narrative_anchor field explaining which canon thread it extends\n"
            f"5. Vary across the available segment_types (hook / tension / pivot / proof / "
            f"   bookend / standalone) — not all standalone posts\n\n"
            f"Return ONLY a JSON array. No preamble, no explanation."
        )

        logger.info("  Generating %d %s ideas (prompt length: %d chars)...",
                    count, funnel_level, len(prompt))

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
                # Store narrative_anchor in the notes field (keeps schema simple)
                notes = item.get("notes", "")
                anchor = item.get("narrative_anchor", "")
                if anchor:
                    notes = (notes + f"\n[Anchor: {anchor}]").strip()

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
                    tags=item.get("tags", []) or [],
                    notes=notes,
                )
                all_ideas.append(idea)
            except Exception as e:
                logger.warning("  Failed to parse idea: %s", e)
                continue

    log_decision(
        "ideas_generated",
        f"Generated {len(all_ideas)} strategy-anchored ideas",
        f"Distribution: {distribution}; Context: "
        f"{len(context.get('master_assets', []))} master assets, "
        f"{len(context.get('strategy', {}).get('segments', []))} segments",
    )

    return all_ideas


def generate_and_save(n: int = 50) -> list[int]:
    """Generate and persist a batch of ideas. Returns the list of new ids."""
    ideas = generate_idea_batch(n=n)
    bank = IdeaBank()
    ids = bank.create_many(ideas)
    logger.info("Saved %d ideas to database", len(ids))
    return ids


def _parse_json_array(text: str) -> list[dict]:
    """Parse Claude's response, stripping code fences and finding the JSON array."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].rstrip()

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
