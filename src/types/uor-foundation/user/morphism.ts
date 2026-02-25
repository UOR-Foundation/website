/**
 * UOR Foundation v2.0.0 — user::morphism
 *
 * Structure-preserving maps between UOR objects.
 *
 * @see spec/src/namespaces/morphism.rs
 * @namespace morphism/
 */

import type { PrimitiveOp } from "../enums";

/**
 * Transform — abstract base for all morphisms.
 *
 * @disjoint Isometry, Embedding, Action
 */
export interface Transform {
  /** Transform identifier. */
  transformId(): string;
  /** Source IRI. */
  sourceIri(): string;
  /** Target IRI. */
  targetIri(): string;
  /** Source quantum level. */
  sourceQuantum(): number;
  /** Target quantum level. */
  targetQuantum(): number;
  /** Whether this morphism preserves fidelity. */
  fidelityPreserved(): boolean;
}

/**
 * Isometry — a lossless, distance-preserving morphism.
 * Guarantees: project(embed(x)) = x (round-trip identity).
 *
 * @disjoint Embedding, Action
 */
export interface Isometry extends Transform {
  /** Always true for isometries. */
  fidelityPreserved(): true;
  /** Verify round-trip property for a specific value. */
  verifyRoundTrip(value: number): boolean;
}

/**
 * Embedding — injective map from smaller ring to larger ring.
 * Value preserved, zero-padded in higher bits.
 *
 * @disjoint Isometry, Action
 */
export interface Embedding extends Transform {
  /** Embed a value. */
  embed(value: number): number;
  /** Whether this embedding is isometric. */
  isIsometric(): boolean;
}

/**
 * Action — a group action on ring elements.
 * Applies a sequence of primitive operations.
 *
 * @disjoint Isometry, Embedding
 */
export interface Action extends Transform {
  /** The operation sequence. */
  operations(): PrimitiveOp[];
  /** Apply the action to a value. */
  act(value: number): number;
}

/**
 * Composition — sequential composition of transforms.
 */
export interface Composition extends Transform {
  /** The transforms being composed (in application order). */
  components(): Transform[];
  /** Number of components. */
  length(): number;
}

/**
 * CompositionLaw — a named algebraic law relating compositions.
 */
export interface CompositionLaw {
  /** Law identifier. */
  lawId(): string;
  /** Components of the LHS. */
  lhsComponents(): PrimitiveOp[];
  /** The single RHS operation. */
  rhsResult(): PrimitiveOp;
  /** Human-readable equation. */
  equation(): string;
}

/**
 * IdentityMorphism — the identity transform (f(x) = x).
 */
export interface IdentityMorphism extends Transform {
  fidelityPreserved(): true;
}

// ── Named Individual ───────────────────────────────────────────────────────

/** critical_composition — neg ∘ bnot = succ. */
export const CRITICAL_COMPOSITION = {
  "@id": "morphism:critical_composition",
  lawComponents: ["Neg", "Bnot"] as [PrimitiveOp, PrimitiveOp],
  lawResult: "Succ" as PrimitiveOp,
  equation: "neg ∘ bnot = succ",
} as const;
