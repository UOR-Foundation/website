/**
 * Q-Sched — Coherence-Priority Quantum Scheduler
 * ═══════════════════════════════════════════════
 *
 * Classical schedulers optimize for CPU time fairness.
 * Q-Sched optimizes for COHERENCE — the H-score replaces nice values.
 *
 *   ┌──────────────┬──────────────────────────────────────────┐
 *   │ Linux        │ Q-Sched                                   │
 *   ├──────────────┼──────────────────────────────────────────┤
 *   │ nice (-20→19)│ H-score (0.0 → 1.0): higher = higher pri│
 *   │ CFS          │ Three zones: Convergent / Exploring / Div │
 *   │ task_struct   │ QProcess: lens + session chain + H-score  │
 *   │ context switch│ dehydrate(proc) → CID → rehydrate(CID)   │
 *   │ fork()       │ forkBlueprint: new CID, shared lineage    │
 *   │ wait()       │ Subscribe to child's session chain         │
 *   │ runqueue     │ Priority queue sorted by H-score           │
 *   └──────────────┴──────────────────────────────────────────┘
 *
 * ── CRYSTALLIZED ──
 * This module derives entirely from genesis/. Zero external dependencies.
 *
 * @module qkernel/q-sched
 */

import { sha256 } from "@/hologram/genesis/axiom-hash";
import { createCid } from "@/hologram/genesis/axiom-cid";
import { encodeUtf8 } from "@/hologram/genesis/axiom-ring";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

/** Coherence zone — derived from H-score */
export type CoherenceZone = "convergent" | "exploring" | "divergent";

/** Process state (mirrors Linux process states) */
export type ProcessState =
  | "running"       // Actively executing
  | "ready"         // In runqueue, awaiting CPU
  | "blocked"       // Waiting for I/O or child
  | "frozen"        // Dehydrated to CID
  | "halted";       // Terminated

/** A Q-Linux process */
export interface QProcess {
  readonly pid: number;
  readonly parentPid: number | null;
  readonly name: string;
  state: ProcessState;
  hScore: number;            // Coherence metric [0, 1]
  readonly zone: CoherenceZone;
  readonly createdAt: number;
  lastScheduledAt: number;
  totalCpuMs: number;        // Simulated execution time
  readonly sessionCid: string;
  frozenCid: string | null;  // CID when dehydrated
  children: number[];        // Child PIDs
}

/** Scheduler statistics */
export interface SchedStats {
  readonly totalProcesses: number;
  readonly runningCount: number;
  readonly readyCount: number;
  readonly blockedCount: number;
  readonly frozenCount: number;
  readonly haltedCount: number;
  readonly meanHScore: number;
  readonly zoneDistribution: Record<CoherenceZone, number>;
  readonly contextSwitches: number;
  readonly tickCount: number;
}

/** Context switch record */
export interface ContextSwitch {
  readonly from: number;         // PID
  readonly to: number;           // PID
  readonly reason: string;
  readonly tick: number;
  readonly fromHScore: number;
  readonly toHScore: number;
}

// ═══════════════════════════════════════════════════════════════════════
// H-Score → Zone Classification
// ═══════════════════════════════════════════════════════════════════════

/** Classify H-score into coherence zone */
export function classifyZone(hScore: number): CoherenceZone {
  if (hScore >= 0.8) return "convergent";
  if (hScore >= 0.5) return "exploring";
  return "divergent";
}

