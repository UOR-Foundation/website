/**
 * CurvatureLens — Harmonic Tension Time-Series with Derivation Chains
 * ═══════════════════════════════════════════════════════════════════
 *
 * Maps UOR CurvatureObservable to musical harmonic tension.
 * Tracks curvature over a sliding window, detects catastrophe events,
 * and produces verifiable AudioFeatureData with derivation chains.
 *
 * Every CurvaturePoint and CatastropheEvent carries:
 *   - A derivation ID linked to the source HarmonicLensFrame
 *   - An epistemic grade inherited from the source frame
 *   - A content-addressed proof linking catastrophe detection to
 *     the ring-derived threshold (4/2^quantum)
 *
 * Catastrophe threshold: 4/2^n where n = quantum level.
 * At quantum = 8: threshold = 4/256 = 0.015625
 *
 * @module audio/lenses/curvature-lens
 * @namespace audio/
 */

import type { HarmonicLensFrame } from "./harmonic-lens";
import type { AudioFeatureData } from "../types";

// ── Constants ───────────────────────────────────────────────────────────────

/** Quantum level for audio analysis (16-bit = 2^8 ring). */
const CATASTROPHE_QUANTUM = 8;

/** Ring-derived catastrophe threshold at quantum level 8. */
const CATASTROPHE_THRESHOLD = 4 / Math.pow(2, CATASTROPHE_QUANTUM); // 0.015625

/** Maximum time-series length (60s at ~30fps = 1800 points). */
const MAX_SERIES_LENGTH = 1800;

/** Derivation URN prefix for curvature lens. */
const DERIVATION_PREFIX = "urn:uor:derivation:lens:curvature";

// ── Types ───────────────────────────────────────────────────────────────────

export interface CurvaturePoint {
  /** Time offset in seconds from series start. */
  time: number;
  /** Curvature value κ. */
  curvature: number;
  /** Whether this point crossed the catastrophe threshold. */
  isCatastrophe: boolean;
  /** RMS energy at this point. */
  rmsEnergy: number;
  /** Mean stratum at this point. */
  meanStratum: number;
  /** Derivation ID from the source HarmonicLensFrame. */
  sourceDerivationId: string;
  /** Epistemic grade inherited from source. */
  epistemicGrade: "A" | "C";
}

export interface CatastropheEvent {
  /** Time of the event. */
  time: number;
  /** Curvature at the event. */
  curvature: number;
  /** Energy ratio (post/pre). */
  energyRatio: number;
  /** Classification: "drop" (energy decrease), "impact" (energy spike), "shift" (lateral). */
  type: "drop" | "impact" | "shift";
  /** Derivation ID for this specific catastrophe detection. */
  derivationId: string;
  /** Content-addressed proof ID linking to the threshold derivation. */
  thresholdProofId: string;
  /** Source frame's derivation ID. */
  sourceDerivationId: string;
}

export interface CurvatureLensState {
  /** The full time-series. */
  series: CurvaturePoint[];
  /** Detected catastrophe events. */
  catastrophes: CatastropheEvent[];
  /** Running mean curvature. */
  meanCurvature: number;
  /** Current tension level [0, 1] (normalized curvature). */
  tensionLevel: number;
  /** The catastrophe threshold value (ring-derived). */
  threshold: number;
  /** Peak curvature seen. */
  peakCurvature: number;
  /** Total frames processed. */
  frameCount: number;
  /** Epistemic grade of the majority of frames. */
  dominantGrade: "A" | "C";
}

// ── Derivation utilities ────────────────────────────────────────────────────

function deriveCatastropheId(
  time: number,
  curvature: number,
  type: string,
  frameIndex: number,
): string {
  let hash = 0x811c9dc5;
  hash = (hash ^ Math.round(time * 1000)) * 0x01000193;
  hash = (hash ^ Math.round(curvature * 100000)) * 0x01000193;
  hash = (hash ^ type.charCodeAt(0)) * 0x01000193;
  hash = (hash ^ frameIndex) * 0x01000193;
  const hex = (hash >>> 0).toString(16).padStart(8, "0");
  return `${DERIVATION_PREFIX}:catastrophe:${hex}`;
}

