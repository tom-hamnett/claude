export const today = new Date();
export const d = (n) => { const dt = new Date(today); dt.setDate(dt.getDate() + n); return dt.toISOString().split("T")[0]; };
export const fmt = (s) => s ? new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—";
export const fmtL = (s) => s ? new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
export const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
export const daysUntil = (s) => s ? daysBetween(d(0), s) : null;
export const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export async function readFile(f) {
  return new Promise(r => {
    const fr = new FileReader();
    fr.onload = e => r(e.target.result);
    fr.onerror = () => r(`[Could not read: ${f.name}]`);
    fr.readAsText(f);
  });
}

export function riskScore(p, i) { return (p || 0) * (i || 0); }
export function riskBand(score) {
  if (score >= 15) return { label: "High", color: "#E8734A" };
  if (score >= 8) return { label: "Medium", color: "#F5C544" };
  if (score >= 3) return { label: "Low", color: "#5DC484" };
  return { label: "Very Low", color: "#6B8FA3" };
}
