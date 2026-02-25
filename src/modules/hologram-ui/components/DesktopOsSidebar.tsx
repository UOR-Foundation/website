/**
 * DesktopOsSidebar — Claude-Inspired, Aman-Styled Navigation
 * ═══════════════════════════════════════════════════════════
 *
 * A serene sidebar that feels like an OS-level navigation.
 * Tranquil, balanced, noble — inspired by Aman's presentation of space.
 */

import { useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Plus, MessageSquare, Compass, Grid3X3,
  User, Shield, FileText, Globe, Settings,
  Sparkles, ChevronLeft, Search,
} from "lucide-react";

/* ── Palette (shared with HologramAiChat) ──────────────────────── */
const S = {
  bg: "hsl(220, 16%, 7%)",
  surface: "hsla(220, 14%, 12%, 0.9)",
  surfaceHover: "hsla(220, 14%, 16%, 0.8)",
  surfaceActive: "hsla(38, 20%, 18%, 0.5)",
  border: "hsla(0, 0%, 100%, 0.06)",
  text: "hsl(38, 15%, 82%)",
  textMuted: "hsl(220, 8%, 48%)",
  textDim: "hsl(220, 6%, 38%)",
  gold: "hsl(38, 45%, 50%)",
  goldBg: "hsla(38, 45%, 50%, 0.08)",
  font: "'DM Sans', system-ui, sans-serif",
  fontDisplay: "'Playfair Display', serif",
} as const;

/* ── Navigation Items ──────────────────────────────────────────── */
interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
}

const NAV_EXPLORE: NavItem[] = [
  { label: "Console",     icon: Grid3X3,   path: "/hologram-console" },
  { label: "Applications", icon: Compass,   path: "/console/apps" },
  { label: "Your Space",  icon: User,      path: "/your-space" },
];

const NAV_FRAMEWORK: NavItem[] = [
  { label: "UOR Standard", icon: FileText,  path: "/standard" },
  { label: "Community",    icon: Globe,     path: "/research" },
  { label: "Trust",        icon: Shield,    path: "/console/trust" },
];

/* ── Mock Recent Conversations ─────────────────────────────────── */
interface RecentChat {
  id: string;
  title: string;
  timeAgo: string;
}

const RECENT_CHATS: RecentChat[] = [
  { id: "1", title: "Deploying my first app", timeAgo: "2h ago" },
  { id: "2", title: "Identity verification flow", timeAgo: "Yesterday" },
  { id: "3", title: "Content-addressing explained", timeAgo: "3 days ago" },
];

/* ── Props ─────────────────────────────────────────────────────── */
interface DesktopOsSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onNewChat: () => void;
  onOpenChat: () => void;
}

