// PAGE 0 — Landing: list of accessible programmes. No AI chat. Minimal.
import { useStore } from "../data/store.js";

export default function Landing({ onOpenProgramme }) {
  const [state] = useStore();
  const programmes = state.programmeOrder.map(id => state.programmes[id]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg0)", display: "flex", flexDirection: "column" }}>
      {/* Minimal top bar */}
      <div style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 30, height: 30, background: "var(--accent)", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: "#000", fontFamily: "var(--font-d)" }}>◆</div>
          <div>
            <div style={{ fontSize: 18, fontFamily: "var(--font-d)", fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>APEX</div>
            <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", letterSpacing: "0.12em" }}>PROGRAMME INTELLIGENCE</div>
          </div>
        </div>
        <div style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text2)" }}>
          {state.user.name} <span style={{ color: "var(--text3)" }}>· {state.user.role}</span>
        </div>
      </div>

      {/* Programme list */}
      <div style={{ flex: 1, padding: "40px 24px", maxWidth: 1000, width: "100%", margin: "0 auto" }}>
        <div style={{ fontSize: 24, fontFamily: "var(--font-d)", fontWeight: 800, color: "var(--text)", marginBottom: 4, letterSpacing: "-0.01em" }}>Your programmes</div>
        <div style={{ fontSize: 13, fontFamily: "var(--font-b)", color: "var(--text2)", marginBottom: 24 }}>Select a programme to open its workspace. Access is granted by your administrator.</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {programmes.map(p => (
            <button key={p.id} onClick={() => onOpenProgramme(p.id)} style={{ display: "grid", gridTemplateColumns: "1fr 180px 100px", gap: 16, alignItems: "center", padding: "18px 20px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, textAlign: "left", transition: "all 0.15s" }} onMouseEnter={e => { e.currentTarget.style.background = "var(--bg3)"; e.currentTarget.style.borderColor = "var(--accent)"; }} onMouseLeave={e => { e.currentTarget.style.background = "var(--bg2)"; e.currentTarget.style.borderColor = "var(--border)"; }}>
              <div>
                <div style={{ fontSize: 16, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{p.name}</div>
                <div style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text2)", lineHeight: 1.5 }}>{p.description}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Function</div>
                <div style={{ fontSize: 13, fontFamily: "var(--font-d)", color: "var(--accent)", marginTop: 2 }}>{p.function}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Access</div>
                <div style={{ fontSize: 13, fontFamily: "var(--font-d)", color: "var(--text)", marginTop: 2 }}>{p.accessLevel}</div>
              </div>
            </button>
          ))}
        </div>

        {programmes.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", background: "var(--bg2)", border: "1px dashed var(--border2)", borderRadius: 10 }}>
            <div style={{ fontSize: 14, color: "var(--text3)" }}>No programmes yet. Contact your administrator for access.</div>
          </div>
        )}
      </div>
    </div>
  );
}
