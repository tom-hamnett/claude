"""Scoring for the coaching apps: one conversation's overall %, and the running ratings.

A coach assigns each sub-capability a level 0-4 (2 = competent) or None (not observed).
This module turns those levels into numbers deterministically, so scores are comparable
across runs and rubric versions:

- assess(): the conversation's capability %s, overall %, balance penalty, coverage and ± band.
- update_ratings(): per-sub-capability running rating with uncertainty (a Glicko-style
  Bayesian update), capped movement per conversation and a 3-observation gate on the top level.
- standing(): Tom's current overall % from the ratings.

Usage:
    python3 -I recorder/scoring.py --lens recorder/coaches/lenses/game.json \
        --levels levels.json --ratings ratings.json --date 2026-10-23 --out result.json
levels.json: {"<sub_id>": 0-4 | null}. ratings.json may be missing or {} on first use.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

BALANCE_K = 0.15  # overall loses this share of the gap between best and worst capability
MIN_COVERAGE = 0.4  # below this share of sub-capabilities observed, the overall is "insufficient"
OBS_SD = 0.8  # how noisy one conversation's level is, in levels
START_RATING, START_SD, MAX_SD = 2.0, 1.2, 1.5
DRIFT_SD_PER_DAY = 0.02  # uncertainty grows while a skill goes unobserved
MAX_STEP = 0.6  # most a rating can move in one conversation
TOP_LEVEL, TOP_GATE_N = 3.5, 3  # ratings above 3.5 need at least 3 observations


def pct(level: float) -> float:
    return round(100 * level / 4, 1)


def _subs(lens: dict):
    for cap in lens["capabilities"]:
        for sub in cap["subs"]:
            yield cap, sub


def assess(lens: dict, levels: dict) -> dict:
    """Score one conversation from its sub-capability levels (0-4 or None)."""
    caps, weighted, weight_sum = {}, 0.0, 0.0
    observed_total = sum(1 for _, s in _subs(lens) if levels.get(s["id"]) is not None)
    total = sum(1 for _ in _subs(lens))
    for cap in lens["capabilities"]:
        seen = [levels[s["id"]] for s in cap["subs"] if levels.get(s["id"]) is not None]
        if not seen:
            caps[cap["id"]] = {"pct": None, "observed": 0, "of": len(cap["subs"])}
            continue
        level = sum(seen) / len(seen)
        evidence = len(seen) / len(cap["subs"])
        caps[cap["id"]] = {"pct": pct(level), "observed": len(seen), "of": len(cap["subs"])}
        w = cap.get("weight", 1) * evidence
        weighted += w * level
        weight_sum += w
    scored = [c["pct"] for c in caps.values() if c["pct"] is not None]
    coverage = observed_total / total if total else 0.0
    if not scored:
        return {"overall_pct": None, "band": None, "coverage": 0.0, "observed": 0, "of": total,
                "balance_penalty": 0.0, "insufficient": True, "capabilities": caps}
    raw = pct(weighted / weight_sum)
    penalty = round(BALANCE_K * (max(scored) - min(scored)), 1) if len(scored) > 1 else 0.0
    overall = round(max(0.0, raw - penalty), 1)
    band = round(5 + 20 * (1 - coverage), 1)
    return {"overall_pct": overall, "band": band, "coverage": round(coverage, 2),
            "observed": observed_total, "of": total, "balance_penalty": penalty,
            "insufficient": coverage < MIN_COVERAGE, "capabilities": caps}


def _days_between(a: str | None, b: str) -> int:
    if not a:
        return 0
    from datetime import date
    return max(0, (date.fromisoformat(b[:10]) - date.fromisoformat(a[:10])).days)


def update_ratings(lens: dict, ratings: dict, levels: dict, when: str) -> dict:
    """Bayesian update of each sub-capability's rating (0-4) with its uncertainty."""
    out = {}
    for _, sub in _subs(lens):
        r = dict(ratings.get(sub["id"]) or {"rating": START_RATING, "sd": START_SD, "n": 0, "last": None})
        sd = min(MAX_SD, math.sqrt(r["sd"] ** 2 + (DRIFT_SD_PER_DAY ** 2) * _days_between(r.get("last"), when)))
        level = levels.get(sub["id"])
        if level is not None:
            gain = sd ** 2 / (sd ** 2 + OBS_SD ** 2)
            step = max(-MAX_STEP, min(MAX_STEP, gain * (float(level) - r["rating"])))
            rating = r["rating"] + step
            n = r["n"] + 1
            if n < TOP_GATE_N:
                rating = min(rating, TOP_LEVEL)
            r = {"rating": round(rating, 3), "sd": round(math.sqrt((1 - gain) * sd ** 2), 3), "n": n, "last": when[:10]}
        else:
            r["sd"] = round(sd, 3)
        out[sub["id"]] = r
    return out


def standing(lens: dict, ratings: dict) -> dict:
    """Current overall % from ratings, counting only sub-capabilities seen at least once."""
    seen = {k: v for k, v in ratings.items() if v.get("n", 0) > 0}
    levels = {k: v["rating"] for k, v in seen.items()}
    a = assess(lens, levels)
    sds = [v["sd"] for v in seen.values()]
    a["band"] = round(100 * (sum(sds) / len(sds)) / 4 / math.sqrt(max(1, len(sds))) * 2, 1) if sds else None
    return a


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--lens", type=Path, required=True)
    ap.add_argument("--levels", type=Path, required=True)
    ap.add_argument("--ratings", type=Path)
    ap.add_argument("--date", required=True)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()

    lens = json.loads(args.lens.read_text())
    levels = json.loads(args.levels.read_text())
    ratings = json.loads(args.ratings.read_text()) if args.ratings and args.ratings.exists() else {}
    new = update_ratings(lens, ratings, levels, args.date)
    result = {"assessment": assess(lens, levels), "ratings": new, "standing": standing(lens, new)}
    args.out.write_text(json.dumps(result, indent=1))
    a, s = result["assessment"], result["standing"]
    print(f"conversation {a['overall_pct']}% ±{a['band']} ({a['observed']}/{a['of']} observed) · "
          f"standing {s['overall_pct']}%")


if __name__ == "__main__":
    main()
