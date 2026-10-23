"""Build the three coach apps from coach_app.template.html.

Writes recorder/apps/<lens>/index.html and library.json (the technique library slimmed
for the in-app chat). Publish each folder as its own Artifact with capabilities db, user, sample.

    python3 -I recorder/apps/build.py
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
APPS = ROOT / "recorder" / "apps"

STYLE = {
    "game": {"title": "Game Coach", "accent": "#c4430f", "accent_dark": "#ff7a45",
             "soft": "rgba(196, 67, 15, .14)", "soft_dark": "rgba(255, 122, 69, .18)"},
    "executive_presence": {"title": "Presence Coach", "accent": "#1d56c9", "accent_dark": "#7aa5ff",
                           "soft": "rgba(29, 86, 201, .12)", "soft_dark": "rgba(122, 165, 255, .18)"},
    "leadership": {"title": "Leadership Coach", "accent": "#23704a", "accent_dark": "#5fcf92",
                   "soft": "rgba(35, 112, 74, .13)", "soft_dark": "rgba(95, 207, 146, .17)"},
}

RULES = {
    "game": "You are Tom's Game coach: social and romantic confidence, playfulness, gravitas, storytelling, "
            "engagement and listening, tension and leading. You draw on the indexed library (Deida, Glover, "
            "Strauss, DeAngelo, Manson, Mystery, Corey Wayne, Rollo Tomassi and others, graded against research). "
            "Never recommend manipulative tactics (negging, pressure, deception); name the ethical alternative.",
    "executive_presence": "You are Tom's Executive Presence coach: gravitas and composure, vocal authority, clarity "
                          "and brevity, conviction, charisma and connection, command of the room. You draw on the "
                          "indexed library (Hewlett, Antonakis, Minto, Cabane, Voss, Duarte and others).",
    "leadership": "You are Tom's Leadership coach: direction, decisions, accountability, developing people, "
                  "influence and conflict, meetings and psychological safety. You draw on the indexed library "
                  "(Grove, Scott, Wiseman, Willink, Marquet, Edmondson, Lencioni and others).",
}
COMMON = (" Judge only what can be heard in the recording and transcript. Levels: 0 absent, 2 competent adult "
          "in this context, 4 top decile. Be harsh about behaviour and specific; acknowledge genuine wins briefly.")


def short_sources(md: str) -> dict[str, str]:
    out = {}
    for line in md.splitlines():
        m = re.match(r"\s*(\d+)\.\s+(.*)", line)
        if not m:
            continue
        text = re.sub(r"\*\*|\*", "", m.group(2))
        text = re.split(r"\s+https?://|\s+Used:", text)[0].strip().rstrip(".")
        out[m.group(1)] = text[:160]
    return out


def build(lens_id: str) -> Path:
    lens = json.loads((ROOT / f"recorder/coaches/lenses/{lens_id}.json").read_text())
    style = STYLE[lens_id]
    lib_dir = ROOT / lens["library"]
    techniques = json.loads((lib_dir / "techniques.json").read_text())
    keep = ("id", "name", "capability", "sub_capability", "summary", "how_to_apply", "drill", "evidence", "ethics", "sources")
    library = {"techniques": [{k: t.get(k) for k in keep} for t in techniques],
               "sources": short_sources((lib_dir / "sources.md").read_text())}
    page_lens = {k: lens[k] for k in ("id", "name", "rubric_version", "settings", "capabilities", "derailers")}
    html = (APPS / "coach_app.template.html").read_text()
    for key, val in {"__TITLE__": style["title"], "__NAME__": style["title"], "__ACCENT__": style["accent"],
                     "__ACCENT_DARK__": style["accent_dark"], "__ACCENT_SOFT__": style["soft"],
                     "__ACCENT_SOFT_DARK__": style["soft_dark"], "__LENS_JSON__": json.dumps(page_lens),
                     "__LENS_RULES__": json.dumps(RULES[lens_id] + COMMON)}.items():
        html = html.replace(key, val)
    assert "__" not in re.sub(r"__(proto|dirname)__", "", html.split("<script>")[0]), "unfilled placeholder"
    out = APPS / lens_id
    out.mkdir(exist_ok=True)
    (out / "index.html").write_text(html)
    (out / "library.json").write_text(json.dumps(library, separators=(",", ":")))
    return out


if __name__ == "__main__":
    for lid in STYLE:
        d = build(lid)
        print(d.relative_to(ROOT), (d / "index.html").stat().st_size, (d / "library.json").stat().st_size)
