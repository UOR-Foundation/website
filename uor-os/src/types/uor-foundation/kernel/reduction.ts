/**
 * UOR Foundation v2.0.0. kernel::reduction
 *
 * Full cascade reduction pipeline (epochs, leases, phase gates).
 *
 * @see foundation/src/kernel/reduction.rs
 * @namespace reduction/
 */

import type { PhaseBoundaryType, SiteState } from "../enums";

/** ReductionRule. a single rewriting rule in the reduction pipeline. */
export interface ReductionRule {
  /** Rule identifier. */
  ruleId(): string;
  /** Pattern to match (serialized term). */
  pattern(): string;
  /** Replacement (serialized term). */
  replacement(): string;
  /** Priority (lower = applied first). */
  priority(): number;
}

/** PhaseGate. a checkpoint between reduction epochs. */
export interface PhaseGate {
  /** Gate identifier. */
  gateId(): string;
  /** Boundary type. */
  boundaryType(): PhaseBoundaryType;
  /** Predicate that must hold to pass the gate. */
  invariant(): string;
  /** Whether the gate currently allows passage. */
  isOpen(): boolean;
}

/** ReductionEpoch. a bounded reduction phase. */
export interface ReductionEpoch {
  /** Epoch index. */
  index(): number;
  /** Rules applied in this epoch. */
  rules(): ReductionRule[];
  /** Number of reductions performed. */
  reductionCount(): number;
  /** Whether a normal form was reached. */
  normalized(): boolean;
  /** Phase gate at epoch end (if any). */
  gate(): PhaseGate | null;
}

/** ReductionPipeline. the full multi-epoch reduction. */
export interface ReductionPipeline {
  /** All epochs in order. */
  epochs(): ReductionEpoch[];
  /** Total reductions across all epochs. */
  totalReductions(): number;
  /** Whether the pipeline reached a global normal form. */
  converged(): boolean;
  /** Final site state. */
  finalState(): SiteState;
}

/** ReductionStrategy. selection of rules and epoch boundaries. */
export interface ReductionStrategy {
  /** Strategy identifier. */
  strategyId(): string;
  /** Maximum epochs. */
  maxEpochs(): number;
  /** Maximum reductions per epoch. */
  maxReductionsPerEpoch(): number;
  /** Rule selection policy. */
  policy(): string;
}
