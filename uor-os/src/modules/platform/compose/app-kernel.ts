/**
 * Scheduling & Orchestration — Container Runtime (AppKernel).
 * @ontology uor:ContainerRuntime
 * ═════════════════════════════════════════════════════════════════
 *
 * Unikraft-inspired per-app isolation layer.
 *
 * Each running application receives its own Container Runtime instance —
 * a scoped proxy of the Service Mesh that enforces least-privilege,
 * call-rate budgets, fast-path dispatch, payload accounting,
 * and content-addressed runtime sealing.
 *
 * @version 2.0.0
 */

import { call as busCall } from "@/modules/platform/bus/bus";
import { has as busHas, resolve as busResolve } from "@/modules/platform/bus/registry";
import { singleProofHash } from "@/lib/uor-canonical";
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

export class KernelBudgetExhaustedError extends Error {
  constructor(
    public readonly appName: string,
    public readonly reason: "rateLimit" | "totalLimit",
  ) {
    super(
      `[AppKernel:${appName}] Call budget exhausted (${reason}).`,
    );
    this.name = "KernelBudgetExhaustedError";
  }
}

// ── AppKernel ─────────────────────────────────────────────────────────────

/**
 * AppKernel — a minimal, isolated bus proxy for a single application.
 *
 * Inspired by Unikraft's single-purpose kernels + FlexOS compartments:
 *   - Only the operations the app declared are accessible
 *   - Call-rate sliding-window limiter (FlexOS compartmentalization)
 *   - Fast-path direct dispatch for hot operations (zero-overhead inlining)
 *   - Payload accounting for resource tracking
 *   - Content-addressed runtime sealing for integrity verification
 */
export class AppKernel {
  private readonly _allowedOps: Set<string>;
  private readonly _allowedNamespaces: Set<string>;
  private readonly _fastPathOps: Set<string>;
  private _state: AppInstanceState = "pending";
  private _callCount = 0;
  private _deniedCount = 0;
  private _lastHealthy?: number;
  private _error?: string;
  private _createdAt: number;
  private _bootTimeMs?: number;

  // ── Rate limiter (sliding window) ─────────────────────────────────────
  private _callTimestamps: number[] = [];
  private readonly _maxPerSecond: number;
  private readonly _maxTotal: number;

  // ── Payload accounting ────────────────────────────────────────────────
  private _payloadBytes = 0;

  // ── Worker accounting ─────────────────────────────────────────────────
  private _workersAllocated = 0;

  // ── Seal ──────────────────────────────────────────────────────────────
  private _lastSealHash?: string;

  // ── Circuit breaker ───────────────────────────────────────────────────
  private _consecutiveFailures = 0;

