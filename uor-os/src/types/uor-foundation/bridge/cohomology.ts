/**
 * UOR Foundation v2.0.0. bridge::cohomology
 *
 * Cochain complexes, sheaf cohomology, obstruction detection.
 *
 * @see foundation/src/bridge/cohomology.rs
 * @namespace cohomology/
 */

/** Cochain. a cochain in a cochain complex. */
export interface Cochain {
  /** Degree of this cochain. */
  degree(): number;
  /** Dimension (number of basis elements). */
  dimension(): number;
  /** Coefficients. */
  coefficients(): number[];
}

/** CoboundaryMap. the coboundary operator δ. */
export interface CoboundaryMap {
  /** Source degree. */
  fromDegree(): number;
  /** Target degree. */
  toDegree(): number;
  /** Apply δ to a cochain. */
  apply(cochain: Cochain): Cochain;
  /** Whether δ² = 0 holds. */
  isNilpotent(): boolean;
}

/** CochainComplex. a sequence of cochains with coboundary maps. */
export interface CochainComplex {
  /** Cochains indexed by degree. */
  cochains(): Cochain[];
  /** Coboundary maps. */
  coboundaries(): CoboundaryMap[];
  /** Maximum degree. */
  maxDegree(): number;
}

/** CohomologyGroup. the n-th cohomology group H^n. */
export interface CohomologyGroup {
  /** Degree n. */
  degree(): number;
  /** Dimension of H^n (Betti number). */
  dimension(): number;
  /** Generator representatives. */
  generators(): Cochain[];
}

/** ObstructionClass. a cohomological obstruction to extension. */
export interface ObstructionClass {
  /** Degree of the obstruction. */
  degree(): number;
  /** Whether the obstruction vanishes (extension possible). */
  vanishes(): boolean;
  /** Representative cocycle. */
  representative(): Cochain;
  /** Description. */
  description(): string;
}
