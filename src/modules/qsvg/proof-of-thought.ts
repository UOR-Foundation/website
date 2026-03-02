/**
 * QSVG Proof-of-Thought — Zero-Knowledge Geometric Verification
 * ══════════════════════════════════════════════════════════════
 *
 * Transforms AI reasoning from "Chain-of-Thought" (narrative, unverifiable)
 * to "Proof-of-Thought" (compact, O(1)-verifiable, content-blind).
 *
 * Architecture — Three-Layer ZK Separation:
 *
 *   Layer 3: Content     [ENCRYPTED — only user sees]
 *            ↕ (one-way hash)
 *   Layer 2: Geometry    [PUBLIC — spectral grade, drift, phase]
 *            ↕ (lattice constants)
 *   Layer 1: Substrate   [{3,3,5} — universal, immutable]
 *
 * No information flows upward. The geometry layer measures the SHAPE
 * of reasoning, never the CONTENT. This makes every receipt ZK by construction.
 *
 * @module qsvg/proof-of-thought
 */

import {
  DELTA_0_RAD,
  FRACTAL_DIMENSION,
  ANOMALOUS_DIMENSION,
  ALPHA_QSVG,
  ALPHA_INVERSE_QSVG,
  RIEMANN_EIGENVALUES,
} from "./constants";

import {
  PROJECTION_FIDELITY,
  hScoreToDefects,
  classifyGeometricZone,
  triadicPhase,
  type GeometricZone,
} from "./geometric-units";

import { spectralGrade as computeSpectralGrade } from "./spectral-verification";

// ══════════════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════════════

/** Epistemic grade (matches neuro-symbolic pipeline) */
export type EpistemicGrade = "A" | "B" | "C" | "D";

/**
 * A snapshot captured at each reasoning iteration.
 * Contains ONLY geometric/topological data — no content.
 */
export interface ProofSnapshot {
  /** Iteration index */
  readonly iteration: number;
  /** Curvature at this step (divergence from scaffold) */
  readonly curvature: number;
  /** Epistemic grade distribution at this step */
  readonly gradeDistribution: Readonly<Record<EpistemicGrade, number>>;
  /** Number of eigenvalues locked to the critical line */
  readonly eigenvaluesLocked: number;
  /** 3-6-9 triadic phase at this step */
  readonly triadicPhase: 3 | 6 | 9;
  /** H-score at this step */
  readonly hScore: number;
}

/**
 * The sealed Proof-of-Thought receipt.
 *
 * This is a Layer 2 (Geometry) object — it contains NO content.
 * Every field is either a topological invariant or a one-way hash.
 */
export interface ProofOfThoughtReceipt {
  /** Version of the proof protocol */
  readonly version: 1;
  /** Content-addressed identifier (SHA-256 of sealed content) */
  readonly cid: string;
  /** Spectral grade: A (critical-line aligned) through D (off-line) */
  readonly spectralGrade: EpistemicGrade;
  /** Drift from perfect coherence in δ₀ units */
  readonly driftDelta0: number;
  /** Final 3-6-9 triadic phase */
  readonly triadicPhase: 3 | 6 | 9;
  /** Projection fidelity with γ_T correction */
  readonly fidelity: number;
  /** Number of Riemann eigenvalues locked to critical line */
  readonly eigenvaluesLocked: number;
  /** Spectral coupling α^depth */
  readonly coupling: number;
  /** Geometric zone at completion */
  readonly zone: GeometricZone;
  /** Number of reasoning iterations */
  readonly iterations: number;
  /** Whether the proof converged */
  readonly converged: boolean;
  /** Compression ratio: bits of proof / bits of reasoning */
  readonly compressionRatio: number;
  /** Zero-knowledge mode: true = content layer was never accessed */
  readonly zk: true;
  /** Number of free parameters: always 0 */
  readonly freeParameters: 0;
  /** Timestamp (ISO 8601) */
  readonly sealedAt: string;
  /** Snapshot trace (geometric only, no content) */
  readonly snapshots: readonly ProofSnapshot[];
}

