/**
 * DesktopOsSidebar — Always-collapsed icon sidebar
 * ═══════════════════════════════════════════════════
 *
 * Performance optimized:
 *   - All hover effects via CSS custom properties + :hover (zero JS)
 *   - Static style objects hoisted to module scope
 *   - will-change: width for compositor-promoted expansion
 */

import { useCallback, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Home, LayoutGrid, User, Globe, Cpu, Database,
  Settings, HelpCircle, Inbox, PanelLeftOpen, PanelLeftClose,
  Terminal, Beaker,
} from "lucide-react";
import HologramLogo from "./HologramLogo";
import DataBankIndicator from "./DataBankIndicator";
import { ShareTheLoveModal } from "./ShareTheLoveModal";
import TextSizeControl from "./TextSizeControl";
import { useTextSize, type TextSize } from "@/modules/hologram-ui/hooks/useTextSize";


/* ── Tooltip wrapper ───────────────────────────────────────── */
function IconTooltip({ label, children, show }: { label: string; children: React.ReactNode; show: boolean }) {
  if (!show) return <>{children}</>;
  return (
    <div className="relative group/tip">
      {children}
      <div className="sidebar-tooltip pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 rounded-lg text-[13px] font-light whitespace-nowrap opacity-0 scale-95 group-hover/tip:opacity-100 group-hover/tip:scale-100 transition-all duration-200 z-50">
        {label}
      </div>
    </div>
  );
}

/* ── Palette — CSS variables set on the sidebar root ────────── */
function getPaletteVars(bgMode: "image" | "white" | "dark") {
  if (bgMode === "white") return {
    "--sb-bg": "hsl(0, 0%, 97%)",
    "--sb-hover": "hsla(0, 0%, 0%, 0.04)",
    "--sb-active": "hsla(0, 0%, 0%, 0.08)",
    "--sb-border": "hsla(0, 0%, 0%, 0.08)",
    "--sb-text": "hsl(0, 0%, 15%)",
    "--sb-muted": "hsl(0, 0%, 45%)",
    "--sb-gold": "hsl(38, 35%, 42%)",
  } as Record<string, string>;
  return {
    "--sb-bg": "hsl(25, 8%, 10%)",
    "--sb-hover": "hsla(38, 12%, 90%, 0.08)",
    "--sb-active": "hsla(38, 20%, 85%, 0.12)",
    "--sb-border": "hsla(38, 12%, 70%, 0.1)",
    "--sb-text": "hsl(38, 10%, 88%)",
    "--sb-muted": "hsl(38, 8%, 60%)",
    "--sb-gold": "hsl(38, 40%, 65%)",
  } as Record<string, string>;
}

/* ── OS-aware modifier key ──────────────────────────────────── */
const MOD_KEY = (() => {
  if (typeof navigator === "undefined") return "Ctrl";
  if ("userAgentData" in navigator && (navigator as any).userAgentData?.platform) {
    return /mac/i.test((navigator as any).userAgentData.platform) ? "⌘" : "Ctrl";
  }
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform) || /Macintosh/i.test(navigator.userAgent) ? "⌘" : "Ctrl";
})();

/* ── Nav items ─────────────────────────────────────────────── */
interface NavItem { label: string; icon: React.ElementType; path: string }

const NAV_ITEMS: NavItem[] = [
  { label: "Home",     icon: Home,       path: "/hologram-console" },
  { label: "My Space", icon: User,       path: "/your-space" },
  { label: "Apps",     icon: LayoutGrid, path: "/console/apps" },
];

const COLLAPSED_W = 68;
const EXPANDED_W = 220;

/* ── Props ─────────────────────────────────────────────────── */
interface DesktopOsSidebarProps {
  onNewChat: () => void;
  onOpenChat: () => void;
  onOpenBrowser?: () => void;
  onOpenCompute?: () => void;
  onOpenTerminal?: () => void;
  onOpenMemory?: () => void;
  onOpenMessenger?: () => void;
  onOpenJupyter?: () => void;
  onGoHome?: () => void;
  onReplayGuide?: () => void;
  hintOpacity?: (key: string) => number;
  bgMode?: "image" | "white" | "dark";
}

