/**
 * Graph Projection Hook — useGraphProjection()
 * ═══════════════════════════════════════════════════════════════════
 *
 * Projects data from the Knowledge Graph into React state via SPARQL.
 * This is the canonical way for UI components to read from the graph,
 * replacing direct imports from src/data/*.
 *
 * Features:
 *   - Reactive: re-runs query when the graph changes
 *   - Fallback: returns static data while graph is loading
 *   - Type-safe: generic return type
 *
 * Usage:
 *   const { data, loading } = useGraphProjection<NavItem[]>({
 *     query: 'SELECT ?s ?label WHERE { ?s a <schema:SiteNavigationElement> . ?s rdfs:label ?label }',
 *     transform: (bindings) => bindings.map(b => ({ label: b["?label"], href: b["?href"] })),
 *     fallback: navItems,  // static import as fallback
 *   });
 *
 * @module knowledge-graph/hooks/useGraphProjection
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { grafeoStore, sparqlQuery, type SparqlBinding } from "../grafeo-store";

// ── Types ────────────────────────────────────────────────────────────────────

export interface GraphProjectionOptions<T> {
  /** SPARQL SELECT query to execute against the KG */
  readonly query: string;
  /** Transform SPARQL bindings into the desired shape */
  readonly transform: (bindings: SparqlBinding[]) => T;
  /** Static fallback data while graph is loading or if query fails */
  readonly fallback: T;
  /** Whether to skip execution (e.g., conditionally) */
  readonly skip?: boolean;
  /** Debounce interval for graph change subscriptions (ms, default: 300) */
  readonly debounceMs?: number;
}

export interface GraphProjectionResult<T> {
  /** The projected data (from graph or fallback) */
  readonly data: T;
  /** Whether the graph query is in progress */
  readonly loading: boolean;
  /** Whether data came from the graph (true) or fallback (false) */
  readonly fromGraph: boolean;
  /** Error message if query failed */
  readonly error: string | null;
  /** Re-execute the query manually */
  readonly refetch: () => void;
}

// ── Hook Implementation ──────────────────────────────────────────────────────

export function useGraphProjection<T>(
  options: GraphProjectionOptions<T>,
): GraphProjectionResult<T> {
  const { query, transform, fallback, skip = false, debounceMs = 300 } = options;

  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(!skip);
  const [fromGraph, setFromGraph] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const executeQuery = useCallback(async () => {
    if (skip) return;
    try {
      setLoading(true);
      const result = await sparqlQuery(query);
      if (Array.isArray(result) && result.length > 0) {
        const transformed = transform(result as SparqlBinding[]);
        setData(transformed);
        setFromGraph(true);
        setError(null);
      } else {
        // No results — use fallback
        setData(fallback);
        setFromGraph(false);
      }
    } catch (err) {
      console.warn("[useGraphProjection] Query failed, using fallback:", err);
      setData(fallback);
      setFromGraph(false);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [query, transform, fallback, skip]);

  // Initial fetch
  useEffect(() => {
    executeQuery();
  }, [executeQuery]);

  // Subscribe to graph changes with debounce
  useEffect(() => {
    if (skip) return;

    const unsub = grafeoStore.subscribe(() => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(executeQuery, debounceMs);
    });

    return () => {
      unsub();
      clearTimeout(timerRef.current);
    };
  }, [executeQuery, skip, debounceMs]);

  return { data, loading, fromGraph, error, refetch: executeQuery };
}
