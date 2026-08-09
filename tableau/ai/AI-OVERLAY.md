# The AI overlay — architecture and build sequence

The goal you set at the start of this work: *"this dashboard of data to be the basis upon
which any AI project management dashboard can pull information and overlay information
from Files to provide an intelligent interface."*

This document is what that actually means in build terms, what is now done, and what the
next decision is.

---

## The core idea: split the numbers from the words

Almost every failed "AI dashboard" fails the same way — it lets the language model do
arithmetic. It sounds confident, the number is wrong, and the first person to check it in
Excel never trusts the tool again. With numbers this politically loaded (a capture rate
that sets category targets) that happens once and the project is over.

So the overlay has two halves, deliberately separated:

```
      NUMBERS                                    WORDS
      ───────                                    ─────
  Power BI semantic model              Documents in PE Sources
  21 DAX measures, validated           Strategy decks, QBRs, category plans
  to the cent against your slides      Context, rationale, commitments

           │                                        │
           └──────────────┬─────────────────────────┘
                          │
                  THE METRIC CONTRACT
              one definition per term, with
              guardrails and validated values
                          │
                          ▼
                 Conversational surface
        "Why is Greater China only capturing 3.8%?"
```

The model computes. The documents explain. The contract stops the two contradicting each
other. **The language model never calculates — it selects a measure, reads the result, and
puts it in context.**

---

## What is built now

### 1. The metric contract — `contract.py` → `metrics.json`

21 measures, each with: a plain-English definition, alternative names people actually use,
the DAX, the guardrails, and a validated value recomputed from the extracts on
2026-08-09. Plus 25 dimensions and the nine rules that must never be broken.

This is the single source of truth. The Power BI model's descriptions, the agent system
prompt and the narrative table are all *generated* from it, so there is exactly one
definition of "capture rate" in the whole stack.

| File | What it is |
|---|---|
| `metrics.json` | Machine-readable. Hand this to any agent as grounding. |
| `METRICS-CONTRACT.md` | The same, for humans to disagree with. |
| `apex-analyst-system-prompt.md` | Drop-in system prompt, portable across hosts. |
| `synonyms.json` | Field → alternative names, for Power BI Q&A setup. |

### 2. The semantic model, made legible to an AI

Every measure now carries a description containing its meaning, its synonyms, its
guardrails and its validated value — because that description field is what Power BI
Copilot reads. Measures sit in eight display folders; technical join and sort columns are
hidden so the field list shows only things a person would ask about.

> Synonyms live inside the description text rather than in a linguistic schema on purpose.
> Power BI's linguistic-schema format is version-sensitive and a malformed one refuses to
> open the file at all. Description text is a plain property nothing can reject. Same
> effect on Copilot, no risk to a file you need to open.

### 3. The narrative bridge — `Fact_Insight`

A table of insights tagged with the same region and lifecycle keys as the facts, so words
and numbers filter together. Page 5 of the dashboard is that surface: pick Greater China
and OPERATE, and you get both the capture rate and the commentary that applies to it.

23 insights are seeded today, every one computed from the validated model rather than
typed in — regenerate with `gen_insights.py` and they update with the data. The schema has
a `source_type` column ready for `Document` rows once document extraction is reconnected.

### 4. Five bugs fixed on the way

Building the contract meant checking every measure against the data, which surfaced these:

| What | Effect |
|---|---|
| **Category, segment, chain scale, market type and priority market had no conformed dimension** | Slicing any of them filtered the market side only. Programme spend came back at its full $1,158.4m in *every cell*, so all five Headroom charts on page 3 were wrong. Fixed with five conformed dimensions plus a 43-value category crosswalk. |
| **$293.2m of programme spend has no addressable denominator** | 25.3% of what we capture (mostly HR, plus Travel, Advisory, Management charges) sits in categories the market model does not treat as addressable. The headline 7.60% capture rate counts spend its own denominator excludes. Added `Capture Rate % (like-for-like)` = **5.68%**. Both are published; neither is hidden. |
| **Headroom netted off spend with no matching base** | Now uses the like-for-like numerator, so a category with no addressable base nets to zero instead of showing a spurious negative. Total headroom **$14.37bn**. |
| **Category-level capture was not computable at all** | The two fact tables used different taxonomies. Now crosswalked — and it is the most interesting cut in the whole model (below). |
| **No pre-flight validation** | `validate.py` and `check_data.py` now catch broken visual references and CSV/model drift in a second, rather than after a 7 MB download and a Desktop restart. |

---

## The finding worth your attention

Category-level capture is now computable for the first time, and it does not say what the
deck says:

