// LLM engine management: add/edit/test/default
import { useState, useEffect } from "react";
import { Spinner, Card } from "../components/ui.jsx";

export default function EnginesManager({ programmeId }) {
  const [engines, setEngines] = useState([]);
  const [providers, setProviders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, [programmeId]);

  async function loadAll() {
    setLoading(true);
    const [engRes, provRes] = await Promise.all([
      fetch(`/api/programmes/${programmeId}/engines`).then(r => r.json()),
      fetch(`/api/providers`).then(r => r.json()),
    ]);
    setEngines(engRes);
    setProviders(provRes);
    setLoading(false);
  }

  async function deleteEngine(id) {
    if (!confirm("Delete this engine?")) return;
    await fetch(`/api/engines/${id}`, { method: "DELETE" });
    loadAll();
  }

  async function setDefault(id) {
    const e = engines.find(x => x.id === id);
    await fetch(`/api/engines/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...e, isDefault: true }) });
    loadAll();
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}><Spinner /></div>;

  if (showForm || editing) {
    return <EngineForm programmeId={programmeId} providers={providers} existing={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={() => { setShowForm(false); setEditing(null); loadAll(); }} />;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>AI Engines ({engines.length})</div>
          <div style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text2)" }}>Configure LLM providers. The default engine is used for all AI calls unless overridden.</div>
        </div>
        <button onClick={() => setShowForm(true)} style={btnPrimary}>+ Add Engine</button>
      </div>

      {engines.length === 0 && (
        <Card color="#F5C544"><div style={{ fontSize: 13, fontFamily: "var(--font-b)", color: "var(--text)", lineHeight: 1.6 }}>No engines configured. Add at least one to use AI features.<br /><br /><strong>Quickest setup:</strong> GitHub Copilot — uses your existing GitHub account. Just create a Personal Access Token at github.com → Settings → Developer settings → Personal access tokens → Generate. No IT approval needed.</div></Card>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {engines.map(e => {
          const prov = providers.find(p => p.id === e.provider);
          return (
            <div key={e.id} style={{ background: "var(--bg3)", border: `1px solid ${e.isDefault ? "var(--accent)" : "var(--border)"}`, borderLeft: `3px solid ${e.isDefault ? "var(--accent)" : "var(--border)"}`, borderRadius: 8, padding: "14px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)" }}>{e.name}</span>
                    {e.isDefault && <span style={{ fontSize: 10, fontFamily: "var(--font-m)", color: "var(--accent)", background: "rgba(42,191,191,0.15)", padding: "2px 8px", borderRadius: 3, textTransform: "uppercase", letterSpacing: "0.08em" }}>Default</span>}
                  </div>
                  <div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text2)" }}>{prov?.label || e.provider}{e.model_name ? ` · ${e.model_name}` : ""}{e.deployment_name ? ` · ${e.deployment_name}` : ""}</div>
                  {e.endpoint_url && <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", marginTop: 2 }}>{e.endpoint_url}</div>}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {!e.isDefault && <button onClick={() => setDefault(e.id)} style={btnSmall}>Set default</button>}
                  <button onClick={() => testEngine(e.id)} style={btnSmall}>Test</button>
                  <button onClick={() => setEditing(e)} style={btnSmall}>Edit</button>
                  <button onClick={() => deleteEngine(e.id)} style={{ ...btnSmall, color: "#E8734A", borderColor: "rgba(232,115,74,0.3)" }}>Delete</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

async function testEngine(id) {
  const r = await fetch(`/api/engines/${id}/test`, { method: "POST" });
  const result = await r.json();
  if (result.ok) alert(`✓ Engine test successful:\n\n${result.text}`);
  else alert(`✗ Engine test failed:\n\n${result.error}`);
}

function EngineForm({ programmeId, providers, existing, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: existing?.name || "",
    provider: existing?.provider || "gemini",
    apiKey: "",
    endpointUrl: existing?.endpoint_url || "",
    modelName: existing?.model_name || "",
    deploymentName: existing?.deployment_name || "",
    isDefault: existing?.isDefault || false,
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const currentProvider = providers.find(p => p.id === form.provider);
  const fields = currentProvider?.fields || [];

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    // Save first if new, then test
    let id = existing?.id;
    if (!id) {
      const r = await fetch(`/api/programmes/${programmeId}/engines`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form }) });
      id = (await r.json()).id;
    } else {
      await fetch(`/api/engines/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    }
    const tr = await fetch(`/api/engines/${id}/test`, { method: "POST" });
    setTestResult(await tr.json());
    setTesting(false);
    if (!existing) {
      // If we created it for the test and it failed, leave it — user can fix
    }
  }

  async function save() {
    const method = existing ? "PUT" : "POST";
    const url = existing ? `/api/engines/${existing.id}` : `/api/programmes/${programmeId}/engines`;
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    onSaved();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)" }}>{existing ? "Edit Engine" : "Add New Engine"}</div>
        <button onClick={onClose} style={btnSmall}>← Back</button>
      </div>

      <Field label="Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Corporate Gemini" />

      <Label>Provider</Label>
      <select value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))} style={selectStyle}>
        {providers.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select>

      {form.provider === "github-copilot" && (
        <div style={{ padding: "12px 16px", background: "rgba(42,191,191,0.08)", border: "1px solid rgba(42,191,191,0.2)", borderRadius: 6, marginBottom: 14, fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text2)", lineHeight: 1.7 }}>
          <strong style={{ color: "var(--accent)" }}>Setup (30 seconds, no IT needed):</strong><br />
          1. Go to <strong>github.com</strong> → click your avatar → <strong>Settings</strong><br />
          2. Scroll to <strong>Developer settings</strong> → <strong>Personal access tokens</strong> → <strong>Tokens (classic)</strong><br />
          3. Click <strong>Generate new token (classic)</strong><br />
          4. Give it a name (e.g. "APEX Dashboard"), no special scopes needed<br />
          5. Copy the token and paste it below as the API Key<br />
          <br />
          <span style={{ fontSize: 11, color: "var(--text3)" }}>In Codespaces, you can also leave API Key blank — it will try to use the built-in GITHUB_TOKEN automatically.</span>
        </div>
      )}

      {fields.includes("api_key") && <Field label={form.provider === "github-copilot" ? "GitHub Personal Access Token" : "API Key"} value={form.apiKey} onChange={v => setForm(f => ({ ...f, apiKey: v }))} placeholder={form.provider === "github-copilot" ? (existing ? "Leave blank to keep existing" : "ghp_xxxxxxxxxxxx (or leave blank in Codespaces)") : (existing ? "Leave blank to keep existing" : "Paste your API key")} type="password" />}
      {fields.includes("endpoint_url") && <Field label="Endpoint URL" value={form.endpointUrl} onChange={v => setForm(f => ({ ...f, endpointUrl: v }))} placeholder="https://..." />}
      {fields.includes("model_name") && <Field label="Model Name" value={form.modelName} onChange={v => setForm(f => ({ ...f, modelName: v }))} placeholder={modelPlaceholder(form.provider)} />}
      {fields.includes("deployment_name") && <Field label="Deployment Name" value={form.deploymentName} onChange={v => setForm(f => ({ ...f, deploymentName: v }))} placeholder="e.g. my-gpt4-deployment" />}

      <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, marginBottom: 14, cursor: "pointer" }}>
        <input type="checkbox" checked={form.isDefault} onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} />
        <span style={{ fontSize: 13, fontFamily: "var(--font-b)", color: "var(--text)" }}>Set as default engine for this programme</span>
      </label>

      {testResult && (
        <div style={{ padding: "10px 14px", background: testResult.ok ? "rgba(93,196,132,0.1)" : "rgba(232,115,74,0.1)", border: `1px solid ${testResult.ok ? "rgba(93,196,132,0.3)" : "rgba(232,115,74,0.3)"}`, borderRadius: 6, marginBottom: 14, fontSize: 12, fontFamily: "var(--font-b)", color: testResult.ok ? "#5DC484" : "#E8734A" }}>
          {testResult.ok ? `✓ Test passed: ${testResult.text}` : `✗ Test failed: ${testResult.error}`}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
        <button onClick={testConnection} disabled={testing || !form.name} style={btnSecondary}>{testing ? <Spinner s={12} /> : "Test Connection"}</button>
        <button onClick={save} disabled={!form.name} style={btnPrimary}>Save</button>
      </div>
    </div>
  );
}

function modelPlaceholder(provider) {
  return {
    "github-copilot": "gpt-4o (default) or gpt-4o-mini",
    anthropic: "claude-sonnet-4-20250514",
    gemini: "gemini-1.5-pro",
    openai: "gpt-4-turbo",
    copilot: "(set deployment name instead)",
    custom: "(optional)",
  }[provider] || "";
}

const btnPrimary = { fontSize: 13, fontFamily: "var(--font-d)", fontWeight: 700, padding: "10px 20px", borderRadius: 6, background: "var(--accent)", color: "#000" };
const btnSecondary = { fontSize: 13, fontFamily: "var(--font-d)", padding: "10px 18px", borderRadius: 6, color: "var(--text2)", border: "1px solid var(--border2)" };
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
