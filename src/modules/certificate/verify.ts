/**
 * Certificate Verification
 * ════════════════════════
 *
 * Independently verifies that a UOR certificate is authentic,
 * its boundaries are intact, and algebraic coherence holds.
 *
 * THREE VERIFICATION LAYERS:
 *
 *   1. CONTENT — Re-hash canonical payload, compare CID
 *   2. BOUNDARY — Re-enforce boundaries, compare boundary hash
 *   3. COHERENCE — Re-verify neg(bnot(x)) ≡ succ(x) on witness
 *
 * All three must pass for the certificate to be considered authentic.
 */

import { computeCid } from "@/lib/uor-address";
import { singleProofHash } from "@/lib/uor-canonical";
import { enforceBoundary } from "./boundary";
import { verifyCoherenceWitness } from "./coherence";
import type { UorCertificate, CompactBoundary } from "./types";

/**
 * Result of a certificate verification.
 */
export interface VerificationResult {
  authentic: boolean;
  storedCid: string;
  recomputedCid: string;
  elapsedMs: number;
  verifiedAt: string;
  summary: string;
}

/**
 * Result of a FULL re-derivation verification.
 */
export interface FullVerificationResult extends VerificationResult {
  mode: "full-re-derivation";
  recomputedNQuads: string;
  storedNQuads: string;
  payloadMatch: boolean;
  recomputedByteLength: number;
  storedByteLength: number;
  recomputedHashHex: string;
  recomputedDerivationId: string;
  /** Compact boundary from the re-enforced source */
  recomputedBoundary: CompactBoundary;
  /** Compact boundary stored in the certificate */
  storedBoundary: CompactBoundary;
  boundaryMatch: boolean;
  /** Whether algebraic coherence was verified */
  coherenceVerified: boolean;
  /** Whether the source hash matches (if source object was provided) */
  sourceHashMatch: boolean | null;
}

/**
 * Quick verify: re-hash the stored canonical payload + check coherence.
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
    const cidMatch = recomputedCid === storedCid;

    // Check algebraic coherence
    const coherenceOk = certificate["cert:coherence"]
      ? verifyCoherenceWitness(certificate["cert:coherence"])
      : true;

    const authentic = cidMatch && coherenceOk;
    const elapsedMs = Math.round(performance.now() - t0);

    return {
      authentic,
      storedCid,
      recomputedCid,
      elapsedMs,
      verifiedAt: new Date().toISOString(),
      summary: authentic
        ? "Content verified. Coherence confirmed."
        : !cidMatch
          ? "Content fingerprint does not match."
          : "Algebraic coherence check failed.",
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
 * SHA-256 hex of a raw source object (same logic as generation).
 */
async function sourceObjectHash(obj: Record<string, unknown>): Promise<string> {
  const json = JSON.stringify(obj, Object.keys(obj).sort());
  const bytes = new TextEncoder().encode(json);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * FULL RE-DERIVATION with boundary + coherence + source hash verification.
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
    // Layer 1: Re-enforce boundaries
    const boundary = await enforceBoundary(sourceObject);
    if (!boundary.valid) {
      throw new Error(`Boundary enforcement failed: ${boundary.error}`);
    }

    // Layer 2: Canonicalize and hash
    const proof = await singleProofHash(boundary.boundedObject);

    // Layer 3: Algebraic coherence
    const coherenceVerified = certificate["cert:coherence"]
      ? verifyCoherenceWitness(certificate["cert:coherence"])
      : true;

    // Source hash check
    let sourceHashMatch: boolean | null = null;
    if (certificate["cert:sourceHash"]) {
      const srcHash = await sourceObjectHash(sourceObject);
      sourceHashMatch = srcHash === certificate["cert:sourceHash"];
    }

    // Compare
    const storedBytes = new TextEncoder().encode(storedNQuads);
    const payloadMatch = proof.nquads === storedNQuads;
    const cidMatch = proof.cid === storedCid;

    const recomputedCompact: CompactBoundary = {
      boundaryHash: boundary.manifest.boundaryHash,
      keys: boundary.manifest.boundaryKeys,
      declaredType: boundary.manifest.declaredType,
      fieldCount: boundary.manifest.totalFields,
    };

    const boundaryMatch = storedBoundary
      ? recomputedCompact.boundaryHash === storedBoundary.boundaryHash
      : true;

    const authentic = cidMatch && boundaryMatch && coherenceVerified;
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
      recomputedBoundary: recomputedCompact,
      storedBoundary: storedBoundary || recomputedCompact,
      boundaryMatch,
      coherenceVerified,
      sourceHashMatch,
      elapsedMs,
      verifiedAt: new Date().toISOString(),
      summary: authentic
        ? `Authentic. Content, boundary, and algebraic coherence all verified.`
        : !cidMatch
          ? `Content fingerprint mismatch.`
          : !boundaryMatch
            ? `Object boundary has shifted since certification.`
            : `Algebraic coherence failed.`,
    };
  } catch (error) {
    const elapsedMs = Math.round(performance.now() - t0);
    const emptyCompact: CompactBoundary = {
      boundaryHash: "",
      keys: [],
      declaredType: "(error)",
      fieldCount: 0,
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
      recomputedBoundary: emptyCompact,
      storedBoundary: storedBoundary || emptyCompact,
      boundaryMatch: false,
      coherenceVerified: false,
      sourceHashMatch: null,
      elapsedMs,
      verifiedAt: new Date().toISOString(),
      summary: `Verification failed: ${error instanceof Error ? error.message : "unknown error"}`,
    };
  }
}
