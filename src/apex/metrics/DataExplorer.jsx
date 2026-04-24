// DataExplorer: chart + table side-by-side with dynamic filters, chart toggles, export.
// Can be driven by a KPI definition (with source table) or by raw data.
import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ComposedChart } from "recharts";
import { Spinner } from "../components/ui.jsx";

const COLORS = ["#F5C544", "#4A9EFF", "#5DC484", "#A78BFA", "#E8734A", "#2ABFBF", "#FF7EB3", "#FFD93D"];

export default function DataExplorer({ kpi, data: rawData, columns: rawColumns, title, tableId }) {
  const [chartType, setChartType] = useState(kpi?.chart_type || "bar");
  const [filters, setFilters] = useState({});
  const [layout, setLayout] = useState("split"); // split | chart | table
  const [varianceMode, setVarianceMode] = useState(null); // null | mom | qoq

  // Determine columns and data
  const columns = rawColumns || [];
  const allData = rawData || [];

  // Dimension columns for filter dropdowns
  const dimensions = useMemo(() => {
    return columns.filter(c => c.isDimension || c.type === "string").map(c => {
      const values = [...new Set(allData.map(r => r[c.name]).filter(v => v != null))];
      return { ...c, values };
    });
  }, [columns, allData]);

  // Time column
  const timeCol = kpi?.time_column || columns.find(c => c.type === "date" || /month|date|period|quarter|year/i.test(c.name))?.name;

  // Value columns (numeric, non-dimension)
  const valueColumns = useMemo(() => {
    return columns.filter(c => c.type === "number" && !c.isDimension);
  }, [columns]);

  // Active value column
  const [activeValue, setActiveValue] = useState(kpi?.value_column || valueColumns[0]?.name);

  // Apply filters
  const filteredData = useMemo(() => {
    let d = allData;
    for (const [col, val] of Object.entries(filters)) {
      if (val && val !== "__all__") d = d.filter(r => String(r[col]) === val);
    }
    return d;
  }, [allData, filters]);

  // Chart data: group by time column, break out by first dimension
  const chartData = useMemo(() => {
    if (!timeCol || !activeValue) return filteredData;
    const breakoutDim = dimensions.find(d => d.name !== timeCol && !filters[d.name]);
    const groups = {};
    for (const row of filteredData) {
      const tKey = String(row[timeCol] ?? "");
      if (!groups[tKey]) groups[tKey] = { [timeCol]: row[timeCol] };
      if (breakoutDim) {
        const dk = String(row[breakoutDim.name] ?? "Other");
        groups[tKey][dk] = (groups[tKey][dk] || 0) + (Number(row[activeValue]) || 0);
      }
      groups[tKey]._total = (groups[tKey]._total || 0) + (Number(row[activeValue]) || 0);
    }
    return Object.values(groups).map(g => {
      const out = { ...g, total: g._total };
      delete out._total;
      return out;
    });
  }, [filteredData, timeCol, activeValue, dimensions, filters]);

  // Breakout keys for stacked/grouped charts
  const breakoutKeys = useMemo(() => {
    if (!chartData.length) return [];
    const keys = new Set();
    for (const row of chartData) {
      for (const k of Object.keys(row)) {
        if (k !== timeCol && k !== "total" && k !== "_total") keys.add(k);
      }
    }
    return [...keys];
  }, [chartData, timeCol]);

  // Add variance to table data — compares same dimension group MoM
  const tableData = useMemo(() => {
    if (!varianceMode || !timeCol || !activeValue) return filteredData;

    // Group rows by their dimension values (everything except time and value columns)
    const dimCols = dimensions.map(d => d.name).filter(n => n !== timeCol);

    // Build lookup: dimensionKey → sorted array of {time, value}
    const groups = {};
    for (const row of filteredData) {
      const dimKey = dimCols.map(c => String(row[c] ?? "")).join("|") || "__all__";
      if (!groups[dimKey]) groups[dimKey] = [];
      groups[dimKey].push(row);
    }

    // For each row, find the previous time period row with the same dimensions
    return filteredData.map((row) => {
      const dimKey = dimCols.map(c => String(row[c] ?? "")).join("|") || "__all__";
      const group = groups[dimKey] || [];
      const idx = group.indexOf(row);
      if (idx <= 0) return { ...row, _variance: null, _variancePct: null };
      const prev = group[idx - 1];
      const curr = Number(row[activeValue]) || 0;
      const prevVal = Number(prev[activeValue]) || 0;
      const delta = curr - prevVal;
      return { ...row, _variance: delta, _variancePct: prevVal ? ((delta / prevVal) * 100).toFixed(1) : null };
    });
  }, [filteredData, varianceMode, activeValue, timeCol, dimensions]);

  // Export CSV
  function exportCSV() {
    const cols = columns.map(c => c.name);
    const header = cols.join(",");
    const rows = filteredData.map(r => cols.map(c => {
      const v = r[c]; if (v == null) return "";
      const s = String(v); return s.includes(",") ? `"${s}"` : s;
    }).join(","));
    const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${title || "export"}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  // Copy table to clipboard (tab-separated for Excel/ThinkCell)
  function copyTable() {
    const cols = columns.map(c => c.name);
    const header = cols.join("\t");
    const rows = filteredData.map(r => cols.map(c => r[c] ?? "").join("\t"));
    navigator.clipboard?.writeText(header + "\n" + rows.join("\n"));
  }

  const chartTypes = [
    { id: "bar", label: "Bar" },
    { id: "stacked", label: "Stacked" },
    { id: "line", label: "Line" },
    { id: "area", label: "Area" },
  ];

  return (
    <div>
      {/* Controls bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        {/* Filters */}
        {dimensions.map(dim => (
          <select key={dim.name} value={filters[dim.name] || "__all__"} onChange={e => setFilters(f => ({ ...f, [dim.name]: e.target.value }))} style={{ background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 5, color: "var(--text)", fontFamily: "var(--font-b)", fontSize: 12, padding: "6px 10px" }}>
            <option value="__all__">{dim.label || dim.name}: All</option>
            {dim.values.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        ))}

        {/* Value column selector */}
        {valueColumns.length > 1 && (
          <select value={activeValue} onChange={e => setActiveValue(e.target.value)} style={{ background: "var(--bg3)", border: "1px solid var(--accent)", borderRadius: 5, color: "var(--accent)", fontFamily: "var(--font-d)", fontSize: 12, padding: "6px 10px", fontWeight: 600 }}>
            {valueColumns.map(c => <option key={c.name} value={c.name}>{c.label || c.name}</option>)}
          </select>
        )}

        <div style={{ flex: 1 }} />

        {/* Chart type */}
        <div style={{ display: "flex", gap: 3 }}>
          {chartTypes.map(t => (
            <button key={t.id} onClick={() => setChartType(t.id)} style={{ fontSize: 11, fontFamily: "var(--font-d)", fontWeight: chartType === t.id ? 700 : 500, padding: "5px 10px", borderRadius: 4, background: chartType === t.id ? "var(--accent)" : "var(--bg3)", color: chartType === t.id ? "#000" : "var(--text2)", border: `1px solid ${chartType === t.id ? "var(--accent)" : "var(--border2)"}` }}>{t.label}</button>
          ))}
        </div>

        {/* Layout */}
        <div style={{ display: "flex", gap: 3 }}>
          {[["split", "◫"], ["chart", "□"], ["table", "☰"]].map(([id, icon]) => (
            <button key={id} onClick={() => setLayout(id)} style={{ fontSize: 14, padding: "4px 8px", borderRadius: 4, background: layout === id ? "var(--accent)" : "var(--bg3)", color: layout === id ? "#000" : "var(--text2)", border: `1px solid ${layout === id ? "var(--accent)" : "var(--border2)"}` }}>{icon}</button>
          ))}
        </div>

        {/* Variance */}
        <button onClick={() => setVarianceMode(v => v ? null : "mom")} style={{ fontSize: 11, fontFamily: "var(--font-d)", padding: "5px 10px", borderRadius: 4, background: varianceMode ? "var(--yellow)" : "var(--bg3)", color: varianceMode ? "#000" : "var(--text2)", border: `1px solid ${varianceMode ? "var(--yellow)" : "var(--border2)"}`, fontWeight: varianceMode ? 700 : 500 }}>Δ MoM</button>

        {/* Export */}
        <button onClick={exportCSV} style={{ fontSize: 11, fontFamily: "var(--font-d)", padding: "5px 10px", borderRadius: 4, background: "var(--bg3)", color: "var(--text2)", border: "1px solid var(--border2)" }}>📥 CSV</button>
        <button onClick={copyTable} style={{ fontSize: 11, fontFamily: "var(--font-d)", padding: "5px 10px", borderRadius: 4, background: "var(--bg3)", color: "var(--text2)", border: "1px solid var(--border2)" }}>📋 Copy</button>
      </div>

      {/* Target line info */}
      {kpi?.target && (
        <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", marginBottom: 8 }}>
          Target: <span style={{ color: "var(--accent)", fontWeight: 700 }}>{kpi.target}{kpi.unit}</span> · Direction: {kpi.direction}
        </div>
      )}

      {/* Content */}
      <div style={{ display: "grid", gridTemplateColumns: layout === "split" ? "1fr 1fr" : "1fr", gap: 14 }}>
        {/* Chart */}
        {layout !== "table" && (
          <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8, padding: 14 }}>
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                {renderChart(chartType, chartData, timeCol, breakoutKeys, activeValue, kpi?.target)}
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Table */}
        {layout !== "chart" && (
          <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8, overflow: "auto", maxHeight: 350 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "var(--font-m)" }}>
              <thead>
                <tr>
                  {columns.map(c => (
                    <th key={c.name} style={{ padding: "8px 10px", textAlign: "left", borderBottom: "1px solid var(--border)", color: "var(--text2)", background: "var(--bg4)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", position: "sticky", top: 0 }}>{c.label || c.name}</th>
                  ))}
                  {varianceMode && <th style={{ padding: "8px 10px", textAlign: "right", borderBottom: "1px solid var(--border)", color: "var(--yellow)", background: "var(--bg4)", fontSize: 11, position: "sticky", top: 0 }}>Δ MoM</th>}
                </tr>
              </thead>
              <tbody>
                {(varianceMode ? tableData : filteredData).slice(0, 200).map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bg4)"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                    {columns.map(c => (
                      <td key={c.name} style={{ padding: "6px 10px", color: c.type === "number" ? "var(--text)" : "var(--text2)", fontWeight: c.type === "number" ? 600 : 400, textAlign: c.type === "number" ? "right" : "left" }}>{row[c.name] ?? "—"}</td>
                    ))}
                    {varianceMode && (
                      <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700, color: row._variance > 0 ? "#5DC484" : row._variance < 0 ? "#E8734A" : "var(--text3)" }}>
                        {row._variance != null ? `${row._variance > 0 ? "+" : ""}${row._variance} (${row._variancePct}%)` : "—"}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: "6px 10px", fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", borderTop: "1px solid var(--border)" }}>
              {filteredData.length} row{filteredData.length !== 1 ? "s" : ""}{Object.keys(filters).some(k => filters[k] && filters[k] !== "__all__") ? " (filtered)" : ""}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function renderChart(type, data, xKey, seriesKeys, valueCol, target) {
  const tooltipStyle = { background: "#0F3A52", border: "1px solid #1E6080", color: "#fff" };
  const xProps = { dataKey: xKey, tick: { fontSize: 12, fill: "#E0ECF4" } };
  const yProps = { tick: { fontSize: 11, fill: "#B0CBE0" } };
  const grid = <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,85,114,0.5)" />;
  const legend = <Legend />;
  const tip = <Tooltip contentStyle={tooltipStyle} />;
  const targetLine = target ? <ReferenceLine y={target} stroke="#2ABFBF" strokeDasharray="6 3" label={{ value: `Target: ${target}`, fill: "#2ABFBF", fontSize: 10, position: "right" }} /> : null;

  if (type === "stacked" && seriesKeys.length > 0) {
    return (
      <BarChart data={data} barCategoryGap="25%">
        {grid}<XAxis {...xProps} /><YAxis {...yProps} />{tip}{legend}
        {seriesKeys.map((k, i) => <Bar key={k} dataKey={k} stackId="a" fill={COLORS[i % COLORS.length]} name={k} />)}
        {targetLine}
      </BarChart>
    );
  }

  if (type === "line") {
    return (
      <LineChart data={data}>
        {grid}<XAxis {...xProps} /><YAxis {...yProps} />{tip}{legend}
        {seriesKeys.length > 0
          ? seriesKeys.map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} strokeWidth={2} name={k} dot={{ r: 3 }} />)
          : <Line type="monotone" dataKey="total" stroke="#2ABFBF" strokeWidth={2} name={valueCol} dot={{ r: 3 }} />
        }
        {targetLine}
      </LineChart>
    );
  }

  if (type === "area") {
    return (
      <AreaChart data={data}>
        {grid}<XAxis {...xProps} /><YAxis {...yProps} />{tip}{legend}
        {seriesKeys.length > 0
          ? seriesKeys.map((k, i) => <Area key={k} type="monotone" dataKey={k} stackId="a" stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length] + "60"} name={k} />)
          : <Area type="monotone" dataKey="total" stroke="#2ABFBF" fill="rgba(42,191,191,0.3)" name={valueCol} />
        }
        {targetLine}
      </AreaChart>
    );
  }

  // Default: grouped bar
  return (
    <BarChart data={data} barCategoryGap="25%">
      {grid}<XAxis {...xProps} /><YAxis {...yProps} />{tip}{legend}
      {seriesKeys.length > 0
        ? seriesKeys.map((k, i) => <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} name={k} />)
        : <Bar dataKey="total" fill="#2ABFBF" name={valueCol} />
      }
      {targetLine}
    </BarChart>
  );
}
