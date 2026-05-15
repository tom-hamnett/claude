"""Strategy Analyzer — gap detection and rebalance recommendations.

Reads the current ContentStrategy + IdeaBank state and produces:
- Pillar distribution (target vs actual)
- Channel × Pillar coverage matrix
- Funnel stage distribution (target vs actual)
- Gap analysis with severity-ranked recommendations
"""

import logging
from collections import Counter

from gtm_engine.ideas import IdeaBank
from gtm_engine.strategy_framework import (
    ContentStrategy, StrategyStore,
    RebalanceRecommendation,
)

logger = logging.getLogger(__name__)


def compute_pillar_distribution(strategy: ContentStrategy) -> list[dict]:
    """For each pillar, compute target % vs actual % based on ideas in pipeline.

    Returns a list of {pillar_id, name, target_pct, actual_pct, idea_count, gap_pct, status}.
    """
    bank = IdeaBank()
    # Get active ideas (not archived, not rejected) — these count toward distribution
    active = [
        i for i in bank.list_all(limit=2000)
        if i.status not in ("idea_rejected", "archived")
    ]

    # Count ideas per pillar (ideas are tagged with pillar via tags or notes)
    pillar_counts: Counter[str] = Counter()
    for idea in active:
        # Pillar id can be in tags or in notes; check both
        pillar_id = _extract_pillar_id(idea, strategy)
        if pillar_id:
            pillar_counts[pillar_id] += 1

    total = sum(pillar_counts.values()) or 1
    results = []

    for p in strategy.pillars:
        actual = pillar_counts.get(p.id, 0)
        actual_pct = round(100 * actual / total, 1)
        gap = round(p.target_percentage - actual_pct, 1)

        if gap > 8:
            status = "gap"
        elif gap > 3:
            status = "thin"
        else:
            status = "ok"

        results.append({
            "pillar_id": p.id,
            "name": p.name,
            "target_pct": p.target_percentage,
            "actual_pct": actual_pct,
            "idea_count": actual,
            "gap_pct": gap,
            "status": status,
        })

    return results


def compute_funnel_distribution(strategy: ContentStrategy) -> list[dict]:
    """For each funnel stage, compute target vs actual based on tagged ideas."""
    bank = IdeaBank()
    active = [
        i for i in bank.list_all(limit=2000)
        if i.status not in ("idea_rejected", "archived")
    ]

    # Map pillar -> funnel stage
    pillar_to_stage: dict[str, str] = {p.id: p.funnel_stage for p in strategy.pillars}

    stage_counts: Counter[str] = Counter()
    for idea in active:
        pid = _extract_pillar_id(idea, strategy)
        stage = pillar_to_stage.get(pid, "") if pid else ""
        if stage:
            stage_counts[stage] += 1

    total = sum(stage_counts.values()) or 1
    results = []

    for stage in strategy.funnel_stages:
        actual = stage_counts.get(stage.id, 0)
        actual_pct = round(100 * actual / total, 1)
        gap = round(stage.target_percentage - actual_pct, 1)
        results.append({
            "stage_id": stage.id,
            "name": stage.name,
            "target_pct": stage.target_percentage,
            "actual_pct": actual_pct,
            "idea_count": actual,
            "gap_pct": gap,
        })
    return results


def compute_channel_coverage(strategy: ContentStrategy) -> list[dict]:
    """Build a Channel × Pillar coverage matrix.

    Each row: channel_id, channel_name, cells: dict[pillar_id, idea_count]
    """
    bank = IdeaBank()
    active = [
        i for i in bank.list_all(limit=2000)
        if i.status not in ("idea_rejected", "archived")
    ]

    results = []
    for ch in strategy.channels:
        if not ch.enabled:
            continue
        cells: dict[str, int] = {p.id: 0 for p in strategy.pillars}
        for idea in active:
            pid = _extract_pillar_id(idea, strategy)
            if not pid:
                continue
            # Match channel via idea.target_segment-channel mapping is too loose;
            # for now we approximate by checking if the pillar is in this channel's
            # primary_pillars list — content tagged with that pillar effectively
            # has potential to flow through this channel.
            if pid in ch.primary_pillars:
                cells[pid] = cells.get(pid, 0) + 1
        results.append({
            "channel_id": ch.channel_id,
            "channel_name": ch.channel_id.replace("_", " ").title(),
            "cadence_per_week": ch.cadence_per_week,
            "cells": cells,
        })
    return results


