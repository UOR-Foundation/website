/**
 * UOR Foundation v2.0.0. kernel::linear
 *
 * Linear discipline on fiber consumption, lease allocation.
 *
 * @see foundation/src/kernel/linear.rs
 * @namespace linear/
 */

/** LinearResource. a resource that must be consumed exactly once. */
export interface LinearResource {
  /** Resource identifier. */
  resourceId(): string;
  /** Whether this resource has been consumed. */
  consumed(): boolean;
  /** Consume this resource (marks as consumed). */
  consume(): void;
}

/** Lease. a time-bounded allocation of fibers. */
export interface Lease {
  /** Lease identifier. */
  leaseId(): string;
  /** Number of fibers allocated. */
  fiberCount(): number;
  /** Lease creation timestamp. */
  createdAt(): string;
  /** Lease expiration timestamp. */
  expiresAt(): string;
  /** Whether this lease is still valid. */
  isValid(): boolean;
  /** Release the lease early. */
  release(): void;
}

/** LinearBudget. tracks linear resource consumption. */
export interface LinearBudget {
  /** Total resources allocated. */
  total(): number;
  /** Resources consumed so far. */
  consumed(): number;
  /** Resources remaining. */
  remaining(): number;
  /** Whether the budget is exhausted. */
  exhausted(): boolean;
}
