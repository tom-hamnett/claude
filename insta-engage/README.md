# Insta Engage

Phone-first engagement desk for The Rational Strategist on Instagram: find people who engage, rank them, draft the next message in a funnel, and a human sends it.

Status: planning. Built so far: `report-example/`.

## report-example/

Turns a real Analyst's Edge Template B deep-dive (.pptx) into a redacted **EXAMPLE REPORT** for any subject company and peer set:

- subject and 7 peers swapped in from a config; sector words swapped (no hotel terms survive)
- every number redacted, body prose and footnotes greyed to word-shaped bars, headings kept
- charts rebuilt from modelled values so bars sort in a plausible order; labels redacted; embedded chart data replaced
- cover photo removed, speaker notes and document properties cleared
- diagonal "EXAMPLE REPORT · illustrative layout · names for example only · not findings" on every slide
- leak check over every XML part (slides, charts, embedded workbooks): fails on any original name, sector word or unredacted number

```
python report-example/make_example_report.py TEMPLATE.pptx report-example/configs/saas_asana.json OUT.pptx
soffice --headless --convert-to pdf OUT.pptx
```

The template deck is not in the repo (it lives in Drive with the engine outputs). Guardrail from the marketing plan v2: demo subjects only in non-conflict sectors (SaaS, F1, festivals), never a hotel group.

`examples/` holds the SaaS demo (PDF, PPTX) and a 6-image Instagram carousel (1080×1350).
