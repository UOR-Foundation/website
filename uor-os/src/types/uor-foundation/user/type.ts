/**
 * UOR Foundation v2.0.0 — user::type
 *
 * Runtime type declarations with constraint algebra.
 * v0.2.0 additions: ModuliSpace, LiftChain, DeformationFamily,
 * GaloisConnection, higher-kinded types, dependent types, and
 * the full type inference/unification subsystem.
 *
 * @see spec/src/namespaces/type_.rs
 * @namespace type/
 */

import type { MetricAxis } from "../enums";

// ── Core Type Definitions ──────────────────────────────────────────────────

/**
 * TypeDefinition — abstract base for all type definitions.
 *
 * @disjoint PrimitiveType, ProductType, SumType, ConstrainedType
 */
export interface TypeDefinition {
  /** Bit width of this type. */
  bitWidth(): number;
  /** Quantum level. */
  quantum(): number;
  /** Ring notation (e.g., "Z/256Z"). */
  ring(): string;
  /** Canonical type identifier. */
  canonicalId(): string;
}

/**
 * PrimitiveType — a single ring element type (U8, U16, U32).
 *
 * @disjoint ProductType, SumType, ConstrainedType
 */
export interface PrimitiveType extends TypeDefinition {
  readonly kind: "PrimitiveType";
}

/**
 * ProductType — AND composition (tuple of types).
 * Total bit width = sum of member bit widths.
 *
 * @disjoint PrimitiveType, SumType, ConstrainedType
 */
export interface ProductType extends TypeDefinition {
  readonly kind: "ProductType";
  /** Constituent types. */
  members(): TypeDefinition[];
}

/**
 * SumType — OR composition (tagged union).
 * Bit width = max of member bit widths.
 *
 * @disjoint PrimitiveType, ProductType, ConstrainedType
 */
export interface SumType extends TypeDefinition {
  readonly kind: "SumType";
  /** Variant types. */
  variants(): TypeDefinition[];
}

/**
 * ConstrainedType — base type + constraint predicate.
 *
 * @disjoint PrimitiveType, ProductType, SumType
 */
export interface ConstrainedType extends TypeDefinition {
  readonly kind: "ConstrainedType";
  /** The base type being constrained. */
  baseType(): TypeDefinition;
  /** The constraint applied. */
  constraint(): Constraint;
}

// ── Constraint Algebra ─────────────────────────────────────────────────────

/**
 * Constraint — abstract base for all constraints.
 *
 * @disjoint ResidueConstraint, CarryConstraint, DepthConstraint, CompositeConstraint
 */
export interface Constraint {
  constraintId(): string;
  axis(): MetricAxis;
  crossingCost(): number;
  satisfies(value: bigint): boolean;
}

/** ResidueConstraint — selects x where x ≡ r (mod m). @axis Vertical */
export interface ResidueConstraint extends Constraint {
  modulus(): number;
  residue(): number;
}

/** CarryConstraint — selects x by addition carry pattern. @axis Horizontal */
export interface CarryConstraint extends Constraint {
  pattern(): string;
}

/** DepthConstraint — bounds on factorization depth. @axis Diagonal */
export interface DepthConstraint extends Constraint {
  minDepth(): number;
  maxDepth(): number;
}

/** CompositeConstraint — AND/OR composition of child constraints. */
export interface CompositeConstraint extends Constraint {
  mode(): "AND" | "OR";
  children(): Constraint[];
}

// ── v0.2.0: Advanced Type System ───────────────────────────────────────────

/**
 * ModuliSpace — parameterised family of types indexed by a continuous
 * deformation parameter. Models the space of all possible ring
 * instantiations at a given quantum level.
 *
 * @see spec/src/namespaces/type_.rs — ModuliSpace
 */
export interface ModuliSpace {
  /** Moduli space identifier. */
  spaceId(): string;
  /** Dimension of the parameter space. */
  dimension(): number;
  /** Base type family. */
  baseFamily(): TypeDefinition;
  /** Enumerate points (type instantiations) in the moduli space. */
  points(): TypeDefinition[];
  /** Whether the space is compact (finite-dimensional). */
  isCompact(): boolean;
}

