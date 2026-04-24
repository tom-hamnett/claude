// Full-screen Settings page with tabs for Engines / Data Sources
import { useState } from "react";
import EnginesManager from "./EnginesManager.jsx";
import SourcesManager from "./SourcesManager.jsx";

const TABS = [
  { id: "engines", label: "🧠 AI Engines" },
  { id: "sources", label: "📁 Data Sources" },
];

export default function Settings({ programmeId, onClose }) {
  const [tab, setTab] = useState("engines");

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "min(900px, 100%)", height: "min(85vh, 800px)", background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", background: "var(--bg3)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 18, fontFamily: "var(--font-d)", fontWeight: 800, color: "var(--text)" }}>Settings</div>
            <div style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text2)", marginTop: 2 }}>Configure AI engines and data source connections</div>
          </div>
          <button onClick={onClose} style={{ fontSize: 18, color: "var(--text3)" }}>✕</button>
        </div>

        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 20px", flexShrink: 0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "14px 20px", fontSize: 13, fontFamily: "var(--font-d)", fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? "var(--text)" : "var(--text2)", borderBottom: tab === t.id ? "2px solid var(--accent)" : "2px solid transparent", background: tab === t.id ? "rgba(42,191,191,0.08)" : "none" }}>{t.label}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {tab === "engines" && <EnginesManager programmeId={programmeId} />}
          {tab === "sources" && <SourcesManager programmeId={programmeId} />}
        </div>
      </div>
    </div>
  );
}
