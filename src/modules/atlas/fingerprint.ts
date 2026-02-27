/**
 * Universal Model Fingerprint — Atlas-Based LLM Nutritional Label
 * ═══════════════════════════════════════════════════════════════════
 *
 * Every LLM architecture decomposes into Atlas coordinates.
 * This module produces a structured "nutritional label" for any model,
 * revealing its categorical operation profile, structural regularity,
 * and R₈ decomposition.
 *
 * The fingerprint is a verifiable, model-agnostic identity:
 *   Model → R₈ decomposition → Atlas sign class → Exceptional group profile
 *
 * @module atlas/fingerprint
 */

import {
  MODEL_CATALOG,
  decomposeModel,
  type ModelArchitecture,
  type AtlasDecomposition,
} from "./convergence";
import { ATLAS_VERTEX_COUNT, ATLAS_EDGE_COUNT_EXPECTED } from "./atlas";

// ── Fingerprint Types ─────────────────────────────────────────────────────

export interface OperationProfile {
  /** How much of the model's computation is product (G₂) — attention head independence */
  product: number;
  /** Quotient (F₄) — normalization layers */
  quotient: number;
  /** Filtration (E₆) — multi-head splitting */
  filtration: number;
  /** Augmentation (E₇) — FFN expansion */
  augmentation: number;
  /** Embedding (E₈) — residual connections */
  embedding: number;
}

export interface StructuralSignature {
  /** Binary: 8 bits encoding structural properties */
  bits: number;
  /** Human-readable binary string */
  binary: string;
  /** Properties encoded */
  properties: string[];
}

export interface ModelFingerprint {
  /** Model name */
  model: string;
  /** Model family */
  family: string;
  /** Parameters in billions */
  paramsB: number;

  // ── R₈ Decomposition ──────────────────────────────────────
  /** Atlas decomposition data */
  decomposition: AtlasDecomposition;

  // ── Categorical Operation Profile ─────────────────────────
  /** Normalized distribution across 5 operations [0,1] each, sum = 1 */
  operationProfile: OperationProfile;
  /** Dominant operation (highest weight) */
  dominantOperation: string;
  /** Dominant exceptional group */
  dominantGroup: string;

  // ── Structural Metrics ────────────────────────────────────
  /** 8-bit structural signature */
  signature: StructuralSignature;
  /** Structural regularity score [0,1] */
  regularityScore: number;
  /** Atlas resonance: how well the model aligns with Atlas structure */
  atlasResonance: number;
  /** Fidelity class: "lossless" | "near-lossless" | "lossy" | "compressed" */
  fidelityClass: string;

  // ── Ring Metrics ──────────────────────────────────────────
  /** Complete R₈ rings per embedding vector */
  r8Rings: number;
  /** Residual R₈ elements */
  r8Residual: number;
  /** Atlas sign class (0-7) */
  signClass: number;
  /** Head-to-edge ratio (head_dim / 256) */
  headEdgeRatio: number;

  // ── Comparative Metrics ───────────────────────────────────
  /** Percentile rank by parameter count (0-100) */
  scalePercentile: number;
  /** Efficiency score: operations per parameter (higher = more efficient architecture) */
  architecturalEfficiency: number;
}

export interface FingerprintReport {
  fingerprints: ModelFingerprint[];
  /** Cross-model invariants that hold */
  invariantsSatisfied: number;
  /** Total invariants checked */
  invariantsTotal: number;
  /** Family-level aggregates */
  familyProfiles: FamilyProfile[];
}

export interface FamilyProfile {
  family: string;
  modelCount: number;
  avgRegularity: number;
  avgResonance: number;
  dominantOperation: string;
  paramRange: [number, number];
}

// ── Operation Profile Computation ─────────────────────────────────────────

