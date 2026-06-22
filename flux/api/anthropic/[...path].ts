/**
 * FLUX shared-key proxy for Anthropic (Claude) — the reasoning engine.
 *
 * Mirrors the Gemini proxy: verifies the caller's Supabase session, injects the
 * server-only ANTHROPIC_API_KEY, and forwards to Anthropic. The browser never
 * holds or sees the key, so the whole team reasons on one central Claude key.
 *
 * Required Vercel environment variables (server-side, NOT prefixed VITE_):
 *   ANTHROPIC_API_KEY   — the shared Claude key
 *   SUPABASE_URL / SUPABASE_ANON_KEY (or the VITE_ equivalents) — session check
 */
export const config = { runtime: 'edge' };

const ANTHROPIC = 'https://api.anthropic.com';

export default async function handler(req: Request): Promise<Response> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return json(500, { error: 'Server is not configured with ANTHROPIC_API_KEY.' });

  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return json(401, { error: 'Sign in to use FLUX intelligence.' });
  if (!(await verifyUser(token))) return json(401, { error: 'Your session has expired — sign in again.' });

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/anthropic\//, '');
  const target = `${ANTHROPIC}/${path}${url.search}`;

  const headers = new Headers();
  headers.set('content-type', req.headers.get('content-type') || 'application/json');
  headers.set('anthropic-version', req.headers.get('anthropic-version') || '2023-06-01');
  headers.set('x-api-key', key);

  let resp: Response;
  try {
    resp = await fetch(target, { method: req.method, headers, body: req.method === 'GET' ? undefined : await req.arrayBuffer() });
  } catch {
    return json(502, { error: 'Could not reach Anthropic.' });
  }

  const out = new Headers();
  const ct = resp.headers.get('content-type');
  if (ct) out.set('content-type', ct);
  return new Response(resp.body, { status: resp.status, headers: out });
}

async function verifyUser(token: string): Promise<boolean> {
  const base = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!base || !anon) return false;
  try {
    const r = await fetch(`${base}/auth/v1/user`, { headers: { apikey: anon, authorization: `Bearer ${token}` } });
    return r.ok;
  } catch {
    return false;
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
