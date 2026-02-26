/**
 * DesktopOsSidebar — Always-collapsed icon sidebar
 * ═══════════════════════════════════════════════════
 *
 * Fixed-width icon rail. Click the logo to expand inline;
 * no drag-to-resize handle.
 */

import { useCallback, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Home, LayoutGrid, User, Globe,
  Settings, HelpCircle, Inbox, PanelLeftOpen, PanelLeftClose,
} from "lucide-react";
import HologramLogo from "./HologramLogo";

/* ── Tooltip wrapper for collapsed icon buttons ────────────── */
function IconTooltip({ label, children, show }: { label: string; children: React.ReactNode; show: boolean }) {
  if (!show) return <>{children}</>;
  return (
    <div className="relative group/tip">
      {children}
      <div
        className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 rounded-lg text-[13px] font-light whitespace-nowrap opacity-0 scale-95 group-hover/tip:opacity-100 group-hover/tip:scale-100 transition-all duration-200 z-50"
        style={{
          background: "hsl(25, 10%, 16%)",
          color: "hsl(38, 15%, 85%)",
          border: "1px solid hsla(38, 12%, 70%, 0.15)",
          boxShadow: "0 8px 24px -6px hsla(25, 15%, 5%, 0.5)",
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}
      >
        {label}
      </div>
    </div>
  );
}

/* ── Palette — adapts to bgMode ────────────────────────────── */
function getS(bgMode: "image" | "white" | "dark") {
  if (bgMode === "white") return {
    bg: "hsl(0, 0%, 97%)",
    surfaceHover: "hsla(0, 0%, 0%, 0.04)",
    surfaceActive: "hsla(0, 0%, 0%, 0.08)",
    border: "hsla(0, 0%, 0%, 0.08)",
    text: "hsl(0, 0%, 15%)",
    textMuted: "hsl(0, 0%, 45%)",
    gold: "hsl(38, 35%, 42%)",
    font: "'DM Sans', system-ui, sans-serif",
    logoFilter: "invert(1) brightness(0.15)",
  } as const;
  return {
    bg: "hsl(25, 8%, 10%)",
    surfaceHover: "hsla(38, 12%, 90%, 0.08)",
    surfaceActive: "hsla(38, 20%, 85%, 0.12)",
    border: "hsla(38, 12%, 70%, 0.1)",
    text: "hsl(38, 10%, 88%)",
    textMuted: "hsl(38, 8%, 60%)",
    gold: "hsl(38, 40%, 65%)",
    font: "'DM Sans', system-ui, sans-serif",
    logoFilter: "brightness(1.1)",
  } as const;
}

/* ── OS-aware modifier key ──────────────────────────────────── */
function detectMac(): boolean {
  if (typeof navigator === "undefined") return false;
  if ("userAgentData" in navigator && (navigator as any).userAgentData?.platform) {
    return /mac/i.test((navigator as any).userAgentData.platform);
  }
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform) || /Macintosh/i.test(navigator.userAgent);
}
const MOD_KEY = detectMac() ? "⌘" : "Ctrl";

/* ── Nav items ─────────────────────────────────────────────── */
interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home",    icon: Home,       path: "/hologram-console" },
  { label: "Apps",    icon: LayoutGrid, path: "/console/apps" },
  { label: "Profile", icon: User,       path: "/your-space" },
];

const COLLAPSED_W = 68;
const EXPANDED_W = 220;

/* ── Props ─────────────────────────────────────────────────── */
interface DesktopOsSidebarProps {
  onNewChat: () => void;
  onOpenChat: () => void;
  onOpenBrowser?: () => void;
  onReplayGuide?: () => void;
  hintOpacity?: (key: string) => number;
  bgMode?: "image" | "white" | "dark";
}

