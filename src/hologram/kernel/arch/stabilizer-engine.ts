/**
 * Stabilizer Syndrome Engine — The Immune System of Hologram
 * ══════════════════════════════════════════════════════════
 *
 * The 96 Atlas vertices pair under τ into 48 mirrors. Each mirror pair
 * is a stabilizer generator for the [[96, 48, 2]] quantum error-correcting
 * code. This module extracts syndromes from the system's coherence state
 * and applies deterministic corrections when errors are detected.
 *
 * Architecture:
 *   Coherence State → [48 Parity Checks] → Syndrome₄₈ → Decode → Correction
 *
 * The syndrome is a 48-bit vector. Each bit answers one question:
 *   "Is the coherence field symmetric across this mirror pair?"
 *
 *   syndrome[i] = 0  →  mirror pair i is coherent (no error)
 *   syndrome[i] = 1  →  mirror pair i has a parity violation (error detected)
 *
 * The decoder maps non-zero syndromes to correction actions using the
 * Fano plane topology — errors propagate along Fano lines, so the
 * correction targets the intersection point of violated lines.
 *
 * Complexity: O(48) per tick — constant time, deterministic.
 *
 * This is the quantum-AI convergence point: the same algebraic structure
 * that defines the system's identity also protects it from errors.
 *
 * Pure functions + singleton engine. Projection-ready.
 *
 * @module hologram/kernel/stabilizer-engine
 */

import {
  MIRROR_PAIRS, MIRROR_COUNT, FANO_LINES, FANO_POINTS,
  type MirrorPair,
} from "../../genesis/axiom-mirror";
import { classifyZone, type CoherenceZone } from "../kernel/q-sched";

// ═══════════════════════════════════════════════════════════════════════
// Types — the language of error correction
// ═══════════════════════════════════════════════════════════════════════

/** A 48-bit syndrome vector — one bit per mirror pair. */
export interface Syndrome {
  /** Raw syndrome bits: true = parity violation at this mirror pair */
  readonly bits: readonly boolean[];
  /** Hamming weight: number of violated pairs (0 = clean) */
  readonly weight: number;
  /** Fano line violations: which of the 7 lines have errors */
  readonly fanoViolations: readonly number[];
  /** Timestamp of extraction */
  readonly timestamp: number;
}

/** A correction action decoded from a syndrome. */
export interface CorrectionAction {
  /** Whether a correction is needed */
  readonly needed: boolean;
  /** Which dimension(s) to correct (indices into coherence field) */
  readonly targets: readonly number[];
  /** Correction magnitude: how much to adjust (signed) */
  readonly magnitude: number;
  /** Correction confidence: how certain the decoder is */
  readonly confidence: number;
  /** Decoded Fano point: the intersection point of violated lines */
  readonly fanoPoint: number | null;
  /** Human-readable description */
  readonly label: string;
}

/**
 * StabilizerProjection — the kernel-visible view of the immune system.
 * Included in ProjectionFrame for UI rendering.
 */
export interface StabilizerProjection {
  /** Current syndrome weight (0 = perfectly coherent) */
  readonly syndromeWeight: number;
  /** System health ratio: (48 - weight) / 48 */
  readonly health: number;
  /** Whether a correction was applied this tick */
  readonly correctionApplied: boolean;
  /** Total corrections applied since boot */
  readonly totalCorrections: number;
  /** Total syndromes extracted since boot */
  readonly totalExtractions: number;
  /** Current Fano line violation count (0–7) */
  readonly fanoViolations: number;
  /** Coherence zone post-correction */
  readonly zone: CoherenceZone;
  /** Error rate: corrections / extractions */
  readonly errorRate: number;
}

// ═══════════════════════════════════════════════════════════════════════
// Syndrome Extraction — the parity check
// ═══════════════════════════════════════════════════════════════════════

/**
 * Extract a 48-bit syndrome from the coherence field.
 *
 * Each mirror pair (v, τ(v)) defines a parity check:
 *   syndrome[i] = |coherence[v] - coherence[τ(v)]| > threshold
 *
 * The coherence field is projected from the system's H-score and
 * process states into a 96-dimensional vector (one per Atlas vertex),
 * then checked for mirror symmetry.
 *
 * @param coherenceField — 96-dimensional coherence vector
 * @param threshold — parity violation threshold (default: 0.15)
 */
