/**
 * HolonomyLens — Tonal Center Drift & Closed-Path Detection
 * ═══════════════════════════════════════════════════════
 *
 * Tracks the "tonal center" of audio as it drifts through harmonic space
 * over sliding windows. The tonal center is derived from the spectral
 * centroid mapped onto Z/256Z, giving us a ring element per frame.
 *
 * Holonomy is the accumulated angular displacement along a closed path
 * in this ring. When the path returns near its origin (within a tolerance),
 * we declare a "closed loop" — the musical analogue of parallel transport
 * returning to its starting point.
 *
 * The holonomy angle accumulates the signed ring-distance between
 * consecutive tonal centers, normalized to [-π, π].
 *
 * Every HolonomyPoint carries a derivation ID linked to the source frame.
 *
 * @module audio/lenses/holonomy-lens
 * @namespace audio/
 */

import type { HarmonicLensFrame } from "./harmonic-lens";
import type { AudioFeatureData } from "../types";

// ── Constants ───────────────────────────────────────────────────────────────

/** Window size for loop detection (frames). */
const LOOP_WINDOW = 90; // ~3s at 30fps

/** Ring tolerance for declaring a closed loop (on Z/256Z). */
const CLOSURE_TOLERANCE = 8; // ±8 out of 256

/** Max path history. */
const MAX_PATH_LENGTH = 3600; // ~2 minutes

/** Derivation prefix. */
const DERIVATION_PREFIX = "urn:uor:derivation:lens:holonomy";

// ── Types ───────────────────────────────────────────────────────────────────

export interface HolonomyPoint {
  /** Time offset in seconds. */
  time: number;
  /** Tonal center as a ring element [0, 255]. */
  tonalCenter: number;
  /** Accumulated holonomy angle [−π, π] (wrapped). */
  holonomyAngle: number;
  /** Raw accumulated phase (unwrapped). */
  rawPhase: number;
  /** Whether this point closes a loop (returns near origin). */
  isLoopClosure: boolean;
  /** Derivation ID from source frame. */
  sourceDerivationId: string;
  /** Epistemic grade from source. */
  epistemicGrade: "A" | "C";
}

export interface HolonomyLoop {
  /** Start time of the loop. */
  startTime: number;
  /** End time (closure point). */
  endTime: number;
  /** Duration in seconds. */
  duration: number;
  /** Net holonomy angle at closure (ideally near 0 for perfect return). */
  residualAngle: number;
  /** How many frames in the loop. */
  frameCount: number;
  /** Max deviation from origin during the loop. */
  maxDeviation: number;
  /** Derivation ID for this loop detection. */
  derivationId: string;
}

export interface HolonomyLensState {
  /** Full path history. */
  path: HolonomyPoint[];
  /** Detected closed loops. */
  loops: HolonomyLoop[];
  /** Current tonal center. */
  currentCenter: number;
  /** Origin tonal center (first frame of current window). */
  originCenter: number;
  /** Current accumulated holonomy angle. */
  currentAngle: number;
  /** Distance from origin on the ring. */
  distanceFromOrigin: number;
  /** Total frames processed. */
  frameCount: number;
  /** Whether currently "returning" to origin. */
  isConverging: boolean;
}

// ── Derivation utility ─────────────────────────────────────────────────────

function deriveLoopId(
  startTime: number,
  endTime: number,
  residualAngle: number,
  frameCount: number,
): string {
  let hash = 0x811c9dc5;
  hash = (hash ^ Math.round(startTime * 1000)) * 0x01000193;
  hash = (hash ^ Math.round(endTime * 1000)) * 0x01000193;
  hash = (hash ^ Math.round(residualAngle * 10000)) * 0x01000193;
  hash = (hash ^ frameCount) * 0x01000193;
  const hex = (hash >>> 0).toString(16).padStart(8, "0");
  return `${DERIVATION_PREFIX}:loop:${hex}`;
}

// ── HolonomyLens ────────────────────────────────────────────────────────────

export class HolonomyLens {
  private path: HolonomyPoint[] = [];
  private loops: HolonomyLoop[] = [];
  private startTime = 0;
  private frameCount = 0;
  private rawPhase = 0;
  private prevCenter = -1;
  private originCenter = -1;
  private windowStartIdx = 0;
  private windowOrigin = -1;
  private maxDeviationInWindow = 0;
  private _features: AudioFeatureData[] = [];

