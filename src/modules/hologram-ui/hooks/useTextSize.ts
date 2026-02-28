/**
 * useTextSize — User text size preference
 * ════════════════════════════════════════
 *
 * The system attends to the human's visual needs.
 * Three levels: compact (0.9×), default (1.0×), large (1.15×).
 * Applied via data-text-size attribute on <html> for zero-JS CSS scaling.
 * Persisted to localStorage, synced to profile in Phase 4.
 */

import { useState, useCallback, useEffect } from "react";

export type TextSize = "compact" | "default" | "large";

const STORAGE_KEY = "hologram-text-size";

function loadTextSize(): TextSize {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "compact" || saved === "default" || saved === "large") return saved;
  } catch {}
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
  const [textSize, setTextSizeState] = useState<TextSize>(loadTextSize);

  // Apply on mount (before first paint if possible)
  useEffect(() => {
    applyToDocument(textSize);
  }, [textSize]);

  const setTextSize = useCallback((size: TextSize) => {
    setTextSizeState(size);
    applyToDocument(size);
    try {
      localStorage.setItem(STORAGE_KEY, size);
    } catch {}
  }, []);

  return { textSize, setTextSize };
}

/** Apply saved text size immediately on module load (flash prevention) */
(() => {
  if (typeof document === "undefined") return;
  const saved = loadTextSize();
  if (saved !== "default") {
    document.documentElement.setAttribute("data-text-size", saved);
  }
})();
