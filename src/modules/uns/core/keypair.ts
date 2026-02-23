/**
 * UNS Core — Post-Quantum Keypair & Signing (Dilithium-3 / ML-DSA-65)
 *
 * Implements CRYSTALS-Dilithium-3 (FIPS 204 ML-DSA-65) post-quantum
 * digital signatures for UNS record authentication.
 *
 * Every signed record carries a cert:signature block that any agent
 * can verify without a trusted third party — using only the signer's
 * public key object (itself content-addressed via singleProofHash).
 *
 * Dependencies: @noble/post-quantum (audited, zero-dep PQC library)
 */

// @ts-ignore — noble/post-quantum uses .js exports
import { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";
import { singleProofHash } from "./identity";
import { canonicalizeToNQuads } from "./canonicalize";

// ── Types ───────────────────────────────────────────────────────────────────

/** A Dilithium-3 keypair with its content-addressed public key identity. */
export interface UnsKeypair {
  /** Algorithm identifier — always 'CRYSTALS-Dilithium-3'. */
  algorithm: "CRYSTALS-Dilithium-3";
  /** Raw public key bytes (1952 bytes for ML-DSA-65). */
  publicKeyBytes: Uint8Array;
  /** Raw private key bytes (4000 bytes). NEVER serialize or transmit. */
  privateKeyBytes: Uint8Array;
  /** Canonical ID of the public key object — used as signer identity. */
  canonicalId: string;
  /** JSON-LD public key object — storable, shareable, content-addressed. */
  publicKeyObject: PublicKeyObject;
}

/** JSON-LD representation of a public key for storage/DHT distribution. */
export interface PublicKeyObject {
  "@type": "uns:IdentityObject";
  "cert:algorithm": "CRYSTALS-Dilithium-3";
  "cert:keyBytes": string; // base64url-encoded public key
}

/** The signature block appended to signed records. */
export interface SignatureBlock {
  "@type": "cert:Signature";
  "cert:algorithm": "CRYSTALS-Dilithium-3";
  "cert:signatureBytes": string; // base64url-encoded signature
  "cert:signerCanonicalId": string;
  "cert:signedAt": string; // ISO 8601
}

/** A record with a cert:signature block attached. */
export type SignedRecord<T extends object> = T & {
  "cert:signature": SignatureBlock;
};

// ── Base64url Encoding ──────────────────────────────────────────────────────

function toBase64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ── Local Key Store (stub — replaced by DHT in production) ──────────────────

const keyStore = new Map<string, PublicKeyObject>();

/** Register a public key object in the local store. */
export function registerPublicKey(
  canonicalId: string,
  keyObj: PublicKeyObject
): void {
  keyStore.set(canonicalId, keyObj);
}

/** Look up a public key object by its canonical ID. */
export function lookupPublicKey(
  canonicalId: string
): PublicKeyObject | undefined {
  return keyStore.get(canonicalId);
}

// ── Keypair Generation ──────────────────────────────────────────────────────

/**
 * Generate a Dilithium-3 (ML-DSA-65) keypair.
 *
 * The public key is wrapped as a JSON-LD IdentityObject and content-addressed
 * via singleProofHash. The resulting canonicalId serves as the signer's
 * permanent, verifiable identity.
 */
export async function generateKeypair(): Promise<UnsKeypair> {
  const keys = ml_dsa65.keygen();

  const publicKeyObject: PublicKeyObject = {
    "@type": "uns:IdentityObject",
    "cert:algorithm": "CRYSTALS-Dilithium-3",
    "cert:keyBytes": toBase64url(keys.publicKey),
  };

  const identity = await singleProofHash(publicKeyObject);
  const canonicalId = identity["u:canonicalId"];

  // Register in local store for verification lookups
  registerPublicKey(canonicalId, publicKeyObject);

  return {
    algorithm: "CRYSTALS-Dilithium-3",
    publicKeyBytes: keys.publicKey,
    privateKeyBytes: keys.secretKey,
    canonicalId,
    publicKeyObject,
  };
}

// ── Record Signing ──────────────────────────────────────────────────────────

/**
 * Sign a record with Dilithium-3.
 *
 * Pipeline:
 *   1. Strip any existing cert:signature and u:canonicalId from the record
 *   2. URDNA2015 canonicalize the clean record → N-Quads
 *   3. UTF-8 encode → canonical bytes
 *   4. Dilithium-3 sign the canonical bytes
 *   5. Attach the cert:signature block
 *
 * The signed record is tamper-evident: changing any field invalidates
 * the signature because it changes the canonical N-Quads.
 */
export async function signRecord<T extends object>(
  record: T,
  keypair: UnsKeypair
): Promise<SignedRecord<T>> {
  // Step 1: Strip signature and computed fields for signing
  const cleanRecord = stripSignatureFields(record);

  // Step 2–3: Canonicalize → UTF-8 bytes
  const nquads = await canonicalizeToNQuads(cleanRecord);
  const canonicalBytes = new TextEncoder().encode(nquads);

  // Step 4: Dilithium-3 sign
  const signatureBytes = ml_dsa65.sign(canonicalBytes, keypair.privateKeyBytes);

  // Step 5: Build signature block
  const signatureBlock: SignatureBlock = {
    "@type": "cert:Signature",
    "cert:algorithm": "CRYSTALS-Dilithium-3",
    "cert:signatureBytes": toBase64url(signatureBytes),
    "cert:signerCanonicalId": keypair.canonicalId,
    "cert:signedAt": new Date().toISOString(),
  };

  return {
    ...record,
    "cert:signature": signatureBlock,
  } as SignedRecord<T>;
}

// ── Record Verification ─────────────────────────────────────────────────────

/**
 * Verify a signed record's Dilithium-3 signature.
 *
 * Pipeline:
 *   1. Extract the cert:signature block
 *   2. Look up the signer's public key by canonicalId
 *   3. Strip signature and computed fields
 *   4. URDNA2015 canonicalize → UTF-8 bytes
 *   5. Dilithium-3 verify
 *
 * Returns false on any failure: missing key, tampered record, invalid sig.
 */
export async function verifyRecord<T extends object>(
  signed: SignedRecord<T>
): Promise<boolean> {
  try {
    const sig = signed["cert:signature"];
    if (!sig) return false;

    // Look up signer's public key
    const keyObj = lookupPublicKey(sig["cert:signerCanonicalId"]);
    if (!keyObj) return false;

    const publicKeyBytes = fromBase64url(keyObj["cert:keyBytes"]);

    // Reconstruct the record that was signed (strip signature + computed fields)
    const cleanRecord = stripSignatureFields(signed);

    // Canonicalize → bytes
    const nquads = await canonicalizeToNQuads(cleanRecord);
    const canonicalBytes = new TextEncoder().encode(nquads);

    // Verify Dilithium-3 signature
    const signatureBytes = fromBase64url(sig["cert:signatureBytes"]);
    return ml_dsa65.verify(signatureBytes, canonicalBytes, publicKeyBytes);
  } catch {
    return false;
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Strip cert:signature and u:canonicalId from a record for signing/verification. */
function stripSignatureFields<T extends object>(record: T): object {
  const clean = { ...record } as Record<string, unknown>;
  delete clean["cert:signature"];
  delete clean["u:canonicalId"];
  return clean;
}
