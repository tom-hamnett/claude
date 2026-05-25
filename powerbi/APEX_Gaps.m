let
    BaseUrl = "https://YOUR-CODESPACE-URL",
    Source = Json.Document(Web.Contents(BaseUrl & "/api/programmes/ihg-pe/gaps")),
    GapsList = Source[gaps],
    Table = Table.FromList(GapsList, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    Expanded = Table.ExpandRecordColumn(Table, "Column1",
        {"kpi", "domain", "panel", "type", "message", "severity"},
        {"KPI", "Domain", "Panel", "Gap Type", "Message", "Severity"})
in
    Expanded
