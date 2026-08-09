# APEX — metric contract

**Validated 2026-08-09.** Every value below was recomputed from the extracts on that date, not copied from a slide.

This is the definition layer. An AI assistant is only as trustworthy as the definitions it works from — if *capture rate* can mean two things, the assistant will confidently give you the wrong one. Everything downstream (the Power BI model, the agent prompt, the narrative table) is generated from this file, so there is exactly one definition of each term.

## Rules that must never be broken

1. Never calculate a number yourself. Every figure must come from a measure in the model. If no measure exists for what was asked, say so rather than estimating.
2. Capture rate = Programme Spend / IHG Directly Addressable ($15.2bn). Not the market denominator ($134.6bn), not IHG total addressable ($28.9bn).
3. Greater China is China, Hong Kong, Taiwan and Macau only. It is NOT wider Asia. EMEAA = Europe + IMEA + EAPAC, and includes South East Asia, Australasia and Japan.
4. 'Addressable' includes modelled pipeline BUILD; 'directly addressable' excludes it. State which basis you are using whenever you quote a spend figure.
5. CRF unfiltered spans 2023-2026. Quote CRF 2025 ($27.05m) or 2026 YTD ($8.26m), never the $79.1m four-year total as though it were annual.
6. Fact_P2P needs estate_group; Fact_SystemSize needs geo_level; Fact_Supplier needs row_type; Fact_Programme_Spend needs measure. Without these the totals double-count.
7. Never SUM Fact_Spend_Agg[hotels] — it is pre-aggregated. Use the Hotel Count or IHG Hotels measures.
8. Slice category, chain scale, segment, market type and priority market from the conformed Dim_ tables, never from a fact table. Slicing from Fact_Spend_Agg filters only the market side and leaves programme spend at its full value in every cell.
9. The headline capture rate (7.60%) counts $293.2m of programme spend in categories with no addressable base. State both it and the like-for-like rate (5.68%) when the difference is material to the decision.
10. Where a slide and the source spreadsheet disagree, the spreadsheet is correct. Two known stale slide figures: directly addressable ($15.6bn vs $15.23bn) and hotel size split (3,925/3,069 vs 2,935/4,059).
11. The CRF_Analysis 'Pivots' sheet contains named individuals and is excluded from every extract. Never reintroduce personal data into this model.

## Measures

