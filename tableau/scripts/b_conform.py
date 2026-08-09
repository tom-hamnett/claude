"""Conform the programme-spend fact table to the market-spend taxonomy.

WHY THIS EXISTS
---------------
Fact_Spend_Agg (the market model) and Fact_Programme_Spend (what IHG actually captured)
were built from different source systems with different vocabularies:

  * market model     : FF&E, F&B, Energy, OS&E, MRO, Hotel Tech, HR, ADVISORY, ...
  * programme tracker: 43 level-2 categories under 11 level-1 headings

They also carry hotel attributes on different sides — segment, chain scale and market
type sit on the market model but not on the programme tracker.

Consequence before this fix: slicing Headroom (= directly addressable - programme spend)
by category, segment, chain scale, market type or priority market filtered ONLY the
market side. Programme spend came back at its full $1,158.4m in every single cell, so
every one of those charts was wrong.

WHAT THIS DOES
--------------
1. Maps each programme level-2 category onto the market taxonomy (crosswalk below).
2. Inherits chain scale, segment, market type and priority market from the hotel master
   via hotel_code -> InnCode (all 222 programme hotels join).
3. Emits five conformed dimension tables so both facts filter together.

WHAT IT REVEALS
---------------
$293.2m of programme spend (25.3%) sits in categories the market model does not treat as
addressable at all - HR, Travel, Management charges, Advisory, Marketing. So the headline
7.60% capture rate has a numerator ~25% wider than its denominator. Like-for-like across
matched categories only, capture is 5.68%. Both are now available as measures; neither is
hidden.

Run after b_prog.py.  Usage: python3 b_conform.py <data-folder>
"""
import csv, os, sys, duckdb

DATA = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "data")
p = lambda f: os.path.join(DATA, f)

# --------------------------------------------------------------------------------------
# Category crosswalk: programme level-2 -> market-model category.
# Built by inspection of all 43 level-2 values; every one is assigned.
# 'Unmapped' is deliberate, not a gap - those rows are genuinely outside the market model.
# --------------------------------------------------------------------------------------
CROSSWALK = {
    # Advisory
    "CONSULTANCY": "ADVISORY", "FINANCIAL SERVICES": "ADVISORY", "LEGAL": "ADVISORY",
    "TRANSLATIONS SERVICES": "ADVISORY",
    # FF&E - includes the build-stage lines; the market model books all modelled build as FF&E
    "CONSTRUCTION": "FF&E", "ELECTRICAL, PLUMBING & MECHANICAL": "FF&E",
    "HOTEL OPENING EQUIPMENT": "FF&E",
    "FURNITURE, FIXTURES & EQUIPMENT HARD GOODS": "FF&E",
    "FURNITURE, FIXTURES & EQUIPMENT SOFT GOODS": "FF&E",
    # Operate
    "FOOD & BEVERAGE": "F&B", "ENERGY": "Energy",
    "OPERATING SUPPLIES & EQUIPMENT": "OS&E",
    "MAINTENANCE, REPAIR & OPERATIONS": "MRO",
    # People
    "BENEFITS": "HR", "RESOURCING": "HR", "OUTSOURCED SERVICES": "HR",
    "EMPLOYEE ENGAGEMENT": "HR", "LEARNING & DEVELOPMENT": "HR",
    "STAFF MOBILITY": "HR", "FLEET": "HR",
    # Corporate property / charges
    "PROPERTY OCCUPATION": "Mgmt Charges, Taxes / Fees",
    "MANAGEMENT": "Mgmt Charges, Taxes / Fees",
    "BUSINESS SUPPORT": "Mgmt Charges, Taxes / Fees",
    "BUILDING OPERATION": "Mgmt Charges, Taxes / Fees",
    # Technology
    "HOTEL TECHNOLOGY": "Hotel Tech, Hardware, Software, Telecom",
    "IT SERVICES": "Hotel Tech, Hardware, Software, Telecom",
    "IT SOFTWARE": "Hotel Tech, Hardware, Software, Telecom",
    "TELECOM": "Hotel Tech, Hardware, Software, Telecom",
    "IT HARDWARE": "Hotel Tech, Hardware, Software, Telecom",
    # Travel
    "OTHER": "TRAVEL", "TRAVEL AGENTS": "TRAVEL", "AIRLINES": "TRAVEL",
    # Outside the market model
    "NON-PROCUREMENT": "Unmapped", "UNCLASSIFIED": "Unmapped",
}
for k in ("EVENTS & TRADE SHOWS", "MARKETING AGENCIES", "MARKET RESEARCH & INSIGHTS",
          "TACTICAL AGENCY SERVICES", "FULFILMENT", "DIGITAL",
          "PRINT & PROMOTIONAL MERCHANDISE", "MEDIA & SPONSORSHIP", "COST OF SALES"):
    CROSSWALK[k] = "MARKETING"

# Attributes inherited from the hotel master, and the conformed dimension each one feeds
INHERITED = ["chain_scale", "segment_group", "market_categorisation", "priority_market"]

