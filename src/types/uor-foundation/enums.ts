/**
 * UOR Foundation v2.0.0 — Enumerations
 *
 * 5 canonical enums transcribed 1:1 from the Rust ontology.
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
 * @see spec/src/namespaces/op.rs — op:PrimitiveOp
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
 * @see spec/src/namespaces/op.rs — op:GeometricCharacter
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
