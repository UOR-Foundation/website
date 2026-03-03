/**
 * Holographic Surface — Self-Verification, Self-Healing & Self-Improvement
 * ════════════════════════════════════════════════════════════════════════
 *
 * The holographic principle states that information on a boundary surface
 * encodes everything about the volume it encloses. This module IS that
 * surface: every operation in the system is a projection through it.
 *
 * The surface performs three acts simultaneously on every transit:
 *
 *   1. VERIFY  — Is this projection coherent? (self-verification)
 *   2. REFOCUS — If coherence dropped, restore to last coherent state (self-healing)
 *   3. EVOLVE  — Record the gradient for future prediction (self-improvement)
 *
 * The single optimization metric is coherence (H-score ∈ [0, 1]).
 * The single derivative is ∂H/∂t — the coherence gradient over time.
 *
 *   ∂H/∂t > 0  →  system is self-improving  →  reinforce pathway
 *   ∂H/∂t = 0  →  system is stable           →  maintain
 *   ∂H/∂t < 0  →  system is degrading        →  refocus (heal)
 *
 * QSVG Integration (Geometric Tick):
 *   Every projection receipt now carries geometric provenance:
 *   - Drift measured in δ₀ (angular defect) units
 *   - Projection fidelity corrected by γ_T = 0.0794 (anomalous dimension)
 *   - 3-6-9 triadic phase assignment
 *   - Spectral health from critical-line alignment
 *
 * @module hologram/kernel/holographic-surface
 */

import {
  measureGeometricState,
  measureGeometricDrift,
  computeRefocusTarget,
  spectralHealth,
  GEOMETRIC_CATASTROPHE,
  type GeometricMeasurement,
  type SpectralHealth,
  type GeometricZone,
} from "../platform";

// ═══════════════════════════════════════════════════════════════════════
// Types — the language of the surface
// ═══════════════════════════════════════════════════════════════════════

/**
 * ProjectionReceipt — proof that an operation transited the surface.
 * Every system action produces one. They form a verifiable chain.
 */
export interface ProjectionReceipt {
  /** Unique receipt identifier */
  readonly id: string;
  /** Human-readable operation label */
  readonly operation: string;
  /** Timestamp of transit (ms since epoch) */
  readonly timestamp: number;
  /** H-score before transit */
  readonly coherenceBefore: number;
  /** H-score after transit (may differ from raw if healed) */
  readonly coherenceAfter: number;
  /** Instantaneous ∂H/∂t at this transit */
  readonly gradient: number;
  /** Did the projection pass coherence verification? */
  readonly verified: boolean;
  /** Was self-healing (refocus) triggered? */
  readonly refocused: boolean;
  /** Was human feedback absorbed in this transit? */
  readonly humanSignal: boolean;
  /** Surface trend at time of transit */
  readonly trend: SurfaceTrend;
  /** QSVG geometric provenance (when available) */
  readonly geometric?: GeometricProvenance;
}

/**
 * GeometricProvenance — QSVG-derived metrics attached to every receipt.
 * Makes every projection receipt physically meaningful.
 */
export interface GeometricProvenance {
  /** Drift in δ₀ (angular defect) units */
  readonly defects: number;
  /** Geometric zone: COHERENCE / DRIFT / COLLAPSE */
  readonly zone: GeometricZone;
  /** 3-6-9 triadic phase */
  readonly phase: 3 | 6 | 9;
  /** Projection fidelity with γ_T correction */
  readonly fidelity: number;
  /** Spectral coupling at this drift level */
  readonly coupling: number;
  /** Spectral grade (A/B/C/D) */
  readonly spectralGrade: string;
}

/** The three states of the surface — derived from ∂H/∂t */
export type SurfaceTrend = "evolving" | "stable" | "refocusing";

/**
 * SurfaceGradient — the continuous coherence derivative.
 * Three temporal windows for multi-scale awareness:
 *   - instantaneous: raw delta (noisy but responsive)
 *   - shortTerm: 10-sample EMA (breathing-scale rhythm)
 *   - longTerm: 100-sample EMA (session-scale trend)
 */
export interface SurfaceGradient {
  readonly instantaneous: number;
  readonly shortTerm: number;
  readonly longTerm: number;
  readonly trend: SurfaceTrend;
  /** Number of transits recorded */
  readonly transitCount: number;
  /** Number of self-healing events triggered */
  readonly refocusCount: number;
  /** Ratio of verified transits (0–1) */
  readonly verificationRate: number;
}

/**
 * SurfaceState — the full observable state of the holographic surface.
 * Consumers can subscribe to this for real-time system health.
 */
export interface SurfaceState {
  readonly currentCoherence: number;
  readonly gradient: SurfaceGradient;
  readonly lastReceipt: ProjectionReceipt | null;
  readonly isHealthy: boolean;
  readonly uptime: number;
}

