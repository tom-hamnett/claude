import { useState, useRef, useEffect, useCallback } from "react";
import { AreaChart, Area, XAxis, ResponsiveContainer } from "recharts";

// ── Fonts & Theme ─────────────────────────────────────────────────────────────
const _fl = document.createElement("link");
_fl.rel = "stylesheet";
_fl.href = "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@300;400;500&display=swap";
document.head.appendChild(_fl);
const _css = document.createElement("style");
_css.textContent = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg0:#0B2A3C;--bg1:#0D3248;--bg2:#0F3A52;--bg3:#13445E;--bg4:#17506E;
  --border:#1A5572;--border2:#1E6080;
  --accent:#2ABFBF;--orange:#E8734A;--yellow:#F5C544;--green:#5DC484;--red:#E85252;
  --blue:#4A9EFF;--violet:#A78BFA;--teal:#2ABFBF;
  --text:#FFFFFF;--text2:#E0ECF4;--text3:#B0CBE0;
  --font-d:'Outfit',sans-serif;--font-m:'JetBrains Mono',monospace;--font-b:'Inter',sans-serif;
}
body{background:var(--bg0);color:var(--text);font-family:var(--font-b);min-height:100vh}
::-webkit-scrollbar{width:3px;height:3px}
::-webkit-scrollbar-track{background:var(--bg1)}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideRight{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:translateX(0)}}
@keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
@keyframes shimmer{0%{opacity:0.6}50%{opacity:1}100%{opacity:0.6}}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(42,191,191,0.3)}50%{box-shadow:0 0 0 6px rgba(42,191,191,0)}}
.fu{animation:fadeUp 0.3s ease forwards}
.sr{animation:slideRight 0.25s ease forwards}
.sd{animation:slideDown 0.25s ease forwards}
textarea:focus,input:focus,select:focus{outline:none}
button{cursor:pointer;border:none;background:none;font-family:var(--font-b)}
`;
document.head.appendChild(_css);

// ── AI Provider ───────────────────────────────────────────────────────────────
const aiCall = async (system, msgs) => {
  try {
    const r = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4000, system, messages: msgs }),
    });
    const data = await r.json();
    if (data.error) return `⚠ ${data.error}`;
    return data.content?.[0]?.text || "No response.";
  } catch (e) {
    return "⚠ AI engine connection error. Check your configuration.";
  }
};

// ── Dates & Utils ─────────────────────────────────────────────────────────────
const today = new Date();
const d = (n) => { const dt = new Date(today); dt.setDate(dt.getDate() + n); return dt.toISOString().split("T")[0]; };
const fmt = (s) => new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const fmtL = (s) => new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
const daysUntil = (s) => daysBetween(d(0), s);
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
async function readFile(f) { return new Promise(r => { const fr = new FileReader(); fr.onload = e => r(e.target.result); fr.onerror = () => r(`[Could not read: ${f.name}]`); fr.readAsText(f); }); }

// ── Domain Constants ──────────────────────────────────────────────────────────
const FAMILIES = {
  financial: { label: "Financial", color: "#F5C544", icon: "£" },
  delivery: { label: "Delivery", color: "#4A9EFF", icon: "◈" },
  strategic: { label: "Strategic", color: "#5DC484", icon: "◆" },
  supplier: { label: "Supplier", color: "#2ABFBF", icon: "⬡" },
  risk: { label: "Portfolio Risk", color: "#A78BFA", icon: "▲" },
  benefit: { label: "Benefits", color: "#5DC484", icon: "✚" },
};
const BENEFIT_TYPES = {
  financial: { label: "Financial", color: "#F5C544" },
  operational: { label: "Operational", color: "#4A9EFF" },
  strategic: { label: "Strategic", color: "#5DC484" },
  customer: { label: "Customer", color: "#2ABFBF" },
  employee: { label: "Employee", color: "#A78BFA" },
};
const BENEFIT_STATUS = {
  planned: { label: "Planned", color: "#6B8FA3", bg: "rgba(107,143,163,0.12)" },
  "in-progress": { label: "In Progress", color: "#F5C544", bg: "rgba(245,197,68,0.12)" },
  realised: { label: "Realised", color: "#5DC484", bg: "rgba(93,196,132,0.12)" },
  "at-risk": { label: "At Risk", color: "#E8734A", bg: "rgba(232,115,74,0.12)" },
};
const ENGAGEMENT_LEVELS = {
  champion: { label: "Champion", color: "#5DC484" },
  supporter: { label: "Supporter", color: "#2ABFBF" },
  neutral: { label: "Neutral", color: "#F5C544" },
  blocker: { label: "Blocker", color: "#E8734A" },
};
const OUTPUT_TYPES = {
  steerco: { label: "SteerCo / Programme Board Pack", icon: "📋", color: "#4A9EFF", desc: "Full governance pack with RAG, risks, decisions, financials" },
  highlight: { label: "Highlight Report", icon: "📊", color: "#5DC484", desc: "Concise status update — this period / next period / watch items" },
  benefits: { label: "Benefits Realisation Report", icon: "✚", color: "#F5C544", desc: "Benefits tracking vs business case — expected vs actual" },
  exception: { label: "Exception Report", icon: "⚠", color: "#E8734A", desc: "Triggered when tolerance is breached" },
};
const LINK_META = {
  drives: { label: "Drives", color: "#E8734A", opacity: 1, desc: "Directly produces this metric value." },
  influences: { label: "Influences", color: "#F5C544", opacity: 0.85, desc: "Contributes but not sole determinant." },
  correlates: { label: "Correlates", color: "#4A9EFF", opacity: 0.6, desc: "Historically co-moves. No direct causation." },
};
const RAG = {
  green: { color: "#5DC484", bg: "rgba(93,196,132,0.12)", label: "On Track" },
  amber: { color: "#F5C544", bg: "rgba(245,197,68,0.12)", label: "At Risk" },
  red: { color: "#E8734A", bg: "rgba(232,115,74,0.12)", label: "Off Track" },
};
const STATUS_META = {
  "complete": { label: "Complete", color: "#5DC484", bg: "rgba(93,196,132,0.12)" },
  "in-progress": { label: "In Progress", color: "#F5C544", bg: "rgba(245,197,68,0.12)" },
  "not-started": { label: "Not Started", color: "#6B8FA3", bg: "rgba(107,143,163,0.12)" },
  "at-risk": { label: "At Risk", color: "#E8734A", bg: "rgba(232,115,74,0.12)" },
};
const RAID_TYPES = {
  risk: { label: "Risk", color: "#E8734A", icon: "▲" },
  assumption: { label: "Assumption", color: "#F5C544", icon: "◈" },
  issue: { label: "Issue", color: "#A78BFA", icon: "◆" },
  decision: { label: "Decision", color: "#5DC484", icon: "✓" },
};
const ROLES = ["Programme Manager", "CPO", "Programme Director", "Workstream Lead", "Stakeholder", "Finance Lead"];

// ── Onboarding stages (documents-first, then review/edit tabs) ────────────────
const STAGES = [
  { id: "documents", num: 1, label: "📄 Ingest Documents",
    prompt: `You are APEX, an expert PMO assistant. This is the FIRST step — Document Ingestion.
The user will upload documents (programme plans, risk registers, status reports, budgets, org charts, calendars, etc).
From these, extract EVERYTHING you can find — populate all categories maximally:
- Tasks (with phases, owners, dates, dependencies, status)
- Risks (with impact, likelihood, owner, mitigation)
- RAID items (risks, assumptions, issues, decisions)
- Metrics/KPIs (with values, targets, RAG)
- Benefits (financial, operational, strategic outcomes)
- Calendar events (steercos, reviews, deadlines, milestones)
- Programme identity (name, type, sponsor, objective, vision)
- Structure (workstreams/tranches, dates, governance)
- People (SRO, leads, stakeholders with engagement levels)
- Outputs needed (report types mentioned)

For anything you're uncertain about, ask clarifying questions.