/* ── Component ─────────────────────────────────────────────── */
export default function DesktopOsSidebar({
  onNewChat,
  onOpenBrowser,
  onOpenCompute,
  onOpenTerminal,
  onOpenMemory,
  onOpenMessenger,
  onOpenJupyter,
  onGoHome,
  onReplayGuide,
  hintOpacity,
  bgMode = "image",
}: DesktopOsSidebarProps) {
  const paletteVars = getPaletteVars(bgMode);
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const { textSize, setTextSize } = useTextSize();

  // Text size changes flow through kernel automatically via useTextSize
  const handleTextSize = useCallback((size: TextSize) => {
    setTextSize(size);
  }, [setTextSize]);

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname],
  );

  /** Collapse and fire action simultaneously — no sequential delay */
  const collapseAndDo = useCallback((action: () => void) => {
    if (expanded) {
      setExpanded(false);
      // Fire immediately so the content panel expands in sync with sidebar collapse
      requestAnimationFrame(() => action());
    } else {
      action();
    }
  }, [expanded]);

  const w = expanded ? EXPANDED_W : COLLAPSED_W;

  return (
    <>
    <aside
      className="sidebar-root flex flex-col h-full shrink-0 relative coherence-sidebar-pulse"
      style={{
        ...paletteVars,
        width: `${w}px`,
        background: "var(--sb-bg)",
        borderRight: "1px solid var(--sb-border)",
        willChange: "width",
        transition: "width 350ms cubic-bezier(0.4, 0, 0.2, 1), background 500ms ease, border-color 500ms ease, color 500ms ease",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      } as React.CSSProperties}
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
                  stroke="var(--sb-text)"
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
              className="sidebar-btn w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ color: "var(--sb-muted)" }}
              title={`Collapse sidebar (${MOD_KEY} B)`}
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            onClick={() => setExpanded(true)}
            className="group/logo sidebar-logo-btn w-11 h-11 mx-auto rounded-xl flex items-center justify-center transition-transform duration-200 hover:scale-105 relative"
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
              style={{ color: "var(--sb-gold)" }}
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
                onClick={() => collapseAndDo(() => {
                  if (item.label === "Home" && onGoHome) {
                    onGoHome();
                  } else if (item.label === "My Space") {
                    navigate("/ceremony");
                  } else {
                    navigate(item.path);
                  }
                })}
                className={`sidebar-nav-btn w-full flex items-center gap-3 rounded-xl transition-colors duration-200 ${
                  !expanded ? "justify-center px-0 py-3" : "px-3.5 py-3"
                } ${active ? "sidebar-nav-active" : ""}`}
                style={{
                  color: active ? "var(--sb-gold)" : "var(--sb-text)",
                  background: active ? "var(--sb-active)" : "transparent",
                }}
              >
                <item.icon
                  className="w-5 h-5 shrink-0"
                  strokeWidth={1.5}
                  style={{ color: active ? "var(--sb-gold)" : "var(--sb-muted)" }}
                />
                {expanded && (
                  <span className="text-[14px] font-light whitespace-nowrap">{item.label}</span>
                )}
              </button>
            </IconTooltip>
          );
        })}

        {/* Web */}
        {onOpenBrowser && (
          <IconTooltip label="Web" show={!expanded}>
            <button
              onClick={() => collapseAndDo(onOpenBrowser)}
              className={`sidebar-nav-btn w-full flex items-center gap-3 rounded-xl transition-colors duration-200 ${
                !expanded ? "justify-center px-0 py-3" : "px-3.5 py-3"
              }`}
              style={{ color: "var(--sb-text)" }}
            >
              <Globe className="w-5 h-5 shrink-0" strokeWidth={1.5} style={{ color: "var(--sb-muted)" }} />
              {expanded && <span className="text-[14px] font-light whitespace-nowrap">Web</span>}
            </button>
          </IconTooltip>
        )}

        {/* Memory */}
        <IconTooltip label="Memory" show={!expanded}>
          <button
            onClick={() => collapseAndDo(() => onOpenMemory?.())}
            className={`sidebar-nav-btn w-full flex items-center gap-3 rounded-xl transition-colors duration-200 ${
              !expanded ? "justify-center px-0 py-3" : "px-3.5 py-3"
            }`}
            style={{ color: "var(--sb-text)", background: "transparent" }}
          >
            <Database className="w-5 h-5 shrink-0" strokeWidth={1.5} style={{ color: "var(--sb-muted)" }} />
            {expanded && <span className="text-[14px] font-light whitespace-nowrap">Memory</span>}
          </button>
        </IconTooltip>

        {/* Compute */}
        <IconTooltip label="Compute" show={!expanded}>
          <button
            onClick={() => collapseAndDo(() => onOpenCompute?.())}
            className={`sidebar-nav-btn w-full flex items-center gap-3 rounded-xl transition-colors duration-200 ${
              !expanded ? "justify-center px-0 py-3" : "px-3.5 py-3"
            }`}
            style={{ color: "var(--sb-text)", background: "transparent" }}
          >
            <Cpu className="w-5 h-5 shrink-0" strokeWidth={1.5} style={{ color: "var(--sb-muted)" }} />
            {expanded && <span className="text-[14px] font-light whitespace-nowrap">Compute</span>}
          </button>
        </IconTooltip>

        {/* Terminal */}
        {onOpenTerminal && (
          <IconTooltip label="Terminal" show={!expanded}>
            <button
              onClick={() => collapseAndDo(onOpenTerminal)}
              className={`sidebar-nav-btn w-full flex items-center gap-3 rounded-xl transition-colors duration-200 ${
                !expanded ? "justify-center px-0 py-3" : "px-3.5 py-3"
              }`}
              style={{ color: "var(--sb-text)" }}
            >
              <Terminal className="w-5 h-5 shrink-0" strokeWidth={1.5} style={{ color: "var(--sb-muted)" }} />
              {expanded && <span className="text-[14px] font-light whitespace-nowrap">Terminal</span>}
            </button>
          </IconTooltip>
        )}

        {/* Jupyter */}
        {onOpenJupyter && (
          <IconTooltip label="Jupyter" show={!expanded}>
            <button
              onClick={() => collapseAndDo(onOpenJupyter)}
              className={`sidebar-nav-btn w-full flex items-center gap-3 rounded-xl transition-colors duration-200 ${
                !expanded ? "justify-center px-0 py-3" : "px-3.5 py-3"
              }`}
              style={{ color: "var(--sb-text)" }}
            >
              <Beaker className="w-5 h-5 shrink-0" strokeWidth={1.5} style={{ color: "var(--sb-gold)" }} />
              {expanded && <span className="text-[14px] font-light whitespace-nowrap">Jupyter</span>}
            </button>
          </IconTooltip>
        )}
      </div>

      {/* Share the Love heart is now in the bottom section */}

      {/* ── Bottom: Text Size + Settings + Help ─────────────── */}
      <div className="px-2.5 py-4 space-y-1" style={{ borderTop: "1px solid var(--sb-border)" }}>
        {/* Text Size Control — visible when expanded */}
        {expanded && (
          <TextSizeControl textSize={textSize} setTextSize={handleTextSize} bgMode={bgMode} />
        )}

        {/* Share the Love — warm gradient heart, above Help */}
        <IconTooltip label="Share the Love" show={!expanded}>
          <button
            onClick={() => collapseAndDo(() => setShareOpen(true))}
            className={`sidebar-nav-btn group w-full flex items-center gap-3 rounded-xl transition-colors duration-200 ${
              !expanded ? "justify-center px-0 py-3" : "px-3.5 py-3"
            }`}
            style={{ color: "var(--sb-text)", background: "transparent" }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="shrink-0 transition-transform duration-300 group-hover:scale-110"
              style={{ opacity: 0.75 }}
            >
              <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                fill="url(#sidebarHeartGrad)"
              />
              <defs>
                <linearGradient id="sidebarHeartGrad" x1="2" y1="21" x2="22" y2="3" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="hsl(280, 55%, 50%)" />
                  <stop offset="40%" stopColor="hsl(340, 65%, 55%)" />
                  <stop offset="100%" stopColor="hsl(25, 85%, 58%)" />
                </linearGradient>
              </defs>
            </svg>
            {expanded && <span className="text-[14px] font-light whitespace-nowrap">Share the Love</span>}
          </button>
        </IconTooltip>

        {onReplayGuide && (
          <IconTooltip label={`Help (${MOD_KEY} /)`} show={!expanded}>
            <button
              onClick={() => collapseAndDo(() => onReplayGuide?.())}
              className={`sidebar-nav-btn w-full flex items-center gap-3 rounded-xl transition-colors duration-200 ${
                !expanded ? "justify-center px-0 py-3" : "px-3.5 py-3"
              }`}
              style={{ color: "var(--sb-text)" }}
            >
              <HelpCircle className="w-5 h-5" strokeWidth={1.5} style={{ color: "var(--sb-muted)" }} />
              {expanded && <span className="text-[14px] font-light">Help</span>}
            </button>
          </IconTooltip>
        )}
        <IconTooltip label={`Messages (${MOD_KEY} M)`} show={!expanded}>
          <button
            onClick={() => collapseAndDo(() => onOpenMessenger?.())}
            className={`sidebar-nav-btn w-full flex items-center gap-3 rounded-xl transition-colors duration-200 ${
              !expanded ? "justify-center px-0 py-3" : "px-3.5 py-3"
            }`}
            style={{ color: "var(--sb-text)" }}
          >
            <Inbox className="w-5 h-5" strokeWidth={1.5} style={{ color: "var(--sb-muted)" }} />
            {expanded && <span className="text-[14px] font-light">Inbox</span>}
          </button>
        </IconTooltip>
        <IconTooltip label="Settings" show={!expanded}>
          <button
            onClick={() => collapseAndDo(() => navigate("/settings"))}
            className={`sidebar-nav-btn w-full flex items-center gap-3 rounded-xl transition-colors duration-200 ${
              !expanded ? "justify-center px-0 py-3" : "px-3.5 py-3"
            }`}
            style={{ color: "var(--sb-text)" }}
          >
            <Settings className="w-5 h-5" strokeWidth={1.5} style={{ color: "var(--sb-muted)" }} />
            {expanded && <span className="text-[14px] font-light">Settings</span>}
          </button>
        </IconTooltip>
      </div>
    </aside>

    <ShareTheLoveModal open={shareOpen} onClose={() => setShareOpen(false)} />
    </>
  );
}
