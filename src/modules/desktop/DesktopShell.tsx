/**
 * DesktopShell — The macOS-inspired browser OS.
 * Solar wallpaper + menu bar + windows + dock.
 */

import { Suspense } from "react";
import { AnimatePresence } from "framer-motion";
import ImmersiveBackground from "@/modules/oracle/components/ImmersiveBackground";
import DesktopMenuBar from "@/modules/desktop/DesktopMenuBar";
import DesktopDock from "@/modules/desktop/DesktopDock";
import DesktopWindow from "@/modules/desktop/DesktopWindow";
import DesktopWidgets from "@/modules/desktop/DesktopWidgets";
import { useWindowManager } from "@/modules/desktop/hooks/useWindowManager";
import "@/modules/desktop/desktop.css";

export default function DesktopShell() {
  const wm = useWindowManager();

  return (
    <div className="fixed inset-0 overflow-hidden bg-black select-none">
      {/* Solar wallpaper */}
      <ImmersiveBackground />

      {/* Desktop widgets (clock + quote) */}
      <DesktopWidgets windows={wm.windows} />

      {/* Menu bar */}
      <DesktopMenuBar activeWindowId={wm.activeWindowId} windows={wm.windows} />

      {/* Windows */}
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

      {/* Dock */}
      <DesktopDock windows={wm.windows} onOpenApp={wm.openApp} />
    </div>
  );
}