| Measure | Definition | Validated value |
|---|---|---|
| **Total Spend** | Raw spend with no addressability filter. The whole branded-hotel spend pool, including spend procurement cannot influence. Use only for the page 1 waterfall that shows how the pool narrows. For anything strategic use 'Addressable Spend'. | 439,000,000,028 |
| **Addressable Spend** | Spend procurement can influence, across the whole branded market (IHG and competitors). addressability = 'Addressable'. This is the headline market-size number on strategy slide 4. | 256,361,641,307 |
| **Directly Addressable Spend** | Addressable spend EXCLUDING modelled pipeline BUILD costs. BUILD is a modelled construction estimate for hotels not yet open, so it cannot be captured on a programme today. This is the strategy slide 12/13 basis and the confirmed definition of 'directly addressable'. | 134,622,962,651 |
| **IHG Addressable Spend** | Addressable spend inside the IHG estate only. Strategy slide 4 headline: $28.9bn. | 28,913,885,399 |
| **IHG Directly Addressable** | IHG addressable spend excluding modelled pipeline BUILD. THE denominator for capture rate and headroom. Confirmed basis (spreadsheet is gospel; the $15.6bn on the slide is stale). | 15,232,133,229 |
| **IHG Share of Addressable %** | IHG's share of the global addressable pool. Slide 4: 11.3%. | 11.28% |
| **Total Market Spend** | Alias of 'Total Spend', used on the page 1 framing card. | 439,000,000,028 |
| **Hotel Count** | Distinct hotels with spend data, all brands, no filters. Must be a DISTINCTCOUNT — Fact_Spend_Agg[hotels] is pre-aggregated and summing it overcounts ~8x. | 57,638 |
| **IHG Hotels** | Open, trading IHG hotels with addressable spend. Ties to the Excel pivot: 6,992. (Strategy slide 4 shows 7,014 from an earlier extract date — 0.3% apart.) | 6,992 |
| **Programme Spend** | Spend actually flowing through IHG procurement programmes (P2P). The numerator of capture rate. QBR 2025: $1.16bn. | 1,158,360,300 |
| **Programme Spend (like-for-like)** | Programme spend restricted to the six categories that exist in the market model (FF&E, F&B, Energy, OS&E, MRO, Hotel Tech). Excludes $293.2m of HR, Travel, Advisory, Management-charge and Marketing spend, which IHG captures but which the market model does not count as addressable at all. | 865,195,796 |
| **CRF Total** | Contract Recovery Fee collected, summed over whatever period is in filter context. Unfiltered this is 2023-2026 combined ($79.1m) — almost never what you want. Prefer 'CRF 2025'. | 79,106,956 |
| **CRF 2025** | CRF collected in full-year 2025. Ties to QBR: $27.05m. | 27,054,346 |
| **Capture Rate %** | Programme spend divided by IHG directly addressable spend. The single most important strategic metric: how much of what we could capture, we do. 7.60%. | 7.60% |
| **Average CRF Rate %** | CRF collected as a percentage of programme spend. 2.34%. | 2.34% |
| **Headroom** | Directly addressable spend not yet captured on a programme. The targeting measure — biggest headroom means biggest prize. $14.37bn in total. Uses the like-for-like numerator so categories with no addressable base net to zero rather than showing a spurious negative. | 14,366,937,433 |
| **Capture Rate % (like-for-like)** | Capture rate with numerator and denominator on the same category scope: 5.68%. The headline 7.60% includes $293.2m of programme spend in categories the market model treats as non-addressable, so it flatters the position by 1.9 percentage points. | 5.68% |
| **P2P Systems** | Count of hotels live on a P2P system. CMH 2025 year-end = 755 (AMER 88 / EMEAA 245 / GC 422); Franchise = 256. | _context-dependent_ |
| **Supplier Value** | Supplier-programme metric values — Sedex, EcoVadis, Rapid Ratings. Sedex: 415 outreach / 356 pre-screened / 59 no-response. | _context-dependent_ |
| **System Size Value** | Estate size over time — rooms or hotels, opening/closing balances. Region level: Americas 531,420 + EMEAA 293,825 + GC 223,486 = 1,048,731 rooms. | _context-dependent_ |
| **Insight Count** | Number of narrative insights matching the current filter context. Used by the narrative panel that overlays document/analysis commentary onto the numbers. | _context-dependent_ |

### DAX and guardrails

#### Total Spend

```dax
Total Spend =
SUM ( Fact_Spend_Agg[spend] )
```

*Also called:* spend, total spend, all spend, gross spend.

> ⚠️ Not a decision metric on its own — it includes Unadressable spend.

Answers: *"What is total hotel spend across the branded market?"*

#### Addressable Spend

```dax
Addressable Spend =
CALCULATE ( [Total Spend], KEEPFILTERS ( Fact_Spend_Agg[addressability] = "Addressable" ) )
```

*Also called:* addressable, addressable spend, procurement addressable, influenceable spend, market size, the prize.

> ⚠️ Whole market, not IHG. For IHG only, use 'IHG Addressable Spend'.
> ⚠️ Includes modelled pipeline BUILD — see 'Directly Addressable Spend'.

Answers: *"How big is the procurement-addressable market?"*; *"What is the total addressable spend?"*

#### Directly Addressable Spend

```dax
Directly Addressable Spend =
CALCULATE ( [Total Spend], KEEPFILTERS ( Fact_Spend_Agg[addressability] = "Addressable" ), KEEPFILTERS ( Fact_Spend_Agg[lifecycle_stage] <> "BUILD" ) )
```

*Also called:* directly addressable, direct addressable spend, realistic addressable, addressable excluding build, capturable spend.

> ⚠️ Market-wide. Do NOT use as the capture-rate denominator — that needs 'IHG Directly Addressable'. Using this one gives ~0.86% instead of 7.60%.

Answers: *"How much of the market can we realistically address today?"*

#### IHG Addressable Spend

```dax
IHG Addressable Spend =
CALCULATE ( [Addressable Spend], KEEPFILTERS ( Fact_Spend_Agg[ihg_flag] = "IHG" ) )
```

