/**
 * UOR Correlation — algebraic similarity WITHOUT embedding models.
 *
 * Fidelity is computed via XOR-stratum Hamming distance:
 *   fidelity = 1.0 - (hammingDistance / maxBits)
 *
 * Ranges from 0.0 (maximally different) to 1.0 (identical).
 *
 * Delegates to ring-core for XOR and triad for stratum.
 * Zero external dependencies.
 */

import type { UORRing } from "@/modules/ring-core/ring";
import { computeTriad } from "@/modules/triad";

// ── Types ───────────────────────────────────────────────────────────────────

export interface CorrelationResult {
  valueA: number;
  valueB: number;
  fidelity: number;
  differenceStratum: number[];
  totalDifference: number;
  maxBits: number;
}

// ── correlate ───────────────────────────────────────────────────────────────

/**
 * Compute algebraic correlation between two values in a ring.
 *
 * Uses XOR to find the difference, then measures stratum (popcount)
 * of the difference as Hamming distance.
 *
 * fidelity = 1.0 - (totalDifference / maxBits)
 */
export function correlate(
  ring: UORRing,
  a: number,
  b: number
): CorrelationResult {
  const bytesA = ring.toBytes(a);
  const bytesB = ring.toBytes(b);

  // XOR gives the bitwise difference
  const diff = ring.xor(bytesA, bytesB);

  // Stratum of the difference = Hamming distance per byte
  const triad = computeTriad(diff);

  const fidelity = ring.bits > 0
    ? 1.0 - (triad.totalStratum / ring.bits)
    : 1.0;

  return {
    valueA: a,
    valueB: b,
    fidelity: Math.round(fidelity * 10000) / 10000,
    differenceStratum: triad.stratum,
    totalDifference: triad.totalStratum,
    maxBits: ring.bits,
  };
}
