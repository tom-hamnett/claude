# APEX Tableau — Build Guide

**Everything is pre-cleaned. You do the clicks; I've removed the data wrangling and the
guesswork.** Work through this in order. Each chart is 3–6 drags.

If a chart comes out wrong, screenshot it and send it to me — I'll give you the exact fix.

---

## Before you start — two things to check

**1. Do you have a Creator licence?** In Tableau, click your avatar (top right) → the
licence type is shown. You need **Creator** to build. Viewer/Explorer can't. If you only
have Viewer, that's a quick IT request — flag it now so it doesn't block you at step 3.

**2. Desktop or Cloud?** Both work. Desktop is faster for building; Cloud is easier to
share. The steps below say "drag X to Y" which is identical in both.

---

## Step 1 — Get the data files

Nine CSVs, in the `tableau/data/` folder of the repo. Download all of them to one local
folder (e.g. `Documents\APEX Data\`).

| File | Rows | What it is |
|---|---|---|
| `Dim_Hotel.csv` | 61,201 | Hotel master — the slicer for everything |
| `Fact_Spend.csv` | 749,294 | Spend at hotel × addressability × lifecycle × category |
| `Fact_Spend_Agg.csv` | 45,097 | Same, pre-aggregated — **use this one first, it's fast** |
| `Fact_CRF.csv` | 126 | CRF revenue by region × month, 2023–26 |
| `Fact_P2P.csv` | 390 | P2P rollout by region/market/product/estate × month |
| `Fact_Supplier.csv` | 301 | Sedex / EcoVadis / Rapid Ratings metrics |
| `Fact_SystemSize.csv` | 2,880 | Rooms & hotels, managed & franchise, monthly |
| `Fact_Programme_Spend.csv` | 28,313 | IHG programme (P2P) spend by hotel × category |
| `Fact_ShareOfWallet.csv` | 40 | Pre-computed addressable vs directly-addressable |

**Start with `Fact_Spend_Agg.csv` alone.** It answers most of the strategic slides and
needs no joins. Add the others as you go.

---

## Step 2 — Connect

1. Open Tableau → **Connect → To a File → Text file**
2. Choose `Fact_Spend_Agg.csv`
3. It'll load straight to the canvas. Click **Sheet 1** at the bottom.

Tableau splits fields into **Dimensions** (text, for slicing) and **Measures** (numbers,
for aggregating). Check that `spend`, `hotels`, `rooms_sum` landed as Measures. If
`spend` shows as a Dimension, right-click it → **Convert to Measure**.

> **Money formatting (do this once):** right-click `spend` → **Default Properties →
> Number Format → Currency (Custom)**, 0 decimals, Units = **Billions**. Every chart
> then reads in $bn automatically.

---

## Step 3 — Sanity check before building anything

Drag `spend` to **Text**. You should see **$256,361,641,307** once you filter
`addressability = Addressable`.

To filter: drag `addressability` to the **Filters** shelf → tick **Addressable** only.

If you see that number, your data is correct and everything downstream will tie to the
slides. **Don't proceed until this matches.**

---

# DASHBOARD 1 — Market & Share of Wallet
*(recreates slides 4, 5, 6, 12, 13, 14)*

## Chart 1.1 — Addressable spend by lifecycle stage
*Slide 6. Target: BUILD $121.7bn, OPEN $58.0bn, OPERATE $63.8bn, IT/TELECOM $12.8bn*

1. New worksheet, name it `1.1 Lifecycle`
2. Filter: `addressability` → **Addressable**
3. Drag `lifecycle_stage` → **Columns**
4. Drag `spend` → **Rows**
5. Sort descending: click the sort icon on the axis
6. Drag `spend` → **Label** (so values print on the bars)

## Chart 1.2 — IHG vs Rest of Market
*Slide 4. Target: IHG $28.9bn (11.2%), Non-IHG $227.4bn*

1. New worksheet `1.2 IHG Share`
2. Filter: `addressability` → **Addressable**
3. Drag `region` → **Columns**
4. Drag `spend` → **Rows**
5. Drag `ihg_flag` → **Colour**
6. To show it as a **percentage**: right-click the `spend` pill on Rows →
   **Quick Table Calculation → Percent of Total**, then
   **Compute Using → Table (Down)**

## Chart 1.3 — Spend by region, stacked by lifecycle
*Slide 4/14. Target: AMER $153.1bn, GC $61.5bn, EMEAA $41.8bn*

1. New worksheet `1.3 Region x Lifecycle`
2. Filter: `addressability` → **Addressable**
3. `region` → **Columns**
4. `spend` → **Rows**
5. `lifecycle_stage` → **Colour**

## Chart 1.4 — Chain scale / segment analysis
*Slide 6 segment table*

1. New worksheet `1.4 Segment`
2. Filter: `addressability` → **Addressable**, and `ihg_flag` → **IHG**
3. `segment_group` → **Columns** (this is the pre-built Premium+L&L / E&S grouping)
4. `spend` → **Rows**
5. `lifecycle_stage` → **Colour**
6. Right-click `spend` → **Quick Table Calculation → Percent of Total** →
   **Compute Using → Table (Down)** to get the % mix per segment

> Swap `segment_group` for `archetype_segment` (5-way split), `size_band_100`,
> or `chain_scale` to reproduce the other rows of that slide's table.

## Chart 1.5 — Capture rate heatmap (region × lifecycle)
*Slide 14. This is the "where are we winning" view*

1. New worksheet `1.5 Capture Heatmap`
2. Filter: `addressability` → **Addressable**, `ihg_flag` → **IHG**
3. `reporting_region` → **Columns** (this gives the AMER / EUR / IMEA / EAPAC / GC split)
4. `lifecycle_stage` → **Rows**
5. `spend` → **Colour**
6. Change mark type (top of the Marks card) to **Square**
7. `spend` → **Label**

## Chart 1.6 — Waterfall: total → addressable → potentially addressable
*Slide 5. Tableau doesn't have a native waterfall — this is the standard trick*

1. New worksheet `1.6 Waterfall`
2. Remove the addressability filter (we want all three categories)
3. `addressability` → **Columns**
4. `spend` → **Rows**
5. Right-click the `spend` pill → **Quick Table Calculation → Running Total**
6. Change mark type to **Gantt Bar**
7. Create a calculated field (**Analysis → Create Calculated Field**), name it
   `Negative Spend`:
   ```
   -[spend]
   ```
8. Drag `Negative Spend` → **Size**

That produces the floating-bar waterfall look.

---

# DASHBOARD 2 — QBR Operational Metrics
*(recreates QBR pages 20–27)*

Connect the operational files: **Data → New Data Source** for each of `Fact_CRF.csv`,
`Fact_P2P.csv`, `Fact_Supplier.csv`, `Fact_SystemSize.csv`. They're small and
independent — no joins needed.

## Chart 2.1 — CRF monthly tracking
*QBR p20. Target: 2025 total $27.05M; 2026 YTD $8.26M*

1. New worksheet `2.1 CRF`, data source `Fact_CRF`
2. `month` → **Columns**. Right-click it → set to **Month/Year continuous** (the green
   pill version)
3. `crf_usd` → **Rows**
4. `region` → **Colour**
5. Filter `year` → tick **2026** (or leave all years for the full trend)

## Chart 2.2 — CMH P2P rollout
*QBR p21. Target: 2025 YE = 755 (AMER 88, EMEAA 245, GC 422)*

1. New worksheet `2.2 CMH P2P`, data source `Fact_P2P`
2. **Filter `estate_group` → `CMH (Managed)` only.** ← *critical: this is the field that
   makes 755 come out right*
3. `month` → **Columns** (continuous)
4. `systems` → **Rows**
5. `region` → **Colour**

## Chart 2.3 — Franchise P2P rollout
*QBR p22. Target: 2025 YE = 256*

Same as 2.2 but filter `estate_group` → **Franchise**.

## Chart 2.4 — Supplier programmes
*QBR p23–25 (Rapid Ratings / EcoVadis / Sedex)*

1. New worksheet `2.4 Suppliers`, data source `Fact_Supplier`
2. `period` → **Columns**
3. `value` → **Rows**
4. `metric` → **Colour**
5. Filter `programme` → pick one (**Sedex Assessment**, **EcoVadis**, or
   **Rapid Ratings**)
6. Filter `row_type` → **Actual** for actuals, or include **Target** to compare

> This table is long-format with a `row_type` of Forecast / Target / Actual / Calc.
> Always filter `row_type`, or you'll mix targets with actuals in one bar.

## Chart 2.5 — System size growth
*Rooms & hotels, managed vs franchise*

1. New worksheet `2.5 System Size`, data source `Fact_SystemSize`
2. **Filter `geo_level` → `Region`** (or `Total`, or `Country` — but pick ONE)
   ← *critical: mixing levels double-counts*
3. Filter `metric` → **contains "Closing"**
4. Filter `unit` → **Rooms**
5. `month` → **Columns** (continuous)
6. `value` → **Rows**
7. `geography` → **Colour**
8. `estate` → **Rows** (above value) to split managed vs franchise

---

## Step 4 — Assemble the dashboards

1. Bottom of the screen → **New Dashboard** icon
2. Set **Size → Automatic** (so it scales to screens)
3. Drag your worksheets from the left panel onto the canvas
4. Suggested layout for Dashboard 1:
   - Top row: `1.2 IHG Share` (the headline)
   - Middle: `1.1 Lifecycle` beside `1.3 Region x Lifecycle`
   - Bottom: `1.5 Capture Heatmap` full width
5. Add filters that control everything: on any chart, click the small ▾ on a filter
   card → **Apply to Worksheets → All Using This Data Source**

**Filters worth exposing** (drag each to Filters, then right-click → **Show Filter**):
`region`, `reporting_region`, `ihg_flag`, `lifecycle_stage`, `chain_scale`,
`segment_group`, `management_type`, `priority_market`

---

## Step 5 — Getting to hotel-level detail

`Fact_Spend_Agg.csv` is pre-aggregated (fast, but no individual hotels). When you need
hotel-level drill-down:

1. **Data → New Data Source** → `Fact_Spend.csv`
2. **Data → New Data Source** → `Dim_Hotel.csv`
3. On the data-source page, drag `Dim_Hotel` next to `Fact_Spend` — Tableau will propose
   a **relationship on `InnCode`**. Accept it.
4. Add a filter `is_open = True` (the pre-built flag for
   `Contract Status = 'Open - Accepting Guests'`)

Use `Fact_Spend_Agg` for dashboards, `Fact_Spend` + `Dim_Hotel` for investigation.

---

## Step 6 — Publish

1. **Server → Sign In** (your IHG Tableau Cloud/Server URL)
2. **Server → Publish Workbook**
3. Choose the project/folder, set permissions to your ~15 named people
4. Under **Data Sources**, choose **Embedded in workbook** for now (simplest)

> **Refresh:** these are static CSV snapshots. To make it live later, the same CSVs get
> written to a scheduled location (SharePoint/OneDrive or a database) and Tableau
> refreshes from there. That's the step that turns this into the live data spine — worth
> doing once the dashboard content is agreed.

---

## Two things that will bite you if you skip them

1. **`Fact_P2P` — always filter `estate_group`.** Unfiltered it mixes CMH, Franchise and
   the excluded "Managed - N/A" bucket. That's how you'd get 1,479 instead of 755.
2. **`Fact_SystemSize` — always filter `geo_level`.** The geography column holds region
   roll-ups *and* countries in the same field. Mixing them roughly doubles every total.

Both are called out on the charts above; just don't remove those filters.

---

## Field reference

### `Fact_Spend_Agg.csv` — the main dashboard source
**Dimensions:** `ihg_flag`, `region`, `reporting_region`, `sub_region`, `country`,
`chain_scale`, `archetype_segment`, `segment_group`, `archetype_size_band`,
`size_band_100`, `management_type`, `market_categorisation`, `priority_market`, `brand`,
`addressability`, `lifecycle_stage`, `category`
**Measures:** `spend`, `hotels`, `rooms_sum`

> `rooms_sum` repeats per spend row, so **don't SUM it** in this table — use
> `Dim_Hotel` for room counts. Hotel counts use `COUNTD` semantics and are already
> distinct-counted per combination.

### Derived fields I pre-built for you
| Field | Logic | Why |
|---|---|---|
| `reporting_region` | AMER / EUR / IMEA / EAPAC / GC | The 5-region split slide 14 uses |
| `segment_group` | Premium+L&L vs E&S | Slide 6's segment grouping |
| `size_band_100` | `<100` / `>100` rooms | Slide 2's size split |
| `is_open` | Contract Status = Open | The filter every slide applies |
| `estate_group` (P2P) | CMH / Franchise / excluded | Makes CMH 755 tie out |
| `geo_level` (SystemSize) | Total / Region / Country | Prevents double-counting |

---

## Open questions for you

These are in the validation report too, but they affect two charts:

1. **Hotel size threshold** — slide says <100 rooms = 3,925 hotels; `RMS < 100` gives
   2,935. Which definition is right?
2. **Premium+L&L vs E&S** — slide says 1,337 / 5,657; my grouping gives 1,445 / 5,549.
   Where do the 808 "Suites" hotels belong?
3. **"Directly addressable"** — is it *all* BUILD excluded (gives $15.23bn vs slide's
   $15.6bn), or is some tracked build spend retained?

None block the build. Tell me the answers and I'll reissue the affected extracts.
