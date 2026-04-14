// Renders the data for a specific metric tab — handles tracked, partial, gap states.
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { EmptyState } from "../components/ui.jsx";

const CHART_COLORS = ["#2ABFBF", "#F5C544", "#5DC484", "#4A9EFF", "#A78BFA", "#E8734A"];

export default function MetricRenderer({ domainId, panelId, tab }) {
  if (tab.status === "gap") {
    return (
      <EmptyState
        icon="○"
        title="Gap — not currently tracked"
        description={tab.prompt || "No data connected for this metric yet. Use the AI chat below to configure a source, upload a file, or propose a definition."}
        actions={[{ label: "Ask AI to configure", onClick: () => {} }]}
      />
    );
  }

  // Dispatch by tab id (composite keys via domain/panel/tab so we can be specific)
  const key = `${domainId}/${panelId}/${tab.id}`;

  // Hotel — CRF Collection
  if (key === "hotel/value/crf") return <CRFCollection data={tab.data} />;
  // Hotel — CMH P2P Rollout
  if (key === "hotel/enablement/cmh-p2p") return <CMHRollout data={tab.data} />;
  // Hotel — Franchise P2P Rollout
  if (key === "hotel/enablement/franchise-p2p") return <FranchiseRollout data={tab.data} />;
  // Hotel — CRF per P2P Platform Deployed
  if (key === "hotel/performance/crf-per-p2p") return <CRFPerPlatform data={tab.data} />;
  // Corporate — CSAT
  if (key === "corporate/value/csat") return <CSAT data={tab.data} />;
  // Corporate — S&C Projects
  if (key === "corporate/enablement/sc-projects") return <SCProjects data={tab.data} />;
  // Corporate — Ops Headcount
  if (key === "corporate/enablement/headcount") return <Headcount data={tab.data} />;
  // Function — ESM Coverage
  if (key === "function/performance/esm") return <ESM data={tab.data} />;
  // Function — I2P Process Optimisation
  if (key === "function/performance/i2p") return <I2P data={tab.data} />;
  // Function — Risk Portfolio / Audit Status (links through)
  if (key === "function/enablement/risk-portfolio" || key === "function/enablement/audit-status") return <LinkThrough tab={tab} />;

  // Partial with no custom renderer
  if (tab.status === "partial") {
    return (
      <EmptyState icon="◐" title="Partial data" description={tab.description} actions={[{ label: "Complete via AI", onClick: () => {} }]} />
    );
  }

  // Tracked but generic — show JSON
  if (tab.data) {
    return <pre style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text2)", background: "var(--bg3)", padding: 12, borderRadius: 6, overflowX: "auto" }}>{JSON.stringify(tab.data, null, 2)}</pre>;
  }

  return <div style={{ fontSize: 13, color: "var(--text3)", padding: 20, textAlign: "center" }}>No renderer configured.</div>;
}

// ── Specific renderers ──────────────────────────────────────────────────────

function CRFCollection({ data }) {
  const d = data || {};
  const rows = d.eligibleByMonth || [];
  return (
    <div>
      <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Eligible CRF ($m) by Region</div>
      <div style={{ height: 260, marginBottom: 18 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text2)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--text2)" }} />
            <Tooltip contentStyle={{ background: "var(--bg2)", border: "1px solid var(--border2)" }} />
            <Legend />
            <Bar dataKey="AMER" fill="#F5C544" stackId="a" />
            <Bar dataKey="EMEAA" fill="#4A9EFF" stackId="a" />
            <Bar dataKey="GC" fill="#5DC484" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        <Mini label="Collected Jan ($m)" value={d.collected?.[0]?.total} />
        <Mini label="Collected Feb ($m)" value={d.collected?.[1]?.total} />
        <Mini label="Avg % CRF AMER" value={`${d.avgPct?.AMER}%`} />
        <Mini label="Avg % CRF GC" value={`${d.avgPct?.GC}%`} />
      </div>
    </div>
  );
}

function CMHRollout({ data }) {
  const d = data || {};
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
        <Mini label="GC %" value={`${d.estatePct?.GC}%`} />
        <Mini label="EMEAA %" value={`${d.estatePct?.EMEAA}%`} />
        <Mini label="AMER %" value={`${d.estatePct?.AMER}%`} />
        <Mini label="Total %" value={`${d.estatePct?.total}%`} highlight />
      </div>
      <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Systems deployed — monthly</div>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={d.byMonth || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text2)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--text2)" }} />
            <Tooltip contentStyle={{ background: "var(--bg2)", border: "1px solid var(--border2)" }} />
            <Legend />
            <Line type="monotone" dataKey="total" stroke="#2ABFBF" strokeWidth={2} />
            <Line type="monotone" dataKey="GC" stroke="#5DC484" />
            <Line type="monotone" dataKey="EMEAA" stroke="#4A9EFF" />
            <Line type="monotone" dataKey="AMER" stroke="#F5C544" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text2)", marginTop: 10 }}>2026 target: <strong style={{ color: "var(--accent)" }}>{d.target2026}</strong></div>
    </div>
  );
}

function FranchiseRollout({ data }) {
  const d = data || {};
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Systems — monthly</div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.byMonth || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text2)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--text2)" }} />
                <Tooltip contentStyle={{ background: "var(--bg2)", border: "1px solid var(--border2)" }} />
                <Bar dataKey="total" fill="#4A9EFF" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Priority markets coverage %</div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.priorityMarketPct || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text2)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--text2)" }} />
                <Tooltip contentStyle={{ background: "var(--bg2)", border: "1px solid var(--border2)" }} />
                <Area type="monotone" dataKey="pct" stroke="#F5C544" fill="#F5C54440" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      {d.note && <div style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text2)", marginTop: 12, fontStyle: "italic" }}>{d.note}</div>}
    </div>
  );
}

