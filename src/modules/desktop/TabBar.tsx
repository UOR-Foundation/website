/**
 * TabBar — Chrome-style tab strip replacing the macOS menu bar.
 * Each open window is a tab. Active tab blends into content below.
 * 
 * Uses Pretext for smart word-boundary truncation instead of CSS truncate.
 * Golden ratio (φ) proportioned tab heights and spacing.
 */

import { useState, useEffect, useMemo } from "react";
import { X, Plus, Search } from "lucide-react";
import type { WindowState } from "@/modules/desktop/hooks/useWindowManager";
import { getApp } from "@/modules/desktop/lib/desktop-apps";
import { useDesktopTheme, type DesktopTheme } from "@/modules/desktop/hooks/useDesktopTheme";
import { smartTruncate, FONTS } from "@/modules/oracle/lib/pretext-layout";
import { SPACE, TIMING } from "@/modules/desktop/lib/golden-ratio";
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
const TAB_H = 34;       // 21 × φ ≈ 34 — golden-ratio tab height
const TAB_MAX_W = 220;
const TAB_PADDING = 44;  // icon + close button + padding

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

  // Pretext-based smart truncation for tab labels
  const truncatedLabels = useMemo(() => {
    const availableTextWidth = TAB_MAX_W - TAB_PADDING;
    const map: Record<string, string> = {};
    for (const win of windows) {
      map[win.id] = smartTruncate(
        win.title,
        FONTS.osTabLabel,
        availableTextWidth,
        16,
        1 // max 1 line
      );
    }
    return map;
  }, [windows]);

  // Theme colors — tighter contrast range, Revolut-style
  const stripBg = isLight ? "rgba(235,235,235,0.97)" : "rgba(28,28,30,0.97)";
  const activeBg = isLight ? "#ffffff" : "#252527";
  const tabText = isLight ? "text-black/60" : "text-white/60";
  const tabTextActive = isLight ? "text-black/90" : "text-white/90";
  const tabTextMuted = isLight ? "text-black/30" : "text-white/25";
  const hoverBg = isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.05)";
  const clockColor = isLight ? "text-black/45" : "text-white/45";
  const iconMuted = isLight ? "text-black/25" : "text-white/30";
  const separatorColor = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)";
  const menuContentClass = isLight
    ? "border-black/[0.06] bg-white/97 backdrop-blur-lg text-black/70"
    : "border-white/[0.06] bg-[rgba(28,28,30,0.97)] backdrop-blur-lg text-white/70";
  const menuItemClass = isLight
    ? "text-[12px] text-black/60 font-medium focus:bg-black/[0.04] focus:text-black/80"
    : "text-[12px] text-white/60 font-medium focus:bg-white/[0.06] focus:text-white/85";

  return (
    <div
      data-tabbar
      className="fixed top-0 inset-x-0 z-[200] flex items-end select-none"
      style={{
        height: TAB_BAR_H,
        background: stripBg,
        backdropFilter: "blur(12px) saturate(1.2)",
        WebkitBackdropFilter: "blur(12px) saturate(1.2)",
      }}
    >
      {/* Left: UOR menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center justify-center shrink-0 px-3 h-full transition-opacity duration-150 hover:opacity-70"
            style={{ minWidth: 44 }}
          >
            <span className={`text-[14px] font-bold tracking-tight ${isLight ? "text-black/65" : "text-white/70"}`}>
              ⬡
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className={`rounded-xl min-w-[180px] ${menuContentClass}`} align="start" sideOffset={4}>
          <DropdownMenuItem className={menuItemClass} disabled>About UOR OS</DropdownMenuItem>
          <DropdownMenuSeparator className={isLight ? "bg-black/[0.05]" : "bg-white/[0.05]"} />
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
          <DropdownMenuSeparator className={isLight ? "bg-black/[0.05]" : "bg-white/[0.05]"} />
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
          const label = truncatedLabels[win.id] || win.title;

          return (
            <button
              key={win.id}
              className={`chrome-tab group relative flex items-center gap-1.5 min-w-[120px] max-w-[220px] px-3 
                text-[12px] font-medium whitespace-nowrap shrink-0
                ${isActive ? tabTextActive : isMini ? tabTextMuted : tabText}
                ${isActive ? "chrome-tab-active" : ""}
              `}
              style={{
                height: TAB_H,
                transition: `all ${TIMING.fast}ms ease-out`,
                background: isActive ? activeBg : "transparent",
                borderRadius: "8px 8px 0 0",
                marginBottom: 0,
              }}
              onClick={() => onFocusWindow(win.id)}
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

              {Icon && <Icon className="w-3.5 h-3.5 shrink-0 opacity-60" />}
              <span className="flex-1 text-left overflow-hidden text-ellipsis">{label}</span>
              <span
                className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-opacity duration-150
                  opacity-0 group-hover:opacity-100 ${isActive ? "opacity-50" : ""}
                  ${isLight ? "hover:bg-black/10" : "hover:bg-white/12"}
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
          className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 ml-1 mb-[2px] transition-colors duration-150
            ${isLight ? "hover:bg-black/[0.04] text-black/35" : "hover:bg-white/[0.06] text-white/35"}
          `}
          onClick={onSpotlight}
          title="New tab (⌘K)"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Right: status — search + clock only, φ-scale gap */}
      <div className="flex items-center shrink-0 px-3 h-full" style={{ gap: `${SPACE.md}px` }}>
        <button
          onClick={onSpotlight}
          className={`p-0.5 rounded transition-colors duration-150 ${isLight ? "hover:bg-black/[0.04]" : "hover:bg-white/[0.05]"}`}
          title="Spotlight (⌘K)"
        >
          <Search className={`w-3 h-3 ${iconMuted}`} />
        </button>
        <span className={`text-[12px] ${clockColor} font-medium tabular-nums`}>
          {formatted}&ensp;{clock}
        </span>
      </div>
    </div>
  );
}