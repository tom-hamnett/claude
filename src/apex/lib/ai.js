// Engine-agnostic AI call layer
// Engine is configurable per user/programme. For now, only Anthropic is wired
// (via Vite proxy at /api/ai). Stubs exist for Gemini / OpenAI.

const ENGINES = {
  anthropic: {
    id: "anthropic",
    label: "Anthropic Claude",
    description: "Claude Sonnet via server proxy",
    badge: "ANT",
    color: "#F5C544",
    call: async (system, msgs) => {
      try {
        const r = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4000, system, messages: msgs }),
        });
        const data = await r.json();
        if (data.error) return `⚠ ${data.error}`;
        return data.content?.[0]?.text || "No response.";
      } catch (e) {
        return "⚠ AI engine connection error.";
      }
    },
  },
  gemini: {
    id: "gemini",
    label: "Google Gemini",
    description: "Requires API key in settings (not yet wired)",
    badge: "GEM",
    color: "#4A9EFF",
    call: async () => "[Gemini engine not configured — add your API key in Settings]",
  },
  copilot: {
    id: "copilot",
    label: "Microsoft Copilot / Azure OpenAI",
    description: "Requires endpoint + API key in settings (not yet wired)",
    badge: "CPX",
    color: "#2ABFBF",
    call: async () => "[Copilot/Azure engine not configured — add your endpoint in Settings]",
  },
};

export function getEngine(id) { return ENGINES[id] || ENGINES.anthropic; }
export function listEngines() { return Object.values(ENGINES); }

export const DEFAULT_ENGINE = "anthropic";

export async function aiCall(engineId, system, msgs) {
  const engine = getEngine(engineId || DEFAULT_ENGINE);
  return engine.call(system, msgs);
}

// Extract first ```json ... ``` block from a reply
export function extractJson(reply) {
  const m = reply.match(/```json\s*([\s\S]*?)```/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch (e) { return null; }
}

// Strip json blocks from reply for display
export function stripJson(reply) {
  return reply.replace(/```json[\s\S]*?```/g, "").trim();
}
