/**
 * UOR Foundation v2.0.0 — user::morphism
 *
 * Structure-preserving maps between UOR objects.
 * v0.2.0 additions: GroundingMap, ProjectionMap, Witness,
 * SymbolSequence, TopologicalDelta, categorical morphisms
 * (Functor, NaturalTransformation, Adjunction, Monad, Comonad).
 *
 * Disjoint constraints documented per v2.0.0 spec:
 *   Composition ⊥ Isometry ⊥ Embedding ⊥ Action ⊥ IdentityMorphism
 *
 * @see foundation/src/user/morphism.rs
 * @namespace morphism/
 */

import type { PrimitiveOp } from "../enums";
import type { TypeDefinition } from "./type";

// ── Morphism Kind Discriminator ────────────────────────────────────────────

export type MorphismKind = "Isometry" | "Embedding" | "Action" | "Composition" | "Identity";

// ── Transform ──────────────────────────────────────────────────────────────

/**
 * Transform — abstract base for all morphisms.
 *
 * @disjoint Isometry, Embedding, Action, Composition, IdentityMorphism
 */
export interface Transform {
  transformId(): string;
  sourceIri(): string;
  targetIri(): string;
  sourceQuantum(): number;
  targetQuantum(): number;
  fidelityPreserved(): boolean;
}

// ── Disjoint Subtypes ──────────────────────────────────────────────────────

/**
 * Isometry — lossless, distance-preserving morphism.
 * Guarantees: project(embed(x)) = x.
 */
export interface Isometry extends Transform {
  fidelityPreserved(): true;
  verifyRoundTrip(value: number): boolean;
}

/**
 * Embedding — injective map from smaller ring to larger ring.
 */
export interface Embedding extends Transform {
  embed(value: number): number;
  isIsometric(): boolean;
}

/**
 * Action — group action on ring elements via primitive operations.
 */
export interface Action extends Transform {
  operations(): PrimitiveOp[];
  act(value: number): number;
}

/**
 * Composition — sequential composition of transforms.
 */
export interface Composition extends Transform {
  components(): Transform[];
  length(): number;
}

/**
 * IdentityMorphism — the identity transform (f(x) = x).
 */
export interface IdentityMorphism extends Transform {
  fidelityPreserved(): true;
  identityOn(): TypeDefinition;
}

/** Runtime disjoint set — no morphism may belong to two kinds. */
export const MORPHISM_DISJOINT_SETS: ReadonlySet<MorphismKind>[] = [
  new Set(["Isometry"]),
  new Set(["Embedding"]),
  new Set(["Action"]),
  new Set(["Composition"]),
  new Set(["Identity"]),
] as const;

/**
 * CompositionLaw — a named algebraic law relating compositions.
 */
export interface CompositionLaw {
  lawId(): string;
  lhsComponents(): PrimitiveOp[];
  rhsResult(): PrimitiveOp;
  equation(): string;
  isAssociative(): boolean;
  isCommutative(): boolean;
}

/** critical_composition — neg ∘ bnot = succ (associative, non-commutative). */
export const CRITICAL_COMPOSITION = {
  "@id": "morphism:critical_composition",
  lawComponents: ["Neg", "Bnot"] as [PrimitiveOp, PrimitiveOp],
  lawResult: "Succ" as PrimitiveOp,
  equation: "neg ∘ bnot = succ",
  isAssociative: true,
  isCommutative: false,
} as const;

// ══════════════════════════════════════════════════════════════════════════
// v0.2.0 ADDITIONS
// ══════════════════════════════════════════════════════════════════════════

/**
 * GroundingMap — a morphism from abstract symbols to grounded ring
 * elements. Maps each symbol in a SymbolSequence to a concrete Datum
 * value, establishing the enforcement module's grounding discipline.
 *
 * @see spec/src/namespaces/morphism.rs — GroundingMap
 */
export interface GroundingMap extends Transform {
  /** Map a symbol name to its grounded value. */
  ground(symbol: string): number;
  /** All grounded bindings. */
  bindings(): Record<string, number>;
  /** Whether every symbol in the domain has a grounding. */
  isTotal(): boolean;
}

/**
 * ProjectionMap — a surjective morphism that projects a higher-dimensional
 * type onto a lower-dimensional subspace. Dual of Embedding.
 *
 * @see spec/src/namespaces/morphism.rs — ProjectionMap
 */
export interface ProjectionMap extends Transform {
  /** Project a value. */
  project(value: number): number;
  /** Dimension of the target subspace. */
  targetDimension(): number;
  /** Fibers collapsed by the projection. */
  collapsedFibers(): number;
}

/**
 * Witness — a morphism that attests to a property holding.
 * Used by the enforcement module to witness validated computations.
 *
 * @see spec/src/namespaces/morphism.rs — Witness
 */
