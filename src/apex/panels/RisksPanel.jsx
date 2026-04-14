// Panel 4 — Risks & Compliance: Register | Risk Profile | Compliance Dashboard
import { useState } from "react";
import Shell from "../components/Shell.jsx";
import { TabBar, PageHeader, Card } from "../components/ui.jsx";
import { useStore } from "../data/store.js";
import { RISK_DOMAINS } from "../lib/theme.js";
import { riskScore, riskBand, fmt } from "../lib/utils.js";

const TABS = [
  { id: "register", label: "Risk Register" },
  { id: "profile", label: "Risk Profile" },
  { id: "audit", label: "Compliance & Audit" },
];

export default function RisksPanel({ programmeId, onBack, onNavHome, onNavLanding }) {
  const [tab, setTab] = useState("register");
  const [state] = useStore();
  const p = state.programmes[programmeId];

  return (
    <Shell programmeId={programmeId} contextId={`risks/${tab}`} contextLabel={`Risks — ${TABS.find(t => t.id === tab)?.label}`} contextPayload={{ risks: p.risks?.length, audits: p.auditActions?.length }} gapSection="risks" onNavHome={onNavHome} onNavLanding={onNavLanding}>
      <PageHeader breadcrumb={[{ label: "Programme View", onClick: onBack }]} title="Risks & Compliance" subtitle={`${p.riskAggregate?.thisMonth?.total || p.risks?.length} total risks · ${(p.auditActions || []).filter(a => a.status === "Open").length} open audit actions`} actions={<button onClick={onBack} style={{ fontSize: 12, fontFamily: "var(--font-d)", padding: "6px 14px", border: "1px solid var(--border2)", borderRadius: 6, color: "var(--text2)" }}>← Back</button>} />
      <div style={{ padding: "20px 24px", maxWidth: 1400, width: "100%", margin: "0 auto" }}>
        <TabBar tabs={TABS} active={tab} onChange={setTab} />
        {tab === "register" && <RegisterView p={p} />}
        {tab === "profile" && <ProfileView p={p} />}
        {tab === "audit" && <AuditView p={p} />}
      </div>
    </Shell>
  );
}

function RegisterView({ p }) {
  const risks = (p.risks || []).slice().sort((a, b) => riskScore(b.probability, b.impact) - riskScore(a.probability, a.impact));
  const projectMap = Object.fromEntries((p.projects || []).map(pr => [pr.id, pr.name]));

  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "50px 2fr 1fr 1fr 100px 1.2fr 90px", padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "var(--bg3)", fontSize: 10, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        <div>ID</div><div>Title</div><div>Project</div><div>Domain</div><div>Score</div><div>Owner / Mitigation</div><div>Updated</div>
      </div>
      {risks.map(r => {
        const score = riskScore(r.probability, r.impact);
        const band = riskBand(score);
        const domain = RISK_DOMAINS[r.domain] || { label: r.domain, color: "#6B8FA3" };
        return (
          <div key={r.id} style={{ display: "grid", gridTemplateColumns: "50px 2fr 1fr 1fr 100px 1.2fr 90px", padding: "12px 14px", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
            <div style={{ fontSize: 10, fontFamily: "var(--font-m)", color: "var(--text3)" }}>{r.id.replace("r-", "")}</div>
            <div>
              <div style={{ fontSize: 13, fontFamily: "var(--font-d)", fontWeight: 600, color: "var(--text)" }}>{r.title}</div>
              <div style={{ fontSize: 11, fontFamily: "var(--font-b)", color: "var(--text2)", marginTop: 3, lineHeight: 1.5 }}>{r.description}</div>
            </div>
            <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text2)" }}>{projectMap[r.projectId] || r.projectId}</div>
            <div><span style={{ fontSize: 10, fontFamily: "var(--font-m)", color: domain.color, background: `${domain.color}20`, padding: "3px 8px", borderRadius: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>{domain.label}</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)" }}>P{r.probability}×I{r.impact}</div>
              <div style={{ fontSize: 14, fontFamily: "var(--font-d)", fontWeight: 800, color: band.color }}>{score}</div>
              <div style={{ fontSize: 10, fontFamily: "var(--font-m)", color: band.color, textTransform: "uppercase" }}>{band.label}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--blue)", marginBottom: 3 }}>{r.owner}</div>
              <div style={{ fontSize: 11, fontFamily: "var(--font-b)", color: "var(--text2)", lineHeight: 1.5 }}>{r.mitigation}</div>
            </div>
            <div style={{ fontSize: 10, fontFamily: "var(--font-m)", color: "var(--text3)" }}>{fmt(r.lastUpdated)}</div>
          </div>
        );
      })}
    </div>
  );
}

