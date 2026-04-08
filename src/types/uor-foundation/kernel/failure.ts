/**
 * UOR Foundation v2.0.0. kernel::failure
 *
 * Partial computations, typed failure propagation, recovery.
 *
 * @see foundation/src/kernel/failure.rs
 * @namespace failure/
 */

/** FailureKind. discriminator for failure types. */
export type FailureKind =
  | "Overflow"
  | "DivisionByZero"
  | "ConstraintViolation"
  | "BudgetExhausted"
  | "Timeout"
  | "Divergence";

/** Failure. a typed computation failure. */
export interface Failure {
  /** Failure kind discriminator. */
  kind(): FailureKind;
  /** Human-readable message. */
  message(): string;
  /** The computation step where failure occurred. */
  atStep(): number;
  /** Context in which the failure occurred. */
  contextId(): string | null;
}

/** PartialResult. a computation that may have partially succeeded. */
export interface PartialResult<T> {
  /** Partial value (if any progress was made). */
  value(): T | null;
  /** Failure information (null if fully successful). */
  failure(): Failure | null;
  /** Whether the computation fully succeeded. */
  isComplete(): boolean;
  /** Progress ratio [0, 1]. */
  progress(): number;
}

/** RecoveryStrategy. how to recover from a failure. */
export interface RecoveryStrategy {
  /** Strategy identifier. */
  strategyId(): string;
  /** The failure kind this strategy handles. */
  handles(): FailureKind;
  /** Description of the recovery action. */
  description(): string;
  /** Whether this strategy is guaranteed to succeed. */
  guaranteed(): boolean;
}
