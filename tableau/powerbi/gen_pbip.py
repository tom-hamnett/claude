import json, os, shutil, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "..", "ai"))
import contract  # measure DAX + descriptions + synonyms, single source of truth

NAME = "APEX_v2"
SM  = os.path.join(ROOT, f"{NAME}.SemanticModel")
RPT = os.path.join(ROOT, f"{NAME}.Report")
for d in (SM, RPT):
    shutil.rmtree(d, ignore_errors=True); os.makedirs(d, exist_ok=True)

TABLES = {
 "Fact_Spend_Agg": [("ihg_flag","string"),("region","string"),("reporting_region","string"),
   ("sub_region","string"),("country","string"),("chain_scale","string"),("archetype_segment","string"),
   ("segment_group","string"),("archetype_size_band","string"),("size_band_100","string"),
   ("management_type","string"),("market_categorisation","string"),("priority_market","string"),
   ("brand","string"),("addressability","string"),("lifecycle_stage","string"),("category","string"),
   ("hotels","int64"),("rooms_sum","int64"),("spend","double"),("region_std","string")],
 "Dim_Hotel": [("InnCode","string"),("HID","int64"),("ihg_flag","string"),("ihg_category","string"),
   ("contract_status","string"),("region","string"),("sub_region","string"),("division","string"),
   ("country","string"),("market_categorisation","string"),("priority_market","string"),
   ("chain_scale","string"),("archetype_segment","string"),("archetype_size_band","string"),
   ("archetype_region","string"),("management_type","string"),("management_company","string"),
   ("brand","string"),("brand_name","string"),("chain","string"),("gpo","string"),("hotel_name","string"),
   ("city","string"),("state","string"),("open_date","string"),("rooms","int64"),
   ("has_spend_data","string"),("reporting_region","string"),("segment_group","string"),
   ("size_band_100","string"),("size_band_150","string"),("is_open","string")],
 "Fact_Spend": [("InnCode","string"),("addressability","string"),("lifecycle_stage","string"),
   ("category","string"),("spend","double")],
 "Fact_CRF": [("region","string"),("month","dateTime"),("year","int64"),("crf_usd","double"),("region_std","string")],
 "Fact_P2P": [("region","string"),("market","string"),("product","string"),("estate","string"),
   ("estate_group","string"),("month","dateTime"),("year","int64"),("basis","string"),("systems","double")],
 "Fact_Supplier": [("programme","string"),("row_type","string"),("metric","string"),
   ("period","string"),("value","double")],
 "Fact_SystemSize": [("estate","string"),("unit","string"),("geography","string"),("geo_level","string"),
   ("metric","string"),("month","dateTime"),("year","int64"),("value","double")],
 "Fact_Programme_Spend": [("hotel_code","string"),("hotel_name","string"),
   ("source_region_label","string"),("region","string"),("sub_region","string"),
   ("region_std","string"),("reporting_region","string"),
   ("country","string"),("brand_code","string"),("rooms","int64"),("category_l1","string"),
   ("category_l2","string"),("lifecycle_stage","string"),("year","int64"),("measure","string"),
   ("spend","double"),("category","string"),("in_market_model","string"),
   ("chain_scale","string"),("segment_group","string"),("market_categorisation","string"),
   ("priority_market","string")],
 "Dim_Region": [("region_std","string"),("region_name","string"),("sort_order","int64")],
 "Dim_Lifecycle": [("lifecycle_stage","string"),("sort_order","int64")],
 "Dim_Category": [("category","string"),("category_name","string"),("sort_order","int64")],
 "Dim_ChainScale": [("chain_scale","string"),("chain_scale_name","string"),("sort_order","int64")],
 "Dim_Segment": [("segment_group","string"),("segment_name","string"),("sort_order","int64")],
 "Dim_Market": [("market_categorisation","string"),("market_name","string"),("sort_order","int64")],
 "Dim_Priority": [("priority_market","string"),("priority_name","string"),("sort_order","int64")],
 "Fact_ShareOfWallet": [("reporting_region","string"),("region","string"),("lifecycle_stage","string"),
   ("ihg_flag","string"),("addressable_spend","double"),("hotels","int64"),
   ("is_directly_addressable","string")],
 "Fact_Insight": [("insight_id","string"),("insight_date","dateTime"),("source","string"),
   ("source_type","string"),("theme","string"),("region_std","string"),
   ("lifecycle_stage","string"),("category","string"),("statement","string"),
   ("so_what","string"),("confidence","string")],
}
PQ = {"string":"type text","int64":"Int64.Type","double":"type number","dateTime":"type date"}

