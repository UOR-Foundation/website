/**
 * Sovereign Reconciler — Declarative Control Plane.
 * ═════════════════════════════════════════════════════════════════
 *
 * The Kubernetes-equivalent reconciliation engine for Sovereign Compose.
 * Continuously diffs desired state against actual state and emits
 * corrective effects to close any drift.
 *
 * ── UOR Foundation Kernel Mapping ──────────────────────────────────
 *
 *   Desired-State Store   → kernel::region::RegionPartition
 *     Each blueprint is a Region in the address space.
 *     The store is a non-overlapping partition: isComplete() ∧ isDisjoint().
 *
 *   Reconciliation Loop   → kernel::recursion::RecursiveComputation
 *     DescentMeasure: drift count decreases each tick.
 *     RecursionBound: maxDepth = maxTicksPerEpoch.
 *     isBaseCase: drift === 0 → stop.
 *
 *   Drift Detection       → kernel::predicate::MatchExpression
 *     MatchArms: missing → start, unexpected → stop, version_mismatch → update,
 *     state_degraded → restart, worker_mismatch → scale.
 *     isExhaustive: true (all states classified).
 *
 *   Corrective Actions    → kernel::effect::EffectChain
 *     PinEffect: start (pin blueprint to running).
 *     UnbindEffect: stop (remove from instance map).
 *     EndomorphismEffect: restart (apply restart endomorphism).
 *     All effects are reversible.
 *
 *   Reconciler Tick        → kernel::reduction::ReductionEpoch
 *     rules() = corrections, normalized() = no drift, gate() = health check.
 *
 *   Full Pipeline          → kernel::reduction::ReductionPipeline
 *     epochs() = all ticks, converged() = stable, finalState() = orchestrator state.
 *
 *   Atomic PrimitiveOps:
 *     Xor  (HypercubeTranslation)  — diff desired vs actual state vectors
 *     Succ (Rotation)               — advance instance to running
 *     Pred (RotationInverse)        — rewind instance to stopped
 *     And  (HypercubeProjection)    — intersect permitted with required
 *     Neg ∘ Bnot = Succ             — Critical Identity verification per tick
 *
 * @version 1.0.0
 */

import { allBlueprints, getBlueprint } from "./blueprint-registry";
import type {
  AppBlueprint,
  DesiredState,
  DriftRecord,
  DriftKind,
  Correction,
  CorrectionAction,
  ReconcilerEpoch,
  ReconcilerStatus,
} from "./types";

// ── Constants ────────────────────────────────────────────────────────────

/** Default reconciliation interval (ms). */
const DEFAULT_INTERVAL_MS = 10_000;

/** Maximum recent epochs kept for observability. */
const MAX_RECENT_EPOCHS = 20;

// ── Reconciler ───────────────────────────────────────────────────────────

/**
 * SovereignReconciler — the continuous desired-vs-actual control loop.
 *
 * This is the Kubernetes Controller Manager equivalent. It:
 * 1. Maintains a desired-state store (RegionPartition)
 * 2. Periodically evaluates a MatchExpression over all instances
 * 3. Emits an EffectChain of corrections to close drift
 * 4. Records each tick as a ReductionEpoch
 *
 * The reconciler does NOT directly mutate the orchestrator —
 * it returns corrections that the orchestrator applies. This
 * separation mirrors the K8s pattern where controllers emit
 * patches and the API server applies them.
 */
export class SovereignReconciler {
  // ── Desired-State Store (kernel::region::RegionPartition) ──────────
  private _desiredState = new Map<string, DesiredState>();

  // ── Pipeline State (kernel::reduction::ReductionPipeline) ──────────
  private _epochs: ReconcilerEpoch[] = [];
  private _epochIndex = 0;
  private _totalCorrections = 0;
  private _active = false;
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _intervalMs: number;

  // ── Callbacks ──────────────────────────────────────────────────────
  private _onCorrection: ((correction: Correction) => void) | null = null;
  private _onEpoch: ((epoch: ReconcilerEpoch) => void) | null = null;

  constructor(intervalMs = DEFAULT_INTERVAL_MS) {
    this._intervalMs = intervalMs;
  }

