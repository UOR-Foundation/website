/**
 * DesktopShell — UOR OS shell.
 * Wallpaper + menu bar + windows + dock + spotlight + context menu + snap zones + theme.
 * Non-blocking boot: desktop renders immediately with boot overlay that fades away.
 * Includes global voice-to-voice interaction (Wispr Flow-style voice input + Oracle TTS reply).
 */

import { useCallback, useState, useMemo, useEffect, useRef } from "react";
import DesktopImmersiveWallpaper from "@/modules/desktop/DesktopImmersiveWallpaper";
import QuickCapture from "@/modules/oracle/components/QuickCapture";
import VinylPlayer from "@/modules/desktop/components/VinylPlayer";
import FloatingDictationPill from "@/modules/oracle/components/FloatingDictationPill";
import { getPhasePhotoDescription, getPhasePhotoPhotographer, getPhasePhotoUnsplashUrl } from "@/modules/oracle/lib/immersive-photos";
import TabBar from "@/modules/desktop/TabBar";
import DesktopWindow from "@/modules/desktop/DesktopWindow";
import DesktopWidgets from "@/modules/desktop/DesktopWidgets";
import SpotlightSearch from "@/modules/desktop/SpotlightSearch";
import DesktopContextMenu from "@/modules/desktop/DesktopContextMenu";
import SnapOverlay from "@/modules/desktop/SnapOverlay";
import DesktopThemeDots from "@/modules/desktop/DesktopThemeDots";
import MobileShell from "@/modules/desktop/MobileShell";
import RingIndicator from "@/modules/desktop/components/RingIndicator";
import ShortcutCheatSheet from "@/modules/desktop/components/ShortcutCheatSheet";
import BootSequence from "@/modules/desktop/BootSequence";
import LocalTwinWelcome, { shouldShowLocalTwinWelcome } from "@/modules/desktop/components/LocalTwinWelcome";
import { DesktopThemeProvider, useDesktopTheme } from "@/modules/desktop/hooks/useDesktopTheme";
import { PlatformProvider } from "@/modules/desktop/hooks/usePlatform";
import { ConnectivityProvider } from "@/modules/desktop/hooks/useConnectivity";
import { useWindowManager, type SnapZone } from "@/modules/desktop/hooks/useWindowManager";
import { useDesktopShortcuts } from "@/modules/desktop/hooks/useDesktopShortcuts";
import { useVoiceToVoice } from "@/modules/oracle/hooks/useVoiceToVoice";
import { useIsMobile } from "@/hooks/use-mobile";
import { getApp } from "@/modules/desktop/lib/desktop-apps";
import "@/modules/desktop/desktop.css";

