/**
 * useFrameTilt — Mouse-reactive 3D tilt for HologramFrame Transform3D
 * ════════════════════════════════════════════════════════════════════
 *
 * Tracks mouse position relative to the viewport center and produces
 * a Transform3D with subtle rotation, demonstrating the 3D-ready
 * architecture. The tilt is smoothed via lerp for a fluid feel.
 *
 * In a future WebXR context this hook would be replaced by head-tracking
 * input, but the Transform3D output shape remains identical.
 */

import { useEffect, useRef, useCallback, useState } from "react";
import type { Transform3D } from "../components/HologramFrame";
import { IDENTITY_TRANSFORM } from "../components/HologramFrame";

interface TiltOptions {
  /** Max rotation in degrees (default 3) */
  maxTilt?: number;
  /** Lerp speed 0–1 (default 0.08) */
  smoothing?: number;
  /** Subtle Z translation for depth feel in px (default 0) */
  zShift?: number;
  /** Disable on mobile (default true) */
  disableOnTouch?: boolean;
}

export function useFrameTilt(options: TiltOptions = {}): Transform3D {
  const {
    maxTilt = 3,
    smoothing = 0.08,
    zShift = 0,
    disableOnTouch = true,
  } = options;

  const [transform, setTransform] = useState<Transform3D>({ ...IDENTITY_TRANSFORM });
  const target = useRef({ rx: 0, ry: 0 });
  const current = useRef({ rx: 0, ry: 0 });
  const rafId = useRef<number>(0);
  const active = useRef(true);

  const onMove = useCallback(
    (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      // Normalize to -1..1
      const nx = (e.clientX - cx) / cx;
      const ny = (e.clientY - cy) / cy;
      // Invert Y for natural tilt (mouse up → tilt toward viewer)
      target.current = { rx: -ny * maxTilt, ry: nx * maxTilt };
    },
    [maxTilt],
  );

  useEffect(() => {
    if (disableOnTouch && "ontouchstart" in window) return;

    window.addEventListener("mousemove", onMove, { passive: true });

    const tick = () => {
      if (!active.current) return;
      const c = current.current;
      const t = target.current;
      c.rx += (t.rx - c.rx) * smoothing;
      c.ry += (t.ry - c.ry) * smoothing;

      // Only update state when movement is perceptible (> 0.01 deg)
      if (Math.abs(t.rx - c.rx) > 0.01 || Math.abs(t.ry - c.ry) > 0.01) {
        setTransform({
          position: [0, 0, zShift],
          rotation: [c.rx, c.ry, 0],
          scale: [1, 1, 1],
        });
      }
      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);

    return () => {
      active.current = false;
      cancelAnimationFrame(rafId.current);
      window.removeEventListener("mousemove", onMove);
    };
  }, [onMove, smoothing, zShift, disableOnTouch]);

  return transform;
}
