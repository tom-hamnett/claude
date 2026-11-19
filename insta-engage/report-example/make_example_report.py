"""Turn a real Analyst's Edge Template B deep-dive into a redacted EXAMPLE report.

What it does, slide by slide:
  * swaps the subject and the 7 peers for the names in a config file
  * swaps sector words (hotels, rooms, estate...) for the config's sector terms
  * redacts every number (tables, titles, KPI tiles) as ███
  * greys out body prose and footnotes as word-shaped bars, keeping headings
  * rebuilds every chart with modelled values from the config so bars appear
    in a plausible order; data labels show ███, embedded chart data is replaced
  * replaces the cover photo, clears speaker notes and document properties
  * stamps "EXAMPLE REPORT · illustrative only" diagonally on every slide
  * runs a leak check: fails if any original name, sector word or unredacted
    number survives

Usage:
  python make_example_report.py TEMPLATE.pptx configs/saas_asana.json OUT.pptx
"""

from __future__ import annotations

import json
import random
import re
import statistics
import sys
from copy import deepcopy

from lxml import etree
from pptx import Presentation
from pptx.chart.data import CategoryChartData
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Emu, Pt

# The names used in the reference template, in slot order (subject first).
TEMPLATE_SUBJECT = ("IHG Hotels & Resorts", "IHG")
TEMPLATE_PEERS = [
    ("Accor", ["Accor"]),
    ("Hilton", ["Hilton"]),
    ("Marriott International", ["Marriott"]),
    ("Hyatt Hotels Corporation", ["Hyatt"]),
    ("Wyndham Hotels & Resorts", ["Wyndham"]),
    ("Choice Hotels International", ["Choice Hotels"]),
    ("Radisson Hotel Group", ["Radisson"]),
]
LEAK_TERMS = [
    "IHG", "Accor", "Hilton", "Marriott", "Hyatt", "Wyndham", "Choice Hotels",
    "Radisson", "hotel", "Hotel", "room", "Room", "estate", "hospitality", "franchis",
]

BLOCK = "█"
REDACT = BLOCK * 3
PROSE_GREY = RGBColor(0xC9, 0xCF, 0xD8)
PROSE_MIN_CHARS = 90  # paragraphs longer than this are body prose
CELL_PROSE_MIN_CHARS = 70

# Number tokens we keep visible: footnote markers, page numbers, filing names,
# fiscal years and the scale-driver denominators.
PROTECT = [
    r"\(\d{1,2}\)",
    r"\b\d{1,2}/\d{2}\b",          # page x/24
    r"10-K", r"20-F", r"H-1B",
    r"FY20\d\d",
    r"1,000 customers", r"1,000 company staff",
    r"Template [AB]",
]
NUM = re.compile(r"[$£€]?\d[\d,.]*")


def redact_numbers(text: str) -> str:
    keep: list[str] = []

    def stash(m):
        keep.append(m.group(0))
        return chr(0xE000 + len(keep) - 1)  # private-use char: contains no digit

    for pat in PROTECT:
        text = re.sub(pat, stash, text)
    text = NUM.sub(lambda m: (m.group(0)[0] if m.group(0)[0] in "$£€" else "") + REDACT, text)
    return re.sub("[-]", lambda m: keep[ord(m.group(0)) - 0xE000], text)


def bar_out(text: str) -> str:
    return re.sub(r"\S+", lambda m: BLOCK * min(len(m.group(0)), 12), text)


