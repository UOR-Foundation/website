/**
 * useModularPanel — Drag-to-Resize + Snap Grid System
 * ════════════════════════════════════════════════════
 *
 * Provides resize, drag, and snap-to-grid behavior for modular panels.
 * Each panel can be resized by dragging its edge and optionally dragged
 * to reposition. Widths snap to grid intervals for alignment.
 *
 * @module hologram-ui/hooks/useModularPanel
 */

import { useState, useCallback, useRef, useEffect } from "react";

// ── Grid constants ─────────────────────────────────────────────────────────

/** Snap grid interval in pixels */
export const GRID_SNAP = 40;

/** Snap tolerance — within this distance, snap to grid line */
const SNAP_THRESHOLD = 12;

/** Round value to nearest grid line if within threshold */
function snapToGrid(value: number, interval: number = GRID_SNAP): number {
  const nearest = Math.round(value / interval) * interval;
  return Math.abs(value - nearest) < SNAP_THRESHOLD ? nearest : value;
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface PanelConstraints {
  minWidth: number;
  maxWidth: number;
  minHeight?: number;
  maxHeight?: number;
}

export interface PanelState {
  width: number;
  height?: number;
  x?: number;
  y?: number;
}

interface UseModularPanelOptions {
  /** Storage key for persisting size */
  storageKey: string;
  /** Default width */
  defaultWidth: number;
  /** Width constraints */
  constraints: PanelConstraints;
  /** Whether to snap to grid */
  snap?: boolean;
  /** Side the panel is docked to ("right" | "left") */
  dockSide?: "left" | "right";
}

export interface ModularPanelResult {
  /** Current panel width */
  width: number;
  /** Whether the user is actively dragging the resize handle */
  isResizing: boolean;
  /** Whether a snap line is active */
  snapActive: boolean;
  /** Attach this to the resize handle element */
  resizeHandleProps: {
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
    style: React.CSSProperties;
    className: string;
    "data-resizing": boolean;
  };
  /** Set width programmatically */
  setWidth: (w: number) => void;
  /** Reset to default */
  reset: () => void;
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useModularPanel({
  storageKey,
  defaultWidth,
  constraints,
  snap = true,
  dockSide = "right",
}: UseModularPanelOptions): ModularPanelResult {
  const [width, setWidthRaw] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`hologram:panel:${storageKey}`);
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= constraints.minWidth && val <= constraints.maxWidth) return val;
      }
    } catch {}
    return defaultWidth;
  });

  const [isResizing, setIsResizing] = useState(false);
  const [snapActive, setSnapActive] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const setWidth = useCallback((w: number) => {
    const clamped = Math.max(constraints.minWidth, Math.min(constraints.maxWidth, w));
    setWidthRaw(clamped);
    try {
      localStorage.setItem(`hologram:panel:${storageKey}`, clamped.toString());
    } catch {}
  }, [constraints, storageKey]);

  const reset = useCallback(() => setWidth(defaultWidth), [defaultWidth, setWidth]);

  // ── Resize drag logic ────────────────────────────────────────────────

  const handleMove = useCallback((clientX: number) => {
    const delta = dockSide === "right"
      ? startXRef.current - clientX
      : clientX - startXRef.current;

    let newWidth = startWidthRef.current + delta;

    if (snap) {
      const snapped = snapToGrid(newWidth);
      setSnapActive(snapped !== newWidth);
      newWidth = snapped;
    }

    setWidth(newWidth);
  }, [dockSide, snap, setWidth]);

  const handleEnd = useCallback(() => {
    setIsResizing(false);
    setSnapActive(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const onMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      handleMove(e.clientX);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) handleMove(e.touches[0].clientX);
    };
    const onEnd = () => handleEnd();

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onEnd);
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onEnd);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onEnd);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onEnd);
    };
  }, [isResizing, handleMove, handleEnd]);

  const startResize = useCallback((clientX: number) => {
    startXRef.current = clientX;
    startWidthRef.current = width;
    setIsResizing(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [width]);

  const resizeHandleProps = {
    onMouseDown: (e: React.MouseEvent) => {
      e.preventDefault();
      startResize(e.clientX);
    },
    onTouchStart: (e: React.TouchEvent) => {
      if (e.touches[0]) startResize(e.touches[0].clientX);
    },
    style: {
      cursor: "col-resize" as const,
    },
    className: "hologram-resize-handle",
    "data-resizing": isResizing,
  };

  return {
    width,
    isResizing,
    snapActive,
    resizeHandleProps,
    setWidth,
    reset,
  };
}
