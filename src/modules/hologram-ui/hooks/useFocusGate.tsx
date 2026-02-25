/**
 * useFocusGate — Universal Distraction Gate
 * ══════════════════════════════════════════
 *
 * Provides a simple API for any component to check whether it should
 * render, animate, or fire a notification based on the current
 * attention aperture.
 *
 * UOR Alignment:
 *   This implements the Observer's "field of observation" filter —
 *   as the observer narrows its stratum (focus ↑), items outside
 *   the field are suppressed. Only signals whose priority weight
 *   exceeds the distraction gate pass through.
 *
 * Usage:
 *   const gate = useFocusGate();
 *
 *   // Check if a notification should show
 *   if (gate.allows("medium")) showNotification();
 *
 *   // Get current SNR for display
 *   <span>{gate.snrLabel}</span>
 *
 *   // Check if we're in deep focus (aperture > 0.7)
 *   if (gate.isDeepFocus) hideAllChrome();
 *
 * @module hologram-ui/hooks/useFocusGate
 */

import { useMemo } from "react";
import { useAttentionMode, type DistractionPriority } from "./useAttentionMode";

export interface FocusGate {
  /** Check if a distraction of given priority should pass */
  allows: (priority: DistractionPriority) => boolean;
  /** Current aperture (0 = diffuse, 1 = focus) */
  aperture: number;
  /** Signal-to-noise ratio */
  snr: number;
  /** Human-readable SNR label */
  snrLabel: string;
  /** Observer stratum (UOR) */
  observerStratum: number;
  /** Distraction gate threshold */
  gate: number;
  /** True when aperture > 0.7 (deep focus territory) */
  isDeepFocus: boolean;
  /** True when aperture < 0.3 (fully open/diffuse) */
  isFullyOpen: boolean;
  /** Preset name */
  preset: "focus" | "diffuse";
}

function formatSnr(snr: number): string {
  if (snr < 0.5) return "Open";
  if (snr < 1.0) return "Balanced";
  if (snr < 3.0) return "Focused";
  if (snr < 8.0) return "Deep";
  return "Locked In";
}

export function useFocusGate(): FocusGate {
  const attention = useAttentionMode();

  return useMemo<FocusGate>(() => ({
    allows: attention.shouldShow,
    aperture: attention.aperture,
    snr: attention.snr,
    snrLabel: formatSnr(attention.snr),
    observerStratum: attention.observerStratum,
    gate: attention.distractionGate,
    isDeepFocus: attention.aperture > 0.7,
    isFullyOpen: attention.aperture < 0.3,
    preset: attention.preset,
  }), [attention]);
}
