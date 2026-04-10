/**
 * System Event Bus. Self-Reflective Observation Backbone
 * ═══════════════════════════════════════════════════════
 *
 * A singleton event emitter that allows core modules (ring, identity,
 * hologram) to emit operation events as raw byte signals. The
 * StreamProjection engine subscribes to these events, turning real
 * system computations into a live byte stream for coherence monitoring.
 *
 * Powered by @okikio/observables — TC39-aligned Observable with
 * deterministic teardown and typed operators.
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

import { Observable } from "@okikio/observables";

// ── Types ───────────────────────────────────────────────────────────────────

export type SystemEventSource = "ring" | "identity" | "hologram" | "certificate" | "sovereignty" | "container";

export interface SystemEvent {
  readonly source: SystemEventSource;
  readonly operation: string;
  readonly inputBytes: Uint8Array;
  readonly outputBytes: Uint8Array;
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

  /**
   * TC39-aligned Observable for system events.
   * Cold: each subscriber gets events from the moment of subscription.
   * Deterministic teardown via the returned Observable's unsubscribe.
   */
  observe(filter?: SystemEventSource): Observable<SystemEvent> {
    return new Observable<SystemEvent>((subscriber) => {
      const listener: SystemEventListener = (event) => {
        if (!filter || event.source === filter) {
          subscriber.next(event);
        }
      };
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    });
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
