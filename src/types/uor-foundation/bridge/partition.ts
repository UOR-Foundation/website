/**
 * UOR Foundation v2.0.0 — bridge::partition
 *
 * Irreducibility decomposition and fiber tracking.
 *
 * @see spec/src/namespaces/partition.rs
 * @namespace partition/
 */

import type { FiberState } from "../enums";

/**
 * Component — abstract base for partition set components.
 */
export interface Component {
  /** Set of values belonging to this component. */
  elements(): number[];
  /** Cardinality of this component. */
  size(): number;
}

/**
 * IrreducibleSet — elements with exactly one non-trivial factorization.
 * In Z/256Z these are the primes ≤ 255 (126 elements).
 *
 * @disjoint ReducibleSet, UnitSet, ExteriorSet
 */
export interface IrreducibleSet extends Component {
  /** Always "IrreducibleSet". */
  readonly kind: "IrreducibleSet";
}

/**
 * ReducibleSet — elements with multiple non-trivial factorizations.
 *
 * @disjoint IrreducibleSet, UnitSet, ExteriorSet
 */
export interface ReducibleSet extends Component {
  /** Always "ReducibleSet". */
  readonly kind: "ReducibleSet";
  /** Factorization depth (number of prime factors). */
  maxDepth(): number;
}

/**
 * UnitSet — the multiplicative identity {1}.
 *
 * @disjoint IrreducibleSet, ReducibleSet, ExteriorSet
 */
export interface UnitSet extends Component {
  /** Always "UnitSet". */
  readonly kind: "UnitSet";
}

/**
 * ExteriorSet — the additive identity {0}.
 *
 * @disjoint IrreducibleSet, ReducibleSet, UnitSet
 */
export interface ExteriorSet extends Component {
  /** Always "ExteriorSet". */
  readonly kind: "ExteriorSet";
}

/**
 * Partition — the complete partition of a ring into 4 disjoint sets.
 */
export interface Partition {
  /** The irreducible elements. */
  irreducible(): IrreducibleSet;
  /** The reducible elements. */
  reducible(): ReducibleSet;
  /** The unit element(s). */
  unit(): UnitSet;
  /** The exterior element(s). */
  exterior(): ExteriorSet;
  /** Total number of elements across all sets. */
  totalElements(): number;
  /** Density: irreducible count / total elements. */
  density(): number;
}

// ── Fiber Budget System ────────────────────────────────────────────────────

/**
 * FiberCoordinate — a single bit position in the fiber budget.
 */
export interface FiberCoordinate {
  /** Bit index (0-based from LSB). */
  bitIndex: number;
  /** Current resolution state of this fiber. */
  state: FiberState;
  /** Which constraint pinned this fiber (null if Free). */
  pinnedBy: string | null;
}

/**
 * FiberPinning — records the pinning of a fiber by a constraint.
 */
export interface FiberPinning {
  /** The fiber being pinned. */
  coordinate: FiberCoordinate;
  /** The constraint that caused the pinning. */
  constraintId: string;
  /** Timestamp of pinning. */
  pinnedAt: string;
}

/**
 * FiberBudget — tracks bit-level type resolution progress.
 * totalFibers = bit width of the quantum level.
 * isClosed = true when all fibers are pinned (fully resolved).
 */
export interface FiberBudget {
  /** Total number of fibers (= bit width). */
  totalFibers: number;
  /** Number of fibers currently pinned. */
  pinnedCount: number;
  /** True when all fibers are pinned. */
  isClosed: boolean;
  /** Individual fiber states. */
  fibers: FiberCoordinate[];
  /** History of pinning events. */
  pinnings: FiberPinning[];
}
