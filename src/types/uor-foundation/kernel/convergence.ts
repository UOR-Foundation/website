/**
 * UOR Foundation v2.0.0. kernel::convergence
 *
 * Hopf tower: R, C, H, O (normed division algebras).
 *
 * @see foundation/src/kernel/convergence.rs
 * @namespace convergence/
 */

/** NormedDivisionAlgebra. one of the four Hurwitz algebras. */
export interface NormedDivisionAlgebra {
  /** Algebra name: "R" | "C" | "H" | "O". */
  name(): string;
  /** Real dimension. */
  dimension(): number;
  /** Whether multiplication is commutative. */
  isCommutative(): boolean;
  /** Whether multiplication is associative. */
  isAssociative(): boolean;
}

/** HopfFibration. a fibration in the Hopf tower. */
export interface HopfFibration {
  /** Total space dimension. */
  totalDimension(): number;
  /** Base space dimension. */
  baseDimension(): number;
  /** Fiber dimension. */
  fiberDimension(): number;
  /** Associated division algebra. */
  algebra(): NormedDivisionAlgebra;
}

/** ConvergenceTower. the full R → C → H → O tower. */
export interface ConvergenceTower {
  /** Ordered algebras (R, C, H, O). */
  algebras(): NormedDivisionAlgebra[];
  /** Associated Hopf fibrations. */
  fibrations(): HopfFibration[];
  /** Whether the tower is complete (all 4 levels present). */
  isComplete(): boolean;
}
