import json, os, uuid
ROOT=os.path.dirname(os.path.abspath(__file__)); RPT=os.path.join(ROOT,"APEX_v2.Report")
os.makedirs(RPT, exist_ok=True)
AUTO={"expr":{"Literal":{"Value":"0D"}}}          # Auto display units (256.4bn)

def _title(t):
    return {"title":[{"properties":{"text":{"expr":{"Literal":{"Value":f"'{t}'"}}},
                                    "show":{"expr":{"Literal":{"Value":"true"}}}}}]}

def _build(cols, meas):
    """cols/meas = [(table, field)]. Returns (From, Select) with one alias per table."""
    alias={}
    for t,_ in list(cols)+list(meas):
        if t not in alias: alias[t]=f"e{len(alias)}"
    frm=[{"Name":a,"Entity":t,"Type":0} for t,a in alias.items()]
    sel=[]
    for t,c in cols:
        sel.append({"Column":{"Expression":{"SourceRef":{"Source":alias[t]}},"Property":c},
                    "Name":f"{t}.{c}"})
    for t,m in meas:
        sel.append({"Measure":{"Expression":{"SourceRef":{"Source":alias[t]}},"Property":m},
                    "Name":f"{t}.{m}"})
    return frm, sel

def _wrap(vtype, proj, cols, meas, x,y,w,h, title, extra_objects=None):
    frm, sel = _build(cols, meas)
    sv={"visualType":vtype,"projections":proj,
        "prototypeQuery":{"Version":2,"From":frm,"Select":sel},
        "drillFilterOtherVisuals":True}
    if extra_objects: sv["objects"]=extra_objects
    if title: sv["vcObjects"]=_title(title)
    cfg={"name":uuid.uuid4().hex,
         "layouts":[{"id":0,"position":{"x":x,"y":y,"z":0,"width":w,"height":h}}],
         "singleVisual":sv}
    return {"x":x,"y":y,"z":0,"width":w,"height":h,"config":json.dumps(cfg),"filters":"[]"}

def chart(vtype, _entity, cats, meas, x,y,w,h, title, legend=None):
    proj={"Category":[{"queryRef":f"{t}.{c}"} for t,c in cats],
          "Y":[{"queryRef":f"{t}.{m}"} for t,m in meas]}
    cols=list(cats)
    if legend:
        proj["Series"]=[{"queryRef":f"{legend[0]}.{legend[1]}"}]; cols=cols+[legend]
    return _wrap(vtype, proj, cols, meas, x,y,w,h, title,
                 {"valueAxis":[{"properties":{"labelDisplayUnits":AUTO}}],
                  "labels":[{"properties":{"labelDisplayUnits":AUTO}}]})

def card(_entity, tbl, measure, x,y,w,h, title):
    return _wrap("card", {"Values":[{"queryRef":f"{tbl}.{measure}"}]}, [], [(tbl,measure)],
                 x,y,w,h, title, {"labels":[{"properties":{"labelDisplayUnits":AUTO}}]})

def slicer(_entity, tbl, col, x,y,w,h):
    return _wrap("slicer", {"Values":[{"queryRef":f"{tbl}.{col}"}]}, [(tbl,col)], [],
                 x,y,w,h, None)

def table(cols, meas, x,y,w,h, title):
    proj={"Values":[{"queryRef":f"{t}.{c}"} for t,c in cols]
                 + [{"queryRef":f"{t}.{m}"} for t,m in meas]}
    return _wrap("tableEx", proj, cols, meas, x,y,w,h, title)

def matrix(_entity, rows, cols, meas, x,y,w,h, title):
    proj={"Rows":[{"queryRef":f"{t}.{c}"} for t,c in rows],
          "Columns":[{"queryRef":f"{t}.{c}"} for t,c in cols],
          "Values":[{"queryRef":f"{t}.{m}"} for t,m in meas]}
    return _wrap("pivotTable", proj, rows+cols, meas, x,y,w,h, title,
                 {"values":[{"properties":{"labelDisplayUnits":AUTO}}]})