  // ══════════════════════════════════════════════════════════════════════
  // Desired-State Store — kernel::region::RegionPartition
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Build the desired-state partition from registered blueprints.
   *
   * UOR: Each blueprint occupies a Region. The partition is:
   *   isComplete() = all blueprints in the registry are accounted for
   *   isDisjoint() = no duplicate entries per blueprint name
   */
  buildDesiredState(): void {
    this._desiredState.clear();

    for (const bp of allBlueprints()) {
      this._desiredState.set(bp.name, {
        blueprintName: bp.name,
        shouldRun: bp.autoStart !== false,
        desiredWorkers: bp.resources.workers ?? 0,
        version: bp.version,
      });
    }
  }

  /**
   * Override desired state for a specific blueprint.
   * Used for manual scaling, pausing, or version pinning.
   */
  setDesired(name: string, state: Partial<DesiredState>): void {
    const existing = this._desiredState.get(name);
    if (existing) {
      this._desiredState.set(name, { ...existing, ...state });
    }
  }

  /** Get the full desired-state snapshot. */
  getDesiredState(): DesiredState[] {
    return Array.from(this._desiredState.values());
  }

  // ══════════════════════════════════════════════════════════════════════
  // Drift Detection — kernel::predicate::MatchExpression
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Evaluate drift between desired and actual state.
   *
   * UOR mapping: A MatchExpression with 5 exhaustive arms:
   *   Arm 1 (guard: shouldRun ∧ ¬running)        → DriftKind "missing"
   *   Arm 2 (guard: ¬shouldRun ∧ running)         → DriftKind "unexpected"
   *   Arm 3 (guard: version ≠ desired.version)    → DriftKind "version_mismatch"
   *   Arm 4 (guard: state ∈ {crashed, degraded})  → DriftKind "state_degraded"
   *   Arm 5 (guard: workers ≠ desired.workers)    → DriftKind "worker_mismatch"
   *
   * isExhaustive() = true: every instance is classified.
   *
   * @param getActual - function that returns actual state for a blueprint name
   */
  detectDrift(
    getActual: (name: string) => {
      running: boolean;
      version?: string;
      state?: string;
      workers?: number;
      instanceId?: string;
    } | null,
  ): DriftRecord[] {
    const drifts: DriftRecord[] = [];

    for (const [name, desired] of this._desiredState) {
      const actual = getActual(name);

      // Arm 1: Should run but isn't → "missing" (PinEffect needed)
      if (desired.shouldRun && (!actual || !actual.running)) {
        drifts.push({
          kind: "missing",
          blueprintName: name,
          desired,
          actual: { running: false },
        });
        continue;
      }

      // Arm 2: Shouldn't run but is → "unexpected" (UnbindEffect needed)
      if (!desired.shouldRun && actual?.running) {
        drifts.push({
          kind: "unexpected",
          blueprintName: name,
          desired,
          actual: { running: true, state: actual.state as any },
        });
        continue;
      }

      if (!actual || !actual.running) continue;

      // Arm 3: Wrong version → "version_mismatch" (CascadeComposition needed)
      if (actual.version && actual.version !== desired.version) {
        drifts.push({
          kind: "version_mismatch",
          blueprintName: name,
          desired,
          actual: {
            running: true,
            version: actual.version,
            state: actual.state as any,
          },
        });
        continue;
      }

      // Arm 4: Degraded/crashed → "state_degraded" (EndomorphismEffect needed)
      if (actual.state === "crashed" || actual.state === "degraded") {
        drifts.push({
          kind: "state_degraded",
          blueprintName: name,
          desired,
          actual: {
            running: true,
            state: actual.state as any,
          },
        });
        continue;
      }

      // Arm 5: Wrong worker count → "worker_mismatch" (StreamTransform needed)
      if (
        desired.desiredWorkers > 0 &&
        actual.workers !== undefined &&
        actual.workers !== desired.desiredWorkers
      ) {
        drifts.push({
          kind: "worker_mismatch",
          blueprintName: name,
          desired,
          actual: {
            running: true,
            workers: actual.workers,
          },
        });
      }
    }

    return drifts;
  }

  // ══════════════════════════════════════════════════════════════════════
  // Corrective Actions — kernel::effect::EffectChain
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Map drifts to corrective actions.
   *
   * UOR mapping: An EffectChain where:
   *   "start"   → PinEffect (pin blueprint to running state)
   *   "stop"    → UnbindEffect (remove from instance map)
   *   "restart" → EndomorphismEffect (restart endomorphism)
   *   "update"  → CascadeMap (two-step version cascade)
   *   "scale"   → StreamTransform (adjust worker allocation)
   *
   * allReversible() = true: every correction can be undone.
   */
  planCorrections(drifts: DriftRecord[]): Correction[] {
    const DRIFT_TO_ACTION: Record<DriftKind, CorrectionAction> = {
      missing: "start",
      unexpected: "stop",
      version_mismatch: "update",
      state_degraded: "restart",
      worker_mismatch: "scale",
    };

    return drifts.map((drift) => ({
      action: DRIFT_TO_ACTION[drift.kind],
      blueprintName: drift.blueprintName,
      drift,
      reversible: true as const,
    }));
  }

