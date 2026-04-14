// PAGE 2A — Programme View Hub: 4 large panel tiles
import { useState } from "react";
import Shell from "../components/Shell.jsx";
import { useStore, gapsForSection } from "../data/store.js";
import OverviewPanel from "../panels/OverviewPanel.jsx";
import PortfolioPanel from "../panels/PortfolioPanel.jsx";
import PlanPanel from "../panels/PlanPanel.jsx";
import RisksPanel from "../panels/RisksPanel.jsx";

const PANELS = [
  { id: "overview",  title: "Overview",            icon: "📄", color: "#2ABFBF", desc: "Mission, exec summary, programme updates.", section: "overview" },
  { id: "portfolio", title: "Portfolio",           icon: "📁", color: "#4A9EFF", desc: "Project charters, governance, and portfolio RAG view.", section: "portfolio" },
  { id: "plan",      title: "Plan",                icon: "📐", color: "#F5C544", desc: "Timeline, milestones, dependencies.", section: "plan" },
  { id: "risks",     title: "Risks & Compliance", icon: "⚠",  color: "#E8734A", desc: "Risk register, risk profile, audit dashboard.", section: "risks" },
];

export default function ProgrammeView({ programmeId, onNavHome, onNavLanding }) {
  const [panelId, setPanelId] = useState(null);
  const [state] = useStore();
  const p = state.programmes[programmeId];

  if (panelId) {
    const common = { programmeId, onBack: () => setPanelId(null), onNavHome, onNavLanding };
    if (panelId === "overview") return <OverviewPanel {...common} />;
    if (panelId === "portfolio") return <PortfolioPanel {...common} />;
    if (panelId === "plan") return <PlanPanel {...common} />;
    if (panelId === "risks") return <RisksPanel {...common} />;
  }

  return (
    <Shell programmeId={programmeId} contextId="programme-view" contextLabel="Programme View hub" contextPayload={{ projects: p.projects?.length, risks: p.risks?.length }} onNavHome={onNavHome} onNavLanding={onNavLanding}>
      <div style={{ padding: "28px 24px", maxWidth: 1200, width: "100%", margin: "0 auto" }}>
        <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>Programme View</div>
        <div style={{ fontSize: 24, fontFamily: "var(--font-d)", fontWeight: 800, color: "var(--text)", marginBottom: 24, letterSpacing: "-0.01em" }}>Delivery, governance & risk</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
          {PANELS.map(panel => {
            const panelGaps = gapsForSection(programmeId, panel.section);
            return (
              <button key={panel.id} onClick={() => setPanelId(panel.id)} style={{ padding: 22, background: "var(--bg2)", border: "1px solid var(--border)", borderTop: `3px solid ${panel.color}`, borderRadius: 10, textAlign: "left", transition: "all 0.15s", minHeight: 170 }} onMouseEnter={e => { e.currentTarget.style.background = "var(--bg3)"; e.currentTarget.style.borderColor = panel.color; }} onMouseLeave={e => { e.currentTarget.style.background = "var(--bg2)"; e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.borderTopColor = panel.color; }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ fontSize: 30 }}>{panel.icon}</div>
                  {panelGaps.length > 0 && (
                    <span style={{ fontSize: 10, fontFamily: "var(--font-m)", color: "#E8734A", background: "rgba(232,115,74,0.12)", border: "1px solid rgba(232,115,74,0.3)", padding: "3px 8px", borderRadius: 10 }}>⚠ {panelGaps.length} gap{panelGaps.length !== 1 ? "s" : ""}</span>
                  )}
                </div>
                <div style={{ fontSize: 18, fontFamily: "var(--font-d)", fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>{panel.title}</div>
                <div style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text2)", lineHeight: 1.55 }}>{panel.desc}</div>
              </button>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}
