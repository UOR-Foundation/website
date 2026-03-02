/**
 * DesktopOsSidebar — Crisp, data-driven icon sidebar
 * ═══════════════════════════════════════════════════
 *
 * Performance:
 *   - onPointerDown for instant (<16ms) response — bypasses 300ms click delay
 *   - All hover via CSS :hover — zero JS re-renders
 *   - Data-driven nav items — single NavButton component, zero duplication
 *   - CSS contain: layout style — compositor isolated
 *   - will-change: width for GPU-promoted expansion
 *   - memo() on root — prevents parent re-renders from propagating
 */

import { useState, useCallback, useRef, useEffect, useMemo, memo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Home, LayoutGrid, Fingerprint, Globe, Cpu, Database,
  Settings, HelpCircle, Inbox, PanelLeftOpen, PanelLeftClose,
  Terminal, Beaker, Atom, Code2, ChevronDown, Package,
  Sparkles,
} from "lucide-react";
import HologramLogo from "./HologramLogo";
import GenesisPopover from "../GenesisPopover";
import { ShareTheLoveModal } from "../ShareTheLoveModal";
import TextSizeControl from "../TextSizeControl";
import { useTextSize, type TextSize } from "@/modules/hologram-ui/hooks/useTextSize";
import { useAttentionMode } from "@/modules/hologram-ui/hooks/useAttentionMode";

/* ═══════════════════════════════════════════════════════════════
   Palette — CSS variables set on sidebar root
   ═══════════════════════════════════════════════════════════════ */

const PALETTES: Record<string, Record<string, string>> = {
  white: {
    "--sb-bg": "linear-gradient(180deg, hsla(30, 12%, 97%, 0.88) 0%, hsla(30, 10%, 95%, 0.82) 100%)",
    "--sb-bg-flat": "hsla(30, 10%, 96%, 0.85)",
    "--sb-hover": "hsla(30, 8%, 0%, 0.035)",
    "--sb-active": "hsla(30, 12%, 0%, 0.06)",
    "--sb-border": "hsla(30, 15%, 80%, 0.25)",
    "--sb-text": "hsl(25, 8%, 28%)",
    "--sb-muted": "hsl(25, 8%, 45%)",
    "--sb-gold": "hsl(32, 30%, 45%)",
    "--sb-shadow": "4px 0 32px -8px hsla(25, 15%, 20%, 0.08)",
    "--sb-highlight": "inset -1px 0 0 hsla(0, 0%, 100%, 0.5), inset 0 1px 0 hsla(0, 0%, 100%, 0.4)",
  },
  dark: {
    "--sb-bg": "linear-gradient(180deg, hsla(25, 6%, 5%, 0.98) 0%, hsla(25, 4%, 3%, 0.99) 100%)",
    "--sb-bg-flat": "hsla(25, 5%, 4%, 0.98)",
    "--sb-hover": "hsla(30, 12%, 95%, 0.08)",
    "--sb-active": "hsla(30, 15%, 90%, 0.12)",
    "--sb-border": "hsla(38, 10%, 30%, 0.15)",
    "--sb-text": "hsl(30, 8%, 92%)",
    "--sb-muted": "hsl(30, 6%, 78%)",
    "--sb-gold": "hsl(34, 35%, 70%)",
    "--sb-shadow": "4px 0 40px -8px hsla(25, 10%, 0%, 0.4)",
    "--sb-highlight": "inset -1px 0 0 hsla(38, 20%, 90%, 0.04), inset 0 1px 0 hsla(38, 20%, 90%, 0.03)",
  },
  image: {
    "--sb-bg": "linear-gradient(180deg, hsl(25, 8%, 11%) 0%, hsl(25, 6%, 7%) 100%)",
    "--sb-bg-flat": "hsl(25, 7%, 9%)",
    "--sb-hover": "hsla(30, 15%, 95%, 0.08)",
    "--sb-active": "hsla(30, 18%, 90%, 0.12)",
    "--sb-border": "hsla(38, 15%, 50%, 0.1)",
    "--sb-text": "hsl(30, 12%, 92%)",
    "--sb-muted": "hsl(30, 10%, 65%)",
    "--sb-gold": "hsl(34, 38%, 72%)",
    "--sb-shadow": "2px 0 16px -4px hsla(25, 10%, 0%, 0.3)",
    "--sb-highlight": "inset -1px 0 0 hsla(38, 20%, 70%, 0.06)",
  },
};

