/**
 * Scheduling & Orchestration — Orchestrator.
 * @ontology uor:Scheduler
 * ═════════════════════════════════════════════════════════════════
 *
 * Kubernetes-inspired lifecycle manager for AppBlueprints.
 *
 * v2 additions (Unikraft-inspired):
 *   - Lazy start: only autoStart apps boot during init()
 *   - Per-app boot timing (sub-ms target)
 *   - Worker pool governance with slot reservation
 *   - Circuit breaker: auto-stop after N consecutive healthcheck failures
 *   - Exponential backoff restart
 *
 * v3 additions (Sovereign Reconciler — K8s equivalence):
 *   - Declarative desired-state reconciliation via Reconciliation Controller (kernel::recursion)
 *   - Metric-driven auto-scaling (kernel::stream)
 *   - Rolling updates with health-gated rollback (kernel::cascade)
 *
 * @version 3.0.0
 */

import { AppKernel } from "./app-kernel";
import {
  registerBlueprint,
  allBlueprints,
  getBlueprint,
} from "./blueprint-registry";
import { SovereignReconciler } from "./reconciler";
import { SovereignAutoScaler } from "./auto-scaler";
import { SovereignRollingUpdate } from "./rolling-update";
import type {
  AppBlueprint,
  AppInstance,
  OrchestratorMetrics,
  OrchestratorState,
  ComposeEvent,
  ComposeEventType,
  Correction,
  ReconcilerStatus,
  ScalingConfig,
} from "./types";

// ── Constants ────────────────────────────────────────────────────────────

/** Max consecutive healthcheck failures before circuit breaker trips. */
const CIRCUIT_BREAKER_THRESHOLD = 3;

/** Default total worker slots available across all apps. */
const DEFAULT_WORKER_POOL_SIZE = 8;

/** Base delay for exponential backoff restart (ms). */
const RESTART_BASE_DELAY_MS = 1000;

// ── Event Emitter ─────────────────────────────────────────────────────────

type EventListener = (event: ComposeEvent) => void;

// ── Orchestrator ──────────────────────────────────────────────────────────

class Orchestrator {
  private _kernels = new Map<string, AppKernel>(); // instanceId → kernel
  private _byName = new Map<string, string>();     // blueprintName → instanceId
  private _listeners: EventListener[] = [];
  private _healthTimers = new Map<string, ReturnType<typeof setInterval>>();
  private _startedAt = Date.now();
  private _ready = false;
  private _idCounter = 0;

  // ── Worker Pool Governance ────────────────────────────────────────────
  private _workerSlotsTotal = DEFAULT_WORKER_POOL_SIZE;
  private _workerAllocations = new Map<string, number>(); // instanceId → slots

  // ── Circuit Breaker / Restart State ───────────────────────────────────
  private _restartAttempts = new Map<string, number>(); // blueprintName → attempt count

  // ── Sovereign Reconciler (K8s Control Plane) ─────────────────────────
  private _reconciler = new SovereignReconciler();
  private _autoScaler = new SovereignAutoScaler();

  // ── Initialization ────────────────────────────────────────────────────

  /**
   * Initialize the orchestrator with a set of static blueprints.
   * Only starts apps with autoStart !== false (lazy start for others).
   */
  async init(blueprints: AppBlueprint[]): Promise<void> {
    // Register all blueprints (computes canonical IDs)
    await Promise.all(blueprints.map((bp) => registerBlueprint(bp)));

    // Start only autoStart apps (default true for backward compat)
    for (const bp of allBlueprints()) {
      if (bp.autoStart !== false) {
        this._startInstance(bp);
      }
    }

    this._ready = true;

    // Start the Sovereign Reconciler (K8s control plane)
    this.startReconciler();
  }

  // ── Instance Lifecycle ────────────────────────────────────────────────

  /**
   * Schedule a new blueprint. Registers it and starts an instance.
   */
  async schedule(bp: AppBlueprint): Promise<string> {
    const stamped = await registerBlueprint(bp);
    return this._startInstance(stamped);
  }