/** Zone priority weight: convergent processes run first */
function zonePriority(zone: CoherenceZone): number {
  switch (zone) {
    case "convergent": return 3;
    case "exploring":  return 2;
    case "divergent":  return 1;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Q-Sched Implementation
// ═══════════════════════════════════════════════════════════════════════

export class QSched {
  private processes = new Map<number, QProcess>();
  private nextPid = 1;   // PID 0 is reserved for genesis
  private currentPid: number | null = null;
  private tickCount = 0;
  private contextSwitches: ContextSwitch[] = [];

  /** Register the genesis process (PID 0) */
  registerGenesis(sessionCid: string): QProcess {
    const proc: QProcess = {
      pid: 0,
      parentPid: null,
      name: "init",
      state: "running",
      hScore: 1.0,
      zone: "convergent",
      createdAt: Date.now(),
      lastScheduledAt: Date.now(),
      totalCpuMs: 0,
      sessionCid,
      frozenCid: null,
      children: [],
    };
    this.processes.set(0, proc);
    this.currentPid = 0;
    return proc;
  }

  /**
   * fork — Create a child process. Inherits parent's H-score.
   * Returns the new process.
   *
   * Now SYNCHRONOUS — genesis hash is pure math.
   */
  fork(parentPid: number, name: string, hScore?: number): QProcess {
    const parent = this.processes.get(parentPid);
    const pid = this.nextPid++;
    const score = hScore ?? (parent?.hScore ?? 0.5);

    const payload = encodeUtf8(
      JSON.stringify({ pid, parent: parentPid, name, t: Date.now() })
    );
    const sessionCid = createCid(payload);

    const proc: QProcess = {
      pid,
      parentPid,
      name,
      state: "ready",
      hScore: score,
      zone: classifyZone(score),
      createdAt: Date.now(),
      lastScheduledAt: 0,
      totalCpuMs: 0,
      sessionCid: sessionCid.string,
      frozenCid: null,
      children: [],
    };

    this.processes.set(pid, proc);
    if (parent) parent.children.push(pid);
    return proc;
  }

  /**
   * schedule — Pick the next process to run.
   * Strategy: highest H-score first (coherence-priority scheduling).
   * Within same zone, round-robin by least-recently-scheduled.
   */
  schedule(): QProcess | null {
    this.tickCount++;

    const ready = Array.from(this.processes.values())
      .filter(p => p.state === "ready" || p.state === "running");

    if (ready.length === 0) return null;

    // Sort by: zone priority DESC, then H-score DESC, then LRS ASC
    ready.sort((a, b) => {
      const zDiff = zonePriority(b.zone) - zonePriority(a.zone);
      if (zDiff !== 0) return zDiff;
      const hDiff = b.hScore - a.hScore;
      if (Math.abs(hDiff) > 0.001) return hDiff;
      return a.lastScheduledAt - b.lastScheduledAt;
    });

    const next = ready[0];

    // Context switch if different from current
    if (this.currentPid !== null && this.currentPid !== next.pid) {
      const prev = this.processes.get(this.currentPid);
      if (prev && prev.state === "running") {
        prev.state = "ready";
      }
      this.contextSwitches.push({
        from: this.currentPid,
        to: next.pid,
        reason: `H-score priority (${next.hScore.toFixed(2)} > threshold)`,
        tick: this.tickCount,
        fromHScore: prev?.hScore ?? 0,
        toHScore: next.hScore,
      });
    }

    next.state = "running";
    next.lastScheduledAt = Date.now();
    this.currentPid = next.pid;
    return next;
  }

  /**
   * freeze — Dehydrate a process to a CID (context save).
   * Now SYNCHRONOUS — genesis hash is pure math.
   */
  freeze(pid: number): string | null {
    const proc = this.processes.get(pid);
    if (!proc || proc.state === "halted") return null;

    const stateBytes = encodeUtf8(
      JSON.stringify({
        pid: proc.pid,
        name: proc.name,
        hScore: proc.hScore,
        sessionCid: proc.sessionCid,
        totalCpuMs: proc.totalCpuMs,
        children: proc.children,
      })
    );
    const cid = createCid(stateBytes);

    proc.state = "frozen";
    proc.frozenCid = cid.string;
    if (this.currentPid === pid) this.currentPid = null;
    return cid.string;
  }

  /**
   * thaw — Rehydrate a frozen process back to ready state.
   */
  thaw(pid: number): boolean {
    const proc = this.processes.get(pid);
    if (!proc || proc.state !== "frozen") return false;
    proc.state = "ready";
    proc.frozenCid = null;
    return true;
  }

  /**
   * kill — Terminate a process.
   */
  kill(pid: number): boolean {
    const proc = this.processes.get(pid);
    if (!proc) return false;
    proc.state = "halted";
    if (this.currentPid === pid) this.currentPid = null;
    return true;
  }

  /**
   * updateHScore — Adjust a process's coherence score.
   * This is the feedback loop: agent output quality adjusts scheduling priority.
   */
  updateHScore(pid: number, newScore: number): boolean {
    const proc = this.processes.get(pid);
    if (!proc) return false;
    proc.hScore = Math.max(0, Math.min(1, newScore));
    (proc as { zone: CoherenceZone }).zone = classifyZone(proc.hScore);
    return true;
  }

  /** Get a process by PID */
  getProcess(pid: number): QProcess | undefined {
    return this.processes.get(pid);
  }

  /** Get all processes */
  allProcesses(): QProcess[] {
    return Array.from(this.processes.values());
  }

  /** Get scheduler statistics */
  stats(): SchedStats {
    const procs = Array.from(this.processes.values());
    const zones: Record<CoherenceZone, number> = { convergent: 0, exploring: 0, divergent: 0 };
    const states = { running: 0, ready: 0, blocked: 0, frozen: 0, halted: 0 };

    let hSum = 0;
    let active = 0;
    for (const p of procs) {
      states[p.state]++;
      zones[p.zone]++;
      if (p.state !== "halted") { hSum += p.hScore; active++; }
    }

    return {
      totalProcesses: procs.length,
      runningCount: states.running,
      readyCount: states.ready,
      blockedCount: states.blocked,
      frozenCount: states.frozen,
      haltedCount: states.halted,
      meanHScore: active > 0 ? hSum / active : 0,
      zoneDistribution: zones,
      contextSwitches: this.contextSwitches.length,
      tickCount: this.tickCount,
    };
  }

  /** Get context switch history */
  switchHistory(): readonly ContextSwitch[] {
    return this.contextSwitches;
  }
}
