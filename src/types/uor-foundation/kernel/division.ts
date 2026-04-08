/**
 * UOR Foundation v2.0.0. kernel::division
 *
 * Cayley-Dickson construction, multiplication tables.
 *
 * @see foundation/src/kernel/division.rs
 * @namespace division/
 */

/** CayleyDicksonPair. a pair (a, b) in the Cayley-Dickson construction. */
export interface CayleyDicksonPair {
  /** Real part. */
  real(): number;
  /** Imaginary part. */
  imaginary(): number;
  /** Norm (|a|² + |b|²). */
  norm(): number;
  /** Conjugate (a, -b). */
  conjugate(): CayleyDicksonPair;
}

/** MultiplicationTable. structure constants for an algebra. */
export interface MultiplicationTable {
  /** Dimension of the algebra. */
  dimension(): number;
  /** Get structure constant e_i * e_j = c * e_k. */
  multiply(i: number, j: number): { coefficient: number; index: number };
  /** Whether this table describes a division algebra. */
  isDivision(): boolean;
}

/** CayleyDicksonLevel. a level in the Cayley-Dickson construction. */
export interface CayleyDicksonLevel {
  /** Level index (0=R, 1=C, 2=H, 3=O, 4=S, ...). */
  level(): number;
  /** Dimension at this level (2^level). */
  dimension(): number;
  /** Whether this level's algebra is a division algebra. */
  isDivision(): boolean;
  /** Multiplication table at this level. */
  table(): MultiplicationTable;
}
