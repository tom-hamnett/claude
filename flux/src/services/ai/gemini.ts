import type { AICompleteRequest, AICompleteResult, AIProvider } from './types';
import { AIError, friendlyMessage, safeJson, tryParseJson } from './types';
import { geminiBase, geminiUsesProxy, proxyAuthHeaders } from './gateway';

export const geminiProvider: AIProvider = {
  id: 'gemini',
  label: 'Google Gemini',
  defaultModel: 'gemini-2.5-flash',
  models: [
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', notes: 'Default. Fast, cheap.' },
    { id: 'gemini-3-pro-preview', label: 'Gemini 3 Pro', notes: 'Highest quality.' },
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', notes: 'Stable fallback.' },
  ],
  supports: ['image', 'document', 'audio', 'video'],
  validateKey(key) {
    // Google has multiple key formats (classic AIza…, and newer prefixes), so
    // don't gate on prefix — let the API be the source of truth.
    if (!key) return { ok: false, reason: 'Key is empty.' };
    if (key.trim().length < 20) return { ok: false, reason: 'Key looks too short.' };
    return { ok: true };
  },
  async complete(req: AICompleteRequest, opts) {
    const contents = req.messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }] as Array<Record<string, unknown>>,
    }));
    // Attach files to the last user turn.
    if (req.attachments?.length) {
      const lastUser = [...contents].reverse().find((c) => c.role === 'user');
      if (lastUser) {
        for (const a of req.attachments) {
          if (a.fileUri) {
            lastUser.parts.push({ fileData: { mimeType: a.mime, fileUri: a.fileUri } });
          } else if (a.dataB64) {
            lastUser.parts.push({ inlineData: { mimeType: a.mime, data: a.dataB64 } });
          }
        }
      }
    }

    const generationConfig: Record<string, unknown> = {
      temperature: req.temperature ?? 0.4,
      maxOutputTokens: req.maxTokens ?? 1024,
    };
    if (req.jsonSchema) {
      generationConfig.responseMimeType = 'application/json';
      generationConfig.responseSchema = req.jsonSchema;
    }

    const url = geminiUsesProxy
      ? `${geminiBase}/v1beta/models/${encodeURIComponent(opts.model)}:generateContent`
      : `${geminiBase}/v1beta/models/${encodeURIComponent(opts.model)}:generateContent?key=${encodeURIComponent(opts.apiKey)}`;
    const body: Record<string, unknown> = { contents, generationConfig };
    if (req.system) body.systemInstruction = { parts: [{ text: req.system }] };

    let resp: Response;
    try {
      resp = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(await proxyAuthHeaders()) },
        body: JSON.stringify(body),
        signal: req.signal,
      });
    } catch (err) {
      throw new AIError(err instanceof Error ? err.message : 'Network error contacting Gemini.', {
        provider: 'gemini',
      });
    }
    if (!resp.ok) {
      const raw = await safeJson(resp);
      throw new AIError(`Gemini ${resp.status}: ${friendlyMessage(raw) || resp.statusText}`, {
        provider: 'gemini',
        status: resp.status,
        raw,
      });
    }
    const data = (await resp.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };
    let text = '';
    for (const part of data.candidates?.[0]?.content?.parts ?? []) {
      if (typeof part.text === 'string') text += part.text;
    }
    const json = req.jsonSchema ? tryParseJson(text) : undefined;
    return {
      text,
      json,
      inputTokens: data.usageMetadata?.promptTokenCount,
      outputTokens: data.usageMetadata?.candidatesTokenCount,
      provider: 'gemini',
      model: opts.model,
    } satisfies AICompleteResult;
  },
};
