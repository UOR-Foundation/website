/**
 * Sovereign Spaces — Sync Transport Abstraction
 * ═════════════════════════════════════════════════════════════════
 *
 * Multi-transport sync following Anytype's hybrid model:
 *   1. BroadcastChannel — same-origin tab sync (browser)
 *   2. Cloud Relay — authenticated cross-device sync
 *   3. Tauri mDNS — LAN direct sync (scaffolded, requires native)
 *
 * All transports implement the same SyncTransport interface.
 * runtime.ts determines which to activate.
 */

import { isLocal } from "@/lib/runtime";
import type { SyncTransport, ChangeEnvelope } from "../types";
import { pullChanges } from "./change-dag";

// ── BroadcastChannel Transport ─────────────────────────────────────────────

const CHANNEL_PREFIX = "uor:space:sync:";

export class BroadcastTransport implements SyncTransport {
  readonly type = "broadcast-channel" as const;
  private channels = new Map<string, BroadcastChannel>();
  private callbacks: Array<(peerId: string, spaceId: string, headCid: string) => void> = [];
  private deviceId: string;

  constructor(deviceId: string) {
    this.deviceId = deviceId;
  }

  announce(spaceId: string, headCid: string): void {
    const ch = this.getChannel(spaceId);
    ch.postMessage({
      type: "head-update",
      peerId: this.deviceId,
      spaceId,
      headCid,
    });
  }

  onHeadUpdate(cb: (peerId: string, spaceId: string, headCid: string) => void): () => void {
    this.callbacks.push(cb);
    return () => { this.callbacks = this.callbacks.filter(c => c !== cb); };
  }

  async requestChanges(_peerId: string, sinceCids: string[]): Promise<ChangeEnvelope[]> {
    // BroadcastChannel can't transfer large payloads efficiently
    // Fall back to cloud pull for actual change data
    return [];
  }

  destroy(): void {
    for (const ch of this.channels.values()) ch.close();
    this.channels.clear();
    this.callbacks = [];
  }

  private getChannel(spaceId: string): BroadcastChannel {
    if (!this.channels.has(spaceId)) {
      const ch = new BroadcastChannel(`${CHANNEL_PREFIX}${spaceId}`);
      ch.onmessage = (ev) => {
        const { type, peerId, spaceId: sid, headCid } = ev.data ?? {};
        if (type === "head-update" && peerId !== this.deviceId) {
          this.callbacks.forEach(cb => cb(peerId, sid, headCid));
        }
      };
      this.channels.set(spaceId, ch);
    }
    return this.channels.get(spaceId)!;
  }
}

// ── Cloud Relay Transport ──────────────────────────────────────────────────

export class CloudRelayTransport implements SyncTransport {
  readonly type = "cloud-relay" as const;
  private callbacks: Array<(peerId: string, spaceId: string, headCid: string) => void> = [];
  private deviceId: string;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor(deviceId: string) {
    this.deviceId = deviceId;
  }

  announce(spaceId: string, headCid: string): void {
    // Head announcement is handled by change-dag.ts announceHead()
    // This is a no-op since cloud relay uses DB polling
  }

  onHeadUpdate(cb: (peerId: string, spaceId: string, headCid: string) => void): () => void {
    this.callbacks.push(cb);
    return () => { this.callbacks = this.callbacks.filter(c => c !== cb); };
  }

  async requestChanges(_peerId: string, sinceCids: string[]): Promise<ChangeEnvelope[]> {
    // Cloud relay uses direct DB query via change-dag pullChanges
    return [];
  }

  destroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.callbacks = [];
  }
}

// ── Tauri mDNS Transport (Scaffolded) ──────────────────────────────────────

export class TauriMdnsTransport implements SyncTransport {
  readonly type = "tauri-mdns" as const;
  private callbacks: Array<(peerId: string, spaceId: string, headCid: string) => void> = [];

  announce(_spaceId: string, _headCid: string): void {
    // TODO: Implement via Tauri IPC → Rust mDNS broadcast
    console.debug("[TauriMdns] announce() — not yet implemented");
  }

  onHeadUpdate(cb: (peerId: string, spaceId: string, headCid: string) => void): () => void {
    this.callbacks.push(cb);
    return () => { this.callbacks = this.callbacks.filter(c => c !== cb); };
  }

  async requestChanges(): Promise<ChangeEnvelope[]> {
    // TODO: Implement via Tauri IPC → TCP direct
    return [];
  }

  destroy(): void {
    this.callbacks = [];
  }
}

// ── Transport Factory ──────────────────────────────────────────────────────

/**
 * Create the appropriate sync transports based on runtime environment.
 * Browser: BroadcastChannel + Cloud Relay
 * Tauri: BroadcastChannel + Cloud Relay + mDNS
 */
export function createTransports(deviceId: string): SyncTransport[] {
  const transports: SyncTransport[] = [
    new BroadcastTransport(deviceId),
    new CloudRelayTransport(deviceId),
  ];

  if (isLocal()) {
    transports.push(new TauriMdnsTransport());
  }

  return transports;
}
