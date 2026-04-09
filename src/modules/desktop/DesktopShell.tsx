/**
 * DesktopShell — UOR OS shell.
 * Wallpaper + menu bar + windows + dock + spotlight + context menu + snap zones + theme.
 */

import { useCallback, useState, useMemo, useEffect } from "react";
// AnimatePresence removed — windows use CSS transitions now (Revolut-style)
import DesktopImmersiveWallpaper from "@/modules/desktop/DesktopImmersiveWallpaper";
import { getPhasePhotoDescription } from "@/modules/oracle/lib/immersive-photos";
import TabBar from "@/modules/desktop/TabBar";
// DesktopDock removed — tabs handle app switching now
import DesktopWindow from "@/modules/desktop/DesktopWindow";
import DesktopWidgets from "@/modules/desktop/DesktopWidgets";
import SpotlightSearch from "@/modules/desktop/SpotlightSearch";
import DesktopContextMenu from "@/modules/desktop/DesktopContextMenu";
import SnapOverlay from "@/modules/desktop/SnapOverlay";
import DesktopThemeDots from "@/modules/desktop/DesktopThemeDots";
import MobileShell from "@/modules/desktop/MobileShell";
import { DesktopThemeProvider, useDesktopTheme } from "@/modules/desktop/hooks/useDesktopTheme";
import { useWindowManager, type SnapZone } from "@/modules/desktop/hooks/useWindowManager";
import { useDesktopShortcuts } from "@/modules/desktop/hooks/useDesktopShortcuts";
import { useIsMobile } from "@/hooks/use-mobile";
import { getApp } from "@/modules/desktop/lib/desktop-apps";
import "@/modules/desktop/desktop.css";

function DesktopShellInner() {
  const wm = useWindowManager();
  const { theme } = useDesktopTheme();
  const isMobile = useIsMobile();
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [snapPreview, setSnapPreview] = useState<SnapZone | null>(null);
  

  const handleHomeSearch = useCallback((query: string) => {
    const app = getApp("search");
    wm.openApp("search", query, app?.defaultSize, { maximized: true });
  }, [wm]);

  const handleOpenApp = useCallback((appId: string) => {
    const app = getApp(appId);
    if (app) wm.openApp(appId, app.label, app.defaultSize, { maximized: true });
  }, [wm]);

  const handleHideAll = useCallback(() => {
    wm.windows.forEach(w => {
      if (!w.minimized) wm.minimizeWindow(w.id);
    });
  }, [wm]);

  const handleCloseWindow = useCallback(() => {
    if (wm.activeWindowId) wm.closeWindow(wm.activeWindowId);
  }, [wm]);

  const handleMinimizeWindow = useCallback(() => {
    if (wm.activeWindowId) wm.minimizeWindow(wm.activeWindowId);
  }, [wm]);

  const shortcutHandlers = useMemo(() => ({
    onSpotlight: () => setSpotlightOpen(o => !o),
    onCloseWindow: handleCloseWindow,
    onMinimizeWindow: handleMinimizeWindow,
    onHideAll: handleHideAll,
  }), [handleCloseWindow, handleMinimizeWindow, handleHideAll]);

  useDesktopShortcuts(shortcutHandlers);

  // Listen for open-app events from within windows
  useEffect(() => {
    const handler = (e: Event) => {
      const appId = (e as CustomEvent).detail;
      if (typeof appId === "string") handleOpenApp(appId);
    };
    window.addEventListener("uor:open-app", handler);
    return () => window.removeEventListener("uor:open-app", handler);
  }, [handleOpenApp]);

  // Mobile: use drawer-based shell
  if (isMobile) return <MobileShell />;

  const shellBg = theme === "light" ? "bg-white" : "bg-black";

  return (
    <DesktopContextMenu
      onNewSearch={() => handleHomeSearch("")}
      onSpotlight={() => setSpotlightOpen(true)}
      onHideAll={handleHideAll}
    >
      <div className={`fixed inset-0 overflow-hidden ${shellBg} select-none`}>
        {theme === "immersive" && (
          <>
            <DesktopImmersiveWallpaper />
            {/* Dark overlay when windows are open — hides wallpaper for readability */}
            {wm.windows.some(w => !w.minimized) && (
              <div
                className="fixed inset-0 z-[1] pointer-events-none transition-opacity duration-500"
                style={{ background: "hsl(220 15% 8%)", opacity: 0.92 }}
              />
            )}
            <div className="fixed bottom-8 right-4 z-[6] flex flex-col gap-0.5 transition-opacity duration-500"
              style={{ opacity: 0, pointerEvents: "none" }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "0"; }}
            >
              <span className="text-white/20 text-[10px] leading-tight">{getPhasePhotoDescription()}</span>
              <span className="text-white/12 text-[9px]">Photo · Unsplash</span>
            </div>
          </>
        )}
        <DesktopWidgets
          windows={wm.windows}
          onSearch={handleHomeSearch}
          onOpenApp={handleOpenApp}
        />

        <TabBar
          activeWindowId={wm.activeWindowId}
          windows={wm.windows}
          onFocusWindow={wm.focusWindow}
          onCloseWindow={wm.closeWindow}
          onMinimizeWindow={wm.minimizeWindow}
          onSpotlight={() => setSpotlightOpen(true)}
          onHideAll={handleHideAll}
          onOpenApp={handleOpenApp}
          hideTime={!wm.windows.some(w => !w.minimized)}
          onProfileOpen={() => handleOpenApp("identity")}
        />

        <SnapOverlay zone={snapPreview} />

        {wm.windows
          .filter(w => !w.minimized)
          .map(win => (
            <DesktopWindow
              key={win.id}
              win={win}
              isActive={win.id === wm.activeWindowId}
              onClose={wm.closeWindow}
              onMinimize={wm.minimizeWindow}
              onMaximize={wm.maximizeWindow}
              onFocus={wm.focusWindow}
              onMove={wm.moveWindow}
              onResize={wm.resizeWindow}
              onSnap={wm.snapWindow}
              onSnapPreview={setSnapPreview}
            />
          ))}

        <DesktopThemeDots windows={wm.windows} />

        <SpotlightSearch
          open={spotlightOpen}
          onClose={() => setSpotlightOpen(false)}
          onOpenApp={handleOpenApp}
          onSearch={handleHomeSearch}
        />
      </div>
    </DesktopContextMenu>
  );
}

export default function DesktopShell() {
  return (
    <DesktopThemeProvider>
      <DesktopShellInner />
    </DesktopThemeProvider>
  );
}
