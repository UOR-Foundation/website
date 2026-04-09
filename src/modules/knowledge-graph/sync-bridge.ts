/**
 * UOR Knowledge Graph — Cloud Sync Bridge.
 *
 * Synchronizes the local IndexedDB knowledge graph with the cloud
 * (uor_triples table) when authenticated and online.
 *
 * Conflict resolution via UOR address comparison:
 *  - Same address = identical content = skip (auto-merge)
 *  - Different address = genuine divergence = keep both
 *
 * Each device gets a named graph IRI for namespace isolation.
 */

import { supabase } from "@/integrations/supabase/client";
import { localGraphStore, type KGNode, type KGEdge } from "./local-store";

// ── Device Graph IRI ────────────────────────────────────────────────────────

function getDeviceGraphIri(): string {
  let deviceId = localStorage.getItem("uor:device-id");
  if (!deviceId) {
    deviceId = `device-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem("uor:device-id", deviceId);
  }
  return `urn:uor:device:${deviceId}`;
}

// ── Sync State ──────────────────────────────────────────────────────────────

export type SyncState = "idle" | "syncing" | "synced" | "error" | "offline";

let syncListeners: Array<(state: SyncState) => void> = [];
let currentSyncState: SyncState = navigator.onLine ? "idle" : "offline";

function emitSyncState(state: SyncState) {
  currentSyncState = state;
  syncListeners.forEach((fn) => fn(state));
}

// ── Online/Offline Detection ────────────────────────────────────────────────

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    emitSyncState("idle");
    // Auto-sync when coming online
    syncToCloud().catch(() => emitSyncState("error"));
  });
  window.addEventListener("offline", () => emitSyncState("offline"));
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

  /** True when there are local-only triples waiting for cloud push */
  hasPendingSync(): boolean {
    return !this.isOnline() && currentSyncState !== "synced";
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

  // Check auth
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { pushed: 0, pulled: 0 };

  emitSyncState("syncing");

  try {
    const pushed = await pushLocalToCloud();
    const pulled = await pullCloudToLocal();

    emitSyncState("synced");
    return { pushed, pulled };
  } catch (err) {
    console.error("[KG Sync] Error:", err);
    emitSyncState("error");
    return { pushed: 0, pulled: 0 };
  }
}

async function pushLocalToCloud(): Promise<number> {
  const graphIri = getDeviceGraphIri();

  // Get edges pending sync
  const pendingNodes = await localGraphStore.getNodesBySyncState("local");
  const allEdges = await localGraphStore.getAllEdges();
  const pendingEdges = allEdges.filter((e) => e.syncState === "local");

  if (pendingEdges.length === 0 && pendingNodes.length === 0) return 0;

  // Convert edges to uor_triples format
  const triples = pendingEdges.map((edge) => ({
    subject: edge.subject,
    predicate: edge.predicate,
    object: edge.object,
    graph_iri: graphIri,
  }));

  // Batch insert
  const BATCH = 100;
  let pushed = 0;
  for (let i = 0; i < triples.length; i += BATCH) {
    const batch = triples.slice(i, i + BATCH);
    const { error } = await supabase.from("uor_triples").insert(batch);
    if (error) {
      console.warn("[KG Sync] Push error:", error.message);
    } else {
      pushed += batch.length;
    }
  }

  // Mark synced
  const syncedEdges: KGEdge[] = pendingEdges.map((e) => ({
    ...e,
    syncState: "synced" as const,
  }));
  await localGraphStore.putEdges(syncedEdges);

  // Mark nodes synced
  const syncedNodes = pendingNodes.map((n) => ({
    ...n,
    syncState: "synced" as const,
  }));
  await localGraphStore.putNodes(syncedNodes);

  return pushed;
}

async function pullCloudToLocal(): Promise<number> {
  const graphIri = getDeviceGraphIri();

  // Pull triples NOT from this device
  const { data, error } = await supabase
    .from("uor_triples")
    .select("subject, predicate, object, graph_iri")
    .neq("graph_iri", graphIri)
    .limit(1000);

  if (error || !data) return 0;

  const now = Date.now();
  let pulled = 0;

  const edges: KGEdge[] = [];
  for (const triple of data) {
    const id = `${triple.subject}|${triple.predicate}|${triple.object}`;
    const existing = await localGraphStore.getEdge(id);
    if (existing) continue; // Already have it

    edges.push({
      id,
      subject: triple.subject,
      predicate: triple.predicate,
      object: triple.object,
      graphIri: triple.graph_iri,
      createdAt: now,
      syncState: "synced",
    });
    pulled++;
  }

  if (edges.length > 0) {
    await localGraphStore.putEdges(edges);
  }

  return pulled;
}
