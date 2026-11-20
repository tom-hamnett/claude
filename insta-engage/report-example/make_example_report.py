"""Turn a real Analyst's Edge deep-dive (Template A or B) into a redacted EXAMPLE report.

A template PROFILE (profiles/*.json) says which names and sector words the source deck
uses; a per-lead REQUEST says which company and peers to show. For each slide:
  * subject and peers swapped in one pass (unused peer slots are dropped: table rows
    and chart bars removed); no-data peers get the template's marker
  * function relabelled for Template B (functions.json) and sector words swapped
  * every number redacted as ███; body prose and footnotes greyed to word-shaped bars
  * charts rebuilt from modelled values so bars sort plausibly; labels show ███;
    embedded chart workbooks are replaced
  * cover photo removed if the profile says so, speaker notes and doc properties cleared
  * "EXAMPLE REPORT · illustrative layout · names for example only · not findings"
  * a strict leak check over every XML part, including embedded workbooks

Usage:
  python make_example_report.py TEMPLATE.pptx PROFILE.json REQUEST.json OUT.pptx
"""

from __future__ import annotations

import io
import json
import random
import re
import statistics
import sys
import zipfile
from copy import deepcopy
from pathlib import Path

from lxml import etree
from pptx import Presentation
from pptx.chart.data import CategoryChartData
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Emu, Pt

HERE = Path(__file__).parent
BLOCK = "█"
REDACT = BLOCK * 3
SENT = ""  # stands in for an unused peer slot until it is removed
MARKS = "†‡"  # † ‡
PROSE_GREY = RGBColor(0xC9, 0xCF, 0xD8)
PROSE_MIN_CHARS = 90
CELL_PROSE_MIN_CHARS = 70

BASE_PROTECT = [
    r"\(\d{1,2}\)",            # footnote markers
    r"\b\d{1,2}/\d{2}\b",      # page x/24
    r"10-Ks?", r"20-Fs?", r"H-1B",
    r"FY20\d\d",
    r"Template [AB]",
]
NUM = re.compile(r"[$£€]?\d[\d,.]*")


def redact_numbers(text: str, protect: list[str] | None = None) -> str:
    """Replace every number with ███ (keeping a leading currency sign), except protected tokens."""
    keep: list[str] = []

    def stash(m):
        keep.append(m.group(0))
        return chr(0xE000 + len(keep) - 1)  # private-use char: contains no digit

    for pat in (protect or BASE_PROTECT):
        text = re.sub(pat, stash, text)
    text = NUM.sub(lambda m: (m.group(0)[0] if m.group(0)[0] in "$£€" else "") + REDACT, text)
    return re.sub("[-]", lambda m: keep[ord(m.group(0)) - 0xE000], text)


def bar_out(text: str) -> str:
    return re.sub(r"\S+", lambda m: BLOCK * min(len(m.group(0)), 12), text)


def _flex(s: str) -> str:
    """Regex for a label that may wrap over lines in the template."""
    return r"\s+".join(re.escape(w) for w in s.split())


def staff_of(c: dict) -> float:
    return c["staff"] if c.get("staff") is not None else c["staff_k"] * 1000


def sector_vars(req: dict) -> dict:
    s = req.get("sector", {})
    d1 = s.get("driver1", "customers")
    return {
        "sector_label": s.get("label", "peer companies"),
        "sector_noun": s.get("noun", "sector"),
        "sector_short": s.get("short", s.get("label", "sector")),
        "driver1": d1,
        "Driver1": d1[:1].upper() + d1[1:],
        "driver1_singular": s.get("driver1_singular", d1.rstrip("s")),
    }


