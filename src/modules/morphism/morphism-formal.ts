/**
 * UOR Morphism: Formal Ring Homomorphisms with CommutativityWitness.
 *
 * Three ring homomorphism types from spec/src/namespaces/morphism.rs:
 *   - ProjectionHomomorphism: Q_high → Q_low (lossy: x mod modulus_low)
 *   - InclusionHomomorphism:  Q_low → Q_high (lossless: identity embedding)
 *   - IdentityHomomorphism:   Q_n → Q_n (trivial identity)
 *
 * Every morphism produces a MorphismResult with:
 *   - CommutativityWitness: verifies f(op(x)) = op(f(x))
 *   - epistemic_grade: always "A" (ring arithmetic)
 *   - derivation:derivationId: URDNA2015 content address
 *
 * @see spec/src/namespaces/morphism.rs — morphism type hierarchy
 * @see .well-known/uor.json — quantum_levels, morphism definitions
 */

import { RINGS, negQ, bnotQ, succQ, type QuantumLevel } from "./quantum";
import { singleProofHash } from "@/modules/uns/core/identity";

// ── Types ───────────────────────────────────────────────────────────────────

export type MorphismType =
  | "ProjectionHomomorphism"
  | "InclusionHomomorphism"
  | "IdentityHomomorphism";

/** CommutativityWitness — proves f(op(x)) = op(f(x)) for a morphism f. */
export interface CommutativityWitness {
  /** Result of: apply morphism, then apply operation. */
  leftPath: bigint;
  /** Result of: apply operation, then apply morphism. */
  rightPath: bigint;
  /** True iff leftPath === rightPath — the morphism commutes with the operation. */
  commutes: boolean;
}

/**
 * Full morphism result — the canonical output of any ring homomorphism.
 *
 * @see spec/src/namespaces/morphism.rs — morphism:RingHomomorphism
 */
export interface MorphismResult {
  "@type": "morphism:RingHomomorphism";
  /** Which of the three homomorphism types. */
  morphismType: MorphismType;
  /** Source ring notation: e.g. 'Z/65536Z'. */
  fromRing: string;
  /** Target ring notation: e.g. 'Z/256Z'. */
  toRing: string;
  /** Input value (BigInt). */
  input: bigint;
  /** Output value (BigInt). */
  output: bigint;
  /** True for InclusionHomomorphism (injective = no info lost). */
  isInjective: boolean;
  /** True for ProjectionHomomorphism (surjective = covers target). */
  isSurjective: boolean;
  /** Proof that the morphism commutes with neg. */
  "morphism:CommutativityWitness": CommutativityWitness;
  /** P22: Always Grade A — ring arithmetic. */
  epistemic_grade: "A";
  /** Derivation URN from URDNA2015 content addressing. */
  "derivation:derivationId": string;
}

// ── CommutativityWitness ────────────────────────────────────────────────────

/**
 * Compute a commutativity witness for a morphism and ring operation.
 *
 * Given morphism f: R_from → R_to and operation op:
 *   leftPath  = op_to(f(x))      — apply morphism, then operation in target ring
 *   rightPath = f(op_from(x))     — apply operation in source ring, then morphism
 *
 * If leftPath === rightPath, the morphism commutes with op.
 *
 * @see spec/src/namespaces/morphism.rs — morphism:CommutativityWitness
 */
export function commutativityWitness(
  x: bigint,
  from: QuantumLevel,
  to: QuantumLevel,
  op: "neg" | "bnot" | "succ"
): CommutativityWitness {
  const opFn = op === "neg" ? negQ : op === "bnot" ? bnotQ : succQ;

  // Determine the morphism function
  const morphismFn = (v: bigint): bigint => applyMorphism(v, from, to);

  // Left path: morphism first, then operation in target ring
  const leftPath = opFn(morphismFn(x), to);

  // Right path: operation in source ring first, then morphism
  const rightPath = morphismFn(opFn(x, from));

  return {
    leftPath,
    rightPath,
    commutes: leftPath === rightPath,
  };
}

// ── Internal morphism application ───────────────────────────────────────────