/**
 * LiftChain — a sequence of type embeddings Q0 → Q1 → Q3 → Q7
 * lifting a datum through successive quantum levels.
 *
 * @see spec/src/namespaces/type_.rs — LiftChain
 */
export interface LiftChain {
  /** Chain identifier. */
  chainId(): string;
  /** Source quantum level. */
  sourceQuantum(): number;
  /** Target quantum level. */
  targetQuantum(): number;
  /** Ordered sequence of types in the chain. */
  steps(): TypeDefinition[];
  /** Whether every step preserves fidelity. */
  isFaithful(): boolean;
}

/**
 * DeformationFamily — a continuously parameterised family of types
 * connected via the Cayley-Dickson construction.
 *
 * @see spec/src/namespaces/type_.rs — DeformationFamily
 */
export interface DeformationFamily {
  familyId(): string;
  /** Parameter name (e.g., "t"). */
  parameter(): string;
  /** Base type at parameter = 0. */
  baseType(): TypeDefinition;
  /** Deformed type at parameter = 1. */
  deformedType(): TypeDefinition;
  /** Whether the deformation is smooth. */
  isSmooth(): boolean;
}

/**
 * GaloisConnection — an adjoint pair (f, g) between ordered type lattices.
 * f(x) ≤ y ⟺ x ≤ g(y).
 *
 * @see spec/src/namespaces/type_.rs — GaloisConnection
 */
export interface GaloisConnection {
  connectionId(): string;
  /** Lower adjoint (abstraction). */
  lowerAdjoint(): string;
  /** Upper adjoint (concretisation). */
  upperAdjoint(): string;
  /** Source lattice type. */
  sourceType(): TypeDefinition;
  /** Target lattice type. */
  targetType(): TypeDefinition;
}

/**
 * TypeScheme — a polymorphic type with bound type variables.
 * ∀α₁…αₙ. τ
 *
 * @see spec/src/namespaces/type_.rs — TypeScheme
 */
export interface TypeScheme {
  /** Bound type variable names. */
  boundVars(): string[];
  /** The body type (may reference bound vars). */
  body(): TypeDefinition;
  /** Number of quantified variables. */
  arity(): number;
}

/**
 * TypeVariable — a placeholder for an unknown type, resolved by unification.
 *
 * @see spec/src/namespaces/type_.rs — TypeVariable
 */
export interface TypeVariable extends TypeDefinition {
  readonly kind: "TypeVariable";
  /** Variable name. */
  varName(): string;
  /** Universe level (for stratified polymorphism). */
  universe(): number;
}

/**
 * RecursiveType — μα.τ (fixpoint type).
 *
 * @see spec/src/namespaces/type_.rs — RecursiveType
 */
export interface RecursiveType extends TypeDefinition {
  readonly kind: "RecursiveType";
  /** Recursion variable name. */
  recursionVar(): string;
  /** Body type (references recursionVar). */
  body(): TypeDefinition;
}

/**
 * RefinementType — { x : τ | φ(x) }.
 * A type paired with a predicate that values must satisfy.
 *
 * @see spec/src/namespaces/type_.rs — RefinementType
 */
export interface RefinementType extends TypeDefinition {
  readonly kind: "RefinementType";
  /** Base type. */
  baseType(): TypeDefinition;
  /** Predicate expression (canonical string form). */
  predicate(): string;
}

/**
 * DependentType — Π(x:A).B(x) or Σ(x:A).B(x).
 *
 * @see spec/src/namespaces/type_.rs — DependentType
 */
export interface DependentType extends TypeDefinition {
  readonly kind: "DependentType";
  /** "Pi" (dependent function) or "Sigma" (dependent pair). */
  dependentKind(): "Pi" | "Sigma";
  /** Binding variable name. */
  bindingVar(): string;
  /** Domain type A. */
  domain(): TypeDefinition;
  /** Codomain family B(x). */
  codomain(): TypeDefinition;
}