  /**
   * Ensure an app is running — start it lazily if not yet started.
   * Returns the kernel for the app.
   */
  ensureRunning(name: string): AppKernel | undefined {
    const existingId = this._byName.get(name);
    if (existingId) {
      const kernel = this._kernels.get(existingId);
      if (kernel && (kernel.state === "running" || kernel.state === "degraded")) {
        return kernel;
      }
    }

    // Lazy start
    const bp = getBlueprint(name);
    if (!bp) return undefined;

    const id = this._startInstance(bp);
    return this._kernels.get(id);
  }

  /**
   * Stop a running instance by name.
   */
  stop(name: string): boolean {
    const instanceId = this._byName.get(name);
    if (!instanceId) return false;

    const kernel = this._kernels.get(instanceId);
    if (!kernel) return false;

    kernel.stop();
    this._clearHealthTimer(instanceId);
    this._releaseWorkerSlots(instanceId);
    this._emit("instance:stopped", instanceId, name);

    return true;
  }

  /**
   * Restart a stopped or crashed instance with exponential backoff.
   */
  restart(name: string): boolean {
    const bp = getBlueprint(name);
    if (!bp) return false;

    // Track restart attempts for exponential backoff
    const attempts = this._restartAttempts.get(name) || 0;
    this._restartAttempts.set(name, attempts + 1);

    // Stop existing instance if any
    this.stop(name);

    // Apply exponential backoff delay
    const delay = Math.min(RESTART_BASE_DELAY_MS * Math.pow(2, attempts), 30000);

    if (delay > RESTART_BASE_DELAY_MS) {
      setTimeout(() => {
        this._startInstance(bp);
        // Reset attempts on successful restart
        this._restartAttempts.set(name, 0);
      }, delay);
    } else {
      this._startInstance(bp);
      this._restartAttempts.set(name, 0);
    }

    return true;
  }

  // ══════════════════════════════════════════════════════════════════════
  // SOVEREIGN RECONCILER — K8s Control Plane
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Start the declarative reconciliation loop.
   * Wires the reconciler's correction callbacks to orchestrator actions.
   */
  startReconciler(): void {
    // Wire correction handler — applies EffectChain to orchestrator state
    this._reconciler.onCorrection((correction) => {
      const { action, blueprintName } = correction;

      switch (action) {
        case "start": {
          const bp = getBlueprint(blueprintName);
          if (bp) this._startInstance(bp);
          break;
        }
        case "stop":
          this.stop(blueprintName);
          break;
        case "restart":
          this.restart(blueprintName);
          break;
        case "update": {
          // Handled by rolling update — reconciler only detects the drift
          break;
        }
        case "scale": {
          const instanceId = this._byName.get(blueprintName);
          if (instanceId) {
            const desired = correction.drift.desired.desiredWorkers ?? 0;
            this._workerAllocations.set(instanceId, desired);
            const kernel = this._kernels.get(instanceId);
            if (kernel) kernel.setWorkersAllocated(desired);
          }
          break;
        }
      }

      this._emit("reconciler:corrected", undefined, blueprintName, {
        action,
        drift: correction.drift.kind,
      });
    });

    // Wire epoch handler — emit events for observability
    this._reconciler.onEpoch((epoch) => {
      if (epoch.drifts.length > 0) {
        this._emit("reconciler:drift", undefined, undefined, {
          epochIndex: epoch.index,
          driftCount: epoch.drifts.length,
          correctionCount: epoch.corrections.length,
          normalized: epoch.normalized,
          durationMs: epoch.durationMs,
        });
      }

      this._emit("reconciler:epoch", undefined, undefined, {
        epochIndex: epoch.index,
        normalized: epoch.normalized,
      });
    });

    // Start the loop — pass a getActual function that reads orchestrator state
    this._reconciler.start((name: string) => {
      const instanceId = this._byName.get(name);
      if (!instanceId) return null;

      const kernel = this._kernels.get(instanceId);
      if (!kernel) return null;

      const bp = kernel.blueprint;
      return {
        running: kernel.state === "running" || kernel.state === "degraded",
        version: bp.version,
        state: kernel.state,
        workers: this._workerAllocations.get(instanceId) ?? 0,
        instanceId,
      };
    });
  }

