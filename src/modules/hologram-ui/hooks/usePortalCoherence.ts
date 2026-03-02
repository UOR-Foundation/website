/**
 * usePortalCoherence — Kernel coherence projection for the mobile portal
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Subscribes to the kernel's projection frames and extracts coherence
 * metrics for the portal surface. The orb's breathing animation, glow
 * intensity, and ambient indicators all derive from this single hook.
 *
 * Key metrics exposed:
 *   - hScore: current coherence level [0, 1]
 *   - breathDuration: orb breathing period (seconds), inversely proportional to coherence
 *   - glowIntensity: orb glow strength, proportional to coherence
 *   - zone: convergent | exploring | divergent
 *   - resonanceScore: from the resonance engine (how well Lumen matches the user)
 *
 * CSS custom properties are injected on the document root for GPU-accelerated
 * animations that don't trigger React re-renders.
 *
 * @module hologram-ui/hooks/usePortalCoherence
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { getKernelProjector } from "@/modules/hologram-os/projection-engine";
import { loadResonanceProfile } from "@/modules/hologram-ui/engine/resonanceObserver";

export type CoherenceZone = "convergent" | "exploring" | "divergent";

export interface PortalCoherence {
  /** Raw H-score from kernel [0, 1] */
  hScore: number;
  /** Breathing animation duration in seconds — slower when coherent */
  breathDuration: number;
  /** Orb glow opacity multiplier [0.05, 0.3] */
  glowIntensity: number;
  /** Qualitative zone */
  zone: CoherenceZone;
  /** Resonance score from the cybernetic feedback engine [0, 1] */
  resonanceScore: number;
  /** Resonance confidence — how established the profile is [0, 1] */
  resonanceConfidence: number;
  /** Whether coherence data is available (kernel booted) */
  active: boolean;
}

function classifyZone(h: number): CoherenceZone {
  if (h >= 0.7) return "convergent";
  if (h >= 0.4) return "exploring";
  return "divergent";
}

/** Map h-score to breathing duration: high coherence = slow, calm breath */
function breathDuration(h: number): number {
  // 3s at h=0 (fast, restless), 8s at h=1 (slow, calm)
  return 3 + h * 5;
}

/** Map h-score to glow intensity */
function glowIntensity(h: number): number {
  return 0.05 + h * 0.25;
}

const THROTTLE_MS = 200; // Don't update faster than 5fps

export function usePortalCoherence(): PortalCoherence {
  const projector = getKernelProjector();

  const [state, setState] = useState<PortalCoherence>(() => {
    const rp = loadResonanceProfile();
    return {
      hScore: 0.5,
      breathDuration: breathDuration(0.5),
      glowIntensity: glowIntensity(0.5),
      zone: "exploring",
      resonanceScore: rp.resonanceScore,
      resonanceConfidence: Math.min(1, rp.observationCount / 20),
      active: false,
    };
  });

  const lastUpdateRef = useRef(0);

  useEffect(() => {
    const unsub = projector.onFrame((frame) => {
      const now = performance.now();
      if (now - lastUpdateRef.current < THROTTLE_MS) return;
      lastUpdateRef.current = now;

      const h = frame.systemCoherence?.meanH ?? 0.5;
      const bd = breathDuration(h);
      const gi = glowIntensity(h);
      const zone = classifyZone(h);

      // Inject CSS custom properties for GPU-accelerated portal animations
      const root = document.documentElement;
      root.style.setProperty("--portal-h", h.toFixed(3));
      root.style.setProperty("--portal-breath-duration", `${bd.toFixed(1)}s`);
      root.style.setProperty("--portal-glow-intensity", gi.toFixed(3));

      setState((prev) => {
        // Only update React state if values changed meaningfully
        if (
          Math.abs(prev.hScore - h) < 0.02 &&
          prev.zone === zone
        ) return prev;

        return {
          hScore: h,
          breathDuration: bd,
          glowIntensity: gi,
          zone,
          resonanceScore: prev.resonanceScore,
          resonanceConfidence: prev.resonanceConfidence,
          active: true,
        };
      });
    });

    return unsub;
  }, [projector]);

  // Periodically refresh resonance score (every 30s)
  useEffect(() => {
    const refresh = () => {
      const rp = loadResonanceProfile();
      setState((prev) => ({
        ...prev,
        resonanceScore: rp.resonanceScore,
        resonanceConfidence: Math.min(1, rp.observationCount / 20),
      }));
    };
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, []);

  return state;
}
