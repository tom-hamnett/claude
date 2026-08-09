"""APEX metric contract — the single source of truth for the AI overlay.

Everything downstream reads from here:
  * powerbi/gen_pbip.py       -> measure DAX, descriptions, display folders, hidden columns
  * ai/gen_contract.py        -> metrics.json, METRICS-CONTRACT.md, linguisticSchema.json,
                                 apex-analyst-system-prompt.md

The point: an AI layer is only as trustworthy as its definitions. If "capture rate"
means two things, the agent will confidently give you the wrong one. This file makes
each metric mean exactly one thing, with a validated value to check against.

VALIDATED_AS_OF values were recomputed from the extracts on the date below, not copied
from a slide.
"""

VALIDATED_AS_OF = "2026-08-09"
SOURCE_DECKS = "Tell Our Story (strategy deck) slides 2/4/5/6/12/13/14; QBR pages 20-27"

# --------------------------------------------------------------------------------------
# MEASURES
# --------------------------------------------------------------------------------------
# name, dax, format, folder, description, synonyms, validated value (None = context-dependent),
# guardrails, natural-language questions it answers
MEASURES = [
    dict(
        name="Total Spend",
        dax="SUM ( Fact_Spend_Agg[spend] )",
        fmt="\\$#,##0",
        folder="00 Base",
        desc=("Raw spend with no addressability filter. The whole branded-hotel spend pool, "
              "including spend procurement cannot influence. Use only for the page 1 waterfall "
              "that shows how the pool narrows. For anything strategic use 'Addressable Spend'."),
        syn=["spend", "total spend", "all spend", "gross spend"],
        value=439_000_000_027.50,
        guards=["Not a decision metric on its own — it includes Unadressable spend."],
        qs=["What is total hotel spend across the branded market?"],
    ),
    dict(
        name="Addressable Spend",
        dax='CALCULATE ( [Total Spend], KEEPFILTERS ( Fact_Spend_Agg[addressability] = "Addressable" ) )',
        fmt="\\$#,##0",
        folder="01 Market",
        desc=("Spend procurement can influence, across the whole branded market (IHG and "
              "competitors). addressability = 'Addressable'. This is the headline market-size "
              "number on strategy slide 4."),
        syn=["addressable", "addressable spend", "procurement addressable",
             "influenceable spend", "market size", "the prize"],
        value=256_361_641_307.20,
        guards=["Whole market, not IHG. For IHG only, use 'IHG Addressable Spend'.",
                "Includes modelled pipeline BUILD — see 'Directly Addressable Spend'."],
        qs=["How big is the procurement-addressable market?",
            "What is the total addressable spend?"],
    ),
    dict(
        name="Directly Addressable Spend",
        dax=('CALCULATE ( [Total Spend], KEEPFILTERS ( Fact_Spend_Agg[addressability] = "Addressable" ), '
             'KEEPFILTERS ( Fact_Spend_Agg[lifecycle_stage] <> "BUILD" ) )'),
        fmt="\\$#,##0",
        folder="01 Market",
        desc=("Addressable spend EXCLUDING modelled pipeline BUILD costs. BUILD is a modelled "
              "construction estimate for hotels not yet open, so it cannot be captured on a "
              "programme today. This is the strategy slide 12/13 basis and the confirmed "
              "definition of 'directly addressable'."),
        syn=["directly addressable", "direct addressable spend", "realistic addressable",
             "addressable excluding build", "capturable spend"],
        value=134_622_962_650.57,
        guards=["Market-wide. Do NOT use as the capture-rate denominator — that needs "
                "'IHG Directly Addressable'. Using this one gives ~0.86% instead of 7.60%."],
        qs=["How much of the market can we realistically address today?"],
    ),
    dict(
        name="IHG Addressable Spend",
        dax='CALCULATE ( [Addressable Spend], KEEPFILTERS ( Fact_Spend_Agg[ihg_flag] = "IHG" ) )',
        fmt="\\$#,##0",
        folder="02 IHG estate",
        desc=("Addressable spend inside the IHG estate only. Strategy slide 4 headline: $28.9bn."),
        syn=["IHG addressable", "our addressable spend", "IHG estate spend",
             "our estate addressable", "IHG spend pool"],
        value=28_913_885_399.05,
        guards=["Includes modelled pipeline BUILD."],
        qs=["How much addressable spend sits in the IHG estate?",
            "What is IHG's own addressable spend?"],
    ),
    dict(
        name="IHG Directly Addressable",
        dax=('CALCULATE ( [Directly Addressable Spend], '
             'KEEPFILTERS ( Fact_Spend_Agg[ihg_flag] = "IHG" ) )'),
        fmt="\\$#,##0",
        folder="02 IHG estate",
        desc=("IHG addressable spend excluding modelled pipeline BUILD. THE denominator for "
              "capture rate and headroom. Confirmed basis (spreadsheet is gospel; the $15.6bn "
              "on the slide is stale)."),
        syn=["IHG directly addressable", "our directly addressable spend",
             "what we can capture", "our realistic pool"],
        value=15_232_133_229.25,
        guards=["This is the ONLY correct capture-rate denominator."],
        qs=["What can IHG realistically capture?",
            "What is our directly addressable spend?"],
    ),
    dict(
        name="IHG Share of Addressable %",
        dax="DIVIDE ( [IHG Addressable Spend], [Addressable Spend] )",
        fmt="0.0%",
        folder="02 IHG estate",
        desc="IHG's share of the global addressable pool. Slide 4: 11.3%.",
        syn=["share of addressable", "IHG share", "share of wallet", "our market share"],
        value=0.1128,
        guards=["Share of the SPEND pool, not share of hotels or rooms."],
        qs=["What share of the addressable market is IHG?"],
    ),
    dict(
        name="Total Market Spend",
        dax="[Total Spend]",
        fmt="\\$#,##0",
        folder="00 Base",
        desc="Alias of 'Total Spend', used on the page 1 framing card.",
        syn=["market spend", "total market"],
        value=439_000_000_027.50,
        guards=[],
        qs=[],
    ),
    dict(
        name="Hotel Count",
        dax="DISTINCTCOUNT ( Fact_Spend[InnCode] )",
        fmt="#,0",
        folder="03 Estate",
        desc=("Distinct hotels with spend data, all brands, no filters. Must be a DISTINCTCOUNT "
              "— Fact_Spend_Agg[hotels] is pre-aggregated and summing it overcounts ~8x."),
        syn=["hotels", "hotel count", "number of hotels", "properties"],
        value=57_638,
        guards=["Never SUM Fact_Spend_Agg[hotels]. That column is a pre-aggregated count."],
        qs=["How many hotels are in the dataset?"],
    ),
    dict(
        name="IHG Hotels",
        dax=('CALCULATE ( DISTINCTCOUNT ( Fact_Spend[InnCode] ), Dim_Hotel[ihg_flag] = "IHG", '
             'Dim_Hotel[contract_status] = "Open - Accepting Guests", '
             'Fact_Spend[addressability] = "Addressable" )'),
        fmt="#,0",
        folder="03 Estate",
        desc=("Open, trading IHG hotels with addressable spend. Ties to the Excel pivot: 6,992. "
              "(Strategy slide 4 shows 7,014 from an earlier extract date — 0.3% apart.)"),
        syn=["IHG hotels", "our hotels", "open hotels", "trading hotels", "estate size"],
        value=6_992,
        guards=["'Open - Accepting Guests' only — excludes Planning Phase pipeline."],
        qs=["How many IHG hotels are open?", "How big is the IHG estate?"],
    ),
    dict(
        name="Programme Spend",
        dax=('CALCULATE ( SUM ( Fact_Programme_Spend[spend] ), '
             'KEEPFILTERS ( Fact_Programme_Spend[measure] = "Programme (P2P) Spend" ) )'),
        fmt="\\$#,##0",
        folder="04 Capture",
        desc=("Spend actually flowing through IHG procurement programmes (P2P). The numerator "
              "of capture rate. QBR 2025: $1.16bn."),
        syn=["programme spend", "program spend", "captured spend", "P2P spend",
             "spend under management", "what we capture"],
        value=1_158_360_300.36,
        guards=["The 'measure' filter is essential — the table also holds a 'Total Spend' row type.",
                "Region comes from the hotel master, not the file's own ASIA/EUROPE labels "
                "(those do not match IHG's structure)."],
        qs=["How much spend flows through our programmes?",
            "What did we capture on programmes in 2025?"],
    ),
    dict(
        name="Programme Spend (like-for-like)",
        dax=('CALCULATE ( [Programme Spend], '
             'KEEPFILTERS ( Fact_Programme_Spend[in_market_model] = "Y" ) )'),
        fmt="\\$#,##0",
        folder="04 Capture",
        desc=("Programme spend restricted to the six categories that exist in the market "
              "model (FF&E, F&B, Energy, OS&E, MRO, Hotel Tech). Excludes $293.2m of HR, "
              "Travel, Advisory, Management-charge and Marketing spend, which IHG captures "
              "but which the market model does not count as addressable at all."),
        syn=["like for like programme spend", "matched programme spend",
             "comparable programme spend"],
        value=865_195_796.17,
        guards=["Use this when comparing numerator to denominator on equal terms."],
        qs=["How much programme spend is comparable to the addressable base?"],
    ),
    dict(
        name="CRF Total",
        dax="SUM ( Fact_CRF[crf_usd] )",
        fmt="\\$#,##0",
        folder="04 Capture",
        desc=("Contract Recovery Fee collected, summed over whatever period is in filter "
              "context. Unfiltered this is 2023-2026 combined ($79.1m) — almost never what "
              "you want. Prefer 'CRF 2025'."),
        syn=["CRF", "contract recovery fee", "rebate", "fee collected"],
        value=79_106_955.59,
        guards=["Unfiltered spans four years. Always slice by year."],
        qs=["How much CRF have we collected?"],
    ),
    dict(
        name="CRF 2025",
        dax="CALCULATE ( [CRF Total], KEEPFILTERS ( Fact_CRF[year] = 2025 ) )",
        fmt="\\$#,##0",
        folder="04 Capture",
        desc="CRF collected in full-year 2025. Ties to QBR: $27.05m.",
        syn=["CRF 2025", "CRF this year", "annual CRF", "full year CRF"],
        value=27_054_345.92,
        guards=["Fixed to 2025. 2026 YTD is $8.26m and is a different figure."],
        qs=["What was CRF for 2025?", "How much fee did we collect last year?"],
    ),
    dict(
        name="Capture Rate %",
        dax="DIVIDE ( [Programme Spend], [IHG Directly Addressable] )",
        fmt="0.00%",
        folder="04 Capture",
        desc=("Programme spend divided by IHG directly addressable spend. The single most "
              "important strategic metric: how much of what we could capture, we do. 7.60%."),
        syn=["capture rate", "capture", "penetration", "spend under management rate",
             "how much are we capturing"],
        value=0.0760,
        guards=["Denominator is IHG directly addressable ($15.2bn), NOT market ($134.6bn) and "
                "NOT IHG total addressable ($28.9bn).",
                "The numerator is wider than the denominator: it includes $293.2m of spend in "
                "categories with no addressable base (mostly HR) and $33.6m of BUILD. "
                "'Capture Rate % (like-for-like)' puts both on the same scope and gives 5.68%."],
        qs=["What is our capture rate?", "How much of the addressable spend do we capture?",
            "What is our penetration by region?"],
    ),
    dict(
        name="Average CRF Rate %",
        dax="DIVIDE ( [CRF 2025], [Programme Spend] )",
        fmt="0.00%",
        folder="04 Capture",
        desc="CRF collected as a percentage of programme spend. 2.34%.",
        syn=["CRF rate", "average CRF rate", "fee rate", "recovery rate", "yield"],
        value=0.0234,
        guards=["Numerator is fixed to 2025; comparing against a non-2025 programme-spend "
                "slice mismatches the periods."],
        qs=["What rate of CRF do we earn on programme spend?"],
    ),
    dict(
        name="Headroom",
        dax="[IHG Directly Addressable] - [Programme Spend (like-for-like)]",
        fmt="\\$#,##0",
        folder="05 Opportunity",
        desc=("Directly addressable spend not yet captured on a programme. The targeting "
              "measure — biggest headroom means biggest prize. $14.37bn in total. Uses the "
              "like-for-like numerator so categories with no addressable base net to zero "
              "rather than showing a spurious negative."),
        syn=["headroom", "opportunity", "gap", "untapped", "whitespace",
             "what's left on the table", "uncaptured spend"],
        value=14_366_937_433.08,
        guards=["Can go slightly negative in a BUILD slice, where programme spend exists but "
                "the denominator is excluded by definition."],
        qs=["Where is the biggest opportunity?", "Which categories have the most headroom?",
            "How much is still on the table in EMEAA?"],
    ),
    dict(
        name="Capture Rate % (like-for-like)",
        dax="DIVIDE ( [Programme Spend (like-for-like)], [IHG Directly Addressable] )",
        fmt="0.00%",
        folder="04 Capture",
        desc=("Capture rate with numerator and denominator on the same category scope: "
              "5.68%. The headline 7.60% includes $293.2m of programme spend in categories "
              "the market model treats as non-addressable, so it flatters the position by "
              "1.9 percentage points."),
        syn=["like for like capture rate", "comparable capture rate", "true capture rate",
             "adjusted capture rate"],
        value=0.0568,
        guards=["Use alongside, not instead of, 'Capture Rate %' — the 7.60% is what the "
                "strategy deck reports."],
        qs=["What is our capture rate on a like-for-like basis?",
            "Is the 7.6% capture rate comparable?"],
    ),
    dict(
        name="P2P Systems",
        dax="SUM ( Fact_P2P[systems] )",
        fmt="#,0",
        folder="06 Delivery",
        desc=("Count of hotels live on a P2P system. CMH 2025 year-end = 755 "
              "(AMER 88 / EMEAA 245 / GC 422); Franchise = 256."),
        syn=["P2P systems", "P2P rollout", "systems live", "hotels on P2P"],
        value=None,
        guards=["MUST filter estate_group. Unfiltered mixes CMH, Franchise and an excluded "
                "'Managed - N/A' bucket, giving 1,479 instead of 755."],
        qs=["How many hotels are live on P2P?", "What is the P2P rollout by region?"],
    ),
    dict(
        name="Supplier Value",
        dax="SUM ( Fact_Supplier[value] )",
        fmt="#,0.0",
        folder="06 Delivery",
        desc=("Supplier-programme metric values — Sedex, EcoVadis, Rapid Ratings. "
              "Sedex: 415 outreach / 356 pre-screened / 59 no-response."),
        syn=["supplier value", "supplier programme", "sedex", "ecovadis", "rapid ratings",
             "supplier assessments"],
        value=None,
        guards=["MUST filter both 'programme' and row_type = 'Actual', or Targets and Actuals "
                "land in the same bar."],
        qs=["How many suppliers have been assessed?", "How is Sedex outreach tracking?"],
    ),
    dict(
        name="System Size Value",
        dax="SUM ( Fact_SystemSize[value] )",
        fmt="#,0",
        folder="06 Delivery",
        desc=("Estate size over time — rooms or hotels, opening/closing balances. "
              "Region level: Americas 531,420 + EMEAA 293,825 + GC 223,486 = 1,048,731 rooms."),
        syn=["system size", "estate size", "rooms", "room count", "estate growth"],
        value=None,
        guards=["MUST filter geo_level. The geography column mixes region roll-ups with "
                "individual countries; unfiltered it roughly doubles every total."],
        qs=["How is the estate growing?", "How many rooms do we have by region?"],
    ),
    dict(
        name="Insight Count",
        dax="COUNTROWS ( Fact_Insight )",
        fmt="#,0",
        folder="07 Narrative",
        desc=("Number of narrative insights matching the current filter context. Used by the "
              "narrative panel that overlays document/analysis commentary onto the numbers."),
        syn=["insights", "commentary", "narrative", "notes"],
        value=None,
        guards=[],
        qs=["What do we know about this?"],
    ),
]