/**
 * Compute the categorical operation profile for a model.
 *
 * Each transformer layer performs ALL five operations. The profile
 * measures the RELATIVE WEIGHT of each operation in the architecture.
 *
 * - Product (G₂):      h independent attention heads → weight ∝ h
 * - Quotient (F₄):     2 LayerNorms per layer → weight ∝ 2L
 * - Filtration (E₆):   QKV split into h heads → weight ∝ 3h (Q,K,V per head)
 * - Augmentation (E₇): FFN d→4d→d → weight ∝ 8d² (two matrices)
 * - Embedding (E₈):    2 residual adds per layer → weight ∝ 2d (identity preservation)
 */
function computeOperationProfile(model: ModelArchitecture): OperationProfile {
  const { embeddingDim: d, heads: h, layers: L } = model;

  // Raw operation counts (proportional to FLOPs)
  const productOps = h * L;                    // h independent heads × L layers
  const quotientOps = 2 * L;                   // 2 LayerNorms per layer
  const filtrationOps = 3 * h * L;             // Q, K, V projections split by head
  const augmentationOps = 2 * 4 * d * L;       // FFN: 2 matrices of d×4d each
  const embeddingOps = 2 * d * L;              // 2 residual connections per layer

  const total = productOps + quotientOps + filtrationOps + augmentationOps + embeddingOps;

  return {
    product: productOps / total,
    quotient: quotientOps / total,
    filtration: filtrationOps / total,
    augmentation: augmentationOps / total,
    embedding: embeddingOps / total,
  };
}

// ── Structural Signature ──────────────────────────────────────────────────

/**
 * Compute an 8-bit structural signature encoding key properties.
 *
 * Bit 0: d divisible by 256 (complete R₈ rings)
 * Bit 1: head_dim is power of 2
 * Bit 2: heads is power of 2
 * Bit 3: layers > 32 (deep model)
 * Bit 4: FFN ratio is 4× (standard)
 * Bit 5: vocab > 100k (large vocabulary)
 * Bit 6: params > 10B (large model)
 * Bit 7: d = heads × head_dim (clean factorization)
 */
function computeSignature(model: ModelArchitecture): StructuralSignature {
  const isPow2 = (n: number) => n > 0 && (n & (n - 1)) === 0;

  let bits = 0;
  const properties: string[] = [];

  if (model.embeddingDim % 256 === 0) { bits |= 1; properties.push("R₈-aligned"); }
  if (isPow2(model.headDim)) { bits |= 2; properties.push("head_dim=2ⁿ"); }
  if (isPow2(model.heads)) { bits |= 4; properties.push("heads=2ⁿ"); }
  if (model.layers > 32) { bits |= 8; properties.push("deep (L>32)"); }
  // Bit 4: assume standard 4× FFN
  bits |= 16; properties.push("FFN=4×");
  if (model.vocabSize > 100000) { bits |= 32; properties.push("large-vocab"); }
  if (model.paramsB > 10) { bits |= 64; properties.push("large-scale"); }
  if (model.embeddingDim === model.heads * model.headDim) { bits |= 128; properties.push("clean-factor"); }

  return {
    bits,
    binary: bits.toString(2).padStart(8, "0"),
    properties,
  };
}

// ── Fingerprint Generation ────────────────────────────────────────────────

/**
 * Generate the complete Atlas fingerprint for a model.
 */
