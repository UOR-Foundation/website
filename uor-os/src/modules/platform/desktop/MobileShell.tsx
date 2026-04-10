/**
 * MobileShell — Minimal lock-screen-inspired mobile home.
 *
 * DayRingClock centered in the upper region, two corner icons
 * at the bottom (menu + search), theme dots centered between them.
 * Apps and search open via Vaul bottom-sheet drawers.
 *
 * PERFORMANCE: Clock tick is isolated in MobileClock component
 * to prevent full shell re-renders every second.
 */

import { useState, useCallback, useMemo, useEffect, useRef, Suspense } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/modules/platform/core/ui/drawer";
import { DESKTOP_APPS, getApp } from "@/modules/platform/desktop/lib/desktop-apps";
import { useDesktopTheme } from "@/modules/platform/desktop/hooks/useDesktopTheme";
import DesktopThemeDots from "@/modules/platform/desktop/DesktopThemeDots";
import DesktopImmersiveWallpaper from "@/modules/platform/desktop/DesktopImmersiveWallpaper";
import DayRingClock from "@/modules/platform/desktop/components/DayRingClock";
import { Menu, Search, Mic } from "lucide-react";

import type { DesktopTheme } from "@/modules/platform/desktop/hooks/useDesktopTheme";

// ── Isolated clock component — ticks without re-rendering the shell ──
function MobileClock({ theme, isLight }: { theme: DesktopTheme; isLight: boolean }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return <DayRingClock time={time} theme={theme} isLight={isLight} opacity={1} />;
}