  /** Stop the reconciliation loop. */
  stopReconciler(): void {
    this._reconciler.stop();
  }

  /** Get the reconciler status for UI/hooks. */
  reconcilerStatus(): ReconcilerStatus {
    return this._reconciler.status();
  }

  /** Access the reconciler for direct manipulation (e.g., setDesired). */
  get reconciler(): SovereignReconciler {
    return this._reconciler;
  }

  /** Access the auto-scaler for observability. */
  get autoScaler(): SovereignAutoScaler {
    return this._autoScaler;
  }

  // ── Rolling Update — kernel::cascade::CascadeComposition ─────────────

  /**
   * Perform a rolling update: replace a running blueprint with a new version.
   *
   * 1. Starts a new instance from the updated blueprint
   * 2. Waits for health check to pass (PhaseGate)
   * 3. Stops the old instance
   * 4. If health fails → rolls back (keeps old instance)
   */
  async update(name: string, newBlueprint: AppBlueprint): Promise<boolean> {
    const oldInstanceId = this._byName.get(name);
    const oldKernel = oldInstanceId ? this._kernels.get(oldInstanceId) : null;
    if (!oldKernel) return false;

    const oldVersion = oldKernel.blueprint.version;

    const rollingUpdate = new SovereignRollingUpdate(
      name,
      oldVersion,
      newBlueprint.version,
      oldInstanceId!,
    );

    const result = await rollingUpdate.execute(
      // startNew
      async () => {
        const stamped = await registerBlueprint(newBlueprint);
        return this._startInstance(stamped);
      },
      // checkHealth
      async (instanceId: string) => {
        const kernel = this._kernels.get(instanceId);
        if (!kernel) return false;
        return kernel.healthcheck();
      },
      // stopOld
      async () => {
        this.stop(name);
      },
      // stopNew (rollback)
      async (instanceId: string) => {
        const kernel = this._kernels.get(instanceId);
        if (kernel) {
          kernel.stop();
          this._clearHealthTimer(instanceId);
          this._releaseWorkerSlots(instanceId);
          this._kernels.delete(instanceId);
        }
        // Restore old name mapping
        if (oldInstanceId) {
          this._byName.set(name, oldInstanceId);
        }
      },
    );

    if (result.phase === "completed") {
      this._emit("instance:updated", result.newInstanceId, name, {
        oldVersion,
        newVersion: newBlueprint.version,
        durationMs: (result.completedAt ?? Date.now()) - result.startedAt,
      });

      // Update reconciler desired state
      this._reconciler.setDesired(name, { version: newBlueprint.version });

      return true;
    }

    return false;
  }

  // ── Queries ───────────────────────────────────────────────────────────

  /** Get a kernel by app name. */
  getKernel(name: string): AppKernel | undefined {
    const id = this._byName.get(name);
    return id ? this._kernels.get(id) : undefined;
  }

  /** Get all running instances. */
  instances(): AppInstance[] {
    return Array.from(this._kernels.values()).map((k) => k.toInstance());
  }

  /** Get a specific instance by name. */
  getInstance(name: string): AppInstance | undefined {
    const id = this._byName.get(name);
    return id ? this._kernels.get(id)?.toInstance() : undefined;
  }

