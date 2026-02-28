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
// Surface Adapter — maps kernel frames to DOM mutations
// ═══════════════════════════════════════════════════════════════════════

export class BrowserSurfaceAdapter {
  private lastTypography: TypographyProjection | null = null;
  private lastPalette: PaletteProjection | null = null;

  /**
   * Apply a projection frame to the browser DOM.
   *
   * This is the translation layer: kernel algebra → CSS variables.
   * Called on every frame emission from the KernelProjector.
   */
  applyFrame(frame: ProjectionFrame): void {
    this.applyTypography(frame.typography);
    this.applyPalette(frame.palette);
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

    // Map user scale to data attribute for CSS selector matching
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

    // Palette mode is handled by the desktop frame system
    // (image/white/dark) — this just ensures consistency
    this.lastPalette = palette;
  }

  /**
   * Determine which panels should be visible based on
   * coherence-priority rendering.
   *
   * High-H-score panels get rendered first. If the viewport
   * is constrained, low-coherence panels are hidden to protect
   * the human's attention.
   */
  resolveVisiblePanels(
    panels: readonly PanelProjection[],
    maxVisible?: number,
  ): PanelProjection[] {
    // Panels already sorted by renderPriority (high first)
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
