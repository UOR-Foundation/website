/**
 * useScreenTheme — Cascading theme for Hologram screens
 * ═════════════════════════════════════════════════════════
 *
 * Resolves the effective theme for a screen (messenger, browser, etc.):
 *
 * 1. If the portal is in "white" mode → screen defaults to "light"
 * 2. If the portal is in "dark" mode  → screen defaults to "dark"
 * 3. If the portal is in "image" mode → screen uses its own saved preference
 * 4. User can always override locally; that override persists per-screen
 *
 * The local override only takes effect when the portal is in "image" mode.
 * In white/dark modes, the portal's choice cascades down automatically.
 *
 * @module hologram-ui/hooks/useScreenTheme
 */

import { useState, useCallback, useEffect, useMemo } from "react";

export type ScreenTheme = "light" | "dark";

interface UseScreenThemeOptions {
  /** Unique key for this screen, e.g. "messenger", "browser" */
  screenId: string;
  /** Default theme when no preference is saved and portal is in image mode */
  fallback?: ScreenTheme;
}

function getPortalMode(): "image" | "white" | "dark" {
  const saved = localStorage.getItem("hologram-bg-mode");
  if (saved === "white" || saved === "dark") return saved;
  return "image";
}

export function useScreenTheme({ screenId, fallback = "dark" }: UseScreenThemeOptions) {
  const storageKey = `hologram-screen-theme:${screenId}`;

  const [portalMode, setPortalMode] = useState(getPortalMode);

  // Saved local preference for this screen (used when portal is in "image" mode)
  const [localPref, setLocalPref] = useState<ScreenTheme>(() => {
    const saved = localStorage.getItem(storageKey);
    return saved === "light" || saved === "dark" ? saved : fallback;
  });

  // Sync portal mode from localStorage (covers changes from other components)
  useEffect(() => {
    const sync = () => setPortalMode(getPortalMode());
    window.addEventListener("storage", sync);
    // Also poll infrequently since same-tab localStorage writes don't fire "storage"
    const id = setInterval(sync, 500);
    return () => { window.removeEventListener("storage", sync); clearInterval(id); };
  }, []);

  // Effective theme: portal cascades in white/dark; local pref used in image mode
  const mode: ScreenTheme = useMemo(() => {
    if (portalMode === "white") return "light";
    if (portalMode === "dark") return "dark";
    return localPref; // image mode → user's own preference
  }, [portalMode, localPref]);

  // Whether the user can toggle (only in image mode; white/dark are locked to portal)
  const canToggle = portalMode === "image";

  const toggle = useCallback(() => {
    setLocalPref(prev => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem(storageKey, next);
      return next;
    });
  }, [storageKey]);

  return { mode, toggle, canToggle };
}
