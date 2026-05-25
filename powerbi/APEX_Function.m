let
    BaseUrl = "https://YOUR-CODESPACE-URL",
    Source = Json.Document(Web.Contents(BaseUrl & "/api/programmes/ihg-pe/tableau/function")),
    DataList = Source[data],
    Table = Table.FromList(DataList, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    Expanded = Table.ExpandRecordColumn(Table, "Column1",
        {"_metric", "_panel", "_source_table", "_target", "_direction", "_unit",
         "month", "region", "total", "count", "value",
         "wip", "complete", "planned"},
        {"Metric", "Panel", "Source Table", "Target", "Direction", "Unit",
         "Month", "Region", "Total", "Count", "Value",
         "WIP", "Complete", "Planned"}),
    TypedTable = Table.TransformColumnTypes(Expanded, {
        {"Total", type number}, {"Count", type number}, {"Value", type number},
        {"WIP", type number}, {"Complete", type number}, {"Planned", type number},
        {"Target", type number}
    })
in
    TypedTable
