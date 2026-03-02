/**
 * useAttentionMode — Pure kernel projection, zero React Context
 * ══════════════════════════════════════════════════════════════
 *
 * KERNEL-PROJECTED: All attention metrics are derived from the
 * ProjectionFrame.attention register. No separate Context needed —
 * the kernel IS the single source of truth.
 *
 * Maps to the Dual Force model from the Sovereign Creator Framework:
 *   Diffuse (0.0) = Compassion-dominant attention — divergent, receptive
 *   Focus   (1.0) = Intellect-dominant attention — convergent, selective
 *
 * @module hologram-ui/hooks/useAttentionMode
 */

import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { getKernelProjector, type AttentionProjection } from "@/modules/hologram-os/projection-engine";

export type AttentionPreset = "focus" | "diffuse";

export type DistractionPriority = "critical" | "high" | "medium" | "low" | "ambient";

const PRIORITY_WEIGHT: Record<DistractionPriority, number> = {
  critical: 1.0,
  high: 0.75,
  medium: 0.5,
  low: 0.25,
  ambient: 0.1,
};

export interface AttentionState extends AttentionProjection {}

interface AttentionContextValue extends AttentionState {
  toggle: () => void;
  setAperture: (value: number) => void;
  setPreset: (preset: AttentionPreset) => void;
  shouldShow: (priority: DistractionPriority) => boolean;
}

/**
 * useAttentionMode — reads attention directly from the kernel projection stream.
 * No Provider wrapper needed. Every consumer subscribes to the same kernel frames.
 */
export function useAttentionMode(): AttentionContextValue {
  const projector = getKernelProjector();

  // Subscribe to kernel frames to get attention updates — only re-render when values change
  const [attention, setAttention] = useState<AttentionProjection>(() => projector.getAttention());
  const lastRef = useRef(attention);

  useEffect(() => {
    const unsub = projector.onFrame((frame) => {
      const next = frame.attention;
      const prev = lastRef.current;
      // Shallow equality on key scalars — skip re-render if unchanged
      if (
        prev.aperture === next.aperture &&
        prev.preset === next.preset &&
        prev.distractionGate === next.distractionGate &&
        prev.snr === next.snr
      ) return;
      lastRef.current = next;
      setAttention(next);
    });
    return unsub;
  }, [projector]);

  const setAperture = useCallback((value: number) => {
    projector.setAperture(value);
  }, [projector]);

  const toggle = useCallback(() => {
    setAperture(attention.aperture >= 0.5 ? 0.2 : 0.8);
  }, [attention.aperture, setAperture]);

  const setPreset = useCallback((preset: AttentionPreset) => {
    setAperture(preset === "focus" ? 0.8 : 0.2);
  }, [setAperture]);

  const shouldShow = useCallback((priority: DistractionPriority) => {
    const weight = PRIORITY_WEIGHT[priority];
    return weight >= attention.distractionGate;
  }, [attention.distractionGate]);

  return useMemo<AttentionContextValue>(() => ({
    ...attention,
    toggle,
    setAperture,
    setPreset,
    shouldShow,
  }), [attention, toggle, setAperture, setPreset, shouldShow]);
}