*Also called:* IHG addressable, our addressable spend, IHG estate spend, our estate addressable, IHG spend pool.

> ⚠️ Includes modelled pipeline BUILD.

Answers: *"How much addressable spend sits in the IHG estate?"*; *"What is IHG's own addressable spend?"*

#### IHG Directly Addressable

```dax
IHG Directly Addressable =
CALCULATE ( [Directly Addressable Spend], KEEPFILTERS ( Fact_Spend_Agg[ihg_flag] = "IHG" ) )
```

*Also called:* IHG directly addressable, our directly addressable spend, what we can capture, our realistic pool.

> ⚠️ This is the ONLY correct capture-rate denominator.

Answers: *"What can IHG realistically capture?"*; *"What is our directly addressable spend?"*

#### IHG Share of Addressable %

```dax
IHG Share of Addressable % =
DIVIDE ( [IHG Addressable Spend], [Addressable Spend] )
```

*Also called:* share of addressable, IHG share, share of wallet, our market share.

> ⚠️ Share of the SPEND pool, not share of hotels or rooms.

Answers: *"What share of the addressable market is IHG?"*

#### Total Market Spend

```dax
Total Market Spend =
[Total Spend]
```

*Also called:* market spend, total market.

#### Hotel Count

```dax
Hotel Count =
DISTINCTCOUNT ( Fact_Spend[InnCode] )
```

*Also called:* hotels, hotel count, number of hotels, properties.

> ⚠️ Never SUM Fact_Spend_Agg[hotels]. That column is a pre-aggregated count.

Answers: *"How many hotels are in the dataset?"*

#### IHG Hotels

```dax
IHG Hotels =
CALCULATE ( DISTINCTCOUNT ( Fact_Spend[InnCode] ), Dim_Hotel[ihg_flag] = "IHG", Dim_Hotel[contract_status] = "Open - Accepting Guests", Fact_Spend[addressability] = "Addressable" )
```

*Also called:* IHG hotels, our hotels, open hotels, trading hotels, estate size.

> ⚠️ 'Open - Accepting Guests' only — excludes Planning Phase pipeline.

Answers: *"How many IHG hotels are open?"*; *"How big is the IHG estate?"*

#### Programme Spend

```dax
Programme Spend =
CALCULATE ( SUM ( Fact_Programme_Spend[spend] ), KEEPFILTERS ( Fact_Programme_Spend[measure] = "Programme (P2P) Spend" ) )
```

*Also called:* programme spend, program spend, captured spend, P2P spend, spend under management, what we capture.

> ⚠️ The 'measure' filter is essential — the table also holds a 'Total Spend' row type.
> ⚠️ Region comes from the hotel master, not the file's own ASIA/EUROPE labels (those do not match IHG's structure).

Answers: *"How much spend flows through our programmes?"*; *"What did we capture on programmes in 2025?"*

#### Programme Spend (like-for-like)

```dax
Programme Spend (like-for-like) =
CALCULATE ( [Programme Spend], KEEPFILTERS ( Fact_Programme_Spend[in_market_model] = "Y" ) )
```

*Also called:* like for like programme spend, matched programme spend, comparable programme spend.

> ⚠️ Use this when comparing numerator to denominator on equal terms.

Answers: *"How much programme spend is comparable to the addressable base?"*

#### CRF Total

```dax
CRF Total =
SUM ( Fact_CRF[crf_usd] )
```

*Also called:* CRF, contract recovery fee, rebate, fee collected.

> ⚠️ Unfiltered spans four years. Always slice by year.

Answers: *"How much CRF have we collected?"*

#### CRF 2025

```dax
CRF 2025 =
CALCULATE ( [CRF Total], KEEPFILTERS ( Fact_CRF[year] = 2025 ) )
```

*Also called:* CRF 2025, CRF this year, annual CRF, full year CRF.

> ⚠️ Fixed to 2025. 2026 YTD is $8.26m and is a different figure.

Answers: *"What was CRF for 2025?"*; *"How much fee did we collect last year?"*

#### Capture Rate %

```dax
Capture Rate % =
DIVIDE ( [Programme Spend], [IHG Directly Addressable] )
```

*Also called:* capture rate, capture, penetration, spend under management rate, how much are we capturing.

