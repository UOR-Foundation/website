/**
 * AttentionMode — Diffuse ↔ Focus Attention Spectrum
 * ═══════════════════════════════════════════════════
 *
 * Maps to the Dual Force model from the Sovereign Creator Framework:
 *   Diffuse (0.0) = Compassion-dominant attention — divergent, receptive, open
 *   Focus   (1.0) = Intellect-dominant attention — convergent, selective, deep
 *
 * In UOR terms, this is the observer's "aperture" — analogous to stratum:
 *   Low stratum  = few bits active = focused signal
 *   High stratum = many bits active = diffuse field
 *
 * The context provides a 0–1 spectrum value with a binary toggle for v1,
 * designed to later support a continuous slider.
 *
 * @module hologram-ui/hooks/useAttentionMode
 */

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";

export type AttentionPreset = "focus" | "diffuse";

export interface AttentionState {
  /** 0.0 = pure diffuse, 1.0 = pure focus */
  aperture: number;
  /** Binary preset for v1 toggle */
  preset: AttentionPreset;
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
}

const STORAGE_KEY = "hologram:attention-mode";

function deriveState(aperture: number): AttentionState {
  // Now: 0 = diffuse, 1 = focus
  const preset: AttentionPreset = aperture >= 0.5 ? "focus" : "diffuse";
  const diffusion = 1 - aperture; // high diffusion = low aperture
  return {
    aperture,
    preset,
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

  const value = useMemo<AttentionContextValue>(() => ({
    ...deriveState(aperture),
    toggle,
    setAperture,
    setPreset,
  }), [aperture, toggle, setAperture, setPreset]);

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
      ...deriveState(0.7),
      toggle: () => {},
      setAperture: () => {},
      setPreset: () => {},
    };
  }
  return ctx;
}
