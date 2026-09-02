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

WHAT THESE IDEAS ARE — DEMOS, NOT PRESENTATIONS:
These ideas become short vertical reels that DEMONSTRATE the capability
and the process — the machine working, the method in motion, the receipts
on screen. They are NOT business presentations, market theses, or
thought-leadership essays. The proof is the product doing the thing, live:
a diagnostic running, a losing week being logged and adversarially reviewed,
the 5-source validation reconciling, an equity curve building trade by trade.
Frame every idea as "watch this work" / "here's exactly how it does it" /
"here's what it just produced" — show, don't argue. A viewer should come away
thinking "I want to see that run on MY thing," not "interesting take."
Every idea MUST have something concrete to SHOW on screen — a real output, a
step of the process, a screen, a number, an artefact. If there is nothing to
demonstrate, it is an essay, not a reel: do not generate it. The uncomfortable
truth and POV still matter — but they are carried BY the demonstration, not
delivered as a lecture over stock footage.

POSITIONING (advance this in every idea):
- Write as "The Rational Strategist" — clear, evidence-first thinking on business,
  strategy and leadership; pragmatic over academic. The enemy is STRATEGY THAT
  NEVER LEAVES THE SLIDE: plans that ignore the real constraints of people, budget
  and politics, and confident advice that never gets delivered. The problem is
  rarely the framework — it's the delivery. NEVER name a firm; punch at the archetype.
- Core thesis: frameworks give structure and can be illuminating; the hard part is
  DELIVERY — making the plan actually happen in a people- and budget-constrained
  environment, where it meets the politics. Think clearly, deliver pragmatically,
  show the working.
- For operators, founders and leaders done paying for confident opinions with no
  evidence behind them.
- Draw from these pillars (vary across them): Clear thinking & better decisions;
  Real economics of growth; Strategy that ships; Leadership & the human side; The
  complexity tax (one angle); Show the working (transparent teardowns, evidence attached).

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
  - hook: exact scroll-stopper line, max 12 words — framed as a demo ("Watch…",
    "Here's exactly how…", "This is what it produced…"), not a thesis statement
  - angle: the specific argument or POV in 1-2 sentences
  - demonstrates: what the viewer LITERALLY watches happen on screen — the
    capability or process step being shown (e.g. "Analyst's Edge producing a
    company diagnostic from just a URL", "ATLAS's adversarial layer vetoing a
    trade", "PRISM reconciling an org chart against 5 sources"). Concrete and
    visual — never an abstraction. This is the spine of the reel.
  - data_requirement: what concrete data/source this needs, or "none"
  - funnel_level: umbrella | product | feature | proof
  - product: "" if umbrella, or PRISM / Analyst's Edge / APEX / ATLAS
  - target_segment: the named segment this serves
  - segment_type: hook | tension | pivot | proof | bookend | standalone
  - strategic_objective: awareness | trust | conversion
  - edginess_score: 1-10 (vary across the batch)
  - estimated_reach: low | medium | high
  - tags: 2-4 short tags (INCLUDE the pillar_id as one of the tags so we can track distribution)
  - pillar_id: REQUIRED if a Content Strategy Framework is provided — must match
    one of the pillar ids in the framework. If no framework is provided, omit.
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

    # Content Strategy Framework (pillars / channels / funnel / sequencing)
    try:
        from gtm_engine.strategy_framework import StrategyStore
        store = StrategyStore()
        strategy_fw = store.load()
        if strategy_fw.setup_complete:
            context["content_strategy"] = strategy_fw
        else:
            context["content_strategy"] = None
    except Exception:
        context["content_strategy"] = None

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

    # --- Content Strategy Framework (pillars, channels, funnel) ---
    content_strategy = context.get("content_strategy")
    if content_strategy:
        parts.append("\n## CONTENT STRATEGY FRAMEWORK\n")
        parts.append(
            "The founder has defined a structured content strategy. EVERY idea "
            "you generate must be tagged with the correct pillar_id from this "
            "list, and should fit one of these themes. If an idea doesn't fit "
            "any pillar, don't generate it.\n"
        )

        parts.append("\n### CONTENT PILLARS (assign idea to ONE of these via pillar_id):\n")
        for p in content_strategy.pillars:
            parts.append(
                f"- **{p.name}** (id: `{p.id}`) — {p.description} "
                f"[target {p.target_percentage}%, archetype: {p.archetype}, "
                f"funnel: {p.funnel_stage}]"
            )
            if p.why_it_matters:
                parts.append(f"  *Why it matters:* {p.why_it_matters}")

        parts.append("\n### CHANNELS IN USE:\n")
        for c in content_strategy.channels:
            if c.enabled:
                parts.append(
                    f"- **{c.channel_id}** at {c.cadence_per_week}/week — "
                    f"pillars: {', '.join(c.primary_pillars)}"
                )

        parts.append(
            f"\n### CURRENT BUSINESS PHASE: {content_strategy.business_phase}\n"
        )
        parts.append(
            "Weight idea generation according to this phase's priorities.\n"
        )

        # Active feedback notes from the user
        try:
            from gtm_engine.strategy_framework import StrategyStore
            store = StrategyStore()
            feedback = store.list_feedback(status="active")
            if feedback:
                parts.append("\n### STRATEGIC FEEDBACK (from the founder — incorporate):\n")
                for fb in feedback[:10]:
                    tag_parts = []
                    if fb.tagged_pillar:
                        tag_parts.append(f"pillar={fb.tagged_pillar}")
                    if fb.tagged_channel:
                        tag_parts.append(f"channel={fb.tagged_channel}")
                    tag_str = f" [{', '.join(tag_parts)}]" if tag_parts else ""
                    parts.append(f"- {fb.text}{tag_str}")
        except Exception:
            pass

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
            f"1. Be a DEMO — name in `demonstrates` what the viewer watches the product/process "
            f"   do on screen (no essays; if there's nothing to show, don't generate it)\n"
            f"2. Name a specific product or worldview angle (no generic advice)\n"
            f"3. Connect to one of the uncomfortable truths or POV statements above\n"
            f"4. Feel like it belongs in the same body of work as MA-001\n"
            f"5. Include the narrative_anchor field explaining which canon thread it extends\n"
            f"6. Vary across the available segment_types (hook / tension / pivot / proof / "
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
                effort="high",
            )
        except Exception as e:
            logger.error("  Claude call failed for %s: %s", funnel_level, e)
            continue

        raw = _parse_json_array(response)

        for item in raw:
            try:
                # Store narrative_anchor + pillar_id in notes/tags for retrieval
                notes = item.get("notes", "")
                anchor = item.get("narrative_anchor", "")
                pillar_id = item.get("pillar_id", "")
                demonstrates = item.get("demonstrates", "")
                if demonstrates:
                    notes = (notes + f"\n[Demonstrates: {demonstrates}]").strip()
                if anchor:
                    notes = (notes + f"\n[Anchor: {anchor}]").strip()
                if pillar_id:
                    notes = (notes + f"\n[Pillar: {pillar_id}]").strip()

                tags = list(item.get("tags", []) or [])
                # Ensure pillar_id is in tags for fast filtering
                if pillar_id and pillar_id not in tags:
                    tags.append(pillar_id)

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
                    tags=tags,
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