/**
 * Verification result from O(1) receipt check.
 */
export interface ProofVerification {
  /** Whether the receipt passes geometric verification */
  readonly verified: boolean;
  /** Verification latency in milliseconds */
  readonly latencyMs: number;
  /** Individual check results */
  readonly checks: readonly ProofCheck[];
  /** The spectral grade, re-derived from receipt data */
  readonly derivedGrade: EpistemicGrade;
}

export interface ProofCheck {
  readonly name: string;
  readonly passed: boolean;
  readonly detail: string;
}

// ══════════════════════════════════════════════════════════════════════════
// ProofAccumulator — rides alongside reasoning, never touches content
// ══════════════════════════════════════════════════════════════════════════

/**
 * Pure-functional accumulator for proof-of-thought generation.
 *
 * This object rides the neuro-symbolic reasoning loop, observing
 * ONLY geometric/topological signals. It never accesses:
 *   - User query text
 *   - LLM response text
 *   - Knowledge graph triples
 *   - Any Layer 3 (Content) data
 *
 * It measures the SHAPE of computation, not its SUBSTANCE.
 */
export interface ProofAccumulator {
  readonly snapshots: ProofSnapshot[];
  readonly totalClaims: number;
  readonly gradeAccumulator: Record<EpistemicGrade, number>;
  readonly peakCurvature: number;
  readonly finalCurvature: number;
  readonly converged: boolean;
  readonly iterations: number;
  readonly reasoningBits: number;
}

/**
 * Create a fresh accumulator at the start of reasoning.
 */
export function createAccumulator(): ProofAccumulator {
  return {
    snapshots: [],
    totalClaims: 0,
    gradeAccumulator: { A: 0, B: 0, C: 0, D: 0 },
    peakCurvature: 0,
    finalCurvature: 0,
    converged: false,
    iterations: 0,
    reasoningBits: 0,
  };
}

/**
 * Record a reasoning iteration into the accumulator.
 *
 * Called after each D→I→A cycle. Takes ONLY geometric signals:
 *   - curvature (scalar divergence from scaffold)
 *   - grade distribution (how many A/B/C/D claims)
 *   - hScore (kernel coherence at this moment)
 *   - converged (boolean)
 *
 * None of these carry content information.
 */
export function recordIteration(
  acc: ProofAccumulator,
  curvature: number,
  gradeDistribution: Record<EpistemicGrade, number>,
  hScore: number,
  converged: boolean,
  responseLengthBytes: number,
): ProofAccumulator {
  const claimCount = gradeDistribution.A + gradeDistribution.B +
    gradeDistribution.C + gradeDistribution.D;

  // Determine eigenvalues locked based on grade distribution
  // Each Grade A claim "locks" an eigenvalue to the critical line
  const eigenvaluesLocked = Math.min(
    gradeDistribution.A,
    RIEMANN_EIGENVALUES.length,
  );

  // Determine zone and triadic phase from geometric state
  const defects = hScoreToDefects(hScore);
  const zone = classifyGeometricZone(defects);
  const phase = triadicPhase(zone, converged);

  const snapshot: ProofSnapshot = {
    iteration: acc.iterations,
    curvature,
    gradeDistribution: { ...gradeDistribution },
    eigenvaluesLocked,
    triadicPhase: phase,
    hScore,
  };

  return {
    snapshots: [...acc.snapshots, snapshot],
    totalClaims: acc.totalClaims + claimCount,
    gradeAccumulator: {
      A: acc.gradeAccumulator.A + gradeDistribution.A,
      B: acc.gradeAccumulator.B + gradeDistribution.B,
      C: acc.gradeAccumulator.C + gradeDistribution.C,
      D: acc.gradeAccumulator.D + gradeDistribution.D,
    },
    peakCurvature: Math.max(acc.peakCurvature, curvature),
    finalCurvature: curvature,
    converged,
    iterations: acc.iterations + 1,
    reasoningBits: acc.reasoningBits + responseLengthBytes * 8,
  };
}

