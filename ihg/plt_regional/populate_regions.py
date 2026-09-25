"""Populate slides 14 (Current Performance), 15 (Regional Strategy Overview) and
16 (Proposed approach) for AMER, EMEAA and Greater China.

Run after:  blank_regional_deck.py <dir> 14,15,16
Usage:      populate_regions.py <dir>

Numbers reconcile to dim_hotel.csv (IHG estate, 2025) and F2F PLT August Fact Pack
v1.0 pp. 29-30. Anything unconfirmed is left yellow-highlighted (Tom's own
"needs confirming" convention on the template).
"""

import re
import sys
from pathlib import Path

ROOT = Path(sys.argv[1])
PPT = ROOT / "ppt"

# ----------------------------------------------------------------------------------------------
# DATA — computed from dim_hotel.csv (IHG hotels, spend model 2025) unless noted
# add = addressable spend split %, prog = programme spend split %, cap = capture rate by stage %
# order in the charts: Build, Open, Operate, IT/Telecom (stacked) | IT, Operate, Open, Build (bars)
# ----------------------------------------------------------------------------------------------
REGIONS = {
    "AMER": dict(
        add_total="$18.9bn", add_pct="63.9% of Total Spend", add_label="$18,899m",
        prog_total="$902m", prog_pct="4.8% of Addressable Spend", prog_label="$902m",
        crf_prog=None, crf_prog_pct=None,
        crf_coll="$21.7m", crf_coll_pct="2.4% of CRF Prog Spend",
        add=[47.4, 24.0, 23.4, 5.2], prog=[1.8, 26.3, 71.9, 0.1],
        cap={"IT": 0.06, "Operate": 14.6, "Open": 5.2, "Build": 0.18},
        chart_title="AMER Add. Spend & Programme Performance",
        insights=[
            ("Operate carries the programme",
             "Operate is 23% of AMER’s addressable spend but 72% of programme spend (14.6% capture). "
             "Build is 47% of spend with only 0.2% on programme"),
            ("The US is mature and contested",
             "The US holds the largest pool, but entrenched GPO competitors and FDD language that blocks "
             "auto-enrolment cap growth, even with more OHES effort"),
            ("Small owners are the engine",
             "First-time and small-scaling owners are 74% of the estate; OHES lifted their F&B "
             "participation by 24% and 14%. Mexico and LAC remain under-covered"),
        ],
        source="Source: F2F PLT August Fact Pack v1.0 (31 July 2026), pp. 29–30, 44; dim_hotel extract (2025 "
               "programme spend, modelled addressable spend); AMER F2F regional input, Aug 2026, slides 20–24. "
               "CRF collected: 2025 actual per AMER 2030 opportunity slide.",
    ),
    "EMEAA": dict(
        add_total="$5.5bn", add_pct="47.0% of Total Spend", add_label="$5,464m",
        prog_total="$164m", prog_pct="3.0% of Addressable Spend", prog_label="$164m",
        crf_prog="$75m", crf_prog_pct=None,
        crf_coll="$3.5m", crf_coll_pct="2.1% of CRF Prog Spend",
        add=[47.7, 20.7, 26.8, 4.8], prog=[4.7, 8.1, 82.7, 4.8],
        cap={"IT": 3.0, "Operate": 9.2, "Open": 1.2, "Build": 0.3},
        chart_title="EMEAA Add. Spend & Programme Performance",
        insights=None,  # keep the EMEAA team's own three insights
        source="Source: F2F PLT August Fact Pack v1.0 (31 July 2026), pp. 10, 19, 28–30, 32, 36, 45–47; dim_hotel "
               "extract (2025 programme spend). CRF collected: 2025 actual per EMEAA 2030 opportunity slide "
               "(template showed $2m — to confirm).",
    ),
    "Greater China": dict(
        add_total="$4.6bn", add_pct="53.7% of Total Spend", add_label="$4,552m",
        prog_total="$93m", prog_pct="2.0% of Addressable Spend", prog_label="$93m",
        crf_prog=None, crf_prog_pct=None,
        crf_coll="$1.9m", crf_coll_pct="2.0% of CRF Prog Spend",
        add=[46.5, 23.3, 25.4, 4.9], prog=[10.5, 31.2, 46.2, 11.9],
        cap={"IT": 5.0, "Operate": 3.7, "Open": 2.7, "Build": 0.5},
        chart_title="GC Add. Spend & Programme Performance",
        insights=[
            ("Capture is half the global rate",
             "Only 2.0% of GC’s $4.6bn addressable spend runs on programme (global ~4%). Operate "
             "captures 3.7%, against 9.2% in EMEAA and 14.6% in AMER"),
            ("Build is the prize, but access is blocked",
             "Build is 47% of spend at 0.5% capture. We lack POPD pipeline access, and peers run "
             "lead-constructor programmes IHG legally can’t"),
            ("Owners buy on price and perception",
             "Owners see central programmes as dearer and CRF as a hidden cost (the ‘10% myth’); long-tail "
             "F&B and Operate spend stays off-programme"),
        ],
        source="Source: F2F PLT August Fact Pack v1.0 (31 July 2026), pp. 29–30, 48 (p. 29 GC programme panel "
               "repeats EMEAA’s $164m — corrected to $93m per p. 30 and dim_hotel); GC F2F regional input, Aug 2026, "
               "slides 3–7. CRF collected: 2025 actual per GC 2030 opportunity slide.",
    ),
}

