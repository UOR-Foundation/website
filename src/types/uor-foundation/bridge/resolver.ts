/**
 * UOR Foundation v2.0.0 — bridge::resolver
 *
 * Type → Partition resolution with state machine lifecycle.
 *
 * @see spec/src/namespaces/resolver.rs
 * @namespace resolver/
 */

/**
 * ResolutionState — lifecycle state of a resolution process.
 */
export type ResolutionState = "Unresolved" | "Partial" | "Resolved" | "Certified";

/**
 * RefinementSuggestion — a suggested next step in resolution.
 */
export interface RefinementSuggestion {
  /** Description of the suggested refinement. */
  description(): string;
  /** Expected number of fibers this will pin. */
  expectedPinCount(): number;
  /** The constraint type to apply. */
  constraintType(): string;
}

/**
 * Resolver — abstract base for all resolvers.
 *
 * @disjoint DihedralFactorizationResolver, IterativeRefinementResolver
 */
export interface Resolver {
  /** Current resolution state. */
  state(): ResolutionState;
  /** Resolve a value at the given quantum level. */
  resolve(value: number, quantum: number): ResolutionState;
  /** Get suggestions for the next refinement step. */
  suggestions(): RefinementSuggestion[];
}

/**
 * DihedralFactorizationResolver — resolves via dihedral group factorization.
 * Uses neg/bnot decomposition to factorize ring elements.
 *
 * @disjoint IterativeRefinementResolver
 */
export interface DihedralFactorizationResolver extends Resolver {
  /** Factorization depth achieved. */
  factorizationDepth(): number;
}

/**
 * IterativeRefinementResolver — resolves via successive constraint application.
 * Each step pins additional fibers until closure.
 *
 * @disjoint DihedralFactorizationResolver
 */
export interface IterativeRefinementResolver extends Resolver {
  /** Number of refinement iterations performed. */
  iterationCount(): number;
  /** Maximum iterations before timeout. */
  maxIterations(): number;
}
