/**
 * UOR Foundation v2.0.0. kernel::monoidal
 *
 * Sequential composition via monoidal product A ⊗ B.
 *
 * @see foundation/src/kernel/monoidal.rs
 * @namespace monoidal/
 */

/** MonoidalProduct. the tensor product A ⊗ B of two ring elements. */
export interface MonoidalProduct {
  /** Left operand. */
  left(): number;
  /** Right operand. */
  right(): number;
  /** Result of the product. */
  result(): number;
  /** Quantum level. */
  quantum(): number;
}

/** MonoidalUnit. the unit object I such that A ⊗ I ≅ A. */
export interface MonoidalUnit {
  /** Unit value (typically 0 or 1 depending on operation). */
  value(): number;
  /** Quantum level. */
  quantum(): number;
}

/** MonoidalCategory. a monoidal structure on the ring. */
export interface MonoidalCategory {
  /** The tensor product operation. */
  tensor(a: number, b: number): MonoidalProduct;
  /** The unit object. */
  unit(): MonoidalUnit;
  /** Whether this monoidal structure is symmetric. */
  isSymmetric(): boolean;
}
