/**
 * UOR Multi-Quantum Ring Engine — BigInt arithmetic for Q0, Q1, Q2.
 *
 * Extends the UOR ring substrate from Q0 (8-bit, Z/256Z) to:
 *   Q0 = Z/(2^8)Z   = Z/256Z         (8-bit,  fully materialized)
 *   Q1 = Z/(2^16)Z  = Z/65536Z       (16-bit, fully verifiable)
 *   Q2 = Z/(2^32)Z  = Z/4294967296Z  (32-bit, sampled verification)
 *
 * All arithmetic uses BigInt for correctness at every quantum level.
 * The critical identity neg(bnot(x)) = succ(x) holds independently
 * in every ring — this is verified exhaustively at Q0/Q1 and by
 * sampling at Q2.
 *
 * @see spec/src/namespaces/morphism.rs — quantum level hierarchy
 * @see .well-known/uor.json — quantum_levels field
 *
 * Pure functions. Zero dependencies.
 */

// ── Quantum Level ──────────────────────────────────────────────────────────

export type QuantumLevel = "Q0" | "Q1" | "Q2";

/** Ring configuration for a given quantum level. */
export interface QuantumRingConfig {
  /** Quantum level identifier. */
  quantum: QuantumLevel;
  /** Bit width: Q0=8, Q1=16, Q2=32. */
  bitWidth: number;
  /** Ring modulus: 2^bitWidth. */
  modulus: bigint;
  /** All-ones mask: modulus - 1. */
  mask: bigint;
  /** Ring notation: e.g. 'Z/256Z'. */
  ring: string;
}

/**
 * Ring configurations — verbatim from .well-known/uor.json quantum_levels.
 *
 * Z/(2^n)Z where n = 8 × 2^q:
 *   Q0: n=8,  2^8  = 256
 *   Q1: n=16, 2^16 = 65536
 *   Q2: n=32, 2^32 = 4294967296
 */
export const RINGS: Record<QuantumLevel, QuantumRingConfig> = {
  Q0: { quantum: "Q0", bitWidth: 8,  modulus: 256n,        mask: 255n,        ring: "Z/256Z" },
  Q1: { quantum: "Q1", bitWidth: 16, modulus: 65536n,      mask: 65535n,      ring: "Z/65536Z" },
  Q2: { quantum: "Q2", bitWidth: 32, modulus: 4294967296n, mask: 4294967295n, ring: "Z/4294967296Z" },
};

// ── Ring Operations (BigInt, parameterized by quantum level) ────────────────

/**
 * Additive inverse: neg(x) = (-x) mod modulus(q).
 *
 * @see spec/src/namespaces/op.rs — op:Neg
 */
export function negQ(x: bigint, q: QuantumLevel): bigint {
  const { modulus } = RINGS[q];
  return (modulus - (x % modulus)) % modulus;
}

/**
 * Bitwise complement: bnot(x) = x XOR mask(q).
 * The mask is (2^bitWidth - 1), i.e. all bits set.
 *
 * @see spec/src/namespaces/op.rs — op:Bnot
 */
export function bnotQ(x: bigint, q: QuantumLevel): bigint {
  const { mask } = RINGS[q];
  return x ^ mask;
}

/**
 * Successor: succ(x) = (x + 1) mod modulus(q).
 *
 * @see spec/src/namespaces/op.rs — op:Succ (derived)
 */
export function succQ(x: bigint, q: QuantumLevel): bigint {
  const { modulus } = RINGS[q];
  return (x + 1n) % modulus;
}

/**
 * Predecessor: pred(x) = (x - 1) mod modulus(q).
 *
 * @see spec/src/namespaces/op.rs — op:Pred (derived)
 */
export function predQ(x: bigint, q: QuantumLevel): bigint {
  const { modulus } = RINGS[q];
  return (x - 1n + modulus) % modulus;
}

// ── Critical Identity Verification ─────────────────────────────────────────

/**
 * Verify the critical identity: neg(bnot(x)) ≡ succ(x) at quantum level q.
 *
 * - Q0: exhaustive (all 256 elements)
 * - Q1: exhaustive (all 65536 elements) or sampled
 * - Q2: sampled (sampleSize random + boundary elements)
 *
 * The critical identity is the mathematical anchor for the entire UNS stack.
 * If it fails at any quantum level, that ring is unsound.
 *
 * @param q          Quantum level to verify
 * @param sampleSize Number of elements to test (default: all for Q0/Q1, 1000 for Q2)
 * @returns          Verification result with pass/fail counts
 *
 * @see spec/src/namespaces/proof.rs — proof:CriticalIdentityProof
 */
export function verifyCriticalIdentityQ(
  q: QuantumLevel,
  sampleSize?: number
): {
  passed: number;
  failed: number;
  holds: boolean;
  sampleSize: number;
} {
  const { modulus } = RINGS[q];
  const ringSize = Number(modulus);

  // Determine test set
  const effectiveSampleSize =
    sampleSize ?? (q === "Q2" ? 1000 : ringSize);

  let passed = 0;
  let failed = 0;

  if (effectiveSampleSize >= ringSize) {
    // Exhaustive: test every element
    for (let i = 0; i < ringSize; i++) {
      const x = BigInt(i);
      if (negQ(bnotQ(x, q), q) === succQ(x, q)) {
        passed++;
      } else {
        failed++;
      }
    }
  } else {
    // Sampled: boundaries + random
    const testValues = new Set<bigint>();

    // Always test boundaries
    testValues.add(0n);
    testValues.add(1n);
    testValues.add(modulus - 1n);
    testValues.add(modulus - 2n);
    testValues.add(modulus / 2n);

    // Fill remaining with random samples
    while (testValues.size < effectiveSampleSize) {
      const r = BigInt(Math.floor(Math.random() * ringSize));
      testValues.add(r);
    }

    for (const x of testValues) {
      if (negQ(bnotQ(x, q), q) === succQ(x, q)) {
        passed++;
      } else {
        failed++;
      }
    }
  }

  return {
    passed,
    failed,
    holds: failed === 0,
    sampleSize: passed + failed,
  };
}
