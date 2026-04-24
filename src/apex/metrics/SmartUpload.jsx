// SmartUpload: multi-step file ingestion wizard
// Step 1: Upload + AI analysis preview
// Step 2: Template validation (required/optional/extra columns)
// Step 3: Version check + diff
// Step 4: Gap fill suggestions
// Step 5: Confirm + store
import { useState, useRef } from "react";
import { Spinner, Card } from "../components/ui.jsx";

export default function SmartUpload({ programmeId, onComplete, onClose }) {
  const [step, setStep] = useState(0); // 0=upload, 1=preview, 2=template, 3=version, 4=gaps, 5=confirm
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [tableName, setTableName] = useState("");
  const [acceptedGaps, setAcceptedGaps] = useState(new Set());
  const [storeMode, setStoreMode] = useState("new"); // new | version
  const fileRef = useRef(null);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const r = await fetch(`/api/programmes/${programmeId}/data-tables/analyze`, { method: "POST", body: formData });
      const result = await r.json();
      if (result.error) { setError(result.error); setLoading(false); return; }
      setAnalysis(result);
      setTableName(result.suggestions?.suggestedName || file.name.replace(/\.[^.]+$/, ""));
      setStoreMode(result.suggestions?.isUpdate ? "version" : "new");
      setStep(1);
    } catch (e) { setError("Upload failed: " + e.message); }
    setLoading(false);
  }

  async function confirmStore() {
    setLoading(true);
    const formData = new FormData();
    // Re-upload the file to the actual store endpoint
    const fileInput = fileRef.current;
    const file = fileInput?.files?.[0];
    if (!file) { setError("File lost — please re-upload"); setLoading(false); return; }
    formData.append("file", file);
    formData.append("name", tableName);
    formData.append("description", analysis?.templateMatch?.template?.description || "");
    try {
      const r = await fetch(`/api/programmes/${programmeId}/data-tables`, { method: "POST", body: formData });
      const result = await r.json();
      if (result.error) { setError(result.error); setLoading(false); return; }
      onComplete(result);
    } catch (e) { setError("Store failed: " + e.message); }
    setLoading(false);
  }

  const a = analysis;
  const p = a?.parsed;
  const tm = a?.templateMatch;
  const vm = a?.versionMatch;
  const gf = a?.gapFills || [];

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "min(720px,100%)", maxHeight: "85vh", overflow: "auto", background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 12, padding: 0 }}>

        {/* Header */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", background: "var(--bg3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 18, fontFamily: "var(--font-d)", fontWeight: 800, color: "var(--text)" }}>Smart Data Ingestion</div>
            <div style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text2)", marginTop: 2 }}>
              {step === 0 && "Upload a file to begin"}
              {step === 1 && "Step 1: AI Preview — review what was detected"}
              {step === 2 && "Step 2: Template Validation"}
              {step === 3 && "Step 3: Version Check"}
              {step === 4 && "Step 4: Gap Fill Suggestions"}
              {step === 5 && "Step 5: Confirm & Store"}
            </div>
          </div>
          <button onClick={onClose} style={{ fontSize: 18, color: "var(--text3)" }}>✕</button>
        </div>

        {/* Step indicators */}
        <div style={{ display: "flex", padding: "12px 24px", gap: 4, borderBottom: "1px solid var(--border)" }}>
          {["Upload", "Preview", "Template", "Version", "Gaps", "Confirm"].map((label, i) => (
            <div key={i} style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, opacity: i <= step ? 1 : 0.4 }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: i < step ? "#5DC484" : i === step ? "var(--accent)" : "var(--bg4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: i <= step ? "#000" : "var(--text3)", flexShrink: 0 }}>{i < step ? "✓" : i + 1}</div>
              <span style={{ fontSize: 11, fontFamily: "var(--font-d)", color: i === step ? "var(--text)" : "var(--text3)", fontWeight: i === step ? 700 : 500 }}>{label}</span>
            </div>
          ))}
        </div>

        <div style={{ padding: 24 }}>

          {error && <div style={{ padding: "10px 14px", background: "rgba(232,115,74,0.12)", border: "1px solid rgba(232,115,74,0.3)", borderRadius: 6, marginBottom: 14, fontSize: 13, color: "#E8734A" }}>⚠ {error}</div>}

          {/* Step 0: Upload */}
          {step === 0 && (
            <div style={{ textAlign: "center", padding: 30 }}>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={handleUpload} />
              <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
              <div style={{ fontSize: 15, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>Drop a file or click to browse</div>
              <div style={{ fontSize: 13, fontFamily: "var(--font-b)", color: "var(--text2)", marginBottom: 16 }}>Supported: .xlsx, .xls, .csv</div>
              <button onClick={() => fileRef.current?.click()} disabled={loading} style={{ fontSize: 14, fontFamily: "var(--font-d)", fontWeight: 700, padding: "12px 28px", borderRadius: 8, background: "var(--accent)", color: "#000" }}>
                {loading ? <><Spinner s={14} /> Analyzing…</> : "Select File"}
              </button>
            </div>
          )}

          {/* Step 1: AI Preview */}
          {step === 1 && p && (
            <div>
              <Card color="#2ABFBF" style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
                  Detected: {a.originalName}
                </div>
                <div style={{ fontSize: 13, fontFamily: "var(--font-b)", color: "var(--text2)", lineHeight: 1.6 }}>
                  {p.rowCount} rows · {p.columns.length} columns · Sheet: {p.sheetUsed || "—"}
                </div>
              </Card>

              <div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Columns detected</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
                {p.columns.map(c => (
                  <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 4 }}>
                    <span style={{ fontSize: 13, fontFamily: "var(--font-d)", fontWeight: 600, color: "var(--text)", flex: 1 }}>{c.name}</span>
                    <span style={{ fontSize: 10, fontFamily: "var(--font-m)", color: c.type === "number" ? "#5DC484" : c.isDimension ? "#F5C544" : "#4A9EFF", background: c.type === "number" ? "rgba(93,196,132,0.12)" : c.isDimension ? "rgba(245,197,68,0.12)" : "rgba(74,158,255,0.12)", padding: "2px 8px", borderRadius: 3, textTransform: "uppercase" }}>{c.isDimension ? "dimension" : c.type}</span>
                    {c.sampleValues?.length > 0 && <span style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)" }}>{c.sampleValues.slice(0, 3).join(", ")}{c.sampleValues.length > 3 ? "…" : ""}</span>}
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Sample rows</div>
              <div style={{ overflow: "auto", marginBottom: 14 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "var(--font-m)" }}>
                  <thead><tr>{p.columns.map(c => <th key={c.name} style={{ padding: "6px 8px", textAlign: "left", borderBottom: "1px solid var(--border)", color: "var(--text2)", background: "var(--bg4)" }}>{c.name}</th>)}</tr></thead>
                  <tbody>{p.sampleRows.map((row, i) => <tr key={i}>{p.columns.map(c => <td key={c.name} style={{ padding: "4px 8px", borderBottom: "1px solid var(--border)", color: "var(--text)" }}>{row[c.name] ?? "—"}</td>)}</tr>)}</tbody>
                </table>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Table name</div>
                <input value={tableName} onChange={e => setTableName(e.target.value)} style={{ width: "100%", background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 5, color: "var(--text)", fontFamily: "var(--font-d)", fontSize: 14, padding: "8px 12px", fontWeight: 600 }} />
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setStep(0)} style={btnSecondary}>← Back</button>
                <button onClick={() => setStep(tm ? 2 : vm ? 3 : gf.length ? 4 : 5)} style={btnPrimary}>Continue →</button>
              </div>
            </div>
          )}

          {/* Step 2: Template Validation */}
          {step === 2 && tm && (
            <div>
              <Card color={tm.matchPct >= 80 ? "#5DC484" : "#F5C544"} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
                  {tm.matchPct >= 80 ? "✓" : "◐"} Matches template: {tm.template.name}
                </div>
                <div style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text2)" }}>{Math.round(tm.matchPct)}% of required columns found</div>
              </Card>

              {tm.matchedReq.length > 0 && <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "#5DC484", textTransform: "uppercase", marginBottom: 4 }}>✓ Required columns found ({tm.matchedReq.length})</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{tm.matchedReq.map(n => <span key={n} style={{ fontSize: 11, fontFamily: "var(--font-m)", padding: "3px 8px", background: "rgba(93,196,132,0.12)", border: "1px solid rgba(93,196,132,0.3)", borderRadius: 3, color: "#5DC484" }}>{n}</span>)}</div>
              </div>}

              {tm.missingReq.length > 0 && <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "#E8734A", textTransform: "uppercase", marginBottom: 4 }}>⚠ Missing required ({tm.missingReq.length})</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{tm.missingReq.map(c => <span key={c.name} style={{ fontSize: 11, fontFamily: "var(--font-m)", padding: "3px 8px", background: "rgba(232,115,74,0.12)", border: "1px solid rgba(232,115,74,0.3)", borderRadius: 3, color: "#E8734A" }}>{c.name}</span>)}</div>
              </div>}

              {tm.missingOpt.length > 0 && <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "#F5C544", textTransform: "uppercase", marginBottom: 4 }}>Optional not present ({tm.missingOpt.length})</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{tm.missingOpt.map(c => <span key={c.name} style={{ fontSize: 11, fontFamily: "var(--font-m)", padding: "3px 8px", background: "rgba(245,197,68,0.12)", border: "1px solid rgba(245,197,68,0.3)", borderRadius: 3, color: "#F5C544" }}>{c.name}</span>)}</div>
              </div>}

              {tm.extraCols.length > 0 && <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "#4A9EFF", textTransform: "uppercase", marginBottom: 4 }}>Extra columns ({tm.extraCols.length}) — will be stored</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{tm.extraCols.map(c => <span key={c.name} style={{ fontSize: 11, fontFamily: "var(--font-m)", padding: "3px 8px", background: "rgba(74,158,255,0.12)", border: "1px solid rgba(74,158,255,0.3)", borderRadius: 3, color: "#4A9EFF" }}>{c.name}</span>)}</div>
              </div>}

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
                <button onClick={() => setStep(1)} style={btnSecondary}>← Back</button>
                <button onClick={() => setStep(vm ? 3 : gf.length ? 4 : 5)} style={btnPrimary}>Continue →</button>
              </div>
            </div>
          )}

          {/* Step 3: Version Check */}
          {step === 3 && (
            <div>
              {vm ? (
                <Card color="#F5C544" style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
                    Existing table found: "{vm.table.name}" (v{vm.table.version}, {vm.table.row_count} rows)
                  </div>
                  <div style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text2)", lineHeight: 1.6 }}>
                    {Math.round(vm.overlapPct)}% column overlap.
                    {vm.diff && ` ${vm.diff.modified} rows modified, ${vm.diff.added} added, ${vm.diff.removed} removed, ${vm.diff.unchanged} unchanged.`}
                  </div>
                  {vm.diff?.details?.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", marginBottom: 4 }}>Changes:</div>
                      {vm.diff.details.slice(0, 5).map((d, i) => (
                        <div key={i} style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text2)", marginBottom: 2 }}>
                          Row {d.row}: {Object.entries(d.changes).map(([k, v]) => `${k}: ${v.from} → ${v.to}`).join(", ")}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ) : (
                <Card color="#5DC484" style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)" }}>No existing table matches — this will be created as new.</div>
                </Card>
              )}

              {vm && (
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <button onClick={() => setStoreMode("version")} style={{ flex: 1, padding: "12px", borderRadius: 6, fontSize: 12, fontFamily: "var(--font-d)", fontWeight: storeMode === "version" ? 700 : 500, background: storeMode === "version" ? "var(--accent)" : "var(--bg3)", color: storeMode === "version" ? "#000" : "var(--text2)", border: `1px solid ${storeMode === "version" ? "var(--accent)" : "var(--border2)"}`, textAlign: "center" }}>Create as v{vm.table.version + 1} (replaces current)</button>
                  <button onClick={() => setStoreMode("new")} style={{ flex: 1, padding: "12px", borderRadius: 6, fontSize: 12, fontFamily: "var(--font-d)", fontWeight: storeMode === "new" ? 700 : 500, background: storeMode === "new" ? "var(--accent)" : "var(--bg3)", color: storeMode === "new" ? "#000" : "var(--text2)", border: `1px solid ${storeMode === "new" ? "var(--accent)" : "var(--border2)"}`, textAlign: "center" }}>Create as separate table</button>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setStep(tm ? 2 : 1)} style={btnSecondary}>← Back</button>
                <button onClick={() => setStep(gf.length ? 4 : 5)} style={btnPrimary}>Continue →</button>
              </div>
            </div>
          )}

          {/* Step 4: Gap Fill */}
          {step === 4 && (
            <div>
              {gf.length > 0 ? (
                <>
                  <div style={{ fontSize: 13, fontFamily: "var(--font-b)", color: "var(--text2)", marginBottom: 14, lineHeight: 1.6 }}>
                    The following columns are missing from your file but available from other tables in the programme. Select which to add:
                  </div>
                  {gf.map((g, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: acceptedGaps.has(i) ? "rgba(42,191,191,0.08)" : "var(--bg3)", border: `1px solid ${acceptedGaps.has(i) ? "var(--accent)" : "var(--border)"}`, borderRadius: 6, marginBottom: 6, cursor: "pointer" }} onClick={() => setAcceptedGaps(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; })}>
                      <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${acceptedGaps.has(i) ? "var(--accent)" : "var(--border2)"}`, background: acceptedGaps.has(i) ? "var(--accent)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#000", fontWeight: 800, flexShrink: 0 }}>{acceptedGaps.has(i) ? "✓" : ""}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontFamily: "var(--font-d)", fontWeight: 600, color: "var(--text)" }}>{g.column}</div>
                        <div style={{ fontSize: 11, fontFamily: "var(--font-b)", color: "var(--text2)", marginTop: 2 }}>{g.description}</div>
                      </div>
                      <span style={{ fontSize: 10, fontFamily: "var(--font-m)", color: "var(--accent)", background: "rgba(42,191,191,0.12)", padding: "2px 8px", borderRadius: 3 }}>{g.type}</span>
                    </div>
                  ))}
                </>
              ) : (
                <Card color="#5DC484" style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)" }}>No gap fill opportunities detected — all columns present.</div>
                </Card>
              )}

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
                <button onClick={() => setStep(vm ? 3 : tm ? 2 : 1)} style={btnSecondary}>← Back</button>
                <button onClick={() => setStep(5)} style={btnPrimary}>Continue →</button>
              </div>
            </div>
          )}

          {/* Step 5: Confirm */}
          {step === 5 && (
            <div>
              <Card color="#2ABFBF" style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 16, fontFamily: "var(--font-d)", fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>Ready to store</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text3)" }}>Table name</div>
                  <div style={{ fontSize: 13, fontFamily: "var(--font-d)", fontWeight: 600, color: "var(--text)" }}>{tableName}</div>
                  <div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text3)" }}>Rows</div>
                  <div style={{ fontSize: 13, fontFamily: "var(--font-d)", fontWeight: 600, color: "var(--text)" }}>{p?.rowCount}</div>
                  <div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text3)" }}>Columns</div>
                  <div style={{ fontSize: 13, fontFamily: "var(--font-d)", fontWeight: 600, color: "var(--text)" }}>{p?.columns.length}{acceptedGaps.size > 0 ? ` + ${acceptedGaps.size} joined` : ""}</div>
                  {tm && <>
                    <div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text3)" }}>Template</div>
                    <div style={{ fontSize: 13, fontFamily: "var(--font-d)", fontWeight: 600, color: "#5DC484" }}>✓ {tm.template.name}</div>
                  </>}
                  {vm && storeMode === "version" && <>
                    <div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text3)" }}>Version</div>
                    <div style={{ fontSize: 13, fontFamily: "var(--font-d)", fontWeight: 600, color: "#F5C544" }}>v{vm.table.version} → v{vm.table.version + 1}</div>
                  </>}
                </div>
              </Card>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setStep(gf.length ? 4 : vm ? 3 : tm ? 2 : 1)} style={btnSecondary}>← Back</button>
                <button onClick={confirmStore} disabled={loading} style={btnPrimary}>
                  {loading ? <><Spinner s={14} /> Storing…</> : "Store Data →"}
                </button>
              </div>
            </div>
          )}

          {loading && step === 0 && (
            <div style={{ textAlign: "center", padding: 20 }}>
              <Spinner /><div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text3)", marginTop: 8, animation: "shimmer 1.5s infinite" }}>Analyzing file structure…</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const btnPrimary = { fontSize: 13, fontFamily: "var(--font-d)", fontWeight: 700, padding: "10px 24px", borderRadius: 6, background: "var(--accent)", color: "#000" };
const btnSecondary = { fontSize: 13, fontFamily: "var(--font-d)", padding: "10px 18px", borderRadius: 6, color: "var(--text2)", border: "1px solid var(--border2)" };
