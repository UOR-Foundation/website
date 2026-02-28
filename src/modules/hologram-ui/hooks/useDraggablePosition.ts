/**
 * useDraggablePosition — Kernel-projected widget placement
 * ═══════════════════════════════════════════════════════════
 *
 * Position state flows through KernelConfig.dragPositions.
 * No direct localStorage access — the kernel persists all positions
 * under the unified kernel:config key.
 *
 * Features:
 *  - Snap-to-alignment with other draggable elements
 *  - Visual guide lines emitted via custom event
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { registerRect, unregisterRect, snapToOthers } from "./dragSnapRegistry";
import { SNAP_GUIDE_EVENT, type SnapGuidePayload } from "../components/SnapGuideOverlay";
import { getKernelProjector } from "@/modules/hologram-os/projection-engine";

export interface DragPosition {
  x: number;
  y: number;
}

interface UseDraggablePositionOptions {
  /** Kernel drag-position key, e.g. "hologram-pos:ambient" */
  storageKey: string;
  /** Default position when nothing is saved */
  defaultPos: DragPosition;
  /** If provided, clamp position within these bounds (viewport-relative) */
  padding?: number;
  /**
   * "absolute" (default): pos is left/top from viewport edge.
   * "offset": pos is a delta from the element's natural position (returns translate style).
   */
  mode?: "absolute" | "offset";
  /** Approximate element size for snap calculations (default 48x48) */
  snapSize?: { width: number; height: number };
}

function emitGuides(guides: SnapGuidePayload["guides"], active: boolean) {
  window.dispatchEvent(
    new CustomEvent<SnapGuidePayload>(SNAP_GUIDE_EVENT, {
      detail: { guides, active },
    }),
  );
}

export function useDraggablePosition({
  storageKey,
  defaultPos,
  padding = 8,
  mode = "absolute",
  snapSize = { width: 48, height: 48 },
}: UseDraggablePositionOptions) {
  const projector = getKernelProjector();

  const [pos, setPos] = useState<DragPosition>(
    () => projector.getDragPosition(storageKey) ?? defaultPos,
  );
  const dragging = useRef(false);
  const offset = useRef({ dx: 0, dy: 0 });
  const moved = useRef(false);

  // Clamp helper
  const clamp = useCallback(
    (p: DragPosition): DragPosition => ({
      x: Math.max(padding, Math.min(window.innerWidth - padding, p.x)),
      y: Math.max(padding, Math.min(window.innerHeight - padding, p.y)),
    }),
    [padding],
  );

  // Register this element's rect in the snap registry
  useEffect(() => {
    registerRect(storageKey, {
      key: storageKey,
      x: pos.x,
      y: pos.y,
      width: snapSize.width,
      height: snapSize.height,
    });
    return () => unregisterRect(storageKey);
  }, [storageKey, pos.x, pos.y, snapSize.width, snapSize.height]);

  // Persist to kernel whenever pos changes
  useEffect(() => {
    projector.setDragPosition(storageKey, pos);
  }, [storageKey, pos, projector]);

  // Global pointer move / up
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      moved.current = true;

      const raw = clamp({
        x: e.clientX - offset.current.dx,
        y: e.clientY - offset.current.dy,
      });

      const snap = snapToOthers(
        storageKey,
        raw.x,
        raw.y,
        snapSize.width,
        snapSize.height,
      );

      setPos({ x: snap.x, y: snap.y });
      emitGuides(snap.guides, true);
    };

    const onUp = () => {
      if (dragging.current) {
        dragging.current = false;
        emitGuides([], false);
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [clamp, storageKey, snapSize.width, snapSize.height]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      dragging.current = true;
      moved.current = false;
      offset.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [pos],
  );

  const resetPosition = useCallback(() => {
    setPos(defaultPos);
    projector.setDragPosition(storageKey, defaultPos);
  }, [defaultPos, storageKey, projector]);

  const wasDragged = useCallback(() => moved.current, []);

  const style = mode === "offset"
    ? { transform: `translate(${pos.x}px, ${pos.y}px)` } as React.CSSProperties
    : { left: pos.x, top: pos.y } as React.CSSProperties;

  return {
    pos,
    style,
    handlers: { onPointerDown },
    resetPosition,
    wasDragged,
    isDragging: () => dragging.current,
  };
}
