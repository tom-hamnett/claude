"""Cross-check report.json against model.bim before anything ships.

Every error Power BI has thrown in this build came from one of four things:
  1. a visual referencing a column as if it were a measure (or vice versa)
  2. a prototypeQuery declaring one entity but selecting from another
  3. a measure referencing a table that is not in the model
  4. a slicer on a column that does not exist

All four are detectable here in a second, rather than after a 7 MB download and a
Power BI Desktop restart.
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
NAME = "APEX_v2"
model = json.load(open(os.path.join(ROOT, f"{NAME}.SemanticModel", "model.bim"), encoding="utf-8"))
report = json.load(open(os.path.join(ROOT, f"{NAME}.Report", "report.json"), encoding="utf-8"))

cols, meas, tables = set(), set(), set()
for t in model["model"]["tables"]:
    tables.add(t["name"])
    for c in t.get("columns", []):
        cols.add((t["name"], c["name"]))
    for m in t.get("measures", []):
        meas.add((t["name"], m["name"]))
measure_names = {m for _, m in meas}

errors, warnings = [], []

# --- measures: do they reference real objects? ------------------------------------------
for t in model["model"]["tables"]:
    for m in t.get("measures", []):
        for tbl, col in re.findall(r"(\w+)\[(\w+)\]", m["expression"]):
            if tbl not in tables:
                errors.append(f"measure '{m['name']}' references missing table {tbl}")
            elif (tbl, col) not in cols and (tbl, col) not in meas:
                errors.append(f"measure '{m['name']}' references missing column {tbl}[{col}]")
        for ref in re.findall(r"(?<![\w\]])\[([^\]]+)\]", m["expression"]):
            if ref not in measure_names:
                errors.append(f"measure '{m['name']}' references undefined measure [{ref}]")
        if not m.get("description"):
            warnings.append(f"measure '{m['name']}' has no description "
                            f"(an AI layer has nothing to read)")

# --- relationships ----------------------------------------------------------------------
for r in model["model"]["relationships"]:
    for side in ("from", "to"):
        tbl, col = r[f"{side}Table"], r[f"{side}Column"]
        if (tbl, col) not in cols:
            errors.append(f"relationship '{r['name']}' -> missing column {tbl}[{col}]")

# --- visuals ------------------------------------------------------------------------------
nvis = 0
for sec in report["sections"]:
    for vc in sec["visualContainers"]:
        nvis += 1
        cfg = json.loads(vc["config"])
        sv = cfg["singleVisual"]
        pq = sv["prototypeQuery"]
        alias = {f["Name"]: f["Entity"] for f in pq["From"]}
        declared = set()
        for s in pq["Select"]:
            kind = "Column" if "Column" in s else "Measure"
            node = s[kind]
            src = node["Expression"]["SourceRef"]["Source"]
            prop = node["Property"]
            if src not in alias:
                errors.append(f"[{sec['displayName']}] alias '{src}' not declared in From")
                continue
            ent = alias[src]
            declared.add(s["Name"])
            if kind == "Column" and (ent, prop) not in cols:
                errors.append(f"[{sec['displayName']}] {ent}[{prop}] used as a column "
                              f"but is not one")
            if kind == "Measure" and (ent, prop) not in meas:
                errors.append(f"[{sec['displayName']}] {ent}[{prop}] used as a measure "
                              f"but is not one")
        for well, items in sv["projections"].items():
            for it in items:
                if it["queryRef"] not in declared:
                    errors.append(f"[{sec['displayName']}] {well} references "
                                  f"'{it['queryRef']}' which the query does not select")

print(f"model: {len(tables)} tables, {len(cols)} columns, {len(meas)} measures, "
      f"{len(model['model']['relationships'])} relationships")
print(f"report: {len(report['sections'])} pages, {nvis} visuals")
for w in warnings:
    print(f"  warn  {w}")
if errors:
    print(f"\n{len(errors)} ERRORS:")
    for e in errors:
        print(f"  {e}")
    sys.exit(1)
print("\nOK — every visual reference resolves against the model.")
