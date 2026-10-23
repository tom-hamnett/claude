"""Turn one coach's verdict into writes for that coach's app database.

Inputs: the lens, the coach's JSON output (see brief.md), the recording's features.json,
and the app's current state as saved by ArtifactData reads (ratings/current, dossier/main,
workplan/*) plus their versions. Output: one JSON file per document and writes.json, a
ready-made `writes` list for a single ArtifactData `batch` call.

    python3 -I recorder/coaches/publish.py --lens game --coach coach.json --features features.json \
        --state state_dir --versions versions.json --base 2026-10-23_1236_slug --date 2026-10-23T12:36 \
        --setting date --out out_dir

versions.json maps "collection/doc_id" to the version each read reported, e.g.
{"ratings/current": 3, "dossier/main": 5, "workplan/game-play-004": 1}. Missing = new document.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from recorder import scoring  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]


def _load(p: Path, default):
    return json.loads(p.read_text()) if p.exists() else default


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:60] or "item"


def tom_metrics(features: dict) -> dict:
    voice = (features.get("speaker_summary") or {}).get("Tom", {})
    inter = (features.get("interaction") or {}).get("Tom", {})
    keys_v = ["speaking_rate_wpm", "pitch_range_st", "pitch_drift_st", "fillers_per_100w", "hedges_per_100w",
              "certainty_per_100w", "uptalk_share", "pauses_per_min", "long_pauses"]
    keys_i = ["talk_share", "median_response_gap_s", "interruptions", "backchannels", "questions", "longest_turn_s", "mean_turn_s"]
    out = {k: voice.get(k) for k in keys_v} | {k: inter.get(k) for k in keys_i}
    out["laughs_after_tom"] = sum(1 for e in features.get("laughter", []) if e.get("after_speaker") == "Tom")
    out["duration_s"] = features.get("duration_s")
    return {k: v for k, v in out.items() if v is not None}


def merge_dossier(dossier: dict, update: dict, when: str) -> dict:
    patterns = {p["text"].strip().lower(): dict(p) for p in dossier.get("patterns", [])}
    for text in update.get("patterns_add", []):
        key = text.strip().lower()
        p = patterns.get(key) or {"text": text.strip(), "count": 0, "first": when[:10], "status": "open"}
        p["count"] += 1
        p["last"] = when[:10]
        p["status"] = "open"
        patterns[key] = p
    for text in update.get("patterns_resolved", []):
        p = patterns.get(text.strip().lower())
        if p:
            p["status"] = "resolved"
            p["last"] = when[:10]
    hyps = list(dict.fromkeys(dossier.get("hypotheses", []) + update.get("hypotheses", [])))[-20:]
    ordered = sorted(patterns.values(), key=lambda p: (p["status"] != "open", -p["count"]))
    return {"patterns": ordered[:40], "hypotheses": hyps, "updated": when[:10]}


def build(args) -> list[dict]:
    lens = json.loads((ROOT / f"recorder/coaches/lenses/{args.lens}.json").read_text())
    coach = json.loads(Path(args.coach).read_text())
    features = json.loads(Path(args.features).read_text())
    state = Path(args.state)
    versions = _load(Path(args.versions), {}) if args.versions else {}
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    writes: list[dict] = []

    def put(collection: str, doc_id: str, data: dict, op: str = "set"):
        f = out / f"{collection}__{doc_id}.json"
        f.write_text(json.dumps(data, ensure_ascii=False))
        w = {"op": op, "collection": collection, "doc_id": doc_id, "file_path": str(f)}
        v = versions.get(f"{collection}/{doc_id}")
        if v is not None:
            w["if_version"] = v
        writes.append(w)

    if not coach.get("relevant", True):
        return writes

    levels = {s["id"]: (coach.get("sub_levels", {}).get(s["id"]) or {}).get("level")
              for c in lens["capabilities"] for s in c["subs"]}
    ratings_doc = _load(state / "ratings" / "current.json", {})
    new_ratings = scoring.update_ratings(lens, ratings_doc.get("subs", {}), levels, args.date)
    standing = scoring.standing(lens, new_ratings)
    assessment = scoring.assess(lens, levels)

    put("assessments", args.base, {
        "date": args.date, "setting": args.setting, "rubric_version": lens["rubric_version"],
        "assessment": assessment, "standing": {"overall_pct": standing["overall_pct"], "band": standing["band"]},
        "sub_levels": coach.get("sub_levels", {}), "derailers": coach.get("derailers", []),
        "verdict": coach.get("verdict", ""), "wins": coach.get("wins", []), "work_ons": coach.get("work_ons", []),
        "listening": coach.get("listening"), "metrics": tom_metrics(features),
    })
    put("ratings", "current", {"subs": new_ratings, "standing": standing, "updated": args.date})

    for w in coach.get("work_ons", []):
        wid = slug(w.get("technique_id") or w.get("title", ""))
        prev = _load(state / "workplan" / f"{wid}.json", None)
        item = {"title": w.get("title"), "sub_id": w.get("sub_id"), "technique_id": w.get("technique_id"),
                "drill": w.get("drill"), "pass_test": w.get("pass_test"), "resource": w.get("resource"),
                "status": "active", "since": (prev or {}).get("since", args.date),
                "last_assigned": args.date, "times_assigned": (prev or {}).get("times_assigned", 0) + 1}
        put("workplan", wid, item)

    put("dossier", "main", merge_dossier(_load(state / "dossier" / "main.json", {}), coach.get("dossier", {}), args.date))

    for n in coach.get("notes_handled", []):
        if n.get("note_id"):
            put("notes", str(n["note_id"]), {"status": n.get("status", "considered"), "response": n.get("response", "")}, op="update")
    for i, p in enumerate(coach.get("proposals", [])):
        put("proposals", f"{args.base}-{i + 1}", {**p, "status": "pending", "source": "coach", "createdAt": args.date})
    return writes


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    for a in ("--lens", "--coach", "--features", "--state", "--base", "--date", "--out"):
        ap.add_argument(a, required=True)
    ap.add_argument("--versions")
    ap.add_argument("--setting", default="")
    args = ap.parse_args()
    writes = build(args)
    Path(args.out, "writes.json").write_text(json.dumps(writes, indent=1))
    print(f"{len(writes)} writes -> {Path(args.out, 'writes.json')}")


if __name__ == "__main__":
    main()
