/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  AXIOM-RING  —  Z/256Z Pure Arithmetic                  ║
 * ║                                                          ║
 * ║  The irreducible algebraic foundation.                   ║
 * ║  Zero imports. Zero dependencies. Pure mathematics.      ║
 * ║                                                          ║
 * ║  Every operation in the entire Hologram OS is a          ║
 * ║  composition of these primitives.                        ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * Ring: Z/256Z  (integers mod 256)
 * Carrier set: {0, 1, 2, …, 255}
 * Operations: add, mul, neg, bnot, succ, pred
 *
 * Critical Identity (the coherence axiom):
 *   ∀ x ∈ Z/256Z :  neg(bnot(x)) ≡ succ(x)
 *
 * This single equation is the kernel's self-test.
 * If it holds for all 256 elements, the ring is coherent.
 * If it fails for any element, the universe is broken.
 */

// ── The Quantum: bit-width of reality ─────────────────────
export const Q = 8;
export const N = 1 << Q;          // 256
export const MASK = (N - 1) | 0;  // 0xFF

// ── Type: a ring element is just a byte ───────────────────
export type RingElement = number;  // 0..255

// ── Reduction: project any integer into the ring ──────────
export function mod(x: number): RingElement {
  return ((x % N) + N) & MASK;
}

// ── Ring Operations ───────────────────────────────────────
export function add(a: RingElement, b: RingElement): RingElement {
  return (a + b) & MASK;
}

export function mul(a: RingElement, b: RingElement): RingElement {
  return ((a * b) & 0xFFFF) & MASK;  // intermediate ≤ 255*255 = 65025
}

export function neg(x: RingElement): RingElement {
  return (N - x) & MASK;  // additive inverse: x + neg(x) ≡ 0
}

export function succ(x: RingElement): RingElement {
  return (x + 1) & MASK;
}

export function pred(x: RingElement): RingElement {
  return (x - 1 + N) & MASK;
}

// ── Bitwise (ring-native, not imported) ───────────────────
export function bnot(x: RingElement): RingElement {
  return (~x) & MASK;  // bitwise complement within the ring
}

export function band(a: RingElement, b: RingElement): RingElement {
  return a & b;
}

export function bor(a: RingElement, b: RingElement): RingElement {
  return (a | b) & MASK;
}

export function bxor(a: RingElement, b: RingElement): RingElement {
  return (a ^ b) & MASK;
}

// ── Shifts (used by SHA-256) ──────────────────────────────
export function shr(x: number, n: number): number {
  return x >>> n;
}

export function rotr32(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}

// ── The Critical Identity ─────────────────────────────────
/**
 * neg(bnot(x)) ≡ succ(x)
 *
 * Proof sketch:
 *   bnot(x) = 255 - x        (bitwise complement in Z/256Z)
 *   neg(bnot(x)) = 256 - (255 - x) = x + 1 = succ(x)  ∎
 *
 * This is not arbitrary — it encodes the deep relationship
 * between additive inversion and bitwise complementation.
 * It is the Hologram's heartbeat.
 */
export function verifyCriticalIdentity(x: RingElement): boolean {
  return neg(bnot(x)) === succ(x);
}

/**
 * Exhaustive verification: test all 256 elements.
 * Returns true if and only if the ring is coherent.
 * This is POST check #1 — the first thing the kernel does.
 */
export function verifyRingCoherence(): boolean {
  for (let x = 0; x < N; x++) {
    if (!verifyCriticalIdentity(x)) return false;
  }
  return true;
}

// ── ByteTuple: the ring's native data structure ───────────
/**
 * A ByteTuple is an array of ring elements.
 * It is the universal container: hashes are 32-byte tuples,
 * CIDs are variable-length tuples, messages are tuples.
 * Everything is bytes. Bytes are ring elements.
 */
export type ByteTuple = Uint8Array;

export function byteTuple(bytes: number[] | Uint8Array): ByteTuple {
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

export function bytesEqual(a: ByteTuple, b: ByteTuple): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function concatBytes(...arrays: ByteTuple[]): ByteTuple {
  let len = 0;
  for (const a of arrays) len += a.length;
  const out = new Uint8Array(len);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

// ── Hex encoding (ring-native) ────────────────────────────
const HEX = "0123456789abcdef";

export function toHex(bytes: ByteTuple): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) {
    s += HEX[bytes[i] >> 4] + HEX[bytes[i] & 0x0f];
  }
  return s;
}

export function fromHex(hex: string): ByteTuple {
  const len = hex.length >> 1;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return out;
}

// ── UTF-8 encoding (ring-native) ──────────────────────────
export function encodeUtf8(str: string): ByteTuple {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

export function decodeUtf8(bytes: ByteTuple): string {
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}
