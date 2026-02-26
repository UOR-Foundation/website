import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Generic hook that makes any absolutely/fixed-positioned element draggable.
 * Position is persisted to localStorage under the given key.
 * If no saved position exists (or user isn't logged in), `defaultPos` is used.
 *
 * Returns:
 *  - `pos`   — the current { x, y } in CSS pixels (from viewport top-left)
 *  - `style` — convenience object to spread onto the element
 *  - `handlers` — onPointerDown to attach to the drag handle
 *  - `resetPosition` — restore the default
 */

export interface DragPosition {
  x: number;
  y: number;
}

interface UseDraggablePositionOptions {
  /** localStorage key, e.g. "hologram-pos:ambient" */
  storageKey: string;
  /** Default position when nothing is saved */
  defaultPos: DragPosition;
  /** If provided, clamp position within these bounds (viewport-relative) */
  padding?: number;
}

function load(key: string): DragPosition | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p.x === "number" && typeof p.y === "number") return p;
  } catch {}
  return null;
}

function save(key: string, pos: DragPosition) {
  try {
    localStorage.setItem(key, JSON.stringify(pos));
  } catch {}
}

export function useDraggablePosition({
  storageKey,
  defaultPos,
  padding = 8,
}: UseDraggablePositionOptions) {
  const [pos, setPos] = useState<DragPosition>(() => load(storageKey) ?? defaultPos);
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

  // Persist whenever pos changes (debounced naturally by pointer events)
  useEffect(() => {
    save(storageKey, pos);
  }, [storageKey, pos]);

  // Global pointer move / up
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      moved.current = true;
      const next = clamp({ x: e.clientX - offset.current.dx, y: e.clientY - offset.current.dy });
      setPos(next);
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [clamp]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only primary button
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
    save(storageKey, defaultPos);
  }, [defaultPos, storageKey]);

  /** True if pointer moved since last pointerdown (used to suppress click) */
  const wasDragged = useCallback(() => moved.current, []);

  return {
    pos,
    style: { left: pos.x, top: pos.y } as React.CSSProperties,
    handlers: { onPointerDown },
    resetPosition,
    wasDragged,
  };
}