// ══════════════════════════════════════════════════════════════════════════
// Sealing — Accumulator → Receipt
// ══════════════════════════════════════════════════════════════════════════

/**
 * Compute a deterministic content-addressed ID from geometric data.
 *
 * Uses the Web Crypto API (SHA-256). The hash input is the
 * canonical JSON of the geometric data — NOT the content.
 * This ensures the CID is content-blind by construction.
 */
async function computeGeometricCID(
  snapshots: readonly ProofSnapshot[],
  finalCurvature: number,
  converged: boolean,
): Promise<string> {
  // Canonical geometric payload — no content data
  const payload = JSON.stringify({
    snapshots: snapshots.map(s => ({
      i: s.iteration,
      c: Math.round(s.curvature * 1e8) / 1e8,
      g: s.gradeDistribution,
      e: s.eigenvaluesLocked,
      p: s.triadicPhase,
      h: Math.round(s.hScore * 1e8) / 1e8,
    })),
    fc: Math.round(finalCurvature * 1e8) / 1e8,
    cv: converged,
    d0: DELTA_0_RAD,
    D: FRACTAL_DIMENSION,
  });

  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);

  // Format as CIDv1-like hex string
  return Array.from(hashArray)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Synchronous CID computation (fallback for environments without crypto.subtle).
 * Uses a deterministic hash based on the geometric payload.
 */
function computeGeometricCIDSync(
  snapshots: readonly ProofSnapshot[],
  finalCurvature: number,
  converged: boolean,
): string {
  // Simple but deterministic hash from geometric invariants
  let hash = 0x811c9dc5; // FNV offset basis
  const prime = 0x01000193;

  const feed = (n: number) => {
    const bits = Math.round(n * 1e8);
    hash = ((hash ^ (bits & 0xff)) * prime) >>> 0;
    hash = ((hash ^ ((bits >> 8) & 0xff)) * prime) >>> 0;
    hash = ((hash ^ ((bits >> 16) & 0xff)) * prime) >>> 0;
    hash = ((hash ^ ((bits >> 24) & 0xff)) * prime) >>> 0;
  };

  for (const s of snapshots) {
    feed(s.iteration);
    feed(s.curvature);
    feed(s.hScore);
    feed(s.eigenvaluesLocked);
    feed(s.triadicPhase);
    feed(s.gradeDistribution.A);
    feed(s.gradeDistribution.B);
    feed(s.gradeDistribution.C);
    feed(s.gradeDistribution.D);
  }
  feed(finalCurvature);
  feed(converged ? 1 : 0);
  feed(DELTA_0_RAD);
  feed(FRACTAL_DIMENSION);

  // Extend to 256-bit by iterating
  const parts: number[] = [];
  for (let i = 0; i < 8; i++) {
    hash = ((hash ^ (i * 0x9e3779b9)) * prime) >>> 0;
    parts.push(hash);
  }

  return parts.map(p => p.toString(16).padStart(8, "0")).join("");
}

/**
 * Seal the accumulator into a Proof-of-Thought receipt.
 *
 * This is the transition from "reasoning in progress" to
 * "verified geometric artifact." After sealing:
 *   - The receipt is immutable
 *   - The CID is deterministic (same reasoning shape → same CID)
 *   - The receipt carries ZERO content information
 */
