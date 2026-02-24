/**
 * Certificate Verification
 * ════════════════════════
 *
 * Three verification layers — all must pass:
 *
 *   1. CONTENT   — Re-hash canonical payload → compare CID
 *   2. BOUNDARY  — Re-enforce boundaries → compare boundary hash
 *   3. COHERENCE — Re-verify neg(bnot(x)) ≡ succ(x) on witness
 *
 * Even a single bit difference will produce a different result.
 */

import { computeCid } from "@/lib/uor-address";
import { singleProofHash } from "@/lib/uor-canonical";
import { enforceBoundary } from "./boundary";
import { verifyCoherenceWitness } from "./coherence";
import { sourceObjectHash, toCompactBoundary } from "./utils";
import type { UorCertificate, CompactBoundary } from "./types";

export interface VerificationResult {
  authentic: boolean;
  storedCid: string;
  recomputedCid: string;
  elapsedMs: number;
  verifiedAt: string;
  summary: string;
}

export interface FullVerificationResult extends VerificationResult {
  mode: "full-re-derivation";
  recomputedNQuads: string;
  storedNQuads: string;
  payloadMatch: boolean;
  recomputedByteLength: number;
  storedByteLength: number;
  recomputedHashHex: string;
  recomputedDerivationId: string;
  recomputedBoundary: CompactBoundary;
  storedBoundary: CompactBoundary;
  boundaryMatch: boolean;
  coherenceVerified: boolean;
  sourceHashMatch: boolean | null;
}

/**
 * Quick verify: re-hash stored canonical payload + coherence check.
 */
export async function verifyCertificate(
  certificate: UorCertificate
): Promise<VerificationResult> {
  const t0 = performance.now();
  const storedCid = certificate["cert:cid"];

  try {
    const payloadBytes = new TextEncoder().encode(certificate["cert:canonicalPayload"]);
    const recomputedCid = await computeCid(payloadBytes);
    const cidMatch = recomputedCid === storedCid;
    const coherenceOk = verifyCoherenceWitness(certificate["cert:coherence"]);
    const authentic = cidMatch && coherenceOk;

    return {
      authentic,
      storedCid,
      recomputedCid,
      elapsedMs: Math.round(performance.now() - t0),
      verifiedAt: new Date().toISOString(),
      summary: authentic
        ? "Content verified. Coherence confirmed."
        : !cidMatch
          ? "Content fingerprint does not match."
          : "Algebraic coherence check failed.",
    };
  } catch (error) {
    return {
      authentic: false,
      storedCid,
      recomputedCid: "error",
      elapsedMs: Math.round(performance.now() - t0),
      verifiedAt: new Date().toISOString(),
      summary: `Verification failed: ${error instanceof Error ? error.message : "unknown error"}`,
    };
  }
}

/**
 * Full re-derivation: boundary + content + coherence + source hash.
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
    // Layer 1: Boundary
    const boundary = await enforceBoundary(sourceObject);
    if (!boundary.valid) throw new Error(`Boundary failed: ${boundary.error}`);

    // Layer 2: Content
    const proof = await singleProofHash(boundary.boundedObject);

    // Layer 3: Coherence
    const coherenceVerified = verifyCoherenceWitness(certificate["cert:coherence"]);

    // Source hash
    const srcHash = await sourceObjectHash(sourceObject);
    const sourceHashMatch = certificate["cert:sourceHash"]
      ? srcHash === certificate["cert:sourceHash"]
      : null;

    const recomputedCompact = toCompactBoundary(boundary.manifest);
    const payloadMatch = proof.nquads === storedNQuads;
    const cidMatch = proof.cid === storedCid;
    const boundaryMatch = recomputedCompact.boundaryHash === storedBoundary.boundaryHash;
    const authentic = cidMatch && boundaryMatch && coherenceVerified;

    return {
      authentic,
      mode: "full-re-derivation",
      storedCid,
      recomputedCid: proof.cid,
      recomputedNQuads: proof.nquads,
      storedNQuads,
      payloadMatch,
      recomputedByteLength: proof.canonicalBytes.byteLength,
      storedByteLength: new TextEncoder().encode(storedNQuads).byteLength,
      recomputedHashHex: proof.hashHex,
      recomputedDerivationId: proof.derivationId,
      recomputedBoundary: recomputedCompact,
      storedBoundary,
      boundaryMatch,
      coherenceVerified,
      sourceHashMatch,
      elapsedMs: Math.round(performance.now() - t0),
      verifiedAt: new Date().toISOString(),
      summary: authentic
        ? "Authentic. Content, boundary, and algebraic coherence all verified."
        : !cidMatch
          ? "Content fingerprint mismatch."
          : !boundaryMatch
            ? "Object boundary has shifted since certification."
            : "Algebraic coherence failed.",
    };
  } catch (error) {
    const emptyCompact: CompactBoundary = {
      boundaryHash: "", keys: [], declaredType: "(error)", fieldCount: 0,
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
      elapsedMs: Math.round(performance.now() - t0),
      verifiedAt: new Date().toISOString(),
      summary: `Verification failed: ${error instanceof Error ? error.message : "unknown error"}`,
    };
  }
}
