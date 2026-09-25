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
import random
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


# Parts a duplicated slide must own outright. PowerPoint rejects (or "repairs") decks where two slides
# point at the same embedded OLE object, tag list or chart; LibreOffice does not, so this is invisible
# in rendered previews. Media (images) may be shared safely.
OWNED_DIRS = ("tags", "embeddings", "charts")


def _content_type(root: Path, part: str) -> str | None:
    """The part's Override content type, or None when an extension Default already covers it."""
    ct = (root / "[Content_Types].xml").read_text("utf-8")
    m = re.search(rf'PartName="{re.escape(part)}" ContentType="([^"]+)"', ct)
    return m.group(1) if m else None


def _add_override(root: Path, part: str, ctype: str) -> None:
    ctp = root / "[Content_Types].xml"
    ct = ctp.read_text("utf-8")
    if f'PartName="{part}"' not in ct:
        ctp.write_text(ct.replace("</Types>", f'<Override PartName="{part}" ContentType="{ctype}"/></Types>'), "utf-8")


def _fresh(path: Path) -> Path:
    stem = re.sub(r"\d+$", "", path.stem)
    n = 1
    while (path.parent / f"{stem}{n}{path.suffix}").exists():
        n += 1
    return path.parent / f"{stem}{n}{path.suffix}"


def _clone_part(root: Path, part: Path) -> Path:
    """Copy a part (and, recursively, the owned parts its own .rels point at). Returns the copy."""
    new = _fresh(part)
    shutil.copy(part, new)
    rel_part = "/" + part.relative_to(root).as_posix()
    ctype = _content_type(root, rel_part)
    if ctype:
        _add_override(root, "/" + new.relative_to(root).as_posix(), ctype)
    rels = part.parent / "_rels" / (part.name + ".rels")
    if rels.exists():
        r = rels.read_text("utf-8")
        for tgt in set(re.findall(r'Target="([^"]+)"', r)):
            if tgt.startswith(("http", "/")):
                continue
            tp = (part.parent / tgt).resolve()
            if tp.exists() and tp.parent.name in OWNED_DIRS + ("drawings",):
                tnew = _clone_part(root, tp)
                prefix = tgt.rsplit("/", 1)[0] + "/" if "/" in tgt else ""
                r = r.replace(f'Target="{tgt}"', f'Target="{prefix}{tnew.name}"')
        (new.parent / "_rels" / (new.name + ".rels")).write_text(r, "utf-8")
    return new


def unshare_parts(root: Path, slide: Path) -> None:
    # a copy must not reuse its source slide's creation id
    x = slide.read_text("utf-8")
    x = re.sub(r'(<p14:creationId\b[^>]*val=")\d+(")',
               lambda m: f"{m.group(1)}{random.randint(10**9, 4 * 10**9)}{m.group(2)}", x)
    slide.write_text(x, "utf-8")
    rels = slide.parent / "_rels" / (slide.name + ".rels")
    r = rels.read_text("utf-8")
    for tgt in sorted(set(re.findall(r'Target="\.\./([a-z]+)/([^"]+)"', r))):
        folder, name = tgt
        if folder not in OWNED_DIRS:
            continue
        new = _clone_part(root, slide.parent.parent / folder / name)
        r = r.replace(f'Target="../{folder}/{name}"', f'Target="../{folder}/{new.name}"')
    rels.write_text(r, "utf-8")


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
        unshare_parts(out.resolve(), (ppt / "slides" / m.group(1)).resolve())

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
