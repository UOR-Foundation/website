/**
 * Hologram Engine — The Kernel of the Hologram OS
 * ════════════════════════════════════════════════
 *
 * The engine is the central loop that drives the holographic lifecycle:
 *
 *   Blueprint → Boot → Session → { Input → Evolve → Project → Render }*
 *
 * In traditional OS terms:
 *   - Engine     = kernel scheduler + process table
 *   - Session    = running process
 *   - Blueprint  = executable binary
 *   - Interact   = syscall
 *   - Project    = display server (Wayland/X11 equivalent)
 *   - Suspend    = hibernate to disk
 *   - Resume     = wake from hibernation
 *
 * Holographic Properties:
 *   1. Every engine state is content-addressable (can be dehydrated)
 *   2. Every session is deterministic (same blueprint + same inputs = same state)
 *   3. UI projections are derived from session identity (hash → visual)
 *   4. The engine itself is a UOR object with its own canonical identity
 *
 * The engine manages a process table of HologramSessions, routes input
 * to the correct session, and produces UIProjectionResults for rendering.
 *
 * @module uns/core/hologram/engine
 */

import { singleProofHash, type SingleProofResult } from "@/lib/uor-canonical";
import type { ProjectionInput } from "./index";
import {
  type ExecutableBlueprint,
  type HologramSession,
  type InteractionResult,
  type SuspendedSession,
  type GroundExecutableBlueprint,
  boot,
  resume,
  grindExecutableBlueprint,
} from "./executable-blueprint";
import {
  resolveUIProjection,
  resolveAllUIProjections,
  type UIComponentType,
  type UIProjectionResult,
} from "@/modules/hologram-ui/projection-registry";

// ── Engine Types ───────────────────────────────────────────────────────────

/**
 * A process entry in the engine's process table.
 * Wraps a HologramSession with engine-level metadata.
 */
export interface EngineProcess {
  /** Process ID — the session's derivation ID. */
  readonly pid: string;
  /** The blueprint CID that spawned this process. */
  readonly blueprintCid: string;
  /** The live session. */
  readonly session: HologramSession;
  /** The ground blueprint (content-addressed identity). */
  readonly ground: GroundExecutableBlueprint;
  /** When this process was spawned. */
  readonly spawnedAt: string;
  /** Current UI projection cache (refreshed on each tick). */
  projectionCache: ReadonlyMap<UIComponentType, UIProjectionResult> | null;
}

/**
 * The result of an engine tick — one cycle of the kernel loop.
 *
 * A tick:
 *   1. Applies an interaction (if any) to the target session
 *   2. Derives the new session identity from the evolved state
 *   3. Projects the identity through all UI components
 *   4. Returns the full projection set for rendering
 */
export interface EngineTick {
  /** The process that was ticked. */
  readonly pid: string;
  /** Interaction result (if an interaction was applied). */
  readonly interaction: InteractionResult | null;
  /** The session's current projection input (derived from state). */
  readonly identity: ProjectionInput;
  /** All UI projections of the current state. */
  readonly projections: ReadonlyMap<UIComponentType, UIProjectionResult>;
  /** Whether the session halted during this tick. */
  readonly halted: boolean;
  /** Tick timestamp. */
  readonly timestamp: string;
  /** Tick sequence number for this process. */
  readonly sequence: number;
}

/**
 * Engine state snapshot — the full kernel state, content-addressable.
 */
export interface EngineSnapshot {
  readonly "@type": "uor:HologramEngineSnapshot";
  /** Engine ID. */
  readonly engineId: string;
  /** All process PIDs and their status. */
  readonly processes: ReadonlyArray<{
    pid: string;
    blueprintCid: string;
    status: string;
    tickCount: number;
    spawnedAt: string;
  }>;
  /** Total ticks across all processes. */
  readonly totalTicks: number;
  /** Snapshot timestamp. */
  readonly timestamp: string;
}

/**
 * Listener for engine events.
 */
export type EngineListener = (event: EngineEvent) => void;

export type EngineEvent =
  | { type: "spawned"; pid: string; blueprintCid: string }
  | { type: "ticked"; tick: EngineTick }
  | { type: "suspended"; pid: string; proof: SingleProofResult }
  | { type: "resumed"; pid: string }
  | { type: "halted"; pid: string }
  | { type: "killed"; pid: string };

