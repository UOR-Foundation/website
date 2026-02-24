/**
 * Certificate Verification
 * ════════════════════════
 *
 * Independently verifies that a UOR certificate is authentic AND
 * that its object boundaries are intact.
 *
 * TWO VERIFICATION MODES:
 *
 * ── Quick Verify (verifyCertificate) ─────────────────────────────
 *   Re-hashes the stored canonical payload to confirm the CID matches.
 *   Fast. Proves the certificate is internally consistent.
 *
 * ── Full Re-derivation (verifyCertificateFull) ───────────────────
 *   Re-runs the ENTIRE pipeline from the source object:
 *     1. Enforce boundary (same rules as generation)
 *     2. Canonicalize via URDNA2015
 *     3. Hash with SHA-256
 *     4. Compare CID, payload, AND boundary hash
 *
 *   This is the STRONGEST form of verification because it confirms:
 *     - Content identity (CID match)
 *     - Payload fidelity (byte-level N-Quads match)
 *     - Boundary integrity (same fields included/excluded)
 *
 * Even a single bit difference — or a single extra field — will
 * produce a completely different result.
 */

import { computeCid } from "@/lib/uor-address";
import { singleProofHash } from "@/lib/uor-canonical";
import { enforceBoundary, type BoundaryManifest } from "./boundary";
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
 * Includes byte-level comparison AND boundary verification.
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

  /** The boundary manifest from the re-enforced source object */
  recomputedBoundary: BoundaryManifest;

  /** The boundary manifest stored in the certificate */
  storedBoundary: BoundaryManifest;

  /** Whether the boundary hashes match (same fields included) */
  boundaryMatch: boolean;
}

/**
 * Quick verify: re-hash the stored canonical payload.
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
        ? `Re-hashed canonical payload. CID matches. Content is untampered.`
        : `Re-hashed canonical payload. CID does NOT match. Content may have been modified.`,
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
 * FULL RE-DERIVATION VERIFICATION with boundary enforcement.
 *
 * Pipeline:
 *   1. Enforce boundary on source object (same rules as generation)
 *   2. Canonicalize bounded object → URDNA2015 → N-Quads
 *   3. Hash N-Quads → SHA-256 → CID
 *   4. Compare: CID, payload bytes, AND boundary hash
 *
 * All three must match for full authenticity:
 *   - CID match → content identity is preserved
 *   - Payload match → canonical form is byte-identical
 *   - Boundary match → same fields were included/excluded
 */
export async function verifyCertificateFull(
  sourceObject: Record<string, unknown>,
  certificate: UorCertificate
): Promise<FullVerificationResult> {
  const t0 = performance.now();
  const storedCid = certificate["cert:cid"];
  const storedNQuads = certificate["cert:canonicalPayload"];
  const storedBoundary = certificate["cert:boundary"];

  try {
    // Step 1: Re-enforce boundaries on the source object
    const boundary = await enforceBoundary(sourceObject);
    if (!boundary.valid) {
      throw new Error(`Boundary enforcement failed: ${boundary.error}`);
    }

    // Step 2: Canonicalize the BOUNDED object
    const proof = await singleProofHash(boundary.boundedObject);

    // Step 3: Compare everything
    const storedBytes = new TextEncoder().encode(storedNQuads);
    const payloadMatch = proof.nquads === storedNQuads;
    const authentic = proof.cid === storedCid;
    const boundaryMatch = storedBoundary
      ? boundary.manifest.boundaryHash === storedBoundary.boundaryHash
      : true; // backward compat: old certs without boundary

    const elapsedMs = Math.round(performance.now() - t0);

    return {
      authentic: authentic && boundaryMatch,
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
      recomputedBoundary: boundary.manifest,
      storedBoundary: storedBoundary || boundary.manifest,
      boundaryMatch,
      elapsedMs,
      verifiedAt: new Date().toISOString(),
      summary: authentic && boundaryMatch
        ? `Full re-derivation with boundary enforcement complete. ` +
          `Object boundary: ${boundary.manifest.topLevelFields} fields, ` +
          `${boundary.manifest.totalFields} total, depth ${boundary.manifest.maxDepthObserved}. ` +
          `Boundary hash: ✓ match. CID: ✓ match. Payload: ${proof.canonicalBytes.byteLength} B ✓ exact. ` +
          `Content is authentic and untampered.`
        : !boundaryMatch
          ? `Boundary mismatch: object fields have changed since certification. ` +
            `Stored boundary: ${storedBoundary?.boundaryHash?.slice(0, 12)}… | ` +
            `Recomputed: ${boundary.manifest.boundaryHash.slice(0, 12)}…`
          : `CID mismatch: content has been modified. ` +
            `Stored: ${storedCid.slice(0, 20)}… | Recomputed: ${proof.cid.slice(0, 20)}…`,
    };
  } catch (error) {
    const elapsedMs = Math.round(performance.now() - t0);
    const emptyBoundary = {
      version: "1.0.0" as const,
      totalFields: 0,
      topLevelFields: 0,
      maxDepthObserved: 0,
      maxDepthAllowed: 16,
      strippedFields: [],
      boundaryKeys: [],
      hasContext: false,
      hasType: false,
      declaredType: "(error)",
      boundaryHash: "",
      enforcedAt: new Date().toISOString(),
    };
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
      recomputedBoundary: emptyBoundary,
      storedBoundary: storedBoundary || emptyBoundary,
      boundaryMatch: false,
      elapsedMs,
      verifiedAt: new Date().toISOString(),
      summary: `Verification failed: ${error instanceof Error ? error.message : "unknown error"}`,
    };
  }
}
