/**
 * Sovereign Auto-Scaler — Metric-Driven Worker Slot Scaling.
 * ═════════════════════════════════════════════════════════════════
 *
 * Watches per-kernel call rates and adjusts worker slot allocations
 * to maintain performance headroom.
 *
 * ── UOR Foundation Kernel Mapping ──────────────────────────────────
 *
 *   Auto-Scaler          → kernel::stream::StreamTransform
 *     The scaler consumes a Stream of call-rate samples (one per
 *     kernel per tick) and applies a StreamTransform that maps
 *     each sample to a worker slot adjustment.
 *     lengthPreserving: true — one decision per sample.
 *
 *   Worker Allocation     → kernel::parallel::DisjointBudget
 *     Each kernel receives a non-overlapping fiber budget.
 *     isDisjoint() is enforced — no two kernels share slots.
 *
 *   Scaling Decision      → kernel::stream::StreamElement
 *     Each decision is a StreamElement with:
 *       index() = sample index
 *       value() = target worker count
 *       epochIndex() = reconciler epoch
 *
 *   Atomic PrimitiveOps:
 *     Add (Translation)  — increment worker count
 *     Sub (Translation)  — decrement worker count
 *     And (Projection)   — clamp to [min, max] bounds
 *
 * @version 1.0.0
 */

import type { ScalingConfig, ScalerDecision } from "./types";

// ── Constants ────────────────────────────────────────────────────────────

/** Default scaling bounds if no ScalingConfig is provided. */
const DEFAULT_MIN_WORKERS = 0;
const DEFAULT_MAX_WORKERS = 4;
const DEFAULT_TARGET_CALL_RATE = 50;

/** Hysteresis: only scale if the delta exceeds this threshold. */
const SCALE_THRESHOLD = 0.3; // 30% deviation from target

/** Maximum recent decisions kept for observability. */
const MAX_RECENT_DECISIONS = 50;

// ── Auto-Scaler ──────────────────────────────────────────────────────────

/**
 * SovereignAutoScaler — the StreamTransform that maps call-rate
 * observations to worker slot adjustments.
 *
 * For each kernel with a ScalingConfig, the scaler:
 * 1. Samples the current call rate (calls in the last window)
 * 2. Computes the target worker count based on rate vs target
 * 3. Clamps to [minWorkers, maxWorkers] (And/HypercubeProjection)
 * 4. Emits a ScalerDecision if the target differs from current
 */
export class SovereignAutoScaler {
  private _decisions: ScalerDecision[] = [];
  private _sampleIndex = 0;

  /**
   * Evaluate scaling for a single kernel.
   *
   * UOR mapping: Apply the StreamTransform to one StreamElement:
   *   input  = { callRate, currentWorkers }
   *   output = { targetWorkers }
   *
   * The transform is:
   *   ratio = callRate / targetCallRate
   *   rawTarget = ceil(currentWorkers * ratio)  ← Mul (Scaling)
   *   clamped = clamp(rawTarget, min, max)      ← And (Projection)
   *
   * @param blueprintName - Name of the blueprint being evaluated
   * @param currentWorkers - Currently allocated worker slots
   * @param callRate - Observed calls per second (sliding window)
   * @param config - Optional scaling configuration
   * @returns ScalerDecision if adjustment needed, null if stable
   */
  evaluate(
    blueprintName: string,
    currentWorkers: number,
    callRate: number,
    config?: ScalingConfig,
  ): ScalerDecision | null {
    const min = config?.minWorkers ?? DEFAULT_MIN_WORKERS;
    const max = config?.maxWorkers ?? DEFAULT_MAX_WORKERS;
    const targetRate = config?.targetCallRate ?? DEFAULT_TARGET_CALL_RATE;

    // Compute ratio: how busy is this kernel relative to its target?
    const ratio = targetRate > 0 ? callRate / targetRate : 0;

    // Scale up if ratio > 1 + threshold, scale down if ratio < 1 - threshold
    const deviation = Math.abs(ratio - 1);
    if (deviation < SCALE_THRESHOLD && currentWorkers >= min) {
      return null; // Within hysteresis band — no action
    }

    // Compute raw target (Mul/Scaling PrimitiveOp)
    let rawTarget: number;
    if (callRate === 0 && currentWorkers > min) {
      // Idle — scale down to minimum
      rawTarget = min;
    } else {
      rawTarget = Math.ceil(Math.max(1, currentWorkers) * ratio);
    }

    // Clamp to bounds (And/HypercubeProjection PrimitiveOp)
    const targetWorkers = Math.max(min, Math.min(max, rawTarget));

    // Skip if no actual change
    if (targetWorkers === currentWorkers) return null;

    const decision: ScalerDecision = {
      blueprintName,
      currentWorkers,
      targetWorkers,
      reason:
        targetWorkers > currentWorkers
          ? `Scale up: call rate ${callRate.toFixed(1)}/s exceeds ${(targetRate * (1 - SCALE_THRESHOLD)).toFixed(1)}/s threshold`
          : `Scale down: call rate ${callRate.toFixed(1)}/s below ${(targetRate * (1 - SCALE_THRESHOLD)).toFixed(1)}/s threshold`,
      callRate,
      timestamp: Date.now(),
    };

    this._decisions.push(decision);
    if (this._decisions.length > MAX_RECENT_DECISIONS) {
      this._decisions = this._decisions.slice(-MAX_RECENT_DECISIONS);
    }

    this._sampleIndex++;
    return decision;
  }

  /** Get recent scaling decisions for observability. */
  get recentDecisions(): ScalerDecision[] {
    return [...this._decisions];
  }

  /** Total scaling decisions made. */
  get totalDecisions(): number {
    return this._sampleIndex;
  }
}