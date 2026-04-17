// API-backed store. Reads/writes programme data from Express server (SQLite).
// Falls back to localStorage if server is unavailable (dev mode without server).
import { useState, useEffect, useCallback } from "react";

const API = "/api";
let STATE = null;
const subscribers = new Set();

function notify() { subscribers.forEach(fn => fn(STATE)); }

// ── Fetch helpers ───────────────────────────────────────────────────────────

async function apiFetch(path, opts = {}) {
  try {
    const r = await fetch(`${API}${path}`, {
      headers: { "Content-Type": "application/json", ...opts.headers },
      ...opts,
    });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return r.json();
  } catch (e) {
    console.warn(`[store] API call failed: ${path}`, e.message);
    return null;
  }
}

// ── Load initial state ──────────────────────────────────────────────────────

export async function loadState() {
  // Fetch programme list
  const programmes = await apiFetch("/programmes");
  if (!programmes) {
    console.warn("[store] Server unavailable — falling back to localStorage");
    return loadFromLocalStorage();
  }

  // Fetch full data for each programme
  const programmeMap = {};
  const order = [];
  for (const p of programmes) {
    const full = await apiFetch(`/programmes/${p.id}`);
    if (full) {
      programmeMap[p.id] = full;
      order.push(p.id);
    }
  }

  STATE = {
    user: { name: "Tom Hamnett", role: "Programme Manager" },
    programmes: programmeMap,
    programmeOrder: order,
    settings: { aiEngine: "anthropic" },
    _serverMode: true,
  };
  notify();
  return STATE;
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem("apex.v5.state");
    if (raw) { STATE = JSON.parse(raw); notify(); return STATE; }
  } catch (e) { /* ignore */ }
  // Import IHG data as fallback
  STATE = {
    user: { name: "Tom Hamnett", role: "Programme Manager" },
    programmes: {},
    programmeOrder: [],
    settings: { aiEngine: "anthropic" },
    _serverMode: false,
  };
  notify();
  return STATE;
}

// ── State access ────────────────────────────────────────────────────────────

export function getState() { return STATE; }

export function useStore() {
  const [s, setS] = useState(STATE);
  useEffect(() => {
    const fn = (next) => setS(next);
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  }, []);
  return [s, updateState];
}

// ── State mutations (writes to API + updates local state) ───────────────────

async function updateState(updater) {
  const next = typeof updater === "function" ? updater(STATE) : { ...STATE, ...updater };
  STATE = next;
  notify();
  // Save to localStorage as local cache
  try { localStorage.setItem("apex.v5.state", JSON.stringify(next)); } catch (e) { /* ignore */ }
}

// Save a specific programme field to the server
export async function saveProgrammeField(programmeId, field, value, source = "user") {
  // Update local state immediately
  updateState(s => {
    const p = { ...s.programmes[programmeId] };
    const keys = field.split(".");
    let target = p;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!target[keys[i]]) target[keys[i]] = {};
      target[keys[i]] = { ...target[keys[i]] };
      target = target[keys[i]];
    }
    target[keys[keys.length - 1]] = value;
    return { ...s, programmes: { ...s.programmes, [programmeId]: p } };
  });

  // Persist to server
  if (STATE?._serverMode) {
    await apiFetch(`/programmes/${programmeId}`, {
      method: "PATCH",
      body: JSON.stringify({ field, value, changedBy: STATE.user?.name, source }),
    });
  }
}

// Full programme save (for bulk updates after ingestion)
export async function saveProgramme(programmeId) {
  const p = STATE?.programmes?.[programmeId];
  if (!p || !STATE._serverMode) return;
  await apiFetch(`/programmes/${programmeId}`, {
    method: "PUT",
    body: JSON.stringify(p),
  });
}

// ── Convenience getters ─────────────────────────────────────────────────────

export function getProgramme(id) { return STATE?.programmes?.[id]; }
export function listProgrammes() { return (STATE?.programmeOrder || []).map(id => STATE.programmes[id]); }
export function getGaps(programmeId) { return STATE?.programmes?.[programmeId]?.gaps || []; }
export function gapsForSection(programmeId, sectionPrefix) {
  return (STATE?.programmes?.[programmeId]?.gaps || []).filter(g => g.section?.startsWith(sectionPrefix) && g.status === "active");
}

// ── Specific mutators ───────────────────────────────────────────────────────

export async function addRisk(programmeId, risk) {
  const current = STATE.programmes[programmeId]?.risks || [];
  await saveProgrammeField(programmeId, "risks", [...current, risk], "AI proposal accepted");
}

export async function updateRisk(programmeId, riskId, updates) {
  const current = STATE.programmes[programmeId]?.risks || [];
  await saveProgrammeField(programmeId, "risks", current.map(r => r.id === riskId ? { ...r, ...updates } : r), "risk update");
}

export async function addUpdate(programmeId, update) {
  const current = STATE.programmes[programmeId]?.updates || [];
  await saveProgrammeField(programmeId, "updates", [update, ...current], "update generated");
}

export async function setExecutiveSummary(programmeId, body) {
  await saveProgrammeField(programmeId, "executiveSummary", { lastGenerated: new Date().toISOString(), body }, "exec summary generated");
}

export async function resolveGap(programmeId, gapId, resolution = "resolved") {
  const current = STATE.programmes[programmeId]?.gaps || [];
  await saveProgrammeField(programmeId, "gaps", current.map(g => g.id === gapId ? { ...g, status: resolution } : g), "gap resolved");
}

export function setEngine(engineId) {
  updateState(s => ({ ...s, settings: { ...s.settings, aiEngine: engineId } }));
}

// ── Chat history (server-backed) ────────────────────────────────────────────

export async function saveChat(programmeId, contextId, messages) {
  if (STATE?._serverMode) {
    await apiFetch(`/programmes/${programmeId}/chat/${encodeURIComponent(contextId)}`, {
      method: "PUT",
      body: JSON.stringify({ messages }),
    });
  }
}

export async function loadChat(programmeId, contextId) {
  if (STATE?._serverMode) {
    const msgs = await apiFetch(`/programmes/${programmeId}/chat/${encodeURIComponent(contextId)}`);
    return msgs || [];
  }
  return [];
}

// ── Documents (server-backed) ───────────────────────────────────────────────

export async function uploadDocument(programmeId, file, section = "general") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("section", section);
  formData.append("uploadedBy", STATE?.user?.name || "user");

  try {
    const r = await fetch(`${API}/programmes/${programmeId}/documents`, {
      method: "POST",
      body: formData,
    });
    return r.json();
  } catch (e) {
    console.warn("[store] Document upload failed", e);
    return null;
  }
}

export async function listDocuments(programmeId) {
  return (await apiFetch(`/programmes/${programmeId}/documents`)) || [];
}

// ── Audit log ───────────────────────────────────────────────────────────────

export async function getAuditLog(programmeId, limit = 50) {
  return (await apiFetch(`/programmes/${programmeId}/audit?limit=${limit}`)) || [];
}
