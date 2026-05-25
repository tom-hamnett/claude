let
    BaseUrl = "https://YOUR-CODESPACE-URL",
    Source = Json.Document(Web.Contents(BaseUrl & "/api/programmes/ihg-pe/tableau/corporate")),
    DataList = Source[data],
    Table = Table.FromList(DataList, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    Expanded = Table.ExpandRecordColumn(Table, "Column1",
        {"_metric", "_panel", "_source_table", "_target", "_direction", "_unit",
         "month", "region", "AMER", "EMEAA", "GC", "total", "count", "value",
         "score", "filled", "open", "IND"},
        {"Metric", "Panel", "Source Table", "Target", "Direction", "Unit",
         "Month", "Region", "AMER", "EMEAA", "GC", "Total", "Count", "Value",
         "Score", "Filled", "Open", "IND"}),
    TypedTable = Table.TransformColumnTypes(Expanded, {
        {"AMER", type number}, {"EMEAA", type number}, {"GC", type number},
        {"Total", type number}, {"Count", type number}, {"Value", type number},
        {"Score", type number}, {"Filled", type number}, {"Open", type number},
        {"Target", type number}
    })
in
    TypedTable
