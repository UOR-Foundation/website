/**
 * DesktopWindow — Draggable/resizable window with mandatory container boot.
 * Every app passes through ContainerBootOverlay before mounting.
 * 
 * Performance: During drag, uses CSS transform via DOM ref (no React re-render).
 * Final position committed to state on pointerUp.
 */

import { useRef, useCallback, useState, Suspense, type PointerEvent as ReactPointerEvent } from "react";
import type { WindowState, SnapZone } from "@/modules/platform/desktop/hooks/useWindowManager";
import { detectSnapZone } from "@/modules/platform/desktop/hooks/useWindowManager";
import { getApp } from "@/modules/platform/desktop/lib/desktop-apps";
import { useDesktopTheme } from "@/modules/platform/desktop/hooks/useDesktopTheme";
import { WindowContextProvider } from "@/modules/platform/desktop/WindowContext";
import { RADIUS } from "@/modules/platform/desktop/lib/golden-ratio";
import ContainerBootOverlay from "@/modules/platform/desktop/components/ContainerBootOverlay";
import type { BootReceipt } from "@/modules/platform/desktop/components/ContainerBootOverlay";
import ContainerInspector, { ContainerStatusPill } from "@/modules/platform/desktop/components/ContainerInspector";
import GraphContextBar from "@/modules/platform/desktop/components/GraphContextBar";
import GraphQuickView from "@/modules/platform/desktop/components/GraphQuickView";
import "@/modules/platform/desktop/desktop.css";

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
  onCommit?: () => void;
  onBooted?: (id: string) => void;
}

const MENU_BAR_H = 38;
const DRAG_STRIP_H = 6;

