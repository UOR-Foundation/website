/**
 * UOR Foundation v2.0.0 — bridge::partition
 *
 * Irreducibility decomposition and fiber tracking.
 * v0.2.0 additions: SiteBinding, PartitionProduct,
 * PartitionRefinement, FiberProjection.
 *
 * @see spec/src/namespaces/partition.rs
 * @namespace partition/
 */

import type { FiberState } from "../enums";

// ── Core Partition Types ───────────────────────────────────────────────────

export interface Component {
  elements(): number[];
  size(): number;
}

/** IrreducibleSet — elements with exactly one non-trivial factorization. */
export interface IrreducibleSet extends Component {
  readonly kind: "IrreducibleSet";
}

/** ReducibleSet — elements with multiple non-trivial factorizations. */
export interface ReducibleSet extends Component {
  readonly kind: "ReducibleSet";
  maxDepth(): number;
}

/** UnitSet — the multiplicative identity {1}. */
export interface UnitSet extends Component {
  readonly kind: "UnitSet";
}

/** ExteriorSet — the additive identity {0}. */
export interface ExteriorSet extends Component {
  readonly kind: "ExteriorSet";
}

/** Partition — the complete partition of a ring into 4 disjoint sets. */
export interface Partition {
  irreducible(): IrreducibleSet;
  reducible(): ReducibleSet;
  unit(): UnitSet;
  exterior(): ExteriorSet;
  totalElements(): number;
  density(): number;
}

// ── Fiber Budget System ────────────────────────────────────────────────────

export interface FiberCoordinate {
  bitIndex: number;
  state: FiberState;
  pinnedBy: string | null;
}

export interface FiberPinning {
  coordinate: FiberCoordinate;
  constraintId: string;
  pinnedAt: string;
}

export interface FiberBudget {
  totalFibers: number;
  pinnedCount: number;
  isClosed: boolean;
  fibers: FiberCoordinate[];
  pinnings: FiberPinning[];
}

// ══════════════════════════════════════════════════════════════════════════
// v0.2.0 ADDITIONS
// ══════════════════════════════════════════════════════════════════════════

/**
 * SiteBinding — binds a partition component to a topological site
 * (a point in the sheaf-theoretic view of the ring).
 *
 * @see spec/src/namespaces/partition.rs — SiteBinding
 */
export interface SiteBinding {
  /** Site identifier (topological point). */
  siteId(): string;
  /** Component bound to this site. */
  component(): Component;
  /** Site state (from kernel::reduction). */
  siteState(): string;
  /** Whether the binding is stable under refinement. */
  isStable(): boolean;
}

/**
 * PartitionProduct — the product of two partitions (intersection of sets).
 * Used to refine a partition by intersecting with constraints.
 *
 * @see spec/src/namespaces/partition.rs — PartitionProduct
 */
export interface PartitionProduct {
  /** Left partition. */
  left(): Partition;
  /** Right partition. */
  right(): Partition;
  /** Resulting refined partition. */
  product(): Partition;
  /** Number of components in the product. */
  componentCount(): number;
}

/**
 * PartitionRefinement — records a single refinement step that
 * splits one partition into a finer one.
 *
 * @see spec/src/namespaces/partition.rs — PartitionRefinement
 */
export interface PartitionRefinement {
  /** Refinement identifier. */
  refinementId(): string;
  /** Partition before refinement. */
  before(): Partition;
  /** Partition after refinement. */
  after(): Partition;
  /** Constraint that caused the refinement. */
  constraintId(): string;
  /** Number of new components created. */
  newComponents(): number;
}

/**
 * FiberProjection — projects a fiber budget onto a lower-dimensional
 * subspace, collapsing some fiber coordinates.
 *
 * @see spec/src/namespaces/partition.rs — FiberProjection
 */
export interface FiberProjection {
  /** Source fiber budget. */
  source(): FiberBudget;
  /** Projected fiber budget. */
  projected(): FiberBudget;
  /** Fiber coordinates collapsed by the projection. */
  collapsedIndices(): number[];
  /** Whether the projection is information-preserving. */
  lossless(): boolean;
}
