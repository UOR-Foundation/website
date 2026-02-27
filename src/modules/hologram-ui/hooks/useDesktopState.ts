/**
 * useDesktopState — Per-desktop widget persistence
 * ══════════════════════════════════════════════════
 *
 * Each "desktop" (Landscape / Light / Dark) maintains independent
 * widget visibility and positions via localStorage. Switching desktops
 * instantly reveals a fully pre-configured environment.
 */

import { useState, useCallback } from "react";

export type DesktopId = "image" | "white" | "dark";

interface DesktopWidgetState {
  hiddenWidgets: string[];
  allHidden: boolean;
}

const STORAGE_KEY = "hologram-desktop-widgets";

function loadAll(): Record<DesktopId, DesktopWidgetState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    image: { hiddenWidgets: [], allHidden: false },
    white: { hiddenWidgets: [], allHidden: false },
    dark:  { hiddenWidgets: [], allHidden: false },
  };
}

function saveAll(state: Record<DesktopId, DesktopWidgetState>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useDesktopState(desktopId: DesktopId) {
  const [allState, setAllState] = useState(loadAll);
  const state = allState[desktopId];

  const removeWidget = useCallback((id: string) => {
    setAllState(prev => {
      const desktop = prev[desktopId];
      const next = {
        ...prev,
        [desktopId]: {
          ...desktop,
          hiddenWidgets: [...new Set([...desktop.hiddenWidgets, id])],
        },
      };
      saveAll(next);
      return next;
    });
  }, [desktopId]);

  const toggleAllWidgets = useCallback(() => {
    setAllState(prev => {
      const next = {
        ...prev,
        [desktopId]: { ...prev[desktopId], allHidden: !prev[desktopId].allHidden },
      };
      saveAll(next);
      return next;
    });
  }, [desktopId]);

  const isWidgetVisible = useCallback(
    (id: string) => !state.allHidden && !state.hiddenWidgets.includes(id),
    [state],
  );

  return {
    hiddenWidgets: new Set(state.hiddenWidgets),
    allHidden: state.allHidden,
    removeWidget,
    toggleAllWidgets,
    isWidgetVisible,
    setAllHidden: useCallback((v: boolean) => {
      setAllState(prev => {
        const next = { ...prev, [desktopId]: { ...prev[desktopId], allHidden: v } };
        saveAll(next);
        return next;
      });
    }, [desktopId]),
  };
}
