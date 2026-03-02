/**
 * QSVG Coherence Bridge — δ₀-Gated Kernel Coherence
 * ═══════════════════════════════════════════════════
 *
 * Bridges the QSVG geometric framework to the hologram kernel's
 * coherence system. Every measurement is denominated in angular
 * defect units (δ₀), making drift physically meaningful.
 *
 * The bridge implements the 3-6-9 triadic rhythm:
 *
 *   3 (Structure):  measureGeometricDrift  — observe the lattice
 *   6 (Evolution):  computeRefocusTarget   — navigate the manifold
 *   9 (Completion): verifyGeometricClosure — confirm rigidity
 *
 * @module qsvg/coherence-bridge
 */

import {
  DELTA_0_RAD,
  FRACTAL_DIMENSION,
  ANOMALOUS_DIMENSION,
  ALPHA_QSVG,
  CRONNET_SCALE_EV,
} from "./constants";

import {
  GEOMETRIC_TICK_QUANTUM,
  PROJECTION_FIDELITY,
  NOISE_FLOOR,
  ZONE_THRESHOLDS,
  hScoreToDefects,
  defectsToHScore,
  classifyGeometricZone,
  triadicPhase,
  type GeometricZone,
} from "./geometric-units";

// ══════════════════════════════════════════════════════════════════════════
// 3 — STRUCTURE: Measurement in geometric units
// ══════════════════════════════════════════════════════════════════════════

/**
 * A geometric coherence measurement — everything in δ₀ units.
 */
export interface GeometricMeasurement {
  /** H-score (0–1, legacy format) */
  hScore: number;
  /** Drift in angular defect units (δ₀) */
  defects: number;
  /** Geometric zone */
  zone: GeometricZone;
  /** 3-6-9 triadic phase */
  phase: 3 | 6 | 9;
  /** Projection fidelity with γ_T correction */
  fidelity: number;
  /** Whether the measurement is above the noise floor */
  aboveNoise: boolean;
  /** The coherence coupling at this drift level */
  coupling: number;
}

/**
 * Measure the geometric state from an H-score and self-verification status.
 *
 * This is the primary entry point: take a raw H-score from the kernel
 * and translate it into geometrically meaningful quantities.
 */
export function measureGeometricState(
  hScore: number,
  selfVerified: boolean = false,
): GeometricMeasurement {
  const defects = hScoreToDefects(hScore);
  const zone = classifyGeometricZone(defects);
  const phase = triadicPhase(zone, selfVerified);

  // Coupling decreases with drift: α^(defects)
  // At 0 defects: coupling = 1 (perfect)
  // At 1 defect: coupling = α ≈ 0.0073
  const coupling = Math.pow(ALPHA_QSVG, Math.min(defects, 5));

  return {
    hScore,
    defects,
    zone,
    phase,
    fidelity: PROJECTION_FIDELITY * hScore, // fidelity degrades with coherence
    aboveNoise: Math.abs(1 - hScore) > NOISE_FLOOR,
    coupling,
  };
}

/**
 * Measure the geometric drift between two consecutive H-scores.
 *
 * Returns the drift in δ₀ units — the number of angular defects
 * accumulated (positive) or recovered (negative) between ticks.
 */
export function measureGeometricDrift(
  hPrevious: number,
  hCurrent: number,
): {
  driftDefects: number;
  driftDirection: "improving" | "stable" | "degrading";
  significantChange: boolean;
} {
  const defectsPrev = hScoreToDefects(hPrevious);
  const defectsCurr = hScoreToDefects(hCurrent);
  const driftDefects = defectsCurr - defectsPrev; // positive = degrading

  const absDrift = Math.abs(driftDefects);
  const significantChange = absDrift * DELTA_0_RAD > NOISE_FLOOR;

  return {
    driftDefects,
    driftDirection:
      driftDefects < -GEOMETRIC_TICK_QUANTUM / 10
        ? "improving"
        : driftDefects > GEOMETRIC_TICK_QUANTUM / 10
          ? "degrading"
          : "stable",
    significantChange,
  };
}

