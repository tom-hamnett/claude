# Cowork kickoff prompt

Paste the block below into a fresh Cowork session on your machine. It assumes the repo is
cloned locally and Cowork can read and write files there.

Two things to do first:

1. **Clone the repo locally** (or copy the folder down) so Cowork can read the existing
   code — `git clone` then `git checkout claude/setup-react-area-chart-RBJ8C`.
2. **Answer the four blocking questions** in the prompt where marked `[ANSWER: ...]`. If
   you cannot answer the Market Trends / Customer Insights ones yet, leave them and the
   build still proceeds — those connectors get stubbed against the same interface and
   filled in later.

Everything else the agent needs is in `APEX-SPEC.md`, which the prompt tells it to read first.

---

## The prompt

```
I'm building a local desktop version of an internal tool called APEX. You have the
existing codebase in this repo. Before writing any code, read APEX-SPEC.md end to end —
it is a complete specification of what the current version does, what works, what is
half-built and what must be rebuilt differently. Then read tableau/ai/AI-OVERLAY.md and
tableau/ai/METRICS-CONTRACT.md, which describe the validated metric layer this tool
must sit on top of.

## Who I am and what this is for

I'm Tom Hamnett, Programme Manager in IHG Global Procurement (Procurement Excellence).
I run a multi-workstream programme and my evidence lives in hundreds of PowerPoint,
Excel and Word files in SharePoint, plus a validated Power BI model, plus two external
tools. I need one interface over all of it.

## Hard constraints — these are not negotiable

1. LOCAL ONLY. This runs on my laptop and must not be reachable from any network.
   Bind the server to 127.0.0.1, not 0.0.0.0. Scope CORS to the loopback origin.
   The previous version was pulled by our infosec team for being reachable on the
   open internet with no authentication. Do not recreate that. Make the loopback
   binding one of the first commits, not an afterthought.

2. NO CLOUD DEPENDENCY except the LLM API call itself, and that must be configurable
   so it can be pointed at Azure OpenAI inside the IHG tenant.

3. THE SQLITE DATABASE STAYS ON LOCAL DISK. Not in a OneDrive-synced folder — sync
   clients corrupt SQLite. Write periodic backups into the synced folder using
   VACUUM INTO, which is safe while the database is open.

4. SOURCE DOCUMENTS ARE READ FROM THE SYNCED SHAREPOINT FOLDER ON DISK. The existing
   Microsoft Graph / OAuth / device-code stack should become the fallback for folders
   that are not synced, not the primary path. Add a `local-folder` source type that
   uses fs.readdir and file mtimes. This removes most of the complexity in the current
   ingestion layer.

5. NEVER LET THE AI COMPUTE A NUMBER. Every figure comes from a defined measure.
   tableau/ai/contract.py is the single definition layer — 21 measures with DAX,
   guardrails and validated values. APEX must read those definitions, never redefine
   them. If a number is not in the contract, say so rather than estimating.

## What to keep from the existing code

Read Part 12 of APEX-SPEC.md. In short, carry forward unchanged:
- the proposal/accept/audit protocol (AI proposes JSON, human accepts, audit log records
  before/after) — this is the most valuable thing in the codebase
- document classification with is_latest resolution (server/documentClassifier.js)
- metadata-aware AI context assembly, board-first, with explicit conflict rules
  (server/index.js, the POST /api/ai handler)
- the multi-provider LLM abstraction (server/ai/providers.js)
- the gap engine (GET /programmes/:id/gaps)
- contextual ingestion modes: update / replace / reference
- the visual design, the four-page navigation and the QBR-matching chart format

## What to rebuild differently

- ROW STORAGE. The current design stores every data row as a JSON string in SQLite and
  parses them all in Node on every query. It cannot handle the validated extracts —
  Fact_Spend alone is 749,294 rows. Replace it with DuckDB reading the CSV or Parquet
  files directly. This is the most important technical decision in the rebuild.
- PROGRAMME STATE. Currently one JSON blob per programme with no field-level
  concurrency. Normalise it.
- METRIC DEFINITIONS. Seed kpi_definitions from tableau/ai/metrics.json. A measure
  defined in the contract must not be redefinable in APEX.
- DOCUMENT RETRIEVAL. Currently "pack documents in priority order until 80,000
  characters are used, then drop the rest". Replace with embeddings and top-k retrieval.
- SECRETS. API keys are currently plaintext in the database. Move them to the OS keychain.
- TESTS. There are none. Add them for the document classifier, the dimension crosswalk
  and the gap engine — all three encode business rules that break silently.

## The interface change I want

The current interface has two destinations from the programme home screen: Programme View
(delivery, governance, risk) and Metrics Tracking (performance). I now have three classes
of data, not two, and they have different trust levels:

  - VALIDATED METRICS — from the Power BI model, reconciles to the cent
  - DELIVERY STATE — APEX programme data, human-maintained and audited
  - EXTERNAL SIGNAL — from the Market Trends and Customer Insights tools, third-party

Promote External Context from a panel buried inside a metric domain to a third
first-class destination on the home screen. In the existing code every single External
Context tab is marked status: "gap" because there has never been data for it — that is
exactly what these two new tools fill.

Every figure displayed anywhere should carry its class, so a reader can tell at a glance
whether they are looking at something validated, something asserted, or something bought
in. Do not flatten the three into one undifferentiated dashboard.

Otherwise the change is additive. Do not redesign what works.

## The two new data sources

[ANSWER: what is the Market Trends tool — product name, vendor, and how do you get data
out of it: REST API, scheduled export to a folder, database, or UI only?]

[ANSWER: same for the Customer Insights tool.]

[ANSWER: what dimensions do they use — do they use IHG regions, and if so which
definition? Do they use IHG category names or their own?]

[ANSWER: how often does the data change, and how far back does it go?]

Both must join to the existing conformed dimensions: Dim_Region, Dim_Category,
Dim_ChainScale, Dim_Segment, Dim_Market, Dim_Priority. Where their vocabularies differ,
build an explicit crosswalk the way tableau/scripts/b_conform.py does for the programme
category taxonomy — and where something will not map, label it "Unmapped" rather than
guessing. Guessing a region mapping earlier in this project produced a 44% error in EMEAA
and reversed which region looked like the laggard.

If I have not answered the questions above, stub both connectors against the existing
fetcher interface — return an array of
{ id, name, lastModified, contentHash, downloadUrl, sizeBytes, mimeType } — so they can
be filled in without touching anything downstream.

## How I want you to work

Start by proposing a build plan before writing code. I want to see the plan and agree it.

Then build in this order, and let me run and check each stage before moving on:

  1. Local-only skeleton: loopback binding, scoped CORS, DuckDB row storage, the
     local-folder source type. Prove it reads my synced SharePoint folder.
  2. The metric contract binding: read metrics.json, seed the KPI definitions, display a
     handful of contract measures and prove they match Power BI exactly.
  3. Document ingestion: classification, is_latest, embeddings, retrieval.
  4. The AI layer: context assembly, the proposal/accept/audit protocol.
  5. The three-destination interface, with class labelling on every figure.
  6. The two external connectors.

Work in small commits with clear messages. When you hit a decision that changes the
shape of the thing — not a routine judgement call, a real fork — stop and ask me rather
than picking one and building on it.

Tell me what you find in the existing code that the spec does not mention, especially if
it contradicts the spec. The spec was written from the code but I would rather know where
it is wrong.
```

