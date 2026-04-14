// Panel 3 — Plan: Timeline / Gantt | Dependencies
import { useState } from "react";
import Shell from "../components/Shell.jsx";
import { TabBar, PageHeader, Card, EmptyState } from "../components/ui.jsx";
import { useStore } from "../data/store.js";
import { fmt, daysBetween, today } from "../lib/utils.js";

const TABS = [
  { id: "timeline", label: "Timeline / Gantt" },
  { id: "dependencies", label: "Dependencies" },
];

export default function PlanPanel({ programmeId, onBack, onNavHome, onNavLanding }) {
  const [tab, setTab] = useState("timeline");
  const [state] = useStore();
  const p = state.programmes[programmeId];

  return (
    <Shell programmeId={programmeId} contextId={`plan/${tab}`} contextLabel={`Plan — ${TABS.find(t => t.id === tab)?.label}`} contextPayload={{ milestones: p.milestones?.length, deps: p.dependencies?.length }} gapSection="plan" onNavHome={onNavHome} onNavLanding={onNavLanding}>
      <PageHeader breadcrumb={[{ label: "Programme View", onClick: onBack }]} title="Plan" subtitle="Timeline, milestones and dependencies" actions={<button onClick={onBack} style={{ fontSize: 12, fontFamily: "var(--font-d)", padding: "6px 14px", border: "1px solid var(--border2)", borderRadius: 6, color: "var(--text2)" }}>← Back</button>} />
      <div style={{ padding: "20px 24px", maxWidth: 1300, width: "100%", margin: "0 auto" }}>
        <TabBar tabs={TABS} active={tab} onChange={setTab} />
        {tab === "timeline" && <TimelineView p={p} />}
        {tab === "dependencies" && <DependenciesView p={p} />}
      </div>
    </Shell>
  );
}

function TimelineView({ p }) {
  const milestones = p.milestones || [];
  if (!milestones.length) {
    return <EmptyState title="No milestones yet" description="Upload a plan, paste a milestone list, or describe key dates in the AI chat. APEX will structure them for you." />;
  }

  // Build a simple timeline from min date to max date
  const dates = milestones.map(m => new Date(m.date));
  const minD = new Date(Math.min(...dates, today.getTime() - 30 * 86400000));
  const maxD = new Date(Math.max(...dates, today.getTime() + 30 * 86400000));
  const span = Math.max(1, daysBetween(minD, maxD));
  const todayPct = (daysBetween(minD, today) / span) * 100;

  const typeColor = { policy: "#A78BFA", audit: "#E8734A", delivery: "#5DC484", governance: "#4A9EFF", milestone: "#F5C544" };

  return (
    <div>
      <div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text3)", marginBottom: 10 }}>{milestones.length} milestones · span {fmt(minD.toISOString().split("T")[0])} → {fmt(maxD.toISOString().split("T")[0])}</div>

      {/* Timeline axis */}
      <div style={{ position: "relative", height: 40, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 6, marginBottom: 16 }}>
        <div style={{ position: "absolute", top: 0, bottom: 0, left: `${todayPct}%`, width: 2, background: "var(--accent)", boxShadow: "0 0 8px rgba(42,191,191,0.5)" }} />
        <div style={{ position: "absolute", top: -18, left: `${todayPct}%`, transform: "translateX(-50%)", fontSize: 10, fontFamily: "var(--font-m)", color: "var(--accent)", fontWeight: 700 }}>TODAY</div>
        {milestones.map(m => {
          const pct = (daysBetween(minD, new Date(m.date)) / span) * 100;
          const project = (p.projects || []).find(pr => pr.id === m.projectId);
          return (
            <div key={m.id} title={`${m.title} — ${fmt(m.date)}`} style={{ position: "absolute", top: "50%", left: `${pct}%`, transform: "translate(-50%, -50%)", width: 14, height: 14, borderRadius: "50%", background: typeColor[m.type] || "#F5C544", border: "2px solid var(--bg0)", cursor: "pointer" }} />
          );
        })}
      </div>

      {/* Milestone list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {milestones.sort((a, b) => new Date(a.date) - new Date(b.date)).map(m => {
          const project = (p.projects || []).find(pr => pr.id === m.projectId);
          return (
            <Card key={m.id} color={typeColor[m.type] || "#F5C544"} style={{ padding: "10px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                  <span style={{ fontSize: 10, fontFamily: "var(--font-m)", color: typeColor[m.type] || "#F5C544", background: `${typeColor[m.type] || "#F5C544"}20`, padding: "2px 8px", borderRadius: 3, textTransform: "uppercase", letterSpacing: "0.1em" }}>{m.type}</span>
                  <div style={{ fontSize: 13, fontFamily: "var(--font-d)", fontWeight: 600, color: "var(--text)" }}>{m.title}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)" }}>{project?.name || "—"}</div>
                  <div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text2)" }}>{fmt(m.date)}</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function DependenciesView({ p }) {
  const deps = p.dependencies || [];
  const projectMap = Object.fromEntries((p.projects || []).map(pr => [pr.id, pr.name]));
  if (!deps.length) return <EmptyState title="No dependencies logged" description="Use the AI chat to describe dependencies, or upload a plan file." />;

  const typeColor = { blocks: "#E8734A", enables: "#5DC484", informs: "#4A9EFF" };

  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 1.2fr 0.9fr 2fr", padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "var(--bg3)", fontSize: 10, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        <div>Dependency</div><div>From</div><div>To</div><div>Type</div><div>Risk if unresolved</div>
      </div>
      {deps.map(d => (
        <div key={d.id} style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 1.2fr 0.9fr 2fr", padding: "12px 14px", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
          <div style={{ fontSize: 13, fontFamily: "var(--font-b)", color: "var(--text)" }}>{d.title}</div>
          <div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text2)" }}>{projectMap[d.from] || d.from}</div>
          <div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text2)" }}>{projectMap[d.to] || d.to}</div>
          <div><span style={{ fontSize: 10, fontFamily: "var(--font-m)", color: typeColor[d.type], background: `${typeColor[d.type]}20`, padding: "3px 10px", borderRadius: 3, textTransform: "uppercase", letterSpacing: "0.08em" }}>{d.type}</span></div>
          <div style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text2)", lineHeight: 1.5 }}>{d.risk}</div>
        </div>
      ))}
    </div>
  );
}
