/**
 * UOR Knowledge Graph — Cloud Sync Bridge (v2: Change-DAG).
 *
 * Anytype-inspired sync: each mutation is a content-addressed change
 * envelope chained in a DAG. Sync = compare heads, exchange missing
 * changes, merge deterministically by CID.
 *
 * Replaces the naive push-all/pull-all model with space-scoped,
 * DAG-based synchronization.
 */

import { supabase } from "@/integrations/supabase/client";
import { spaceManager } from "@/modules/sovereign-spaces/space-manager";
import {
  createChange, pushChanges, pullChanges,
  announceHead, getLocalHead, mergeChanges, computeHead,
} from "@/modules/sovereign-spaces/sync/change-dag";
import { createTransports } from "@/modules/sovereign-spaces/sync/transport";
import type { ChangePayload, SyncTransport } from "@/modules/sovereign-spaces/types";

// ── Device ID ───────────────────────────────────────────────────────────────

function getDeviceId(): string {
  let deviceId = localStorage.getItem("uor:device-id");
  if (!deviceId) {
    deviceId = `device-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem("uor:device-id", deviceId);
  }
  return deviceId;
}

// ── Sync State ──────────────────────────────────────────────────────────────

export type SyncState = "idle" | "syncing" | "synced" | "error" | "offline";

let syncListeners: Array<(state: SyncState) => void> = [];
let currentSyncState: SyncState = navigator.onLine ? "idle" : "offline";
let transports: SyncTransport[] = [];
let pendingChanges: ChangePayload[] = [];

function emitSyncState(state: SyncState) {
  currentSyncState = state;
  syncListeners.forEach((fn) => fn(state));
}

// ── Online/Offline Detection ────────────────────────────────────────────────

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    emitSyncState("idle");
    syncToCloud().catch(() => emitSyncState("error"));
  });
  window.addEventListener("offline", () => emitSyncState("offline"));

  // Initialize transports
  transports = createTransports(getDeviceId());
}

// ── Public API ──────────────────────────────────────────────────────────────

export const syncBridge = {
  subscribeSyncState(fn: (state: SyncState) => void) {
    syncListeners.push(fn);
    return () => {
      syncListeners = syncListeners.filter((l) => l !== fn);
    };
  },

  getSyncState(): SyncState {
    return currentSyncState;
  },

  isOnline(): boolean {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  },

  hasPendingSync(): boolean {
    return pendingChanges.length > 0 || (!this.isOnline() && currentSyncState !== "synced");
  },

  /**
   * Record a local mutation. Wraps it in a change envelope
   * and queues for sync.
   */
  async recordChange(payload: ChangePayload): Promise<void> {
    const space = spaceManager.getActiveSpace();
    if (!space) return;

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? "anonymous";
    const deviceId = getDeviceId();

    const envelope = await createChange(space.id, payload, deviceId, userId);

    if (navigator.onLine && session) {
      try {
        await pushChanges([envelope]);
        const head = envelope.changeCid;
        await announceHead(space.id, deviceId, head);
        // Announce to local transports
        for (const t of transports) {
          t.announce(space.id, head);
        }
      } catch (err) {
        console.warn("[Sync] Push failed, queued for later:", err);
        pendingChanges.push(payload);
      }
    } else {
      pendingChanges.push(payload);
    }
  },

  async sync(): Promise<{ pushed: number; pulled: number }> {
    return syncToCloud();
  },
};

// ── Sync Implementation ─────────────────────────────────────────────────────

async function syncToCloud(): Promise<{ pushed: number; pulled: number }> {
  if (!navigator.onLine) {
    emitSyncState("offline");
    return { pushed: 0, pulled: 0 };
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { pushed: 0, pulled: 0 };

  const space = spaceManager.getActiveSpace();
  if (!space || space.id === "local-personal") return { pushed: 0, pulled: 0 };

  emitSyncState("syncing");

  try {
    const deviceId = getDeviceId();
    const userId = session.user.id;

    // 1. Push pending changes
    let pushed = 0;
    if (pendingChanges.length > 0) {
      const envelopes = await Promise.all(
        pendingChanges.map(p => createChange(space.id, p, deviceId, userId)),
      );
      pushed = await pushChanges(envelopes);
      if (pushed > 0) pendingChanges = [];
    }

    // 2. Pull remote changes
    const localHead = getLocalHead(space.id);
    const knownCids = new Set<string>();
    if (localHead) knownCids.add(localHead);

    const remoteChanges = await pullChanges(space.id, knownCids);
    const pulled = remoteChanges.length;

    // 3. Merge and update head
    if (pulled > 0) {
      const merged = mergeChanges([], remoteChanges);
      const newHead = computeHead(merged);
      if (newHead) {
        await announceHead(space.id, deviceId, newHead);
        for (const t of transports) {
          t.announce(space.id, newHead);
        }
      }
    }

    emitSyncState("synced");
    return { pushed, pulled };
  } catch (err) {
    console.error("[Sync] Error:", err);
    emitSyncState("error");
    return { pushed: 0, pulled: 0 };
  }
}
