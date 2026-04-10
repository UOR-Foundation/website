/**
 * UOR Foundation v2.0.0 — bridge::observable
 *
 * 13 typed observable subtypes organized by MetricAxis.
 * v0.2.0 additions: TopologicalObservable, SpectralGap,
 * SpectralObservable, EntropyObservable, ComplexityObservable,
 * SessionObservable, BoundaryObservable, FiberObservable,
 * ConvergenceObservable, ReductionObservable, InteractionObservable,
 * HomologyObservable, CohomologyObservable, GroundingObservable,
 * AggregateObservable.
 *
 * @see spec/src/namespaces/observable.rs
 * @namespace observable/
 */

import type { MetricAxis } from "../enums";

// ── Core Observable ────────────────────────────────────────────────────────

export interface Observable {
  iri(): string;
  value(): number;
  axis(): MetricAxis;
  quantum(): number;
}

// ── Vertical (Ring/Additive) Observables ────────────────────────────────────

/** StratumObservable — popcount (Hamming weight) of a datum. @axis Vertical */
export interface StratumObservable extends Observable {
  axis(): "Vertical";
  stratumVector(): number[];
}

/** RingMetric — additive distance in the ring. @axis Vertical */
export interface RingMetric extends Observable {
  axis(): "Vertical";
  distance(): number;
  reference(): number;
}

// ── Horizontal (Hamming/Bitwise) Observables ───────────────────────────────

/** HammingMetric — Hamming distance between two datums. @axis Horizontal */
export interface HammingMetric extends Observable {
  axis(): "Horizontal";
  distance(): number;
  reference(): number;
}

/** CascadeObservable — cascade propagation through bit operations. @axis Horizontal */
export interface CascadeObservable extends Observable {
  axis(): "Horizontal";
  cascadeLength(): number;
}

/** CascadeLength — the length metric of a cascade. @axis Horizontal */
export interface CascadeLength extends Observable {
  axis(): "Horizontal";
  totalSteps(): number;
}

// ── Diagonal (Curvature) Observables ───────────────────────────────────────

/** CurvatureObservable — curvature at a point in the ring's geometry. @axis Diagonal */
export interface CurvatureObservable extends Observable {
  axis(): "Diagonal";
  curvature(): number;
}

/** HolonomyObservable — holonomy (parallel transport around loops). @axis Diagonal */
export interface HolonomyObservable extends Observable {
  axis(): "Diagonal";
  angle(): number;
  loopPath(): string[];
}

/** CatastropheObservable — catastrophe theory discontinuity detection. @axis Diagonal */
export interface CatastropheObservable extends Observable {
  axis(): "Diagonal";
  detected(): boolean;
  catastropheType(): string;
}

/** CatastropheThreshold — threshold value for catastrophe detection. @axis Diagonal */
export interface CatastropheThreshold extends Observable {
  axis(): "Diagonal";
  threshold(): number;
}

/** DihedralElement — an element of the dihedral symmetry group. @axis Diagonal */
export interface DihedralElement extends Observable {
  axis(): "Diagonal";
  rotation(): number;
  isReflection(): boolean;
}

/** MetricObservable — a generic metric-valued observable. */
export interface MetricObservable extends Observable {
  metricValue(): number;
  metricAxis(): MetricAxis;
}

/** PathObservable — observable along a path in the ring. */
export interface PathObservable extends Observable {
  path(): number[];
  pathLength(): number;
}

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
  MetricObservable: "Vertical",
  PathObservable: "Horizontal",
  // v0.2.0 additions
  TopologicalObservable: "Diagonal",
  SpectralGap: "Vertical",
  SpectralObservable: "Vertical",
  EntropyObservable: "Vertical",
  ComplexityObservable: "Diagonal",
  SessionObservable: "Horizontal",
  BoundaryObservable: "Horizontal",
  FiberObservable: "Vertical",
  ConvergenceObservable: "Diagonal",
  ReductionObservable: "Horizontal",
  InteractionObservable: "Diagonal",
  HomologyObservable: "Diagonal",
  CohomologyObservable: "Diagonal",
  GroundingObservable: "Vertical",
  AggregateObservable: "Vertical",
};

// ══════════════════════════════════════════════════════════════════════════
// v0.2.0 ADDITIONS
// ══════════════════════════════════════════════════════════════════════════

/**
 * TopologicalObservable — observes topological invariants (Betti numbers,
 * Euler characteristic) of the ring's structure.
 *
 * @see spec/src/namespaces/observable.rs — TopologicalObservable
 */
export interface TopologicalObservable extends Observable {
  /** Euler characteristic. */
  eulerCharacteristic(): number;
  /** Betti numbers by dimension. */
  bettiNumbers(): number[];
  /** Whether the space is connected. */
  isConnected(): boolean;
}

/**
 * SpectralGap — the gap between the two smallest eigenvalues in the
 * ring's Laplacian spectrum. Critical for convergence analysis.
 *
 * @see spec/src/namespaces/observable.rs — SpectralGap
 */
export interface SpectralGap extends Observable {
  axis(): "Vertical";
  /** Gap value (λ₂ - λ₁). */
  gap(): number;
  /** Smallest eigenvalue λ₁. */
  lambda1(): number;
  /** Second eigenvalue λ₂. */
  lambda2(): number;
}

/**
 * SpectralObservable — full spectral decomposition observable.
 *
 * @see spec/src/namespaces/observable.rs — SpectralObservable
 */
