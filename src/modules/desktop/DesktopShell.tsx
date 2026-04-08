/**
 * DesktopShell — UOR OS shell.
 * Wallpaper + menu bar + windows + dock + spotlight + context menu.
 */

import { Suspense, useCallback, useState, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import ImmersiveBackground from "@/modules/oracle/components/ImmersiveBackground";
import DesktopMenuBar from "@/modules/desktop/DesktopMenuBar";
import DesktopDock from "@/modules/desktop/DesktopDock";
import DesktopWindow from "@/modules/desktop/DesktopWindow";
import DesktopWidgets from "@/modules/desktop/DesktopWidgets";
import SpotlightSearch from "@/modules/desktop/SpotlightSearch";
import DesktopContextMenu from "@/modules/desktop/DesktopContextMenu";
import { useWindowManager } from "@/modules/desktop/hooks/useWindowManager";
import { useDesktopShortcuts } from "@/modules/desktop/hooks/useDesktopShortcuts";
import { getApp } from "@/modules/desktop/lib/desktop-apps";
import "@/modules/desktop/desktop.css";

export default function DesktopShell() {
  const wm = useWindowManager();
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ open: boolean; x: number; y: number }>({ open: false, x: 0, y: 0 });

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

  const shortcutHandlers = useMemo(() => ({
    onSpotlight: () => setSpotlightOpen(o => !o),
    onCloseWindow: () => { if (wm.activeWindowId) wm.closeWindow(wm.activeWindowId); },
    onMinimizeWindow: () => { if (wm.activeWindowId) wm.minimizeWindow(wm.activeWindowId); },
    onHideAll: handleHideAll,
  }), [wm, handleHideAll]);

  useDesktopShortcuts(shortcutHandlers);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    // Only on the desktop background itself
    const target = e.target as HTMLElement;
    if (target.closest(".desktop-window-chrome") || target.closest("[data-dock]") || target.closest("[data-menubar]")) return;
    e.preventDefault();
    setCtxMenu({ open: true, x: e.clientX, y: e.clientY });
  }, []);

  return (
    <div
      className="fixed inset-0 overflow-hidden bg-black select-none"
      onContextMenu={handleContextMenu}
    >
      <ImmersiveBackground />

      <DesktopWidgets
        windows={wm.windows}
        onSearch={handleHomeSearch}
        onOpenApp={handleOpenApp}
      />

      <DesktopMenuBar
        activeWindowId={wm.activeWindowId}
        windows={wm.windows}
        onSpotlight={() => setSpotlightOpen(true)}
      />

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
            />
          ))}
      </AnimatePresence>

      <DesktopDock windows={wm.windows} onOpenApp={wm.openApp} />

      <SpotlightSearch
        open={spotlightOpen}
        onClose={() => setSpotlightOpen(false)}
        onOpenApp={handleOpenApp}
        onSearch={handleHomeSearch}
      />

      <DesktopContextMenu
        open={ctxMenu.open}
        position={{ x: ctxMenu.x, y: ctxMenu.y }}
        onClose={() => setCtxMenu(c => ({ ...c, open: false }))}
        onNewSearch={() => {/* focus home search - widgets handle this */}}
        onSpotlight={() => setSpotlightOpen(true)}
      />
    </div>
  );
}
