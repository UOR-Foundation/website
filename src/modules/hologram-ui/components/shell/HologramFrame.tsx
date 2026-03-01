/**
 * HologramFrame — Composable Layer System with Cinematic Transitions
 * ══════════════════════════════════════════════════════════════════
 *
 * The holographic principle applied to UI rendering:
 * complex multi-dimensional state encoded onto discrete 2D frames,
 * composable and streamable — exactly like GPU render frames.
 *
 * Each frame occupies a z-index layer within the hologram viewport.
 * Frames are stacked in depth order, enabling an extensible multi-layer
 * architecture that maps naturally to future 3D/VR rendering.
 *
 * Layer semantics:
 *   0  = Canvas (background, hero imagery)
 *   1  = Chrome (sidebar, focus toggle, progress ring — always visible)
 *   2  = Content (main interactive surfaces)
 *   3+ = Overlays (chat, modals, claim flows)
 *
 * Transition system:
 *   When an overlay (layer ≥ 3) opens, lower-layer frames receive a
 *   "depth recession" — they scale down and blur slightly, producing a
 *   cinematic focal-shift effect. This is powered by framer-motion's
 *   AnimatePresence and the HologramViewport's DepthShift context.
 *
 * Future-proofing for VR/XR:
 *   - Each frame carries a Transform3D (position, rotation, scale)
 *     that currently maps to CSS transforms but will map 1:1 to
 *     WebXR/Three.js transforms when the rendering backend upgrades.
 *   - The FrameRegistry is a singleton scene graph — queryable,
 *     serializable, and streamable. It IS the frame buffer.
 *   - Frame state can be serialized to a UOR-addressable snapshot,
 *     enabling "holographic hibernation" — freeze any viewport state,
 *     hash it, resume it anywhere.
 *
 * @module hologram-ui/components/HologramFrame
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type ReactNode,
  type CSSProperties,
} from "react";
import { motion, AnimatePresence } from "framer-motion";

// ══════════════════════════════════════════════════════════════════════════════
// ── Transform3D — Future-ready spatial metadata ─────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 3D transform for a frame. Currently projected onto CSS transforms;
 * in a WebXR/Three.js backend, these map directly to Object3D properties.
 */
export interface Transform3D {
  position: [x: number, y: number, z: number];
  rotation: [rx: number, ry: number, rz: number];
  scale: [sx: number, sy: number, sz: number];
}

/** Identity transform — no translation, no rotation, unit scale. */
export const IDENTITY_TRANSFORM: Readonly<Transform3D> = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
};

/**
 * Convert a Transform3D to a CSS transform string.
 */