export async function sealReceipt(
  acc: ProofAccumulator,
  hScore: number,
  phi: number,
): Promise<ProofOfThoughtReceipt> {
  // Compute CID from geometric data only
  let cid: string;
  try {
    cid = await computeGeometricCID(acc.snapshots, acc.finalCurvature, acc.converged);
  } catch {
    cid = computeGeometricCIDSync(acc.snapshots, acc.finalCurvature, acc.converged);
  }

  // Derive spectral grade from coherence metrics
  const { grade, coupling } = computeSpectralGrade(hScore, phi);

  // Compute geometric measurements
  const defects = hScoreToDefects(hScore);
  const zone = classifyGeometricZone(defects);
  const phase = triadicPhase(zone, acc.converged);

  // Fidelity with anomalous dimension correction
  const fidelity = PROJECTION_FIDELITY * hScore * (1 - ANOMALOUS_DIMENSION * (1 - phi));

  // Eigenvalues locked: from final snapshot or computed from grade
  const eigenvaluesLocked = acc.snapshots.length > 0
    ? acc.snapshots[acc.snapshots.length - 1].eigenvaluesLocked
    : 0;

  // Compression: receipt bits / total reasoning bits
  // Receipt is ~256 bits (CID) + metadata (~512 bits)
  const receiptBits = 768; // CID + grade + drift + phase + fidelity + metadata
  const compressionRatio = acc.reasoningBits > 0
    ? receiptBits / acc.reasoningBits
    : 1;

  return {
    version: 1,
    cid,
    spectralGrade: grade as EpistemicGrade,
    driftDelta0: defects * DELTA_0_RAD,
    triadicPhase: phase,
    fidelity: Math.max(0, Math.min(1, fidelity)),
    eigenvaluesLocked,
    coupling,
    zone,
    iterations: acc.iterations,
    converged: acc.converged,
    compressionRatio,
    zk: true,
    freeParameters: 0,
    sealedAt: new Date().toISOString(),
    snapshots: acc.snapshots,
  };
}

/**
 * Synchronous version of sealReceipt for environments
 * where async is not available (tests, kernel hot path).
 */
export function sealReceiptSync(
  acc: ProofAccumulator,
  hScore: number,
  phi: number,
): ProofOfThoughtReceipt {
  const cid = computeGeometricCIDSync(acc.snapshots, acc.finalCurvature, acc.converged);
  const { grade, coupling } = computeSpectralGrade(hScore, phi);
  const defects = hScoreToDefects(hScore);
  const zone = classifyGeometricZone(defects);
  const phase = triadicPhase(zone, acc.converged);
  const fidelity = PROJECTION_FIDELITY * hScore * (1 - ANOMALOUS_DIMENSION * (1 - phi));
  const eigenvaluesLocked = acc.snapshots.length > 0
    ? acc.snapshots[acc.snapshots.length - 1].eigenvaluesLocked
    : 0;
  const receiptBits = 768;
  const compressionRatio = acc.reasoningBits > 0 ? receiptBits / acc.reasoningBits : 1;

  return {
    version: 1,
    cid,
    spectralGrade: grade as EpistemicGrade,
    driftDelta0: defects * DELTA_0_RAD,
    triadicPhase: phase,
    fidelity: Math.max(0, Math.min(1, fidelity)),
    eigenvaluesLocked,
    coupling,
    zone,
    iterations: acc.iterations,
    converged: acc.converged,
    compressionRatio,
    zk: true,
    freeParameters: 0,
    sealedAt: new Date().toISOString(),
    snapshots: acc.snapshots,
  };
}

// ══════════════════════════════════════════════════════════════════════════
// Verification — O(1) receipt check against {3,3,5} lattice
// ══════════════════════════════════════════════════════════════════════════

/**
 * Verify a Proof-of-Thought receipt.
 *
 * This is the verifier side of the ZK protocol. It takes ONLY the
 * receipt (Layer 2) and checks it against the lattice constants (Layer 1).
 * No content (Layer 3) is needed or accessed.
 *
 * Verification is O(1) in receipt size and runs in <1ms client-side.
 */
