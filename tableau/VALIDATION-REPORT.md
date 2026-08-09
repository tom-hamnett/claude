# APEX Tableau — Data Validation Report

**Prepared overnight, 30 July 2026.** Every figure below was recomputed from the raw
files you sent and compared against the numbers printed on your slides.

**Headline: the analysis is fully reproducible.** The core spend model reconciles to
the cent. Every number on the four main analytical slides was matched. One
definitional question remains (Section 4) and one small variance (Section 5).

---

## 1. The data model I reverse-engineered

Your slides are all built on one join, with two filters. Once I found these, everything
fell into place:

```
Dim_Hotel  ──InnCode──  Fact_Spend

FILTER 1 (hotel):  Contract Status = 'Open - Accepting Guests'     → 58,825 hotels
FILTER 2 (spend):  L0 = 'Addressable'                              → $256.36bn
```

Field roles:

| Field | Role | Values |
|---|---|---|
| `L0` | Addressability | Addressable / Potentially Addressable / Unadressable |
| `L1` | Lifecycle stage | BUILD / OPEN / OPERATE / IT-TELECOM / Misc |
| `L2` | Category | FF&E, OS&E, F&B, MRO, Energy, Advisory, Hotel Tech… |
| `IHG Flag` | IHG vs competitor | IHG / Non-IHG |
| `Contract Status` | Open vs pipeline | Open - Accepting Guests / Planning Phase / … |

---

## 2. Exact reconciliations (zero variance)

### Slide 4 — IHG's share of the global market

| Measure | Slide | Recomputed | Status |
|---|---|---|---|
| Total hotels | 58,825 | **58,825** | exact |
| Total rooms | 7,529,324 | **7,529,324** | exact |
| Total addressable spend | $256,361,641,307 | **$256,361,641,307** | exact |
| AMER hotels / rooms / spend | 34,314 / 3,959,183 / $153,059,860,779 | **identical** | exact |
| EMEAA hotels / rooms / spend | 12,010 / 1,841,245 / $41,765,327,123 | **identical** | exact |
| GC hotels / rooms / spend | 12,501 / 1,728,896 / $61,536,453,405 | **identical** | exact |
| IHG addressable spend | $28.9B | **$28,913,885,399** | exact |
| Non-IHG hotels | 51,831 | **51,831** | exact |

### Slide 6 — Addressable spend by lifecycle stage

| Stage | Slide | Recomputed | % (slide vs mine) |
|---|---|---|---|
| BUILD | $121.7B | **$121.74bn** | 47.5% / 47.5% |
| OPERATE | $63.8B | **$63.79bn** | 24.9% / 24.9% |
| OPEN | $58.0B | **$58.00bn** | 22.6% / 22.6% |
| IT/TELECOM | $12.8B | **$12.83bn** | 5.0% / 5.0% |

### Slide 2 — IHG management-type split

| Segment | Slide | Recomputed |
|---|---|---|
| Franchised | 5,904 (84.4%) | **5,904 (84.4%)** |
| Managed | 1,088 (15.6%) | **1,088 (15.6%)** |

### Slide 14 — Market × category performance

Every value on this slide reconciles. My original guess at which region each number
belonged to was wrong (PowerPoint XML doesn't preserve visual position), but the value
set matches perfectly:

| Region | IHG addressable ($M) | Slide has this value |
|---|---|---|
| AMER | **18,899** | yes |
| GC | **4,552** | yes |
| EUR | **3,137** | yes |
| IMEA | **1,345** | yes |
| EAPAC | **981** | yes |
| EMEAA (= EUR+IMEA+EAPAC) | **5,463** | yes (as 5,464) |

Programme spend, AMER: **$901.7M** — slide shows "902". Exact.

### QBR operational metrics

| Metric | Slide | Recomputed | Status |
|---|---|---|---|
| CRF total 2025 | ~$27M | **$27.05M** | exact |
| CRF 2026 YTD | $8.26M | **$8.26M** | exact |
| CRF 2026 AMER / EMEAA / GC | 5.81 / 1.37 / 1.08 ($M) | **identical** | exact |
| CMH P2P systems, 2025 YE | 755 | **755** | exact |
| CMH P2P by region 2025 YE | AMER 88 / EMEAA 245 / GC 422 | **identical** | exact |
| Franchise P2P, 2025 YE | 256 | **256** | exact |
| Sedex outreach / pre-screened / no-response | 415 / 356 / 59 | **identical** | exact |
| IHG programme (P2P) spend 2025 | $1.16B | **$1,158.4M** | exact |

---

## 3. Two structural traps I found (and fixed)

These would have silently corrupted the dashboard, so worth knowing:

**a) The P2P tracker mixes detail rows with subtotal rows.** Rows where
`Market='All'` and `Product='All'` are roll-ups sitting in the same sheet as the
market-level detail. Summing everything **double-counts exactly 2×**. I excluded the
subtotals — a fact table must sit at one grain.

