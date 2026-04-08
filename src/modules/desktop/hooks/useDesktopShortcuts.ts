/**
 * useDesktopShortcuts — Global keyboard shortcuts for UOR OS.
 */

import { useEffect } from "react";

interface Handlers {
  onSpotlight: () => void;
  onCloseWindow: () => void;
  onMinimizeWindow: () => void;
  onHideAll: () => void;
}

export function useDesktopShortcuts(handlers: Handlers) {
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
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handlers]);
}
