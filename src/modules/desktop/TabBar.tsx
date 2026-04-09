/**
 * TabBar — Chrome-style tab strip with drag-reorder, pin/unpin, merge, and context menu.
 * Uses pointer events for drag reorder; right-click context menu for pin/merge.
 */

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  X, Plus, Search, User, Home, Pin, Layers, SplitSquareHorizontal,
  Keyboard, Monitor, Moon, Sun, Sparkles, EyeOff, Info,
} from "lucide-react";
import type { WindowState } from "@/modules/desktop/hooks/useWindowManager";
import { getApp, DESKTOP_APPS } from "@/modules/desktop/lib/desktop-apps";
import { OS_TAXONOMY, type OsCategory } from "@/modules/desktop/lib/os-taxonomy";
import { useDesktopTheme, type DesktopTheme } from "@/modules/desktop/hooks/useDesktopTheme";
import { smartTruncate, FONTS } from "@/modules/oracle/lib/pretext-layout";
import { SPACE, TIMING } from "@/modules/desktop/lib/golden-ratio";
import SnapLayoutPicker from "@/modules/desktop/SnapLayoutPicker";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub,
  DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuCheckboxItem,
} from "@/modules/core/ui/dropdown-menu";
import {
  ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator,
} from "@/modules/core/ui/context-menu";

interface Props {
  activeWindowId: string | null;
  windows: WindowState[];
  onFocusWindow: (id: string) => void;
  onCloseWindow: (id: string) => void;
  onMinimizeWindow: (id: string) => void;
  onSpotlight?: () => void;
  onHideAll?: () => void;
  onOpenApp?: (appId: string) => void;
  hideTime?: boolean;
  onProfileOpen?: () => void;
  onReorderWindows: (from: number, to: number) => void;
  onTogglePin: (id: string) => void;
  onMergeTabs: (ids: string[]) => void;
  onUnmergeTabs: (parentId: string) => void;
  onSnapMultiple: (assignments: { id: string; zone: { col: number; row: number; colSpan: number; rowSpan: number }; cols?: number; rows?: number }[]) => void;
}

const TAB_BAR_H = 38;
const TAB_H = 34;
const TAB_MAX_W = 220;
const TAB_PADDING = 44;
const PINNED_TAB_W = 38;
const DRAG_THRESHOLD = 4;