export default function MobileShell() {
  const { isLight, theme } = useDesktopTheme();
  const [openAppId, setOpenAppId] = useState<string | null>(null);
  const [appDrawerOpen, setAppDrawerOpen] = useState(false);
  const [menuDrawerOpen, setMenuDrawerOpen] = useState(false);
  const [searchDrawerOpen, setSearchDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const openApp = useCallback((appId: string) => {
    setOpenAppId(appId);
    setMenuDrawerOpen(false);
    setSearchDrawerOpen(false);
    setAppDrawerOpen(true);
  }, []);

  const handleSearchSubmit = useCallback(() => {
    if (!searchQuery.trim()) return;
    setSearchDrawerOpen(false);
    openApp("oracle");
  }, [searchQuery, openApp]);

  // Auto-focus search input when drawer opens
  useEffect(() => {
    if (searchDrawerOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 300);
    } else {
      setSearchQuery("");
    }
  }, [searchDrawerOpen]);

  const app = openAppId ? getApp(openAppId) : null;
  const AppComponent = app?.component;

  const visibleApps = useMemo(
    () => DESKTOP_APPS.filter(a => !a.hidden),
    [],
  );

  const shellBg = theme === "light" ? "bg-white" : "bg-black";
  const iconColor = isLight ? "text-black/30" : "text-white/30";
  const drawerBg = isLight ? "bg-[#f5f5f5] border-black/[0.08]" : "bg-[#191919] border-white/[0.08]";
  const titleColor = isLight ? "text-black/60" : "text-white/65";

  return (
    <div className={`fixed inset-0 ${shellBg} select-none overflow-hidden`}>
      {/* ── Background ── */}
      {theme === "immersive" && <DesktopImmersiveWallpaper />}

      {/* ── DayRingClock — centered upper area, GPU-promoted ── */}
      <div className="absolute inset-x-0 top-0 bottom-0 flex flex-col items-center z-10 pointer-events-none gpu-promote">
        {/* Spacer: push clock to ~18% from top */}
        <div className="flex-[0_0_18%]" />
        <div className="pointer-events-auto">
          <MobileClock theme={theme} isLight={isLight} />
        </div>
      </div>

      {/* ── Bottom Controls — safe-area aware, GPU-promoted ── */}
      <div className="absolute inset-x-0 bottom-0 z-20 gpu-promote" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0.5rem))" }}>
        {/* Corner icons + theme dots */}
        <div className="flex items-end justify-between px-6 pb-3">
          {/* Menu icon */}
          <button
            onClick={() => setMenuDrawerOpen(true)}
            className={`w-11 h-11 flex items-center justify-center rounded-full active:scale-90 transition-transform ${iconColor}`}
            aria-label="Open menu"
          >
            <Menu size={22} strokeWidth={1.5} />
          </button>

          {/* Theme dots — centered */}
          <div className="flex-1 flex justify-center">
            <DesktopThemeDots windows={[]} />
          </div>

          {/* Search icon */}
          <button
            onClick={() => setSearchDrawerOpen(true)}
            className={`w-11 h-11 flex items-center justify-center rounded-full active:scale-90 transition-transform ${iconColor}`}
            aria-label="Open search"
          >
            <Search size={22} strokeWidth={1.5} />
          </button>
        </div>

        {/* Home indicator pill */}
        <div className="flex justify-center pb-1">
          <div
            className="rounded-full"
            style={{
              width: 134,
              height: 5,
              backgroundColor: isLight ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)",
            }}
          />
        </div>
      </div>

      {/* ── Menu Drawer (app grid) ── */}
      <Drawer open={menuDrawerOpen} onOpenChange={setMenuDrawerOpen}>
        <DrawerContent className={`max-h-[80vh] ${drawerBg}`}>
          <DrawerHeader className="pb-0">
            <DrawerTitle className={`text-sm font-semibold ${titleColor}`}>Apps</DrawerTitle>
          </DrawerHeader>
          <div className="grid grid-cols-3 gap-y-6 gap-x-2 px-6 py-6">
            {visibleApps.map(a => {
              const Icon = a.icon;
              return (
                <button
                  key={a.id}
                  onClick={() => openApp(a.id)}
                  className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{
                      backgroundColor: isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.07)",
                    }}
                  >
                    <Icon className={`w-6 h-6 ${isLight ? "text-black/50" : "text-white/60"}`} />
                  </div>
                  <span className={`text-[11px] font-medium leading-tight text-center ${isLight ? "text-black/50" : "text-white/50"}`}>
                    {a.label}
                  </span>
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>

      {/* ── Search Drawer ── */}
      <Drawer open={searchDrawerOpen} onOpenChange={setSearchDrawerOpen}>
        <DrawerContent className={`max-h-[80vh] ${drawerBg}`}>
          <DrawerHeader className="pb-0">
            <DrawerTitle className={`text-sm font-semibold ${titleColor}`}>Search</DrawerTitle>
          </DrawerHeader>
          <div className="px-5 pt-3 pb-6 space-y-4">
            <div className="flex items-center gap-2">
              <div
                className="flex-1 flex items-center gap-2 rounded-xl px-4 py-3"
                style={{
                  backgroundColor: isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.07)",
                }}
              >
                <Search size={16} className={isLight ? "text-black/30" : "text-white/30"} />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearchSubmit()}
                  placeholder="Ask anything…"
                  className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/40"
                />
                <button
                  onClick={() => {}}
                  className={`shrink-0 ${isLight ? "text-black/25" : "text-white/25"}`}
                  aria-label="Voice input"
                >
                  <Mic size={16} />
                </button>
              </div>
            </div>
            {/* Quick app suggestions */}
            <div className="space-y-1">
              {visibleApps.slice(0, 5).map(a => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.id}
                    onClick={() => openApp(a.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg active:scale-[0.98] transition-transform ${
                      isLight ? "hover:bg-black/[0.03]" : "hover:bg-white/[0.03]"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isLight ? "text-black/40" : "text-white/40"}`} />
                    <span className={`text-sm ${isLight ? "text-black/60" : "text-white/60"}`}>{a.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* ── App Drawer ── */}
      <Drawer open={appDrawerOpen} onOpenChange={setAppDrawerOpen}>
        <DrawerContent className={`max-h-[85vh] ${drawerBg}`}>
          <DrawerHeader className="pb-0">
            <DrawerTitle className={`text-sm font-semibold ${titleColor}`}>
              {app?.label || "App"}
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-auto px-1 pb-4" style={{ minHeight: "60vh", contentVisibility: "auto" as any }}>
            <Suspense fallback={
              <div className="flex items-center justify-center h-40">
                <div className={`w-5 h-5 border-2 rounded-full animate-spin ${isLight ? "border-black/10 border-t-black/40" : "border-white/15 border-t-white/50"}`} />
              </div>
            }>
              {AppComponent && <AppComponent />}
            </Suspense>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
