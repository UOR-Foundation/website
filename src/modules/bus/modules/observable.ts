/**
 * Sovereign Bus — Observable Module.
 * Layer 1 — local. Event emission and subscription within the bus.
 * @version 1.0.0
 */
import { register } from "../registry";

// In-memory event store (per-session)
const _listeners = new Map<string, Array<(data: unknown) => void>>();
const _snapshots = new Map<string, unknown>();

register({
  ns: "observable",
  label: "Observable",
  layer: 1,
  operations: {
    emit: {
      handler: async (params: any) => {
        const channel = params?.channel ?? "default";
        const data = params?.data ?? params;
        _snapshots.set(channel, data);
        const listeners = _listeners.get(channel) ?? [];
        listeners.forEach((fn) => { try { fn(data); } catch {} });
        return { channel, listenerCount: listeners.length, emitted: true };
      },
      description: "Emit an event on a named channel",
    },
    subscribe: {
      handler: async (params: any) => {
        const channel = params?.channel ?? "default";
        // Note: actual subscriptions are managed in-process.
        // This handler registers intent; real callbacks use the JS API directly.
        if (!_listeners.has(channel)) _listeners.set(channel, []);
        return { channel, subscribed: true, currentSnapshot: _snapshots.get(channel) ?? null };
      },
      description: "Subscribe to events on a named channel",
    },
    snapshot: {
      handler: async (params: any) => {
        const channel = params?.channel;
        if (channel) return { channel, data: _snapshots.get(channel) ?? null };
        // Return all snapshots
        const all: Record<string, unknown> = {};
        _snapshots.forEach((v, k) => { all[k] = v; });
        return { channels: Object.keys(all), snapshots: all };
      },
      description: "Get a snapshot of current observable state",
    },
  },
});

/** Direct JS API for subscribing (not through bus.call) */
export function subscribeChannel(channel: string, fn: (data: unknown) => void): () => void {
  if (!_listeners.has(channel)) _listeners.set(channel, []);
  _listeners.get(channel)!.push(fn);
  return () => {
    const arr = _listeners.get(channel);
    if (arr) {
      const idx = arr.indexOf(fn);
      if (idx >= 0) arr.splice(idx, 1);
    }
  };
}
