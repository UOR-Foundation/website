/**
 * UOR Foundation v2.0.0. kernel::carry
 *
 * Carry chain algebra, carry profiles, encoding quality.
 *
 * @see foundation/src/kernel/carry.rs
 * @namespace carry/
 */

/** CarryBit. a single carry event in addition. */
export interface CarryBit {
  /** Bit position where carry occurred. */
  position(): number;
  /** Whether this carry propagated further. */
  propagated(): boolean;
}

/** CarryChain. sequence of carry events for an addition operation. */
export interface CarryChain {
  /** Ordered carry bits. */
  carries(): CarryBit[];
  /** Length of the longest carry propagation chain. */
  maxPropagation(): number;
  /** Total number of carry events. */
  count(): number;
}

/** CarryProfile. carry behavior profile for a pair of operands. */
export interface CarryProfile {
  /** The carry chain for a + b. */
  chain(): CarryChain;
  /** Ratio of carry positions to total bit width. */
  density(): number;
  /** Whether any carry chain spans the full width (overflow). */
  overflows(): boolean;
}

/** EncodingQuality. measures how well a value encodes information. */
export interface EncodingQuality {
  /** Entropy of the byte representation. */
  entropy(): number;
  /** Carry complexity when adding 1. */
  incrementComplexity(): number;
  /** Overall quality score [0, 1]. */
  score(): number;
}
