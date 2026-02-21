/**
 * UOR Resolver — maps values to canonical IRIs with partition classification.
 *
 * Resolution strategies:
 *   - dihedral-factorization: uses ring structure
 *   - canonical-form: normalizes via canonicalization engine
 *   - evaluation: direct computation
 *
 * Delegates to:
 *   - lib/uor-ring.ts classifyByte for partition classification
 *   - identity/addressing.ts for IRI computation
 *   - triad for triadic coordinates
 *
 * Zero duplication of classification or addressing logic.
 */

import type { UORRing } from "@/modules/ring-core/ring";
import { fromBytes } from "@/modules/ring-core/ring";
import { contentAddress } from "@/modules/identity";
import { classifyByte } from "@/lib/uor-ring";
import type { PartitionClassification } from "@/types/uor";
import { computeTriad, stratumLevel } from "@/modules/triad";

// ── Resolution result ───────────────────────────────────────────────────────

export interface ResolverResult {
  canonicalIri: string;
  partition: PartitionClassification;
  strategy: "dihedral-factorization" | "canonical-form" | "evaluation";
  trace: string[];
}

// ── resolve ─────────────────────────────────────────────────────────────────

/**
 * Resolve a value to its canonical IRI with partition classification.
 * Uses dihedral-factorization strategy for full audit trace.
 */
export function resolve(ring: UORRing, value: number): ResolverResult {
  const trace: string[] = [];

  // Step 1: Normalize value to ring range
  const max = Number(ring.cycle);
  const normalized = ((value % max) + max) % max;
  trace.push(`normalize(${value}) → ${normalized} mod ${max}`);

  // Step 2: Classify
  const partition = classifyByte(normalized, ring.bits);
  trace.push(`classify(${normalized}) → ${partition.component}`);

  // Step 3: Compute canonical IRI
  const canonicalIri = contentAddress(ring, normalized);
  trace.push(`address(${normalized}) → ${canonicalIri}`);

  // Step 4: Verify critical identity holds for this value
  const bytes = ring.toBytes(normalized);
  const succVal = fromBytes(ring.succ(bytes));
  const expected = (normalized + 1) % max;
  const identityHolds = succVal === expected;
  trace.push(`verify succ(${normalized}) = ${succVal} ${identityHolds ? "✓" : "✗"}`);

  return {
    canonicalIri,
    partition,
    strategy: "dihedral-factorization",
    trace,
  };
}

// ── classifyElement (convenience re-export with ring context) ───────────────

export function classifyElement(
  ring: UORRing,
  value: number
): PartitionClassification {
  return classifyByte(value, ring.bits);
}
