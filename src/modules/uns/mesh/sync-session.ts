/**
 * UNS Mesh — Sync Session Manager
 * ═════════════════════════════════════════════════════════════════
 *
 * Manages the lifecycle of a sync session between two devices:
 *   1. Handshake: HELLO exchange → compare heads → identify divergence
 *   2. Reconciliation: WANT/HAVE exchange → fetch missing changes
 *   3. Commit: Apply deduped changes → compute new head → broadcast HEAD
 *   4. Backpressure: MAX_CHANGES_PER_HAVE per batch, cursor-based pagination
 *   5. Resume: Sessions are stateless — interrupted syncs restart from heads
 *
 * @module uns/mesh/sync-session
 * @layer 3
 */

import type { ChangeEnvelope } from "@/modules/sovereign-spaces/types";
import {
  mergeChanges,
  computeHead,
  getLocalHead,
} from "@/modules/sovereign-spaces/sync/change-dag";
import { applyWithDedup, type DedupResult } from "./triple-dedup";
import {
  type MeshMessage,
  type HelloMessage,
  type WantMessage,
  type HaveMessage,
  type HeadMessage,
  type DeviceClass,
  MAX_CHANGES_PER_HAVE,
  receiveLamport,
  markSeen,
  createWant,
  createHave,
  createHead,
  createAck,
  MESH_PROTOCOL_VERSION,
} from "./sync-protocol";

// ── Session State ───────────────────────────────────────────────────────────

export type SessionPhase = "idle" | "handshake" | "reconciling" | "committing" | "done" | "error";

export interface SyncSessionState {
  sessionId: string;
  peerId: string;
  peerNodeId: string;
  peerDeviceClass: DeviceClass;
  spaceId: string;
  phase: SessionPhase;
  /** Changes received from peer */
  received: ChangeEnvelope[];
  /** Changes sent to peer */
  sent: number;
  /** Dedup result from last commit */
  lastDedup?: DedupResult;
  /** Error message if phase is 'error' */
  error?: string;
  startedAt: number;
  completedAt?: number;
}

// ── Active Sessions ─────────────────────────────────────────────────────────

const activeSessions = new Map<string, SyncSessionState>();
let sessionListeners: Array<(sessions: SyncSessionState[]) => void> = [];

function emitSessionUpdate() {
  const list = [...activeSessions.values()];
  sessionListeners.forEach(fn => fn(list));
}

function sessionKey(peerId: string, spaceId: string): string {
  return `${peerId}:${spaceId}`;
}

// ── Public API ──────────────────────────────────────────────────────────────