// ── Hologram Engine ────────────────────────────────────────────────────────

/**
 * The Hologram Engine — kernel of the Hologram OS.
 *
 * Manages a process table of HologramSessions, orchestrates the
 * boot → interact → project → render lifecycle, and provides
 * content-addressed snapshots of the entire engine state.
 *
 * Usage:
 *   const engine = new HologramEngine();
 *   const pid = await engine.spawn(blueprint);
 *   const tick = await engine.tick(pid, 0, DIRECTIONS.VERIFIED);
 *   // tick.projections → Map of UI projections to render
 *
 *   const snapshot = await engine.snapshot();
 *   // snapshot.proof.cid → content-addressed engine state
 */
export class HologramEngine {
  /** Process table: pid → EngineProcess. */
  private readonly processes = new Map<string, EngineProcess>();
  /** Tick counters per process. */
  private readonly tickCounts = new Map<string, number>();
  /** Event listeners. */
  private readonly listeners: EngineListener[] = [];
  /** Engine identity (computed lazily on first snapshot). */
  private engineId: string;

  constructor(engineId?: string) {
    this.engineId = engineId ?? `engine:${Date.now().toString(36)}`;
  }

  // ── Process Management ─────────────────────────────────────────────────

  /**
   * Spawn a new process from an Executable Blueprint.
   * This is the `exec()` syscall — creates and boots a new session.
   *
   * @returns The process ID (pid).
   */
  async spawn(blueprint: ExecutableBlueprint): Promise<string> {
    const ground = await grindExecutableBlueprint(blueprint);
    const session = await boot(blueprint);
    const pid = session.sessionId;

    const process: EngineProcess = {
      pid,
      blueprintCid: ground.proof.cid,
      session,
      ground,
      spawnedAt: new Date().toISOString(),
      projectionCache: null,
    };

    this.processes.set(pid, process);
    this.tickCounts.set(pid, 0);
    this.emit({ type: "spawned", pid, blueprintCid: ground.proof.cid });

    return pid;
  }

  /**
   * Tick a process — one cycle of the kernel loop.
   *
   * The tick is the atomic unit of the engine:
   *   1. Optionally apply an interaction (position + direction)
   *   2. Derive the current identity from session state
   *   3. Project identity through all UI components
   *   4. Return projections for rendering
   *
   * If no interaction is provided, this is a "read tick" — it just
   * re-projects the current state without evolving it.
   */
  async tick(
    pid: string,
    position?: number,
    direction?: number,
  ): Promise<EngineTick> {
    const process = this.getProcess(pid);
    const { session } = process;

    // 1. Apply interaction (if provided)
    let interaction: InteractionResult | null = null;
    if (position !== undefined && direction !== undefined) {
      interaction = session.interact(position, direction);
    }

    // 2. Derive identity from current session state
    const identity = await this.deriveSessionIdentity(process);

    // 3. Project through all UI components
    const projections = resolveAllUIProjections(identity);
    process.projectionCache = projections;

    // 4. Build tick result
    const seq = (this.tickCounts.get(pid) ?? 0) + 1;
    this.tickCounts.set(pid, seq);

    const halted = session.status === "halted";
    const tick: EngineTick = {
      pid,
      interaction,
      identity,
      projections,
      halted,
      timestamp: new Date().toISOString(),
      sequence: seq,
    };

    this.emit({ type: "ticked", tick });
    if (halted) this.emit({ type: "halted", pid });

    return tick;
  }

  /**
   * Execute data through a process's lens pipeline.
   *
   * This runs data through the session's lens (the instruction set)
   * without evolving the scheduler. Useful for data processing.
   */
  async execute(pid: string, input: unknown): Promise<unknown> {
    const process = this.getProcess(pid);
    return process.session.execute(input);
  }

  /**
   * Get a specific UI projection for a process.
   *
   * If the projection cache is stale (no tick since last call),
   * re-derives the identity and projects.
   */
  async project(
    pid: string,
    type: UIComponentType,
    overrides?: Record<string, unknown>,
  ): Promise<UIProjectionResult> {
    const process = this.getProcess(pid);
    const identity = await this.deriveSessionIdentity(process);
    return resolveUIProjection(identity, type, overrides);
  }

