/**
 * Sovereign Compose — React Hooks.
 * ═════════════════════════════════════════════════════════════════
 *
 * React bindings for the orchestrator and per-app kernels.
 *
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { orchestrator } from "./orchestrator";
import type {
  OrchestratorState,
  AppInstance,
  OrchestratorMetrics,
  ComposeEvent,
} from "./types";

// ── useOrchestrator ───────────────────────────────────────────────────────

/**
 * Subscribe to the full orchestrator state.
 * Re-renders on every orchestrator event.
 */
export function useOrchestrator(): OrchestratorState {
  const [state, setState] = useState<OrchestratorState>(orchestrator.state());

  useEffect(() => {
    const unsub = orchestrator.on(() => {
      setState(orchestrator.state());
    });
    return unsub;
  }, []);

  return state;
}

// ── useOrchestratorMetrics ────────────────────────────────────────────────

/**
 * Subscribe to orchestrator metrics only.
 * Polls every `intervalMs` (default 2s) to avoid event-storm re-renders.
 */
export function useOrchestratorMetrics(intervalMs = 2000): OrchestratorMetrics {
  const [metrics, setMetrics] = useState<OrchestratorMetrics>(orchestrator.metrics());

  useEffect(() => {
    const timer = setInterval(() => {
      setMetrics(orchestrator.metrics());
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return metrics;
}

// ── useAppInstance ─────────────────────────────────────────────────────────

/**
 * Get the instance state for a specific app by name.
 */
export function useAppInstance(name: string): AppInstance | undefined {
  const [instance, setInstance] = useState<AppInstance | undefined>(
    orchestrator.getInstance(name),
  );

  useEffect(() => {
    const unsub = orchestrator.on((event: ComposeEvent) => {
      if (event.blueprintName === name) {
        setInstance(orchestrator.getInstance(name));
      }
    });
    return unsub;
  }, [name]);

  return instance;
}

// ── useAppKernel ──────────────────────────────────────────────────────────

/**
 * Get a scoped bus.call proxy for a specific app.
 * Returns a `call` function that routes through the app's kernel.
 */
export function useAppKernel(name: string) {
  const kernel = useMemo(() => orchestrator.getKernel(name), [name]);

  const call = useCallback(
    async <T = unknown>(method: string, params?: unknown): Promise<T> => {
      if (!kernel) throw new Error(`No kernel for app "${name}"`);
      return kernel.call<T>(method, params);
    },
    [kernel, name],
  );

  const canCall = useCallback(
    (method: string): boolean => {
      return kernel?.canCall(method) ?? false;
    },
    [kernel],
  );

  return { call, canCall, kernel };
}

// ── useComposeEvents ──────────────────────────────────────────────────────

/**
 * Subscribe to raw compose events (for logging, debugging, etc.).
 * Keeps a rolling buffer of the last `maxEvents` events.
 */
export function useComposeEvents(maxEvents = 50): ComposeEvent[] {
  const [events, setEvents] = useState<ComposeEvent[]>([]);

  useEffect(() => {
    const unsub = orchestrator.on((event: ComposeEvent) => {
      setEvents((prev) => {
        const next = [...prev, event];
        return next.length > maxEvents ? next.slice(-maxEvents) : next;
      });
    });
    return unsub;
  }, [maxEvents]);

  return events;
}
