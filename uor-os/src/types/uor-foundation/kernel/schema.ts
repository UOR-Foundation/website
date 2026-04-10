/**
 * UOR Foundation v2.0.0 — kernel::schema
 *
 * Ring elements, term language, and ring container.
 * v0.2.0 additions: TermExpression, VariableBinding,
 * W16Ring, W32Ring, RingHomomorphism, RingExtension.
 *
 * @see spec/src/namespaces/schema.rs
 * @namespace schema/
 */

// ── Core Schema Types ──────────────────────────────────────────────────────

/** Term — the base of the term language (abstract). */
export interface Term {
  label(): string;
}

/**
 * Datum — a concrete ring element in Z/(2^n)Z.
 * The fundamental data unit of the UOR framework.
 */
export interface Datum extends Term {
  value(): number;
  quantum(): number;
  width(): number;
  bits(): number;
  bytes(): number[];
  glyph(): string;
  triad(): Triad;
  stratum(): number;
  spectrum(): number[];
}

/**
 * Triad — the canonical decomposition of a datum.
 * (datum, stratum, spectrum) triple.
 */
export interface Triad {
  datum(): number[];
  stratum(): number[];
  spectrum(): number[][];
  totalStratum(): number;
}

/** Literal — an irreducible term (leaf in the term tree). */
export interface Literal extends Term {
  datum(): Datum;
}

/** Application — a function application term (f applied to args). */
export interface Application extends Term {
  operator(): Term;
  operands(): Term[];
}

/**
 * Ring — the ring container Z/(2^n)Z.
 * Houses all datums and operations for a given quantum level.
 */
export interface Ring {
  quantum(): number;
  bits(): number;
  modulus(): bigint;
  generator(): Datum;
  zero(): Datum;
  order(): bigint;
}

// ── Named Individuals ──────────────────────────────────────────────────────

export const PI1 = {
  "@id": "schema:pi1",
  value: 1,
  label: "Ring generator",
} as const;

export const ZERO = {
  "@id": "schema:zero",
  value: 0,
  label: "Additive identity",
} as const;

// ══════════════════════════════════════════════════════════════════════════
// v0.2.0 ADDITIONS
// ══════════════════════════════════════════════════════════════════════════

/**
 * TermExpression — a rich term in the extended term language
 * with variable bindings, let-expressions, and pattern matching.
 * Generalises the basic Application/Literal terms.
 *
 * @see spec/src/namespaces/schema.rs — TermExpression
 */
export interface TermExpression extends Term {
  /** Expression kind ("Var" | "Let" | "Match" | "Apply" | "Literal"). */
  expressionKind(): "Var" | "Let" | "Match" | "Apply" | "Literal";
  /** Free variables in this expression. */
  freeVariables(): string[];
  /** Bound variables in this expression. */
  boundVariables(): string[];
  /** Whether the expression is in normal form. */
  isNormalForm(): boolean;
  /** Term size (number of AST nodes). */
  size(): number;
}

/**
 * VariableBinding — a let-binding or lambda-binding of a name to a term.
 * Used in TermExpression for structured computation.
 *
 * @see spec/src/namespaces/schema.rs — VariableBinding
 */
export interface VariableBinding {
  /** Variable name. */
  name(): string;
  /** Bound term. */
  boundTerm(): Term;
  /** Binding scope ("Let" | "Lambda" | "Pattern"). */
  scope(): "Let" | "Lambda" | "Pattern";
  /** Whether the binding is recursive (letrec). */
  isRecursive(): boolean;
}

/**
 * W16Ring — the ring Z/(2^16)Z (quantum level Q1, 16-bit).
 * Extension of the base 8-bit ring to 16-bit word width.
 *
 * @see spec/src/namespaces/schema.rs — W16Ring
 */
export interface W16Ring extends Ring {
  /** Always 1 (Q1). */
  quantum(): 1;
  /** Always 16. */
  bits(): 16;
  /** Embed an 8-bit datum into this 16-bit ring. */
  embedQ0(value: number): number;
  /** Project a 16-bit datum down to 8-bit (lossy). */
  projectQ0(value: number): number;
}

/**
 * W32Ring — the ring Z/(2^32)Z (quantum level Q3, 32-bit).
 *
 * @see spec/src/namespaces/schema.rs — W32Ring
 */
export interface W32Ring extends Ring {
  /** Always 3 (Q3). */
  quantum(): 3;
  /** Always 32. */
  bits(): 32;
  /** Embed a 16-bit datum into this 32-bit ring. */
  embedQ1(value: number): number;
  /** Project a 32-bit datum down to 16-bit (lossy). */
  projectQ1(value: number): number;
}

/**
 * RingHomomorphism — a structure-preserving map φ: R → S between
 * two rings. Preserves addition and multiplication:
 *   φ(a + b) = φ(a) + φ(b)
 *   φ(a × b) = φ(a) × φ(b)
 *
 * @see spec/src/namespaces/schema.rs — RingHomomorphism
 */
export interface RingHomomorphism {
  /** Homomorphism identifier. */
  homomorphismId(): string;
  /** Source ring. */
  source(): Ring;
  /** Target ring. */
  target(): Ring;
  /** Apply the homomorphism to a value. */
  apply(value: number): number;
  /** Whether the homomorphism is injective. */
  isInjective(): boolean;
  /** Whether the homomorphism is surjective. */
  isSurjective(): boolean;
  /** Kernel size (number of elements mapping to zero). */
  kernelSize(): number;
}

/**
 * RingExtension — R ⊂ S where S is an extension ring of R.
 * Models the Cayley-Dickson tower: Q0 ⊂ Q1 ⊂ Q3 ⊂ Q7.
 *
 * @see spec/src/namespaces/schema.rs — RingExtension
 */
export interface RingExtension {
  /** Base ring R. */
  baseRing(): Ring;
  /** Extension ring S. */
  extensionRing(): Ring;
  /** Embedding homomorphism R → S. */
  embedding(): RingHomomorphism;
  /** Extension degree [S : R]. */
  degree(): number;
  /** Whether the extension is Galois. */
  isGalois(): boolean;
}
