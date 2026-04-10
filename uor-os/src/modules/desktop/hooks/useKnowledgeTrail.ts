/**
 * useKnowledgeTrail — Session-wide trail tracking for the knowledge graph.
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Tracks meaningful user actions across all apps and exposes them as
 * a unified trail. Feeds the KnowledgeSidebar and GraphContextBar.
 */

import { createContext, useContext, useCallback, useRef, useSyncExternalStore } from "react";

export interface TrailEntry {
  id: string;
  label: string;
  appId: string;
  uorAddress?: string;
  ts: number;
}

interface KnowledgeTrailStore {
  entries: TrailEntry[];
  push: (entry: Omit<TrailEntry, "ts">) => void;
  subscribe: (cb: () => void) => () => void;
  getSnapshot: () => TrailEntry[];
}

function createTrailStore(): KnowledgeTrailStore {
  let entries: TrailEntry[] = [];
  const listeners = new Set<() => void>();

  // Restore from sessionStorage
  try {
    const raw = sessionStorage.getItem("uor:knowledge-trail");
    if (raw) entries = JSON.parse(raw);
  } catch { /* ignore */ }

  const notify = () => {
    sessionStorage.setItem("uor:knowledge-trail", JSON.stringify(entries.slice(-50)));
    listeners.forEach(cb => cb());
  };

  return {
    get entries() { return entries; },
    push(entry) {
      // Deduplicate consecutive identical entries
      const last = entries[entries.length - 1];
      if (last?.id === entry.id && last?.appId === entry.appId) return;
      entries = [...entries, { ...entry, ts: Date.now() }];
      if (entries.length > 50) entries = entries.slice(-50);
      notify();
    },
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getSnapshot() { return entries; },
  };
}

// Singleton store
const trailStore = createTrailStore();

export const KnowledgeTrailContext = createContext(trailStore);

export function useKnowledgeTrail() {
  const store = useContext(KnowledgeTrailContext);

  const entries = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );

  const push = useCallback(
    (entry: Omit<TrailEntry, "ts">) => store.push(entry),
    [store],
  );

  return { entries, push };
}

export { trailStore };
