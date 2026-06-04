import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cloud mode is activated purely by the presence of env vars at build time.
 * When they're absent, FLUX runs in fully-local mode (Dexie/IndexedDB) and the
 * whole auth/cloud layer is inert — so the app always works, configured or not.
 *
 * The anon key is safe to ship to the browser: row-level security in Postgres
 * (see supabase/schema.sql) is what actually protects the data.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isCloud = !!(url && anonKey);

export const supabase: SupabaseClient | null = isCloud
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // We use OTP code entry, not magic-link redirects, so don't try to parse
        // tokens out of the URL (avoids clashes with HashRouter).
        detectSessionInUrl: false,
      },
    })
  : null;

/** The four cloud-backed entity tables. Settings stay local (AI keys never leave the device). */
export type CloudTable = 'projects' | 'processes' | 'opportunities' | 'knowledge';
