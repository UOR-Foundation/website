/**
 * UOR Foundation v2.0.0 — bridge::derivation
 *
 * Term rewriting witnesses with typed steps.
 *
 * @see spec/src/namespaces/derivation.rs
 * @namespace derivation/
 */

/**
 * TermMetrics — metrics computed during term rewriting.
 */
export interface TermMetrics {
  /** Total number of rewrite steps. */
  stepCount(): number;
  /** Maximum term depth reached. */
  maxDepth(): number;
  /** Final term size (node count). */
  termSize(): number;
}

/**
 * DerivationStep — a single step in a derivation (abstract).
 *
 * @disjoint RewriteStep, RefinementStep
 */
export interface DerivationStep {
  /** Step index (0-based). */
  index(): number;
  /** Description of what this step does. */
  description(): string;
  /** Input term (serialized). */
  inputTerm(): string;
  /** Output term (serialized). */
  outputTerm(): string;
}

/**
 * RewriteStep — a term rewriting step.
 *
 * @disjoint RefinementStep
 */
export interface RewriteStep extends DerivationStep {
  /** The rewrite rule applied. */
  rule(): string;
  /** Whether the rewrite was confluent. */
  confluent(): boolean;
}

/**
 * RefinementStep — a refinement step (adds precision).
 *
 * @disjoint RewriteStep
 */
export interface RefinementStep extends DerivationStep {
  /** Number of fibers pinned by this step. */
  fibersPinned(): number;
  /** Constraint that drove this refinement. */
  constraintId(): string;
}

/**
 * Derivation — a complete derivation record with steps.
 */
export interface Derivation {
  /** Derivation identifier (URN). */
  derivationId(): string;
  /** Result IRI. */
  resultIri(): string;
  /** Epistemic grade. */
  epistemicGrade(): string;
  /** Ordered steps. */
  steps(): DerivationStep[];
  /** Computed term metrics. */
  metrics(): TermMetrics;
  /** Canonical term (normalized). */
  canonicalTerm(): string;
  /** Timestamp. */
  timestamp(): string;
}
