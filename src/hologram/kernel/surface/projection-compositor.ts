/**
 * ProjectionCompositor — Multi-Kernel Frame Merger
 * ═════════════════════════════════════════════════
 *
 * Merges multiple child kernel ProjectionFrames into a unified
 * composite view. Frames are Z-ordered by H-score: the most
 * coherent kernel gets visual priority (foreground).
 *
 * The compositor implements the holographic principle at the
 * multi-process level: N kernels → 1 composite surface.
 *
 * Architecture:
 *   ChildKernel₁.frame ─┐
 *   ChildKernel₂.frame ─┤→ ProjectionCompositor → CompositeFrame → Surface
 *   ChildKernel₃.frame ─┘
 *
 * Composition rules:
 *   1. Panels: union of all child panels, sorted by global H-score
 *   2. Processes: union of all child processes with kernel-prefixed PIDs
 *   3. Observables: merged, deduplicated by ID
 *   4. Coherence: weighted mean across children (weight = Z-order)
 *   5. Typography/Palette: inherited from foreground kernel
 *
 * @module hologram/kernel/projection-compositor
 */

import type {
  ChildKernel,
  ChildKernelFrame,
  SupervisorProjection,
} from "./kernel-supervisor";
import { getKernelSupervisor, type KernelSupervisor } from "./kernel-supervisor";
import { classifyZone, type CoherenceZone } from "../kernel/q-sched";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

/** A single layer in the composite frame */
export interface CompositeLayer {
  readonly kernelId: string;
  readonly kernelName: string;
  readonly role: string;
  readonly zOrder: number;
  readonly hScore: number;
  readonly zone: CoherenceZone;
  readonly opacity: number;      // Derived from Z-order position
  readonly frameAge: number;     // ms since last frame
  readonly processCount: number;
}

/** The fully composed frame across all child kernels */
export interface CompositeFrame {
  readonly timestamp: number;
  readonly layers: readonly CompositeLayer[];
  readonly totalKernels: number;
  readonly activeKernels: number;
  readonly compositeH: number;
  readonly compositeZone: CoherenceZone;
  readonly foregroundKernel: string | null;
  readonly supervisor: SupervisorProjection;
}

/** Compositor projection — the UI-facing view */
export interface CompositorProjection {
  /** Whether the compositor is active (has >0 child kernels) */
  readonly active: boolean;
  /** Total child kernel count */
  readonly kernelCount: number;
  /** Active (running + idle) kernel count */
  readonly activeCount: number;
  /** Composite H-score (weighted mean) */
  readonly compositeH: number;
  /** Composite coherence zone */
  readonly zone: CoherenceZone;
  /** Foreground kernel name (highest H-score) */
  readonly foreground: string;
  /** Layer summaries (Z-ordered, foreground first) */
  readonly layers: readonly {
    readonly name: string;
    readonly role: string;
    readonly hScore: number;
    readonly zone: CoherenceZone;
  }[];
  /** Supervisor health */
  readonly health: number;
  /** Total frames composed */
  readonly totalFrames: number;
}

// ═══════════════════════════════════════════════════════════════════════
// ProjectionCompositor
// ═══════════════════════════════════════════════════════════════════════

export class ProjectionCompositor {
  private supervisor: KernelSupervisor;
  private lastComposite: CompositeFrame | null = null;
  private listeners = new Set<(frame: CompositeFrame) => void>();

  constructor(supervisor?: KernelSupervisor) {
    this.supervisor = supervisor ?? getKernelSupervisor();
  }

  /**
   * Compose a unified frame from all active child kernels.
   * Called each tick from the parent kernel's projection loop.
   */
  compose(): CompositeFrame {
    const supervisorProj = this.supervisor.tick();
    const zOrdered = this.supervisor.getZOrderedChildren();
    const now = Date.now();

    // Build layers from Z-ordered children
    const layers: CompositeLayer[] = zOrdered.map((child, idx) => ({
      kernelId: child.id,
      kernelName: child.name,
      role: child.role,
      zOrder: child.zOrder,
      hScore: child.hScore,
      zone: child.zone,
      opacity: this.computeLayerOpacity(idx, zOrdered.length),
      frameAge: child.lastFrameAt > 0 ? now - child.lastFrameAt : Infinity,
      processCount: child.lastFrame?.processCount ?? 0,
    }));

    // Weighted mean H-score (foreground kernels contribute more)
    let weightedH = 0;
    let totalWeight = 0;
    for (const layer of layers) {
      const weight = layer.zOrder;
      weightedH += layer.hScore * weight;
      totalWeight += weight;
    }
    const compositeH = totalWeight > 0 ? weightedH / totalWeight : 0;

    const composite: CompositeFrame = {
      timestamp: now,
      layers,
      totalKernels: supervisorProj.totalKernels,
      activeKernels: supervisorProj.runningKernels,
      compositeH,
      compositeZone: classifyZone(compositeH),
      foregroundKernel: zOrdered.length > 0 ? zOrdered[0].id : null,
      supervisor: supervisorProj,
    };

    this.lastComposite = composite;
    for (const cb of this.listeners) cb(composite);

    return composite;
  }

  /** Get the compositor projection for UI consumption */
  project(): CompositorProjection {
    const composite = this.lastComposite;
    if (!composite || composite.totalKernels === 0) {
      return {
        active: false,
        kernelCount: 0,
        activeCount: 0,
        compositeH: 0,
        zone: "convergent",
        foreground: "",
        layers: [],
        health: 1,
        totalFrames: 0,
      };
    }

    const foregroundChild = composite.foregroundKernel
      ? this.supervisor.getChild(composite.foregroundKernel)
      : null;

    return {
      active: true,
      kernelCount: composite.totalKernels,
      activeCount: composite.activeKernels,
      compositeH: composite.compositeH,
      zone: composite.compositeZone,
      foreground: foregroundChild?.name ?? "",
      layers: composite.layers.map(l => ({
        name: l.kernelName,
        role: l.role,
        hScore: l.hScore,
        zone: l.zone,
      })),
      health: composite.supervisor.health,
      totalFrames: composite.supervisor.totalFramesComposed,
    };
  }

  /** Subscribe to composite frames */
  onComposite(cb: (frame: CompositeFrame) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /** Get the last composite frame */
  getLastComposite(): CompositeFrame | null {
    return this.lastComposite;
  }

  /** Get the supervisor instance */
  getSupervisor(): KernelSupervisor {
    return this.supervisor;
  }

  // ── Internal ────────────────────────────────────────────────────────

  /**
   * Compute layer opacity based on Z-order position.
   * Foreground (idx=0) = 1.0, each successive layer fades.
   * Uses exponential decay: opacity = 0.3 + 0.7 × e^(-idx × 0.5)
   */
  private computeLayerOpacity(idx: number, total: number): number {
    if (total <= 1) return 1;
    return 0.3 + 0.7 * Math.exp(-idx * 0.5);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════════════

let _compositor: ProjectionCompositor | null = null;

/** Get the singleton projection compositor */
export function getProjectionCompositor(): ProjectionCompositor {
  if (!_compositor) {
    _compositor = new ProjectionCompositor();
  }
  return _compositor;
}
