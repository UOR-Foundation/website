/**
 * MobileShell — Mobile-friendly OS layout using Vaul drawers.
 * Apps open as swipeable bottom sheets instead of floating windows.
 */

import { useState, useCallback, Suspense } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/modules/core/ui/drawer";
import { DESKTOP_APPS, getApp } from "@/modules/desktop/lib/desktop-apps";
import { useDesktopTheme } from "@/modules/desktop/hooks/useDesktopTheme";
import DesktopWidgets from "@/modules/desktop/DesktopWidgets";
import DesktopThemeDots from "@/modules/desktop/DesktopThemeDots";

export default function MobileShell() {
  const { isLight, theme } = useDesktopTheme();
  const [openAppId, setOpenAppId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openApp = useCallback((appId: string) => {
    setOpenAppId(appId);
    setDrawerOpen(true);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setOpenAppId("search");
    setDrawerOpen(true);
  }, []);

  const app = openAppId ? getApp(openAppId) : null;
  const AppComponent = app?.component;

  const shellBg = theme === "light" ? "bg-white" : "bg-black";
  const dockBg = isLight ? "rgba(255,255,255,0.70)" : "rgba(0,0,0,0.40)";
  const dockBorder = isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.06)";
  const iconBg = isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)";
  const iconColor = isLight ? "text-black/50" : "text-white/60";
  const labelColor = isLight ? "text-black/40" : "text-white/40";
  const drawerBg = isLight ? "bg-[#f5f5f5] border-black/[0.08]" : "bg-[#191919] border-white/[0.08]";
  const titleColor = isLight ? "text-black/60" : "text-white/65";

  return (
    <div className={`fixed inset-0 ${shellBg} select-none`}>
      {/* Widgets */}
      <DesktopWidgets
        windows={[]}
        onSearch={handleSearch}
        onOpenApp={openApp}
      />

      {/* Mobile Dock */}
      <div className="fixed bottom-4 inset-x-0 z-[190] flex justify-center">
        <div
          className="flex items-center gap-3 px-4 py-2.5 rounded-2xl"
          style={{
            background: dockBg,
            backdropFilter: "blur(48px) saturate(1.4)",
            WebkitBackdropFilter: "blur(48px) saturate(1.4)",
            border: `1px solid ${dockBorder}`,
          }}
        >
          {DESKTOP_APPS.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.id}
                onClick={() => openApp(a.id)}
                className="flex flex-col items-center gap-1"
                aria-label={a.label}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: iconBg }}>
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <span className={`text-[9px] font-medium ${labelColor}`}>{a.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <DesktopThemeDots windows={[]} />

      {/* App Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className={`max-h-[85vh] ${drawerBg}`}>
          <DrawerHeader className="pb-0">
            <DrawerTitle className={`text-sm font-semibold ${titleColor}`}>
              {app?.label || "App"}
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-auto px-1 pb-4" style={{ minHeight: "60vh" }}>
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
