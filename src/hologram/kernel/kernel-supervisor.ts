/**
 * KernelSupervisor — PID 0, the root of all kernels
 * ═══════════════════════════════════════════════════
 *
 * The supervisor spawns, monitors, and suspends child kernel instances.
 * Each child kernel is an isolated execution environment (agent, app,
 * or service) with its own scheduler, memory, and session chain.
 *
 * Architecture:
 *   KernelSupervisor (PID 0)
 *     ├─ ChildKernel #1 (app: browser)    H=0.82
 *     ├─ ChildKernel #2 (agent: lumen)    H=0.91
 *     ├─ ChildKernel #3 (service: mesh)   H=0.65
 *     └─ ChildKernel #4 (agent: research) H=0.45 → suspended
 *
 * Child kernels are Z-ordered by H-score for frame composition:
 *   highest H = foreground (user's active focus)
 *   lowest H  = background (deprioritized, eventually frozen)
 *
 * @module hologram/kernel/kernel-supervisor
 */

import { classifyZone, type CoherenceZone } from "./q-sched";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

/** Child kernel role — what kind of computation it represents */
export type KernelRole = "app" | "agent" | "service" | "sandbox";

/** Child kernel lifecycle state */
export type ChildKernelState =
  | "booting"     // Being initialized
  | "running"     // Active, producing frames
  | "idle"        // Running but no recent activity
  | "suspended"   // Paused due to low H-score
  | "frozen"      // Dehydrated to CID
  | "terminated"; // Permanently stopped

/** A lightweight child kernel frame — what the child projects */
export interface ChildKernelFrame {
  readonly kernelId: string;
  readonly tick: number;
  readonly timestamp: number;
  readonly meanH: number;
  readonly zone: CoherenceZone;
  readonly processCount: number;
  readonly panels: readonly { name: string; hScore: number }[];
}

/** Child kernel descriptor */
export interface ChildKernel {
  readonly id: string;
  readonly name: string;
  readonly role: KernelRole;
  readonly pid: number;
  readonly createdAt: number;

  state: ChildKernelState;
  hScore: number;
  zone: CoherenceZone;
  frameCount: number;
  lastFrameAt: number;
  lastFrame: ChildKernelFrame | null;

  /** Z-order: derived from H-score. Higher = foreground. */
  zOrder: number;
}

/** Supervisor projection — included in the composite frame */
export interface SupervisorProjection {
  /** Total child kernels managed */
  readonly totalKernels: number;
  /** Currently running kernels */
  readonly runningKernels: number;
  /** Suspended kernels (low H-score) */
  readonly suspendedKernels: number;
  /** Frozen kernels (dehydrated) */
  readonly frozenKernels: number;
  /** Mean H-score across all active children */
  readonly meanH: number;
  /** Z-ordered kernel IDs (foreground first) */
  readonly zOrder: readonly string[];
  /** Zone distribution */
  readonly zoneDistribution: Record<CoherenceZone, number>;
  /** Total frames composed since boot */
  readonly totalFramesComposed: number;
  /** Supervisor health: ratio of convergent kernels */
  readonly health: number;
}

// ═══════════════════════════════════════════════════════════════════════
// Thresholds
// ═══════════════════════════════════════════════════════════════════════

const SUSPEND_THRESHOLD = 0.25;  // H-score below this → suspend
const FREEZE_THRESHOLD = 0.10;   // H-score below this → freeze
const REVIVE_THRESHOLD = 0.40;   // H-score above this → un-suspend
const IDLE_TIMEOUT_MS = 30_000;  // No frames for 30s → mark idle
const MAX_CHILDREN = 32;         // Maximum concurrent child kernels

// ═══════════════════════════════════════════════════════════════════════
// KernelSupervisor
// ═══════════════════════════════════════════════════════════════════════

export class KernelSupervisor {
  private children = new Map<string, ChildKernel>();
  private nextPid = 100; // Child PIDs start at 100 (0–99 reserved for supervisor)
  private totalFramesComposed = 0;
  private listeners = new Set<(projection: SupervisorProjection) => void>();

  /** Spawn a new child kernel */
  spawn(name: string, role: KernelRole, initialH = 0.7): ChildKernel {
    if (this.children.size >= MAX_CHILDREN) {
      // Evict the lowest-H frozen kernel to make room
      const frozen = this.childrenByState("frozen");
      if (frozen.length > 0) {
        frozen.sort((a, b) => a.hScore - b.hScore);
        this.terminate(frozen[0].id);
      } else {
        throw new Error(`KernelSupervisor: max children (${MAX_CHILDREN}) reached`);
      }
    }

    const id = `kernel-${this.nextPid}-${name}`;
    const child: ChildKernel = {
      id,
      name,
      role,
      pid: this.nextPid++,
      createdAt: Date.now(),
      state: "booting",
      hScore: initialH,
      zone: classifyZone(initialH),
      frameCount: 0,
      lastFrameAt: 0,
      lastFrame: null,
      zOrder: 0,
    };

    this.children.set(id, child);

    // Immediately transition to running
    child.state = "running";
    this.recomputeZOrder();

    return child;
  }

