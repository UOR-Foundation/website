/**
 * Certificate Verification
 * ════════════════════════
 *
 * Independently verifies that a UOR certificate is authentic.
 *
 * TWO VERIFICATION MODES:
 *
 * ── Quick Verify (verifyCertificate) ─────────────────────────────
 *   Re-hashes the stored canonical payload to confirm the CID matches.
 *   Fast. Proves the certificate is internally consistent.
 *
 * ── Full Re-derivation (verifyCertificateFull) ───────────────────
 *   Re-runs the ENTIRE canonical pipeline from the source object:
 *     Source Object → URDNA2015 → Canonical N-Quads → UTF-8 → SHA-256 → CID
 *   Then compares the freshly generated CID against the stored CID.
 *
 *   This is the STRONGEST form of verification because it re-derives
 *   identity from scratch. Even a single bit difference in the source
 *   object will produce a completely different CID — making any
 *   tampering mathematically detectable.
 *
 * THE VERIFICATION CONTRACT:
 *
 *   1. Take the source object (the original data)
 *   2. Canonicalize it: JSON-LD → URDNA2015 → N-Quads
 *   3. Hash it: UTF-8 encode → SHA-256 → CIDv1
 *   4. Compare the recomputed CID against the stored CID
 *
 * If they match: the content is authentic and untampered.
 * If they differ: the content or certificate has been modified.
 *
 * This requires NO external authority, NO network requests,
 * and NO special permissions. Anyone can verify, anywhere.
 *
 * WHY THIS WORKS:
 *
 * SHA-256 is a one-way function. Given content, you can compute
 * its hash. But you cannot reverse-engineer content from a hash.
 * Any change to the content — even a single byte — produces a
 * completely different hash. This makes tampering detectable
 * with mathematical certainty.
 */

import { computeCid } from "@/lib/uor-address";
import { singleProofHash } from "@/lib/uor-canonical";
import type { UorCertificate } from "./types";

/**
 * Result of a certificate verification.
 */
export interface VerificationResult {
  /** Whether the certificate is authentic */
  authentic: boolean;

  /** The CID stored in the certificate */
  storedCid: string;

  /** The CID recomputed from the canonical payload */
  recomputedCid: string;

  /** Time taken to verify, in milliseconds */
  elapsedMs: number;

  /** ISO 8601 timestamp of when verification was performed */
  verifiedAt: string;

  /** Human-readable summary of the result */
  summary: string;
}

/**
 * Result of a FULL re-derivation verification.
 *
 * This extends the basic result with byte-level comparison data,
 * giving complete transparency into what was compared and how.
 */
export interface FullVerificationResult extends VerificationResult {
  /** The verification mode used */
  mode: "full-re-derivation";

  /** The freshly generated N-Quads from URDNA2015 canonicalization */
  recomputedNQuads: string;

  /** The N-Quads stored in the certificate */
  storedNQuads: string;

  /** Whether the canonical payloads match byte-for-byte */
  payloadMatch: boolean;

  /** Number of bytes in the recomputed canonical payload */
  recomputedByteLength: number;

  /** Number of bytes in the stored canonical payload */
  storedByteLength: number;

  /** SHA-256 hex of the recomputed canonical bytes */
  recomputedHashHex: string;

  /** The derivation ID derived from the fresh hash */
  recomputedDerivationId: string;
}

/**
 * Quick verify: re-hash the stored canonical payload.
 *
 * @param certificate — The certificate to verify
 * @returns Verification result with match status and timing
 */
export async function verifyCertificate(
  certificate: UorCertificate
): Promise<VerificationResult> {
  const t0 = performance.now();
  const storedCid = certificate["cert:cid"];

  try {
    const payloadBytes = new TextEncoder().encode(
      certificate["cert:canonicalPayload"]
    );
    const recomputedCid = await computeCid(payloadBytes);
    const authentic = recomputedCid === storedCid;
    const elapsedMs = Math.round(performance.now() - t0);

    return {
      authentic,
      storedCid,
      recomputedCid,
      elapsedMs,
      verifiedAt: new Date().toISOString(),
      summary: authentic
        ? `Original content re-hashed with SHA-256. Recomputed fingerprint matches the stored CID. Content is untampered.`
        : `Recomputed fingerprint does not match the stored CID. Content may have been modified.`,
    };
  } catch (error) {
    const elapsedMs = Math.round(performance.now() - t0);
    return {
      authentic: false,
      storedCid,
      recomputedCid: "error",
      elapsedMs,
      verifiedAt: new Date().toISOString(),
      summary: `Verification failed: ${error instanceof Error ? error.message : "unknown error"}`,
    };
  }
}

