/**
 * UOR Foundation v2.0.0. enforcement::term
 *
 * Term enum (AST nodes), TermArena, TermList, Binding, Assertion.
 *
 * @see foundation/src/enforcement/mod.rs
 */

/** TermKind. discriminator for AST node types. */
export type TermKind =
  | "Literal"
  | "Variable"
  | "Application"
  | "Abstraction"
  | "Let"
  | "Match"
  | "Assert";

/** Term. an AST node in the enforcement term language. */
export interface EnforcementTerm {
  /** Node kind. */
  kind(): TermKind;
  /** Child terms (for compound nodes). */
  children(): EnforcementTerm[];
  /** Literal value (for Literal nodes). */
  literalValue(): number | null;
  /** Variable name (for Variable nodes). */
  variableName(): string | null;
  /** Serialized form. */
  serialize(): string;
}

/** TermArena. an arena allocator for term nodes. */
export interface TermArena {
  /** Total nodes allocated. */
  size(): number;
  /** Get a term by index. */
  get(index: number): EnforcementTerm | null;
  /** Allocate a new term, returning its index. */
  alloc(term: EnforcementTerm): number;
}

/** TermList. an ordered list of terms. */
export interface TermList {
  /** Number of terms. */
  length(): number;
  /** Get term at index. */
  at(index: number): EnforcementTerm | null;
  /** All terms. */
  terms(): EnforcementTerm[];
}

/** EnforcementBinding. a name → term association in enforcement. */
export interface EnforcementBinding {
  /** Bound name. */
  name(): string;
  /** The term this name resolves to. */
  term(): EnforcementTerm;
  /** Binding type. */
  bindingType(): string;
}

/** Assertion. a boolean assertion over terms. */
export interface Assertion {
  /** Predicate expression (serialized). */
  predicate(): string;
  /** Expected result. */
  expected(): boolean;
  /** Actual result (after evaluation). */
  actual(): boolean | null;
  /** Whether the assertion holds. */
  holds(): boolean;
}