export interface SpectralObservable extends Observable {
  axis(): "Vertical";
  /** Eigenvalue spectrum. */
  eigenvalues(): number[];
  /** Spectral radius. */
  spectralRadius(): number;
  /** Number of non-zero components. */
  rank(): number;
}

/**
 * EntropyObservable — Shannon or Rényi entropy of a distribution
 * over ring elements.
 *
 * @see spec/src/namespaces/observable.rs — EntropyObservable
 */
export interface EntropyObservable extends Observable {
  axis(): "Vertical";
  /** Entropy value (bits). */
  entropy(): number;
  /** Entropy type ("Shannon" | "Renyi" | "Min"). */
  entropyType(): "Shannon" | "Renyi" | "Min";
  /** Maximum possible entropy for this ring. */
  maxEntropy(): number;
}

/**
 * ComplexityObservable — computational complexity observable
 * for a ring computation.
 *
 * @see spec/src/namespaces/observable.rs — ComplexityObservable
 */
export interface ComplexityObservable extends Observable {
  axis(): "Diagonal";
  /** Operation count. */
  operationCount(): number;
  /** Depth (longest dependency chain). */
  depth(): number;
  /** Complexity class estimate. */
  complexityClass(): string;
}

/**
 * SessionObservable — real-time metrics of a session.
 *
 * @see spec/src/namespaces/observable.rs — SessionObservable
 */
export interface SessionObservable extends Observable {
  axis(): "Horizontal";
  /** Session CID being observed. */
  sessionCid(): string;
  /** Current binding count. */
  bindingCount(): number;
  /** Transition count since session start. */
  transitionCount(): number;
  /** Session age in milliseconds. */
  ageMs(): number;
}

/**
 * BoundaryObservable — monitors the IO boundary (source/sink activity).
 *
 * @see spec/src/namespaces/observable.rs — BoundaryObservable
 */
export interface BoundaryObservable extends Observable {
  axis(): "Horizontal";
  /** Number of ingested items. */
  ingestCount(): number;
  /** Number of emitted items. */
  emitCount(): number;
  /** Current backpressure level (0-1). */
  backpressure(): number;
}

/**
 * FiberObservable — observes fiber budget resolution progress.
 *
 * @see spec/src/namespaces/observable.rs — FiberObservable
 */
export interface FiberObservable extends Observable {
  axis(): "Vertical";
  /** Total fibers. */
  totalFibers(): number;
  /** Pinned fibers. */
  pinnedFibers(): number;
  /** Resolution ratio (pinned / total). */
  resolutionRatio(): number;
}

/**
 * ConvergenceObservable — tracks convergence of an iterative process.
 *
 * @see spec/src/namespaces/observable.rs — ConvergenceObservable
 */
export interface ConvergenceObservable extends Observable {
  axis(): "Diagonal";
  /** Current error / residual. */
  residual(): number;
  /** Convergence rate estimate. */
  rate(): number;
  /** Iterations completed. */
  iterations(): number;
  /** Whether convergence has been achieved. */
  converged(): boolean;
}

/**
 * ReductionObservable — monitors reduction pipeline progress.
 *
 * @see spec/src/namespaces/observable.rs — ReductionObservable
 */
export interface ReductionObservable extends Observable {
  axis(): "Horizontal";
  /** Current epoch index. */
  currentEpoch(): number;
  /** Total epochs. */
  totalEpochs(): number;
  /** Phase gates passed. */
  gatesPassed(): number;
}

/**
 * InteractionObservable — monitors multi-entity interaction state.
 *
 * @see spec/src/namespaces/observable.rs — InteractionObservable
 */
export interface InteractionObservable extends Observable {
  axis(): "Diagonal";
  /** Number of active participants. */
  participantCount(): number;
  /** Commutator norm (non-commutativity measure). */
  commutatorNorm(): number;
  /** Associator norm (non-associativity measure). */
  associatorNorm(): number;
}

/**
 * HomologyObservable — observes homological invariants.
 *
 * @see spec/src/namespaces/observable.rs — HomologyObservable
 */
export interface HomologyObservable extends Observable {
  axis(): "Diagonal";
  /** Homology dimension being observed. */
  dimension(): number;
  /** Rank of the homology group. */
  rank(): number;
  /** Torsion coefficients. */
  torsion(): number[];
}

/**
 * CohomologyObservable — observes cohomological invariants.
 *
 * @see spec/src/namespaces/observable.rs — CohomologyObservable
 */
export interface CohomologyObservable extends Observable {
  axis(): "Diagonal";
  /** Cohomology dimension. */
  dimension(): number;
  /** Rank of the cohomology group. */
  rank(): number;
  /** Whether an obstruction was detected. */
  obstructionDetected(): boolean;
}

/**
 * GroundingObservable — monitors the grounding status of enforcement datums.
 *
 * @see spec/src/namespaces/observable.rs — GroundingObservable
 */
export interface GroundingObservable extends Observable {
  axis(): "Vertical";
  /** Total symbols requiring grounding. */
  totalSymbols(): number;
  /** Symbols successfully grounded. */
  groundedSymbols(): number;
  /** Current grounding phase. */
  phase(): string;
}

/**
 * AggregateObservable — combines multiple observables into a single
 * summary metric via a configurable aggregation function.
 *
 * @see spec/src/namespaces/observable.rs — AggregateObservable
 */
export interface AggregateObservable extends Observable {
  /** Child observables being aggregated. */
  children(): Observable[];
  /** Aggregation function ("mean" | "max" | "min" | "sum"). */
  aggregation(): "mean" | "max" | "min" | "sum";
  /** Number of children. */
  childCount(): number;
}