function CRFPerPlatform({ data }) {
  const d = data || {};
  return (
    <div>
      <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>CRF per P2P platform ($) by region</div>
      <div style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={d.byMonth || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text2)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--text2)" }} />
            <Tooltip contentStyle={{ background: "var(--bg2)", border: "1px solid var(--border2)" }} />
            <Legend />
            <Bar dataKey="AMER" fill="#F5C544" />
            <Bar dataKey="EMEAA" fill="#4A9EFF" />
            <Bar dataKey="GC" fill="#5DC484" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {d.note && <div style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text2)", marginTop: 10, fontStyle: "italic" }}>{d.note}</div>}
    </div>
  );
}

function CSAT({ data }) {
  const d = data || {};
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 12 }}>
        {(d.months || []).map(m => <Mini key={m.month} label={m.month} value={m.score} highlight />)}
        <Mini label="Annual target" value={d.annualTarget} />
      </div>
      <div style={{ fontSize: 12, color: "var(--text3)" }}>Response rate: {d.responseRate}</div>
    </div>
  );
}

function SCProjects({ data }) {
  const d = data || {};
  return (
    <div>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={d.byMonth || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text2)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--text2)" }} />
            <Tooltip contentStyle={{ background: "var(--bg2)", border: "1px solid var(--border2)" }} />
            <Bar dataKey="count" fill="#5DC484" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Headcount({ data }) {
  const d = data || {};
  return (
    <div>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={d.byMonth || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text2)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--text2)" }} />
            <Tooltip contentStyle={{ background: "var(--bg2)", border: "1px solid var(--border2)" }} />
            <Legend />
            <Bar dataKey="filled" stackId="h" fill="#5DC484" name="Filled" />
            <Bar dataKey="open" stackId="h" fill="#F5C544" name="Open" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {d.note && <div style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text2)", marginTop: 10, fontStyle: "italic" }}>{d.note}</div>}
    </div>
  );
}

function ESM({ data }) {
  const d = data || {};
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <div style={{ padding: 14, background: "var(--bg3)", borderRadius: 6, border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "#A78BFA", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Responsible Procurement (RR)</div>
          <Mini label="Outreach" value={d.rr?.outreach} />
          <div style={{ height: 8 }} />
          <Mini label="Gap to ambition" value={d.rr?.outreachGap} />
          <div style={{ height: 8 }} />
          <Mini label="Rated" value={d.rr?.rated} />
        </div>
        <div style={{ padding: 14, background: "var(--bg3)", borderRadius: 6, border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "#5DC484", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>EcoVadis</div>
          <Mini label="Outreach" value={d.ecovadis?.outreach} />
          <div style={{ height: 8 }} />
          <Mini label="vs plan" value={d.ecovadis?.vsPlan > 0 ? `+${d.ecovadis?.vsPlan}` : d.ecovadis?.vsPlan} />
          <div style={{ height: 8 }} />
          <Mini label="% rated good+" value={`${d.ecovadis?.ratedGoodPlus}%`} />
        </div>
        <div style={{ padding: 14, background: "var(--bg3)", borderRadius: 6, border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "#4A9EFF", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Sedex</div>
          <Mini label="Outreach" value={d.sedex?.outreach} />
          <div style={{ height: 8 }} />
          <Mini label="Pre-screened" value={d.sedex?.preScreened} />
          <div style={{ height: 8 }} />
          <Mini label="High-risk audit" value={d.sedex?.highRiskAudit} />
        </div>
      </div>
    </div>
  );
}

function I2P({ data }) {
  const d = data || {};
  const total = (d.wip || 0) + (d.complete || 0) + (d.planned || 0);
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        <Mini label="WIP" value={d.wip} />
        <Mini label="Complete" value={d.complete} />
        <Mini label="Planned" value={d.planned} />
        <Mini label="Total sub-processes" value={total} highlight />
      </div>
      <div style={{ height: 12, background: "var(--bg0)", borderRadius: 6, overflow: "hidden", marginTop: 16, display: "flex" }}>
        <div style={{ width: `${(d.complete / total) * 100}%`, background: "#5DC484" }} />
        <div style={{ width: `${(d.wip / total) * 100}%`, background: "#F5C544" }} />
        <div style={{ width: `${(d.planned / total) * 100}%`, background: "#6B8FA3" }} />
      </div>
    </div>
  );
}

function LinkThrough({ tab }) {
  return (
    <div style={{ padding: 20, textAlign: "center" }}>
      <div style={{ fontSize: 14, fontFamily: "var(--font-d)", color: "var(--text)", marginBottom: 8 }}>This metric is surfaced in Programme View</div>
      <div style={{ fontSize: 13, fontFamily: "var(--font-b)", color: "var(--text2)" }}>Navigate to Programme View → Risks & Compliance for the full detail.</div>
    </div>
  );
}

function Mini({ label, value, highlight }) {
  return (
    <div style={{ padding: 10, background: "var(--bg3)", borderRadius: 6, border: "1px solid var(--border)" }}>
      <div style={{ fontSize: 10, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: highlight ? 22 : 18, fontFamily: "var(--font-d)", fontWeight: 800, color: highlight ? "var(--accent)" : "var(--text)" }}>{value ?? "—"}</div>
    </div>
  );
}
