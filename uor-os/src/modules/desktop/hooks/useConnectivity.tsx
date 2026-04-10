/**
 * useConnectivity — Centralized connectivity context.
 * Tracks online/offline status and computes per-feature availability.
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { syncBridge, type SyncState } from "@/modules/knowledge-graph";

export type FeatureId = "oracle" | "kgSync" | "dataBank" | "webBridge" | "voice" | "auth";

export interface FeatureStatus {
  available: boolean;
  offlineReason: string;
  /** True when the feature works locally but cloud sync is pending */
  localOnly?: boolean;
}

export interface ConnectivityState {
  online: boolean;
  syncState: SyncState;
  features: Record<FeatureId, FeatureStatus>;
  lastSyncedAt: number | null;
  pendingSync: boolean;
}

const FEATURE_DEFS: Record<FeatureId, { offlineReason: string; localOnly?: boolean; requiresOnline: boolean }> = {
  oracle:    { offlineReason: "Requires internet for AI responses", requiresOnline: true },
  kgSync:    { offlineReason: "Graph syncs when back online", requiresOnline: true, localOnly: true },
  dataBank:  { offlineReason: "Data saved locally, syncs when online", requiresOnline: false, localOnly: true },
  webBridge: { offlineReason: "URL ingestion requires internet", requiresOnline: true },
  voice:     { offlineReason: "Voice model may need initial download", requiresOnline: false },
  auth:      { offlineReason: "Sign-in requires internet", requiresOnline: true },
};

function computeFeatures(online: boolean): Record<FeatureId, FeatureStatus> {
  const result = {} as Record<FeatureId, FeatureStatus>;
  for (const [id, def] of Object.entries(FEATURE_DEFS) as [FeatureId, typeof FEATURE_DEFS[FeatureId]][]) {
    result[id] = {
      available: def.requiresOnline ? online : true,
      offlineReason: def.offlineReason,
      localOnly: !online && def.localOnly,
    };
  }
  return result;
}

const ConnectivityCtx = createContext<ConnectivityState | null>(null);

export function ConnectivityProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [syncState, setSyncState] = useState<SyncState>(syncBridge.getSyncState());
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    return syncBridge.subscribeSyncState((state) => {
      setSyncState(state);
      if (state === "synced") setLastSyncedAt(Date.now());
    });
  }, []);

  const features = computeFeatures(online);
  const pendingSync = syncState === "idle" && !online;

  const value: ConnectivityState = { online, syncState, features, lastSyncedAt, pendingSync };

  return <ConnectivityCtx.Provider value={value}>{children}</ConnectivityCtx.Provider>;
}

export function useConnectivity(): ConnectivityState {
  const ctx = useContext(ConnectivityCtx);
  if (!ctx) {
    // Fallback for components outside the provider
    return {
      online: typeof navigator !== "undefined" ? navigator.onLine : true,
      syncState: "idle",
      features: computeFeatures(typeof navigator !== "undefined" ? navigator.onLine : true),
      lastSyncedAt: null,
      pendingSync: false,
    };
  }
  return ctx;
}

export function isFeatureAvailable(state: ConnectivityState, featureId: FeatureId): boolean {
  return state.features[featureId]?.available ?? true;
}
