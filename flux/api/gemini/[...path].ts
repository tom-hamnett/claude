/**
 * FLUX shared-key proxy for Google Gemini.
 *
 * In cloud mode the browser never holds an API key. It calls /api/gemini/<path>
 * with its Supabase access token; this function verifies the caller is a
 * signed-in FLUX user, injects the team's GEMINI_API_KEY (a server-only secret),
 * and forwards the request to Google. Large media bytes are NOT proxied here —
 * the client uploads them straight to Google's pre-authorized resumable URL, so
 * they never hit this function's body-size limit.
 *
 * Required Vercel environment variables (server-side, NOT prefixed with VITE_):
 *   GEMINI_API_KEY      — the shared Google Gemini key everyone runs on
 *   SUPABASE_URL        — your Supabase project URL
 *   SUPABASE_ANON_KEY   — the anon/public key (used only to validate sessions)
 */
export const config = { runtime: 'edge' };

const GOOGLE = 'https://generativelanguage.googleapis.com';

// Request headers Google needs for the resumable Files API.
const FORWARD_REQ_HEADERS = [
  'content-type',
  'x-goog-upload-protocol',
  'x-goog-upload-command',
  'x-goog-upload-header-content-length',
  'x-goog-upload-header-content-type',
  'x-goog-upload-offset',
];
// Response headers the client needs back (notably the upload URL + content type).
const FORWARD_RESP_HEADERS = [
  'content-type',
  'x-goog-upload-url',
  'x-goog-upload-status',
  'x-goog-upload-chunk-granularity',
];

export default async function handler(req: Request): Promise<Response> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return json(500, { error: 'Server is not configured with GEMINI_API_KEY.' });

  // 1) Authenticate: the caller must be a signed-in FLUX user.
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return json(401, { error: 'Sign in to use FLUX intelligence.' });
  if (!(await verifyUser(token))) return json(401, { error: 'Your session has expired — sign in again.' });

  // 2) Rebuild the Google URL from the catch-all path and inject the key.
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/gemini\//, '');
  const target = new URL(`${GOOGLE}/${path}`);
  for (const [k, v] of url.searchParams) target.searchParams.set(k, v);
  target.searchParams.set('key', key);

  // 3) Forward method, body and the upload headers.
  const headers = new Headers();
  for (const h of FORWARD_REQ_HEADERS) {
    const v = req.headers.get(h);
    if (v) headers.set(h, v);
  }
  const init: RequestInit = { method: req.method, headers };
  if (req.method !== 'GET' && req.method !== 'HEAD') init.body = await req.arrayBuffer();

  let resp: Response;
  try {
    resp = await fetch(target.toString(), init);
  } catch {
    return json(502, { error: 'Could not reach Gemini.' });
  }

  // 4) Return Google's body + the headers the client relies on.
  const out = new Headers();
  for (const h of FORWARD_RESP_HEADERS) {
    const v = resp.headers.get(h);
    if (v) out.set(h, v);
  }
  return new Response(resp.body, { status: resp.status, headers: out });
}

async function verifyUser(token: string): Promise<boolean> {
  // Reuse the Supabase vars already set for the client (VITE_*) so onboarding
  // only needs ONE new secret (GEMINI_API_KEY). Functions see all env vars.
  const base = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!base || !anon) return false;
  try {
    const r = await fetch(`${base}/auth/v1/user`, {
      headers: { apikey: anon, authorization: `Bearer ${token}` },
    });
    return r.ok;
  } catch {
    return false;
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
