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
 *   4. Geometric units (all thresholds derived from δ₀)
 *   5. Coherence bridge (δ₀-gated kernel coherence)
 *   6. Spectral feedback (critical-line self-healing)
 *   7. Integration with the coherence/reasoning pipeline
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

// ── Geometric Units ──────────────────────────────────────────────────────────
export {
  GEOMETRIC_TICK_QUANTUM,
  STRUCTURE_COUNT,
  EVOLUTION_COUNT,
  COMPLETION_NUMBER,
  PHI,
  GEOMETRIC_CATASTROPHE,
  PROJECTION_FIDELITY,
  NOISE_FLOOR,
  HOPF_ANGLE_DEG,
  HOPF_ANGLE_RAD,
  ZONE_THRESHOLDS,
  hScoreToDefects,
  defectsToHScore,
  spectralCoupling,
  classifyGeometricZone,
  triadicPhase,
  getGeometricManifest,
  type GeometricZone,
  type GeometricManifest,
} from "./geometric-units";

// ── Coherence Bridge ─────────────────────────────────────────────────────────
export {
  measureGeometricState,
  measureGeometricDrift,
  computeRefocusTarget,
  verifyGeometricClosure,
  createGeometricReceipt,
  type GeometricMeasurement,
  type RefocusTarget,
  type GeometricClosure,
  type GeometricReceipt,
} from "./coherence-bridge";

// ── Spectral Feedback ────────────────────────────────────────────────────────
export {
  spectralHealth,
  spectralCorrection,
  spectralClosure,
  runSpectralFeedbackCycle,
  type SpectralHealth,
  type SpectralCorrection,
  type SpectralClosure,
  type SpectralFeedbackCycle,
} from "./spectral-feedback";

// ── Proof-of-Thought ─────────────────────────────────────────────────────────
export {
  createAccumulator,
  recordIteration,
  sealReceipt,
  sealReceiptSync,
  verifyProofOfThought,
  receiptToUORCoordinate,
  summarizeReceipt,
  type ProofAccumulator,
  type ProofOfThoughtReceipt,
  type ProofSnapshot,
  type ProofVerification,
  type ProofCheck,
} from "./proof-of-thought";

// ── ZK Three-Layer Separation ────────────────────────────────────────────────
export {
  // L1 Substrate
  type SubstrateValue,
  S_DELTA_0,
  S_FRACTAL_DIM,
  S_ANOMALOUS,
  S_ALPHA,
  S_ALPHA_INV,
  S_EIGENVALUES,
  S_EIGENVALUE_COUNT,
  S_GRADE_DRIFT_BOUNDS,
  verifySubstrateIntegrity,
  // L2 Geometry
  type GeometryValue,
  type GeometricProofEnvelope,
  type GeometricVerification,
  type GeometricCheck,
  type SpectralGrade,
  type GeometricCID,
  geometry,
  createGeometricEnvelope,
  verifyEnvelope,
  envelopeToRaw,
  // L3 Content
  type ContentValue,
  type UserQuery,
  type LLMResponse,
  type ContentTriple,
  type EncryptedContent,
  type AssertNotContent,
  content,
  contentToHash,
  contentToHashSync,
} from "./zk-layers";