export default function DesktopWindow({
  win, isActive, onClose, onMinimize, onMaximize, onFocus, onMove, onResize, onSnap, onSnapPreview, onCommit, onBooted,
}: Props) {
  const app = getApp(win.appId);
  const { theme } = useDesktopTheme();
  const dragRef = useRef<{ startX: number; startY: number; winX: number; winY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; winW: number; winH: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const windowElRef = useRef<HTMLDivElement>(null);

  // ── Boot state ──────────────────────────────────────────────────────────
  const [bootReceipt, setBootReceipt] = useState<BootReceipt | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [graphQuickViewOpen, setGraphQuickViewOpen] = useState(false);
  const booted = win.booted === true;

  const handleBootReady = useCallback((receipt: BootReceipt) => {
    setBootReceipt(receipt);
    onBooted?.(win.id);
  }, [win.id, onBooted]);

  // ── Drag handlers — DOM-direct during move, commit to state on release ──
  const onDragStart = useCallback((e: ReactPointerEvent) => {
    onFocus(win.id);
    dragRef.current = { startX: e.clientX, startY: e.clientY, winX: win.position.x, winY: win.position.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    // GPU-promote the window element for smooth drag
    if (windowElRef.current) {
      windowElRef.current.style.willChange = "transform";
    }
  }, [win.id, win.position, onFocus]);

  const onDragMove = useCallback((e: ReactPointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    // DOM-direct: apply CSS transform instead of React state update
    if (windowElRef.current) {
      windowElRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    }
    const zone = detectSnapZone(e.clientX, e.clientY);
    onSnapPreview(zone);
  }, [onSnapPreview]);

  const onDragEnd = useCallback((e: ReactPointerEvent) => {
    if (dragRef.current && windowElRef.current) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const newX = dragRef.current.winX + dx;
      const newY = Math.max(MENU_BAR_H, dragRef.current.winY + dy);
      // Reset transform and commit final position to React state once
      windowElRef.current.style.transform = "";
      windowElRef.current.style.willChange = "auto";
      onMove(win.id, { x: newX, y: newY });
      const zone = detectSnapZone(e.clientX, e.clientY);
      if (zone) onSnap(win.id, zone);
    }
    dragRef.current = null;
    setIsDragging(false);
    onSnapPreview(null);
    onCommit?.();
  }, [win.id, onMove, onSnap, onSnapPreview, onCommit]);

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

  const onResizeEnd = useCallback(() => {
    resizeRef.current = null;
    onCommit?.();
  }, [onCommit]);

  if (win.minimized) return null;

  const AppComponent = app?.component;

  const style = win.maximized
    ? { top: MENU_BAR_H, left: 0, width: "100vw", height: `calc(100vh - ${MENU_BAR_H}px)` }
    : { top: win.position.y, left: win.position.x, width: win.size.w, height: win.size.h };

  const surfacePalette = theme === "light"
    ? {
        shellBg: "hsl(0 0% 100%)",
        shellSheen: "linear-gradient(180deg, hsl(225 20% 97% / 0.96), hsl(0 0% 100% / 0))",
        contentBg: "hsl(0 0% 100%)",
        contentTexture: "linear-gradient(180deg, hsl(225 14% 97%), hsl(0 0% 100%))",
        borderActive: "hsl(225 12% 20% / 0.14)",
        borderIdle: "hsl(225 12% 20% / 0.08)",
        spinnerBorder: "border-black/10 border-t-black/40",
      }
    : theme === "immersive"
      ? {
          shellBg: "hsl(225 20% 8%)",
          shellSheen: "linear-gradient(180deg, hsl(0 0% 100% / 0.06), hsl(0 0% 100% / 0))",
          contentBg: "hsl(225 18% 8%)",
          contentTexture: [
            "radial-gradient(circle at 18% 12%, hsl(38 48% 58% / 0.08), transparent 0 24%)",
            "radial-gradient(circle at 82% 0%, hsl(210 28% 28% / 0.22), transparent 0 32%)",
            "linear-gradient(135deg, hsl(225 18% 10%), hsl(220 16% 7%))",
          ].join(", "),
          borderActive: "hsl(38 35% 62% / 0.18)",
          borderIdle: "hsl(0 0% 100% / 0.08)",
          spinnerBorder: "border-white/15 border-t-white/50",
        }
      : {
          shellBg: "hsl(0 0% 0%)",
          shellSheen: "linear-gradient(180deg, hsl(0 0% 100% / 0.05), hsl(0 0% 100% / 0))",
          contentBg: "hsl(0 0% 0%)",
          contentTexture: "linear-gradient(180deg, hsl(0 0% 5% / 0.36), hsl(0 0% 0% / 0))",
          borderActive: "hsl(0 0% 100% / 0.12)",
          borderIdle: "hsl(0 0% 100% / 0.06)",
          spinnerBorder: "border-white/15 border-t-white/50",
        };

  const borderColor = isActive ? surfacePalette.borderActive : surfacePalette.borderIdle;
  const spinnerBorder = surfacePalette.spinnerBorder;

  return (
    <div
      ref={windowElRef}
      className={`desktop-window-chrome fixed ${isActive ? "active" : ""} ${isDragging ? "dragging" : ""}`}
      style={{
        ...style,
        zIndex: win.zIndex,
        contain: "layout style",
      }}
      onPointerDown={() => onFocus(win.id)}
    >
      <div className="absolute inset-0" style={{
        borderRadius: `${RADIUS.md}px`,
        background: surfacePalette.shellBg,
      }} />

      <div className="absolute inset-0 pointer-events-none" style={{
        borderRadius: `${RADIUS.md}px`,
        background: surfacePalette.shellSheen,
      }} />

      <div className="absolute inset-0 pointer-events-none" style={{
        borderRadius: `${RADIUS.md}px`,
        border: `1px solid ${borderColor}`,
      }} />

      {/* Thin drag strip at top — invisible but draggable */}
      <div
        className="relative window-drag-strip"
        style={{ height: DRAG_STRIP_H }}
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onDoubleClick={() => onMaximize(win.id)}
      />

      <div className="relative" style={{
        height: `calc(100% - ${DRAG_STRIP_H}px)`,
        borderRadius: `0 0 ${RADIUS.md}px ${RADIUS.md}px`,
      }}>
        <div
          className="absolute inset-0"
          style={{
            borderRadius: `0 0 ${RADIUS.md}px ${RADIUS.md}px`,
            background: surfacePalette.contentBg,
          }}
        />

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius: `0 0 ${RADIUS.md}px ${RADIUS.md}px`,
            background: surfacePalette.contentTexture,
          }}
        />

        <div className="relative z-[1] h-full overflow-auto" style={{
          borderRadius: `0 0 ${RADIUS.md}px ${RADIUS.md}px`,
        }}>
          {/* ── Two-phase render: Boot → Mount ────────────────────────── */}
          {!booted ? (
            <ContainerBootOverlay
              appId={win.appId}
              appLabel={app?.label ?? win.title}
              onReady={handleBootReady}
            />
          ) : (
            <WindowContextProvider initialQuery={win.title}>
              <Suspense fallback={
                <div className="flex items-center justify-center h-full">
                  <div className={`w-5 h-5 border-2 ${spinnerBorder} rounded-full animate-spin`} />
                </div>
              }>
                {AppComponent && <AppComponent />}
              </Suspense>

              {/* Status pill — always visible after boot */}
              {bootReceipt && (
                <ContainerStatusPill
                  appId={win.appId}
                  receipt={bootReceipt}
                  onClick={() => setInspectorOpen(prev => !prev)}
                />
              )}

              {/* Inspector popover */}
              {inspectorOpen && bootReceipt && (
                <ContainerInspector appId={win.appId} receipt={bootReceipt} />
              )}

              {/* Graph context bar — ambient KG awareness */}
              <GraphContextBar
                appId={win.appId}
                onViewGraph={() => setGraphQuickViewOpen(true)}
              />

              {/* Graph quick view overlay */}
              <GraphQuickView
                open={graphQuickViewOpen}
                onClose={() => setGraphQuickViewOpen(false)}
                centerLabel={win.title}
              />
            </WindowContextProvider>
          )}
        </div>
      </div>

      {!win.maximized && (
        <>
          <div className="resize-handle resize-handle-se" onPointerDown={onResizeStart} onPointerMove={onResizeMove} onPointerUp={onResizeEnd} />
          <div className="resize-handle resize-handle-e" onPointerDown={onResizeStart} onPointerMove={onResizeMove} onPointerUp={onResizeEnd} />
          <div className="resize-handle resize-handle-s" onPointerDown={onResizeStart} onPointerMove={onResizeMove} onPointerUp={onResizeEnd} />
        </>
      )}
    </div>
  );
}
