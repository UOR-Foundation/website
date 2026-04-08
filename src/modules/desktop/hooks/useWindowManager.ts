import { useState, useCallback, useRef } from "react";

export interface WindowState {
  id: string;
  appId: string;
  title: string;
  position: { x: number; y: number };
  size: { w: number; h: number };
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
}

const STORAGE_KEY = "uor:desktop-windows";
const MIN_W = 420;
const MIN_H = 320;

let zCounter = 10;

function loadWindows(): WindowState[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveWindows(windows: WindowState[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(windows));
  } catch {}
}

export function useWindowManager() {
  const [windows, setWindows] = useState<WindowState[]>(loadWindows);
  const nextZ = useRef(zCounter);

  const persist = (ws: WindowState[]) => {
    setWindows(ws);
    saveWindows(ws);
  };

  const getNextZ = () => {
    nextZ.current += 1;
    return nextZ.current;
  };

  const openApp = useCallback((appId: string, title: string, defaultSize?: { w: number; h: number }) => {
    setWindows(prev => {
      const existing = prev.find(w => w.appId === appId);
      if (existing) {
        // Focus / un-minimize existing
        const z = ++nextZ.current;
        const next = prev.map(w =>
          w.id === existing.id ? { ...w, minimized: false, zIndex: z } : w
        );
        saveWindows(next);
        return next;
      }
      const offsetIndex = prev.length % 8;
      const newWin: WindowState = {
        id: `${appId}-${Date.now()}`,
        appId,
        title,
        position: { x: 80 + offsetIndex * 30, y: 60 + offsetIndex * 30 },
        size: defaultSize || { w: 800, h: 540 },
        zIndex: ++nextZ.current,
        minimized: false,
        maximized: false,
      };
      const next = [...prev, newWin];
      saveWindows(next);
      return next;
    });
  }, []);

  const closeWindow = useCallback((id: string) => {
    setWindows(prev => {
      const next = prev.filter(w => w.id !== id);
      saveWindows(next);
      return next;
    });
  }, []);

  const focusWindow = useCallback((id: string) => {
    setWindows(prev => {
      const z = ++nextZ.current;
      const next = prev.map(w => w.id === id ? { ...w, zIndex: z } : w);
      saveWindows(next);
      return next;
    });
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows(prev => {
      const next = prev.map(w => w.id === id ? { ...w, minimized: true } : w);
      saveWindows(next);
      return next;
    });
  }, []);

  const maximizeWindow = useCallback((id: string) => {
    setWindows(prev => {
      const next = prev.map(w =>
        w.id === id ? { ...w, maximized: !w.maximized, zIndex: ++nextZ.current } : w
      );
      saveWindows(next);
      return next;
    });
  }, []);

  const moveWindow = useCallback((id: string, pos: { x: number; y: number }) => {
    setWindows(prev => {
      const next = prev.map(w => w.id === id ? { ...w, position: pos } : w);
      saveWindows(next);
      return next;
    });
  }, []);

  const resizeWindow = useCallback((id: string, size: { w: number; h: number }) => {
    setWindows(prev => {
      const next = prev.map(w =>
        w.id === id
          ? { ...w, size: { w: Math.max(MIN_W, size.w), h: Math.max(MIN_H, size.h) } }
          : w
      );
      saveWindows(next);
      return next;
    });
  }, []);

  const activeWindowId = windows
    .filter(w => !w.minimized)
    .sort((a, b) => b.zIndex - a.zIndex)[0]?.id || null;

  return {
    windows,
    activeWindowId,
    openApp,
    closeWindow,
    focusWindow,
    minimizeWindow,
    maximizeWindow,
    moveWindow,
    resizeWindow,
  };
}
