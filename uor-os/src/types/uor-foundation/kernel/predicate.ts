/**
 * UOR Foundation v2.0.0. kernel::predicate
 *
 * Boolean-valued functions, dispatch tables, match expressions.
 *
 * @see foundation/src/kernel/predicate.rs
 * @namespace predicate/
 */

import type { QuantifierKind } from "../enums";

/** Predicate. a boolean-valued function on ring elements. */
export interface Predicate {
  /** Predicate identifier. */
  predicateId(): string;
  /** Evaluate the predicate on a value. */
  test(value: number): boolean;
  /** Human-readable description. */
  description(): string;
}

/** QuantifiedPredicate. a predicate with a quantifier. */
export interface QuantifiedPredicate extends Predicate {
  /** Quantifier kind. */
  quantifier(): QuantifierKind;
  /** Domain of quantification (quantum level). */
  domain(): number;
  /** Whether the quantified statement holds. */
  holds(): boolean;
}

/** DispatchTable. maps values to operations based on predicates. */
export interface DispatchTable {
  /** Number of entries. */
  size(): number;
  /** Look up the operation for a given value. */
  dispatch(value: number): string | null;
  /** All predicates in dispatch order. */
  predicates(): Predicate[];
}

/** MatchArm. a single arm in a match expression. */
export interface MatchArm {
  /** The predicate guarding this arm. */
  guard(): Predicate;
  /** The result if matched. */
  result(): number;
}

/** MatchExpression. pattern matching over ring elements. */
export interface MatchExpression {
  /** Ordered match arms. */
  arms(): MatchArm[];
  /** Evaluate the match on a value. */
  evaluate(value: number): number | null;
  /** Whether the match is exhaustive. */
  isExhaustive(): boolean;
}