/**
 * The threshold proof ID is deterministic — it's derived from the
 * ring arithmetic constants, not from runtime data.
 */
const THRESHOLD_PROOF_ID =
  `${DERIVATION_PREFIX}:threshold:q${CATASTROPHE_QUANTUM}:${CATASTROPHE_THRESHOLD.toFixed(6).replace(".", "")}`;

// ── CurvatureLens ───────────────────────────────────────────────────────────

export class CurvatureLens {
  private series: CurvaturePoint[] = [];
  private catastrophes: CatastropheEvent[] = [];
  private startTime: number = 0;
  private curvatureSum: number = 0;
  private peakCurvature: number = 0;
  private prevRms: number = 0;
  private frameCount: number = 0;
  private gradeACounts: number = 0;

  /** Accumulated verifiable features. */
  private _features: AudioFeatureData[] = [];

  /** The ring-derived catastrophe threshold. */
  readonly threshold = CATASTROPHE_THRESHOLD;

  /** The quantum level. */
  readonly quantum = CATASTROPHE_QUANTUM;

  /**
   * Push a HarmonicLensFrame into the curvature lens.
   * Detects catastrophe events and produces verifiable features.
   */
  push(frame: HarmonicLensFrame): CurvaturePoint {
    if (this.startTime === 0) this.startTime = frame.timestamp;
    this.frameCount++;
    if (frame.epistemicGrade === "A") this.gradeACounts++;

    const time = (frame.timestamp - this.startTime) / 1000;
    const curvature = frame.curvature;
    this.curvatureSum += curvature;

    if (curvature > this.peakCurvature) this.peakCurvature = curvature;

    // Catastrophe detection: curvature exceeds ring-derived threshold
    const isCatastrophe = curvature > CATASTROPHE_THRESHOLD;

    if (isCatastrophe && this.prevRms > 0) {
      const energyRatio = frame.rmsEnergy / this.prevRms;
      const type: CatastropheEvent["type"] =
        energyRatio > 2 ? "impact" :
        energyRatio < 0.5 ? "drop" : "shift";

      const catDerivationId = deriveCatastropheId(
        time, curvature, type, frame.frameIndex,
      );

      this.catastrophes.push({
        time,
        curvature,
        energyRatio,
        type,
        derivationId: catDerivationId,
        thresholdProofId: THRESHOLD_PROOF_ID,
        sourceDerivationId: frame.derivationId,
      });

      // Emit catastrophe as a verifiable feature
      this._features.push({
        featureId: `catastrophe:${type}:${catDerivationId.slice(-8)}`,
        label: `Catastrophe ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        value: curvature,
        confidence: frame.epistemicGrade === "A" ? 0.95 : 0.5,
        unit: "κ",
        frameRange: [frame.frameIndex, frame.frameIndex + 1],
        lensId: "lens:curvature:v2",
        derivationId: catDerivationId,
      });

      // Keep bounded
      if (this.catastrophes.length > 50) {
        this.catastrophes = this.catastrophes.slice(-50);
      }
    }

    const point: CurvaturePoint = {
      time,
      curvature,
      isCatastrophe,
      rmsEnergy: frame.rmsEnergy,
      meanStratum: frame.meanStratum,
      sourceDerivationId: frame.derivationId,
      epistemicGrade: frame.epistemicGrade,
    };

    this.series.push(point);
    if (this.series.length > MAX_SERIES_LENGTH) {
      this.series = this.series.slice(-MAX_SERIES_LENGTH);
    }

    this.prevRms = frame.rmsEnergy;

    // Emit periodic aggregate features (every 30 frames ≈ 1/sec)
    if (this.frameCount % 30 === 0) {
      this.emitAggregateFeature(frame);
    }

    return point;
  }

  /**
   * Emit aggregate curvature features with derivation chain.
   */
  private emitAggregateFeature(frame: HarmonicLensFrame): void {
    const meanK = this.frameCount > 0 ? this.curvatureSum / this.frameCount : 0;
    const tension = Math.min(1, meanK / 0.3);

    const aggDerivation = `${DERIVATION_PREFIX}:aggregate:f${this.frameCount}`;
    const grade = this.gradeACounts > this.frameCount / 2 ? "A" : "C";

    this._features.push(
      {
        featureId: `curvature:mean:f${this.frameCount}`,
        label: "Mean Curvature",
        value: meanK,
        confidence: grade === "A" ? 1.0 : 0.6,
        unit: "κ",
        frameRange: [0, frame.frameIndex + 1],
        lensId: "lens:curvature:v2",
        derivationId: `${aggDerivation}:mean`,
      },
      {
        featureId: `curvature:peak:f${this.frameCount}`,
        label: "Peak Curvature",
        value: this.peakCurvature,
        confidence: grade === "A" ? 1.0 : 0.6,
        unit: "κ",
        frameRange: [0, frame.frameIndex + 1],
        lensId: "lens:curvature:v2",
        derivationId: `${aggDerivation}:peak`,
      },
      {
        featureId: `tension:level:f${this.frameCount}`,
        label: "Tension Level",
        value: tension,
        confidence: grade === "A" ? 0.9 : 0.5,
        unit: "ratio",
        frameRange: [0, frame.frameIndex + 1],
        lensId: "lens:curvature:v2",
        derivationId: `${aggDerivation}:tension`,
      },
    );

    // Keep bounded
    if (this._features.length > 300) {
      this._features = this._features.slice(-300);
    }
  }

  /**
   * Extract all accumulated verifiable features.
   */
  extractFeatures(): AudioFeatureData[] {
    return [...this._features];
  }

  /** Get the current lens state for rendering. */
  getState(): CurvatureLensState {
    const meanCurvature = this.frameCount > 0 ? this.curvatureSum / this.frameCount : 0;
    const tensionLevel = Math.min(1, meanCurvature / 0.3);
    const dominantGrade = this.gradeACounts > this.frameCount / 2 ? "A" : "C";

    return {
      series: this.series,
      catastrophes: this.catastrophes,
      meanCurvature,
      tensionLevel,
      threshold: CATASTROPHE_THRESHOLD,
      peakCurvature: this.peakCurvature,
      frameCount: this.frameCount,
      dominantGrade,
    };
  }

  /** Get a windowed subset of the series (last N seconds). */
  getWindow(windowSeconds: number): CurvaturePoint[] {
    if (this.series.length === 0) return [];
    const latest = this.series[this.series.length - 1].time;
    const cutoff = latest - windowSeconds;
    return this.series.filter((p) => p.time >= cutoff);
  }

  /**
   * Produce a catastrophe proof certificate for the current session.
   * This is a verifiable summary of all detected catastrophe events.
   */
  getCatastropheProofCertificate(): {
    thresholdProofId: string;
    quantum: number;
    threshold: number;
    totalFrames: number;
    totalCatastrophes: number;
    catastropheRate: number;
    dominantGrade: "A" | "C";
    events: CatastropheEvent[];
  } {
    return {
      thresholdProofId: THRESHOLD_PROOF_ID,
      quantum: CATASTROPHE_QUANTUM,
      threshold: CATASTROPHE_THRESHOLD,
      totalFrames: this.frameCount,
      totalCatastrophes: this.catastrophes.length,
      catastropheRate: this.frameCount > 0
        ? this.catastrophes.length / this.frameCount
        : 0,
      dominantGrade: this.gradeACounts > this.frameCount / 2 ? "A" : "C",
      events: [...this.catastrophes],
    };
  }

  reset(): void {
    this.series = [];
    this.catastrophes = [];
    this.startTime = 0;
    this.curvatureSum = 0;
    this.peakCurvature = 0;
    this.prevRms = 0;
    this.frameCount = 0;
    this.gradeACounts = 0;
    this._features = [];
  }
}
