"""Check the CSVs in a data folder match exactly what the semantic model expects.

The model declares every column by name and type. If an extract gains, loses or reorders
a column, Power BI fails at refresh time with a message that does not name the culprit.
This names it in a second.

Usage: python3 check_data.py <data-folder>
"""
import csv, json, os, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "..", "data")
model = json.load(open(os.path.join(ROOT, "APEX_v2.SemanticModel", "model.bim"), encoding="utf-8"))

bad = 0
for t in model["model"]["tables"]:
    if t["name"] == "_Parameters":
        continue
    path = os.path.join(DATA, f"{t['name']}.csv")
    want = [c["name"] for c in t["columns"]]
    if not os.path.exists(path):
        print(f"MISSING  {t['name']}.csv"); bad += 1; continue
    with open(path, encoding="utf-8-sig", newline="") as f:
        got = next(csv.reader(f))
    if got != want:
        print(f"MISMATCH {t['name']}.csv")
        print(f"   csv   : {got}")
        print(f"   model : {want}")
        bad += 1

if bad:
    print(f"\n{bad} problem(s) — fix before zipping.")
    sys.exit(1)
print(f"OK — {len(model['model']['tables'])-1} CSVs match the model exactly.")