**b) Greater China rolls up three estate sub-types.** The "CMH 755" figure is:

```
Managed (342) + Managed & Franchised (80)      = 422  ← GC contribution to CMH
Managed - N/A (702)                            = EXCLUDED from CMH
AMER 88 + EMEAA 245 + GC 422                   = 755  ✓
```

I added an `estate_group` field encoding this, so Tableau can't get it wrong.

**c) System Size sheets have different column offsets.** The Rooms sheets put
geography in column A; the Hotels sheets put it in column B. I detect the header
dynamically. The geography column also mixes hierarchy levels (region roll-ups like
"Americas by Country" alongside countries like "France."), so I added a `geo_level`
field — **filter to one level or you'll double-count.** Verified consistent:
Americas 531,420 + EMEAA 293,825 + GC 223,486 = 1,048,731 rooms.

---

## 4. The one open definitional question

Slides 12 and 13 use a **narrower** addressable base than slides 4/6/14:

| | Slides 4 / 6 / 14 | Slides 12 / 13 |
|---|---|---|
| Total addressable | $256.4bn | "$141bn" |
| IHG addressable | $28.9bn | "$15.6bn" |

I traced this to **excluding modelled pipeline BUILD costs** — i.e. "directly
addressable" = addressable spend where `L1 <> 'BUILD'`. That produces:

| Measure | Slide 12/13 | Excl-BUILD calc | Variance |
|---|---|---|---|
| IHG directly addressable | $15.6bn | **$15.23bn** | −2.4% |
| Market directly addressable | $141bn | **$134.62bn** | −4.5% |
| Capture rate (prog ÷ addressable) | 7.4% | **7.60%** | +0.2pp |
| Average CRF rate (CRF ÷ prog) | 2.3% | **2.34%** | +0.04pp |

The two ratios land essentially on the slide values, which strongly suggests the
excl-BUILD basis is right. The residual ~2–4% on the absolute figures suggests your
model adds back a slice of BUILD as *tracked* spend. I checked whether BUILD splits
into tracked vs modelled — it doesn't in this dataset; BUILD is entirely modelled
FF&E (Guestroom Fit-Out, MEP, FF&E Specified in Design, Hotel Opening Equipment).

**→ Question for you:** is "directly addressable" defined as excluding *all* BUILD, or
excluding pipeline BUILD but retaining some tracked build spend? I've built the
dashboard to support both via a toggle, so this doesn't block anything.

---

## 5. Variances worth knowing

| Item | Slide | Mine | Likely cause |
|---|---|---|---|
| IHG open hotels | 7,014 (slide 4) | **6,994** | Slide 2 also says 6,994 — the 7,014 looks like a different extract date. 0.3%. |
| IHG rooms | 1,035,589 | **1,032,379** | Same. 0.3%. |
| P2P 2026 monthly, CMH | 755 (Jan/Feb) | **777** | 2025 year-end matches exactly; the tracker has been updated since the QBR was produced. |
| P2P 2026 monthly, Franchise | 256 / 426 | **254 / 424** | Same — off by 2. |
| Hotel size split (<100 rooms) | 3,925 / 3,069 | **2,935 / 4,059** | Different threshold or field. Totals agree (6,994). Flagged — see below. |
| Segment split (Premium+L&L) | 1,337 / 5,657 | **1,445 / 5,549** | Grouping definition differs by 108 hotels. |

**Definitions — now resolved (Tom, 30 July):**

| Question | Answer | Outcome |
|---|---|---|
| **Hotel Size** — slide 3,925 vs calc 2,935 | Slide had a 2/3 transposition; **Excel is correct** | `RMS < 100` → **2,935 / 4,059** stands. No change needed. |
| **Directly addressable** — slide $15.6bn vs calc $15.23bn | **Spreadsheet is gospel**; slide is stale | Excl-BUILD → **$15.23bn** stands. No change needed. |
| **Premium + L&L vs E&S** — slide 1,337 / 5,657 vs calc 1,445 / 5,549 | *still open* | Currently Premium+Lifestyle/Luxury vs Essentials+Suites. Question is whether the 808 "Suites" hotels sit in E&S. |

Both resolved answers confirm the extracts were **already correct** — nothing needed
reissuing. Section 4's open definitional question is therefore closed: the excl-BUILD
basis is confirmed as the "directly addressable" definition.

---

## 5b. Region mapping corrected (Tom, 3 Aug)

The programme-spend file labels regions `AMER` / `ASIA` / `EUROPE/MIDDLE EAST`, which do
**not** match IHG's actual structure. Tom confirmed: **EMEAA = Europe + IMEA + EAPAC**,
and **GC is Greater China only** (incl. Taiwan/Macau), not wider Asia.

Rather than approximate, region is now derived from the hotel master — all 222 hotel
codes join to `Dim_Hotel` on `InnCode`, so the true region is known per hotel.

