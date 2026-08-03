# APEX — the dashboard storyline

Four pages, each answering one question a decision-maker actually asks. Read left to
right, top to bottom; drill down by clicking any bar (everything cross-filters).

---

## Page 1 — **The Prize**
> *"How big is the opportunity, and where does it sit?"*

**Top row (the framing numbers)**

| Card | Value | Meaning |
|---|---|---|
| Total market spend | $439bn | Everything branded hotels spend |
| Procurement-addressable | $256bn | What procurement can actually influence |
| IHG estate addressable | $28.9bn | The slice inside our own estate |
| IHG share of addressable | 11.3% | Our share of the global addressable pool |

**Then the shape of it**
- **Waterfall** — how $439bn narrows to $256bn addressable. Sets the boundary of the game.
- **Lifecycle bar** — BUILD is ~48% of the pool. Most spend happens before a hotel opens.
- **Region bar** — AMER is 60% of addressable spend.
- **Bottom row** — the same pool cut by chain scale, segment, and management type.

**The takeaway to land:** the addressable market is large and heavily weighted to BUILD
and to AMER. That's the backdrop for everything on page 2.

---

## Page 2 — **Our Position**
> *"Of that opportunity, how much are we actually capturing?"*

This is the page that carries the argument.

**The walkdown, left to right across the cards:**

```
IHG estate addressable      $28.9bn
   ↓ exclude modelled pipeline BUILD
Directly addressable        $15.2bn      ← what we can realistically touch today
   ↓ what actually flows through IHG programmes
Programme spend             $1.16bn      ← 7.6% capture
   ↓ what we collect on it
CRF collected                 $27m       ← 2.3% of programme spend
```

**Then the diagnosis**
- **Addressable vs captured by region** — two bars side by side. The gap *is* the story.
- **Capture rate by region** — AMER ~4.8%, GC ~3.1%, EMEAA ~2.1%. AMER carries the load;
  the others are the runway.
- **The OPERATE gap** — the single most important chart. OPERATE is a large share of
  directly-addressable spend yet barely captured. It drags the blended rate down.
- **Region × lifecycle matrix** — capture rate in every cell. Dark = working, pale = gap.

**The takeaway to land:** we own ~11% of the addressable wallet but capture under 1%.
The gap is concentrated in OPERATE, and outside AMER.

---

## Page 3 — **Where to Act**
> *"Given that, where specifically should we aim?"*

Built entirely around one measure — **Headroom** = directly addressable − captured.
It answers "how much is still on the table here?"

- **Headroom by category × region matrix** — the targeting grid. Biggest numbers = biggest prize.
- **Biggest category headroom** — ranked bar. Where to point category teams.
- **By market type / segment / priority market** — is the headroom in priority markets
  (where we have leverage) or elsewhere (where we may not)?
- **Slicers** for lifecycle, chain scale and region so you can test a hypothesis in
  seconds: *"show me OPERATE headroom in EMEAA priority markets only."*

**The takeaway to land:** a shortlist of category × market combinations worth a plan.

---

## Page 4 — **Delivery (QBR)**
> *"Are the things we're already doing on track?"*

The operational tracking that sits under the strategy — your existing QBR metrics:
CRF by month, P2P rollout, supplier programmes (Sedex / EcoVadis / Rapid Ratings),
and system size growth.

**Three slicers you must set** (they prevent double-counting):

| Slicer | Set it to | Why |
|---|---|---|
| `estate_group` | `CMH (Managed)` or `Franchise` | Unfiltered mixes both plus an excluded bucket |
| `geo_level` | `Region` (or Total, or Country) | Geography column holds roll-ups *and* countries |
| `programme` | one of Sedex / EcoVadis / Rapid Ratings | Plus filter `row_type` = Actual |

---

## How the four pages hang together

```
1. The Prize        →  the opportunity is $256bn, we can address $28.9bn of it
2. Our Position     →  we capture $1.16bn of it — the gap is OPERATE, and non-AMER
3. Where to Act     →  here are the specific category x market pockets of headroom
4. Delivery         →  and here's whether current initiatives are on track
```

That's a strategy conversation: **size the prize → diagnose the gap → target the
action → track delivery.**

---

## Two things to know while reading it

**Cross-filtering is on.** Click any bar and every other visual on the page responds.
Click AMER on page 2 and the whole page becomes the AMER story. Ctrl+click to
multi-select. Click again to clear.

**Two "addressable" definitions, deliberately.**
- **Addressable** ($256bn market / $28.9bn IHG) — everything, including modelled
  pipeline BUILD. Used on page 1 to size the market.
- **Directly addressable** ($15.2bn IHG) — excludes modelled pipeline BUILD. Used from
  page 2 onward, because it's what can realistically be captured today. This is the
  basis you confirmed as gospel.

Capture rates always use *directly addressable* as the denominator — otherwise the
modelled pipeline flatters the gap.