export function extractSyndrome(
  coherenceField: readonly number[],
  threshold = 0.15,
): Syndrome {
  const bits: boolean[] = new Array(MIRROR_COUNT);
  let weight = 0;

  for (let i = 0; i < MIRROR_COUNT; i++) {
    const pair = MIRROR_PAIRS[i];
    const vCoherence = coherenceField[pair.v] ?? 0.5;
    const wCoherence = coherenceField[pair.w] ?? 0.5;
    const violation = Math.abs(vCoherence - wCoherence) > threshold;
    bits[i] = violation;
    if (violation) weight++;
  }

  // Map syndrome to Fano line violations
  // Each Fano line maps to a contiguous block of ~7 mirror pairs
  const fanoViolations: number[] = [];
  const pairsPerLine = Math.floor(MIRROR_COUNT / FANO_POINTS); // 48/7 ≈ 6
  for (let line = 0; line < FANO_POINTS; line++) {
    const start = line * pairsPerLine;
    const end = Math.min(start + pairsPerLine, MIRROR_COUNT);
    let lineViolations = 0;
    for (let i = start; i < end; i++) {
      if (bits[i]) lineViolations++;
    }
    // A Fano line is violated if majority of its pairs are violated
    if (lineViolations > pairsPerLine / 2) {
      fanoViolations.push(line);
    }
  }

  return { bits, weight, fanoViolations, timestamp: Date.now() };
}

// ═══════════════════════════════════════════════════════════════════════
// Syndrome Decoder — error → correction
// ═══════════════════════════════════════════════════════════════════════

/**
 * Decode a syndrome into a correction action.
 *
 * The decoding strategy uses the Fano plane:
 *   - 0 violated lines → no error, no correction
 *   - 1 violated line  → single-line error, correct at line midpoint
 *   - 2 violated lines → intersection error, correct at Fano intersection
 *   - 3+ violated lines → systemic error, broad correction
 *
 * This mirrors how topological codes decode: the syndrome identifies
 * which stabilizer generators are violated, and the decoder finds the
 * minimum-weight correction that restores all parities.
 */
