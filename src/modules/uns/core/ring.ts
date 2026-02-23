/**
 * UNS Core — Ring R_8 = Z/256Z
 *
 * The minimal algebraic substrate for the UOR identity engine.
 * Two primitive involutions (neg, bnot) and the critical identity:
 *
 *   neg(bnot(x)) === succ(x)   ∀ x ∈ {0..255}
 *
 * This identity is the mathematical anchor for the entire UNS stack.
 * Every service built on top of UNS derives correctness from this ring.
 *
 * Pure functions. Zero dependencies.
 */

/** Additive inverse in Z/256Z: neg(x) = 256 − x mod 256. */
export const neg = (x: number): number => ((-x) % 256 + 256) % 256;

/** Bitwise complement in 8-bit space: bnot(x) = x XOR 0xFF. */
export const bnot = (x: number): number => x ^ 0xff;

/** Successor: succ(x) = (x + 1) mod 256. */
export const succ = (x: number): number => (x + 1) % 256;

/** Predecessor: pred(x) = (x − 1) mod 256. */
export const pred = (x: number): number => ((x - 1) % 256 + 256) % 256;

/**
 * Verify the critical identity: neg(bnot(x)) === succ(x) for ALL x in 0..255.
 *
 * This is the trust anchor. If this fails, the entire algebraic framework
 * is unsound and no identity derivation can be trusted.
 *
 * @returns true iff the identity holds for all 256 elements of R_8.
 */
export function verifyCriticalIdentity(): boolean {
  return Array.from({ length: 256 }, (_, x) => neg(bnot(x)) === succ(x)).every(
    Boolean
  );
}
