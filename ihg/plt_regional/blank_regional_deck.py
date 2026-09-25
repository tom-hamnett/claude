"""Blank the PLT regional planning template (source slides 14-21) for three regions.

Input: an unpacked deck produced by
    assemble.py reg --template PLT.pptx 13,3,50,14..21,50,14..21,50,14..21,56
Output: the same directory, edited in place:
  * cover / contents / region dividers retitled
  * every regional slide keeps its structure, headers and framework labels;
    numbers are masked (X), narrative becomes lorem ipsum of similar length,
    EMEAA references and title "[ ]" slots become the region name
  * hidden source slides (20, 21) un-hidden
  * each region gets its own copy of every chart part (so regions can later be
    populated independently); placeholder chart values set where the chart
    prints its own labels
"""

import re
import shutil
import sys
from pathlib import Path

ROOT = Path(sys.argv[1])
PPT = ROOT / "ppt"
REGIONS = ["AMER", "EMEAA", "Greater China"]
REGION_LONG = {"AMER": "Americas (AMER)", "EMEAA": "EMEAA", "Greater China": "Greater China"}

# Output order (from assemble.py): cover, contents, then per region: divider + src 14..21, then closing.
ORDER = [13, 3] + [None] * 27 + [56]

LOREM = (
    "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut "
    "labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris "
    "nisi ut aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit in voluptate velit "
    "esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt in "
    "culpa qui officia deserunt mollit anim id est laborum"
).split()


def lorem(n_chars: int, like: str) -> str:
    out, i = [LOREM[0]], 1
    while len(" ".join(out + [LOREM[i % len(LOREM)]])) <= max(n_chars, 11):
        out.append(LOREM[i % len(LOREM)])
        i += 1
    s = " ".join(out)
    s = s[0].upper() + s[1:]
    if like.rstrip().endswith("."):
        s += "."
    letters = [c for c in like if c.isalpha()]
    if letters and sum(c.isupper() for c in letters) / len(letters) > 0.8:
        s = s.upper()
    return s


NUM = re.compile(r"[≥+~-]?\$?\d[\d,]*(?:\.\d+)?\s?(?:bn|m|M|k|pp|%)?")


def mask_numbers(t: str) -> str:
    def rep(m: re.Match) -> str:
        tok = m.group(0)
        core = re.sub(r"^[≥+~-]", "", tok)
        is_money = "$" in tok
        is_pct = tok.endswith("%") or tok.endswith("pp")
        is_dec = bool(re.search(r"\d\.\d", tok))
        is_grouped = bool(re.search(r"\d,\d", tok))
        has_unit = bool(re.search(r"\d\s?(bn|m|M|k)$", tok))
        if not (is_money or is_pct or is_dec or is_grouped or has_unit):
            return tok  # years, 01/02 numerals, 26A, slide numbers
        del core
        return re.sub(r"\d", "X", tok)

    return NUM.sub(rep, t)


def xml_unescape(s: str) -> str:
    return s.replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"').replace("&apos;", "'").replace("&amp;", "&")


