// Metrics domain deep-dive: Priority KPIs strip + 4 panels × tabs + Source Data
import { useState, useEffect } from "react";
import Shell from "../components/Shell.jsx";
import { PageHeader, MetricStatusPill, Card, Spinner } from "../components/ui.jsx";
import { useStore } from "../data/store.js";
import MetricRenderer from "./MetricRenderer.jsx";
import DataExplorer from "./DataExplorer.jsx";
import KPIDefiner from "./KPIDefiner.jsx";
import SourceTables from "./SourceTables.jsx";

const PANEL_META = {
  external:    { icon: "🌐", color: "#A78BFA" },
  value:       { icon: "💎", color: "#F5C544" },
  enablement:  { icon: "⚙",  color: "#4A9EFF" },
  performance: { icon: "🎯", color: "#5DC484" },
};

export default function MetricsDomain({ programmeId, domainId, onBack, onNavHome, onNavLanding }) {
  const [state] = useStore();
  const p = state.programmes[programmeId];
  const dom = p.metricDomains[domainId];
  const panelIds = Object.keys(dom.panels);
  const [panelId, setPanelId] = useState(panelIds[0]);
  const panel = dom.panels[panelId];
  const [tabId, setTabId] = useState(panel.tabs[0].id);
  const tab = panel.tabs.find(t => t.id === tabId) || panel.tabs[0];

  // View mode: "panels" (default 4-panel view), "kpi" (DataExplorer for a KPI), "data" (source tables)
  const [viewMode, setViewMode] = useState("panels");
  const [selectedKpi, setSelectedKpi] = useState(null);
  const [showKpiDefiner, setShowKpiDefiner] = useState(false);

  // KPIs and data tables from API
  const [kpis, setKpis] = useState([]);
  const [tables, setTables] = useState([]);
  const [kpiData, setKpiData] = useState(null);
  const [kpiLoading, setKpiLoading] = useState(false);

  useEffect(() => { loadKpis(); loadTables(); }, [programmeId, domainId]);

  async function loadKpis() {
    try {
      const r = await fetch(`/api/programmes/${programmeId}/kpis?domain=${domainId}`);
      setKpis(await r.json());
    } catch (e) { /* server may not be running in dev */ }
  }

  async function loadTables() {
    try {
      const r = await fetch(`/api/programmes/${programmeId}/data-tables`);
      setTables(await r.json());
    } catch (e) { /* server may not be running in dev */ }
  }

  async function openKpi(kpi) {
    setSelectedKpi(kpi);
    setViewMode("kpi");
    if (kpi.source_table_id) {
      setKpiLoading(true);
      try {
        const [metaR, dataR] = await Promise.all([
          fetch(`/api/data-tables/${kpi.source_table_id}`),
          fetch(`/api/data-tables/${kpi.source_table_id}/rows?limit=5000`),
        ]);
        const meta = await metaR.json();
        const data = await dataR.json();
        setKpiData({ columns: meta.columns || JSON.parse(meta.columns_meta || "[]"), rows: data });
      } catch (e) { setKpiData(null); }
      setKpiLoading(false);
    }
  }

  const headlineKpis = kpis.filter(k => k.isHeadline);

  return (
    <Shell programmeId={programmeId} contextId={`metrics/${domainId}/${panelId}/${tabId}`} contextLabel={`${dom.label} → ${panel.label} → ${tab.label}`} contextPayload={{ domain: dom.label, panel: panel.label, tab: tab.label, status: tab.status }} gapSection={`metrics/${domainId}/${panelId}`} onNavHome={onNavHome} onNavLanding={onNavLanding}>
      <PageHeader breadcrumb={[{ label: "Metrics Tracking", onClick: onBack }]} title={dom.label} subtitle={dom.description} actions={
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowKpiDefiner(true)} style={{ fontSize: 12, fontFamily: "var(--font-d)", fontWeight: 600, padding: "6px 14px", border: "1px solid var(--accent)", borderRadius: 6, color: "var(--accent)" }}>+ Define KPI</button>
          <button onClick={onBack} style={{ fontSize: 12, fontFamily: "var(--font-d)", padding: "6px 14px", border: "1px solid var(--border2)", borderRadius: 6, color: "var(--text2)" }}>← Back</button>
        </div>
      } />

      <div style={{ padding: "18px 24px", maxWidth: 1400, width: "100%", margin: "0 auto" }}>

        {/* Priority KPIs strip */}
        {headlineKpis.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>◆ Priority KPIs</div>
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
              {headlineKpis.map(kpi => (
                <button key={kpi.id} onClick={() => openKpi(kpi)} style={{ minWidth: 200, padding: "12px 16px", background: selectedKpi?.id === kpi.id ? "var(--bg3)" : "var(--bg2)", border: `1px solid ${selectedKpi?.id === kpi.id ? "var(--accent)" : "var(--border)"}`, borderTop: "3px solid var(--accent)", borderRadius: 8, textAlign: "left", flexShrink: 0, transition: "all 0.15s" }}>
                  <div style={{ fontSize: 13, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{kpi.name}</div>
                  {kpi.target && <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)" }}>Target: {kpi.target}{kpi.unit}</div>}
                  <div style={{ fontSize: 10, fontFamily: "var(--font-m)", color: "var(--text3)", marginTop: 4 }}>{kpi.chart_type} · {kpi.aggregation}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* View mode tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 14, borderBottom: "1px solid var(--border)" }}>
          <button onClick={() => { setViewMode("panels"); setSelectedKpi(null); }} style={modeBtn(viewMode === "panels")}>📊 Metrics Panels</button>
          {selectedKpi && <button onClick={() => setViewMode("kpi")} style={modeBtn(viewMode === "kpi")}>🎯 {selectedKpi.name}</button>}
          <button onClick={() => setViewMode("data")} style={modeBtn(viewMode === "data")}>📄 Source Data ({tables.length})</button>
        </div>

        {/* KPI DataExplorer view */}
        {viewMode === "kpi" && selectedKpi && (
          <div>
            <div style={{ fontSize: 18, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>{selectedKpi.name}</div>
            {selectedKpi.description && <div style={{ fontSize: 13, fontFamily: "var(--font-b)", color: "var(--text2)", marginBottom: 14 }}>{selectedKpi.description}</div>}
            {kpiLoading && <div style={{ padding: 40, textAlign: "center" }}><Spinner /><div style={{ fontSize: 12, color: "var(--text3)", marginTop: 8 }}>Loading data…</div></div>}
            {kpiData && !kpiLoading && (
              <DataExplorer kpi={selectedKpi} data={kpiData.rows} columns={kpiData.columns} title={selectedKpi.name} />
            )}
            {!selectedKpi.source_table_id && !kpiLoading && (
              <Card color="#F5C544">
                <div style={{ fontSize: 13, fontFamily: "var(--font-b)", color: "var(--text)", lineHeight: 1.6 }}>This KPI has no source data table linked. Upload a file in the Source Data section, then edit this KPI to connect it.</div>
              </Card>
            )}
          </div>
        )}

        {/* Source Data Tables view */}
        {viewMode === "data" && (
          <SourceTables programmeId={programmeId} tables={tables} onRefresh={loadTables} />
        )}

        {/* Default: 4-panel metrics view (existing) */}
        {viewMode === "panels" && (
          <>
            {/* Panel selector */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 18 }}>
              {panelIds.map(pid => {
                const pn = dom.panels[pid];
                const meta = PANEL_META[pid] || { icon: "◆", color: "#2ABFBF" };
                const trackedCount = pn.tabs.filter(t => t.status === "tracked").length;
                return (
                  <button key={pid} onClick={() => { setPanelId(pid); setTabId(pn.tabs[0].id); }} style={{ padding: "14px 16px", background: panelId === pid ? "var(--bg3)" : "var(--bg2)", border: `1px solid ${panelId === pid ? meta.color : "var(--border)"}`, borderTop: `3px solid ${meta.color}`, borderRadius: 8, textAlign: "left", transition: "all 0.15s" }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{meta.icon}</div>
                    <div style={{ fontSize: 10, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>{pn.question}</div>
                    <div style={{ fontSize: 14, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>{pn.label}</div>
                    <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text2)" }}>{trackedCount}/{pn.tabs.length} tracked</div>
                  </button>
                );
              })}
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 14, borderBottom: "1px solid var(--border)", overflowX: "auto" }}>
              {panel.tabs.map(t => (
                <button key={t.id} onClick={() => setTabId(t.id)} style={{ padding: "10px 14px", fontSize: 12, fontFamily: "var(--font-d)", fontWeight: tabId === t.id ? 700 : 500, color: tabId === t.id ? "var(--text)" : "var(--text2)", borderBottom: tabId === t.id ? "2px solid var(--accent)" : "2px solid transparent", background: tabId === t.id ? "rgba(42,191,191,0.08)" : "none", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
                  {t.label}
                  <MetricStatusPill status={t.status} />
                </button>
              ))}
            </div>

            {/* Tab content */}
            <Card color={PANEL_META[panelId]?.color || "#2ABFBF"}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
                <div>
                  <div style={{ fontSize: 17, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{tab.label}</div>
                  <div style={{ fontSize: 13, fontFamily: "var(--font-b)", color: "var(--text2)", lineHeight: 1.6, maxWidth: 800 }}>{tab.description}</div>
                </div>
                <MetricStatusPill status={tab.status} />
              </div>
              <MetricRenderer domainId={domainId} panelId={panelId} tab={tab} />
            </Card>
          </>
        )}
      </div>

      {/* KPI Definer modal */}
      {showKpiDefiner && (
        <KPIDefiner programmeId={programmeId} tables={tables} onSave={() => { loadKpis(); setShowKpiDefiner(false); }} onClose={() => setShowKpiDefiner(false)} />
      )}
    </Shell>
  );
}

function modeBtn(active) {
  return { padding: "10px 16px", fontSize: 12, fontFamily: "var(--font-d)", fontWeight: active ? 700 : 500, color: active ? "var(--text)" : "var(--text2)", borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent", background: active ? "rgba(42,191,191,0.08)" : "none", whiteSpace: "nowrap" };
}
