"""Tests for turning a coach verdict into app database writes."""

import json
from argparse import Namespace

from recorder.coaches import publish

COACH = {"lens": "game", "setting": "date", "relevant": True,
         "sub_levels": {"play.cocky": {"level": 3, "evidence": [{"t": "04:12", "quote": "x", "note": "y"}]},
                        "engage.followups": {"level": 1, "evidence": []}},
         "derailers": [], "verdict": "v", "wins": [],
         "work_ons": [{"title": "Ask follow-ups", "sub_id": "engage.followups", "technique_id": "game-engage-001",
                       "drill": "d", "pass_test": "p", "resource": {"author": "a", "work": "w", "concept": "c"}}],
         "listening": {"summary": "s"},
         "dossier": {"patterns_add": ["Interviews instead of statements"], "patterns_resolved": [], "hypotheses": ["h"]},
         "notes_handled": [{"note_id": "n1", "response": "added", "status": "applied"}],
         "proposals": []}
FEATURES = {"duration_s": 600, "speaker_summary": {"Tom": {"speaking_rate_wpm": 150}},
            "interaction": {"Tom": {"talk_share": 0.6}}, "laughter": [{"after_speaker": "Tom"}, {"after_speaker": "Speaker A"}]}


def run(tmp_path, coach=COACH, versions=None, state=None):
    (tmp_path / "coach.json").write_text(json.dumps(coach))
    (tmp_path / "features.json").write_text(json.dumps(FEATURES))
    st = tmp_path / "state"
    st.mkdir(exist_ok=True)
    for rel, data in (state or {}).items():
        p = st / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(data))
    vfile = None
    if versions:
        vfile = tmp_path / "versions.json"
        vfile.write_text(json.dumps(versions))
    args = Namespace(lens="game", coach=str(tmp_path / "coach.json"), features=str(tmp_path / "features.json"),
                     state=str(st), versions=str(vfile) if vfile else None, base="2026-10-23_2000_test",
                     date="2026-10-23T20:00", setting="date", out=str(tmp_path / "out"))
    return publish.build(args)


def test_writes_cover_all_documents(tmp_path):
    writes = run(tmp_path)
    keys = {(w["collection"], w["doc_id"], w["op"]) for w in writes}
    assert ("assessments", "2026-10-23_2000_test", "set") in keys
    assert ("ratings", "current", "set") in keys
    assert ("workplan", "game-engage-001", "set") in keys
    assert ("dossier", "main", "set") in keys
    assert ("notes", "n1", "update") in keys
    a = json.loads(open(next(w["file_path"] for w in writes if w["collection"] == "assessments")).read())
    assert a["metrics"]["laughs_after_tom"] == 1
    assert a["assessment"]["capabilities"]["play"]["pct"] == 75.0


def test_versions_are_pinned_and_workplan_counts(tmp_path):
    writes = run(tmp_path, versions={"ratings/current": 4, "workplan/game-engage-001": 2},
                 state={"workplan/game-engage-001.json": {"since": "2026-10-01", "times_assigned": 2}})
    r = next(w for w in writes if w["collection"] == "ratings")
    assert r["if_version"] == 4
    wp = next(w for w in writes if w["collection"] == "workplan")
    item = json.loads(open(wp["file_path"]).read())
    assert item["times_assigned"] == 3 and item["since"] == "2026-10-01"
    assert "if_version" not in next(w for w in writes if w["collection"] == "assessments")


def test_irrelevant_lens_writes_nothing(tmp_path):
    assert run(tmp_path, coach={"relevant": False}) == []


def test_dossier_counts_repeats():
    d = publish.merge_dossier({"patterns": [{"text": "Interviews", "count": 2, "first": "2026-10-01", "status": "open"}]},
                              {"patterns_add": ["interviews"]}, "2026-10-23")
    assert d["patterns"][0]["count"] == 3
