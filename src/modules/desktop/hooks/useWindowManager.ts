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
  pinned: boolean;
  /** IDs of child windows merged into this tab */
  mergedChildren?: string[];
  /** If this window is merged into another, the parent ID */
  mergedParent?: string;
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
const DOCK_H = 0;
const SNAP_EDGE = 12;
const GRID_COLS = 4;
const GRID_ROWS = 4;

let zCounter = 10;

function loadWindows(): WindowState[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(w => ({
          ...w,
          pinned: w.pinned ?? false,
          mergedChildren: w.mergedChildren ?? undefined,
          mergedParent: w.mergedParent ?? undefined,
        }));
      }
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
  if (clientX <= SNAP_EDGE) {
    return { col: 0, row: 0, colSpan: 2, rowSpan: 4 };
  }
  if (clientX >= vw - SNAP_EDGE) {
    return { col: 2, row: 0, colSpan: 2, rowSpan: 4 };
  }
  if (clientY <= usableTop + SNAP_EDGE) {
    return { col: 0, row: 0, colSpan: 4, rowSpan: 4 };
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

/** Convert a snap zone to pixel geometry with custom grid dimensions */
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

export function useWindowManager() {
  const [windows, setWindows] = useState<WindowState[]>(loadWindows);
  const nextZ = useRef(zCounter);

  const persist = (ws: WindowState[]) => {
    setWindows(ws);
    saveWindows(ws);
  };

  const openApp = useCallback((appId: string, title: string, defaultSize?: { w: number; h: number }, options?: { maximized?: boolean }) => {
    setWindows(prev => {
      const existing = prev.find(w => w.appId === appId);
      if (existing) {
        const z = ++nextZ.current;
        const next = prev.map(w =>
          w.id === existing.id ? { ...w, title, minimized: false, zIndex: z, maximized: options?.maximized ?? w.maximized } : w
        );
        saveWindows(next);
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
      const next = prev.map(w => w.id === id ? { ...w, zIndex: z, minimized: false } : w);
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

  // --- New: reorder windows ---
  const reorderWindows = useCallback((fromIndex: number, toIndex: number) => {
    setWindows(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      saveWindows(next);
      return next;
    });
  }, []);

  // --- New: toggle pin ---
  const togglePin = useCallback((id: string) => {
    setWindows(prev => {
      const next = prev.map(w => w.id === id ? { ...w, pinned: !w.pinned } : w);
      // Sort: pinned first, then unpinned in current order
      const pinned = next.filter(w => w.pinned);
      const unpinned = next.filter(w => !w.pinned);
      const sorted = [...pinned, ...unpinned];
      saveWindows(sorted);
      return sorted;
    });
  }, []);

  // --- New: merge tabs ---
  const mergeTabs = useCallback((ids: string[]) => {
    if (ids.length < 2) return;
    setWindows(prev => {
      const primaryId = ids[0];
      const childIds = ids.slice(1);
      const next = prev.map(w => {
        if (w.id === primaryId) {
          return { ...w, mergedChildren: childIds };
        }
        if (childIds.includes(w.id)) {
          return { ...w, mergedParent: primaryId, minimized: true };
        }
        return w;
      });
      saveWindows(next);
      return next;
    });
  }, []);

  const unmergeTabs = useCallback((parentId: string) => {
    setWindows(prev => {
      const parent = prev.find(w => w.id === parentId);
      if (!parent?.mergedChildren) return prev;
      const childIds = parent.mergedChildren;
      const next = prev.map(w => {
        if (w.id === parentId) {
          return { ...w, mergedChildren: undefined };
        }
        if (childIds.includes(w.id)) {
          return { ...w, mergedParent: undefined, minimized: false, zIndex: ++nextZ.current };
        }
        return w;
      });
      saveWindows(next);
      return next;
    });
  }, []);

  // --- New: snap multiple windows at once ---
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
        // Minimize windows not in the layout
        if (!assignedIds.has(w.id) && !w.minimized) {
          return { ...w, minimized: true };
        }
        return w;
      });
      saveWindows(next);
      return next;
    });
  }, []);

  const activeWindowId = windows
    .filter(w => !w.minimized && !w.mergedParent)
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
    reorderWindows,
    togglePin,
    mergeTabs,
    unmergeTabs,
    snapMultiple,
  };
}
