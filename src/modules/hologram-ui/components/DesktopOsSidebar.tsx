/**
 * DesktopOsSidebar — Modular Resizable Navigation
 * ═════════════════════════════════════════════════
 *
 * Uses the modular panel system for drag-to-resize.
 * Collapses below a threshold width automatically.
 */

import { useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Home, LayoutGrid, User,
  Settings, ChevronLeft, ChevronRight, HelpCircle, Inbox, PanelLeftOpen,
} from "lucide-react";
import type { ModularPanelResult } from "@/modules/hologram-ui/hooks/useModularPanel";

/* ── Palette — higher contrast, warm whites ────────────────── */
const S = {
  bg: "hsl(25, 8%, 10%)",
  surfaceHover: "hsla(38, 12%, 90%, 0.08)",
  surfaceActive: "hsla(38, 20%, 85%, 0.12)",
  border: "hsla(38, 12%, 70%, 0.1)",
  text: "hsl(38, 10%, 88%)",
  textMuted: "hsl(38, 8%, 60%)",
  textDim: "hsl(30, 6%, 42%)",
  gold: "hsl(38, 40%, 65%)",
  font: "'DM Sans', system-ui, sans-serif",
} as const;

/* ── OS-aware modifier key ──────────────────────────────────── */
function detectMac(): boolean {
  if (typeof navigator === "undefined") return false;
  if ("userAgentData" in navigator && (navigator as any).userAgentData?.platform) {
    return /mac/i.test((navigator as any).userAgentData.platform);
  }
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform) || /Macintosh/i.test(navigator.userAgent);
}
const MOD_KEY = detectMac() ? "⌘" : "Ctrl";

/* ── Shortcut badge component ───────────────────────────────── */
function ShortcutBadge({ keys, opacity = 1 }: { keys: string; opacity?: number }) {
  if (opacity <= 0) return null;
  const display = keys.replace("⌘", MOD_KEY);
  return (
    <span
      className="ml-auto text-[10px] tracking-[0.15em] uppercase font-medium shrink-0 transition-opacity duration-700"
      style={{
        fontFamily: S.font,
        color: S.textMuted,
        opacity: opacity * 0.4,
      }}
    >
      {display}
    </span>
  );
}

/* ── Core Navigation — 3 familiar items ─────────────────────── */
interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  shortcut: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home",     icon: Home,       path: "/hologram-console", shortcut: "" },
  { label: "Apps",     icon: LayoutGrid, path: "/console/apps",     shortcut: "" },
  { label: "Profile",  icon: User,       path: "/your-space",       shortcut: "" },
];

/** Width below which the sidebar auto-collapses to icon-only mode */
const COLLAPSE_THRESHOLD = 120;

/* ── Props ─────────────────────────────────────────────────── */
interface DesktopOsSidebarProps {
  panel: ModularPanelResult;
  onNewChat: () => void;
  onOpenChat: () => void;
  onReplayGuide?: () => void;
  hintOpacity?: (key: string) => number;
}

