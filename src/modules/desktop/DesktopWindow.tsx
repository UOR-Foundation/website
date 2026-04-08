/**
 * DesktopWindow — Crisp, draggable/resizable window with spatial entrance.
 */

import { useRef, useCallback, Suspense, type PointerEvent as ReactPointerEvent } from "react";
import { motion } from "framer-motion";
import type { WindowState } from "@/modules/desktop/hooks/useWindowManager";
import { getApp } from "@/modules/desktop/lib/desktop-apps";
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
}

const MENU_BAR_H = 28;

export default function DesktopWindow({
  win, isActive, onClose, onMinimize, onMaximize, onFocus, onMove, onResize,
}: Props) {
  const app = getApp(win.appId);
  const dragRef = useRef<{ startX: number; startY: number; winX: number; winY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; winW: number; winH: number } | null>(null);

  const onDragStart = useCallback((e: ReactPointerEvent) => {
    if ((e.target as HTMLElement).closest(".traffic-light")) return;
    onFocus(win.id);
    dragRef.current = { startX: e.clientX, startY: e.clientY, winX: win.position.x, winY: win.position.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [win.id, win.position, onFocus]);

  const onDragMove = useCallback((e: ReactPointerEvent) => {
    if (!dragRef.current) return;
    onMove(win.id, {
      x: dragRef.current.winX + (e.clientX - dragRef.current.startX),
      y: Math.max(MENU_BAR_H, dragRef.current.winY + (e.clientY - dragRef.current.startY)),
    });
  }, [win.id, onMove]);

  const onDragEnd = useCallback(() => { dragRef.current = null; }, []);

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

  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0, y: 60 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.85, opacity: 0, y: 40 }}
      transition={{ type: "spring", damping: 26, stiffness: 350, duration: 0.3 }}
      className={`desktop-window-chrome fixed ${isActive ? "active" : ""}`}
      style={{ ...style, zIndex: win.zIndex }}
      onPointerDown={() => onFocus(win.id)}
    >
      {/* Glass background */}
      <div
        className="absolute inset-0 rounded-xl"
        style={{
          background: "rgba(26,26,26,0.85)",
          backdropFilter: "blur(48px) saturate(1.4)",
          WebkitBackdropFilter: "blur(48px) saturate(1.4)",
        }}
      />

      {/* Border */}
      <div
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{ border: `1px solid ${isActive ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.05)"}` }}
      />

      {/* Title bar */}
      <div
        className="relative h-10 flex items-center px-3 gap-2 cursor-default select-none"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onDoubleClick={() => onMaximize(win.id)}
      >
        <div className="flex items-center gap-1.5 shrink-0">
          <button className="traffic-light traffic-close" onClick={(e) => { e.stopPropagation(); onClose(win.id); }} />
          <button className="traffic-light traffic-minimize" onClick={(e) => { e.stopPropagation(); onMinimize(win.id); }} />
          <button className="traffic-light traffic-maximize" onClick={(e) => { e.stopPropagation(); onMaximize(win.id); }} />
        </div>
        <span className={`text-[12px] font-medium truncate flex-1 text-center pr-12 ${isActive ? "text-white/65" : "text-white/40"}`}>
          {win.title}
        </span>
      </div>

      {/* Content */}
      <div className="relative overflow-auto rounded-b-xl" style={{ height: "calc(100% - 40px)", background: "#191919" }}>
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full">
              <div className="w-5 h-5 border-2 border-white/15 border-t-white/50 rounded-full animate-spin" />
            </div>
          }
        >
          {AppComponent && <AppComponent />}
        </Suspense>
      </div>

      {/* Resize handles */}
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
