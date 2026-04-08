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
  /** Pre-snap geometry so we can restore */
  preSnap?: { position: { x: number; y: number }; size: { w: number; h: number } } | null;
}

export interface SnapZone {
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
}

const STORAGE_KEY = "uor:desktop-windows";
const MIN_W = 360;
const MIN_H = 280;
const MENU_BAR_H = 38;
const DOCK_H = 68;
const SNAP_EDGE = 12;
const GRID_COLS = 4;
const GRID_ROWS = 4;

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

/** Detect which snap zone the cursor is in based on screen position */
export function detectSnapZone(clientX: number, clientY: number): SnapZone | null {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const usableTop = MENU_BAR_H;
  const usableH = vh - MENU_BAR_H - DOCK_H;

  // Corners — 2x2 quadrants
  if (clientX <= SNAP_EDGE && clientY <= usableTop + SNAP_EDGE) {
    return { col: 0, row: 0, colSpan: 2, rowSpan: 2 };
  }
  if (clientX >= vw - SNAP_EDGE && clientY <= usableTop + SNAP_EDGE) {
    return { col: 2, row: 0, colSpan: 2, rowSpan: 2 };
  }
  if (clientX <= SNAP_EDGE && clientY >= usableTop + usableH - SNAP_EDGE) {
    return { col: 0, row: 2, colSpan: 2, rowSpan: 2 };
  }
  if (clientX >= vw - SNAP_EDGE && clientY >= usableTop + usableH - SNAP_EDGE) {
    return { col: 2, row: 2, colSpan: 2, rowSpan: 2 };
  }

  // Edges — half screen
  if (clientX <= SNAP_EDGE) {
    return { col: 0, row: 0, colSpan: 2, rowSpan: 4 };
  }
  if (clientX >= vw - SNAP_EDGE) {
    return { col: 2, row: 0, colSpan: 2, rowSpan: 4 };
  }
  if (clientY <= usableTop + SNAP_EDGE) {
    return { col: 0, row: 0, colSpan: 4, rowSpan: 4 }; // maximize
  }

  return null;
}

/** Convert a snap zone to pixel geometry */
export function snapZoneToRect(zone: SnapZone): { x: number; y: number; w: number; h: number } {
  const vw = window.innerWidth;
  const usableH = window.innerHeight - MENU_BAR_H - DOCK_H;
  const cellW = vw / GRID_COLS;
  const cellH = usableH / GRID_ROWS;
  const pad = 6;

  return {
    x: zone.col * cellW + pad,
    y: MENU_BAR_H + zone.row * cellH + pad,
    w: zone.colSpan * cellW - pad * 2,
    h: zone.rowSpan * cellH - pad * 2,
  };
}

export function useWindowManager() {
  const [windows, setWindows] = useState<WindowState[]>(loadWindows);
  const nextZ = useRef(zCounter);

  const persist = (ws: WindowState[]) => {
    setWindows(ws);
    saveWindows(ws);
  };

  const openApp = useCallback((appId: string, title: string, defaultSize?: { w: number; h: number }) => {
    setWindows(prev => {
      const existing = prev.find(w => w.appId === appId);
      if (existing) {
        const z = ++nextZ.current;
        const next = prev.map(w =>
          w.id === existing.id ? { ...w, title, minimized: false, zIndex: z } : w
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
        preSnap: null,
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
        w.id === id ? { ...w, maximized: !w.maximized, zIndex: ++nextZ.current, preSnap: null } : w
      );
      saveWindows(next);
      return next;
    });
  }, []);

  const moveWindow = useCallback((id: string, pos: { x: number; y: number }) => {
    setWindows(prev => {
      const next = prev.map(w => w.id === id ? { ...w, position: pos, maximized: false } : w);
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

  const snapWindow = useCallback((id: string, zone: SnapZone) => {
    const rect = snapZoneToRect(zone);
    setWindows(prev => {
      const next = prev.map(w => {
        if (w.id !== id) return w;
        return {
          ...w,
          preSnap: w.preSnap || { position: { ...w.position }, size: { ...w.size } },
          position: { x: rect.x, y: rect.y },
          size: { w: rect.w, h: rect.h },
          maximized: false,
          zIndex: ++nextZ.current,
        };
      });
      saveWindows(next);
      return next;
    });
  }, []);

  const unsnap = useCallback((id: string) => {
    setWindows(prev => {
      const next = prev.map(w => {
        if (w.id !== id || !w.preSnap) return w;
        return { ...w, position: w.preSnap.position, size: w.preSnap.size, preSnap: null };
      });
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
    snapWindow,
    unsnap,
  };
}
