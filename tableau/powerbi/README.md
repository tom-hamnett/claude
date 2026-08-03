# APEX — pre-built Power BI project

> **Use `APEX-PowerBI-v2.zip` and unzip to a BRAND NEW EMPTY FOLDER.**
> v2 fixes the `$0bnbn` formatting, the missing `stackedColumnChart` visuals and the
> capture-heatmap error. Unzipping over an old copy does **not** work — Power BI keeps
> cache folders and Windows tends to nest rather than overwrite. A clean folder avoids both.

**Open one file and the model, relationships, DAX measures and 38 visuals across 4 pages
are already built.** No dragging required.

The four pages tell one story: **size the prize → diagnose the gap → target the action →
track delivery.** See **[STORYLINE.md](STORYLINE.md)** for what each page argues.

## What's here

| File | What it is |
|---|---|
| `APEX_v2.pbip` | **Open this in Power BI Desktop** |
| `APEX_v2.SemanticModel/model.bim` | 9 tables, typed columns, relationship, 10 DAX measures |
| `APEX_v2.Report/report.json` | 2 report pages, 18 visuals, slicers |
| `STORYLINE.md` | **What each page argues** — read this alongside the dashboard |
| `FALLBACK-PowerQuery.txt` | Paste-in M scripts — use if the `.pbip` misbehaves |
| `FALLBACK-Measures.dax` | Paste-in DAX measures — same fallback |
| `gen_pbip.py` / `gen_report.py` | Generators, so this is reproducible not hand-made |

## How to open it (3 steps)

1. **Unzip the data** from `../data/APEX_Tableau_Data.zip` into a folder —
   e.g. `C:\APEX Data\`. Nine CSVs should sit directly in it.
2. **Download `APEX-PowerBI-v2.zip`** (click it, then the download icon) and **unzip it
   to a brand new empty folder**, e.g. `C:\APEX PowerBI v2\`.
   *GitHub can't download a folder, so this zip keeps the structure intact —
   the `.pbip` needs its two sub-folders sitting next to it.*
3. **Double-click `APEX_v2.pbip`.** Power BI Desktop opens it and prompts for the
   **`DataFolder`** parameter → enter your data folder path (e.g. `C:\APEX Data`)
   → **Load**.

> Keep the two folders separate: **data** CSVs in one, **project** files in the other.
> The `DataFolder` parameter is what links them.

> If it doesn't prompt: **Home → Transform data → Manage Parameters**, set `DataFolder`,
> then **Home → Refresh**.

## First thing to check

On page 1, the **"Total Addressable"** card should read **$256bn**
(precisely $256,361,641,307).

That's the figure from slide 4. If it matches, the whole model is correct and every
other visual will tie to your slides.

## What's pre-built

**10 DAX measures**, including the ones your slides depend on:

| Measure | Returns |
|---|---|
| `Addressable Spend` | $256.36bn (market) |
| `IHG Addressable Spend` | $28.91bn |
| `IHG Share of Addressable %` | 11.3% |
| `Directly Addressable Spend` | excl-BUILD basis — **$15.23bn** for IHG (your confirmed definition) |
| `Programme Spend` | $1,158.4M |
| `CRF Total` | $27.05M (2025) |
| `Capture Rate %` | programme ÷ directly addressable |
| `Average CRF Rate %` | CRF ÷ programme |

**Page 1 — Market & Share of Wallet:** 4 KPI cards, lifecycle bar, IHG-vs-market
stacked bar, spend waterfall, region × lifecycle, segment mix, capture matrix.

**Page 2 — QBR Operational:** CRF monthly, P2P rollout, supplier programmes, system
size, plus the three slicers you must not remove.

## Honest caveat

`.pbip` is a text format Power BI reads directly, but it's version-sensitive. If
Desktop complains or a visual looks empty:

- **The model is the valuable part** and is the most robust piece — visuals are quick to
  rebuild by dragging.
- Use **`FALLBACK-PowerQuery.txt`** (9 queries) + **`FALLBACK-Measures.dax`**
  (10 measures) to build a clean file manually in ~10 minutes, then follow
  `../POWERBI-BUILD-GUIDE.md` for the visuals.

Either way you're not starting from a blank page. **Tell me what happens when you open
it** and I'll fix whatever it complains about.

## Three filters that must stay

These prevent double-counting — they're pre-set on the visuals, don't remove them:

| Table | Filter | Why |
|---|---|---|
| `Fact_P2P` | `estate_group` | Mixing gives 1,479 instead of 755 |
| `Fact_SystemSize` | `geo_level` | Region roll-ups + countries share one column |
| `Fact_Supplier` | `row_type` | Else Targets and Actuals land in the same bar |