\`\`\`json
{"stage":"documents","complete":true,"data":{"programme":{"name":"...","type":"...","sponsor":"...","objective":"...","vision":"..."},"structure":{"scale":"...","workstreams":["..."],"startDate":"...","endDate":"...","currentPhase":"...","governance":"...","currentState":"...","targetState":"..."},"people":{"sro":"...","leads":[{"name":"...","role":"...","owns":"..."}],"stakeholders":[{"id":"s1","name":"...","role":"...","engagement":"champion|supporter|neutral|blocker"}],"external":["..."]},"tasks":[{"id":"t1","phase":"...","name":"...","start":"YYYY-MM-DD","end":"YYYY-MM-DD","status":"not-started|in-progress|complete|at-risk","owner":"...","progress":0,"deps":[],"confidence":"high|medium|low"}],"risks":[{"id":"r1","title":"...","impact":"High|Medium|Low","likelihood":"High|Medium|Low","status":"Open","owner":"...","mitigation":"..."}],"raidItems":[{"id":"rd1","type":"risk|assumption|issue|decision","title":"...","description":"...","owner":"...","status":"Open|Closed|Active|Agreed","impact":"High|Medium|Low","dateRaised":"YYYY-MM-DD","dueDate":"YYYY-MM-DD"}],"metrics":[{"id":"m1","family":"financial|delivery|strategic|supplier|risk","name":"...","value":0,"target":0,"unit":"...","direction":"higher|lower|neutral","rag":"green|amber|red","note":"..."}],"benefits":[{"id":"b1","title":"...","type":"financial|operational|strategic|customer|employee","owner":"...","baseline":0,"target":0,"unit":"...","expectedRealisation":"YYYY-MM-DD","status":"planned"}],"calendarEvents":[{"id":"ce1","title":"...","date":"YYYY-MM-DD","type":"steerco|review|deadline|external|milestone"}],"enabledOutputs":[{"type":"steerco|highlight|benefits","frequency":"monthly|weekly|quarterly","audience":"..."}],"questions":[{"about":"...","question":"..."}],"summary":"2-3 sentence summary"}}
\`\`\`
Extract as much as possible. Mark confidence: high=explicit, medium=implied, low=inferred.` },
  { id: "vision", num: 2, label: "Vision & Mandate",
    prompt: `You are APEX. Stage 2 — Vision & Mandate (MSP: Vision theme).
Context from prior stages: PROGRAMME_CONTEXT
Review what was extracted from documents. Confirm or update:
1. Programme name and type
2. Sponsor
3. Strategic objective
4. Vision statement — "when this programme is done, the organisation will…"
Present what you already know and ask the user to confirm or correct.
\`\`\`json
{"stage":"vision","complete":true,"data":{"name":"...","type":"...","sponsor":"...","objective":"...","vision":"..."}}
\`\`\`` },
  { id: "blueprint", num: 3, label: "Blueprint & Tranches",
    prompt: `You are APEX. Stage 3 — Blueprint & Tranches (MSP: Blueprint theme).
Context: PROGRAMME_CONTEXT
Review what was extracted. Confirm or update: scale, current state, target state, workstreams/tranches, dates, phase, governance.
Present what you know and ask the user to fill gaps.
\`\`\`json
{"stage":"blueprint","complete":true,"data":{"scale":"...","currentState":"...","targetState":"...","workstreams":["..."],"startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","currentPhase":"...","governance":"..."}}
\`\`\`` },
  { id: "organisation", num: 4, label: "Organisation",
    prompt: `You are APEX. Stage 4 — Organisation & Stakeholders (MSP themes).
Context: PROGRAMME_CONTEXT
Review extracted people data. Confirm or update: SRO, delivery leads, stakeholder register (with engagement levels), external parties.
\`\`\`json
{"stage":"organisation","complete":true,"data":{"sro":"...","leads":[{"name":"...","role":"...","owns":"..."}],"stakeholders":[{"id":"s1","name":"...","role":"...","organisation":"...","engagement":"champion|supporter|neutral|blocker","interest":"high|medium|low","influence":"high|medium|low"}],"external":["..."]}}
\`\`\`` },
  { id: "benefits", num: 5, label: "Benefits",
    prompt: `You are APEX. Stage 5 — Benefits Management (MSP: the heart of MSP).
Context: PROGRAMME_CONTEXT
Review any benefits extracted from documents. Confirm, add, or refine 2-6 benefits with: title, type, owner, KPI, baseline, target, unit, expected realisation date.
\`\`\`json
{"stage":"benefits","complete":true,"data":{"benefits":[{"id":"b1","title":"...","description":"...","type":"financial|operational|strategic|customer|employee","owner":"...","measurementKPI":"...","baseline":0,"target":0,"unit":"...","expectedRealisation":"YYYY-MM-DD","tranche":"...","status":"planned","confidence":"high|medium|low"}]}}
\`\`\`` },
  { id: "outputs", num: 6, label: "Outputs",
    prompt: `You are APEX. Stage 6 — Outputs & Reporting.
Context: PROGRAMME_CONTEXT
What reports does this programme need to produce? Options: SteerCo/Board Pack (monthly), Highlight Report (weekly), Benefits Realisation Report (quarterly), Exception Report (ad-hoc).
Confirm frequency, audience, and next due date for each.
\`\`\`json
{"stage":"outputs","complete":true,"data":{"enabledOutputs":[{"type":"steerco|highlight|benefits|exception","frequency":"weekly|biweekly|monthly|quarterly|ad-hoc","audience":"...","nextDue":"YYYY-MM-DD"}]}}
\`\`\`
Default to all three if unsure.` },
  { id: "metrics", num: 7, label: "Metrics & KPIs",
    prompt: `You are APEX. Stage 7 — Metrics & KPIs (MSP: Planning & Control).
Context: PROGRAMME_CONTEXT
Review extracted metrics. Propose 4-8 metrics mapped to benefits and output requirements. Confirm with user.
\`\`\`json
{"stage":"metrics","complete":true,"data":{"metrics":[{"id":"m1","family":"financial|delivery|strategic|supplier|risk","name":"...","value":0,"target":0,"unit":"...","direction":"higher|lower|neutral|lower-abs","rag":"green","trend":[0,0,0,0],"trendL":["Wk1","Wk2","Wk3","Wk4"],"note":"Baseline.","lastUpdated":"TODAY","benefitId":"b1","links":[]}]}}
\`\`\`
Replace TODAY with ${d(0)}.` },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const ragCount = (ms, r) => ms.filter(m => m.rag === r).length;
const fmtVal = (m) => { const v = m.value; if (m.unit === "£m") return `£${v}m`; if (m.unit === "%") return `${v}%`; if (m.unit === "/5") return `${v}/5`; if (m.unit === "/100") return `${v}`; return `${v}${m.unit ? " " + m.unit : ""}`; };
const progPct = (m) => { if (m.direction === "lower" || m.direction === "lower-abs") { if (!m.target && !m.value) return 100; const w = (m.trend?.[0] || 1) * 1.5; return Math.max(0, Math.min(100, 100 - ((m.value / w) * 100))); } if (!m.target) return 100; return Math.min(100, (m.value / m.target) * 100); };

// ── Micro Components ──────────────────────────────────────────────────────────
const Spinner = ({ s = 14, c = "var(--accent)" }) => <div style={{ width: s, height: s, border: `2px solid var(--border2)`, borderTopColor: c, borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />;
const Badge = ({ status }) => { const m = STATUS_META[status] || STATUS_META["not-started"]; return <span style={{ fontSize: 12, fontFamily: "var(--font-m)", color: m.color, background: m.bg, border: `1px solid ${m.color}30`, padding: "2px 6px", borderRadius: 3, whiteSpace: "nowrap", textTransform: "uppercase" }}>{m.label}</span>; };
const RagPip = ({ rag }) => { const r = RAG[rag] || RAG.amber; return <span style={{ width: 6, height: 6, borderRadius: "50%", background: r.color, display: "inline-block", flexShrink: 0 }} />; };
const Conf = ({ c }) => { const col = c === "high" ? "#5DC484" : c === "medium" ? "#F5C544" : "#6B8FA3"; return <span style={{ fontSize: 11, fontFamily: "var(--font-m)", color: col, background: `${col}18`, border: `1px solid ${col}30`, padding: "1px 5px", borderRadius: 2, textTransform: "uppercase", letterSpacing: "0.08em" }}>{c || "?"}</span>; };

const LinkChip = ({ task, linkType, onClick }) => {
  const lm = LINK_META[linkType] || LINK_META.influences;
  return <span onClick={e => { e.stopPropagation(); onClick && onClick(task); }} title={lm.desc} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontFamily: "var(--font-m)", padding: "2px 7px", background: `${lm.color}18`, border: `1px solid ${lm.color}55`, borderLeft: `2px solid ${lm.color}`, borderRadius: 3, cursor: onClick ? "pointer" : "default", whiteSpace: "nowrap", opacity: lm.opacity, transition: "opacity 0.15s" }} onMouseEnter={e => { if (onClick) e.currentTarget.style.opacity = "1"; }} onMouseLeave={e => e.currentTarget.style.opacity = String(lm.opacity)}><span style={{ color: lm.color, fontWeight: 600, letterSpacing: "0.05em" }}>{lm.label}</span><span style={{ color: "var(--text3)" }}>·</span><span style={{ color: "var(--text2)" }}>{task.name.length > 20 ? task.name.slice(0, 19) + "…" : task.name}</span></span>;
};

