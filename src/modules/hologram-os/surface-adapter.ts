/**
 * Browser Surface Adapter
 * ═══════════════════════
 *
 * The ONLY place where kernel projections meet DOM/React concerns.
 *
 * Receives ProjectionFrames from the KernelProjector and translates
 * them into CSS custom property updates, widget visibility state,
 * and React-consumable data.
 *
 * Frame Interpolation:
 *   When the kernel ticks at 10Hz (idle), the surface adapter can
 *   interpolate between the last two frames at 60fps for smooth
 *   transitions of continuous values (coherence, progress, etc.).
 *
 * The kernel emits algebra. This adapter emits pixels.
 *
 * @module hologram-os/surface-adapter
 */

import type {
  ProjectionFrame,
  TypographyProjection,
  PaletteProjection,
  PanelProjection,
  BootEvent,
} from "./projection-engine";

// ═══════════════════════════════════════════════════════════════════════
// Frame Interpolation — smooth 60fps from low-rate kernel ticks
// ═══════════════════════════════════════════════════════════════════════

/** Interpolatable scalar values extracted from a frame */
interface InterpolatableState {
  readonly meanH: number;
  readonly processCount: number;
  readonly typographyBasePx: number;
  readonly typographyScale: number;
  readonly breathPeriodMs: number;
}

