/**
 * DesktopOsSidebar — Minimal, High-Contrast Navigation
 * ═════════════════════════════════════════════════════
 *
 * Simplified to 3 core familiar items: Home, Apps, Profile.
 * Higher contrast for visibility against dark backgrounds.
 * New Chat button at top, Settings at bottom.
 */

import { useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Plus, Home, LayoutGrid, User,
  Settings, ChevronLeft, HelpCircle, Inbox,
} from "lucide-react";

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

/* ── Core Navigation — 3 familiar items ─────────────────────── */
interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home",     icon: Home,       path: "/hologram-console" },
  { label: "Apps",     icon: LayoutGrid, path: "/console/apps" },
  { label: "Profile",  icon: User,       path: "/your-space" },
];

/* ── Props ─────────────────────────────────────────────────── */
interface DesktopOsSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onNewChat: () => void;
  onOpenChat: () => void;
  onReplayGuide?: () => void;
}

/* ── Component ─────────────────────────────────────────────── */
export default function DesktopOsSidebar({
  collapsed,
  onToggle,
  onNewChat,
  onReplayGuide,
}: DesktopOsSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname],
  );

  const w = collapsed ? "w-[68px]" : "w-[240px]";

  return (
    <aside
      className={`flex flex-col h-full ${w} transition-all duration-300 ease-out shrink-0`}
      style={{
        background: S.bg,
        borderRight: `1px solid ${S.border}`,
      }}
    >
      {/* ── Top: New Chat ─────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 pt-5 pb-6">
        {!collapsed ? (
          <>
            <button
              onClick={onNewChat}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm tracking-wide transition-all duration-200 hover:scale-[1.02]"
              style={{
                color: S.text,
                background: S.surfaceHover,
                border: `1px solid ${S.border}`,
                fontFamily: S.font,
              }}
            >
              <Plus className="w-4 h-4" style={{ color: S.gold }} />
              <span>New chat</span>
            </button>
            <button
              onClick={onToggle}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/[0.06]"
              style={{ color: S.textMuted }}
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            onClick={onToggle}
            className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center transition-colors hover:bg-white/[0.06]"
            style={{ background: S.surfaceHover, border: `1px solid ${S.border}` }}
            title="Expand sidebar"
          >
            <ChevronLeft className="w-4.5 h-4.5 rotate-180" style={{ color: S.gold }} />
          </button>
        )}
      </div>

      {/* ── Core Navigation — 3 items ─────────────────────────── */}
      <div className="flex-1 px-2.5 space-y-1">
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
                <span className="text-[14px] font-light">{item.label}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Bottom: Settings + Expand ─────────────────────────── */}
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
            title={collapsed ? "Replay Guide" : undefined}
          >
            <HelpCircle className="w-5 h-5" strokeWidth={1.5} style={{ color: S.textMuted }} />
            {!collapsed && <span className="text-[14px] font-light">Replay Guide</span>}
          </button>
        )}
        <button
          onClick={() => {/* TODO: open messages/alerts */}}
          className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200 ${
            collapsed ? "justify-center px-0 py-3" : "px-3.5 py-3"
          }`}
          style={{ color: S.text, fontFamily: S.font }}
          onMouseEnter={(e) => { e.currentTarget.style.background = S.surfaceHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          title={collapsed ? "Messages" : undefined}
        >
          <Inbox className="w-5 h-5" strokeWidth={1.5} style={{ color: S.textMuted }} />
          {!collapsed && <span className="text-[14px] font-light">Messages</span>}
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
          {!collapsed && <span className="text-[14px] font-light">Settings</span>}
        </button>

      </div>
    </aside>
  );
}