S="Fact_Spend_Agg"; R="Dim_Region"; L="Dim_Lifecycle"
# Conformed attribute dimensions. Slicing these filters BOTH the market side and the
# programme side — slicing the equivalent Fact_Spend_Agg column only filters the market
# side, which silently broke every Headroom chart before they existed.
C="Dim_Category"; CS="Dim_ChainScale"; SG="Dim_Segment"; MK="Dim_Market"; PR="Dim_Priority"
I="Fact_Insight"
# ============ PAGE 1 — THE PRIZE ============
p1=[
 card(S,S,"Total Market Spend",   20,20,235,95,"Total market spend"),
 card(S,S,"Addressable Spend",   265,20,235,95,"Procurement-addressable"),
 card(S,S,"IHG Addressable Spend",510,20,235,95,"IHG estate addressable"),
 card(S,S,"IHG Share of Addressable %",755,20,235,95,"IHG share of addressable"),
 slicer(R,R,"region_name",1000,20,240,95),
 chart("waterfallChart",S,[(S,"addressability")],[(S,"Total Spend")],20,130,470,260,
       "Of all hotel spend, what can procurement actually address?"),
 chart("clusteredColumnChart",L,[(L,"lifecycle_stage")],[(S,"Addressable Spend")],500,130,360,260,
       "Where the addressable money sits: BUILD dominates"),
 chart("clusteredColumnChart",R,[(R,"region_name")],[(S,"Addressable Spend")],870,130,370,260,
       "Addressable spend by region"),
 chart("clusteredColumnChart",S,[(S,"chain_scale")],[(S,"Addressable Spend")],20,400,400,240,
       "By chain scale"),
 chart("clusteredColumnChart",S,[(S,"segment_group")],[(S,"Addressable Spend")],430,400,400,240,
       "By segment"),
 chart("clusteredColumnChart",S,[(S,"management_type")],[(S,"Addressable Spend")],840,400,400,240,
       "By management type"),
]
# ============ PAGE 2 — OUR POSITION ============
p2=[
 card(S,S,"IHG Addressable Spend",  20,20,235,95,"IHG estate addressable"),
 card(S,S,"IHG Directly Addressable",265,20,235,95,"Directly addressable (excl BUILD)"),
 card(S,S,"Programme Spend",       510,20,235,95,"Captured on IHG programmes"),
 card(S,S,"Capture Rate %",        755,20,235,95,"Capture rate"),
 card(S,S,"CRF 2025",            1000,20,240,95,"CRF collected (2025)"),
 chart("clusteredColumnChart",R,[(R,"region_name")],[(S,"IHG Directly Addressable"),(S,"Programme Spend")],
       20,130,610,260,"Addressable vs captured, by region — AMER carries the load"),
 chart("clusteredColumnChart",R,[(R,"region_name")],
       [(S,"Capture Rate %"),(S,"Capture Rate % (like-for-like)")],640,130,300,260,
       "Capture rate by region — headline vs like-for-like"),
 chart("clusteredColumnChart",R,[(R,"region_name")],[(S,"Average CRF Rate %")],950,130,290,260,
       "Average CRF rate"),
 chart("clusteredColumnChart",L,[(L,"lifecycle_stage")],[(S,"IHG Directly Addressable"),(S,"Programme Spend")],
       20,400,610,240,"Addressable vs captured, by lifecycle stage"),
 matrix(L,[(L,"lifecycle_stage")],[(R,"region_name")],[(S,"Capture Rate %")],640,400,600,240,
        "Capture rate — region x lifecycle"),
]
# ============ PAGE 3 — WHERE TO ACT ============
p3=[
 card(S,S,"Headroom", 20,20,235,95,"Total headroom"),
 card(S,S,"IHG Hotels",265,20,235,95,"IHG hotels"),
 slicer(L,L,"lifecycle_stage",510,20,235,95),
 slicer(CS,CS,"chain_scale_name",755,20,235,95),
 slicer(R,R,"region_name",1000,20,240,95),
 matrix(L,[(L,"lifecycle_stage"),(C,"category_name")],[(R,"region_name")],[(S,"Headroom")],
        20,130,610,300,"Headroom by category x region — where to aim"),
 chart("clusteredBarChart",C,[(C,"category_name")],[(S,"Headroom"),(S,"Capture Rate %")],
       640,130,600,300,"Category headroom, with how much of it we already capture"),
 chart("clusteredBarChart",MK,[(MK,"market_name")],[(S,"Headroom")],20,440,400,220,
       "Headroom by market type"),
 chart("clusteredBarChart",SG,[(SG,"segment_name")],[(S,"Headroom")],430,440,400,220,
       "Headroom by segment"),
 chart("clusteredBarChart",PR,[(PR,"priority_name")],[(S,"Headroom")],840,440,400,220,
       "Priority vs non-priority markets"),
]
# ============ PAGE 4 — DELIVERY (QBR) ============
p4=[
 chart("columnChart","Fact_CRF",[("Fact_CRF","month")],[(S,"CRF Total")],20,20,610,270,
       "CRF collected by month", legend=("Fact_CRF","region")),
 chart("columnChart","Fact_P2P",[("Fact_P2P","month")],[(S,"P2P Systems")],640,20,600,270,
       "P2P rollout — set estate_group slicer", legend=("Fact_P2P","region")),
 slicer("Fact_P2P","Fact_P2P","estate_group",20,300,290,110),
 slicer("Fact_Supplier","Fact_Supplier","programme",20,420,290,110),
 slicer("Fact_SystemSize","Fact_SystemSize","geo_level",20,540,290,110),
 chart("clusteredColumnChart","Fact_Supplier",[("Fact_Supplier","period")],[(S,"Supplier Value")],
       320,300,460,350,"Supplier programmes — filter programme + row_type",
       legend=("Fact_Supplier","metric")),
 chart("lineChart","Fact_SystemSize",[("Fact_SystemSize","month")],[(S,"System Size Value")],
       790,300,450,350,"System size — set geo_level slicer",
       legend=("Fact_SystemSize","geography")),
]
# ============ PAGE 5 — NARRATIVE (the AI overlay surface) ============
# Insights carry the same region and lifecycle keys as the facts, so the two slicers
# filter the words and the numbers together. Global insights are stored fanned out across
# every region x lifecycle, so no slicer combination can hide them; the table visual groups
# on the displayed columns, which collapses the copies back to one line.
p5=[
 card(S,S,"Capture Rate %",       20,20,235,95,"Capture rate (headline)"),
 card(S,S,"Capture Rate % (like-for-like)",265,20,235,95,"Capture rate (like-for-like)"),
 card(S,S,"Headroom",            510,20,235,95,"Headroom"),
 slicer(R,R,"region_name",       755,20,235,95),
 slicer(L,L,"lifecycle_stage",  1000,20,240,95),
 slicer(I,I,"theme",              20,130,235,250),
 slicer(I,I,"source_type",        20,390,235,130),
 slicer(I,I,"confidence",         20,530,235,130),
 table([(I,"theme"),(I,"statement"),(I,"so_what"),(I,"source")],[],
       265,130,975,530,
       "What we know — filtered by the same slicers as the numbers"),
]

def page(i,name,disp,vcs):
    return {"id":i,"name":name,"displayName":disp,"filters":"[]","ordinal":i,
            "visualContainers":vcs,"config":json.dumps({}),"width":1280,"height":720,"displayOption":1}
report={"id":0,"resourcePackages":[],"sections":[
  page(0,"S1","1. The Prize",p1), page(1,"S2","2. Our Position",p2),
  page(2,"S3","3. Where to Act",p3), page(3,"S4","4. Delivery (QBR)",p4),
  page(4,"S5","5. Narrative",p5)],
  "config":json.dumps({"version":"5.43","themeCollection":{"baseTheme":{"name":"CY24SU10"}},
                       "activeSectionIndex":0,"defaultDrillFilterOtherVisuals":True}),
  "layoutOptimization":0}
open(os.path.join(RPT,"report.json"),"w",encoding="utf-8").write(json.dumps(report,indent=2))
open(os.path.join(RPT,"definition.pbir"),"w",encoding="utf-8").write(json.dumps(
 {"version":"1.0","datasetReference":{"byPath":{"path":"../APEX_v2.SemanticModel"}}},indent=2))
print(f"5 pages, {sum(len(p) for p in (p1,p2,p3,p4,p5))} visuals")
