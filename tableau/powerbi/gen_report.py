import json, os, uuid
ROOT=os.path.dirname(os.path.abspath(__file__)); RPT=os.path.join(ROOT,"APEX.Report")
os.makedirs(RPT, exist_ok=True)

def vis(vtype, tbl, dims, meas, x, y, w, h, title=None, wells=("Category","Y")):
    """dims/meas = list of column/measure names. wells = (categoryWell, valueWell)"""
    src="q1"; sel=[]; proj={wells[0]:[], wells[1]:[]}
    for d in dims:
        ref=f"{tbl}.{d}"
        sel.append({"Column":{"Expression":{"SourceRef":{"Source":src}},"Property":d},"Name":ref})
        proj[wells[0]].append({"queryRef":ref})
    for m in meas:
        ref=f"{tbl}.{m}"
        sel.append({"Measure":{"Expression":{"SourceRef":{"Source":src}},"Property":m},"Name":ref})
        proj[wells[1]].append({"queryRef":ref})
    sv={"visualType":vtype,"projections":proj,
        "prototypeQuery":{"Version":2,"From":[{"Name":src,"Entity":tbl,"Type":0}],"Select":sel},
        "drillFilterOtherVisuals":True}
    if title:
        sv["vcObjects"]={"title":[{"properties":{"text":{"expr":{"Literal":{"Value":f"'{title}'"}}},
                                                "show":{"expr":{"Literal":{"Value":"true"}}}}}]}
    cfg={"name":uuid.uuid4().hex,"layouts":[{"id":0,"position":{"x":x,"y":y,"z":0,"width":w,"height":h}}],
         "singleVisual":sv}
    return {"x":x,"y":y,"z":0,"width":w,"height":h,"config":json.dumps(cfg),"filters":"[]"}

def card(tbl, measure, x, y, w, h, title):
    return vis("card", tbl, [], [measure], x, y, w, h, title, wells=("Category","Values"))

def slicer(tbl, col, x, y, w, h):
    src="q1"; ref=f"{tbl}.{col}"
    sv={"visualType":"slicer",
        "projections":{"Values":[{"queryRef":ref}]},
        "prototypeQuery":{"Version":2,"From":[{"Name":src,"Entity":tbl,"Type":0}],
          "Select":[{"Column":{"Expression":{"SourceRef":{"Source":src}},"Property":col},"Name":ref}]},
        "drillFilterOtherVisuals":True}
    cfg={"name":uuid.uuid4().hex,"layouts":[{"id":0,"position":{"x":x,"y":y,"z":0,"width":w,"height":h}}],
         "singleVisual":sv}
    return {"x":x,"y":y,"z":0,"width":w,"height":h,"config":json.dumps(cfg),"filters":"[]"}

T="Fact_Spend_Agg"
# ---------- Page 1: Market & Share of Wallet ----------
p1=[
 card(T,"Addressable Spend",20,20,200,90,"Total Addressable"),
 card(T,"IHG Addressable Spend",230,20,200,90,"IHG Addressable"),
 card(T,"IHG Share of Addressable %",440,20,200,90,"IHG Share"),
 card(T,"Directly Addressable Spend",650,20,200,90,"IHG Directly Addressable"),
 slicer(T,"region",860,20,190,90),
 vis("clusteredColumnChart",T,["lifecycle_stage"],["Addressable Spend"],20,125,400,250,
     "1.1 Addressable spend by lifecycle stage"),
 vis("stackedColumnChart",T,["region","ihg_flag"],["Addressable Spend"],430,125,400,250,
     "1.2 IHG vs Rest of Market"),
 vis("waterfallChart",T,["addressability"],["Total Spend"],840,125,400,250,
     "1.6 Spend waterfall"),
 vis("stackedColumnChart",T,["region","lifecycle_stage"],["Addressable Spend"],20,385,400,250,
     "1.3 Region x lifecycle"),
 vis("hundredPercentStackedColumnChart",T,["segment_group","lifecycle_stage"],["Addressable Spend"],
     430,385,400,250,"1.4 Segment mix"),
 vis("matrix",T,["lifecycle_stage","reporting_region"],["IHG Addressable Spend"],840,385,400,250,
     "1.5 Capture heatmap"),
]
# ---------- Page 2: QBR Operational ----------
p2=[
 vis("stackedColumnChart","Fact_CRF",["month","region"],["CRF Total"],20,20,600,280,
     "2.1 CRF monthly tracking"),
 vis("stackedColumnChart","Fact_P2P",["month","region"],["systems"],640,20,600,280,
     "2.2 / 2.3 P2P rollout  (filter estate_group!)"),
 slicer("Fact_P2P","estate_group",20,310,280,120),
 vis("clusteredColumnChart","Fact_Supplier",["period","metric"],["value"],310,310,460,280,
     "2.4 Supplier programmes  (filter programme + row_type)"),
 slicer("Fact_Supplier","programme",20,440,280,150),
 vis("lineChart","Fact_SystemSize",["month","geography"],["value"],790,310,450,280,
     "2.5 System size  (filter geo_level!)"),
 slicer("Fact_SystemSize","geo_level",20,600,280,110),
]
def page(i,name,disp,vcs):
    return {"id":i,"name":name,"displayName":disp,"filters":"[]","ordinal":i,
            "visualContainers":vcs,"config":json.dumps({}),"width":1280,"height":720,
            "displayOption":1}
report={"id":0,"resourcePackages":[],"sections":[
  page(0,"ReportSection1","1. Market & Share of Wallet",p1),
  page(1,"ReportSection2","2. QBR Operational",p2)],
  "config":json.dumps({"version":"5.43","themeCollection":{"baseTheme":{"name":"CY24SU10"}},
                       "activeSectionIndex":0,"defaultDrillFilterOtherVisuals":True}),
  "layoutOptimization":0}
open(os.path.join(RPT,"report.json"),"w",encoding="utf-8").write(json.dumps(report,indent=2))
open(os.path.join(RPT,"definition.pbir"),"w",encoding="utf-8").write(json.dumps(
 {"version":"1.0","datasetReference":{"byPath":{"path":"../APEX.SemanticModel"}}},indent=2))
print(f"Report written: 2 pages, {len(p1)+len(p2)} visuals")
