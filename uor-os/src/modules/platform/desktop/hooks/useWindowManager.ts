import { useState, useCallback, useRef, useMemo, useEffect } from "react";

export interface WindowState {
  id: string;
  appId: string;
  title: string;
  position: { x: number; y: number };
  size: { w: number; h: number };
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
  pinned: boolean;
  booted: boolean;
  mergedChildren?: string[];
  mergedParent?: string;
  preSnap?: { position: { x: number; y: number }; size: { w: number; h: number } } | null;
}

export interface SnapZone {
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
}

const STORAGE_PREFIX = "uor:desktop-windows";
const MIN_W = 360;
const MIN_H = 280;
const MENU_BAR_H = 38;
const DOCK_H = 0;
const SNAP_EDGE = 12;
const GRID_COLS = 4;
const GRID_ROWS = 4;

let zCounter = 10;

function storageKey(screen: string) {
  return screen === "immersive" ? STORAGE_PREFIX : `${STORAGE_PREFIX}:${screen}`;
}

function loadWindows(screen: string): WindowState[] {
  try {
    const raw = localStorage.getItem(storageKey(screen));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(w => ({
          ...w,
          pinned: w.pinned ?? false,
          booted: w.booted ?? false,
          mergedChildren: w.mergedChildren ?? undefined,
          mergedParent: w.mergedParent ?? undefined,
        }));
      }
    }
  } catch {}
  return [];
}

let _saveTimer: ReturnType<typeof setTimeout> | null = null;
let _saveScreen: string = "immersive";

function debouncedSave(windows: WindowState[], screen: string) {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveScreen = screen;
  _saveTimer = setTimeout(() => {
    try { localStorage.setItem(storageKey(_saveScreen), JSON.stringify(windows)); } catch {}
  }, 500);
}

function saveWindowsImmediate(windows: WindowState[], screen: string) {
  if (_saveTimer) clearTimeout(_saveTimer);
  try { localStorage.setItem(storageKey(screen), JSON.stringify(windows)); } catch {}
}

export function detectSnapZone(clientX: number, clientY: number): SnapZone | null {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const usableTop = MENU_BAR_H;
  const usableH = vh - MENU_BAR_H - DOCK_H;

  if (clientX <= SNAP_EDGE && clientY <= usableTop + SNAP_EDGE) return { col: 0, row: 0, colSpan: 2, rowSpan: 2 };
  if (clientX >= vw - SNAP_EDGE && clientY <= usableTop + SNAP_EDGE) return { col: 2, row: 0, colSpan: 2, rowSpan: 2 };
  if (clientX <= SNAP_EDGE && clientY >= usableTop + usableH - SNAP_EDGE) return { col: 0, row: 2, colSpan: 2, rowSpan: 2 };
  if (clientX >= vw - SNAP_EDGE && clientY >= usableTop + usableH - SNAP_EDGE) return { col: 2, row: 2, colSpan: 2, rowSpan: 2 };
  if (clientX <= SNAP_EDGE) return { col: 0, row: 0, colSpan: 2, rowSpan: 4 };
  if (clientX >= vw - SNAP_EDGE) return { col: 2, row: 0, colSpan: 2, rowSpan: 4 };
  if (clientY <= usableTop + SNAP_EDGE) return { col: 0, row: 0, colSpan: 4, rowSpan: 4 };
  return null;
}

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

export function snapZoneToRectCustom(zone: SnapZone, cols: number, rows: number): { x: number; y: number; w: number; h: number } {
  const vw = window.innerWidth;
  const usableH = window.innerHeight - MENU_BAR_H - DOCK_H;
  const cellW = vw / cols;
  const cellH = usableH / rows;
  const pad = 6;
  return {
    x: zone.col * cellW + pad,
    y: MENU_BAR_H + zone.row * cellH + pad,
    w: zone.colSpan * cellW - pad * 2,
    h: zone.rowSpan * cellH - pad * 2,
  };
}

/**
 * useWindowManager — now screen-aware.
 * Each desktop screen (immersive/dark/light) has its own persistent window set.
 */