def detect_gaps_and_recommend(strategy: ContentStrategy) -> list[RebalanceRecommendation]:
    """Build a list of fresh rebalance recommendations.

    Persists each recommendation to the store. Returns the new ones.
    """
    store = StrategyStore()
    new_recs: list[RebalanceRecommendation] = []

    # Pillar gaps
    pillar_dist = compute_pillar_distribution(strategy)
    for row in pillar_dist:
        if row["status"] == "gap":
            rec = RebalanceRecommendation(
                recommendation=(
                    f"Generate more {row['name']} content. "
                    f"You're at {row['actual_pct']}% vs target {row['target_pct']}% "
                    f"(gap: {row['gap_pct']}%)."
                ),
                rationale=(
                    f"This pillar serves a specific funnel role and is under-represented. "
                    f"Audiences need to see consistent themes; without {row['name']} content "
                    f"the pillar's strategic role is unmet."
                ),
                severity="high",
                action_type="generate",
                target_pillar=row["pillar_id"],
            )
            new_recs.append(rec)
        elif row["status"] == "thin":
            rec = RebalanceRecommendation(
                recommendation=f"Top up {row['name']} content (currently {row['actual_pct']}%, target {row['target_pct']}%).",
                rationale=f"Pillar is close to target but slightly thin.",
                severity="medium",
                action_type="generate",
                target_pillar=row["pillar_id"],
            )
            new_recs.append(rec)

    # Funnel stage gaps
    funnel_dist = compute_funnel_distribution(strategy)
    for row in funnel_dist:
        if row["gap_pct"] > 10:
            rec = RebalanceRecommendation(
                recommendation=(
                    f"You have a hole at the **{row['name']}** funnel stage "
                    f"({row['actual_pct']}% vs target {row['target_pct']}%)."
                ),
                rationale=(
                    f"Without enough content at this stage, audience members get stuck "
                    f"and don't progress toward conversion."
                ),
                severity="high",
                action_type="flag_gap",
                target_funnel_stage=row["stage_id"],
            )
            new_recs.append(rec)

    # Channel × Pillar zeros
    coverage = compute_channel_coverage(strategy)
    for ch_row in coverage:
        zero_pillars = [pid for pid, count in ch_row["cells"].items() if count == 0]
        # Only flag if this channel was expected to carry those pillars
        ch_config = next((c for c in strategy.channels if c.channel_id == ch_row["channel_id"]), None)
        if ch_config and zero_pillars:
            relevant = [p for p in ch_config.primary_pillars if p in zero_pillars]
            if relevant:
                pillar_names = []
                for pid in relevant[:3]:
                    pillar = next((p for p in strategy.pillars if p.id == pid), None)
                    if pillar:
                        pillar_names.append(pillar.name)
                if pillar_names:
                    rec = RebalanceRecommendation(
                        recommendation=(
                            f"{ch_row['channel_name']} has zero content for: "
                            f"{', '.join(pillar_names)}."
                        ),
                        rationale=(
                            f"You designated these pillars as primary for "
                            f"{ch_row['channel_name']} but no ideas yet match."
                        ),
                        severity="medium",
                        action_type="generate",
                        target_channel=ch_row["channel_id"],
                    )
                    new_recs.append(rec)

    # Persist
    saved_recs = []
    for rec in new_recs:
        rec.id = store.add_recommendation(rec)
        saved_recs.append(rec)

    return saved_recs


def _extract_pillar_id(idea, strategy: ContentStrategy) -> str:
    """Pull the pillar id from an idea's tags or notes.

    Ideas are tagged at generation time with the pillar id in their tags list
    (preferred) or in their notes ([Pillar: <id>]).
    """
    # Check tags first
    for tag in idea.tags or []:
        for p in strategy.pillars:
            if tag == p.id or tag.lower() == p.id.lower():
                return p.id

    # Check notes
    notes = idea.notes or ""
    if "[Pillar:" in notes:
        try:
            start = notes.index("[Pillar:") + len("[Pillar:")
            end = notes.index("]", start)
            pid = notes[start:end].strip()
            for p in strategy.pillars:
                if pid == p.id:
                    return p.id
        except ValueError:
            pass

    # Fall back to archetype hint
    if idea.funnel_level:
        archetype_hint = {
            "umbrella": "problem",
            "product": "solution",
            "feature": "evidence",
            "proof": "evidence",
        }.get(idea.funnel_level, "")
        if archetype_hint:
            for p in strategy.pillars:
                if p.archetype == archetype_hint:
                    return p.id

    return ""