/* ── Component ─────────────────────────────────────────────────── */
export default function DesktopOsSidebar({
  collapsed,
  onToggle,
  onNewChat,
  onOpenChat,
}: DesktopOsSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname],
  );

  const w = collapsed ? "w-[68px]" : "w-[280px]";

  return (
    <aside
      className={`flex flex-col h-full ${w} transition-all duration-300 ease-out shrink-0`}
      style={{
        background: S.bg,
        borderRight: `1px solid ${S.border}`,
      }}
    >
      {/* ── Top: New Chat + Collapse ─────────────────────────── */}
      <div className="flex items-center justify-between px-3 pt-4 pb-2">
        {!collapsed && (
          <button
            onClick={onNewChat}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm tracking-wide transition-all duration-200 hover:scale-[1.02]"
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
        )}
        {collapsed && (
          <button
            onClick={onNewChat}
            className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center transition-colors"
            style={{ background: S.surfaceHover, border: `1px solid ${S.border}` }}
            title="New chat"
          >
            <Plus className="w-4 h-4" style={{ color: S.gold }} />
          </button>
        )}
        {!collapsed && (
          <button
            onClick={onToggle}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/[0.04]"
            style={{ color: S.textMuted }}
            title="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Search (expanded only) ───────────────────────────── */}
      {!collapsed && (
        <div className="px-3 pb-2">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors cursor-text"
            style={{
              background: "hsla(0, 0%, 100%, 0.03)",
              border: `1px solid ${S.border}`,
            }}
          >
            <Search className="w-3.5 h-3.5" style={{ color: S.textDim }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/20"
              style={{ color: S.text, fontFamily: S.font }}
            />
          </div>
        </div>
      )}

      {/* ── Recent Chats ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-2 pt-1">
        {!collapsed && (
          <p
            className="px-2 pt-3 pb-1.5 text-[10px] uppercase tracking-[0.2em]"
            style={{ color: S.textDim, fontFamily: S.font }}
          >
            Recent
          </p>
        )}

        <div className="space-y-0.5">
          {(collapsed ? RECENT_CHATS.slice(0, 3) : RECENT_CHATS).map((chat) => (
            <button
              key={chat.id}
              onClick={onOpenChat}
              className={`w-full flex items-center gap-2.5 rounded-lg text-left transition-all duration-150 ${
                collapsed ? "justify-center px-0 py-2.5" : "px-2.5 py-2"
              }`}
              style={{ color: S.text }}
              onMouseEnter={(e) => { e.currentTarget.style.background = S.surfaceHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              title={collapsed ? chat.title : undefined}
            >
              <MessageSquare className="w-4 h-4 shrink-0" style={{ color: S.textMuted }} />
              {!collapsed && (
                <span
                  className="text-[13px] truncate flex-1"
                  style={{ fontFamily: S.font }}
                >
                  {chat.title}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Explore ──────────────────────────────────────────── */}
        {!collapsed && (
          <p
            className="px-2 pt-5 pb-1.5 text-[10px] uppercase tracking-[0.2em]"
            style={{ color: S.textDim, fontFamily: S.font }}
          >
            Explore
          </p>
        )}
        {collapsed && <div className="h-4" />}

        <div className="space-y-0.5">
          {NAV_EXPLORE.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-2.5 rounded-lg transition-all duration-150 ${
                  collapsed ? "justify-center px-0 py-2.5" : "px-2.5 py-2"
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
                  if (!active) e.currentTarget.style.background = "transparent";
                }}
                title={collapsed ? item.label : undefined}
              >
                <item.icon
                  className="w-4 h-4 shrink-0"
                  style={{ color: active ? S.gold : S.textMuted }}
                />
                {!collapsed && (
                  <span className="text-[13px]">{item.label}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Framework ────────────────────────────────────────── */}
        {!collapsed && (
          <p
            className="px-2 pt-5 pb-1.5 text-[10px] uppercase tracking-[0.2em]"
            style={{ color: S.textDim, fontFamily: S.font }}
          >
            Framework
          </p>
        )}
        {collapsed && <div className="h-4" />}

        <div className="space-y-0.5">
          {NAV_FRAMEWORK.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-2.5 rounded-lg transition-all duration-150 ${
                  collapsed ? "justify-center px-0 py-2.5" : "px-2.5 py-2"
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
                  if (!active) e.currentTarget.style.background = "transparent";
                }}
                title={collapsed ? item.label : undefined}
              >
                <item.icon
                  className="w-4 h-4 shrink-0"
                  style={{ color: active ? S.gold : S.textMuted }}
                />
                {!collapsed && (
                  <span className="text-[13px]">{item.label}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Bottom: Brand + Settings ──────────────────────────── */}
      <div
        className="px-3 py-3 space-y-2"
        style={{ borderTop: `1px solid ${S.border}` }}
      >
        {/* Settings link */}
        <button
          onClick={() => navigate("/settings")}
          className={`w-full flex items-center gap-2.5 rounded-lg transition-all duration-150 ${
            collapsed ? "justify-center px-0 py-2" : "px-2.5 py-2"
          }`}
          style={{ color: S.text, fontFamily: S.font }}
          onMouseEnter={(e) => { e.currentTarget.style.background = S.surfaceHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          title={collapsed ? "Settings" : undefined}
        >
          <Settings className="w-4 h-4" style={{ color: S.textMuted }} />
          {!collapsed && <span className="text-[13px]">Settings</span>}
        </button>

        {/* Branding — very discreet */}
        {!collapsed && (
          <div className="flex items-center justify-center pt-1 pb-0.5">
            <span
              className="text-[9px] uppercase tracking-[0.4em]"
              style={{ color: "hsla(0, 0%, 100%, 0.12)", fontFamily: S.font }}
            >
              Hologram OS
            </span>
          </div>
        )}

        {/* Collapsed: toggle button */}
        {collapsed && (
          <button
            onClick={onToggle}
            className="w-full flex justify-center py-1"
            title="Expand sidebar"
          >
            <ChevronLeft
              className="w-4 h-4 rotate-180 transition-transform"
              style={{ color: S.textDim }}
            />
          </button>
        )}
      </div>
    </aside>
  );
}
