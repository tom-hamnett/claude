# Competitive Teardown — OptiQ and the Process-Intelligence Field

*How OptiQ and its competitors actually work, the stages/parameters that make their output robust, and how FLUX matches or beats each. Research current as of June 2026.*

---

## 1. OptiQ (Jabian Consulting)

OptiQ positions itself as **execution management** — the layer "between strategy and transaction" that makes execution behaviour visible and connects decisions to how work actually runs. It frames the problem as **"execution drag"**: the hidden rework, coordination overhead, decision latency and exception handling that quietly leak margin, capacity and quality. Its language ("execution paradox", "execution fragility", "execution as a managed capability") is the differentiated wrapper around a fairly classic operational-excellence method.

### The four stages

| # | Stage | What it does | Output |
| --- | --- | --- | --- |
| 1 | **SPOT360 Diagnostic** | Rapid scan using multi-role input + data signals to isolate the few issues creating outsized drag across the value chain | Prioritised friction points (margin/capacity/quality leakage) |
| 2 | **Current-State Process Mining** | Analyses event data to show how work *truly* flows; exposes rework loops, bottlenecks, under-used technology | Real (vs designed) process picture |
| 3 | **Automation-Ready Process Design** | Maps future-state into workflow templates; simplifies decisions, handoffs, exceptions | Executable designs, not documentation |
| 4 | **AI Automation** | Deploys working automations *inside existing platforms* | Live automations validating ROI |

### Claimed parameters / outcomes
- Margin recovery **up to ~10% of revenue**; capacity unlocked; cycle-time reduction; quantified labour savings.
- Explicitly designed to **work with existing platforms, not replace them**.

### What makes it robust (and what to copy)
- **Multi-role input** in the diagnostic — friction is triangulated across perspectives, not taken from one manager.
- **Reality over SOP** — the whole pitch is the gap between the designed and the real process.
- **Bias to execution** — "solutions move into execution, not endless documentation."
- **Platform-agnostic activation** — change happens *inside* the systems people already use.

### Where it's beatable
- **It's a service, not an asset.** You don't keep the engine; you can't re-run it yourself; comparability across processes depends on the individual consultant.
- **Mining needs event-log data**, which mid-market clients often can't cleanly supply — leaving interview-based mapping done ad hoc.
- **No published, enforced standard** for comparability across processes/engagements.

> *Sources:* jabian.com/optiq, jabian.com/optiq-assessment, jabian.com/services/process-engineering-optimization.

---

## 2. The process-mining / process-intelligence field

OptiQ competes (at the tooling layer) with a mature software market. The leaders and what defines them:

| Vendor | Core approach | Strength | Note |
| --- | --- | --- | --- |
| **Celonis** | Process mining + the **PI Graph** (a system-agnostic "digital twin" of the business); automated recommendations tied to KPIs | Market leader; deep ERP connectors; opportunity recommendations | Heavy, enterprise-priced, needs clean event logs |
| **SAP Signavio** | Mining + BPM modelling, fused into SAP BTP | Best fit for SAP estates | Acquired by SAP (2021, ~$1.2bn) |
| **UiPath** | RPA-first, with a process-mining add-on + task mining | Straight line from insight to bot | Automation-led lens |
| **IBM Process Mining** | Enterprise event-log mining with AI | Strong in regulated/large orgs | Part of broader automation suite |
| **ABBYY** | IDP (document processing) + process intelligence | Document-heavy processes; root-cause analysis | Narrower scope |
| **Apromore** | Open-core mining + simulation | Simulation of redesigns; recommendations | More technical audience |
| **Skan AI / KYP.ai** | **Task mining** from the desktop; KYP pitches **"Agentic Process Intelligence"** | Captures work systems-of-record miss; agentic-AI ready | Newer, automation/agent-oriented |

### The pattern across all of them
1. **Connect to data** (ERP/CRM event logs, or desktop task mining).
2. **Reconstruct the real process** as a graph.
3. **Surface deviations** — bottlenecks, rework, non-conformance, KPI breaches.
4. **Recommend** opportunities (increasingly AI-generated).
5. **Automate** (RPA / agentic) and monitor.

### The structural gap FLUX exploits
Mining tools are extraordinary **when you have clean event logs at enterprise scale**. The majority of processes — especially in the mid-market, and especially knowledge/coordination work — **do not** have usable logs. That work is still mapped by humans in workshops, inconsistently. **FLUX is built for exactly that gap: AI-assisted, interview-based mapping to a rigorous standard, with the opportunity engine and automation design that the mining tools reserve for log-rich processes.** (And where logs *do* exist, the FLUX schema accepts them as just another input.)