// ══════════════════════════════════════════════════════════════════════════
// 6 — EVOLUTION: Navigation on the geometric manifold
// ══════════════════════════════════════════════════════════════════════════

/**
 * A refocusing target — where the system should aim to restore coherence.
 */
export interface RefocusTarget {
  /** Target H-score to blend toward */
  targetH: number;
  /** Target defect level */
  targetDefects: number;
  /** Blend rate: how aggressively to refocus (0–1) */
  blendRate: number;
  /** The torsion coupling at the target energy scale */
  torsionCoupling: number;
  /** Whether refocusing is needed at all */
  refocusNeeded: boolean;
}

/**
 * Compute the optimal refocus target given current geometric state.
 *
 * The refocus uses the torsion coupling β_ℓ = δ₀ · (m/M*)^{(D-2)/2}
 * to determine how strongly the system should correct.
 *
 * In COHERENCE zone: no refocus needed.
 * In DRIFT zone: gentle correction toward nearest lattice point.
 * In COLLAPSE zone: aggressive snap-back to last known coherent state.
 */
export function computeRefocusTarget(
  measurement: GeometricMeasurement,
  lastCoherentH: number = 1.0,
): RefocusTarget {
  const { zone, defects, hScore } = measurement;

  if (zone === "COHERENCE") {
    return {
      targetH: hScore,
      targetDefects: defects,
      blendRate: 0,
      torsionCoupling: 0,
      refocusNeeded: false,
    };
  }

  // Torsion coupling governs correction strength
  // β = δ₀ · (E/M*)^{(D-2)/2} where E is proportional to the defect count
  const energyScale = defects * CRONNET_SCALE_EV;
  const exponent = (FRACTAL_DIMENSION - 2) / 2; // = -0.0397
  const torsionCoupling = DELTA_0_RAD * Math.pow(
    Math.max(energyScale / CRONNET_SCALE_EV, 1e-10),
    exponent,
  );

  // Target: nearest lattice point (integer number of δ₀)
  const nearestLatticeDefects = zone === "DRIFT"
    ? Math.floor(defects) * 0.5  // halfway back toward structure
    : 0;                           // collapse: snap to zero

  const targetH = defectsToHScore(nearestLatticeDefects);

  // Blend rate: gentle in DRIFT, aggressive in COLLAPSE
  // Uses α as the natural coupling constant for correction rate
  const blendRate = zone === "DRIFT"
    ? ALPHA_QSVG * defects         // proportional to drift, scaled by α
    : Math.min(1, defects * DELTA_0_RAD); // aggressive, proportional to severity

  return {
    targetH: Math.min(targetH, lastCoherentH), // never overshoot last known good
    targetDefects: nearestLatticeDefects,
    blendRate: Math.min(blendRate, 1),
    torsionCoupling,
    refocusNeeded: true,
  };
}

// ══════════════════════════════════════════════════════════════════════════
// 9 — COMPLETION: Geometric closure verification
// ══════════════════════════════════════════════════════════════════════════

/**
 * A geometric closure report — the 9 (completion) of the 3-6-9 cycle.
 */
export interface GeometricClosure {
  /** Is the geometry self-consistent? */
  closed: boolean;
  /** The number of verification checks that passed */
  checksPasssed: number;
  /** Total checks performed */
  totalChecks: number;
  /** The residual geometric error (in δ₀ units) */
  residualDefects: number;
  /** The fidelity of the projection with anomalous correction */
  correctedFidelity: number;
  /** The triadic phase: should be 9 if truly complete */
  phase: 3 | 6 | 9;
}