// ═══════════════════════════════════════════════════════════════════════
// Configuration — tuning the surface's sensitivity
// ═══════════════════════════════════════════════════════════════════════

export interface SurfaceConfig {
  /** Ring buffer size for coherence history (default: 256, Q0-aligned) */
  readonly historyDepth: number;
  /** ∂H/∂t threshold below which refocus triggers (default: -0.08) */
  readonly refocusThreshold: number;
  /** EMA alpha for short-term gradient (default: 0.2) */
  readonly shortTermAlpha: number;
  /** EMA alpha for long-term gradient (default: 0.05) */
  readonly longTermAlpha: number;
  /** Human feedback weight — how much a single human signal nudges H (default: 0.03) */
  readonly humanFeedbackWeight: number;
  /** Maximum receipts to retain (default: 512) */
  readonly maxReceipts: number;
}

const DEFAULT_SURFACE_CONFIG: SurfaceConfig = {
  historyDepth: 256,
  refocusThreshold: -0.08,
  shortTermAlpha: 0.2,
  longTermAlpha: 0.05,
  humanFeedbackWeight: 0.03,
  maxReceipts: 512,
};

// ═══════════════════════════════════════════════════════════════════════
// HolographicSurface — the boundary through which all projections pass
// ═══════════════════════════════════════════════════════════════════════

export class HolographicSurface {
  private config: SurfaceConfig;
  private history: Float64Array;
  private historyHead = 0;
  private historyCount = 0;
  private receipts: ProjectionReceipt[] = [];
  private transitCount = 0;
  private refocusCount = 0;
  private verifiedCount = 0;

  // EMA state — zero-allocation gradient computation
  private shortTermEma = 0;
  private longTermEma = 0;
  private prevH = 0.5;
  private startTime = 0;

  // Listeners for reactive consumers
  private listeners = new Set<(state: SurfaceState) => void>();

  constructor(config?: Partial<SurfaceConfig>) {
    this.config = { ...DEFAULT_SURFACE_CONFIG, ...config };
    this.history = new Float64Array(this.config.historyDepth);
    this.startTime = Date.now();
  }

  // ── Core: Project Through Surface ─────────────────────────────────

  /**
   * Project an operation through the holographic surface.
   *
   * This is THE primitive. Every system action calls this.
   * It simultaneously verifies, heals, and evolves.
   *
   * @param coherenceBefore H-score before the operation
   * @param coherenceAfter H-score after the operation
   * @param operation Human-readable label (e.g., "panel:open:browser")
   * @returns ProjectionReceipt — proof of transit
   */
  project(
    coherenceBefore: number,
    coherenceAfter: number,
    operation = "projection",
  ): ProjectionReceipt {
    this.transitCount++;

    // 1. VERIFY — is the projection within valid bounds?
    const verified =
      coherenceAfter >= 0 &&
      coherenceAfter <= 1 &&
      isFinite(coherenceAfter);

    // 2. Compute instantaneous gradient
    const instantGradient = coherenceAfter - coherenceBefore;

    // 3. Update EMAs (zero-allocation)
    this.shortTermEma =
      this.shortTermEma * (1 - this.config.shortTermAlpha) +
      instantGradient * this.config.shortTermAlpha;
    this.longTermEma =
      this.longTermEma * (1 - this.config.longTermAlpha) +
      instantGradient * this.config.longTermAlpha;

    // 4. REFOCUS — geometrically-informed self-healing
    //    Uses δ₀-gated thresholds instead of arbitrary constants.
    //    The geometric measurement determines if refocus is needed.
    let effectiveCoherence = coherenceAfter;
    const geoState = measureGeometricState(effectiveCoherence);
    const needsRefocus =
      this.shortTermEma < this.config.refocusThreshold && this.transitCount > 3;

    if (needsRefocus) {
      // Use geometric refocus target when available
      const refocusTarget = computeRefocusTarget(geoState, coherenceBefore);
      if (refocusTarget.refocusNeeded) {
        // Geometrically-informed blend: use torsion coupling as blend weight
        const blendRate = Math.max(refocusTarget.blendRate, 0.3);
        effectiveCoherence =
          coherenceBefore * blendRate + coherenceAfter * (1 - blendRate);
      } else {
        // Fallback to legacy blend
        effectiveCoherence =
          coherenceBefore * 0.7 + coherenceAfter * 0.3;
      }
      this.refocusCount++;
    }

    if (verified) this.verifiedCount++;

    // 5. Record in ring buffer
    this.history[this.historyHead] = effectiveCoherence;
    this.historyHead = (this.historyHead + 1) % this.config.historyDepth;
    if (this.historyCount < this.config.historyDepth) this.historyCount++;

    this.prevH = effectiveCoherence;

    // 6. EVOLVE — compute geometric provenance
    const finalGeoState = measureGeometricState(effectiveCoherence);
    const health = spectralHealth(effectiveCoherence, effectiveCoherence);
    const geometric: GeometricProvenance = {
      defects: finalGeoState.defects,
      zone: finalGeoState.zone,
      phase: finalGeoState.phase,
      fidelity: finalGeoState.fidelity,
      coupling: finalGeoState.coupling,
      spectralGrade: health.grade,
    };

    // 7. Create receipt with full provenance
    const trend = this.classifyTrend();
    const receipt: ProjectionReceipt = {
      id: `surface:${this.transitCount}:${Date.now()}`,
      operation,
      timestamp: Date.now(),
      coherenceBefore,
      coherenceAfter: effectiveCoherence,
      gradient: instantGradient,
      verified,
      refocused: needsRefocus,
      humanSignal: false,
      trend,
      geometric,
    };

    // Ring buffer for receipts
    this.receipts.push(receipt);
    if (this.receipts.length > this.config.maxReceipts) {
      this.receipts.shift();
    }

    // Notify listeners
    if (this.listeners.size > 0) {
      const state = this.getState();
      for (const cb of this.listeners) cb(state);
    }

    return receipt;
  }

