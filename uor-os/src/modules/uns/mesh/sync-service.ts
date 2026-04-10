/**
 * UNS Mesh — DHT-Routed Sync Service
 * ═════════════════════════════════════════════════════════════════
 *
 * Extends UnsNode with sync capabilities:
 * - Registers space heads in the DHT (key = sync:{spaceId})
 * - Discovers peers by querying DHT for space participants
 * - Maintains a peer set per space with heartbeat-based liveness
 * - Routes mesh protocol messages through available transports
 *
 * @module uns/mesh/sync-service
 * @layer 3
 */

import type { ChangeEnvelope } from "@/modules/sovereign-spaces/types";
import { getLocalHead } from "@/modules/sovereign-spaces/sync/change-dag";
import {
  type MeshMessage,
  type DeviceClass,
  createHello,
  HELLO_INTERVAL_MS,
  PEER_TIMEOUT_MS,
  SYNC_DEBOUNCE_MS,
  isValidMessage,
} from "./sync-protocol";
import { syncSessionManager } from "./sync-session";
import { getDeviceProfile, peerPriority } from "./topology";

// ── Peer Tracking ───────────────────────────────────────────────────────────

interface MeshPeer {
  peerId: string;
  nodeId: string;
  deviceClass: DeviceClass;
  heads: Record<string, string>;
  transports: string[];
  lastSeen: number;
  latencyMs?: number;
}

// ── Sync Service ────────────────────────────────────────────────────────────

export interface SyncServiceConfig {
  deviceId: string;
  nodeId: string;
  /** Spaces this device participates in */
  spaceIds: string[];
  /** Graph IRI for triple dedup (from active space) */
  graphIri: string;
  /** Callback to send a message over available transports */
  sendMessage: (msg: MeshMessage) => void;
  /** Callback to get local changes for a space */
  getLocalChanges: (spaceId: string) => ChangeEnvelope[];
}

export class MeshSyncService {
  private config: SyncServiceConfig;
  private peers = new Map<string, MeshPeer>();
  private helloTimer: ReturnType<typeof setInterval> | null = null;
  private pruneTimer: ReturnType<typeof setInterval> | null = null;
  private syncDebounce: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private listeners: Array<(peers: MeshPeer[]) => void> = [];