---

## Why the prompt is shaped this way

A few notes on choices, in case you want to edit it:

**It tells the agent to read the spec first, and to say where the spec is wrong.** An agent
that treats a handover document as infallible will propagate its errors. This one is told
the document is derived and fallible.

**The constraints come before the features.** Loopback binding is listed first and
explained with the reason. An agent that understands *why* a constraint exists will not
quietly undo it three days later when it makes local testing awkward.

**"Keep" and "rebuild" are separate explicit lists.** Without this, agents tend to either
rewrite everything (losing the proposal protocol and the SharePoint lessons) or preserve
everything (carrying forward the JSON row store that cannot scale).

**The region-mapping failure is cited by name.** Concrete past errors constrain behaviour
far better than general instructions to be careful.

**It asks for a plan first and a stage gate between phases.** Six stages, each independently
checkable. If stage 2 does not reproduce Power BI's numbers exactly, you find out before
anything is built on top of it.

**The blocking questions are marked but not blocking.** If you cannot answer the external
tool questions yet, the build proceeds with stubs against a fixed interface rather than
stalling.

---

## What to have ready before you start

| Thing | Why |
|---|---|
| The repo cloned locally | The agent needs to read the existing code, not just the spec |
| Node 22+ installed | `better-sqlite3` needs a matching native build |
| The path to your synced PE Sources folder | Stage 1 proves the local-folder source against it |
| The `tableau/data/` extracts unzipped locally | Stage 2 binds the metric contract to real data |
| One sample export from each new tool | Answers most of the nine questions in Part 11 of the spec without you writing anything |
| An LLM API key, or Azure OpenAI endpoint details | Stage 4 needs a working engine |

## What I would check at each stage gate

- **Stage 1** — `netstat` shows the port bound to `127.0.0.1` only, not `0.0.0.0`. Try
  reaching it from your phone on the same wifi; it should fail.
- **Stage 2** — Capture Rate reads **7.60%**, like-for-like **5.68%**, IHG Directly
  Addressable **$15,232,133,229**. If any of those differ, stop.
- **Stage 3** — ask it something only the April SteerCo deck says, and check it cites the
  April SteerCo deck.
- **Stage 4** — propose a risk, reject it, confirm nothing was written; propose again,
  accept it, confirm the audit log has both the before and after.
- **Stage 5** — every number on screen is labelled validated / delivery / external.
- **Stage 6** — a Market Trends figure sliced by region matches the same slice in Power BI.
