/**
 * UOR Foundation v2.0.0 — bridge::resolver
 *
 * Type → Partition resolution with state machine lifecycle.
 * v0.2.0 additions: HomotopyResolver, SessionResolver,
 * GeodesicResolver, SpectralResolver, LiftResolver, CascadeResolver,
 * EnforcementResolver, ReductionResolver, CompositeResolver, ResolutionPlan.
 *
 * @see spec/src/namespaces/resolver.rs
 * @namespace resolver/
 */

// ── Core Resolver Types ────────────────────────────────────────────────────

export type ResolutionState = "Unresolved" | "Partial" | "Resolved" | "Certified";

export interface RefinementSuggestion {
  description(): string;
  expectedPinCount(): number;
  constraintType(): string;
}

/**
 * Resolver — abstract base for all resolvers.
 */
export interface Resolver {
  state(): ResolutionState;
  resolve(value: number, quantum: number): ResolutionState;
  suggestions(): RefinementSuggestion[];
}

/** DihedralFactorizationResolver — resolves via dihedral group factorization. */
export interface DihedralFactorizationResolver extends Resolver {
  factorizationDepth(): number;
}

/** IterativeRefinementResolver — resolves via successive constraint application. */
export interface IterativeRefinementResolver extends Resolver {
  iterationCount(): number;
  maxIterations(): number;
}

// ══════════════════════════════════════════════════════════════════════════
// v0.2.0 ADDITIONS
// ══════════════════════════════════════════════════════════════════════════

/**
 * HomotopyResolver — resolves by finding a homotopy (continuous path)
 * between two type configurations in the moduli space.
 *
 * @see spec/src/namespaces/resolver.rs — HomotopyResolver
 */
export interface HomotopyResolver extends Resolver {
  /** Number of homotopy levels explored. */
  homotopyLevel(): number;
  /** Whether a path was found. */
  pathFound(): boolean;
  /** Path length (number of intermediate types). */
  pathLength(): number;
}

/**
 * SessionResolver — resolves bindings within a session context,
 * using the session chain for historical resolution.
 *
 * @see spec/src/namespaces/resolver.rs — SessionResolver
 */
export interface SessionResolver extends Resolver {
  /** Session CID being resolved against. */
  sessionCid(): string;
  /** How far back in the session chain to look. */
  lookbackDepth(): number;
  /** Number of bindings resolved from session context. */
  contextResolutions(): number;
}

/**
 * GeodesicResolver — resolves by computing geodesic paths in
 * the ring's metric space, finding shortest routes between values.
 *
 * @see spec/src/namespaces/resolver.rs — GeodesicResolver
 */
export interface GeodesicResolver extends Resolver {
  /** Metric used for geodesic computation. */
  metricType(): "Ring" | "Hamming" | "Curvature";
  /** Computed geodesic distance. */
  geodesicDistance(): number;
  /** Operation sequence comprising the geodesic path. */
  pathOperations(): string[];
}

/**
 * SpectralResolver — resolves using spectral analysis of the
 * ring element's basis decomposition (spectrum).
 *
 * @see spec/src/namespaces/resolver.rs — SpectralResolver
 */
export interface SpectralResolver extends Resolver {
  /** Number of spectral components analysed. */
  spectralComponents(): number;
  /** Spectral gap (smallest non-zero eigenvalue distance). */
  spectralGap(): number;
  /** Whether the spectrum uniquely determines the element. */
  isSpectrallySeparated(): boolean;
}

/**
 * LiftResolver — resolves by lifting a type from a lower quantum
 * level and verifying fidelity at the target level.
 *
 * @see spec/src/namespaces/resolver.rs — LiftResolver
 */
export interface LiftResolver extends Resolver {
  /** Source quantum level to lift from. */
  sourceQuantum(): number;
  /** Target quantum level. */
  targetQuantum(): number;
  /** Whether the lift preserved all fibers. */
  fidelityPreserved(): boolean;
}

/**
 * CascadeResolver — resolves via the cascade reduction pipeline,
 * applying ψ-maps sequentially until convergence.
 *
 * @see spec/src/namespaces/resolver.rs — CascadeResolver
 */
export interface CascadeResolver extends Resolver {
  /** Number of cascade epochs completed. */
  epochsCompleted(): number;
  /** Maximum epochs allowed. */
  maxEpochs(): number;
  /** Whether the cascade converged. */
  converged(): boolean;
}

/**
 * EnforcementResolver — resolves by validating against enforcement
 * module constraints (grounding, assertions, boundary discipline).
 *
 * @see spec/src/namespaces/resolver.rs — EnforcementResolver
 */
export interface EnforcementResolver extends Resolver {
  /** Number of assertions checked. */
  assertionsChecked(): number;
  /** Number of violations found. */
  violationsFound(): number;
  /** Whether all grounding requirements are satisfied. */
  groundingSatisfied(): boolean;
}

/**
 * ReductionResolver — resolves via the full reduction pipeline
 * (phase gates, epoch iteration, lease management).
 *
 * @see spec/src/namespaces/resolver.rs — ReductionResolver
 */
export interface ReductionResolver extends Resolver {
  /** Current reduction phase. */
  currentPhase(): string;
  /** Total phases in the pipeline. */
  totalPhases(): number;
  /** Whether all phase gates passed. */
  allGatesPassed(): boolean;
}

/**
 * CompositeResolver — composes multiple resolvers, applying them
 * in sequence or parallel with configurable strategy.
 *
 * @see spec/src/namespaces/resolver.rs — CompositeResolver
 */
export interface CompositeResolver extends Resolver {
  /** Child resolvers. */
  children(): Resolver[];
  /** Composition strategy. */
  strategy(): "Sequential" | "Parallel" | "FirstSuccess";
  /** Number of child resolvers that succeeded. */
  succeededCount(): number;
}

/**
 * ResolutionPlan — a declarative plan for resolving a complex type,
 * specifying which resolvers to apply in what order.
 *
 * @see spec/src/namespaces/resolver.rs — ResolutionPlan
 */
export interface ResolutionPlan {
  /** Plan identifier. */
  planId(): string;
  /** Target type to resolve. */
  targetTypeId(): string;
  /** Ordered resolver stages. */
  stages(): Array<{
    resolverId: string;
    timeout: number;
    required: boolean;
  }>;
  /** Estimated total resolution time (ms). */
  estimatedTime(): number;
}
