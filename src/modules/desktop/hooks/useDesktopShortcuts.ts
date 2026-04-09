/**
 * useDesktopShortcuts — Global keyboard shortcuts for UOR OS.
 *
 * Uses a two-step "Ring" chord system to avoid browser shortcut conflicts.
 * Step 1: Press Ctrl+. (⌘. on Mac) to activate ring mode (1.5s window).
 * Step 2: Press a single key to dispatch the action.
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { useDesktopTheme, type DesktopTheme } from "@/modules/desktop/hooks/useDesktopTheme";
import { usePlatform } from "@/modules/desktop/hooks/usePlatform";

const THEME_ORDER: DesktopTheme[] = ["immersive", "dark", "light"];
const RING_TIMEOUT_MS = 1500;

export interface ShortcutHandlers {
  onSpotlight: () => void;
  onCloseWindow: () => void;
  onMinimizeWindow: () => void;
  onHideAll: () => void;
  onShowShortcuts?: () => void;
  onFullscreen?: () => void;
  onVoice?: () => void;
}

export function useDesktopShortcuts(handlers: ShortcutHandlers) {
  const { theme, setTheme } = useDesktopTheme();
  const { modKeyCode } = usePlatform();
  const [ringActive, setRingActive] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const deactivateRing = useCallback(() => {
    setRingActive(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const activateRing = useCallback(() => {
    setRingActive(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setRingActive(false);
      timeoutRef.current = null;
    }, RING_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Step 1: Activate ring with Ctrl/⌘ + .
      if (e[modKeyCode] && e.key === ".") {
        e.preventDefault();
        e.stopPropagation();
        activateRing();
        return;
      }

      // Escape cancels ring
      if (e.key === "Escape" && ringActive) {
        deactivateRing();
        return;
      }

      // Step 2: If ring is active, dispatch on single key (no modifier needed)
      if (!ringActive) return;

      const key = e.key.toLowerCase();
      let handled = true;

      switch (key) {
        case "k":
          handlersRef.current.onSpotlight();
          break;
        case "w":
          handlersRef.current.onCloseWindow();
          break;
        case "m":
          handlersRef.current.onMinimizeWindow();
          break;
        case "h":
          handlersRef.current.onHideAll();
          break;
        case "[":
          { const idx = THEME_ORDER.indexOf(theme);
            const prev = (idx - 1 + THEME_ORDER.length) % THEME_ORDER.length;
            setTheme(THEME_ORDER[prev]); }
          break;
        case "]":
          { const idx = THEME_ORDER.indexOf(theme);
            const next = (idx + 1) % THEME_ORDER.length;
            setTheme(THEME_ORDER[next]); }
          break;
        case "v":
          handlersRef.current.onVoice?.();
          break;
        case "f":
          handlersRef.current.onFullscreen?.();
          break;
        case "?":
        case "/":
          handlersRef.current.onShowShortcuts?.();
          break;
        default:
          handled = false;
      }

      if (handled) {
        e.preventDefault();
        e.stopPropagation();
        deactivateRing();
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [ringActive, theme, setTheme, modKeyCode, activateRing, deactivateRing]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { ringActive };
}
