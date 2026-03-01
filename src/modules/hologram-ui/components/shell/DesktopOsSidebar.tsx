/**
 * DesktopOsSidebar — Always-collapsed icon sidebar
 * ═══════════════════════════════════════════════════
 *
 * Performance optimized:
 *   - All hover effects via CSS custom properties + :hover (zero JS)
 *   - Static style objects hoisted to module scope
 *   - will-change: width for compositor-promoted expansion
 */

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Home, LayoutGrid, Fingerprint, Globe, Cpu, Database,
  Settings, HelpCircle, Inbox, PanelLeftOpen, PanelLeftClose,
  Terminal, Beaker, Atom, Code2, ChevronDown, Server, Package, FolderOpen,
  Wrench,
} from "lucide-react";
import HologramLogo from "./HologramLogo";
import DataBankIndicator from "../DataBankIndicator";
import GenesisPopover from "../GenesisPopover";
import { ShareTheLoveModal } from "../ShareTheLoveModal";
import TextSizeControl from "../TextSizeControl";
import { useTextSize, type TextSize } from "@/modules/hologram-ui/hooks/useTextSize";
import { useAttentionMode } from "@/modules/hologram-ui/hooks/useAttentionMode";


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

/* ── Flyout popover for collapsed grouped icons ─────────────── */
function SidebarFlyout({
  open,
  onClose,
  anchorRef,
  children,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  children: React.ReactNode;
}) {
  const flyoutRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0 });

  useEffect(() => {
    if (open && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({ top: rect.top });
    }
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        flyoutRef.current && !flyoutRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return (
    <div
      ref={flyoutRef}
      className="fixed z-[200] py-1.5 rounded-xl"
      style={{
        left: "62px",
        top: `${pos.top}px`,
        minWidth: "170px",
        background: "var(--sb-bg-flat)",
        border: "1px solid var(--sb-border)",
        boxShadow: "8px 4px 32px -4px hsla(25, 10%, 0%, 0.4), 0 0 0 1px hsla(38, 20%, 90%, 0.04)",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        animation: "flyout-enter 160ms cubic-bezier(0.22, 1, 0.36, 1)",
        willChange: "transform, opacity",
      }}
    >
      {children}
    </div>
  );
}

function FlyoutItem({
  icon: Icon,
  label,
  iconColor,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  iconColor?: string;
  onClick: () => void;
}) {
  return (
    <button
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        onClick();
      }}
      className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors duration-150 hover:bg-[var(--sb-hover)]"
      style={{ color: "var(--sb-text)" }}
    >
      <Icon className="w-4 h-4 shrink-0" strokeWidth={1.3} style={{ color: iconColor ?? "var(--sb-muted)" }} />
      <span className="text-[13px] font-light tracking-wide">{label}</span>
    </button>
  );
}