def xml_escape(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


# ---------------------------------------------------------------- per-slide rules
# KEEP: exact paragraph texts (stripped) left untouched (framework labels).
# SET:  exact paragraph text -> replacement ({R} = region).
# LOREM_DEFAULT: on these slides every non-kept, non-numeric paragraph becomes lorem.
COMMON_KEEP = set()

RULES = {
    14: dict(
        keep={"Add. Spend", "Prog. Spend", "Est Addressable Spend", "Spend via Programs", "CRF Collection",
              "CRF Programs", "(2025 CRF Data)", "( SOURCE)", "(Developed from IHG spend analysis & external data)",
              "#% Total Spend", "#% Addressable Spend", "#% IHG –influenced Spend", "#% avg. of CRF Prog Spend",
              "Recap / Update of intent"},
        set={"Build is the real gap": "Key insight 01", "Our growth is shifting east": "Key insight 02",
             "Scale is consolidating against us": "Key insight 03",
             "EMEAA Add. Spend & Programme Performance": "{R} Add. Spend & Programme Performance"},
        source_line=True,
    ),
    15: dict(keep={"Priorities", "Approach", "Budget & Dependencies", "Regional Acceleration",
                   "Support for Central Enablement", "How you will deliver"}),
    16: dict(
        keep={"Latent potential & leakage", "Latent potential &", "leakage", "Gaps &", "whitespace", "Central enablement &", "& dependencies", "Growth headroom for categories & mkts", "Gaps & whitespace",
              "Category / market ‘white spaces’", "Central enablement & dependencies",
              "Central Requirements & Support Allocated", "Opportunities & initiatives",
              "Costs, investment & resource allocation", "Detail & Trade-offs", "1", "2", "3"},
        lorem_default=True,
    ),
    17: dict(keep={"Sequencing", "HOW IT ROLLS UP"}),
    18: dict(keep={"Feeds into overarching GP strategy for consolidation & iteration", "3% Steady State",
                   "3% Baseline", "27+ Budget impact & Commitment", "Est. % CRF collected"},
             set={"Indicative EMEA Spend on GP Programs": "Indicative {R} Spend on GP Programs"}),
    19: dict(
        keep={"Denotes direct impact on 5% NUG", "For Live tracking, alongside financials",
              "AMOUNT OF PROGRAMME SPEND VS EST. TOTAL ADDRESSABLE SPEND",
              "HLG, DEVELOPMENT, BRAND ALIGNMENT ON BRAND COMPLIANCE REQUIREMENTS",
              "NUMBER OF SUPPLIERS CONTRACTED UNDER CRF SCHEME", "AMOUNT OF PROGRAMMES IN PLACE VS TOTAL REQUIRED",
              "DELIVERY OF JTT PROCUREMENT REQUIREMENTS", "ANNUAL COLLEAGUE SATISIFACTION SURVEY",
              "BUILD AND OPEN COST PER KEY", "OPERATE - GOP", "N/A for 2027", "[Current Status]"},
        set={"How we will measure and track success": "{R}: how we will measure and track success",
             "AGREE A METHODOLOGY AND GOAL": "LOREM IPSUM DOLOR SIT AMET",
             "BUILD AND OPEN AND OPERATE": "", "TBC %": "TBC"},
        lorem_min_words=5,
    ),
    20: dict(keep={"Feeds into overarching GP strategy", "How we deliver",
                   "01", "02", "03", "04", "05"},
             set={"What we need to deliver": "{R}: what we need to deliver"},
             lorem_default=True),
    21: dict(
        keep={"INITIATIVE", "WHAT CHANGES", "2027", "2028", "2029", "2030",
              "Additional programme spend captured, cumulative — $m and percentage points of addressable spend",
              "ACCELERATE — build on what we already have", "STEP-CHANGE — buy scale rather than build it",
              "Accelerate subtotal", "Total additional capture from initiatives",
              "Phasing and ranges are directional stakes in the ground for discussion, not modelled forecasts. "
              "They assume the capability investments on the preceding pages are funded from 2027, and are not "
              "fully additive where initiatives overlap.",
              "Appendix detail on budget & Planning", "Appendix - detail on budget & Planning", "–"},
        set={"PHASED TO 2030": "PHASED TO 2030 | {R}"},
        lorem_default=True,
    ),
}

# Text runs plus think-cell label fields (<a:fld type="datetime'…'">); slide-number fields are left alone.
RUN_RE = re.compile(r"(<a:r>.*?</a:r>|<a:fld (?![^>]*type=\"slidenum\")[^>]*>.*?</a:fld>)", re.S)
T_RE = re.compile(r"(<a:t>)(.*?)(</a:t>)", re.S)
PARA_RE = re.compile(r"<a:p>.*?</a:p>|<a:p [^>]*>.*?</a:p>", re.S)


def set_runs(p: str, texts: list[str]) -> str:
    runs = RUN_RE.findall(p)
    it = iter(texts)
    def fix(run: str) -> str:
        new = next(it)
        return T_RE.sub(lambda m: m.group(1) + xml_escape(new) + m.group(3), run, count=1)
    out = p
    for run in runs:
        out = out.replace(run, fix(run), 1)
    return out


def process_paragraph(p: str, rules: dict, region: str) -> str:
    runs = RUN_RE.findall(p)
    if not runs:
        return p
    texts = [xml_unescape(T_RE.search(r).group(2)) if T_RE.search(r) else "" for r in runs]
    joined = "".join(texts)
    key = re.sub(r"\s+", " ", joined).strip()
    if not key:
        return p
    R = region

    sets = {k: v.format(R=R) for k, v in rules.get("set", {}).items()}

    # Titles ("Something | ..."): never lorem. "[ ... ]" slot -> region; other runs via SET.
    if "|" in joined:
        new = [re.sub(r"\[\s*#\s*#\s*#\s*\]|\[[^\]]*\]", R, t) for t in texts]
        if "".join(new) == joined and "[" in joined:  # bracket split across runs: "[ " + "# # # ]"
            new = ["" if t.strip() == "[" else re.sub(r"^.*\]\s*$", R, t) if "]" in t else t for t in texts]
        new = [sets.get(t.strip(), t) for t in new]
        return set_runs(p, new)

    if key in rules.get("keep", set()):
        return p
    if key in sets:
        return set_runs(p, [sets[key]] + [""] * (len(texts) - 1))

    if rules.get("source_line") and key.startswith("Source:"):
        return set_runs(p, ["Source: [ fact pack reference ]"] + [""] * (len(texts) - 1))

    words = len(key.split())
    alpha = sum(c.isalpha() for c in key)
    numeric_only = alpha <= 3 and bool(re.search(r"\d", key))
    narrative = words >= rules.get("lorem_min_words", 6) and len(key) >= 30
    if not numeric_only and (narrative or (rules.get("lorem_default") and alpha > 3)):
        return set_runs(p, [lorem(len(key), key)] + [""] * (len(texts) - 1))

    if numeric_only and mask_numbers(joined) != joined:
        # a value split across runs ("$" | "164" | "m"): mask every digit
        return set_runs(p, [re.sub(r"\d", "X", t) for t in texts])
    new = [mask_numbers(t.replace("EMEAA", R).replace("EMEA", R)) for t in texts]
    return set_runs(p, new)


def process_slide(path: Path, src: int, region: str) -> None:
    s = path.read_text("utf-8")
    rules = RULES[src]
    s = PARA_RE.sub(lambda m: process_paragraph(m.group(0), rules, region), s)
    s = re.sub(r'(<p:sld\b[^>]*?)\s+show="0"', r"\1", s)  # un-hide
    if src == 21:  # drop the orange "Appendix - detail on budget & Planning" cover box over the table
        s = re.sub(r"<p:sp>(?:(?!</p:sp>).)*<a:t>Appendix - detail on budget &amp; Planning</a:t>(?:(?!</p:sp>).)*</p:sp>", "", s, flags=re.S)
    path.write_text(s, "utf-8")


# ---------------------------------------------------------------- charts
def next_free(dir_: Path, stem: str, ext: str) -> Path:
    n = 1
    while (dir_ / f"{stem}{n}{ext}").exists():
        n += 1
    return dir_ / f"{stem}{n}{ext}"


def add_override(part: str, ctype: str) -> None:
    ct = ROOT / "[Content_Types].xml"
    s = ct.read_text("utf-8")
    if f'PartName="{part}"' not in s:
        s = s.replace("</Types>", f'<Override PartName="{part}" ContentType="{ctype}"/></Types>')
        ct.write_text(s, "utf-8")


def content_type_of(part: str) -> str | None:
    s = (ROOT / "[Content_Types].xml").read_text("utf-8")
    m = re.search(rf'PartName="{re.escape(part)}" ContentType="([^"]+)"', s)
    return m.group(1) if m else None


def clone_chart(slide: Path) -> None:
    rels = slide.parent / "_rels" / (slide.name + ".rels")
    r = rels.read_text("utf-8")
    for old in sorted(set(re.findall(r'Target="\.\./charts/(chart\d+\.xml)"', r))):
        src = PPT / "charts" / old
        dst = next_free(PPT / "charts", "chart", ".xml")
        shutil.copy(src, dst)
        crels_src = PPT / "charts" / "_rels" / (old + ".rels")
        if crels_src.exists():
            cr = crels_src.read_text("utf-8")
            for tgt in re.findall(r'Target="([^"]+)"', cr):
                if tgt.startswith("http"):
                    continue
                tp = (PPT / "charts" / tgt).resolve()
                stem = re.sub(r"\d+$", "", tp.stem)
                ntp = next_free(tp.parent, stem, tp.suffix)
                shutil.copy(tp, ntp)
                part = "/" + str(ntp.relative_to(ROOT.resolve()))
                ctype = content_type_of("/" + str(tp.relative_to(ROOT.resolve())))
                if ctype:
                    add_override(part, ctype)
                cr = cr.replace(f'Target="{tgt}"', f'Target="{tgt.rsplit("/", 1)[0]}/{ntp.name}"' if "/" in tgt else f'Target="{ntp.name}"')
            (PPT / "charts" / "_rels" / (dst.name + ".rels")).write_text(cr, "utf-8")
        add_override(f"/ppt/charts/{dst.name}", content_type_of(f"/ppt/charts/{old}"))
        r = r.replace(f"../charts/{old}", f"../charts/{dst.name}")
    rels.write_text(r, "utf-8")


def placeholder_chart_values(slide: Path) -> None:
    """Charts that print their own data labels get neutral equal values."""
    rels = (slide.parent / "_rels" / (slide.name + ".rels")).read_text("utf-8")
    for c in re.findall(r'Target="\.\./charts/(chart\d+\.xml)"', rels):
        p = PPT / "charts" / c
        s = p.read_text("utf-8")
        if '<c:showVal val="1"' not in s:
            continue
        def ser(m: re.Match) -> str:
            return re.sub(r"(<c:val>.*?</c:val>)",
                          lambda v: re.sub(r"<c:v>[^<]*</c:v>", "<c:v>25</c:v>", v.group(1)), m.group(0), flags=re.S)
        s = re.sub(r"<c:ser>.*?</c:ser>", ser, s, flags=re.S)
        p.write_text(s, "utf-8")


# ---------------------------------------------------------------- notes
def clear_notes(slide: Path, keep: bool) -> None:
    rels = slide.parent / "_rels" / (slide.name + ".rels")
    m = re.search(r'Target="\.\./notesSlides/(notesSlide\d+\.xml)"', rels.read_text("utf-8"))
    if not m or keep:
        return
    n = PPT / "notesSlides" / m.group(1)
    s = n.read_text("utf-8")
    # blank text in the notes body placeholder only (type="body")
    def blank_body(sp: re.Match) -> str:
        blk = sp.group(0)
        if 'type="body"' not in blk:
            return blk
        return re.sub(r"<a:t>[^<]*</a:t>", "<a:t></a:t>", blk)
    s = re.sub(r"<p:sp>.*?</p:sp>", blank_body, s, flags=re.S)
    n.write_text(s, "utf-8")


# ---------------------------------------------------------------- main
def main() -> None:
    pres = (PPT / "presentation.xml").read_text("utf-8")
    prels = (PPT / "_rels" / "presentation.xml.rels").read_text("utf-8")
    rid2file = {}
    for tag in re.findall(r"<Relationship [^>]*/>", prels):
        i, t = re.search(r'Id="([^"]+)"', tag).group(1), re.search(r'Target="([^"]+)"', tag).group(1)
        rid2file[i] = t.split("/")[-1]
    files = [rid2file[r] for r in re.findall(r'<p:sldId [^>]*r:id="(rId\d+)"', pres)]
    assert len(files) == 30, len(files)
    slides = PPT / "slides"

    # Cover
    cover = slides / files[0]
    s = cover.read_text("utf-8")
    s = s.replace("Revving our Commercial Engine", "Regional templates: AMER, EMEAA &amp; Greater China")
    s = s.replace("PLT – AUGUST 2026", "PLT DEBRIEF – SEPTEMBER 2026 – DRAFT FOR FORMAT REVIEW")
    cover.write_text(s, "utf-8")

    # Contents: 3 regions, drop items 04/05
    contents = slides / files[1]
    s = contents.read_text("utf-8")
    for old, new in [("Our Role", "Americas (AMER)"), ("Procurement’s Transformation", "EMEAA"),
                     ("Next Phase of Evolution", "Greater China")]:
        s = s.replace(f"<a:t>{old}</a:t>", f"<a:t>{new}</a:t>")
    for gone in ["04", "2027 Procurement Priorities", "05", "2027 Digital Initiatives"]:
        s = re.sub(rf"<p:sp>(?:(?!</p:sp>).)*<a:t>{gone}</a:t>(?:(?!</p:sp>).)*</p:sp>", "", s, flags=re.S)
    contents.write_text(s, "utf-8")

    for ri, region in enumerate(REGIONS):
        base = 2 + ri * 9
        div = slides / files[base]
        d = div.read_text("utf-8").replace("<a:t>AMER</a:t>", f"<a:t>{xml_escape(REGION_LONG[region])}</a:t>")
        div.write_text(d, "utf-8")
        for k, src in enumerate(range(14, 22)):
            sl = slides / files[base + 1 + k]
            if ri > 0:
                clone_chart(sl)
            process_slide(sl, src, region)
            placeholder_chart_values(sl)
            clear_notes(sl, keep=(src == 19))
    print("done")


if __name__ == "__main__":
    main()
