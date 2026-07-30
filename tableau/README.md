# APEX BI Build (Power BI / Tableau)

Validated, BI-ready data and build instructions, generated from the raw IHG Procurement
Excel/CSV extracts.

**The data is tool-agnostic.** The same nine CSVs drive Power BI, Tableau, or the later
AI layer — only the build clicks differ.

## Start here

0. **[powerbi/](powerbi/)** ← **fastest start.** A pre-built `.pbip` with the model,
   10 DAX measures and 18 visuals already in place. Open it, point it at your data folder.
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

`data/APEX_Tableau_Data.zip` (7.4 MB) — all nine extracts. Download, unzip to a local
folder, connect Tableau to it.

The small operational files are also loose in `data/` for quick inspection.

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
`b_p2p.py` → `b_supp.py` → `b_sys.py` → `b_prog.py` → `b_sow.py`.

## Note on personal data

The `Pivots` sheet of `CRF_Analysis_2023-2026.xlsx` contains named individuals against
spend. It is **excluded** from all extracts; CRF is built from the clean regional
sheets. Check before publishing more widely.