  /** Receive a frame from a child kernel */
  ingestFrame(kernelId: string, frame: ChildKernelFrame): void {
    const child = this.children.get(kernelId);
    if (!child) return;

    child.lastFrame = frame;
    child.lastFrameAt = frame.timestamp;
    child.frameCount++;
    child.hScore = frame.meanH;
    child.zone = frame.zone;

    // Auto-revive if H-score recovered
    if (child.state === "suspended" && child.hScore >= REVIVE_THRESHOLD) {
      child.state = "running";
    }

    // Mark running if was idle
    if (child.state === "idle") {
      child.state = "running";
    }

    this.totalFramesComposed++;
    this.recomputeZOrder();
  }

  /** Tick the supervisor — enforce lifecycle policies */
  tick(): SupervisorProjection {
    const now = Date.now();

    for (const child of this.children.values()) {
      if (child.state === "terminated" || child.state === "frozen") continue;

      // Idle detection
      if (child.state === "running" && child.lastFrameAt > 0 && now - child.lastFrameAt > IDLE_TIMEOUT_MS) {
        child.state = "idle";
      }

      // H-score enforcement
      if (child.state === "running" || child.state === "idle") {
        if (child.hScore < FREEZE_THRESHOLD) {
          child.state = "frozen";
        } else if (child.hScore < SUSPEND_THRESHOLD) {
          child.state = "suspended";
        }
      }
    }

    this.recomputeZOrder();
    const projection = this.project();
    for (const cb of this.listeners) cb(projection);
    return projection;
  }

  /** Suspend a child kernel */
  suspend(kernelId: string): boolean {
    const child = this.children.get(kernelId);
    if (!child || child.state === "terminated") return false;
    child.state = "suspended";
    this.recomputeZOrder();
    return true;
  }

  /** Resume a suspended child kernel */
  resume(kernelId: string): boolean {
    const child = this.children.get(kernelId);
    if (!child || child.state !== "suspended") return false;
    child.state = "running";
    this.recomputeZOrder();
    return true;
  }

  /** Freeze a child kernel (dehydrate to CID) */
  freeze(kernelId: string): boolean {
    const child = this.children.get(kernelId);
    if (!child || child.state === "terminated") return false;
    child.state = "frozen";
    this.recomputeZOrder();
    return true;
  }

  /** Terminate a child kernel permanently */
  terminate(kernelId: string): boolean {
    const child = this.children.get(kernelId);
    if (!child) return false;
    child.state = "terminated";
    this.children.delete(kernelId);
    this.recomputeZOrder();
    return true;
  }

  /** Get a child kernel by ID */
  getChild(kernelId: string): ChildKernel | undefined {
    return this.children.get(kernelId);
  }

  /** Get all children sorted by Z-order (foreground first) */
  getZOrderedChildren(): readonly ChildKernel[] {
    return Array.from(this.children.values())
      .filter(c => c.state === "running" || c.state === "idle")
      .sort((a, b) => b.zOrder - a.zOrder);
  }

  /** Get children by state */
  childrenByState(state: ChildKernelState): ChildKernel[] {
    return Array.from(this.children.values()).filter(c => c.state === state);
  }

  /** Get all children */
  allChildren(): readonly ChildKernel[] {
    return Array.from(this.children.values());
  }

  /** Subscribe to supervisor projections */
  onProjection(cb: (p: SupervisorProjection) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  // ── Internal ────────────────────────────────────────────────────────

  /** Recompute Z-order: sort active children by H-score descending */
  private recomputeZOrder(): void {
    const active = Array.from(this.children.values())
      .filter(c => c.state === "running" || c.state === "idle")
      .sort((a, b) => b.hScore - a.hScore);

    for (let i = 0; i < active.length; i++) {
      active[i].zOrder = active.length - i; // Highest H = highest Z
    }

    // Inactive kernels get Z=0
    for (const child of this.children.values()) {
      if (child.state !== "running" && child.state !== "idle") {
        child.zOrder = 0;
      }
    }
  }

  /** Project supervisor state for inclusion in composite frame */
  private project(): SupervisorProjection {
    const zones: Record<CoherenceZone, number> = { convergent: 0, exploring: 0, divergent: 0 };
    let hSum = 0;
    let activeCount = 0;
    let runningCount = 0;
    let suspendedCount = 0;
    let frozenCount = 0;

    for (const child of this.children.values()) {
      zones[child.zone]++;
      if (child.state === "running" || child.state === "idle") {
        hSum += child.hScore;
        activeCount++;
      }
      if (child.state === "running") runningCount++;
      if (child.state === "suspended") suspendedCount++;
      if (child.state === "frozen") frozenCount++;
    }

    const convergentRatio = activeCount > 0
      ? zones.convergent / activeCount
      : 1;

    return {
      totalKernels: this.children.size,
      runningKernels: runningCount,
      suspendedKernels: suspendedCount,
      frozenKernels: frozenCount,
      meanH: activeCount > 0 ? hSum / activeCount : 0,
      zOrder: this.getZOrderedChildren().map(c => c.id),
      zoneDistribution: zones,
      totalFramesComposed: this.totalFramesComposed,
      health: convergentRatio,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════════════

let _supervisor: KernelSupervisor | null = null;

/** Get the singleton kernel supervisor */
export function getKernelSupervisor(): KernelSupervisor {
  if (!_supervisor) {
    _supervisor = new KernelSupervisor();
  }
  return _supervisor;
}
