import { getSettings, patchSettings } from '../db';

/**
 * BYOK key storage.
 *
 * If the user supplies a passphrase, the key is encrypted with WebCrypto
 * AES-GCM derived from the passphrase via PBKDF2. The cipher is stored in
 * IndexedDB; the passphrase is held in a sessionStorage cache for the life
 * of the tab so the user doesn't need to re-enter it on every AI call.
 *
 * If the user opts out of a passphrase, the key is stored plaintext (clearly
 * labelled as such in the UI) and `aiKeyPlaintext` is true. This is the
 * default — passphrase is recommended but optional.
 */

const PASSPHRASE_SESSION_KEY = 'sigma.aiKey.passphrase';

function bytesToB64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function b64ToBytes(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/**
 * Wrap a Uint8Array as a fresh ArrayBuffer-backed copy so it satisfies
 * BufferSource in TS lib.dom.d.ts (which excludes SharedArrayBuffer-backed
 * typed arrays after TS 5.7).
 */
function buf(u: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(u.byteLength);
  new Uint8Array(out).set(u);
  return out;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    buf(enc.encode(passphrase)),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: buf(salt), iterations: 100_000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function setAIKey(plaintextKey: string, passphrase?: string): Promise<void> {
  if (!passphrase) {
    await patchSettings({ aiKeyCipher: plaintextKey, aiKeyPlaintext: true });
    return;
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const enc = new TextEncoder();
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: buf(iv) },
    key,
    buf(enc.encode(plaintextKey)),
  );
  const blob = `v1:${bytesToB64(salt)}:${bytesToB64(iv)}:${bytesToB64(new Uint8Array(cipher))}`;
  await patchSettings({ aiKeyCipher: blob, aiKeyPlaintext: false });
  sessionStorage.setItem(PASSPHRASE_SESSION_KEY, passphrase);
}

export async function clearAIKey(): Promise<void> {
  await patchSettings({ aiKeyCipher: undefined, aiKeyPlaintext: undefined });
  sessionStorage.removeItem(PASSPHRASE_SESSION_KEY);
}

export async function getAIKey(promptForPassphrase?: () => Promise<string>): Promise<string | undefined> {
  const settings = await getSettings();
  const blob = settings.aiKeyCipher;
  if (!blob) return undefined;
  if (settings.aiKeyPlaintext) return blob;
  // Need passphrase.
  let passphrase = sessionStorage.getItem(PASSPHRASE_SESSION_KEY) ?? '';
  if (!passphrase && promptForPassphrase) passphrase = await promptForPassphrase();
  if (!passphrase) return undefined;
  const parts = blob.split(':');
  if (parts.length !== 4 || parts[0] !== 'v1') return undefined;
  try {
    const salt = b64ToBytes(parts[1]);
    const iv = b64ToBytes(parts[2]);
    const cipher = b64ToBytes(parts[3]);
    const key = await deriveKey(passphrase, salt);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf(iv) }, key, buf(cipher));
    sessionStorage.setItem(PASSPHRASE_SESSION_KEY, passphrase);
    return new TextDecoder().decode(plain);
  } catch {
    sessionStorage.removeItem(PASSPHRASE_SESSION_KEY);
    return undefined;
  }
}

export function clearPassphraseCache(): void {
  sessionStorage.removeItem(PASSPHRASE_SESSION_KEY);
}
