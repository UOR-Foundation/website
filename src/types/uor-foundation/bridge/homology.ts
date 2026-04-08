/**
 * UOR Foundation v2.0.0. bridge::homology
 *
 * Simplicial complexes, chain complexes, boundary operators.
 *
 * @see foundation/src/bridge/homology.rs
 * @namespace homology/
 */

/** Simplex. an n-simplex (ordered tuple of vertices). */
export interface Simplex {
  /** Dimension of this simplex. */
  dimension(): number;
  /** Vertex indices. */
  vertices(): number[];
  /** Orientation (+1 or -1). */
  orientation(): number;
}

/** Chain. a formal sum of simplices. */
export interface Chain {
  /** Degree (dimension of constituent simplices). */
  degree(): number;
  /** Terms in the chain. */
  terms(): Array<{ simplex: Simplex; coefficient: number }>;
}

/** BoundaryOperator. the boundary map ∂. */
export interface BoundaryOperator {
  /** Source degree. */
  fromDegree(): number;
  /** Target degree. */
  toDegree(): number;
  /** Apply ∂ to a chain. */
  apply(chain: Chain): Chain;
  /** Whether ∂² = 0 holds. */
  isNilpotent(): boolean;
}

/** SimplicialComplex. a collection of simplices closed under face operations. */
export interface SimplicialComplex {
  /** All simplices, grouped by dimension. */
  simplices(dimension: number): Simplex[];
  /** Maximum dimension. */
  maxDimension(): number;
  /** Total number of simplices. */
  totalSimplices(): number;
  /** Euler characteristic. */
  eulerCharacteristic(): number;
}

/** ChainComplex. a sequence of chains with boundary operators. */
export interface ChainComplex {
  /** Chains indexed by degree. */
  chains(): Chain[];
  /** Boundary operators. */
  boundaries(): BoundaryOperator[];
}

/** HomologyGroup. the n-th homology group H_n. */
export interface HomologyGroup {
  /** Degree n. */
  degree(): number;
  /** Dimension (Betti number). */
  dimension(): number;
  /** Generator representatives. */
  generators(): Chain[];
}
