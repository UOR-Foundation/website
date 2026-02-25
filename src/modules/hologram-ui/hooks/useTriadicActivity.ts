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

import { useState, useEffect, useCallback, useRef } from "react";
import type { TriadicBalance, TriadicPhase } from "@/modules/hologram-ui/sovereign-creator";

const STORAGE_KEY = "hologram:triadic-activity";
const TICK_INTERVAL_MS = 15_000; // accumulate every 15s

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

  // Reset on day change
  useEffect(() => {
    const check = setInterval(() => {
      if (state.date !== todayKey()) {
        const fresh = { date: todayKey(), learn: 0, work: 0, play: 0 };
        setState(fresh);
        saveState(fresh);
      }
    }, 60_000);
    return () => clearInterval(check);
  }, [state.date]);

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

  /** Call when persona/skill phase changes (or null when chat closes) */
  const setActivePhase = useCallback((phase: TriadicPhase | null) => {
    activePhaseRef.current = phase;
  }, []);

  /** Normalized balance suitable for DayProgressRing */
  const balance: TriadicBalance | null = (() => {
    const total = state.learn + state.work + state.play;
    if (total < 30) return null; // Not enough data yet (< 30s)
    return {
      learn: state.learn / total,
      work: state.work / total,
      play: state.play / total,
    };
  })();

  return { balance, setActivePhase, rawSeconds: state };
}
