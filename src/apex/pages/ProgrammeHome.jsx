// PAGE 1 — Programme Home: Mode selection (Programme View vs Metrics Tracking)
import Shell from "../components/Shell.jsx";
import { useStore, getGaps } from "../data/store.js";

export default function ProgrammeHome({ programmeId, onOpenMode, onNavLanding }) {
  const [state] = useStore();
  const p = state.programmes[programmeId];
  const gaps = getGaps(programmeId).filter(g => g.status === "active");

  return (
    <Shell programmeId={programmeId} contextId="home" contextLabel="programme home" contextPayload={{ programme: p.name, gapCount: gaps.length }} onNavHome={() => onOpenMode(null)} onNavLanding={onNavLanding}>
      <div style={{ padding: "40px 24px", maxWidth: 1100, width: "100%", margin: "0 auto" }}>
        <div style={{ marginBottom: 30 }}>
          <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 6 }}>{p.function}</div>
          <div style={{ fontSize: 32, fontFamily: "var(--font-d)", fontWeight: 800, color: "var(--text)", marginBottom: 8, letterSpacing: "-0.02em" }}>{p.name}</div>
          <div style={{ fontSize: 14, fontFamily: "var(--font-b)", color: "var(--text2)", lineHeight: 1.6, maxWidth: 760 }}>{p.description}</div>
        </div>

        {gaps.length > 0 && (
          <div style={{ padding: "12px 16px", background: "rgba(232,115,74,0.08)", border: "1px solid rgba(232,115,74,0.25)", borderRadius: 8, marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>⚠</span>
            <div>
              <div style={{ fontSize: 13, fontFamily: "var(--font-d)", fontWeight: 700, color: "#E8734A" }}>{gaps.length} identified gap{gaps.length !== 1 ? "s" : ""} across the programme</div>
              <div style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text2)", marginTop: 2 }}>Open a mode below and use the AI chat to review and resolve each.</div>
            </div>
          </div>
        )}

        <div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 }}>Choose a workspace</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <button onClick={() => onOpenMode("programme-view")} style={{ padding: 28, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, textAlign: "left", transition: "all 0.15s", minHeight: 260 }} onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.background = "var(--bg3)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg2)"; }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 22, fontFamily: "var(--font-d)", fontWeight: 800, color: "var(--text)", marginBottom: 8, letterSpacing: "-0.01em" }}>Programme View</div>
            <div style={{ fontSize: 13, fontFamily: "var(--font-b)", color: "var(--text2)", lineHeight: 1.6, marginBottom: 14 }}>Delivery tracking, project charters, governance, plans, risks and audit.</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["Overview", "Portfolio", "Plan", "Risks & Compliance"].map(l => (
                <span key={l} style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--accent)", background: "rgba(42,191,191,0.1)", border: "1px solid rgba(42,191,191,0.3)", padding: "3px 10px", borderRadius: 12 }}>{l}</span>
              ))}
            </div>
          </button>

          <button onClick={() => onOpenMode("metrics")} style={{ padding: 28, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, textAlign: "left", transition: "all 0.15s", minHeight: 260 }} onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.background = "var(--bg3)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg2)"; }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 22, fontFamily: "var(--font-d)", fontWeight: 800, color: "var(--text)", marginBottom: 8, letterSpacing: "-0.01em" }}>Metrics Tracking</div>
            <div style={{ fontSize: 13, fontFamily: "var(--font-b)", color: "var(--text2)", lineHeight: 1.6, marginBottom: 14 }}>Performance and value measurement across configured metric domains.</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {p.metricDomainOrder?.map(id => (
                <span key={id} style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--yellow)", background: "rgba(245,197,68,0.1)", border: "1px solid rgba(245,197,68,0.3)", padding: "3px 10px", borderRadius: 12 }}>{p.metricDomains[id]?.label}</span>
              ))}
            </div>
          </button>
        </div>
      </div>
    </Shell>
  );
}
