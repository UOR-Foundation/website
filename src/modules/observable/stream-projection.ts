/**
 * Stream Projection Engine
 * ════════════════════════
 *
 * Ingests a live byte stream and projects coherence state in real-time
 * through all six scale levels (L0 Byte → L5 Network).
 *
 * The stream IS the observation. Every byte that enters the system is
 * immediately assessed, composed upward through the scale hierarchy,
 * and emitted as an observable snapshot. The UI subscribes to these
 * snapshots and renders the living coherence state of the stream.
 *
 * Architecture:
 *   ByteSource → StreamProjection → listeners(StreamSnapshot)
 *                     ↓
 *              MultiScaleObserver (L0→L5 composition)
 *
 * This is the self-reflective principle made operational: the system
 * watches its own data flow and renders its own health in real-time.
 *
 * @module observable/stream-projection
 */

import {
  MultiScaleObserver,
  type ScaleLevel,
  type ScaleObservation,
  type CoherenceZone,
  SCALE_LABELS,
} from "./multi-scale";

// ── Types ───────────────────────────────────────────────────────────────────

/** A complete snapshot of the stream's coherence state at all scales. */
export interface StreamSnapshot {
  /** Monotonic frame counter. */
  readonly frame: number;
  /** Total bytes ingested so far. */
  readonly totalBytes: number;
  /** Bytes per second (rolling average). */
  readonly bytesPerSecond: number;
  /** Per-level summaries. */
  readonly levels: readonly LevelSnapshot[];
  /** Network-level coherence (L5). */
  readonly network: ScaleObservation | null;
  /** Cross-scale consistency check. */
  readonly crossScale: {
    readonly consistent: boolean;
    readonly anomalies: readonly string[];
  };
  /** Timestamp of this snapshot. */
  readonly timestamp: number;
  /** Recent byte window (last 64 bytes for visualization). */
  readonly recentBytes: readonly number[];
}

/** Per-level summary within a snapshot. */
export interface LevelSnapshot {
  readonly level: ScaleLevel;
  readonly name: string;
  readonly icon: string;
  readonly count: number;
  readonly meanH: number;
  readonly zone: CoherenceZone;
  readonly phi: number;
}

/** Listener callback type. */
export type StreamListener = (snapshot: StreamSnapshot) => void;

// ── Module Topology (for L3→L4→L5 composition) ─────────────────────────────

const STREAM_MODULES = [
  { id: "ingestion", name: "Byte Ingestion", ops: [] as string[] },
  { id: "transform", name: "Transform Layer", ops: [] as string[] },
  { id: "identity",  name: "Identity Layer",  ops: [] as string[] },
];

const STREAM_PROJECTIONS = [
  { id: "foundation", name: "Foundation", mods: ["ingestion"] },
  { id: "processing", name: "Processing", mods: ["transform", "identity"] },
];

// ── StreamProjection Class ──────────────────────────────────────────────────

/**
 * Real-time streaming coherence engine.
 *
 * Usage:
 *   const stream = new StreamProjection();
 *   stream.subscribe(snapshot => renderUI(snapshot));
 *   stream.ingest(new Uint8Array([42, 7, 255]));
 *   // or:
 *   stream.startDemo();  // auto-generates bytes
 *   stream.stop();
 */
export class StreamProjection {
  private mso: MultiScaleObserver;
  private listeners: Set<StreamListener> = new Set();
  private frame = 0;
  private totalBytes = 0;
  private recentBytes: number[] = [];
  private startTime = Date.now();
  private timerId: ReturnType<typeof setInterval> | null = null;
  private opCounter = 0;

  constructor(gradeAGraph?: number[]) {
    this.mso = new MultiScaleObserver(gradeAGraph);
  }

  // ── Subscription ──────────────────────────────────────────────────────

