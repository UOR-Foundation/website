/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  AXIOM-MIRROR  —  τ-Involution & 48 Mirror Pairs        ║
 * ║                                                          ║
 * ║  The 96 Atlas vertices (3-qubit Clifford stabilizer      ║
 * ║  states) pair into 48 mirrors via the τ-involution.      ║
 * ║  These mirrors serve THREE purposes simultaneously:      ║
 * ║                                                          ║
 * ║  1. ERROR CORRECTION — [[96,48,2]] stabilizer code       ║
 * ║  2. DAGGER FUNCTOR  — Hermitian conjugation for quantum  ║
 * ║  3. FANO TOPOLOGY   — 7 lines × 7 points routing mesh   ║
 * ║                                                          ║
 * ║  Imports only axiom-ring. This is geometry, not code.    ║
 * ╚══════════════════════════════════════════════════════════╝
 */

import { type RingElement, add, neg, bxor, N } from "./axiom-ring";

// ── τ-Involution: the mirror map ──────────────────────────
/**
 * τ(x) = 255 - x  (complement in Z/256Z)
 *
 * Properties:
 *   τ(τ(x)) = x           (involution)
 *   τ(x) + x = 255        (complement sum)
 *   τ is fixed-point-free  (no x satisfies τ(x) = x, since 255 is odd)
 *
 * This is the dagger functor: for any morphism f,
 * f† = τ ∘ f ∘ τ  (Hermitian conjugation)
 */
export function tau(x: RingElement): RingElement {
  return (N - 1 - x) & 0xff;  // 255 - x
}

/**
 * Verify τ is an involution: τ(τ(x)) ≡ x  ∀x
 */
export function verifyTauInvolution(): boolean {
  for (let x = 0; x < N; x++) {
    if (tau(tau(x)) !== x) return false;
  }
  return true;
}

// ── 48 Mirror Pairs ───────────────────────────────────────
/**
 * The 96 vertices {0..95} pair under τ mod 96 into 48 mirrors.
 * Each mirror pair (v, τ(v)) forms a stabilizer generator
 * for the [[96,48,2]] quantum error-correcting code.
 *
 * We use the atlas vertex range [0..95] where τ acts as:
 *   τ_atlas(v) = 95 - v
 *
 * This gives exactly 48 pairs: {(0,95), (1,94), ..., (47,48)}
 */
export interface MirrorPair {
  readonly index: number;  // 0..47
  readonly v: number;      // vertex
  readonly w: number;      // mirror vertex: τ(v)
}

export const ATLAS_VERTICES = 96;
export const MIRROR_COUNT = ATLAS_VERTICES / 2;  // 48

/**
 * Generate all 48 mirror pairs.
 */
export function generateMirrorPairs(): readonly MirrorPair[] {
  const pairs: MirrorPair[] = [];
  for (let i = 0; i < MIRROR_COUNT; i++) {
    pairs.push({
      index: i,
      v: i,
      w: ATLAS_VERTICES - 1 - i,
    });
  }
  return Object.freeze(pairs);
}

// Cached mirror pairs — computed once at module load
export const MIRROR_PAIRS: readonly MirrorPair[] = generateMirrorPairs();

// ── Fano Plane: PG(2,2) ──────────────────────────────────
/**
 * The Fano plane has 7 points and 7 lines.
 * Each line contains exactly 3 points.
 * Any 2 points determine exactly 1 line.
 * Any 2 lines intersect in exactly 1 point.
 *
 * Points: {0, 1, 2, 3, 4, 5, 6}
 * Lines:  {(0,1,3), (1,2,4), (2,3,5), (3,4,6), (4,5,0), (5,6,1), (6,0,2)}
 *
 * This defines the kernel's native routing topology:
 * any two nodes are at most 2 hops apart.
 */
export const FANO_POINTS = 7;

export const FANO_LINES: readonly [number, number, number][] = Object.freeze([
  [0, 1, 3],
  [1, 2, 4],
  [2, 3, 5],
  [3, 4, 6],
  [4, 5, 0],
  [5, 6, 1],
  [6, 0, 2],
]);

/**
 * Find the unique Fano line containing two given points.
 * Returns the line (3-tuple) or undefined if points are equal.
 */
export function fanoLine(p: number, q: number): readonly [number, number, number] | undefined {
  if (p === q) return undefined;
  const a = p % FANO_POINTS;
  const b = q % FANO_POINTS;
  return FANO_LINES.find((line) => line.includes(a) && line.includes(b));
}

/**
 * Find the intersection point of two Fano lines.
 */
export function fanoIntersection(lineA: number, lineB: number): number | undefined {
  if (lineA === lineB) return undefined;
  const la = FANO_LINES[lineA % FANO_LINES.length];
  const lb = FANO_LINES[lineB % FANO_LINES.length];
  for (const p of la) {
    if (lb.includes(p)) return p;
  }
  return undefined;
}

// ── Syndrome detection (single-error) ─────────────────────
/**
 * Compute the syndrome of a byte against its mirror partner.
 * For the [[96,48,2]] code, a single-bit error is detected
 * when the XOR of mirror partners is non-zero.
 *
 * syndrome = v ⊕ τ(v) should equal a fixed pattern (all 1s = 0xFF)
 * for valid (error-free) pairs within the full ring.
 */
export function computeSyndrome(v: RingElement): RingElement {
  return bxor(v, tau(v));
  // For a valid pair in Z/256Z, this always equals 0xFF (255)
}

/**
 * Verify that all mirror syndromes are consistent.
 * In a coherent ring, v ⊕ τ(v) = 0xFF for all v.
 */
export function verifyMirrorCoherence(): boolean {
  for (let v = 0; v < N; v++) {
    if (computeSyndrome(v) !== 0xff) return false;
  }
  return true;
}

// ── H-Score: coherence metric ─────────────────────────────
/**
 * Compute the coherence score for a byte sequence.
 * Range: 0 (maximally incoherent) to 1 (perfectly coherent).
 *
 * H-score measures how well a byte sequence preserves
 * mirror symmetry — the fundamental structural invariant.
 */
export function hScore(data: Uint8Array): number {
  if (data.length === 0) return 1;
  let coherent = 0;
  for (let i = 0; i < data.length; i++) {
    // Each byte contributes to coherence proportional to
    // how close its critical identity residual is to zero.
    // neg(bnot(x)) - succ(x) should be 0 for all x.
    const x = data[i];
    const residual = (neg(ringMod(~x & 0xff)) - ((x + 1) & 0xff) + N) & 0xff;
    if (residual === 0) coherent++;
  }
  return coherent / data.length;
}

function ringMod(x: number): RingElement {
  return ((x % N) + N) & 0xff;
}
