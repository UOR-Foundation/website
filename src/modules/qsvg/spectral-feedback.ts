/**
 * QSVG Spectral Feedback — Critical Line Alignment for Self-Healing
 * ═══════════════════════════════════════════════════════════════════
 *
 * Wires the Riemann spectral operator into the kernel's tick cycle,
 * providing geometrically-informed self-healing.
 *
 * The core insight: "on the critical line" means the geometry is rigid.
 * Drift OFF the critical line means eigenvalues are shifting, which
 * means the lattice is deforming, which means coherence is breaking.
 *
 * This module provides LIGHTWEIGHT spectral checks suitable for the
 * hot path — not the full 8-test verification suite, but the essential
 * critical-line alignment check that determines whether self-healing
 * should activate.
 *
 * 3-6-9 Mapping:
 *   3 — spectralHealth():     CHECK the eigenvalue alignment
 *   6 — spectralCorrection(): COMPUTE the correction rotation
 *   9 — spectralClosure():    VERIFY the correction restored rigidity
 *
 * @module qsvg/spectral-feedback
 */

import {
  ALPHA_QSVG,
  ALPHA_INVERSE_QSVG,
  RIEMANN_EIGENVALUES,
  ANOMALOUS_DIMENSION,
  DELTA_0_RAD,
} from "./constants";

import { spectralGrade } from "./spectral-verification";

import {
  GEOMETRIC_TICK_QUANTUM,
  PROJECTION_FIDELITY,
  NOISE_FLOOR,
  defectsToHScore,
  hScoreToDefects,
  type GeometricZone,
} from "./geometric-units";

// ══════════════════════════════════════════════════════════════════════════
// 3 — CHECK: Spectral Health Assessment
// ══════════════════════════════════════════════════════════════════════════

/**
 * The spectral health of the system at a given moment.
 */
export interface SpectralHealth {
  /** Epistemic grade from spectral analysis (A/B/C/D) */
  grade: string;
  /** The spectral coupling: α^(effective depth) */
  coupling: number;
  /** Eigenvalue alignment score (0–1, 1 = perfect critical-line alignment) */
  alignment: number;
  /** Whether self-healing should activate */
  healingNeeded: boolean;
  /** The spectral note explaining the assessment */
  note: string;
}

/**
 * Lightweight spectral health check — suitable for the kernel hot path.
 *
 * Uses the H-score and phi to compute a spectral grade without
 * running the full zeta verification suite. This is O(1) and can
 * run every tick.
 *
 * The alignment score measures how close the system's effective
 * frequency ratio is to the first Riemann eigenvalue spacing.
 * Perfect alignment = eigenvalues on critical line = rigid geometry.
 */
export function spectralHealth(hScore: number, phi: number): SpectralHealth {
  const { grade, coupling, spectralNote } = spectralGrade(hScore, phi);

  // Eigenvalue alignment: compare the system's coherence ratio
  // to the golden ratio of eigenvalue spacings.
  // The first two Riemann zeros: 14.1347 and 21.0220
  // Their ratio: 21.0220 / 14.1347 ≈ 1.4872
  // Compare to: (hScore + phi) / max(hScore, phi, 0.001)
  const eigenRatio = RIEMANN_EIGENVALUES[1] / RIEMANN_EIGENVALUES[0]; // ≈ 1.487
  const systemRatio = (hScore + phi) / Math.max(hScore, phi, 0.001);
  const alignment = 1 - Math.min(Math.abs(systemRatio - eigenRatio) / eigenRatio, 1);

  return {
    grade,
    coupling,
    alignment,
    healingNeeded: grade === "C" || grade === "D",
    note: spectralNote,
  };
}

// ══════════════════════════════════════════════════════════════════════════
// 6 — CORRECT: Spectral Self-Healing
// ══════════════════════════════════════════════════════════════════════════

/**
 * A spectral correction — the geometric rotation needed to
 * restore critical-line alignment.
 */
export interface SpectralCorrection {
  /** The rotation angle (in δ₀ units) to apply */
  rotationDefects: number;
  /** The target H-score after correction */
  targetH: number;
  /** The blend factor for the correction (0 = no change, 1 = full snap) */
  blendFactor: number;
  /** The exceptional group layer where correction should focus */
  correctionLayer: string;
  /** Human-readable description of the correction */
  description: string;
}

/**
 * Compute the minimal geometric correction to restore spectral health.
 *
 * The correction is a "rotation" on the geometric manifold — moving
 * the system's state vector back toward the critical line.
 *
 * The rotation angle is proportional to the drift, scaled by the
 * torsion coupling at the relevant energy scale.
 */