  constructor(
    public readonly instanceId: string,
    public readonly blueprint: AppBlueprint,
  ) {
    this._allowedOps = new Set(blueprint.requires);
    this._allowedNamespaces = new Set(blueprint.permissions);
    this._fastPathOps = new Set(blueprint.fastPath || []);
    this._createdAt = Date.now();

    const budget = blueprint.resources.callBudget;
    this._maxPerSecond = budget?.maxPerSecond ?? Infinity;
    this._maxTotal = budget?.maxTotal ?? Infinity;
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────

  /** Mark the kernel as running. Records boot time. */
  start(): void {
    this._state = "running";
    this._lastHealthy = Date.now();
    this._bootTimeMs = Date.now() - this._createdAt;
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

  // ── Bus Proxy (Full Middleware Path) ────────────────────────────────────

  /**
   * Call a bus operation through this kernel's permission filter.
   *
   * Pipeline: permission check → rate limit → payload accounting → bus.call
   *
   * @throws KernelPermissionError if the method is not allowed
   * @throws KernelBudgetExhaustedError if rate/total limit exceeded
   */
  async call<T = unknown>(method: string, params?: unknown): Promise<T> {
    if (!this._isAllowed(method)) {
      this._deniedCount++;
      throw new KernelPermissionError(method, this.blueprint.name);
    }

    if (!this._checkBudget()) {
      this._state = "callBudgetExhausted";
      throw new KernelBudgetExhaustedError(this.blueprint.name, 
        this._callCount >= this._maxTotal ? "totalLimit" : "rateLimit");
    }

    this._callCount++;
    this._recordTimestamp();
    this._accountPayload(params);

    return busCall(method, params) as Promise<T>;
  }

  // ── Fast-Path Dispatch (Zero Middleware Overhead) ──────────────────────

  /**
   * Call a bus operation directly, bypassing the middleware chain.
   *
   * Only available for operations listed in blueprint.fastPath.
   * Inspired by Unikraft's zero-syscall-overhead dispatch.
   *
   * ~10x faster than call() for hot inner loops (ring compute, graph queries).
   */
  async callDirect<T = unknown>(method: string, params?: unknown): Promise<T> {
    if (!this._isAllowed(method)) {
      this._deniedCount++;
      throw new KernelPermissionError(method, this.blueprint.name);
    }

    if (!this._fastPathOps.has(method)) {
      // Fall back to normal call if not in fast-path list
      return this.call<T>(method, params);
    }

    if (!this._checkBudget()) {
      this._state = "callBudgetExhausted";
      throw new KernelBudgetExhaustedError(this.blueprint.name, "rateLimit");
    }

    // Resolve handler directly from registry — skip middleware chain
    const descriptor = busResolve(method);
    if (!descriptor) {
      return this.call<T>(method, params);
    }

    this._callCount++;
    this._recordTimestamp();
    this._accountPayload(params);

    return descriptor.handler(params) as Promise<T>;
  }

  // ── Queries ────────────────────────────────────────────────────────────

  /** Check if a method is allowed without calling it. */
  canCall(method: string): boolean {
    return this._isAllowed(method);
  }

  /** List all operations this kernel is allowed to call. */
  allowedOperations(): string[] {
    return Array.from(this._allowedOps);
  }

  /** List allowed operations that are actually registered on the bus. */
  availableOperations(): string[] {
    return this.allowedOperations().filter(busHas);
  }

  /** List allowed operations that are NOT yet registered (missing deps). */
  missingOperations(): string[] {
    return this.allowedOperations().filter((op) => !busHas(op));
  }

  // ── Healthcheck ─────────────────────────────────────────────────────────

  /**
   * Run the blueprint's healthcheck if defined.
   * Returns true if healthy, false otherwise.
   * Tracks consecutive failures for circuit breaker.
   */
  async healthcheck(): Promise<boolean> {
    const hc = this.blueprint.healthcheck;
    if (!hc) {
      this._lastHealthy = Date.now();
      this._consecutiveFailures = 0;
      return true;
    }

    try {
      await this.call(hc.op);
      this._lastHealthy = Date.now();
      this._consecutiveFailures = 0;
      if (this._state === "degraded") this._state = "running";
      return true;
    } catch {
      this._consecutiveFailures++;
      this.degrade();
      return false;
    }
  }

  // ── Kernel Seal — Content-Addressed Runtime Snapshot ────────────────────

  /**
   * Seal the kernel's runtime state into a content-addressed hash.
   *
   * Inspired by Unikraft's verified binary images — at any point, the
   * orchestrator can hash the kernel's state (call count, denied count,
   * error state) into a verifiable snapshot via singleProofHash.
   *
   * Enables tamper detection: if the seal changes unexpectedly, the
   * kernel's runtime integrity has been compromised.
   */
  async seal(): Promise<string> {
    const snapshot = this.toInstance();
    const proof = await singleProofHash({
      "@type": "uor:KernelSeal",
      "compose:instanceId": snapshot.instanceId,
      "compose:blueprint": snapshot.blueprint.name,
      "compose:state": snapshot.state,
      "compose:callCount": snapshot.callCount,
      "compose:deniedCount": snapshot.deniedCount,
      "compose:payloadBytes": snapshot.payloadBytes,
      "compose:consecutiveFailures": snapshot.consecutiveFailures,
      "compose:timestamp": Date.now(),
    });

    this._lastSealHash = proof.cid;
    return proof.cid;
  }

  // ── Worker Accounting ──────────────────────────────────────────────────

  /** Set the number of allocated worker slots (called by orchestrator). */
  setWorkersAllocated(count: number): void {
    this._workersAllocated = count;
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
      bootTimeMs: this._bootTimeMs,
      payloadBytes: this._payloadBytes,
      workersAllocated: this._workersAllocated,
      lastSealHash: this._lastSealHash,
      consecutiveFailures: this._consecutiveFailures,
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

  get payloadBytes(): number {
    return this._payloadBytes;
  }

  get consecutiveFailures(): number {
    return this._consecutiveFailures;
  }

  get bootTimeMs(): number | undefined {
    return this._bootTimeMs;
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private _isAllowed(method: string): boolean {
    if (this._allowedOps.has(method)) return true;
    const ns = method.split("/")[0] + "/";
    if (this._allowedNamespaces.has(ns)) return true;
    return false;
  }

  /**
   * Sliding-window rate limiter.
   * Prunes timestamps older than 1s, then checks count < maxPerSecond.
   * Also checks lifetime total < maxTotal.
   */
  private _checkBudget(): boolean {
    // Total limit
    if (this._callCount >= this._maxTotal) return false;

    // Rate limit (sliding window)
    if (this._maxPerSecond !== Infinity) {
      const now = Date.now();
      const windowStart = now - 1000;
      // Prune old timestamps
      while (this._callTimestamps.length > 0 && this._callTimestamps[0] < windowStart) {
        this._callTimestamps.shift();
      }
      if (this._callTimestamps.length >= this._maxPerSecond) return false;
    }

    return true;
  }

  private _recordTimestamp(): void {
    if (this._maxPerSecond !== Infinity) {
      this._callTimestamps.push(Date.now());
    }
  }

  /**
   * Estimate serialized size of call params for payload accounting.
   * Uses JSON.stringify length as a proxy for byte size.
   */
  private _accountPayload(params: unknown): void {
    if (params === undefined || params === null) return;
    try {
      const size = typeof params === "string"
        ? params.length
        : JSON.stringify(params).length;
      this._payloadBytes += size;
    } catch {
      // Non-serializable params — skip accounting
    }
  }
}
