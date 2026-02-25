/**
 * useLayerNav — Keyboard navigation between hologram frame layers
 * ═══════════════════════════════════════════════════════════════
 *
 * Cmd/Ctrl + 1/2/3 focuses a specific layer, dimming all others.
 * Pressing the same shortcut again or Escape returns to normal view.
 * Previews future multi-dimensional spatial navigation.
 */

import { useEffect, useState, useCallback } from "react";

export interface LayerNavState {
  /** Currently focused layer, or null if viewing all */
  focusedLayer: number | null;
  /** Whether a specific layer is dimmed (not focused) */
  isDimmed: (layer: number) => boolean;
  /** Whether a specific layer is the focused one */
  isFocused: (layer: number) => boolean;
  /** Opacity multiplier for a given layer */
  layerOpacity: (layer: number) => number;
  /** Scale multiplier for a given layer */
  layerScale: (layer: number) => number;
  /** Programmatic focus */
  setFocus: (layer: number | null) => void;
}

const LAYER_LABELS: Record<number, string> = {
  0: "Canvas",
  1: "Chrome",
  2: "Content",
  3: "Overlay",
};

export function getLayerLabel(layer: number): string {
  return LAYER_LABELS[layer] ?? `Layer ${layer}`;
}

export function useLayerNav(): LayerNavState {
  const [focusedLayer, setFocusedLayer] = useState<number | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd/Ctrl + 1/2/3
      if (!(e.metaKey || e.ctrlKey)) return;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 9) {
        e.preventDefault();
        const layer = num - 1; // Cmd+1 → layer 0, Cmd+2 → layer 1, etc.
        setFocusedLayer((prev) => (prev === layer ? null : layer));
      }
      if (e.key === "Escape") {
        setFocusedLayer(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const isDimmed = useCallback(
    (layer: number) => focusedLayer !== null && focusedLayer !== layer,
    [focusedLayer],
  );

  const isFocused = useCallback(
    (layer: number) => focusedLayer === layer,
    [focusedLayer],
  );

  const layerOpacity = useCallback(
    (layer: number) => {
      if (focusedLayer === null) return 1;
      return focusedLayer === layer ? 1 : 0.15;
    },
    [focusedLayer],
  );

  const layerScale = useCallback(
    (layer: number) => {
      if (focusedLayer === null) return 1;
      if (focusedLayer === layer) return 1;
      // Layers below focused recede back, above come forward
      const diff = layer - focusedLayer;
      return diff < 0 ? 0.95 : 0.97;
    },
    [focusedLayer],
  );

  return {
    focusedLayer,
    isDimmed,
    isFocused,
    layerOpacity,
    layerScale,
    setFocus: setFocusedLayer,
  };
}
