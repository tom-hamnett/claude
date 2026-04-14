// Panel 1 — Overview: Mission & Objectives | Executive Summary | Generated Updates
import { useState } from "react";
import Shell from "../components/Shell.jsx";
import { TabBar, Card, PageHeader } from "../components/ui.jsx";
import { useStore, setExecutiveSummary, addUpdate } from "../data/store.js";
import { aiCall, stripJson } from "../lib/ai.js";
import { fmtL } from "../lib/utils.js";
import { Spinner } from "../components/ui.jsx";

const TABS = [
  { id: "mission", label: "Mission & Objectives" },
  { id: "summary", label: "Executive Summary" },
  { id: "updates", label: "Generated Updates" },
];

export default function OverviewPanel({ programmeId, onBack, onNavHome, onNavLanding }) {
  const [tab, setTab] = useState("mission");
  const [state] = useStore();
  const p = state.programmes[programmeId];
  const [loading, setLoading] = useState(false);

  const contextLabel = `Overview panel — ${TABS.find(t => t.id === tab)?.label}`;
  const contextPayload = { programme: p.name, currentTab: tab };

  return (
    <Shell programmeId={programmeId} contextId={`overview/${tab}`} contextLabel={contextLabel} contextPayload={contextPayload} gapSection="overview" onNavHome={onNavHome} onNavLanding={onNavLanding}>
      <PageHeader breadcrumb={[{ label: "Programme View", onClick: onBack }]} title="Overview" subtitle="Mission, exec summary, and programme updates" actions={<button onClick={onBack} style={{ fontSize: 12, fontFamily: "var(--font-d)", padding: "6px 14px", border: "1px solid var(--border2)", borderRadius: 6, color: "var(--text2)" }}>← Back</button>} />
      <div style={{ padding: "20px 24px", maxWidth: 1100, width: "100%", margin: "0 auto" }}>
        <TabBar tabs={TABS} active={tab} onChange={setTab} />

        {tab === "mission" && <MissionView p={p} />}
        {tab === "summary" && <SummaryView programmeId={programmeId} p={p} engineId={state.settings.aiEngine} loading={loading} setLoading={setLoading} />}
        {tab === "updates" && <UpdatesView programmeId={programmeId} p={p} engineId={state.settings.aiEngine} />}
      </div>
    </Shell>
  );
}

