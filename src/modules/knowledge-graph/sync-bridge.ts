/**
 * UOR Knowledge Graph — Cloud Sync Bridge (v4: Fully Provider-Based).
 * ════════════════════════════════════════════════════════════════════
 *
 * Routes sync through the active persistence provider.
 * NO DIRECT SUPABASE IMPORTS — fully backend-agnostic.
 * Auth is resolved through the provider's getAuthContext().
 */

import { grafeoStore } from "./grafeo-store";
import { getProvider, initProvider } from "./persistence";
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

  async recordChange(payload: ChangePayload): Promise<void> {
    const space = spaceManager.getActiveSpace();
    if (!space) return;

    const deviceId = getDeviceId();

    // Resolve auth through provider — no direct backend imports
    let userId = "anonymous";
    try {
      const provider = getProvider();
      const auth = await provider.getAuthContext();
      if (auth?.isAuthenticated) userId = auth.userId;
    } catch { /* offline or provider unavailable */ }

    const envelope = await createChange(space.id, payload, deviceId, userId);

    if (navigator.onLine && userId !== "anonymous") {
      try {
        await pushChanges([envelope]);
        const head = envelope.changeCid;
        await announceHead(space.id, deviceId, head);
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

  // Initialize provider if needed
  await initProvider();
  const provider = getProvider();

  // Check auth through the provider — fully backend-agnostic
  const auth = await provider.getAuthContext();
  if (!auth?.isAuthenticated) return { pushed: 0, pulled: 0 };

  const space = spaceManager.getActiveSpace();
  if (!space || space.id === "local-personal") return { pushed: 0, pulled: 0 };

  emitSyncState("syncing");

  try {
    const deviceId = getDeviceId();
    const userId = auth.userId;

    // 1. Push pending changes via provider
    let pushed = 0;
    if (pendingChanges.length > 0) {
      const envelopes = await Promise.all(
        pendingChanges.map(p => createChange(space.id, p, deviceId, userId)),
      );
      pushed = await pushChanges(envelopes);
      if (pushed > 0) pendingChanges = [];
    }

    // 2. Pull remote snapshot and hydrate GrafeoDB
    let pulled = 0;
    const snapshot = await provider.pullSnapshot();
    if (snapshot) {
      pulled = await grafeoStore.loadNQuads(snapshot);
    }

    // 3. Update heads
    const localHead = getLocalHead(space.id);
    if (localHead) {
      await announceHead(space.id, deviceId, localHead);
      for (const t of transports) {
        t.announce(space.id, localHead);
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
