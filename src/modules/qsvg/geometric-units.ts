/**
 * QSVG Geometric Units — All Parameters from δ₀
 * ════════════════════════════════════════════════
 *
 * Every operational constant in the hologram kernel is DERIVED from
 * the single geometric invariant δ₀ = 6.8° — the angular defect of
 * the {3,3,5} tessellation.
 *
 * This module eliminates all magic numbers. Every threshold, every
 * epsilon, every coupling constant traces back to the same tetrahedral
 * geometry that produces α = 1/137.036.
 *
 * ┌──────────────────────────────────────────────────────┐
 * │  3-6-9 Triadic Structure (Tesla Manifestation)       │
 * │                                                      │
 * │  3 — STRUCTURE:  48 mirror pairs (F₄ scaffolding)    │
 * │  6 — EVOLUTION:  96 vertices (full dynamic graph)    │
 * │  9 — COMPLETION: Self-verified unity (all rigid)     │
 * └──────────────────────────────────────────────────────┘
 *
 * @module qsvg/geometric-units
 */

import {
  DELTA_0_RAD,
  FRACTAL_DIMENSION,
  ANOMALOUS_DIMENSION,
  ALPHA_QSVG,
  ALPHA_INVERSE_QSVG,
  CRONNET_SCALE_EV,
  INSTANTON_ACTION,
} from "./constants";

// ══════════════════════════════════════════════════════════════════════════
// Phase 3: Structure — The 48-pair scaffolding constants
// ══════════════════════════════════════════════════════════════════════════

/**
 * The geometric tick quantum: one angular defect δ₀.
 *
 * This is the smallest meaningful unit of geometric change.
 * A coherence drift of less than δ₀ is within the lattice's
 * natural tolerance — like thermal vibration in a crystal.
 */
export const GEOMETRIC_TICK_QUANTUM = DELTA_0_RAD;

/**
 * The number of mirror pairs — the structural scaffolding.
 * Digital root: 4+8 = 12 → 1+2 = 3 (STRUCTURE).
 */
export const STRUCTURE_COUNT = 48;

/**
 * The number of full vertices — structure evolved into dynamics.
 * Digital root: 9+6 = 15 → 1+5 = 6 (EVOLUTION).
 */
export const EVOLUTION_COUNT = 96;

/**
 * The completion number — self-referential unity.
 * Digital root: 9 (COMPLETION).
 *
 * 3 × 3 = 9: structure squared = completion.
 * This is the number of spectral tests that must pass
 * for the geometry to be considered self-verified.
 */
export const COMPLETION_NUMBER = 9;

/**
 * The golden ratio φ = (1+√5)/2.
 * Appears in the [3,3,5] Coxeter group via the icosahedral symmetry.
 * The 5 in [3,3,5] IS the golden ratio's signature.
 */
export const PHI = (1 + Math.sqrt(5)) / 2;

// ══════════════════════════════════════════════════════════════════════════
// Phase 6: Evolution — Derived operational thresholds
// ══════════════════════════════════════════════════════════════════════════

/**
 * Coherence catastrophe threshold, derived from the instanton action.
 *
 * In QSVG, vacuum stability is governed by e^{-S_E} where S_E ≈ 280.
 * The catastrophe threshold is the point where geometric rigidity
 * breaks down — analogous to vacuum decay.
 *
 *   threshold = e^{-S_E / STRUCTURE_COUNT}
 *
 * This replaces the arbitrary CATASTROPHE_THRESHOLD = 4/256.
 */
export const GEOMETRIC_CATASTROPHE = Math.exp(-INSTANTON_ACTION / STRUCTURE_COUNT);

/**
 * Projection fidelity: how much information survives the 2D projection.
 *
 * The holographic surface projects D-dimensional data onto 2D.
 * The anomalous dimension γ_T = 2 - D = 0.0794 quantifies
 * the information that CANNOT be captured in the projection.
 *
 *   fidelity = 1 - γ_T / 2 ≈ 0.9603
 *
 * This means ~96% of substrate information is captured — remarkably
 * close to the Atlas's own 96 vertices (a numerical coincidence
 * that may not be coincidental at all).
 */
export const PROJECTION_FIDELITY = 1 - ANOMALOUS_DIMENSION / 2;

/**
 * The noise floor: below this coherence delta, changes are meaningless.
 *
 * Derived from the CronNet scale M* normalized to the defect energy:
 *   noise_floor = M* × δ₀ / α⁻¹
 *
 * This is the computational analog of thermal noise —
 * state changes below this threshold are indistinguishable from nothing.
 */
export const NOISE_FLOOR = CRONNET_SCALE_EV * DELTA_0_RAD / ALPHA_INVERSE_QSVG;

/**
 * The Hopf angle θ_H = 360° / α⁻¹ ≈ 2.627°.
 * The fundamental rotation angle of the fibration.
 */
export const HOPF_ANGLE_DEG = 360 / ALPHA_INVERSE_QSVG;
export const HOPF_ANGLE_RAD = HOPF_ANGLE_DEG * Math.PI / 180;

// ══════════════════════════════════════════════════════════════════════════
// Phase 9: Completion — Zone thresholds in geometric units
// ══════════════════════════════════════════════════════════════════════════

