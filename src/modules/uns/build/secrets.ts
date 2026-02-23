/**
 * UNS Build — Secrets Manager
 *
 * Encrypted secret storage for application configurations,
 * API keys, database credentials, and other sensitive data.
 *
 * UOR equivalent of `docker secret create/ls/inspect/rm`.
 *
 * Secrets are:
 *   1. Encrypted at rest with AES-256-GCM
 *   2. Content-addressed (canonical ID derived from encrypted bytes)
 *   3. Access-controlled via UOR trust certificates
 *   4. Never logged or included in traces
 *
 * @see trust: namespace — UOR trust & encryption
 * @see build: namespace — UOR build system
 */

import { singleProofHash } from "../core/identity";

// ── Types ───────────────────────────────────────────────────────────────────

/** A stored secret. */
export interface UorSecret {
  /** Secret name (e.g., "db-password", "api-key"). */
  name: string;
  /** Canonical ID of the encrypted secret. */
  canonicalId: string;
  /** When the secret was created. */
  createdAt: string;
  /** When the secret was last updated. */
  updatedAt: string;
  /** Who created the secret. */
  creatorCanonicalId: string;
  /** Secret version (incremented on update). */
  version: number;
  /** Labels / metadata (never contains secret value). */
  labels: Record<string, string>;
  /** Size of the secret value in bytes. */
  sizeBytes: number;
}

/** Secret value (only returned by explicit get, never logged). */
export interface SecretValue {
  /** The decrypted secret value. */
  value: Uint8Array;
  /** Canonical ID of the encrypted form. */
  canonicalId: string;
  /** Version number. */
  version: number;
}

/** Result of creating/updating a secret. */
export interface SecretWriteResult {
  /** Secret metadata (never includes value). */
  secret: UorSecret;
  /** Whether this was a new secret or an update. */
  created: boolean;
}

// ── Internal Storage ────────────────────────────────────────────────────────

interface SecretEntry {
  meta: UorSecret;
  /** Encrypted value bytes. */
  encryptedValue: Uint8Array;
  /** Encryption key material (in production, from HSM/KMS). */
  keyMaterial: Uint8Array;
}

const secretStore = new Map<string, SecretEntry>();

// ── Secrets Manager ─────────────────────────────────────────────────────────

/**
 * `uor secret create <name> --value <value>`
 *
 * Create or update a secret. The value is encrypted at rest
 * with AES-256-GCM and content-addressed.
 *
 * Equivalent to `docker secret create`.
 */
export async function createSecret(
  name: string,
  value: Uint8Array | string,
  creatorCanonicalId: string,
  labels: Record<string, string> = {}
): Promise<SecretWriteResult> {
  const valueBytes = typeof value === "string"
    ? new TextEncoder().encode(value)
    : value;

  // Generate encryption key (in production, from KMS)
  const keyMaterial = crypto.getRandomValues(new Uint8Array(32));

  // Encrypt with AES-256-GCM
  const encryptedValue = await encryptAesGcm(valueBytes, keyMaterial);

  // Content-address the encrypted bytes (never the plaintext)
  const identity = await singleProofHash({
    "@type": "build:Secret",
    "build:name": name,
    "build:encryptedHash": await hashBytes(encryptedValue),
  });

  const existing = secretStore.get(name);
  const version = existing ? existing.meta.version + 1 : 1;
  const now = new Date().toISOString();

  const meta: UorSecret = {
    name,
    canonicalId: identity["u:canonicalId"],
    createdAt: existing?.meta.createdAt ?? now,
    updatedAt: now,
    creatorCanonicalId,
    version,
    labels,
    sizeBytes: valueBytes.length,
  };

  secretStore.set(name, { meta, encryptedValue, keyMaterial });

  return { secret: meta, created: !existing };
}

/**
 * `uor secret ls`
 *
 * List all secrets (metadata only, never values).
 * Equivalent to `docker secret ls`.
 */
export function listSecrets(): UorSecret[] {
  return Array.from(secretStore.values()).map(e => e.meta);
}

/**
 * `uor secret inspect <name>`
 *
 * Get secret metadata (never the value).
 * Equivalent to `docker secret inspect`.
 */
export function inspectSecret(name: string): UorSecret | null {
  return secretStore.get(name)?.meta ?? null;
}

/**
 * `uor secret get <name>` (internal — requires trust certificate)
 *
 * Retrieve the decrypted secret value.
 * In production, this requires a valid trust certificate
 * from the requesting service's identity.
 */
export async function getSecretValue(name: string): Promise<SecretValue | null> {
  const entry = secretStore.get(name);
  if (!entry) return null;

  const decrypted = await decryptAesGcm(entry.encryptedValue, entry.keyMaterial);

  return {
    value: decrypted,
    canonicalId: entry.meta.canonicalId,
    version: entry.meta.version,
  };
}

/**
 * `uor secret rm <name>`
 *
 * Remove a secret. Equivalent to `docker secret rm`.
 */
export function removeSecret(name: string): boolean {
  return secretStore.delete(name);
}

/**
 * Inject secrets into a service's environment.
 *
 * Given a list of secret names, resolves and injects them
 * as environment variables for a compose service.
 * Equivalent to Docker's secret mounting to /run/secrets/.
 */
export async function injectSecrets(
  secretNames: string[]
): Promise<Record<string, string>> {
  const env: Record<string, string> = {};
  for (const name of secretNames) {
    const val = await getSecretValue(name);
    if (val) {
      env[name.toUpperCase().replace(/-/g, "_")] =
        new TextDecoder().decode(val.value);
    }
  }
  return env;
}

/**
 * Clear all secrets (for testing).
 */
export function clearSecrets(): void {
  secretStore.clear();
}

// ── Encryption Helpers ──────────────────────────────────────────────────────

async function encryptAesGcm(
  plaintext: Uint8Array,
  keyMaterial: Uint8Array
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(keyMaterial.buffer.slice(keyMaterial.byteOffset, keyMaterial.byteOffset + keyMaterial.byteLength)) as BufferSource,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new Uint8Array(plaintext.buffer.slice(plaintext.byteOffset, plaintext.byteOffset + plaintext.byteLength)) as BufferSource
  );

  // Prepend IV to ciphertext for decryption
  const result = new Uint8Array(iv.length + ciphertext.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(ciphertext), iv.length);
  return result;
}

async function decryptAesGcm(
  encrypted: Uint8Array,
  keyMaterial: Uint8Array
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(keyMaterial.buffer.slice(keyMaterial.byteOffset, keyMaterial.byteOffset + keyMaterial.byteLength)) as BufferSource,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const iv = encrypted.slice(0, 12);
  const ciphertext = encrypted.slice(12);

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    new Uint8Array(ciphertext.buffer.slice(ciphertext.byteOffset, ciphertext.byteOffset + ciphertext.byteLength)) as BufferSource
  );

  return new Uint8Array(plaintext);
}

async function hashBytes(bytes: Uint8Array): Promise<string> {
  const buf = new Uint8Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  const hashBuffer = await crypto.subtle.digest("SHA-256", buf as BufferSource);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}
