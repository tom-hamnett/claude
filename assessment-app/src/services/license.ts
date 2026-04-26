import { getSettings, patchSettings } from '../db';
import type { License } from '../types';

/**
 * License & unlock logic.
 *
 * Three tiers:
 *   FREE      → no AI. Full clipboard product. Forever-free.
 *   BYOK      → £4.99 one-time unlock. User pastes their own AI provider key
 *               (Anthropic / OpenAI / Gemini). They pay their own inference cost.
 *   MANAGED   → £9.99/month subscription. Sigma routes requests through the QT
 *               edge proxy with a server-side platform key. Generous daily quota,
 *               no key management for the user.
 *
 * Why offline-verifiable codes?
 * Because Sigma is used in places without WiFi. A user who paid £4.99 for BYOK
 * should not be locked out of the AI features they unlocked because the school
 * WiFi is down or the building site is in a basement. So the code carries its
 * own integrity check that we can validate locally.
 *
 * The code shape is `SIG-(BYOK|MAN)-XXXX-XXXX-XXXX` of A-Z letters; the sum of
 * the 12 inner letters mod 26 must equal a tier-specific constant. This is a
 * weak check — we don't pretend it's tamper-proof crypto. Sigma sells on value
 * not DRM. The marketing site mints valid codes after Stripe checkout
 * succeeds, using the same `mintCode` helper below.
 *
 * For managed, we additionally hit `/api/license/check` once a day when online
 * to confirm the subscription is still active. Offline, the cached
 * `lastVerifiedAt` is honoured for 30 days.
 */

const CODE_RE = /^SIG-(BYOK|MAN)-([A-Z]{4})-([A-Z]{4})-([A-Z]{4})$/i;
const MOD = 26;
const CHECKSUMS = {
  byok: 7,
  managed: 13,
};
const MANAGED_OFFLINE_GRACE_MS = 30 * 24 * 60 * 60 * 1000;

function checksum(letters: string): number {
  let n = 0;
  for (const c of letters.toUpperCase()) n = (n + c.charCodeAt(0)) % MOD;
  return n;
}

/** Generate a valid code for a tier. Used by sample codes here and by the
 * marketing site after a successful Stripe checkout. */
export function mintCode(tier: 'byok' | 'managed'): string {
  const tag = tier === 'byok' ? 'BYOK' : 'MAN';
  const target = CHECKSUMS[tier];

  let core = '';
  for (let i = 0; i < 11; i++) {
    core += String.fromCharCode(65 + Math.floor(Math.random() * 26));
  }
  const cur = checksum(core);
  const needMod = (target - cur + MOD) % MOD;
  let twelfth = 'A';
  for (let c = 65; c <= 90; c++) {
    if (c % MOD === needMod) {
      twelfth = String.fromCharCode(c);
      break;
    }
  }
  const full = (core + twelfth).toUpperCase();
  return `SIG-${tag}-${full.slice(0, 4)}-${full.slice(4, 8)}-${full.slice(8, 12)}`;
}

export type ValidationResult =
  | { ok: true; tier: 'byok' | 'managed' }
  | { ok: false; reason: string };

export function validateCode(rawCode: string): ValidationResult {
  const code = rawCode.trim().toUpperCase();
  const m = CODE_RE.exec(code);
  if (!m) {
    return { ok: false, reason: 'That doesn\'t look like a Sigma unlock code.' };
  }
  const tag = m[1].toUpperCase();
  const inner = (m[2] + m[3] + m[4]).toUpperCase();
  const sum = checksum(inner);
  if (tag === 'BYOK') {
    if (sum !== CHECKSUMS.byok) return { ok: false, reason: 'That code is invalid or has been mistyped.' };
    return { ok: true, tier: 'byok' };
  }
  if (tag === 'MAN') {
    if (sum !== CHECKSUMS.managed) return { ok: false, reason: 'That code is invalid or has been mistyped.' };
    return { ok: true, tier: 'managed' };
  }
  return { ok: false, reason: 'Unknown code type.' };
}

/** Verify a code and store it. Returns the merged license. */
export async function activateLicense(rawCode: string, email?: string): Promise<License> {
  const result = validateCode(rawCode);
  if (!result.ok) throw new Error(result.reason);
  const license: License = {
    tier: result.tier,
    code: rawCode.trim().toUpperCase(),
    email,
    activatedAt: Date.now(),
    lastVerifiedAt: Date.now(),
    dailyQuota: result.tier === 'managed' ? 200 : undefined,
  };
  await patchSettings({ license });
  return license;
}

export async function deactivateLicense(): Promise<void> {
  await patchSettings({ license: { tier: 'free' } });
}

/** Returns true if the user can call the AI right now. */
export async function canUseAI(): Promise<{
  ok: boolean;
  reason?: string;
  tier: 'free' | 'byok' | 'managed';
}> {
  const settings = await getSettings();
  const tier = settings.license?.tier ?? 'free';
  if (tier === 'free') {
    return { ok: false, reason: 'AI features are locked. Unlock for £4.99 (BYOK) or subscribe to Sigma AI.', tier };
  }
  if (tier === 'byok') {
    if (!settings.aiKeyCipher) {
      return { ok: false, reason: 'Add your AI provider API key in Settings to use AI.', tier };
    }
    return { ok: true, tier };
  }
  // Managed: require recent online verification.
  const lastVerified = settings.license?.lastVerifiedAt ?? 0;
  if (Date.now() - lastVerified > MANAGED_OFFLINE_GRACE_MS) {
    return { ok: false, reason: 'Your Sigma AI subscription needs to reconnect online to refresh.', tier };
  }
  // Daily quota.
  const today = new Date().toISOString().slice(0, 10);
  const usage = settings.usageToday;
  const usedToday = usage && usage.date === today ? usage.count : 0;
  const quota = settings.license?.dailyQuota ?? 200;
  if (usedToday >= quota) {
    return { ok: false, reason: `Daily AI quota of ${quota} calls reached. Resets at midnight.`, tier };
  }
  return { ok: true, tier };
}

/** Increment the daily counter (call after a successful managed-tier AI call). */
export async function bumpUsage(): Promise<void> {
  const settings = await getSettings();
  if (settings.license?.tier !== 'managed') return;
  const today = new Date().toISOString().slice(0, 10);
  const current = settings.usageToday;
  const next = current && current.date === today
    ? { date: today, count: current.count + 1 }
    : { date: today, count: 1 };
  await patchSettings({ usageToday: next });
}