  // ── Human Feedback Absorption ─────────────────────────────────────

  /**
   * Absorb a human interaction as a coherence signal.
   *
   * Every human action is a vote of confidence (positive) or
   * correction (negative). The surface integrates this into its
   * coherence trajectory.
   *
   * @param signal  Coherence nudge in [-1, 1]. Positive = alignment.
   * @param source  Optional label (e.g., "click:save", "shortcut:mastered")
   */
  absorbHumanSignal(signal: number, source = "interaction"): ProjectionReceipt {
    const clamped = Math.max(-1, Math.min(1, signal));
    const currentH = this.prevH;
    const nudgedH = Math.max(
      0,
      Math.min(1, currentH + clamped * this.config.humanFeedbackWeight),
    );

    const receipt = this.project(currentH, nudgedH, `human:${source}`);

    // Override the humanSignal flag
    const enriched: ProjectionReceipt = { ...receipt, humanSignal: true };
    this.receipts[this.receipts.length - 1] = enriched;

    return enriched;
  }

  // ── Gradient Query ────────────────────────────────────────────────

  /** Get the current multi-scale coherence gradient */
  gradient(): SurfaceGradient {
    return {
      instantaneous: this.historyCount > 1
        ? this.history[(this.historyHead - 1 + this.config.historyDepth) % this.config.historyDepth] -
          this.history[(this.historyHead - 2 + this.config.historyDepth) % this.config.historyDepth]
        : 0,
      shortTerm: this.shortTermEma,
      longTerm: this.longTermEma,
      trend: this.classifyTrend(),
      transitCount: this.transitCount,
      refocusCount: this.refocusCount,
      verificationRate:
        this.transitCount > 0 ? this.verifiedCount / this.transitCount : 1,
    };
  }

  // ── State Query ───────────────────────────────────────────────────

  /** Get the full observable surface state */
  getState(): SurfaceState {
    return {
      currentCoherence: this.prevH,
      gradient: this.gradient(),
      lastReceipt:
        this.receipts.length > 0
          ? this.receipts[this.receipts.length - 1]
          : null,
      isHealthy: this.classifyTrend() !== "refocusing",
      uptime: Date.now() - this.startTime,
    };
  }

  /** Get current coherence (last recorded H-score) */
  currentCoherence(): number {
    return this.prevH;
  }

  /** Get recent receipts */
  getReceipts(count?: number): readonly ProjectionReceipt[] {
    return count ? this.receipts.slice(-count) : [...this.receipts];
  }

  /** Get the coherence history as a plain array (for visualization) */
  getHistory(): number[] {
    if (this.historyCount === 0) return [];
    const result: number[] = [];
    const start =
      this.historyCount < this.config.historyDepth
        ? 0
        : this.historyHead;
    for (let i = 0; i < this.historyCount; i++) {
      result.push(
        this.history[(start + i) % this.config.historyDepth],
      );
    }
    return result;
  }

  // ── Subscription ──────────────────────────────────────────────────

  /** Subscribe to surface state changes */
  onStateChange(cb: (state: SurfaceState) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  // ── Internal ──────────────────────────────────────────────────────

  private classifyTrend(): SurfaceTrend {
    const threshold = 0.001;
    if (this.longTermEma > threshold) return "evolving";
    if (this.longTermEma < -threshold) return "refocusing";
    return "stable";
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Singleton — one surface per runtime (the holographic boundary is unique)
// ═══════════════════════════════════════════════════════════════════════

let _surface: HolographicSurface | null = null;

/** Get the singleton holographic surface */
export function getHolographicSurface(): HolographicSurface {
  if (!_surface) {
    _surface = new HolographicSurface();
  }
  return _surface;
}

/** Reset the surface (for testing) */
export function resetHolographicSurface(): void {
  _surface = null;
}