  /** Get aggregate metrics. */
  metrics(): OrchestratorMetrics {
    let totalCalls = 0;
    let totalDenied = 0;
    let runningCount = 0;
    let totalPayloadBytes = 0;

    for (const kernel of this._kernels.values()) {
      totalCalls += kernel.callCount;
      totalDenied += kernel.deniedCount;
      totalPayloadBytes += kernel.payloadBytes;
      if (kernel.state === "running" || kernel.state === "degraded") {
        runningCount++;
      }
    }

    let workerSlotsUsed = 0;
    for (const slots of this._workerAllocations.values()) {
      workerSlotsUsed += slots;
    }

    return {
      totalBlueprints: allBlueprints().length,
      runningInstances: runningCount,
      totalCalls,
      totalDenied,
      uptimeMs: Date.now() - this._startedAt,
      totalPayloadBytes,
      workerSlotsUsed,
      workerSlotsTotal: this._workerSlotsTotal,
    };
  }

  /** Export the full orchestrator state (for hooks). */
  state(): OrchestratorState {
    const blueprintMap = new Map<string, AppBlueprint>();
    for (const bp of allBlueprints()) {
      blueprintMap.set(bp.name, bp);
    }

    const instanceMap = new Map<string, AppInstance>();
    for (const [id, kernel] of this._kernels) {
      instanceMap.set(id, kernel.toInstance());
    }

    return {
      blueprints: blueprintMap,
      instances: instanceMap,
      metrics: this.metrics(),
      ready: this._ready,
    };
  }

  /** Whether the orchestrator has been initialized. */
  get ready(): boolean {
    return this._ready;
  }

  // ── Events ────────────────────────────────────────────────────────────