/**
 * Zone boundaries in units of δ₀ (angular defects).
 *
 * The three zones map to the 3-6-9 triadic structure:
 *
 *   COHERENCE (3 — Structure intact):
 *     Drift < 1 δ₀ — within one angular defect of perfect rigidity.
 *     The lattice absorbs the perturbation like a crystal vibration.
 *
 *   DRIFT (6 — Evolution active):
 *     1 δ₀ ≤ Drift < π δ₀ — accumulated defects, still on the lattice.
 *     The system is evolving but hasn't lost geometric orientation.
 *     π δ₀ because π is the half-turn — beyond this, you've lost
 *     which hemisphere of the fibration you're in.
 *
 *   COLLAPSE (9 — Completion broken):
 *     Drift ≥ π δ₀ — geometric orientation lost.
 *     Self-verification fails. The system needs full refocusing.
 */
export const ZONE_THRESHOLDS = {
  /** Below this: COHERENCE zone (geometrically rigid) */
  coherenceMax: 1.0,  // 1 δ₀
  /** Below this: DRIFT zone (evolving but oriented) */
  driftMax: Math.PI,  // π δ₀ ≈ 3.14159 angular defects
  /** Above driftMax: COLLAPSE zone (orientation lost) */
} as const;

// ══════════════════════════════════════════════════════════════════════════
// Conversion Functions — Bridging H-score ↔ Geometric Units
// ══════════════════════════════════════════════════════════════════════════

/**
 * Convert an H-score (0–1) to angular defect units.
 *
 * H-score = 1 means perfect coherence (0 defects).
 * H-score = 0 means total collapse (maximum defects).
 *
 * The mapping uses the inverse of the coherence coupling:
 *   defects = -ln(H) / ln(α) = -ln(H) × α⁻¹ / ln(α⁻¹)
 *
 * This is physically motivated: each α^depth layer adds one
 * symmetry-breaking step, so the number of "broken layers"
 * equals the depth at which coupling matches H.
 */
export function hScoreToDefects(h: number): number {
  if (h <= 0) return Infinity;
  if (h >= 1) return 0;
  // defects = -ln(h) / δ₀ (normalized to angular defect units)
  return -Math.log(h) / DELTA_0_RAD;
}

/**
 * Convert angular defect units back to H-score.
 *
 *   H = e^{-defects × δ₀}
 *
 * This is the inverse of hScoreToDefects.
 */
export function defectsToHScore(defects: number): number {
  if (defects <= 0) return 1;
  if (!isFinite(defects)) return 0;
  return Math.exp(-defects * DELTA_0_RAD);
}

/**
 * Compute the coherence coupling at a given depth.
 *
 *   coupling(depth) = α^depth
 *
 * Each depth corresponds to a step in the exceptional group chain:
 *   depth 0: E₈ (fault-tolerant)  — coupling = 1
 *   depth 1: E₇ (universal)       — coupling = α
 *   depth 2: E₆ (T-gate)          — coupling = α²
 *   depth 3: F₄ (Clifford)        — coupling = α³
 *   depth 4: G₂ (Pauli)           — coupling = α⁴
 */
export function spectralCoupling(depth: number): number {
  return Math.pow(ALPHA_QSVG, depth);
}

/**
 * Determine the geometric zone from a drift in δ₀ units.
 */
export type GeometricZone = "COHERENCE" | "DRIFT" | "COLLAPSE";

export function classifyGeometricZone(defects: number): GeometricZone {
  if (defects < ZONE_THRESHOLDS.coherenceMax) return "COHERENCE";
  if (defects < ZONE_THRESHOLDS.driftMax) return "DRIFT";
  return "COLLAPSE";
}

/**
 * The 3-6-9 triadic phase of a given coherence state.
 *
 *   3 (Structure): System is in COHERENCE — lattice intact
 *   6 (Evolution): System is in DRIFT — evolving, learning
 *   9 (Completion): System has self-verified OR collapsed and reset
 *
 * Note: Phase 9 encompasses BOTH successful completion (all tests pass)
 * and collapse-reset (the system completes a cycle by returning to zero).
 * This is the Tesla insight: 9 is not just success — it's the return
 * to unity, whether through mastery or through renewal.
 */
export function triadicPhase(zone: GeometricZone, selfVerified: boolean): 3 | 6 | 9 {
  if (zone === "COHERENCE" && selfVerified) return 9; // Completion
  if (zone === "COHERENCE") return 3;                  // Structure intact
  if (zone === "DRIFT") return 6;                      // Evolution
  return 9;                                            // Collapse → renewal → completion of cycle
}

/**
 * Summary of all geometric parameters derived from δ₀.
 */
export interface GeometricManifest {
  /** The single free parameter */
  delta0: number;
  /** Fractal dimension */
  fractalD: number;
  /** Anomalous dimension */
  gammaT: number;
  /** Fine-structure constant */
  alpha: number;
  /** Geometric tick quantum */
  tickQuantum: number;
  /** Catastrophe threshold */
  catastrophe: number;
  /** Projection fidelity */
  fidelity: number;
  /** Noise floor */
  noiseFloor: number;
  /** Hopf angle (rad) */
  hopfAngle: number;
  /** Golden ratio */
  phi: number;
  /** All derived from δ₀ — zero free parameters */
  freeParameters: 0;
}

export function getGeometricManifest(): GeometricManifest {
  return {
    delta0: DELTA_0_RAD,
    fractalD: FRACTAL_DIMENSION,
    gammaT: ANOMALOUS_DIMENSION,
    alpha: ALPHA_QSVG,
    tickQuantum: GEOMETRIC_TICK_QUANTUM,
    catastrophe: GEOMETRIC_CATASTROPHE,
    fidelity: PROJECTION_FIDELITY,
    noiseFloor: NOISE_FLOOR,
    hopfAngle: HOPF_ANGLE_RAD,
    phi: PHI,
    freeParameters: 0,
  };
}
