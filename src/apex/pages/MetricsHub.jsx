// PAGE 2B — Metrics Tracking Hub: domain selector, then deep-dive
import { useState } from "react";
import Shell from "../components/Shell.jsx";
import { useStore } from "../data/store.js";
import MetricsDomain from "../metrics/MetricsDomain.jsx";

export default function MetricsHub({ programmeId, onNavHome, onNavLanding }) {
  const [domainId, setDomainId] = useState(null);
  const [state] = useStore();
  const p = state.programmes[programmeId];

  if (domainId) {
    return <MetricsDomain programmeId={programmeId} domainId={domainId} onBack={() => setDomainId(null)} onNavHome={onNavHome} onNavLanding={onNavLanding} />;
  }

  const order = p.metricDomainOrder || [];
  return (
    <Shell programmeId={programmeId} contextId="metrics-hub" contextLabel="Metrics Tracking domain selector" contextPayload={{ domains: order }} gapSection="metrics" onNavHome={onNavHome} onNavLanding={onNavLanding}>
      <div style={{ padding: "28px 24px", maxWidth: 1200, width: "100%", margin: "0 auto" }}>
        <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>Metrics Tracking</div>
        <div style={{ fontSize: 24, fontFamily: "var(--font-d)", fontWeight: 800, color: "var(--text)", marginBottom: 8, letterSpacing: "-0.01em" }}>Select a metrics domain</div>
        <div style={{ fontSize: 13, fontFamily: "var(--font-b)", color: "var(--text2)", marginBottom: 24 }}>Each domain applies the GP Value Algorithm (External Context → Value Proposition → Enablement → Performance) with domain-specific metrics.</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
          {order.map(id => {
            const dom = p.metricDomains[id];
            const totalTabs = Object.values(dom.panels || {}).reduce((s, panel) => s + panel.tabs.length, 0);
            const tracked = Object.values(dom.panels || {}).reduce((s, panel) => s + panel.tabs.filter(t => t.status === "tracked").length, 0);
            const pct = totalTabs ? Math.round((tracked / totalTabs) * 100) : 0;
            return (
              <button key={id} onClick={() => setDomainId(id)} style={{ padding: 22, background: "var(--bg2)", border: "1px solid var(--border)", borderTop: "3px solid var(--yellow)", borderRadius: 10, textAlign: "left", minHeight: 200, transition: "all 0.15s" }} onMouseEnter={e => { e.currentTarget.style.background = "var(--bg3)"; e.currentTarget.style.borderColor = "var(--accent)"; }} onMouseLeave={e => { e.currentTarget.style.background = "var(--bg2)"; e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.borderTopColor = "var(--yellow)"; }}>
                <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--yellow)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>{dom.tagline}</div>
                <div style={{ fontSize: 20, fontFamily: "var(--font-d)", fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>{dom.label}</div>
                <div style={{ fontSize: 13, fontFamily: "var(--font-b)", color: "var(--text2)", lineHeight: 1.6, marginBottom: 14 }}>{dom.description}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, height: 6, background: "var(--bg0)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, var(--green), var(--accent))", borderRadius: 3 }} />
                  </div>
                  <div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text2)" }}>{tracked}/{totalTabs} tracked</div>
                </div>
              </button>
            );
          })}
        </div>

        {order.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", background: "var(--bg2)", border: "1px dashed var(--border2)", borderRadius: 10 }}>
            <div style={{ fontSize: 15, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>No metric domains configured yet</div>
            <div style={{ fontSize: 13, fontFamily: "var(--font-b)", color: "var(--text2)" }}>Ask APEX in the chat to propose a set based on your programme context.</div>
          </div>
        )}
      </div>
    </Shell>
  );
}
