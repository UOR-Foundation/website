/**
 * useTriadicActivity — Real Triadic Balance from Persona/Skill Usage
 * ═══════════════════════════════════════════════════════════════════
 *
 * Tracks time spent in each triadic phase (Learn/Work/Play) based on
 * which persona and skill the user has active in Hologram Intelligence.
 * Persists to localStorage for same-day continuity.
 *
 * The "hidden insight": the ring becomes a MIRROR of actual sovereign
 * creator behavior, not a simulated placeholder. Activity data flows
 * from persona selection → phase classification → balance computation.
 *
 * @module hologram-ui/hooks/useTriadicActivity
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { TriadicBalance, TriadicPhase, CreatorStage } from "@/modules/hologram-ui/sovereign-creator";

const STORAGE_KEY = "hologram:triadic-activity";
const HISTORY_KEY = "hologram:triadic-history";
const TICK_INTERVAL_MS = 15_000; // accumulate every 15s

/** Minimum seconds in each phase to count as a "completed cycle" */
const CYCLE_THRESHOLD_S = 60;

interface ActivityState {
  date: string; // YYYY-MM-DD
  learn: number; // seconds
  work: number;
  play: number;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadState(): ActivityState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ActivityState;
      if (parsed.date === todayKey()) return parsed;
    }
  } catch { /* ignore */ }
  return { date: todayKey(), learn: 0, work: 0, play: 0 };
}

function saveState(state: ActivityState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useTriadicActivity() {
  const [state, setState] = useState<ActivityState>(loadState);
  const activePhaseRef = useRef<TriadicPhase | null>(null);

  // Reset on day change — archive previous day as a completed cycle if balanced
  useEffect(() => {
    const check = setInterval(() => {
      if (state.date !== todayKey()) {
        // Archive yesterday if all 3 phases had meaningful time
        if (state.learn >= CYCLE_THRESHOLD_S && state.work >= CYCLE_THRESHOLD_S && state.play >= CYCLE_THRESHOLD_S) {
          try {
            const raw = localStorage.getItem(HISTORY_KEY);
            const history: string[] = raw ? JSON.parse(raw) : [];
            if (!history.includes(state.date)) {
              history.push(state.date);
              localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
            }
          } catch { /* ignore */ }
        }
        const fresh = { date: todayKey(), learn: 0, work: 0, play: 0 };
        setState(fresh);
        saveState(fresh);
      }
    }, 60_000);
    return () => clearInterval(check);
  }, [state.date, state.learn, state.work, state.play]);

  // Accumulate time for active phase
  useEffect(() => {
    const id = setInterval(() => {
      const phase = activePhaseRef.current;
      if (!phase) return;
      setState((prev) => {
        const next = { ...prev, [phase]: prev[phase] + TICK_INTERVAL_MS / 1000 };
        saveState(next);
        return next;
      });
    }, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const setActivePhase = useCallback((phase: TriadicPhase | null) => {
    activePhaseRef.current = phase;
  }, []);

  /** Normalized balance suitable for DayProgressRing */
  const balance: TriadicBalance | null = (() => {
    const total = state.learn + state.work + state.play;
    if (total < 30) return null;
    return {
      learn: state.learn / total,
      work: state.work / total,
      play: state.play / total,
    };
  })();

  /**
   * Derive CreatorStage from completed cycle history + today's activity.
   *
   * Stage 1: 0 completed cycles (default — The Sleeping Creator)
   * Stage 2: 1+ completed cycles (The Awakening Creator)
   * Stage 3: 7+ completed cycles (The Practiced Creator)
   * Stage 4: 21+ completed cycles (The Sovereign Creator)
   *
   * A cycle completes when all 3 phases have ≥60s of activity in a single day.
   * Today's in-progress activity can also count toward the current stage.
   */
  const creatorStage: CreatorStage = useMemo(() => {
    let completedCycles = 0;
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) completedCycles = (JSON.parse(raw) as string[]).length;
    } catch { /* ignore */ }

    // Count today as a cycle if all 3 phases are above threshold
    const todayComplete =
      state.learn >= CYCLE_THRESHOLD_S &&
      state.work >= CYCLE_THRESHOLD_S &&
      state.play >= CYCLE_THRESHOLD_S;
    if (todayComplete) completedCycles++;

    if (completedCycles >= 21) return 4;
    if (completedCycles >= 7) return 3;
    if (completedCycles >= 1) return 2;
    return 1;
  }, [state.learn, state.work, state.play]);

  return { balance, setActivePhase, rawSeconds: state, creatorStage };
}
