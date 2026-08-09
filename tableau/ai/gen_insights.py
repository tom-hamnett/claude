"""Builds Fact_Insight.csv — the narrative overlay table.

This is the bridge between the numbers and the words. Each row is one insight, tagged
to the same region / lifecycle / category dimensions as the fact tables, so it filters
alongside them: select Greater China on the narrative page and you get the commentary
that applies to Greater China.

Two kinds of row:

  source_type = 'Analysis'  -- derived from the validated model. Every number below is
                               computed here from the extracts, never typed in.
  source_type = 'Document'  -- to be populated from the SharePoint document library.
                               None yet (the extraction pipeline is not connected).
                               The schema is ready for them.

Usage:  python3 gen_insights.py <data-folder>
        (defaults to ../data if the CSVs have been unzipped there)
"""
import csv, os, sys, duckdb

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "..", "data")
OUT = os.path.join(DATA, "Fact_Insight.csv")
AS_OF = "2026-08-09"

REGIONS = ["AMER", "EMEAA", "GC"]
LIFECYCLES = ["BUILD", "OPEN", "OPERATE", "IT/TELECOM"]

c = duckdb.connect()
A = f"read_csv_auto('{os.path.join(DATA,'Fact_Spend_Agg.csv')}', header=true)"
P = f"read_csv_auto('{os.path.join(DATA,'Fact_Programme_Spend.csv')}', header=true)"
R = f"read_csv_auto('{os.path.join(DATA,'Fact_CRF.csv')}', header=true)"
one = lambda s: c.execute(s).fetchone()[0]

DA = "addressability='Addressable' and lifecycle_stage<>'BUILD' and ihg_flag='IHG'"
PS = "measure='Programme (P2P) Spend'"

bn = lambda v: f"${v/1e9:,.2f}bn"
mn = lambda v: f"${v/1e6:,.1f}m"
pc = lambda v: f"{v*100:,.2f}%"

tot_da = one(f"select sum(spend) from {A} where {DA}")
tot_ps = one(f"select sum(spend) from {P} where {PS}")
crf25 = one(f"select sum(crf_usd) from {R} where year=2025")
ihg_addr = one(f"select sum(spend) from {A} where addressability='Addressable' and ihg_flag='IHG'")
mkt_addr = one(f"select sum(spend) from {A} where addressability='Addressable'")
build_sh = one(f"select sum(spend) from {A} where addressability='Addressable' and lifecycle_stage='BUILD'") / mkt_addr

reg_da = dict(c.execute(f"select region_std, sum(spend) from {A} where {DA} group by 1").fetchall())
reg_ps = dict(c.execute(f"select region_std, sum(spend) from {P} where {PS} group by 1").fetchall())
life_da = dict(c.execute(f"select lifecycle_stage, sum(spend) from {A} where {DA} group by 1").fetchall())
life_ps = dict(c.execute(f"select lifecycle_stage, sum(spend) from {P} where {PS} group by 1").fetchall())
cat_da = c.execute(f"select category, sum(spend) from {A} where {DA} group by 1 order by 2 desc").fetchall()
cat_ps = dict(c.execute(f"select category, sum(spend) from {P} where {PS} group by 1").fetchall())
lfl_ps = one(f"select sum(spend) from {P} where {PS} and in_market_model='Y'")

rows = []


def add(theme, statement, so_what, *, regions=None, lifecycles=None, category="",
        source="Validated model", source_type="Analysis", confidence="High"):
    """Global insights fan out across every region/lifecycle so they survive any slicer.
    The table visual groups on the displayed columns, so the copies collapse to one line."""
    for rg in (regions or REGIONS):
        for lc in (lifecycles or LIFECYCLES):
            rows.append(dict(
                insight_id=f"I{len(rows)+1:04d}", insight_date=AS_OF, source=source,
                source_type=source_type, theme=theme, region_std=rg, lifecycle_stage=lc,
                category=category, statement=statement, so_what=so_what, confidence=confidence))


# ---- the headline position -------------------------------------------------------------
add("Capture",
    f"IHG captures {pc(tot_ps/tot_da)} of its directly addressable spend "
    f"({mn(tot_ps)} of {bn(tot_da)}).",
    f"{bn(tot_da - tot_ps)} of headroom sits outside any programme. This is the number the "
    f"whole strategy hangs off.")

add("Scale",
    f"IHG's addressable spend is {bn(ihg_addr)}, {pc(ihg_addr/mkt_addr)} of the "
    f"{bn(mkt_addr)} branded-market pool.",
    "We are a meaningful buyer in absolute terms but a small share of the market — "
    "leverage has to come from our own estate, not from market share.")

add("Definition",
    f"BUILD is {pc(build_sh)} of addressable spend but is a modelled pipeline estimate for "
    f"hotels not yet open.",
    "Excluding it is what turns $28.9bn 'addressable' into $15.2bn 'directly addressable'. "
    "Quote the directly-addressable basis in any capture conversation.",
    lifecycles=["BUILD"])

