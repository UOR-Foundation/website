/**
 * useKnowledgeGraph — React hook for the local-first UOR Knowledge Graph.
 *
 * Provides reactive access to graph state, semantic search,
 * reasoning operations, and JSON-LD export/import.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { localGraphStore, type KGNode, type KGEdge, type KGStats } from "../local-store";
import { syncBridge, type SyncState } from "../sync-bridge";
import {
  findSimilarNodes,
  deductiveQuery,
  inductiveQuery,
  abductiveQuery,
  compressGraph,
  verifyGraphCoherence,
  graphSummary,
} from "../graph-compute";

export interface KnowledgeGraphHandle {
  /** Graph statistics */
  stats: KGStats;
  /** Current sync state */
  syncState: SyncState;
  /** Whether graph is loading initial data */
  loading: boolean;
  /** Semantic search across graph nodes */
  search: (query: string, threshold?: number) => Promise<Array<{ node: KGNode; similarity: number }>>;
  /** BFS traversal from a node */
  traverse: (startAddr: string, depth?: number) => Promise<{ nodes: KGNode[]; edges: KGEdge[] }>;
  /** Deductive query (constraint-based) */
  queryDeductive: typeof deductiveQuery;
  /** Inductive query (similarity-based) */
  queryInductive: typeof inductiveQuery;
  /** Abductive query (gap detection) */
  queryAbductive: typeof abductiveQuery;
  /** Compress graph via canonicalization */
  compress: typeof compressGraph;
  /** Verify graph integrity */
  verify: typeof verifyGraphCoherence;
  /** Get full graph summary */
  summarize: typeof graphSummary;
  /** Export graph as JSON-LD */
  exportGraph: () => Promise<object>;
  /** Import graph from JSON-LD */
  importGraph: (doc: { "@graph"?: Array<Record<string, unknown>> }) => Promise<number>;
  /** Trigger cloud sync */
  sync: () => Promise<{ pushed: number; pulled: number }>;
}

export function useKnowledgeGraph(): KnowledgeGraphHandle {
  const [stats, setStats] = useState<KGStats>({
    nodeCount: 0, edgeCount: 0, derivationCount: 0, lastUpdated: 0,
  });
  const [syncState, setSyncState] = useState<SyncState>(syncBridge.getSyncState());
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  // Load initial stats
  useEffect(() => {
    mounted.current = true;
    localGraphStore.getStats().then((s) => {
      if (mounted.current) {
        setStats(s);
        setLoading(false);
      }
    });
    return () => { mounted.current = false; };
  }, []);

  // Subscribe to graph changes
  useEffect(() => {
    return localGraphStore.subscribe(() => {
      localGraphStore.getStats().then((s) => {
        if (mounted.current) setStats(s);
      });
    });
  }, []);

  // Subscribe to sync state
  useEffect(() => {
    return syncBridge.subscribeSyncState((state) => {
      if (mounted.current) setSyncState(state);
    });
  }, []);

  const search = useCallback(
    (query: string, threshold?: number) => findSimilarNodes(query, threshold),
    []
  );

  const traverse = useCallback(
    (startAddr: string, depth?: number) => localGraphStore.traverseBFS(startAddr, depth),
    []
  );

  const exportGraph = useCallback(() => localGraphStore.exportAsJsonLd(), []);
  const importGraph = useCallback(
    (doc: { "@graph"?: Array<Record<string, unknown>> }) => localGraphStore.importFromJsonLd(doc),
    []
  );
  const sync = useCallback(() => syncBridge.sync(), []);

  return {
    stats,
    syncState,
    loading,
    search,
    traverse,
    queryDeductive: deductiveQuery,
    queryInductive: inductiveQuery,
    queryAbductive: abductiveQuery,
    compress: compressGraph,
    verify: verifyGraphCoherence,
    summarize: graphSummary,
    exportGraph,
    importGraph,
    sync,
  };
}