def m_expr(tbl, cols):
    typed = ", ".join(f'{{"{c}", {PQ[t]}}}' for c, t in cols)
    return [
      'let',
      f'    Source = Csv.Document(File.Contents(DataFolder & "\\{tbl}.csv"),'
      '[Delimiter=",", Encoding=65001, QuoteStyle=QuoteStyle.Csv]),',
      '    Promoted = Table.PromoteHeaders(Source, [PromoteAllScalars=true]),',
      f'    Typed = Table.TransformColumnTypes(Promoted, {{{typed}}})',
      'in',
      '    Typed'
    ]

MEASURES = [(m["name"], m["dax"], m["fmt"]) for m in contract.MEASURES]
MEASURE_META = {m["name"]: m for m in contract.MEASURES}

tables = [{
  "name": "_Parameters", "isHidden": True,
  "columns": [{"name": "DataFolder", "dataType": "string", "sourceColumn": "DataFolder"}],
  "partitions": [{"name": "_Parameters", "mode": "import", "source": {"type": "m",
     "expression": ['let Source = #table({"DataFolder"},{{DataFolder}}) in Source']}}]
}]
def describe_measure(m):
    """One description carrying meaning, alternative names, guardrails and the validated
    value. Everything an AI layer needs to use the measure correctly, in the one field
    Power BI Copilot actually reads."""
    parts = [m["desc"]]
    if m["syn"]:
        parts.append("Also called: " + ", ".join(m["syn"]) + ".")
    if m["guards"]:
        parts.append("GUARDRAILS: " + " ".join(m["guards"]))
    if m["value"] is not None:
        v = (f"{m['value']*100:,.2f}%" if m["fmt"].endswith("%")
             else f"{m['value']:,.0f}")
        parts.append(f"Validated value with no filters as at {contract.VALIDATED_AS_OF}: {v}.")
    return "  ".join(parts)


def build_column(tbl, c, d):
    """Descriptions and hidden flags come from the metric contract — they are what an AI
    layer reads to work out which field means what, so they are not cosmetic."""
    col = {"name": c, "dataType": d, "sourceColumn": c}
    if d == "int64":
        col["formatString"] = "#,0"
    elif d == "double":
        col["formatString"] = "#,0.00"
    meta = contract.COLUMN_META.get((tbl, c))
    if meta:
        # Synonyms go inside the description on purpose. Power BI's linguistic-schema
        # format is version-sensitive and a malformed one refuses to open the whole file;
        # description text is a plain TOM property that nothing can reject, and Copilot
        # reads it. Same effect, no risk.
        col["description"] = meta[0] + ("  Also called: " + ", ".join(meta[1]) + "."
                                        if meta[1] else "")
    if (tbl, c) in contract.HIDDEN_COLUMNS:
        col["isHidden"] = True
    if c == "sort_order":
        col["isHidden"] = True
    return col


for tbl, cols in TABLES.items():
    t = {"name": tbl,
         "columns": [build_column(tbl, c, d) for c, d in cols],
         "partitions": [{"name": tbl, "mode": "import",
                         "source": {"type": "m", "expression": m_expr(tbl, cols)}}]}
    if tbl in contract.TABLE_DESC:
        t["description"] = contract.TABLE_DESC[tbl]
    if tbl == "Fact_Spend_Agg":
        t["measures"] = [{"name": n, "expression": e, "formatString": f,
                          "description": describe_measure(MEASURE_META[n]),
                          "displayFolder": MEASURE_META[n]["folder"]}
                         for n, e, f in MEASURES]
    tables.append(t)

# Sort the conformed dimensions by their sort_order column so slicers read in a sensible
# order rather than alphabetically.
for t in tables:
    names = [c["name"] for c in t.get("columns", [])]
    if "sort_order" in names:
        for c in t["columns"]:
            if c["name"].endswith("_name") or c["name"] == "lifecycle_stage":
                c["sortByColumn"] = "sort_order"

