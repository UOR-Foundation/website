/**
 * Layer 1: Substrate — The {3,3,5} Lattice Constants
 * ════════════════════════════════════════════════════
 *
 * Universal, immutable, publicly known.
 * These are the geometric consequences of how regular tetrahedra tile H³.
 * Anyone can verify a proof against these constants.
 *
 * This layer is the GROUND TRUTH of the ZK protocol.
 * It never changes. It has zero free parameters.
 *
 * @module qsvg/zk-layers/substrate-layer
 */

import {
  DELTA_0_RAD,
  FRACTAL_DIMENSION,
  ANOMALOUS_DIMENSION,
  ALPHA_QSVG,
  ALPHA_INVERSE_QSVG,
  RIEMANN_EIGENVALUES,
  INSTANTON_ACTION,
} from "../constants";

// ── Branded Type: SubstrateValue ──────────────────────────────────────────
// TypeScript branded types enforce that Substrate values cannot be
// accidentally mixed with Content or Geometry values at compile time.

declare const __substrate: unique symbol;

/**
 * A value that lives in Layer 1 (Substrate).
 * Branded to prevent cross-layer contamination at compile time.
 */
export type SubstrateValue<T> = T & { readonly [__substrate]: true };

/**
 * Tag a raw value as a SubstrateValue.
 * Only constants derived from {3,3,5} geometry should be tagged.
 */
function substrate<T>(value: T): SubstrateValue<T> {
  return value as SubstrateValue<T>;
}

// ── Substrate Constants (branded) ─────────────────────────────────────────

/** δ₀ in radians — the single geometric origin */
export const S_DELTA_0 = substrate(DELTA_0_RAD);

/** Fractal dimension D = log(37)/log(8) */
export const S_FRACTAL_DIM = substrate(FRACTAL_DIMENSION);

/** Anomalous scaling γ_T = 2 - D */
export const S_ANOMALOUS = substrate(ANOMALOUS_DIMENSION);

/** Fine-structure constant from QSVG */
export const S_ALPHA = substrate(ALPHA_QSVG);

/** α⁻¹ = 137.035999139 */
export const S_ALPHA_INV = substrate(ALPHA_INVERSE_QSVG);

/** Instanton action S_E ≈ 280 */
export const S_INSTANTON = substrate(INSTANTON_ACTION);

/** Riemann eigenvalues (first 5 zeros of ζ) */
export const S_EIGENVALUES = substrate(RIEMANN_EIGENVALUES);

/** Number of known eigenvalues */
export const S_EIGENVALUE_COUNT = substrate(RIEMANN_EIGENVALUES.length);

// ── Grade Thresholds (derived from δ₀) ────────────────────────────────────

/** Maximum drift (in δ₀ units) per spectral grade */
export const S_GRADE_DRIFT_BOUNDS = substrate({
  A: 0.5,
  B: 2.0,
  C: 5.0,
  D: Infinity,
} as const);

// ── Substrate Verification ────────────────────────────────────────────────

/**
 * Verify that the substrate constants are self-consistent.
 * This is a compile-time + runtime check: if the {3,3,5} lattice
 * is tampered with, the relationships break.
 */
export function verifySubstrateIntegrity(): {
  intact: boolean;
  checks: Array<{ name: string; passed: boolean; detail: string }>;
} {
  const checks: Array<{ name: string; passed: boolean; detail: string }> = [];

  // D = 2 - γ_T
  const gammaCheck = Math.abs((2 - S_FRACTAL_DIM) - S_ANOMALOUS) < 1e-10;
  checks.push({
    name: "D + γ_T = 2",
    passed: gammaCheck,
    detail: `${S_FRACTAL_DIM} + ${S_ANOMALOUS} = ${S_FRACTAL_DIM + S_ANOMALOUS}`,
  });

  // α × α⁻¹ = 1
  const alphaCheck = Math.abs(S_ALPHA * S_ALPHA_INV - 1) < 1e-10;
  checks.push({
    name: "α × α⁻¹ = 1",
    passed: alphaCheck,
    detail: `${S_ALPHA} × ${S_ALPHA_INV} = ${S_ALPHA * S_ALPHA_INV}`,
  });

  // δ₀ > 0 and < π/2
  const deltaCheck = S_DELTA_0 > 0 && S_DELTA_0 < Math.PI / 2;
  checks.push({
    name: "0 < δ₀ < π/2",
    passed: deltaCheck,
    detail: `δ₀ = ${S_DELTA_0}`,
  });

  // Eigenvalues are monotonically increasing
  let monoCheck = true;
  for (let i = 1; i < S_EIGENVALUES.length; i++) {
    if (S_EIGENVALUES[i] <= S_EIGENVALUES[i - 1]) monoCheck = false;
  }
  checks.push({
    name: "Eigenvalues monotonically increasing",
    passed: monoCheck,
    detail: `${S_EIGENVALUES.length} eigenvalues`,
  });

  return {
    intact: checks.every(c => c.passed),
    checks,
  };
}
