/**
 * Mirror of the Sigma app's license code algorithm.
 *
 * The marketing site mints codes after a successful Stripe checkout (eventually
 * via webhook → email). The Sigma app validates them locally without a network
 * round-trip, so users can activate offline.
 *
 * MUST match `assessment-app/src/services/license.ts`. Any change must be made
 * in both places.
 */

const MOD = 26;
const CHECKSUMS = {
  byok: 7,
  managed: 13,
};

function checksum(letters: string): number {
  let n = 0;
  for (const c of letters.toUpperCase()) n = (n + c.charCodeAt(0)) % MOD;
  return n;
}

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
