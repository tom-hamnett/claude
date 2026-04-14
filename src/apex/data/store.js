// Client-only store with localStorage persistence.
// Holds: user's accessible programmes, per-programme state, gaps, chat history.
import { useState, useEffect, useCallback } from "react";
import { IHG_PROGRAMME, IHG_GAPS } from "./ihgProgramme.js";

const STORAGE_KEY = "apex.v5.state";

function defaultState() {
  return {
    user: { name: "Tom Hamnett", role: "Programme Manager" },
    programmes: {
      [IHG_PROGRAMME.id]: IHG_PROGRAMME,
    },
    programmeOrder: [IHG_PROGRAMME.id],
    gaps: {
      [IHG_PROGRAMME.id]: IHG_GAPS,
    },
    chats: {
      // keyed by `${programmeId}:${contextId}` e.g. "ihg-pe:global" or "ihg-pe:panel/overview/summary"
    },
    settings: { aiEngine: "anthropic" },
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    // Always refresh IHG programme structural fields from code (keeps references/metric structure current)
    // but preserve user-added data (new risks, updates, chat history).
    if (parsed.programmes?.[IHG_PROGRAMME.id]) {
      parsed.programmes[IHG_PROGRAMME.id] = {
        ...IHG_PROGRAMME,
        // keep any user-added items
        risks: parsed.programmes[IHG_PROGRAMME.id].risks || IHG_PROGRAMME.risks,
        auditActions: parsed.programmes[IHG_PROGRAMME.id].auditActions || IHG_PROGRAMME.auditActions,
        updates: parsed.programmes[IHG_PROGRAMME.id].updates || IHG_PROGRAMME.updates,
        executiveSummary: parsed.programmes[IHG_PROGRAMME.id].executiveSummary || IHG_PROGRAMME.executiveSummary,
      };
    }
    return { ...defaultState(), ...parsed };
  } catch (e) {
    return defaultState();
  }
}

function save(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (e) { console.warn("Could not persist state", e); }
}

// Simple singleton store with subscribers
let STATE = load();
const subscribers = new Set();

export function getState() { return STATE; }

export function setState(updater) {
  const next = typeof updater === "function" ? updater(STATE) : { ...STATE, ...updater };
  STATE = next;
  save(next);
  subscribers.forEach(fn => fn(next));
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
  STATE = defaultState();
  subscribers.forEach(fn => fn(STATE));
}

export function useStore() {
  const [s, setS] = useState(STATE);
  useEffect(() => {
    const fn = (next) => setS(next);
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  }, []);
  return [s, setState];
}

// Convenience getters
export function getProgramme(id) { return STATE.programmes[id]; }
export function listProgrammes() { return STATE.programmeOrder.map(id => STATE.programmes[id]); }
export function getGaps(programmeId) { return STATE.gaps[programmeId] || []; }
export function gapsForSection(programmeId, sectionPrefix) {
  return (STATE.gaps[programmeId] || []).filter(g => g.section.startsWith(sectionPrefix) && g.status === "active");
}

// Mutators
export function addRisk(programmeId, risk) {
  setState(s => ({
    ...s,
    programmes: { ...s.programmes, [programmeId]: { ...s.programmes[programmeId], risks: [...(s.programmes[programmeId].risks || []), risk] } },
  }));
}

export function updateRisk(programmeId, riskId, updates) {
  setState(s => ({
    ...s,
    programmes: { ...s.programmes, [programmeId]: { ...s.programmes[programmeId], risks: s.programmes[programmeId].risks.map(r => r.id === riskId ? { ...r, ...updates } : r) } },
  }));
}

export function addUpdate(programmeId, update) {
  setState(s => ({
    ...s,
    programmes: { ...s.programmes, [programmeId]: { ...s.programmes[programmeId], updates: [update, ...(s.programmes[programmeId].updates || [])] } },
  }));
}

export function setExecutiveSummary(programmeId, body) {
  setState(s => ({
    ...s,
    programmes: { ...s.programmes, [programmeId]: { ...s.programmes[programmeId], executiveSummary: { lastGenerated: new Date().toISOString(), body } } },
  }));
}

export function resolveGap(programmeId, gapId, resolution = "resolved") {
  setState(s => ({
    ...s,
    gaps: { ...s.gaps, [programmeId]: (s.gaps[programmeId] || []).map(g => g.id === gapId ? { ...g, status: resolution } : g) },
  }));
}

export function setEngine(engineId) {
  setState(s => ({ ...s, settings: { ...s.settings, aiEngine: engineId } }));
}

export function saveChat(programmeId, contextId, messages) {
  setState(s => ({
    ...s,
    chats: { ...s.chats, [`${programmeId}:${contextId}`]: messages },
  }));
}

export function loadChat(programmeId, contextId) {
  return STATE.chats[`${programmeId}:${contextId}`] || [];
}
