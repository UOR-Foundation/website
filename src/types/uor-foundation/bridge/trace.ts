/**
 * UOR Foundation v2.0.0 — bridge::trace
 *
 * Execution traces for computation auditing.
 *
 * @see spec/src/namespaces/trace.rs
 * @namespace trace/
 */

/**
 * ComputationStep — a single step in a computation trace.
 */
export interface ComputationStep {
  /** Step index. */
  index(): number;
  /** Operation performed. */
  operation(): string;
  /** Input value. */
  input(): number;
  /** Output value. */
  output(): number;
  /** Whether this step was certified. */
  certified(): boolean;
  /** Monodromy (number of full ring cycles traversed). */
  monodromy(): number;
}

/**
 * ComputationTrace — a complete execution trace.
 */
export interface ComputationTrace {
  /** Trace identifier. */
  traceId(): string;
  /** Ordered computation steps. */
  steps(): ComputationStep[];
  /** Total step count. */
  stepCount(): number;
  /** Whether the entire trace is certified. */
  allCertified(): boolean;
  /** Total monodromy across all steps. */
  totalMonodromy(): number;
  /** Associated derivation ID (if any). */
  derivationId(): string | null;
  /** Quantum level. */
  quantum(): number;
}
