/**
 * UOR Foundation v2.0.0 — user::type
 *
 * Runtime type declarations with constraint algebra.
 *
 * @see spec/src/namespaces/type_.rs
 * @namespace type/
 */

import type { MetricAxis } from "../enums";

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
  /** Always "PrimitiveType". */
  readonly kind: "PrimitiveType";
}

/**
 * ProductType — AND composition (tuple of types).
 * Total bit width = sum of member bit widths.
 *
 * @disjoint PrimitiveType, SumType, ConstrainedType
 */
export interface ProductType extends TypeDefinition {
  /** Always "ProductType". */
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
  /** Always "SumType". */
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
  /** Always "ConstrainedType". */
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
  /** Constraint identifier. */
  constraintId(): string;
  /** MetricAxis this constraint operates on. */
  axis(): MetricAxis;
  /** Cost of crossing this constraint boundary. */
  crossingCost(): number;
  /** Test whether a value satisfies this constraint. */
  satisfies(value: bigint): boolean;
}

/**
 * ResidueConstraint — selects x where x ≡ r (mod m).
 * @axis Vertical
 *
 * @disjoint CarryConstraint, DepthConstraint, CompositeConstraint
 */
export interface ResidueConstraint extends Constraint {
  /** Modulus. */
  modulus(): number;
  /** Target residue. */
  residue(): number;
}

/**
 * CarryConstraint — selects x by addition carry pattern.
 * @axis Horizontal
 *
 * @disjoint ResidueConstraint, DepthConstraint, CompositeConstraint
 */
export interface CarryConstraint extends Constraint {
  /** Binary carry pattern string (e.g., "1010"). */
  pattern(): string;
}

/**
 * DepthConstraint — bounds on factorization depth.
 * @axis Diagonal
 *
 * @disjoint ResidueConstraint, CarryConstraint, CompositeConstraint
 */
export interface DepthConstraint extends Constraint {
  /** Minimum factorization depth. */
  minDepth(): number;
  /** Maximum factorization depth. */
  maxDepth(): number;
}

/**
 * CompositeConstraint — AND/OR composition of child constraints.
 *
 * @disjoint ResidueConstraint, CarryConstraint, DepthConstraint
 */
export interface CompositeConstraint extends Constraint {
  /** Composition mode. */
  mode(): "AND" | "OR";
  /** Child constraints. */
  children(): Constraint[];
}