  /** Subscribe to orchestrator events. Returns unsubscribe function. */
  on(listener: EventListener): () => void {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter((l) => l !== listener);
    };
  }

  // ── Private ───────────────────────────────────────────────────────────

  private _startInstance(bp: AppBlueprint): string {
    const instanceId = `${bp.name}-${++this._idCounter}`;
    const t0 = performance.now();

    const kernel = new AppKernel(instanceId, bp);

    // Worker pool governance: reserve slots (kernel::parallel::DisjointBudget)
    const requestedWorkers = bp.resources.workers ?? 0;
    const allocated = this._reserveWorkerSlots(instanceId, requestedWorkers);
    kernel.setWorkersAllocated(allocated);

    kernel.start();

    const bootMs = performance.now() - t0;
    console.debug(`[Orchestrator] ${bp.name} booted in ${bootMs.toFixed(2)}ms`);

    this._kernels.set(instanceId, kernel);
    this._byName.set(bp.name, instanceId);

    // ── Container bridge ──────────────────────────────────────────────
    // Create a UorContainer that links the image artifact to this kernel.
    // This closes the Docker mental model:
    //   Blueprint → Image → Container → Kernel → Reconciler
    //   (what)      (how)   (instance)  (isolation) (control)
    this._createContainerForInstance(instanceId, bp);

    // Start healthcheck timer if defined
    if (bp.healthcheck) {
      const timer = setInterval(
        () => this._runHealthcheck(instanceId),
        bp.healthcheck.intervalSec * 1000,
      );
      this._healthTimers.set(instanceId, timer);
    }

    this._emit("instance:started", instanceId, bp.name, {
      bootTimeMs: bootMs,
      workersAllocated: allocated,
    });

    return instanceId;
  }

  /**
   * Bridge: create a UorContainer for a running AppKernel instance.
   *
   * This is the glue between the Build layer (uns/build) and the Run layer (compose).
   * The container holds the image reference, runtime config, and lifecycle state.
   * The AppKernel provides isolation. The Reconciler provides orchestration.
   */
  private _createContainerForInstance(instanceId: string, bp: AppBlueprint): void {
    // Lazy import to avoid circular dependency
    const containerPath = "@/modules/uns/build/container";
    import(/* @vite-ignore */ containerPath).then(
      ({ createContainer, startContainer, linkContainerToKernel }) => {
        // Build a synthetic UorImage from the blueprint metadata
        const syntheticImage = {
          canonicalId: bp.canonicalId ?? `bp:${bp.name}`,
          cid: bp.canonicalId ?? "",
          ipv6: "",
          spec: {
            directives: [],
            from: { type: "uor" as const, reference: bp.name, tag: bp.version },
            env: {},
            args: {},
            ports: bp.morphisms?.map((_, i) => 8000 + i) ?? [],
            volumes: [],
            entrypoint: [],
            cmd: [],
            healthcheck: null,
            labels: { "uor.name": bp.name, "uor.version": bp.version },
            workdir: "/",
            copies: [],
            runCommands: [],
            trustRequirements: [],
            shieldLevel: "standard" as const,
            maintainer: "",
          },
          sizeBytes: 0,
          builtAt: new Date().toISOString(),
          builderCanonicalId: "",
          tags: [bp.version, "latest"],
          layers: [],
        };

        try {
          const container = createContainer(syntheticImage, {
            name: bp.name,
            env: {},
            resources: {
              memoryBytes: 0,
              cpuShares: 0,
              workerSlots: bp.resources.workers ?? 1,
            },
            labels: { "uor.managed-by": "orchestrator", "uor.instance": instanceId },
            restartPolicy: bp.autoStart !== false ? "always" : "on-failure",
          });

          startContainer(container.id);
          linkContainerToKernel(container.id, instanceId);
        } catch (err) {
          // Non-fatal: container bridge is observability, not critical path
          console.debug(
            `[Orchestrator] Container bridge skipped for ${bp.name}:`,
            err instanceof Error ? err.message : err,
          );
        }
      },
    ).catch(() => {
      // Module not available — silent fallback
    });
  }

  private async _runHealthcheck(instanceId: string): Promise<void> {
    const kernel = this._kernels.get(instanceId);
    if (!kernel) return;

    const healthy = await kernel.healthcheck();

    // Circuit breaker: auto-stop after N consecutive failures
    if (!healthy && kernel.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
      const name = kernel.blueprint.name;
      kernel.crash(`Circuit breaker tripped after ${CIRCUIT_BREAKER_THRESHOLD} consecutive failures`);
      this._clearHealthTimer(instanceId);
      this._releaseWorkerSlots(instanceId);
      this._emit("instance:crashed", instanceId, name, {
        reason: "circuit_breaker",
        consecutiveFailures: kernel.consecutiveFailures,
      });

      // Auto-restart with exponential backoff
      this.restart(name);
      return;
    }

    this._emit("instance:healthcheck", instanceId, kernel.blueprint.name, {
      healthy,
      consecutiveFailures: kernel.consecutiveFailures,
    });
  }

  // ── Worker Pool ───────────────────────────────────────────────────────

  private _reserveWorkerSlots(instanceId: string, requested: number): number {
    if (requested === 0) return 0;

    let used = 0;
    for (const slots of this._workerAllocations.values()) {
      used += slots;
    }

    const available = this._workerSlotsTotal - used;
    const allocated = Math.min(requested, available);

    if (allocated > 0) {
      this._workerAllocations.set(instanceId, allocated);
    }

    if (allocated < requested) {
      console.warn(
        `[Orchestrator] Worker pool: requested ${requested}, allocated ${allocated} (${available} available)`,
      );
    }

    return allocated;
  }

  private _releaseWorkerSlots(instanceId: string): void {
    this._workerAllocations.delete(instanceId);
  }

  // ── Utilities ─────────────────────────────────────────────────────────

  private _clearHealthTimer(instanceId: string): void {
    const timer = this._healthTimers.get(instanceId);
    if (timer) {
      clearInterval(timer);
      this._healthTimers.delete(instanceId);
    }
  }

  private _emit(
    type: ComposeEventType,
    instanceId?: string,
    blueprintName?: string,
    detail?: Record<string, unknown>,
  ): void {
    const event: ComposeEvent = {
      type,
      timestamp: Date.now(),
      instanceId,
      blueprintName,
      detail,
    };
    for (const listener of this._listeners) {
      try {
        listener(event);
      } catch {
        // Don't let listener errors crash the orchestrator
      }
    }
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────

export const orchestrator = new Orchestrator();
