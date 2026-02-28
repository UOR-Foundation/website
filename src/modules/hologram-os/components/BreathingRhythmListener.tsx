/**
 * BreathingRhythmListener — Global interaction cadence tracker
 * ═════════════════════════════════════════════════════════════
 *
 * Listens to DOM-level user interactions (click, keydown, scroll,
 * pointermove) and feeds them to the kernel's breathing rhythm
 * register. This component renders nothing — it is pure side-effect.
 *
 * Throttled to avoid flooding the kernel with high-frequency events
 * (e.g. rapid scrolling, mouse movement). Only one event per 80ms
 * is recorded.
 *
 * Mount once at the OS root level.
 *
 * @module hologram-os/components/BreathingRhythmListener
 */

import { useEffect, useRef } from "react";
import { getKernelProjector } from "@/modules/hologram-os/projection-engine";

const THROTTLE_MS = 80;

export default function BreathingRhythmListener() {
  const lastRef = useRef(0);

  useEffect(() => {
    const projector = getKernelProjector();

    const handler = () => {
      const now = performance.now();
      if (now - lastRef.current < THROTTLE_MS) return;
      lastRef.current = now;
      projector.recordInteraction();
    };

    // Capture phase to catch all interactions before they're consumed
    const opts: AddEventListenerOptions = { capture: true, passive: true };

    window.addEventListener("keydown", handler, opts);
    window.addEventListener("pointerdown", handler, opts);
    window.addEventListener("scroll", handler, opts);
    // Pointer move is very noisy — use a coarser throttle
    const moveHandler = () => {
      const now = performance.now();
      if (now - lastRef.current < THROTTLE_MS * 3) return;
      lastRef.current = now;
      projector.recordInteraction();
    };
    window.addEventListener("pointermove", moveHandler, opts);

    return () => {
      window.removeEventListener("keydown", handler, opts);
      window.removeEventListener("pointerdown", handler, opts);
      window.removeEventListener("scroll", handler, opts);
      window.removeEventListener("pointermove", moveHandler, opts);
    };
  }, []);

  return null;
}