# Slide 15 — Regional Strategy Overview: rows (Regional Acceleration, Support for Central Enablement)
# x columns (Priorities, Approach, Budget & Dependencies). "→" marks the central initiative supported.
OVERVIEW = {
    "AMER": [
        [  # Regional Acceleration
            ["#1 US CMH estate (Operate: F&B / OS&E) – lift utilisation and compliance",
             "#2 US pipeline and renovations (Build / Open: FF&E / EME) – win earlier in the lifecycle",
             "#3 Mexico and priority LAC markets – selective expansion where coverage and distribution are viable",
             "Ambition: +$546m programme capture by 2030 (4.6% → ~7% share)"],
            ["Locked order guides beyond HIEX; P2P and utilisation reporting",
             "Compress FF&E design-to-delivery from 19 to 9.5 months; transform the waiver process",
             "Activate EME (energy, renewables, engineering) – $163m by 2030",
             "Localise programmes, standards and distribution for Mexico / LAC; high-touch Premium and L&L offer"],
            ["2026 CRF budget $21.0m; 2025 collected $21.7m (2.4% yield)",
             "Accelerate adds ~$13.1m CRF a year by 2030",
             "Needs design, waiver and category capacity; in-market sourcing and OHES for Mexico",
             "Risk: $2.1m revenue shortfall YTD (distributor payments, outstanding H1 supplier data)"],
        ],
        [  # Support for Central Enablement
            ["→ Managed Estate: FDD reform to auto-enrolment / opt-out as AMER’s enforcement lever",
             "→ Commercial Engine: expand OHES from a US capability into the global owner-lifecycle model",
             "→ Scaling with Partners: evaluate a GPO / distribution model for Operate",
             "→ PaaS: differentiated offer for Premium, L&L and pre-opening needs"],
            ["Test FDD mandatory / opt-out language with Legal; locked order guides as the control",
             "Offer the FTO / small-scaling OHES playbook as the central segmentation template",
             "Assess GPO options inside the central partner framework – protect owner data, control and economics"],
            ["Step-change adds $436m capture and ~$10.5m CRF by 2030 (→ ~10% share)",
             "EC sponsorship and legal review for FDD reform",
             "Commercial, legal and financial assessment of GPO choices",
             "Central CRM, owner segmentation and utilisation insight"],
        ],
    ],
    "EMEAA": [
        [
            ["KSA & IMEA (Build, FF&E, Operate): 1% of £0.92bn captured; largest pipeline",
             "SE Asia (Operate, F&B): 60% P2P coverage, managed-heavy – lowest friction",
             "India (Build, Open, Operate): high-growth pipeline, little programme presence",
             "UK&I / N. Europe: £1.47bn addressable, 92% franchised, <4% P2P"],
            ["Procurement at HMA / franchise signing (KSA, SE Asia, India first) – Build capture 0.3% → ~4%",
             "Convert SE Asia P2P coverage into spend; open long-tail categories",
             "Develop local suppliers and Build pipeline visibility in India",
             "UK&I: deploy P2P and a franchise value proposition worth joining"],
            ["2026 CRF budget $4.7m; 2025 collected $3.5m (2.1% yield)",
             "Accelerate: +$365m capture and +$7.8m CRF by 2030",
             "KSA headcount or third-party coverage (KSA contractor $0.3m in 2026)",
             "UK&I P2P needs a business case; FutureLog contingency required"],
        ],
        [
            ["→ Managed Estate: pilot region (EAPAC, IMEA) – 37% of hotels, £1.21bn addressable",
             "→ Commercial Engine: regional owner engagement and CRM; kill the 3% myth",
             "→ Scaling with Partners: EMEAA as the GPO test case",
             "→ ESM: fewer, deeper contracts ahead of the 27–28 renewals"],
            ["Run the central mandate pilot from Q2 27 with GM / DoO accountability and ManCo commitments",
             "Key-account coverage for institutional and sovereign-backed owners",
             "Restate the GPO case before scoping; Northern Europe the likely fit",
             "Move suppliers from compliance to growth partners"],
            ["Step-change: +$92m capture and +$2.0m CRF by 2030 (→ 9% share)",
             "M&A, commercial and legal diligence – external support",
             "Central CRM plus regional engagement leads",
             "Supplier golden record before consolidation benefits land"],
        ],
    ],
    "Greater China": [
        [
            ["Standard products: drive OBSM adoption (CRF headroom $0.08m)",
             "Lead constructors and digital solutions in Build ($0.16m)",
             "Long-tail Operate products ($0.11m) and F&B non-standard ($0.45m)",
             "Develop a frozen-seafood supplier base"],
            ["P2P adoption across managed hotels, especially Essentials; AI-led spend classification",
             "Use POPD for proactive OHE and procurement checkpoints; attend kick-off meetings",
             "Aggregator partnerships for long tail; DDP delivery via NGSC logistics partners",
             "Partner with design consultants to optimise the supplier base"],
            ["2026 CRF budget $2.0m; 2025 collected $1.9m",
             "Accelerate: +$15–22m capture by 2030",
             "Needs OHE field resources, marketing packages and seafood market intelligence",
             "F&B non-standard needs distribution infrastructure that doesn’t yet exist"],
        ],
        [
            ["→ Managed Estate: AI-enforced compliance controls; Touchpoint programme",
             "→ Commercial Engine: POPD–CRM integration, KOM tracking, Owner Link",
             "→ Scaling with Partners: lead-constructor legal review; retail programme",
             "→ PaaS: propositions by owner type (SOE, repeat private, first-time private)"],
            ["Platform integrated with POPD for non-retroactive waiver checks – the single most critical unlock",
             "Owner and hotel incentives to drive participation and compliance",
             "Retire the ‘10% myth’ with coordinated central collateral"],
            ["Step-change: +$63–122m capture by 2030; combined CRF uplift $1.95–3.6m",
             "BRR and Legal support for lead-constructor and retail programmes",
             "Digital and AI investment; HLG POPD access",
             "2026 spend: P2P data analytics $0.1m; Asia supply-chain legal study $0.2m"],
        ],
    ],
}

