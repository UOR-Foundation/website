/**
 * ZK Three-Layer Separation — Barrel Export
 * ══════════════════════════════════════════
 *
 * The three layers of the Zero-Knowledge Proof-of-Thought architecture:
 *
 *   Layer 3: Content     [ENCRYPTED — only user sees]
 *            ↕ (one-way hash)
 *   Layer 2: Geometry    [PUBLIC — spectral grade, drift, phase]
 *            ↕ (lattice constants)
 *   Layer 1: Substrate   [{3,3,5} — universal, immutable]
 *
 * No information flows upward. Privacy is structural, not policy-based.
 *
 * @module qsvg/zk-layers
 */

// ── Layer 1: Substrate ────────────────────────────────────────────────────
export {
  type SubstrateValue,
  S_DELTA_0,
  S_FRACTAL_DIM,
  S_ANOMALOUS,
  S_ALPHA,
  S_ALPHA_INV,
  S_INSTANTON,
  S_EIGENVALUES,
  S_EIGENVALUE_COUNT,
  S_GRADE_DRIFT_BOUNDS,
  verifySubstrateIntegrity,
} from "./substrate-layer";

// ── Layer 2: Geometry ─────────────────────────────────────────────────────
export {
  type GeometryValue,
  type SpectralGrade,
  type DriftValue,
  type FidelityValue,
  type CouplingValue,
  type PhaseValue,
  type EigenvalueCount,
  type GeometricCID,
  type GeometricProofEnvelope,
  type GeometricVerification,
  type GeometricCheck,
  geometry,
  createGeometricEnvelope,
  verifyEnvelope,
  envelopeToRaw,
} from "./geometry-layer";

// ── Layer 3: Content ──────────────────────────────────────────────────────
export {
  type ContentValue,
  type UserQuery,
  type LLMResponse,
  type ContentTriple,
  type EncryptedContent,
  type AssertNotContent,
  type AssertIsContent,
  content,
  contentToHash,
  contentToHashSync,
} from "./content-layer";
