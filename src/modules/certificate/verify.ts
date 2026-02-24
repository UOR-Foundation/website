/**
 * Certificate Verification
 * ════════════════════════
 *
 * Independently verifies that a UOR certificate is authentic.
 *
 * THE VERIFICATION CONTRACT:
 *
 *   1. Take the canonical payload stored in the certificate
 *   2. Re-hash it: UTF-8 encode → SHA-256 → CIDv1
 *   3. Compare the recomputed CID against the stored CID
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
 * Verify a UOR certificate by re-deriving the CID from its payload.
 *
 * @param certificate — The certificate to verify
 * @returns Verification result with match status and timing
 *
 * @example
 * ```ts
 * const result = await verifyCertificate(cert);
 * if (result.authentic) {
 *   console.log("Content is untampered");
 * } else {
 *   console.warn("Content may have been modified");
 * }
 * ```
 */
export async function verifyCertificate(
  certificate: UorCertificate
): Promise<VerificationResult> {
  const t0 = performance.now();
  const storedCid = certificate["cert:cid"];

  try {
    // Step 1: Encode the canonical payload to bytes
    const payloadBytes = new TextEncoder().encode(
      certificate["cert:canonicalPayload"]
    );

    // Step 2: Recompute the CID from the raw bytes
    const recomputedCid = await computeCid(payloadBytes);

    // Step 3: Compare
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
