# APEX Power BI — Build Guide

**The data is identical to the Tableau version — nothing to regenerate.** Same nine
CSVs, same validated model. Only the clicks differ.

Power BI is arguably the better home for this: it has a **native waterfall visual**
(Tableau needs a workaround), proper star-schema modelling, and it publishes into your
Microsoft tenant behind Entra SSO — which answers the governance problem directly.

---

## Step 1 — Get the data

Download `data/APEX_Tableau_Data.zip` (7.4 MB) and unzip to a local folder, e.g.
`Documents\APEX Data\`. Nine CSVs.

Start with **`Fact_Spend_Agg.csv`** — pre-aggregated, 45,097 rows, answers most of the
strategy slides with no joins.

---

## Step 2 — Load

1. Open Power BI Desktop → **Home → Get Data → Text/CSV**
2. Pick `Fact_Spend_Agg.csv` → **Transform Data** (not Load — we'll check types first)
3. In Power Query, confirm:
   - `spend`, `hotels`, `rooms_sum` → **Decimal Number** (click the icon left of each
     column name to change)
   - everything else → **Text**
4. **Home → Close & Apply**

Repeat **Get Data** for the others as you need them. They're independent — no joins
required for the operational charts.

> **Money formatting (do once):** in the **Data** pane click `spend` → the **Measure
> tools** ribbon appears → set **Format** to `Currency`, **Decimal places** `0`. Then
> everything reads consistently.

---

## Step 3 — Sanity check before building anything

1. Insert a **Card** visual (Visualizations pane)
2. Drag `spend` into it
3. Add a **filter**: with the card selected, drag `addressability` into the
   **Filters on this visual** well → tick **Addressable**

You should see **$256,361,641,307**.

**Do not proceed until that matches.** It's the anchor for every number on your slides.

---

## Step 4 — Create the core measures (DAX)

Power BI's equivalent of Tableau's table calcs. **Home → New Measure** for each, paste,
press Enter. These make the percentage charts trivial later.

```dax
Total Spend = SUM ( Fact_Spend_Agg[spend] )
```

```dax
Addressable Spend =
CALCULATE (
    [Total Spend],
    Fact_Spend_Agg[addressability] = "Addressable"
)
```

```dax
Directly Addressable Spend =
CALCULATE (
    [Total Spend],
    Fact_Spend_Agg[addressability] = "Addressable",
    Fact_Spend_Agg[lifecycle_stage] <> "BUILD"
)
```

```dax
IHG Addressable Spend =
CALCULATE ( [Addressable Spend], Fact_Spend_Agg[ihg_flag] = "IHG" )
```

```dax
IHG Share of Addressable % =
DIVIDE ( [IHG Addressable Spend], [Addressable Spend] )
```

```dax
Hotel Count = SUM ( Fact_Spend_Agg[hotels] )
```

Set `IHG Share of Addressable %` format to **Percentage**, 1 decimal.

> `Directly Addressable Spend` is the slide 12/13 basis you confirmed as gospel —
> it returns **$15.23bn** for IHG.

---

# DASHBOARD 1 — Market & Share of Wallet
*(slides 4, 5, 6, 12, 13, 14)*

Power BI terminology: you drag fields into **wells** on the Visualizations pane
(X-axis, Y-axis, Legend, Values) rather than Tableau's shelves.

## 1.1 — Addressable spend by lifecycle stage
*Target: BUILD $121.7bn · OPEN $58.0bn · OPERATE $63.8bn · IT/TELECOM $12.8bn*

1. Visual: **Clustered column chart**
2. **X-axis:** `lifecycle_stage`
3. **Y-axis:** `Addressable Spend`
4. Sort: click the **…** on the visual → **Sort axis → Addressable Spend → Descending**
5. Turn on labels: **Format visual** (paintbrush) → **Data labels → On**

## 1.2 — IHG vs Rest of Market by region
*Target: IHG $28.9bn (11.2%) · AMER $153.1bn · GC $61.5bn · EMEAA $41.8bn*

1. Visual: **Stacked column chart**
2. **X-axis:** `region`
3. **Y-axis:** `Addressable Spend`
4. **Legend:** `ihg_flag`
5. For the percentage view, switch to **100% Stacked column chart**

## 1.3 — Region × lifecycle
1. Visual: **Stacked column chart**
2. **X-axis:** `region` · **Y-axis:** `Addressable Spend` · **Legend:** `lifecycle_stage`

## 1.4 — Segment analysis
*Slide 6's segment table*

1. Visual: **100% Stacked column chart**
2. **X-axis:** `segment_group` (pre-built Premium+L&L vs E&S)
3. **Y-axis:** `Addressable Spend` · **Legend:** `lifecycle_stage`
4. Add a **filter**: `ihg_flag` = **IHG**

> Swap `segment_group` for `archetype_segment`, `size_band_100`, or `chain_scale` to get
> the other rows of that table. `size_band_100` uses `RMS < 100` — the definition you
> confirmed.

## 1.5 — Capture heatmap (region × lifecycle)
1. Visual: **Matrix**
2. **Rows:** `lifecycle_stage` · **Columns:** `reporting_region` (AMER/EUR/IMEA/EAPAC/GC)
3. **Values:** `IHG Addressable Spend`
4. **Format visual → Cell elements →** turn **Background colour** On → **fx** to set the
   gradient

## 1.6 — Waterfall (Total → Addressable → Potentially Addressable)
*Slide 5. Power BI has this natively — no workaround needed*

1. Visual: **Waterfall chart**
2. **Category:** `addressability`
3. **Y-axis:** `Total Spend`
4. No filter — you want all three categories

For the deeper category cascade, set **Category** to `lifecycle_stage` and add
`addressability` as the **Breakdown**.

---

# DASHBOARD 2 — QBR Operational Metrics
*(QBR pages 20–27)*

**Get Data** for `Fact_CRF.csv`, `Fact_P2P.csv`, `Fact_Supplier.csv`,
`Fact_SystemSize.csv`.

## 2.1 — CRF monthly tracking
*Target: 2025 total $27.05M · 2026 YTD $8.26M*

1. Visual: **Stacked column chart** (or **Line** for the trend)
2. **X-axis:** `month` — in the well, click the ▾ and choose **month** (not the date
   hierarchy) so it plots continuously
3. **Y-axis:** `crf_usd` · **Legend:** `region`
4. Filter `year` as needed

## 2.2 — CMH P2P rollout
*Target: 2025 YE = 755 (AMER 88 · EMEAA 245 · GC 422)*

1. Visual: **Stacked column chart**
2. **Filter (visual level): `estate_group` = `CMH (Managed)`** ← *critical: this is what
   makes 755 come out right*
3. **X-axis:** `month` · **Y-axis:** `systems` · **Legend:** `region`

## 2.3 — Franchise P2P rollout
*Target: 2025 YE = 256.* Same as 2.2, filter `estate_group` = **Franchise**.

## 2.4 — Supplier programmes
*QBR p23–25*

1. Visual: **Clustered column chart**
2. **X-axis:** `period` · **Y-axis:** `value` · **Legend:** `metric`
3. **Filters:** `programme` = one of *Sedex Assessment / EcoVadis / Rapid Ratings*,
   and `row_type` = **Actual**

> Always filter `row_type` or you'll mix Targets with Actuals in the same bar.

## 2.5 — System size growth
1. Visual: **Line chart**
2. **Filter: `geo_level` = `Region`** ← *critical: mixing levels double-counts*
3. Filters: `metric` **contains** "Closing", `unit` = **Rooms**
4. **X-axis:** `month` · **Y-axis:** `value` · **Legend:** `geography`
5. Add `estate` as **Small multiples** to split managed vs franchise

---

## Step 5 — Assemble and cross-filter

Power BI cross-filters automatically — click a bar in one visual and every other visual
responds. That's better than Tableau's manual filter-action setup.

**Add slicers** (the exposed filter controls):
1. Visual: **Slicer**
2. Drag in a field — one slicer per field

Worth having: `region`, `reporting_region`, `ihg_flag`, `lifecycle_stage`,
`chain_scale`, `segment_group`, `management_type`, `priority_market`

To control which visuals a slicer affects: select the slicer →
**Format ribbon → Edit interactions**.

---

## Step 6 — Hotel-level drill-down (the star schema)

`Fact_Spend_Agg` is pre-aggregated. For hotel-level analysis:

1. **Get Data** → `Fact_Spend.csv` and `Dim_Hotel.csv`
2. Go to **Model view** (left sidebar, third icon)
3. Drag `InnCode` from `Dim_Hotel` onto `InnCode` in `Fact_Spend` to create the
   relationship
4. Click the relationship line → confirm **One to many** (Dim_Hotel one → Fact_Spend
   many) and **Cross-filter direction: Single**
5. Add a filter `is_open = True` (pre-built flag for
   `Contract Status = 'Open - Accepting Guests'`)

This is a proper star schema — `Dim_Hotel` slices, `Fact_Spend` aggregates.

---

## Step 7 — Publish (and why this route is better)

1. **Home → Publish** → sign in with your IHG account → pick a workspace
2. In the Power BI service, share with your ~15 named people

**This is the part that matters strategically.** Publishing here means:
- **Entra SSO by default** — only named IHG users, no public URL. This is precisely the
  finding that got APEX pulled.
- **Inside the Microsoft tenant** — no new vendor, no new data-residency question
- **Native SharePoint/Teams embedding** — you can drop the dashboard straight into a
  Teams channel or SharePoint page
- **Scheduled refresh** via a gateway pointed at the source files

So the Power BI licence you already have is a shorter path to something *sanctioned*
than either the Tableau or GCP routes.

---

## Two filters you must not remove

1. **`Fact_P2P` → always filter `estate_group`.** Unfiltered it mixes CMH, Franchise and
   the excluded "Managed - N/A" bucket — that's how you'd get 1,479 instead of 755.
2. **`Fact_SystemSize` → always filter `geo_level`.** Geography holds region roll-ups
   *and* countries in one column; mixing them roughly doubles every total.

---

## Tableau → Power BI translation

| Tableau | Power BI |
|---|---|
| Marks card | Visualizations pane |
| Columns / Rows shelves | X-axis / Y-axis wells |
| Colour shelf | Legend well |
| Filters shelf | Filters pane (visual / page / report level) |
| Calculated field | Measure (DAX) or Calculated column |
| Quick Table Calculation → % of Total | `DIVIDE()` measure, or 100% Stacked visual |
| Data source relationships | Model view |
| Dashboard | Report page |
| Show Filter | Slicer visual |
| Filter actions | Automatic cross-filtering |

---

## Confirmed definitions (from your answers)

| Question | Your answer | Applied |
|---|---|---|
| Hotel size threshold | Slide had a 2/3 transposition — Excel is right | `size_band_100` uses `RMS < 100` → 2,935 / 4,059. **No change needed** |
| Directly addressable | Spreadsheet is gospel; slide is stale | `Directly Addressable Spend` excludes all BUILD → **$15.23bn** |
| Segment grouping | *(still open)* | `segment_group` = Premium+Lifestyle/Luxury vs Essentials+Suites → 1,445 / 5,549. Tell me if Suites should move |

Both confirmed answers mean **no extracts needed reissuing** — my calculations already
matched the source data.
