// Shared UI primitives
import { RAG_DUAL, METRIC_STATUS, GAP_SEVERITY } from "../lib/theme.js";

export const Spinner = ({ s = 14, c = "var(--accent)" }) => (
  <div style={{ width: s, height: s, border: `2px solid var(--border2)`, borderTopColor: c, borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
);

export const Pip = ({ color, size = 8 }) => (
  <span style={{ width: size, height: size, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
);

export function RagDual({ timeline, value }) {
  const t = RAG_DUAL[timeline] || RAG_DUAL.grey;
  const v = RAG_DUAL[value] || RAG_DUAL.grey;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <div title={`Timeline: ${t.label}`} style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <Pip color={t.color} />
        <span style={{ fontSize: 10, fontFamily: "var(--font-m)", color: "var(--text3)" }}>T</span>
      </div>
      <div title={`Value: ${v.label}`} style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <Pip color={v.color} />
        <span style={{ fontSize: 10, fontFamily: "var(--font-m)", color: "var(--text3)" }}>V</span>
      </div>
    </div>
  );
}

export function MetricStatusPill({ status }) {
  const m = METRIC_STATUS[status] || METRIC_STATUS.gap;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontFamily: "var(--font-m)", padding: "2px 8px", border: `1px solid ${m.color}50`, borderRadius: 3, color: m.color, background: `${m.color}15`, textTransform: "uppercase", letterSpacing: "0.08em" }}>
      {m.icon} {m.label}
    </span>
  );
}

export function SeverityChip({ severity }) {
  const s = GAP_SEVERITY[severity] || GAP_SEVERITY.important;
  return (
    <span style={{ fontSize: 10, fontFamily: "var(--font-m)", padding: "2px 8px", border: `1px solid ${s.color}50`, borderRadius: 3, color: s.color, background: `${s.color}15`, textTransform: "uppercase", letterSpacing: "0.08em" }}>
      {s.label}
    </span>
  );
}

export function Card({ children, color = "var(--accent)", accentSide = "left", style = {}, ...rest }) {
  const border = accentSide === "top" ? { borderTop: `3px solid ${color}` } : { borderLeft: `3px solid ${color}` };
  return (
    <div {...rest} style={{ background: "var(--bg2)", border: "1px solid var(--border)", ...border, borderRadius: 8, padding: "14px 16px", ...style }}>
      {children}
    </div>
  );
}

export function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: 16, overflowX: "auto" }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{ padding: "10px 16px", fontSize: 13, fontFamily: "var(--font-d)", fontWeight: active === t.id ? 700 : 500, color: active === t.id ? "var(--text)" : "var(--text2)", borderBottom: active === t.id ? "2px solid var(--accent)" : "2px solid transparent", background: active === t.id ? "rgba(42,191,191,0.08)" : "none", transition: "all 0.15s", whiteSpace: "nowrap" }}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ icon = "○", title, description, actions = [] }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px", background: "var(--bg2)", border: "1px dashed var(--border2)", borderRadius: 8 }}>
      <div style={{ fontSize: 40, color: "var(--text3)", marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 15, fontFamily: "var(--font-d)", fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>{title}</div>
      {description && <p style={{ fontSize: 13, fontFamily: "var(--font-b)", color: "var(--text2)", lineHeight: 1.6, maxWidth: 480, margin: "0 auto 12px" }}>{description}</p>}
      {actions.length > 0 && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 12 }}>
          {actions.map((a, i) => (
            <button key={i} onClick={a.onClick} style={{ fontSize: 12, fontFamily: "var(--font-d)", fontWeight: 600, padding: "8px 16px", borderRadius: 6, background: a.primary ? "var(--accent)" : "var(--bg3)", color: a.primary ? "#000" : "var(--text)", border: a.primary ? "none" : "1px solid var(--border2)" }}>{a.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export function PageHeader({ breadcrumb = [], title, subtitle, onBack, actions }) {
  return (
    <div style={{ padding: "14px 24px", borderBottom: "1px solid var(--border)", background: "var(--bg1)", flexShrink: 0 }}>
      {breadcrumb.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
          {breadcrumb.map((b, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              {b.onClick ? (
                <button onClick={b.onClick} style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{b.label}</button>
              ) : (
                <span style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{b.label}</span>
              )}
              {i < breadcrumb.length - 1 && <span style={{ color: "var(--text3)" }}>›</span>}
            </span>
          ))}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontFamily: "var(--font-d)", fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em" }}>{title}</div>
          {subtitle && <div style={{ fontSize: 13, fontFamily: "var(--font-b)", color: "var(--text2)", marginTop: 3 }}>{subtitle}</div>}
        </div>
        {actions && <div style={{ display: "flex", gap: 8 }}>{actions}</div>}
      </div>
    </div>
  );
}