function DesktopShellInner() {
  const [booted, setBooted] = useState(false);
  const [welcomed, setWelcomed] = useState(!shouldShowLocalTwinWelcome());
  const { theme } = useDesktopTheme();
  const wm = useWindowManager(theme);
  const isMobile = useIsMobile();
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [snapPreview, setSnapPreview] = useState<SnapZone | null>(null);
  const [cheatSheetOpen, setCheatSheetOpen] = useState(false);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);

  // Voice-to-voice (replaces raw useGlobalDictation)
  const [voiceState, voiceActions] = useVoiceToVoice();

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

  const handleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      document.documentElement.requestFullscreen?.();
    }
  }, []);

  const shortcutHandlers = useMemo(() => ({
    onSpotlight: () => setSpotlightOpen(o => !o),
    onCloseWindow: handleCloseWindow,
    onMinimizeWindow: handleMinimizeWindow,
    onHideAll: handleHideAll,
    onShowShortcuts: () => setCheatSheetOpen(o => !o),
    onFullscreen: handleFullscreen,
    onVoice: () => voiceActions.toggle(),
    onQuickCapture: () => setQuickCaptureOpen(o => !o),
    onDailyNote: () => handleOpenApp("daily-notes"),
  }), [handleCloseWindow, handleMinimizeWindow, handleHideAll, handleFullscreen, handleOpenApp, voiceActions]);

  const { ringActive } = useDesktopShortcuts(shortcutHandlers);

  useEffect(() => {
    const handler = (e: Event) => {
      const appId = (e as CustomEvent).detail;
      if (typeof appId === "string") handleOpenApp(appId);
    };
    window.addEventListener("uor:open-app", handler);
    return () => window.removeEventListener("uor:open-app", handler);
  }, [handleOpenApp]);

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
            {wm.windows.some(w => !w.minimized) && (
              <div
                className="fixed inset-0 z-[1] pointer-events-none transition-opacity duration-500"
                style={{ background: "hsl(220 15% 8%)", opacity: 0.92 }}
              />
            )}
            <a
              href={getPhasePhotoUnsplashUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="fixed bottom-5 left-4 z-[6] flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-500 group cursor-pointer"
              style={{
                opacity: 0.5,
                background: "linear-gradient(135deg, hsl(0 0% 0% / 0.25), hsl(0 0% 0% / 0.15))",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid hsl(0 0% 100% / 0.06)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.5"; }}
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-white/70 text-[10px] leading-tight group-hover:text-white/90 transition-colors">
                  {getPhasePhotoDescription()}
                </span>
                <span className="text-white/40 text-[9px] group-hover:text-white/60 transition-colors">
                  📷 {getPhasePhotoPhotographer()} · Unsplash
                </span>
              </div>
              <svg className="w-3 h-3 text-white/20 group-hover:text-white/50 transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 17L17 7M17 7H7M17 7V17" />
              </svg>
            </a>
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
          onReorderWindows={wm.reorderWindows}
          onTogglePin={wm.togglePin}
          onMergeTabs={wm.mergeTabs}
          onUnmergeTabs={wm.unmergeTabs}
          onSnapMultiple={wm.snapMultiple}
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
              onCommit={wm.commitWindowPosition}
              onBooted={wm.bootWindow}
            />
          ))}

        <DesktopThemeDots windows={wm.windows} />

        {/* Ambient SoundCloud vinyl player — bottom-right */}
        <div className="fixed bottom-5 right-5 z-[8] pointer-events-auto">
          <VinylPlayer />
        </div>

        <SpotlightSearch
          open={spotlightOpen}
          onClose={() => setSpotlightOpen(false)}
          onOpenApp={handleOpenApp}
          onSearch={handleHomeSearch}
        />

        <RingIndicator active={ringActive} />
        <ShortcutCheatSheet open={cheatSheetOpen} onClose={() => setCheatSheetOpen(false)} />
        <QuickCapture open={quickCaptureOpen} onClose={() => setQuickCaptureOpen(false)} />

        {/* Global voice-to-voice floating pill */}
        <FloatingDictationPill
          state={voiceState.dictation}
          phase={voiceState.phase}
          responseText={voiceState.responseText}
          voiceReplyEnabled={voiceState.voiceReplyEnabled}
          onStop={voiceActions.stop}
          onCancel={voiceActions.cancel}
          onToggleVoiceReply={voiceActions.setVoiceReplyEnabled}
        />

        {/* Boot overlay — renders on top, fades away when done. Desktop is interactive underneath. */}
        {!booted && <BootSequence onComplete={() => setBooted(true)} />}

        {/* Local twin welcome — shows once on first Tauri launch, after boot completes */}
        {booted && !welcomed && <LocalTwinWelcome onComplete={() => setWelcomed(true)} />}
      </div>
    </DesktopContextMenu>
  );
}

export default function DesktopShell() {
  return (
    <PlatformProvider>
      <ConnectivityProvider>
        <DesktopThemeProvider>
          <DesktopShellInner />
        </DesktopThemeProvider>
      </ConnectivityProvider>
    </PlatformProvider>
  );
}