function transform3DToCss(t: Transform3D): string {
  const [x, y, z] = t.position;
  const [rx, ry, rz] = t.rotation;
  const [sx, sy, sz] = t.scale;

  const isIdentity =
    x === 0 && y === 0 && z === 0 &&
    rx === 0 && ry === 0 && rz === 0 &&
    sx === 1 && sy === 1 && sz === 1;

  if (isIdentity) return "";

  return [
    z !== 0 || x !== 0 || y !== 0 ? `translate3d(${x}px, ${y}px, ${z}px)` : "",
    rx !== 0 ? `rotateX(${rx}deg)` : "",
    ry !== 0 ? `rotateY(${ry}deg)` : "",
    rz !== 0 ? `rotateZ(${rz}deg)` : "",
    sx !== 1 || sy !== 1 || sz !== 1 ? `scale3d(${sx}, ${sy}, ${sz})` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Frame Descriptor — Serializable frame metadata ──────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export interface FrameDescriptor {
  id: string;
  layer: number;
  label: string;
  transform: Transform3D;
  interactive: boolean;
  opacity: number;
  visible: boolean;
  meta: Record<string, unknown>;
  updatedAt: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Frame Registry — The Scene Graph ────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

class FrameRegistry {
  private frames = new Map<string, FrameDescriptor>();
  private listeners = new Set<(snapshot: FrameDescriptor[]) => void>();
  private nextId = 0;

  generateId(label?: string): string {
    return label ? `frame:${label}:${this.nextId++}` : `frame:${this.nextId++}`;
  }

  upsert(descriptor: FrameDescriptor): void {
    this.frames.set(descriptor.id, { ...descriptor, updatedAt: Date.now() });
    this.notify();
  }

  remove(id: string): void {
    this.frames.delete(id);
    this.notify();
  }

  snapshot(): FrameDescriptor[] {
    return [...this.frames.values()].sort((a, b) => a.layer - b.layer);
  }

  atLayer(layer: number): FrameDescriptor[] {
    return this.snapshot().filter((f) => f.layer === layer);
  }

  topInteractive(): FrameDescriptor | undefined {
    return [...this.frames.values()]
      .filter((f) => f.interactive && f.visible)
      .sort((a, b) => b.layer - a.layer)[0];
  }

  get size(): number {
    return this.frames.size;
  }

  subscribe(fn: (snapshot: FrameDescriptor[]) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  serialize(): { version: 1; timestamp: number; frames: FrameDescriptor[] } {
    return {
      version: 1,
      timestamp: Date.now(),
      frames: this.snapshot(),
    };
  }

  private pendingNotify = false;

  private notify(): void {
    if (this.pendingNotify) return;
    this.pendingNotify = true;
    queueMicrotask(() => {
      this.pendingNotify = false;
      const snap = this.snapshot();
      this.listeners.forEach((fn) => fn(snap));
    });
  }
}

export const frameRegistry = new FrameRegistry();

// ══════════════════════════════════════════════════════════════════════════════
// ── Z-Index Bands ───────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

const LAYER_BASE = 0;
const LAYER_BAND = 100;

export type FrameLayer = number;

// ══════════════════════════════════════════════════════════════════════════════
// ── Depth Shift Context — cinematic focal-shift on overlay open ─────────────
// ══════════════════════════════════════════════════════════════════════════════

interface DepthShiftState {
  /** Whether an overlay is active (causes lower layers to recede) */
  overlayActive: boolean;
  /** The layer threshold — frames below this recede */
  overlayLayer: number;
  setOverlayActive: (active: boolean, layer?: number) => void;
}

const DepthShiftContext = createContext<DepthShiftState>({
  overlayActive: false,
  overlayLayer: 3,
  setOverlayActive: () => {},
});

export function useDepthShift() {
  return useContext(DepthShiftContext);
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Frame Context ───────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

interface FrameContextValue {
  layer: FrameLayer;
  zIndex: number;
  descriptor: FrameDescriptor;
  registry: FrameRegistry;
}

const FrameContext = createContext<FrameContextValue>({
  layer: 0,
  zIndex: LAYER_BASE,
  descriptor: {
    id: "frame:default",
    layer: 0,
    label: "default",
    transform: { ...IDENTITY_TRANSFORM },
    interactive: true,
    opacity: 1,
    visible: true,
    meta: {},
    updatedAt: 0,
  },
  registry: frameRegistry,
});

export function useHologramFrame() {
  return useContext(FrameContext);
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Transition Presets ──────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

/** Spring config tuned for crisp, fast settling — flow-optimized */
const DEPTH_SPRING = { type: "spring" as const, stiffness: 200, damping: 28, mass: 0.5 };
const FADE_SPRING = { type: "spring" as const, stiffness: 260, damping: 26, mass: 0.4 };

/** How much lower layers recede when an overlay opens */
const RECESSION_SCALE = 0.965;
const RECESSION_BLUR = 6; // px

// ══════════════════════════════════════════════════════════════════════════════
// ── Frame Component ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

interface HologramFrameProps {
  layer: FrameLayer;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  interactive?: boolean;
  label?: string;
  transform?: Transform3D;
  opacity?: number;
  visible?: boolean;
  meta?: Record<string, unknown>;
  /**
   * Transition preset for mount/unmount.
   * - "none"    — instant, no animation
   * - "fade"    — simple opacity fade (default for layers 0-2)
   * - "depth"   — cinematic depth-shift: slides from behind with scale (default for layers 3+)
   * - "slide"   — slide in from right (good for panels)
   */
  transition?: "none" | "fade" | "depth" | "slide";
  /**
   * Whether this frame should recede when an overlay opens.
   * Default: true for layers < 3, false for layers >= 3.
   */
  recessOnOverlay?: boolean;
}

export default function HologramFrame({
  layer,
  children,
  className = "",
  style,
  interactive = true,
  label,
  transform = IDENTITY_TRANSFORM,
  opacity = 1,
  visible = true,
  meta = {},
  transition: transitionProp,
  recessOnOverlay: recessProp,
}: HologramFrameProps) {
  const zIndex = LAYER_BASE + layer * LAYER_BAND;
  const frameIdRef = useRef<string>("");
  const depthShift = useContext(DepthShiftContext);

  if (!frameIdRef.current) {
    frameIdRef.current = frameRegistry.generateId(label);
  }
  const frameId = frameIdRef.current;

  // Determine transition preset
  const transition = transitionProp ?? (layer >= 3 ? "depth" : "fade");
  const shouldRecess = recessProp ?? (layer < 3);

  // Build descriptor
  const descriptor = useMemo<FrameDescriptor>(
    () => ({
      id: frameId,
      layer,
      label: label ?? `layer-${layer}`,
      transform,
      interactive,
      opacity,
      visible,
      meta,
      updatedAt: Date.now(),
    }),
    [frameId, layer, label, transform, interactive, opacity, visible, meta],
  );

  // Register/update on mount and prop changes; unregister on unmount
  useEffect(() => {
    frameRegistry.upsert(descriptor);
    return () => {
      frameRegistry.remove(frameId);
    };
  }, [descriptor, frameId]);

  const ctx = useMemo<FrameContextValue>(
    () => ({ layer, zIndex, descriptor, registry: frameRegistry }),
    [layer, zIndex, descriptor],
  );

  if (!visible) return null;

  const cssTransform = transform3DToCss(transform);

  // Recession state — when overlay is active and this frame is below the overlay
  const isReceding = shouldRecess && depthShift.overlayActive && layer < depthShift.overlayLayer;

  // Build motion variants
  const baseStyle: CSSProperties = {
    zIndex,
    pointerEvents: interactive ? "auto" : "none",
    transformStyle: "preserve-3d",
    willChange: interactive ? "transform, opacity" : "auto",
    ...style,
  };

  // Entry/exit animation variants by preset
  const variants = {
    none: {
      initial: {},
      animate: {
        opacity,
        scale: isReceding ? RECESSION_SCALE : 1,
        filter: isReceding ? `blur(${RECESSION_BLUR}px)` : "blur(0px)",
        ...(cssTransform ? { transform: cssTransform } : {}),
      },
      exit: {},
    },
    fade: {
      initial: { opacity: 0 },
      animate: {
        opacity: isReceding ? opacity * 0.7 : opacity,
        scale: isReceding ? RECESSION_SCALE : 1,
        filter: isReceding ? `blur(${RECESSION_BLUR}px)` : "blur(0px)",
      },
      exit: { opacity: 0 },
    },
    depth: {
      initial: {
        opacity: 0,
        scale: 0.92,
        y: 40,
        filter: "blur(8px)",
      },
      animate: {
        opacity,
        scale: 1,
        y: 0,
        filter: "blur(0px)",
      },
      exit: {
        opacity: 0,
        scale: 0.92,
        y: 40,
        filter: "blur(8px)",
      },
    },
    slide: {
      initial: { opacity: 0, x: "100%" },
      animate: { opacity, x: 0 },
      exit: { opacity: 0, x: "100%" },
    },
  };

  const preset = variants[transition];
  const animateTransition = transition === "depth" ? DEPTH_SPRING : FADE_SPRING;

  return (
    <FrameContext.Provider value={ctx}>
      <motion.div
        className={`absolute inset-0 ${className}`}
        style={{
          ...baseStyle,
          ...(cssTransform && !isReceding ? { transform: cssTransform } : {}),
        }}
        initial={preset.initial}
        animate={preset.animate}
        exit={preset.exit}
        transition={animateTransition}
        data-hologram-frame={layer}
        data-frame-label={label}
        data-frame-id={frameId}
      >
        {children}
      </motion.div>
    </FrameContext.Provider>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Overlay Frame — Triggers depth recession on lower layers ────────────────
// ══════════════════════════════════════════════════════════════════════════════

interface OverlayFrameProps extends Omit<HologramFrameProps, "layer" | "transition"> {
  /** Whether this overlay is open */
  open: boolean;
  /** Layer (default 3) */
  layer?: FrameLayer;
  /** Transition preset (default "depth") */
  transition?: "depth" | "slide" | "fade";
}

/**
 * Specialized frame for overlays that automatically triggers the
 * depth-recession effect on lower frames when opened.
 */
export function OverlayFrame({
  open,
  layer = 3,
  transition = "depth",
  children,
  ...rest
}: OverlayFrameProps) {
  const depthShift = useDepthShift();

  useEffect(() => {
    depthShift.setOverlayActive(open, layer);
    return () => {
      if (open) depthShift.setOverlayActive(false, layer);
    };
  }, [open, layer]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence>
      {open && (
        <HologramFrame
          layer={layer}
          transition={transition}
          recessOnOverlay={false}
          {...rest}
        >
          {children}
        </HologramFrame>
      )}
    </AnimatePresence>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Viewport Container ──────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

interface HologramViewportProps {
  children: ReactNode;
  className?: string;
}

/**
 * Root container for the frame stack.
 * Provides the DepthShift context that coordinates the cinematic
 * recession effect across all child frames.
 */
export function HologramViewport({ children, className = "" }: HologramViewportProps) {
  const [overlayActive, setOverlayActiveRaw] = useState(false);
  const [overlayLayer, setOverlayLayer] = useState(3);

  const setOverlayActive = useCallback((active: boolean, layer = 3) => {
    setOverlayActiveRaw(active);
    setOverlayLayer(layer);
  }, []);

  const depthState = useMemo<DepthShiftState>(
    () => ({ overlayActive, overlayLayer, setOverlayActive }),
    [overlayActive, overlayLayer, setOverlayActive],
  );

  return (
    <DepthShiftContext.Provider value={depthState}>
      <div
        className={`relative w-full h-full overflow-hidden ${className}`}
        style={{
          perspective: "1200px",
          perspectiveOrigin: "50% 50%",
          transformStyle: "preserve-3d",
        }}
      >
        {children}
      </div>
    </DepthShiftContext.Provider>
  );
}