> ⚠️ Denominator is IHG directly addressable ($15.2bn), NOT market ($134.6bn) and NOT IHG total addressable ($28.9bn).
> ⚠️ The numerator is wider than the denominator: it includes $293.2m of spend in categories with no addressable base (mostly HR) and $33.6m of BUILD. 'Capture Rate % (like-for-like)' puts both on the same scope and gives 5.68%.

Answers: *"What is our capture rate?"*; *"How much of the addressable spend do we capture?"*; *"What is our penetration by region?"*

#### Average CRF Rate %

```dax
Average CRF Rate % =
DIVIDE ( [CRF 2025], [Programme Spend] )
```

*Also called:* CRF rate, average CRF rate, fee rate, recovery rate, yield.

> ⚠️ Numerator is fixed to 2025; comparing against a non-2025 programme-spend slice mismatches the periods.

Answers: *"What rate of CRF do we earn on programme spend?"*

#### Headroom

```dax
Headroom =
[IHG Directly Addressable] - [Programme Spend (like-for-like)]
```

*Also called:* headroom, opportunity, gap, untapped, whitespace, what's left on the table, uncaptured spend.

> ⚠️ Can go slightly negative in a BUILD slice, where programme spend exists but the denominator is excluded by definition.

Answers: *"Where is the biggest opportunity?"*; *"Which categories have the most headroom?"*; *"How much is still on the table in EMEAA?"*

#### Capture Rate % (like-for-like)

```dax
Capture Rate % (like-for-like) =
DIVIDE ( [Programme Spend (like-for-like)], [IHG Directly Addressable] )
```

*Also called:* like for like capture rate, comparable capture rate, true capture rate, adjusted capture rate.

> ⚠️ Use alongside, not instead of, 'Capture Rate %' — the 7.60% is what the strategy deck reports.

Answers: *"What is our capture rate on a like-for-like basis?"*; *"Is the 7.6% capture rate comparable?"*

#### P2P Systems

```dax
P2P Systems =
SUM ( Fact_P2P[systems] )
```

*Also called:* P2P systems, P2P rollout, systems live, hotels on P2P.

> ⚠️ MUST filter estate_group. Unfiltered mixes CMH, Franchise and an excluded 'Managed - N/A' bucket, giving 1,479 instead of 755.

Answers: *"How many hotels are live on P2P?"*; *"What is the P2P rollout by region?"*

#### Supplier Value

```dax
Supplier Value =
SUM ( Fact_Supplier[value] )
```

*Also called:* supplier value, supplier programme, sedex, ecovadis, rapid ratings, supplier assessments.

> ⚠️ MUST filter both 'programme' and row_type = 'Actual', or Targets and Actuals land in the same bar.

Answers: *"How many suppliers have been assessed?"*; *"How is Sedex outreach tracking?"*

#### System Size Value

```dax
System Size Value =
SUM ( Fact_SystemSize[value] )
```

*Also called:* system size, estate size, rooms, room count, estate growth.

> ⚠️ MUST filter geo_level. The geography column mixes region roll-ups with individual countries; unfiltered it roughly doubles every total.

Answers: *"How is the estate growing?"*; *"How many rooms do we have by region?"*

#### Insight Count

```dax
Insight Count =
COUNTROWS ( Fact_Insight )
```

*Also called:* insights, commentary, narrative, notes.

Answers: *"What do we know about this?"*

## Dimensions worth knowing

