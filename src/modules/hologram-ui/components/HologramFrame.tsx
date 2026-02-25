/**
 * HologramFrame — Composable Layer System
 * ════════════════════════════════════════
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
 * The frame system mirrors the UOR Frames concept: each frame is a
 * snapshot of visual state at a given depth, composable and streamable.
 *
 * @module hologram-ui/components/HologramFrame
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  type CSSProperties,
} from "react";

// ══════════════════════════════════════════════════════════════════════════════
// ── Transform3D — Future-ready spatial metadata ─────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 3D transform for a frame. Currently projected onto CSS transforms;
 * in a WebXR/Three.js backend, these map directly to Object3D properties.
 *
 * Units: position in viewport-relative units (vh/vw today, meters in VR).
 * Rotation in degrees. Scale is multiplicative (1 = identity).
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
 * This is the 2D projection of the 3D transform — the holographic encoding.
 * When the renderer upgrades to WebXR, this function is simply replaced
 * with a Three.js matrix setter; all frame metadata stays identical.
 */
function transform3DToCss(t: Transform3D): string {
  const [x, y, z] = t.position;
  const [rx, ry, rz] = t.rotation;
  const [sx, sy, sz] = t.scale;

  // Only emit transform if non-identity to avoid unnecessary GPU layers
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

/**
 * A serializable snapshot of a frame's state.
 * This IS the "frame" in the streaming/GPU sense: a discrete, hashable
 * unit of visual state that can be transmitted, cached, or resumed.
 *
 * In UOR terms: FrameDescriptor is the canonical form of visual state.
 * Hash it → content-address it → project it anywhere.
 */
export interface FrameDescriptor {
  /** Unique frame ID (auto-generated or user-supplied label) */
  id: string;
  /** Depth layer (0 = canvas, 1 = chrome, 2 = content, 3+ = overlays) */
  layer: number;
  /** Human-readable label for debugging / frame registry */
  label: string;
  /** 3D spatial transform */
  transform: Transform3D;
  /** Whether the frame accepts pointer events */
  interactive: boolean;
  /** Opacity (0–1) */
  opacity: number;
  /** Visibility — hidden frames skip rendering but stay in the registry */
  visible: boolean;
  /** Arbitrary metadata for domain-specific extensions */
  meta: Record<string, unknown>;
  /** Timestamp of last update (for temporal ordering in streams) */
  updatedAt: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Frame Registry — The Scene Graph ────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

/**
 * FrameRegistry — singleton scene graph of all active frames.
 *
 * This is the "frame buffer" of the hologram. Every HologramFrame
 * registers itself on mount and unregisters on unmount, giving us
 * a live, queryable inventory of the entire visual state.
 *
 * Why this matters for VR/streaming:
 *   1. A VR renderer can walk the registry and map each frame to
 *      a floating panel in 3D space — same data, different projection.
 *   2. A streaming encoder can serialize the registry to transmit
 *      the entire viewport state as a compact frame packet.
 *   3. Frame-level diffing: compare two registry snapshots to compute
 *      the minimal visual delta (like GPU frame diffing).
 */
class FrameRegistry {
  private frames = new Map<string, FrameDescriptor>();
  private listeners = new Set<(snapshot: FrameDescriptor[]) => void>();
  private nextId = 0;

  /** Generate a unique frame ID */
  generateId(label?: string): string {
    return label ? `frame:${label}:${this.nextId++}` : `frame:${this.nextId++}`;
  }

  /** Register or update a frame */
  upsert(descriptor: FrameDescriptor): void {
    this.frames.set(descriptor.id, { ...descriptor, updatedAt: Date.now() });
    this.notify();
  }

  /** Remove a frame */
  remove(id: string): void {
    this.frames.delete(id);
    this.notify();
  }

  /** Get all frames sorted by layer depth (ascending) */
  snapshot(): FrameDescriptor[] {
    return [...this.frames.values()].sort((a, b) => a.layer - b.layer);
  }

  /** Get frames at a specific layer */
  atLayer(layer: number): FrameDescriptor[] {
    return this.snapshot().filter((f) => f.layer === layer);
  }

  /** Get the topmost interactive frame */
  topInteractive(): FrameDescriptor | undefined {
    return [...this.frames.values()]
      .filter((f) => f.interactive && f.visible)
      .sort((a, b) => b.layer - a.layer)[0];
  }

  /** Count of active frames */
  get size(): number {
    return this.frames.size;
  }

  /** Subscribe to registry changes */
  subscribe(fn: (snapshot: FrameDescriptor[]) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /**
   * Serialize the entire registry to a JSON-serializable object.
   * This is the "dehydrated" form — hash it for content-addressing,
   * transmit it for streaming, store it for hibernation.
   */
  serialize(): { version: 1; timestamp: number; frames: FrameDescriptor[] } {
    return {
      version: 1,
      timestamp: Date.now(),
      frames: this.snapshot(),
    };
  }

  private notify(): void {
    const snap = this.snapshot();
    this.listeners.forEach((fn) => fn(snap));
  }
}

/** Singleton registry — the global scene graph */
export const frameRegistry = new FrameRegistry();

// ══════════════════════════════════════════════════════════════════════════════
// ── Z-Index Bands — 100 units apart for sub-layering ────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

const LAYER_BASE = 0;
const LAYER_BAND = 100;

export type FrameLayer = number; // 0, 1, 2, 3, …

// ══════════════════════════════════════════════════════════════════════════════
// ── Frame Context — Accessible from any child ───────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

interface FrameContextValue {
  /** Current frame's layer depth */
  layer: FrameLayer;
  /** Computed z-index for this layer */
  zIndex: number;
  /** The frame's descriptor in the registry */
  descriptor: FrameDescriptor;
  /** The global frame registry */
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

/** Access the current frame's layer info from any child */
export function useHologramFrame() {
  return useContext(FrameContext);
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Frame Component ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

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
  /** Frame label for debugging / frame registry */
  label?: string;
  /**
   * 3D transform. Currently projected to CSS; will map directly to
   * WebXR Object3D transforms when the renderer upgrades.
   */
  transform?: Transform3D;
  /** Opacity (0–1). Default: 1 */
  opacity?: number;
  /** Visibility — hidden frames stay in registry but skip rendering */
  visible?: boolean;
  /** Arbitrary metadata attached to the frame descriptor */
  meta?: Record<string, unknown>;
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
}: HologramFrameProps) {
  const zIndex = LAYER_BASE + layer * LAYER_BAND;
  const frameIdRef = useRef<string>("");

  // Stable frame ID across renders
  if (!frameIdRef.current) {
    frameIdRef.current = frameRegistry.generateId(label);
  }
  const frameId = frameIdRef.current;

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

  // Hidden frames stay in registry but don't render
  if (!visible) return null;

  const cssTransform = transform3DToCss(transform);

  return (
    <FrameContext.Provider value={ctx}>
      <div
        className={`absolute inset-0 ${className}`}
        style={{
          zIndex,
          pointerEvents: interactive ? "auto" : "none",
          opacity,
          transform: cssTransform || undefined,
          transformStyle: "preserve-3d",
          willChange: cssTransform ? "transform, opacity" : "opacity",
          ...style,
        }}
        data-hologram-frame={layer}
        data-frame-label={label}
        data-frame-id={frameId}
      >
        {children}
      </div>
    </FrameContext.Provider>
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
 * Creates the positioning context and perspective origin that all frames
 * layer within. The `perspective` value enables CSS 3D transforms today
 * and will be the camera FOV in a WebXR context.
 */
export function HologramViewport({ children, className = "" }: HologramViewportProps) {
  return (
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
  );
}
