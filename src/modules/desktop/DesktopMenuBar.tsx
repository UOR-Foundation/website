/**
 * DesktopMenuBar — Slim top status bar with dropdown menus. Theme-aware.
 */

import { useState, useEffect } from "react";
import { Search, Wifi, Volume2 } from "lucide-react";
import {
  Menubar, MenubarMenu, MenubarTrigger, MenubarContent,
  MenubarItem, MenubarSeparator, MenubarShortcut,
  MenubarSub, MenubarSubTrigger, MenubarSubContent,
  MenubarCheckboxItem,
} from "@/modules/core/ui/menubar";
import type { WindowState } from "@/modules/desktop/hooks/useWindowManager";
import { getApp, DESKTOP_APPS } from "@/modules/desktop/lib/desktop-apps";
import { useDesktopTheme, type DesktopTheme } from "@/modules/desktop/hooks/useDesktopTheme";

interface Props {
  activeWindowId: string | null;
  windows: WindowState[];
  onSpotlight?: () => void;
  onCloseWindow?: () => void;
  onMinimizeWindow?: () => void;
  onHideAll?: () => void;
  onOpenApp?: (appId: string) => void;
}

export default function DesktopMenuBar({
  activeWindowId, windows, onSpotlight, onCloseWindow, onMinimizeWindow, onHideAll, onOpenApp,
}: Props) {
  const [time, setTime] = useState(new Date());
  const { isLight, theme, setTheme } = useDesktopTheme();

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const activeWin = windows.find(w => w.id === activeWindowId);
  const activeApp = activeWin ? getApp(activeWin.appId) : null;

  const formatted = time.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const clock = time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const bg = isLight ? "rgba(245,245,245,0.85)" : "rgba(20,20,20,0.65)";
  const border = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)";
  const textPrimary = isLight ? "text-black/80" : "text-white/85";
  const textSecondary = isLight ? "text-black/45" : "text-white/50";
  const iconMuted = isLight ? "text-black/25" : "text-white/35";
  const clockColor = isLight ? "text-black/50" : "text-white/55";

  const menuContentClass = isLight
    ? "border-black/[0.08] bg-white/92 backdrop-blur-xl text-black/70"
    : "border-white/[0.08] bg-[rgba(30,30,30,0.90)] backdrop-blur-xl text-white/75";
  const menuItemClass = isLight
    ? "text-[12px] text-black/65 font-medium focus:bg-black/[0.05] focus:text-black/80"
    : "text-[12px] text-white/70 font-medium focus:bg-white/[0.08] focus:text-white/90";
  const menuTriggerClass = isLight
    ? "text-[13px] text-black/50 font-medium data-[state=open]:bg-black/[0.06] hover:bg-black/[0.04] h-5 px-2 py-0"
    : "text-[13px] text-white/55 font-medium data-[state=open]:bg-white/[0.08] hover:bg-white/[0.04] h-5 px-2 py-0";
  const shortcutClass = isLight ? "text-black/20" : "text-white/25";
  const separatorClass = isLight ? "bg-black/[0.06]" : "bg-white/[0.06]";

  return (
    <div
      data-menubar
      className="fixed top-0 inset-x-0 z-[200] h-7 flex items-center justify-between px-2 select-none"
      style={{
        background: bg,
        backdropFilter: "blur(48px) saturate(1.5)",
        WebkitBackdropFilter: "blur(48px) saturate(1.5)",
        borderBottom: `1px solid ${border}`,
      }}
    >
      <Menubar className="border-0 bg-transparent h-7 p-0 space-x-0">
        <MenubarMenu>
          <MenubarTrigger className={`text-[13px] font-bold tracking-tight ${textPrimary} h-5 px-2 py-0`}>
            ⬡ UOR
          </MenubarTrigger>
          <MenubarContent className={`rounded-xl min-w-[180px] ${menuContentClass}`}>
            <MenubarItem className={menuItemClass} disabled>About UOR OS</MenubarItem>
            <MenubarSeparator className={separatorClass} />
            <MenubarSub>
              <MenubarSubTrigger className={menuItemClass}>Appearance</MenubarSubTrigger>
              <MenubarSubContent className={`rounded-xl ${menuContentClass}`}>
                {(["immersive", "dark", "light"] as DesktopTheme[]).map(t => (
                  <MenubarCheckboxItem
                    key={t}
                    checked={theme === t}
                    onCheckedChange={() => setTheme(t)}
                    className={menuItemClass}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </MenubarCheckboxItem>
                ))}
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator className={separatorClass} />
            <MenubarItem className={menuItemClass} onSelect={onHideAll}>
              Hide All <MenubarShortcut className={shortcutClass}>⌘H</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {activeApp && (
          <MenubarMenu>
            <MenubarTrigger className={menuTriggerClass}>
              {activeApp.label}
            </MenubarTrigger>
            <MenubarContent className={`rounded-xl min-w-[160px] ${menuContentClass}`}>
              <MenubarItem className={menuItemClass} onSelect={onMinimizeWindow}>
                Minimize <MenubarShortcut className={shortcutClass}>⌘M</MenubarShortcut>
              </MenubarItem>
              <MenubarItem className={menuItemClass} onSelect={onCloseWindow}>
                Close Window <MenubarShortcut className={shortcutClass}>⌘W</MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        )}

        <MenubarMenu>
          <MenubarTrigger className={menuTriggerClass}>Window</MenubarTrigger>
          <MenubarContent className={`rounded-xl min-w-[180px] ${menuContentClass}`}>
            {DESKTOP_APPS.map(app => (
              <MenubarItem
                key={app.id}
                className={menuItemClass}
                onSelect={() => onOpenApp?.(app.id)}
              >
                {app.label}
              </MenubarItem>
            ))}
            {windows.length > 0 && (
              <>
                <MenubarSeparator className={separatorClass} />
                <MenubarItem className={menuItemClass} onSelect={onHideAll}>
                  Hide All <MenubarShortcut className={shortcutClass}>⌘H</MenubarShortcut>
                </MenubarItem>
              </>
            )}
          </MenubarContent>
        </MenubarMenu>
      </Menubar>

      <div className="flex items-center gap-3">
        <button
          onClick={onSpotlight}
          className={`p-0.5 rounded transition-colors ${isLight ? "hover:bg-black/[0.04]" : "hover:bg-white/[0.06]"}`}
          title="Spotlight (⌘K)"
        >
          <Search className={`w-3 h-3 ${iconMuted}`} />
        </button>
        <Volume2 className={`w-3.5 h-3.5 ${iconMuted}`} />
        <Wifi className={`w-3.5 h-3.5 ${iconMuted}`} />
        <span className={`text-[12px] ${clockColor} font-medium tabular-nums`}>
          {formatted}&ensp;{clock}
        </span>
      </div>
    </div>
  );
}