def generate_for_pillar(pillar_id: str, n: int = 5) -> list[int]:
    """Generate ideas targeted at a specific pillar to fill a gap.

    Used by the rebalance recommendation system when the user accepts a
    "Generate more X content" suggestion.
    """
    context = _load_full_context()
    content_strategy = context.get("content_strategy")
    if not content_strategy:
        logger.warning("No content strategy — falling back to generic generation")
        return generate_and_save(n=n)

    pillar = next((p for p in content_strategy.pillars if p.id == pillar_id), None)
    if not pillar:
        logger.error("Pillar %s not found", pillar_id)
        return []

    # Build a focused prompt for this pillar
    base_context = _format_context_for_prompt(context, funnel_level="mixed")
    focus_block = (
        f"\n\n## TARGETED GENERATION — FILL THIS PILLAR GAP\n\n"
        f"You are generating ideas SPECIFICALLY for the **{pillar.name}** pillar.\n\n"
        f"**Pillar description:** {pillar.description}\n"
        f"**Archetype:** {pillar.archetype}\n"
        f"**Funnel stage:** {pillar.funnel_stage}\n"
        f"**Why it matters:** {pillar.why_it_matters}\n\n"
        f"Every single idea you generate must have `pillar_id: \"{pillar.id}\"` and "
        f"include the pillar id in its tags.\n\n"
        f"Generate exactly {n} ideas. Return JSON array."
    )

    prompt = base_context + focus_block

    response = call_claude(
        prompt, system=IDEA_GENERATION_SYSTEM, max_tokens=8192, effort="high",
    )
    raw = _parse_json_array(response)

    ideas = []
    for item in raw:
        item["pillar_id"] = pillar.id  # force pillar id
        notes = item.get("notes", "")
        anchor = item.get("narrative_anchor", "")
        demonstrates = item.get("demonstrates", "")
        if demonstrates:
            notes = (notes + f"\n[Demonstrates: {demonstrates}]").strip()
        if anchor:
            notes = (notes + f"\n[Anchor: {anchor}]").strip()
        notes = (notes + f"\n[Pillar: {pillar.id}]").strip()

        tags = list(item.get("tags", []) or [])
        if pillar.id not in tags:
            tags.append(pillar.id)

        try:
            ideas.append(Idea(
                title=item.get("title", ""),
                hook=item.get("hook", ""),
                angle=item.get("angle", ""),
                data_requirement=item.get("data_requirement", ""),
                funnel_level=item.get("funnel_level", "product"),
                product=item.get("product", ""),
                target_segment=item.get("target_segment", ""),
                segment_type=item.get("segment_type", "standalone"),
                strategic_objective=item.get("strategic_objective", "awareness"),
                edginess_score=int(item.get("edginess_score", 7)),
                estimated_reach=item.get("estimated_reach", "medium"),
                tags=tags,
                notes=notes,
            ))
        except Exception as e:
            logger.warning("Failed to parse idea: %s", e)

    bank = IdeaBank()
    ids = bank.create_many(ideas)
    log_decision(
        "pillar_gap_filled",
        f"Generated {len(ideas)} ideas for pillar {pillar_id}",
        f"Pillar: {pillar.name}",
    )
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
