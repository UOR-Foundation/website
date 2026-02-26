/**
 * UOR Foundation v2.0.0 — Primitives Type Family
 *
 * The TypeScript equivalent of Rust's `Primitives` trait.
 * Every generated interface method resolves through this family.
 * Implementors (e.g. PRISM) choose concrete representations per quantum level.
 *
 * @see foundation/src/user.rs — trait Primitives
 */

/** Primitive type family — maps Rust generic P to concrete TS types. */
export interface Primitives {
  String: string;
  Integer: bigint;
  NonNegativeInteger: bigint;
  PositiveInteger: bigint;
  Decimal: number;
  Boolean: boolean;
}

/** Default concrete implementation (equivalent to PRISM's impl). */
export type P = Primitives;
