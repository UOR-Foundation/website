/**
 * FocusVignette — Universal "Tunnel Vision" Overlay
 * ══════════════════════════════════════════════════
 *
 * Placed once at the app root (inside AttentionProvider).
 * As aperture moves from diffuse (0) → focus (1):
 *
 *   1. Radial vignette darkens the periphery (cinematic tunnel vision)
 *   2. CSS custom properties propagate to all descendants:
 *      --focus-chrome-opacity   (1 → 0)  — fade headers, sidebars, nav
 *      --focus-vignette         (0 → 1)  — vignette intensity
 *      --focus-contrast         (1 → 1.15) — text contrast boost
 *      --focus-content-scale    (1 → 1.02) — subtle zoom into content
 *      --focus-saturation       (1 → 0.85) — desaturate distractions
 *      --focus-blur-chrome      (0 → 4px) — blur non-essential chrome
 *
 *   The effect is entirely CSS-driven: any component can read these
 *   variables without importing this module. This makes it modality-
 *   agnostic — video, text, chat, canvas all benefit automatically.
 *
 * @module hologram-ui/components/FocusVignette
 */

import { useEffect } from "react";
import { useAttentionMode } from "@/modules/hologram-ui/hooks/useAttentionMode";

/** Easing: slow start, accelerate mid-range, plateau at top */
function ease(t: number): number {
  return t < 0.3 ? 0 : Math.min(1, ((t - 0.3) / 0.7) ** 1.6);
}

export default function FocusVignette() {
  const { aperture } = useAttentionMode();

  // Propagate CSS custom properties to :root
  useEffect(() => {
    const root = document.documentElement;
    const f = ease(aperture); // 0 when diffuse, ramps to 1 at focus

    root.style.setProperty("--focus-chrome-opacity", `${1 - f * 0.85}`);
    root.style.setProperty("--focus-vignette", `${f}`);
    root.style.setProperty("--focus-contrast", `${1 + f * 0.12}`);
    root.style.setProperty("--focus-content-scale", `${1 + f * 0.015}`);
    root.style.setProperty("--focus-saturation", `${1 - f * 0.2}`);
    root.style.setProperty("--focus-blur-chrome", `${f * 4}px`);
    root.style.setProperty("--focus-dim-opacity", `${1 - f * 0.6}`);
    root.style.setProperty("--focus-text-weight", `${400 + f * 100}`);

    return () => {
      // Clean up on unmount
      [
        "--focus-chrome-opacity", "--focus-vignette", "--focus-contrast",
        "--focus-content-scale", "--focus-saturation", "--focus-blur-chrome",
        "--focus-dim-opacity", "--focus-text-weight",
      ].forEach((p) => root.style.removeProperty(p));
    };
  }, [aperture]);

  const f = ease(aperture);

  // No overlay needed when fully diffuse
  if (f < 0.01) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 9999,
        transition: "opacity 800ms cubic-bezier(0.4, 0, 0.2, 1)",
        opacity: f,
        background: `radial-gradient(
          ellipse 65% 60% at 50% 50%,
          transparent 0%,
          transparent 35%,
          hsla(25, 10%, 4%, ${0.15 * f}) 55%,
          hsla(25, 10%, 3%, ${0.4 * f}) 75%,
          hsla(25, 10%, 2%, ${0.7 * f}) 100%
        )`,
      }}
      aria-hidden="true"
    />
  );
}