/* ── Palette — CSS variables set on the sidebar root ────────── */
function getPaletteVars(bgMode: "image" | "white" | "dark") {
  if (bgMode === "white") return {
    "--sb-bg": "linear-gradient(180deg, hsla(30, 12%, 97%, 0.88) 0%, hsla(30, 10%, 95%, 0.82) 100%)",
    "--sb-bg-flat": "hsla(30, 10%, 96%, 0.85)",
    "--sb-hover": "hsla(30, 8%, 0%, 0.035)",
    "--sb-active": "hsla(30, 12%, 0%, 0.06)",
    "--sb-border": "hsla(30, 15%, 80%, 0.25)",
    "--sb-border-inner": "hsla(0, 0%, 100%, 0.6)",
    "--sb-text": "hsl(25, 8%, 28%)",
    "--sb-muted": "hsl(25, 8%, 45%)",
    "--sb-gold": "hsl(32, 30%, 45%)",
    "--sb-shadow": "4px 0 32px -8px hsla(25, 15%, 20%, 0.08)",
    "--sb-highlight": "inset -1px 0 0 hsla(0, 0%, 100%, 0.5), inset 0 1px 0 hsla(0, 0%, 100%, 0.4)",
  } as Record<string, string>;
  if (bgMode === "dark") return {
    "--sb-bg": "linear-gradient(180deg, hsla(25, 6%, 5%, 0.98) 0%, hsla(25, 4%, 3%, 0.99) 100%)",
    "--sb-bg-flat": "hsla(25, 5%, 4%, 0.98)",
    "--sb-hover": "hsla(30, 12%, 95%, 0.08)",
    "--sb-active": "hsla(30, 15%, 90%, 0.12)",
    "--sb-border": "hsla(38, 10%, 30%, 0.15)",
    "--sb-border-inner": "hsla(38, 15%, 90%, 0.04)",
    "--sb-text": "hsl(30, 8%, 92%)",
    "--sb-muted": "hsl(30, 6%, 78%)",
    "--sb-gold": "hsl(34, 35%, 70%)",
    "--sb-shadow": "4px 0 40px -8px hsla(25, 10%, 0%, 0.4)",
    "--sb-highlight": "inset -1px 0 0 hsla(38, 20%, 90%, 0.04), inset 0 1px 0 hsla(38, 20%, 90%, 0.03)",
  } as Record<string, string>;
  // image mode — solid warm dark, no glass artifacts
  return {
    "--sb-bg": "linear-gradient(180deg, hsl(25, 8%, 11%) 0%, hsl(25, 6%, 7%) 100%)",
    "--sb-bg-flat": "hsl(25, 7%, 9%)",
    "--sb-hover": "hsla(30, 15%, 95%, 0.08)",
    "--sb-active": "hsla(30, 18%, 90%, 0.12)",
    "--sb-border": "hsla(38, 15%, 50%, 0.1)",
    "--sb-border-inner": "hsla(38, 25%, 95%, 0.06)",
    "--sb-text": "hsl(30, 12%, 92%)",
    "--sb-muted": "hsl(30, 10%, 65%)",
    "--sb-gold": "hsl(34, 38%, 72%)",
    "--sb-shadow": "2px 0 16px -4px hsla(25, 10%, 0%, 0.3)",
    "--sb-highlight": "inset -1px 0 0 hsla(38, 20%, 70%, 0.06)",
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
interface NavItem { label: string; icon: React.ElementType; path?: string; panel?: string }

const NAV_ITEMS: NavItem[] = [
  { label: "Home",     icon: Home,       path: "/hologram-console" },
  { label: "My Space", icon: Fingerprint, panel: "myspace" },
  { label: "Apps",     icon: LayoutGrid, panel: "apps" },
];

const COLLAPSED_W = 56;
const EXPANDED_W = 210;

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
  onOpenQuantumWorkspace?: () => void;
  onOpenCode?: () => void;
  onOpenPackages?: () => void;
  onOpenVault?: () => void;
  onOpenApps?: () => void;
  onOpenMySpace?: () => void;
  onGoHome?: () => void;
  onReplayGuide?: () => void;
  onHoverChat?: () => void;
  onHoverPanel?: (panel: string) => void;
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
  onOpenQuantumWorkspace,
  onOpenCode,
  onOpenPackages,
  onOpenVault,
  onOpenApps,
  onOpenMySpace,
  onGoHome,
  onReplayGuide,
  onHoverChat,
  onHoverPanel,
  hintOpacity,
  bgMode = "image",
}: DesktopOsSidebarProps) {
  const paletteVars = getPaletteVars(bgMode);
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [genesisOpen, setGenesisOpen] = useState(false);
  const [systemOpen, setSystemOpen] = useState(() => {
    try { return localStorage.getItem("uor:sidebar:system-open") !== "false"; } catch { return true; }
  });
  const [toolsOpen, setToolsOpen] = useState(() => {
    try { return localStorage.getItem("uor:sidebar:tools-open") !== "false"; } catch { return true; }
  });
  const { textSize, setTextSize } = useTextSize();
  const { aperture } = useAttentionMode();
  const isFocused = aperture >= 0.5;

  // Focus-responsive palette overrides — when focused, the sidebar becomes
  // more ethereal: lower opacity borders, compressed contrast, lighter weight
  const focusOverrides = useMemo((): Record<string, string> => {
    if (!isFocused) return {};
    const t = Math.min(1, (aperture - 0.3) / 0.7); // 0→1 over the focus range
    return {
      "--sb-border": `hsla(38, 10%, 50%, ${(0.06 + (1 - t) * 0.09).toFixed(3)})`,
      "--sb-hover": `hsla(30, 12%, 95%, ${(0.03 + (1 - t) * 0.05).toFixed(3)})`,
      "--sb-shadow": `2px 0 ${8 + (1 - t) * 8}px -4px hsla(25, 10%, 0%, ${(0.08 + (1 - t) * 0.22).toFixed(2)})`,
      "--sb-highlight": `inset -1px 0 0 hsla(38, 20%, 70%, ${(0.02 + (1 - t) * 0.04).toFixed(3)})`,
    };
  }, [isFocused, aperture]);

  // Flyout state for collapsed mode
  const [toolsFlyoutOpen, setToolsFlyoutOpen] = useState(false);
  const [systemFlyoutOpen, setSystemFlyoutOpen] = useState(false);
  const toolsFlyoutAnchor = useRef<HTMLButtonElement>(null);
  const systemFlyoutAnchor = useRef<HTMLButtonElement>(null);

  // Text size changes flow through kernel automatically via useTextSize
  const handleTextSize = useCallback((size: TextSize) => {
    setTextSize(size);
  }, [setTextSize]);

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname],
  );

  /**
   * Collapse and fire action simultaneously — zero delay.
   * Used with onPointerDown for instant response (saves ~80ms vs onClick).
   */
  const collapseAndDo = useCallback((action: () => void) => {
    if (expanded) setExpanded(false);
    setToolsFlyoutOpen(false);
    setSystemFlyoutOpen(false);
    action();
  }, [expanded]);

  /** onPointerDown handler factory — fires on press, not release, for instant projection */
  const pointerDown = useCallback((action: () => void) => (e: React.PointerEvent) => {
    // Only primary button (left click)
    if (e.button !== 0) return;
    e.preventDefault();
    collapseAndDo(action);
  }, [collapseAndDo]);

  const w = expanded ? EXPANDED_W : COLLAPSED_W;

  return (
    <>
    <style>{`
      @keyframes sidebar-haptic-bounce {
        0%   { transform: scale(1); }
        40%  { transform: scale(0.91); }
        70%  { transform: scale(1.03); }
        100% { transform: scale(1); }
      }
      @keyframes flyout-enter {
        0%   { opacity: 0; transform: translateX(-4px) scale(0.97); }
        100% { opacity: 1; transform: translateX(0) scale(1); }
      }
      .sidebar-nav-btn:active,
      .sidebar-logo-btn:active {
        animation: sidebar-haptic-bounce 160ms cubic-bezier(0.25, 0.1, 0.25, 1);
      }
      /* Responsive vertical padding: shrinks on shorter viewports */
      .sidebar-nav-btn {
        padding-top: clamp(6px, 1.4vh, 14px) !important;
        padding-bottom: clamp(6px, 1.4vh, 14px) !important;
      }
      /* Focus mode — crisper, lighter, more ethereal sidebar */
      .sidebar-focused .sidebar-nav-btn {
        letter-spacing: 0.04em;
        transition: color 400ms ease, background 400ms ease, letter-spacing 600ms ease;
      }
      .sidebar-focused .sidebar-tooltip {
        opacity: 0 !important;
        pointer-events: none !important;
      }
    `}</style>
    <aside
      className={`sidebar-root flex flex-col h-full shrink-0 relative coherence-sidebar-pulse${isFocused ? " sidebar-focused" : ""}`}
      style={{
        ...paletteVars,
        ...focusOverrides,
        width: `${w}px`,
        background: "var(--sb-bg-flat)",
        backgroundImage: "var(--sb-bg)",
        borderRight: "1px solid var(--sb-border)",
        boxShadow: "var(--sb-highlight), var(--sb-shadow)",
        willChange: "width",
        transition: "width 200ms cubic-bezier(0.25, 0.1, 0.25, 1), background 600ms ease, border-color 600ms ease, color 600ms ease, box-shadow 600ms ease, opacity 600ms ease",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        contain: "layout style",
        // Focus: subtle opacity reduction and thinned-out feeling
        opacity: isFocused ? 0.88 : 1,
      } as React.CSSProperties}
    >
      {/* ── Top: Logo / toggle ─────────────────────────────────── */}
      <div className="flex items-center justify-between px-2 pt-4 pb-4">
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
            onMouseEnter={() => onHoverChat?.()}
            className="group/logo sidebar-logo-btn w-9 h-9 mx-auto rounded-xl flex items-center justify-center transition-transform duration-200 hover:scale-105 relative"
            title={`Expand sidebar (${MOD_KEY} B)`}
          >
            <HologramLogo
              size={20}
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
      <div className="flex-1 px-2 space-y-0 overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: "none" }}>
        {NAV_ITEMS.map((item) => {
          const active = item.path ? isActive(item.path) : false;
          return (
            <IconTooltip key={item.label} label={item.label} show={!expanded}>
              <button
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  e.preventDefault();
                  collapseAndDo(() => {
                    if (item.panel === "apps" && onOpenApps) {
                      onOpenApps();
                    } else if (item.panel === "myspace" && onOpenMySpace) {
                      onOpenMySpace();
                    } else if (item.label === "Home" && onGoHome) {
                      onGoHome();
                    } else if (item.label === "My Space") {
                      navigate("/ceremony");
                    } else if (item.path) {
                      navigate(item.path);
                    }
                  });
                }}
                onMouseEnter={() => item.panel ? onHoverPanel?.(item.panel) : undefined}
                className={`sidebar-nav-btn w-full flex items-center gap-3 rounded-xl transition-colors duration-200 ${
                  !expanded ? "justify-center px-0 py-3.5" : "px-3.5 py-3.5"
                } ${active ? "sidebar-nav-active" : ""}`}
                style={{
                  color: active ? "var(--sb-gold)" : "var(--sb-text)",
                  background: active ? "var(--sb-active)" : "transparent",
                }}
              >
                <item.icon
                  className="w-4 h-4 shrink-0"
                  strokeWidth={1.3}
                  style={{ color: active ? "var(--sb-gold)" : "var(--sb-muted)" }}
                />
                {expanded && (
                  <span className="text-[13px] font-light whitespace-nowrap tracking-wide">{item.label}</span>
                )}
              </button>
            </IconTooltip>
          );
        })}

        {/* Web */}
        {onOpenBrowser && (
          <IconTooltip label="Web" show={!expanded}>
            <button
              onPointerDown={pointerDown(onOpenBrowser)}
              onMouseEnter={() => onHoverPanel?.("browser")}
              className={`sidebar-nav-btn w-full flex items-center gap-3 rounded-xl transition-colors duration-200 ${
                !expanded ? "justify-center px-0 py-3.5" : "px-3.5 py-3.5"
              }`}
              style={{ color: "var(--sb-text)" }}
            >
              <Globe className="w-4 h-4 shrink-0" strokeWidth={1.3} style={{ color: "var(--sb-muted)" }} />
              {expanded && <span className="text-[13px] font-light whitespace-nowrap tracking-wide">Web</span>}
            </button>
          </IconTooltip>
        )}

        {/* Vault */}
        {onOpenVault && (
          <IconTooltip label="Vault" show={!expanded}>
            <button
              onPointerDown={pointerDown(onOpenVault)}
              onMouseEnter={() => onHoverPanel?.("vault")}
              className={`sidebar-nav-btn w-full flex items-center gap-3 rounded-xl transition-colors duration-200 ${
                !expanded ? "justify-center px-0 py-3.5" : "px-3.5 py-3.5"
              }`}
              style={{ color: "var(--sb-text)" }}
            >
              <FolderOpen className="w-4 h-4 shrink-0" strokeWidth={1.3} style={{ color: "var(--sb-gold)" }} />
              {expanded && <span className="text-[13px] font-light whitespace-nowrap tracking-wide">Vault</span>}
            </button>
          </IconTooltip>
        )}

        {/* ── Tools section ─────────────────────────────────────── */}
        {/* When expanded: collapsible section with label + children inline */}
        {/* When collapsed: single icon that opens a flyout popover */}
        {expanded ? (
          <>
            <button
              onClick={() => {
                setToolsOpen(prev => {
                  const next = !prev;
                  try { localStorage.setItem("uor:sidebar:tools-open", String(next)); } catch {}
                  return next;
                });
              }}
              className="sidebar-nav-btn w-full flex items-center gap-3 rounded-xl transition-colors duration-200 px-3.5 py-2"
              style={{ color: "var(--sb-muted)" }}
            >
              <Wrench className="w-4 h-4 shrink-0" strokeWidth={1.3} style={{ color: "var(--sb-muted)" }} />
              <span className="text-[11px] font-medium uppercase tracking-widest flex-1 text-left" style={{ color: "var(--sb-muted)" }}>Tools</span>
              <ChevronDown
                className="w-3 h-3 shrink-0 transition-transform duration-200"
                strokeWidth={1.5}
                style={{
                  color: "var(--sb-muted)",
                  transform: toolsOpen ? "rotate(0deg)" : "rotate(-90deg)",
                }}
              />
            </button>
            {toolsOpen && (
              <div className="pl-2">
                {onOpenTerminal && (
                  <button
                    onPointerDown={pointerDown(onOpenTerminal)}
                    onMouseEnter={() => onHoverPanel?.("terminal")}
                    className="sidebar-nav-btn w-full flex items-center gap-3 rounded-xl transition-colors duration-200 px-3.5 py-3"
                    style={{ color: "var(--sb-text)" }}
                  >
                    <Terminal className="w-4 h-4 shrink-0" strokeWidth={1.3} style={{ color: "var(--sb-muted)" }} />
                    <span className="text-[13px] font-light whitespace-nowrap tracking-wide">Terminal</span>
                  </button>
                )}
                {onOpenJupyter && (
                  <button
                    onPointerDown={pointerDown(onOpenJupyter)}
                    onMouseEnter={() => onHoverPanel?.("jupyter")}
                    className="sidebar-nav-btn w-full flex items-center gap-3 rounded-xl transition-colors duration-200 px-3.5 py-3"
                    style={{ color: "var(--sb-text)" }}
                  >
                    <Beaker className="w-4 h-4 shrink-0" strokeWidth={1.3} style={{ color: "var(--sb-gold)" }} />
                    <span className="text-[13px] font-light whitespace-nowrap tracking-wide">Jupyter</span>
                  </button>
                )}
                {onOpenQuantumWorkspace && (
                  <button
                    onPointerDown={pointerDown(onOpenQuantumWorkspace)}
                    onMouseEnter={() => onHoverPanel?.("quantum-workspace")}
                    className="sidebar-nav-btn w-full flex items-center gap-3 rounded-xl transition-colors duration-200 px-3.5 py-3"
                    style={{ color: "var(--sb-text)" }}
                  >
                    <Atom className="w-4 h-4 shrink-0" strokeWidth={1.3} style={{ color: "hsl(200, 60%, 60%)" }} />
                    <span className="text-[13px] font-light whitespace-nowrap tracking-wide">Quantum Lab</span>
                  </button>
                )}
                {onOpenCode && (
                  <button
                    onPointerDown={pointerDown(onOpenCode)}
                    onMouseEnter={() => onHoverPanel?.("code")}
                    className="sidebar-nav-btn w-full flex items-center gap-3 rounded-xl transition-colors duration-200 px-3.5 py-3"
                    style={{ color: "var(--sb-text)" }}
                  >
                    <Code2 className="w-4 h-4 shrink-0" strokeWidth={1.3} style={{ color: "hsl(210, 80%, 60%)" }} />
                    <span className="text-[13px] font-light whitespace-nowrap tracking-wide">Code</span>
                  </button>
                )}
                {onOpenPackages && (
                  <button
                    onPointerDown={pointerDown(onOpenPackages)}
                    onMouseEnter={() => onHoverPanel?.("packages")}
                    className="sidebar-nav-btn w-full flex items-center gap-3 rounded-xl transition-colors duration-200 px-3.5 py-3"
                    style={{ color: "var(--sb-text)" }}
                  >
                    <Package className="w-4 h-4 shrink-0" strokeWidth={1.3} style={{ color: "hsl(38, 50%, 55%)" }} />
                    <span className="text-[13px] font-light whitespace-nowrap tracking-wide">Packages</span>
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          /* Collapsed: single Tools icon → flyout */
          <>
            <IconTooltip label="Tools" show={!expanded}>
              <button
                ref={toolsFlyoutAnchor}
                onClick={() => { setToolsFlyoutOpen(p => !p); setSystemFlyoutOpen(false); }}
                className={`sidebar-nav-btn w-full flex items-center justify-center rounded-xl transition-colors duration-200 px-0 py-3.5`}
                style={{
                  color: "var(--sb-text)",
                  background: toolsFlyoutOpen ? "var(--sb-active)" : "transparent",
                }}
              >
                <Wrench className="w-4 h-4 shrink-0" strokeWidth={1.3} style={{ color: toolsFlyoutOpen ? "var(--sb-gold)" : "var(--sb-muted)" }} />
              </button>
            </IconTooltip>
            <SidebarFlyout open={toolsFlyoutOpen} onClose={() => setToolsFlyoutOpen(false)} anchorRef={toolsFlyoutAnchor}>
              <div className="px-3 pt-2 pb-1">
                <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--sb-muted)" }}>Tools</span>
              </div>
              {onOpenTerminal && (
                <FlyoutItem icon={Terminal} label="Terminal" onClick={() => collapseAndDo(onOpenTerminal)} />
              )}
              {onOpenJupyter && (
                <FlyoutItem icon={Beaker} label="Jupyter" iconColor="var(--sb-gold)" onClick={() => collapseAndDo(onOpenJupyter)} />
              )}
              {onOpenQuantumWorkspace && (
                <FlyoutItem icon={Atom} label="Quantum Lab" iconColor="hsl(200, 60%, 60%)" onClick={() => collapseAndDo(onOpenQuantumWorkspace)} />
              )}
              {onOpenCode && (
                <FlyoutItem icon={Code2} label="Code" iconColor="hsl(210, 80%, 60%)" onClick={() => collapseAndDo(onOpenCode)} />
              )}
              {onOpenPackages && (
                <FlyoutItem icon={Package} label="Packages" iconColor="hsl(38, 50%, 55%)" onClick={() => collapseAndDo(onOpenPackages)} />
              )}
            </SidebarFlyout>
          </>
        )}

      </div>

      {/* ── Bottom: Help + Inbox + System ───────────────────── */}
      <div className="px-2 py-3 space-y-0 shrink-0" style={{ borderTop: "1px solid var(--sb-border)" }}>
        {/* Text Size Control — visible when expanded */}
        {expanded && (
          <TextSizeControl textSize={textSize} setTextSize={handleTextSize} bgMode={bgMode} />
        )}

        {/* Share the Love — warm gradient heart */}
        <IconTooltip label="Share the Love" show={!expanded}>
          <button
            onClick={() => collapseAndDo(() => setShareOpen(true))}
            className={`sidebar-nav-btn group w-full flex items-center gap-3 rounded-xl transition-colors duration-200 ${
              !expanded ? "justify-center px-0 py-3.5" : "px-3.5 py-3.5"
            }`}
            style={{ color: "var(--sb-text)", background: "transparent" }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="shrink-0 transition-transform duration-300 group-hover:scale-110"
              style={{ opacity: 0.65 }}
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
            {expanded && <span className="text-[13px] font-light whitespace-nowrap tracking-wide">Share the Love</span>}
          </button>
        </IconTooltip>

        {onReplayGuide && (
          <IconTooltip label={`Help (${MOD_KEY} /)`} show={!expanded}>
            <button
              onClick={() => collapseAndDo(() => onReplayGuide?.())}
              className={`sidebar-nav-btn w-full flex items-center gap-3 rounded-xl transition-colors duration-200 ${
                !expanded ? "justify-center px-0 py-3.5" : "px-3.5 py-3.5"
              }`}
              style={{ color: "var(--sb-text)" }}
            >
              <HelpCircle className="w-4 h-4" strokeWidth={1.3} style={{ color: "var(--sb-muted)" }} />
              {expanded && <span className="text-[13px] font-light tracking-wide">Help</span>}
            </button>
          </IconTooltip>
        )}
        <IconTooltip label={`Messages (${MOD_KEY} M)`} show={!expanded}>
          <button
            onPointerDown={pointerDown(() => onOpenMessenger?.())}
            onMouseEnter={() => onHoverPanel?.("messenger")}
            className={`sidebar-nav-btn w-full flex items-center gap-3 rounded-xl transition-colors duration-200 ${
              !expanded ? "justify-center px-0 py-3.5" : "px-3.5 py-3.5"
            }`}
            style={{ color: "var(--sb-text)" }}
          >
            <Inbox className="w-4 h-4" strokeWidth={1.3} style={{ color: "var(--sb-muted)" }} />
            {expanded && <span className="text-[13px] font-light tracking-wide">Inbox</span>}
          </button>
        </IconTooltip>

        {/* ── System sub-section ────────────────────────────── */}
        {/* Expanded: collapsible inline section */}
        {/* Collapsed: single icon → flyout with Storage/Compute/Settings */}
        {expanded ? (
          <>
            <button
              onClick={() => {
                setSystemOpen(prev => {
                  const next = !prev;
                  try { localStorage.setItem("uor:sidebar:system-open", String(next)); } catch {}
                  return next;
                });
              }}
              className="sidebar-nav-btn w-full flex items-center gap-3 rounded-xl transition-colors duration-200 px-3.5 py-2"
              style={{ color: "var(--sb-muted)" }}
            >
              <Server className="w-4 h-4 shrink-0" strokeWidth={1.3} style={{ color: "var(--sb-muted)" }} />
              <span className="text-[11px] font-medium uppercase tracking-widest flex-1 text-left" style={{ color: "var(--sb-muted)" }}>System</span>
              <ChevronDown
                className="w-3 h-3 shrink-0 transition-transform duration-200"
                strokeWidth={1.5}
                style={{
                  color: "var(--sb-muted)",
                  transform: systemOpen ? "rotate(0deg)" : "rotate(-90deg)",
                }}
              />
            </button>
            {systemOpen && (
              <div className="pl-2">
                <button
                  onPointerDown={pointerDown(() => onOpenMemory?.())}
                  onMouseEnter={() => onHoverPanel?.("memory")}
                  className="sidebar-nav-btn w-full flex items-center gap-3 rounded-xl transition-colors duration-200 px-3.5 py-3"
                  style={{ color: "var(--sb-text)" }}
                >
                  <Database className="w-4 h-4" strokeWidth={1.3} style={{ color: "var(--sb-muted)" }} />
                  <span className="text-[13px] font-light tracking-wide">Storage</span>
                </button>
                <button
                  onPointerDown={pointerDown(() => onOpenCompute?.())}
                  onMouseEnter={() => onHoverPanel?.("compute")}
                  className="sidebar-nav-btn w-full flex items-center gap-3 rounded-xl transition-colors duration-200 px-3.5 py-3"
                  style={{ color: "var(--sb-text)" }}
                >
                  <Cpu className="w-4 h-4" strokeWidth={1.3} style={{ color: "var(--sb-muted)" }} />
                  <span className="text-[13px] font-light tracking-wide">Compute</span>
                </button>
                <button
                  onPointerDown={pointerDown(() => navigate("/settings"))}
                  className="sidebar-nav-btn w-full flex items-center gap-3 rounded-xl transition-colors duration-200 px-3.5 py-3"
                  style={{ color: "var(--sb-text)" }}
                >
                  <Settings className="w-4 h-4" strokeWidth={1.3} style={{ color: "var(--sb-muted)" }} />
                  <span className="text-[13px] font-light tracking-wide">Settings</span>
                </button>
              </div>
            )}
          </>
        ) : (
          /* Collapsed: single System icon → flyout */
          <>
            <IconTooltip label="System" show={!expanded}>
              <button
                ref={systemFlyoutAnchor}
                onClick={() => { setSystemFlyoutOpen(p => !p); setToolsFlyoutOpen(false); }}
                className={`sidebar-nav-btn w-full flex items-center justify-center rounded-xl transition-colors duration-200 px-0 py-3.5`}
                style={{
                  color: "var(--sb-text)",
                  background: systemFlyoutOpen ? "var(--sb-active)" : "transparent",
                }}
              >
                <Server className="w-4 h-4 shrink-0" strokeWidth={1.3} style={{ color: systemFlyoutOpen ? "var(--sb-gold)" : "var(--sb-muted)" }} />
              </button>
            </IconTooltip>
            <SidebarFlyout open={systemFlyoutOpen} onClose={() => setSystemFlyoutOpen(false)} anchorRef={systemFlyoutAnchor}>
              <div className="px-3 pt-2 pb-1">
                <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--sb-muted)" }}>System</span>
              </div>
              <FlyoutItem icon={Database} label="Storage" onClick={() => collapseAndDo(() => onOpenMemory?.())} />
              <FlyoutItem icon={Cpu} label="Compute" onClick={() => collapseAndDo(() => onOpenCompute?.())} />
              <FlyoutItem icon={Settings} label="Settings" onClick={() => collapseAndDo(() => navigate("/settings"))} />
            </SidebarFlyout>
          </>
        )}
      </div>

      {/* ── Genesis Dot — kernel heartbeat summary ────────── */}
      <div className="flex justify-center pb-3 pt-1 shrink-0">
        <IconTooltip label="Genesis" show={!expanded}>
          <button
            onClick={() => collapseAndDo(() => setGenesisOpen(true))}
            className="group relative flex items-center justify-center transition-all duration-300"
            style={{
              width: expanded ? "100%" : "44px",
              height: "44px",
              borderRadius: expanded ? "12px" : "50%",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: expanded ? "0 14px" : 0,
            }}
          >
            <div
              className="rounded-full transition-all duration-500 group-hover:scale-125"
              style={{
                width: "8px",
                height: "8px",
                background: "hsla(38, 50%, 60%, 0.85)",
                boxShadow: `0 0 calc(8px + 12px * var(--h-score, 0.5)) hsla(38, 50%, 55%, calc(0.2 + 0.4 * var(--h-score, 0.5))), 0 0 calc(3px + 6px * var(--h-score, 0.5)) hsla(38, 50%, 55%, 0.3)`,
                animation: "heartbeat-love calc(1.8s + 1.2s * (1 - var(--h-score, 0.5))) ease-in-out infinite",
                flexShrink: 0,
              }}
            />
            {expanded && (
              <span
                className="text-[13px] font-light tracking-wide ml-3 whitespace-nowrap"
                style={{ color: "var(--sb-gold)" }}
              >
                Genesis
              </span>
            )}
          </button>
        </IconTooltip>
      </div>
    </aside>

    <ShareTheLoveModal open={shareOpen} onClose={() => setShareOpen(false)} />
    <GenesisPopover open={genesisOpen} onClose={() => setGenesisOpen(false)} bgMode={bgMode} />
    </>
  );
}
