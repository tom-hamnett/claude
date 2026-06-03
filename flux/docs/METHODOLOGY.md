# The FLUX Standard — Best-Practice Principles for Comparable Process Maps

*Authored in the voice of a partner in operational strategy. This is the reference the tool enforces.*

A process map has one job: to make the truth of how work flows **visible, honest and actionable**. Most maps fail at this because they are drawn to no standard — every analyst invents their own notation, captures different things, and measures nothing. The result is a drawer full of pretty diagrams that cannot be compared, ranked, or acted on.

FLUX exists to fix that. The standard below is deliberately opinionated. Opinionation is what produces comparability.

---

## 1. The seven principles

### P1 — Map reality, not the SOP
The official process (the SOP) and the real one are different documents. Value hides in the gap: the rework, the chasing, the "oh, we always just email Dave". Always map the **as-is reality**, captured from the people who do the work. The idealised version belongs in the future state, not the current state.

### P2 — Scope before you map (SIPOC)
Before a single box is drawn, agree the boundaries: **S**uppliers, **I**nputs, **P**rocess (start/end events), **O**utputs, **C**ustomers. SIPOC prevents the two failure modes of mapping: boiling the ocean (too broad) and mapping a fragment (too narrow). It also names the customer — without which "value" is undefinable.

### P3 — One unambiguous notation
Every step is exactly one of eight BPMN-aligned types: **start, task, decision, handoff, wait, control, system, end**. No bespoke shapes. The discipline of forcing a step into a type is itself diagnostic — if you can't tell whether something is a control or a task, you've found ambiguity in the real process.

> **Handoffs and waits are first-class steps.** The single biggest mapping error is hiding handoffs inside arrows and waits inside nothing. They are where lead time and errors are manufactured. Make them explicit boxes.

### P4 — Classify every step's value (Lean)
Tag every step:
- **VA (Value-Add)** — transforms the thing in a way the *customer would pay for*.
- **BVA (Business Value-Add)** — necessary non-value-add: compliance, controls, things that enable VA. Minimise, don't eliminate.
- **NVA (Non-Value-Add)** — pure waste. Eliminate.

In a typical office process, **less than 10–20% of steps are VA**. Seeing that in colour is the moment a client stops defending the status quo.

### P5 — Measure flow, not just activity (VSM)
Activity counts are vanity. Capture the Value Stream Mapping trio on every step:
- **Process / touch time** — hands-on work.
- **Wait time** — queue/approval/idle time before the step.
- **%Complete & Accurate (%C&A)** — the share that passes downstream first-time-right.

From these we compute the metrics that actually move decisions:

| Metric | Definition | What "good" looks like |
| --- | --- | --- |
| **Lead time** | touch + wait, end to end | shorter; benchmark vs peers |
| **Process Cycle Efficiency (PCE)** | VA time ÷ lead time | office processes rarely beat ~25% |
| **Rolled %C&A** | product of per-step %C&A | >90% is strong; <50% means hidden rework |
| **Automation index** | 0 manual → 100 straight-through | higher; but only automate VA/BVA |

### P6 — Name the waste (TIMWOODS)
Improvement is systematic, not anecdotal. Walk the eight Lean wastes every time:

**T**ransport · **I**nventory · **M**otion · **W**aiting · **O**verproduction · **O**ver-processing · **D**efects · **S**kills (under-use).

TIMWOODS is a checklist that guarantees you look everywhere, not just at the obvious cost line.

### P7 — Quantify and prioritise honestly
Every opportunity gets:
- a **value driver** (see the spectrum below),
- an **impact** and **effort** score (1–5),
- a **confidence** (0–1),
- a **conservative annualised value estimate** where the data supports one,
- a **quick-win** flag (Kaizen: low-effort, high-impact, do-it-now).

Priority = (impact ÷ effort), dampened by confidence, nudged for quick wins. Plot on the **impact/effort matrix** (Quick Wins / Major Projects / Fill-ins / Thankless). Never let a deck of "opportunities" go out unscored — unscored opportunities are opinions.

---

## 2. The opportunity spectrum (look beyond cost)

Cost-cutting is the lazy lens. FLUX tags every opportunity to one of seven **value drivers** so the analysis spans the whole spectrum the client cares about:

| Driver | The question it answers |
| --- | --- |
| **Efficiency** | Can we do it faster / cheaper? (cost, cycle time, FTE) |
| **Effectiveness** | Can we do it *better*? (quality, decision, accuracy, outcome) |
| **Waste** | Can we remove non-value-add activity? (TIMWOODS) |
| **Scale** | Can we make it repeatable, leverageable, volume-proof? |
| **Experience** | Is it painful for the customer or the employee? |
| **Control & Risk** | Is it compliant, auditable, error-proofed? |
| **Resilience** | Are there single points of failure / continuity risks? |

A diagnostic that only finds "efficiency" opportunities is a diagnostic that wasn't run properly.

---

## 3. Improvement philosophy — Kaizen + structural

Two engines, run together:

- **Kaizen (continuous, incremental):** harvest quick wins immediately. They build momentum, fund the bigger moves, and as Ohno observed, *solving one waste makes the next one visible*.
- **Structural redesign:** the future state. Eliminate → Simplify → Standardise → **then** Automate. Automating a broken process just makes the waste happen faster. ("Don't pave the cow path.")

Automation is sequenced last for a reason, and matched to the work:
**RPA** for structured, rule-based steps · **AI / agentic** for judgement-heavy steps with oversight · **full straight-through** only where risk and variance allow.

---

## 4. The maturity ladder

Rate each process 1–5 so progress is trackable:

1. **Ad hoc** — tribal knowledge, varies by person.
2. **Documented** — written down, not measured.
3. **Standardised** — one agreed way, measured against this standard.
4. **Managed** — metrics monitored, controls in place, improving.
5. **Optimised / Automated** — continuously improved, automation-native.

---

## 5. Why this produces *comparability*

Because the schema is fixed, two processes mapped by two analysts share: the same step vocabulary, the same value taxonomy, the same metrics, the same opportunity tags and the same scoring. That means you can:

- rank a portfolio of processes by PCE, waste cost, or opportunity value;
- benchmark a process against the reference model for its domain;
- aggregate "total identified value" across an engagement with a straight face;
- hand the work to a different analyst and get a consistent result.

Comparability is not a nice-to-have. It is the difference between *consulting theatre* and an *operating system for execution*.
