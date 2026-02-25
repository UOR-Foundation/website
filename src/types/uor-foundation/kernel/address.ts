/**
 * UOR Foundation v2.0.0 — kernel::address
 *
 * Content-addressable Braille identifiers.
 *
 * @see spec/src/namespaces/address.rs
 * @namespace u/
 */

/**
 * Glyph — a single Braille character encoding a byte value.
 *
 * @disjoint Address
 */
export interface Glyph {
  /** The Unicode Braille character. */
  character(): string;
  /** The byte value [0, 255] this glyph encodes. */
  byteValue(): number;
}

/**
 * Address — a Braille string bijection of content bytes.
 * The canonical surface encoding for all UOR objects.
 *
 * @disjoint Glyph
 */
export interface Address {
  /** The full Braille glyph string. */
  glyph(): string;
  /** Number of Braille characters (= number of content bytes). */
  length(): number;
  /** The underlying byte array. */
  bytes(): number[];
}
