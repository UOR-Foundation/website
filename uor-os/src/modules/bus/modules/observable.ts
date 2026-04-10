/**
 * Service Mesh — Observable Module.
 * @ontology uor:ServiceMesh
 * Layer 1 — local. Event emission and subscription within the bus.
 *
 * Powered by @okikio/observables — TC39-aligned Observable with
 * deterministic teardown and typed operators.
 *
 * @version 2.0.0
 */
import { register } from "../registry";
import { Observable } from "@okikio/observables";

// ── Per-channel state ──────────────────────────────────────────────────────

interface ChannelState {
  listeners: Set<(data: unknown) => void>;
  snapshot: unknown;
}

const _channels = new Map<string, ChannelState>();

function getChannel(name: string): ChannelState {
  if (!_channels.has(name)) {
    _channels.set(name, { listeners: new Set(), snapshot: undefined });
  }
  return _channels.get(name)!;
}

// ── Bus registration ────────────────────────────────────────────────────────

register({
  ns: "observable",
  label: "Observable",
  layer: 1,
  operations: {
    emit: {
      handler: async (params: any) => {
        const channel = params?.channel ?? "default";
        const data = params?.data ?? params;
        const ch = getChannel(channel);
        ch.snapshot = data;
        for (const fn of ch.listeners) {
          try { fn(data); } catch { /* never crash emitter */ }
        }
        return { channel, listenerCount: ch.listeners.size, emitted: true };
      },
      description: "Emit an event on a named channel",
    },
    subscribe: {
      handler: async (params: any) => {
        const channel = params?.channel ?? "default";
        getChannel(channel); // ensure channel exists
        return { channel, subscribed: true, currentSnapshot: getChannel(channel).snapshot ?? null };
      },
      description: "Subscribe to events on a named channel",
    },
    snapshot: {
      handler: async (params: any) => {
        const channel = params?.channel;
        if (channel) {
          return { channel, data: getChannel(channel).snapshot ?? null };
        }
        const all: Record<string, unknown> = {};
        _channels.forEach((ch, k) => { all[k] = ch.snapshot; });
        return { channels: [..._channels.keys()], snapshots: all };
      },
      description: "Get a snapshot of current observable state",
    },
  },
});

// ── TC39-aligned Observable API ─────────────────────────────────────────────

/**
 * Create a TC39 Observable for a named channel.
 * Hot observable — emits current snapshot on subscribe, then all future values.
 * Supports backpressure via AbortSignal (from the subscriber).
 */
export function observeChannel<T = unknown>(channel: string): Observable<T> {
  return new Observable<T>((subscriber) => {
    const ch = getChannel(channel);

    // Emit current snapshot if available
    if (ch.snapshot !== undefined) {
      subscriber.next(ch.snapshot as T);
    }

    // Subscribe to future emissions
    const handler = (data: unknown) => subscriber.next(data as T);
    ch.listeners.add(handler);

    // Deterministic teardown
    return () => {
      ch.listeners.delete(handler);
    };
  });
}

/**
 * Direct JS API for subscribing (backward compatible).
 * Returns an unsubscribe function.
 */
export function subscribeChannel(channel: string, fn: (data: unknown) => void): () => void {
  const ch = getChannel(channel);
  ch.listeners.add(fn);
  return () => {
    ch.listeners.delete(fn);
  };
}

/**
 * Emit a value to a channel programmatically (outside bus.call).
 */
export function emitChannel(channel: string, data: unknown): void {
  const ch = getChannel(channel);
  ch.snapshot = data;
  for (const fn of ch.listeners) {
    try { fn(data); } catch { /* never crash emitter */ }
  }
}
