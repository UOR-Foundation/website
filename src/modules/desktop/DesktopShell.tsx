/**
 * DesktopShell — UOR OS shell.
 * Wallpaper + menu bar + windows + dock + spotlight + context menu + snap zones + theme.
 */

import { useCallback, useState, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import ImmersiveBackground from "@/modules/oracle/components/ImmersiveBackground";
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
    wm.openApp("search", query, app?.defaultSize);
  }, [wm]);

  const handleOpenApp = useCallback((appId: string) => {
    const app = getApp(appId);
    if (app) wm.openApp(appId, app.label, app.defaultSize);
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
            <ImmersiveBackground />
            <div className="fixed bottom-8 left-4 z-[6] flex flex-col gap-0.5 pointer-events-none">
              <span className="text-white/30 text-[11px] leading-tight">{getPhasePhotoDescription()}</span>
              <span className="text-white/20 text-[10px]">Photo · Unsplash</span>
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
        />

        <SnapOverlay zone={snapPreview} />

        <AnimatePresence>
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
        </AnimatePresence>

        <DesktopThemeDots />

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
