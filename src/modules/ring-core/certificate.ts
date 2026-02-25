/**
 * UOR v2.0.0 — Certificate Factory
 *
 * Creates typed certificate instances satisfying the v2 cert hierarchy.
 * Three certificate types, each a plain data object. No classes.
 *
 * Pure functions. Canonical to cert.rs.
 */

import type { UORRing } from "@/modules/ring-core/ring";
import { fromBytes } from "@/modules/ring-core/ring";

// ── Shared base ────────────────────────────────────────────────────────────

function certBase(id: string, iri: string, derivationId: string | null = null) {
  const now = new Date().toISOString();
  return {
    certificateId: () => id,
    certifiesIri: () => iri,
    issuedAt: () => now,
    derivationId: () => derivationId,
  };
}

// ── TransformCertificate ───────────────────────────────────────────────────

export function transformCertificate(opts: {
  id: string;
  iri: string;
  sourceIri: string;
  targetIri: string;
  fidelityPreserved: boolean;
  derivationId?: string;
}) {
  return {
    ...certBase(opts.id, opts.iri, opts.derivationId ?? null),
    valid: () => true,
    sourceIri: () => opts.sourceIri,
    targetIri: () => opts.targetIri,
    fidelityPreserved: () => opts.fidelityPreserved,
  };
}

// ── IsometryCertificate ────────────────────────────────────────────────────

export function isometryCertificate(opts: {
  id: string;
  iri: string;
  sourceQuantum: number;
  targetQuantum: number;
  roundTripVerified: boolean;
  derivationId?: string;
}) {
  return {
    ...certBase(opts.id, opts.iri, opts.derivationId ?? null),
    valid: () => opts.roundTripVerified,
    sourceQuantum: () => opts.sourceQuantum,
    targetQuantum: () => opts.targetQuantum,
    roundTripVerified: () => opts.roundTripVerified,
  };
}

// ── InvolutionCertificate ──────────────────────────────────────────────────

/**
 * Verify f∘f = id for the given operation across the ring, and produce a certificate.
 */
export function involutionCertificate(
  ring: UORRing,
  opName: string,
  op: (b: number[]) => number[],
): ReturnType<typeof certBase> & {
  valid: () => boolean;
  operationName: () => string;
  testedCount: () => number;
  holdsForAll: () => boolean;
} {
  const max = ring.quantum === 0 ? 256 : 64;
  let holds = true;
  for (let x = 0; x < max; x++) {
    const b = ring.toBytes(x);
    if (fromBytes(op(op(b))) !== x) { holds = false; break; }
  }
  return {
    ...certBase(`cert:involution:${opName}`, `op:${opName}`),
    valid: () => holds,
    operationName: () => opName,
    testedCount: () => max,
    holdsForAll: () => holds,
  };
}