class Mapper:
    def __init__(self, profile: dict, req: dict, functions: dict):
        self.profile, self.req = profile, req
        subj = req["subject"]
        self.flag = {}
        names: dict[str, str] = {}
        for i, old in enumerate(profile["subject_names"]):
            names[old] = subj["name"] if i == 0 else subj.get("short", subj["name"])
        peers = req.get("peers", [])
        slots = profile["peer_slots"]
        if len(peers) > len(slots):
            raise SystemExit(f"Template has {len(slots)} peer slots; request has {len(peers)} peers")
        # peers with revenue go to the template's data slots first, no-data peers to its context slots
        nodata = set(profile.get("no_data_slots", []))
        order = [i for i in range(len(slots)) if i not in nodata] + [i for i in range(len(slots)) if i in nodata]
        ranked = sorted(peers, key=lambda p: p.get("rev_bn") is None)
        assign = dict(zip(order, ranked))
        self.dropped = set()
        for i, slot in enumerate(slots):
            p = assign.get(i)
            new = p["name"] if p else SENT
            for old in slot:
                names[old] = new
            if p:
                self.flag[new] = p.get("flag") or (profile["no_data_mark"] if p.get("rev_bn") is None else "")
            else:
                self.dropped.update(slot)
        self.subject_name = subj["name"]
        self.peer_names = [p["name"] for p in peers]
        self.names = names
        alt = "|".join(re.escape(k) for k in sorted(names, key=len, reverse=True))
        self.name_re = re.compile(rf"(?<![A-Za-z])({alt})(?![A-Za-z])((?:\s?[{MARKS}])*)")
        sv = sector_vars(req)
        self.sv = sv
        self.terms = [(re.compile(rf"(?<![A-Za-z]){_flex(a)}"), b.format(**sv)) for a, b in profile["terms"]]
        fn = req.get("function")
        base = profile.get("base_function")
        self.relabelled = bool(base and fn and fn != base)
        self.fn_terms = []
        if self.relabelled:
            if fn not in functions:
                raise SystemExit(f"Unknown function '{fn}'; known: {[k for k in functions if not k.startswith('_')]}")
            self.fn_terms = [(re.compile(rf"(?<![A-Za-z]){_flex(a)}"), b) for a, b in functions[fn]["terms"]]
        self.protect = BASE_PROTECT + [re.escape(p.format(**sv)) for p in profile.get("protect", [])]

    def company_labels(self, starred: bool) -> list[str]:
        out = [("\u2605 " if starred else "") + self.subject_name]
        for n in self.peer_names:
            mark = self.flag.get(n, "")
            out.append(n + (f" {mark}" if mark else ""))
        return out

    def text(self, s: str) -> str:
        def sub(m):
            new = self.names[m.group(1)]
            if new == SENT:
                return SENT
            mark = self.flag.get(new, "")
            return new + (f" {mark}" if mark else "")

        s = self.name_re.sub(sub, s)
        for rx, new in self.fn_terms:
            s = rx.sub(new, s)
        for rx, new in self.terms:
            s = rx.sub(new, s)
        if SENT in s:  # drop an unused peer from lists like "A, B and C"
            s = re.sub(rf"\s*(,|and)?\s*{SENT}[’'s]*", "", s)
        return s


# ---------- modelled values so charts sort plausibly ----------

def strip_marks(label: str) -> str:
    return re.sub(rf"[★{MARKS}]", "", label).strip()


class Model:
    def __init__(self, req: dict, seed: int = 7):
        rnd = random.Random(seed + sum(map(ord, req["subject"]["name"])))
        self.rows = {}
        for c in [req["subject"], *req.get("peers", [])]:
            staff = staff_of(c)
            fte = staff * rnd.uniform(0.010, 0.016)
            cost_k = rnd.uniform(125, 205)
            rev, d1 = c.get("rev_bn"), c.get("driver1")
            self.rows[c["name"]] = {
                "fte_bn": fte / rev if rev else None,
                "cost_bn": fte * cost_k / 1000 / rev if rev else None,
                "fte_d1": fte / d1 if d1 else None,
                "cost_d1": fte * cost_k / 1000 / d1 if d1 else None,
                "fte_staff": fte / staff * 1000,
                "cost_staff": fte * cost_k / staff,
                "cost_fte": cost_k * rnd.uniform(0.95, 1.05),
                "rev_emp": rev * 1e6 / staff if rev else None,
            }
        self.rnd = rnd

    @staticmethod
    def metric_for(title: str, driver1: str) -> str:
        t = title.lower()
        cost = "cost" in t
        if "revenue per" in t and ("employee" in t or "head" in t):
            return "rev_emp"
        if "per fte" in t or "cost / fte" in t or "loaded" in t or "per head" in t:
            return "cost_fte"
        if driver1.lower() in t:
            return "cost_d1" if cost else "fte_d1"
        if "company staff" in t:
            return "cost_staff" if cost else "fte_staff"
        return "cost_bn" if cost else "fte_bn"

    def value(self, label: str, metric: str):
        row = self.rows.get(strip_marks(label))
        return None if row is None else row[metric]


