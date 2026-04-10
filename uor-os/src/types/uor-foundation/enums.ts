/**
 * UOR Foundation v2.0.0. Enumerations
 *
 * 22 canonical enums transcribed 1:1 from the Rust ontology.
 * Every variant name matches the generated Rust enum character-for-character.
 *
 * @see spec/src/enums.rs
 */

// ── Space ──────────────────────────────────────────────────────────────────

/** Tri-space classification for all UOR objects. */
export type Space = "Kernel" | "Bridge" | "User";

// ── PrimitiveOp ────────────────────────────────────────────────────────────

/**
 * The 10 canonical primitive operations in Z/(2^n)Z.
 *
 * @see spec/src/namespaces/op.rs. op:PrimitiveOp
 */
export type PrimitiveOp =
  | "Neg"
  | "Bnot"
  | "Succ"
  | "Pred"
  | "Add"
  | "Sub"
  | "Mul"
  | "Xor"
  | "And"
  | "Or";

// ── MetricAxis ─────────────────────────────────────────────────────────────

/**
 * Tri-metric geometry axes for observables and constraints.
 *
 * - Vertical:   ring/additive metric (stratum depth)
 * - Horizontal: Hamming/bitwise metric (edit distance)
 * - Diagonal:   curvature metric (holonomy/catastrophe)
 *
 * @see spec/src/namespaces/observable.rs
 */
export type MetricAxis = "Vertical" | "Horizontal" | "Diagonal";

// ── FiberState ─────────────────────────────────────────────────────────────

/**
 * Resolution state of an individual fiber (bit) in a FiberBudget.
 *
 * - Pinned: resolved by a constraint
 * - Free:   unresolved, awaiting constraint
 */
export type FiberState = "Pinned" | "Free";

// ── GeometricCharacter ─────────────────────────────────────────────────────

/**
 * Geometric role of a primitive operation in the ring's symmetry group.
 * 9 distinct roles mapping operations to geometric transformations.
 *
 * @see spec/src/namespaces/op.rs. op:GeometricCharacter
 */
export type GeometricCharacter =
  | "RingReflection"
  | "HypercubeReflection"
  | "Rotation"
  | "RotationInverse"
  | "Translation"
  | "Scaling"
  | "HypercubeTranslation"
  | "HypercubeProjection"
  | "HypercubeJoin";

// ── v0.2.0 Enums ───────────────────────────────────────────────────────────

/** Achievability status of a proof goal. */
export type AchievabilityStatus = "Achievable" | "Unachievable" | "Unknown" | "Conditional";

/** Complexity class annotation for computations. */
export type ComplexityClass = "Constant" | "Logarithmic" | "Linear" | "Quadratic" | "Polynomial" | "Exponential";

/** Execution policy for enforcement engine. */
export type ExecutionPolicyKind = "Strict" | "Lazy" | "Speculative" | "Bounded";

/** Phase of grounding resolution. */
export type GroundingPhase = "Ungrounded" | "Partial" | "Grounded" | "Verified";

/** Measurement units for observables. */
export type MeasurementUnit = "Bits" | "Bytes" | "Steps" | "Radians" | "Dimensionless";

/** Phase boundary type for cascade transitions. */
export type PhaseBoundaryType = "Smooth" | "Discontinuous" | "Critical" | "Catastrophic";

/** Proof modality. */
export type ProofModality = "Constructive" | "Classical" | "Computational" | "Algebraic";

/** Proof strategy selection. */
export type ProofStrategy = "DirectVerification" | "Induction" | "Contradiction" | "Exhaustion" | "Refinement";

/** Quantifier kind for predicate logic. */
export type QuantifierKind = "ForAll" | "Exists" | "Unique" | "Bounded";

/** Rewrite rule types. */
export type RewriteRule = "Simplify" | "Expand" | "Normalize" | "Factor" | "Substitute";

/** Session boundary event type. */
export type SessionBoundaryType = "Open" | "Close" | "Checkpoint" | "Migrate";

/** Site state in the computation lattice. */
export type SiteState = "Active" | "Suspended" | "Completed" | "Failed" | "Waiting";

/** Triad projection axis. */
export type TriadProjection = "Datum" | "Stratum" | "Spectrum";

/** Validity scope for constraints. */
export type ValidityScopeKind = "Local" | "Global" | "Session" | "Ephemeral";

/** Variance annotation for type parameters. */
export type VarianceAnnotation = "Covariant" | "Contravariant" | "Invariant" | "Bivariant";

/** Verification domain. */
export type VerificationDomain = "Ring" | "Graph" | "Type" | "State" | "Enforcement";

/** Violation kind for constraint failures. */
export type ViolationKind = "TypeMismatch" | "ConstraintFailure" | "BudgetExhausted" | "InvariantBroken" | "DeadlineExceeded";

// ── WittLevel (struct, not enum) ───────────────────────────────────────────

/** Witt vector level. Captures depth in the Witt ring tower. */
export interface WittLevel {
  /** Level index (0 = base ring). */
  level: number;
  /** Prime base for the Witt construction. */
  prime: number;
  /** Label (e.g., "W_2(Z/256Z)"). */
  label: string;
}