# Slide 16 — Proposed approach: per column (1 latent potential, 2 gaps & whitespace, 3 central
# enablement) -> (insight box, initiative box, cost box). Keyed to the template's text-box names.
APPROACH_BOXES = [("TextBox 78", "TextBox 89", "TextBox 93"),
                  ("TextBox 120", "TextBox 86", "TextBox 2"),
                  ("TextBox 114", "TextBox 123", "TextBox 110")]
APPROACH = {
    "AMER": [
        (["US Operate captures 14.6%, but FDD and waivers cap participation",
          "OHES lifted small-owner F&B participation by 14–24%"],
         ["Locked order guides; grow utilisation in L&L",
          "→ Managed Estate: FDD opt-out as AMER’s enforcement route"],
         ["Existing teams; P2P and utilisation reporting",
          "Legal review and EC sponsorship for FDD reform"]),
        (["Build and Open: $13.5bn addressable; Build capture 0.2%",
          "Mexico and LAC under-covered; Avendra unpopular with owners"],
         ["EME activation ($163m by 2030); FF&E 19 → 9.5 months",
          "Construction and labour – currently legally constrained"],
         ["Design, waiver and category capacity",
          "In-market sourcing and distribution for Mexico / LAC"]),
        (["Rebate opacity puts small owners off",
          "GPOs are strengthening owner relationships"],
         ["→ Commercial Engine: OHES model, CRM, segmentation",
          "→ Scaling with Partners: GPO / Operate shift assessed centrally"],
         ["Commercial, legal and financial GPO assessment",
          "Central CRM and owner-intelligence platform"]),
    ],
    "EMEAA": [
        (["Build is 48% of spend but only 0.3% runs on programme",
          "Managed estate: 37% of hotels, the lowest-friction channel"],
         ["Win Build at signing: $143m by 2030",
          "→ Managed Estate: mandate pilot in EAPAC / IMEA ($38m)"],
         ["Headcount or third-party coverage for KSA",
          "Existing teams for the mandate; ManCo negotiation"]),
        (["Many category / market combinations under-served",
          "UK&I is 92% franchised with <4% P2P"],
         ["Close white space: $53m by 2030, weighted to higher-CRF non-F&B",
          "India local supply base; SE Asia long tail"],
         ["Sourcing capacity for coverage mapping (H1 27)",
          "UK&I P2P business case"]),
        (["The 3% CRF myth is being spread by a GPO",
          "Entegra / Prestige consolidation; FutureLog dependency"],
         ["→ Commercial Engine: key accounts, CRM, collateral ($38m)",
          "→ Scaling with Partners ($92m); → ESM consolidation ($31m)"],
         ["External M&A and legal diligence",
          "Supplier golden record; central CRM"]),
    ],
    "Greater China": [
        (["Operate capture only 3.7%; P2P coverage low in Essentials",
          "No controls on hotels not adopting OBSM products"],
         ["OBSM adoption via AI-led data collection: $8–12m",
          "→ Managed Estate: Touchpoint and AI-enforced controls"],
         ["P2P rollout and data analytics (in flight)",
          "OLT promotion of the Touchpoint programme"]),
        (["F&B non-standard / Operate general: $900m addressable",
          "Long tail (dry goods, spices, stationery) not covered"],
         ["F&B non-standard $45–90m; long tail $10–20m via aggregators",
          "NGSC export: DDP model; add appliances, flooring, sanitary ware"],
         ["Digital distribution / aggregator solution",
          "Market intelligence for frozen seafood"]),
        (["No POPD access; procurement absent from kick-offs",
          "Lead-constructor programmes legally constrained"],
         ["→ Commercial Engine: POPD–CRM integration, KOM tracking",
          "→ Scaling with Partners: lead-constructor review; retail"],
         ["BRR and Legal support",
          "Digital / AI capability; OHE field resources"]),
    ],
}

# ---------------------------------------------------------------------------------------------- helpers
SP_RE = re.compile(r"<p:sp>.*?</p:sp>", re.S)
PARA_RE = re.compile(r"<a:p>.*?</a:p>|<a:p [^>]*>.*?</a:p>", re.S)


def esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def shape_text(sp: str) -> str:
    return "".join(re.findall(r"<a:t>([^<]*)</a:t>", sp))


def replace_shape_paras(sp: str, texts: list[str]) -> str:
    """Replace a text box's paragraphs with one paragraph per text, cloning the first run-bearing
    paragraph (keeps bullet, font, size and colour)."""
    paras = PARA_RE.findall(sp)
    tmpl = next(p for p in paras if "<a:r>" in p)
    ppr = re.search(r"<a:pPr\b[^>]*/>|<a:pPr\b[^>]*>.*?</a:pPr>", tmpl, re.S)
    rpr = re.search(r"<a:rPr[^>]*/>|<a:rPr[^>]*>.*?</a:rPr>", tmpl, re.S)
    rpr_s = rpr.group(0) if rpr else ""
    rpr_s = re.sub(r"<a:highlight>.*?</a:highlight>", "", rpr_s, flags=re.S)
    new = "".join(
        f"<a:p>{ppr.group(0) if ppr else ''}<a:r>{rpr_s}<a:t>{esc(t)}</a:t></a:r></a:p>" for t in texts)
    body = re.search(r"(<p:txBody>.*?)(<a:p>|<a:p )", sp, re.S)
    start = body.end(1)
    end = sp.rfind("</a:p>") + len("</a:p>")
    return sp[:start] + new + sp[end:]


