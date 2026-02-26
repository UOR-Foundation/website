/**
 * UOR Foundation v2.0.0 — user::morphism
 *
 * Structure-preserving maps between UOR objects.
 * Disjoint constraints documented per v2.0.0 spec:
 *   Composition ⊥ Isometry ⊥ Embedding ⊥ Action ⊥ IdentityMorphism
 *
 * @see foundation/src/user/morphism.rs
 * @namespace morphism/
 */

import type { PrimitiveOp } from "../enums";
import type { TypeDefinition } from "./type";

// ── Morphism Kind Discriminator ────────────────────────────────────────────

/**
 * Discriminated union tag for morphism subtypes.
 * Enforces disjoint constraints at runtime via tagged unions.
 */
export type MorphismKind = "Isometry" | "Embedding" | "Action" | "Composition" | "Identity";

// ── Transform ──────────────────────────────────────────────────────────────

/**
 * Transform — abstract base for all morphisms.
 *
 * @disjoint Isometry, Embedding, Action, Composition, IdentityMorphism
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

// ── Disjoint Subtypes ──────────────────────────────────────────────────────

/**
 * Isometry — a lossless, distance-preserving morphism.
 * Guarantees: project(embed(x)) = x (round-trip identity).
 *
 * @disjoint Embedding, Action, Composition, IdentityMorphism
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
 * @disjoint Isometry, Action, Composition, IdentityMorphism
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
 * NOTE: Action is a sibling of Transform in v2.0.0, not a subclass.
 *
 * @disjoint Isometry, Embedding, Composition, IdentityMorphism
 */
export interface Action extends Transform {
  /** The operation sequence. */
  operations(): PrimitiveOp[];
  /** Apply the action to a value. */
  act(value: number): number;
}

/**
 * Composition — sequential composition of transforms.
 *
 * @disjoint Isometry, Embedding, Action, IdentityMorphism
 */
export interface Composition extends Transform {
  /** The transforms being composed (in application order). */
  components(): Transform[];
  /** Number of components. */
  length(): number;
}

/**
 * IdentityMorphism — the identity transform (f(x) = x).
 * Links to the TypeDefinition it is identity on.
 *
 * @disjoint Isometry, Embedding, Action, Composition
 */
export interface IdentityMorphism extends Transform {
  fidelityPreserved(): true;
  /** The type this morphism is identity on. */
  identityOn(): TypeDefinition;
}

// ── Disjoint guard (runtime) ───────────────────────────────────────────────

/** Runtime disjoint set — no morphism may belong to two kinds. */
export const MORPHISM_DISJOINT_SETS: ReadonlySet<MorphismKind>[] = [
  new Set(["Isometry"]),
  new Set(["Embedding"]),
  new Set(["Action"]),
  new Set(["Composition"]),
  new Set(["Identity"]),
] as const;

// ── CompositionLaw ─────────────────────────────────────────────────────────

/**
 * CompositionLaw — a named algebraic law relating compositions.
 * Now includes associativity and commutativity predicates per v2.0.0.
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
  /** Whether this law's composition is associative. */
  isAssociative(): boolean;
  /** Whether this law's composition is commutative. */
  isCommutative(): boolean;
}

// ── Named Individual ───────────────────────────────────────────────────────

/** critical_composition — neg ∘ bnot = succ (associative, non-commutative). */
export const CRITICAL_COMPOSITION = {
  "@id": "morphism:critical_composition",
  lawComponents: ["Neg", "Bnot"] as [PrimitiveOp, PrimitiveOp],
  lawResult: "Succ" as PrimitiveOp,
  equation: "neg ∘ bnot = succ",
  isAssociative: true,
  isCommutative: false,
} as const;