/**
 * HigherKindedType — a type constructor of kind * → * → … → *.
 *
 * @see spec/src/namespaces/type_.rs — HigherKindedType
 */
export interface HigherKindedType extends TypeDefinition {
  readonly kind: "HigherKindedType";
  /** Constructor name (e.g., "List", "Option"). */
  constructorName(): string;
  /** Kind arity (number of type parameters). */
  kindArity(): number;
  /** Applied type arguments (partial application allowed). */
  appliedArgs(): TypeDefinition[];
}

/**
 * UniverseLevel — stratification level to prevent Girard's paradox.
 *
 * @see spec/src/namespaces/type_.rs — UniverseLevel
 */
export interface UniverseLevel {
  /** Universe index (0 = Type₀, 1 = Type₁, …). */
  level(): number;
  /** Whether this universe is predicative. */
  isPredicative(): boolean;
}

/**
 * TypeEquality — a witness that two types are definitionally equal.
 *
 * @see spec/src/namespaces/type_.rs — TypeEquality
 */
export interface TypeEquality {
  /** LHS type. */
  lhs(): TypeDefinition;
  /** RHS type. */
  rhs(): TypeDefinition;
  /** Evidence kind (e.g., "reflexivity", "reduction", "congruence"). */
  evidence(): string;
}

/**
 * Subtyping — a witness that A <: B (A is a subtype of B).
 *
 * @see spec/src/namespaces/type_.rs — Subtyping
 */
export interface Subtyping {
  /** Subtype. */
  sub(): TypeDefinition;
  /** Supertype. */
  sup(): TypeDefinition;
  /** Coercion function identifier (if applicable). */
  coercion(): string | null;
}

/**
 * TypeInference — result of type inference for an expression.
 *
 * @see spec/src/namespaces/type_.rs — TypeInference
 */
export interface TypeInference {
  /** The inferred type. */
  inferredType(): TypeDefinition;
  /** Substitution map from type variables to concrete types. */
  substitution(): Record<string, TypeDefinition>;
  /** Whether inference succeeded. */
  succeeded(): boolean;
  /** Diagnostic message on failure. */
  diagnostic(): string | null;
}

/**
 * UnificationResult — outcome of unifying two types.
 *
 * @see spec/src/namespaces/type_.rs — UnificationResult
 */
export interface UnificationResult {
  /** Whether unification succeeded. */
  unified(): boolean;
  /** Most general unifier (substitution). */
  mgu(): Record<string, TypeDefinition>;
  /** Conflict description on failure. */
  conflict(): string | null;
}

/**
 * TypeContext — Γ context mapping names to types.
 *
 * @see spec/src/namespaces/type_.rs — TypeContext
 */
export interface TypeContext {
  /** Context identifier. */
  contextId(): string;
  /** Number of bindings. */
  size(): number;
  /** Look up a name in the context. */
  lookup(name: string): TypeDefinition | null;
  /** Extend the context with a new binding. */
  extend(name: string, ty: TypeDefinition): TypeContext;
}

/**
 * TypeJudgment — Γ ⊢ e : τ.
 *
 * @see spec/src/namespaces/type_.rs — TypeJudgment
 */
export interface TypeJudgment {
  /** The context Γ. */
  context(): TypeContext;
  /** The expression being judged. */
  expression(): string;
  /** The assigned type τ. */
  assignedType(): TypeDefinition;
}

/**
 * TypeDerivation — a complete derivation tree for a type judgment.
 *
 * @see spec/src/namespaces/type_.rs — TypeDerivation
 */
export interface TypeDerivation {
  /** Root judgment. */
  conclusion(): TypeJudgment;
  /** Inference rule applied (e.g., "Var", "App", "Abs", "Let"). */
  rule(): string;
  /** Sub-derivations (premises). */
  premises(): TypeDerivation[];
  /** Depth of the derivation tree. */
  depth(): number;
}