# --------------------------------------------------------------------------------------
# DIMENSION COLUMNS worth describing (everything an agent is likely to filter on)
# --------------------------------------------------------------------------------------
# (table, column) -> (description, [synonyms])
COLUMN_META = {
    ("Fact_Spend_Agg", "addressability"): (
        "Addressable / Potentially Addressable / Unadressable. Whether procurement can "
        "influence this spend. Nearly every strategic number filters to 'Addressable'.",
        ["addressability", "addressable flag"]),
    ("Fact_Spend_Agg", "lifecycle_stage"): (
        "BUILD (pre-opening construction, modelled) / OPEN (opening & fit-out) / OPERATE "
        "(day-to-day running) / IT-TELECOM / Misc. BUILD is ~48% of the pool but is modelled, "
        "not capturable today.",
        ["lifecycle", "stage", "lifecycle stage", "phase"]),
    ("Fact_Spend_Agg", "category"): (
        "Spend category: FF&E, OS&E, F&B, MRO, Energy, Advisory, Hotel Tech.",
        ["category", "spend category", "commodity"]),
    ("Fact_Spend_Agg", "ihg_flag"): (
        "IHG or Non-IHG. Distinguishes our own estate from competitor hotels in the market model.",
        ["IHG flag", "ours", "IHG vs competitor", "brand owner"]),
    ("Fact_Spend_Agg", "chain_scale"): ("Chain scale tier of the hotel.", ["chain scale", "tier"]),
    ("Fact_Spend_Agg", "segment_group"): (
        "Premium + Lifestyle/Luxury vs Essentials & Suites. NOTE: whether the 808 'Suites' "
        "hotels belong in E&S is still open — current grouping gives 1,445 / 5,549 vs the "
        "slide's 1,337 / 5,657.",
        ["segment", "segment group", "premium vs essentials"]),
    ("Fact_Spend_Agg", "management_type"): (
        "Franchised (5,904 / 84.4%) or Managed (1,088 / 15.6%).",
        ["management type", "franchised", "managed", "operating model"]),
    ("Fact_Spend_Agg", "priority_market"): (
        "Whether the market is an IHG priority market — where we have most commercial leverage.",
        ["priority market", "priority", "focus market"]),
    ("Fact_Spend_Agg", "size_band_100"): (
        "Hotel size split at RMS < 100 rooms: 2,935 small / 4,059 large. (The slide's "
        "3,925/3,069 is a confirmed 2/3 transposition — Excel is correct.)",
        ["size band", "hotel size", "small hotels"]),
    ("Dim_Region", "region_name"): (
        "AMER / EMEAA / Greater China. EMEAA = Europe + IMEA + EAPAC. Greater China is China, "
        "Hong Kong, Taiwan and Macau ONLY — it is NOT wider Asia. Always slice region from "
        "Dim_Region so all fact tables filter together.",
        ["region", "regions", "geography", "AMER", "EMEAA", "Greater China", "GC"]),
    ("Dim_Lifecycle", "lifecycle_stage"): (
        "Conformed lifecycle dimension. Slice from here, not from a fact table, so spend and "
        "programme spend filter together.",
        ["lifecycle", "stage"]),
    ("Fact_P2P", "estate_group"): (
        "CMH (Managed) / Franchise / excluded 'Managed - N/A'. MUST be filtered — see the "
        "'P2P Systems' measure.",
        ["estate group", "estate", "CMH", "franchise"]),
    ("Fact_SystemSize", "geo_level"): (
        "Total / Region / Country. MUST be filtered to one level — the geography column mixes "
        "roll-ups and countries.",
        ["geo level", "geography level"]),
    ("Fact_Supplier", "row_type"): (
        "Actual or Target. MUST be filtered.", ["row type", "actual vs target"]),
    ("Fact_Programme_Spend", "measure"): (
        "'Programme (P2P) Spend' or 'Total Spend'. MUST be filtered — see 'Programme Spend'.",
        ["measure", "spend type"]),
    ("Dim_Category", "category_name"): (
        "Conformed spend category. Slice category from HERE, not from a fact table — this "
        "is what makes market spend and programme spend filter together after the taxonomy "
        "crosswalk. Six categories have an addressable base (FF&E, F&B, Energy, OS&E, MRO, "
        "Hotel Tech); the rest hold captured spend with no market-model equivalent.",
        ["category", "spend category", "commodity", "category name"]),
    ("Dim_ChainScale", "chain_scale_name"): (
        "Conformed chain scale. Slice from here so programme spend filters too.",
        ["chain scale", "scale", "tier"]),
    ("Dim_Segment", "segment_name"): (
        "Conformed segment group — Premium + Lifestyle/Luxury vs Essentials & Suites.",
        ["segment", "segment group"]),
    ("Dim_Market", "market_name"): (
        "Conformed market categorisation.", ["market type", "market categorisation"]),
    ("Dim_Priority", "priority_name"): (
        "Conformed priority-market flag.", ["priority market", "priority"]),
    ("Fact_Programme_Spend", "in_market_model"): (
        "Y if this category exists in the market spend model and therefore has an "
        "addressable denominator; N otherwise (HR, Travel, Advisory, Management charges, "
        "Marketing — $293.2m, 25.3% of programme spend).",
        ["in market model", "comparable", "like for like"]),
    ("Fact_Programme_Spend", "category_l2"): (
        "The programme tracker's own level-2 category, kept for traceability. The crosswalk "
        "to the market taxonomy lives in the 'category' column.",
        ["programme category", "L2 category"]),
    ("Fact_Insight", "theme"): (
        "What the insight is about — e.g. Capture, Headroom, Delivery, Risk, Definition.",
        ["theme", "topic"]),
    ("Fact_Insight", "statement"): (
        "The insight itself, in one sentence.", ["insight", "finding", "commentary"]),
    ("Fact_Insight", "so_what"): (
        "The decision implication — what to do about it.", ["so what", "implication", "action"]),
}

