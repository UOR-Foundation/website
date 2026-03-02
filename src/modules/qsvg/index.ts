/**
 * QSVG — Quantum Self-Verification Geometry
 * ══════════════════════════════════════════
 *
 * A geometric framework for the unification of fundamental physics,
 * derived from the {3,3,5} tessellation of hyperbolic space H³.
 *
 * This module bridges QSVG with the Atlas substrate, providing:
 *   1. Foundational constants (δ₀, D, α, M*)
 *   2. Formal correspondences between QSVG and Atlas
 *   3. Spectral verification (CronNet-Holo operator ↔ Riemann ζ)
 *   4. Integration with the coherence/reasoning pipeline
 *
 * Author: Luis Morató de Dalmases (QSVG theory)
 * Integration: Atlas / UOR Framework
 *
 * @module qsvg
 */

// ── Constants ────────────────────────────────────────────────────────────────
export {
  DELTA_0_DEG,
  DELTA_0_RAD,
  FRACTAL_DIMENSION,
  ANOMALOUS_DIMENSION,
  CRONNET_SCALE_EV,
  ALPHA_INVERSE_QSVG,
  ALPHA_INVERSE_MEASURED,
  ALPHA_QSVG,
  INSTANTON_ACTION,
  SPECTRAL_FORMULA,
  RIEMANN_EIGENVALUES,
  QSVG_PREDICTIONS,
  PROTON_DECAY_CHANNELS,
  type QSVGPrediction,
} from "./constants";

// ── Atlas Bridge ─────────────────────────────────────────────────────────────
export {
  CORRESPONDENCES,
  verifyAlphaCrossFramework,
  verifyDeltaDRelation,
  selfVerifyGeometry,
  coherenceCoupling,
  torsionCoupling,
  generateBridgeReport,
  type FrameworkCorrespondence,
  type AlphaVerification,
  type QSVGAtlasBridgeReport,
} from "./atlas-bridge";

// ── Spectral Verification ────────────────────────────────────────────────────
export {
  completedZeta,
  runSpectralVerification,
  spectralGrade,
  type SpectralTest,
} from "./spectral-verification";
