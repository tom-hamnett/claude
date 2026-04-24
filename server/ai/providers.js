// Multi-provider LLM dispatcher.
// Each provider implementation translates generic (system, messages) into its own API shape.

async function callAnthropic(engine, system, messages) {
  const key = engine.api_key || process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Anthropic API key not set");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: engine.model_name || "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system,
      messages,
    }),
  });
  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return { text: data.content?.[0]?.text || "", raw: data };
}

async function callGemini(engine, system, messages) {
  const key = engine.api_key || process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Gemini API key not set");
  const model = engine.model_name || "gemini-1.5-pro";
  // Gemini uses "contents" with alternating user/model roles; system is prepended
  const contents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  if (system) contents.unshift({ role: "user", parts: [{ text: `System: ${system}` }] });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: 4000 } }),
  });
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${await r.text()}`);
  const data = await r.json();
  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join("") || "";
  return { text, raw: data };
}

async function callAzureOpenAI(engine, system, messages) {
  const key = engine.api_key;
  const endpoint = engine.endpoint_url;
  const deployment = engine.deployment_name;
  if (!key || !endpoint || !deployment) throw new Error("Azure OpenAI requires api_key, endpoint_url, deployment_name");

  const url = `${endpoint.replace(/\/$/, "")}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-15-preview`;
  const allMessages = system ? [{ role: "system", content: system }, ...messages] : messages;

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": key },
    body: JSON.stringify({ messages: allMessages, max_tokens: 4000 }),
  });
  if (!r.ok) throw new Error(`Azure OpenAI ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return { text: data.choices?.[0]?.message?.content || "", raw: data };
}

async function callOpenAI(engine, system, messages) {
  const key = engine.api_key;
  if (!key) throw new Error("OpenAI API key not set");
  const model = engine.model_name || "gpt-4-turbo";
  const allMessages = system ? [{ role: "system", content: system }, ...messages] : messages;

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
    body: JSON.stringify({ model, messages: allMessages, max_tokens: 4000 }),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return { text: data.choices?.[0]?.message?.content || "", raw: data };
}

async function callCustom(engine, system, messages) {
  const endpoint = engine.endpoint_url;
  if (!endpoint) throw new Error("Custom endpoint URL required");
  const headers = { "Content-Type": "application/json" };
  if (engine.api_key) headers["Authorization"] = `Bearer ${engine.api_key}`;

  const r = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ system, messages, model: engine.model_name }),
  });
  if (!r.ok) throw new Error(`Custom endpoint ${r.status}: ${await r.text()}`);
  const data = await r.json();
  // Flexible response extraction — try common shapes
  const text = data.text || data.content || data.message || data.choices?.[0]?.message?.content || data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return { text, raw: data };
}

export const PROVIDERS = {
  anthropic: { label: "Anthropic Claude", call: callAnthropic, fields: ["api_key", "model_name"] },
  gemini:    { label: "Google Gemini",    call: callGemini,    fields: ["api_key", "model_name"] },
  copilot:   { label: "Microsoft Azure OpenAI / Copilot", call: callAzureOpenAI, fields: ["api_key", "endpoint_url", "deployment_name"] },
  openai:    { label: "OpenAI",           call: callOpenAI,    fields: ["api_key", "model_name"] },
  custom:    { label: "Custom endpoint",  call: callCustom,    fields: ["endpoint_url", "api_key", "model_name"] },
};

export async function callEngine(engine, system, messages) {
  const provider = PROVIDERS[engine.provider];
  if (!provider) throw new Error(`Unknown provider: ${engine.provider}`);
  return provider.call(engine, system, messages);
}

export async function testEngine(engine) {
  try {
    const result = await callEngine(engine, "You are a helpful assistant. Respond with a single short sentence confirming you're working.", [{ role: "user", content: "Say hello in one short sentence." }]);
    return { ok: true, text: result.text?.slice(0, 300) || "(empty response)" };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
