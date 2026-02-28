/**
 * AttentionMode — Diffuse ↔ Focus Attention Spectrum
 * ═══════════════════════════════════════════════════
 *
 * KERNEL-PROJECTED: The aperture value lives in KernelConfig.attention.aperture.
 * This module reads from the kernel singleton (single source of truth)
 * and exposes derived UOR metrics via React Context.
 *
 * Maps to the Dual Force model from the Sovereign Creator Framework:
 *   Diffuse (0.0) = Compassion-dominant attention — divergent, receptive, open
 *   Focus   (1.0) = Intellect-dominant attention — convergent, selective, deep
 *
 * @module hologram-ui/hooks/useAttentionMode
 */

import { createContext, useContext, useCallback, useMemo, useEffect, useState, type ReactNode } from "react";
import { getKernelProjector } from "@/modules/hologram-os/projection-engine";

export type AttentionPreset = "focus" | "diffuse";

export type DistractionPriority = "critical" | "high" | "medium" | "low" | "ambient";

const PRIORITY_WEIGHT: Record<DistractionPriority, number> = {
  critical: 1.0,
  high: 0.75,
  medium: 0.5,
  low: 0.25,
  ambient: 0.1,
};

export interface AttentionState {
  aperture: number;
  preset: AttentionPreset;
  snr: number;
  observerStratum: number;
  distractionGate: number;
  showNotifications: boolean;
  showExpanded: boolean;
  sidebarExpanded: boolean;
  animateBackground: boolean;
  aiResponseStyle: "concise" | "exploratory";
}

interface AttentionContextValue extends AttentionState {
  toggle: () => void;
  setAperture: (value: number) => void;
  setPreset: (preset: AttentionPreset) => void;
  shouldShow: (priority: DistractionPriority) => boolean;
}

const EPSILON = 0.01;

function deriveState(aperture: number): AttentionState {
  const preset: AttentionPreset = aperture >= 0.5 ? "focus" : "diffuse";
  const diffusion = 1 - aperture;
  const snr = aperture / (diffusion + EPSILON);
  const observerStratum = diffusion;
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

const AttentionContext = createContext<AttentionContextValue | null>(null);

/**
 * AttentionProvider — reads aperture from kernel, derives all metrics.
 * The kernel is the single source of truth. This Context is a projection.
 */
export function AttentionProvider({ children }: { children: ReactNode }) {
  const projector = getKernelProjector();

  // Subscribe to kernel frames to get aperture updates
  const [aperture, setApertureLocal] = useState(() => projector.getAperture());

  useEffect(() => {
    const unsub = projector.onFrame((frame) => {
      const kernelAperture = projector.getAperture();
      setApertureLocal(kernelAperture);
    });
    return unsub;
  }, [projector]);

  // Kernel syscall: write aperture
  const setAperture = useCallback((value: number) => {
    projector.setAperture(value);
  }, [projector]);

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