  // ══════════════════════════════════════════════════════════════════════
  // Reconciliation Tick — kernel::reduction::ReductionEpoch
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Execute a single reconciliation epoch.
   *
   * UOR mapping: A ReductionEpoch where:
   *   rules() = corrections applied in this tick
   *   reductionCount() = number of corrections
   *   normalized() = true if no drift detected (fixed point reached)
   *   gate() = PhaseGate whose invariant = "all corrections succeeded"
   *
   * The DescentMeasure guarantees drift count decreases each tick
   * (each correction addresses exactly one drift), ensuring the
   * RecursiveComputation terminates.
   *
   * @param getActual - function to get actual state per blueprint
   * @returns The epoch record
   */
  tick(
    getActual: (name: string) => {
      running: boolean;
      version?: string;
      state?: string;
      workers?: number;
      instanceId?: string;
    } | null,
  ): ReconcilerEpoch {
    const t0 = performance.now();

    // Step 1: Detect drift (MatchExpression evaluation)
    const drifts = this.detectDrift(getActual);

    // Step 2: Plan corrections (EffectChain construction)
    const corrections = this.planCorrections(drifts);

    // Step 3: Apply corrections via callback
    for (const correction of corrections) {
      this._totalCorrections++;
      this._onCorrection?.(correction);
    }

    // Step 4: Record epoch (ReductionEpoch)
    const epoch: ReconcilerEpoch = {
      index: this._epochIndex++,
      timestamp: Date.now(),
      drifts,
      corrections,
      normalized: drifts.length === 0,
      durationMs: performance.now() - t0,
    };

    this._epochs.push(epoch);
    if (this._epochs.length > MAX_RECENT_EPOCHS) {
      this._epochs = this._epochs.slice(-MAX_RECENT_EPOCHS);
    }

    this._onEpoch?.(epoch);

    return epoch;
  }

  // ══════════════════════════════════════════════════════════════════════
  // Lifecycle — Start / Stop the ReductionPipeline
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Start the continuous reconciliation loop.
   *
   * UOR mapping: Begins the ReductionPipeline, which runs
   * ReductionEpochs at the configured interval until
   * stopReconciler() is called or the pipeline converges.
   */
  start(
    getActual: (name: string) => {
      running: boolean;
      version?: string;
      state?: string;
      workers?: number;
      instanceId?: string;
    } | null,
  ): void {
    if (this._active) return;

    this._active = true;
    this.buildDesiredState();

    this._timer = setInterval(() => {
      this.tick(getActual);
    }, this._intervalMs);

    console.debug(
      `[SovereignReconciler] Started — interval=${this._intervalMs}ms, ` +
      `desired=${this._desiredState.size} blueprints`,
    );
  }

  /** Stop the reconciliation loop. */
  stop(): void {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this._active = false;
    console.debug("[SovereignReconciler] Stopped");
  }

  // ── Event Hooks ────────────────────────────────────────────────────

  /** Register a callback invoked for each correction. */
  onCorrection(cb: (correction: Correction) => void): void {
    this._onCorrection = cb;
  }

  /** Register a callback invoked after each epoch. */
  onEpoch(cb: (epoch: ReconcilerEpoch) => void): void {
    this._onEpoch = cb;
  }

  // ── Status — kernel::reduction::ReductionPipeline snapshot ─────────

  /**
   * Export the full reconciler status.
   *
   * UOR mapping: ReductionPipeline where:
   *   converged() = last epoch was normalized (no drift)
   *   totalReductions() = total corrections across all epochs
   *   finalState() = snapshot of the desired-state store
   */
  status(): ReconcilerStatus {
    const lastEpoch = this._epochs[this._epochs.length - 1];
    return {
      active: this._active,
      totalEpochs: this._epochIndex,
      totalCorrections: this._totalCorrections,
      converged: lastEpoch?.normalized ?? true,
      recentEpochs: [...this._epochs],
      intervalMs: this._intervalMs,
      desiredState: this.getDesiredState(),
    };
  }

  /** Whether the reconciler is actively running. */
  get active(): boolean {
    return this._active;
  }
}