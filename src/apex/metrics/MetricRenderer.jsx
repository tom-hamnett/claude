// Renders metric data matching the QBR slide format:
// - Orange headline bar with summary
// - Stacked bars by region with target lines
// - Estate % tables below charts
// - MoM variance callouts
// - Chart type toggles
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, ComposedChart, ReferenceLine } from "recharts";
import { EmptyState } from "../components/ui.jsx";

const REGION_COLORS = { GC: "#5DC484", EMEAA: "#4A9EFF", AMER: "#F5C544", total: "#2ABFBF" };

function Headline({ text }) {
  if (!text) return null;
  return (
    <div style={{ background: "linear-gradient(90deg, #E8734A, #D4603A)", borderRadius: 6, padding: "10px 16px", marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontFamily: "var(--font-d)", fontWeight: 700, color: "#FFFFFF", lineHeight: 1.4 }}>{text}</div>
    </div>
  );
}

function MoMBadge({ label, current, previous, unit = "" }) {
  const delta = current - previous;
  const isUp = delta > 0;
  const color = isUp ? "#5DC484" : delta < 0 ? "#E8734A" : "var(--text3)";
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 6 }}>
      <span style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontSize: 16, fontFamily: "var(--font-d)", fontWeight: 800, color: "var(--accent)" }}>{current}{unit}</span>
      <span style={{ fontSize: 12, fontFamily: "var(--font-m)", color, fontWeight: 700 }}>MoM {isUp ? "+" : ""}{delta}{unit}</span>
    </div>
  );
}

function EstateTable({ data, columns }) {
  if (!data || !data.length) return null;
  return (
    <div style={{ marginTop: 12, background: "var(--bg3)", borderRadius: 6, border: "1px solid var(--border)", overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: `80px repeat(${data.length}, 1fr)`, fontSize: 11, fontFamily: "var(--font-m)" }}>
        <div style={{ padding: "6px 10px", borderBottom: "1px solid var(--border)", color: "var(--text3)", background: "var(--bg4)" }}></div>
        {data.map(d => <div key={d.month} style={{ padding: "6px 10px", borderBottom: "1px solid var(--border)", color: "var(--text2)", background: "var(--bg4)", textAlign: "center", fontWeight: 600 }}>{d.month}</div>)}
        {columns.map(col => (
          <>
            <div key={`${col.key}-label`} style={{ padding: "5px 10px", borderBottom: "1px solid var(--border)", color: "var(--text3)" }}>{col.label}</div>
            {data.map(d => <div key={`${col.key}-${d.month}`} style={{ padding: "5px 10px", borderBottom: "1px solid var(--border)", color: col.color || "var(--text)", textAlign: "center", fontWeight: 600 }}>{d[col.key] != null ? `${d[col.key]}%` : "—"}</div>)}
          </>
        ))}
      </div>
    </div>
  );
}

function ChartToggle({ options, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
      {options.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)} style={{ fontSize: 11, fontFamily: "var(--font-d)", fontWeight: active === o.id ? 700 : 500, padding: "5px 12px", borderRadius: 5, background: active === o.id ? "var(--accent)" : "var(--bg3)", color: active === o.id ? "#000" : "var(--text2)", border: `1px solid ${active === o.id ? "var(--accent)" : "var(--border2)"}` }}>{o.label}</button>
      ))}
    </div>
  );
}

export default function MetricRenderer({ domainId, panelId, tab }) {
  if (tab.status === "gap") {
    return (
      <EmptyState
        icon="○"
        title="Gap — not currently tracked"
        description={tab.prompt || "No data connected for this metric. Use the AI chat below to configure a source, upload a file, or propose a definition."}
        actions={[{ label: "Ask AI to configure", onClick: () => {} }]}
      />
    );
  }

  const key = `${domainId}/${panelId}/${tab.id}`;

  if (key === "hotel/value/crf") return <CRFCollection data={tab.data} />;
  if (key === "hotel/enablement/cmh-p2p") return <CMHRollout data={tab.data} />;
  if (key === "hotel/enablement/franchise-p2p") return <FranchiseRollout data={tab.data} />;
  if (key === "hotel/performance/crf-per-p2p") return <CRFPerPlatform data={tab.data} />;
  if (key === "corporate/value/csat") return <CSAT data={tab.data} />;
  if (key === "corporate/enablement/sc-projects") return <SCProjects data={tab.data} />;
  if (key === "corporate/enablement/headcount") return <Headcount data={tab.data} />;
  if (key === "function/performance/esm") return <ESM data={tab.data} />;
  if (key === "function/performance/i2p") return <I2P data={tab.data} />;
  if (key === "function/enablement/risk-portfolio" || key === "function/enablement/audit-status") return <LinkThrough tab={tab} />;

  if (tab.status === "partial") {
    return <EmptyState icon="◐" title="Partial data" description={tab.description} actions={[{ label: "Complete via AI", onClick: () => {} }]} />;
  }

  if (tab.data) {
    return <pre style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text2)", background: "var(--bg3)", padding: 12, borderRadius: 6, overflowX: "auto" }}>{JSON.stringify(tab.data, null, 2)}</pre>;
  }

  return <div style={{ fontSize: 13, color: "var(--text3)", padding: 20, textAlign: "center" }}>No renderer configured.</div>;
}