def edit_shapes(s: str, fn) -> str:
    return SP_RE.sub(lambda m: fn(m.group(0)), s)


def set_run_text(s: str, old: str, new: str, unhighlight: bool = True) -> str:
    """Replace the text of the (first) run whose text is exactly `old`; optionally drop its highlight."""
    pat = re.compile(r"(<a:(?:r|fld)\b[^>]*>(?:(?!</a:(?:r|fld)>).)*?<a:t>)" + re.escape(esc(old)) + r"(</a:t>)", re.S)
    m = pat.search(s)
    if not m:
        raise KeyError(old)
    seg = m.group(1)
    if unhighlight:
        seg = re.sub(r"<a:highlight>.*?</a:highlight>", "", seg, flags=re.S)
    return s[:m.start()] + seg + esc(new) + m.group(2) + s[m.end():]


def slide_order() -> list[str]:
    pres = (PPT / "presentation.xml").read_text("utf-8")
    rels = (PPT / "_rels" / "presentation.xml.rels").read_text("utf-8")
    rid = {}
    for tag in re.findall(r"<Relationship [^>]*/>", rels):
        rid[re.search(r'Id="([^"]+)"', tag).group(1)] = re.search(r'Target="([^"]+)"', tag).group(1).split("/")[-1]
    return [rid[r] for r in re.findall(r'<p:sldId [^>]*r:id="(rId\d+)"', pres)]


def charts_of(slide: Path) -> list[Path]:
    rels = (slide.parent / "_rels" / (slide.name + ".rels")).read_text("utf-8")
    return [PPT / "charts" / c for c in re.findall(r'Target="\.\./charts/(chart\d+\.xml)"', rels)]


def set_series_values(chart: Path, series_vals: list[list[float]], hide_below: float | None = None) -> None:
    s = chart.read_text("utf-8")
    sers = re.findall(r"<c:ser>.*?</c:ser>", s, re.S)
    assert len(sers) == len(series_vals), (chart, len(sers))
    for ser, vals in zip(sers, series_vals):
        def val_block(m: re.Match) -> str:
            it = iter(vals)
            return re.sub(r"<c:v>[^<]*</c:v>", lambda _: f"<c:v>{next(it)}</c:v>", m.group(0))
        new = re.sub(r"<c:val>.*?</c:val>", val_block, ser, count=1, flags=re.S)
        if hide_below is not None:  # suppress labels on slivers: "[<x]"";0%"
            new = new.replace('formatCode="#,##0&quot;%&quot;;&quot;-&quot;#,##0&quot;%&quot;"',
                              f'formatCode="[&lt;{hide_below}]&quot;&quot;;#,##0&quot;%&quot;"')
        s = s.replace(ser, new, 1)
    chart.write_text(s, "utf-8")


# bar-chart label geometry, fitted on the template (x = A + B * displayed value; axis max fixed 3.5436)
AXIS_MAX, LBL_A, LBL_B = 3.5436279454998552, 3628200, 373455


def populate_14(path: Path, region: str) -> None:
    d = REGIONS[region]
    s = path.read_text("utf-8")
    s = re.sub(r"(<a:t>)\[ (</a:t>)", r"\1\2", s, count=1)
    s = set_run_text(s, "# # # ]", region, False)
    s = set_run_text(s, "$5.5bn", d["add_total"])
    s = set_run_text(s, "#% Total Spend", d["add_pct"])
    s = set_run_text(s, "$164m", d["prog_total"])
    s = set_run_text(s, "SOURCE", "2025 programme spend")
    s = set_run_text(s, "#% Addressable Spend", d["prog_pct"])
    if d["crf_prog"]:
        s = set_run_text(s, "$75m", d["crf_prog"], unhighlight=False)
    else:
        s = set_run_text(s, "$75m", "$TBC", unhighlight=False)
    s = set_run_text(s, "#% IHG –influenced Spend", "TBC% IHG-influenced Spend", unhighlight=False)
    s = set_run_text(s, "$2m", d["crf_coll"])
    s = set_run_text(s, "#% avg. of CRF Prog Spend", d["crf_coll_pct"])
    # chart heading and think-cell labels
    s = s.replace("<a:t>EMEAA Add. Spend &amp; </a:t>", f"<a:t>{esc(d['chart_title'].split(' Add.')[0])} Add. Spend &amp; </a:t>")
    s = s.replace("<a:t>5,464</a:t>", f"<a:t>{d['add_label'].strip('$m')}</a:t>")
    s = s.replace("<a:t>164</a:t>", f"<a:t>{d['prog_label'].strip('$m')}</a:t>", 1)
    # bars: IT, Operate, Open, Build; Operate is drawn truncated (break marker) when it dwarfs the rest
    cap = d["cap"]
    order = ["IT", "Operate", "Open", "Build"]
    others = max(cap[k] for k in order if k != "Operate")
    truncate = cap["Operate"] > AXIS_MAX and cap["Operate"] > others * 1.5
    if truncate:
        k = min(1.0, 2.99 / others)
        disp = {x: (AXIS_MAX if x == "Operate" else cap[x] * k) for x in order}
    else:
        k = AXIS_MAX / max(cap.values())
        disp = {x: cap[x] * k for x in order}
        s = re.sub(r"<p:sp>(?:(?!</p:sp>).)*name=\"Freeform: Shape 104[78]\"(?:(?!</p:sp>).)*</p:sp>", "", s, flags=re.S)
    old_lbl = {"IT": "3.0%", "Operate": "9.2%", "Open": "1.2%", "Build": "0.3%"}
    for key in order:
        txt = f"{cap[key]:.1f}%" if cap[key] >= 0.1 else "<0.1%"
        def fix(sp: str, key=key, txt=txt) -> str:
            if shape_text(sp) != old_lbl[key]:
                return sp
            sp = re.sub(r'(<a:off x=")\d+(")', lambda m: f"{m.group(1)}{int(LBL_A + LBL_B * disp[key])}{m.group(2)}", sp, count=1)
            return sp.replace(f"<a:t>{old_lbl[key]}</a:t>", f"<a:t>{esc(txt)}</a:t>")
        s = edit_shapes(s, fix)
    # insights
    if d["insights"]:
        for (oh, ob), (nh, nb) in zip(
                [("Build is the real gap", "Build is 48% of EMEAA’s addressable spend but only 0.3% runs on programme. Operate, at 27% of spend, is where we already capture most (9.2%)"),
                 ("Our growth is shifting east", "On IHG pipeline-vs-base growth, India leads the estate with Thailand/Vietnam (and KSA — all best won at signing"),
                 ("Scale is consolidating against us", "Entegra acquired Prestige Purchasing UK (April 2026) and three conglomerates now control 25% of GPO spend — it hit our most mature market first, and their scale challenges the value we offer owners")],
                d["insights"]):
            s = s.replace(f"<a:t>{esc(oh)}</a:t>", f"<a:t>{esc(nh)}</a:t>")
            s = s.replace(f"<a:t>{esc(ob)}</a:t>", f"<a:t>{esc(nb)}</a:t>")
    s = edit_shapes(s, lambda sp: replace_shape_paras(sp, [d["source"]]) if 'name="Source Note"' in sp else sp)
    path.write_text(s, "utf-8")

    stacked, bars = charts_of(path)
    set_series_values(stacked, [[a, p] for a, p in zip(d["add"], d["prog"])], hide_below=3)
    set_series_values(bars, [[round(disp[k], 4) for k in order]])