| Field | What it means |
|---|---|
| `Fact_Spend_Agg[addressability]` | Addressable / Potentially Addressable / Unadressable. Whether procurement can influence this spend. Nearly every strategic number filters to 'Addressable'. |
| `Fact_Spend_Agg[lifecycle_stage]` | BUILD (pre-opening construction, modelled) / OPEN (opening & fit-out) / OPERATE (day-to-day running) / IT-TELECOM / Misc. BUILD is ~48% of the pool but is modelled, not capturable today. |
| `Fact_Spend_Agg[category]` | Spend category: FF&E, OS&E, F&B, MRO, Energy, Advisory, Hotel Tech. |
| `Fact_Spend_Agg[ihg_flag]` | IHG or Non-IHG. Distinguishes our own estate from competitor hotels in the market model. |
| `Fact_Spend_Agg[chain_scale]` | Chain scale tier of the hotel. |
| `Fact_Spend_Agg[segment_group]` | Premium + Lifestyle/Luxury vs Essentials & Suites. NOTE: whether the 808 'Suites' hotels belong in E&S is still open — current grouping gives 1,445 / 5,549 vs the slide's 1,337 / 5,657. |
| `Fact_Spend_Agg[management_type]` | Franchised (5,904 / 84.4%) or Managed (1,088 / 15.6%). |
| `Fact_Spend_Agg[priority_market]` | Whether the market is an IHG priority market — where we have most commercial leverage. |
| `Fact_Spend_Agg[size_band_100]` | Hotel size split at RMS < 100 rooms: 2,935 small / 4,059 large. (The slide's 3,925/3,069 is a confirmed 2/3 transposition — Excel is correct.) |
| `Dim_Region[region_name]` | AMER / EMEAA / Greater China. EMEAA = Europe + IMEA + EAPAC. Greater China is China, Hong Kong, Taiwan and Macau ONLY — it is NOT wider Asia. Always slice region from Dim_Region so all fact tables filter together. |
| `Dim_Lifecycle[lifecycle_stage]` | Conformed lifecycle dimension. Slice from here, not from a fact table, so spend and programme spend filter together. |
| `Fact_P2P[estate_group]` | CMH (Managed) / Franchise / excluded 'Managed - N/A'. MUST be filtered — see the 'P2P Systems' measure. |
| `Fact_SystemSize[geo_level]` | Total / Region / Country. MUST be filtered to one level — the geography column mixes roll-ups and countries. |
| `Fact_Supplier[row_type]` | Actual or Target. MUST be filtered. |
| `Fact_Programme_Spend[measure]` | 'Programme (P2P) Spend' or 'Total Spend'. MUST be filtered — see 'Programme Spend'. |
| `Dim_Category[category_name]` | Conformed spend category. Slice category from HERE, not from a fact table — this is what makes market spend and programme spend filter together after the taxonomy crosswalk. Six categories have an addressable base (FF&E, F&B, Energy, OS&E, MRO, Hotel Tech); the rest hold captured spend with no market-model equivalent. |
| `Dim_ChainScale[chain_scale_name]` | Conformed chain scale. Slice from here so programme spend filters too. |
| `Dim_Segment[segment_name]` | Conformed segment group — Premium + Lifestyle/Luxury vs Essentials & Suites. |
| `Dim_Market[market_name]` | Conformed market categorisation. |
| `Dim_Priority[priority_name]` | Conformed priority-market flag. |
| `Fact_Programme_Spend[in_market_model]` | Y if this category exists in the market spend model and therefore has an addressable denominator; N otherwise (HR, Travel, Advisory, Management charges, Marketing — $293.2m, 25.3% of programme spend). |
| `Fact_Programme_Spend[category_l2]` | The programme tracker's own level-2 category, kept for traceability. The crosswalk to the market taxonomy lives in the 'category' column. |
| `Fact_Insight[theme]` | What the insight is about — e.g. Capture, Headroom, Delivery, Risk, Definition. |
| `Fact_Insight[statement]` | The insight itself, in one sentence. |
| `Fact_Insight[so_what]` | The decision implication — what to do about it. |

## Open questions

These are unresolved. An assistant should surface them, not paper over them.

**OPERATE capture rate** — With lifecycle now computing correctly, OPERATE shows 11.73% capture — the STRONGEST stage, not the weakest. The strategy deck's 'OPERATE barely captured' claim used the market-wide denominator. Flag this rather than repeating the slide's framing.

**Suites grouping** — Whether the 808 'Suites' hotels belong in Essentials & Suites or in Premium + Lifestyle/Luxury. Current grouping gives 1,445 / 5,549; the slide shows 1,337 / 5,657.

**Capture-rate scope** — $293.2m of programme spend (25.3%) is in categories the market model does not treat as addressable — mostly HR ($212.5m). Either the market model should be extended to cover them, or the reported capture rate should be the like-for-like 5.68%. Currently both are published.

**FF&E capture** — FF&E is the largest directly-addressable category at $5.81bn but captures only 0.82% — by far the weakest. Worth confirming FF&E programme spend is genuinely tracked in this file rather than sitting in a system that does not feed it.

