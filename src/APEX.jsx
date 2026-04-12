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
// ONBOARDING WIZARD (enhanced with clarifying questions)
// ══════════════════════════════════════════════════════════════════════════════
const OnboardingWizard = ({ onComplete, onCancel, isModal = false }) => {
  const [stageIdx, setStageIdx] = useState(0);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [collected, setCollected] = useState({});
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const [questions, setQuestions] = useState([]);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);
  const stage = STAGES[stageIdx];

  useEffect(() => {
    if (stage.id === "documents") {
      setMessages(prev => [...prev, { role: "assistant", content: "Welcome to APEX. Let's start by ingesting your programme documents.\n\nDrop files below or paste content — I'll extract everything I can find: tasks, risks, benefits, metrics, people, dates, and more. This pre-populates all the other tabs.\n\nSupported: .txt .csv .md .docx .xlsx .pdf .ics\n\nYou can also type or paste text directly. Click 'Skip →' to set up manually instead.", stageId: stage.id }]);
    } else { openStage(); }
  }, [stageIdx]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, preview, questions]);

  function ctx() { return Object.entries(collected).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join("\n") || "Not yet established."; }

  async function openStage() {
    setLoading(true);
    try {
      const sys = stage.prompt.replace("PROGRAMME_CONTEXT", ctx()).replace(/TODAY/g, d(0));
      const reply = await aiCall(sys, [{ role: "user", content: `Begin Stage ${stage.num}.` }]);
      setMessages(prev => [...prev, { role: "assistant", content: reply.replace(/```json[\s\S]*?```/g, "").trim(), stageId: stage.id }]);
    } catch (e) { setMessages(prev => [...prev, { role: "assistant", content: "⚠ AI engine connection error.", stageId: stage.id }]); }
    setLoading(false);
  }

  async function send(override) {
    const content = override || input.trim(); if (!content || loading) return;
    const hist = [...messages, { role: "user", content, stageId: stage.id }];
    setMessages(hist); if (!override) setInput(""); setLoading(true);
    try {
      const sys = stage.prompt.replace("PROGRAMME_CONTEXT", ctx()).replace(/TODAY/g, d(0));
      const apiMsgs = hist.filter(m => m.stageId === stage.id).map(m => ({ role: m.role, content: m.content }));
      const reply = await aiCall(sys, apiMsgs);
      const jm = reply.match(/```json\s*([\s\S]*?)```/);
      if (jm) {
        const parsed = JSON.parse(jm[1]);
        if (parsed.complete && parsed.stage === stage.id) {
          const nc = { ...collected, [stage.id]: parsed.data };
          setCollected(nc);
          const clean = reply.replace(/```json[\s\S]*?```/g, "").trim();
          if (stage.id === "documents" && parsed.data) {
            if (parsed.data.questions?.length) setQuestions(parsed.data.questions);
            setPreview(parsed.data);
            setMessages(prev => [...prev, { role: "assistant", content: clean || "Extraction complete. Review and confirm.", stageId: stage.id }]);
            setLoading(false); return;
          }
          setMessages(prev => [...prev, { role: "assistant", content: clean || `Stage ${stage.num} complete.`, stageId: stage.id }]);
          setLoading(false);
          setTimeout(() => { if (stageIdx < STAGES.length - 1) setStageIdx(s => s + 1); else finalise(nc); }, 900);
          return;
        }
      }
      setMessages(prev => [...prev, { role: "assistant", content: reply.replace(/```json[\s\S]*?```/g, "").trim(), stageId: stage.id }]);
    } catch (e) { setMessages(prev => [...prev, { role: "assistant", content: "⚠ AI engine error.", stageId: stage.id }]); }
    setLoading(false);
  }

  async function ingestFiles() {
    if (!files.length) return; setLoading(true);
    let combined = "";
    for (const f of files) { const t = await readFile(f); combined += `\n\n=== FILE: ${f.name} ===\n${t.slice(0, 12000)}`; }
    setFiles([]);
    await send(`Please analyse these documents and extract all programme data:\n${combined}`);
  }

  function skip() { const nc = { ...collected, [stage.id]: {} }; setCollected(nc); if (stageIdx < STAGES.length - 1) setStageIdx(s => s + 1); else finalise(collected); }
  function confirmExtract() { setPreview(null); setQuestions([]); if (stageIdx < STAGES.length - 1) setStageIdx(s => s + 1); else finalise(collected); }

  function finalise(all) {
    const out = all.outputs || {}, vis = all.vision || {}, bp = all.blueprint || {}, org = all.organisation || {}, ben = all.benefits || {}, doc = all.documents || {}, met = all.metrics || {};
    // Default to all 3 primary outputs if user skipped the Outputs stage
    const enabledOutputs = out.enabledOutputs && out.enabledOutputs.length ? out.enabledOutputs : [
      { type: "steerco", frequency: "monthly", audience: "Programme Board", nextDue: d(14) },
      { type: "highlight", frequency: "weekly", audience: "Sponsor", nextDue: d(7) },
      { type: "benefits", frequency: "quarterly", audience: "Executive Committee", nextDue: d(60) },
    ];
    let tasks = doc.tasks || [];
    if (!tasks.length) { const wss = bp.workstreams || ["Discovery", "Delivery", "Close-out"]; tasks = wss.flatMap((ws, pi) => [{ id: `t${pi * 2 + 1}`, phase: ws, name: `${ws} — Initiation`, start: d(pi * 14), end: d(pi * 14 + 10), status: "not-started", owner: org.leads?.[0]?.name || "TBC", progress: 0, deps: [] }, { id: `t${pi * 2 + 2}`, phase: ws, name: `${ws} — Delivery`, start: d(pi * 14 + 10), end: d(pi * 14 + 24), status: "not-started", owner: org.leads?.[1]?.name || org.leads?.[0]?.name || "TBC", progress: 0, deps: [`t${pi * 2 + 1}`] }]); }
    let risks = doc.risks || [{ id: "r1", title: "Scope not fully defined", impact: "High", likelihood: "Medium", status: "Open", owner: org.leads?.[0]?.name || "TBC", mitigation: "Complete scope workshop." }, { id: "r2", title: "Resource availability", impact: "Medium", likelihood: "Medium", status: "Open", owner: vis.sponsor || "TBC", mitigation: "Confirm allocation." }];
    let raidItems = doc.raidItems || [];
    let calendarEvents = doc.calendarEvents || [];
    let benefits = ben.benefits || doc.benefits || [];
    if (!benefits.length) benefits = [
      { id: "b1", title: "Cost reduction", description: "Reduce total operating cost vs baseline.", type: "financial", owner: vis.sponsor || "TBC", measurementKPI: "Annualised run-rate savings", baseline: 0, target: 0, unit: "£m", expectedRealisation: bp.endDate || d(180), tranche: "Programme close", status: "planned", confidence: "low" },
      { id: "b2", title: "Process efficiency", description: "Reduce average cycle time for target processes.", type: "operational", owner: org.leads?.[0]?.name || "TBC", measurementKPI: "Cycle time (days)", baseline: 0, target: 0, unit: "%", expectedRealisation: bp.endDate || d(180), tranche: "Delivery", status: "planned", confidence: "low" },
    ];
    benefits = benefits.map((b, i) => ({ ...b, id: b.id || `b${i + 1}`, actualRealisation: b.actualRealisation || null, status: b.status || "planned" }));
    let stakeholders = org.stakeholders || [];
    let metrics = met.metrics || doc.metrics || [];
    if (!metrics.length) metrics = [
      { id: "m1", family: "delivery", name: "Milestone Adherence", value: 0, target: 85, unit: "%", direction: "higher", rag: "green", trend: [0, 0, 0, 0], trendL: ["Wk1", "Wk2", "Wk3", "Wk4"], note: "Baseline.", lastUpdated: d(0), links: [] },
      { id: "m2", family: "financial", name: "Budget Utilisation", value: 0, target: 100, unit: "%", direction: "neutral", rag: "green", trend: [0, 0, 0, 0], trendL: ["Wk1", "Wk2", "Wk3", "Wk4"], note: "Baseline.", lastUpdated: d(0), links: [] },
      { id: "m3", family: "risk", name: "Open High-Impact Risks", value: risks.filter(r => r.impact === "High" && r.status === "Open").length, target: 0, unit: "risks", direction: "lower", rag: "amber", trend: [0, 0, 0, risks.filter(r => r.impact === "High" && r.status === "Open").length], trendL: ["Wk1", "Wk2", "Wk3", "Wk4"], note: "Baseline.", lastUpdated: d(0), links: [] },
    ];
    metrics = metrics.map((m, i) => ({ trend: [0, 0, 0, m.value || 0], trendL: ["Wk1", "Wk2", "Wk3", "Wk4"], lastUpdated: d(0), links: [], ...m, id: m.id || `m${i + 1}` }));
    onComplete({
      programme: {
        name: vis.name || "Unnamed Programme",
        type: vis.type || "transformation",
        sponsor: vis.sponsor || "TBC",
        objective: vis.objective || "",
        vision: vis.vision || "",
        phase: bp.currentPhase || "Discovery",
        startDate: bp.startDate || d(0),
        endDate: bp.endDate || d(180),
        blueprint: { currentState: bp.currentState || "", targetState: bp.targetState || "" },
        sro: org.sro || vis.sponsor || "TBC",
        governance: bp.governance || "",
        enabledOutputs,
      },
      tasks, risks, raidItems, calendarEvents, metrics, benefits, stakeholders,
    });
  }

  const stageMsgs = messages.filter(m => m.stageId === stage.id);

  const inner = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg0)" }}>
      <div style={{ background: "var(--bg2)", borderBottom: "1px solid var(--border)", padding: "0 18px", display: "flex", alignItems: "stretch", flexShrink: 0, overflowX: "auto" }}>
        {STAGES.map((s, i) => { const done = collected[s.id] && Object.keys(collected[s.id]).length > 0, active = i === stageIdx, clickable = done || active || i <= stageIdx;
          const col = active ? "var(--accent)" : done ? "#5DC484" : "var(--text2)";
          return (
            <button key={s.id} onClick={() => { if (clickable) setStageIdx(i); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderBottom: active ? "2px solid var(--accent)" : done ? "2px solid #5DC484" : "2px solid transparent", background: "none", cursor: clickable ? "pointer" : "default", opacity: clickable ? 1 : 0.5, transition: "all 0.2s", whiteSpace: "nowrap" }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: done ? "#5DC484" : active ? "var(--accent)" : "var(--bg4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: done || active ? "#000" : "var(--text3)", flexShrink: 0 }}>{done ? "✓" : s.num}</div>
              <span style={{ fontSize: 12, fontFamily: "var(--font-d)", color: col, fontWeight: active ? 700 : 500 }}>{s.label}</span>
            </button>
          );
        })}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7, padding: "0 8px", flexShrink: 0 }}>
          {isModal && onCancel && <button onClick={onCancel} style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text3)", padding: "3px 7px", border: "1px solid var(--border2)", borderRadius: 4 }}>✕</button>}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "13px 18px", display: "flex", flexDirection: "column", gap: 9 }}>
            {stageMsgs.map((m, i) => (
              <div key={i} className="fu" style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", animationDelay: `${i * 0.02}s` }}>
                {m.role === "assistant" && <div style={{ width: 20, height: 20, borderRadius: 3, background: "var(--accent)", marginRight: 6, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#000", fontFamily: "var(--font-d)", marginTop: 2 }}>◆</div>}
                <div style={{ maxWidth: "72%", padding: "8px 12px", borderRadius: m.role === "user" ? "8px 8px 2px 8px" : "8px 8px 8px 2px", background: m.role === "user" ? "rgba(42,191,191,0.12)" : "var(--bg3)", border: `1px solid ${m.role === "user" ? "rgba(42,191,191,0.25)" : "var(--border)"}`, fontSize: 11, fontFamily: "var(--font-b)", color: "var(--text)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{m.content}</div>
              </div>
            ))}
            {questions.length > 0 && (
              <div className="fu" style={{ background: "var(--bg2)", border: "1px solid rgba(245,197,68,0.3)", borderRadius: 8, padding: "12px" }}>
                <div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "#F5C544", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>◆ Clarifying Questions</div>
                {questions.map((q, i) => (
                  <div key={i} style={{ padding: "6px 8px", marginBottom: 4, background: "var(--bg3)", borderRadius: 4, border: "1px solid var(--border)", fontSize: 11, fontFamily: "var(--font-b)", color: "var(--text)", lineHeight: 1.5 }}>
                    <span style={{ color: "#F5C544", fontWeight: 600 }}>Q{i + 1}:</span> {q.question}
                    {q.about && <span style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", marginLeft: 6 }}>re: {q.about}</span>}
                  </div>
                ))}
                <p style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text3)", marginTop: 6 }}>Answer in the chat below, or click Confirm to proceed with defaults.</p>
              </div>
            )}
            {preview && (
              <div className="fu" style={{ background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 9, overflow: "hidden" }}>
                <div style={{ padding: "10px 14px", background: "var(--bg3)", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "#5DC484", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>✓ Extraction Complete</div><div style={{ fontSize: 13, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)" }}>Programme Baseline Ready</div></div>
                  <div style={{ display: "flex", gap: 6 }}><button onClick={confirmExtract} style={{ background: "var(--green)", color: "#000", borderRadius: 5, padding: "6px 13px", fontFamily: "var(--font-d)", fontWeight: 700, fontSize: 10 }}>Confirm & Continue →</button><button onClick={() => setPreview(null)} style={{ border: "1px solid var(--border2)", borderRadius: 5, padding: "6px 10px", color: "var(--text3)", fontSize: 9 }}>Edit</button></div>
                </div>
                <div style={{ padding: "11px 14px", display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8 }}>
                  {[{ l: "Tasks", v: preview.tasks?.length || 0, c: "var(--blue)" }, { l: "Risks", v: preview.risks?.length || 0, c: "var(--orange)" }, { l: "RAID", v: preview.raidItems?.length || 0, c: "var(--violet)" }, { l: "Benefits", v: preview.benefits?.length || 0, c: "var(--green)" }, { l: "Metrics", v: preview.metrics?.length || 0, c: "var(--accent)" }, { l: "Events", v: preview.calendarEvents?.length || 0, c: "var(--yellow)" }].map((s, i) => (
                    <div key={i} style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 5, padding: "8px", textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontFamily: "var(--font-d)", fontWeight: 800, color: s.c }}>{s.v}</div>
                      <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>{s.l}</div>
                    </div>
                  ))}
                </div>
                {preview.summary && <p style={{ margin: "0 14px 11px", fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text2)", lineHeight: 1.6, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 5, padding: "8px 10px" }}>{preview.summary}</p>}
              </div>
            )}
            {loading && <div style={{ display: "flex", alignItems: "center", gap: 7 }}><div style={{ width: 20, height: 20, borderRadius: 3, background: "var(--accent)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#000", fontFamily: "var(--font-d)" }}>◆</div><Spinner /></div>}
            <div ref={bottomRef} />
          </div>

          {stage.id === "documents" && (
            <div style={{ padding: "0 18px 9px" }}>
              <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={e => { e.preventDefault(); setDragOver(false); setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]); }} style={{ border: `2px dashed ${dragOver ? "var(--accent)" : "var(--border2)"}`, borderRadius: 6, padding: "10px", textAlign: "center", background: dragOver ? "rgba(42,191,191,0.05)" : "var(--bg2)", cursor: "pointer", transition: "all 0.2s" }} onClick={() => fileRef.current?.click()}>
                <input ref={fileRef} type="file" multiple style={{ display: "none" }} onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files)])} />
                <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{files.length ? `${files.length} file(s) queued` : "Drop files or click to browse"}</div>
              </div>
              {files.length > 0 && <button onClick={ingestFiles} disabled={loading} style={{ marginTop: 6, width: "100%", background: "var(--accent)", color: "#000", borderRadius: 5, padding: "7px", fontFamily: "var(--font-d)", fontWeight: 700, fontSize: 11, opacity: loading ? 0.5 : 1 }}>{loading ? <Spinner s={11} /> : `Ingest ${files.length} File(s)`}</button>}
            </div>
          )}

          <div style={{ padding: "7px 18px 12px", background: "var(--bg1)", borderTop: "1px solid var(--border)", display: "flex", gap: 6, flexShrink: 0 }}>
            <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={stage.id === "documents" ? "Or paste document content here…" : "Type your response…"} rows={2} style={{ flex: 1, background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 5, color: "var(--text)", fontFamily: "var(--font-b)", fontSize: 11, padding: "7px 9px", resize: "none", lineHeight: 1.5 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <button onClick={() => send()} disabled={loading || !input.trim()} style={{ background: loading || !input.trim() ? "var(--bg3)" : "var(--accent)", color: loading || !input.trim() ? "var(--text3)" : "#000", border: "none", borderRadius: 5, padding: "0 13px", fontFamily: "var(--font-d)", fontWeight: 700, fontSize: 11, flex: 1, minWidth: 44, transition: "all 0.2s" }}>{loading ? <Spinner /> : "↑"}</button>
              <button onClick={skip} style={{ background: "transparent", border: "1px solid var(--border2)", borderRadius: 4, padding: "3px 7px", fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", whiteSpace: "nowrap" }}>Skip →</button>
            </div>
          </div>
        </div>

        <div style={{ width: 190, background: "var(--bg1)", borderLeft: "1px solid var(--border)", padding: "13px", overflowY: "auto", flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Collected so far</div>
          {Object.entries(collected).map(([key, val]) => { const s = STAGES.find(s => s.id === key); if (!s || !val || !Object.keys(val).length) return null; return (
            <div key={key} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "#5DC484", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>✓ {s.label}</div>
              {key === "outputs" && <div style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text2)" }}>{val.enabledOutputs?.length || 0} output{val.enabledOutputs?.length !== 1 ? "s" : ""} enabled</div>}
              {key === "vision" && <><div style={{ fontSize: 12, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>{val.name}</div><div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--accent)", textTransform: "uppercase", marginBottom: 2 }}>{val.type}</div></>}
              {key === "blueprint" && <div style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text2)" }}>{val.scale} · {val.currentPhase}</div>}
              {key === "organisation" && val.leads?.map((l, i) => <div key={i} style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text2)", marginBottom: 1 }}>{l.name} · {l.role}</div>)}
              {key === "benefits" && <div style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text2)" }}>{val.benefits?.length || 0} benefit{val.benefits?.length !== 1 ? "s" : ""}</div>}
            </div>
          ); })}
          {!Object.keys(collected).length && <div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text3)", lineHeight: 1.6 }}>Data appears here as confirmed.</div>}
        </div>
      </div>
    </div>
  );

  if (isModal) return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "min(860px,100%)", height: "min(660px,90vh)", borderRadius: 10, overflow: "hidden", border: "1px solid var(--border2)", boxShadow: "0 24px 80px rgba(0,0,0,0.8)", display: "flex", flexDirection: "column" }}>
        <div style={{ background: "var(--bg1)", borderBottom: "1px solid var(--border)", padding: "0 18px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 44, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}><div style={{ width: 20, height: 20, background: "var(--accent)", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#000", fontFamily: "var(--font-d)" }}>◆</div><div style={{ fontSize: 11, fontFamily: "var(--font-d)", fontWeight: 800, color: "var(--text)" }}>APEX — New Programme</div></div>
          <button onClick={onCancel} style={{ color: "var(--text3)", fontSize: 16, padding: "2px 6px" }}>✕</button>
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>{inner}</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg0)", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "var(--bg1)", borderBottom: "1px solid var(--border)", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 46, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 24, height: 24, background: "var(--accent)", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#000", fontFamily: "var(--font-d)" }}>◆</div><div><div style={{ fontSize: 13, fontFamily: "var(--font-d)", fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>APEX</div><div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", letterSpacing: "0.15em", textTransform: "uppercase" }}>Programme Execution & Control</div></div></div>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>{inner}</div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// METRIC PANEL + TASK DRAWER + RAID LOG (updated theme)
// ══════════════════════════════════════════════════════════════════════════════
const MetricPanel = ({ metric, tasks, onClose, onSave, onNavigate }) => {
  const [val, setVal] = useState(String(metric.value));
  const [note, setNote] = useState(metric.note || "");
  const [rag, setRag] = useState(metric.rag);
  const fam = FAMILIES[metric.family] || FAMILIES.delivery;
  const linked = (metric.links || []).map(l => ({ ...l, task: tasks.find(t => t.id === l.taskId) })).filter(l => l.task);
  function save() { const nv = parseFloat(val); if (isNaN(nv)) return; onSave({ ...metric, value: nv, note, rag, trend: [...(metric.trend || []).slice(1), nv], lastUpdated: d(0) }); onClose(); }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "flex-end" }} onClick={onClose}>
      <div className="sr" style={{ width: 400, height: "100%", background: "var(--bg2)", borderLeft: "1px solid var(--border2)", display: "flex", flexDirection: "column", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "15px 17px", borderBottom: "1px solid var(--border)", background: "var(--bg3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div><div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: fam.color, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>{fam.icon} {fam.label}</div><div style={{ fontSize: 14, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)", lineHeight: 1.25 }}>{metric.name}</div></div>
            <button onClick={onClose} style={{ color: "var(--text3)", fontSize: 17, padding: "2px 4px" }}>✕</button>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 11, marginBottom: 9 }}>
            <div style={{ fontSize: 38, fontFamily: "var(--font-d)", fontWeight: 800, color: RAG[metric.rag].color, lineHeight: 1 }}>{fmtVal(metric)}</div>
            <div style={{ paddingBottom: 2 }}><div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)" }}>Target</div><div style={{ fontSize: 14, fontFamily: "var(--font-m)", color: "var(--text2)", fontWeight: 500 }}>{metric.target}{metric.unit}</div></div>
            <Spark data={metric.trend} color={RAG[metric.rag].color} positive={metric.direction === "higher"} />
          </div>
          {metric.trend && <div style={{ height: 38 }}><ResponsiveContainer width="100%" height="100%"><AreaChart data={metric.trend.map((v, i) => ({ v, l: metric.trendL?.[i] || `Wk${i + 1}` }))} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}><defs><linearGradient id="dp-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={RAG[metric.rag].color} stopOpacity={0.4} /><stop offset="100%" stopColor={RAG[metric.rag].color} stopOpacity={0} /></linearGradient></defs><XAxis dataKey="l" tick={{ fontSize: 11, fontFamily: "var(--font-m)", fill: "var(--text3)" }} axisLine={false} tickLine={false} /><Area type="monotone" dataKey="v" stroke={RAG[metric.rag].color} strokeWidth={2} fill="url(#dp-g)" dot={{ fill: RAG[metric.rag].color, r: 2 }} /></AreaChart></ResponsiveContainer></div>}
        </div>
        <div style={{ padding: "15px 17px", flex: 1 }}>
          {linked.length > 0 && <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 7 }}>Task Linkages ({linked.length})</div>
            {linked.map(l => { const lm = LINK_META[l.type] || LINK_META.influences; return (
              <div key={l.taskId} onClick={() => { onNavigate && onNavigate(l.task); onClose(); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", marginBottom: 2, background: "var(--bg3)", borderRadius: 4, border: `1px solid ${lm.color}20`, cursor: "pointer" }}><Badge status={l.task.status} /><div style={{ flex: 1 }}><div style={{ fontSize: 11, fontFamily: "var(--font-b)", color: "var(--text)" }}>{l.task.name}</div></div></div>
            ); })}
          </div>}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Manual Update</div>
            <div style={{ marginBottom: 9 }}><label style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Value ({metric.unit})</label><input value={val} onChange={e => setVal(e.target.value)} style={{ width: "100%", background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 5, color: "var(--text)", fontFamily: "var(--font-m)", fontSize: 21, fontWeight: 700, padding: "8px 10px" }} /></div>
            <div style={{ marginBottom: 9 }}><label style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>RAG</label><div style={{ display: "flex", gap: 5 }}>{Object.entries(RAG).map(([k, r]) => <button key={k} onClick={() => setRag(k)} style={{ flex: 1, padding: "5px", border: `1px solid ${rag === k ? r.color : "var(--border2)"}`, borderRadius: 5, background: rag === k ? r.bg : "transparent", color: rag === k ? r.color : "var(--text3)", fontSize: 11, fontFamily: "var(--font-m)", textTransform: "uppercase" }}>{r.label}</button>)}</div></div>
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Commentary</label><textarea value={note} onChange={e => setNote(e.target.value)} rows={3} style={{ width: "100%", background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 5, color: "var(--text)", fontFamily: "var(--font-b)", fontSize: 12, padding: "6px 8px", resize: "none", lineHeight: 1.5 }} /></div>
            <div style={{ display: "flex", gap: 6 }}><button onClick={save} style={{ flex: 1, background: "var(--accent)", color: "#000", borderRadius: 5, padding: "8px", fontFamily: "var(--font-d)", fontWeight: 700, fontSize: 11 }}>Save</button><button onClick={onClose} style={{ padding: "8px 12px", border: "1px solid var(--border2)", borderRadius: 5, color: "var(--text3)", fontSize: 10 }}>Cancel</button></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TaskDrawer = ({ task, tasks, metrics, onClose, onUpdate, onOpenMetric }) => {
  if (!task) return null;
  const meta = STATUS_META[task.status] || STATUS_META["not-started"];
  const linkedMetrics = (metrics || []).filter(m => (m.links || []).some(l => l.taskId === task.id));
  return (
    <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 300, background: "var(--bg2)", borderLeft: "1px solid var(--border2)", zIndex: 100, display: "flex", flexDirection: "column", boxShadow: "-8px 0 32px rgba(0,0,0,0.5)", animation: "fadeUp 0.2s ease" }}>
      <div style={{ padding: "13px 14px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div><div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 3 }}>{task.phase}</div><div style={{ fontSize: 12, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)", lineHeight: 1.3 }}>{task.name}</div></div>
        <button onClick={onClose} style={{ color: "var(--text3)", fontSize: 16, padding: "2px 4px" }}>✕</button>
      </div>
      <div style={{ padding: 12, flex: 1, overflowY: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 10 }}>
          {[{ l: "Owner", v: task.owner, c: "var(--blue)" }, { l: "Status", v: <Badge status={task.status} /> }, { l: "Start", v: fmt(task.start) }, { l: "End", v: fmt(task.end) }, { l: "Progress", v: `${task.progress}%`, c: meta.color }, { l: "Deps", v: task.deps?.join(", ") || "None", c: "var(--text3)" }].map((f, i) => (
            <div key={i} style={{ background: "var(--bg3)", padding: "7px 9px", borderRadius: 4, border: "1px solid var(--border)" }}><div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", marginBottom: 2 }}>{f.l}</div><div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: f.c || "var(--text)" }}>{f.v}</div></div>
          ))}
        </div>
        <div style={{ background: "var(--bg3)", borderRadius: 3, height: 3, overflow: "hidden", border: "1px solid var(--border)", marginBottom: 11 }}><div style={{ width: `${task.progress}%`, height: "100%", background: `linear-gradient(90deg,${meta.color}88,${meta.color})`, borderRadius: 3 }} /></div>
        {linkedMetrics.length > 0 && <div style={{ marginBottom: 11 }}>
          <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", marginBottom: 6 }}>◆ Driving Metrics ({linkedMetrics.length})</div>
          {linkedMetrics.map(m => (
            <div key={m.id} onClick={() => onOpenMetric && onOpenMetric(m)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 7px", marginBottom: 2, background: "var(--bg3)", borderRadius: 4, border: "1px solid var(--border)", cursor: "pointer" }}>
              <RagPip rag={m.rag} /><div style={{ flex: 1 }}><div style={{ fontSize: 11, fontFamily: "var(--font-b)", color: "var(--text)" }}>{m.name}</div></div><div style={{ fontSize: 12, fontFamily: "var(--font-m)", fontWeight: 700, color: RAG[m.rag].color }}>{fmtVal(m)}</div>
            </div>
          ))}
        </div>}
        <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", marginBottom: 5 }}>Quick Status</div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{Object.entries(STATUS_META).map(([key, m]) => <button key={key} onClick={() => onUpdate(task.id, { status: key })} style={{ fontSize: 11, fontFamily: "var(--font-m)", padding: "3px 7px", border: `1px solid ${task.status === key ? m.color : "var(--border2)"}`, borderRadius: 3, color: task.status === key ? m.color : "var(--text3)", background: task.status === key ? m.bg : "transparent", textTransform: "uppercase" }}>{m.label}</button>)}</div>
      </div>
    </div>
  );
};

const RAIDLog = ({ raidItems, setRaidItems }) => {
  const [filter, setFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState("risk");
  const [form, setForm] = useState({ title: "", description: "", owner: "", impact: "Medium", dueDate: "", status: "Open" });
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const filtered = filter === "all" ? raidItems : raidItems.filter(i => i.type === filter);

  async function addViaAI() {
    if (!aiInput.trim() || aiLoading) return;
    setAiLoading(true);
    const SYS = `You are APEX. Extract a RAID item from the user's text. Return ONLY valid JSON:\n{"type":"risk|assumption|issue|decision","title":"short title","description":"full description","owner":"name or TBC","impact":"High|Medium|Low","status":"Open","dateRaised":"${d(0)}","dueDate":"YYYY-MM-DD or null"}`;
    try {
      const r = await aiCall(SYS, [{ role: "user", content: aiInput }]);
      const jm = r.match(/```json\s*([\s\S]*?)```/) || [null, r.trim()];
      const parsed = JSON.parse((jm[1] || r).replace(/```json|```/g, "").trim());
      setRaidItems(prev => [...prev, { ...parsed, id: `rd-${uid()}`, dueDate: parsed.dueDate || d(14) }]);
      setAiInput("");
    } catch (e) { /* silent */ }
    setAiLoading(false);
  }

  function addManual() {
    if (!form.title.trim()) return;
    setRaidItems(prev => [...prev, { ...form, id: `rd-${uid()}`, type: addType, dateRaised: d(0), dueDate: form.dueDate || d(14) }]);
    setForm({ title: "", description: "", owner: "", impact: "Medium", dueDate: "", status: "Open" });
    setShowAdd(false);
  }

  const counts = Object.fromEntries(Object.keys(RAID_TYPES).map(t => [t, raidItems.filter(i => i.type === t).length]));

  return (
    <div style={{ padding: "16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>RAID Log</div>
          <div style={{ display: "flex", gap: 10 }}>{Object.entries(RAID_TYPES).map(([t, tm]) => (<div key={t} style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ fontSize: 11, fontFamily: "var(--font-m)", color: tm.color, fontWeight: 600 }}>{counts[t] || 0}</span><span style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase" }}>{tm.label}s</span></div>))}</div>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} style={{ fontSize: 12, fontFamily: "var(--font-m)", padding: "6px 13px", background: "rgba(42,191,191,0.12)", border: "1px solid rgba(42,191,191,0.35)", borderRadius: 5, color: "var(--accent)", textTransform: "uppercase" }}>+ Add</button>
      </div>
      <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 7, padding: "11px 13px", marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>◆ Natural Language Entry</div>
        <div style={{ display: "flex", gap: 7 }}>
          <input value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addViaAI(); }} placeholder="Describe a risk, assumption, issue, or decision…" style={{ flex: 1, background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 5, color: "var(--text)", fontFamily: "var(--font-b)", fontSize: 12, padding: "7px 9px" }} />
          <button onClick={addViaAI} disabled={aiLoading || !aiInput.trim()} style={{ background: aiLoading || !aiInput.trim() ? "var(--bg3)" : "var(--accent)", color: aiLoading || !aiInput.trim() ? "var(--text3)" : "#000", border: "none", borderRadius: 5, padding: "0 14px", fontFamily: "var(--font-d)", fontWeight: 700, fontSize: 11, minWidth: 50 }}>{aiLoading ? <Spinner /> : "↑"}</button>
        </div>
      </div>
      {showAdd && (
        <div className="fu" style={{ background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 7, padding: "13px", marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 9 }}>{Object.entries(RAID_TYPES).map(([t, tm]) => (<button key={t} onClick={() => setAddType(t)} style={{ fontSize: 12, fontFamily: "var(--font-m)", padding: "4px 11px", border: `1px solid ${addType === t ? tm.color : "var(--border2)"}`, borderRadius: 4, color: addType === t ? tm.color : "var(--text3)", background: addType === t ? `${tm.color}15` : "transparent", textTransform: "uppercase" }}>{tm.icon} {tm.label}</button>))}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Title *" style={{ background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 4, color: "var(--text)", fontSize: 12, padding: "6px 8px" }} />
            <input value={form.owner} onChange={e => setForm(p => ({ ...p, owner: e.target.value }))} placeholder="Owner" style={{ background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 4, color: "var(--text)", fontSize: 12, padding: "6px 8px" }} />
          </div>
          <div style={{ display: "flex", gap: 7 }}>
            <select value={form.impact} onChange={e => setForm(p => ({ ...p, impact: e.target.value }))} style={{ background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 4, color: "var(--text)", fontSize: 11, padding: "5px 7px" }}><option>High</option><option>Medium</option><option>Low</option></select>
            <button onClick={addManual} style={{ background: "var(--accent)", color: "#000", borderRadius: 4, padding: "6px 14px", fontFamily: "var(--font-d)", fontWeight: 700, fontSize: 12, marginLeft: "auto" }}>Add</button>
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
        {[["all", "All"], ...Object.entries(RAID_TYPES).map(([t, tm]) => [t, tm.label + "s"])].map(([key, label]) => (<button key={key} onClick={() => setFilter(key)} style={{ fontSize: 11, fontFamily: "var(--font-m)", padding: "3px 10px", border: `1px solid ${filter === key ? (RAID_TYPES[key]?.color || "var(--accent)") : "var(--border2)"}`, borderRadius: 20, color: filter === key ? (RAID_TYPES[key]?.color || "var(--accent)") : "var(--text3)", background: filter === key ? `${RAID_TYPES[key]?.color || "var(--accent)"}15` : "transparent", textTransform: "uppercase" }}>{label}</button>))}
      </div>
      {filtered.length === 0 && <div style={{ textAlign: "center", padding: "32px", fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text3)" }}>No items yet.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {filtered.map((item, i) => { const tm = RAID_TYPES[item.type] || RAID_TYPES.risk; const sc = item.status === "Agreed" || item.status === "Closed" ? "#5DC484" : item.status === "Open" ? "#F5C544" : "var(--text3)"; return (
          <div key={item.id} className="fu" style={{ animationDelay: `${i * 0.02}s`, background: "var(--bg2)", border: `1px solid ${tm.color}25`, borderLeft: `3px solid ${tm.color}`, borderRadius: 6, padding: "11px 13px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, fontFamily: "var(--font-m)", color: tm.color, background: `${tm.color}15`, border: `1px solid ${tm.color}30`, padding: "1px 7px", borderRadius: 3, textTransform: "uppercase", fontWeight: 600 }}>{tm.icon} {tm.label}</span>
              {item.impact && <span style={{ fontSize: 11, fontFamily: "var(--font-m)", color: { High: "#E8734A", Medium: "#F5C544", Low: "#5DC484" }[item.impact], textTransform: "uppercase" }}>▲ {item.impact}</span>}
              <span style={{ fontSize: 12, fontFamily: "var(--font-b)", fontWeight: 500, color: "var(--text)" }}>{item.title}</span>
            </div>
            {item.description && <p style={{ fontSize: 11, fontFamily: "var(--font-b)", color: "var(--text2)", lineHeight: 1.6, marginBottom: 5 }}>{item.description}</p>}
            <div style={{ display: "flex", gap: 10 }}>
              {item.owner && <span style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--blue)" }}>{item.owner}</span>}
              {item.dueDate && <span style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text3)" }}>Due: {fmt(item.dueDate)}</span>}
            </div>
          </div>
        ); })}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// BENEFITS STRIP + DRAWER
// ══════════════════════════════════════════════════════════════════════════════
const benefitProgress = (b) => {
  if (!b.target || b.target === b.baseline) return b.status === "realised" ? 100 : 0;
  const curr = b.actualRealisation ? b.target : b.baseline;
  return Math.max(0, Math.min(100, ((curr - b.baseline) / (b.target - b.baseline)) * 100));
};

const BenefitsStrip = ({ benefits, onOpen }) => {
  if (!benefits || !benefits.length) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "#5DC484", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600 }}>✚ Benefits</span>
        <span style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)" }}>{benefits.length} tracked · {benefits.filter(b => b.status === "realised").length} realised</span>
      </div>
      <div style={{ display: "flex", gap: 9, overflowX: "auto", paddingBottom: 6 }}>
        {benefits.map((b, i) => {
          const st = BENEFIT_STATUS[b.status] || BENEFIT_STATUS.planned;
          const tm = BENEFIT_TYPES[b.type] || BENEFIT_TYPES.operational;
          const pct = benefitProgress(b);
          return (
            <div key={b.id} className="fu" onClick={() => onOpen(b)} style={{ animationDelay: `${i * 0.02}s`, minWidth: 240, maxWidth: 280, background: "var(--bg2)", border: `1px solid ${st.color}30`, borderLeft: `3px solid ${tm.color}`, borderRadius: 6, padding: "10px 12px", cursor: "pointer", flexShrink: 0, transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bg3)"} onMouseLeave={e => e.currentTarget.style.background = "var(--bg2)"}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontFamily: "var(--font-m)", color: tm.color, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{tm.label}</span>
                <span style={{ fontSize: 11, fontFamily: "var(--font-m)", color: st.color, background: st.bg, border: `1px solid ${st.color}30`, padding: "1px 5px", borderRadius: 2, textTransform: "uppercase" }}>{st.label}</span>
              </div>
              <div style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text)", fontWeight: 500, lineHeight: 1.3, marginBottom: 6 }}>{b.title}</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text3)", marginBottom: 4 }}>
                <span>{b.baseline}{b.unit} → {b.target}{b.unit}</span>
                <span>{b.owner}</span>
              </div>
              <div style={{ background: "var(--bg0)", borderRadius: 3, height: 3, overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg,${tm.color}66,${tm.color})`, borderRadius: 3 }} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const BenefitDrawer = ({ benefit, onClose, onSave, metrics }) => {
  if (!benefit) return null;
  const [b, setB] = useState({ ...benefit });
  const tm = BENEFIT_TYPES[b.type] || BENEFIT_TYPES.operational;
  const linkedMetric = metrics?.find(m => m.id === b.metricId);
  function save() { onSave(b); onClose(); }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "flex-end" }} onClick={onClose}>
      <div className="sr" style={{ width: 400, height: "100%", background: "var(--bg2)", borderLeft: "1px solid var(--border2)", display: "flex", flexDirection: "column", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "15px 17px", borderBottom: "1px solid var(--border)", background: "var(--bg3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: tm.color, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>✚ {tm.label} Benefit</div>
              <div style={{ fontSize: 14, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)", lineHeight: 1.25 }}>{b.title}</div>
            </div>
            <button onClick={onClose} style={{ color: "var(--text3)", fontSize: 17, padding: "2px 4px" }}>✕</button>
          </div>
          <p style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text2)", lineHeight: 1.55 }}>{b.description}</p>
        </div>
        <div style={{ padding: "15px 17px", flex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            <div style={{ background: "var(--bg3)", padding: "8px 10px", borderRadius: 4, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", marginBottom: 2 }}>Baseline</div>
              <div style={{ fontSize: 16, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text2)" }}>{b.baseline}{b.unit}</div>
            </div>
            <div style={{ background: "var(--bg3)", padding: "8px 10px", borderRadius: 4, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", marginBottom: 2 }}>Target</div>
              <div style={{ fontSize: 16, fontFamily: "var(--font-d)", fontWeight: 700, color: tm.color }}>{b.target}{b.unit}</div>
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", marginBottom: 3 }}>Owner</div>
            <div style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--blue)" }}>{b.owner}</div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", marginBottom: 3 }}>Measurement KPI</div>
            <div style={{ fontSize: 11, fontFamily: "var(--font-b)", color: "var(--text)" }}>{b.measurementKPI}</div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", marginBottom: 3 }}>Expected Realisation</div>
            <div style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text)" }}>{fmt(b.expectedRealisation)} {b.tranche && `· ${b.tranche}`}</div>
          </div>
          {linkedMetric && <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", marginBottom: 3 }}>Linked Metric</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", background: "var(--bg3)", borderRadius: 4, border: "1px solid var(--border)" }}><RagPip rag={linkedMetric.rag} /><span style={{ fontSize: 11, fontFamily: "var(--font-b)", color: "var(--text)", flex: 1 }}>{linkedMetric.name}</span><span style={{ fontSize: 12, fontFamily: "var(--font-m)", fontWeight: 700, color: RAG[linkedMetric.rag].color }}>{fmtVal(linkedMetric)}</span></div>
          </div>}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 14 }}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", marginBottom: 10 }}>Update Status</div>
            <div style={{ display: "flex", gap: 5, marginBottom: 12, flexWrap: "wrap" }}>
              {Object.entries(BENEFIT_STATUS).map(([k, s]) => <button key={k} onClick={() => setB(p => ({ ...p, status: k }))} style={{ fontSize: 11, fontFamily: "var(--font-m)", padding: "4px 9px", border: `1px solid ${b.status === k ? s.color : "var(--border2)"}`, borderRadius: 4, color: b.status === k ? s.color : "var(--text3)", background: b.status === k ? s.bg : "transparent", textTransform: "uppercase" }}>{s.label}</button>)}
            </div>
            <button onClick={save} style={{ width: "100%", background: "var(--accent)", color: "#000", borderRadius: 5, padding: "8px", fontFamily: "var(--font-d)", fontWeight: 700, fontSize: 11 }}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// REPORT VIEWER + BUILDERS
// ══════════════════════════════════════════════════════════════════════════════
const ReportViewer = ({ outputType, state, onClose }) => {
  const { programme, tasks, risks, metrics, raidItems = [], benefits = [], calendarEvents = [] } = state;
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const meta = OUTPUT_TYPES[outputType];

  const g = ragCount(metrics, "green"), a = ragCount(metrics, "amber"), rC = ragCount(metrics, "red");
  const phi = metrics.length ? Math.round((g * 100 + a * 50) / metrics.length) : 0;
  const phiC = phi >= 70 ? "#5DC484" : phi >= 50 ? "#F5C544" : "#E8734A";

  useEffect(() => { generate(); }, []);

  async function generate() {
    setLoading(true);
    let SYS = "", extraSummary = "";
    if (outputType === "steerco") {
      SYS = `You are an expert PMO writer creating a SteerCo / Programme Board Pack. Be concise and authoritative. Use this exact structure:\n\n## EXECUTIVE SUMMARY\nOne paragraph. RAG status, one-line headline.\n\n## PROGRAMME HEALTH\nTable-style bullets: Schedule / Budget / Scope / Benefits / Risks each with RAG + one-line rationale.\n\n## KEY HIGHLIGHTS — THIS PERIOD\n3-5 bullets of concrete progress.\n\n## PROGRESS VS PLAN\nMilestones hit/missed, % complete, variance to baseline.\n\n## FINANCIAL STATUS\nBudget utilisation, variance, forecast to completion.\n\n## BENEFITS TRACKING\nPer-benefit status: on track / at risk / off track. Reference the benefits list.\n\n## RISKS & ISSUES\nTop 3 open risks with mitigation and owner.\n\n## DECISIONS REQUIRED\nWhat the Board needs to approve/decide.\n\n## UPCOMING MILESTONES\nNext 4-6 weeks.\n\n## ASKS OF THE BOARD\nSpecific requests from the sponsor / board.`;
    } else if (outputType === "highlight") {
      SYS = `You are an expert PMO writer creating a Highlight Report (concise, 1-page equivalent). Use this exact structure:\n\n## HEADLINE\nOne-line status with RAG.\n\n## THIS PERIOD — PROGRESS\n3-4 bullets. Only what was completed or materially advanced.\n\n## NEXT PERIOD — PRIORITIES\n3-4 bullets. What must happen next.\n\n## WATCH ITEMS\nEmerging risks or blockers — keep it short.\n\n## DECISIONS NEEDED\nAny decisions awaiting — or "None pending".\n\n## BENEFITS UPDATE\nOne paragraph on benefits trajectory.`;
    } else if (outputType === "benefits") {
      SYS = `You are an expert PMO writer creating a Benefits Realisation Report. Focus entirely on benefits vs business case. Use this exact structure:\n\n## BENEFITS OVERVIEW\nTotals: planned / in-progress / realised / at-risk counts. Overall trajectory one-liner.\n\n## PER-BENEFIT STATUS\nFor each benefit: title, owner, baseline → target → current, RAG, realisation date, commentary.\n\n## BENEFITS AT RISK\nWhich benefits are slipping, why, and what mitigation is in place.\n\n## REALISATION TIMELINE\nWhen benefits are expected to land by tranche/phase.\n\n## RECOMMENDATIONS\n2-3 specific recommendations to protect benefits realisation.`;
      extraSummary = `\nBENEFITS DETAIL:\n${benefits.map(b => `- ${b.title} (${b.type}) [${b.status}] — Owner: ${b.owner} — ${b.baseline}${b.unit} → ${b.target}${b.unit} — Expected: ${b.expectedRealisation} — KPI: ${b.measurementKPI}`).join("\n")}`;
    }

    const prompt = `Programme: ${programme.name} (${programme.type})
Vision: ${programme.vision || programme.objective}
Sponsor: ${programme.sponsor} · SRO: ${programme.sro}
Phase: ${programme.phase}
Report date: ${fmtL(d(0))}
Audience: ${meta.label}

PROGRAMME HEALTH:
- Portfolio Health Index: ${phi}/100 (${phi >= 70 ? "Green" : phi >= 50 ? "Amber" : "Red"})
- Tasks complete: ${tasks.filter(t => t.status === "complete").length}/${tasks.length}
- Tasks in progress: ${tasks.filter(t => t.status === "in-progress").length}
- Open risks: ${risks.filter(r => r.status === "Open").length}
- RAID items open: ${raidItems.filter(i => i.status === "Open" || i.status === "Active").length}
- Benefits: ${benefits.length} tracked (${benefits.filter(b => b.status === "realised").length} realised, ${benefits.filter(b => b.status === "at-risk").length} at risk)

METRICS:
${metrics.map(m => `- ${m.name}: ${fmtVal(m)} vs target ${m.target}${m.unit} [${m.rag.toUpperCase()}] — ${m.note}`).join("\n")}

OPEN RISKS:
${risks.filter(r => r.status === "Open").map(r => `- [${r.impact}] ${r.title} — ${r.mitigation} (${r.owner})`).join("\n") || "None"}

RAID ITEMS:
${raidItems.filter(i => i.status !== "Closed" && i.status !== "Agreed").slice(0, 8).map(i => `- [${i.type.toUpperCase()}] ${i.title}: ${i.description || ""}`).join("\n") || "None"}

UPCOMING CALENDAR EVENTS:
${calendarEvents.slice(0, 6).map(e => `- ${e.title} on ${e.date} [${e.type}]`).join("\n") || "None scheduled"}${extraSummary}`;

    try {
      const r = await aiCall(SYS, [{ role: "user", content: prompt }]);
      setReport(r);
    } catch (e) { setReport("⚠ AI engine error — could not generate report."); }
    setLoading(false);
  }

  function copy() { navigator.clipboard?.writeText(report || ""); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  function renderReport(text) {
    const sections = text.split(/^##\s/m).filter(Boolean);
    return sections.map((sec, i) => {
      const lines = sec.split("\n");
      const title = lines[0].trim();
      const body = lines.slice(1).join("\n").trim();
      return (
        <div key={i} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: i === 0 ? phiC : meta.color, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 7, display: "flex", alignItems: "center", gap: 6 }}>
            {i === 0 && <div style={{ width: 7, height: 7, borderRadius: "50%", background: phiC, animation: "blink 2s infinite" }} />}
            {title}
          </div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-b)", color: "var(--text)", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
            {body.split("\n").map((line, j) => {
              if (line.startsWith("- ")) {
                return <div key={j} style={{ display: "flex", gap: 8, marginBottom: 3 }}>
                  <span style={{ color: meta.color, flexShrink: 0, marginTop: 2 }}>·</span>
                  <span>{line.slice(2)}</span>
                </div>;
              }
              return <p key={j} style={{ marginBottom: 4 }}>{line}</p>;
            })}
          </div>
        </div>
      );
    });
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "min(760px,100%)", height: "min(85vh,760px)", background: "var(--bg1)", border: "1px solid var(--border2)", borderRadius: 10, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.8)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)", background: "var(--bg2)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: meta.color, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 2 }}>{meta.icon} {meta.label}</div>
            <div style={{ fontSize: 13, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)" }}>{programme.name} · {fmtL(d(0))}</div>
          </div>
          <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", background: `${phiC}15`, border: `1px solid ${phiC}40`, borderRadius: 20 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: phiC }} />
              <span style={{ fontSize: 12, fontFamily: "var(--font-m)", color: phiC, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>PHI {phi}</span>
            </div>
            {report && <button onClick={copy} style={{ fontSize: 12, fontFamily: "var(--font-m)", padding: "5px 11px", background: "rgba(42,191,191,0.15)", border: "1px solid rgba(42,191,191,0.3)", borderRadius: 5, color: "var(--accent)" }}>{copied ? "Copied ✓" : "Copy"}</button>}
            {report && <button onClick={generate} disabled={loading} style={{ fontSize: 12, fontFamily: "var(--font-m)", padding: "5px 11px", background: `${meta.color}15`, border: `1px solid ${meta.color}30`, borderRadius: 5, color: meta.color }}>↻ Refresh</button>}
            <button onClick={onClose} style={{ color: "var(--text3)", fontSize: 16, padding: "2px 5px" }}>✕</button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
              <Spinner s={20} />
              <div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em", animation: "shimmer 1.5s infinite" }}>Generating {meta.label.toLowerCase()}…</div>
            </div>
          )}
          {report && !loading && renderReport(report)}
        </div>
      </div>
    </div>
  );
};

const ReportsTab = ({ state, onOpenReport }) => {
  const enabled = state.programme.enabledOutputs || [];
  if (!enabled.length) return (
    <div style={{ padding: "32px", textAlign: "center", fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text3)" }}>No output types configured. Start a new programme and select outputs in Stage 1.</div>
  );
  return (
    <div style={{ padding: "16px 20px" }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)", marginBottom: 3 }}>Reports & Outputs</div>
        <div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Generate formal outputs from live programme data</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 12 }}>
        {enabled.map((out, i) => {
          const meta = OUTPUT_TYPES[out.type] || OUTPUT_TYPES.highlight;
          const due = out.nextDue;
          const daysToDue = due ? daysUntil(due) : null;
          const dueColour = daysToDue !== null && daysToDue <= 3 ? "#E8734A" : daysToDue !== null && daysToDue <= 7 ? "#F5C544" : "var(--text3)";
          return (
            <div key={i} className="fu" style={{ animationDelay: `${i * 0.05}s`, background: "var(--bg2)", border: `1px solid ${meta.color}30`, borderTop: `3px solid ${meta.color}`, borderRadius: 8, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 9 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                    <span style={{ fontSize: 18 }}>{meta.icon}</span>
                    <div>
                      <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: meta.color, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600 }}>{out.frequency}</div>
                      <div style={{ fontSize: 12, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)", lineHeight: 1.3 }}>{meta.label}</div>
                    </div>
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 11, fontFamily: "var(--font-b)", color: "var(--text2)", lineHeight: 1.55 }}>{meta.desc}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 9 }}>
                <div>
                  <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Audience</div>
                  <div style={{ fontSize: 11, fontFamily: "var(--font-b)", color: "var(--text2)" }}>{out.audience || "—"}</div>
                </div>
                {due && <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Next Due</div>
                  <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: dueColour }}>{fmt(due)}{daysToDue !== null && ` · ${daysToDue > 0 ? "in " + daysToDue + "d" : daysToDue === 0 ? "today" : Math.abs(daysToDue) + "d overdue"}`}</div>
                </div>}
              </div>
              <button onClick={() => onOpenReport(out.type)} style={{ width: "100%", background: meta.color, color: "#000", border: "none", borderRadius: 5, padding: "8px", fontFamily: "var(--font-d)", fontWeight: 700, fontSize: 11, marginTop: 4 }}>Generate Report</button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
const Dashboard = ({ state, setState, onNewProgramme }) => {
  const { programme, tasks, risks, metrics, raidItems = [], calendarEvents = [], benefits = [], stakeholders = [] } = state;

  const setTasks = fn => setState(p => ({ ...p, tasks: typeof fn === "function" ? fn(p.tasks) : fn }));
  const setRisks = fn => setState(p => ({ ...p, risks: typeof fn === "function" ? fn(p.risks) : fn }));
  const setMetrics = fn => setState(p => ({ ...p, metrics: typeof fn === "function" ? fn(p.metrics) : fn }));
  const setRAID = fn => setState(p => ({ ...p, raidItems: typeof fn === "function" ? fn(p.raidItems || []) : fn }));
  const setBenefits = fn => setState(p => ({ ...p, benefits: typeof fn === "function" ? fn(p.benefits || []) : fn }));

  const [tab, setTab] = useState("metrics");
  const [selTask, setSelTask] = useState(null);
  const [hlTask, setHlTask] = useState(null);
  const [openMetric, setOpenM] = useState(null);
  const [openBenefit, setOpenBenefit] = useState(null);
  const [openReport, setOpenReport] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [role, setRole] = useState("Programme Manager");
  const [insights, setInsights] = useState([]);
  const [insightLoad, setInsightLoad] = useState(false);
  const [contextView, setContextView] = useState(null);
  const [messages, setMessages] = useState([{ role: "assistant", content: `Programme "${programme.name}" is live.\n\n${tasks.length} tasks · ${risks.filter(r => r.status === "Open").length} open risks · ${metrics.length} metrics · ${benefits.length} benefits · ${raidItems.length} RAID items.\n\nAsk me anything — "Brief me for steerco", "Which benefits are at risk?", "What do I tell the CFO?", or describe updates to apply.` }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const g = ragCount(metrics, "green"), a = ragCount(metrics, "amber"), r = ragCount(metrics, "red");
  const phi = metrics.length ? Math.round((g * 100 + a * 50) / metrics.length) : 0;
  const phiC = phi >= 70 ? "#5DC484" : phi >= 50 ? "#F5C544" : "#E8734A";
  const openRisks = risks.filter(r => r.status === "Open").length;

  // Generate insights
  const generateInsights = useCallback(async () => {
    setInsightLoad(true);
    const SYS = `You are APEX Insight Intelligence. Role: ${role}. Generate 3-6 proactive insight cards for this PMO user.
Return ONLY a JSON array (no markdown):
[{"id":"ins1","category":"milestone|meeting|risk|task|stakeholder|report|benefit|custom","title":"short title","body":"2-3 sentence actionable insight","priority":"high|medium|low","actions":["View Details","Take Action"]}]
Focus on:
- Upcoming report deadlines (check enabledOutputs.nextDue vs today)
- Benefits at risk or approaching realisation date
- Meeting prep needs (steerco, board)
- Risk escalations
- Blocked tasks or tasks due soon
- Stakeholder comms needed
Tailor insights to the user's role.`;
    const prompt = `Programme: ${programme.name} (${programme.type}, ${programme.phase})
Vision: ${programme.vision || programme.objective}
SRO: ${programme.sro || programme.sponsor}
Today: ${d(0)}
Role: ${role}
Enabled outputs: ${JSON.stringify(programme.enabledOutputs || [])}
Tasks: ${JSON.stringify(tasks.map(t => ({ id: t.id, name: t.name, status: t.status, owner: t.owner, end: t.end, phase: t.phase })))}
Risks: ${JSON.stringify(risks.filter(r => r.status === "Open").map(r => ({ id: r.id, title: r.title, impact: r.impact, owner: r.owner })))}
Metrics: ${JSON.stringify(metrics.map(m => ({ id: m.id, name: m.name, value: m.value, target: m.target, rag: m.rag })))}
Benefits: ${JSON.stringify(benefits.map(b => ({ id: b.id, title: b.title, owner: b.owner, status: b.status, expectedRealisation: b.expectedRealisation, type: b.type })))}
Calendar: ${JSON.stringify(calendarEvents.slice(0, 10))}
RAID: ${JSON.stringify(raidItems.filter(i => i.status === "Open" || i.status === "Active" || i.status === "Pending").slice(0, 10))}`;
    try {
      const raw = await aiCall(SYS, [{ role: "user", content: prompt }]);
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setInsights(parsed.map((ins, i) => ({ ...ins, id: ins.id || `ins-${uid()}` })));
    } catch (e) { /* silent */ }
    setInsightLoad(false);
  }, [role, tasks, risks, metrics, calendarEvents, raidItems, benefits, programme]);

  useEffect(() => { generateInsights(); }, []);

  const SYSTEM = `You are APEX Command Intelligence for "${programme.name}" (${programme.type}, ${programme.phase}).
User role: ${role}. Vision: ${programme.vision || programme.objective}. Sponsor: ${programme.sponsor}. SRO: ${programme.sro || programme.sponsor}.
Enabled outputs: ${JSON.stringify(programme.enabledOutputs || [])}
TASKS: ${JSON.stringify(tasks.map(t => ({ id: t.id, name: t.name, status: t.status, progress: t.progress, owner: t.owner, phase: t.phase, end: t.end })))}
RISKS: ${JSON.stringify(risks)}
METRICS: ${JSON.stringify(metrics.map(m => ({ id: m.id, name: m.name, family: m.family, value: m.value, target: m.target, unit: m.unit, rag: m.rag })))}
BENEFITS: ${JSON.stringify(benefits.map(b => ({ id: b.id, title: b.title, type: b.type, owner: b.owner, status: b.status, baseline: b.baseline, target: b.target, unit: b.unit, expectedRealisation: b.expectedRealisation })))}
CALENDAR: ${JSON.stringify(calendarEvents)}
RAID: ${JSON.stringify(raidItems.slice(0, 15))}

You can respond in two ways:
1. Conversational answer (max 150 words, senior PMO tone)
2. If the user asks a contextual question (e.g. "what should I tell legal?", "brief me for steerco", "which benefits are at risk?"), include a contextView JSON block that references real IDs from the data above:
\`\`\`json
{"contextView":{"title":"View Title","sections":[{"title":"Section","type":"tasks|risks|metrics|benefits|text","taskIds":["t1"],"riskIds":["r1"],"metricIds":["m1"],"benefitIds":["b1"],"content":"text content","commentary":"analyst note"}]}}
\`\`\`
3. If the user describes updates, include an updates JSON block:
\`\`\`json
{"taskUpdates":[{"id":"t1","status":"in-progress","progress":30}],"newRisks":[],"riskUpdates":[],"metricUpdates":[],"newRAID":[],"benefitUpdates":[{"id":"b1","status":"at-risk"}]}
\`\`\`
Omit JSON blocks if not needed.`;

  async function send() {
    if (!input.trim() || loading) return;
    const nMsgs = [...messages, { role: "user", content: input.trim() }];
    setMessages(nMsgs); setInput(""); setLoading(true);
    try {
      const reply = await aiCall(SYSTEM, nMsgs.map(m => ({ role: m.role, content: m.content })));
      // Parse contextView
      const cvMatch = reply.match(/```json\s*(\{"contextView"[\s\S]*?\})\s*```/);
      if (cvMatch) {
        try { const cv = JSON.parse(cvMatch[1]); setContextView(cv.contextView); } catch (e) { }
      }
      // Parse updates
      const jm = reply.match(/```json\s*(\{"(?:taskUpdates|newRisks|riskUpdates|metricUpdates|newRAID|benefitUpdates)[\s\S]*?\})\s*```/);
      if (jm) {
        try {
          const u = JSON.parse(jm[1]);
          if (u.taskUpdates?.length) setTasks(prev => prev.map(t => { const up = u.taskUpdates.find(x => x.id === t.id); return up ? { ...t, ...up } : t; }));
          if (u.newRisks?.length) setRisks(prev => [...prev, ...u.newRisks]);
          if (u.riskUpdates?.length) setRisks(prev => prev.map(r => { const up = u.riskUpdates.find(x => x.id === r.id); return up ? { ...r, ...up } : r; }));
          if (u.metricUpdates?.length) setMetrics(prev => prev.map(m => { const up = u.metricUpdates.find(x => x.id === m.id); if (!up) return m; return { ...m, ...up, trend: [...(m.trend || []).slice(1), up.value ?? m.value], lastUpdated: d(0) }; }));
          if (u.newRAID?.length) setRAID(prev => [...prev, ...u.newRAID]);
          if (u.benefitUpdates?.length) setBenefits(prev => prev.map(b => { const up = u.benefitUpdates.find(x => x.id === b.id); return up ? { ...b, ...up } : b; }));
        } catch (e) { }
      }
      setMessages(prev => [...prev, { role: "assistant", content: reply.replace(/```json[\s\S]*?```/g, "").trim() }]);
    } catch (e) { setMessages(prev => [...prev, { role: "assistant", content: "⚠ AI engine error." }]); }
    setLoading(false);
  }

  function navigateToTask(task) { setTab("gantt"); setHlTask(task.id); setSelTask(task); }

  // Gantt
  const GW = 70, gS = new Date(today); gS.setDate(gS.getDate() - 14);
  const todayPct = (daysBetween(gS, today) / GW) * 100;
  const phases = [...new Set(tasks.map(t => t.phase))];
  const wkL = []; for (let i = 0; i <= GW; i += 7) { const dt = new Date(gS); dt.setDate(dt.getDate() + i); wkL.push({ pct: (i / GW) * 100, label: fmt(dt.toISOString().split("T")[0]) }); }

  const TABS = [{ id: "metrics", label: "Dashboard" }, { id: "gantt", label: `Gantt (${tasks.length})` }, { id: "risks", label: `Risks (${openRisks})` }, { id: "raid", label: `RAID (${raidItems.length})` }, { id: "reports", label: `📊 Reports (${(programme.enabledOutputs || []).length})` }, { id: "ai", label: "◆ Command" }];
  const [activeFam, setActiveFam] = useState("all");
  const filteredMetrics = activeFam === "all" ? metrics : metrics.filter(m => m.family === activeFam);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg0)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: "var(--bg1)", borderBottom: "1px solid var(--border)", padding: "0 18px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 48, flexShrink: 0, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 24, height: 24, background: "var(--accent)", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#000", fontFamily: "var(--font-d)" }}>◆</div>
          <div><div style={{ fontSize: 12, fontFamily: "var(--font-d)", fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>APEX</div><div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", letterSpacing: "0.15em", textTransform: "uppercase" }}>Programme Execution & Control</div></div>
          <div style={{ width: 1, height: 16, background: "var(--border)", margin: "0 5px" }} />
          <div><div style={{ fontSize: 12, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)" }}>{programme.name}</div><div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{programme.type} · {programme.phase}</div></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <select value={role} onChange={e => setRole(e.target.value)} style={{ background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 4, color: "var(--accent)", fontFamily: "var(--font-m)", fontSize: 12, padding: "4px 8px", textTransform: "uppercase" }}>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <button onClick={() => setShowModal(true)} style={{ fontSize: 11, fontFamily: "var(--font-m)", padding: "5px 11px", background: "rgba(42,191,191,0.1)", border: "1px solid rgba(42,191,191,0.3)", borderRadius: 4, color: "var(--accent)", textTransform: "uppercase" }}>+ New Programme</button>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: "#5DC484", display: "inline-block", animation: "blink 2s infinite" }} /><span style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "#5DC484", textTransform: "uppercase" }}>Live</span></div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--bg2)", flexShrink: 0 }}>
        {[{ l: "Complete", v: tasks.filter(t => t.status === "complete").length, c: "#5DC484" }, { l: "In Progress", v: tasks.filter(t => t.status === "in-progress").length, c: "#F5C544" }, { l: "Open Risks", v: openRisks, c: "#E8734A" }, { l: "RAID Open", v: raidItems.filter(i => i.status === "Open" || i.status === "Active" || i.status === "Pending").length, c: "#A78BFA" }, { l: "On Track", v: g, c: "#5DC484" }, { l: "PHI", v: phi, c: phiC }].map((s, i, arr) => (
          <div key={i} style={{ flex: 1, padding: "8px 10px", borderRight: i < arr.length - 1 ? "1px solid var(--border)" : "none", textAlign: "center" }}>
            <div style={{ fontSize: 17, fontFamily: "var(--font-d)", fontWeight: 700, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: "var(--bg1)", borderBottom: "1px solid var(--border)", padding: "0 18px", flexShrink: 0 }}>
        {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "10px 16px", fontSize: 11, fontFamily: "var(--font-d)", fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? "var(--accent)" : "var(--text2)", borderBottom: tab === t.id ? "2px solid var(--accent)" : "2px solid transparent", background: "none", textTransform: "none", letterSpacing: "0", transition: "all 0.15s", cursor: "pointer" }}>{t.label}</button>)}
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        <div style={{ flex: 1, overflowY: tab === "ai" ? "hidden" : "auto", display: tab === "ai" ? "flex" : "block", flexDirection: "column" }}>

          {/* METRICS */}
          {tab === "metrics" && <div style={{ padding: "15px 18px" }}>
            <InsightCardsRow insights={insights} loading={insightLoad} onDismiss={id => setInsights(prev => prev.filter(i => i.id !== id))} onAction={(ins, action) => { setTab("ai"); setInput(action === "View Details" ? `Tell me more about: ${ins.title}` : ins.title); }} onRefresh={generateInsights} />
            <BenefitsStrip benefits={benefits} onOpen={setOpenBenefit} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr) 170px", gap: 8, marginBottom: 16 }}>
              {[{ l: "On Track", v: g, c: "#5DC484" }, { l: "At Risk", v: a, c: "#F5C544" }, { l: "Off Track", v: r, c: "#E8734A" }, { l: "Total", v: metrics.length, c: "var(--text2)" }, { l: "Families", v: [...new Set(metrics.map(m => m.family))].length, c: "var(--violet)" }].map((s, i) => (<div key={i} style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 6, padding: "9px 12px" }}><div style={{ fontSize: 21, fontFamily: "var(--font-d)", fontWeight: 800, color: s.c }}>{s.v}</div><div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>{s.l}</div></div>))}
              <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 6, padding: "9px 12px" }}><div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--violet)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Portfolio Health</div><div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ fontSize: 25, fontFamily: "var(--font-d)", fontWeight: 800, color: phiC }}>{phi}</div><div style={{ flex: 1 }}><div style={{ background: "var(--bg0)", borderRadius: 3, height: 4, overflow: "hidden" }}><div style={{ width: `${phi}%`, height: "100%", background: `linear-gradient(90deg,${phiC}88,${phiC})`, borderRadius: 3 }} /></div><div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", marginTop: 2 }}>Target 80+</div></div></div></div>
            </div>
            <div style={{ display: "flex", gap: 5, marginBottom: 12, flexWrap: "wrap" }}>
              {[["all", "All", "var(--text2)"], ...Object.entries(FAMILIES).map(([k, v]) => [k, v.label, v.color])].map(([key, label, color]) => <button key={key} onClick={() => setActiveFam(key)} style={{ fontSize: 11, fontFamily: "var(--font-m)", padding: "3px 9px", border: `1px solid ${activeFam === key ? color : "var(--border2)"}`, borderRadius: 20, color: activeFam === key ? color : "var(--text3)", background: activeFam === key ? `${color}15` : "transparent", textTransform: "uppercase", transition: "all 0.15s" }}>{label}</button>)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(265px,1fr))", gap: 9 }}>
              {filteredMetrics.map((m, i) => { const fam = FAMILIES[m.family] || FAMILIES.delivery, rag = RAG[m.rag] || RAG.amber, pct = progPct(m), linked = (m.links || []).map(l => ({ ...l, task: tasks.find(t => t.id === l.taskId) })).filter(l => l.task);
                return (<div key={m.id} className="fu" onClick={() => setOpenM(m)} style={{ animationDelay: `${i * 0.025}s`, background: "var(--bg2)", border: "1px solid var(--border)", borderTop: `2px solid ${rag.color}`, borderRadius: 6, padding: "11px 13px", cursor: "pointer", transition: "background 0.15s, border-color 0.15s", display: "flex", flexDirection: "column", gap: 7 }} onMouseEnter={e => { e.currentTarget.style.background = "var(--bg3)"; }} onMouseLeave={e => { e.currentTarget.style.background = "var(--bg2)"; }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 7 }}><div style={{ flex: 1 }}><div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: fam.color, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>{fam.icon} {fam.label}</div><div style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text)", fontWeight: 500, lineHeight: 1.3 }}>{m.name}</div></div><div style={{ textAlign: "right", flexShrink: 0 }}><div style={{ fontSize: 18, fontFamily: "var(--font-d)", fontWeight: 800, color: rag.color, lineHeight: 1 }}>{fmtVal(m)}</div><div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", marginTop: 2 }}>of {m.target}{m.unit}</div></div></div>
                  <div style={{ background: "var(--bg0)", borderRadius: 3, height: 3, overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg,${rag.color}66,${rag.color})`, borderRadius: 3, transition: "width 0.5s ease" }} /></div>
                  <p style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text2)", lineHeight: 1.5 }}>{m.note}</p>
                  {linked.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>{linked.slice(0, 3).map(l => <LinkChip key={l.taskId} task={l.task} linkType={l.type} onClick={navigateToTask} />)}</div>}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}><span style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)" }}>{fmt(m.lastUpdated)}</span><Spark data={m.trend} color={rag.color} positive={m.direction === "higher"} /></div>
                </div>);
              })}
            </div>
          </div>}

          {/* GANTT */}
          {tab === "gantt" && <div style={{ overflowX: "auto" }}>
            <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}><div style={{ width: 205, minWidth: 205, padding: "5px 10px", fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase" }}>Task</div><div style={{ flex: 1, position: "relative", height: 24 }}>{wkL.map((w, i) => <span key={i} style={{ position: "absolute", left: `${w.pct}%`, fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", transform: "translateX(-50%)", top: 5, whiteSpace: "nowrap" }}>{w.label}</span>)}</div></div>
            {phases.map(phase => (<div key={phase}>
              <div style={{ padding: "4px 10px", background: "var(--bg3)", borderBottom: "1px solid var(--border)" }}><span style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--accent)", textTransform: "uppercase", fontWeight: 600 }}>◆ {phase}</span></div>
              {tasks.filter(t => t.phase === phase).map(task => {
                const left = Math.max(0, daysBetween(gS, new Date(task.start))), width = Math.max(1, daysBetween(new Date(task.start), new Date(task.end)));
                const lp = (left / GW) * 100, wp = (width / GW) * 100, meta = STATUS_META[task.status] || STATUS_META["not-started"], hl = task.id === hlTask;
                return (<div key={task.id} id={`tr-${task.id}`} style={{ display: "flex", alignItems: "center", borderBottom: "1px solid var(--border)", minHeight: 33, background: hl ? "var(--bg4)" : "var(--bg1)", transition: "background 0.3s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bg2)"} onMouseLeave={e => e.currentTarget.style.background = hl ? "var(--bg4)" : "var(--bg1)"}>
                  <div style={{ width: 205, minWidth: 205, padding: "0 10px", display: "flex", alignItems: "center", gap: 4 }}><Badge status={task.status} /><span style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.name}</span></div>
                  <div style={{ flex: 1, position: "relative", height: 33 }}>
                    {wkL.map((w, i) => <div key={i} style={{ position: "absolute", left: `${w.pct}%`, top: 0, bottom: 0, borderLeft: "1px solid var(--border)" }} />)}
                    {todayPct >= 0 && todayPct <= 100 && <div style={{ position: "absolute", left: `${todayPct}%`, top: 0, bottom: 0, borderLeft: "1px dashed var(--accent)", zIndex: 2, opacity: 0.7 }} />}
                    {left < GW && left + width > 0 && <div onClick={() => { setSelTask(task); setHlTask(task.id); }} style={{ position: "absolute", left: `${Math.max(0, lp)}%`, width: `${Math.min(wp, 100 - Math.max(0, lp))}%`, top: "50%", transform: "translateY(-50%)", height: 18, background: meta.bg, border: `1px solid ${meta.color}55`, borderLeft: `3px solid ${meta.color}`, borderRadius: 3, overflow: "hidden", cursor: "pointer", transition: "box-shadow 0.3s" }} onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.3)"} onMouseLeave={e => e.currentTarget.style.filter = "brightness(1)"}><div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${task.progress}%`, background: `${meta.color}20` }} /><span style={{ position: "relative", zIndex: 1, fontSize: 11, fontFamily: "var(--font-m)", color: meta.color, paddingLeft: 4, lineHeight: "18px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{task.name}</span></div>}
                  </div>
                </div>);
              })}
            </div>))}
          </div>}

          {/* RISKS */}
          {tab === "risks" && <div>
            <div style={{ padding: "7px 14px", background: "var(--bg2)", borderBottom: "1px solid var(--border)", fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase" }}>{risks.length} total · {openRisks} open</div>
            {risks.map((r, i) => (<div key={r.id} style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "var(--bg1)" : "var(--bg0)", display: "grid", gridTemplateColumns: "1fr auto", gap: 7 }}>
              <div><div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}><span style={{ fontSize: 11, fontFamily: "var(--font-m)", fontWeight: 600, color: { High: "#E8734A", Medium: "#F5C544", Low: "#5DC484" }[r.impact], textTransform: "uppercase" }}>▲ {r.impact}</span><span style={{ fontSize: 12, fontFamily: "var(--font-b)", fontWeight: 500, color: "var(--text)" }}>{r.title}</span><span style={{ fontSize: 11, fontFamily: "var(--font-m)", color: r.status === "Mitigated" ? "var(--green)" : "var(--yellow)", background: r.status === "Mitigated" ? "rgba(93,196,132,0.1)" : "rgba(245,197,68,0.1)", padding: "1px 5px", borderRadius: 2 }}>{r.status}</span></div><p style={{ fontSize: 12, color: "var(--text2)", fontFamily: "var(--font-m)", lineHeight: 1.6 }}><span style={{ color: "var(--text3)" }}>MITIGATION: </span>{r.mitigation}</p></div>
              <div style={{ textAlign: "right" }}><div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--blue)" }}>{r.owner}</div></div>
            </div>))}
          </div>}

          {/* RAID */}
          {tab === "raid" && <RAIDLog raidItems={raidItems} setRaidItems={setRAID} />}

          {/* REPORTS */}
          {tab === "reports" && <ReportsTab state={state} onOpenReport={setOpenReport} />}

          {/* AI COMMAND */}
          {tab === "ai" && <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ padding: "7px 14px", borderBottom: "1px solid var(--border)", background: "var(--bg3)", display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", display: "inline-block", animation: "blink 2s infinite" }} />
              <span style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text2)" }}>Anthropic Claude</span>
              <span style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", marginLeft: "auto" }}>Role: {role} · Ask contextual questions for focused views</span>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "11px 14px", display: "flex", flexDirection: "column", gap: 9 }}>
              {contextView && <ContextView view={contextView} tasks={tasks} risks={risks} metrics={metrics} raidItems={raidItems} benefits={benefits} onClose={() => setContextView(null)} onNavigateTask={navigateToTask} onOpenMetric={m => { setTab("metrics"); setTimeout(() => setOpenM(m), 100); }} onOpenBenefit={b => { setTab("metrics"); setTimeout(() => setOpenBenefit(b), 100); }} />}
              {messages.map((m, i) => (<div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                {m.role === "assistant" && <div style={{ width: 20, height: 20, borderRadius: 3, background: "var(--accent)", marginRight: 6, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#000", fontFamily: "var(--font-d)", marginTop: 2 }}>◆</div>}
                <div style={{ maxWidth: "78%", padding: "7px 11px", borderRadius: m.role === "user" ? "8px 8px 2px 8px" : "8px 8px 8px 2px", background: m.role === "user" ? "rgba(42,191,191,0.12)" : "var(--bg3)", border: `1px solid ${m.role === "user" ? "rgba(42,191,191,0.25)" : "var(--border)"}`, fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{m.content}</div>
              </div>))}
              {loading && <div style={{ display: "flex", alignItems: "center", gap: 7 }}><div style={{ width: 20, height: 20, borderRadius: 3, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#000", fontFamily: "var(--font-d)" }}>◆</div><Spinner /></div>}
              <div ref={bottomRef} />
            </div>
            <div style={{ padding: "8px 12px", borderTop: "1px solid var(--border)", background: "var(--bg2)", display: "flex", gap: 6, flexShrink: 0 }}>
              <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Ask anything — 'Brief me for steerco', 'What should I tell the CFO?', or describe updates…" rows={2} style={{ flex: 1, background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 5, color: "var(--text)", fontFamily: "var(--font-b)", fontSize: 12, padding: "7px 9px", resize: "none", lineHeight: 1.5 }} />
              <button onClick={send} disabled={loading || !input.trim()} style={{ background: loading || !input.trim() ? "var(--bg3)" : "var(--accent)", color: loading || !input.trim() ? "var(--text3)" : "#000", border: "none", borderRadius: 5, padding: "0 14px", fontFamily: "var(--font-d)", fontWeight: 700, fontSize: 11, transition: "all 0.2s", minWidth: 48 }}>{loading ? <Spinner /> : "↑"}</button>
            </div>
          </div>}
        </div>

        {selTask && <TaskDrawer task={tasks.find(t => t.id === selTask.id)} tasks={tasks} metrics={metrics} onClose={() => { setSelTask(null); setHlTask(null); }} onUpdate={(id, upd) => setTasks(prev => prev.map(t => t.id === id ? { ...t, ...upd } : t))} onOpenMetric={m => { setSelTask(null); setHlTask(null); setTab("metrics"); setTimeout(() => setOpenM(m), 100); }} />}
        {openMetric && <MetricPanel metric={metrics.find(m => m.id === openMetric.id) || openMetric} tasks={tasks} onClose={() => setOpenM(null)} onSave={updated => setMetrics(prev => prev.map(m => m.id === updated.id ? updated : m))} onNavigate={navigateToTask} />}
        {openBenefit && <BenefitDrawer benefit={benefits.find(b => b.id === openBenefit.id) || openBenefit} metrics={metrics} onClose={() => setOpenBenefit(null)} onSave={updated => setBenefits(prev => prev.map(b => b.id === updated.id ? updated : b))} />}
      </div>

      {showModal && <OnboardingWizard isModal={true} onComplete={newState => { setState(newState); setShowModal(false); }} onCancel={() => setShowModal(false)} />}
      {openReport && <ReportViewer outputType={openReport} state={state} onClose={() => setOpenReport(null)} />}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════════════════════
export default function APEX() {
  const [screen, setScreen] = useState("onboarding");
  const [state, setState] = useState(null);

  return screen === "onboarding"
    ? <OnboardingWizard onComplete={s => { setState(s); setScreen("dashboard"); }} isModal={false} />
    : <Dashboard state={state} setState={setState} onNewProgramme={() => setScreen("onboarding")} />;
}