c = duckdb.connect()
c.execute(f"""create table prog as select * from read_csv_auto('{p("Fact_Programme_Spend.csv")}',
              header=true, types={{'hotel_code':'VARCHAR'}})""")
c.execute(f"""create table hotel as select * from read_csv_auto('{p("Dim_Hotel.csv")}',
              header=true, types={{'InnCode':'VARCHAR'}})""")
c.execute(f"""create table agg as select * from read_csv_auto('{p("Fact_Spend_Agg.csv")}', header=true)""")
c.execute("create table xw(category_l2 varchar, category varchar)")
c.executemany("insert into xw values (?,?)", list(CROSSWALK.items()))

missing = c.execute("select distinct category_l2 from prog where category_l2 not in "
                    "(select category_l2 from xw)").fetchall()
if missing:
    raise SystemExit(f"Crosswalk incomplete - unmapped level-2 categories: {missing}")

drop = [col for col in ["category", "in_market_model"] + INHERITED
        if col in [d[0] for d in c.execute("describe prog").fetchall()]]
keep = [d[0] for d in c.execute("describe prog").fetchall() if d[0] not in drop]

DA = "addressability='Addressable' and lifecycle_stage<>'BUILD' and ihg_flag='IHG'"
c.execute(f"""create table base as
 select category from agg where {DA} group by 1 having sum(spend) > 0""")

c.execute(f"""create table prog2 as
 select {', '.join('p.'+k for k in keep)},
        xw.category                       as category,
        case when b.category is null then 'N' else 'Y' end as in_market_model,
        coalesce(h.chain_scale,'Unknown')          as chain_scale,
        coalesce(h.segment_group,'Unknown')        as segment_group,
        coalesce(h.market_categorisation,'Unknown') as market_categorisation,
        coalesce(h.priority_market,'Unknown')      as priority_market
 from prog p
 join xw on p.category_l2 = xw.category_l2
 left join base b on xw.category = b.category
 left join hotel h on p.hotel_code = h.InnCode""")

n_in = c.execute("select count(*) from prog").fetchone()[0]
n_out = c.execute("select count(*) from prog2").fetchone()[0]
assert n_in == n_out, f"row count changed: {n_in} -> {n_out}"
unjoined = c.execute("select count(*) from prog2 where chain_scale='Unknown'").fetchone()[0]

c.execute(f"copy prog2 to '{p('Fact_Programme_Spend.csv')}' (header, delimiter ',')")

# --------------------------------------------------------------------------------------
# Conformed dimensions - union of values on both sides, so a slicer never hides one side
# --------------------------------------------------------------------------------------
DIMS = {
    "Dim_Category":   ("category", "category_name"),
    "Dim_ChainScale": ("chain_scale", "chain_scale_name"),
    "Dim_Segment":    ("segment_group", "segment_name"),
    "Dim_Market":     ("market_categorisation", "market_name"),
    "Dim_Priority":   ("priority_market", "priority_name"),
}
for tbl, (col, label) in DIMS.items():
    vals = [r[0] for r in c.execute(
        f"select distinct {col} from agg where {col} is not null "
        f"union select distinct {col} from prog2 where {col} is not null "
        f"order by 1").fetchall()]
    with open(p(f"{tbl}.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow([col, label, "sort_order"])
        for i, v in enumerate(vals):
            w.writerow([v, v, i])
    print(f"{tbl}.csv  {len(vals)} values")

# --------------------------------------------------------------------------------------
# Report what the fix changes
# --------------------------------------------------------------------------------------
res = c.execute(f"""
with da as (select category, sum(spend) da from agg where {DA} group by 1),
     ps as (select category, sum(spend) ps from prog2
            where measure='Programme (P2P) Spend' group by 1)
select coalesce(da.category, ps.category), coalesce(da,0), coalesce(ps,0)
from da full join ps using(category) order by 2 desc""").fetchall()

tot_da = sum(r[1] for r in res)
tot_ps = sum(r[2] for r in res)
orphan = sum(r[2] for r in res if r[1] == 0)

print(f"\nFact_Programme_Spend.csv rewritten: {n_out:,} rows, "
      f"{len(INHERITED)+1} columns added, {unjoined} rows without a hotel match")
print("\nCapture rate by category (now computable):")
for cat, da, ps in res:
    rate = f"{100*ps/da:6.2f}%" if da else "   n/a"
    print(f"  {cat:<42} {da/1e9:>7.2f}bn  {ps/1e6:>8.1f}m  {rate}")
print(f"\n  Headline capture rate                      {100*tot_ps/tot_da:.2f}%  "
      f"(all programme spend / directly addressable)")
print(f"  Like-for-like capture rate                 {100*(tot_ps-orphan)/tot_da:.2f}%  "
      f"(matched categories only)")
print(f"  Programme spend with no addressable base   ${orphan/1e6:,.1f}m "
      f"({100*orphan/tot_ps:.1f}% of programme spend)")
