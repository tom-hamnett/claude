# Insta Engage

Phone-first engagement desk for The Rational Strategist on Instagram: find people who engage, rank them, draft the next message in a funnel, and a human sends it.

Status: v1 built. `app/` (phone PWA), `report-example/` (per-lead example reports), `docs/messaging-principles.md`, Claude run skill in `.claude/skills/insta-engage/`.

## report-example/

Per-lead redacted **EXAMPLE REPORT**: the lead's own company (the subject) against plausible peers, built from a real Analyst's Edge deck with every number and all body prose redacted.

**Cohort rule** (`cohort.py`, `choose_view(staff, interest_function=None, threshold=5000)`):
- headcount < 5,000 → whole-company view (Template A, 14 slides)
- headcount ≥ 5,000 → function view (Template B, 24 slides) for the lead's function (procurement, finance, hr, it), inferred from their interest or role; procurement by default
- interest "whole company" → Template A at any size

**One shot:** `python report-example/make_lead_report.py REQUEST.json OUTDIR [--threshold N]` checks the guardrail, picks the template, builds the PPTX, runs the leak check, converts to PDF (LibreOffice) and renders a 4-image 1080×1350 carousel plus `manifest_*.json`.

Request JSON (sizes are rough public figures; they only set chart order, labels are redacted):
```json
{
  "lead": "ig_handle", "interest": "Head of FP&A",
  "view": "optional override", "function": "optional override",
  "subject": {"name": "Atlassian", "short": "Atlassian", "staff": 12200, "rev_bn": 4.36, "driver1": 300},
  "peers": [{"name": "HubSpot", "staff": 8300, "rev_bn": 2.63, "driver1": 250, "flag": "optional mark"}],
  "sector": {"label": "enterprise software companies", "noun": "software sector", "short": "SaaS",
             "driver1": "customers", "driver1_singular": "customer"}
}
```
Up to 7 peers; fewer drops the spare rows and bars. A peer with `rev_bn: null` gets the no-data mark and is left out of per-$ charts.

**What the build does:** subject and peers swapped in one pass; Template B function relabelled (`functions.json`: finance, hr and it are draft label packs, as the PRISM registry only has a validated Purchasing taxonomy); sector words swapped (`profiles/*.json`); numbers → ███; prose greyed to word bars; company charts rebuilt from the full peer list with modelled values in the template's sort order; cover photo removed together with its image file; notes and properties cleared; diagonal "EXAMPLE REPORT · illustrative layout · names for example only · not findings" watermark.

**Leak check:** every XML part including embedded chart workbooks and docProps; fails on any template name, sector word, relabelled-function word, unused-slot placeholder, leftover template image or unredacted number on a slide.

**Guardrail:** `blocklist.json` refuses hotel / hospitality subjects or peers and IHG (marketing plan v2). Tom can lift entries.

**Templates:** never committed. Put `template_a.pptx` (HubSpot whole-company, Drive) and `template_b.pptx` (IHG purchasing deep-dive, Drive) in `report-example/templates/` (git-ignored) or set `$TEMPLATE_A` / `$TEMPLATE_B`.

**Tests:** `pytest insta-engage/report-example -q` (build tests skip without the templates).

`examples/` holds three demos: Asana whole company, Atlassian procurement, Atlassian finance (PDF, PPTX, carousel).
