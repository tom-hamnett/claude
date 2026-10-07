import { isCloud, supabase } from '../supabase';

/**
 * In cloud (platform) mode all Gemini traffic is routed through our own
 * /api/gemini proxy, which holds the shared API key server-side and only
 * serves signed-in users. In local (BYOK) mode we talk to Google directly
 * with the user's own key. This module hides that difference from the client.
 */
export const geminiUsesProxy = isCloud;

export const geminiBase = isCloud ? '/api/gemini' : 'https://generativelanguage.googleapis.com';

export const anthropicUsesProxy = isCloud;

export const anthropicBase = isCloud ? '/api/anthropic' : 'https://api.anthropic.com';

/**
 * Direct provider endpoints. Used for BYOK calls — when the user has supplied
 * their own key, the browser talks to the provider directly (even in cloud
 * mode), so their data flows only to their own Anthropic/Google account and
 * never through a shared FLUX server.
 */
export const ANTHROPIC_DIRECT = 'https://api.anthropic.com';
export const GEMINI_DIRECT = 'https://generativelanguage.googleapis.com';

/** Bearer header proving the caller is a signed-in FLUX user (proxy mode only). */
export async function proxyAuthHeaders(): Promise<Record<string, string>> {
  if (!isCloud || !supabase) return {};
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { authorization: `Bearer ${token}` } : {};
}