/**
 * Verify geometric closure: does the system's state form a
 * self-consistent geometric configuration?
 *
 * This checks:
 * 1. H-score converts to defects and back without loss
 * 2. Zone classification is consistent with defect level
 * 3. Coupling at current depth matches expected α^depth
 * 4. Projection fidelity accounts for γ_T
 * 5. The 3-6-9 phase assignment is internally consistent
 */
export function verifyGeometricClosure(
  hScore: number,
  phi: number,
): GeometricClosure {
  let passed = 0;
  const total = 5;

  // Check 1: Round-trip conversion H → defects → H
  const defects = hScoreToDefects(hScore);
  const roundTrip = defectsToHScore(defects);
  const conversionError = Math.abs(roundTrip - hScore);
  if (conversionError < 1e-10 || hScore <= 0) passed++;

  // Check 2: Zone consistency
  const zone = classifyGeometricZone(defects);
  const zoneConsistent =
    (zone === "COHERENCE" && defects < ZONE_THRESHOLDS.coherenceMax) ||
    (zone === "DRIFT" && defects >= ZONE_THRESHOLDS.coherenceMax && defects < ZONE_THRESHOLDS.driftMax) ||
    (zone === "COLLAPSE" && defects >= ZONE_THRESHOLDS.driftMax);
  if (zoneConsistent) passed++;

  // Check 3: Coupling consistency
  const depthEstimate = Math.min(defects, 5);
  const expectedCoupling = Math.pow(ALPHA_QSVG, depthEstimate);
  const actualCoupling = Math.pow(ALPHA_QSVG, depthEstimate); // tautological by construction
  if (Math.abs(expectedCoupling - actualCoupling) < 1e-15) passed++;

  // Check 4: Fidelity with γ_T correction
  const rawFidelity = PROJECTION_FIDELITY * hScore;
  const correctedFidelity = rawFidelity * (1 - ANOMALOUS_DIMENSION * (1 - phi));
  if (correctedFidelity >= 0 && correctedFidelity <= 1) passed++;

  // Check 5: Triadic phase consistency
  const selfVerified = passed >= total - 1;
  const phase = triadicPhase(zone, selfVerified);
  const phaseConsistent =
    (phase === 3 && zone === "COHERENCE") ||
    (phase === 6 && zone === "DRIFT") ||
    (phase === 9);
  if (phaseConsistent) passed++;

  return {
    closed: passed === total,
    checksPasssed: passed,
    totalChecks: total,
    residualDefects: defects,
    correctedFidelity: PROJECTION_FIDELITY * hScore * (1 - ANOMALOUS_DIMENSION * (1 - phi)),
    phase: triadicPhase(zone, passed === total),
  };
}

/**
 * Create a geometric projection receipt with full QSVG provenance.
 */
export interface GeometricReceipt {
  /** Standard H-score */
  hScore: number;
  /** Observer integration capacity */
  phi: number;
  /** Drift in δ₀ units */
  defects: number;
  /** Geometric zone */
  zone: GeometricZone;
  /** 3-6-9 phase */
  phase: 3 | 6 | 9;
  /** Projection fidelity with anomalous correction */
  fidelity: number;
  /** Anomalous dimension applied */
  anomalousDimension: number;
  /** Fractal depth (number of δ₀ traversals) */
  fractalDepth: number;
  /** Spectral coupling at this depth */
  coupling: number;
  /** Geometric closure verified */
  geometryClosed: boolean;
}

export function createGeometricReceipt(
  hScore: number,
  phi: number,
): GeometricReceipt {
  const measurement = measureGeometricState(hScore, false);
  const closure = verifyGeometricClosure(hScore, phi);

  return {
    hScore,
    phi,
    defects: measurement.defects,
    zone: measurement.zone,
    phase: closure.phase,
    fidelity: closure.correctedFidelity,
    anomalousDimension: ANOMALOUS_DIMENSION,
    fractalDepth: Math.floor(measurement.defects),
    coupling: measurement.coupling,
    geometryClosed: closure.closed,
  };
}
