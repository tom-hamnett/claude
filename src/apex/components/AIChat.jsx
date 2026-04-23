// Persistent contextual AI chat — renders in bottom third of every page
// beyond Landing. Knows its current context (page/panel/tab).
import { useState, useRef, useEffect } from "react";
import { aiCall, stripJson, extractJson } from "../lib/ai.js";
import { readFile } from "../lib/utils.js";
import { useStore, saveChat, loadChat, gapsForSection, resolveGap, addUpdate, addRisk, updateRisk, setExecutiveSummary } from "../data/store.js";
import { Spinner } from "./ui.jsx";
import { GAP_SEVERITY } from "../lib/theme.js";

export default function AIChat({ programmeId, contextId = "global", contextLabel = "programme", contextPayload = {}, gapSection = null }) {
  const [state] = useStore();
  const programme = state.programmes[programmeId];
  const engineId = state.settings.aiEngine;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  const gaps = gapSection ? gapsForSection(programmeId, gapSection) : [];

  // Load chat history async
  useEffect(() => {
    let cancelled = false;
    loadChat(programmeId, contextId).then(msgs => {
      if (!cancelled && Array.isArray(msgs)) setMessages(msgs);
    });
    return () => { cancelled = true; };
  }, [programmeId, contextId]);

  useEffect(() => { if (messages.length) saveChat(programmeId, contextId, messages); }, [messages, programmeId, contextId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function buildSystemPrompt() {
    return `You are APEX, an AI programme intelligence assistant. You are the senior PMO advisor for a complex multi-workstream programme.

Current context:
- Programme: "${programme.name}" (${programme.function})
- User is currently viewing: ${contextLabel}
- Context payload (current page data): ${JSON.stringify(contextPayload).slice(0, 4000)}

Programme identity:
- Mission: ${programme.mission?.gpMission}
- Remit: ${programme.mission?.peRemit}
- 2026 priorities: ${(programme.mission?.priorities2026 || []).join(", ")}

You can:
1. Answer questions about this view first, then the wider programme.
2. Interpret documents/content the user shares and propose structured updates.
3. Identify gaps and suggest actions.
4. Draft outputs: exec summaries, updates, charter templates, risk entries.
5. Propose changes — but NEVER commit silently. If you want to change data, output a JSON proposal block and wait for user confirmation.

Response format:
- Be concise (max ~200 words unless asked for more).
- Senior PMO tone. No fluff.
- If you have a proposed change, append a single JSON block:
\`\`\`json
{"proposal":{"type":"update|risk|summary|charter","data":{...},"summary":"one-line human description"}}
\`\`\`
- Do NOT output JSON unless actually proposing a change.`;
  }

  async function send(override) {
    const content = override || input.trim();
    if (!content || loading) return;
    const newMsgs = [...messages, { role: "user", content, ts: Date.now() }];
    setMessages(newMsgs);
    if (!override) setInput("");
    setLoading(true);
    try {
      const reply = await aiCall(engineId, buildSystemPrompt(), newMsgs.map(m => ({ role: m.role, content: m.content })));
      const proposal = extractJson(reply);
      setMessages(prev => [...prev, { role: "assistant", content: stripJson(reply), ts: Date.now(), proposal: proposal?.proposal || null }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠ AI engine error.", ts: Date.now() }]);
    }
    setLoading(false);
  }

  async function ingestFiles() {
    if (!files.length) return;
    setLoading(true);
    let combined = "";
    for (const f of files) {
      const text = await readFile(f);
      combined += `\n\n=== FILE: ${f.name} ===\n${text.slice(0, 20000)}`;
    }
    const names = files.map(f => f.name).join(", ");
    setFiles([]);
    await send(`I've uploaded: ${names}. Please read this content, extract anything relevant to the current context (${contextLabel}), identify gaps, and summarise what you found. Propose structured updates where appropriate.\n\n${combined}`);
  }

  function acceptProposal(msg) {
    const p = msg.proposal;
    if (!p) return;
    if (p.type === "summary" && p.data?.body) {
      setExecutiveSummary(programmeId, p.data.body);
    } else if (p.type === "update" && p.data) {
      addUpdate(programmeId, { id: `upd-${Date.now()}`, period: p.data.period || "ad-hoc", date: new Date().toISOString().split("T")[0], title: p.data.title || "AI-generated update", source: "AI assistant", summary: p.data.summary || p.data.body || "" });
    } else if (p.type === "risk" && p.data) {
      addRisk(programmeId, { ...p.data, id: `r-${Date.now()}`, status: "Open", lastUpdated: new Date().toISOString().split("T")[0] });
    }
    // Mark the message's proposal as accepted
    setMessages(prev => prev.map(m => m.ts === msg.ts ? { ...m, proposalAccepted: true } : m));
  }

  if (collapsed) {
    return (
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--bg1)", borderTop: "1px solid var(--border2)", padding: "8px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 60 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 22, height: 22, background: "var(--accent)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#000", fontFamily: "var(--font-d)" }}>◆</div>
          <div style={{ fontSize: 13, fontFamily: "var(--font-d)", fontWeight: 600, color: "var(--text)" }}>APEX AI</div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)" }}>— {contextLabel}</div>
          {gaps.length > 0 && <span style={{ fontSize: 10, fontFamily: "var(--font-m)", color: "#E8734A", background: "rgba(232,115,74,0.15)", padding: "2px 8px", borderRadius: 10 }}>⚠ {gaps.length} gap{gaps.length !== 1 ? "s" : ""}</span>}
        </div>
        <button onClick={() => setCollapsed(false)} style={{ fontSize: 12, fontFamily: "var(--font-d)", color: "var(--accent)", padding: "4px 10px", border: "1px solid var(--accent)", borderRadius: 4 }}>Expand ▲</button>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: "33vh", minHeight: 280, background: "var(--bg1)", borderTop: "1px solid var(--border2)", display: "flex", flexDirection: "column", zIndex: 60, boxShadow: "0 -8px 24px rgba(0,0,0,0.4)" }}>
      {/* Header */}
      <div style={{ padding: "8px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 22, height: 22, background: "var(--accent)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#000", fontFamily: "var(--font-d)" }}>◆</div>
          <div style={{ fontSize: 13, fontFamily: "var(--font-d)", fontWeight: 700, color: "var(--text)" }}>APEX AI</div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)" }}>— {contextLabel}</div>
          <span style={{ fontSize: 10, fontFamily: "var(--font-m)", color: "var(--accent)", background: "rgba(42,191,191,0.12)", border: "1px solid rgba(42,191,191,0.3)", padding: "2px 7px", borderRadius: 3 }}>{engineId}</span>
        </div>
        <button onClick={() => setCollapsed(true)} style={{ fontSize: 12, fontFamily: "var(--font-d)", color: "var(--text3)", padding: "4px 10px" }}>Collapse ▼</button>
      </div>

      {/* Gaps banner */}
      {gaps.length > 0 && (
        <div style={{ padding: "8px 20px", background: "rgba(232,115,74,0.08)", borderBottom: "1px solid rgba(232,115,74,0.2)", flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "#E8734A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>⚠ {gaps.length} gap{gaps.length !== 1 ? "s" : ""} in this section</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {gaps.slice(0, 4).map(g => (
              <button key={g.id} onClick={() => send(`Help me resolve this gap: "${g.description}". Suggested action: ${g.suggestedAction}`)} style={{ fontSize: 11, fontFamily: "var(--font-b)", padding: "4px 10px", border: `1px solid ${GAP_SEVERITY[g.severity]?.color || "#F5C544"}55`, borderRadius: 12, background: "var(--bg2)", color: "var(--text2)" }}>
                {g.description}
              </button>
            ))}
            {gaps.length > 4 && <span style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)", alignSelf: "center" }}>+{gaps.length - 4} more</span>}
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: 20, fontSize: 13, fontFamily: "var(--font-b)", color: "var(--text3)" }}>
            Ask anything about this view or the wider programme. Drop files, paste links, or just type.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className="fu" style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            {m.role === "assistant" && <div style={{ width: 24, height: 24, borderRadius: 4, background: "var(--accent)", marginRight: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#000", fontFamily: "var(--font-d)", marginTop: 2 }}>◆</div>}
            <div style={{ maxWidth: "75%", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ padding: "10px 14px", borderRadius: m.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px", background: m.role === "user" ? "rgba(42,191,191,0.15)" : "var(--bg3)", border: `1px solid ${m.role === "user" ? "rgba(42,191,191,0.3)" : "var(--border)"}`, fontSize: 13, fontFamily: "var(--font-b)", color: "var(--text)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                {m.content}
              </div>
              {m.proposal && !m.proposalAccepted && (
                <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(42,191,191,0.08)", border: "1px solid rgba(42,191,191,0.3)" }}>
                  <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>◆ Proposed change ({m.proposal.type})</div>
                  <div style={{ fontSize: 12, fontFamily: "var(--font-b)", color: "var(--text)", marginBottom: 8 }}>{m.proposal.summary}</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => acceptProposal(m)} style={{ fontSize: 11, fontFamily: "var(--font-d)", fontWeight: 700, padding: "6px 12px", background: "var(--accent)", color: "#000", borderRadius: 5 }}>Accept & Apply</button>
                    <button onClick={() => setMessages(prev => prev.map(x => x.ts === m.ts ? { ...x, proposal: null } : x))} style={{ fontSize: 11, fontFamily: "var(--font-d)", padding: "6px 12px", background: "var(--bg3)", color: "var(--text2)", borderRadius: 5, border: "1px solid var(--border2)" }}>Dismiss</button>
                  </div>
                </div>
              )}
              {m.proposalAccepted && (
                <div style={{ fontSize: 10, fontFamily: "var(--font-m)", color: "#5DC484", textAlign: m.role === "user" ? "right" : "left" }}>✓ Applied</div>
              )}
            </div>
          </div>
        ))}
        {loading && <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 24, height: 24, borderRadius: 4, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#000", fontFamily: "var(--font-d)" }}>◆</div><Spinner /></div>}
        <div ref={bottomRef} />
      </div>

      {/* File chip row */}
      {files.length > 0 && (
        <div style={{ padding: "6px 20px", background: "var(--bg2)", borderTop: "1px solid var(--border)", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text3)" }}>Ready to ingest:</span>
          {files.map((f, i) => (
            <span key={i} style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--accent)", background: "rgba(42,191,191,0.12)", border: "1px solid rgba(42,191,191,0.3)", padding: "2px 8px", borderRadius: 3 }}>{f.name}</span>
          ))}
          <button onClick={ingestFiles} disabled={loading} style={{ fontSize: 11, fontFamily: "var(--font-d)", fontWeight: 700, padding: "4px 12px", background: "var(--accent)", color: "#000", borderRadius: 4, marginLeft: "auto" }}>Ingest {files.length} file{files.length !== 1 ? "s" : ""}</button>
          <button onClick={() => setFiles([])} style={{ fontSize: 11, fontFamily: "var(--font-d)", padding: "4px 10px", color: "var(--text3)" }}>Clear</button>
        </div>
      )}

      {/* Input row */}
      <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={e => { e.preventDefault(); setDragOver(false); setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]); }} style={{ padding: "8px 20px 12px", borderTop: "1px solid var(--border)", background: dragOver ? "rgba(42,191,191,0.05)" : "var(--bg2)", display: "flex", gap: 8, alignItems: "flex-end", flexShrink: 0, transition: "background 0.15s" }}>
        <input ref={fileRef} type="file" multiple style={{ display: "none" }} onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files)])} />
        <button onClick={() => fileRef.current?.click()} title="Attach file" style={{ fontSize: 16, padding: "8px 10px", border: "1px solid var(--border2)", borderRadius: 6, color: "var(--text2)", background: "var(--bg3)" }}>📎</button>
        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={dragOver ? "Drop files here…" : `Ask about ${contextLabel}, paste content, or drop files…`} rows={2} style={{ flex: 1, background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 6, color: "var(--text)", fontFamily: "var(--font-b)", fontSize: 13, padding: "8px 12px", resize: "none", lineHeight: 1.5 }} />
        <button onClick={() => send()} disabled={loading || !input.trim()} style={{ background: loading || !input.trim() ? "var(--bg3)" : "var(--accent)", color: loading || !input.trim() ? "var(--text3)" : "#000", borderRadius: 6, padding: "0 18px", fontFamily: "var(--font-d)", fontWeight: 700, fontSize: 14, minWidth: 52, alignSelf: "stretch" }}>{loading ? <Spinner /> : "↑"}</button>
      </div>
    </div>
  );
}
