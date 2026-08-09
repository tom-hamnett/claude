"""Emits the machine- and human-readable metric contract from contract.py.

Outputs (all in this folder):
  metrics.json                   -- machine-readable; feed to any agent as grounding
  METRICS-CONTRACT.md            -- the same thing for humans to argue with
  synonyms.json                  -- field -> alternative names, for Power BI Q&A setup
  apex-analyst-system-prompt.md  -- drop-in system prompt for a conversational agent
"""
import json, os
import contract

ROOT = os.path.dirname(os.path.abspath(__file__))
w = lambda name, text: open(os.path.join(ROOT, name), "w", encoding="utf-8").write(text)

fmt_val = lambda m: (None if m["value"] is None else
                     (f"{m['value']*100:,.2f}%" if m["fmt"].endswith("%")
                      else f"{m['value']:,.0f}"))

# ---------------------------------------------------------------------------- metrics.json
payload = {
    "contract_version": "2.0",
    "validated_as_of": contract.VALIDATED_AS_OF,
    "source": contract.SOURCE_DECKS,
    "rules": contract.RULES,
    "metrics": [
        {"name": m["name"], "folder": m["folder"], "dax": m["dax"],
         "format": m["fmt"], "definition": m["desc"], "synonyms": m["syn"],
         "validated_value": m["value"], "validated_display": fmt_val(m),
         "guardrails": m["guards"], "answers": m["qs"]}
        for m in contract.MEASURES],
    "dimensions": [
        {"table": t, "column": c, "definition": d, "synonyms": s}
        for (t, c), (d, s) in contract.COLUMN_META.items()],
    "tables": contract.TABLE_DESC,
    "open_questions": [{"topic": t, "detail": d} for t, d in contract.OPEN_QUESTIONS],
}
w("metrics.json", json.dumps(payload, indent=2) + "\n")

# --------------------------------------------------------------------------- synonyms.json
w("synonyms.json", json.dumps(
    {**{m["name"]: m["syn"] for m in contract.MEASURES if m["syn"]},
     **{f"{t}[{c}]": s for (t, c), (_, s) in contract.COLUMN_META.items() if s}},
    indent=2) + "\n")

# -------------------------------------------------------------- METRICS-CONTRACT.md
L = ["# APEX — metric contract",
     "",
     f"**Validated {contract.VALIDATED_AS_OF}.** Every value below was recomputed from the "
     "extracts on that date, not copied from a slide.",
     "",
     "This is the definition layer. An AI assistant is only as trustworthy as the "
     "definitions it works from — if *capture rate* can mean two things, the assistant will "
     "confidently give you the wrong one. Everything downstream (the Power BI model, the "
     "agent prompt, the narrative table) is generated from this file, so there is exactly "
     "one definition of each term.",
     "",
     "## Rules that must never be broken", ""]
L += [f"{i}. {r}" for i, r in enumerate(contract.RULES, 1)]

L += ["", "## Measures", "",
      "| Measure | Definition | Validated value |", "|---|---|---|"]
for m in contract.MEASURES:
    L.append(f"| **{m['name']}** | {m['desc'].replace('|','/')} | "
             f"{fmt_val(m) or '_context-dependent_'} |")

L += ["", "### DAX and guardrails", ""]
for m in contract.MEASURES:
    L += [f"#### {m['name']}", "", "```dax", f"{m['name']} =", m["dax"], "```", ""]
    if m["syn"]:
        L.append(f"*Also called:* {', '.join(m['syn'])}.")
        L.append("")
    for g in m["guards"]:
        L.append(f"> ⚠️ {g}")
    if m["guards"]:
        L.append("")
    if m["qs"]:
        L.append("Answers: " + "; ".join(f'*"{q}"*' for q in m["qs"]))
        L.append("")

L += ["## Dimensions worth knowing", "", "| Field | What it means |", "|---|---|"]
for (t, c), (d, _) in contract.COLUMN_META.items():
    L.append(f"| `{t}[{c}]` | {d.replace('|','/')} |")

L += ["", "## Open questions", "",
      "These are unresolved. An assistant should surface them, not paper over them.", ""]
for t, d in contract.OPEN_QUESTIONS:
    L += [f"**{t}** — {d}", ""]

w("METRICS-CONTRACT.md", "\n".join(L) + "\n")

# ------------------------------------------------------ apex-analyst-system-prompt.md
P = ["# APEX Analyst — system prompt",
     "",
     "Portable grounding for whatever ends up hosting the conversation — Power BI Copilot "
     "instructions, a Copilot Studio agent, Gemini Enterprise, or a revived APEX. "
     "Generated from `contract.py`; regenerate rather than edit by hand.",
     "",
     "---", "",
     "You are the APEX Analyst, supporting IHG Global Procurement's Procurement Excellence "
     "team. You answer questions about procurement spend, capture and delivery against a "
     "validated Power BI semantic model.",
     "",
     "## How you must behave", ""]
P += [f"{i}. {r}" for i, r in enumerate(contract.RULES, 1)]
P += ["",
      "Beyond those: give the number first, then the one sentence that makes it mean "
      "something. Do not restate the question. If a question is ambiguous between two "
      "measures, say which two and answer with the more conservative one. If you are asked "
      "for something the model cannot answer, say what is missing rather than approximating.",
      "",
      "## Measures available to you", ""]
for m in contract.MEASURES:
    v = fmt_val(m)
    P.append(f"- **{m['name']}**{f' — unfiltered: {v}' if v else ''}. {m['desc']}"
             + (f" Also called: {', '.join(m['syn'])}." if m["syn"] else "")
             + ("".join(f" GUARDRAIL: {g}" for g in m["guards"])))
P += ["", "## Dimensions you can filter by", ""]
for (t, c), (d, s) in contract.COLUMN_META.items():
    P.append(f"- `{t}[{c}]` — {d}" + (f" Also called: {', '.join(s)}." if s else ""))

P += ["", "## Things that are genuinely unsettled", "",
      "Raise these when they are relevant. Do not resolve them yourself.", ""]
for t, d in contract.OPEN_QUESTIONS:
    P.append(f"- **{t}**: {d}")

P += ["", "## What you must not do", "",
      "- Do not compute a figure the model does not expose. Say it is not available.",
      "- Do not quote a slide number as evidence. The extracts are the source of truth; "
      "two slide figures are known to be stale.",
      "- Do not surface, infer or accept personal data about named employees. The one "
      "source sheet containing it is excluded from the model by design.",
      "- Do not present the headline capture rate as like-for-like. When the difference "
      "matters to the decision, give both.",
      ""]
w("apex-analyst-system-prompt.md", "\n".join(P) + "\n")

print(f"metrics.json                  {len(contract.MEASURES)} measures, "
      f"{len(contract.COLUMN_META)} dimensions")
print(f"METRICS-CONTRACT.md           {len(L)} lines")
print(f"apex-analyst-system-prompt.md {len(P)} lines")
print(f"synonyms.json                 written")
