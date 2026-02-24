/**
 * UOR Post-Quantum Bridge — Sign & Verify
 * ═════════════════════════════════════════
 *
 * The Lattice-Hash Duality: UOR's ring Z/256Z is a 1-dimensional lattice.
 * Dilithium-3 (ML-DSA-65, NIST FIPS 204) operates on Module-LWE lattices —
 * the same mathematical family. This module bridges them.
 *
 * Pipeline:
 *   Object → URDNA2015 → SHA-256 → pq-bridge projection → Dilithium-3 sign
 *   → pq-envelope (Bitcoin OP_RETURN) → pq-witness (ring coherence proof)
 *
 * @module uns/core/pq-bridge
 */

import { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";
import { project } from "@/modules/uns/core/hologram";
import type { ProjectionInput } from "@/modules/uns/core/hologram";

// ── Types ────────────────────────────────────────────────────────────────────

/** A Dilithium-3 keypair for PQ signing. */
export interface PqKeyPair {
  readonly publicKey: Uint8Array;
  readonly secretKey: Uint8Array;
}

/** The complete PQ envelope — everything needed to verify and anchor. */
export interface PqEnvelope {
  /** The original content hash (hex). */
  readonly contentHash: string;
  /** The pq-bridge projection string (Dilithium-3 signing target). */
  readonly signingTarget: string;
  /** Dilithium-3 signature over the signing target. */
  readonly signature: Uint8Array;
  /** Signer's public key. */
  readonly publicKey: Uint8Array;
  /** Bitcoin OP_RETURN script (hex) — ready for broadcast. */
  readonly bitcoinScript: string;
  /** Lightning BOLT-11 payment_hash field. */
  readonly lightningPaymentHash: string;
  /** Ring coherence witness string. */
  readonly coherenceWitness: string;
  /** Whether the coherence identity holds (always true for valid UOR). */
  readonly coherenceHolds: boolean;
  /** CIDv1 of the content (for off-chain signature retrieval). */
  readonly cid: string;
}

/** Verification result. */
export interface PqVerifyResult {
  /** Whether the Dilithium-3 signature is valid. */
  readonly signatureValid: boolean;
  /** Whether the ring coherence witness holds. */
  readonly coherenceValid: boolean;
  /** Whether the Bitcoin script matches the content hash. */
  readonly anchorValid: boolean;
  /** Combined: all three checks pass. */
  readonly valid: boolean;
}

// ── Key Generation ──────────────────────────────────────────────────────────

/**
 * Generate a new Dilithium-3 (ML-DSA-65) keypair.
 *
 * Security level: 192-bit (NIST Level 3).
 * Public key: 1,952 bytes. Secret key: 4,032 bytes. Signature: 3,309 bytes.
 */
export function pqKeygen(seed?: Uint8Array): PqKeyPair {
  return ml_dsa65.keygen(seed);
}

// ── Signing ─────────────────────────────────────────────────────────────────

/**
 * Sign a UOR identity with Dilithium-3, producing a complete PQ envelope.
 *
 * The signing target is the `pq-bridge` projection string:
 *   `pq:ml-dsa-65:sha256:{hex}`
 *
 * This string is encoded to UTF-8 bytes and signed with ML-DSA-65.
 * The result includes the Bitcoin OP_RETURN script, Lightning payment hash,
 * and ring coherence witness — everything needed for on-chain anchoring.
 *
 * @param identity  ProjectionInput (hashBytes + cid + hex)
 * @param secretKey Dilithium-3 secret key (4,032 bytes)
 */
export function pqSign(identity: ProjectionInput, secretKey: Uint8Array): PqEnvelope {
  // 1. Generate the signing target via hologram projection
  const signingTarget = project(identity, "pq-bridge").value;

  // 2. Sign with Dilithium-3 (ML-DSA-65)
  const encoder = new TextEncoder();
  const message = encoder.encode(signingTarget);
  const signature = ml_dsa65.sign(message, secretKey);

  // 3. Generate all settlement projections
  const bitcoinScript = project(identity, "pq-envelope").value;
  const lightningPaymentHash = project(identity, "lightning").value;
  const coherenceWitness = project(identity, "pq-witness").value;

  // 4. Verify coherence witness holds (it always does — this is the critical identity)
  const x = identity.hashBytes[0];
  const negBnot = (256 - ((~x) & 0xFF)) & 0xFF;
  const succX = (x + 1) & 0xFF;
  const coherenceHolds = negBnot === succX;

  return {
    contentHash: identity.hex,
    signingTarget,
    signature,
    publicKey: ml_dsa65.getPublicKey(secretKey),
    bitcoinScript,
    lightningPaymentHash,
    coherenceWitness,
    coherenceHolds,
    cid: identity.cid,
  };
}

// ── Verification ────────────────────────────────────────────────────────────

/**
 * Verify a PQ envelope: signature + coherence witness + anchor integrity.
 *
 * Three independent checks:
 *   1. Dilithium-3 signature verification (lattice hardness)
 *   2. Ring coherence witness (algebraic framework proof)
 *   3. Bitcoin script integrity (anchor matches content hash)
 *
 * All three must pass for the envelope to be valid.
 *
 * @param envelope  The PQ envelope to verify
 * @param publicKey The signer's Dilithium-3 public key (1,952 bytes)
 */
export function pqVerify(envelope: PqEnvelope, publicKey: Uint8Array): PqVerifyResult {
  // 1. Verify Dilithium-3 signature
  const encoder = new TextEncoder();
  const message = encoder.encode(envelope.signingTarget);
  const signatureValid = ml_dsa65.verify(envelope.signature, message, publicKey);

  // 2. Verify ring coherence witness
  //    Parse witness: pq:witness:{hex}:{x}:{negbnot}:{succ}
  const witnessParts = envelope.coherenceWitness.split(":");
  const x = parseInt(witnessParts[3], 10);
  const negBnot = parseInt(witnessParts[4], 10);
  const succX = parseInt(witnessParts[5], 10);
  const coherenceValid = negBnot === succX &&
    negBnot === ((256 - ((~x) & 0xFF)) & 0xFF) &&
    succX === ((x + 1) & 0xFF);

  // 3. Verify Bitcoin script integrity
  //    Script format: 6a26554f520102{hash}
  //    The hash in the script must match the content hash
  const scriptHash = envelope.bitcoinScript.slice(14); // after "6a26554f520102"
  const anchorValid = scriptHash === envelope.contentHash;

  return {
    signatureValid,
    coherenceValid,
    anchorValid,
    valid: signatureValid && coherenceValid && anchorValid,
  };
}

// ── Convenience: Full Pipeline ──────────────────────────────────────────────

/**
 * Complete PQ Bridge pipeline: identity → sign → verify → envelope.
 *
 * Generates a fresh keypair, signs the identity, and returns
 * the envelope + keypair + verification result. Useful for testing
 * and demo flows.
 */
export function pqBridgePipeline(identity: ProjectionInput): {
  envelope: PqEnvelope;
  keyPair: PqKeyPair;
  verification: PqVerifyResult;
} {
  const keyPair = pqKeygen();
  const envelope = pqSign(identity, keyPair.secretKey);
  const verification = pqVerify(envelope, keyPair.publicKey);
  return { envelope, keyPair, verification };
}