function ProfileView({ p }) {
  const agg = p.riskAggregate || { thisMonth: { total: 0, score: 0, high: 0, medium: 0, low: 0 }, lastMonth: { total: 0, score: 0, high: 0, medium: 0, low: 0 }, byTheme: [] };
  const countDelta = agg.thisMonth.total - agg.lastMonth.total;
  const scoreDelta = agg.thisMonth.score - agg.lastMonth.score;
  const countDeltaPct = agg.lastMonth.total ? Math.round((countDelta / agg.lastMonth.total) * 100) : 0;
  const scoreDeltaPct = agg.lastMonth.score ? Math.round((scoreDelta / agg.lastMonth.score) * 100) : 0;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        <Card color="#E8734A">
          <div style={{ fontSize: 10, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>High</div>
          <div style={{ fontSize: 28, fontFamily: "var(--font-d)", fontWeight: 800, color: "#E8734A" }}>{agg.thisMonth.high}</div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: agg.thisMonth.high <= agg.lastMonth.high ? "#5DC484" : "#E8734A", marginTop: 3 }}>{agg.thisMonth.high - agg.lastMonth.high >= 0 ? "+" : ""}{agg.thisMonth.high - agg.lastMonth.high} MoM</div>
        </Card>
        <Card color="#F5C544">
          <div style={{ fontSize: 10, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Medium</div>
          <div style={{ fontSize: 28, fontFamily: "var(--font-d)", fontWeight: 800, color: "#F5C544" }}>{agg.thisMonth.medium}</div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", marginTop: 3 }}>{agg.thisMonth.medium - agg.lastMonth.medium >= 0 ? "+" : ""}{agg.thisMonth.medium - agg.lastMonth.medium} MoM</div>
        </Card>
        <Card color="#5DC484">
          <div style={{ fontSize: 10, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Low</div>
          <div style={{ fontSize: 28, fontFamily: "var(--font-d)", fontWeight: 800, color: "#5DC484" }}>{agg.thisMonth.low}</div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", marginTop: 3 }}>{agg.thisMonth.low - agg.lastMonth.low >= 0 ? "+" : ""}{agg.thisMonth.low - agg.lastMonth.low} MoM</div>
        </Card>
        <Card color="#A78BFA">
          <div style={{ fontSize: 10, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Cumulative Score</div>
          <div style={{ fontSize: 28, fontFamily: "var(--font-d)", fontWeight: 800, color: "#A78BFA" }}>{agg.thisMonth.score}</div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: scoreDelta >= 0 ? "#E8734A" : "#5DC484", marginTop: 3 }}>{scoreDelta >= 0 ? "+" : ""}{scoreDeltaPct}% MoM</div>
        </Card>
      </div>

      <Card color="#4A9EFF">
        <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "#4A9EFF", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Score by Theme</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(agg.byTheme || []).map((t, i) => (
            <div key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text)" }}>{t.theme}</div>
                <div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text2)" }}>{Math.round(t.scoreShare * 100)}%</div>
              </div>
              <div style={{ height: 8, background: "var(--bg0)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${t.scoreShare * 100}%`, height: "100%", background: `linear-gradient(90deg, var(--orange), var(--yellow))`, borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ marginTop: 16, padding: 14, background: "rgba(42,191,191,0.08)", border: "1px solid rgba(42,191,191,0.25)", borderRadius: 8 }}>
        <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>◆ Trend narrative</div>
        <div style={{ fontSize: 13, fontFamily: "var(--font-b)", color: "var(--text)", lineHeight: 1.65 }}>
          Total risk count {countDelta >= 0 ? "up" : "down"} <strong>{Math.abs(countDeltaPct)}%</strong> MoM ({agg.lastMonth.total} → {agg.thisMonth.total}), cumulative score {scoreDelta >= 0 ? "up" : "down"} <strong>{Math.abs(scoreDeltaPct)}%</strong> ({agg.lastMonth.score} → {agg.thisMonth.score}). High-band count {agg.lastMonth.high} → {agg.thisMonth.high}. Process/Operational remains dominant at {Math.round((agg.byTheme?.[0]?.scoreShare || 0) * 100)}% of score.
        </div>
      </div>
    </div>
  );
}

function AuditView({ p }) {
  const [filter, setFilter] = useState("open-near");
  const actions = p.auditActions || [];

  const near = actions.filter(a => a.status === "Open" && new Date(a.deadline) - new Date() <= 90 * 86400000);
  const far = actions.filter(a => a.status === "Open" && new Date(a.deadline) - new Date() > 90 * 86400000);
  const closed = actions.filter(a => a.status === "Closed");

  const shown = filter === "open-near" ? near : filter === "open-far" ? far : closed;
  const ragColor = { "dark-green": "#2E9E5F", "light-green": "#5DC484", "amber": "#F5C544", "amber-red": "#E89E4A", "red": "#E8734A", "grey": "#6B8FA3" };

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <button onClick={() => setFilter("open-near")} style={btn(filter === "open-near", "#E8734A")}>Open &lt;90d ({near.length})</button>
        <button onClick={() => setFilter("open-far")} style={btn(filter === "open-far", "#F5C544")}>Open &gt;90d ({far.length})</button>
        <button onClick={() => setFilter("closed")} style={btn(filter === "closed", "#5DC484")}>Closed ({closed.length})</button>
      </div>
      <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "0.8fr 2fr 1fr 0.8fr 1fr 0.9fr", padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "var(--bg3)", fontSize: 10, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          <div>Audit</div><div>Finding / Action</div><div>Owner</div><div>Rating</div><div>Deadline</div><div>Delivery RAG</div>
        </div>
        {shown.map(a => (
          <div key={a.id} style={{ display: "grid", gridTemplateColumns: "0.8fr 2fr 1fr 0.8fr 1fr 0.9fr", padding: "12px 14px", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text2)" }}>{a.audit}</div>
            <div>
              <div style={{ fontSize: 13, fontFamily: "var(--font-d)", fontWeight: 600, color: "var(--text)", marginBottom: 3 }}>{a.finding}</div>
              <div style={{ fontSize: 11, fontFamily: "var(--font-b)", color: "var(--text2)", lineHeight: 1.5 }}>{a.action}</div>
              {a.nextSteps && <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", marginTop: 4 }}>Next: {a.nextSteps}</div>}
            </div>
            <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--blue)" }}>{a.owner}</div>
            <div><span style={{ fontSize: 10, fontFamily: "var(--font-m)", padding: "2px 8px", borderRadius: 3, color: a.rating === "High" ? "#E8734A" : a.rating === "Medium" ? "#F5C544" : "#5DC484", background: a.rating === "High" ? "rgba(232,115,74,0.15)" : a.rating === "Medium" ? "rgba(245,197,68,0.15)" : "rgba(93,196,132,0.15)", textTransform: "uppercase" }}>{a.rating}</span></div>
            <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text2)" }}>{fmt(a.deadline)}</div>
            <div><span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontFamily: "var(--font-m)", color: ragColor[a.deliveryRag], background: `${ragColor[a.deliveryRag]}15`, border: `1px solid ${ragColor[a.deliveryRag]}40`, padding: "2px 8px", borderRadius: 3 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: ragColor[a.deliveryRag] }} />{a.deliveryRag}</span></div>
          </div>
        ))}
        {shown.length === 0 && <div style={{ padding: 30, textAlign: "center", fontSize: 13, fontFamily: "var(--font-b)", color: "var(--text3)" }}>No items in this view.</div>}
      </div>
    </div>
  );
}

function btn(active, color) {
  return { fontSize: 12, fontFamily: "var(--font-d)", fontWeight: active ? 700 : 500, padding: "8px 14px", borderRadius: 6, background: active ? color : "var(--bg3)", color: active ? "#000" : "var(--text2)", border: `1px solid ${active ? color : "var(--border2)"}` };
}