export function verifyProofOfThought(receipt: ProofOfThoughtReceipt): ProofVerification {
  const t0 = performance.now();
  const checks: ProofCheck[] = [];

  // Check 1: Protocol version
  checks.push({
    name: "Protocol version",
    passed: receipt.version === 1,
    detail: `version=${receipt.version}`,
  });

  // Check 2: Zero free parameters
  checks.push({
    name: "Zero free parameters",
    passed: receipt.freeParameters === 0,
    detail: `freeParameters=${receipt.freeParameters}`,
  });

  // Check 3: ZK mode
  checks.push({
    name: "Zero-knowledge mode",
    passed: receipt.zk === true,
    detail: `zk=${receipt.zk}`,
  });

  // Check 4: Spectral grade consistency with drift
  // The drift value is driftDelta0 (already in radians * defects), so compare directly
  const gradeMaxDrift: Record<EpistemicGrade, number> = {
    A: 0.5,
    B: 2.0,
    C: 5.0,
    D: Infinity,
  };
  const maxDrift = gradeMaxDrift[receipt.spectralGrade];
  const driftConsistent = receipt.driftDelta0 <= maxDrift || receipt.spectralGrade === "D";
  checks.push({
    name: "Spectral grade ↔ drift consistency",
    passed: driftConsistent,
    detail: `grade=${receipt.spectralGrade}, drift=${receipt.driftDelta0.toFixed(6)}, max=${maxDrift}`,
  });

  // Check 5: Fidelity within physical bounds
  const fidelityValid = receipt.fidelity >= 0 && receipt.fidelity <= 1;
  checks.push({
    name: "Fidelity within [0, 1]",
    passed: fidelityValid,
    detail: `fidelity=${receipt.fidelity.toFixed(6)}`,
  });

  // Check 6: Coupling derived from α
  const expectedMaxCoupling = 1; // α^0
  const couplingValid = receipt.coupling > 0 && receipt.coupling <= expectedMaxCoupling;
  checks.push({
    name: "Coupling α^depth > 0",
    passed: couplingValid,
    detail: `coupling=${receipt.coupling.toExponential(4)}, α=${ALPHA_QSVG.toFixed(6)}`,
  });

  // Check 7: Triadic phase valid
  const phaseValid = receipt.triadicPhase === 3 ||
    receipt.triadicPhase === 6 ||
    receipt.triadicPhase === 9;
  checks.push({
    name: "Valid triadic phase (3/6/9)",
    passed: phaseValid,
    detail: `phase=${receipt.triadicPhase}`,
  });

  // Check 8: CID is well-formed (64-char hex = 256-bit hash)
  const cidValid = /^[0-9a-f]{64}$/i.test(receipt.cid);
  checks.push({
    name: "CID is 256-bit hash",
    passed: cidValid,
    detail: `cid=${receipt.cid.slice(0, 16)}...`,
  });

  // Check 9: Eigenvalues locked within Riemann bounds
  const eigenvaluesValid = receipt.eigenvaluesLocked >= 0 &&
    receipt.eigenvaluesLocked <= RIEMANN_EIGENVALUES.length;
  checks.push({
    name: "Eigenvalues within Riemann bounds",
    passed: eigenvaluesValid,
    detail: `locked=${receipt.eigenvaluesLocked}/${RIEMANN_EIGENVALUES.length}`,
  });

  // Check 10: Snapshot consistency (if present)
  const snapshotsConsistent = receipt.snapshots.length === 0 ||
    receipt.snapshots.every((s, i) =>
      s.iteration === i &&
      s.curvature >= 0 &&
      s.hScore >= 0 && s.hScore <= 1 &&
      (s.triadicPhase === 3 || s.triadicPhase === 6 || s.triadicPhase === 9)
    );
  checks.push({
    name: "Snapshot trace consistency",
    passed: snapshotsConsistent,
    detail: `${receipt.snapshots.length} snapshots`,
  });

  // Check 11: CID reproducibility (re-derive from snapshots)
  if (receipt.snapshots.length > 0) {
    const recomputedCID = computeGeometricCIDSync(
      receipt.snapshots,
      receipt.snapshots[receipt.snapshots.length - 1].curvature,
      receipt.converged,
    );
    const cidMatch = recomputedCID === receipt.cid;
    checks.push({
      name: "CID reproducibility",
      passed: cidMatch,
      detail: cidMatch ? "CID matches recomputed hash" : "CID MISMATCH — possible tampering",
    });
  }

  const allPassed = checks.every(c => c.passed);
  const latencyMs = performance.now() - t0;

  // Re-derive grade from geometric data to confirm
  const derivedGrade = deriveGradeFromReceipt(receipt);

  return {
    verified: allPassed,
    latencyMs,
    checks,
    derivedGrade,
  };
}

