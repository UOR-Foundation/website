/**
 * useDesktopShortcuts — Global keyboard shortcuts for UOR OS.
 *
 * Theme cycling: Ctrl/⌘ + [ (previous) / ] (next)
 */

import { useEffect } from "react";
import { useDesktopTheme, type DesktopTheme } from "@/modules/desktop/hooks/useDesktopTheme";

const THEME_ORDER: DesktopTheme[] = ["immersive", "dark", "light"];

interface Handlers {
  onSpotlight: () => void;
  onCloseWindow: () => void;
  onMinimizeWindow: () => void;
  onHideAll: () => void;
}

export function useDesktopShortcuts(handlers: Handlers) {
  const { theme, setTheme } = useDesktopTheme();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;

      if (e.key === "k") {
        e.preventDefault();
        handlers.onSpotlight();
      } else if (e.key === "w") {
        e.preventDefault();
        handlers.onCloseWindow();
      } else if (e.key === "m") {
        e.preventDefault();
        handlers.onMinimizeWindow();
      } else if (e.key === "h") {
        e.preventDefault();
        handlers.onHideAll();
      } else if (e.key === "[") {
        e.preventDefault();
        const idx = THEME_ORDER.indexOf(theme);
        const prev = (idx - 1 + THEME_ORDER.length) % THEME_ORDER.length;
        setTheme(THEME_ORDER[prev]);
      } else if (e.key === "]") {
        e.preventDefault();
        const idx = THEME_ORDER.indexOf(theme);
        const next = (idx + 1) % THEME_ORDER.length;
        setTheme(THEME_ORDER[next]);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handlers, theme, setTheme]);
}