export const syncSessionManager = {
  /**
   * Get all active sync sessions.
   */
  getActiveSessions(): SyncSessionState[] {
    return [...activeSessions.values()];
  },

  /**
   * Subscribe to session state changes.
   */
  subscribe(fn: (sessions: SyncSessionState[]) => void): () => void {
    sessionListeners.push(fn);
    return () => { sessionListeners = sessionListeners.filter(l => l !== fn); };
  },

  /**
   * Handle an incoming HELLO message.
   * Compares heads and determines if we need to sync.
   * Returns WANT messages for spaces where heads diverge.
   */
  async handleHello(
    msg: HelloMessage,
    localDeviceId: string,
    localNodeId: string,
    localHeads: Record<string, string>,
  ): Promise<WantMessage[]> {
    if (msg.protocolVersion !== MESH_PROTOCOL_VERSION) {
      console.warn(`[MeshSync] Protocol version mismatch: ${msg.protocolVersion} vs ${MESH_PROTOCOL_VERSION}`);
      return [];
    }

    receiveLamport(msg.lamport);
    const wants: WantMessage[] = [];

    for (const [spaceId, remoteHead] of Object.entries(msg.heads)) {
      const localHead = localHeads[spaceId] ?? getLocalHead(spaceId);

      // If heads match, nothing to sync
      if (localHead === remoteHead) continue;

      // Heads diverge — create a sync session and request changes
      const key = sessionKey(msg.senderId, spaceId);
      const session: SyncSessionState = {
        sessionId: key,
        peerId: msg.senderId,
        peerNodeId: msg.senderNodeId,
        peerDeviceClass: msg.deviceClass,
        spaceId,
        phase: "reconciling",
        received: [],
        sent: 0,
        startedAt: Date.now(),
      };
      activeSessions.set(key, session);
      emitSessionUpdate();

      const knownCids = localHead ? [localHead] : [];
      const want = await createWant(localDeviceId, localNodeId, spaceId, knownCids);
      wants.push(want);
    }

    return wants;
  },

  /**
   * Handle an incoming WANT message.
   * Returns a HAVE message with changes the peer is missing.
   */
  async handleWant(
    msg: WantMessage,
    localDeviceId: string,
    localNodeId: string,
    localChanges: ChangeEnvelope[],
  ): Promise<HaveMessage> {
    receiveLamport(msg.lamport);

    const knownSet = new Set(msg.knownCids);
    const missing = localChanges.filter(c => !knownSet.has(c.changeCid));

    // Paginate
    const batch = missing.slice(0, msg.limit || MAX_CHANGES_PER_HAVE);
    const hasMore = missing.length > batch.length;
    const cursor = hasMore ? batch[batch.length - 1]?.changeCid : undefined;

    // Update session stats
    const key = sessionKey(msg.senderId, msg.spaceId);
    const session = activeSessions.get(key);
    if (session) {
      session.sent += batch.length;
      emitSessionUpdate();
    }

    return createHave(localDeviceId, localNodeId, msg.spaceId, batch, hasMore, cursor);
  },

  /**
   * Handle an incoming HAVE message.
   * Applies received changes with deduplication and computes new head.
   */
  async handleHave(
    msg: HaveMessage,
    localDeviceId: string,
    localNodeId: string,
    graphIri: string,
  ): Promise<{
    head?: HeadMessage;
    dedupResult: DedupResult;
    needsMore: boolean;
    cursor?: string;
  }> {
    receiveLamport(msg.lamport);

    const key = sessionKey(msg.senderId, msg.spaceId);
    const session = activeSessions.get(key);

    if (session) {
      session.received.push(...msg.changes);
      session.phase = "committing";
      emitSessionUpdate();
    }

    // Merge with local changes
    const merged = mergeChanges([], msg.changes);

    // Apply with content-addressed deduplication
    const dedupResult = await applyWithDedup(merged, graphIri);

    // Compute new head
    const newHead = computeHead(merged);

    if (session) {
      session.lastDedup = dedupResult;
      session.phase = msg.hasMore ? "reconciling" : "done";
      if (!msg.hasMore) session.completedAt = Date.now();
      emitSessionUpdate();
    }

    let head: HeadMessage | undefined;
    if (newHead && !msg.hasMore) {
      head = await createHead(
        localDeviceId, localNodeId, msg.spaceId,
        newHead, dedupResult.applied.length,
      );
    }

    return {
      head,
      dedupResult,
      needsMore: msg.hasMore,
      cursor: msg.cursor,
    };
  },

  /**
   * Handle an incoming HEAD broadcast.
   * If our head differs, we need to initiate sync.
   */
  handleHead(
    msg: HeadMessage,
    localHeads: Record<string, string>,
  ): { needsSync: boolean; spaceId: string } {
    receiveLamport(msg.lamport);
    const localHead = localHeads[msg.spaceId] ?? getLocalHead(msg.spaceId);
    return {
      needsSync: localHead !== msg.headCid,
      spaceId: msg.spaceId,
    };
  },

  /**
   * Process any incoming mesh message with dedup and routing.
   */
  async processMessage(
    msg: MeshMessage,
    localDeviceId: string,
    localNodeId: string,
    localHeads: Record<string, string>,
    localChanges: ChangeEnvelope[],
    graphIri: string,
  ): Promise<MeshMessage[]> {
    // Dedup at receiver
    if (markSeen(msg.messageCid)) return [];

    // Don't process our own messages
    if (msg.senderId === localDeviceId) return [];

    const responses: MeshMessage[] = [];

    switch (msg.type) {
      case "HELLO": {
        const wants = await this.handleHello(msg, localDeviceId, localNodeId, localHeads);
        responses.push(...wants);
        break;
      }
      case "WANT": {
        const have = await this.handleWant(msg, localDeviceId, localNodeId, localChanges);
        responses.push(have);
        break;
      }
      case "HAVE": {
        const result = await this.handleHave(msg, localDeviceId, localNodeId, graphIri);
        if (result.head) responses.push(result.head);
        // Send ACK
        const ack = await createAck(
          localDeviceId, localNodeId, msg.spaceId,
          msg.messageCid, result.dedupResult.applied.length,
        );
        responses.push(ack);
        break;
      }
      case "HEAD": {
        const { needsSync, spaceId } = this.handleHead(msg, localHeads);
        if (needsSync) {
          const want = await createWant(localDeviceId, localNodeId, spaceId, [
            localHeads[spaceId] ?? "",
          ].filter(Boolean));
          responses.push(want);
        }
        break;
      }
      case "ACK":
        receiveLamport(msg.lamport);
        break;
    }

    return responses;
  },

  /**
   * Clean up completed sessions older than maxAge.
   */
  pruneCompletedSessions(maxAgeMs: number = 60_000): number {
    const now = Date.now();
    let pruned = 0;
    for (const [key, session] of activeSessions) {
      if (
        (session.phase === "done" || session.phase === "error") &&
        session.completedAt &&
        now - session.completedAt > maxAgeMs
      ) {
        activeSessions.delete(key);
        pruned++;
      }
    }
    if (pruned > 0) emitSessionUpdate();
    return pruned;
  },

  /**
   * Get sync statistics.
   */
  getStats(): {
    activeSessions: number;
    totalReceived: number;
    totalSent: number;
    totalConflictsResolved: number;
  } {
    let totalReceived = 0;
    let totalSent = 0;
    let totalConflictsResolved = 0;
    for (const session of activeSessions.values()) {
      totalReceived += session.received.length;
      totalSent += session.sent;
      totalConflictsResolved += session.lastDedup?.conflictsResolved ?? 0;
    }
    return { activeSessions: activeSessions.size, totalReceived, totalSent, totalConflictsResolved };
  },
};
