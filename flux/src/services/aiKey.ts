import { getSettings, patchSettings } from '../db';
import type { AIProviderId } from '../types';

/**
 * Per-provider BYOK storage, so FLUX can route each task to the optimal model
 * (e.g. Claude for reasoning/docs, Gemini for audio/video). An optional shared
 * passphrase encrypts keys with WebCrypto AES-GCM (PBKDF2-derived); the
 * passphrase is cached in sessionStorage for the tab's life. Without one, keys
 * are stored plaintext (clearly labelled in the UI).
 */
const PASSPHRASE_SESSION_KEY = 'flux.aiKey.passphrase';

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
function buf(u: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(u.byteLength);
  new Uint8Array(out).set(u);
  return out;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey('raw', buf(enc.encode(passphrase)), { name: 'PBKDF2' }, false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: buf(salt), iterations: 100_000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encryptKey(plaintextKey: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const enc = new TextEncoder();
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: buf(iv) }, key, buf(enc.encode(plaintextKey)));
  return `v1:${bytesToB64(salt)}:${bytesToB64(iv)}:${bytesToB64(new Uint8Array(cipher))}`;
}

async function decryptBlob(blob: string, passphrase: string): Promise<string | undefined> {
  const parts = blob.split(':');
  if (parts.length !== 4 || parts[0] !== 'v1') return undefined;
  try {
    const salt = b64ToBytes(parts[1]);
    const iv = b64ToBytes(parts[2]);
    const cipher = b64ToBytes(parts[3]);
    const key = await deriveKey(passphrase, salt);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf(iv) }, key, buf(cipher));
    return new TextDecoder().decode(plain);
  } catch {
    return undefined;
  }
}

export async function setAIKey(provider: AIProviderId, plaintextKey: string, passphrase?: string): Promise<void> {
  const settings = await getSettings();
  const aiKeys = { ...(settings.aiKeys ?? {}) };
  if (passphrase) {
    aiKeys[provider] = { cipher: await encryptKey(plaintextKey, passphrase), plaintext: false };
    sessionStorage.setItem(PASSPHRASE_SESSION_KEY, passphrase);
  } else {
    aiKeys[provider] = { cipher: plaintextKey, plaintext: true };
  }
  await patchSettings({ aiKeys });
}

export async function clearAIKey(provider: AIProviderId): Promise<void> {
  const settings = await getSettings();
  const aiKeys = { ...(settings.aiKeys ?? {}) };
  delete aiKeys[provider];
  await patchSettings({ aiKeys });
}

/** Migrate the legacy single-key fields into the per-provider map, once. */
async function migrateLegacy(): Promise<void> {
  const settings = await getSettings();
  if (settings.aiKeyCipher && settings.aiProvider && !settings.aiKeys?.[settings.aiProvider]) {
    const aiKeys = { ...(settings.aiKeys ?? {}) };
    aiKeys[settings.aiProvider] = { cipher: settings.aiKeyCipher, plaintext: settings.aiKeyPlaintext };
    await patchSettings({ aiKeys, aiKeyCipher: undefined, aiKeyPlaintext: undefined });
  }
}

export async function getAIKey(
  provider: AIProviderId,
  promptForPassphrase?: () => Promise<string>,
): Promise<string | undefined> {
  await migrateLegacy();
  const settings = await getSettings();
  const entry = settings.aiKeys?.[provider];
  if (!entry?.cipher) return undefined;
  if (entry.plaintext) return entry.cipher;
  let passphrase = sessionStorage.getItem(PASSPHRASE_SESSION_KEY) ?? '';
  if (!passphrase && promptForPassphrase) passphrase = await promptForPassphrase();
  if (!passphrase) return undefined;
  const plain = await decryptBlob(entry.cipher, passphrase);
  if (plain) {
    sessionStorage.setItem(PASSPHRASE_SESSION_KEY, passphrase);
    return plain;
  }
  sessionStorage.removeItem(PASSPHRASE_SESSION_KEY);
  return undefined;
}

export async function hasAIKey(provider: AIProviderId): Promise<boolean> {
  await migrateLegacy();
  const settings = await getSettings();
  return !!settings.aiKeys?.[provider]?.cipher;
}

export async function configuredProviders(): Promise<AIProviderId[]> {
  await migrateLegacy();
  const settings = await getSettings();
  return (Object.keys(settings.aiKeys ?? {}) as AIProviderId[]).filter((p) => !!settings.aiKeys?.[p]?.cipher);
}

export async function hasAnyAIKey(): Promise<boolean> {
  return (await configuredProviders()).length > 0;
}

export function clearPassphraseCache(): void {
  sessionStorage.removeItem(PASSPHRASE_SESSION_KEY);
}
