// Generic frontend AI caller. Routes everything through the server's multi-provider dispatcher.
// The server looks up the engine by id (or default for the programme).

export async function aiCall(engineIdOrProgrammeId, system, msgs, opts = {}) {
  // For backward compat: the first arg can be either an engineId or a programmeId.
  // The UI passes whichever it has.
  const params = new URLSearchParams();
  if (opts.engineId) params.set("engineId", opts.engineId);
  else if (typeof engineIdOrProgrammeId === "string" && engineIdOrProgrammeId.startsWith("eng-")) {
    params.set("engineId", engineIdOrProgrammeId);
  }
  if (opts.programmeId) params.set("programmeId", opts.programmeId);

  try {
    const r = await fetch("/api/ai" + (params.toString() ? "?" + params.toString() : ""), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system, messages: msgs }),
    });
    const data = await r.json();
    if (data.error) return `⚠ ${data.error}`;
    return data.content?.[0]?.text || "No response.";
  } catch (e) {
    return "⚠ AI engine connection error.";
  }
}

export function extractJson(reply) {
  const m = reply.match(/```json\s*([\s\S]*?)```/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch (e) { return null; }
}

export function stripJson(reply) {
  return reply.replace(/```json[\s\S]*?```/g, "").trim();
}