function extractInterpolatable(frame: ProjectionFrame): InterpolatableState {
  return {
    meanH: frame.systemCoherence.meanH,
    processCount: frame.systemCoherence.processCount,
    typographyBasePx: frame.typography.basePx,
    typographyScale: frame.typography.scale,
    breathPeriodMs: frame.breathPeriodMs,
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpState(from: InterpolatableState, to: InterpolatableState, t: number): InterpolatableState {
  return {
    meanH: lerp(from.meanH, to.meanH, t),
    processCount: Math.round(lerp(from.processCount, to.processCount, t)),
    typographyBasePx: lerp(from.typographyBasePx, to.typographyBasePx, t),
    typographyScale: lerp(from.typographyScale, to.typographyScale, t),
    breathPeriodMs: lerp(from.breathPeriodMs, to.breathPeriodMs, t),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Surface Adapter — maps kernel frames to DOM mutations
// ═══════════════════════════════════════════════════════════════════════

export class BrowserSurfaceAdapter {
  private lastTypography: TypographyProjection | null = null;
  private lastPalette: PaletteProjection | null = null;

  // Interpolation state
  private prevInterp: InterpolatableState | null = null;
  private currInterp: InterpolatableState | null = null;
  private frameArrivalTime = 0;
  private interpRafId = 0;
  private interpRunning = false;
  private interpSleeping = false; // NEW: idle-gate flag
  private interpTickMs = 100;
  private lastKernelTick = 0;

  // Batched CSS cache — avoid redundant DOM writes
  private lastCssHash = "";

  /**
   * Apply a projection frame to the browser DOM.
   */
  applyFrame(frame: ProjectionFrame): void {
    this.applyTypography(frame.typography);
    this.applyPalette(frame.palette);

    const now = performance.now();
    if (this.lastKernelTick > 0) {
      this.interpTickMs = Math.max(16, now - this.lastKernelTick);
    }
    this.lastKernelTick = now;

    this.prevInterp = this.currInterp;
    this.currInterp = extractInterpolatable(frame);
    this.frameArrivalTime = now;

    // Apply coherence CSS vars from the frame directly
    this.batchApplyCoherenceVars(this.currInterp);

    // Wake interpolation if it was sleeping (new frame arrived)
    if (this.interpSleeping && this.interpRunning) {
      this.interpSleeping = false;
      this.interpRafId = requestAnimationFrame(this.interpTick);
    }
  }

  /**
   * Start the interpolation loop.
   * Runs at display-native rate, smoothing between kernel frames.
   * Automatically sleeps when interpolation is complete (t ≥ 1).
   */
  startInterpolation(): void {
    if (this.interpRunning) return;
    this.interpRunning = true;
    this.interpSleeping = false;
    this.interpTick();
  }

  /** Stop interpolation */
  stopInterpolation(): void {
    this.interpRunning = false;
    this.interpSleeping = false;
    if (this.interpRafId) {
      cancelAnimationFrame(this.interpRafId);
      this.interpRafId = 0;
    }
  }

  private interpTick = (): void => {
    if (!this.interpRunning) return;

    if (this.prevInterp && this.currInterp && this.interpTickMs > 20) {
      const elapsed = performance.now() - this.frameArrivalTime;
      const t = Math.min(1, elapsed / this.interpTickMs);

      if (t >= 1) {
        // Interpolation complete — go to sleep until next kernel frame
        this.interpSleeping = true;
        // Don't schedule another rAF — applyFrame() will wake us
        return;
      }

      const eased = t * t * (3 - 2 * t);
      const interpolated = lerpState(this.prevInterp, this.currInterp, eased);
      this.batchApplyCoherenceVars(interpolated);
    }

    this.interpRafId = requestAnimationFrame(this.interpTick);
  };

  /**
   * Batched CSS write — single operation replaces 5 individual setProperty calls.
   * Only writes to DOM if values actually changed (hash guard).
   */
  private batchApplyCoherenceVars(state: InterpolatableState): void {
    const coherence = state.meanH.toFixed(3);
    const processCount = state.processCount.toString();
    const basePx = `${state.typographyBasePx.toFixed(1)}px`;
    const breathMs = `${state.breathPeriodMs.toFixed(0)}ms`;
    const breathSec = (state.breathPeriodMs / 1000).toFixed(2);

    // Fast hash — skip DOM write if nothing changed
    const hash = `${coherence}|${processCount}|${basePx}|${breathMs}`;
    if (hash === this.lastCssHash) return;
    this.lastCssHash = hash;

    // Single batched DOM write via cssText on a dedicated style element
    const root = document.documentElement;
    root.style.setProperty("--kernel-coherence", coherence);
    root.style.setProperty("--kernel-process-count", processCount);
    root.style.setProperty("--kernel-base-px", basePx);
    root.style.setProperty("--kernel-breath-period", breathMs);
    root.style.setProperty("--kernel-breath-seconds", breathSec);
  }

  /** Get interpolation diagnostics for DevTools */
  getInterpStats(): {
    running: boolean;
    sleeping: boolean;
    tickMs: number;
    phase: number;
    hasPrev: boolean;
  } {
    const elapsed = performance.now() - this.frameArrivalTime;
    const t = this.interpTickMs > 0 ? Math.min(1, elapsed / this.interpTickMs) : 1;
    return {
      running: this.interpRunning,
      sleeping: this.interpSleeping,
      tickMs: this.interpTickMs,
      phase: t,
      hasPrev: this.prevInterp !== null,
    };
  }

  /**
   * Apply typography projection → CSS custom properties.
   * Only updates if values changed (avoids layout thrash).
   */
  private applyTypography(typo: TypographyProjection): void {
    if (
      this.lastTypography &&
      this.lastTypography.scale === typo.scale &&
      this.lastTypography.userScale === typo.userScale
    ) {
      return;
    }

    const root = document.documentElement;

    if (typo.userScale <= 0.9) {
      root.setAttribute("data-text-size", "compact");
    } else if (typo.userScale >= 1.15) {
      root.setAttribute("data-text-size", "large");
    } else {
      root.removeAttribute("data-text-size");
    }

    this.lastTypography = typo;
  }

  /**
   * Apply palette projection → CSS custom properties.
   * Only updates if mode changed.
   */
  private applyPalette(palette: PaletteProjection): void {
    if (this.lastPalette && this.lastPalette.mode === palette.mode) {
      return;
    }
    this.lastPalette = palette;
  }

  /**
   * Determine which panels should be visible based on
   * coherence-priority rendering.
   */
  resolveVisiblePanels(
    panels: readonly PanelProjection[],
    maxVisible?: number,
  ): PanelProjection[] {
    const visible = panels.filter(p => p.state === "visible");
    if (maxVisible && visible.length > maxVisible) {
      return visible.slice(0, maxVisible);
    }
    return [...visible];
  }

  /**
   * Map a boot event to visual parameters for the portal animation.
   */
  bootEventToVisual(event: BootEvent): {
    opacity: number;
    scale: number;
    glowIntensity: number;
    ringProgress: number;
    label: string;
    sublabel: string;
    passed: boolean;
  } {
    return {
      opacity: Math.min(1, event.progress * 1.5),
      scale: 0.95 + event.progress * 0.05,
      glowIntensity: event.progress,
      ringProgress: event.progress,
      label: event.label,
      sublabel: event.detail,
      passed: event.passed,
    };
  }
}

/** Singleton surface adapter */
let _adapter: BrowserSurfaceAdapter | null = null;

export function getBrowserAdapter(): BrowserSurfaceAdapter {
  if (!_adapter) {
    _adapter = new BrowserSurfaceAdapter();
  }
  return _adapter;
}