// ── Sparkline ─────────────────────────────────────────────────────────────────
const Spark = ({ data, color, positive }) => {
  if (!data || data.length < 2) return null;
  const up = data[data.length - 1] >= data[data.length - 2], good = positive ? up : !up;
  return <div style={{ display: "flex", alignItems: "flex-end", gap: 3 }}>
    <ResponsiveContainer width={52} height={22}>
      <AreaChart data={data.map(v => ({ v }))} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs><linearGradient id={`sg${color.replace(/[^a-z0-9]/gi, "")}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.35} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#sg${color.replace(/[^a-z0-9]/gi, "")})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
    <span style={{ fontSize: 11, fontFamily: "var(--font-m)", color: good ? "#5DC484" : "#E8734A" }}>{up ? "↑" : "↓"}</span>
  </div>;
};

// ══════════════════════════════════════════════════════════════════════════════
// INSIGHT CARDS — Proactive AI-driven contextual prompts
// ══════════════════════════════════════════════════════════════════════════════
const INSIGHT_CATEGORIES = {
  milestone: { icon: "🎯", color: "#F5C544", label: "Milestone" },
  meeting: { icon: "📋", color: "#2ABFBF", label: "Meeting Prep" },
  risk: { icon: "⚠", color: "#E8734A", label: "Risk Alert" },
  task: { icon: "✦", color: "#5DC484", label: "Action Required" },
  stakeholder: { icon: "👤", color: "#4A9EFF", label: "Stakeholder" },
  report: { icon: "📊", color: "#A78BFA", label: "Report Due" },
  benefit: { icon: "✚", color: "#5DC484", label: "Benefit" },
  custom: { icon: "◆", color: "#2ABFBF", label: "Custom" },
};

const InsightCard = ({ insight, onDismiss, onAction }) => {
  const cat = INSIGHT_CATEGORIES[insight.category] || INSIGHT_CATEGORIES.custom;
  return (
    <div className="fu" style={{ minWidth: 260, maxWidth: 320, background: "var(--bg2)", border: `1px solid ${cat.color}30`, borderLeft: `3px solid ${cat.color}`, borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 14 }}>{cat.icon}</span>
          <span style={{ fontSize: 11, fontFamily: "var(--font-m)", color: cat.color, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>{cat.label}</span>
          {insight.priority === "high" && <span style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "#E8734A", background: "rgba(232,115,74,0.15)", border: "1px solid rgba(232,115,74,0.3)", padding: "1px 5px", borderRadius: 2, textTransform: "uppercase" }}>Urgent</span>}
        </div>
        <button onClick={() => onDismiss(insight.id)} style={{ fontSize: 12, color: "var(--text3)", padding: "2px 4px", opacity: 0.5 }} onMouseEnter={e => e.currentTarget.style.opacity = "1"} onMouseLeave={e => e.currentTarget.style.opacity = "0.5"}>✕</button>
      </div>
      <div style={{ fontSize: 11, fontFamily: "var(--font-d)", fontWeight: 600, color: "var(--text)", lineHeight: 1.35 }}>{insight.title}</div>
      <p style={{ fontSize: 11, fontFamily: "var(--font-b)", color: "var(--text2)", lineHeight: 1.55 }}>{insight.body}</p>
      {insight.actions?.length > 0 && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 2 }}>
          {insight.actions.map((action, i) => (
            <button key={i} onClick={() => onAction(insight, action)} style={{ fontSize: 11, fontFamily: "var(--font-m)", padding: "3px 9px", background: i === 0 ? `${cat.color}20` : "transparent", border: `1px solid ${i === 0 ? cat.color + "50" : "var(--border2)"}`, borderRadius: 4, color: i === 0 ? cat.color : "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{action}</button>
          ))}
        </div>
      )}
    </div>
  );
};

const InsightCardsRow = ({ insights, onDismiss, onAction, onRefresh, loading }) => {
  if (!insights.length && !loading) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600 }}>◆ Proactive Insights</span>
          <span style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)" }}>{insights.length} active</span>
        </div>
        <button onClick={onRefresh} disabled={loading} style={{ fontSize: 11, fontFamily: "var(--font-m)", padding: "3px 9px", background: "rgba(42,191,191,0.1)", border: "1px solid rgba(42,191,191,0.3)", borderRadius: 4, color: "var(--accent)", opacity: loading ? 0.5 : 1 }}>{loading ? <Spinner s={8} /> : "↻ Refresh"}</button>
      </div>
      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
        {loading && !insights.length && <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 20 }}><Spinner /><span style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", animation: "shimmer 1.5s infinite" }}>Generating insights…</span></div>}
        {insights.map(ins => <InsightCard key={ins.id} insight={ins} onDismiss={onDismiss} onAction={onAction} />)}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// CONTEXT VIEW — AI-generated focused views for specific questions
// ══════════════════════════════════════════════════════════════════════════════
const ContextView = ({ view, tasks, risks, metrics, raidItems, benefits = [], onClose, onNavigateTask, onOpenMetric, onOpenBenefit }) => {
  if (!view) return null;
  return (
    <div className="sd" style={{ background: "var(--bg2)", border: "1px solid var(--accent)30", borderRadius: 10, padding: "16px 18px", marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 3 }}>◆ Contextual View</div>
          <div style={{ fontSize: 14, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)" }}>{view.title}</div>
        </div>
        <button onClick={onClose} style={{ color: "var(--text3)", fontSize: 14, padding: "2px 5px" }}>✕</button>
      </div>
      {view.sections?.map((sec, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6, paddingBottom: 4, borderBottom: "1px solid var(--border)" }}>{sec.title}</div>
          {sec.type === "text" && <p style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text2)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{sec.content}</p>}
          {sec.type === "tasks" && sec.taskIds?.map(tid => { const t = tasks.find(x => x.id === tid); if (!t) return null; return (
            <div key={tid} onClick={() => onNavigateTask(t)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", marginBottom: 3, background: "var(--bg3)", borderRadius: 5, border: "1px solid var(--border)", cursor: "pointer" }} onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"} onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
              <Badge status={t.status} /><span style={{ fontSize: 11, fontFamily: "var(--font-b)", color: "var(--text)", flex: 1 }}>{t.name}</span><span style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)" }}>{t.owner} · {fmt(t.end)}</span>
            </div>);
          })}
          {sec.type === "risks" && sec.riskIds?.map(rid => { const rk = risks.find(x => x.id === rid); if (!rk) return null; return (
            <div key={rid} style={{ padding: "6px 8px", marginBottom: 3, background: "var(--bg3)", borderRadius: 5, border: "1px solid var(--border)", borderLeft: `3px solid ${rk.impact === "High" ? "#E8734A" : rk.impact === "Medium" ? "#F5C544" : "#5DC484"}` }}>
              <div style={{ fontSize: 11, fontFamily: "var(--font-b)", color: "var(--text)" }}>{rk.title}</div>
              <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", marginTop: 2 }}>{rk.owner} · {rk.mitigation}</div>
            </div>);
          })}
          {sec.type === "metrics" && sec.metricIds?.map(mid => { const mt = metrics.find(x => x.id === mid); if (!mt) return null; return (
            <div key={mid} onClick={() => onOpenMetric(mt)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", marginBottom: 3, background: "var(--bg3)", borderRadius: 5, border: "1px solid var(--border)", cursor: "pointer" }}>
              <RagPip rag={mt.rag} /><span style={{ fontSize: 11, fontFamily: "var(--font-b)", color: "var(--text)", flex: 1 }}>{mt.name}</span><span style={{ fontSize: 11, fontFamily: "var(--font-d)", fontWeight: 700, color: RAG[mt.rag].color }}>{fmtVal(mt)}</span>
            </div>);
          })}
          {sec.type === "benefits" && sec.benefitIds?.map(bid => { const bn = benefits.find(x => x.id === bid); if (!bn) return null; const st = BENEFIT_STATUS[bn.status] || BENEFIT_STATUS.planned; const tm = BENEFIT_TYPES[bn.type] || BENEFIT_TYPES.operational; return (
            <div key={bid} onClick={() => onOpenBenefit && onOpenBenefit(bn)} style={{ padding: "6px 8px", marginBottom: 3, background: "var(--bg3)", borderRadius: 5, border: "1px solid var(--border)", borderLeft: `3px solid ${tm.color}`, cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}><span style={{ fontSize: 11, fontFamily: "var(--font-m)", color: st.color, background: st.bg, border: `1px solid ${st.color}30`, padding: "1px 5px", borderRadius: 2, textTransform: "uppercase" }}>{st.label}</span><span style={{ fontSize: 11, fontFamily: "var(--font-b)", color: "var(--text)", flex: 1 }}>{bn.title}</span></div>
              <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)" }}>{bn.owner} · {bn.baseline}{bn.unit} → {bn.target}{bn.unit} · Due {fmt(bn.expectedRealisation)}</div>
            </div>);
          })}
          {sec.commentary && <p style={{ fontSize: 11, fontFamily: "var(--font-b)", color: "var(--text3)", lineHeight: 1.55, marginTop: 5, fontStyle: "italic" }}>{sec.commentary}</p>}
        </div>
      ))}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// GUIDED SETUP — Single conversational flow with doc upload
// ══════════════════════════════════════════════════════════════════════════════
const SETUP_SYS = `You are APEX, an expert PMO setup assistant. Guide the user through programme setup in a single natural conversation. Be warm, professional, and conversational — like a senior PMO consultant in a first meeting.

Your goal is to understand:
1. What programme/project is this? (name, type, sponsor, objective)
2. What outputs do they need? (weekly updates, monthly round-ups, quarterly steerco packs, metrics reports, etc.) Ask about frequency, audience, and what format they're used to.
3. Do they have documents to upload? (plans, risk registers, status reports, org charts, budgets). If yes, tell them to drop files and you'll extract everything.
4. What does success look like? (key benefits, target outcomes)

Be iterative — don't rush. Let them upload docs at any point. When they upload, extract EVERYTHING and present a summary of what you found.

When the user says they're ready, or you have enough to proceed, output a JSON block:
\`\`\`json
{"setup":"complete","data":{
  "programme":{"name":"...","type":"transformation|delivery|commercial|operational|regulatory","sponsor":"...","objective":"...","vision":"...","phase":"...","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","sro":"...","governance":"..."},
  "enabledOutputs":[{"type":"weekly","label":"Weekly Project Update","frequency":"weekly","audience":"..."},{"type":"monthly","label":"Monthly Programme Report","frequency":"monthly","audience":"..."},{"type":"quarterly","label":"Quarterly SteerCo Pack","frequency":"quarterly","audience":"..."}],
  "workstreams":["..."],
  "tasks":[{"id":"t1","phase":"...","name":"...","start":"YYYY-MM-DD","end":"YYYY-MM-DD","status":"not-started|in-progress|complete|at-risk","owner":"...","progress":0,"deps":[]}],
  "risks":[{"id":"r1","title":"...","impact":"High|Medium|Low","likelihood":"High|Medium|Low","status":"Open","owner":"...","mitigation":"..."}],
  "raidItems":[],
  "metrics":[{"id":"m1","family":"financial|delivery|strategic|supplier|risk","name":"...","value":0,"target":0,"unit":"...","direction":"higher|lower|neutral","rag":"green","trend":[0,0,0,0],"trendL":["Wk1","Wk2","Wk3","Wk4"],"note":"...","links":[]}],
  "benefits":[{"id":"b1","title":"...","type":"financial|operational|strategic|customer|employee","owner":"...","baseline":0,"target":0,"unit":"...","expectedRealisation":"YYYY-MM-DD","status":"planned"}],
  "calendarEvents":[],
  "stakeholders":[],
  "leads":[]
}}
\`\`\`
Only output JSON when you truly have enough to populate a useful dashboard. Until then, keep the conversation going.`;

const GuidedSetup = ({ onComplete }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => { start(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function start() {
    setLoading(true);
    const reply = await aiCall(SETUP_SYS, [{ role: "user", content: "Hello, I'd like to set up a new programme." }]);
    setMessages([{ role: "assistant", content: reply.replace(/```json[\s\S]*?```/g, "").trim() }]);
    setLoading(false);
  }

  async function send(override) {
    const content = override || input.trim(); if (!content || loading) return;
    const hist = [...messages, { role: "user", content }];
    setMessages(hist); if (!override) setInput(""); setLoading(true);
    try {
      const reply = await aiCall(SETUP_SYS, hist.map(m => ({ role: m.role, content: m.content })));
      const jm = reply.match(/```json\s*([\s\S]*?)```/);
      if (jm) {
        try {
          const parsed = JSON.parse(jm[1]);
          if (parsed.setup === "complete" && parsed.data) {
            setMessages(prev => [...prev, { role: "assistant", content: reply.replace(/```json[\s\S]*?```/g, "").trim() || "Setup complete! Launching your dashboard…" }]);
            setLoading(false);
            setTimeout(() => buildState(parsed.data), 1000);
            return;
          }
        } catch (e) { /* not valid JSON, continue conversation */ }
      }
      setMessages(prev => [...prev, { role: "assistant", content: reply.replace(/```json[\s\S]*?```/g, "").trim() }]);
    } catch (e) { setMessages(prev => [...prev, { role: "assistant", content: "⚠ AI engine error." }]); }
    setLoading(false);
  }

  async function ingestFiles() {
    if (!files.length) return; setLoading(true);
    let combined = "";
    for (const f of files) { const t = await readFile(f); combined += `\n\n=== FILE: ${f.name} ===\n${t.slice(0, 15000)}`; }
    const names = files.map(f => f.name).join(", ");
    setFiles([]);
    await send(`I've uploaded these documents: ${names}. Please extract everything you can find:\n${combined}`);
  }

  function buildState(data) {
    const p = data.programme || {};
    const tasks = (data.tasks || []).map((t, i) => ({ ...t, id: t.id || `t${i + 1}`, progress: t.progress || 0, deps: t.deps || [] }));
    const risks = data.risks || [];
    const raidItems = data.raidItems || [];
    const benefits = (data.benefits || []).map((b, i) => ({ ...b, id: b.id || `b${i + 1}`, actualRealisation: null, status: b.status || "planned" }));
    let metrics = data.metrics || [];
    if (!metrics.length) metrics = [
      { id: "m1", family: "delivery", name: "Milestone Adherence", value: 0, target: 85, unit: "%", direction: "higher", rag: "green", trend: [0,0,0,0], trendL: ["Wk1","Wk2","Wk3","Wk4"], note: "Baseline.", links: [] },
      { id: "m2", family: "financial", name: "Budget Utilisation", value: 0, target: 100, unit: "%", direction: "neutral", rag: "green", trend: [0,0,0,0], trendL: ["Wk1","Wk2","Wk3","Wk4"], note: "Baseline.", links: [] },
    ];
    metrics = metrics.map((m, i) => ({ trend: [0,0,0,m.value||0], trendL: ["Wk1","Wk2","Wk3","Wk4"], lastUpdated: d(0), links: [], ...m, id: m.id || `m${i+1}` }));
    const enabledOutputs = data.enabledOutputs?.length ? data.enabledOutputs : [
      { type: "weekly", label: "Weekly Update", frequency: "weekly", audience: "Project Team" },
      { type: "monthly", label: "Monthly Report", frequency: "monthly", audience: "Programme Board" },
      { type: "quarterly", label: "Quarterly SteerCo Pack", frequency: "quarterly", audience: "Executive" },
    ];
    onComplete({
      programme: { name: p.name || "Unnamed Programme", type: p.type || "transformation", sponsor: p.sponsor || "TBC", objective: p.objective || "", vision: p.vision || "", phase: p.phase || "Discovery", startDate: p.startDate || d(0), endDate: p.endDate || d(180), sro: p.sro || p.sponsor || "TBC", governance: p.governance || "", enabledOutputs, blueprint: { currentState: "", targetState: "" } },
      tasks, risks, raidItems, calendarEvents: data.calendarEvents || [], metrics, benefits, stakeholders: data.stakeholders || [],
    });
  }

  function skipSetup() {
    buildState({ programme: { name: "My Programme" }, enabledOutputs: [] });
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg0)", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "var(--bg1)", borderBottom: "1px solid var(--border)", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 28, height: 28, background: "var(--accent)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#000", fontFamily: "var(--font-d)" }}>◆</div>
          <div>
            <div style={{ fontSize: 16, fontFamily: "var(--font-d)", fontWeight: 800, color: "var(--text)" }}>APEX</div>
            <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", letterSpacing: "0.1em" }}>Programme Setup</div>
          </div>
        </div>
        <button onClick={skipSetup} style={{ fontSize: 12, fontFamily: "var(--font-d)", color: "var(--text3)", padding: "6px 14px", border: "1px solid var(--border2)", borderRadius: 5 }}>Skip to Dashboard →</button>
      </div>

      <div style={{ flex: 1, maxWidth: 800, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
          {messages.map((m, i) => (
            <div key={i} className="fu" style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", animationDelay: `${i * 0.02}s` }}>
              {m.role === "assistant" && <div style={{ width: 24, height: 24, borderRadius: 4, background: "var(--accent)", marginRight: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#000", fontFamily: "var(--font-d)", marginTop: 2 }}>◆</div>}
              <div style={{ maxWidth: "80%", padding: "12px 16px", borderRadius: m.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px", background: m.role === "user" ? "rgba(42,191,191,0.15)" : "var(--bg3)", border: `1px solid ${m.role === "user" ? "rgba(42,191,191,0.3)" : "var(--border)"}`, fontSize: 14, fontFamily: "var(--font-b)", color: "var(--text)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{m.content}</div>
            </div>
          ))}
          {loading && <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 24, height: 24, borderRadius: 4, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#000", fontFamily: "var(--font-d)" }}>◆</div><Spinner /></div>}
          <div ref={bottomRef} />
        </div>

        {/* File drop zone */}
        <div style={{ padding: "0 24px 8px" }}>
          <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={e => { e.preventDefault(); setDragOver(false); setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]); }} onClick={() => fileRef.current?.click()} style={{ border: `2px dashed ${dragOver ? "var(--accent)" : files.length ? "var(--green)" : "var(--border2)"}`, borderRadius: 8, padding: "12px", textAlign: "center", background: dragOver ? "rgba(42,191,191,0.05)" : "var(--bg2)", cursor: "pointer", transition: "all 0.2s" }}>
            <input ref={fileRef} type="file" multiple style={{ display: "none" }} onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files)])} />
            <div style={{ fontSize: 13, fontFamily: "var(--font-b)", color: files.length ? "var(--green)" : "var(--text2)" }}>{files.length ? `${files.length} file(s) ready — click Ingest` : "📄 Drop documents here or click to browse"}</div>
          </div>
          {files.length > 0 && <button onClick={ingestFiles} disabled={loading} style={{ marginTop: 8, width: "100%", background: "var(--accent)", color: "#000", borderRadius: 6, padding: "10px", fontFamily: "var(--font-d)", fontWeight: 700, fontSize: 14, opacity: loading ? 0.5 : 1 }}>{loading ? <Spinner s={12} /> : `Ingest ${files.length} File(s)`}</button>}
        </div>

        {/* Input */}
        <div style={{ padding: "8px 24px 16px", display: "flex", gap: 8 }}>
          <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Type here — tell APEX about your programme, what you need, paste content…" rows={2} style={{ flex: 1, background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 8, color: "var(--text)", fontFamily: "var(--font-b)", fontSize: 14, padding: "10px 14px", resize: "none", lineHeight: 1.5 }} />
          <button onClick={() => send()} disabled={loading || !input.trim()} style={{ background: loading || !input.trim() ? "var(--bg3)" : "var(--accent)", color: loading || !input.trim() ? "var(--text3)" : "#000", borderRadius: 8, padding: "0 18px", fontFamily: "var(--font-d)", fontWeight: 700, fontSize: 14, transition: "all 0.2s", minWidth: 52 }}>{loading ? <Spinner /> : "↑"}</button>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// REPORT GENERATOR (shared by all report types)
// ══════════════════════════════════════════════════════════════════════════════
const ReportGenerator = ({ reportType, label, state, onClose }) => {
  const { programme, tasks, risks, metrics, benefits = [], raidItems = [], calendarEvents = [] } = state;
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const g = ragCount(metrics, "green"), a = ragCount(metrics, "amber");
  const phi = metrics.length ? Math.round((g * 100 + a * 50) / metrics.length) : 0;
  const phiC = phi >= 70 ? "#5DC484" : phi >= 50 ? "#F5C544" : "#E8734A";

  useEffect(() => { generate(); }, []);

  async function generate() {
    setLoading(true);
    const SYS = reportType === "weekly" ?
      `Write a concise Weekly Project Update. Structure: ## HEADLINE (one-line RAG + status), ## THIS WEEK — PROGRESS (3-5 bullets of completed work, labelled by project/area), ## NEXT WEEK — PRIORITIES (3-4 bullets, labelled by project/area), ## WATCH ITEMS (emerging risks), ## DECISIONS NEEDED. Reference projects/areas by name.` :
      reportType === "monthly" ?
      `Write a detailed Monthly Programme Report. Structure: ## EXECUTIVE SUMMARY (paragraph with RAG), ## PROGRESS BY WORKSTREAM (for each workstream: status, achievements, next steps — labelled clearly), ## FINANCIAL STATUS (budget utilisation, variances), ## METRICS & KPI DASHBOARD (list each metric with value vs target and trend), ## BENEFITS TRACKING (per benefit: status, baseline vs target, trajectory), ## RISKS & ISSUES (top risks with mitigation and owner), ## DEPENDENCIES & BLOCKERS, ## UPCOMING MILESTONES (next 30 days), ## DECISIONS REQUIRED. Cross-reference workstreams throughout.` :
      `Write a Quarterly SteerCo / Programme Board Pack. Structure: ## EXECUTIVE SUMMARY (one paragraph, authoritative), ## PROGRAMME HEALTH (table: Schedule/Budget/Scope/Benefits/Risks each with RAG + rationale), ## QUARTER IN REVIEW (key achievements by workstream), ## PROGRESS VS BASELINE (milestones hit/missed, % complete, variance), ## FINANCIAL SUMMARY (spend to date, forecast, variance), ## BENEFITS REALISATION (per benefit: owner, baseline → target → current, RAG), ## RISK PROFILE (top 5 risks with impact/likelihood/mitigation/owner), ## DECISIONS REQUIRED (specific asks of the Board), ## FORWARD LOOK (next quarter priorities), ## ASKS OF THE BOARD.`;

    const prompt = `Programme: ${programme.name} (${programme.type})\nSponsor: ${programme.sponsor}\nSRO: ${programme.sro}\nPhase: ${programme.phase}\nDate: ${fmtL(d(0))}\nPHI: ${phi}/100\n\nTasks: ${tasks.filter(t=>t.status==="complete").length}/${tasks.length} complete, ${tasks.filter(t=>t.status==="in-progress").length} in progress\nOpen risks: ${risks.filter(r=>r.status==="Open").length}\n\nMETRICS:\n${metrics.map(m=>`- ${m.name}: ${fmtVal(m)} vs ${m.target}${m.unit} [${m.rag}] — ${m.note}`).join("\n")}\n\nTASKS:\n${tasks.slice(0,15).map(t=>`- [${t.status}] ${t.phase}: ${t.name} (${t.owner}) ${t.progress}%`).join("\n")}\n\nRISKS:\n${risks.filter(r=>r.status==="Open").map(r=>`- [${r.impact}] ${r.title} — ${r.mitigation} (${r.owner})`).join("\n")||"None"}\n\nBENEFITS:\n${benefits.map(b=>`- ${b.title} (${b.type}) [${b.status}] Owner: ${b.owner} — ${b.baseline}${b.unit} → ${b.target}${b.unit}`).join("\n")||"None defined"}\n\nRAID:\n${raidItems.filter(i=>i.status!=="Closed").slice(0,8).map(i=>`- [${i.type}] ${i.title}`).join("\n")||"None"}`;

    try { const r = await aiCall(SYS, [{ role: "user", content: prompt }]); setReport(r); }
    catch (e) { setReport("⚠ Error generating report."); }
    setLoading(false);
  }

  function copy() { navigator.clipboard?.writeText(report || ""); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "min(800px,100%)", height: "min(85vh,780px)", background: "var(--bg1)", border: "1px solid var(--border2)", borderRadius: 12, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.8)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", background: "var(--bg2)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>📊 {label}</div>
            <div style={{ fontSize: 15, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)" }}>{programme.name} · {fmtL(d(0))}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", background: `${phiC}15`, border: `1px solid ${phiC}40`, borderRadius: 20 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: phiC }} />
              <span style={{ fontSize: 11, fontFamily: "var(--font-m)", color: phiC, fontWeight: 600 }}>PHI {phi}</span>
            </div>
            {report && <button onClick={copy} style={{ fontSize: 12, padding: "6px 14px", background: "rgba(42,191,191,0.15)", border: "1px solid rgba(42,191,191,0.3)", borderRadius: 6, color: "var(--accent)" }}>{copied ? "Copied ✓" : "Copy"}</button>}
            {report && <button onClick={generate} disabled={loading} style={{ fontSize: 12, padding: "6px 14px", background: "rgba(245,197,68,0.15)", border: "1px solid rgba(245,197,68,0.3)", borderRadius: 6, color: "var(--yellow)" }}>↻ Refresh</button>}
            <button onClick={onClose} style={{ color: "var(--text3)", fontSize: 18, padding: "2px 6px" }}>✕</button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          {loading && <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 14 }}><Spinner s={22} /><div style={{ fontSize: 13, fontFamily: "var(--font-d)", color: "var(--text3)", animation: "shimmer 1.5s infinite" }}>Generating {label.toLowerCase()}…</div></div>}
          {report && !loading && report.split(/^##\s/m).filter(Boolean).map((sec, i) => {
            const lines = sec.split("\n"); const title = lines[0].trim(); const body = lines.slice(1).join("\n").trim();
            return (<div key={i} style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 12, fontFamily: "var(--font-d)", fontWeight: 700, color: i === 0 ? phiC : "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{title}</div>
              <div style={{ fontSize: 14, fontFamily: "var(--font-b)", color: "var(--text)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                {body.split("\n").map((line, j) => line.startsWith("- ") ? <div key={j} style={{ display: "flex", gap: 8, marginBottom: 4 }}><span style={{ color: "var(--accent)", flexShrink: 0 }}>·</span><span>{line.slice(2)}</span></div> : <p key={j} style={{ marginBottom: 4 }}>{line}</p>)}
              </div>
            </div>);
          })}
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD — 5 tabs
// ══════════════════════════════════════════════════════════════════════════════
const Dashboard = ({ state, setState }) => {
  const { programme, tasks, risks, metrics, raidItems = [], calendarEvents = [], benefits = [], stakeholders = [] } = state;
  const setTasks = fn => setState(p => ({ ...p, tasks: typeof fn === "function" ? fn(p.tasks) : fn }));
  const setRisks = fn => setState(p => ({ ...p, risks: typeof fn === "function" ? fn(p.risks) : fn }));
  const setMetrics = fn => setState(p => ({ ...p, metrics: typeof fn === "function" ? fn(p.metrics) : fn }));
  const setRAID = fn => setState(p => ({ ...p, raidItems: typeof fn === "function" ? fn(p.raidItems || []) : fn }));
  const setBenefits = fn => setState(p => ({ ...p, benefits: typeof fn === "function" ? fn(p.benefits || []) : fn }));

  const [tab, setTab] = useState("updates");
  const [selTask, setSelTask] = useState(null);
  const [openReport, setOpenReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([{ role: "assistant", content: `Programme "${programme.name}" is loaded.\n\n${tasks.length} tasks · ${risks.filter(r => r.status === "Open").length} open risks · ${metrics.length} metrics · ${benefits.length} benefits tracked.\n\nAsk me anything — "Brief me for steerco", "Which benefits are at risk?", "What should I tell Legal?", or describe updates to apply.` }]);
  const [input, setInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [contextView, setContextView] = useState(null);
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const g = ragCount(metrics, "green"), a = ragCount(metrics, "amber"), r = ragCount(metrics, "red");
  const phi = metrics.length ? Math.round((g * 100 + a * 50) / metrics.length) : 0;
  const phiC = phi >= 70 ? "#5DC484" : phi >= 50 ? "#F5C544" : "#E8734A";
  const openRisks = risks.filter(r => r.status === "Open").length;

  const TABS = [
    { id: "updates", label: "Programme Updates", icon: "📋" },
    { id: "metrics", label: "Metrics & KPIs", icon: "📊" },
    { id: "plan", label: "Plan View", icon: "📐" },
    { id: "risks", label: "Risks & Mitigations", icon: "⚠" },
    { id: "command", label: "◆ Command", icon: "◆" },
  ];

  // Updates sub-view
  const [updateView, setUpdateView] = useState("weekly");

  // AI Command
  const SYSTEM = `You are APEX Command Intelligence for "${programme.name}" (${programme.type}, ${programme.phase}).
Sponsor: ${programme.sponsor}. SRO: ${programme.sro}.
TASKS: ${JSON.stringify(tasks.map(t => ({ id: t.id, name: t.name, status: t.status, progress: t.progress, owner: t.owner, phase: t.phase, end: t.end })))}
RISKS: ${JSON.stringify(risks)}
METRICS: ${JSON.stringify(metrics.map(m => ({ id: m.id, name: m.name, family: m.family, value: m.value, target: m.target, unit: m.unit, rag: m.rag })))}
BENEFITS: ${JSON.stringify(benefits.map(b => ({ id: b.id, title: b.title, type: b.type, owner: b.owner, status: b.status })))}
CALENDAR: ${JSON.stringify(calendarEvents)}
RAID: ${JSON.stringify(raidItems.slice(0, 15))}

Respond conversationally (max 200 words, senior PMO tone). If the user asks for a focused view, include:
\`\`\`json
{"contextView":{"title":"...","sections":[{"title":"...","type":"tasks|risks|metrics|benefits|text","taskIds":[],"riskIds":[],"metricIds":[],"benefitIds":[],"content":"...","commentary":"..."}]}}
\`\`\`
If updates are described:
\`\`\`json
{"taskUpdates":[],"newRisks":[],"riskUpdates":[],"metricUpdates":[],"benefitUpdates":[]}
\`\`\``;

  async function sendCommand() {
    if (!input.trim() || aiLoading) return;
    const nMsgs = [...messages, { role: "user", content: input.trim() }];
    setMessages(nMsgs); setInput(""); setAiLoading(true);
    try {
      const reply = await aiCall(SYSTEM, nMsgs.map(m => ({ role: m.role, content: m.content })));
      const cvMatch = reply.match(/```json\s*(\{"contextView"[\s\S]*?\})\s*```/);
      if (cvMatch) { try { setContextView(JSON.parse(cvMatch[1]).contextView); } catch (e) {} }
      const jm = reply.match(/```json\s*(\{"(?:taskUpdates|newRisks|riskUpdates|metricUpdates|benefitUpdates)[\s\S]*?\})\s*```/);
      if (jm) { try {
        const u = JSON.parse(jm[1]);
        if (u.taskUpdates?.length) setTasks(prev => prev.map(t => { const up = u.taskUpdates.find(x => x.id === t.id); return up ? { ...t, ...up } : t; }));
        if (u.newRisks?.length) setRisks(prev => [...prev, ...u.newRisks]);
        if (u.metricUpdates?.length) setMetrics(prev => prev.map(m => { const up = u.metricUpdates.find(x => x.id === m.id); if (!up) return m; return { ...m, ...up, trend: [...(m.trend||[]).slice(1), up.value ?? m.value], lastUpdated: d(0) }; }));
        if (u.benefitUpdates?.length) setBenefits(prev => prev.map(b => { const up = u.benefitUpdates.find(x => x.id === b.id); return up ? { ...b, ...up } : b; }));
      } catch (e) {} }
      setMessages(prev => [...prev, { role: "assistant", content: reply.replace(/```json[\s\S]*?```/g, "").trim() }]);
    } catch (e) { setMessages(prev => [...prev, { role: "assistant", content: "⚠ AI engine error." }]); }
    setAiLoading(false);
  }

  // Gantt setup
  const GW = 70, gS = new Date(today); gS.setDate(gS.getDate() - 14);
  const todayPct = (daysBetween(gS, today) / GW) * 100;
  const phases = [...new Set(tasks.map(t => t.phase))];
  const wkL = []; for (let i = 0; i <= GW; i += 7) { const dt = new Date(gS); dt.setDate(dt.getDate() + i); wkL.push({ pct: (i / GW) * 100, label: fmt(dt.toISOString().split("T")[0]) }); }

  const SUGGESTED = ["Brief me for steerco", "Which benefits are at risk?", "What's blocking progress?", "Summarise this week's achievements", "What should I tell the CFO?"];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg0)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: "var(--bg1)", borderBottom: "1px solid var(--border)", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52, flexShrink: 0, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 28, height: 28, background: "var(--accent)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#000", fontFamily: "var(--font-d)" }}>◆</div>
          <div>
            <div style={{ fontSize: 15, fontFamily: "var(--font-d)", fontWeight: 800, color: "var(--text)" }}>{programme.name}</div>
            <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--accent)" }}>{programme.type} · {programme.phase}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#5DC484", animation: "blink 2s infinite" }} />
          <span style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "#5DC484" }}>LIVE</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: "var(--bg1)", borderBottom: "1px solid var(--border)", padding: "0 12px", flexShrink: 0, overflowX: "auto" }}>
        {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "12px 18px", fontSize: 13, fontFamily: "var(--font-d)", fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? "var(--text)" : "var(--text2)", borderBottom: tab === t.id ? "3px solid var(--accent)" : "3px solid transparent", background: tab === t.id ? "rgba(42,191,191,0.05)" : "none", transition: "all 0.15s", whiteSpace: "nowrap", cursor: "pointer" }}>{t.icon} {t.label}</button>)}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, display: tab === "command" ? "flex" : "block", flexDirection: "column", overflow: tab === "command" ? "hidden" : "auto" }}>

        {/* ── TAB 1: PROGRAMME UPDATES ── */}
        {tab === "updates" && <div style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)" }}>Programme Updates</div>
            <div style={{ display: "flex", gap: 6 }}>
              {[["weekly","Weekly"],["monthly","Monthly"],["quarterly","Quarterly"]].map(([k,l]) => (
                <button key={k} onClick={() => setUpdateView(k)} style={{ fontSize: 12, fontFamily: "var(--font-d)", padding: "6px 16px", borderRadius: 6, fontWeight: updateView === k ? 700 : 500, color: updateView === k ? "#000" : "var(--text2)", background: updateView === k ? "var(--accent)" : "var(--bg3)", border: `1px solid ${updateView === k ? "var(--accent)" : "var(--border2)"}`, transition: "all 0.15s" }}>{l}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            {[{ l: "Complete", v: tasks.filter(t => t.status === "complete").length, c: "#5DC484" }, { l: "In Progress", v: tasks.filter(t => t.status === "in-progress").length, c: "#F5C544" }, { l: "Open Risks", v: openRisks, c: "#E8734A" }, { l: "Benefits", v: benefits.length, c: "#5DC484" }, { l: "PHI", v: phi, c: phiC }].map((s, i) => (
              <div key={i} style={{ flex: 1, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: 22, fontFamily: "var(--font-d)", fontWeight: 700, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 11, fontFamily: "var(--font-b)", color: "var(--text2)", marginTop: 3 }}>{s.l}</div>
              </div>
            ))}
          </div>
          <button onClick={() => setOpenReport(updateView)} style={{ width: "100%", background: "var(--accent)", color: "#000", borderRadius: 8, padding: "14px", fontFamily: "var(--font-d)", fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Generate {updateView === "weekly" ? "Weekly Update" : updateView === "monthly" ? "Monthly Report" : "Quarterly SteerCo Pack"}</button>
          {/* Quick view of tasks by phase */}
          {phases.map(phase => (
            <div key={phase} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--accent)", marginBottom: 6 }}>◆ {phase}</div>
              {tasks.filter(t => t.phase === phase).map(task => {
                const meta = STATUS_META[task.status] || STATUS_META["not-started"];
                return (
                  <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", marginBottom: 4, background: "var(--bg2)", borderRadius: 6, border: "1px solid var(--border)", borderLeft: `3px solid ${meta.color}` }}>
                    <Badge status={task.status} />
                    <span style={{ fontSize: 13, fontFamily: "var(--font-b)", color: "var(--text)", flex: 1 }}>{task.name}</span>
                    <span style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text2)" }}>{task.owner}</span>
                    <span style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text3)" }}>{fmt(task.end)}</span>
                    <span style={{ fontSize: 12, fontFamily: "var(--font-m)", color: meta.color }}>{task.progress}%</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>}

        {/* ── TAB 2: METRICS & KPIs ── */}
        {tab === "metrics" && <div style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 18, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>Metrics & KPIs</div>
          <div style={{ fontSize: 13, fontFamily: "var(--font-b)", color: "var(--text2)", marginBottom: 16 }}>Benefits tracking and progress metrics</div>
          {/* Benefits strip */}
          {benefits.length > 0 && <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontFamily: "var(--font-d)", fontWeight: 700, color: "#5DC484", marginBottom: 8 }}>✚ Benefits ({benefits.filter(b => b.status === "realised").length}/{benefits.length} realised)</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 10 }}>
              {benefits.map(b => { const st = BENEFIT_STATUS[b.status] || BENEFIT_STATUS.planned; const tm = BENEFIT_TYPES[b.type] || BENEFIT_TYPES.operational; return (
                <div key={b.id} className="fu" style={{ background: "var(--bg2)", border: `1px solid ${tm.color}30`, borderLeft: `3px solid ${tm.color}`, borderRadius: 6, padding: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontFamily: "var(--font-m)", color: tm.color, textTransform: "uppercase" }}>{tm.label}</span>
                    <span style={{ fontSize: 11, fontFamily: "var(--font-m)", color: st.color, background: st.bg, padding: "2px 6px", borderRadius: 3 }}>{st.label}</span>
                  </div>
                  <div style={{ fontSize: 13, fontFamily: "var(--font-b)", color: "var(--text)", fontWeight: 600, marginBottom: 4 }}>{b.title}</div>
                  <div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text2)" }}>{b.baseline}{b.unit} → {b.target}{b.unit} · {b.owner}</div>
                </div>
              ); })}
            </div>
          </div>}
          {/* Metric cards */}
          <div style={{ fontSize: 14, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>KPI Tracker</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 10 }}>
            {metrics.map((m, i) => { const fam = FAMILIES[m.family] || FAMILIES.delivery; const rag = RAG[m.rag] || RAG.amber; const pct = progPct(m); return (
              <div key={m.id} className="fu" style={{ animationDelay: `${i*0.02}s`, background: "var(--bg2)", border: "1px solid var(--border)", borderTop: `3px solid ${rag.color}`, borderRadius: 8, padding: "14px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div><div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: fam.color, textTransform: "uppercase" }}>{fam.icon} {fam.label}</div><div style={{ fontSize: 13, fontFamily: "var(--font-b)", color: "var(--text)", fontWeight: 600, marginTop: 2 }}>{m.name}</div></div>
                  <div style={{ textAlign: "right" }}><div style={{ fontSize: 20, fontFamily: "var(--font-d)", fontWeight: 800, color: rag.color }}>{fmtVal(m)}</div><div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)" }}>of {m.target}{m.unit}</div></div>
                </div>
                <div style={{ background: "var(--bg0)", borderRadius: 4, height: 4, overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: rag.color, borderRadius: 4, transition: "width 0.5s" }} /></div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}><span style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text2)" }}>{m.note}</span><Spark data={m.trend} color={rag.color} positive={m.direction === "higher"} /></div>
              </div>
            ); })}
          </div>
        </div>}

        {/* ── TAB 3: PLAN VIEW (Gantt) ── */}
        {tab === "plan" && <div style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 18, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>Plan View</div>
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}><div style={{ width: 220, minWidth: 220, padding: "6px 12px", fontSize: 12, fontFamily: "var(--font-d)", fontWeight: 600, color: "var(--text2)" }}>Task</div><div style={{ flex: 1, position: "relative", height: 28 }}>{wkL.map((w, i) => <span key={i} style={{ position: "absolute", left: `${w.pct}%`, fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", transform: "translateX(-50%)", top: 6, whiteSpace: "nowrap" }}>{w.label}</span>)}</div></div>
            {phases.map(phase => (<div key={phase}>
              <div style={{ padding: "6px 12px", background: "var(--bg3)", borderBottom: "1px solid var(--border)" }}><span style={{ fontSize: 12, fontFamily: "var(--font-d)", color: "var(--accent)", fontWeight: 700 }}>◆ {phase}</span></div>
              {tasks.filter(t => t.phase === phase).map(task => {
                const left = Math.max(0, daysBetween(gS, new Date(task.start))), width = Math.max(1, daysBetween(new Date(task.start), new Date(task.end)));
                const lp = (left / GW) * 100, wp = (width / GW) * 100, meta = STATUS_META[task.status] || STATUS_META["not-started"];
                return (<div key={task.id} style={{ display: "flex", alignItems: "center", borderBottom: "1px solid var(--border)", minHeight: 36, background: "var(--bg1)" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bg2)"} onMouseLeave={e => e.currentTarget.style.background = "var(--bg1)"}>
                  <div style={{ width: 220, minWidth: 220, padding: "0 12px", display: "flex", alignItems: "center", gap: 6 }}><Badge status={task.status} /><span style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.name}</span></div>
                  <div style={{ flex: 1, position: "relative", height: 36 }}>
                    {wkL.map((w, i) => <div key={i} style={{ position: "absolute", left: `${w.pct}%`, top: 0, bottom: 0, borderLeft: "1px solid var(--border)" }} />)}
                    {todayPct >= 0 && todayPct <= 100 && <div style={{ position: "absolute", left: `${todayPct}%`, top: 0, bottom: 0, borderLeft: "2px dashed var(--accent)", zIndex: 2, opacity: 0.7 }} />}
                    {left < GW && left + width > 0 && <div onClick={() => setSelTask(task)} style={{ position: "absolute", left: `${Math.max(0, lp)}%`, width: `${Math.min(wp, 100 - Math.max(0, lp))}%`, top: "50%", transform: "translateY(-50%)", height: 20, background: meta.bg, border: `1px solid ${meta.color}55`, borderLeft: `3px solid ${meta.color}`, borderRadius: 4, overflow: "hidden", cursor: "pointer" }} onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.3)"} onMouseLeave={e => e.currentTarget.style.filter = "brightness(1)"}><div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${task.progress}%`, background: `${meta.color}25` }} /><span style={{ position: "relative", zIndex: 1, fontSize: 10, fontFamily: "var(--font-m)", color: meta.color, paddingLeft: 5, lineHeight: "20px", whiteSpace: "nowrap" }}>{task.name}</span></div>}
                  </div>
                </div>);
              })}
            </div>))}
          </div>
        </div>}

        {/* ── TAB 4: RISKS & MITIGATIONS ── */}
        {tab === "risks" && <div style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 18, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)" }}>Risks & Mitigations</div>
              <div style={{ fontSize: 13, fontFamily: "var(--font-b)", color: "var(--text2)" }}>{risks.length} total · {openRisks} open</div>
            </div>
          </div>
          {risks.length === 0 && <div style={{ textAlign: "center", padding: 40, fontSize: 14, color: "var(--text3)" }}>No risks recorded yet. Use the Command tab to add risks via natural language.</div>}
          {risks.map((rk, i) => {
            const impColor = { High: "#E8734A", Medium: "#F5C544", Low: "#5DC484" }[rk.impact] || "var(--text3)";
            const needsAction = rk.impact === "High" && rk.status === "Open";
            return (
              <div key={rk.id} className="fu" style={{ animationDelay: `${i * 0.02}s`, background: needsAction ? "rgba(232,115,74,0.08)" : "var(--bg2)", border: `1px solid ${needsAction ? "rgba(232,115,74,0.3)" : "var(--border)"}`, borderLeft: `4px solid ${impColor}`, borderRadius: 8, padding: "14px 16px", marginBottom: 8 }}>
                {needsAction && <div style={{ fontSize: 11, fontFamily: "var(--font-d)", color: "#E8734A", fontWeight: 700, marginBottom: 6 }}>⚠ ACTION REQUIRED</div>}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontFamily: "var(--font-m)", color: impColor, fontWeight: 700, textTransform: "uppercase" }}>▲ {rk.impact}</span>
                      <span style={{ fontSize: 14, fontFamily: "var(--font-b)", fontWeight: 600, color: "var(--text)" }}>{rk.title}</span>
                      <span style={{ fontSize: 11, fontFamily: "var(--font-m)", color: rk.status === "Mitigated" ? "#5DC484" : "#F5C544", background: rk.status === "Mitigated" ? "rgba(93,196,132,0.12)" : "rgba(245,197,68,0.12)", padding: "2px 8px", borderRadius: 4 }}>{rk.status}</span>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}><span style={{ color: "var(--text3)", fontWeight: 600 }}>Mitigation: </span>{rk.mitigation}</p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontFamily: "var(--font-m)", color: "var(--blue)" }}>{rk.owner}</div>
                    <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", marginTop: 2 }}>L'hood: {rk.likelihood}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>}

        {/* ── TAB 5: COMMAND ── */}
        {tab === "command" && <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            {contextView && <ContextView view={contextView} tasks={tasks} risks={risks} metrics={metrics} raidItems={raidItems} benefits={benefits} onClose={() => setContextView(null)} onNavigateTask={t => { setTab("plan"); setSelTask(t); }} onOpenMetric={() => setTab("metrics")} onOpenBenefit={() => setTab("metrics")} />}
            {messages.map((m, i) => (<div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              {m.role === "assistant" && <div style={{ width: 24, height: 24, borderRadius: 4, background: "var(--accent)", marginRight: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#000", fontFamily: "var(--font-d)", marginTop: 2 }}>◆</div>}
              <div style={{ maxWidth: "80%", padding: "10px 14px", borderRadius: m.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px", background: m.role === "user" ? "rgba(42,191,191,0.15)" : "var(--bg3)", border: `1px solid ${m.role === "user" ? "rgba(42,191,191,0.3)" : "var(--border)"}`, fontSize: 14, fontFamily: "var(--font-b)", color: "var(--text)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{m.content}</div>
            </div>))}
            {aiLoading && <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 24, height: 24, borderRadius: 4, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#000", fontFamily: "var(--font-d)" }}>◆</div><Spinner /></div>}
            <div ref={bottomRef} />
          </div>
          {/* Suggested questions */}
          <div style={{ padding: "0 20px 8px", display: "flex", gap: 6, flexWrap: "wrap" }}>
            {SUGGESTED.map((q, i) => (
              <button key={i} onClick={() => { setInput(q); }} style={{ fontSize: 12, fontFamily: "var(--font-b)", padding: "6px 12px", background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 20, color: "var(--text2)", transition: "all 0.15s", cursor: "pointer" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border2)"; e.currentTarget.style.color = "var(--text2)"; }}>{q}</button>
            ))}
          </div>
          <div style={{ padding: "8px 20px 16px", borderTop: "1px solid var(--border)", background: "var(--bg2)", display: "flex", gap: 8, flexShrink: 0 }}>
            <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendCommand(); } }} placeholder="Ask anything — 'Brief me for steerco', 'What's blocking?', or describe updates…" rows={2} style={{ flex: 1, background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 8, color: "var(--text)", fontFamily: "var(--font-b)", fontSize: 14, padding: "10px 14px", resize: "none", lineHeight: 1.5 }} />
            <button onClick={sendCommand} disabled={aiLoading || !input.trim()} style={{ background: aiLoading || !input.trim() ? "var(--bg3)" : "var(--accent)", color: aiLoading || !input.trim() ? "var(--text3)" : "#000", borderRadius: 8, padding: "0 18px", fontFamily: "var(--font-d)", fontWeight: 700, fontSize: 14, transition: "all 0.2s", minWidth: 52 }}>{aiLoading ? <Spinner /> : "↑"}</button>
          </div>
        </div>}
      </div>

      {/* Report overlay */}
      {openReport && <ReportGenerator reportType={openReport} label={openReport === "weekly" ? "Weekly Project Update" : openReport === "monthly" ? "Monthly Programme Report" : "Quarterly SteerCo Pack"} state={state} onClose={() => setOpenReport(null)} />}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════════════════════
export default function APEX() {
  const [screen, setScreen] = useState("setup");
  const [state, setState] = useState(null);

  return screen === "setup"
    ? <GuidedSetup onComplete={s => { setState(s); setScreen("dashboard"); }} />
    : <Dashboard state={state} setState={setState} />;
}
