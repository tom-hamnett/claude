// Data Sources management: add/edit/sync/delete live sources
import { useState, useEffect } from "react";
import { Spinner, Card } from "../components/ui.jsx";

const SOURCE_HELP = {
  "google-drive": {
    title: "Google Drive folder",
    explain: "Paste a share link to a public Google Drive folder. Needs a Google Drive API key (can be created in GCP console — just enable Drive API and create an API key). Works for folders set to 'Anyone with the link can view'.",
    sample: "https://drive.google.com/drive/folders/1abc...xyz",
  },
  "gcs": {
    title: "Google Cloud Storage bucket",
    explain: "Public GCS bucket. Provide bucket name (and optional prefix to scope to a subdirectory).",
    sample: "my-data-bucket",
  },
  "http-url": {
    title: "HTTPS file URL",
    explain: "Any direct file URL (CSV, Excel). APEX will re-download on each poll and detect changes via ETag or content hash.",
    sample: "https://example.com/data/crf.csv",
  },
  "sharepoint-file": {
    title: "SharePoint share link",
    explain: "Right-click a file in SharePoint → Share → 'Anyone with the link can view' → Copy link. APEX polls that URL for changes. Works for single files; doesn't list folder contents.",
    sample: "https://yourcompany.sharepoint.com/:x:/s/site/...",
  },
  "uploaded-zip": {
    title: "Uploaded ZIP archive",
    explain: "Upload a ZIP of files. APEX extracts and treats each file as a source. Useful for periodic bulk catch-ups from SharePoint.",
    sample: "",
  },
};

