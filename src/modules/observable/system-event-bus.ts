/**
 * System Event Bus — Self-Reflective Observation Backbone
 * ═══════════════════════════════════════════════════════
 *
 * A singleton event emitter that allows core modules (ring, identity,
 * hologram) to emit operation events as raw byte signals. The
 * StreamProjection engine subscribes to these events, turning real
 * system computations into a live byte stream for coherence monitoring.
 *
 * The system watches itself through the same observation framework
 * it uses for everything else.
 *
 * Architecture:
 *   UORRing.neg(x)          → emit("ring", inputBytes, outputBytes)
 *   singleProofHash(obj)    → emit("identity", canonicalBytes, hashBytes)
 *   project(source, target) → emit("hologram", hashBytes, projectionBytes)
 *                                    ↓
 *                            StreamProjection.ingest(combined)
 *
 * @module observable/system-event-bus
 */

// ── Types ───────────────────────────────────────────────────────────────────

export type SystemEventSource = "ring" | "identity" | "hologram" | "certificate" | "sovereignty";

export interface SystemEvent {
  /** Which subsystem produced this event. */
  readonly source: SystemEventSource;
  /** Human-readable operation label (e.g. "neg", "singleProofHash", "project:did"). */
  readonly operation: string;
  /** Raw input bytes of the operation. */
  readonly inputBytes: Uint8Array;
  /** Raw output bytes of the operation. */
  readonly outputBytes: Uint8Array;
  /** Timestamp. */
  readonly timestamp: number;
}

export type SystemEventListener = (event: SystemEvent) => void;

// ── Singleton Bus ───────────────────────────────────────────────────────────

class SystemEventBusImpl {
  private listeners = new Set<SystemEventListener>();
  private enabled = true;
  private eventCount = 0;

  /** Subscribe to all system events. Returns unsubscribe function. */
  subscribe(listener: SystemEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Emit a system event to all listeners. */
  emit(
    source: SystemEventSource,
    operation: string,
    inputBytes: Uint8Array,
    outputBytes: Uint8Array,
  ): void {
    if (!this.enabled || this.listeners.size === 0) return;

    this.eventCount++;
    const event: SystemEvent = {
      source,
      operation,
      inputBytes,
      outputBytes,
      timestamp: Date.now(),
    };

    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Never let a listener crash the emitting module
      }
    }
  }

  /** Pause event emission (useful during bulk operations). */
  pause(): void { this.enabled = false; }

  /** Resume event emission. */
  resume(): void { this.enabled = true; }

  /** Total events emitted since creation. */
  get totalEvents(): number { return this.eventCount; }

  /** Number of active listeners. */
  get listenerCount(): number { return this.listeners.size; }
}

/** The singleton system event bus. */
export const SystemEventBus = new SystemEventBusImpl();
