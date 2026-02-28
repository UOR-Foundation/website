/**
 * useScreenTheme — Cascading theme for Hologram screens
 * ═════════════════════════════════════════════════════════
 *
 * KERNEL-PROJECTED: Reads desktop mode from the kernel projection
 * instead of polling localStorage. The kernel is the single source
 * of truth for which desktop frame is active.
 *
 * Resolves the effective theme for a screen (messenger, browser, etc.):
 *   1. If kernel palette is "white" → screen defaults to "light"
 *   2. If kernel palette is "dark"  → screen defaults to "dark"
 *   3. If kernel palette is "image" → screen uses its own saved preference
 *   4. User can always override locally in image mode
 *
 * @module hologram-ui/hooks/useScreenTheme
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { getKernelProjector } from "@/modules/hologram-os/projection-engine";

export type ScreenTheme = "light" | "dark";

interface UseScreenThemeOptions {
  /** Unique key for this screen, e.g. "messenger", "browser" */
  screenId: string;
  /** Default theme when no preference is saved and portal is in image mode */
  fallback?: ScreenTheme;
}

export function useScreenTheme({ screenId, fallback = "dark" }: UseScreenThemeOptions) {
  const projector = getKernelProjector();

  // Read desktop mode from kernel (single source of truth)
  const [portalMode, setPortalMode] = useState<"image" | "white" | "dark">(() => {
    const mode = projector.getDesktopMode();
    if (mode === "white" || mode === "dark") return mode;
    return "image";
  });

  // Subscribe to kernel frames for desktop mode changes
  useEffect(() => {
    const unsub = projector.onFrame((frame) => {
      const mode = frame.palette.mode;
      if (mode === "white" || mode === "dark") {
        setPortalMode(mode);
      } else {
        setPortalMode("image");
      }
    });
    return unsub;
  }, [projector]);

  // Per-screen local preference (only used in image mode)
  // This is screen-local UI preference, not kernel-level state
  const storageKey = `hologram-screen-theme:${screenId}`;
  const [localPref, setLocalPref] = useState<ScreenTheme>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved === "light" || saved === "dark" ? saved : fallback;
    } catch {
      return fallback;
    }
  });

  // Effective theme: portal cascades in white/dark; local pref used in image mode
  const mode: ScreenTheme = useMemo(() => {
    if (portalMode === "white") return "light";
    if (portalMode === "dark") return "dark";
    return localPref;
  }, [portalMode, localPref]);

  const canToggle = portalMode === "image";

  const toggle = useCallback(() => {
    setLocalPref(prev => {
      const next = prev === "dark" ? "light" : "dark";
      try { localStorage.setItem(storageKey, next); } catch {}
      return next;
    });
  }, [storageKey]);

  return { mode, toggle, canToggle };
}
