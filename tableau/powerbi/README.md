# APEX — pre-built Power BI project

> **Use `APEX-PowerBI-v2.zip` and unzip to a BRAND NEW EMPTY FOLDER.**
> Unzipping over an old copy does **not** work — Power BI keeps cache folders and Windows
> tends to nest rather than overwrite. A clean folder avoids both.
>
> **Re-download the data zip too.** This build adds seven tables, so an old data folder
> will fail on refresh.

**Open one file and the model, relationships, DAX measures and 47 visuals across 5 pages
are already built.** No dragging required.

The five pages tell one story: **size the prize → diagnose the gap → target the action →
track delivery → read the narrative.** See **[STORYLINE.md](STORYLINE.md)** for what each
page argues, and **[../ai/AI-OVERLAY.md](../ai/AI-OVERLAY.md)** for the AI layer built on
top of it.

## What's here

| File | What it is |
|---|---|
| `APEX_v2.pbip` | **Open this in Power BI Desktop** |
| `APEX_v2.SemanticModel/model.bim` | 18 tables, 18 relationships, 21 DAX measures, all described |
| `APEX_v2.Report/report.json` | 5 report pages, 47 visuals, slicers |
| `STORYLINE.md` | **What each page argues** — read this alongside the dashboard |
| `FALLBACK-PowerQuery.txt` | Paste-in M scripts — use if the `.pbip` misbehaves |
| `FALLBACK-Measures.dax` | Paste-in DAX measures — same fallback |
| `gen_pbip.py` / `gen_report.py` | Generators, so this is reproducible not hand-made |
| `validate.py` | Pre-flight: every visual reference resolves against the model |
| `check_data.py` | Pre-flight: the CSVs in your data folder match the model exactly |

## How to open it (3 steps)

1. **Unzip the data** from `../data/APEX_Tableau_Data.zip` into a folder —
   e.g. `C:\APEX Data\`. Seventeen CSVs should sit directly in it.
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

**21 DAX measures** in eight display folders, each carrying its own definition,
alternative names and guardrails in the description field — which is what Power BI
Copilot reads. The ones your slides depend on:

| Measure | Returns |
|---|---|
| `Addressable Spend` | $256.36bn (market) |
| `IHG Addressable Spend` | $28.91bn |
| `IHG Share of Addressable %` | 11.3% |
| `Directly Addressable Spend` | excl-BUILD basis — **$15.23bn** for IHG (your confirmed definition) |
| `Programme Spend` | $1,158.4M |
| `CRF Total` | $27.05M (2025) |
| `Capture Rate %` | programme ÷ directly addressable — **7.60%** |
| `Capture Rate % (like-for-like)` | same scope both sides — **5.68%** |
| `Headroom` | directly addressable − captured — **$14.37bn** |
| `Average CRF Rate %` | CRF ÷ programme — **2.34%** |

**Page 1 — The Prize:** 4 KPI cards, waterfall, lifecycle and region bars, chain scale /
segment / management type.

**Page 2 — Our Position:** the capture walkdown, addressable vs captured by region and
lifecycle, headline vs like-for-like capture rate, region × lifecycle matrix.

**Page 3 — Where to Act:** headroom by category × region, and by market type, segment and
priority market — all now sliced from conformed dimensions, so programme spend filters
with them.

**Page 4 — Delivery (QBR):** CRF monthly, P2P rollout, supplier programmes, system size,
plus the three slicers you must not remove.

**Page 5 — Narrative:** the AI overlay surface. Insights tagged to the same region and
lifecycle keys as the numbers, so words and figures filter together.

## Honest caveat

`.pbip` is a text format Power BI reads directly, but it's version-sensitive. If
Desktop complains or a visual looks empty:

- **The model is the valuable part** and is the most robust piece — visuals are quick to
  rebuild by dragging.
- Use **`FALLBACK-PowerQuery.txt`** + **`FALLBACK-Measures.dax`** to build a clean
  file manually, then follow `../POWERBI-BUILD-GUIDE.md` for the visuals.
- Before reporting a problem, run `python3 validate.py` and
  `python3 check_data.py <your data folder>` — they catch most of it in a second.

Either way you're not starting from a blank page. **Tell me what happens when you open
it** and I'll fix whatever it complains about.

## Three filters that must stay

These prevent double-counting — they're pre-set on the visuals, don't remove them:

| Table | Filter | Why |
|---|---|---|
| `Fact_P2P` | `estate_group` | Mixing gives 1,479 instead of 755 |
| `Fact_SystemSize` | `geo_level` | Region roll-ups + countries share one column |
| `Fact_Supplier` | `row_type` | Else Targets and Actuals land in the same bar |
| `Fact_Programme_Spend` | `measure` | Else the tracker's own total rows double-count |

And one rule that is new: **slice category, segment, chain scale, market type and
priority market from the `Dim_` tables, never from `Fact_Spend_Agg`.** Slicing the
fact column filters the market side only, and programme spend stays at its full
$1,158.4m in every cell. That is what made the old page 3 wrong.
