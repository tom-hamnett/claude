// Page shell: sticky header + content area + persistent AI chat
import AIChat from "./AIChat.jsx";
import { useStore } from "../data/store.js";
import { useState } from "react";
import Settings from "../settings/Settings.jsx";

export default function Shell({ programmeId, contextId, contextLabel, contextPayload, gapSection, children, onNavHome, onNavLanding }) {
  const [state] = useStore();
  const programme = programmeId ? state.programmes[programmeId] : null;
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg0)", color: "var(--text)", display: "flex", flexDirection: "column", paddingBottom: "34vh" }}>
      <div style={{ background: "var(--bg1)", borderBottom: "1px solid var(--border)", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, flexShrink: 0, position: "sticky", top: 0, zIndex: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={onNavLanding} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, background: "var(--accent)", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#000", fontFamily: "var(--font-d)" }}>◆</div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 15, fontFamily: "var(--font-d)", fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>APEX</div>
              <div style={{ fontSize: 10, fontFamily: "var(--font-m)", color: "var(--text3)", letterSpacing: "0.12em" }}>PROGRAMME INTELLIGENCE</div>
            </div>
          </button>
          {programme && (
            <>
              <div style={{ width: 1, height: 24, background: "var(--border)", margin: "0 4px" }} />
              <button onClick={onNavHome} style={{ textAlign: "left" }}>
                <div style={{ fontSize: 14, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)" }}>{programme.name}</div>
                <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--accent)", letterSpacing: "0.05em" }}>{programme.function}</div>
              </button>
            </>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text2)" }}>{state.user.name} <span style={{ color: "var(--text3)" }}>· {state.user.role}</span></div>
          <button onClick={() => setSettingsOpen(true)} style={{ fontSize: 18, padding: "6px 10px", borderRadius: 6, color: "var(--text2)", border: "1px solid var(--border2)" }}>⚙</button>
        </div>
      </div>

      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "visible" }}>{children}</main>

      {programmeId && <AIChat programmeId={programmeId} contextId={contextId} contextLabel={contextLabel || "programme"} contextPayload={contextPayload || {}} gapSection={gapSection} />}

      {settingsOpen && programmeId && <Settings programmeId={programmeId} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