def populate_15(path: Path, region: str) -> None:
    s = path.read_text("utf-8")
    s = s.replace("<a:t>[ ]</a:t>", f"<a:t>{esc(region)}</a:t>", 1)  # title slot
    grid = OVERVIEW[region]
    names = [["Rectangle 49", "Rectangle 50", "Rectangle 51"], ["Rectangle 55", "Rectangle 56", "Rectangle 57"]]
    for r in range(2):
        for c in range(3):
            nm, texts = names[r][c], grid[r][c]
            s = edit_shapes(s, lambda sp, nm=nm, texts=texts: replace_shape_paras(sp, texts) if f'name="{nm}"' in sp else sp)
    path.write_text(s, "utf-8")


def populate_16(path: Path, region: str) -> None:
    s = path.read_text("utf-8")
    s = s.replace("[ initiative and support overview ]", esc(region), 1)
    for (ins, ini, cost), (a, b, c) in zip(APPROACH_BOXES, APPROACH[region]):
        for nm, texts in ((ins, a), (ini, b), (cost, c)):
            s = edit_shapes(s, lambda sp, nm=nm, texts=texts: replace_shape_paras(sp, texts) if f'name="{nm}"' in sp else sp)
    path.write_text(s, "utf-8")


def main() -> None:
    files = slide_order()
    slides = PPT / "slides"
    for ri, region in enumerate(["AMER", "EMEAA", "Greater China"]):
        base = 2 + ri * 9  # divider index; region slides follow (src 14..21)
        populate_14(slides / files[base + 1], region)
        populate_15(slides / files[base + 2], region)
        populate_16(slides / files[base + 3], region)
    print("populated")


if __name__ == "__main__":
    main()