/** Apply the canonical morphism from one quantum level to another. */
function applyMorphism(x: bigint, from: QuantumLevel, to: QuantumLevel): bigint {
  if (from === to) return x;

  const fromConfig = RINGS[from];
  const toConfig = RINGS[to];

  if (fromConfig.bitWidth < toConfig.bitWidth) {
    // Inclusion: lossless embedding — value preserved in larger ring
    return x % fromConfig.modulus; // ensure in source range
  }

  // Projection: lossy — take low bits of target width
  return x % toConfig.modulus;
}

// ── Morphism Functions ──────────────────────────────────────────────────────

/**
 * ProjectionHomomorphism: Q_high → Q_low (lossy: x mod modulus_low).
 *
 * Surjective but not injective — information is lost.
 * The low bits are preserved; high bits are discarded.
 *
 * @see spec/src/namespaces/morphism.rs — ProjectionHomomorphism
 */
export async function project(
  x: bigint,
  from: QuantumLevel,
  to: QuantumLevel
): Promise<MorphismResult> {
  const fromConfig = RINGS[from];
  const toConfig = RINGS[to];
  const output = x % toConfig.modulus;

  const witness = commutativityWitness(x, from, to, "neg");

  const identity = await singleProofHash({
    "@type": "morphism:ProjectionHomomorphism",
    "morphism:from": fromConfig.ring,
    "morphism:to": toConfig.ring,
    "morphism:input": Number(x % fromConfig.modulus),
    "morphism:output": Number(output),
  });

  return {
    "@type": "morphism:RingHomomorphism",
    morphismType: "ProjectionHomomorphism",
    fromRing: fromConfig.ring,
    toRing: toConfig.ring,
    input: x,
    output,
    isInjective: false,
    isSurjective: true,
    "morphism:CommutativityWitness": witness,
    epistemic_grade: "A",
    "derivation:derivationId": identity["u:canonicalId"],
  };
}

/**
 * InclusionHomomorphism: Q_low → Q_high (lossless embedding).
 *
 * Injective but not surjective — the value is embedded unchanged
 * in the larger ring. No information is lost.
 *
 * @see spec/src/namespaces/morphism.rs — InclusionHomomorphism
 */
export async function embed(
  x: bigint,
  from: QuantumLevel,
  to: QuantumLevel
): Promise<MorphismResult> {
  const fromConfig = RINGS[from];
  const toConfig = RINGS[to];
  const output = x % fromConfig.modulus; // ensure valid, identity in larger ring

  const witness = commutativityWitness(x, from, to, "neg");

  const ident = await singleProofHash({
    "@type": "morphism:InclusionHomomorphism",
    "morphism:from": fromConfig.ring,
    "morphism:to": toConfig.ring,
    "morphism:input": Number(x % fromConfig.modulus),
    "morphism:output": Number(output),
  });

  return {
    "@type": "morphism:RingHomomorphism",
    morphismType: "InclusionHomomorphism",
    fromRing: fromConfig.ring,
    toRing: toConfig.ring,
    input: x,
    output,
    isInjective: true,
    isSurjective: false,
    "morphism:CommutativityWitness": witness,
    epistemic_grade: "A",
    "derivation:derivationId": ident["u:canonicalId"],
  };
}

/**
 * IdentityHomomorphism: Q_n → Q_n (trivial identity).
 *
 * Both injective and surjective — the identity map.
 *
 * @see spec/src/namespaces/morphism.rs — IdentityHomomorphism
 */
export async function identity(
  x: bigint,
  q: QuantumLevel
): Promise<MorphismResult> {
  const config = RINGS[q];
  const normalized = x % config.modulus;

  const witness = commutativityWitness(x, q, q, "neg");

  const ident = await singleProofHash({
    "@type": "morphism:IdentityHomomorphism",
    "morphism:ring": config.ring,
    "morphism:input": Number(normalized),
    "morphism:output": Number(normalized),
  });

  return {
    "@type": "morphism:RingHomomorphism",
    morphismType: "IdentityHomomorphism",
    fromRing: config.ring,
    toRing: config.ring,
    input: x,
    output: normalized,
    isInjective: true,
    isSurjective: true,
    "morphism:CommutativityWitness": witness,
    epistemic_grade: "A",
    "derivation:derivationId": ident["u:canonicalId"],
  };
}