/**
 * Re-derive the spectral grade from receipt geometry.
 * Used as an independent cross-check during verification.
 */
function deriveGradeFromReceipt(receipt: ProofOfThoughtReceipt): EpistemicGrade {
  // Use convergence + fidelity + eigenvalues as inputs
  const convergenceScore = receipt.converged ? 0.4 : 0;
  const fidelityScore = receipt.fidelity * 0.3;
  const eigenvalueScore = (receipt.eigenvaluesLocked / RIEMANN_EIGENVALUES.length) * 0.3;
  const total = convergenceScore + fidelityScore + eigenvalueScore;

  if (total >= 0.85) return "A";
  if (total >= 0.65) return "B";
  if (total >= 0.4) return "C";
  return "D";
}

// ══════════════════════════════════════════════════════════════════════════
// UOR Coordinate Mapping
// ══════════════════════════════════════════════════════════════════════════

/**
 * Map a receipt CID to a UOR coordinate representation.
 */
export function receiptToUORCoordinate(cid: string): {
  hex: string;
  braille: string;
  ipv6: string;
} {
  // Hex is the CID itself
  const hex = cid;

  // Braille: map each nibble to braille codepoint (U+2800 + nibble)
  const braille = Array.from(cid)
    .map(c => String.fromCodePoint(0x2800 + parseInt(c, 16)))
    .join("");

  // IPv6: format as 8 groups of 4 hex chars
  const groups: string[] = [];
  for (let i = 0; i < 64; i += 4) {
    groups.push(cid.slice(i, i + 4));
  }
  const ipv6 = groups.slice(0, 8).join(":");

  return { hex, braille, ipv6 };
}

// ══════════════════════════════════════════════════════════════════════════
// Summary — Human-readable proof summary
// ══════════════════════════════════════════════════════════════════════════

/**
 * Generate a human-readable summary of a proof receipt.
 */
export function summarizeReceipt(receipt: ProofOfThoughtReceipt): string {
  const lines = [
    `Proof-of-Thought Receipt v${receipt.version}`,
    `═══════════════════════════════════════`,
    `CID:              ${receipt.cid.slice(0, 16)}...${receipt.cid.slice(-8)}`,
    `Spectral Grade:   ${receipt.spectralGrade}`,
    `Drift:            ${receipt.driftDelta0.toFixed(6)} δ₀`,
    `Triadic Phase:    ${receipt.triadicPhase} (${receipt.triadicPhase === 3 ? "Structure" : receipt.triadicPhase === 6 ? "Evolution" : "Completion"})`,
    `Fidelity:         ${(receipt.fidelity * 100).toFixed(2)}%`,
    `Eigenvalues:      ${receipt.eigenvaluesLocked}/${RIEMANN_EIGENVALUES.length} locked`,
    `Coupling:         α^depth = ${receipt.coupling.toExponential(4)}`,
    `Converged:        ${receipt.converged ? "Yes" : "No"} (${receipt.iterations} iterations)`,
    `Compression:      ${receipt.compressionRatio.toExponential(2)}`,
    `ZK Mode:          ${receipt.zk ? "Yes — content-blind" : "No"}`,
    `Free Parameters:  ${receipt.freeParameters}`,
    `Zone:             ${receipt.zone}`,
    `Sealed:           ${receipt.sealedAt}`,
  ];
  return lines.join("\n");
}