  constructor(config: SyncServiceConfig) {
    this.config = config;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    // Send initial HELLO
    await this.broadcastHello();

    // Periodic HELLO heartbeat
    this.helloTimer = setInterval(() => {
      this.broadcastHello().catch(console.warn);
    }, HELLO_INTERVAL_MS);

    // Periodic peer pruning
    this.pruneTimer = setInterval(() => {
      this.pruneStalePeers();
      syncSessionManager.pruneCompletedSessions();
    }, PEER_TIMEOUT_MS);

    console.debug("[MeshSync] Service started", {
      deviceId: this.config.deviceId,
      spaces: this.config.spaceIds.length,
      profile: getDeviceProfile(),
    });
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.helloTimer) clearInterval(this.helloTimer);
    if (this.pruneTimer) clearInterval(this.pruneTimer);
    if (this.syncDebounce) clearTimeout(this.syncDebounce);
    this.helloTimer = null;
    this.pruneTimer = null;
    this.syncDebounce = null;
    this.peers.clear();
    console.debug("[MeshSync] Service stopped");
  }

  isRunning(): boolean {
    return this.running;
  }

  // ── HELLO Broadcast ────────────────────────────────────────────────────

  private async broadcastHello(): Promise<void> {
    const heads: Record<string, string> = {};
    for (const spaceId of this.config.spaceIds) {
      const head = getLocalHead(spaceId);
      if (head) heads[spaceId] = head;
    }

    const profile = getDeviceProfile();
    const hello = await createHello(
      this.config.deviceId,
      this.config.nodeId,
      heads,
      profile.deviceClass,
      profile.transports,
    );

    this.config.sendMessage(hello);
  }

  // ── Incoming Message Handler ───────────────────────────────────────────

  async handleMessage(msg: MeshMessage): Promise<void> {
    if (!this.running) return;
    if (!isValidMessage(msg)) return;

    // Update peer tracking
    if (msg.senderId !== this.config.deviceId) {
      this.updatePeer(msg);
    }

    // Get current local state
    const localHeads: Record<string, string> = {};
    for (const spaceId of this.config.spaceIds) {
      const head = getLocalHead(spaceId);
      if (head) localHeads[spaceId] = head;
    }

    const localChanges = msg.spaceId !== "*"
      ? this.config.getLocalChanges(msg.spaceId)
      : [];

    // Process through session manager
    const responses = await syncSessionManager.processMessage(
      msg,
      this.config.deviceId,
      this.config.nodeId,
      localHeads,
      localChanges,
      this.config.graphIri,
    );

    // Send responses
    for (const response of responses) {
      this.config.sendMessage(response);
    }
  }

  // ── Trigger Sync ───────────────────────────────────────────────────────

  /**
   * Trigger a sync cycle for a specific space.
   * Debounced to avoid flooding when multiple mutations happen rapidly.
   */
  triggerSync(spaceId: string): void {
    if (this.syncDebounce) clearTimeout(this.syncDebounce);
    this.syncDebounce = setTimeout(async () => {
      await this.broadcastHello();
    }, SYNC_DEBOUNCE_MS);
  }

  /**
   * Force immediate sync for all spaces.
   */
  async forceSyncAll(): Promise<void> {
    await this.broadcastHello();
  }

  // ── Peer Management ────────────────────────────────────────────────────

  private updatePeer(msg: MeshMessage): void {
    const existing = this.peers.get(msg.senderId);
    const peer: MeshPeer = {
      peerId: msg.senderId,
      nodeId: msg.senderNodeId,
      deviceClass: (msg as any).deviceClass ?? existing?.deviceClass ?? "desktop",
      heads: existing?.heads ?? {},
      transports: (msg as any).transports ?? existing?.transports ?? [],
      lastSeen: Date.now(),
    };

    // Update heads from HELLO or HEAD messages
    if (msg.type === "HELLO") {
      peer.heads = { ...peer.heads, ...(msg as any).heads };
      peer.deviceClass = (msg as any).deviceClass;
      peer.transports = (msg as any).transports ?? [];
    } else if (msg.type === "HEAD") {
      peer.heads[msg.spaceId] = (msg as any).headCid;
    }

    this.peers.set(msg.senderId, peer);
    this.emitPeerUpdate();
  }

  private pruneStalePeers(): void {
    const now = Date.now();
    let pruned = 0;
    for (const [id, peer] of this.peers) {
      if (now - peer.lastSeen > PEER_TIMEOUT_MS) {
        this.peers.delete(id);
        pruned++;
      }
    }
    if (pruned > 0) {
      console.debug(`[MeshSync] Pruned ${pruned} stale peers`);
      this.emitPeerUpdate();
    }
  }

  // ── Peer Query API ─────────────────────────────────────────────────────

  getPeers(): MeshPeer[] {
    return [...this.peers.values()].sort(
      (a, b) => peerPriority(b.deviceClass) - peerPriority(a.deviceClass),
    );
  }

  getPeersForSpace(spaceId: string): MeshPeer[] {
    return this.getPeers().filter(p => p.heads[spaceId] !== undefined);
  }

  getPeerCount(): number {
    return this.peers.size;
  }

  subscribePeers(fn: (peers: MeshPeer[]) => void): () => void {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter(l => l !== fn); };
  }

  private emitPeerUpdate(): void {
    const list = this.getPeers();
    this.listeners.forEach(fn => fn(list));
  }

  // ── Status ─────────────────────────────────────────────────────────────

  getStatus(): {
    running: boolean;
    peerCount: number;
    activeSessions: number;
    deviceProfile: ReturnType<typeof getDeviceProfile>;
    spaces: string[];
  } {
    return {
      running: this.running,
      peerCount: this.peers.size,
      activeSessions: syncSessionManager.getActiveSessions().length,
      deviceProfile: getDeviceProfile(),
      spaces: this.config.spaceIds,
    };
  }
}