export default function SourcesManager({ programmeId }) {
  const [sources, setSources] = useState([]);
  const [types, setTypes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(null);

  useEffect(() => { loadAll(); }, [programmeId]);

  async function loadAll() {
    setLoading(true);
    const [srcs, typs] = await Promise.all([
      fetch(`/api/programmes/${programmeId}/sources`).then(r => r.json()),
      fetch(`/api/source-types`).then(r => r.json()),
    ]);
    setSources(srcs);
    setTypes(typs);
    setLoading(false);
  }

  async function syncNow(id) {
    setSyncing(id);
    const r = await fetch(`/api/sources/${id}/sync-now`, { method: "POST" });
    const result = await r.json();
    setSyncing(null);
    if (result.ok) alert(`✓ Sync complete:\n\n${result.new} new files, ${result.changed} changed, ${result.unchanged} unchanged`);
    else alert(`✗ Sync failed:\n\n${result.error}`);
    loadAll();
  }

  async function deleteSource(id) {
    if (!confirm("Delete this source? All pending ingestions will also be removed.")) return;
    await fetch(`/api/sources/${id}`, { method: "DELETE" });
    loadAll();
  }

  async function toggleEnabled(source) {
    await fetch(`/api/sources/${source.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !source.enabled }) });
    loadAll();
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}><Spinner /></div>;
  if (showForm || editing) return <SourceForm programmeId={programmeId} types={types} existing={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={() => { setShowForm(false); setEditing(null); loadAll(); }} />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Live Data Sources ({sources.length})</div>
          <div style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text2)" }}>APEX polls these on schedule. New or changed files appear as Pending Ingestions.</div>
        </div>
        <button onClick={() => setShowForm(true)} style={btnPrimary}>+ Add Source</button>
      </div>

      {sources.length === 0 && (
        <Card color="#2ABFBF"><div style={{ fontSize: 13, fontFamily: "var(--font-b)", color: "var(--text)", lineHeight: 1.6 }}>No data sources yet. Add a Google Drive folder, SharePoint file link, or GCS bucket to start syncing data automatically.</div></Card>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sources.map(s => {
          const help = SOURCE_HELP[s.type] || {};
          const summary = s.lastSyncSummary;
          return (
            <div key={s.id} style={{ background: "var(--bg3)", border: `1px solid ${s.enabled ? "var(--border)" : "var(--border2)"}`, borderLeft: `3px solid ${s.enabled ? "#5DC484" : "#6B8FA3"}`, borderRadius: 8, padding: "14px 18px", opacity: s.enabled ? 1 : 0.6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)" }}>{s.name}</span>
                    <span style={{ fontSize: 10, fontFamily: "var(--font-m)", color: "var(--text3)", background: "var(--bg4)", padding: "2px 8px", borderRadius: 3 }}>{help.title || s.type}</span>
                    {!s.enabled && <span style={{ fontSize: 10, fontFamily: "var(--font-m)", color: "#6B8FA3" }}>DISABLED</span>}
                  </div>
                  <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text2)", marginBottom: 4 }}>
                    Poll every {s.poll_interval_minutes}m
                    {s.last_polled_at && ` · Last polled ${new Date(s.last_polled_at).toLocaleString()}`}
                  </div>
                  {summary && (
                    <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: summary.ok ? "#5DC484" : "#E8734A" }}>
                      {summary.ok ? `✓ ${summary.seen} files · ${summary.new} new · ${summary.changed} changed` : `✗ ${summary.error}`}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => syncNow(s.id)} disabled={syncing === s.id} style={btnSmall}>{syncing === s.id ? <Spinner s={10} /> : "↻ Sync"}</button>
                  <button onClick={() => toggleEnabled(s)} style={btnSmall}>{s.enabled ? "Disable" : "Enable"}</button>
                  <button onClick={() => setEditing(s)} style={btnSmall}>Edit</button>
                  <button onClick={() => deleteSource(s.id)} style={{ ...btnSmall, color: "#E8734A", borderColor: "rgba(232,115,74,0.3)" }}>Delete</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SourceForm({ programmeId, types, existing, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: existing?.name || "",
    type: existing?.type || "google-drive",
    config: existing?.config || {},
    pollIntervalMinutes: existing?.poll_interval_minutes || 60,
    enabled: existing ? !!existing.enabled : true,
  });

  const currentType = types.find(t => t.id === form.type);
  const fields = currentType?.fields || [];
  const help = SOURCE_HELP[form.type] || {};

  function updateConfig(key, value) { setForm(f => ({ ...f, config: { ...f.config, [key]: value } })); }

  async function save() {
    const method = existing ? "PUT" : "POST";
    const url = existing ? `/api/sources/${existing.id}` : `/api/programmes/${programmeId}/sources`;
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    onSaved();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)" }}>{existing ? "Edit Source" : "Add New Source"}</div>
        <button onClick={onClose} style={btnSmall}>← Back</button>
      </div>

      <Field label="Source Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. IHG PE SharePoint" />

      <Label>Type</Label>
      <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, config: {} }))} style={selectStyle}>
        {types.map(t => <option key={t.id} value={t.id}>{SOURCE_HELP[t.id]?.title || t.label}</option>)}
      </select>

      {help.explain && (
        <div style={{ padding: "10px 14px", background: "rgba(42,191,191,0.08)", border: "1px solid rgba(42,191,191,0.2)", borderRadius: 6, marginBottom: 14, fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text2)", lineHeight: 1.6 }}>
          {help.explain}
          {help.sample && <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", marginTop: 4 }}>Example: {help.sample}</div>}
        </div>
      )}

      {fields.map(f => (
        <Field key={f} label={f} value={form.config[f] || ""} onChange={v => updateConfig(f, v)} placeholder={f === "apiKey" ? "Google API key" : ""} type={f === "apiKey" ? "password" : "text"} />
      ))}

      <Field label="Poll Interval (minutes)" value={form.pollIntervalMinutes} onChange={v => setForm(f => ({ ...f, pollIntervalMinutes: parseInt(v) || 60 }))} type="number" />

      <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, marginBottom: 14, cursor: "pointer" }}>
        <input type="checkbox" checked={form.enabled} onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))} />
        <span style={{ fontSize: 13, fontFamily: "var(--font-b)", color: "var(--text)" }}>Enabled (scheduler will poll this source)</span>
      </label>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
        <button onClick={save} disabled={!form.name} style={btnPrimary}>Save</button>
      </div>
    </div>
  );
}

const btnPrimary = { fontSize: 13, fontFamily: "var(--font-d)", fontWeight: 700, padding: "10px 20px", borderRadius: 6, background: "var(--accent)", color: "#000" };
const btnSmall = { fontSize: 11, fontFamily: "var(--font-d)", padding: "6px 12px", borderRadius: 4, color: "var(--text2)", border: "1px solid var(--border2)" };
const selectStyle = { width: "100%", background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 5, color: "var(--text)", fontFamily: "var(--font-b)", fontSize: 13, padding: "8px 12px", marginBottom: 12 };

function Label({ children }) { return <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{children}</div>; }
function Field({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <Label>{label}</Label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ width: "100%", background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 5, color: "var(--text)", fontFamily: "var(--font-b)", fontSize: 13, padding: "10px 12px" }} />
    </div>
  );
}