| Category | Directly addressable | Captured | Capture rate |
|---|---:|---:|---:|
| **FF&E** | $5.81bn | $47.4m | **0.82%** |
| F&B | $3.29bn | $434.9m | 13.22% |
| Energy | $1.64bn | $161.9m | 9.85% |
| OS&E | $1.62bn | $109.2m | 6.74% |
| MRO | $1.41bn | $92.4m | 6.56% |
| Hotel Tech | $1.46bn | $19.4m | 1.32% |

FF&E is the **largest** addressable category and the **worst** captured — $5.76bn of
headroom, 40% of the total. That is either the biggest single opportunity in the estate,
or FF&E spend is being captured somewhere that does not feed the programme tracker.

Worth establishing which before it goes in front of anyone, because the two readings lead
to opposite actions.

Two more that contradict the deck's framing, both flagged in the model as
*Needs review* rather than silently corrected:

- **OPERATE captures 11.73% — the strongest stage, not the weakest.** The deck's "OPERATE
  barely captured" used the market-wide denominator.
- **GC, not EMEAA, is the laggard** at 3.81% (this one you already confirmed against your
  own pivot).

---

## The next decision: where the conversation lives

The plumbing above is host-agnostic on purpose — it works with all three of these. What
differs is cost, time, and how much of the infosec conversation you have to reopen.

### Option A — Power BI Copilot on the published model

**Fastest to something sanctioned.** Publish to a workspace in the IHG tenant; the model
is already Copilot-ready. Entra SSO by default, no public URL, no new vendor — which is
precisely the finding that got APEX pulled.

- *Needs:* a Fabric capacity (F2+) or Premium-Per-User on the workspace. Your Pro Creator
  licence alone does not include Copilot.
- *Gives you:* natural-language questions over the numbers, answers computed by DAX.
- *Does not give you:* anything from the documents.

### Option B — Q&A visual (zero extra licence)

The Q&A visual is built into Power BI Desktop and needs no capacity at all. Less capable
than Copilot, but it reads the same descriptions and synonyms, and it works **today**.

**This is the sensible first move regardless of which option you land on** — it costs
nothing, it proves whether the model answers questions the way people actually ask them,
and whatever synonyms you find missing feed straight back into `contract.py`.

### Option C — documents as well as numbers

The words half needs a document surface. Realistic routes, in order of how much new
governance conversation each opens:

1. **A SharePoint agent on the PE Sources folder** — stays inside the tenant, inherits
   existing permissions, no new data movement. Needs M365 Copilot licensing.
2. **Copilot Studio agent** — combines the SharePoint folder and the Power BI model in one
   conversation. This is the closest thing to what you originally described. Needs a
   Copilot Studio licence and, in practice, IT sponsorship.
3. **Revived APEX behind Entra SSO** — you already have the extraction pipeline and it
   worked. But it reopens the whole infosec conversation, and the architecture diagram
   Bent asked for is still outstanding.

**Recommendation: A or B for the numbers, then 1 for the words.** Both halves land inside
the Microsoft tenant, both inherit Entra, and neither requires a new vendor assessment.
`Fact_Insight` is the join between them — document-derived rows land in the same table the
dashboard already reads, so the overlay works whether or not the conversational layer ever
gets funded.

---

## What to do next, in order

1. **Verify the rebuilt dashboard.** Page 2 capture rate `7.60%` and the new like-for-like
   `5.68%`; page 3 headroom now varies by category (it did not before); page 5 is the
   narrative panel.
2. **Answer the FF&E question** — genuine gap, or spend captured elsewhere? It moves 40%
   of the headroom.
3. **Decide the capture-rate basis** — extend the market model to cover HR and Travel, or
   report the like-for-like 5.68%. Currently both are published, which is honest but not
   sustainable in a target-setting conversation.
4. **Turn on the Q&A visual** and ask it ten questions in the words your stakeholders
   actually use. Missing synonyms go back into `contract.py`.
5. **Then**, and only then, pick a conversational host. The contract makes that a
   swappable decision rather than a rebuild.

---

## Regenerating everything

```bash
# 1. conform the extracts (run after the b_*.py extract scripts)
python3 tableau/scripts/b_conform.py <data-folder>

# 2. rebuild the narrative table from the validated model
python3 tableau/ai/gen_insights.py <data-folder>

# 3. rebuild the contract artefacts from contract.py
python3 tableau/ai/gen_contract.py

# 4. rebuild the Power BI project
python3 tableau/powerbi/gen_pbip.py
python3 tableau/powerbi/gen_report.py

# 5. pre-flight — catches broken references and CSV/model drift
python3 tableau/powerbi/validate.py
python3 tableau/powerbi/check_data.py <data-folder>
```

Change a definition in `contract.py` and it propagates to the model descriptions, the
agent prompt, the documentation and the narrative table in one pass. That is the point:
the definitions are the product, and everything else is generated from them.