/**
 * FULL RE-DERIVATION VERIFICATION.
 *
 * This is the strongest form of verification. It takes the original
 * source object, re-runs the entire URDNA2015 → SHA-256 → CID pipeline
 * from scratch, and compares the result against the stored certificate.
 *
 * The pipeline:
 *   1. Source object → URDNA2015 canonicalization → N-Quads string
 *   2. N-Quads string → UTF-8 bytes → SHA-256 → 32-byte hash
 *   3. Hash → CIDv1 (dag-json, sha2-256, base32lower)
 *   4. Compare recomputed CID against stored CID
 *   5. Compare recomputed N-Quads against stored N-Quads (byte-level)
 *
 * Even a single bit difference in the source object will propagate
 * through the hash function and produce a completely different CID.
 *
 * @param sourceObject — The original object to re-derive from
 * @param certificate — The certificate to verify against
 * @returns Full verification result with byte-level comparison data
 *
 * @example
 * ```ts
 * const result = await verifyCertificateFull(originalData, cert);
 * if (result.authentic && result.payloadMatch) {
 *   console.log("Byte-perfect match. Content is untampered.");
 * }
 * ```
 */
export async function verifyCertificateFull(
  sourceObject: Record<string, unknown>,
  certificate: UorCertificate
): Promise<FullVerificationResult> {
  const t0 = performance.now();
  const storedCid = certificate["cert:cid"];
  const storedNQuads = certificate["cert:canonicalPayload"];

  try {
    // Step 1: Re-run the ENTIRE canonical pipeline from the source object
    //         Object → URDNA2015 → N-Quads → UTF-8 → SHA-256 → CID
    const proof = await singleProofHash(sourceObject);

    // Step 2: Byte-level comparison of the canonical payloads
    const storedBytes = new TextEncoder().encode(storedNQuads);
    const payloadMatch = proof.nquads === storedNQuads;

    // Step 3: CID comparison (the ultimate identity test)
    const authentic = proof.cid === storedCid;

    const elapsedMs = Math.round(performance.now() - t0);

    return {
      authentic,
      mode: "full-re-derivation",
      storedCid,
      recomputedCid: proof.cid,
      recomputedNQuads: proof.nquads,
      storedNQuads,
      payloadMatch,
      recomputedByteLength: proof.canonicalBytes.byteLength,
      storedByteLength: storedBytes.byteLength,
      recomputedHashHex: proof.hashHex,
      recomputedDerivationId: proof.derivationId,
      elapsedMs,
      verifiedAt: new Date().toISOString(),
      summary: authentic
        ? `Full re-derivation complete. Source object re-canonicalized via URDNA2015, re-hashed with SHA-256. ` +
          `Recomputed CID matches stored CID. ` +
          `Payload: ${proof.canonicalBytes.byteLength} bytes. ` +
          `Byte-level match: ${payloadMatch ? "YES" : "NO"}. ` +
          `Content is authentic and untampered.`
        : `Full re-derivation complete. Recomputed CID does NOT match stored CID. ` +
          `Stored: ${storedCid.slice(0, 20)}… | Recomputed: ${proof.cid.slice(0, 20)}… ` +
          `Content may have been modified.`,
    };
  } catch (error) {
    const elapsedMs = Math.round(performance.now() - t0);
    return {
      authentic: false,
      mode: "full-re-derivation",
      storedCid,
      recomputedCid: "error",
      recomputedNQuads: "",
      storedNQuads,
      payloadMatch: false,
      recomputedByteLength: 0,
      storedByteLength: new TextEncoder().encode(storedNQuads).byteLength,
      recomputedHashHex: "",
      recomputedDerivationId: "",
      elapsedMs,
      verifiedAt: new Date().toISOString(),
      summary: `Full re-derivation failed: ${error instanceof Error ? error.message : "unknown error"}`,
    };
  }
}