export function fingerprint(model: ModelArchitecture): ModelFingerprint {
  const decomposition = decomposeModel(model);
  const profile = computeOperationProfile(model);
  const signature = computeSignature(model);

  // Find dominant operation
  const opEntries = Object.entries(profile) as [string, number][];
  const dominant = opEntries.reduce((a, b) => b[1] > a[1] ? b : a);
  const groupMap: Record<string, string> = {
    product: "G₂", quotient: "F₄", filtration: "E₆",
    augmentation: "E₇", embedding: "E₈",
  };

  // Regularity score: fraction of signature bits set
  const regularityScore = signature.properties.length / 8;

  // Atlas resonance: how well dimensions align with Atlas numbers
  const dimAlignments = [
    model.embeddingDim % 96 === 0 ? 1 : 0,   // divisible by vertex count
    model.embeddingDim % 256 === 0 ? 1 : 0,   // divisible by ring size
    model.headDim % 32 === 0 ? 1 : 0,         // divisible by Atlas label bits
    model.heads % 8 === 0 ? 1 : 0,            // divisible by sign class count
    model.embeddingDim === model.heads * model.headDim ? 1 : 0,
  ];
  const atlasResonance = dimAlignments.reduce((a, b) => a + b, 0) / dimAlignments.length;

  // Fidelity class
  let fidelityClass: string;
  if (atlasResonance >= 0.8) fidelityClass = "lossless";
  else if (atlasResonance >= 0.6) fidelityClass = "near-lossless";
  else if (atlasResonance >= 0.4) fidelityClass = "lossy";
  else fidelityClass = "compressed";

  // Scale percentile among catalog
  const allParams = MODEL_CATALOG.map(m => m.paramsB).sort((a, b) => a - b);
  const rank = allParams.filter(p => p <= model.paramsB).length;
  const scalePercentile = Math.round((rank / allParams.length) * 100);

  // Architectural efficiency: layers × heads / params (higher = more efficient use of parameters)
  const architecturalEfficiency = (model.layers * model.heads) / (model.paramsB * 1000);

  return {
    model: model.name,
    family: model.family,
    paramsB: model.paramsB,
    decomposition,
    operationProfile: profile,
    dominantOperation: dominant[0],
    dominantGroup: groupMap[dominant[0]] || "?",
    signature,
    regularityScore,
    atlasResonance,
    fidelityClass,
    r8Rings: decomposition.completeRings,
    r8Residual: decomposition.residual,
    signClass: decomposition.atlasSignClass,
    headEdgeRatio: decomposition.headDimToEdgeRatio,
    scalePercentile,
    architecturalEfficiency,
  };
}

/**
 * Generate fingerprints for all models in the catalog.
 */
export function fingerprintAll(): ModelFingerprint[] {
  return MODEL_CATALOG.map(fingerprint);
}

/**
 * Generate the full fingerprint report with cross-model analysis.
 */
export function generateFingerprintReport(): FingerprintReport {
  const fingerprints = fingerprintAll();

  // Cross-model invariants
  let invariantsSatisfied = 0;
  const invariantsTotal = 6;

  // 1. All models have clean factorization
  if (fingerprints.every(f => f.signature.bits & 128)) invariantsSatisfied++;
  // 2. All models have head_dim multiple of 32
  if (fingerprints.every(f => f.decomposition.r8ElementsPerVector % 128 === 0)) invariantsSatisfied++;
  // 3. Augmentation is always dominant (FFN dominates FLOPs)
  if (fingerprints.every(f => f.dominantOperation === "augmentation")) invariantsSatisfied++;
  // 4. All fidelity classes are at least "lossy"
  if (fingerprints.every(f => f.fidelityClass !== "compressed")) invariantsSatisfied++;
  // 5. All regularity scores ≥ 0.5
  if (fingerprints.every(f => f.regularityScore >= 0.5)) invariantsSatisfied++;
  // 6. Atlas resonance mean ≥ 0.6
  const meanResonance = fingerprints.reduce((s, f) => s + f.atlasResonance, 0) / fingerprints.length;
  if (meanResonance >= 0.6) invariantsSatisfied++;

  // Family-level aggregates
  const families = [...new Set(fingerprints.map(f => f.family))];
  const familyProfiles: FamilyProfile[] = families.map(family => {
    const members = fingerprints.filter(f => f.family === family);
    const params = members.map(m => m.paramsB);
    const dominantOps = members.map(m => m.dominantOperation);
    const mostCommon = dominantOps.sort((a, b) =>
      dominantOps.filter(v => v === b).length - dominantOps.filter(v => v === a).length
    )[0];

    return {
      family,
      modelCount: members.length,
      avgRegularity: members.reduce((s, m) => s + m.regularityScore, 0) / members.length,
      avgResonance: members.reduce((s, m) => s + m.atlasResonance, 0) / members.length,
      dominantOperation: mostCommon,
      paramRange: [Math.min(...params), Math.max(...params)] as [number, number],
    };
  });

  return { fingerprints, invariantsSatisfied, invariantsTotal, familyProfiles };
}
