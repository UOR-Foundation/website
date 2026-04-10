/**
 * Sovereign Compose — Orchestrator.
 * ═════════════════════════════════════════════════════════════════
 *
 * Kubernetes-inspired lifecycle manager for AppBlueprints.
 *
 * Responsibilities:
 *   - Desired-state reconciliation (blueprints → running instances)
 *   - Dependency resolution (topological sort on requires)
 *   - Health monitoring (periodic healthchecks per app)
 *   - Resource accounting (call counts, denied counts per app)
 *   - Event emission for UI reactivity
 *
 * @version 1.0.0
 */

import { AppKernel } from "./app-kernel";
import {
  registerBlueprint,
  allBlueprints,
  getBlueprint,
} from "./blueprint-registry";
import type {
  AppBlueprint,
  AppInstance,
  OrchestratorMetrics,
  OrchestratorState,
  ComposeEvent,
  ComposeEventType,
} from "./types";

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

  // ── Initialization ────────────────────────────────────────────────────

  /**
   * Initialize the orchestrator with a set of static blueprints.
   * Registers all blueprints and starts instances for each.
   */
  async init(blueprints: AppBlueprint[]): Promise<void> {
    // Register all blueprints (computes canonical IDs)
    await Promise.all(blueprints.map((bp) => registerBlueprint(bp)));

    // Start an instance for each blueprint
    for (const bp of allBlueprints()) {
      this._startInstance(bp);
    }

    this._ready = true;
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
   * Stop a running instance by name.
   */
  stop(name: string): boolean {
    const instanceId = this._byName.get(name);
    if (!instanceId) return false;

    const kernel = this._kernels.get(instanceId);
    if (!kernel) return false;

    kernel.stop();
    this._clearHealthTimer(instanceId);
    this._emit("instance:stopped", instanceId, name);

    return true;
  }

  /**
   * Restart a stopped or crashed instance.
   */
  restart(name: string): boolean {
    const bp = getBlueprint(name);
    if (!bp) return false;

    // Stop existing instance if any
    this.stop(name);

    // Start fresh
    this._startInstance(bp);
    return true;
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

    for (const kernel of this._kernels.values()) {
      totalCalls += kernel.callCount;
      totalDenied += kernel.deniedCount;
      if (kernel.state === "running" || kernel.state === "degraded") {
        runningCount++;
      }
    }

    return {
      totalBlueprints: allBlueprints().length,
      runningInstances: runningCount,
      totalCalls,
      totalDenied,
      uptimeMs: Date.now() - this._startedAt,
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

    const kernel = new AppKernel(instanceId, bp);
    kernel.start();

    this._kernels.set(instanceId, kernel);
    this._byName.set(bp.name, instanceId);

    // Start healthcheck timer if defined
    if (bp.healthcheck) {
      const timer = setInterval(
        () => this._runHealthcheck(instanceId),
        bp.healthcheck.intervalSec * 1000,
      );
      this._healthTimers.set(instanceId, timer);
    }

    this._emit("instance:started", instanceId, bp.name);
    return instanceId;
  }

  private async _runHealthcheck(instanceId: string): Promise<void> {
    const kernel = this._kernels.get(instanceId);
    if (!kernel) return;

    const healthy = await kernel.healthcheck();
    this._emit("instance:healthcheck", instanceId, kernel.blueprint.name, {
      healthy,
    });
  }

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
