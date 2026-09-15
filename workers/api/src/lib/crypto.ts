const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function base64ToBytes(value: string): Uint8Array {
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim();
  if (clean.length % 2 !== 0) throw new Error("invalid hex key");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Accept 32-byte key as hex (64 chars) or standard/base64url 32-byte payload. */
export function parseEncryptionKey(raw: string): Uint8Array {
  const trimmed = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return hexToBytes(trimmed);
  }
  const normalized = trimmed.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  try {
    const bytes = base64ToBytes(padded);
    if (bytes.length === 32) return bytes;
  } catch {
    /* fall through */
  }
  throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes (hex or base64)");
}

async function importAesKey(raw: string): Promise<CryptoKey> {
  const bytes = parseEncryptionKey(raw);
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptJson(
  keyMaterial: string,
  payload: unknown,
): Promise<{ iv: string; ciphertext: string }> {
  const key = await importAesKey(keyMaterial);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = encoder.encode(JSON.stringify(payload));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext),
  );
  return { iv: bytesToBase64(iv), ciphertext: bytesToBase64(ciphertext) };
}

export async function decryptJson<T>(
  keyMaterial: string,
  ivB64: string,
  ciphertextB64: string,
): Promise<T> {
  const key = await importAesKey(keyMaterial);
  const iv = base64ToBytes(ivB64);
  const ciphertext = base64ToBytes(ciphertextB64);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );
  return JSON.parse(decoder.decode(plaintext)) as T;
}

export async function hmacHex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(data)),
  );
  return bytesToHex(sig);
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export function randomHex(bytes = 32): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(bytes)));
}
