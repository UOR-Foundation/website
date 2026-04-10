/**
 * Rolling Update — Zero-Downtime Version Transitions.
 * @ontology uor:Scheduler
 * ═════════════════════════════════════════════════════════════════
 *
 * Manages atomic version transitions for running applications:
 * start new version → verify health → stop old version → commit.
 * If the new version fails health checks, the old version is kept.
 *
 * ── UOR Foundation Kernel Mapping ──────────────────────────────────
 *
 *   Rolling Update         → kernel::cascade::CascadeComposition
 *     A two-step cascade of CascadeMaps:
 *       map₁: inputQuantum=oldVersion → outputQuantum=newVersion (start new)
 *       map₂: inputQuantum=newVersion → outputQuantum=committed  (stop old)
 *
 *   Health Gate             → kernel::reduction::PhaseGate
 *     boundaryType: "Monotone" (health must improve to pass)
 *     invariant: "new instance healthcheck passes"
 *     isOpen(): true when new instance reports healthy
 *
 *   Rollback                → kernel::failure::RecoveryStrategy
 *     handles: "Timeout" | "ConstraintViolation"
 *     guaranteed: true (old instance is never stopped until new is verified)
 *
 *   Atomic PrimitiveOps:
 *     Succ (Rotation)        — advance version (old → new)
 *     Pred (RotationInverse)  — rollback (new → old)
 *     Neg ∘ Bnot = Succ       — Critical Identity: version transition is verified
 *
 * @version 1.0.0
 */

import type { RollingUpdateState } from "./types";

// ── Constants ────────────────────────────────────────────────────────────

/** Maximum time to wait for new instance health before rollback (ms). */
const HEALTH_TIMEOUT_MS = 30_000;

/** Health check polling interval during rolling update (ms). */
const HEALTH_POLL_MS = 2_000;

// ── Rolling Update Controller ────────────────────────────────────────────

/**
 * SovereignRollingUpdate — manages a single version transition.
 *
 * Lifecycle (CascadeComposition):
 *   1. starting_new  → CascadeMap₁: start new version instance
 *   2. health_check  → PhaseGate: poll until new instance is healthy
 *   3. stopping_old  → CascadeMap₂: stop old instance (gate passed)
 *   4. completed     → CascadeEpoch.converged() = true
 *
 * If health_check fails → rolled_back (RecoveryStrategy activated)
 */
export class SovereignRollingUpdate {
  private _state: RollingUpdateState;

  constructor(
    blueprintName: string,
    oldVersion: string,
    newVersion: string,
    oldInstanceId: string,
  ) {
    this._state = {
      blueprintName,
      oldVersion,
      newVersion,
      oldInstanceId,
      phase: "starting_new",
      startedAt: Date.now(),
    };
  }

  // ── Cascade Execution ──────────────────────────────────────────────

  /**
   * Execute the full rolling update cascade.
   *
   * UOR mapping: CascadeComposition.evaluate() — applies map₁ then map₂
   * with a PhaseGate between them.
   *
   * @param startNew - async function that starts the new version, returns instanceId
   * @param checkHealth - async function that checks if an instanceId is healthy
   * @param stopOld - async function that stops the old instance
   * @param stopNew - async function that stops the new instance (for rollback)
   * @returns The final update state
   */
  async execute(
    startNew: () => Promise<string>,
    checkHealth: (instanceId: string) => Promise<boolean>,
    stopOld: () => Promise<void>,
    stopNew: (instanceId: string) => Promise<void>,
  ): Promise<RollingUpdateState> {
    try {
      // ── CascadeMap₁: Start new version ────────────────────────────
      this._state.phase = "starting_new";
      const newInstanceId = await startNew();
      this._state.newInstanceId = newInstanceId;

      // ── PhaseGate: Wait for health ────────────────────────────────
      this._state.phase = "health_check";
      const healthy = await this._waitForHealth(newInstanceId, checkHealth);

      if (!healthy) {
        // ── RecoveryStrategy: Rollback ──────────────────────────────
        // The old instance was never stopped — guaranteed recovery.
        this._state.phase = "rolled_back";
        await stopNew(newInstanceId);
        console.warn(
          `[RollingUpdate] ${this._state.blueprintName}: ` +
          `new version ${this._state.newVersion} failed health check — rolled back`,
        );
        this._state.completedAt = Date.now();
        return this._state;
      }

      // ── CascadeMap₂: Stop old version ─────────────────────────────
      this._state.phase = "stopping_old";
      await stopOld();

      // ── Converged ─────────────────────────────────────────────────
      this._state.phase = "completed";
      this._state.completedAt = Date.now();

      console.debug(
        `[RollingUpdate] ${this._state.blueprintName}: ` +
        `${this._state.oldVersion} → ${this._state.newVersion} completed in ` +
        `${this._state.completedAt - this._state.startedAt}ms`,
      );

      return this._state;
    } catch (err) {
      // Any unexpected error → rollback
      this._state.phase = "rolled_back";
      this._state.completedAt = Date.now();

      if (this._state.newInstanceId) {
        try {
          await stopNew(this._state.newInstanceId);
        } catch {
          // Best-effort cleanup
        }
      }

      console.error(
        `[RollingUpdate] ${this._state.blueprintName}: ` +
        `error during update — rolled back`,
        err,
      );

      return this._state;
    }
  }

  /** Get the current update state. */
  get state(): RollingUpdateState {
    return { ...this._state };
  }

  // ── Private: Health Gate Polling ───────────────────────────────────

  /**
   * Poll health until the instance is healthy or timeout.
   *
   * UOR mapping: PhaseGate where:
   *   invariant = "healthcheck passes"
   *   isOpen() = health returns true
   *   boundaryType = "Monotone" (health must improve to pass)
   */
  private async _waitForHealth(
    instanceId: string,
    checkHealth: (id: string) => Promise<boolean>,
  ): Promise<boolean> {
    const deadline = Date.now() + HEALTH_TIMEOUT_MS;

    while (Date.now() < deadline) {
      try {
        const healthy = await checkHealth(instanceId);
        if (healthy) return true;
      } catch {
        // Health check failed — continue polling
      }

      await new Promise((resolve) => setTimeout(resolve, HEALTH_POLL_MS));
    }

    return false; // Timeout — gate did not open
  }
}