/**
 * useTextSize — User text size preference
 * ════════════════════════════════════════
 *
 * KERNEL-PROJECTED: Text scale lives in KernelConfig.typography.userScale.
 * This hook reads from the kernel and applies the CSS attribute.
 * The kernel is the single source of truth.
 */

import { useCallback, useEffect } from "react";
import { useKernel } from "@/modules/hologram-os/hooks/useKernel";

export type TextSize = "compact" | "default" | "large";

const SCALE_MAP: Record<TextSize, number> = { compact: 0.9, default: 1.0, large: 1.15 };
const REVERSE_MAP: Record<number, TextSize> = { 0.9: "compact", 1.0: "default", 1.15: "large" };

function scaleToSize(scale: number): TextSize {
  if (scale <= 0.9) return "compact";
  if (scale >= 1.15) return "large";
  return "default";
}

function applyToDocument(size: TextSize) {
  const el = document.documentElement;
  if (size === "default") {
    el.removeAttribute("data-text-size");
  } else {
    el.setAttribute("data-text-size", size);
  }
}

export function useTextSize() {
  const k = useKernel();
  const textSize = scaleToSize(k.config.typography.userScale);

  // Apply CSS attribute whenever kernel config changes
  useEffect(() => {
    applyToDocument(textSize);
  }, [textSize]);

  const setTextSize = useCallback((size: TextSize) => {
    k.setUserScale(SCALE_MAP[size]);
  }, [k.setUserScale]);

  return { textSize, setTextSize };
}

/** Apply saved text size immediately on module load (flash prevention) */
(() => {
  if (typeof document === "undefined") return;
  try {
    const raw = localStorage.getItem("kernel:config");
    if (raw) {
      const config = JSON.parse(raw);
      const scale = config?.typography?.userScale;
      if (scale <= 0.9) document.documentElement.setAttribute("data-text-size", "compact");
      else if (scale >= 1.15) document.documentElement.setAttribute("data-text-size", "large");
    }
  } catch {}
})();
