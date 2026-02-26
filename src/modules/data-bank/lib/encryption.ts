/**
 * Data Bank Box — Client-Side Encryption (AES-256-GCM)
 * ════════════════════════════════════════════════════════
 *
 * Zero-knowledge encryption: the server only ever sees ciphertext.
 * Key derivation: HKDF(SHA-256) from the user's auth session ID.
 * The encryption key never leaves the client.
 *
 * @module data-bank/lib/encryption
 */

const ALGO = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for AES-GCM

// ── Key Derivation ──────────────────────────────────────────────────────────

/**
 * Derive a stable AES-256 key from a user-specific seed (e.g. user_id + salt).
 * Uses HKDF with SHA-256 — deterministic so the same seed always yields
 * the same key, enabling multi-device decryption with the same auth session.
 */
export async function deriveEncryptionKey(
  userSeed: string
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(userSeed),
    "HKDF",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: encoder.encode("uor:data-bank:v1"),
      info: encoder.encode("data-bank-encryption"),
    },
    keyMaterial,
    { name: ALGO, length: KEY_LENGTH },
    false, // non-extractable
    ["encrypt", "decrypt"]
  );
}

// ── Encrypt ─────────────────────────────────────────────────────────────────

export interface EncryptedPayload {
  /** Base64-encoded ciphertext */
  ciphertext: string;
  /** Base64-encoded IV (12 bytes) */
  iv: string;
  /** Original plaintext byte length */
  byteLength: number;
}

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * Returns base64-encoded ciphertext + IV for storage.
 */
export async function encrypt(
  key: CryptoKey,
  plaintext: string
): Promise<EncryptedPayload> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: ALGO, iv },
    key,
    data
  );

  return {
    ciphertext: uint8ToBase64(new Uint8Array(ciphertextBuffer)),
    iv: uint8ToBase64(iv),
    byteLength: data.byteLength,
  };
}

// ── Decrypt ─────────────────────────────────────────────────────────────────

/**
 * Decrypt a base64-encoded ciphertext with its IV using AES-256-GCM.
 */
export async function decrypt(
  key: CryptoKey,
  ciphertext: string,
  iv: string
): Promise<string> {
  const ciphertextBytes = base64ToUint8(ciphertext);
  const ivBytes = base64ToUint8(iv);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGO, iv: ivBytes.buffer as ArrayBuffer },
    key,
    ciphertextBytes.buffer as ArrayBuffer
  );

  return new TextDecoder().decode(decrypted);
}

// ── Base64 helpers (browser-safe) ───────────────────────────────────────────

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
