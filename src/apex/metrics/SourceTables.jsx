// Source Data Tables: browse, upload (smart), view, download
import { useState, useRef } from "react";
import { Spinner, Card, EmptyState } from "../components/ui.jsx";
import DataExplorer from "./DataExplorer.jsx";
import SmartUpload from "./SmartUpload.jsx";

export default function SourceTables({ programmeId, tables, onRefresh }) {
  const [showSmartUpload, setShowSmartUpload] = useState(false);
  const [viewTable, setViewTable] = useState(null);
  const [viewData, setViewData] = useState(null);
  const [diff, setDiff] = useState(null);

  async function openTable(table) {
    setViewTable(table);
    try {
      const r = await fetch(`/api/data-tables/${table.id}/rows?limit=2000`);
      const data = await r.json();
      setViewData(data);
    } catch (e) { setViewData([]); }
  }

  if (viewTable && viewData) {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <button onClick={() => { setViewTable(null); setViewData(null); }} style={{ fontSize: 12, fontFamily: "var(--font-d)", padding: "6px 14px", border: "1px solid var(--border2)", borderRadius: 6, color: "var(--text2)", marginRight: 12 }}>← Back to tables</button>
            <span style={{ fontSize: 16, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)" }}>{viewTable.name}</span>
            <span style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text3)", marginLeft: 10 }}>v{viewTable.version} · {viewTable.row_count} rows</span>
          </div>
          <a href={`/api/data-tables/${viewTable.id}/export`} download style={{ fontSize: 12, fontFamily: "var(--font-d)", padding: "6px 14px", background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 6, color: "var(--text2)", textDecoration: "none" }}>📥 Download CSV</a>
        </div>
        <DataExplorer columns={viewTable.columns} data={viewData} title={viewTable.name} tableId={viewTable.id} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 15, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)" }}>Source Data Tables</div>
          <div style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text2)", marginTop: 2 }}>Upload Excel or CSV files. Data is parsed, stored, and available for KPI definitions.</div>
        </div>
        <button onClick={() => setShowSmartUpload(true)} style={{ fontSize: 12, fontFamily: "var(--font-d)", fontWeight: 700, padding: "8px 16px", borderRadius: 6, background: "var(--accent)", color: "#000" }}>📄 Smart Upload</button>
      </div>

      {/* Version diff banner */}
      {diff && (
        <Card color="#F5C544" style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontFamily: "var(--font-d)", fontWeight: 700, color: "#F5C544", marginBottom: 4 }}>New version detected — {diff.name} v{diff.version}</div>
              <div style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text)", lineHeight: 1.6 }}>
                {diff.diff.added > 0 && <span style={{ color: "#5DC484" }}>+{diff.diff.added} new rows  </span>}
                {diff.diff.modified > 0 && <span style={{ color: "#F5C544" }}>{diff.diff.modified} modified  </span>}
                {diff.diff.removed > 0 && <span style={{ color: "#E8734A" }}>-{diff.diff.removed} removed  </span>}
                {diff.diff.unchanged > 0 && <span style={{ color: "var(--text3)" }}>{diff.diff.unchanged} unchanged</span>}
              </div>
              {diff.diff.details?.slice(0, 5).map((d, i) => (
                <div key={i} style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text2)", marginTop: 4 }}>
                  Row {d.row}: {Object.entries(d.changes).map(([k, v]) => `${k}: ${v.from} → ${v.to}`).join(", ")}
                </div>
              ))}
            </div>
            <button onClick={() => setDiff(null)} style={{ fontSize: 12, color: "var(--text3)", padding: "4px 8px" }}>✕</button>
          </div>
        </Card>
      )}

      {tables.length === 0 && (
        <EmptyState icon="📄" title="No source data tables yet" description="Upload an Excel (.xlsx) or CSV file to create a source data table. Once uploaded, you can browse the data, create KPIs from it, and view it as charts." />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 10 }}>
        {tables.map(t => (
          <button key={t.id} onClick={() => openTable(t)} style={{ padding: 16, background: "var(--bg2)", border: "1px solid var(--border)", borderLeft: "3px solid var(--accent)", borderRadius: 8, textAlign: "left", transition: "all 0.15s" }} onMouseEnter={e => { e.currentTarget.style.background = "var(--bg3)"; e.currentTarget.style.borderColor = "var(--accent)"; }} onMouseLeave={e => { e.currentTarget.style.background = "var(--bg2)"; e.currentTarget.style.borderColor = "var(--border)"; }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div style={{ fontSize: 14, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)" }}>{t.name}</div>
              <span style={{ fontSize: 10, fontFamily: "var(--font-m)", color: "var(--accent)", background: "rgba(42,191,191,0.12)", padding: "2px 8px", borderRadius: 3 }}>v{t.version}</span>
            </div>
            <div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text2)", marginBottom: 6 }}>{t.row_count} rows · {t.columns?.length || 0} columns</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {(t.columns || []).slice(0, 6).map(c => (
                <span key={c.name} style={{ fontSize: 10, fontFamily: "var(--font-m)", padding: "2px 6px", borderRadius: 3, background: c.isDimension ? "rgba(245,197,68,0.12)" : c.type === "number" ? "rgba(93,196,132,0.12)" : "rgba(74,158,255,0.12)", color: c.isDimension ? "#F5C544" : c.type === "number" ? "#5DC484" : "#4A9EFF", border: `1px solid ${c.isDimension ? "#F5C54430" : c.type === "number" ? "#5DC48430" : "#4A9EFF30"}` }}>{c.name}</span>
              ))}
              {(t.columns?.length || 0) > 6 && <span style={{ fontSize: 10, fontFamily: "var(--font-m)", color: "var(--text3)" }}>+{t.columns.length - 6}</span>}
            </div>
          </button>
        ))}
      </div>

      {showSmartUpload && (
        <SmartUpload programmeId={programmeId} onComplete={(result) => { setShowSmartUpload(false); setDiff(result.diff ? result : null); onRefresh(); }} onClose={() => setShowSmartUpload(false)} />
      )}
    </div>
  );
}
