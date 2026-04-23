// KPI Definer: create/edit KPI definitions, link to source data tables
import { useState, useEffect } from "react";

export default function KPIDefiner({ programmeId, tables, onSave, onClose, existing = null }) {
  const [form, setForm] = useState({
    name: existing?.name || "",
    description: existing?.description || "",
    sourceTableId: existing?.source_table_id || "",
    valueColumn: existing?.value_column || "",
    timeColumn: existing?.time_column || "",
    dimensionColumns: existing?.dimensionColumns || [],
    aggregation: existing?.aggregation || "sum",
    target: existing?.target || "",
    direction: existing?.direction || "higher",
    ragGreen: existing?.rag_green || "",
    ragAmber: existing?.rag_amber || "",
    unit: existing?.unit || "",
    domain: existing?.domain || "",
    panel: existing?.panel || "",
    isHeadline: existing?.isHeadline || false,
    chartType: existing?.chart_type || "bar",
  });

  const selectedTable = tables.find(t => t.id === form.sourceTableId);
  const tableColumns = selectedTable?.columns || [];

  function toggle(col) {
    setForm(f => ({
      ...f,
      dimensionColumns: f.dimensionColumns.includes(col)
        ? f.dimensionColumns.filter(c => c !== col)
        : [...f.dimensionColumns, col],
    }));
  }

  async function submit() {
    const payload = {
      ...form,
      target: form.target ? Number(form.target) : null,
      ragGreen: form.ragGreen ? Number(form.ragGreen) : null,
      ragAmber: form.ragAmber ? Number(form.ragAmber) : null,
    };

    const url = existing
      ? `/api/kpis/${existing.id}`
      : `/api/programmes/${programmeId}/kpis`;
    const method = existing ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    onSave();
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "min(600px,100%)", maxHeight: "85vh", overflow: "auto", background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 12, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontFamily: "var(--font-d)", fontWeight: 800, color: "var(--text)" }}>{existing ? "Edit KPI" : "Define New KPI"}</div>
          <button onClick={onClose} style={{ fontSize: 18, color: "var(--text3)" }}>✕</button>
        </div>

        <Field label="KPI Name *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
        <Field label="Description" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <Label>Domain</Label>
            <select value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} style={selectStyle}>
              <option value="">— Select —</option>
              <option value="hotel">Hotel Procurement</option>
              <option value="corporate">Corporate Procurement</option>
              <option value="function">Function Management</option>
            </select>
          </div>
          <div>
            <Label>Panel</Label>
            <select value={form.panel} onChange={e => setForm(f => ({ ...f, panel: e.target.value }))} style={selectStyle}>
              <option value="">— Select —</option>
              <option value="external">External Context</option>
              <option value="value">Value Proposition</option>
              <option value="enablement">Enablement</option>
              <option value="performance">Performance</option>
            </select>
          </div>
        </div>

        <Label>Source Data Table *</Label>
        <select value={form.sourceTableId} onChange={e => setForm(f => ({ ...f, sourceTableId: e.target.value, valueColumn: "", timeColumn: "", dimensionColumns: [] }))} style={{ ...selectStyle, marginBottom: 12 }}>
          <option value="">— Select a table —</option>
          {tables.map(t => <option key={t.id} value={t.id}>{t.name} (v{t.version}, {t.row_count} rows)</option>)}
        </select>

        {selectedTable && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <Label>Value Column *</Label>
                <select value={form.valueColumn} onChange={e => setForm(f => ({ ...f, valueColumn: e.target.value }))} style={selectStyle}>
                  <option value="">—</option>
                  {tableColumns.filter(c => c.type === "number").map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Time Column</Label>
                <select value={form.timeColumn} onChange={e => setForm(f => ({ ...f, timeColumn: e.target.value }))} style={selectStyle}>
                  <option value="">—</option>
                  {tableColumns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Aggregation</Label>
                <select value={form.aggregation} onChange={e => setForm(f => ({ ...f, aggregation: e.target.value }))} style={selectStyle}>
                  {["sum", "avg", "count", "max", "min", "last"].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <Label>Dimension Columns (click to toggle)</Label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
              {tableColumns.filter(c => c.isDimension || c.type === "string").map(c => (
                <button key={c.name} onClick={() => toggle(c.name)} style={{ fontSize: 11, fontFamily: "var(--font-d)", padding: "5px 12px", borderRadius: 5, background: form.dimensionColumns.includes(c.name) ? "var(--accent)" : "var(--bg3)", color: form.dimensionColumns.includes(c.name) ? "#000" : "var(--text2)", border: `1px solid ${form.dimensionColumns.includes(c.name) ? "var(--accent)" : "var(--border2)"}`, fontWeight: form.dimensionColumns.includes(c.name) ? 700 : 500 }}>{c.name}</button>
              ))}
            </div>
          </>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <Field label="Target" value={form.target} onChange={v => setForm(f => ({ ...f, target: v }))} type="number" />
          <Field label="Unit" value={form.unit} onChange={v => setForm(f => ({ ...f, unit: v }))} placeholder="%, $M, #" />
          <Field label="RAG Green ≥" value={form.ragGreen} onChange={v => setForm(f => ({ ...f, ragGreen: v }))} type="number" />
          <Field label="RAG Amber ≥" value={form.ragAmber} onChange={v => setForm(f => ({ ...f, ragAmber: v }))} type="number" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <Label>Direction</Label>
            <select value={form.direction} onChange={e => setForm(f => ({ ...f, direction: e.target.value }))} style={selectStyle}>
              <option value="higher">Higher is better</option>
              <option value="lower">Lower is better</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>
          <div>
            <Label>Chart Type</Label>
            <select value={form.chartType} onChange={e => setForm(f => ({ ...f, chartType: e.target.value }))} style={selectStyle}>
              {["bar", "stacked", "line", "area"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 4 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={form.isHeadline} onChange={e => setForm(f => ({ ...f, isHeadline: e.target.checked }))} />
              <span style={{ fontSize: 12, fontFamily: "var(--font-d)", color: "var(--text)", fontWeight: 600 }}>Headline KPI</span>
            </label>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ fontSize: 13, fontFamily: "var(--font-d)", padding: "10px 18px", borderRadius: 6, color: "var(--text2)", border: "1px solid var(--border2)" }}>Cancel</button>
          <button onClick={submit} disabled={!form.name || !form.sourceTableId} style={{ fontSize: 13, fontFamily: "var(--font-d)", fontWeight: 700, padding: "10px 24px", borderRadius: 6, background: form.name && form.sourceTableId ? "var(--accent)" : "var(--bg3)", color: form.name && form.sourceTableId ? "#000" : "var(--text3)" }}>{existing ? "Update KPI" : "Create KPI"}</button>
        </div>
      </div>
    </div>
  );
}

const selectStyle = { width: "100%", background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 5, color: "var(--text)", fontFamily: "var(--font-b)", fontSize: 12, padding: "8px 10px" };

function Label({ children }) {
  return <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{children}</div>;
}

function Field({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <Label>{label}</Label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ width: "100%", background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 5, color: "var(--text)", fontFamily: "var(--font-b)", fontSize: 13, padding: "8px 10px" }} />
    </div>
  );
}