# ================================================================================================
# Slides 17 (Sequencing & Dependencies) and 18 (2027-2030 Budgeting)
# ================================================================================================
# Gantt columns: 0 26-Q4, 1 27-Q1, 2 27-Q2, 3 27-Q3, 4 27-Q4, 5 2028 H1, 6 2028 H2, 7 2029, 8 2030
# Each row: (label, start col, end col, bar text). Milestones: (row 1-7, col). "Central:" rows are the
# region's delivery of a centrally scoped initiative (PLT deck slides 23-36).
GANTT = {
    "AMER": dict(
        rows=[("US Operate compliance (CMH)", 0, 4, "Locked order guides, P2P utilisation"),
              ("Central: Managed Estate – FDD reform", 1, 4, "FDD legal review → opt-out"),
              ("FF&E timeline and waivers", 1, 4, "19 → 9.5 months; new waivers"),
              ("EME activation", 2, 6, "Energy, renewables, engineering"),
              ("Mexico & LAC localisation", 3, 7, "Local standards, suppliers, distribution"),
              ("Central: Commercial Engine / OHES", 0, 5, "Owner insight → CRM and OHES live"),
              ("Central: Scaling with Partners (GPO)", 1, 4, "GPO options and safeguards")],
        milestones=[(2, 2), (6, 3), (7, 5)],
        rollup="Baseline is 2025 actual: $902m programme capture on $18.9bn addressable spend, a 4.8% capture "
               "rate. Accelerate adds $546m and step-change $436m by 2030, taking share to ~10%. CRF is earned at "
               "a flat 2.4% yield and rises from $21.7m to ~$47m.",
    ),
    "EMEAA": dict(
        rows=[("Win Build at signing", 1, 8, "KSA, SE Asia, India, then Europe and Japan"),
              ("Central: Managed Estate pilot", 1, 4, "Model Q1 → EAPAC / IMEA pilot"),
              ("Close programme white space", 1, 6, "Coverage map H1 27, then fill gaps"),
              ("Simplify & flex CRF", 0, 2, "Kill the 3% myth"),
              ("Central: Commercial Engine", 1, 5, "Owner CRM and key accounts"),
              ("Consolidate supply / ESM", 2, 6, "27–28 renewal cycle"),
              ("Central: Scaling with Partners", 1, 8, "GPO deal 2027, integrate from 2028")],
        milestones=[(2, 2), (3, 2), (5, 5)],
        rollup=None,  # keep the EMEAA team's own text
    ),
    "Greater China": dict(
        rows=[("POPD access & integration", 0, 3, "Non-retroactive waiver checks"),
              ("Central: Managed Estate – AI controls", 1, 4, "AI-enforced compliance, Touchpoint"),
              ("OBSM / standard products", 0, 5, "P2P and AI-led data collection"),
              ("Lead constructors (Build)", 2, 7, "Legal review → consultant SRM"),
              ("Long tail & F&B non-standard", 3, 8, "Aggregators and distribution"),
              ("Central: Commercial Engine", 1, 5, "POPD–CRM, KOM tracking"),
              ("NGSC export – DDP model", 1, 6, "Extend to appliances, flooring")],
        milestones=[(1, 3), (4, 2), (2, 4)],
        rollup="Baseline is 2025 actual: $93m programme capture on $4.6bn addressable spend, a 2.0% capture "
               "rate. Accelerate adds $15–22m and step-change $63–122m by 2030 (~4% share). CRF is earned at "
               "2.1–2.5% and rises from $1.9m to ~$6m.",
    ),
}

EMU = 914400
G_X0, G_LABEL_W, G_COL_W, G_Y0 = 0.269, 1.859, 1.215, 1.3
G_ROW_H = [0.387, 0.756] + [0.527] * 6


def gantt_row_centre(r: int) -> float:  # r = 1..7
    return G_Y0 + sum(G_ROW_H[:r]) + G_ROW_H[r] / 2


def set_xfrm(sp: str, x: float, y: float, cx: float | None = None) -> str:
    def rep(m: re.Match) -> str:
        w = int(cx * EMU) if cx is not None else int(m.group(3))
        return f'<a:off x="{int(x * EMU)}" y="{int(y * EMU)}"/><a:ext cx="{w}" cy="{m.group(4)}"/>'
    return re.sub(r'<a:off x="(-?\d+)" y="(-?\d+)"/>\s*<a:ext cx="(\d+)" cy="(\d+)"/>', rep, sp, count=1)


def set_cell(tc: str, text: str) -> str:
    """Set a table cell to one run of text, keeping the cell's run (or end-paragraph) formatting."""
    p = re.search(r"<a:p>.*?</a:p>|<a:p [^>]*>.*?</a:p>", tc, re.S).group(0)
    ppr = re.search(r"<a:pPr\b[^>]*/>|<a:pPr\b[^>]*>.*?</a:pPr>", p, re.S)
    rpr = re.search(r"<a:rPr\b[^>]*/>|<a:rPr\b[^>]*>.*?</a:rPr>", p, re.S)
    if rpr:
        rpr_s = rpr.group(0)
    else:
        e = re.search(r"<a:endParaRPr\b([^>]*?)(/>|>(.*?)</a:endParaRPr>)", p, re.S)
        rpr_s = f"<a:rPr{e.group(1)}/>" if e and e.group(2) == "/>" else (f"<a:rPr{e.group(1)}>{e.group(3)}</a:rPr>" if e else "<a:rPr lang=\"en-GB\"/>")
    new_p = f"<a:p>{ppr.group(0) if ppr else ''}<a:r>{rpr_s}<a:t>{esc(text)}</a:t></a:r></a:p>"
    body_start = tc.find("<a:p")
    body_end = tc.rfind("</a:p>") + len("</a:p>")
    return tc[:body_start] + new_p + tc[body_end:]


def table_rows(gf: str) -> list[str]:
    return re.findall(r"<a:tr\b.*?</a:tr>", gf, re.S)


def row_cells(tr: str) -> list[str]:
    return re.findall(r"<a:tc\b.*?</a:tc>", tr, re.S)


def fill_table(s: str, frame_name: str, grid: dict[tuple[int, int], str]) -> str:
    """grid maps (row, col) -> text for the named table graphicFrame."""
    def fix_frame(m: re.Match) -> str:
        gf = m.group(0)
        if f'name="{frame_name}"' not in gf:
            return gf
        for ri, tr in enumerate(table_rows(gf)):
            new_tr = tr
            for ci, tc in enumerate(row_cells(tr)):
                if (ri, ci) in grid:
                    new_tr = new_tr.replace(tc, set_cell(tc, grid[(ri, ci)]), 1)
            gf = gf.replace(tr, new_tr, 1)
        return gf
    return re.sub(r"<p:graphicFrame>.*?</p:graphicFrame>", fix_frame, s, flags=re.S)


