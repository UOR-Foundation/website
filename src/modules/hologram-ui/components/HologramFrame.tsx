/**
 * HologramFrame — Composable Layer System
 * ════════════════════════════════════════
 *
 * Each frame occupies a z-index layer within the hologram viewport.
 * Frames are stacked in depth order, enabling an extensible multi-layer
 * architecture that maps naturally to future 3D/VR rendering.
 *
 * Layer semantics:
 *   0  = Base canvas (background, hero imagery)
 *   1  = Chrome (sidebar, focus toggle, progress ring — always visible)
 *   2  = Content (main interactive surfaces)
 *   3+ = Overlays (chat, modals, claim flows)
 *
 * The frame system mirrors the UOR Frames concept: each frame is a
 * snapshot of visual state at a given depth, composable and streamable.
 *
 * @module hologram-ui/components/HologramFrame
 */

import { createContext, useContext, useMemo, type ReactNode, type CSSProperties } from "react";

// ── Z-index bands — 100 units apart for sub-layering room ──
const LAYER_BASE = 0;
const LAYER_BAND = 100;

export type FrameLayer = number; // 0, 1, 2, 3, …

interface FrameContextValue {
  /** Current frame's layer depth */
  layer: FrameLayer;
  /** Computed z-index for this layer */
  zIndex: number;
}

const FrameContext = createContext<FrameContextValue>({ layer: 0, zIndex: LAYER_BASE });

/** Access the current frame's layer info from any child */
export function useHologramFrame() {
  return useContext(FrameContext);
}

// ── Frame Component ─────────────────────────────────────────────────────────

interface HologramFrameProps {
  /** Depth layer (0 = base, 1 = chrome, 2 = content, 3+ = overlays) */
  layer: FrameLayer;
  /** Content within this frame */
  children: ReactNode;
  /** Additional class names */
  className?: string;
  /** Additional inline styles */
  style?: CSSProperties;
  /** Whether the frame is interactive (pointer-events). Default: true */
  interactive?: boolean;
  /** Frame label for debugging / future frame registry */
  label?: string;
}

export default function HologramFrame({
  layer,
  children,
  className = "",
  style,
  interactive = true,
  label,
}: HologramFrameProps) {
  const zIndex = LAYER_BASE + layer * LAYER_BAND;

  const ctx = useMemo<FrameContextValue>(() => ({ layer, zIndex }), [layer, zIndex]);

  return (
    <FrameContext.Provider value={ctx}>
      <div
        className={`absolute inset-0 ${className}`}
        style={{
          zIndex,
          pointerEvents: interactive ? "auto" : "none",
          ...style,
        }}
        data-hologram-frame={layer}
        data-frame-label={label}
      >
        {children}
      </div>
    </FrameContext.Provider>
  );
}

// ── Viewport Container ──────────────────────────────────────────────────────

interface HologramViewportProps {
  children: ReactNode;
  className?: string;
}

/**
 * Root container for the frame stack.
 * Creates the positioning context that all frames layer within.
 */
export function HologramViewport({ children, className = "" }: HologramViewportProps) {
  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {children}
    </div>
  );
}