export interface Witness extends Transform {
  /** Property being witnessed. */
  property(): string;
  /** Witness value (the evidence). */
  evidence(): string;
  /** Epistemic grade of the witness. */
  epistemicGrade(): "A" | "B" | "C" | "D";
}

/**
 * SymbolSequence — an ordered sequence of abstract symbols
 * awaiting grounding via a GroundingMap.
 *
 * @see spec/src/namespaces/morphism.rs — SymbolSequence
 */
export interface SymbolSequence {
  /** Sequence identifier. */
  sequenceId(): string;
  /** Ordered symbol names. */
  symbols(): string[];
  /** Length of the sequence. */
  length(): number;
  /** Whether all symbols are distinct. */
  isLinear(): boolean;
}

/**
 * TopologicalDelta — a morphism recording the topological difference
 * between two type configurations (e.g., before/after a deformation).
 *
 * @see spec/src/namespaces/morphism.rs — TopologicalDelta
 */
export interface TopologicalDelta extends Transform {
  /** Euler characteristic change. */
  eulerDelta(): number;
  /** Betti number changes by dimension. */
  bettiDeltas(): number[];
  /** Whether the delta is trivial (no topological change). */
  isTrivial(): boolean;
}

/**
 * FunctorMorphism — a structure-preserving map between categories.
 * Maps both objects and morphisms while preserving composition.
 *
 * @see spec/src/namespaces/morphism.rs — FunctorMorphism
 */
export interface FunctorMorphism {
  functorId(): string;
  /** Source category identifier. */
  sourceCategory(): string;
  /** Target category identifier. */
  targetCategory(): string;
  /** Whether the functor is covariant (true) or contravariant (false). */
  isCovariant(): boolean;
  /** Whether it preserves identities. */
  preservesIdentity(): boolean;
}

/**
 * NaturalTransformation — a family of morphisms η_A : F(A) → G(A)
 * commuting with all morphisms in the source category.
 *
 * @see spec/src/namespaces/morphism.rs — NaturalTransformation
 */
export interface NaturalTransformation {
  transformationId(): string;
  /** Source functor. */
  source(): FunctorMorphism;
  /** Target functor. */
  target(): FunctorMorphism;
  /** Component at a specific object. */
  componentAt(objectId: string): Transform;
  /** Whether this is a natural isomorphism. */
  isIsomorphism(): boolean;
}

/**
 * AdjunctionPair — an adjoint pair (F ⊣ G) of functors.
 * Hom(F(A), B) ≅ Hom(A, G(B)) naturally in A and B.
 *
 * @see spec/src/namespaces/morphism.rs — AdjunctionPair
 */
export interface AdjunctionPair {
  /** Left adjoint F. */
  leftAdjoint(): FunctorMorphism;
  /** Right adjoint G. */
  rightAdjoint(): FunctorMorphism;
  /** Unit η : Id → G ∘ F. */
  unit(): NaturalTransformation;
  /** Counit ε : F ∘ G → Id. */
  counit(): NaturalTransformation;
}

/**
 * MonadMorphism — a monad (T, η, μ) on a category.
 * T : C → C with unit η : Id → T and multiplication μ : T² → T.
 *
 * @see spec/src/namespaces/morphism.rs — MonadMorphism
 */
export interface MonadMorphism {
  monadId(): string;
  /** Endofunctor T. */
  endofunctor(): FunctorMorphism;
  /** Unit η. */
  unit(): NaturalTransformation;
  /** Multiplication μ. */
  multiplication(): NaturalTransformation;
}

/**
 * ComonadMorphism — a comonad (W, ε, δ) dual to MonadMorphism.
 *
 * @see spec/src/namespaces/morphism.rs — ComonadMorphism
 */
export interface ComonadMorphism {
  comonadId(): string;
  endofunctor(): FunctorMorphism;
  /** Counit ε : W → Id. */
  counit(): NaturalTransformation;
  /** Comultiplication δ : W → W². */
  comultiplication(): NaturalTransformation;
}

/**
 * DiagramMorphism — a morphism in a diagram (functor from an index category).
 *
 * @see spec/src/namespaces/morphism.rs — DiagramMorphism
 */
export interface DiagramMorphism {
  /** Source object in the diagram. */
  sourceObject(): string;
  /** Target object in the diagram. */
  targetObject(): string;
  /** The underlying transform. */
  morphism(): Transform;
}

/**
 * LimitCone — a universal cone over a diagram.
 * The limit object with projections to each diagram object.
 *
 * @see spec/src/namespaces/morphism.rs — LimitCone
 */
export interface LimitCone {
  /** Limit object identifier. */
  apexId(): string;
  /** Projection morphisms from the apex to diagram objects. */
  projections(): DiagramMorphism[];
  /** Whether this is a limit (true) or colimit (false). */
  isLimit(): boolean;
  /** The diagram this cone is over. */
  diagramObjects(): string[];
}