class Mapper:
    def __init__(self, cfg: dict):
        self.cfg = cfg
        subj = cfg["subject"]
        self.names: list[tuple[str, str]] = [
            (TEMPLATE_SUBJECT[0], subj["name"]),
            (TEMPLATE_SUBJECT[1], subj.get("short", subj["name"])),
        ]
        for (full, shorts), peer in zip(TEMPLATE_PEERS, cfg["peers"]):
            self.names.append((full, peer["name"]))
            for s in shorts:
                self.names.append((s, peer["name"]))
        self.names.sort(key=lambda kv: -len(kv[0]))
        self.terms = [
            (a, b.format(**cfg)) for a, b in cfg["terms"]
        ]
        # markers belong to the new peer, not the old slot
        self.flag = {p["name"]: p.get("flag", "") for p in cfg["peers"]}

    def text(self, s: str) -> str:
        for old, new in self.names:
            s = s.replace(old, new)
        for old, new in self.terms:
            s = re.sub(rf"(?<![A-Za-z]){re.escape(old)}", new, s)
        return s

    def category(self, label: str) -> str:
        star = label.startswith("★")
        base = re.sub(r"[★†‡]", "", label).strip()
        base = self.text(base)
        flag = self.flag.get(base, "")
        out = ("★ " if star else "") + base
        return out + (f" {flag}" if flag else "")


# ---------- modelled values so charts sort plausibly ----------

class Model:
    def __init__(self, cfg: dict, seed: int = 7):
        rnd = random.Random(seed)
        self.rows = {}
        for c in [cfg["subject"], *cfg["peers"]]:
            fte = c["staff_k"] * 1000 * rnd.uniform(0.010, 0.016)
            cost_k = rnd.uniform(125, 205)
            rev = c.get("rev_bn")
            self.rows[c["name"]] = {
                "fte_bn": fte / rev if rev else None,
                "cost_bn": fte * cost_k / 1000 / rev if rev else None,
                "fte_cust": fte / c["customers_k"],
                "cost_cust": fte * cost_k / 1000 / c["customers_k"],
                "fte_staff": fte / c["staff_k"],
                "cost_staff": fte * cost_k / 1000 / c["staff_k"],
                "cost_fte": cost_k,
            }
        self.rnd = rnd

    def metric_for(self, title: str) -> str:
        t = title.lower()
        cost = "cost" in t
        if "per fte" in t or "cost / fte" in t or "per corporate procurement fte" in t or "loaded" in t:
            return "cost_fte"
        if "customer" in t:
            return "cost_cust" if cost else "fte_cust"
        if "company staff" in t:
            return "cost_staff" if cost else "fte_staff"
        return "cost_bn" if cost else "fte_bn"

    def value(self, name: str, metric: str):
        base = re.sub(r"[★†‡]", "", name).strip()
        row = self.rows.get(base)
        return None if row is None else row[metric]


# ---------- chart rebuild ----------

C_NS = "http://schemas.openxmlformats.org/drawingml/2006/chart"


def dpt_colours(ser_el, cats):
    out = {}
    for dpt in ser_el.findall(qn("c:dPt")):
        idx = int(dpt.find(qn("c:idx")).get("val"))
        if idx < len(cats):
            out[cats[idx]] = deepcopy(dpt)
    return out


def set_redacted_labels(chart):
    for plot in chart.plots:
        if plot.has_data_labels:
            dl = plot.data_labels
            dl.number_format = f'"{REDACT}"'
            dl.number_format_is_linked = False
        for dLbls in plot._element.iter(qn("c:dLbls")):
            nf = dLbls.find(qn("c:numFmt"))
            if nf is None:
                nf = etree.SubElement(dLbls, qn("c:numFmt"))
                dLbls.insert(0, nf)
            nf.set("formatCode", f'"{REDACT}"')
            nf.set("sourceLinked", "0")
    try:
        ax = chart.value_axis
        ax.tick_labels.number_format = '""'
        ax.tick_labels.number_format_is_linked = False
    except Exception:
        pass


