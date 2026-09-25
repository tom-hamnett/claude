"""Assemble a new IHG-branded deck by picking slides from the brand template.

Keeps the template's masters, layouts, theme, fonts, logos and footer chrome
intact: the output is the template with only the chosen slides, in the chosen
order. A template slide can be picked more than once (it is duplicated with
full package bookkeeping). Every unused slide and orphaned media is removed.

Usage:
    python assemble.py OUT_DIR 2,5,17,24,24,33,54
    python assemble.py OUT_DIR 2,5,17 --template path/to/template.pptx

OUT_DIR is created as an unpacked deck. Edit ppt/slides/slideN.xml in it; the
script prints which file holds each output position. Then zip from inside:
    (cd OUT_DIR && rm -f ../deck.pptx && zip -Xqr ../deck.pptx .)
"""

import argparse
import re
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
DEFAULT_TEMPLATE = HERE.parent / "assets" / "IHG_Procurement_Lite_Template.pptx"


def find_pptx_skill() -> Path:
    for p in Path("/root/.claude/skills").rglob("pptx/scripts/add_slide.py"):
        return p.parent
    sys.exit("pptx skill scripts (add_slide.py / clean.py) not found")


def slide_order(pres_xml: str, rels_xml: str) -> list[str]:
    rid_to_file = dict(
        (m.group(1), m.group(2).split("/")[-1])
        for m in re.finditer(r'Id="(rId\d+)"[^>]*Target="(slides/slide\d+\.xml)"', rels_xml)
    )
    rid_to_file.update(
        (m.group(2), m.group(1).split("/")[-1])
        for m in re.finditer(r'Target="(slides/slide\d+\.xml)"[^>]*Id="(rId\d+)"', rels_xml)
    )
    return [rid_to_file[r] for r in re.findall(r'<p:sldId [^>]*r:id="(rId\d+)"', pres_xml)]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("out_dir")
    ap.add_argument("slides", help="comma-separated 1-based template slide numbers, repeats allowed")
    ap.add_argument("--template", default=str(DEFAULT_TEMPLATE))
    a = ap.parse_args()

    picks = [int(x) for x in a.slides.split(",") if x.strip()]
    out = Path(a.out_dir)
    if out.exists():
        shutil.rmtree(out)
    with zipfile.ZipFile(a.template) as z:
        z.extractall(out)

    ppt = out / "ppt"
    pres_path, rels_path = ppt / "presentation.xml", ppt / "_rels" / "presentation.xml.rels"
    template_order = slide_order(pres_path.read_text("utf-8"), rels_path.read_text("utf-8"))
    for n in picks:
        if not 1 <= n <= len(template_order):
            sys.exit(f"slide {n} out of range 1..{len(template_order)}")

    tools = find_pptx_skill()
    used: set[str] = set()
    result: list[str] = []
    for n in picks:
        src = template_order[n - 1]
        if src not in used:
            used.add(src)
            result.append(src)
            continue
        r = subprocess.run(
            [sys.executable, str(tools / "add_slide.py"), str(out), src],
            capture_output=True, text=True, cwd=tools,
        )
        m = re.search(r"(slide\d+\.xml)", r.stdout.split("Created", 1)[-1])
        if r.returncode or not m:
            sys.exit(f"duplicate of {src} failed: {r.stdout}{r.stderr}")
        result.append(m.group(1))

    # Rewrite <p:sldIdLst> to exactly the chosen order.
    pres = pres_path.read_text("utf-8")
    rels = rels_path.read_text("utf-8")
    file_to_rid = {}
    for m in re.finditer(r"<Relationship [^>]*/>", rels):
        tag = m.group(0)
        t, i = re.search(r'Target="([^"]+)"', tag), re.search(r'Id="([^"]+)"', tag)
        if t and i and t.group(1).startswith("slides/"):
            file_to_rid[t.group(1).split("/")[-1]] = i.group(1)
    ids = {r: i for i, r in re.findall(r'<p:sldId id="(\d+)" r:id="(rId\d+)"/>', pres)}
    entries = "".join(f'<p:sldId id="{ids[file_to_rid[f]]}" r:id="{file_to_rid[f]}"/>' for f in result)
    pres = re.sub(r"<p:sldIdLst>.*?</p:sldIdLst>", f"<p:sldIdLst>{entries}</p:sldIdLst>", pres, flags=re.S)
    pres_path.write_text(pres, "utf-8")

    subprocess.run([sys.executable, str(tools / "clean.py"), str(out)], check=True,
                   capture_output=True, cwd=tools)

    print(f"Assembled {len(result)} slides into {out}/")
    for pos, (n, f) in enumerate(zip(picks, result), 1):
        print(f"  position {pos:>2}: template slide {n:>2} -> ppt/slides/{f}")


if __name__ == "__main__":
    main()