def populate_17(path: Path, region: str) -> None:
    g = GANTT[region]
    s = path.read_text("utf-8")
    s = s.replace("<a:t>[ ]</a:t>", f"<a:t>{esc(region)}</a:t>", 1)
    grid = {(r, 0): lbl for r, (lbl, *_rest) in enumerate(g["rows"], start=1)}
    if g["rollup"]:
        grid[(8, 1)] = g["rollup"]
    s = fill_table(s, "Assumptions Table", grid)
    # bars: Arrow: Pentagon 1..7 -> rows 1..7
    for i, (lbl, c0, c1, text) in enumerate(g["rows"], start=1):
        x = G_X0 + G_LABEL_W + c0 * G_COL_W + 0.05
        w = (c1 - c0 + 1) * G_COL_W - 0.1
        y = gantt_row_centre(i) - 0.12
        def fix(sp: str, i=i, x=x, y=y, w=w, text=text) -> str:
            if f'name="Arrow: Pentagon {i}"' not in sp:
                return sp
            sp = set_xfrm(sp, x, y, w)
            return replace_shape_paras(sp, [text])
        s = edit_shapes(s, fix)
    # milestones: reuse the diamonds, drop the spares
    diamonds = ["Flowchart: Decision 8", "Flowchart: Decision 9", "Flowchart: Decision 10",
                "Flowchart: Decision 11", "Flowchart: Decision 13"]
    for k, nm in enumerate(diamonds):
        if k < len(g["milestones"]):
            r, _c = g["milestones"][k]
            end_col = g["rows"][r - 1][2]
            x = G_X0 + G_LABEL_W + (end_col + 1) * G_COL_W + 0.02  # decision / go-live just after the bar
            y = gantt_row_centre(r) - 0.12
            s = edit_shapes(s, lambda sp, nm=nm, x=x, y=y: set_xfrm(sp, x, y) if f'name="{nm}"' in sp else sp)
        else:
            s = edit_shapes(s, lambda sp, nm=nm: "" if f'name="{nm}"' in sp else sp)
    path.write_text(s, "utf-8")


# ---------------------------------------------------------------------------------- slide 18
# CRF ($m) by year 26A/B..30F from each region's 2030-opportunity slide (Steady 3%, Accelerate, Step change)
# and the yield used there. Capture ($m) = CRF / yield.
BUDGET = {
    "AMER": dict(S=[21.0, 21.6, 22.2, 22.9, 23.6], A=[0, 2.6, 5.2, 9.2, 13.1], T=[0, 2.0, 4.0, 7.2, 10.5],
                 yld=0.024, yld_txt="2.4%", unit="$bn",
                 lever1=("EME activation", 163 / 546),
                 lever3="Step-change"),
    "EMEAA": dict(S=[4.7, 4.9, 5.0, 5.2, 5.3], A=[0, 1.1, 3.0, 5.4, 7.8], T=[0, 0, 0.4, 1.2, 2.0],
                  yld=0.021, yld_txt="2.1%", unit="$bn",
                  lever1=("Win Build at signing", None),  # phased from the initiatives table
                  lever3="Step-change (GPO)"),
    "Greater China": dict(S=[2.0, 2.1, 2.2, 2.2, 2.3], A=[0, 0.1, 0.2, 0.4, 0.6], T=[0, 0.2, 0.7, 1.6, 3.1],
                          yld=0.025, yld_txt="2.1–2.5%", unit="$m",
                          lever1=("Standard products", 12 / 22),
                          lever3="Step-change"),
}
EMEAA_BUILD_CAPTURE = [0, 15, 48, 94, 143]  # $m, EMEAA initiatives table

CH_MAX_EMEAA, CH_K, CH_BASE, CH_TOT_OFF = 706.34635523736301, 1915.6, 3629624, 177867
CH_COL_X = [2111375, 2862263, 3614738, 4365625, 5116513]


def money(v: float) -> str:
    return "-" if abs(v) < 0.05 else f"{v:.1f}"