/* ── Component ─────────────────────────────────────────────── */
export default function DesktopOsSidebar({
  panel,
  onNewChat,
  onReplayGuide,
  hintOpacity,
}: DesktopOsSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname],
  );

  const collapsed = panel.width < COLLAPSE_THRESHOLD;

  return (
    <aside
      className={`flex flex-col h-full shrink-0 relative ${collapsed ? "group/sidebar" : ""}`}
      style={{
        width: `${panel.width}px`,
        background: S.bg,
        borderRight: `1px solid ${S.border}`,
        transition: panel.isResizing ? "none" : "width 300ms ease-out",
      }}
    >
      {/* ── Top: Logo + collapse toggle ────────────────────────── */}
      <div className="flex items-center justify-between px-3 pt-5 pb-6">
        {!collapsed ? (
          <>
            <div className="flex items-center gap-2.5 px-2 py-1 overflow-hidden">
              {/* Geometric H monogram */}
              <svg
                width="28" height="28" viewBox="0 0 28 28"
                fill="none" stroke={S.gold} strokeWidth="1.2"
                strokeLinecap="round" strokeLinejoin="round"
                className="shrink-0"
              >
                <circle cx="14" cy="14" r="12.5" strokeOpacity="0.25" />
                <line x1="8" y1="7" x2="8" y2="21" />
                <line x1="20" y1="7" x2="20" y2="21" />
                <line x1="8" y1="14" x2="20" y2="14" />
              </svg>
              {/* SVG wordmark */}
              <svg
                viewBox="0 0 360 40"
                className="select-none"
                style={{ width: "115px", height: "auto", opacity: 0.9 }}
              >
                <g
                  fill="none"
                  stroke={S.text}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="10" y1="6" x2="10" y2="34" />
                  <line x1="30" y1="6" x2="30" y2="34" />
                  <line x1="10" y1="20" x2="30" y2="20" />
                  <ellipse cx="60" cy="20" rx="14" ry="14" />
                  <line x1="94" y1="6" x2="94" y2="34" />
                  <line x1="94" y1="34" x2="114" y2="34" />
                  <ellipse cx="144" cy="20" rx="14" ry="14" />
                  <path d="M 198 12 A 14 14 0 1 0 198 28 L 198 20 L 188 20" />
                  <line x1="222" y1="6" x2="222" y2="34" />
                  <path d="M 222 6 L 236 6 A 7 7 0 0 1 236 20 L 222 20" />
                  <line x1="232" y1="20" x2="242" y2="34" />
                  <line x1="266" y1="34" x2="280" y2="6" />
                  <line x1="280" y1="6" x2="294" y2="34" />
                  <line x1="318" y1="34" x2="318" y2="6" />
                  <line x1="318" y1="6" x2="334" y2="22" />
                  <line x1="334" y1="22" x2="350" y2="6" />
                  <line x1="350" y1="6" x2="350" y2="34" />
                </g>
              </svg>
            </div>
            <button
              onClick={() => panel.setWidth(68)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/[0.06]"
              style={{ color: S.textMuted }}
              title={`Collapse sidebar (${MOD_KEY} B)`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            onClick={() => panel.setWidth(240)}
            className="group/logo w-10 h-10 mx-auto rounded-xl flex items-center justify-center transition-all duration-200 hover:bg-white/[0.08] hover:scale-105 relative"
            style={{ background: "transparent", border: `1px solid ${S.border}` }}
            title={`Expand sidebar (${MOD_KEY} B)`}
          >
            <svg
              width="20" height="20" viewBox="0 0 28 28"
              fill="none" stroke={S.gold} strokeWidth="1.3"
              strokeLinecap="round" strokeLinejoin="round"
              className="absolute transition-opacity duration-200 group-hover/sidebar:opacity-0"
            >
              <line x1="8" y1="7" x2="8" y2="21" />
              <line x1="20" y1="7" x2="20" y2="21" />
              <line x1="8" y1="14" x2="20" y2="14" />
            </svg>
            <PanelLeftOpen
              className="w-5 h-5 absolute transition-opacity duration-200 opacity-0 group-hover/sidebar:opacity-100"
              strokeWidth={1.4}
              style={{ color: S.gold }}
            />
          </button>
        )}
      </div>

      {/* ── Core Navigation — 3 items ─────────────────────────── */}
      <div className="flex-1 px-2.5 space-y-1 overflow-hidden">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200 ${
                collapsed ? "justify-center px-0 py-3" : "px-3.5 py-3"
              }`}
              style={{
                color: active ? S.gold : S.text,
                background: active ? S.surfaceActive : "transparent",
                fontFamily: S.font,
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = S.surfaceHover;
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = active ? S.surfaceActive : "transparent";
              }}
              title={collapsed ? item.label : undefined}
            >
              <item.icon
                className="w-5 h-5 shrink-0"
                strokeWidth={1.5}
                style={{ color: active ? S.gold : S.textMuted }}
              />
              {!collapsed && (
                <span className="text-[14px] font-light whitespace-nowrap">{item.label}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Bottom: Settings + Help ───────────────────────────── */}
      <div
        className="px-2.5 py-4 space-y-1"
        style={{ borderTop: `1px solid ${S.border}` }}
      >
        {onReplayGuide && (
          <button
            onClick={onReplayGuide}
            className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200 ${
              collapsed ? "justify-center px-0 py-3" : "px-3.5 py-3"
            }`}
            style={{ color: S.text, fontFamily: S.font }}
            onMouseEnter={(e) => { e.currentTarget.style.background = S.surfaceHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            title={collapsed ? `Help (${MOD_KEY} /)` : undefined}
          >
            <HelpCircle className="w-5 h-5" strokeWidth={1.5} style={{ color: S.textMuted }} />
            {!collapsed && (
              <>
                <span className="text-[14px] font-light">Help</span>
                <ShortcutBadge keys="⌘ /" opacity={hintOpacity?.("/") ?? 1} />
              </>
            )}
          </button>
        )}
        <button
          onClick={() => {}}
          className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200 ${
            collapsed ? "justify-center px-0 py-3" : "px-3.5 py-3"
          }`}
          style={{ color: S.text, fontFamily: S.font }}
          onMouseEnter={(e) => { e.currentTarget.style.background = S.surfaceHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          title={collapsed ? `Messages (${MOD_KEY} M)` : undefined}
        >
          <Inbox className="w-5 h-5" strokeWidth={1.5} style={{ color: S.textMuted }} />
          {!collapsed && (
            <>
              <span className="text-[14px] font-light">Messages</span>
              <ShortcutBadge keys="⌘ M" opacity={hintOpacity?.("m") ?? 1} />
            </>
          )}
        </button>
        <button
          onClick={() => navigate("/settings")}
          className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200 ${
            collapsed ? "justify-center px-0 py-3" : "px-3.5 py-3"
          }`}
          style={{ color: S.text, fontFamily: S.font }}
          onMouseEnter={(e) => { e.currentTarget.style.background = S.surfaceHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          title={collapsed ? "Settings" : undefined}
        >
          <Settings className="w-5 h-5" strokeWidth={1.5} style={{ color: S.textMuted }} />
          {!collapsed && (
            <span className="text-[14px] font-light">Settings</span>
          )}
        </button>
      </div>

      {/* ── Resize handle — right edge ──────────────────────────── */}
      <div
        {...panel.resizeHandleProps}
        className="hologram-resize-handle absolute top-0 right-0 h-full"
        style={{
          ...panel.resizeHandleProps.style,
          width: "6px",
          transform: "translateX(50%)",
          zIndex: 50,
        }}
      />
    </aside>
  );
}
