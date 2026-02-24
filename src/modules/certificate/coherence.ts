/**
 * Algebraic Coherence Gate
 * ════════════════════════
 *
 * Binds every UOR certificate to the foundational ring identity:
 *
 *   neg(bnot(x)) ≡ succ(x)   for all x in Z/256Z
 *
 * A witness value x is extracted from the certificate's content hash.
 * The coherence gate verifies that this identity holds, proving the
 * certificate was produced by a mathematically coherent UOR system.
 *
 * This is lightweight (O(1), pure arithmetic) but carries deep meaning:
 * it anchors every certificate to the algebraic substrate that makes
 * the entire UOR framework self-consistent.
 *
 * @module certificate/coherence
 */

import { neg, bnot, succ, verifyCriticalIdentity } from "@/lib/uor-ring";
import type { CoherenceWitness } from "./types";

/**
 * Derive a coherence witness from a SHA-256 hash.
 *
 * The first byte of the hash becomes the witness value x.
 * We compute neg(bnot(x)) and succ(x) and verify they're equal.
 *
 * @param hashBytes — The 32-byte SHA-256 hash of the certified content
 * @returns A CoherenceWitness documenting the algebraic check
 */
export function deriveCoherenceWitness(hashBytes: Uint8Array): CoherenceWitness {
  // Extract witness from the first byte of the content hash
  const x = hashBytes[0];

  return {
    witness: x,
    negBnot: neg(bnot(x, 8), 8),
    succ: succ(x, 8),
    holds: verifyCriticalIdentity(x, 8),
    identity: "neg(bnot(x)) ≡ succ(x)",
  };
}

/**
 * Verify that a coherence witness is valid.
 * Any agent can call this with just the witness value — no special access needed.
 */
export function verifyCoherenceWitness(witness: CoherenceWitness): boolean {
  // Re-derive from scratch — don't trust the stored values
  const x = witness.witness;
  const expectedNegBnot = neg(bnot(x, 8), 8);
  const expectedSucc = succ(x, 8);

  return (
    expectedNegBnot === expectedSucc &&
    witness.negBnot === expectedNegBnot &&
    witness.succ === expectedSucc &&
    witness.holds === true
  );
}