function MissionView({ p }) {
  const m = p.mission || {};
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <Card color="#2ABFBF">
        <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>GP Mission</div>
        <div style={{ fontSize: 15, fontFamily: "var(--font-d)", fontWeight: 600, color: "var(--text)", lineHeight: 1.5 }}>{m.gpMission || "—"}</div>
      </Card>
      <Card color="#4A9EFF">
        <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "#4A9EFF", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>PE Remit</div>
        <div style={{ fontSize: 13, fontFamily: "var(--font-b)", color: "var(--text)", lineHeight: 1.6 }}>{m.peRemit || "—"}</div>
      </Card>
      <Card color="#F5C544" style={{ gridColumn: "1 / -1" }}>
        <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "#F5C544", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>2026 Priorities</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {(m.priorities2026 || []).map((pr, i) => (
            <span key={i} style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text)", background: "var(--bg3)", border: "1px solid var(--border)", padding: "6px 12px", borderRadius: 16 }}>{pr}</span>
          ))}
        </div>
      </Card>
      <Card color="#5DC484">
        <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "#5DC484", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Value Proposition</div>
        <div style={{ fontSize: 17, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)", fontStyle: "italic" }}>"{m.valueProposition}"</div>
      </Card>
      <Card color="#A78BFA">
        <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "#A78BFA", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Delivery Pillars</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {(m.pillars || []).map((pl, i) => (
            <span key={i} style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "#A78BFA", background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.3)", padding: "3px 10px", borderRadius: 4 }}>{pl}</span>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SummaryView({ programmeId, p, engineId, loading, setLoading }) {
  const summary = p.executiveSummary || {};
  const [body, setBody] = useState(summary.body || "");
  const [editing, setEditing] = useState(false);

  async function generate() {
    setLoading(true);
    const sys = `You are a senior PMO writing an executive summary for programme "${p.name}". Produce a concise, authoritative narrative (250-400 words) covering: overall RAG, 3-5 key achievements, 3-5 priorities, top 3 risks, and 1-2 asks of leadership. Use UK English. No fluff.`;
    const prompt = `Programme context:
Mission: ${p.mission?.gpMission}
Remit: ${p.mission?.peRemit}
Priorities 2026: ${(p.mission?.priorities2026 || []).join(", ")}

Projects (${p.projects?.length || 0}):
${(p.projects || []).map(pr => `- ${pr.name} (${pr.pillar}) — ${pr.stage}, T:${pr.ragTimeline}/V:${pr.ragValue} — ${pr.narrative}`).join("\n")}

Risk aggregate: ${p.riskAggregate?.thisMonth?.total} open risks (${p.riskAggregate?.thisMonth?.high} high, ${p.riskAggregate?.thisMonth?.medium} medium, ${p.riskAggregate?.thisMonth?.low} low). Score ${p.riskAggregate?.thisMonth?.score} (+${Math.round(((p.riskAggregate?.thisMonth?.score - p.riskAggregate?.lastMonth?.score) / p.riskAggregate?.lastMonth?.score) * 100)}% MoM).

Top 5 risks:
${(p.risks || []).slice(0,5).map(r => `- ${r.title} (P${r.probability}×I${r.impact}=${r.probability*r.impact}) — ${r.owner}`).join("\n")}

Audit actions: ${(p.auditActions || []).filter(a => a.status === "Open").length} open, ${(p.auditActions || []).filter(a => a.status === "Closed").length} closed.`;

    const reply = await aiCall(engineId, sys, [{ role: "user", content: prompt }]);
    const clean = stripJson(reply);
    setBody(clean);
    setExecutiveSummary(programmeId, clean);
    setEditing(false);
    setLoading(false);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 15, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)" }}>Executive Summary</div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", marginTop: 2 }}>{summary.lastGenerated ? `Last generated ${fmtL(summary.lastGenerated.split("T")[0])}` : "Not yet generated"}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {body && !editing && <button onClick={() => setEditing(true)} style={{ fontSize: 12, fontFamily: "var(--font-d)", padding: "8px 14px", border: "1px solid var(--border2)", borderRadius: 6, color: "var(--text2)" }}>Edit</button>}
          {editing && <button onClick={() => { setExecutiveSummary(programmeId, body); setEditing(false); }} style={{ fontSize: 12, fontFamily: "var(--font-d)", padding: "8px 14px", borderRadius: 6, background: "var(--accent)", color: "#000", fontWeight: 700 }}>Save</button>}
          <button onClick={generate} disabled={loading} style={{ fontSize: 12, fontFamily: "var(--font-d)", fontWeight: 700, padding: "8px 16px", borderRadius: 6, background: "var(--accent)", color: "#000" }}>
            {loading ? <Spinner /> : (body ? "Regenerate" : "Generate Summary")}
          </button>
        </div>
      </div>

      {!body && !loading && (
        <Card color="#2ABFBF">
          <div style={{ fontSize: 13, fontFamily: "var(--font-b)", color: "var(--text2)", lineHeight: 1.6 }}>No executive summary yet. Click <strong>Generate Summary</strong> — APEX will read the current state of all projects, risks, metrics, and audits and produce a structured executive narrative.</div>
        </Card>
      )}

      {loading && <div style={{ padding: 40, textAlign: "center" }}><Spinner /><div style={{ fontSize: 13, fontFamily: "var(--font-m)", color: "var(--text3)", marginTop: 12, animation: "shimmer 1.5s infinite" }}>Reading programme state…</div></div>}

      {body && !editing && (
        <Card color="#2ABFBF">
          <div style={{ fontSize: 14, fontFamily: "var(--font-b)", color: "var(--text)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{body}</div>
        </Card>
      )}

      {editing && (
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={20} style={{ width: "100%", background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 8, color: "var(--text)", fontFamily: "var(--font-b)", fontSize: 14, padding: 14, lineHeight: 1.7, resize: "vertical" }} />
      )}
    </div>
  );
}

function UpdatesView({ programmeId, p, engineId }) {
  const updates = p.updates || [];
  const [generating, setGenerating] = useState(false);
  const [period, setPeriod] = useState("monthly");

  async function generateUpdate() {
    setGenerating(true);
    const sys = `You are writing a ${period} programme update. Structure: HEADLINE (1 line), THIS PERIOD – PROGRESS (3-5 bullets labelled by project/area), NEXT PERIOD – PRIORITIES (3-4 bullets), WATCH ITEMS (emerging risks), DECISIONS NEEDED. Concise, factual.`;
    const prompt = `Programme: ${p.name}\nProjects: ${(p.projects || []).map(x => `${x.name} — ${x.narrative}`).join("\n")}\nOpen risks: ${(p.risks || []).filter(r => r.status === "Open").length}`;
    const reply = await aiCall(engineId, sys, [{ role: "user", content: prompt }]);
    const clean = stripJson(reply);
    addUpdate(programmeId, { id: `upd-${Date.now()}`, period, date: new Date().toISOString().split("T")[0], title: `${period.charAt(0).toUpperCase() + period.slice(1)} Programme Update — ${fmtL(new Date().toISOString().split("T")[0])}`, source: "AI-generated from current state", summary: clean });
    setGenerating(false);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)" }}>Generated Updates ({updates.length})</div>
        <div style={{ display: "flex", gap: 6 }}>
          {["weekly", "monthly", "quarterly"].map(x => (
            <button key={x} onClick={() => setPeriod(x)} style={{ fontSize: 11, fontFamily: "var(--font-d)", fontWeight: period === x ? 700 : 500, padding: "6px 12px", borderRadius: 5, background: period === x ? "var(--accent)" : "var(--bg3)", color: period === x ? "#000" : "var(--text2)", border: `1px solid ${period === x ? "var(--accent)" : "var(--border2)"}`, textTransform: "capitalize" }}>{x}</button>
          ))}
          <button onClick={generateUpdate} disabled={generating} style={{ fontSize: 12, fontFamily: "var(--font-d)", fontWeight: 700, padding: "8px 14px", borderRadius: 6, background: "var(--accent)", color: "#000" }}>{generating ? <Spinner /> : "Generate"}</button>
        </div>
      </div>
      {updates.length === 0 && <div style={{ padding: 30, textAlign: "center", fontSize: 13, color: "var(--text3)", background: "var(--bg2)", border: "1px dashed var(--border2)", borderRadius: 8 }}>No updates yet. Pick a cadence and click Generate, or upload a source document via the AI chat.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {updates.map(u => (
          <Card key={u.id} color={u.period === "weekly" ? "#5DC484" : u.period === "monthly" ? "#F5C544" : "#4A9EFF"}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div>
                <span style={{ fontSize: 10, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{u.period}</span>
                <div style={{ fontSize: 14, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)", marginTop: 2 }}>{u.title}</div>
              </div>
              <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)" }}>{fmtL(u.date)}</div>
            </div>
            <p style={{ fontSize: 13, fontFamily: "var(--font-b)", color: "var(--text2)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{u.summary}</p>
            {u.source && <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", marginTop: 8 }}>Source: {u.source}</div>}
          </Card>
        ))}
      </div>
    </div>
  );
}
