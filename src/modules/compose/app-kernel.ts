/**
 * Sovereign Compose — AppKernel.
 * ═════════════════════════════════════════════════════════════════
 *
 * Unikraft-inspired per-app isolation layer.
 *
 * Each running application receives its own AppKernel instance —
 * a scoped proxy of the Sovereign Bus that enforces least-privilege
 * by only allowing access to operations declared in the blueprint's
 * `requires` list.
 *
 * Every call is traced for audit and performance monitoring.
 *
 * @version 1.0.0
 */

import { call as busCal } from "@/modules/bus/bus";
import { has as busHas } from "@/modules/bus/registry";
import type { AppBlueprint, AppInstance, AppInstanceState } from "./types";

// ── Permission Error ──────────────────────────────────────────────────────

export class KernelPermissionError extends Error {
  constructor(
    public readonly method: string,
    public readonly appName: string,
  ) {
    super(
      `[AppKernel:${appName}] Permission denied: "${method}" is not in this app's requires list.`,
    );
    this.name = "KernelPermissionError";
  }
}

// ── AppKernel ─────────────────────────────────────────────────────────────

/**
 * AppKernel — a minimal, isolated bus proxy for a single application.
 *
 * Inspired by Unikraft's single-purpose kernels:
 *   - Only the operations the app declared are accessible
 *   - All calls are counted and traceable
 *   - The kernel can be started, stopped, and inspected independently
 */
export class AppKernel {
  private readonly _allowedOps: Set<string>;
  private readonly _allowedNamespaces: Set<string>;
  private _state: AppInstanceState = "pending";
  private _callCount = 0;
  private _deniedCount = 0;
  private _lastHealthy?: number;
  private _error?: string;
  private _createdAt: number;

  constructor(
    public readonly instanceId: string,
    public readonly blueprint: AppBlueprint,
  ) {
    this._allowedOps = new Set(blueprint.requires);
    this._allowedNamespaces = new Set(blueprint.permissions);
    this._createdAt = Date.now();
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────

  /** Mark the kernel as running. */
  start(): void {
    this._state = "running";
    this._lastHealthy = Date.now();
  }

  /** Mark the kernel as stopped. */
  stop(): void {
    this._state = "stopped";
  }

  /** Mark the kernel as crashed with an error. */
  crash(error: string): void {
    this._state = "crashed";
    this._error = error;
  }

  /** Mark as degraded (healthcheck failing). */
  degrade(): void {
    this._state = "degraded";
  }

  // ── Bus Proxy ───────────────────────────────────────────────────────────

  /**
   * Call a bus operation through this kernel's permission filter.
   *
   * The method must be in the blueprint's `requires` list OR
   * its namespace must be in the `permissions` list.
   *
   * @throws KernelPermissionError if the method is not allowed
   */
  async call<T = unknown>(method: string, params?: unknown): Promise<T> {
    if (!this._isAllowed(method)) {
      this._deniedCount++;
      throw new KernelPermissionError(method, this.blueprint.name);
    }

    this._callCount++;
    return busCal(method, params) as Promise<T>;
  }

  /**
   * Check if a method is allowed without calling it.
   */
  canCall(method: string): boolean {
    return this._isAllowed(method);
  }

  /**
   * List all operations this kernel is allowed to call.
   */
  allowedOperations(): string[] {
    return Array.from(this._allowedOps);
  }

  /**
   * List allowed operations that are actually registered on the bus.
   */
  availableOperations(): string[] {
    return this.allowedOperations().filter(busHas);
  }

  /**
   * List allowed operations that are NOT yet registered (missing deps).
   */
  missingOperations(): string[] {
    return this.allowedOperations().filter((op) => !busHas(op));
  }

  // ── Healthcheck ─────────────────────────────────────────────────────────

  /**
   * Run the blueprint's healthcheck if defined.
   * Returns true if healthy, false otherwise.
   */
  async healthcheck(): Promise<boolean> {
    const hc = this.blueprint.healthcheck;
    if (!hc) {
      // No healthcheck defined — assume healthy
      this._lastHealthy = Date.now();
      return true;
    }

    try {
      await this.call(hc.op);
      this._lastHealthy = Date.now();
      if (this._state === "degraded") this._state = "running";
      return true;
    } catch {
      this.degrade();
      return false;
    }
  }

  // ── Snapshot ─────────────────────────────────────────────────────────────

  /** Export the current instance state for UI rendering. */
  toInstance(): AppInstance {
    return {
      instanceId: this.instanceId,
      blueprint: this.blueprint,
      state: this._state,
      createdAt: this._createdAt,
      lastHealthy: this._lastHealthy,
      callCount: this._callCount,
      deniedCount: this._deniedCount,
      error: this._error,
    };
  }

  get state(): AppInstanceState {
    return this._state;
  }

  get callCount(): number {
    return this._callCount;
  }

  get deniedCount(): number {
    return this._deniedCount;
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private _isAllowed(method: string): boolean {
    // Direct match on requires list
    if (this._allowedOps.has(method)) return true;

    // Namespace match on permissions list (e.g. "graph/" allows "graph/query")
    const ns = method.split("/")[0] + "/";
    if (this._allowedNamespaces.has(ns)) return true;

    return false;
  }
}
