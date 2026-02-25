/**
 * AttentionMode — Diffuse ↔ Focus Attention Spectrum
 * ═══════════════════════════════════════════════════
 *
 * Maps to the Dual Force model from the Sovereign Creator Framework:
 *   Diffuse (0.0) = Compassion-dominant attention — divergent, receptive, open
 *   Focus   (1.0) = Intellect-dominant attention — convergent, selective, deep
 *
 * UOR Alignment
 * ─────────────
 *   Aperture ↔ Observer stratum (observer's bit-resolution):
 *     Low aperture  → high stratum → many bits active → wide receptive field
 *     High aperture → low stratum  → few bits active  → narrow, deep signal
 *
 *   Signal-to-Noise Ratio (SNR) is derived from aperture:
 *     SNR = aperture / (1 - aperture + ε)
 *   This mirrors the UOR coherence metric: focused observers produce
 *   higher-fidelity outputs (grade A rate ↑, H-score ↓).
 *
 *   The `distractionGate` threshold determines whether a given piece of
 *   information (notification, suggestion, animation) should pass through:
 *     priority ≥ distractionGate  →  signal (shown)
 *     priority <  distractionGate  →  noise (suppressed)
 *
 * @module hologram-ui/hooks/useAttentionMode
 */

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";

export type AttentionPreset = "focus" | "diffuse";

/**
 * Priority levels for notifications / UI elements.
 * Components tag their interruptions with one of these levels;
 * the focus gate filters them based on current aperture.
 */
export type DistractionPriority = "critical" | "high" | "medium" | "low" | "ambient";

const PRIORITY_WEIGHT: Record<DistractionPriority, number> = {
  critical: 1.0,   // always passes — system errors, security
  high: 0.75,      // passes until deep focus
  medium: 0.5,     // passes in diffuse, blocked in focus
  low: 0.25,       // only in fully diffuse
  ambient: 0.1,    // decorative — blocked early
};

export interface AttentionState {
  /** 0.0 = pure diffuse, 1.0 = pure focus */
  aperture: number;
  /** Binary preset for v1 toggle */
  preset: AttentionPreset;

  // ── Derived UOR metrics ──────────────────────────────────────────────
  /** Signal-to-noise ratio: aperture / (1 - aperture + ε) */
  snr: number;
  /** Observer stratum (inverted aperture, 0–1): high = diffuse field */
  observerStratum: number;
  /** Gate threshold (0–1): items below this priority are suppressed */
  distractionGate: number;

  // ── UI behaviour flags ───────────────────────────────────────────────
  /** Whether notifications should be shown */
  showNotifications: boolean;
  /** Whether to show expanded UI (legends, suggestions, etc.) */
  showExpanded: boolean;
  /** Whether sidebar should auto-expand */
  sidebarExpanded: boolean;
  /** Whether background animation is active */
  animateBackground: boolean;
  /** AI response style hint */
  aiResponseStyle: "concise" | "exploratory";
}

interface AttentionContextValue extends AttentionState {
  /** Toggle between focus and diffuse */
  toggle: () => void;
  /** Set aperture directly (0–1) for future slider */
  setAperture: (value: number) => void;
  /** Set a named preset */
  setPreset: (preset: AttentionPreset) => void;
  /** Check if a distraction of given priority should pass the gate */
  shouldShow: (priority: DistractionPriority) => boolean;
}

const STORAGE_KEY = "hologram:attention-mode";
const EPSILON = 0.01;

function deriveState(aperture: number): AttentionState {
  const preset: AttentionPreset = aperture >= 0.5 ? "focus" : "diffuse";
  const diffusion = 1 - aperture;

  // UOR-aligned metrics
  const snr = aperture / (diffusion + EPSILON);
  const observerStratum = diffusion; // high stratum = wide field
  // Gate ramps from 0 (everything passes) at diffuse to ~0.8 at full focus
  const distractionGate = Math.min(0.95, aperture * 0.9);

  return {
    aperture,
    preset,
    snr,
    observerStratum,
    distractionGate,
    showNotifications: diffusion >= 0.4,
    showExpanded: diffusion >= 0.5,
    sidebarExpanded: diffusion >= 0.6,
    animateBackground: diffusion >= 0.3,
    aiResponseStyle: aperture >= 0.5 ? "concise" : "exploratory",
  };
}

function loadAperture(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const val = parseFloat(raw);
      if (!isNaN(val) && val >= 0 && val <= 1) return val;
    }
  } catch { /* ignore */ }
  return 0.3; // Default: slightly diffuse (welcoming for new users)
}

const AttentionContext = createContext<AttentionContextValue | null>(null);

export function AttentionProvider({ children }: { children: ReactNode }) {
  const [aperture, setApertureRaw] = useState(loadAperture);

  const setAperture = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    setApertureRaw(clamped);
    localStorage.setItem(STORAGE_KEY, clamped.toString());
  }, []);

  const toggle = useCallback(() => {
    setAperture(aperture >= 0.5 ? 0.2 : 0.8);
  }, [aperture, setAperture]);

  const setPreset = useCallback((preset: AttentionPreset) => {
    setAperture(preset === "focus" ? 0.8 : 0.2);
  }, [setAperture]);

  const shouldShow = useCallback((priority: DistractionPriority) => {
    const weight = PRIORITY_WEIGHT[priority];
    const gate = Math.min(0.95, aperture * 0.9);
    return weight >= gate;
  }, [aperture]);

  const value = useMemo<AttentionContextValue>(() => ({
    ...deriveState(aperture),
    toggle,
    setAperture,
    setPreset,
    shouldShow,
  }), [aperture, toggle, setAperture, setPreset, shouldShow]);

  return (
    <AttentionContext.Provider value={value}>
      {children}
    </AttentionContext.Provider>
  );
}

export function useAttentionMode(): AttentionContextValue {
  const ctx = useContext(AttentionContext);
  if (!ctx) {
    // Fallback for components outside the provider — return diffuse defaults
    return {
      ...deriveState(0.3),
      toggle: () => {},
      setAperture: () => {},
      setPreset: () => {},
      shouldShow: () => true,
    };
  }
  return ctx;
}
