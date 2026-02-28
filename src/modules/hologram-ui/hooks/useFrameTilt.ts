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
  /** Invert the tilt direction (for parallax counter-motion) */
  invert?: boolean;
  /** Translate on X/Y in px in addition to rotation (parallax shift) */
  maxShift?: number;
}

export function useFrameTilt(options: TiltOptions = {}): Transform3D {
  const {
    maxTilt = 3,
    smoothing = 0.08,
    zShift = 0,
    disableOnTouch = true,
    invert = false,
    maxShift = 0,
  } = options;

  // Fast bail: if maxTilt and maxShift are both 0, no work needed
  const isDisabled = maxTilt === 0 && maxShift === 0 && zShift === 0;

  const [transform, setTransform] = useState<Transform3D>({ ...IDENTITY_TRANSFORM });
  const target = useRef({ rx: 0, ry: 0, nx: 0, ny: 0 });
  const current = useRef({ rx: 0, ry: 0, nx: 0, ny: 0 });
  const rafId = useRef<number>(0);
  const active = useRef(true);

  const onMove = useCallback(
    (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const nx = (e.clientX - cx) / cx;
      const ny = (e.clientY - cy) / cy;
      const sign = invert ? 1 : -1;
      target.current = {
        rx: sign * ny * maxTilt,
        ry: (invert ? -1 : 1) * nx * maxTilt,
        nx,
        ny,
      };
    },
    [maxTilt, invert],
  );

  useEffect(() => {
    // Skip entire RAF loop and mouse listener when disabled
    if (isDisabled) return;
    if (disableOnTouch && "ontouchstart" in window) return;

    active.current = true;
    window.addEventListener("mousemove", onMove, { passive: true });

    const THRESHOLD = 0.001;
    let idleFrames = 0;

    const tick = () => {
      if (!active.current) return;
      const c = current.current;
      const t = target.current;
      c.rx += (t.rx - c.rx) * smoothing;
      c.ry += (t.ry - c.ry) * smoothing;
      c.nx += (t.nx - c.nx) * smoothing;
      c.ny += (t.ny - c.ny) * smoothing;

      const delta = Math.abs(t.rx - c.rx) + Math.abs(t.ry - c.ry);

      if (delta > THRESHOLD) {
        idleFrames = 0;
        const shiftSign = invert ? -1 : 1;
        setTransform({
          position: [shiftSign * c.nx * maxShift, shiftSign * c.ny * maxShift, zShift],
          rotation: [c.rx, c.ry, 0],
          scale: [1, 1, 1],
        });
        rafId.current = requestAnimationFrame(tick);
      } else {
        // Stop RAF when settled; mousemove restarts it
        idleFrames++;
        if (idleFrames < 3) {
          rafId.current = requestAnimationFrame(tick);
        }
        // else: loop stops, saves CPU
      }
    };

    const restartLoop = () => {
      idleFrames = 0;
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(tick);
    };

    const wrappedOnMove = (e: MouseEvent) => {
      onMove(e);
      restartLoop();
    };

    window.addEventListener("mousemove", wrappedOnMove, { passive: true });
    rafId.current = requestAnimationFrame(tick);

    return () => {
      active.current = false;
      cancelAnimationFrame(rafId.current);
      window.removeEventListener("mousemove", wrappedOnMove);
    };
  }, [onMove, smoothing, zShift, disableOnTouch, invert, maxShift, isDisabled]);

  return transform;
}