  subscribe(listener: StreamListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // ── Ingestion ─────────────────────────────────────────────────────────

  /**
   * Ingest raw bytes into the stream.
   *
   * Each call triggers bottom-up composition (L0→L5) and emits
   * a fresh snapshot to all listeners.
   */
  ingest(bytes: Uint8Array): StreamSnapshot {
    // L0 + L1: bytes and datums
    this.mso.ingestBytes(bytes);
    this.totalBytes += bytes.length;

    // Track recent bytes (sliding window of 64)
    for (const b of bytes) {
      this.recentBytes.push(b);
    }
    if (this.recentBytes.length > 64) {
      this.recentBytes = this.recentBytes.slice(-64);
    }

    // L2: create operations from consecutive byte pairs
    for (let i = 0; i < bytes.length - 1; i += 2) {
      const opId = `stream:${this.opCounter++}`;
      const modIdx = this.opCounter % STREAM_MODULES.length;
      this.mso.ingestOperation(opId, `${STREAM_MODULES[modIdx].id}.process`, bytes[i], bytes[i + 1]);
      STREAM_MODULES[modIdx].ops.push(opId);
    }

    // L3: compose modules from their operations
    for (const mod of STREAM_MODULES) {
      if (mod.ops.length > 0) {
        this.mso.composeModule(mod.id, mod.name, mod.ops.slice(-20)); // Last 20 ops
      }
    }

    // L4: compose projections from modules
    for (const proj of STREAM_PROJECTIONS) {
      this.mso.composeProjection(proj.id, proj.name, proj.mods);
    }

    // L5: compose network
    this.mso.composeNetwork();

    // Emit snapshot
    const snapshot = this.snapshot();
    this.emit(snapshot);
    return snapshot;
  }

  // ── Snapshot ───────────────────────────────────────────────────────────

  /** Build a complete snapshot of current state. */
  snapshot(): StreamSnapshot {
    this.frame++;
    const now = Date.now();
    const elapsed = Math.max(1, (now - this.startTime) / 1000);

    const levels: LevelSnapshot[] = [];
    for (let l = 0; l <= 5; l++) {
      const obs = this.mso.getLevel(l as ScaleLevel);
      const meta = SCALE_LABELS[l as ScaleLevel];
      if (obs.length === 0) {
        levels.push({
          level: l as ScaleLevel,
          name: meta.name,
          icon: meta.icon,
          count: 0,
          meanH: 0,
          zone: "COHERENCE",
          phi: 1,
        });
      } else {
        const meanH = obs.reduce((s, o) => s + o.hScore, 0) / obs.length;
        const meanPhi = obs.reduce((s, o) => s + o.phi, 0) / obs.length;
        levels.push({
          level: l as ScaleLevel,
          name: meta.name,
          icon: meta.icon,
          count: obs.length,
          meanH,
          zone: meanH <= 2 ? "COHERENCE" : meanH <= 5 ? "DRIFT" : "COLLAPSE",
          phi: meanPhi,
        });
      }
    }

    const crossScale = this.mso.crossScaleCoherence();
    const networkObs = this.mso.getLevel(5);

    return {
      frame: this.frame,
      totalBytes: this.totalBytes,
      bytesPerSecond: this.totalBytes / elapsed,
      levels,
      network: networkObs.length > 0 ? networkObs[0] : null,
      crossScale: {
        consistent: crossScale.consistent,
        anomalies: crossScale.anomalies,
      },
      timestamp: now,
      recentBytes: [...this.recentBytes],
    };
  }

  // ── Demo Mode ─────────────────────────────────────────────────────────

  /**
   * Start a demo stream that auto-generates bytes.
   *
   * @param mode     "coherent" | "drift" | "collapse" | "recovery"
   * @param interval Milliseconds between emissions (default: 100)
   * @param chunkSize Bytes per emission (default: 8)
   */
  startDemo(
    mode: "coherent" | "drift" | "collapse" | "recovery" = "coherent",
    interval = 100,
    chunkSize = 8,
  ): void {
    this.stop();
    let recoveryPhase = 0;

    this.timerId = setInterval(() => {
      const bytes = new Uint8Array(chunkSize);

      switch (mode) {
        case "coherent":
          // Even bytes only → H=0 on full graph
          for (let i = 0; i < chunkSize; i++) bytes[i] = (Math.floor(Math.random() * 128)) * 2;
          break;

        case "drift":
          // Mix of close and moderate distances
          for (let i = 0; i < chunkSize; i++) {
            bytes[i] = Math.random() > 0.5
              ? Math.floor(Math.random() * 256)
              : (Math.floor(Math.random() * 128)) * 2;
          }
          break;

        case "collapse":
          // High-entropy random bytes on sparse graph
          for (let i = 0; i < chunkSize; i++) bytes[i] = Math.floor(Math.random() * 256);
          break;

        case "recovery":
          // Starts chaotic, gradually converges
          recoveryPhase++;
          const coherenceProb = Math.min(0.95, recoveryPhase / 50);
          for (let i = 0; i < chunkSize; i++) {
            bytes[i] = Math.random() < coherenceProb
              ? (Math.floor(Math.random() * 128)) * 2
              : Math.floor(Math.random() * 256);
          }
          break;
      }

      this.ingest(bytes);
    }, interval);
  }

  /** Stop the demo stream. */
  stop(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  /** Reset all state. */
  reset(gradeAGraph?: number[]): void {
    this.stop();
    this.mso = new MultiScaleObserver(gradeAGraph);
    this.frame = 0;
    this.totalBytes = 0;
    this.recentBytes = [];
    this.startTime = Date.now();
    this.opCounter = 0;
    // Reset module op lists
    for (const mod of STREAM_MODULES) mod.ops = [];
    // Emit empty snapshot
    this.emit(this.snapshot());
  }

  /** Whether currently streaming. */
  get isStreaming(): boolean {
    return this.timerId !== null;
  }

  // ── Private ───────────────────────────────────────────────────────────

  private emit(snapshot: StreamSnapshot): void {
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
