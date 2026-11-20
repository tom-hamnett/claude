"""One shot: request JSON -> redacted EXAMPLE report (PPTX + PDF + 4-image carousel).

  python make_lead_report.py REQUEST.json OUTDIR [--threshold 5000]

Steps: sector guardrail (blocklist.json) -> cohort rule picks Template A (whole company)
or Template B (function) -> build + leak check -> PDF via LibreOffice -> carousel
(cover, summary, sizing, structure) at 1080x1350 -> manifest.json.

Template decks are never committed. They are found via $TEMPLATE_A / $TEMPLATE_B or in
report-example/templates/ (git-ignored) as template_a.pptx / template_b.pptx.

Request schema (all sizes are rough public figures; they only set chart ORDER):
{
  "lead": "instagram handle (optional, for file naming)",
  "interest": "free text or function name: procurement | finance | hr | it | whole company",
  "view": "optional override: whole_company | function",
  "function": "optional override for Template B",
  "subject": {"name": "Asana", "short": "Asana", "staff": 3000, "rev_bn": 0.72, "driver1": 160},
  "peers":   [{"name": "Atlassian", "staff": 12200, "rev_bn": 4.36, "driver1": 300, "flag": "optional mark"}],
  "sector":  {"label": "software companies", "noun": "software sector", "short": "SaaS",
              "driver1": "customers", "driver1_singular": "customer"}
}
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))

from cohort import DEFAULT_THRESHOLD, check_blocklist, choose_view  # noqa: E402
from make_example_report import build, staff_of  # noqa: E402

PROFILES = {"whole_company": "template_a_wholeco.json", "function": "template_b_procurement.json"}


def template_path(profile: dict) -> Path:
    env = os.environ.get(profile["template_env"])
    p = Path(env) if env else HERE / "templates" / profile["template_file"]
    if not p.exists():
        raise SystemExit(f"Template deck not found: {p}. Download it from Drive into report-example/templates/ "
                         f"or set ${profile['template_env']}.")
    return p


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")


def to_pdf(pptx: Path) -> Path:
    exe = shutil.which("soffice") or shutil.which("libreoffice")
    if not exe:
        raise SystemExit("LibreOffice (soffice) is needed for the PDF step")
    subprocess.run([exe, "--headless", "--convert-to", "pdf", "--outdir", str(pptx.parent), str(pptx)],
                   check=True, capture_output=True, timeout=300)
    return pptx.with_suffix(".pdf")


def carousel(pdf: Path, pages: dict, outdir: Path, subject: str) -> list[str]:
    from PIL import Image, ImageDraw, ImageFont

    W, H = 1080, 1350
    navy, teal = (19, 26, 36), (26, 107, 92)

    def font(sz, bold=False):
        f = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
        try:
            return ImageFont.truetype(f, sz)
        except OSError:
            return ImageFont.load_default()

    outdir.mkdir(parents=True, exist_ok=True)
    tmp = outdir / "_pages"
    tmp.mkdir(exist_ok=True)
    files = []
    order = [("cover", "The pack"), ("summary", "The sentence"), ("sizing", "Sizing"), ("structure", "Structure")]
    for k, (key, label) in enumerate(order, 1):
        pg = pages[key]
        stem = tmp / f"p{pg}"
        subprocess.run(["pdftoppm", "-r", "200", "-png", "-singlefile", "-f", str(pg), "-l", str(pg), str(pdf), str(stem)],
                       check=True, capture_output=True)
        im = Image.open(f"{stem}.png").convert("RGB")
        sw = W - 80
        im = im.resize((sw, int(im.height * sw / im.width)), Image.LANCZOS)
        c = Image.new("RGB", (W, H), navy)
        d = ImageDraw.Draw(c)
        d.rectangle([0, 0, W, 10], fill=teal)
        d.text((40, 70), "THE ANALYST'S EDGE", font=font(30, True), fill=(120, 200, 180))
        d.text((40, 115), f"Example report · {label}", font=font(46, True), fill="white")
        d.text((40, 180), subject, font=font(34), fill=(210, 216, 226))
        c.paste(im, (40, (H - im.height) // 2 + 40))
        d.text((40, H - 110), "Your company. Your peers. The sentence and the page.", font=font(30), fill=(210, 216, 226))
        d.text((40, H - 62), f"{k}/{len(order)}   ·   example layout, numbers redacted", font=font(26), fill=(150, 160, 175))
        f = outdir / f"{k:02d}_{key}.png"
        c.save(f)
        files.append(str(f))
    shutil.rmtree(tmp)
    return files


def run(request_path: str, outdir: str, threshold: int = DEFAULT_THRESHOLD) -> dict:
    req = json.loads(Path(request_path).read_text())
    blocked = check_blocklist(req)
    if blocked:
        raise SystemExit("BLOCKED by sector guardrail (blocklist.json): " + "; ".join(blocked))
    pick = choose_view(staff_of(req["subject"]), req.get("interest"), threshold)
    view = req.get("view") or pick["view"]
    if view == "function":
        req["function"] = req.get("function") or pick["function"] or "procurement"
    profile = json.loads((HERE / "profiles" / PROFILES[view]).read_text())
    out = Path(outdir)
    out.mkdir(parents=True, exist_ok=True)
    name = slug(req["subject"]["name"]) + ("_" + req["function"] if view == "function" else "_whole_company")
    pptx = out / f"example_{name}.pptx"
    build(str(template_path(profile)), profile, req, str(pptx))
    pdf = to_pdf(pptx)
    car = carousel(pdf, profile["carousel"], out / f"carousel_{name}", req["subject"]["name"])
    manifest = {"view": view, "function": req.get("function") if view == "function" else None,
                "reason": pick["reason"] if not req.get("view") else "view set in request",
                "pptx": str(pptx), "pdf": str(pdf), "carousel": car}
    (out / f"manifest_{name}.json").write_text(json.dumps(manifest, indent=2))
    print(json.dumps(manifest, indent=2))
    return manifest


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("request")
    ap.add_argument("outdir")
    ap.add_argument("--threshold", type=int, default=DEFAULT_THRESHOLD)
    a = ap.parse_args()
    run(a.request, a.outdir, a.threshold)