/* ── Component ─────────────────────────────────────────────── */
export default function DesktopOsSidebar({
  onNewChat,
  onOpenBrowser,
  onReplayGuide,
  hintOpacity,
  bgMode = "image",
}: DesktopOsSidebarProps) {
  const S = getS(bgMode);
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname],
  );

  const w = expanded ? EXPANDED_W : COLLAPSED_W;

  return (
    <aside
      className="flex flex-col h-full shrink-0 relative"
      style={{
        width: `${w}px`,
        background: S.bg,
        borderRight: `1px solid ${S.border}`,
        transition: "width 300ms cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      {/* ── Top: Logo / toggle ─────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 pt-5 pb-6">
        {expanded ? (
          <>
            <div className="flex items-center gap-2.5 px-2 py-1 overflow-hidden">
              <HologramLogo
                size={28}
                color={bgMode === "white" ? "hsl(30, 15%, 30%)" : "hsl(38, 25%, 80%)"}
                className="shrink-0"
              />
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
              onClick={() => setExpanded(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/[0.06]"
              style={{ color: S.textMuted }}
              title={`Collapse sidebar (${MOD_KEY} B)`}
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </>
        ) : (
        <button
            onClick={() => setExpanded(true)}
            className="group/logo w-11 h-11 mx-auto rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 relative"
            style={{ background: S.surfaceActive, border: `1px solid ${S.border}` }}
            title={`Expand sidebar (${MOD_KEY} B)`}
          >
            <HologramLogo
              size={24}
              color={bgMode === "white" ? "hsl(30, 15%, 30%)" : "hsl(38, 25%, 80%)"}
              className="absolute transition-opacity duration-200 group-hover/logo:opacity-0"
            />
            <PanelLeftOpen
              className="w-5 h-5 absolute transition-opacity duration-200 opacity-0 group-hover/logo:opacity-100"
              strokeWidth={1.4}
              style={{ color: S.gold }}
            />
          </button>
        )}
      </div>

      {/* ── Core Navigation ───────────────────────────────────── */}
      <div className="flex-1 px-2.5 space-y-1 overflow-hidden">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path);
          return (
            <IconTooltip key={item.path} label={item.label} show={!expanded}>
              <button
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200 ${
                  !expanded ? "justify-center px-0 py-3" : "px-3.5 py-3"
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
                  e.currentTarget.style.background = active ? S.surfaceActive : "transparent";
                }}
              >
                <item.icon
                  className="w-5 h-5 shrink-0"
                  strokeWidth={1.5}
                  style={{ color: active ? S.gold : S.textMuted }}
                />
                {expanded && (
                  <span className="text-[14px] font-light whitespace-nowrap">{item.label}</span>
                )}
              </button>
            </IconTooltip>
          );
        })}

        {/* Browser — special action button, not a route */}
        {onOpenBrowser && (
          <IconTooltip label="Browser" show={!expanded}>
            <button
              onClick={onOpenBrowser}
              className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200 ${
                !expanded ? "justify-center px-0 py-3" : "px-3.5 py-3"
              }`}
              style={{ color: S.text, fontFamily: S.font }}
              onMouseEnter={(e) => { e.currentTarget.style.background = S.surfaceHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <Globe className="w-5 h-5 shrink-0" strokeWidth={1.5} style={{ color: S.textMuted }} />
              {expanded && <span className="text-[14px] font-light whitespace-nowrap">Browser</span>}
            </button>
          </IconTooltip>
        )}
      </div>

      {/* ── Bottom: Settings + Help ───────────────────────────── */}
      <div
        className="px-2.5 py-4 space-y-1"
        style={{ borderTop: `1px solid ${S.border}` }}
      >
        {onReplayGuide && (
          <IconTooltip label={`Help (${MOD_KEY} /)`} show={!expanded}>
            <button
              onClick={onReplayGuide}
              className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200 ${
                !expanded ? "justify-center px-0 py-3" : "px-3.5 py-3"
              }`}
              style={{ color: S.text, fontFamily: S.font }}
              onMouseEnter={(e) => { e.currentTarget.style.background = S.surfaceHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <HelpCircle className="w-5 h-5" strokeWidth={1.5} style={{ color: S.textMuted }} />
              {expanded && <span className="text-[14px] font-light">Help</span>}
            </button>
          </IconTooltip>
        )}
        <IconTooltip label={`Messages (${MOD_KEY} M)`} show={!expanded}>
          <button
            onClick={() => {}}
            className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200 ${
              !expanded ? "justify-center px-0 py-3" : "px-3.5 py-3"
            }`}
            style={{ color: S.text, fontFamily: S.font }}
            onMouseEnter={(e) => { e.currentTarget.style.background = S.surfaceHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <Inbox className="w-5 h-5" strokeWidth={1.5} style={{ color: S.textMuted }} />
            {expanded && <span className="text-[14px] font-light">Messages</span>}
          </button>
        </IconTooltip>
        <IconTooltip label="Settings" show={!expanded}>
          <button
            onClick={() => navigate("/settings")}
            className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200 ${
              !expanded ? "justify-center px-0 py-3" : "px-3.5 py-3"
            }`}
            style={{ color: S.text, fontFamily: S.font }}
            onMouseEnter={(e) => { e.currentTarget.style.background = S.surfaceHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <Settings className="w-5 h-5" strokeWidth={1.5} style={{ color: S.textMuted }} />
            {expanded && <span className="text-[14px] font-light">Settings</span>}
          </button>
        </IconTooltip>
      </div>
    </aside>
  );
}
