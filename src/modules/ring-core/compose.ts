/**
 * UOR v2.0.0 — Operation Composition
 *
 * Implements the critical composition law: neg ∘ bnot = succ
 * and provides a general unary composition helper.
 *
 * Pure functions. Delegates to UORRing for arithmetic.
 */

import type { ByteTuple } from "@/types/uor";
import type { UORRing } from "./ring";

/** A unary ring operation on ByteTuples. */
type UnaryFn = (b: ByteTuple) => ByteTuple;

/**
 * Compose two unary operations: (f ∘ g)(x) = f(g(x)).
 * Returns a new function applying g first, then f.
 */
export function compose(f: UnaryFn, g: UnaryFn): UnaryFn {
  return (x: ByteTuple) => f(g(x));
}

/**
 * Verify the critical composition law at a specific value:
 *   (neg ∘ bnot)(x) === succ(x)
 */
export function verifyCriticalComposition(ring: UORRing, value: number): boolean {
  const x = ring.toBytes(value);
  const composed = compose(ring.neg.bind(ring), ring.bnot.bind(ring))(x);
  const successor = ring.succ(x);
  return ring.fromBytes(composed) === ring.fromBytes(successor);
}

/**
 * Exhaustively verify critical composition for all elements of a ring.
 * Only feasible at Q0 (256 elements). Sampled at higher quantum.
 */
export function verifyCriticalCompositionAll(ring: UORRing): {
  verified: boolean;
  failures: number[];
} {
  const max = ring.quantum === 0 ? 256 : 64; // sample at higher Q
  const failures: number[] = [];
  for (let x = 0; x < max; x++) {
    if (!verifyCriticalComposition(ring, x)) failures.push(x);
  }
  return { verified: failures.length === 0, failures };
}