# Technical columns to hide from the field list (they exist for joins/sorting, not for users)
HIDDEN_COLUMNS = {
    ("Fact_Spend_Agg", "region_std"), ("Fact_CRF", "region_std"),
    ("Fact_Programme_Spend", "region_std"), ("Fact_ShareOfWallet", "region"),
    ("Dim_Region", "region_std"), ("Dim_Region", "sort_order"),
    ("Dim_Lifecycle", "sort_order"),
    ("Dim_Hotel", "HID"), ("Dim_Hotel", "has_spend_data"),
    ("Fact_Spend_Agg", "hotels"), ("Fact_Spend_Agg", "rooms_sum"),
    ("Fact_Programme_Spend", "source_region_label"),
    ("Fact_Insight", "insight_id"),
}

# Table-level descriptions
TABLE_DESC = {
    "Fact_Spend_Agg": ("Pre-aggregated market spend — the main analytical source. Grain: "
                       "hotel attributes x addressability x lifecycle x category. "
                       "Do not SUM the 'hotels' column."),
    "Fact_Spend": "Hotel-level spend, for drill-down. Joins to Dim_Hotel on InnCode.",
    "Dim_Hotel": "Hotel master — one row per hotel. The authority for region and status.",
    "Fact_Programme_Spend": ("Spend captured on IHG procurement programmes. Region derived "
                             "from the hotel master, not the file's own labels."),
    "Fact_CRF": "Contract Recovery Fee by region and month, 2023-2026.",
    "Fact_P2P": "P2P system rollout by region, market, product, estate and month.",
    "Fact_Supplier": "Supplier programme tracking — Sedex, EcoVadis, Rapid Ratings.",
    "Fact_SystemSize": "Estate size (rooms and hotels) over time.",
    "Fact_ShareOfWallet": "Pre-built share-of-wallet summary by region, lifecycle and IHG flag.",
    "Dim_Region": "Conformed region dimension. Slice region from here.",
    "Dim_Lifecycle": "Conformed lifecycle dimension. Slice lifecycle from here.",
    "Dim_Category": ("Conformed category dimension, bridging the market taxonomy and the "
                     "programme tracker's 43 level-2 categories. Slice category from here."),
    "Dim_ChainScale": "Conformed chain scale dimension. Slice chain scale from here.",
    "Dim_Segment": "Conformed segment dimension. Slice segment from here.",
    "Dim_Market": "Conformed market categorisation dimension. Slice market type from here.",
    "Dim_Priority": "Conformed priority-market dimension. Slice priority market from here.",
    "Fact_Insight": ("Narrative overlay — analysis and document commentary tagged to the same "
                     "region / lifecycle / category dimensions as the numbers, so it filters "
                     "alongside them."),
}