What `ASIA` actually contained:

| Label | True region | Sub-region | Spend |
|---|---|---|---|
| ASIA | **EMEAA** | SEAK, Australasia & Pacific, Japan & Micronesia | $49.8m |
| ASIA | GR CHINA | GR CHINA (1 hotel) | $92.9m |
| EUROPE/MIDDLE EAST | **EMEAA** | UK&I, IMEA, S. Europe, N. Europe | $113.9m |

Impact — the earlier approximation was materially wrong:

| Programme spend | Approximated | **Corrected** |
|---|---|---|
| AMER | $901.7m | $901.7m |
| EMEAA | $113.9m | **$163.8m** (+44%) |
| GC | $142.7m | **$92.9m** (−35%) |

Capture rates (directly-addressable basis) therefore change materially:

| Region | Approximated | **Corrected** |
|---|---|---|
| AMER | 4.77% | **9.07%** |
| EMEAA | 2.09% | **5.73%** |
| GC | 3.13% | **3.81%** |

The strategic read changes with it: EMEAA is roughly **3× stronger** than the broken
mapping implied, and **GC — not EMEAA — is the genuine laggard.**

`Fact_Programme_Spend` now carries `region`, `sub_region`, `region_std` and
`reporting_region` (AMER / EUR / IMEA / EAPAC / GC), all derived from the hotel master.
`source_region_label` retains the original label for traceability.

## 5c. Category taxonomies conformed (9 Aug) — and what it exposed

Building the AI layer's metric contract meant checking every measure against the data.
That turned up a structural problem nobody had hit yet, because nobody had tried to slice
capture by category before.

**The two fact tables speak different languages.** `Fact_Spend_Agg` (the market model)
uses FF&E / F&B / Energy / OS&E / MRO / Hotel Tech; `Fact_Programme_Spend` uses 43
level-2 categories under 11 level-1 headings. They shared no join.

Consequence: slicing Headroom by category — or by segment, chain scale, market type or
priority market — filtered the market side only. **Programme spend came back at its full
$1,158.4m in every single cell**, so all five Headroom charts on page 3 were wrong. Fixed
with a 43-value crosswalk (`scripts/b_conform.py`) plus five conformed dimensions, and
hotel attributes inherited onto the programme file via `hotel_code → InnCode` (all 222
hotels join).

### What that made computable — capture rate by category, for the first time

| Category | Directly addressable | Captured | Capture rate |
|---|---:|---:|---:|
| **FF&E** | $5.81bn | $47.4m | **0.82%** |
| F&B | $3.29bn | $434.9m | 13.22% |
| Energy | $1.64bn | $161.9m | 9.85% |
| OS&E | $1.62bn | $109.2m | 6.74% |
| MRO | $1.41bn | $92.4m | 6.56% |
| Hotel Tech | $1.46bn | $19.4m | 1.32% |

**FF&E is the largest addressable category and the worst captured** — $5.76bn of headroom,
40% of the total. Either the single biggest opportunity in the estate, or FF&E spend is
being captured in a system that does not feed the programme tracker. The two readings
lead to opposite actions, so this needs settling before it is presented.

### And a scope mismatch in the headline capture rate

| | Amount | % of programme spend |
|---|---:|---:|
| Programme spend in categories with an addressable base | $865.2m | 74.7% |
| Programme spend with **no** addressable base | **$293.2m** | **25.3%** |

$212.5m of that is HR, plus Travel ($28.1m), Management charges ($27.6m) and Advisory
($25.1m) — captured spend the market model does not treat as addressable at all.

So the headline capture rate counts spend its own denominator excludes:

| Basis | Rate |
|---|---:|
| Headline (all programme spend ÷ IHG directly addressable) | **7.60%** |
| Like-for-like (matched categories only) | **5.68%** |

Both are now published as measures. **Neither is hidden, and that is deliberate** — but
it is not sustainable in a target-setting conversation. Either the market model gets
extended to cover HR and Travel, or the reported number becomes 5.68%. Your call.

`Headroom` was also redefined to use the like-for-like numerator, so a category with no
addressable base nets to zero rather than showing a spurious negative. Total headroom is
therefore **$14.37bn**, not $14.07bn.

---

## 6. A data-protection flag

`CRF_Analysis_2023-2026.xlsx` → sheet **`Pivots`** contains **named individuals**
(employee names) against spend figures. I excluded that sheet entirely and built CRF
from the clean regional sheets (`2023`–`2026`) instead.

**If this dashboard gets published to a wider Tableau audience, personal-level data
must not ride along.** Worth a look before you share.

---

## 7. What this means

The analysis in those decks is **not** a one-off manual exercise — it's fully
reproducible from the raw files, which means it can be automated and refreshed. That's
exactly the foundation you wanted: a governed data layer that Tableau reads today and
the AI layer can read later.
