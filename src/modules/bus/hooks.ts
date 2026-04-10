/**
 * Service Mesh — React Hooks for Layer 3.
 * @ontology uor:ServiceMesh
 * ═════════════════════════════════════════════════════════════════
 *
 * Canonical hooks for UI components to interact with the bus.
 * These enforce the Layer 3 → Bus → Layer 0/1/2 communication pattern.
 *
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { call, isReachable } from "./bus";
import type { SovereignResult } from "./types";

// ── useBusCall ────────────────────────────────────────────────────────────

export interface BusCallState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  elapsed: number;
  source: "local" | "remote" | null;
  refetch: () => void;
}

/**
 * React hook wrapping `bus.call()` with loading/error/data state.
 *
 * @example
 * const { data, loading, error } = useBusCall<MyResult>("kernel/derive", { content: "hello" });
 */
export function useBusCall<T = unknown>(
  method: string,
  params?: unknown,
  options?: { enabled?: boolean },
): BusCallState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [source, setSource] = useState<"local" | "remote" | null>(null);
  const paramsRef = useRef(params);
  const serializedParams = JSON.stringify(params);

  const enabled = options?.enabled !== false;

  const execute = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const result: SovereignResult<T> = await call<T>(method, paramsRef.current);
      setData(result.data);
      setElapsed(result.elapsed);
      setSource(result.source);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [method, serializedParams, enabled]);

  useEffect(() => {
    paramsRef.current = params;
  }, [serializedParams]);

  useEffect(() => {
    execute();
  }, [execute]);

  return { data, loading, error, elapsed, source, refetch: execute };
}

// ── useBusLazy ────────────────────────────────────────────────────────────

/**
 * Lazy variant — returns an execute function instead of auto-calling.
 *
 * @example
 * const [projectContent, { data, loading }] = useBusLazy<ProjectResult>("kernel/project");
 * // later: projectContent({ content: "hello" });
 */
export function useBusLazy<T = unknown>(
  method: string,
): [(params?: unknown) => Promise<SovereignResult<T>>, BusCallState<T>] {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [source, setSource] = useState<"local" | "remote" | null>(null);

  const execute = useCallback(
    async (params?: unknown): Promise<SovereignResult<T>> => {
      setLoading(true);
      setError(null);
      try {
        const result = await call<T>(method, params);
        setData(result.data);
        setElapsed(result.elapsed);
        setSource(result.source);
        return result;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        setData(null);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [method],
  );

  return [execute, { data, loading, error, elapsed, source, refetch: () => {} }];
}

// ── useBusReachable ───────────────────────────────────────────────────────

/**
 * Reactive reachability check for a bus method.
 * Re-checks on online/offline events.
 *
 * @example
 * const canResolve = useBusReachable("uns/resolve");
 */
export function useBusReachable(method: string): boolean {
  const [reachable, setReachable] = useState(() => isReachable(method));

  useEffect(() => {
    const check = () => setReachable(isReachable(method));
    check();
    window.addEventListener("online", check);
    window.addEventListener("offline", check);
    return () => {
      window.removeEventListener("online", check);
      window.removeEventListener("offline", check);
    };
  }, [method]);

  return reachable;
}
