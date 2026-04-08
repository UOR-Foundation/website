/**
 * TabBar — Chrome-style tab strip replacing the macOS menu bar.
 * Each open window is a tab. Active tab blends into content below.
 */

import { useState, useEffect } from "react";
import { X, Plus, Search, Wifi, Volume2 } from "lucide-react";
import type { WindowState } from "@/modules/desktop/hooks/useWindowManager";
import { getApp, DESKTOP_APPS } from "@/modules/desktop/lib/desktop-apps";
import { useDesktopTheme, type DesktopTheme } from "@/modules/desktop/hooks/useDesktopTheme";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub,
  DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuCheckboxItem,
} from "@/modules/core/ui/dropdown-menu";

interface Props {
  activeWindowId: string | null;
  windows: WindowState[];
  onFocusWindow: (id: string) => void;
  onCloseWindow: (id: string) => void;
  onMinimizeWindow: (id: string) => void;
  onSpotlight?: () => void;
  onHideAll?: () => void;
  onOpenApp?: (appId: string) => void;
}

const TAB_BAR_H = 38;

export default function TabBar({
  activeWindowId, windows, onFocusWindow, onCloseWindow, onMinimizeWindow,
  onSpotlight, onHideAll, onOpenApp,
}: Props) {
  const [time, setTime] = useState(new Date());
  const { isLight, theme, setTheme } = useDesktopTheme();

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const formatted = time.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const clock = time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  // Theme colors
  const stripBg = isLight ? "rgba(222,222,222,0.95)" : "rgba(32,33,36,0.95)";
  const activeBg = isLight ? "#ffffff" : "#292a2d";
  const tabText = isLight ? "text-black/70" : "text-white/70";
  const tabTextActive = isLight ? "text-black/90" : "text-white/90";
  const tabTextMuted = isLight ? "text-black/40" : "text-white/35";
  const hoverBg = isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.06)";
  const clockColor = isLight ? "text-black/50" : "text-white/55";
  const iconMuted = isLight ? "text-black/30" : "text-white/35";
  const separatorColor = isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)";
  const menuContentClass = isLight
    ? "border-black/[0.08] bg-white/95 backdrop-blur-xl text-black/70"
    : "border-white/[0.08] bg-[rgba(30,30,30,0.95)] backdrop-blur-xl text-white/75";
  const menuItemClass = isLight
    ? "text-[12px] text-black/65 font-medium focus:bg-black/[0.05] focus:text-black/80"
    : "text-[12px] text-white/70 font-medium focus:bg-white/[0.08] focus:text-white/90";

  return (
    <div
      data-tabbar
      className="fixed top-0 inset-x-0 z-[200] flex items-end select-none"
      style={{
        height: TAB_BAR_H,
        background: stripBg,
        backdropFilter: "blur(24px) saturate(1.4)",
        WebkitBackdropFilter: "blur(24px) saturate(1.4)",
      }}
    >
      {/* Left: UOR menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center justify-center shrink-0 px-3 h-full hover:opacity-80 transition-opacity"
            style={{ minWidth: 44 }}
          >
            <span className={`text-[14px] font-bold tracking-tight ${isLight ? "text-black/70" : "text-white/80"}`}>
              ⬡
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className={`rounded-xl min-w-[180px] ${menuContentClass}`} align="start" sideOffset={4}>
          <DropdownMenuItem className={menuItemClass} disabled>About UOR OS</DropdownMenuItem>
          <DropdownMenuSeparator className={isLight ? "bg-black/[0.06]" : "bg-white/[0.06]"} />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className={menuItemClass}>Appearance</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className={`rounded-xl ${menuContentClass}`}>
              {(["immersive", "dark", "light"] as DesktopTheme[]).map(t => (
                <DropdownMenuCheckboxItem
                  key={t}
                  checked={theme === t}
                  onCheckedChange={() => setTheme(t)}
                  className={menuItemClass}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator className={isLight ? "bg-black/[0.06]" : "bg-white/[0.06]"} />
          <DropdownMenuItem className={menuItemClass} onSelect={onHideAll}>
            Hide All Windows
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Tabs */}
      <div className="flex items-end flex-1 min-w-0 overflow-x-auto gap-0 pr-1" style={{ height: TAB_BAR_H }}>
        {windows.map(win => {
          const isActive = win.id === activeWindowId && !win.minimized;
          const isMini = win.minimized;
          const app = getApp(win.appId);
          const Icon = app?.icon;

          return (
            <button
              key={win.id}
              className={`chrome-tab group relative flex items-center gap-1.5 min-w-[120px] max-w-[220px] h-[32px] px-3 
                text-[12px] font-medium whitespace-nowrap transition-colors duration-150 shrink-0
                ${isActive ? tabTextActive : isMini ? tabTextMuted : tabText}
                ${isActive ? "chrome-tab-active" : ""}
              `}
              style={{
                background: isActive ? activeBg : "transparent",
                borderRadius: isActive ? "8px 8px 0 0" : "8px 8px 0 0",
                marginBottom: 0,
              }}
              onClick={() => {
                if (isMini) {
                  // unminimize by focusing
                }
                onFocusWindow(win.id);
              }}
              onMouseEnter={(e) => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = hoverBg;
              }}
              onMouseLeave={(e) => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
              title={win.title}
            >
              {/* Tab separator (left) */}
              {!isActive && (
                <span
                  className="absolute left-0 top-[8px] bottom-[8px] w-px"
                  style={{ background: separatorColor }}
                />
              )}

              {Icon && <Icon className="w-3.5 h-3.5 shrink-0 opacity-70" />}
              <span className="truncate flex-1 text-left">{win.title}</span>
              <span
                className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-all
                  opacity-0 group-hover:opacity-100 ${isActive ? "opacity-60" : ""}
                  ${isLight ? "hover:bg-black/10" : "hover:bg-white/15"}
                `}
                onClick={(e) => { e.stopPropagation(); onCloseWindow(win.id); }}
              >
                <X className="w-3 h-3" />
              </span>
            </button>
          );
        })}

        {/* New tab "+" */}
        <button
          className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 ml-1 mb-[2px] transition-colors
            ${isLight ? "hover:bg-black/[0.06] text-black/40" : "hover:bg-white/[0.08] text-white/40"}
          `}
          onClick={onSpotlight}
          title="New tab (⌘K)"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Right: status icons */}
      <div className="flex items-center gap-3 shrink-0 px-3 h-full">
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