def rebuild_chart(chart, title: str, mapper: Mapper, model: Model):
    plot = chart.plots[0]
    old_cats = [str(c) for c in plot.categories]
    series = list(plot.series)
    new_cats = [mapper.category(c) for c in old_cats]
    if len(series) == 1:
        metric = model.metric_for(title)
        vals = []
        for c in new_cats:
            v = model.value(c, metric)
            vals.append(v)
        known = [v for v in vals if v is not None]
        med = statistics.median(known) if known else 1.0
        lq = sorted(known)[max(0, len(known) // 4 - 1)] if known else 1.0
        for i, c in enumerate(new_cats):
            if vals[i] is None:
                low = c.lower()
                vals[i] = med if "median" in low else lq if "quartile" in low else med * model.rnd.uniform(0.5, 0.9)
        colours = dpt_colours(series[0]._element, new_cats)
        order = sorted(range(len(new_cats)), key=lambda i: -vals[i])
        cats = [new_cats[i] for i in order]
        data = CategoryChartData()
        data.categories = cats
        data.add_series(series[0].name, [round(vals[i], 3) for i in order])
        chart.replace_data(data)
        ser_el = chart.plots[0].series[0]._element
        for dpt in ser_el.findall(qn("c:dPt")):
            ser_el.remove(dpt)
        anchor = ser_el.find(qn("c:cat"))
        for i, c in enumerate(cats):
            if c in colours:
                dpt = colours[c]
                dpt.find(qn("c:idx")).set("val", str(i))
                anchor.addprevious(dpt)
    else:
        # subject vs peer median shares, e.g. sub-function or grade mix
        data = CategoryChartData()
        data.categories = new_cats
        for s in series:
            raw = [model.rnd.uniform(3, 40) for _ in new_cats]
            tot = sum(raw)
            data.add_series(mapper.text(s.name), [round(100 * r / tot, 1) for r in raw])
        chart.replace_data(data)
    set_redacted_labels(chart)


# ---------- slide passes ----------

def iter_shapes(shapes):
    for sh in shapes:
        if sh.shape_type == 6:  # group
            yield from iter_shapes(sh.shapes)
        else:
            yield sh


def is_title(sh) -> bool:
    # action title and the section label sit in the top band of each slide
    return sh.has_text_frame and Emu(sh.top).inches < 1.3 and Emu(sh.width).inches > 8


def rewrite_paragraph(par, mapper: Mapper, prose_ok: bool, min_chars: int):
    full = "".join(r.text for r in par.runs)
    if not full.strip():
        return
    mapped = redact_numbers(mapper.text(full))
    if prose_ok and len(full) > min_chars:
        # keep a short bold lead-in (e.g. "What this shows") visible, bar the rest
        runs = list(par.runs)
        lead_bold = runs[0].font.bold and len(runs[0].text) < 40
        for i, r in enumerate(runs):
            if i == 0 and lead_bold:
                r.text = redact_numbers(mapper.text(r.text))
                continue
            r.text = bar_out(r.text)
            r.font.color.rgb = PROSE_GREY
        return
    # distribute mapped text back onto runs: keep formatting of the first run
    runs = list(par.runs)
    runs[0].text = mapped
    for r in runs[1:]:
        r.text = ""


def process_text_frame(tf, mapper, prose_ok, min_chars):
    for par in tf.paragraphs:
        rewrite_paragraph(par, mapper, prose_ok, min_chars)


def chart_title_for(slide, chart_shape) -> str:
    best, gap = "", 10**12
    for sh in iter_shapes(slide.shapes):
        if not sh.has_text_frame or not sh.text_frame.text.strip():
            continue
        bottom = sh.top + sh.height
        overlaps = sh.left < chart_shape.left + chart_shape.width and chart_shape.left < sh.left + sh.width
        d = chart_shape.top - bottom
        if overlaps and -Emu(Pt(30)) <= d < gap:
            best, gap = sh.text_frame.text, d
    return best


def replace_cover_picture(slide):
    for sh in list(iter_shapes(slide.shapes)):
        if sh.shape_type == 13:
            sh._element.getparent().remove(sh._element)


def add_watermark(slide, prs):
    w, h = prs.slide_width, prs.slide_height
    box = slide.shapes.add_textbox(int(w * 0.08), int(h * 0.36), int(w * 0.84), int(h * 0.28))
    box.rotation = -24
    tf = box.text_frame
    tf.word_wrap = False
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = "EXAMPLE REPORT"
    r.font.size = Pt(88)
    r.font.bold = True
    r.font.color.rgb = RGBColor(0xC0, 0x39, 0x2B)
    p2 = tf.add_paragraph()
    p2.alignment = PP_ALIGN.CENTER
    r2 = p2.add_run()
    r2.text = "Illustrative layout · names for example only · not findings"
    r2.font.size = Pt(20)
    r2.font.bold = True
    r2.font.color.rgb = RGBColor(0xC0, 0x39, 0x2B)
    for run in (r, r2):
        fill = run._r.find(qn("a:rPr")).find(qn("a:solidFill"))
        clr = fill.find(qn("a:srgbClr"))
        alpha = etree.SubElement(clr, qn("a:alpha"))
        alpha.set("val", "22000")


def build(template: str, cfg_path: str, out: str) -> None:
    cfg = json.load(open(cfg_path))
    mapper, model = Mapper(cfg), Model(cfg)
    prs = Presentation(template)

    for idx, slide in enumerate(prs.slides):
        if idx == 0:
            replace_cover_picture(slide)
        for sh in list(iter_shapes(slide.shapes)):
            if getattr(sh, "has_chart", False) and sh.has_chart:
                title = mapper.text(chart_title_for(slide, sh))
                rebuild_chart(sh.chart, title, mapper, model)
            elif getattr(sh, "has_table", False) and sh.has_table:
                for row in sh.table.rows:
                    for cell in row.cells:
                        process_text_frame(cell.text_frame, mapper, True, CELL_PROSE_MIN_CHARS)
            elif sh.has_text_frame:
                process_text_frame(sh.text_frame, mapper, not is_title(sh), PROSE_MIN_CHARS)
        if slide.has_notes_slide:
            slide.notes_slide.notes_text_frame.text = ""
        add_watermark(slide, prs)

    cp = prs.core_properties
    cp.author = cp.last_modified_by = "Analyst's Edge"
    cp.title = f"EXAMPLE REPORT: {cfg['subject']['name']} (illustrative)"
    cp.subject = cp.keywords = cp.comments = cp.category = ""
    prs.save(out)
    leak_check(out, cfg)


def leak_check(path: str, cfg: dict) -> None:
    """Scan every XML part (slides, charts, embedded data, notes, props) for leaks."""
    import zipfile

    allowed = {cfg["subject"]["name"], *[p["name"] for p in cfg["peers"]]}
    problems = []
    with zipfile.ZipFile(path) as z:
        for name in z.namelist():
            if name.endswith(".xlsx"):
                import io
                with zipfile.ZipFile(io.BytesIO(z.read(name))) as inner:
                    texts = [inner.read(n).decode("utf8", "ignore") for n in inner.namelist() if n.endswith(".xml")]
            elif name.endswith(".xml") or name.endswith(".rels"):
                texts = [z.read(name).decode("utf8", "ignore")]
            else:
                continue
            for t in texts:
                visible = " ".join(re.findall(r">([^<]+)<", t))
                for term in LEAK_TERMS:
                    if term in visible and not any(term in a for a in allowed):
                        problems.append(f"{name}: '{term}'")
                # every number shown on a slide must be a protected token
                if name.startswith("ppt/slides/slide"):
                    for run in re.findall(r"<a:t>([^<]*)</a:t>", t):
                        left = run
                        for pat in PROTECT:
                            left = re.sub(pat, "", left)
                        if re.search(r"\d", left):
                            problems.append(f"{name}: unredacted number in '{run[:60]}'")
    if problems:
        raise SystemExit("LEAK CHECK FAILED:\n  " + "\n  ".join(sorted(set(problems))[:60]))
    print(f"leak check passed: {path}")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        raise SystemExit(__doc__)
    build(*sys.argv[1:])
