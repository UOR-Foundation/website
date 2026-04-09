/**
 * Sovereign Spaces — Key Derivation
 * ═════════════════════════════════════════════════════════════════
 *
 * Per-space symmetric key derivation using UOR content-addressing.
 * Each space gets its own AES-256-GCM key derived from:
 *   HKDF(SHA-256, spaceSecret, salt=spaceCid, info="uor:space:encrypt")
 *
 * The spaceSecret is generated once by the space creator and
 * distributed to members via their public key (encrypted envelope).
 */

import { sha256bytes } from "@/lib/crypto";

// ── Key Derivation ─────────────────────────────────────────────────────────

/**
 * Derive a per-space AES-256-GCM key from the space's CID and owner secret.
 * Uses Web Crypto HKDF for standards-compliant key derivation.
 */
export async function deriveSpaceKey(
  spaceCid: string,
  ownerSecret: Uint8Array,
): Promise<CryptoKey> {
  const salt = new Uint8Array(sha256bytes(spaceCid).buffer.slice(0)) as unknown as BufferSource;
  const info = new TextEncoder().encode("uor:space:encrypt") as unknown as BufferSource;

  // Import raw secret as HKDF base key
  const baseKey = await crypto.subtle.importKey(
    "raw", ownerSecret.buffer.slice(0) as ArrayBuffer, "HKDF", false, ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt, info },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Encrypt a change payload for a space.
 */
export async function encryptPayload(
  key: CryptoKey,
  plaintext: string,
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded,
  );

  return {
    ciphertext: arrayToBase64(new Uint8Array(encrypted)),
    iv: arrayToBase64(iv),
  };
}

/**
 * Decrypt a change payload for a space.
 */
export async function decryptPayload(
  key: CryptoKey,
  ciphertext: string,
  iv: string,
): Promise<string> {
  const decoded = base64ToArray(ciphertext);
  const ivBytes = base64ToArray(iv);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes.buffer.slice(0) as ArrayBuffer },
    key,
    decoded.buffer.slice(0) as ArrayBuffer,
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Generate a fresh space secret (32 random bytes).
 */
export function generateSpaceSecret(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

// ── Encoding helpers ───────────────────────────────────────────────────────

function arrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArray(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
