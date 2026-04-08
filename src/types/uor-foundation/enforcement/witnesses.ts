/**
 * UOR Foundation v2.0.0. enforcement::witnesses
 *
 * Datum, Validated, Derivation, FiberBudget, FreeRank witnesses.
 *
 * @see foundation/src/enforcement/mod.rs
 */

import type { GroundingPhase, ValidityScopeKind } from "../enums";

/** EnforcementDatum. a validated ring element with grounding proof. */
export interface EnforcementDatum {
  /** The ring value. */
  value(): number;
  /** Quantum level. */
  quantum(): number;
  /** Grounding phase. */
  phase(): GroundingPhase;
  /** Derivation ID proving this datum. */
  derivationId(): string | null;
}

/** Validated. a value that has passed enforcement validation. */
export interface Validated<T = number> {
  /** The validated value. */
  inner(): T;
  /** Validation timestamp. */
  validatedAt(): string;
  /** Scope of validity. */
  scope(): ValidityScopeKind;
  /** Whether still valid. */
  isValid(): boolean;
}

/** EnforcementDerivation. a derivation produced by the enforcement engine. */
export interface EnforcementDerivation {
  /** Derivation identifier. */
  derivationId(): string;
  /** Input terms (serialized). */
  inputs(): string[];
  /** Output term (serialized). */
  output(): string;
  /** Rules applied. */
  rulesApplied(): string[];
  /** Whether the derivation converged. */
  converged(): boolean;
}

/** EnforcementFiberBudget. fiber budget managed by enforcement. */
export interface EnforcementFiberBudget {
  /** Total fibers. */
  total(): number;
  /** Pinned fibers. */
  pinned(): number;
  /** Free fibers. */
  free(): number;
  /** Whether budget is closed (fully resolved). */
  isClosed(): boolean;
}

/** FreeRank. the rank of free (unresolved) fibers. */
export interface FreeRank {
  /** Number of free fibers. */
  rank(): number;
  /** Indices of free fiber positions. */
  freeIndices(): number[];
}