export function spectralCorrection(
  health: SpectralHealth,
  currentH: number,
  currentPhi: number,
): SpectralCorrection {
  if (!health.healingNeeded) {
    return {
      rotationDefects: 0,
      targetH: currentH,
      blendFactor: 0,
      correctionLayer: "none",
      description: "No correction needed — on critical line",
    };
  }

  const currentDefects = hScoreToDefects(currentH);

  // The correction magnitude scales with misalignment
  const misalignment = 1 - health.alignment;
  const rotationDefects = misalignment * GEOMETRIC_TICK_QUANTUM / DELTA_0_RAD;

  // Target: reduce defects by the rotation amount
  const targetDefects = Math.max(0, currentDefects - rotationDefects);
  const targetH = defectsToHScore(targetDefects);

  // Blend factor: how aggressively to correct
  // Grade C: gentle (α-scaled), Grade D: aggressive
  const blendFactor = health.grade === "D"
    ? Math.min(1, misalignment * 2)
    : ALPHA_QSVG * misalignment * ALPHA_INVERSE_QSVG; // ≈ misalignment (α × α⁻¹ = 1)

  // Which exceptional group layer needs correction
  const correctionLayer =
    currentDefects > 4 ? "G₂ (Pauli — foundational)" :
    currentDefects > 3 ? "F₄ (Clifford — mirror pairs)" :
    currentDefects > 2 ? "E₆ (T-gate — universality)" :
    currentDefects > 1 ? "E₇ (Universal — full control)" :
    "E₈ (Fault-tolerant — topological)";

  return {
    rotationDefects,
    targetH,
    blendFactor: Math.min(blendFactor, 1),
    correctionLayer,
    description:
      `Rotate ${rotationDefects.toFixed(3)} δ₀ toward critical line. ` +
      `Focus: ${correctionLayer}. ` +
      `Blend: ${(blendFactor * 100).toFixed(1)}%.`,
  };
}

// ══════════════════════════════════════════════════════════════════════════
// 9 — VERIFY: Spectral Closure
// ══════════════════════════════════════════════════════════════════════════

/**
 * Spectral closure report — did the correction restore rigidity?
 */
export interface SpectralClosure {
  /** Did we return to the critical line? */
  onCriticalLine: boolean;
  /** The grade after correction */
  postCorrectionGrade: string;
  /** Eigenvalue alignment after correction */
  postAlignment: number;
  /** The 3-6-9 phase achieved */
  phase: 3 | 6 | 9;
  /** Whether the full cycle (3→6→9) completed */
  cycleComplete: boolean;
}

/**
 * Verify that a spectral correction restored geometric rigidity.
 *
 * This completes the 3-6-9 cycle:
 *   3: We checked (spectralHealth)
 *   6: We corrected (spectralCorrection)
 *   9: We verify the correction achieved closure
 */
export function spectralClosure(
  preHealth: SpectralHealth,
  postH: number,
  postPhi: number,
): SpectralClosure {
  const postHealth = spectralHealth(postH, postPhi);

  const improved = postHealth.alignment > preHealth.alignment;
  const onCriticalLine = postHealth.grade === "A" || postHealth.grade === "B";

  // Determine phase
  let phase: 3 | 6 | 9;
  if (onCriticalLine) {
    phase = 9; // Completion — rigidity restored
  } else if (improved) {
    phase = 6; // Evolution — improving but not there yet
  } else {
    phase = 3; // Structure — correction maintained but didn't advance
  }

  return {
    onCriticalLine,
    postCorrectionGrade: postHealth.grade,
    postAlignment: postHealth.alignment,
    phase,
    cycleComplete: phase === 9,
  };
}

/**
 * Run a complete 3-6-9 spectral feedback cycle.
 *
 * This is the full self-healing loop:
 *   3: Assess spectral health
 *   6: Compute correction if needed
 *   9: Verify closure
 *
 * Returns the complete cycle result for diagnostics.
 */
export interface SpectralFeedbackCycle {
  /** Phase 3: Health assessment */
  health: SpectralHealth;
  /** Phase 6: Correction (if needed) */
  correction: SpectralCorrection;
  /** Phase 9: Closure verification */
  closure: SpectralClosure;
  /** The triadic phase achieved */
  finalPhase: 3 | 6 | 9;
}

export function runSpectralFeedbackCycle(
  hScore: number,
  phi: number,
): SpectralFeedbackCycle {
  // 3: Check
  const health = spectralHealth(hScore, phi);

  // 6: Correct
  const correction = spectralCorrection(health, hScore, phi);

  // 9: Verify (using the corrected values)
  const closure = spectralClosure(
    health,
    correction.targetH,
    phi, // phi doesn't change from correction
  );

  return {
    health,
    correction,
    closure,
    finalPhase: closure.phase,
  };
}
