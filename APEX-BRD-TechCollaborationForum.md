# Technology Work Intake Document (BRD)
## APEX — Procurement Excellence Programme Intelligence

*Prepared by: Tom Hamnett, Procurement Excellence | For: Technology Collaboration Forum (TCF)*
*Status: For awareness / intake. OneTrust security assessment: TO BE COMPLETED.*

---

## Section 1: Initiative Overview

### 1.1 Description
APEX is a programme intelligence tool for IHG's Procurement Excellence (PE) function. It connects to the PE document library in SharePoint, automatically reads and structures the contents of programme documents (status packs, trackers, risk logs, QBR/SteerCo decks, audit reports), and lets authorised leaders ask plain-English questions and receive answers grounded in the actual source documents — with citations.

It addresses a clear gap: today, programme status is compiled manually into a monthly PLT/QBR pack that is time-consuming to produce and out of date by the time it is presented. The CPO and senior stakeholders cannot interrogate the underlying data directly.

*P&T Theme / Priority: [TBC with Tom — suggest "Data, AI & Automation" / operational efficiency within Global Procurement].*

### 1.2 Objectives (measurable)
1. **Reduce reporting effort:** cut the manual effort to assemble the monthly PLT/QBR reporting pack (currently several days of senior analyst time) by automating ingestion and synthesis of source documents.
2. **Enable self-service insight:** give the CPO and a defined set of PE leaders the ability to ask questions of programme data directly, without a round-trip through the PMO.
3. **Establish a single source of truth:** consolidate 88+ documents across 49 SharePoint folders into one queryable, automatically-classified knowledge base.
4. **Currency of data:** surface the latest version of each report type automatically, so decisions are based on current rather than stale information.

### 1.3 Key Results (proven in prototype)
1. **Live SharePoint ingestion** — recursive scan of the PE Sources library proven on real data: 88 files across 49 folders, including sub-folders and shortcuts, using delegated (read-only) Microsoft Graph access.
2. **Automatic document classification** — each document is tagged by type (weekly / monthly / SteerCo / QBR / audit / metrics), date, audience level, and whether it is the latest of its type.
3. **AI Q&A grounded in source documents** — natural-language answers that cite the specific document and date, prioritising the most current and most senior-level source.
4. **Structured data extraction** — Excel trackers (CRF analysis, P2P roll-out, supplier metrics) parsed into structured tables suitable for KPIs and dashboards / Power BI / Looker.
5. **LLM-agnostic architecture** — the AI engine is swappable; the tool already supports multiple providers and is designed to run on Gemini / Vertex AI.

### 1.4 Customer / Key Stakeholders
- **Primary user:** Sopan Shah, Chief Procurement Officer (programme sponsor) — needs decision-ready insight and the ability to brief senior stakeholders.
- **Owner / power user:** Tom Hamnett, PE PMO — responsible for programme reporting, risk and governance.
- **Audience:** a defined handful of PE leadership (selected leaders only — not open access).
- **Supporting:** AI COE / Technology Services (hosting, security, governance); IHG InfoSec (assessment & approval).

### 1.5 Definition of Done
- Hosted on an IHG-approved platform (GCP / Vertex AI) behind IHG authentication — access restricted to named users.
- Dynamic, scheduled access to the PE SharePoint document library.
- A guided custom user interface (not a chatbot-only experience) reflecting the PE reporting workflow.
- OneTrust security assessment completed and approved prior to production use.
- Selected PE leaders able to self-serve programme insight from current source data.

---

## Section 2: How It Works (supporting detail)

1. **Connect** — authenticates to SharePoint via Microsoft Graph using delegated, read-only permissions (Files.Read.All, Sites.Read.All). It only ever reads what the signed-in user can already access; it cannot modify or delete anything.
2. **Sync** — polls the document library on a schedule, detecting new and changed files via content hashing.
3. **Ingest** — extracts text from documents (PowerPoint, PDF, Word) and parses structured data from spreadsheets; classifies each document by type, date and audience level.
4. **Serve** — an AI assistant answers questions using the ingested library as grounded context, citing sources and preferring the latest, most senior-level documents. A guided UI presents programme views, metrics and a chat interface.
5. **Human-in-the-loop** — the AI proposes structured outputs (e.g. executive summaries, risk entries) but never commits changes silently; the user reviews and approves.

## Section 3: How It Uses AI
- The AI is used to (a) extract and structure content from mixed document formats and (b) answer questions grounded in that content. It is a retrieval-and-synthesis pattern: relevant document text is supplied to the model as context for each question, rather than the model relying on training data.
- The architecture is **model-agnostic** and designed to run on **Gemini / Vertex AI** under IHG's enterprise agreement, keeping inference within IHG-governed infrastructure with enterprise data-use protections (no training on IHG data).
- No IHG data is sent to any AI provider that IHG has not explicitly approved and configured.

## Section 4: Hosting, Security & Remediation
- **Current status:** the prototype was temporarily taken offline after InfoSec identified it was reachable via a public URL without authentication. This is acknowledged and accepted — while no data loss is known to have occurred, an unauthenticated endpoint with access to PE documents is not acceptable, and shutdown was the correct action.
- **Remediation / target state:** re-host on IHG-approved GCP infrastructure (Vertex AI) behind IHG SSO, with access limited to named users, and complete the OneTrust assessment before any production use.
- **OneTrust assessment:** TO BE COMPLETED.

## Section 5: Alignment with the Two-Track Approach (per AI COE guidance)
- **Fast-track (Gemini Enterprise, no/low-code agents):** supported as an immediate step to validate Gemini's ability to read the PE SharePoint library and to refine and test the agent instructions and prompts. This learning transfers directly to the pro-code build.
- **Slow-track (ADK pro-code, custom UI, Vertex AI, GCS document store):** this is the intended destination. The existing APEX prototype is a working reference for this track — it already demonstrates the target custom UI and workflow, the document ingestion and classification pipeline, and a tested set of agent instructions/prompts. Sharing it is intended to accelerate and de-risk the governed build rather than start from a blank page.
- The decisive capability gap in the fast-track is the **custom UI**, which is precisely what the CPO and PE leaders need to adopt the tool. The pro-code track delivers this; the APEX prototype shows what "done" looks like.

---

*Appendices available on request: architecture summary, data-flow description, screenshots of the working prototype, and the GitHub repository for code review.*
