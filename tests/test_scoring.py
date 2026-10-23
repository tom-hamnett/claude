"""Tests for the coaching apps' scoring maths."""

import json
from pathlib import Path

from recorder import scoring

LENS = json.loads(Path("recorder/coaches/lenses/game.json").read_text())
SUBS = [s["id"] for c in LENS["capabilities"] for s in c["subs"]]


def test_competent_everywhere_is_50_percent():
    a = scoring.assess(LENS, {s: 2 for s in SUBS})
    assert a["overall_pct"] == 50.0
    assert a["balance_penalty"] == 0.0
    assert a["coverage"] == 1.0 and not a["insufficient"]


def test_unobserved_is_not_zero():
    levels = {s: None for s in SUBS}
    levels["play.cocky"] = 3
    a = scoring.assess(LENS, levels)
    assert a["capabilities"]["play"]["pct"] == 75.0
    assert a["capabilities"]["inner"]["pct"] is None
    assert a["insufficient"]


def test_balance_penalty_drags_lopsided_profile():
    even = {s: 2 for s in SUBS}
    lopsided = {s: (4 if s.startswith("play.") else 2) for s in SUBS}
    lopsided.update({s: 0 for s in SUBS if s.startswith("engage.")})
    a = scoring.assess(LENS, lopsided)
    assert a["balance_penalty"] == 15.0  # 0.15 * (100 - 0)
    assert a["overall_pct"] < scoring.assess(LENS, even)["overall_pct"]


def test_band_widens_with_less_coverage():
    full = scoring.assess(LENS, {s: 2 for s in SUBS})
    half = scoring.assess(LENS, {s: (2 if i % 2 else None) for i, s in enumerate(SUBS)})
    assert half["band"] > full["band"]


def test_rating_moves_toward_evidence_but_capped():
    r = scoring.update_ratings(LENS, {}, {"play.cocky": 4}, "2026-10-23")
    assert 2.0 < r["play.cocky"]["rating"] <= 2.0 + scoring.MAX_STEP
    assert r["play.cocky"]["sd"] < scoring.START_SD
    assert r["inner.frame"]["n"] == 0


def test_top_level_needs_three_observations():
    r = {}
    for i, day in enumerate(["2026-10-01", "2026-10-02"]):
        r = scoring.update_ratings(LENS, r, {"play.cocky": 4}, day)
    assert r["play.cocky"]["rating"] <= scoring.TOP_LEVEL
    for day in ["2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07"]:
        r = scoring.update_ratings(LENS, r, {"play.cocky": 4}, day)
    assert r["play.cocky"]["rating"] > scoring.TOP_LEVEL


def test_uncertainty_grows_when_unobserved():
    r = scoring.update_ratings(LENS, {}, {"play.cocky": 2}, "2026-10-01")
    sd0 = r["play.cocky"]["sd"]
    r = scoring.update_ratings(LENS, r, {}, "2026-12-30")
    assert r["play.cocky"]["sd"] > sd0


def test_standing_ignores_never_seen():
    r = scoring.update_ratings(LENS, {}, {"play.cocky": 3}, "2026-10-01")
    s = scoring.standing(LENS, r)
    assert s["observed"] == 1
    assert s["capabilities"]["inner"]["pct"] is None
