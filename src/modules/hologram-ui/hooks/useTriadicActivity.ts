/**
 * useTriadicActivity — Kernel-projected sovereign creator balance
 * ═══════════════════════════════════════════════════════════════════
 *
 * Reads/writes triadic activity from KernelConfig registers.
 * No direct localStorage access — the kernel is the single source
 * of truth for Learn/Work/Play time tracking.
 *
 * @module hologram-ui/hooks/useTriadicActivity
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { TriadicBalance, TriadicPhase, CreatorStage } from "@/modules/hologram-ui/sovereign-creator";
import { getKernelProjector } from "@/modules/hologram-os/projection-engine";

const TICK_INTERVAL_MS = 15_000;
const CYCLE_THRESHOLD_S = 60;

export function useTriadicActivity() {
  const projector = getKernelProjector();
  const [state, setState] = useState(() => projector.getTriadicActivity());
  const activePhaseRef = useRef<TriadicPhase | null>(null);
  const lastStateRef = useRef(state);

  // Subscribe to kernel frames — only update state when triadic data actually changes
  useEffect(() => {
    const unsub = projector.onFrame(() => {
      const next = projector.getTriadicActivity();
      const prev = lastStateRef.current;
      // Shallow equality check — avoid re-render if nothing changed
      if (
        prev.learn === next.learn &&
        prev.work === next.work &&
        prev.play === next.play &&
        prev.date === next.date
      ) return;
      lastStateRef.current = next;
      setState(next);
    });
    return unsub;
  }, [projector]);

  // Day rollover check
  useEffect(() => {
    const check = setInterval(() => {
      const today = new Date().toISOString().slice(0, 10);
      if (state.date && state.date !== today) {
        projector.resetTriadicDay();
      }
    }, 60_000);
    return () => clearInterval(check);
  }, [state.date, projector]);

  // Accumulate time for active phase via kernel syscall
  useEffect(() => {
    const id = setInterval(() => {
      const phase = activePhaseRef.current;
      if (!phase) return;
      projector.accumulateTriadicPhase(phase, TICK_INTERVAL_MS / 1000);
    }, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [projector]);

  const setActivePhase = useCallback((phase: TriadicPhase | null) => {
    activePhaseRef.current = phase;
  }, []);

  /** Normalized balance suitable for DayProgressRing — memoized to prevent child re-renders */
  const balance: TriadicBalance | null = useMemo(() => {
    const total = state.learn + state.work + state.play;
    if (total < 30) return null;
    return {
      learn: state.learn / total,
      work: state.work / total,
      play: state.play / total,
    };
  }, [state.learn, state.work, state.play]);

  const creatorStage: CreatorStage = useMemo(() => {
    const history = projector.getTriadicHistory();
    let completedCycles = history.length;

    const todayComplete =
      state.learn >= CYCLE_THRESHOLD_S &&
      state.work >= CYCLE_THRESHOLD_S &&
      state.play >= CYCLE_THRESHOLD_S;
    if (todayComplete) completedCycles++;

    if (completedCycles >= 21) return 4;
    if (completedCycles >= 7) return 3;
    if (completedCycles >= 1) return 2;
    return 1;
  }, [state.learn, state.work, state.play, projector]);

  return { balance, setActivePhase, rawSeconds: state, creatorStage };
}
