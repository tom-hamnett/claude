# APEX BI Build (Power BI / Tableau)

Validated, BI-ready data and build instructions, generated from the raw IHG Procurement
Excel/CSV extracts.

**The data is tool-agnostic.** The same nine CSVs drive Power BI, Tableau, or the later
AI layer — only the build clicks differ.

## Start here

0. **[powerbi/](powerbi/)** ← **fastest start.** A pre-built `.pbip` with the model,
   21 DAX measures and 47 visuals across 5 pages already in place. Open it, point it at
   your data folder.
0b. **[ai/AI-OVERLAY.md](ai/AI-OVERLAY.md)** — the AI layer: architecture, the metric
   contract, what it fixed, and the next decision.
1. **[POWERBI-BUILD-GUIDE.md](POWERBI-BUILD-GUIDE.md)** — build it yourself / understand it. Tom has a
   Power BI Creator licence. Click-by-click for two dashboards, incl. DAX measures.
2. **[VALIDATION-REPORT.md](VALIDATION-REPORT.md)** — what reconciled against the slides
   (the core model matches to the cent) and the structural traps found.
3. **[TABLEAU-BUILD-GUIDE.md](TABLEAU-BUILD-GUIDE.md)** — same dashboards in Tableau,
   kept for reference if a Tableau Creator seat appears later.

## Why Power BI is the better route

Beyond the licence Tom already has: publishing to Power BI puts the dashboard **inside
the IHG Microsoft tenant behind Entra SSO**, restricted to named users, embeddable in
Teams/SharePoint. That directly answers the "publicly reachable, unauthenticated"
finding that got the APEX prototype pulled — a shorter path to something *sanctioned*
than either the Tableau or GCP routes.

## Data

`data/APEX_Tableau_Data.zip` (7.7 MB) — all 17 extracts. Download, unzip to a local
folder, point the `DataFolder` parameter at it.

The small files are also loose in `data/` for quick inspection.

| File | Rows | Grain |
|---|---|---|
| `Dim_Hotel.csv` | 61,201 | one row per hotel |
| `Fact_Spend.csv` | 749,294 | hotel × addressability × lifecycle × category |
| `Fact_Spend_Agg.csv` | 45,097 | pre-aggregated — **main dashboard source** |
| `Fact_CRF.csv` | 126 | region × month (2023–26) |
| `Fact_P2P.csv` | 390 | region × market × product × estate × month |
| `Fact_Supplier.csv` | 301 | programme × metric × period |
| `Fact_SystemSize.csv` | 2,880 | estate × unit × geography × metric × month |
| `Fact_Programme_Spend.csv` | 28,313 | hotel × category × year |
| `Fact_ShareOfWallet.csv` | 40 | region × lifecycle × IHG flag |
| `Fact_Insight.csv` | 207 | narrative overlay — insight × region × lifecycle |
| `Dim_Region` `Dim_Lifecycle` `Dim_Category` `Dim_ChainScale` `Dim_Segment` `Dim_Market` `Dim_Priority` | 2–12 each | conformed dimensions |

**The conformed dimensions are not optional.** Slice category, segment, chain scale,
market type or priority market from a fact table and you filter the market side only —
programme spend comes back at its full $1,158.4m in every cell. Slice from the `Dim_`
tables and both sides filter together.

## The model in one line

```
Dim_Hotel ──InnCode── Fact_Spend
  WHERE Contract Status = 'Open - Accepting Guests'   → 58,825 hotels
    AND L0 = 'Addressable'                           → $256.36bn
```

That single join and those two filters reproduce every number on the strategy slides.

## Two filters you must not remove

- `Fact_P2P` → always filter **`estate_group`** (else CMH totals double-count)
- `Fact_SystemSize` → always filter **`geo_level`** (region roll-ups and countries share
  one column)

## Rebuilding

`scripts/` holds the generation scripts (Python + DuckDB). They read the raw source
files and regenerate every extract, so the pipeline is reproducible rather than a
one-off manual clean. Order: `build_db.py` → `build_extracts.py` → `b_ops.py` →
`b_p2p.py` → `b_supp.py` → `b_sys.py` → `b_prog.py` → `b_sow.py` → `b_conform.py`.

Then `ai/gen_insights.py`, `ai/gen_contract.py`, `powerbi/gen_pbip.py`,
`powerbi/gen_report.py`, and finally the two pre-flight checks — `powerbi/validate.py`
(every visual reference resolves) and `powerbi/check_data.py` (CSVs match the model).

## Note on personal data

The `Pivots` sheet of `CRF_Analysis_2023-2026.xlsx` contains named individuals against
spend. It is **excluded** from all extracts; CRF is built from the clean regional
sheets. Check before publishing more widely.