> *Sources:* celonis.com/platform; Gartner Peer Insights — process-mining-platforms (Celonis alternatives, 2026); research.aimultiple.com/celonis; kyp.ai/celonis-alternatives; skan.ai.

---

## 3. The stages, prompts and parameters that make AI output robust

To match a consulting engine with an AI tool, the prompts and parameters must be engineered, not vibes. This is how FLUX does it (implemented in `src/services/fluxAI.ts`).

### Shared design
- **A fixed persona** (`FLUX_PERSONA`) injected into every call: partner-grade operations strategist + Lean Six Sigma Master Black Belt, *forced to speak the standard vocabulary* (SIPOC, BPMN types, VA/BVA/NVA, VSM, TIMWOODS, value drivers, Kaizen). This is what keeps output comparable across runs.
- **Strict JSON schemas** (provider tool-use / response-schema) so every result drops straight into the standardized data model — no free-text parsing, no shape drift.
- **Conservative temperatures**: 0.3 for mapping (fidelity), 0.4–0.5 for diagnosis/design (range without hallucination).
- **Honesty guardrails**: estimates must be flagged as estimates with stated assumptions; benchmarks are framed as indicative-pending-validation.

### Per-stage parameters

| Stage | Key prompt parameters | Robustness mechanism |
| --- | --- | --- |
| **SPOT** | engagement context + multi-role signals with severity/frequency | forces 3–6 ranked areas with explicit drag scores & drivers; recommends what to map next |
| **MAP** | plain-English as-is description + project context + retrieved knowledge | mandates explicit handoff/wait/control steps; per-step value class + VSM timing; separate `assumptions` field for the analyst to validate |
| **DIAGNOSE** | the full standardized map **+ computed metrics** (PCE, rolled %C&A, handoff/rework counts, automation index, cost) | requires a systematic TIMWOODS walk **and** a value-driver-spectrum walk; every opportunity must cite step evidence; impact/effort/confidence scored; quick-wins flagged |
| **DESIGN** | current map + baseline metrics + prioritised opportunities | fixed report skeleton (narrative → projected impact table → business case → roadmap); Eliminate→Simplify→Standardise→Automate ordering; conservative ROI |
| **RESEARCH** (self-upskilling) | industry + process name + context | produces reference-model + benchmark + best-practice + risk cards; **explicitly labelled AI-derived and unvalidated**; stored and fed back into future MAP/DIAGNOSE prompts |

### Feeding the metrics back in
Critically, DIAGNOSE doesn't just see the map — it sees the **computed VSM metrics** for that map. The model is told *"low PCE = flow problem; rework loops = defects; many handoffs = coordination drag; manual + high-volume = automation candidate"*. Grounding the LLM in deterministic numbers is what stops it inventing generic advice.

---

## 4. How FLUX maps to OptiQ — feature parity + advantage

| Capability | OptiQ | FLUX |
| --- | --- | --- |
| Rapid multi-role diagnostic | ✅ SPOT360 | ✅ SPOT — same multi-role logic, AI-scored |
| Current-state from reality | ✅ event-log mining | ✅ AI-assisted interview mapping (+ accepts logs) |
| Opportunity identification | ◑ workshop-based | ✅ systematic TIMWOODS + 7-driver engine, scored & evidenced |
| Automation-ready design | ✅ | ✅ future state + ROI + roadmap, automation-matched |
| AI automation deployment | ✅ deploys live bots | ◑ designs & specs automation (build is downstream) |
| **Enforced comparability standard** | ❌ | ✅ the FLUX Standard, schema-enforced |
| **Self-upskilling knowledge base** | ❌ (tacit) | ✅ reference models + benchmarks accrue and feed back |
| **You own / re-run the engine** | ❌ service | ✅ a tool your team runs repeatedly |
| **Portfolio comparability view** | ❌ | ✅ every process on identical metrics + CSV export |

**The honest gap:** OptiQ closes the loop by *deploying* working automations inside client platforms. FLUX produces automation-ready designs and specs but stops short of building the bots — that's the deliberate v1 boundary and the obvious v2 (wire the DESIGN output into an RPA/agent builder).

**The decisive advantages:** an enforced standard (comparability), a self-upskilling knowledge layer (compounding capability), and ownership (re-runnable, no per-engagement consulting spend).

---

## 5. Recommendation for your investment decision

If the goal is **a capability your team owns and runs repeatedly across many processes**, building on the FLUX pattern beats buying OptiQ-as-a-service: you get the same four-stage method, plus comparability and a compounding knowledge asset, for the cost of AI tokens rather than consulting days. If the goal is **a one-off, log-rich, enterprise-scale transformation with bots deployed for you**, OptiQ (or Celonis + a systems integrator) remains the faster path to live automation. FLUX is designed to make the first path real — and to give you a credible, standards-based seat at the table for the second.