  /**
   * Push a HarmonicLensFrame. Derives tonal center from
   * meanStratum mapped to Z/256Z and tracks holonomy.
   */
  push(frame: HarmonicLensFrame): HolonomyPoint {
    if (this.startTime === 0) this.startTime = frame.timestamp;
    this.frameCount++;

    const time = (frame.timestamp - this.startTime) / 1000;

    // Derive tonal center: map meanStratum [0,16] → [0,255]
    const tonalCenter = Math.round(frame.meanStratum * 255 / 16) & 0xff;

    if (this.originCenter < 0) {
      this.originCenter = tonalCenter;
      this.windowOrigin = tonalCenter;
    }

    // Signed ring distance from previous center
    let delta = 0;
    if (this.prevCenter >= 0) {
      const raw = tonalCenter - this.prevCenter;
      // Wrap to [-128, 127] (signed distance on Z/256Z)
      delta = ((raw + 128) % 256 + 256) % 256 - 128;
    }
    this.prevCenter = tonalCenter;

    // Accumulate raw phase
    this.rawPhase += delta;

    // Wrap to [-π, π] for display
    const holonomyAngle = ((this.rawPhase / 128) * Math.PI) % (2 * Math.PI);
    const wrappedAngle = holonomyAngle > Math.PI ? holonomyAngle - 2 * Math.PI :
      holonomyAngle < -Math.PI ? holonomyAngle + 2 * Math.PI : holonomyAngle;

    // Distance from window origin on ring
    const fwd = ((tonalCenter - this.windowOrigin) % 256 + 256) % 256;
    const bwd = ((this.windowOrigin - tonalCenter) % 256 + 256) % 256;
    const distFromOrigin = Math.min(fwd, bwd);

    if (distFromOrigin > this.maxDeviationInWindow) {
      this.maxDeviationInWindow = distFromOrigin;
    }

    // Check for loop closure: we've traveled at least LOOP_WINDOW frames
    // and returned within CLOSURE_TOLERANCE of the window origin
    const windowFrames = this.frameCount - this.windowStartIdx;
    const isLoopClosure = windowFrames >= LOOP_WINDOW &&
      distFromOrigin <= CLOSURE_TOLERANCE &&
      this.maxDeviationInWindow > CLOSURE_TOLERANCE * 2; // Must have actually drifted away

    if (isLoopClosure) {
      const startTime = this.path.length > this.windowStartIdx
        ? this.path[this.windowStartIdx].time
        : 0;

      const residualAngle = (distFromOrigin / 128) * Math.PI;
      const loopDerivation = deriveLoopId(startTime, time, residualAngle, windowFrames);

      this.loops.push({
        startTime,
        endTime: time,
        duration: time - startTime,
        residualAngle,
        frameCount: windowFrames,
        maxDeviation: this.maxDeviationInWindow,
        derivationId: loopDerivation,
      });

      // Emit loop as verifiable feature
      this._features.push({
        featureId: `holonomy:loop:${loopDerivation.slice(-8)}`,
        label: "Holonomy Loop",
        value: residualAngle,
        confidence: frame.epistemicGrade === "A" ? 0.9 : 0.5,
        unit: "rad",
        frameRange: [this.windowStartIdx, this.frameCount],
        lensId: "lens:holonomy:v1",
        derivationId: loopDerivation,
      });

      // Keep bounded
      if (this.loops.length > 30) {
        this.loops = this.loops.slice(-30);
      }

      // Reset window for next loop detection
      this.windowStartIdx = this.frameCount;
      this.windowOrigin = tonalCenter;
      this.maxDeviationInWindow = 0;
    }

    const point: HolonomyPoint = {
      time,
      tonalCenter,
      holonomyAngle: wrappedAngle,
      rawPhase: this.rawPhase,
      isLoopClosure,
      sourceDerivationId: frame.derivationId,
      epistemicGrade: frame.epistemicGrade,
    };

    this.path.push(point);
    if (this.path.length > MAX_PATH_LENGTH) {
      const trim = this.path.length - MAX_PATH_LENGTH;
      this.path = this.path.slice(trim);
      this.windowStartIdx = Math.max(0, this.windowStartIdx - trim);
    }

    // Periodic feature emission
    if (this.frameCount % 30 === 0) {
      this._features.push({
        featureId: `holonomy:angle:f${this.frameCount}`,
        label: "Holonomy Angle",
        value: wrappedAngle,
        confidence: frame.epistemicGrade === "A" ? 1.0 : 0.5,
        unit: "rad",
        frameRange: [this.frameCount - 30, this.frameCount],
        lensId: "lens:holonomy:v1",
        derivationId: `${DERIVATION_PREFIX}:angle:f${this.frameCount}`,
      });

      if (this._features.length > 200) {
        this._features = this._features.slice(-200);
      }
    }

    return point;
  }

  extractFeatures(): AudioFeatureData[] {
    return [...this._features];
  }

  getState(): HolonomyLensState {
    const current = this.path.length > 0 ? this.path[this.path.length - 1] : null;
    const fwd = current ? ((current.tonalCenter - this.windowOrigin) % 256 + 256) % 256 : 0;
    const bwd = current ? ((this.windowOrigin - current.tonalCenter) % 256 + 256) % 256 : 0;
    const distanceFromOrigin = Math.min(fwd, bwd);

    // Converging if distance is decreasing over last 10 frames
    let isConverging = false;
    if (this.path.length > 10) {
      const recent = this.path.slice(-10);
      const dists = recent.map((p) => {
        const f = ((p.tonalCenter - this.windowOrigin) % 256 + 256) % 256;
        const b = ((this.windowOrigin - p.tonalCenter) % 256 + 256) % 256;
        return Math.min(f, b);
      });
      isConverging = dists[dists.length - 1] < dists[0];
    }

    return {
      path: this.path,
      loops: this.loops,
      currentCenter: current?.tonalCenter ?? 0,
      originCenter: this.windowOrigin >= 0 ? this.windowOrigin : 0,
      currentAngle: current?.holonomyAngle ?? 0,
      distanceFromOrigin,
      frameCount: this.frameCount,
      isConverging,
    };
  }

  /** Get recent path window for visualization. */
  getRecentPath(maxPoints: number = 120): HolonomyPoint[] {
    return this.path.slice(-maxPoints);
  }

  reset(): void {
    this.path = [];
    this.loops = [];
    this.startTime = 0;
    this.frameCount = 0;
    this.rawPhase = 0;
    this.prevCenter = -1;
    this.originCenter = -1;
    this.windowStartIdx = 0;
    this.windowOrigin = -1;
    this.maxDeviationInWindow = 0;
    this._features = [];
  }
}