// ── CRF Collection (multi-section like QBR slide 21) ────────────────────────
function CRFCollection({ data }) {
  const d = data || {};
  const [view, setView] = useState("stacked");
  const rows = d.eligibleByMonth || [];
  const lastTwo = rows.slice(-2);

  return (
    <div>
      <Headline text={d.headline} />
      <ChartToggle options={[{ id: "stacked", label: "Stacked Bars" }, { id: "trend", label: "Trend Lines" }]} active={view} onChange={setView} />

      {/* CRF Eligible */}
      <div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>CRF Eligible ($M)</div>
      <div style={{ height: 220, marginBottom: 8 }}>
        <ResponsiveContainer width="100%" height="100%">
          {view === "stacked" ? (
            <BarChart data={rows} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#E0ECF4" }} />
              <YAxis tick={{ fontSize: 11, fill: "#B0CBE0" }} />
              <Tooltip contentStyle={{ background: "#0F3A52", border: "1px solid #1E6080", color: "#fff" }} />
              <Legend />
              <Bar dataKey="AMER" fill="#F5C544" stackId="a" name="AMER" />
              <Bar dataKey="EMEAA" fill="#4A9EFF" stackId="a" name="EMEAA" />
              <Bar dataKey="GC" fill="#5DC484" stackId="a" name="GC" />
            </BarChart>
          ) : (
            <LineChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#E0ECF4" }} />
              <YAxis tick={{ fontSize: 11, fill: "#B0CBE0" }} />
              <Tooltip contentStyle={{ background: "#0F3A52", border: "1px solid #1E6080", color: "#fff" }} />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#2ABFBF" strokeWidth={2} name="Total" />
              <Line type="monotone" dataKey="AMER" stroke="#F5C544" name="AMER" />
              <Line type="monotone" dataKey="EMEAA" stroke="#4A9EFF" name="EMEAA" />
              <Line type="monotone" dataKey="GC" stroke="#5DC484" name="GC" />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* MoM variance */}
      {lastTwo.length === 2 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <MoMBadge label="Total" current={lastTwo[1].total} previous={lastTwo[0].total} unit="M" />
          <MoMBadge label="AMER" current={lastTwo[1].AMER} previous={lastTwo[0].AMER} unit="M" />
          <MoMBadge label="GC" current={lastTwo[1].GC} previous={lastTwo[0].GC} unit="M" />
        </div>
      )}

      {/* CRF Collected + Avg % */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>CRF Collected ($M)</div>
          <div style={{ height: 140 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.collected || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#E0ECF4" }} />
                <YAxis tick={{ fontSize: 11, fill: "#B0CBE0" }} />
                <Tooltip contentStyle={{ background: "#0F3A52", border: "1px solid #1E6080", color: "#fff" }} />
                <Bar dataKey="total" fill="#2ABFBF" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Avg % CRF Collected</div>
          <div style={{ height: 140 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={d.avgPct || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#E0ECF4" }} />
                <YAxis tick={{ fontSize: 11, fill: "#B0CBE0" }} domain={[0, 4]} />
                <Tooltip contentStyle={{ background: "#0F3A52", border: "1px solid #1E6080", color: "#fff" }} />
                <Legend />
                <Line type="monotone" dataKey="AMER" stroke="#F5C544" strokeWidth={2} />
                <Line type="monotone" dataKey="EMEAA" stroke="#4A9EFF" strokeWidth={2} />
                <Line type="monotone" dataKey="GC" stroke="#5DC484" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── CMH P2P Rollout (stacked bars + target line + estate % table) ───────────
function CMHRollout({ data }) {
  const d = data || {};
  const combined = (d.byMonth || []).map(m => {
    const target = d.targetLine?.find(t => t.month === m.month);
    return { ...m, target: target?.target };
  });

  return (
    <div>
      <Headline text={d.headline} />
      <div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>P2P Platform Roll-Out — Number of CMH P2P Systems</div>
      <div style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={combined} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#E0ECF4" }} />
            <YAxis tick={{ fontSize: 11, fill: "#B0CBE0" }} domain={[0, 900]} />
            <Tooltip contentStyle={{ background: "#0F3A52", border: "1px solid #1E6080", color: "#fff" }} />
            <Legend />
            <Bar dataKey="GC" fill="#5DC484" stackId="a" name="GC" />
            <Bar dataKey="EMEAA" fill="#4A9EFF" stackId="a" name="EMEAA" />
            <Bar dataKey="AMER" fill="#F5C544" stackId="a" name="AMER" />
            <Line type="monotone" dataKey="target" stroke="#E8734A" strokeWidth={2} strokeDasharray="6 3" dot={false} name="Target" />
            <ReferenceLine y={d.target2026} stroke="#E8734A" strokeDasharray="4 4" label={{ value: `Target: ${d.target2026}`, fill: "#E8734A", fontSize: 11, position: "right" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Estate % table */}
      <EstateTable
        data={d.estatePct || []}
        columns={[
          { key: "GC", label: "% GC Estate", color: "#5DC484" },
          { key: "EMEAA", label: "% EMEAA Estate", color: "#4A9EFF" },
          { key: "AMER", label: "% AMER Estate", color: "#F5C544" },
          { key: "total", label: "% Total CMH Est.", color: "#2ABFBF" },
        ]}
      />
    </div>
  );
}

// ── Franchise P2P Rollout (line + target + estate %) ────────────────────────
function FranchiseRollout({ data }) {
  const d = data || {};
  const combined = (d.byMonth || []).map(m => {
    const target = d.targetLine?.find(t => t.month === m.month);
    return { ...m, target: target?.target };
  });

  return (
    <div>
      <Headline text={d.headline} />
      <div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>P2P Platform Roll-Out — Number of Franchise P2P Systems</div>
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={combined} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#E0ECF4" }} />
            <YAxis tick={{ fontSize: 11, fill: "#B0CBE0" }} domain={[0, 900]} />
            <Tooltip contentStyle={{ background: "#0F3A52", border: "1px solid #1E6080", color: "#fff" }} />
            <Legend />
            <Bar dataKey="GC" fill="#5DC484" stackId="a" name="GC" />
            <Bar dataKey="EMEAA" fill="#4A9EFF" stackId="a" name="EMEAA" />
            <Bar dataKey="AMER" fill="#F5C544" stackId="a" name="AMER" />
            <Line type="monotone" dataKey="target" stroke="#E8734A" strokeWidth={2} strokeDasharray="6 3" dot={false} name="Forecast" />
            <ReferenceLine y={d.target2026} stroke="#E8734A" strokeDasharray="4 4" label={{ value: `Target: ${d.target2026}`, fill: "#E8734A", fontSize: 11, position: "right" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {d.note && <div style={{ padding: "10px 14px", background: "rgba(232,115,74,0.08)", border: "1px solid rgba(232,115,74,0.25)", borderRadius: 6, marginTop: 10, fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text)", lineHeight: 1.5, fontStyle: "italic" }}>{d.note}</div>}

      <EstateTable
        data={d.estatePct || []}
        columns={[
          { key: "GC", label: "% GC Estate", color: "#5DC484" },
          { key: "UK_Aus", label: "% UK & Aus", color: "#4A9EFF" },
          { key: "USA", label: "% USA Estate", color: "#F5C544" },
          { key: "priority", label: "% Priority Markets", color: "#2ABFBF" },
        ]}
      />
    </div>
  );
}

// ── CRF per P2P Platform (grouped bars) ─────────────────────────────────────
function CRFPerPlatform({ data }) {
  const d = data || {};
  const [view, setView] = useState("grouped");
  return (
    <div>
      <Headline text={d.headline} />
      <ChartToggle options={[{ id: "grouped", label: "Grouped Bars" }, { id: "trend", label: "Trend Lines" }]} active={view} onChange={setView} />
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          {view === "grouped" ? (
            <BarChart data={d.byMonth || []} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#E0ECF4" }} />
              <YAxis tick={{ fontSize: 11, fill: "#B0CBE0" }} />
              <Tooltip contentStyle={{ background: "#0F3A52", border: "1px solid #1E6080", color: "#fff" }} formatter={(v) => `$${v.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="AMER" fill="#F5C544" name="AMER" />
              <Bar dataKey="EMEAA" fill="#4A9EFF" name="EMEAA" />
              <Bar dataKey="GC" fill="#5DC484" name="GC" />
            </BarChart>
          ) : (
            <LineChart data={d.byMonth || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#E0ECF4" }} />
              <YAxis tick={{ fontSize: 11, fill: "#B0CBE0" }} />
              <Tooltip contentStyle={{ background: "#0F3A52", border: "1px solid #1E6080", color: "#fff" }} formatter={(v) => `$${v.toLocaleString()}`} />
              <Legend />
              <Line type="monotone" dataKey="AMER" stroke="#F5C544" strokeWidth={2} />
              <Line type="monotone" dataKey="EMEAA" stroke="#4A9EFF" strokeWidth={2} />
              <Line type="monotone" dataKey="GC" stroke="#5DC484" strokeWidth={2} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
      {d.note && <div style={{ padding: "10px 14px", background: "rgba(232,115,74,0.08)", border: "1px solid rgba(232,115,74,0.25)", borderRadius: 6, marginTop: 10, fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text)", lineHeight: 1.5, fontStyle: "italic" }}>{d.note}</div>}
    </div>
  );
}

// ── CSAT (scores with MoM variance) ─────────────────────────────────────────
function CSAT({ data }) {
  const d = data || {};
  const months = d.months || [];
  const last = months[months.length - 1];
  const prev = months[months.length - 2];
  return (
    <div>
      <Headline text={d.headline} />
      <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        {months.map(m => (
          <div key={m.month} style={{ padding: "10px 16px", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8, textAlign: "center", minWidth: 80 }}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>{m.month}</div>
            <div style={{ fontSize: 24, fontFamily: "var(--font-d)", fontWeight: 800, color: m.score >= d.annualTarget ? "#5DC484" : "#F5C544" }}>{m.score}</div>
          </div>
        ))}
        {last && prev && <MoMBadge label="MoM" current={last.score} previous={prev.score} />}
        <div style={{ padding: "10px 16px", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8, textAlign: "center" }}>
          <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Target</div>
          <div style={{ fontSize: 24, fontFamily: "var(--font-d)", fontWeight: 800, color: "var(--accent)" }}>{d.annualTarget}</div>
        </div>
      </div>
      <div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text3)" }}>Response rate: {d.responseRate}</div>
    </div>
  );
}

// ── S&C Projects (bars with MoM variance) ───────────────────────────────────
function SCProjects({ data }) {
  const d = data || {};
  const months = d.byMonth || [];
  const last = months[months.length - 1];
  const prev = months[months.length - 2];
  return (
    <div>
      <Headline text={d.headline} />
      {last && prev && <div style={{ marginBottom: 12 }}><MoMBadge label="Projects" current={last.count} previous={prev.count} /></div>}
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={months} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#E0ECF4" }} />
            <YAxis tick={{ fontSize: 11, fill: "#B0CBE0" }} />
            <Tooltip contentStyle={{ background: "#0F3A52", border: "1px solid #1E6080", color: "#fff" }} />
            <Bar dataKey="count" fill="#5DC484" name="Projects Completed" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Headcount (stacked filled/open with MoM) ────────────────────────────────
function Headcount({ data }) {
  const d = data || {};
  const months = d.byMonth || [];
  const last = months[months.length - 1];
  const prev = months[months.length - 2];
  return (
    <div>
      <Headline text={d.headline} />
      {last && prev && <div style={{ marginBottom: 12 }}><MoMBadge label="Total HC" current={last.total} previous={prev.total} /></div>}
      <div style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={months} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#E0ECF4" }} />
            <YAxis tick={{ fontSize: 11, fill: "#B0CBE0" }} />
            <Tooltip contentStyle={{ background: "#0F3A52", border: "1px solid #1E6080", color: "#fff" }} />
            <Legend />
            <Bar dataKey="filled" stackId="h" fill="#5DC484" name="Filled" />
            <Bar dataKey="open" stackId="h" fill="#F5C544" name="Open" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {d.note && <div style={{ padding: "10px 14px", background: "rgba(42,191,191,0.08)", border: "1px solid rgba(42,191,191,0.25)", borderRadius: 6, marginTop: 10, fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text)", lineHeight: 1.5, fontStyle: "italic" }}>{d.note}</div>}
    </div>
  );
}

// ── ESM Coverage (dual panel: current status + cumulative tracking) ──────────
function ESM({ data }) {
  const d = data || {};
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        {/* Rapid Ratings */}
        <div style={{ padding: 16, background: "var(--bg3)", borderRadius: 8, border: "1px solid var(--border)", borderTop: "3px solid #A78BFA" }}>
          <div style={{ fontSize: 12, fontFamily: "var(--font-d)", fontWeight: 700, color: "#A78BFA", marginBottom: 10 }}>Rapid Ratings</div>
          <MetricRow label="Outreach" value={d.rr?.outreach} target={d.rr?.outreach + d.rr?.outreachGap} />
          <MetricRow label="Gap to ambition" value={d.rr?.outreachGap} color="#E8734A" />
          <MetricRow label="Rated" value={d.rr?.rated} target={d.rr?.rated + d.rr?.ratedGap} />
          <MetricRow label="Gap to rated target" value={d.rr?.ratedGap} color="#E8734A" />
        </div>
        {/* EcoVadis */}
        <div style={{ padding: 16, background: "var(--bg3)", borderRadius: 8, border: "1px solid var(--border)", borderTop: "3px solid #5DC484" }}>
          <div style={{ fontSize: 12, fontFamily: "var(--font-d)", fontWeight: 700, color: "#5DC484", marginBottom: 10 }}>EcoVadis</div>
          <MetricRow label="Outreach" value={d.ecovadis?.outreach} />
          <MetricRow label="vs Plan" value={d.ecovadis?.vsPlan > 0 ? `+${d.ecovadis?.vsPlan}` : d.ecovadis?.vsPlan} color="#5DC484" />
          <MetricRow label="% Rated Good+" value={`${d.ecovadis?.ratedGoodPlus}%`} />
          <MetricRow label="Participation" value={d.ecovadis?.participationNote} />
        </div>
        {/* Sedex */}
        <div style={{ padding: 16, background: "var(--bg3)", borderRadius: 8, border: "1px solid var(--border)", borderTop: "3px solid #4A9EFF" }}>
          <div style={{ fontSize: 12, fontFamily: "var(--font-d)", fontWeight: 700, color: "#4A9EFF", marginBottom: 10 }}>Sedex</div>
          <MetricRow label="Outreach" value={d.sedex?.outreach} />
          <MetricRow label="Pre-screened" value={d.sedex?.preScreened} />
          <MetricRow label="High-risk audit" value={d.sedex?.highRiskAudit} color={d.sedex?.highRiskAudit > 0 ? "#E8734A" : "#5DC484"} />
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value, target, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text2)" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 15, fontFamily: "var(--font-d)", fontWeight: 800, color: color || "var(--text)" }}>{value ?? "—"}</span>
        {target != null && <span style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)" }}>/ {target}</span>}
      </div>
    </div>
  );
}

// ── I2P Process Optimisation ────────────────────────────────────────────────
function I2P({ data }) {
  const d = data || {};
  const total = (d.wip || 0) + (d.complete || 0) + (d.planned || 0);
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
        <MetricCard label="WIP" value={d.wip} color="#F5C544" />
        <MetricCard label="Complete" value={d.complete} color="#5DC484" />
        <MetricCard label="Planned" value={d.planned} color="#6B8FA3" />
        <MetricCard label="Total" value={total} color="#2ABFBF" highlight />
      </div>
      <div style={{ height: 16, background: "var(--bg0)", borderRadius: 8, overflow: "hidden", display: "flex" }}>
        <div style={{ width: `${((d.complete || 0) / total) * 100}%`, background: "#5DC484", transition: "width 0.5s" }} />
        <div style={{ width: `${((d.wip || 0) / total) * 100}%`, background: "#F5C544", transition: "width 0.5s" }} />
        <div style={{ width: `${((d.planned || 0) / total) * 100}%`, background: "#6B8FA3", transition: "width 0.5s" }} />
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
        <span style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "#5DC484" }}>■ Complete</span>
        <span style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "#F5C544" }}>■ WIP</span>
        <span style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "#6B8FA3" }}>■ Planned</span>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color, highlight }) {
  return (
    <div style={{ padding: "12px 14px", background: "var(--bg3)", borderRadius: 8, border: `1px solid ${highlight ? color : "var(--border)"}`, textAlign: "center" }}>
      <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: highlight ? 28 : 22, fontFamily: "var(--font-d)", fontWeight: 800, color }}>{value ?? "—"}</div>
    </div>
  );
}

function LinkThrough({ tab }) {
  return (
    <div style={{ padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 15, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>This metric is surfaced in Programme View</div>
      <div style={{ fontSize: 13, fontFamily: "var(--font-b)", color: "var(--text2)" }}>Navigate to Programme View → Risks & Compliance for the full detail.</div>
    </div>
  );
}