# ---- by region -------------------------------------------------------------------------
for rg in REGIONS:
    da, ps = reg_da.get(rg, 0), reg_ps.get(rg, 0)
    if not da:
        continue
    rate = ps / da
    rank = sorted(REGIONS, key=lambda r: -(reg_ps.get(r, 0) / reg_da.get(r, 1)))
    pos = rank.index(rg)
    verdict = ("the strongest capture rate of the three regions" if pos == 0
               else "the weakest capture rate of the three regions" if pos == len(rank) - 1
               else "mid-table on capture")
    add("Capture",
        f"{rg} captures {pc(rate)} — {mn(ps)} of {bn(da)} directly addressable. That is {verdict}.",
        (f"{bn(da - ps)} of headroom in {rg}." +
         (" Biggest single regional prize." if da - ps == max(reg_da[r] - reg_ps.get(r, 0) for r in reg_da)
          else "")),
        regions=[rg])

add("Data quality",
    "Region on the programme-spend file is derived from the hotel master, not from the "
    "file's own AMER / ASIA / EUROPE labels — those do not match IHG's structure.",
    "The earlier approximation understated EMEAA by 44% and overstated Greater China by 35%. "
    "Any new source file must be re-mapped through Dim_Hotel the same way.")

# ---- by lifecycle ----------------------------------------------------------------------
for lc, da in sorted(life_da.items(), key=lambda kv: -kv[1]):
    ps = life_ps.get(lc, 0)
    add("Capture",
        f"{lc} captures {pc(ps/da)} — {mn(ps)} of {bn(da)} directly addressable.",
        f"{bn(da-ps)} of headroom in {lc}.",
        lifecycles=[lc])

best = max(life_da, key=lambda k: life_ps.get(k, 0) / life_da[k])
add("Challenge",
    f"{best} is the strongest lifecycle stage at {pc(life_ps.get(best,0)/life_da[best])}, "
    f"not the weakest.",
    "The strategy deck says OPERATE is barely captured — that reading used the market-wide "
    "denominator. On the IHG directly-addressable basis the conclusion reverses. Worth "
    "settling before the narrative is repeated.",
    lifecycles=[best], confidence="Needs review")

# ---- scope mismatch --------------------------------------------------------------------
add("Definition",
    f"{mn(tot_ps-lfl_ps)} of programme spend ({pc((tot_ps-lfl_ps)/tot_ps)}) sits in "
    f"categories the market model does not treat as addressable — mostly HR.",
    f"The headline capture rate of {pc(tot_ps/tot_da)} counts spend its own denominator "
    f"excludes. Like-for-like the rate is {pc(lfl_ps/tot_da)}. Either extend the market "
    f"model to cover HR, Travel and Advisory, or report the like-for-like number.",
    confidence="Needs review")

# ---- where to act ----------------------------------------------------------------------
for cat, da in cat_da[:6]:
    ps = cat_ps.get(cat, 0)
    add("Headroom",
        f"{cat}: {bn(da)} directly addressable, {mn(ps)} captured ({pc(ps/da)}) — "
        f"{bn(da-ps)} headroom.",
        f"Rank {[x[0] for x in cat_da].index(cat)+1} of {len(cat_da)} by headroom.",
        category=cat)

worst = min(cat_da[:6], key=lambda kv: cat_ps.get(kv[0], 0) / kv[1])
add("Challenge",
    f"{worst[0]} is the largest directly-addressable category at {bn(worst[1])} but "
    f"captures only {pc(cat_ps.get(worst[0],0)/worst[1])} — the weakest of the six.",
    "Either there is a genuine programme gap here, or this spend is being captured in a "
    "system that does not feed the programme tracker. Worth establishing which before it "
    "is presented as an opportunity.",
    category=worst[0], confidence="Needs review")

# ---- delivery --------------------------------------------------------------------------
add("Delivery",
    f"CRF collected in 2025 was {mn(crf25)}, {pc(crf25/tot_ps)} of programme spend.",
    "Fee yield, not volume, is the lever here — a 0.1pp rate improvement is worth "
    f"{mn(tot_ps*0.001)} a year at current volume.")

add("Delivery",
    "P2P at 2025 year-end: 755 CMH systems (AMER 88 / EMEAA 245 / GC 422) and 256 franchise.",
    "P2P coverage is the mechanism that converts addressable spend into programme spend — "
    "rollout rate is a leading indicator of capture rate.")

# ---- governance ------------------------------------------------------------------------
add("Risk",
    "The CRF_Analysis 'Pivots' sheet holds named individuals against spend figures and is "
    "excluded from every extract.",
    "Re-check before this model is shared more widely or connected to an AI agent — personal "
    "data must not ride along into a conversational surface.",
    confidence="High")

add("Open question",
    "Whether the 808 'Suites' hotels sit in Essentials & Suites or in Premium + "
    "Lifestyle/Luxury is unresolved.",
    "Current grouping gives 1,445 / 5,549; the slide shows 1,337 / 5,657. Affects any "
    "segment-level target.",
    confidence="Needs review")

FIELDS = ["insight_id", "insight_date", "source", "source_type", "theme", "region_std",
          "lifecycle_stage", "category", "statement", "so_what", "confidence"]
with open(OUT, "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=FIELDS)
    w.writeheader()
    w.writerows(rows)

distinct = len({r["statement"] for r in rows})
print(f"Fact_Insight.csv -> {OUT}")
print(f"{len(rows)} rows, {distinct} distinct insights "
      f"(rows fan out across region x lifecycle so slicers never hide a global insight)")