# --------------------------------------------------------------------------------------
# GLOBAL RULES the agent must never break
# --------------------------------------------------------------------------------------
RULES = [
    "Never calculate a number yourself. Every figure must come from a measure in the model. "
    "If no measure exists for what was asked, say so rather than estimating.",
    "Capture rate = Programme Spend / IHG Directly Addressable ($15.2bn). Not the market "
    "denominator ($134.6bn), not IHG total addressable ($28.9bn).",
    "Greater China is China, Hong Kong, Taiwan and Macau only. It is NOT wider Asia. "
    "EMEAA = Europe + IMEA + EAPAC, and includes South East Asia, Australasia and Japan.",
    "'Addressable' includes modelled pipeline BUILD; 'directly addressable' excludes it. "
    "State which basis you are using whenever you quote a spend figure.",
    "CRF unfiltered spans 2023-2026. Quote CRF 2025 ($27.05m) or 2026 YTD ($8.26m), never "
    "the $79.1m four-year total as though it were annual.",
    "Fact_P2P needs estate_group; Fact_SystemSize needs geo_level; Fact_Supplier needs "
    "row_type; Fact_Programme_Spend needs measure. Without these the totals double-count.",
    "Never SUM Fact_Spend_Agg[hotels] — it is pre-aggregated. Use the Hotel Count or IHG "
    "Hotels measures.",
    "Slice category, chain scale, segment, market type and priority market from the "
    "conformed Dim_ tables, never from a fact table. Slicing from Fact_Spend_Agg filters "
    "only the market side and leaves programme spend at its full value in every cell.",
    "The headline capture rate (7.60%) counts $293.2m of programme spend in categories with "
    "no addressable base. State both it and the like-for-like rate (5.68%) when the "
    "difference is material to the decision.",
    "Where a slide and the source spreadsheet disagree, the spreadsheet is correct. Two "
    "known stale slide figures: directly addressable ($15.6bn vs $15.23bn) and hotel size "
    "split (3,925/3,069 vs 2,935/4,059).",
    "The CRF_Analysis 'Pivots' sheet contains named individuals and is excluded from every "
    "extract. Never reintroduce personal data into this model.",
]

# Open questions the agent should surface rather than paper over
OPEN_QUESTIONS = [
    ("OPERATE capture rate", "With lifecycle now computing correctly, OPERATE shows 11.73% "
     "capture — the STRONGEST stage, not the weakest. The strategy deck's 'OPERATE barely "
     "captured' claim used the market-wide denominator. Flag this rather than repeating the "
     "slide's framing."),
    ("Suites grouping", "Whether the 808 'Suites' hotels belong in Essentials & Suites or in "
     "Premium + Lifestyle/Luxury. Current grouping gives 1,445 / 5,549; the slide shows "
     "1,337 / 5,657."),
    ("Capture-rate scope", "$293.2m of programme spend (25.3%) is in categories the market "
     "model does not treat as addressable — mostly HR ($212.5m). Either the market model "
     "should be extended to cover them, or the reported capture rate should be the "
     "like-for-like 5.68%. Currently both are published."),
    ("FF&E capture", "FF&E is the largest directly-addressable category at $5.81bn but "
     "captures only 0.82% — by far the weakest. Worth confirming FF&E programme spend is "
     "genuinely tracked in this file rather than sitting in a system that does not feed it."),
]
