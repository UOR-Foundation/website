/**
 * UOR Foundation v2.0.0 — kernel::schema
 *
 * Ring elements, term language, and ring container.
 *
 * @see spec/src/namespaces/schema.rs
 * @namespace schema/
 */

/**
 * Term — the base of the term language (abstract).
 * All schema types are terms.
 */
export interface Term {
  /** Human-readable label for this term. */
  label(): string;
}

/**
 * Datum — a concrete ring element in Z/(2^n)Z.
 * The fundamental data unit of the UOR framework.
 *
 * @disjoint Literal, Application, Ring
 */
export interface Datum extends Term {
  /** Numeric value in [0, 2^bits). */
  value(): number;
  /** Quantum level (width - 1). */
  quantum(): number;
  /** Byte width. */
  width(): number;
  /** Bit count (8 × width). */
  bits(): number;
  /** Big-endian byte representation. */
  bytes(): number[];
  /** Braille glyph address. */
  glyph(): string;
  /** Triad decomposition. */
  triad(): Triad;
  /** Popcount (Hamming weight). */
  stratum(): number;
  /** Basis element indices. */
  spectrum(): number[];
}

/**
 * Triad — the canonical decomposition of a datum.
 * (datum, stratum, spectrum) triple.
 *
 * @disjoint Datum, Literal, Application
 */
export interface Triad {
  /** Big-endian byte tuple. */
  datum(): number[];
  /** Popcount per byte position. */
  stratum(): number[];
  /** LSB-indexed basis elements per byte. */
  spectrum(): number[][];
  /** Sum of stratum values. */
  totalStratum(): number;
}

/**
 * Literal — an irreducible term (leaf in the term tree).
 *
 * @disjoint Datum, Triad, Application
 */
export interface Literal extends Term {
  /** The datum this literal wraps. */
  datum(): Datum;
}

/**
 * Application — a function application term (f applied to args).
 *
 * @disjoint Datum, Triad, Literal
 */
export interface Application extends Term {
  /** The operator being applied. */
  operator(): Term;
  /** The operand(s). */
  operands(): Term[];
}

/**
 * Ring — the ring container Z/(2^n)Z.
 * Houses all datums and operations for a given quantum level.
 *
 * @disjoint Datum, Triad, Literal, Application
 */
export interface Ring {
  /** Quantum level. */
  quantum(): number;
  /** Bit width. */
  bits(): number;
  /** Ring modulus 2^bits. */
  modulus(): bigint;
  /** Generator element (value 1). */
  generator(): Datum;
  /** Zero element (additive identity). */
  zero(): Datum;
  /** Ring cardinality (= modulus). */
  order(): bigint;
}

// ── Named Individuals ──────────────────────────────────────────────────────

/** pi1 — the ring generator (value = 1). */
export const PI1 = {
  "@id": "schema:pi1",
  value: 1,
  label: "Ring generator",
} as const;

/** zero — the additive identity (value = 0). */
export const ZERO = {
  "@id": "schema:zero",
  value: 0,
  label: "Additive identity",
} as const;
