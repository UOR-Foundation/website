/**
 * Identity Types — Canonical identity shapes
 * ════════════════════════════════════════════
 *
 * Defines the canonical identity type used across the kernel.
 * These types mirror the UNS identity module shapes so the kernel
 * can reference them without importing from outside the tree.
 *
 * The bridge.ts adapter maps real UNS implementations to these.
 *
 * @module hologram/platform/identity-types
 */

/** The canonical identity proof returned by singleProofHash. */
export interface CanonicalIdentity {
  "u:canonicalId": string;
  "u:ipv6": string;
  "u:cid": string;
  "u:glyph": string;
  "u:lossWarning"?: boolean;
}

/** A post-quantum keypair (e.g., CRYSTALS-Dilithium-3). */
export interface Keypair {
  algorithm: string;
  publicKeyBytes: Uint8Array;
  privateKeyBytes: Uint8Array;
  canonicalId: string;
  publicKeyObject: Record<string, unknown>;
}

/** A record augmented with a post-quantum signature. */
export interface SignedRecord<T extends object = object> {
  "cert:signature": {
    "@type": "cert:Signature";
    "cert:algorithm": string;
    "cert:signatureBytes": string;
    "cert:signerCanonicalId": string;
    "cert:signedAt": string;
  };
}
