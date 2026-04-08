/**
 * DesktopWindow — Draggable/resizable window without title bar (tabs handle that).
 * Thin drag strip at top for repositioning. Theme-aware.
 */

import { useRef, useCallback, useState, Suspense, type PointerEvent as ReactPointerEvent } from "react";
import { motion } from "framer-motion";
import type { WindowState, SnapZone } from "@/modules/desktop/hooks/useWindowManager";
import { detectSnapZone } from "@/modules/desktop/hooks/useWindowManager";
import { getApp } from "@/modules/desktop/lib/desktop-apps";
import { useDesktopTheme } from "@/modules/desktop/hooks/useDesktopTheme";
import { WindowContextProvider } from "@/modules/desktop/WindowContext";
import "@/modules/desktop/desktop.css";

interface Props {
  win: WindowState;
  isActive: boolean;
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  onMaximize: (id: string) => void;
  onFocus: (id: string) => void;
  onMove: (id: string, pos: { x: number; y: number }) => void;
  onResize: (id: string, size: { w: number; h: number }) => void;
  onSnap: (id: string, zone: SnapZone) => void;
  onSnapPreview: (zone: SnapZone | null) => void;
}

const MENU_BAR_H = 38;
const DRAG_STRIP_H = 6; // thin invisible drag strip at top

export default function DesktopWindow({
  win, isActive, onClose, onMinimize, onMaximize, onFocus, onMove, onResize, onSnap, onSnapPreview,
}: Props) {
  const app = getApp(win.appId);
  const { isLight } = useDesktopTheme();
  const dragRef = useRef<{ startX: number; startY: number; winX: number; winY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; winW: number; winH: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const onDragStart = useCallback((e: ReactPointerEvent) => {
    onFocus(win.id);
    dragRef.current = { startX: e.clientX, startY: e.clientY, winX: win.position.x, winY: win.position.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
  }, [win.id, win.position, onFocus]);

  const onDragMove = useCallback((e: ReactPointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    onMove(win.id, {
      x: dragRef.current.winX + dx,
      y: Math.max(MENU_BAR_H, dragRef.current.winY + dy),
    });
    const zone = detectSnapZone(e.clientX, e.clientY);
    onSnapPreview(zone);
  }, [win.id, onMove, onSnapPreview]);

  const onDragEnd = useCallback((e: ReactPointerEvent) => {
    if (dragRef.current) {
      const zone = detectSnapZone(e.clientX, e.clientY);
      if (zone) onSnap(win.id, zone);
    }
    dragRef.current = null;
    setIsDragging(false);
    onSnapPreview(null);
  }, [win.id, onSnap, onSnapPreview]);

  const onResizeStart = useCallback((e: ReactPointerEvent) => {
    e.stopPropagation();
    onFocus(win.id);
    resizeRef.current = { startX: e.clientX, startY: e.clientY, winW: win.size.w, winH: win.size.h };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [win.id, win.size, onFocus]);

  const onResizeMove = useCallback((e: ReactPointerEvent) => {
    if (!resizeRef.current) return;
    onResize(win.id, {
      w: resizeRef.current.winW + (e.clientX - resizeRef.current.startX),
      h: resizeRef.current.winH + (e.clientY - resizeRef.current.startY),
    });
  }, [win.id, onResize]);

  const onResizeEnd = useCallback(() => { resizeRef.current = null; }, []);

  if (win.minimized) return null;

  const AppComponent = app?.component;

  const style = win.maximized
    ? { top: MENU_BAR_H, left: 0, width: "100vw", height: `calc(100vh - ${MENU_BAR_H}px - 68px)` }
    : { top: win.position.y, left: win.position.x, width: win.size.w, height: win.size.h };

  const glassBg = isLight ? "rgba(245,245,245,0.92)" : "rgba(26,26,26,0.85)";
  const borderColor = isActive
    ? (isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.10)")
    : (isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.05)");
  const contentBg = isLight ? "#f5f5f5" : "#191919";
  const spinnerBorder = isLight ? "border-black/10 border-t-black/40" : "border-white/15 border-t-white/50";

  return (
    <motion.div
      initial={{ scale: 0.88, opacity: 0, y: 50 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.88, opacity: 0, y: 30 }}
      transition={{ type: "spring", damping: 26, stiffness: 350, duration: 0.3 }}
      className={`desktop-window-chrome fixed ${isActive ? "active" : ""} ${isDragging ? "dragging" : ""}`}
      style={{ ...style, zIndex: win.zIndex }}
      onPointerDown={() => onFocus(win.id)}
    >
      <div className="absolute inset-0 rounded-xl" style={{
        background: glassBg,
        backdropFilter: "blur(48px) saturate(1.4)",
        WebkitBackdropFilter: "blur(48px) saturate(1.4)",
      }} />

      <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ border: `1px solid ${borderColor}` }} />

      {/* Thin drag strip at top — invisible but draggable */}
      <div
        className="relative window-drag-strip"
        style={{ height: DRAG_STRIP_H }}
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onDoubleClick={() => onMaximize(win.id)}
      />

      <div className="relative overflow-auto rounded-b-xl" style={{ height: `calc(100% - ${DRAG_STRIP_H}px)`, background: contentBg }}>
        <WindowContextProvider>
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <div className={`w-5 h-5 border-2 ${spinnerBorder} rounded-full animate-spin`} />
            </div>
          }>
            {AppComponent && <AppComponent />}
          </Suspense>
        </WindowContextProvider>
      </div>

      {!win.maximized && (
        <>
          <div className="resize-handle resize-handle-se" onPointerDown={onResizeStart} onPointerMove={onResizeMove} onPointerUp={onResizeEnd} />
          <div className="resize-handle resize-handle-e" onPointerDown={onResizeStart} onPointerMove={onResizeMove} onPointerUp={onResizeEnd} />
          <div className="resize-handle resize-handle-s" onPointerDown={onResizeStart} onPointerMove={onResizeMove} onPointerUp={onResizeEnd} />
        </>
      )}
    </motion.div>
  );
}
