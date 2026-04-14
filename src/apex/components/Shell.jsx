// Page shell: sticky header + content area + persistent AI chat
import AIChat from "./AIChat.jsx";
import { useStore, setEngine } from "../data/store.js";
import { listEngines } from "../lib/ai.js";
import { useState } from "react";

export default function Shell({ programmeId, contextId, contextLabel, contextPayload, gapSection, children, onNavHome, onNavLanding }) {
  const [state] = useStore();
  const programme = programmeId ? state.programmes[programmeId] : null;
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg0)", color: "var(--text)", display: "flex", flexDirection: "column", paddingBottom: "34vh" }}>
      {/* Top bar */}
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

      {/* Main content */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "visible" }}>{children}</main>

      {/* Persistent AI chat */}
      {programmeId && <AIChat programmeId={programmeId} contextId={contextId} contextLabel={contextLabel || "programme"} contextPayload={contextPayload || {}} gapSection={gapSection} />}

      {/* Settings modal */}
      {settingsOpen && (
        <div onClick={() => setSettingsOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "min(480px,100%)", background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 12, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontFamily: "var(--font-d)", fontWeight: 800, color: "var(--text)" }}>Settings</div>
              <button onClick={() => setSettingsOpen(false)} style={{ fontSize: 18, color: "var(--text3)" }}>✕</button>
            </div>
            <div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>AI Engine</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {listEngines().map(e => (
                <button key={e.id} onClick={() => { setEngine(e.id); setSettingsOpen(false); }} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: 12, border: `1px solid ${state.settings.aiEngine === e.id ? e.color : "var(--border2)"}`, background: state.settings.aiEngine === e.id ? `${e.color}15` : "var(--bg3)", borderRadius: 8, textAlign: "left" }}>
                  <div style={{ width: 32, height: 32, background: e.color, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#000", fontFamily: "var(--font-d)", flexShrink: 0 }}>{e.badge}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)" }}>{e.label}</div>
                    <div style={{ fontSize: 11, fontFamily: "var(--font-b)", color: "var(--text2)", marginTop: 2 }}>{e.description}</div>
                  </div>
                  {state.settings.aiEngine === e.id && <span style={{ fontSize: 11, fontFamily: "var(--font-m)", color: e.color, fontWeight: 700 }}>ACTIVE</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
