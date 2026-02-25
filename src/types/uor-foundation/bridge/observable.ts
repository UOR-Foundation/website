/**
 * UOR Foundation v2.0.0 — bridge::observable
 *
 * 13 typed observable subtypes organized by MetricAxis.
 *
 * @see spec/src/namespaces/observable.rs
 * @namespace observable/
 */

import type { MetricAxis } from "../enums";

/**
 * Observable — abstract base for all observables.
 */
export interface Observable {
  /** Observable IRI identifier. */
  iri(): string;
  /** Current value. */
  value(): number;
  /** Metric axis this observable is aligned to. */
  axis(): MetricAxis;
  /** Quantum level. */
  quantum(): number;
}

// ── Vertical (Ring/Additive) Observables ────────────────────────────────────

/**
 * StratumObservable — popcount (Hamming weight) of a datum.
 * @axis Vertical
 * @disjoint MetricObservable, PathObservable, CascadeObservable, CatastropheObservable
 */
export interface StratumObservable extends Observable {
  axis(): "Vertical";
  /** Popcount per byte position. */
  stratumVector(): number[];
}

/**
 * RingMetric — additive distance in the ring: d(x,y) = min(|x-y|, n-|x-y|).
 * @axis Vertical
 */
export interface RingMetric extends Observable {
  axis(): "Vertical";
  /** Distance from reference element. */
  distance(): number;
  /** Reference element value. */
  reference(): number;
}

// ── Horizontal (Hamming/Bitwise) Observables ───────────────────────────────

/**
 * HammingMetric — Hamming distance between two datums.
 * @axis Horizontal
 */
export interface HammingMetric extends Observable {
  axis(): "Horizontal";
  /** Number of differing bits. */
  distance(): number;
  /** Reference datum for distance computation. */
  reference(): number;
}

/**
 * CascadeObservable — cascade propagation through bit operations.
 * @axis Horizontal
 */
export interface CascadeObservable extends Observable {
  axis(): "Horizontal";
  /** Number of cascade steps. */
  cascadeLength(): number;
}

/**
 * CascadeLength — the length metric of a cascade.
 * @axis Horizontal
 */
export interface CascadeLength extends Observable {
  axis(): "Horizontal";
  /** Total steps in the cascade chain. */
  totalSteps(): number;
}

// ── Diagonal (Curvature) Observables ───────────────────────────────────────

/**
 * CurvatureObservable — curvature at a point in the ring's geometry.
 * @axis Diagonal
 */
export interface CurvatureObservable extends Observable {
  axis(): "Diagonal";
  /** Curvature value. */
  curvature(): number;
}

/**
 * HolonomyObservable — holonomy (parallel transport around loops).
 * @axis Diagonal
 */
export interface HolonomyObservable extends Observable {
  axis(): "Diagonal";
  /** Holonomy angle (radians). */
  angle(): number;
  /** Loop path as sequence of operations. */
  loopPath(): string[];
}

/**
 * CatastropheObservable — catastrophe theory discontinuity detection.
 * @axis Diagonal
 */
export interface CatastropheObservable extends Observable {
  axis(): "Diagonal";
  /** Whether a catastrophe (discontinuity) was detected. */
  detected(): boolean;
  /** Catastrophe type (fold, cusp, etc.). */
  catastropheType(): string;
}

/**
 * CatastropheThreshold — threshold value for catastrophe detection.
 * @axis Diagonal
 */
export interface CatastropheThreshold extends Observable {
  axis(): "Diagonal";
  /** Threshold value. */
  threshold(): number;
}

/**
 * DihedralElement — an element of the dihedral symmetry group.
 * @axis Diagonal
 */
export interface DihedralElement extends Observable {
  axis(): "Diagonal";
  /** Rotation component. */
  rotation(): number;
  /** Whether this element includes a reflection. */
  isReflection(): boolean;
}

// ── MetricObservable (generic metric) ──────────────────────────────────────

/**
 * MetricObservable — a generic metric-valued observable.
 * @disjoint StratumObservable, PathObservable, CascadeObservable
 */
export interface MetricObservable extends Observable {
  /** The metric distance value. */
  metricValue(): number;
  /** The axis this metric is aligned to. */
  metricAxis(): MetricAxis;
}

/**
 * PathObservable — observable along a path in the ring.
 * @disjoint StratumObservable, MetricObservable, CascadeObservable
 */
export interface PathObservable extends Observable {
  /** Path as sequence of values. */
  path(): number[];
  /** Path length. */
  pathLength(): number;
}

// ── Axis Classification Utility ────────────────────────────────────────────

/** Canonical mapping of observable type names to MetricAxis. */
export const OBSERVABLE_AXIS: Record<string, MetricAxis> = {
  StratumObservable: "Vertical",
  RingMetric: "Vertical",
  HammingMetric: "Horizontal",
  CascadeObservable: "Horizontal",
  CascadeLength: "Horizontal",
  CurvatureObservable: "Diagonal",
  HolonomyObservable: "Diagonal",
  CatastropheObservable: "Diagonal",
  CatastropheThreshold: "Diagonal",
  DihedralElement: "Diagonal",
  MetricObservable: "Vertical",  // default
  PathObservable: "Horizontal",  // default
};