def populate_18(path: Path, region: str) -> None:
    b = BUDGET[region]
    S, A, T = b["S"], b["A"], b["T"]
    s = path.read_text("utf-8")
    s = s.replace("<a:t>[ ]</a:t>", f"<a:t>{esc(region)}</a:t>", 1)
    short = {"Greater China": "GC"}.get(region, region)
    s = s.replace("Indicative EMEA Spend on GP Programs", f"Indicative {esc(short)} Spend on GP Programs")
    if b["unit"] != "$bn":
        s = s.replace("$bn, 2026A", f"{b['unit']}, 2026A")

    # lever split (rounded so rows add up)
    if b["lever1"][1] is None:
        a1 = [round(c * b["yld"], 1) for c in EMEAA_BUILD_CAPTURE]
    else:
        a1 = [round(a * b["lever1"][1], 1) for a in A]
    a2 = [round(a - x, 1) for a, x in zip(A, a1)]
    budget = [round(x + y, 1) for x, y in zip(S, A)]
    high = [round(x + y + z, 1) for x, y, z in zip(S, A, T)]

    # left: CRF collected (row 1 = yield, row 2 = high, row 3 = budget)
    g = {(0, 1): b["yld_txt"]}
    for i in range(5):
        g[(1, i + 1)] = money(high[i])
        g[(2, i + 1)] = money(budget[i])
    s = fill_table(s, "Table 266", g)
    # left: cost base and net position — regional cost base not in the source packs
    for frame in ("Table 208", "Table 211"):
        g = {}
        for r in (0, 1):
            g[(r, 1)] = "TBC"
            for i in range(1, 5):
                g[(r, i + 1)] = ""
        s = fill_table(s, frame, g)
    # right: CRF $M by source, Budget (cols 1-5) and High (cols 7-11) scenarios
    rows = {1: ("Existing (3% share)", S, S),
            2: (b["lever1"][0], a1, a1),
            3: ("Other accelerate", a2, a2),
            4: (b["lever3"], [0] * 5, T),
            5: ("Total", budget, high),
            6: ("3% Baseline", S, S),
            7: ("Incremental CRF", [round(x - y, 1) for x, y in zip(budget, S)],
                [round(x - y, 1) for x, y in zip(high, S)])}
    g = {}
    for r, (label, bud, hi) in rows.items():
        g[(r, 0)] = label
        for i in range(5):
            g[(r, 1 + i)] = money(bud[i])
            g[(r, 7 + i)] = money(hi[i])
    s = fill_table(s, "Table 228", g)
    # right: cost base — TBC
    g = {(r, c): "" for r in range(1, 8) for c in list(range(1, 6)) + list(range(7, 12))}
    g[(5, 1)] = "TBC"
    g[(5, 7)] = "TBC"
    s = fill_table(s, "Table 238", g)

    if region != "EMEAA":  # EMEAA keeps its own chart and labels; others are re-plotted
        cap_s = [x / b["yld"] if region != "Greater China" else x / 0.021 for x in S]
        cap_a = [x / b["yld"] for x in A]
        cap_t = [x / b["yld"] for x in T]
        if region == "Greater China":  # use the regional ranges' upper ends: $22m / $122m by 2030
            cap_a = [a * 22 / (A[-1] / b["yld"]) for a in cap_a]
            cap_t = [t * 122 / (T[-1] / b["yld"]) for t in cap_t]
        totals = [x + y + z for x, y, z in zip(cap_s, cap_a, cap_t)]
        vmax = max(totals)
        k = CH_K * CH_MAX_EMEAA / vmax
        stacked = charts_of(path)[0]
        c = stacked.read_text("utf-8")
        c = re.sub(r'<c:max val="[^"]*"', f'<c:max val="{vmax}"', c)
        stacked.write_text(c, "utf-8")
        set_series_values(stacked, [[round(v, 2) for v in cap_s], [round(v, 2) for v in cap_a[1:]],
                                    [round(v, 2) for v in cap_t[1:]]])
        # think-cell growth connectors no longer match the bars: remove them
        s = re.sub(r"<p:cxnSp>(?:(?!</p:cxnSp>).)*name=\"Straight Connector (?:213|214|26|27|22|21|19|31|251|12|255|254|11|25|3)\""
                   r"(?:(?!</p:cxnSp>).)*</p:cxnSp>", "", s, flags=re.S)
        # totals above bars
        fmt = (lambda v: f"{v / 1000:.1f}") if b["unit"] == "$bn" else (lambda v: f"{v:.0f}")
        old_tot = ["0.2", "0.3", "0.4", "0.6", "0.7"]
        for i, ot in enumerate(old_tot):
            y = CH_BASE - totals[i] * k - CH_TOT_OFF
            s = edit_shapes(s, lambda sp, ot=ot, i=i, y=y: set_xfrm(
                sp.replace(f"<a:t>{ot}</a:t>", f"<a:t>{fmt(totals[i])}</a:t>"),
                (CH_COL_X[i] - 117475) / EMU, y / EMU) if shape_text(sp) == ot and 'name="Text Placeholder 2"' in sp else sp)
        # segment shares: 12 labels -> (col, series) for 27B..30F
        slots = [(c, sr) for c in range(1, 5) for sr in range(3)]
        order_old = {  # template label text by (col, series): steady, accel, step
            (1, 0): "82%", (1, 1): "18%", (1, 2): "0%", (2, 0): "59%", (2, 1): "35%", (2, 2): "5%",
            (3, 0): "44%", (3, 1): "46%", (3, 2): "10%", (4, 0): "35%", (4, 1): "52%", (4, 2): "13%"}
        # pass 1: tag each template label with a unique token (texts repeat, e.g. two "35%")
        for (col, sr) in slots:
            target = order_old[(col, sr)]
            def tag(sp: str, target=target, col=col, sr=sr) -> str:
                if 'name="Text Placeholder 2"' not in sp or shape_text(sp) != target:
                    return sp
                x0 = int(re.search(r'<a:off x="(\d+)"', sp).group(1))
                if abs(x0 + 160000 - CH_COL_X[col]) > 400000:
                    return sp
                return sp.replace(f"<a:t>{target}</a:t>", f"<a:t>@@{col}{sr}@@</a:t>", 1)
            s = edit_shapes(s, tag)
        # pass 2: set share text and centre each label on its segment (hide slivers < 4%)
        for (col, sr) in slots:
            segs = [cap_s[col], cap_a[col], cap_t[col]]
            share = segs[sr] / totals[col]
            yc = CH_BASE - (sum(segs[:sr]) + segs[sr] / 2) * k - 75406
            txt = f"{share * 100:.0f}%" if segs[sr] * k >= 130000 else ""
            def place(sp: str, col=col, sr=sr, txt=txt, yc=yc) -> str:
                if f"<a:t>@@{col}{sr}@@</a:t>" not in sp:
                    return sp
                w = int(re.search(r'<a:ext cx="(\d+)"', sp).group(1))
                return set_xfrm(sp.replace(f"<a:t>@@{col}{sr}@@</a:t>", f"<a:t>{txt}</a:t>"),
                                (CH_COL_X[col] - w / 2) / EMU, yc / EMU)
            s = edit_shapes(s, place)
    path.write_text(s, "utf-8")


def main_17_18() -> None:
    files = slide_order()
    slides = PPT / "slides"
    for ri, region in enumerate(["AMER", "EMEAA", "Greater China"]):
        base = 2 + ri * 9
        populate_17(slides / files[base + 4], region)
        populate_18(slides / files[base + 5], region)
    print("populated 17-18")


if __name__ == "__main__":
    main_17_18()
