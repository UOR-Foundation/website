/**
 * MobileShell — Mobile-friendly OS layout using Vaul drawers.
 * Adapts to iOS (squircle dock, blur) and Android (Material nav, ripple).
 */

import { useState, useCallback, Suspense, useRef } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/modules/core/ui/drawer";
import { DESKTOP_APPS, getApp } from "@/modules/desktop/lib/desktop-apps";
import { useDesktopTheme } from "@/modules/desktop/hooks/useDesktopTheme";
import { usePlatform } from "@/modules/desktop/hooks/usePlatform";
import DesktopWidgets from "@/modules/desktop/DesktopWidgets";
import DesktopThemeDots from "@/modules/desktop/DesktopThemeDots";

export default function MobileShell() {
  const { isLight, theme } = useDesktopTheme();
  const { mobileNavStyle, isAndroid } = usePlatform();
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

  // ── Platform-adaptive nav styling ──
  const isMaterial = mobileNavStyle === "material";

  const dockBg = isMaterial
    ? (isLight ? "rgba(255,255,255,0.95)" : "rgba(28,28,30,0.95)")
    : (isLight ? "rgba(255,255,255,0.70)" : "rgba(0,0,0,0.40)");
  const dockBorder = isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.06)";
  const iconBg = isMaterial
    ? "transparent"
    : (isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)");
  const iconColor = isLight ? "text-black/50" : "text-white/60";
  const labelColor = isLight ? "text-black/40" : "text-white/40";
  const drawerBg = isLight ? "bg-[#f5f5f5] border-black/[0.08]" : "bg-[#191919] border-white/[0.08]";
  const titleColor = isLight ? "text-black/60" : "text-white/65";

  const dockRadius = isMaterial ? "rounded-none" : "rounded-2xl";
  const dockPosition = isMaterial ? "inset-x-0 bottom-0" : "bottom-4 inset-x-0 flex justify-center";
  const dockBlur = isMaterial
    ? "none"
    : "blur(48px) saturate(1.4)";
  const iconRadius = isMaterial ? "rounded-full" : "rounded-xl";

  return (
    <div className={`fixed inset-0 ${shellBg} select-none`}>
      {/* Widgets */}
      <DesktopWidgets
        windows={[]}
        onSearch={handleSearch}
        onOpenApp={openApp}
      />

      {/* Mobile Nav */}
      <div className={`fixed z-[190] ${dockPosition}`}>
        <div
          className={`flex items-center gap-3 px-4 py-2.5 ${dockRadius}`}
          style={{
            background: dockBg,
            backdropFilter: dockBlur,
            WebkitBackdropFilter: dockBlur,
            border: isMaterial ? "none" : `1px solid ${dockBorder}`,
            borderTop: isMaterial ? `1px solid ${dockBorder}` : undefined,
            width: isMaterial ? "100%" : undefined,
            justifyContent: isMaterial ? "space-around" : undefined,
          }}
        >
          {DESKTOP_APPS.map((a) => {
            const Icon = a.icon;
            return (
              <RippleButton
                key={a.id}
                onClick={() => openApp(a.id)}
                className="flex flex-col items-center gap-1"
                aria-label={a.label}
                enableRipple={isMaterial}
              >
                <div
                  className={`w-11 h-11 ${iconRadius} flex items-center justify-center`}
                  style={{ background: iconBg }}
                >
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <span className={`text-[9px] font-medium ${labelColor}`}>{a.label}</span>
              </RippleButton>
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

/** Material-style ripple wrapper — passthrough on iOS */
function RippleButton({
  children, onClick, className, enableRipple, ...props
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  enableRipple?: boolean;
  "aria-label"?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (enableRipple && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const ripple = document.createElement("span");
      ripple.className = "mobile-ripple";
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ref.current.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    }
    onClick();
  };

  return (
    <button ref={ref} onClick={handleClick} className={`relative overflow-hidden ${className || ""}`} {...props}>
      {children}
    </button>
  );
}
