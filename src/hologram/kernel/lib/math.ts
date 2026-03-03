/**
 * kernel/lib/math — Numerical Utilities
 * ≡ Linux lib/math/
 *
 * Pure mathematical helpers shared across kernel subsystems.
 */

/** Clamp value to [min, max] */
export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Linear interpolation */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/** Modular arithmetic (always positive result) */
export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/** Exponential moving average update */
export function emaUpdate(current: number, sample: number, alpha: number): number {
  return current + alpha * (sample - current);
}

/** Shannon entropy of a probability distribution */
export function entropy(probs: number[]): number {
  let h = 0;
  for (const p of probs) {
    if (p > 0) h -= p * Math.log2(p);
  }
  return h;
}

/** Hamming distance between two equal-length byte arrays */
export function hammingDistance(a: Uint8Array, b: Uint8Array): number {
  let d = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    let xor = a[i] ^ b[i];
    while (xor) { d++; xor &= xor - 1; }
  }
  return d;
}
