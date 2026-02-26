/**
 * FocusVignette — Universal "Tunnel Vision" Overlay
 * ══════════════════════════════════════════════════
 *
 * As aperture moves from diffuse (0) → focus (1), CSS custom
 * properties propagate to all descendants. A single `--focus-t`
 * value drives all derived properties via a batched rAF write.
 *
 * Performance: All 11 CSS vars are written in a single rAF
 * callback using cssText, producing exactly ONE style recalc
 * per animation frame instead of 11.
 *
 * @module hologram-ui/components/FocusVignette
 */

import { useEffect, useRef } from "react";
import { useAttentionMode } from "@/modules/hologram-ui/hooks/useAttentionMode";

/** Easing: slow start, accelerate mid-range, plateau at top */
function ease(t: number): number {
  return t < 0.3 ? 0 : Math.min(1, ((t - 0.3) / 0.7) ** 1.6);
}

/** All focus CSS properties derived from a single eased value */
function buildFocusVars(f: number, snr: number, gate: number, stratum: number): string {
  return [
    `--focus-t:${f}`,
    `--focus-chrome-opacity:${1 - f * 0.85}`,
    `--focus-vignette:${f}`,
    `--focus-contrast:${1 + f * 0.12}`,
    `--focus-content-scale:${1 + f * 0.015}`,
    `--focus-saturation:${1 - f * 0.2}`,
    `--focus-blur-chrome:${f * 4}px`,
    `--focus-dim-opacity:${1 - f * 0.6}`,
    `--focus-text-weight:${400 + f * 100}`,
    `--focus-snr:${snr.toFixed(2)}`,
    `--focus-gate:${gate.toFixed(2)}`,
    `--focus-stratum:${stratum.toFixed(2)}`,
  ].join(";");
}

const FOCUS_PROPS = [
  "--focus-t", "--focus-chrome-opacity", "--focus-vignette", "--focus-contrast",
  "--focus-content-scale", "--focus-saturation", "--focus-blur-chrome",
  "--focus-dim-opacity", "--focus-text-weight", "--focus-snr", "--focus-gate",
  "--focus-stratum",
];

export default function FocusVignette() {
  const { aperture, snr, distractionGate, observerStratum } = useAttentionMode();
  const rafRef = useRef<number>(0);
  const lastCssRef = useRef("");

  // Batch all CSS var updates into a single rAF write
  useEffect(() => {
    const f = ease(aperture);
    const css = buildFocusVars(f, snr, distractionGate, observerStratum);

    // Skip if nothing changed (memoized comparison)
    if (css === lastCssRef.current) return;

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const root = document.documentElement;
      // Single DOM write — sets all properties at once
      const existing = root.style.cssText;
      // Remove old focus vars, append new ones
      const cleaned = existing
        .split(";")
        .filter((s) => s.trim() && !s.trim().startsWith("--focus-"))
        .join(";");
      root.style.cssText = cleaned + (cleaned ? ";" : "") + css;
      lastCssRef.current = css;
    });

    return () => cancelAnimationFrame(rafRef.current);
  }, [aperture, snr, distractionGate, observerStratum]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      const root = document.documentElement;
      FOCUS_PROPS.forEach((p) => root.style.removeProperty(p));
    };
  }, []);

  const f = ease(aperture);
  if (f < 0.01) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 9999,
        transition: "opacity 800ms cubic-bezier(0.4, 0, 0.2, 1)",
        opacity: f,
        background: `radial-gradient(
          ellipse ${65 - f * 15}% ${60 - f * 12}% at 50% 50%,
          transparent 0%,
          transparent ${35 - f * 10}%,
          hsla(25, 10%, 4%, ${0.15 * f}) 55%,
          hsla(25, 10%, 3%, ${0.4 * f}) 75%,
          hsla(25, 10%, 2%, ${0.7 * f}) 100%
        )`,
      }}
      aria-hidden="true"
      data-uor-component="observer-vignette"
      data-uor-stratum={observerStratum.toFixed(2)}
      data-uor-snr={snr.toFixed(2)}
    />
  );
}
