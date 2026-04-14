// Panel 2 — Portfolio: Project Charters & Governance | Portfolio View (dual RAG)
import { useState } from "react";
import Shell from "../components/Shell.jsx";
import { TabBar, PageHeader, RagDual, Card, EmptyState } from "../components/ui.jsx";
import { useStore } from "../data/store.js";
import { RAG_DUAL } from "../lib/theme.js";

const TABS = [
  { id: "charters", label: "Project Charters & Governance" },
  { id: "portfolio", label: "Portfolio View" },
];

export default function PortfolioPanel({ programmeId, onBack, onNavHome, onNavLanding }) {
  const [tab, setTab] = useState("charters");
  const [selected, setSelected] = useState(null);
  const [state] = useStore();
  const p = state.programmes[programmeId];

  return (
    <Shell programmeId={programmeId} contextId={`portfolio/${tab}`} contextLabel={`Portfolio — ${TABS.find(t => t.id === tab)?.label}`} contextPayload={{ projects: p.projects?.length, selected }} gapSection="portfolio" onNavHome={onNavHome} onNavLanding={onNavLanding}>
      <PageHeader breadcrumb={[{ label: "Programme View", onClick: onBack }]} title="Portfolio" subtitle={`${(p.projects || []).length} projects across ${(p.mission?.pillars || []).length} pillars`} actions={<button onClick={onBack} style={{ fontSize: 12, fontFamily: "var(--font-d)", padding: "6px 14px", border: "1px solid var(--border2)", borderRadius: 6, color: "var(--text2)" }}>← Back</button>} />
      <div style={{ padding: "20px 24px", maxWidth: 1300, width: "100%", margin: "0 auto" }}>
        <TabBar tabs={TABS} active={tab} onChange={setTab} />
        {tab === "charters" && <ChartersView p={p} selected={selected} setSelected={setSelected} />}
        {tab === "portfolio" && <PortfolioView p={p} />}
      </div>
    </Shell>
  );
}

function ChartersView({ p, selected, setSelected }) {
  const current = selected ? (p.projects || []).find(x => x.id === selected) : null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 14 }}>
      {/* Project list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {(p.projects || []).map(pr => (
          <button key={pr.id} onClick={() => setSelected(pr.id)} style={{ padding: "10px 12px", background: selected === pr.id ? "var(--bg3)" : "var(--bg2)", border: `1px solid ${selected === pr.id ? "var(--accent)" : "var(--border)"}`, borderLeft: `3px solid ${pr.hasCharter ? "#5DC484" : "#E8734A"}`, borderRadius: 6, textAlign: "left" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
              <div style={{ fontSize: 13, fontFamily: "var(--font-d)", fontWeight: 600, color: "var(--text)" }}>{pr.name}</div>
              {!pr.hasCharter && <span style={{ fontSize: 9, fontFamily: "var(--font-m)", color: "#E8734A", background: "rgba(232,115,74,0.15)", padding: "1px 6px", borderRadius: 3 }}>⚠ GAP</span>}
            </div>
            <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)" }}>{pr.pillar}</div>
          </button>
        ))}
      </div>

      {/* Detail pane */}
      <div>
        {!current && (
          <EmptyState title="Select a project" description="Choose a project from the list to view its charter and governance details. Projects flagged with ⚠ GAP are missing a charter — use the AI chat to generate one." />
        )}
        {current && !current.hasCharter && (
          <Card color="#E8734A" style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "#E8734A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>⚠ Gap identified</div>
            <div style={{ fontSize: 14, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>No charter on file</div>
            <div style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text2)", lineHeight: 1.6 }}>Use the AI chat below to generate a charter template based on the metadata we have, or upload the source charter document.</div>
          </Card>
        )}
        {current && (
          <Card color="#4A9EFF">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid var(--border)" }}>
              <div>
                <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "#4A9EFF", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{current.pillar} · {current.stage}</div>
                <div style={{ fontSize: 20, fontFamily: "var(--font-d)", fontWeight: 800, color: "var(--text)" }}>{current.name}</div>
              </div>
              <RagDual timeline={current.ragTimeline} value={current.ragValue} />
            </div>
            <Field label="Owner" value={current.owner} />
            <Field label="Objective" value={current.objective} />
            <Field label="Scope" value={current.scope} />
            <Field label="Key Deliverables" value={<ul style={{ paddingLeft: 20, margin: 0 }}>{(current.deliverables || []).map((d, i) => <li key={i} style={{ fontSize: 13, fontFamily: "var(--font-b)", color: "var(--text)", lineHeight: 1.7 }}>{d}</li>)}</ul>} />
            <Field label="SteerCo" value={current.steerco} />
            <Field label="Dependencies" value={<ul style={{ paddingLeft: 20, margin: 0 }}>{(current.dependencies || []).map((d, i) => <li key={i} style={{ fontSize: 13, fontFamily: "var(--font-b)", color: "var(--text2)", lineHeight: 1.7 }}>{d}</li>)}</ul>} />
            <Field label="Status narrative" value={<em style={{ color: "var(--text2)" }}>{current.narrative}</em>} last />
          </Card>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, last }) {
  return (
    <div style={{ marginBottom: last ? 0 : 12 }}>
      <div style={{ fontSize: 10, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, fontFamily: "var(--font-b)", color: "var(--text)", lineHeight: 1.6 }}>{value || "—"}</div>
    </div>
  );
}

function PortfolioView({ p }) {
  return (
    <div>
      {/* Legend */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        {Object.entries(RAG_DUAL).map(([k, v]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text2)" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: v.color, display: "inline-block" }} />
            {v.label}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.9fr 1fr 2.5fr 1.2fr", padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "var(--bg3)", fontSize: 10, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            <div>Project</div>
            <div>Pillar</div>
            <div>RAG (Timeline / Value)</div>
            <div>Narrative</div>
            <div>Linked Metrics</div>
        </div>
        {(p.projects || []).map(pr => {
          const t = RAG_DUAL[pr.ragTimeline] || RAG_DUAL.grey;
          const v = RAG_DUAL[pr.ragValue] || RAG_DUAL.grey;
          return (
            <div key={pr.id} style={{ display: "grid", gridTemplateColumns: "1.3fr 0.9fr 1fr 2.5fr 1.2fr", padding: "14px", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)" }}>{pr.name}</div>
                <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", marginTop: 2 }}>{pr.owner}</div>
              </div>
              <div style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text2)" }}>{pr.pillar}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <span title={t.label} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontFamily: "var(--font-m)", color: t.color, background: t.bg, border: `1px solid ${t.color}40`, padding: "3px 8px", borderRadius: 3 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: t.color }} />T {t.label}</span>
                <span title={v.label} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontFamily: "var(--font-m)", color: v.color, background: v.bg, border: `1px solid ${v.color}40`, padding: "3px 8px", borderRadius: 3 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: v.color }} />V {v.label}</span>
              </div>
              <div style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text)", lineHeight: 1.5 }}>{pr.narrative}</div>
              <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)" }}>—</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
