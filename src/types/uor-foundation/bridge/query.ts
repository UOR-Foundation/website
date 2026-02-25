/**
 * UOR Foundation v2.0.0 — bridge::query
 *
 * Information extraction queries over ring elements.
 *
 * @see spec/src/namespaces/query.rs
 * @namespace query/
 */

import type { MetricAxis } from "../enums";

/**
 * Query — abstract base for all queries.
 */
export interface Query {
  /** Human-readable query description. */
  description(): string;
}

/**
 * CoordinateQuery — queries by position in the ring.
 *
 * @disjoint MetricQuery, RepresentationQuery
 */
export interface CoordinateQuery extends Query {
  /** Target value in the ring. */
  targetValue(): number;
  /** Quantum level to query. */
  quantum(): number;
}

/**
 * MetricQuery — queries by metric distance.
 *
 * @disjoint CoordinateQuery, RepresentationQuery
 */
export interface MetricQuery extends Query {
  /** Reference value to measure from. */
  referenceValue(): number;
  /** Maximum distance threshold. */
  radius(): number;
  /** Which metric axis to measure along. */
  axis(): MetricAxis;
}

/**
 * RepresentationQuery — queries by representation form.
 *
 * @disjoint CoordinateQuery, MetricQuery
 */
export interface RepresentationQuery extends Query {
  /** Target representation format (e.g., "binary", "braille", "nquads"). */
  format(): string;
}