# ---------- chart rebuild ----------

def set_redacted_labels(chart):
    for plot in chart.plots:
        if plot.has_data_labels:
            plot.data_labels.number_format = f'"{REDACT}"'
            plot.data_labels.number_format_is_linked = False
        for dLbls in plot._element.iter(qn("c:dLbls")):
            nf = dLbls.find(qn("c:numFmt"))
            if nf is None:
                nf = etree.Element(qn("c:numFmt"))
                dLbls.insert(0, nf)
            nf.set("formatCode", f'"{REDACT}"')
            nf.set("sourceLinked", "0")
    try:
        chart.value_axis.tick_labels.number_format = '""'
        chart.value_axis.tick_labels.number_format_is_linked = False
    except Exception:
        pass


def rebuild_chart(chart, title: str, mapper: Mapper, model: Model):
    plot = chart.plots[0]
    old_cats = [str(c) for c in plot.categories]
    series = list(plot.series)
    new_cats = [mapper.text(c) for c in old_cats]
    if len(series) == 1:
        metric = model.metric_for(title, mapper.sv["driver1"])
        colours = {}
        ser_el = series[0]._element
        for dpt in ser_el.findall(qn("c:dPt")):
            i = int(dpt.find(qn("c:idx")).get("val"))
            if i < len(new_cats):
                colours[new_cats[i]] = deepcopy(dpt)
        companies = mapper.company_labels(starred=any(c.startswith("\u2605") for c in new_cats))
        names = {strip_marks(c) for c in companies}
        is_company_chart = any(strip_marks(c) in names for c in new_cats if c.strip())
        if is_company_chart:
            cats = companies + [c for c in new_cats if c.strip() and strip_marks(c) not in names
                                and strip_marks(c) not in mapper.dropped]
        else:
            cats = [c for c in new_cats if c.strip()]
        # colour by role: subject keeps the subject colour, other companies the series default
        for c in list(colours):
            if strip_marks(c) in names and strip_marks(c) != mapper.subject_name:
                del colours[c]
        subj_dpt = next((d for c, d in colours.items() if strip_marks(c) == mapper.subject_name), None)
        if subj_dpt is not None:
            colours = {c: d for c, d in colours.items() if strip_marks(c) != mapper.subject_name}
            for c in cats:
                if strip_marks(c) == mapper.subject_name:
                    colours[c] = subj_dpt
        pairs = [[c, model.value(c, metric)] for c in cats]
        known = [v for _, v in pairs if v is not None]
        med = statistics.median(known) if known else 1.0
        lq = sorted(known)[max(0, len(known) // 4 - 1)] if known else 1.0
        kept = []
        for c, v in pairs:
            if v is None:
                low = c.lower()
                if "median" in low:
                    v = med
                elif "quartile" in low:
                    v = lq
                else:
                    continue  # company with no basis for this metric: not shown
            kept.append((c, v))
        orig = [v for v in series[0].values if v is not None]
        ascending = len(orig) > 1 and all(x <= y for x, y in zip(orig, orig[1:])) and orig[0] != orig[-1]
        kept.sort(key=lambda cv: cv[1] if ascending else -cv[1])  # mirror the template's sort
        data = CategoryChartData()
        data.categories = [c for c, _ in kept]
        data.add_series(series[0].name, [round(v, 3) for _, v in kept])
        chart.replace_data(data)
        ser_el = chart.plots[0].series[0]._element
        for dpt in ser_el.findall(qn("c:dPt")):
            ser_el.remove(dpt)
        anchor = ser_el.find(qn("c:cat"))
        for i, (c, _) in enumerate(kept):
            if c in colours:
                dpt = colours[c]
                dpt.find(qn("c:idx")).set("val", str(i))
                anchor.addprevious(dpt)
    else:
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
        if sh.shape_type == 6:
            yield from iter_shapes(sh.shapes)
        else:
            yield sh


def is_title(sh) -> bool:
    return sh.has_text_frame and Emu(sh.top).inches < 1.3 and Emu(sh.width).inches > 8


def rewrite_paragraph(par, mapper: Mapper, prose_ok: bool, min_chars: int):
    runs = list(par.runs)
    full = "".join(r.text for r in runs)
    if not full.strip():
        return
    if prose_ok and len(full) > min_chars:
        lead_bold = runs[0].font.bold and len(runs[0].text) < 40
        for i, r in enumerate(runs):
            if i == 0 and lead_bold:
                r.text = redact_numbers(mapper.text(r.text), mapper.protect)
                continue
            r.text = bar_out(r.text)
            r.font.color.rgb = PROSE_GREY
        return
    runs[0].text = redact_numbers(mapper.text(full), mapper.protect)
    for r in runs[1:]:
        r.text = ""


def process_text_frame(tf, mapper, prose_ok, min_chars):
    for par in tf.paragraphs:
        rewrite_paragraph(par, mapper, prose_ok, min_chars)


def process_table(table, mapper):
    # drop rows for unused peer slots before rewriting
    for row in list(table.rows):
        first = mapper.text(row.cells[0].text)
        if row.cells[0].text.strip() and not strip_marks(first):
            row._tr.getparent().remove(row._tr)
    for row in table.rows:
        for cell in row.cells:
            process_text_frame(cell.text_frame, mapper, True, CELL_PROSE_MIN_CHARS)


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
    if not best:  # fall back to the slide's action title
        tops = [sh for sh in iter_shapes(slide.shapes) if is_title(sh) and sh.text_frame.text.strip()]
        best = " ".join(sh.text_frame.text for sh in tops)
    return best


def _same_box(a, b, tol=Emu(Pt(14))) -> bool:
    return all(abs(x - y) <= tol for x, y in ((a.left, b.left), (a.top, b.top), (a.width, b.width), (a.height, b.height)))


def remove_pictures(slide):
    """Remove pictures AND their image parts, so the photo is not left in the package."""
    for sh in list(iter_shapes(slide.shapes)):
        if sh.shape_type == 13:
            rid = sh._element.blipFill.find(qn("a:blip")).get(qn("r:embed"))
            sh._element.getparent().remove(sh._element)
            if rid:
                slide.part.drop_rel(rid)


def add_watermark(slide, prs):
    w, h = prs.slide_width, prs.slide_height
    box = slide.shapes.add_textbox(int(w * 0.08), int(h * 0.36), int(w * 0.84), int(h * 0.28))
    box.rotation = -24
    tf = box.text_frame
    tf.word_wrap = False
    lines = [("EXAMPLE REPORT", 88), ("Illustrative layout · names for example only · not findings", 20)]
    for i, (txt, size) in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = PP_ALIGN.CENTER
        r = p.add_run()
        r.text = txt
        r.font.size = Pt(size)
        r.font.bold = True
        r.font.color.rgb = RGBColor(0xC0, 0x39, 0x2B)
        clr = r._r.find(qn("a:rPr")).find(qn("a:solidFill")).find(qn("a:srgbClr"))
        etree.SubElement(clr, qn("a:alpha")).set("val", "22000")


def build(template: str, profile: dict, req: dict, out: str) -> None:
    functions = json.loads((HERE / "functions.json").read_text())
    mapper, model = Mapper(profile, req, functions), Model(req)
    prs = Presentation(template)
    remove = set(profile.get("remove_texts", []))

    for idx, slide in enumerate(prs.slides):
        if idx == 0 and profile.get("remove_cover_picture"):
            remove_pictures(slide)
        for sh in list(iter_shapes(slide.shapes)):
            if getattr(sh, "has_chart", False) and sh.has_chart:
                rebuild_chart(sh.chart, mapper.text(chart_title_for(slide, sh)), mapper, model)
            elif getattr(sh, "has_table", False) and sh.has_table:
                process_table(sh.table, mapper)
            elif sh.has_text_frame:
                if sh.text_frame.text.strip() in remove:
                    for other in list(iter_shapes(slide.shapes)):
                        if other is not sh and other.shape_type == 1 and _same_box(other, sh):
                            other._element.getparent().remove(other._element)
                    sh._element.getparent().remove(sh._element)
                    continue
                process_text_frame(sh.text_frame, mapper, idx > 0 and not is_title(sh), PROSE_MIN_CHARS)
        if slide.has_notes_slide:
            slide.notes_slide.notes_text_frame.text = ""
        add_watermark(slide, prs)

    cp = prs.core_properties
    cp.author = cp.last_modified_by = "Analyst's Edge"
    cp.title = f"EXAMPLE REPORT: {req['subject']['name']} (illustrative)"
    cp.subject = cp.keywords = cp.comments = cp.category = ""
    prs.save(out)
    leak_check(out, profile, req, mapper, functions)


def _xml_texts(path: str):
    with zipfile.ZipFile(path) as z:
        for name in z.namelist():
            if name.endswith((".xlsx", ".xlsm")):
                with zipfile.ZipFile(io.BytesIO(z.read(name))) as inner:
                    for n in inner.namelist():
                        if n.endswith(".xml"):
                            yield f"{name}!{n}", inner.read(n).decode("utf8", "ignore")
            elif name.endswith((".xml", ".rels")):
                yield name, z.read(name).decode("utf8", "ignore")


def leak_check(path: str, profile: dict, req: dict, mapper: Mapper | None = None, functions: dict | None = None) -> None:
    """Fail if any template name, sector word or unredacted number survives anywhere."""
    allowed = [req["subject"]["name"], req["subject"].get("short", ""), *[p["name"] for p in req.get("peers", [])]]
    terms = list(profile["leak_terms"])
    if mapper and mapper.relabelled:
        terms += (functions or {}).get("_leak_terms_when_relabelled", [])
    protect = mapper.protect if mapper else BASE_PROTECT
    problems = []
    if profile.get("remove_cover_picture"):
        with zipfile.ZipFile(path) as z:
            media = [n for n in z.namelist() if n.startswith("ppt/media/")]
        if media:
            problems.append(f"template images still in package: {media}")
    for name, xml in _xml_texts(path):
        visible = " ".join(re.findall(r">([^<]+)<", xml))
        if SENT in visible:
            problems.append(f"{name}: unused peer placeholder left")
        for term in terms:
            if term in visible and not any(term in a for a in allowed if a):
                problems.append(f"{name}: '{term}'")
        if name.startswith("ppt/slides/slide"):
            for run in re.findall(r"<a:t>([^<]*)</a:t>", xml):
                left = run
                for pat in protect:
                    left = re.sub(pat, "", left)
                if re.search(r"\d", left):
                    problems.append(f"{name}: unredacted number in '{run[:60]}'")
        if name.startswith("ppt/charts/chart") and "!" not in name:
            for v in re.findall(r"<c:v>([^<]*)</c:v>", xml):
                for t in terms:
                    if t in v and not any(t in a for a in allowed if a):
                        problems.append(f"{name}: chart label '{v[:40]}'")
    if problems:
        raise SystemExit("LEAK CHECK FAILED:\n  " + "\n  ".join(sorted(set(problems))[:60]))
    print(f"leak check passed: {path}")


if __name__ == "__main__":
    if len(sys.argv) != 5:
        raise SystemExit(__doc__)
    t, prof, rq, o = sys.argv[1:]
    build(t, json.loads(Path(prof).read_text()), json.loads(Path(rq).read_text()), o)