model = {
 "compatibilityLevel": 1567,
 "model": {
   "culture": "en-GB",
   "dataAccessOptions": {"legacyRedirects": True, "returnErrorValuesAsNull": True},
   "defaultPowerBIDataSourceVersion": "powerBI_V3",
   "sourceQueryCulture": "en-GB",
   "expressions": [{
     "name": "DataFolder", "kind": "m",
     "expression": ['"C:\\APEX Data" meta [IsParameterQuery=true, Type="Text", IsParameterQueryRequired=true]'],
   }],
   "tables": tables,
   "relationships": [
     {"name":"Dim_Hotel_Fact_Spend","fromTable":"Fact_Spend","fromColumn":"InnCode",
      "toTable":"Dim_Hotel","toColumn":"InnCode","crossFilteringBehavior":"oneDirection"},
     {"name":"Reg_SpendAgg","fromTable":"Fact_Spend_Agg","fromColumn":"region_std",
      "toTable":"Dim_Region","toColumn":"region_std","crossFilteringBehavior":"oneDirection"},
     {"name":"Reg_CRF","fromTable":"Fact_CRF","fromColumn":"region_std",
      "toTable":"Dim_Region","toColumn":"region_std","crossFilteringBehavior":"oneDirection"},
     {"name":"Reg_Prog","fromTable":"Fact_Programme_Spend","fromColumn":"region_std",
      "toTable":"Dim_Region","toColumn":"region_std","crossFilteringBehavior":"oneDirection"},
     {"name":"Life_SpendAgg","fromTable":"Fact_Spend_Agg","fromColumn":"lifecycle_stage",
      "toTable":"Dim_Lifecycle","toColumn":"lifecycle_stage","crossFilteringBehavior":"oneDirection"},
     {"name":"Life_Prog","fromTable":"Fact_Programme_Spend","fromColumn":"lifecycle_stage",
      "toTable":"Dim_Lifecycle","toColumn":"lifecycle_stage","crossFilteringBehavior":"oneDirection"},
     # Narrative overlay — insights filter with the same region/lifecycle slicers as the numbers
     {"name":"Reg_Insight","fromTable":"Fact_Insight","fromColumn":"region_std",
      "toTable":"Dim_Region","toColumn":"region_std","crossFilteringBehavior":"oneDirection"},
     {"name":"Life_Insight","fromTable":"Fact_Insight","fromColumn":"lifecycle_stage",
      "toTable":"Dim_Lifecycle","toColumn":"lifecycle_stage","crossFilteringBehavior":"oneDirection"},
     ] + [
     # Conformed attribute dimensions. Without these, slicing category / segment / chain
     # scale / market type filtered the market side only and left programme spend at its
     # full value in every cell — which made every Headroom chart on page 3 wrong.
     r for dim, col in [("Dim_Category","category"), ("Dim_ChainScale","chain_scale"),
                        ("Dim_Segment","segment_group"), ("Dim_Market","market_categorisation"),
                        ("Dim_Priority","priority_market")]
       for r in ({"name":f"{dim}_Agg","fromTable":"Fact_Spend_Agg","fromColumn":col,
                  "toTable":dim,"toColumn":col,"crossFilteringBehavior":"oneDirection"},
                 {"name":f"{dim}_Prog","fromTable":"Fact_Programme_Spend","fromColumn":col,
                  "toTable":dim,"toColumn":col,"crossFilteringBehavior":"oneDirection"})],
   "annotations": [{"name": "PBI_QueryOrder",
     "value": json.dumps(["DataFolder"] + list(TABLES.keys()))}],
 }}

open(os.path.join(SM, "model.bim"), "w", encoding="utf-8").write(json.dumps(model, indent=2))
open(os.path.join(SM, "definition.pbism"), "w", encoding="utf-8").write(json.dumps(
  {"version": "1.0", "settings": {}}, indent=2))
open(os.path.join(ROOT, f"{NAME}.pbip"), "w", encoding="utf-8").write(json.dumps({
  "version": "1.0",
  "artifacts": [{"report": {"path": f"{NAME}.Report"}}],
  "settings": {"enableAutoRecovery": True}}, indent=2))
print("SemanticModel written:", len(tables), "tables,", len(MEASURES), "measures")