export default function TabBar({
  activeWindowId, windows, onFocusWindow, onCloseWindow, onMinimizeWindow,
  onSpotlight, onHideAll, onOpenApp, hideTime, onProfileOpen,
  onReorderWindows, onTogglePin, onMergeTabs, onUnmergeTabs, onSnapMultiple,
}: Props) {
  const [time, setTime] = useState(new Date());
  const { isLight, theme, setTheme } = useDesktopTheme();

  // Drag state
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragStart = useRef<{ x: number; index: number } | null>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const formatted = time.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const clock = time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  // Visible tabs = not merged into another
  const visibleWindows = useMemo(() => windows.filter(w => !w.mergedParent), [windows]);
  const pinnedTabs = useMemo(() => visibleWindows.filter(w => w.pinned), [visibleWindows]);
  const unpinnedTabs = useMemo(() => visibleWindows.filter(w => !w.pinned), [visibleWindows]);
  const orderedTabs = useMemo(() => [...pinnedTabs, ...unpinnedTabs], [pinnedTabs, unpinnedTabs]);

  const truncatedLabels = useMemo(() => {
    const availableTextWidth = TAB_MAX_W - TAB_PADDING;
    const map: Record<string, string> = {};
    for (const win of visibleWindows) {
      map[win.id] = smartTruncate(win.title, FONTS.osTabLabel, availableTextWidth, 16, 1);
    }
    return map;
  }, [visibleWindows]);

  // Theme colors
  const stripBg = isLight ? "rgba(235,235,235,0.97)" : "rgba(28,28,30,0.97)";
  const activeBg = isLight ? "#ffffff" : "#252527";
  const tabText = isLight ? "text-black/60" : "text-white/60";
  const tabTextActive = isLight ? "text-black/90" : "text-white/90";
  const tabTextMuted = isLight ? "text-black/30" : "text-white/25";
  const hoverBg = isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.05)";
  const clockColor = isLight ? "text-black/45" : "text-white/45";
  const separatorColor = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)";
  const menuContentClass = isLight
    ? "border-black/[0.06] bg-white/97 backdrop-blur-lg text-black/70"
    : "border-white/[0.06] bg-[rgba(28,28,30,0.97)] backdrop-blur-lg text-white/70";
  const menuItemClass = isLight
    ? "text-[12px] text-black/60 font-medium focus:bg-black/[0.04] focus:text-black/80"
    : "text-[12px] text-white/60 font-medium focus:bg-white/[0.06] focus:text-white/85";

  // Drag handlers
  const handlePointerDown = useCallback((e: React.PointerEvent, winId: string, index: number) => {
    if (e.button !== 0) return;
    dragStart.current = { x: e.clientX, index };
    isDragging.current = false;
    setDragId(winId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragStart.current || !dragId) return;
    const dx = Math.abs(e.clientX - dragStart.current.x);
    if (dx < DRAG_THRESHOLD && !isDragging.current) return;
    isDragging.current = true;

    // Determine which tab we're over based on pointer position
    const tabContainer = (e.currentTarget as HTMLElement);
    const tabButtons = tabContainer.querySelectorAll<HTMLElement>('[data-tab-index]');
    let closestIndex = dragStart.current.index;
    let closestDist = Infinity;
    tabButtons.forEach(btn => {
      const rect = btn.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      const dist = Math.abs(e.clientX - center);
      const idx = parseInt(btn.dataset.tabIndex || "0");
      if (dist < closestDist) {
        closestDist = dist;
        closestIndex = idx;
      }
    });
    setDragOverIndex(closestIndex);
  }, [dragId]);

  const handlePointerUp = useCallback(() => {
    if (isDragging.current && dragStart.current && dragOverIndex !== null && dragOverIndex !== dragStart.current.index) {
      // Map from orderedTabs index to windows array index
      const fromWin = orderedTabs[dragStart.current.index];
      const toWin = orderedTabs[dragOverIndex];
      if (fromWin && toWin) {
        const fromIdx = windows.findIndex(w => w.id === fromWin.id);
        const toIdx = windows.findIndex(w => w.id === toWin.id);
        if (fromIdx >= 0 && toIdx >= 0) {
          onReorderWindows(fromIdx, toIdx);
        }
      }
    }
    dragStart.current = null;
    isDragging.current = false;
    setDragId(null);
    setDragOverIndex(null);
  }, [dragOverIndex, orderedTabs, windows, onReorderWindows]);

  const handleMergeAll = useCallback(() => {
    const visible = visibleWindows.filter(w => !w.minimized);
    if (visible.length >= 2) {
      onMergeTabs(visible.map(w => w.id));
    }
  }, [visibleWindows, onMergeTabs]);

  return (
    <div
      data-tabbar
      className="fixed top-0 inset-x-0 z-[200] flex items-center select-none"
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
            className="flex items-center justify-center shrink-0 h-full transition-opacity duration-150 hover:opacity-70"
            style={{ width: 46 }}
          >
            <Home className={`w-[16px] h-[16px] ${isLight ? "text-black/60" : "text-white/60"}`} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className={`rounded-xl min-w-[340px] p-0 ${menuContentClass}`}
          align="start"
          sideOffset={4}
        >
          {/* Header */}
          <div className={`px-4 pt-3 pb-2 flex items-center gap-2 ${isLight ? "text-black/80" : "text-white/80"}`}>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isLight ? "bg-black/[0.06]" : "bg-white/[0.08]"}`}>
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[13px] font-semibold tracking-tight">UOR OS</span>
              <span className={`ml-1.5 text-[10px] font-medium ${isLight ? "text-black/30" : "text-white/25"}`}>v0.2</span>
            </div>
          </div>

          <DropdownMenuSeparator className={isLight ? "bg-black/[0.05]" : "bg-white/[0.05]"} />

          {/* App grid by category */}
          <div className="px-2 py-2">
            {(() => {
              const visibleApps = DESKTOP_APPS.filter(a => !a.hidden);
              const categories = [...new Set(visibleApps.map(a => a.category))] as OsCategory[];
              return categories.map(cat => {
                const catApps = visibleApps.filter(a => a.category === cat);
                const catInfo = OS_TAXONOMY[cat];
                return (
                  <div key={cat} className="mb-2 last:mb-0">
                    <div className={`px-2 py-1 text-[10px] font-semibold uppercase tracking-widest ${isLight ? "text-black/25" : "text-white/20"}`}>
                      {catInfo.label}
                    </div>
                    <div className="grid grid-cols-3 gap-0.5">
                      {catApps.map(app => {
                        const AppIcon = app.icon;
                        return (
                          <DropdownMenuItem
                            key={app.id}
                            className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg cursor-pointer ${menuItemClass}`}
                            onSelect={() => onOpenApp?.(app.id)}
                          >
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center"
                              style={{
                                background: isLight
                                  ? `${app.color.replace(")", " / 0.12)").replace("hsl(", "hsla(")}`
                                  : `${app.color.replace(")", " / 0.18)").replace("hsl(", "hsla(")}`,
                              }}
                            >
                              <AppIcon className="w-[18px] h-[18px]" style={{ color: app.color }} />
                            </div>
                            <span className={`text-[11px] font-medium leading-tight ${isLight ? "text-black/70" : "text-white/70"}`}>
                              {app.label}
                            </span>
                          </DropdownMenuItem>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          <DropdownMenuSeparator className={isLight ? "bg-black/[0.05]" : "bg-white/[0.05]"} />

          {/* System section */}
          <div className="py-1">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className={menuItemClass}>
                <Monitor className="w-3.5 h-3.5 mr-2 opacity-50" />
                Appearance
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className={`rounded-xl ${menuContentClass}`}>
                {([
                  { key: "immersive" as DesktopTheme, label: "Immersive", icon: Sparkles },
                  { key: "dark" as DesktopTheme, label: "Dark", icon: Moon },
                  { key: "light" as DesktopTheme, label: "Light", icon: Sun },
                ] as const).map(t => (
                  <DropdownMenuCheckboxItem
                    key={t.key}
                    checked={theme === t.key}
                    onCheckedChange={() => setTheme(t.key)}
                    className={menuItemClass}
                  >
                    <t.icon className="w-3.5 h-3.5 mr-2 opacity-50" />
                    {t.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuItem className={menuItemClass} onSelect={onHideAll}>
              <EyeOff className="w-3.5 h-3.5 mr-2 opacity-50" />
              Hide All Windows
              <span className="ml-auto text-[10px] opacity-40">⌘H</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className={isLight ? "bg-black/[0.05]" : "bg-white/[0.05]"} />

            <DropdownMenuItem className={menuItemClass} onSelect={onSpotlight}>
              <Keyboard className="w-3.5 h-3.5 mr-2 opacity-50" />
              Search
              <span className="ml-auto text-[10px] opacity-40">⌘K</span>
            </DropdownMenuItem>

            <DropdownMenuItem className={menuItemClass} disabled>
              <Info className="w-3.5 h-3.5 mr-2 opacity-50" />
              About UOR OS
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        onClick={onSpotlight}
        className={`flex items-center justify-center w-[28px] h-[28px] rounded-md shrink-0 transition-colors duration-150 ${isLight ? "hover:bg-black/[0.05]" : "hover:bg-white/[0.06]"}`}
        title="Search (⌘K)"
      >
        <Search className={`w-[14px] h-[14px] ${isLight ? "text-black/40" : "text-white/40"}`} />
      </button>

      {/* Tabs with drag support */}
      <div
        className="flex items-end flex-1 min-w-0 overflow-x-auto gap-0 pr-1"
        style={{ height: TAB_BAR_H }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {orderedTabs.map((win, tabIndex) => {
          const isActive = win.id === activeWindowId && !win.minimized;
          const isMini = win.minimized;
          const app = getApp(win.appId);
          const Icon = app?.icon;
          const label = truncatedLabels[win.id] || win.title;
          const isPinned = win.pinned;
          const hasMerged = win.mergedChildren && win.mergedChildren.length > 0;
          const isBeingDragged = dragId === win.id && isDragging.current;
          const showDropIndicator = dragOverIndex === tabIndex && dragId !== win.id;

          return (
            <ContextMenu key={win.id}>
              <ContextMenuTrigger asChild>
                <button
                  data-tab-index={tabIndex}
                  className={`chrome-tab group relative flex items-center gap-1.5 px-3
                    text-[12px] font-medium whitespace-nowrap shrink-0
                    ${isActive ? tabTextActive : isMini ? tabTextMuted : tabText}
                    ${isActive ? "chrome-tab-active" : ""}
                    ${isBeingDragged ? "opacity-50" : ""}
                  `}
                  style={{
                    height: TAB_H,
                    width: isPinned ? PINNED_TAB_W : undefined,
                    minWidth: isPinned ? PINNED_TAB_W : 120,
                    maxWidth: isPinned ? PINNED_TAB_W : 220,
                    transition: `all ${TIMING.fast}ms ease-out`,
                    background: isActive ? activeBg : "transparent",
                    borderRadius: "8px 8px 0 0",
                    marginBottom: 0,
                    borderLeft: showDropIndicator ? `2px solid ${isLight ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.4)"}` : "none",
                  }}
                  onClick={() => {
                    if (!isDragging.current) onFocusWindow(win.id);
                  }}
                  onPointerDown={(e) => handlePointerDown(e, win.id, tabIndex)}
                  onMouseEnter={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = hoverBg;
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                  title={win.title}
                >
                  {/* Tab separator (left) */}
                  {!isActive && !showDropIndicator && (
                    <span
                      className="absolute left-0 top-[8px] bottom-[8px] w-px"
                      style={{ background: separatorColor }}
                    />
                  )}

                  {Icon && <Icon className={`shrink-0 opacity-60 ${isPinned ? "w-4 h-4" : "w-3.5 h-3.5"}`} />}
                  
                  {/* Merged badge */}
                  {hasMerged && (
                    <Layers className="w-3 h-3 shrink-0 opacity-40" />
                  )}

                  {/* Label — hidden for pinned tabs */}
                  {!isPinned && (
                    <span className="flex-1 text-left overflow-hidden text-ellipsis">{label}</span>
                  )}

                  {/* Close / pin indicator */}
                  {isPinned ? (
                    <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isLight ? "bg-black/20" : "bg-white/20"}`} />
                  ) : (
                    <span
                      className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-opacity duration-150
                        opacity-0 group-hover:opacity-100 ${isActive ? "opacity-50" : ""}
                        ${isLight ? "hover:bg-black/10" : "hover:bg-white/12"}
                      `}
                      onClick={(e) => { e.stopPropagation(); onCloseWindow(win.id); }}
                    >
                      <X className="w-3 h-3" />
                    </span>
                  )}
                </button>
              </ContextMenuTrigger>
              <ContextMenuContent className={`rounded-xl min-w-[160px] ${menuContentClass}`}>
                <ContextMenuItem className={menuItemClass} onSelect={() => onTogglePin(win.id)}>
                  <Pin className="w-3.5 h-3.5 mr-2 opacity-50" />
                  {isPinned ? "Unpin Tab" : "Pin Tab"}
                </ContextMenuItem>
                <ContextMenuSeparator className={isLight ? "bg-black/[0.05]" : "bg-white/[0.05]"} />
                {hasMerged ? (
                  <ContextMenuItem className={menuItemClass} onSelect={() => onUnmergeTabs(win.id)}>
                    <SplitSquareHorizontal className="w-3.5 h-3.5 mr-2 opacity-50" />
                    Unmerge Tabs
                  </ContextMenuItem>
                ) : (
                  <ContextMenuItem
                    className={menuItemClass}
                    onSelect={handleMergeAll}
                    disabled={visibleWindows.filter(w => !w.minimized).length < 2}
                  >
                    <Layers className="w-3.5 h-3.5 mr-2 opacity-50" />
                    Merge All Tabs
                  </ContextMenuItem>
                )}
                <ContextMenuSeparator className={isLight ? "bg-black/[0.05]" : "bg-white/[0.05]"} />
                <ContextMenuItem className={menuItemClass} onSelect={() => onCloseWindow(win.id)}>
                  <X className="w-3.5 h-3.5 mr-2 opacity-50" />
                  Close Tab
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}

        {/* New tab "+" */}
        <button
          className={`flex items-center justify-center w-[28px] h-[28px] rounded-full shrink-0 ml-1 transition-colors duration-150
            ${isLight ? "hover:bg-black/[0.05] text-black/40" : "hover:bg-white/[0.07] text-white/40"}
          `}
          style={{ marginTop: "auto", marginBottom: "auto" }}
          onClick={onSpotlight}
          title="New tab (⌘K)"
        >
          <Plus className="w-[16px] h-[16px]" />
        </button>

        {/* Snap layout picker */}
        <div style={{ marginTop: "auto", marginBottom: "auto" }} className="shrink-0 ml-0.5">
          <SnapLayoutPicker windows={visibleWindows} onSnapMultiple={onSnapMultiple} />
        </div>
      </div>

      {/* Right: time + profile */}
      <div className="flex items-center shrink-0 pr-2.5 h-full" style={{ gap: `${SPACE.md}px` }}>
        <span
          className={`text-[12px] ${clockColor} font-medium tabular-nums transition-opacity duration-300`}
          style={{ opacity: hideTime ? 0 : 1 }}
        >
          {formatted}&ensp;{clock}
        </span>
        <button
          onClick={onProfileOpen}
          className={`flex items-center justify-center w-[24px] h-[24px] rounded-full transition-all duration-150 overflow-hidden
            ${isLight
              ? "bg-black/[0.08] hover:bg-black/[0.12] border border-black/[0.08]"
              : "bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.08]"
            }
          `}
          title="Profile"
        >
          <User className={`w-[13px] h-[13px] ${isLight ? "text-black/45" : "text-white/45"}`} />
        </button>
      </div>
    </div>
  );
}
