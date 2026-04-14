// Theme: fonts + CSS variables + animations — injected once
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
  --rag-dark-green:#2E9E5F;--rag-light-green:#5DC484;--rag-amber:#F5C544;
  --rag-amber-red:#E89E4A;--rag-red:#E8734A;--rag-grey:#6B8FA3;
  --text:#FFFFFF;--text2:#E0ECF4;--text3:#B0CBE0;
  --font-d:'Outfit',sans-serif;--font-m:'JetBrains Mono',monospace;--font-b:'Inter',sans-serif;
}
body{background:var(--bg0);color:var(--text);font-family:var(--font-b);min-height:100vh}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:var(--bg1)}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}
::-webkit-scrollbar-thumb:hover{background:var(--accent)}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideRight{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:translateX(0)}}
@keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
@keyframes shimmer{0%{opacity:0.6}50%{opacity:1}100%{opacity:0.6}}
.fu{animation:fadeUp 0.3s ease forwards}
.sr{animation:slideRight 0.25s ease forwards}
.sd{animation:slideDown 0.25s ease forwards}
textarea:focus,input:focus,select:focus{outline:none}
button{cursor:pointer;border:none;background:none;font-family:var(--font-b);color:inherit}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
`;
document.head.appendChild(_css);

export const RAG_DUAL = {
  "dark-green":  { color: "#2E9E5F", bg: "rgba(46,158,95,0.15)",  label: "Ahead" },
  "light-green": { color: "#5DC484", bg: "rgba(93,196,132,0.12)", label: "On Track" },
  "amber":       { color: "#F5C544", bg: "rgba(245,197,68,0.12)", label: "Minor Variance" },
  "amber-red":   { color: "#E89E4A", bg: "rgba(232,158,74,0.12)", label: "At Risk" },
  "red":         { color: "#E8734A", bg: "rgba(232,115,74,0.12)", label: "Material Issue" },
  "grey":        { color: "#6B8FA3", bg: "rgba(107,143,163,0.15)", label: "Not Started" },
};

export const RISK_DOMAINS = {
  "comms": { label: "Comms / Reputational", color: "#A78BFA" },
  "performance": { label: "Performance / Compliance", color: "#E8734A" },
  "process": { label: "Process / Operational", color: "#F5C544" },
  "scope": { label: "Scope / Plan / Budget", color: "#4A9EFF" },
  "technical": { label: "Technical", color: "#2ABFBF" },
  "schedule": { label: "Schedule", color: "#E89E4A" },
  "compliance": { label: "Compliance", color: "#E8734A" },
  "reputational": { label: "Reputational", color: "#A78BFA" },
};

export const GAP_SEVERITY = {
  blocking: { label: "Blocking", color: "#E8734A" },
  important: { label: "Important", color: "#F5C544" },
  "nice-to-have": { label: "Nice to Have", color: "#5DC484" },
};

export const METRIC_STATUS = {
  tracked: { label: "Tracked", icon: "✓", color: "#5DC484" },
  partial: { label: "Partial", icon: "◐", color: "#F5C544" },
  gap: { label: "Gap", icon: "○", color: "#E8734A" },
};
