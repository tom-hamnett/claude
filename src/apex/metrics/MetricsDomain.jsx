// Generic metrics domain deep-dive: 4 panels × tabbed metrics
// Renders tracked data for specific tab ids via renderers.
import { useState } from "react";
import Shell from "../components/Shell.jsx";
import { PageHeader, MetricStatusPill, Card } from "../components/ui.jsx";
import { useStore } from "../data/store.js";
import MetricRenderer from "./MetricRenderer.jsx";

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

  return (
    <Shell programmeId={programmeId} contextId={`metrics/${domainId}/${panelId}/${tabId}`} contextLabel={`${dom.label} → ${panel.label} → ${tab.label}`} contextPayload={{ domain: dom.label, panel: panel.label, tab: tab.label, status: tab.status }} gapSection={`metrics/${domainId}/${panelId}`} onNavHome={onNavHome} onNavLanding={onNavLanding}>
      <PageHeader breadcrumb={[{ label: "Metrics Tracking", onClick: onBack }]} title={dom.label} subtitle={dom.description} actions={<button onClick={onBack} style={{ fontSize: 12, fontFamily: "var(--font-d)", padding: "6px 14px", border: "1px solid var(--border2)", borderRadius: 6, color: "var(--text2)" }}>← Back</button>} />
      <div style={{ padding: "18px 24px", maxWidth: 1400, width: "100%", margin: "0 auto" }}>
        {/* Panel selector (4 tiles) */}
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
      </div>
    </Shell>
  );
}
