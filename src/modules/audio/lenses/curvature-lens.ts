/**
 * CurvatureLens — Harmonic Tension Time-Series
 * ═══════════════════════════════════════════════════════════════════
 *
 * Maps UOR CurvatureObservable to musical harmonic tension.
 * Tracks curvature over a sliding window, detects catastrophe
 * events (drops/impacts), and maintains a time-series for visualization.
 *
 * Catastrophe threshold: 4/2^n where n = quantum level.
 * At quantum = 8 (16-bit audio): threshold = 4/256 = 0.015625
 *
 * @module audio/lenses/curvature-lens
 * @namespace audio/
 */

import type { HarmonicLensFrame } from "./harmonic-lens";

/** Ring-derived catastrophe threshold at quantum level 8 (16-bit audio). */
const CATASTROPHE_QUANTUM = 8;
const CATASTROPHE_THRESHOLD = 4 / Math.pow(2, CATASTROPHE_QUANTUM); // 0.015625

/** Maximum time-series length (60s at ~30fps = 1800 points). */
const MAX_SERIES_LENGTH = 1800;

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
}

export interface CatastropheEvent {
  /** Time of the event. */
  time: number;
  /** Curvature at the event. */
  curvature: number;
  /** Energy ratio (post/pre). */
  energyRatio: number;
  /** Label: "drop", "impact", "shift". */
  type: "drop" | "impact" | "shift";
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
  /** The catastrophe threshold value. */
  threshold: number;
  /** Peak curvature seen. */
  peakCurvature: number;
}

export class CurvatureLens {
  private series: CurvaturePoint[] = [];
  private catastrophes: CatastropheEvent[] = [];
  private startTime: number = 0;
  private curvatureSum: number = 0;
  private peakCurvature: number = 0;
  private prevRms: number = 0;
  private frameCount: number = 0;

  /** The ring-derived catastrophe threshold. */
  readonly threshold = CATASTROPHE_THRESHOLD;

  /**
   * Push a HarmonicLensFrame into the curvature lens.
   * Automatically detects catastrophe events.
   */
  push(frame: HarmonicLensFrame): CurvaturePoint {
    if (this.startTime === 0) this.startTime = frame.timestamp;
    this.frameCount++;

    const time = (frame.timestamp - this.startTime) / 1000;
    const curvature = frame.curvature;
    this.curvatureSum += curvature;

    if (curvature > this.peakCurvature) this.peakCurvature = curvature;

    // Catastrophe detection: curvature spike + energy ratio
    const isCatastrophe = curvature > CATASTROPHE_THRESHOLD;

    if (isCatastrophe && this.prevRms > 0) {
      const energyRatio = frame.rmsEnergy / this.prevRms;
      const type: CatastropheEvent["type"] =
        energyRatio > 2 ? "impact" :
        energyRatio < 0.5 ? "drop" : "shift";

      this.catastrophes.push({ time, curvature, energyRatio, type });

      // Keep only last 50 events
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
    };

    this.series.push(point);
    if (this.series.length > MAX_SERIES_LENGTH) {
      this.series = this.series.slice(-MAX_SERIES_LENGTH);
    }

    this.prevRms = frame.rmsEnergy;
    return point;
  }

  /** Get the current lens state for rendering. */
  getState(): CurvatureLensState {
    const meanCurvature = this.frameCount > 0 ? this.curvatureSum / this.frameCount : 0;
    // Normalize tension to [0, 1] — peak at ~0.3 curvature = full tension
    const tensionLevel = Math.min(1, meanCurvature / 0.3);

    return {
      series: this.series,
      catastrophes: this.catastrophes,
      meanCurvature,
      tensionLevel,
      threshold: CATASTROPHE_THRESHOLD,
      peakCurvature: this.peakCurvature,
    };
  }

  /** Get a windowed subset of the series (last N seconds). */
  getWindow(windowSeconds: number): CurvaturePoint[] {
    if (this.series.length === 0) return [];
    const latest = this.series[this.series.length - 1].time;
    const cutoff = latest - windowSeconds;
    return this.series.filter((p) => p.time >= cutoff);
  }

  reset(): void {
    this.series = [];
    this.catastrophes = [];
    this.startTime = 0;
    this.curvatureSum = 0;
    this.peakCurvature = 0;
    this.prevRms = 0;
    this.frameCount = 0;
  }
}
