import json, os, shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
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
   ("spend","double")],
 "Dim_Region": [("region_std","string"),("region_name","string"),("sort_order","int64")],
 "Fact_ShareOfWallet": [("reporting_region","string"),("region","string"),("lifecycle_stage","string"),
   ("ihg_flag","string"),("addressable_spend","double"),("hotels","int64"),
   ("is_directly_addressable","string")],
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

MEASURES = [
 ("Total Spend", "SUM ( Fact_Spend_Agg[spend] )", "\\$#,##0"),
 ("Addressable Spend",
  'CALCULATE ( [Total Spend], Fact_Spend_Agg[addressability] = "Addressable" )',
  "\\$#,##0"),
 ("Directly Addressable Spend",
  'CALCULATE ( [Total Spend], Fact_Spend_Agg[addressability] = "Addressable", '
  'Fact_Spend_Agg[lifecycle_stage] <> "BUILD" )',
  "\\$#,##0"),
 ("IHG Addressable Spend",
  'CALCULATE ( [Addressable Spend], Fact_Spend_Agg[ihg_flag] = "IHG" )',
  "\\$#,##0"),
 ("IHG Share of Addressable %",
  "DIVIDE ( [IHG Addressable Spend], [Addressable Spend] )", "0.0%"),
 ("Hotel Count", "DISTINCTCOUNT ( Fact_Spend[InnCode] )", "#,0"),
 ("Programme Spend",
  'CALCULATE ( SUM ( Fact_Programme_Spend[spend] ), '
  'Fact_Programme_Spend[measure] = "Programme (P2P) Spend" )',
  "\\$#,##0"),
 ("CRF Total", "SUM ( Fact_CRF[crf_usd] )", "\\$#,##0"),
 ("Capture Rate %", "DIVIDE ( [Programme Spend], [Directly Addressable Spend] )", "0.00%"),
 ("Average CRF Rate %", "DIVIDE ( [CRF Total], [Programme Spend] )", "0.00%"),
 ("IHG Directly Addressable",
  'CALCULATE ( [Directly Addressable Spend], Fact_Spend_Agg[ihg_flag] = "IHG" )', "\\$#,##0"),
 ("Total Market Spend", "[Total Spend]", "\\$#,##0"),
 ("Headroom", "[IHG Directly Addressable] - [Programme Spend]", "\\$#,##0"),
 ("IHG Hotels",
  'CALCULATE ( DISTINCTCOUNT ( Fact_Spend[InnCode] ), '
  'Dim_Hotel[ihg_flag] = "IHG", '
  'Dim_Hotel[contract_status] = "Open - Accepting Guests", '
  'Fact_Spend[addressability] = "Addressable" )', "#,0"),
]

tables = [{
  "name": "_Parameters", "isHidden": True,
  "columns": [{"name": "DataFolder", "dataType": "string", "sourceColumn": "DataFolder"}],
  "partitions": [{"name": "_Parameters", "mode": "import", "source": {"type": "m",
     "expression": ['let Source = #table({"DataFolder"},{{DataFolder}}) in Source']}}]
}]
for tbl, cols in TABLES.items():
    t = {"name": tbl,
         "columns": [{"name": c, "dataType": d, "sourceColumn": c,
                      **({"formatString": "#,0"} if d in ("int64",) else {}),
                      **({"formatString": "#,0.00"} if d == "double" else {})} for c, d in cols],
         "partitions": [{"name": tbl, "mode": "import",
                         "source": {"type": "m", "expression": m_expr(tbl, cols)}}]}
    if tbl == "Fact_Spend_Agg":
        t["measures"] = [{"name": n, "expression": e, "formatString": f} for n, e, f in MEASURES]
    tables.append(t)

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
      "toTable":"Dim_Region","toColumn":"region_std","crossFilteringBehavior":"oneDirection"}],
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