export function useWindowManager(screen: string = "immersive") {
  const [windows, setWindows] = useState<WindowState[]>(() => loadWindows(screen));
  const nextZ = useRef(zCounter);
  const screenRef = useRef(screen);

  // When screen changes, save current windows then load the new screen's windows
  useEffect(() => {
    if (screenRef.current !== screen) {
      // Save outgoing screen
      setWindows(prev => {
        saveWindowsImmediate(prev, screenRef.current);
        return prev;
      });
      screenRef.current = screen;
      // Load incoming screen
      const loaded = loadWindows(screen);
      setWindows(loaded);
    }
  }, [screen]);

  const rafRef = useRef<number | null>(null);
  const pendingMoveRef = useRef<{ id: string; pos: { x: number; y: number } } | null>(null);
  const pendingResizeRef = useRef<{ id: string; size: { w: number; h: number } } | null>(null);

  const persist = useCallback((ws: WindowState[]) => {
    setWindows(ws);
    debouncedSave(ws, screenRef.current);
  }, []);

  const persistImmediate = useCallback((ws: WindowState[]) => {
    setWindows(ws);
    saveWindowsImmediate(ws, screenRef.current);
  }, []);

  const openApp = useCallback((appId: string, title: string, defaultSize?: { w: number; h: number }, options?: { maximized?: boolean }) => {
    setWindows(prev => {
      const existing = prev.find(w => w.appId === appId);
      if (existing) {
        const z = ++nextZ.current;
        const next = prev.map(w =>
          w.id === existing.id ? { ...w, title, minimized: false, zIndex: z, maximized: options?.maximized ?? w.maximized } : w
        );
        saveWindowsImmediate(next, screenRef.current);
        return next;
      }
      const offsetIndex = prev.length % 8;
      const shouldMaximize = options?.maximized !== false;
      const newWin: WindowState = {
        id: `${appId}-${Date.now()}`,
        appId,
        title,
        position: shouldMaximize ? { x: 0, y: MENU_BAR_H } : { x: 80 + offsetIndex * 30, y: 60 + offsetIndex * 30 },
        size: shouldMaximize
          ? { w: window.innerWidth, h: window.innerHeight - MENU_BAR_H - DOCK_H }
          : (defaultSize || { w: 800, h: 540 }),
        zIndex: ++nextZ.current,
        minimized: false,
        maximized: shouldMaximize,
        pinned: false,
        booted: false,
        preSnap: null,
      };
      const next = [...prev, newWin];
      saveWindowsImmediate(next, screenRef.current);
      return next;
    });
  }, []);

  const closeWindow = useCallback((id: string) => {
    setWindows(prev => {
      const next = prev.filter(w => w.id !== id);
      saveWindowsImmediate(next, screenRef.current);
      return next;
    });
  }, []);

  const focusWindow = useCallback((id: string) => {
    setWindows(prev => {
      const z = ++nextZ.current;
      const next = prev.map(w => w.id === id ? { ...w, zIndex: z, minimized: false } : w);
      debouncedSave(next, screenRef.current);
      return next;
    });
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows(prev => {
      const next = prev.map(w => w.id === id ? { ...w, minimized: true } : w);
      saveWindowsImmediate(next, screenRef.current);
      return next;
    });
  }, []);

  const maximizeWindow = useCallback((id: string) => {
    setWindows(prev => {
      const next = prev.map(w =>
        w.id === id ? { ...w, maximized: !w.maximized, zIndex: ++nextZ.current, preSnap: null } : w
      );
      saveWindowsImmediate(next, screenRef.current);
      return next;
    });
  }, []);

  const moveWindow = useCallback((id: string, pos: { x: number; y: number }) => {
    pendingMoveRef.current = { id, pos };
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const pending = pendingMoveRef.current;
        if (!pending) return;
        pendingMoveRef.current = null;
        setWindows(prev => prev.map(w => w.id === pending.id ? { ...w, position: pending.pos, maximized: false } : w));
      });
    }
  }, []);

  const resizeWindow = useCallback((id: string, size: { w: number; h: number }) => {
    pendingResizeRef.current = { id, size };
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const pending = pendingResizeRef.current;
        if (!pending) return;
        pendingResizeRef.current = null;
        setWindows(prev => prev.map(w =>
          w.id === pending.id
            ? { ...w, size: { w: Math.max(MIN_W, pending.size.w), h: Math.max(MIN_H, pending.size.h) } }
            : w
        ));
      });
    }
  }, []);

  const commitWindowPosition = useCallback(() => {
    setWindows(prev => {
      saveWindowsImmediate(prev, screenRef.current);
      return prev;
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
      saveWindowsImmediate(next, screenRef.current);
      return next;
    });
  }, []);

  const unsnap = useCallback((id: string) => {
    setWindows(prev => {
      const next = prev.map(w => {
        if (w.id !== id || !w.preSnap) return w;
        return { ...w, position: w.preSnap.position, size: w.preSnap.size, preSnap: null };
      });
      saveWindowsImmediate(next, screenRef.current);
      return next;
    });
  }, []);

  const reorderWindows = useCallback((fromIndex: number, toIndex: number) => {
    setWindows(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      saveWindowsImmediate(next, screenRef.current);
      return next;
    });
  }, []);

  const togglePin = useCallback((id: string) => {
    setWindows(prev => {
      const next = prev.map(w => w.id === id ? { ...w, pinned: !w.pinned } : w);
      const pinned = next.filter(w => w.pinned);
      const unpinned = next.filter(w => !w.pinned);
      const sorted = [...pinned, ...unpinned];
      saveWindowsImmediate(sorted, screenRef.current);
      return sorted;
    });
  }, []);

  const mergeTabs = useCallback((ids: string[]) => {
    if (ids.length < 2) return;
    setWindows(prev => {
      const primaryId = ids[0];
      const childIds = ids.slice(1);
      const next = prev.map(w => {
        if (w.id === primaryId) return { ...w, mergedChildren: childIds };
        if (childIds.includes(w.id)) return { ...w, mergedParent: primaryId, minimized: true };
        return w;
      });
      saveWindowsImmediate(next, screenRef.current);
      return next;
    });
  }, []);

  const unmergeTabs = useCallback((parentId: string) => {
    setWindows(prev => {
      const parent = prev.find(w => w.id === parentId);
      if (!parent?.mergedChildren) return prev;
      const childIds = parent.mergedChildren;
      const next = prev.map(w => {
        if (w.id === parentId) return { ...w, mergedChildren: undefined };
        if (childIds.includes(w.id)) return { ...w, mergedParent: undefined, minimized: false, zIndex: ++nextZ.current };
        return w;
      });
      saveWindowsImmediate(next, screenRef.current);
      return next;
    });
  }, []);

  const snapMultiple = useCallback((assignments: { id: string; zone: SnapZone; cols?: number; rows?: number }[]) => {
    setWindows(prev => {
      const assignMap = new Map(assignments.map(a => [a.id, a]));
      const assignedIds = new Set(assignments.map(a => a.id));
      const next = prev.map(w => {
        const a = assignMap.get(w.id);
        if (a) {
          const rect = a.cols && a.rows
            ? snapZoneToRectCustom(a.zone, a.cols, a.rows)
            : snapZoneToRect(a.zone);
          return {
            ...w,
            preSnap: w.preSnap || { position: { ...w.position }, size: { ...w.size } },
            position: { x: rect.x, y: rect.y },
            size: { w: rect.w, h: rect.h },
            maximized: false,
            minimized: false,
            zIndex: ++nextZ.current,
          };
        }
        if (!assignedIds.has(w.id) && !w.minimized) return { ...w, minimized: true };
        return w;
      });
      saveWindowsImmediate(next, screenRef.current);
      return next;
    });
  }, []);

  const bootWindow = useCallback((id: string) => {
    setWindows(prev => {
      const next = prev.map(w => w.id === id ? { ...w, booted: true } : w);
      saveWindowsImmediate(next, screenRef.current);
      return next;
    });
  }, []);

  const activeWindowId = useMemo(() => {
    let maxZ = -1;
    let activeId: string | null = null;
    for (const w of windows) {
      if (!w.minimized && !w.mergedParent && w.zIndex > maxZ) {
        maxZ = w.zIndex;
        activeId = w.id;
      }
    }
    return activeId;
  }, [windows]);

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
    commitWindowPosition,
    snapWindow,
    unsnap,
    reorderWindows,
    togglePin,
    mergeTabs,
    unmergeTabs,
    snapMultiple,
    bootWindow,
  };
}