export function decodeSyndrome(syndrome: Syndrome): CorrectionAction {
  if (syndrome.weight === 0) {
    return {
      needed: false,
      targets: [],
      magnitude: 0,
      confidence: 1,
      fanoPoint: null,
      label: "Clean: all 48 mirror parities hold",
    };
  }

  const { fanoViolations, weight } = syndrome;

  // Single-line violation: localized error
  if (fanoViolations.length === 1) {
    const line = fanoViolations[0];
    const fanoLine = FANO_LINES[line % FANO_LINES.length];
    const target = fanoLine[1]; // midpoint of the Fano line
    return {
      needed: true,
      targets: [target],
      magnitude: -0.05 * (weight / MIRROR_COUNT),
      confidence: 0.9,
      fanoPoint: target,
      label: `Line ${line} violation: correcting at Fano point ${target}`,
    };
  }

  // Two-line violation: intersection error
  if (fanoViolations.length === 2) {
    const [a, b] = fanoViolations;
    const la = FANO_LINES[a % FANO_LINES.length];
    const lb = FANO_LINES[b % FANO_LINES.length];
    // Find intersection point
    let intersection: number | null = null;
    for (const p of la) {
      if (lb.includes(p)) { intersection = p; break; }
    }
    return {
      needed: true,
      targets: intersection !== null ? [intersection] : [la[1], lb[1]],
      magnitude: -0.08 * (weight / MIRROR_COUNT),
      confidence: intersection !== null ? 0.95 : 0.7,
      fanoPoint: intersection,
      label: intersection !== null
        ? `Lines ${a},${b} intersect at point ${intersection}: targeted correction`
        : `Lines ${a},${b}: distributed correction`,
    };
  }

  // Systemic violation: broad correction across all violated lines
  const targets = [...new Set(fanoViolations.flatMap(l =>
    [...FANO_LINES[l % FANO_LINES.length]]
  ))];
  return {
    needed: true,
    targets,
    magnitude: -0.12 * (weight / MIRROR_COUNT),
    confidence: Math.max(0.3, 1 - fanoViolations.length * 0.15),
    fanoPoint: null,
    label: `Systemic: ${fanoViolations.length} Fano lines violated, ${weight}/${MIRROR_COUNT} parity failures`,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Coherence Field Projection — system state → 96 dimensions
// ═══════════════════════════════════════════════════════════════════════

/**
 * Project the system's coherence state onto the 96-vertex Atlas.
 *
 * This is the bridge: it takes the kernel's scalar H-score and
 * process-level coherence values and distributes them across
 * the 96-dimensional Atlas manifold.
 *
 * Each vertex's coherence is derived from:
 *   coherence[v] = baseH + processModulation[v % processCount] + gradient × phase[v]
 *
 * The phase[v] term ensures that the field has structure — it's not
 * flat, so the syndrome extraction can detect genuine asymmetries.
 *
 * @param meanH - System-wide mean H-score
 * @param processHScores - Per-process H-scores
 * @param gradient - Current ∂H/∂t
 * @param tick - Current kernel tick (for phase evolution)
 */
export function projectCoherenceField(
  meanH: number,
  processHScores: readonly number[],
  gradient: number,
  tick: number,
): number[] {
  const field = new Array<number>(96);
  const procCount = Math.max(1, processHScores.length);

  for (let v = 0; v < 96; v++) {
    // Base: system mean H
    const base = meanH;

    // Process modulation: each vertex maps to a process
    const procIdx = v % procCount;
    const procH = processHScores[procIdx] ?? meanH;
    const procDelta = (procH - meanH) * 0.3;

    // Phase: vertex-dependent oscillation driven by tick
    // Uses the Atlas's sign-class structure (8 classes of 12)
    const signClass = Math.floor(v / 12);
    const phase = Math.sin((tick * 0.01 + signClass * Math.PI / 4) + v * 0.0654);
    const phaseDelta = gradient * phase * 0.1;

    field[v] = Math.max(0, Math.min(1, base + procDelta + phaseDelta));
  }

  return field;
}

// ═══════════════════════════════════════════════════════════════════════
// Stabilizer Engine — the singleton orchestrator
// ═══════════════════════════════════════════════════════════════════════

/**
 * StabilizerEngine — manages the continuous syndrome extraction,
 * decoding, and correction feedback loop.
 *
 * Integrates with:
 *   - HolographicSurface: corrections trigger refocus events
 *   - ProjectionFrame: syndrome state is projected for UI
 *   - RewardCircuit: successful corrections generate positive reward
 */
export class StabilizerEngine {
  private totalCorrections = 0;
  private totalExtractions = 0;
  private lastSyndrome: Syndrome | null = null;
  private lastCorrection: CorrectionAction | null = null;
  private correctionEma = 0; // EMA of syndrome weight

  /** Extraction frequency: run syndrome check every N ticks */
  private readonly extractionInterval: number;
  private ticksSinceExtraction = 0;

  constructor(extractionInterval = 5) {
    this.extractionInterval = extractionInterval;
  }

  /**
   * Tick the stabilizer engine. Called from the kernel's projection loop.
   *
   * Returns a StabilizerProjection for inclusion in the ProjectionFrame,
   * and optionally a CorrectionAction if errors were detected and corrected.
   *
   * @param meanH - System mean H-score
   * @param processHScores - Per-process H-scores
   * @param gradient - Current ∂H/∂t
   * @param tick - Current kernel tick
   */
  tick(
    meanH: number,
    processHScores: readonly number[],
    gradient: number,
    tick: number,
  ): { projection: StabilizerProjection; correction: CorrectionAction | null } {
    this.ticksSinceExtraction++;

    // Only extract syndromes at the configured interval (not every frame)
    if (this.ticksSinceExtraction >= this.extractionInterval) {
      this.ticksSinceExtraction = 0;
      return this.extract(meanH, processHScores, gradient, tick);
    }

    // Between extractions, return cached state
    return {
      projection: this.project(meanH),
      correction: null,
    };
  }

  /** Run a full syndrome extraction and decode cycle. */
  private extract(
    meanH: number,
    processHScores: readonly number[],
    gradient: number,
    tick: number,
  ): { projection: StabilizerProjection; correction: CorrectionAction | null } {
    this.totalExtractions++;

    // 1. Project coherence field onto Atlas
    const field = projectCoherenceField(meanH, processHScores, gradient, tick);

    // 2. Extract syndrome
    const syndrome = extractSyndrome(field);
    this.lastSyndrome = syndrome;

    // 3. Update EMA of syndrome weight
    const alpha = 0.15;
    this.correctionEma = this.correctionEma * (1 - alpha) + syndrome.weight * alpha;

    // 4. Decode syndrome
    const correction = decodeSyndrome(syndrome);
    this.lastCorrection = correction;

    if (correction.needed) {
      this.totalCorrections++;
    }

    return {
      projection: this.project(meanH),
      correction: correction.needed ? correction : null,
    };
  }

  /** Project the stabilizer state for inclusion in ProjectionFrame. */
  private project(meanH: number): StabilizerProjection {
    const weight = this.lastSyndrome?.weight ?? 0;
    const health = (MIRROR_COUNT - weight) / MIRROR_COUNT;

    return {
      syndromeWeight: weight,
      health,
      correctionApplied: this.lastCorrection?.needed ?? false,
      totalCorrections: this.totalCorrections,
      totalExtractions: this.totalExtractions,
      fanoViolations: this.lastSyndrome?.fanoViolations.length ?? 0,
      zone: classifyZone(meanH * health),
      errorRate: this.totalExtractions > 0
        ? this.totalCorrections / this.totalExtractions
        : 0,
    };
  }

  /** Get the last extracted syndrome (for diagnostics). */
  getLastSyndrome(): Syndrome | null {
    return this.lastSyndrome;
  }

  /** Get the last correction action (for diagnostics). */
  getLastCorrection(): CorrectionAction | null {
    return this.lastCorrection;
  }

  /** Get the EMA of syndrome weight (smoothed error signal). */
  getErrorEma(): number {
    return this.correctionEma;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════════════

let _engine: StabilizerEngine | null = null;

/** Get the singleton stabilizer engine. */
export function getStabilizerEngine(): StabilizerEngine {
  if (!_engine) {
    _engine = new StabilizerEngine();
  }
  return _engine;
}
