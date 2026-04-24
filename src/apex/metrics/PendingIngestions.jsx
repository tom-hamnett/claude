// Pending Ingestions: files flagged by the sync poller, awaiting user review
import { useState, useEffect } from "react";
import { Spinner } from "../components/ui.jsx";

export default function PendingIngestions({ programmeId, onIngestFile, onRefresh }) {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [programmeId]);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/programmes/${programmeId}/pending-ingestions`);
      setPending(await r.json());
    } catch (e) { /* silent */ }
    setLoading(false);
  }

  async function skip(id) {
    await fetch(`/api/pending-ingestions/${id}/skip`, { method: "POST" });
    load();
  }

  async function dismiss(id) {
    await fetch(`/api/pending-ingestions/${id}/dismiss`, { method: "POST" });
    load();
  }

  if (loading) return null;
  if (pending.length === 0) return null;

  return (
    <div style={{ background: "rgba(245,197,68,0.08)", border: "1px solid rgba(245,197,68,0.3)", borderRadius: 10, padding: "14px 18px", marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontFamily: "var(--font-d)", fontWeight: 700, color: "#F5C544", marginBottom: 3 }}>⚠ {pending.length} pending ingestion{pending.length !== 1 ? "s" : ""}</div>
          <div style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text2)" }}>New or changed files detected by the sync scheduler. Review each and choose to ingest, skip, or dismiss.</div>
        </div>
        <button onClick={load} style={{ fontSize: 11, fontFamily: "var(--font-d)", padding: "6px 12px", borderRadius: 4, color: "var(--text2)", border: "1px solid var(--border2)" }}>↻ Refresh</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {pending.map(p => (
          <div key={p.id} style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderLeft: "3px solid #F5C544", borderRadius: 6, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontFamily: "var(--font-d)", fontWeight: 600, color: "var(--text)", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.filename}</div>
              <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)" }}>
                From "{p.source_name}" ({p.source_type}) · {p.last_modified ? new Date(p.last_modified).toLocaleString() : "—"}
                {p.size_bytes ? ` · ${(p.size_bytes / 1024).toFixed(1)} KB` : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button onClick={() => onIngestFile(p)} style={{ fontSize: 11, fontFamily: "var(--font-d)", fontWeight: 700, padding: "6px 14px", borderRadius: 4, background: "var(--accent)", color: "#000" }}>Ingest →</button>
              <button onClick={() => skip(p.id)} style={{ fontSize: 11, fontFamily: "var(--font-d)", padding: "6px 12px", borderRadius: 4, color: "var(--text2)", border: "1px solid var(--border2)" }}>Skip</button>
              <button onClick={() => dismiss(p.id)} style={{ fontSize: 11, fontFamily: "var(--font-d)", padding: "6px 12px", borderRadius: 4, color: "#E8734A", border: "1px solid rgba(232,115,74,0.3)" }}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