  /**
   * Suspend a process — dehydrate to canonical bytes.
   * The process can be resumed later with `resumeProcess()`.
   */
  async suspendProcess(pid: string): Promise<SuspendedSession> {
    const process = this.getProcess(pid);
    const suspended = await process.session.suspend();
    this.emit({ type: "suspended", pid, proof: suspended.proof });
    return suspended;
  }

  /**
   * Resume a suspended process.
   * Replays the interaction history to restore the exact state.
   */
  async resumeProcess(
    blueprint: ExecutableBlueprint,
    suspended: SuspendedSession,
  ): Promise<string> {
    const ground = await grindExecutableBlueprint(blueprint);
    const session = await resume(blueprint, suspended);
    const pid = session.sessionId;

    const process: EngineProcess = {
      pid,
      blueprintCid: ground.proof.cid,
      session,
      ground,
      spawnedAt: new Date().toISOString(),
      projectionCache: null,
    };

    this.processes.set(pid, process);
    this.tickCounts.set(pid, 0);
    this.emit({ type: "resumed", pid });

    return pid;
  }

  /**
   * Kill a process — halt permanently and remove from process table.
   */
  kill(pid: string): void {
    const process = this.getProcess(pid);
    process.session.stop();
    this.processes.delete(pid);
    this.tickCounts.delete(pid);
    this.emit({ type: "killed", pid });
  }

  // ── Introspection ──────────────────────────────────────────────────────

  /**
   * Get all running process IDs.
   */
  listProcesses(): string[] {
    return [...this.processes.keys()];
  }

  /**
   * Get process metadata.
   */
  getProcessInfo(pid: string): {
    pid: string;
    blueprintCid: string;
    status: string;
    tickCount: number;
    historyLength: number;
    spawnedAt: string;
  } {
    const process = this.getProcess(pid);
    return {
      pid,
      blueprintCid: process.blueprintCid,
      status: process.session.status,
      tickCount: this.tickCounts.get(pid) ?? 0,
      historyLength: process.session.history.length,
      spawnedAt: process.spawnedAt,
    };
  }

  /**
   * Get the number of running processes.
   */
  get processCount(): number {
    return this.processes.size;
  }

  /**
   * Snapshot the entire engine state — content-addressable.
   */
  async snapshot(): Promise<{ snapshot: EngineSnapshot; proof: SingleProofResult }> {
    const snapshot: EngineSnapshot = {
      "@type": "uor:HologramEngineSnapshot",
      engineId: this.engineId,
      processes: [...this.processes.entries()].map(([pid, proc]) => ({
        pid,
        blueprintCid: proc.blueprintCid,
        status: proc.session.status,
        tickCount: this.tickCounts.get(pid) ?? 0,
        spawnedAt: proc.spawnedAt,
      })),
      totalTicks: [...this.tickCounts.values()].reduce((a, b) => a + b, 0),
      timestamp: new Date().toISOString(),
    };

    const proof = await singleProofHash(snapshot);
    return { snapshot, proof };
  }

  // ── Event System ────────────────────────────────────────────────────────

  /**
   * Subscribe to engine events.
   * Returns an unsubscribe function.
   */
  on(listener: EngineListener): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

  // ── Private Helpers ─────────────────────────────────────────────────────

  private getProcess(pid: string): EngineProcess {
    const process = this.processes.get(pid);
    if (!process) {
      throw new Error(
        `[HologramEngine] No process with pid "${pid}". ` +
        `Active: ${this.listProcesses().length} processes.`
      );
    }
    return process;
  }

  /**
   * Derive a ProjectionInput from the current session state.
   *
   * The identity is derived from:
   *   - Blueprint CID (what program)
   *   - Interaction history length (how far evolved)
   *   - Current PolyTree snapshot (current interface shape)
   *
   * This ensures that different states of the same program
   * produce different visual projections.
   */
  private async deriveSessionIdentity(
    process: EngineProcess,
  ): Promise<ProjectionInput> {
    const { session, ground } = process;
    const snap = session.snapshot();

    const stateObj = {
      blueprintCid: ground.proof.cid,
      treeLabel: snap.label,
      positionCount: snap.positionCount,
      historyLength: session.history.length,
      isConstant: snap.isConstant,
    };

    const proof = await singleProofHash(stateObj);
    return {
      hashBytes: proof.hashBytes,
      cid: proof.cid,
      hex: proof.hashHex,
    };
  }

  private emit(event: EngineEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Swallow listener errors — engine must not crash
      }
    }
  }
}