/* ═══════════════════════════════════════════════════════════════
   OS-aware modifier key
   ═══════════════════════════════════════════════════════════════ */

const MOD_KEY = (() => {
  if (typeof navigator === "undefined") return "Ctrl";
  if ("userAgentData" in navigator && (navigator as any).userAgentData?.platform) {
    return /mac/i.test((navigator as any).userAgentData.platform) ? "⌘" : "Ctrl";
  }
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform) || /Macintosh/i.test(navigator.userAgent) ? "⌘" : "Ctrl";
})();

/* ═══════════════════════════════════════════════════════════════
   NavButton — The single, universal navigation button
   ═══════════════════════════════════════════════════════════════ */

interface NavButtonProps {
  icon: React.ElementType;
  label: string;
  expanded: boolean;
  active?: boolean;
  iconColor?: string;
  indent?: boolean;
  onAction: () => void;
  onHover?: () => void;
}

const NavButton = memo(function NavButton({
  icon: Icon, label, expanded, active, iconColor, indent, onAction, onHover,
}: NavButtonProps) {
  return (
    <div className={!expanded ? "relative group/tip" : undefined}>
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          try { onAction(); } catch (err) { console.error("[Sidebar]", err); }
        }}
        onMouseEnter={onHover}
        className={`sb-btn w-full flex items-center gap-3 rounded-xl select-none ${
          !expanded ? "justify-center px-0" : indent ? "px-3.5 ml-2" : "px-3.5"
        } ${active ? "sb-active" : ""}`}
        style={{
          color: active ? "var(--sb-gold)" : "var(--sb-text)",
          background: active ? "var(--sb-active)" : "transparent",
        }}
      >
        <Icon
          className="w-4 h-4 shrink-0"
          strokeWidth={1.3}
          style={{ color: active ? "var(--sb-gold)" : iconColor ?? "var(--sb-muted)" }}
        />
        {expanded && (
          <span className="text-[13px] font-light whitespace-nowrap tracking-wide">{label}</span>
        )}
      </button>
      {/* Tooltip: CSS-only, no portal, no state */}
      {!expanded && (
        <div className="sb-tip pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 rounded-lg text-[13px] font-light whitespace-nowrap opacity-0 scale-95 group-hover/tip:opacity-100 group-hover/tip:scale-100 z-50">
          {label}
        </div>
      )}
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════════
   SectionToggle — collapsible group header
   ═══════════════════════════════════════════════════════════════ */

function SectionToggle({
  icon: Icon, label, open, onToggle, expanded,
}: {
  icon: React.ElementType; label: string; open: boolean;
  onToggle: () => void; expanded: boolean;
}) {
  if (!expanded) return null;
  return (
    <button
      onPointerDown={(e) => { e.preventDefault(); onToggle(); }}
      className="sb-btn w-full flex items-center gap-3 rounded-xl px-3.5 select-none"
      style={{ color: "var(--sb-muted)", paddingTop: "6px", paddingBottom: "6px" }}
    >
      <Icon className="w-4 h-4 shrink-0" strokeWidth={1.3} style={{ color: "var(--sb-muted)" }} />
      <span className="text-[11px] font-medium uppercase tracking-widest flex-1 text-left">{label}</span>
      <ChevronDown
        className="w-3 h-3 shrink-0"
        strokeWidth={1.5}
        style={{
          color: "var(--sb-muted)",
          transform: open ? "rotate(0deg)" : "rotate(-90deg)",
          transition: "transform 150ms ease",
        }}
      />
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Flyout — popover for collapsed grouped icons
   ═══════════════════════════════════════════════════════════════ */

function Flyout({
  open, onClose, anchorRef, label, children,
}: {
  open: boolean; onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  label: string; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; maxH: number }>({ top: 0, maxH: 400 });

  // φ-based viewport margin (golden ratio inset)
  const MARGIN = 21; // ~13 × φ

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const anchorRect = anchorRef.current.getBoundingClientRect();
    const vh = window.innerHeight;

    // Measure after a tick so children are rendered
    requestAnimationFrame(() => {
      const flyoutH = ref.current?.offsetHeight ?? 200;
      // Clamp: prefer aligning to anchor top, but never spill below viewport
      let top = anchorRect.top;
      const maxBottom = vh - MARGIN;
      if (top + flyoutH > maxBottom) {
        top = Math.max(MARGIN, maxBottom - flyoutH);
      }
      setPos({ top, maxH: vh - MARGIN * 2 });
    });
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) onClose();
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="fixed z-[200] py-1.5 rounded-xl sb-flyout"
      style={{
        left: "62px",
        top: `${pos.top}px`,
        minWidth: "170px",
        maxHeight: `${pos.maxH}px`,
        overflowY: "auto",
        background: "var(--sb-bg-flat)",
        border: "1px solid var(--sb-border)",
        boxShadow: "8px 4px 32px -4px hsla(25, 10%, 0%, 0.4), 0 0 0 1px hsla(38, 20%, 90%, 0.04)",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      <div className="px-3 pt-2 pb-1">
        <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--sb-muted)" }}>{label}</span>
      </div>
      {children}
    </div>
  );
}

function FlyoutItem({ icon: Icon, label, iconColor, onAction }: {
  icon: React.ElementType; label: string; iconColor?: string; onAction: () => void;
}) {
  return (
    <button
      onPointerDown={(e) => {
        e.preventDefault(); e.stopPropagation();
        try { onAction(); } catch (err) { console.error("[FlyoutItem]", err); }
      }}
      className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors duration-100 hover:bg-[var(--sb-hover)] select-none"
      style={{ color: "var(--sb-text)" }}
    >
      <Icon className="w-4 h-4 shrink-0" strokeWidth={1.3} style={{ color: iconColor ?? "var(--sb-muted)" }} />
      <span className="text-[13px] font-light tracking-wide">{label}</span>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Heart icon (static SVG)
   ═══════════════════════════════════════════════════════════════ */

const HeartIcon = memo(function HeartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill="url(#sbHeart)"
      />
      <defs>
        <linearGradient id="sbHeart" x1="2" y1="21" x2="22" y2="3" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="hsl(270, 45%, 45%)" />
          <stop offset="50%" stopColor="hsl(280, 50%, 55%)" />
          <stop offset="100%" stopColor="hsl(290, 40%, 60%)" />
        </linearGradient>
      </defs>
    </svg>
  );
});

/* ═══════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════ */

const COLLAPSED_W = 56;
const EXPANDED_W = 210;

/* ═══════════════════════════════════════════════════════════════
   Props
   ═══════════════════════════════════════════════════════════════ */

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
  onOpenAILab?: () => void;
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

/* ═══════════════════════════════════════════════════════════════
   Sidebar — The One Component
   ═══════════════════════════════════════════════════════════════ */

export default memo(function DesktopOsSidebar({
  onOpenBrowser, onOpenCompute, onOpenTerminal, onOpenMemory,
  onOpenMessenger, onOpenJupyter, onOpenQuantumWorkspace,
  onOpenAILab, onOpenCode, onOpenPackages, onOpenVault,
  onOpenApps, onOpenMySpace, onGoHome, onReplayGuide,
  onHoverChat, onHoverPanel,
  bgMode = "image",
}: DesktopOsSidebarProps) {
  const paletteVars = PALETTES[bgMode] || PALETTES.image;
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [genesisOpen, setGenesisOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(() => {
    try { return localStorage.getItem("uor:sidebar:tools-open") !== "false"; } catch { return true; }
  });
  const [systemOpen, setSystemOpen] = useState(() => {
    try { return localStorage.getItem("uor:sidebar:system-open") !== "false"; } catch { return true; }
  });
  const { textSize, setTextSize } = useTextSize();
  const { aperture } = useAttentionMode();
  const isFocused = aperture >= 0.5;

  // TEE trust — event-driven from MySpacePanel
  const [isTrusted, setIsTrusted] = useState(() => {
    try { return !!localStorage.getItem("hologram:tee:credential"); } catch { return false; }
  });

  useEffect(() => {
    const handler = (e: Event) => setIsTrusted(!!(e as CustomEvent).detail?.trusted);
    window.addEventListener("hologram:tee-update", handler);
    return () => window.removeEventListener("hologram:tee-update", handler);
  }, []);

   // Focus-responsive overrides — keep sidebar clearly readable in focus mode
    const focusOverrides = useMemo((): Record<string, string> => {
      if (!isFocused) return {};
      return {
        "--sb-border": "hsla(38, 10%, 50%, 0.08)",
        "--sb-hover": "hsla(30, 12%, 95%, 0.06)",
        "--sb-muted": bgMode === "white" ? "hsl(25, 8%, 38%)" : "hsl(30, 6%, 65%)",
        "--sb-text": bgMode === "white" ? "hsl(25, 8%, 22%)" : "hsl(30, 8%, 85%)",
      };
    }, [isFocused, bgMode]);

  // Flyout state
  const [toolsFlyout, setToolsFlyout] = useState(false);
  const [systemFlyout, setSystemFlyout] = useState(false);
  const toolsAnchor = useRef<HTMLButtonElement>(null);
  const systemAnchor = useRef<HTMLButtonElement>(null);

  const closeFlyouts = useCallback(() => { setToolsFlyout(false); setSystemFlyout(false); }, []);

  const act = useCallback((action?: () => void) => {
    closeFlyouts();
    try { action?.(); } catch (err) { console.error("[Sidebar]", err); }
  }, [closeFlyouts]);

  const toggleSection = useCallback((key: string, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    setter(prev => {
      const next = !prev;
      try { localStorage.setItem(`uor:sidebar:${key}`, String(next)); } catch {}
      return next;
    });
  }, []);

  const isActive = useCallback((path: string) => location.pathname === path, [location.pathname]);

  const w = expanded ? EXPANDED_W : COLLAPSED_W;

  /* ── Tool items — declared once, rendered everywhere ── */
  const toolItems = useMemo(() => [
    onOpenTerminal  && { icon: Terminal,  label: "Terminal",    panel: "terminal",           iconColor: undefined },
    onOpenJupyter   && { icon: Beaker,    label: "Jupyter",     panel: "jupyter",            iconColor: "var(--sb-gold)" },
    onOpenQuantumWorkspace && { icon: Atom, label: "Quantum Lab", panel: "quantum-workspace", iconColor: "hsl(200, 60%, 60%)" },
    onOpenAILab     && { icon: Sparkles,  label: "AI Lab",      panel: "ai-lab",             iconColor: "hsl(260, 60%, 65%)" },
    onOpenCode      && { icon: Code2,     label: "Code",        panel: "code",               iconColor: "hsl(210, 80%, 60%)" },
    onOpenPackages  && { icon: Package,   label: "Packages",    panel: "packages",           iconColor: "hsl(38, 50%, 55%)" },
  ].filter(Boolean) as { icon: React.ElementType; label: string; panel: string; iconColor?: string }[], [
    onOpenTerminal, onOpenJupyter, onOpenQuantumWorkspace, onOpenAILab, onOpenCode, onOpenPackages,
  ]);

  const toolActionMap: Record<string, (() => void) | undefined> = useMemo(() => ({
    terminal: onOpenTerminal, jupyter: onOpenJupyter, "quantum-workspace": onOpenQuantumWorkspace,
    "ai-lab": onOpenAILab, code: onOpenCode, packages: onOpenPackages,
  }), [onOpenTerminal, onOpenJupyter, onOpenQuantumWorkspace, onOpenAILab, onOpenCode, onOpenPackages]);

  const systemItems = useMemo(() => [
    { icon: Database, label: "Storage",  panel: "memory",  action: onOpenMemory },
    { icon: Cpu,      label: "Compute",  panel: "compute", action: onOpenCompute },
    { icon: Settings, label: "Settings", panel: "",        action: () => navigate("/settings") },
  ], [onOpenMemory, onOpenCompute, navigate]);

  return (
    <>
      <style>{`
        .sb-btn {
          padding-top: clamp(6px, 1.4vh, 14px);
          padding-bottom: clamp(6px, 1.4vh, 14px);
          transition: color 150ms ease, background 150ms ease;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        .sb-btn:hover { background: var(--sb-hover) !important; }
        .sb-btn:active { transform: scale(0.95); }
        .sb-active:hover { background: var(--sb-active) !important; }
        .sb-tip {
          background: var(--sb-bg-flat);
          border: 1px solid var(--sb-border);
          box-shadow: 4px 2px 12px -2px hsla(25, 10%, 0%, 0.3);
          transition: opacity 120ms ease, transform 120ms ease;
        }
        .sb-flyout {
          animation: sb-flyout-in 120ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        @keyframes sb-flyout-in {
          from { opacity: 0; transform: translateX(-3px) scale(0.98); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        .sb-focused .sb-btn { letter-spacing: 0.04em; }
        .sb-focused .sb-tip { opacity: 0 !important; pointer-events: none !important; }
      `}</style>

      <aside
        className={`flex flex-col h-full shrink-0 relative coherence-sidebar-pulse${isFocused ? " sb-focused" : ""}`}
        style={{
          ...paletteVars,
          ...focusOverrides,
          width: `${w}px`,
          background: "var(--sb-bg-flat)",
          backgroundImage: "var(--sb-bg)",
          borderRight: "1px solid var(--sb-border)",
          boxShadow: "var(--sb-highlight, none), var(--sb-shadow, none)",
          willChange: "width",
          transition: "width 180ms cubic-bezier(0.25, 0.1, 0.25, 1)",
          fontFamily: "'DM Sans', system-ui, sans-serif",
          contain: "layout style",
          opacity: isFocused ? 0.88 : 1,
        } as React.CSSProperties}
      >
        {/* ── Logo / Toggle ──────────────────────────────────── */}
        <div className="flex items-center justify-between px-2 pt-4 pb-4">
          {expanded ? (
            <>
              <div className="flex items-center gap-2.5 px-2 py-1 overflow-hidden">
                <HologramLogo size={28} color={bgMode === "white" ? "hsl(30, 15%, 30%)" : "hsl(38, 25%, 80%)"} className="shrink-0" />
                <svg viewBox="0 0 360 40" className="select-none" style={{ width: "115px", height: "auto", opacity: 0.9 }}>
                  <g fill="none" stroke="var(--sb-text)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="10" y1="6" x2="10" y2="34" /><line x1="30" y1="6" x2="30" y2="34" /><line x1="10" y1="20" x2="30" y2="20" />
                    <ellipse cx="60" cy="20" rx="14" ry="14" /><line x1="94" y1="6" x2="94" y2="34" /><line x1="94" y1="34" x2="114" y2="34" />
                    <ellipse cx="144" cy="20" rx="14" ry="14" /><path d="M 198 12 A 14 14 0 1 0 198 28 L 198 20 L 188 20" />
                    <line x1="222" y1="6" x2="222" y2="34" /><path d="M 222 6 L 236 6 A 7 7 0 0 1 236 20 L 222 20" /><line x1="232" y1="20" x2="242" y2="34" />
                    <line x1="266" y1="34" x2="280" y2="6" /><line x1="280" y1="6" x2="294" y2="34" />
                    <line x1="318" y1="34" x2="318" y2="6" /><line x1="318" y1="6" x2="334" y2="22" />
                    <line x1="334" y1="22" x2="350" y2="6" /><line x1="350" y1="6" x2="350" y2="34" />
                  </g>
                </svg>
              </div>
              <button
                onPointerDown={(e) => { e.preventDefault(); setExpanded(false); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center select-none"
                style={{ color: "var(--sb-muted)" }}
                title={`Collapse (${MOD_KEY} B)`}
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onPointerDown={(e) => { e.preventDefault(); setExpanded(true); }}
              onMouseEnter={onHoverChat}
              className="group/logo w-9 h-9 mx-auto rounded-xl flex items-center justify-center relative select-none"
              title={`Expand (${MOD_KEY} B)`}
            >
              <HologramLogo
                size={20}
                color={bgMode === "white" ? "hsl(30, 15%, 30%)" : "hsl(38, 25%, 80%)"}
                className="absolute transition-opacity duration-150 group-hover/logo:opacity-0"
              />
              <PanelLeftOpen
                className="w-5 h-5 absolute transition-opacity duration-150 opacity-0 group-hover/logo:opacity-100"
                strokeWidth={1.4}
                style={{ color: "var(--sb-gold)" }}
              />
            </button>
          )}
        </div>

        {/* ── Main Nav — Sanctuary → Explore → Create ────────── */}
        <div className="flex-1 px-2 overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: "none" }}>
          {/* ── Anchor ── */}
          <NavButton icon={Home} label="Home" expanded={expanded}
            active={isActive("/hologram-os")}
            onAction={() => act(onGoHome || (() => navigate("/hologram-os")))} />

          {/* ── Sanctuary — your sovereign base ── */}
          <NavButton icon={Fingerprint} label="My Space" expanded={expanded}
            onAction={() => act(onOpenMySpace)}
            onHover={() => onHoverPanel?.("myspace")} />

          {/* subtle zone separator */}
          <div style={{ height: expanded ? "12px" : "8px" }} />

          {/* ── Explore — discover the world ── */}
          <NavButton icon={LayoutGrid} label="Apps" expanded={expanded}
            onAction={() => act(onOpenApps)}
            onHover={() => onHoverPanel?.("apps")} />

          {onOpenBrowser && (
            <NavButton icon={Globe} label="Web" expanded={expanded}
              onAction={() => act(onOpenBrowser)}
              onHover={() => onHoverPanel?.("browser")} />
          )}

          {/* subtle zone separator */}
          <div style={{ height: expanded ? "12px" : "8px" }} />

          {/* ── Create — active engagement ── */}
          {expanded ? (
            <>
              <SectionToggle icon={Sparkles} label="Studio" open={toolsOpen} expanded={expanded}
                onToggle={() => toggleSection("tools-open", setToolsOpen)} />
              {toolsOpen && toolItems.map(item => (
                <NavButton key={item.panel} icon={item.icon} label={item.label} expanded indent
                  iconColor={item.iconColor}
                  onAction={() => act(toolActionMap[item.panel])}
                  onHover={() => onHoverPanel?.(item.panel)} />
              ))}
            </>
          ) : (
            <div className="relative group/tip">
              <button
                ref={toolsAnchor}
                onPointerDown={(e) => { e.preventDefault(); setToolsFlyout(p => !p); setSystemFlyout(false); }}
                className="sb-btn w-full flex items-center justify-center rounded-xl"
                style={{ color: "var(--sb-text)", background: toolsFlyout ? "var(--sb-active)" : "transparent" }}
              >
                <Sparkles className="w-4 h-4 shrink-0" strokeWidth={1.3} style={{ color: toolsFlyout ? "var(--sb-gold)" : "var(--sb-muted)" }} />
              </button>
              {!toolsFlyout && (
                <div className="sb-tip pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 rounded-lg text-[13px] font-light whitespace-nowrap opacity-0 scale-95 group-hover/tip:opacity-100 group-hover/tip:scale-100 z-50">
                  Studio
                </div>
              )}
            </div>
          )}
          <Flyout open={toolsFlyout} onClose={() => setToolsFlyout(false)} anchorRef={toolsAnchor} label="Studio">
            {toolItems.map(item => (
              <FlyoutItem key={item.panel} icon={item.icon} label={item.label} iconColor={item.iconColor}
                onAction={() => act(toolActionMap[item.panel])} />
            ))}
          </Flyout>
        </div>

        {/* ── Connect — bridge between self and others ──────── */}
        <div className="px-2 pb-1 shrink-0">
          <NavButton icon={Inbox} label="Messages" expanded={expanded}
            onAction={() => act(onOpenMessenger)}
            onHover={() => onHoverPanel?.("messenger")} />

          <div className={!expanded ? "relative group/tip" : undefined}>
            <button
              onPointerDown={(e) => { e.preventDefault(); act(() => setShareOpen(true)); }}
              className={`sb-btn group w-full flex items-center gap-3 rounded-xl ${
                !expanded ? "justify-center px-0" : "px-3.5"
              }`}
              style={{ color: "var(--sb-text)", background: "transparent" }}
            >
              <HeartIcon />
              {expanded && <span className="text-[13px] font-light whitespace-nowrap tracking-wide">Share the Love</span>}
            </button>
            {!expanded && (
              <div className="sb-tip pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 rounded-lg text-[13px] font-light whitespace-nowrap opacity-0 scale-95 group-hover/tip:opacity-100 group-hover/tip:scale-100 z-50">
                Share the Love
              </div>
            )}
          </div>
        </div>

        {/* ── Utility — quiet system controls ─────────────────── */}
        <div className="px-2 py-2 shrink-0 flex items-center gap-1" style={{ borderTop: "1px solid var(--sb-border)" }}>
          {/* Help */}
          {onReplayGuide && (
            <div className="relative group/tip">
              <button
                onPointerDown={(e) => { e.preventDefault(); act(onReplayGuide); }}
                className="sb-btn flex items-center justify-center rounded-xl"
                style={{ color: "var(--sb-muted)", width: "36px", height: "36px" }}
              >
                <HelpCircle className="w-4 h-4" strokeWidth={1.3} />
              </button>
              <div className="sb-tip pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 rounded-lg text-[13px] font-light whitespace-nowrap opacity-0 scale-95 group-hover/tip:opacity-100 group-hover/tip:scale-100 z-50">
                Help ({MOD_KEY} /)
              </div>
            </div>
          )}

          {/* Settings gear — flyout with Storage, Compute, Settings */}
          <div className="relative group/tip">
            <button
              ref={systemAnchor}
              onPointerDown={(e) => { e.preventDefault(); setSystemFlyout(p => !p); setToolsFlyout(false); }}
              className="sb-btn flex items-center justify-center rounded-xl"
              style={{ color: systemFlyout ? "var(--sb-gold)" : "var(--sb-muted)", width: "36px", height: "36px", background: systemFlyout ? "var(--sb-active)" : "transparent" }}
            >
              <Settings className="w-4 h-4" strokeWidth={1.3} />
            </button>
            {!systemFlyout && (
              <div className="sb-tip pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 rounded-lg text-[13px] font-light whitespace-nowrap opacity-0 scale-95 group-hover/tip:opacity-100 group-hover/tip:scale-100 z-50">
                System
              </div>
            )}
          </div>

          <Flyout open={systemFlyout} onClose={() => setSystemFlyout(false)} anchorRef={systemAnchor} label="System">
            {systemItems.map(item => (
              <FlyoutItem key={item.label} icon={item.icon} label={item.label}
                onAction={() => act(item.action)} />
            ))}
          </Flyout>

          {expanded && <div className="flex-1" />}
          {expanded && <TextSizeControl textSize={textSize} setTextSize={setTextSize} bgMode={bgMode} />}
        </div>

        {/* ── Genesis Dot ────────────────────────────────────── */}
        <div className="flex justify-center pb-3 pt-1 shrink-0">
          <div className={!expanded ? "relative group/tip" : undefined}>
            <button
              onPointerDown={(e) => { e.preventDefault(); act(() => setGenesisOpen(true)); }}
              className="group relative flex items-center justify-center select-none"
              style={{
                width: expanded ? "100%" : "44px", height: "44px",
                borderRadius: expanded ? "12px" : "50%",
                background: "transparent", border: "none", cursor: "pointer",
                padding: expanded ? "0 14px" : 0,
              }}
            >
              <div
                className="rounded-full group-hover:scale-125"
                style={{
                  width: "8px", height: "8px",
                  transition: "transform 200ms ease, background 300ms ease, box-shadow 300ms ease",
                  background: isTrusted ? "hsla(142, 55%, 50%, 0.9)" : "hsla(38, 50%, 60%, 0.85)",
                  boxShadow: isTrusted
                    ? "0 0 10px hsla(142, 55%, 50%, 0.5), 0 0 4px hsla(142, 55%, 50%, 0.3)"
                    : "0 0 calc(8px + 12px * var(--h-score, 0.5)) hsla(38, 50%, 55%, calc(0.2 + 0.4 * var(--h-score, 0.5)))",
                  animation: isTrusted ? "none" : "heartbeat-love calc(1.8s + 1.2s * (1 - var(--h-score, 0.5))) ease-in-out infinite",
                  flexShrink: 0,
                }}
              />
              {expanded && (
                <span className="text-[13px] font-light tracking-wide ml-3 whitespace-nowrap"
                  style={{ color: isTrusted ? "hsl(142, 40%, 60%)" : "var(--sb-gold)" }}>
                  {isTrusted ? "Connected" : "Genesis"}
                </span>
              )}
            </button>
            {!expanded && (
              <div className="sb-tip pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 rounded-lg text-[13px] font-light whitespace-nowrap opacity-0 scale-95 group-hover/tip:opacity-100 group-hover/tip:scale-100 z-50">
                {isTrusted ? "Connected · Trusted" : "Genesis"}
              </div>
            )}
          </div>
        </div>
      </aside>

      <ShareTheLoveModal open={shareOpen} onClose={() => setShareOpen(false)} />
      <GenesisPopover open={genesisOpen} onClose={() => setGenesisOpen(false)} bgMode={bgMode} />
    </>
  );
});
