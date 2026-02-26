/**
 * Hologram OS — Welcome Screen
 * ═════════════════════════════
 *
 * Desktop: Sidebar + full-bleed sanctuary hero (Aman-inspired).
 * Mobile: iOS-style homescreen shell.
 *
 * Architecture: Multi-frame layer stack
 *   Frame 0 (Canvas)  — Background imagery, Ken Burns, gradient veils
 *   Frame 1 (Chrome)  — Sidebar, Focus toggle, Day ring, BG mode dots
 *   Frame 2 (Content) — Welcome text, CTA, interest pills, chat pill
 *   Frame 3 (Overlay) — AI Chat, Claim overlay
 *
 * Design language: extreme restraint, muted earth tones,
 * generous whitespace, ultra-light serif, barely-there chrome.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import heroLandscape from "@/assets/hologram-hero-landscape.jpg";
import HologramClaimOverlay from "@/modules/hologram-ui/components/HologramClaimOverlay";
import HologramAiChat from "@/modules/hologram-ui/components/HologramAiChat";
import MobileOsShell from "@/modules/hologram-ui/components/MobileOsShell";
import DesktopOsSidebar from "@/modules/hologram-ui/components/DesktopOsSidebar";
import ShortcutCheatSheet from "@/modules/hologram-ui/components/ShortcutCheatSheet";
import LegalPanel from "@/modules/hologram-ui/components/LegalPanel";
import HologramFrame, { HologramViewport, OverlayFrame, useDepthShift } from "@/modules/hologram-ui/components/HologramFrame";
import { useFrameTilt } from "@/modules/hologram-ui/hooks/useFrameTilt";
import FrameDebugOverlay from "@/modules/hologram-ui/components/FrameDebugOverlay";
import LayerNavHUD from "@/modules/hologram-ui/components/LayerNavHUD";
import { useLayerNav } from "@/modules/hologram-ui/hooks/useLayerNav";
import { useGreeting } from "@/modules/hologram-ui/hooks/useGreeting";
import DayProgressRing from "@/modules/hologram-ui/components/DayProgressRing";
import { useTriadicActivity } from "@/modules/hologram-ui/hooks/useTriadicActivity";
import { useAttentionMode } from "@/modules/hologram-ui/hooks/useAttentionMode";
import { useFocusJournal } from "@/modules/hologram-ui/hooks/useFocusJournal";
import { useContextProjection } from "@/modules/hologram-ui/hooks/useContextProjection";
import { useShortcutMastery } from "@/modules/hologram-ui/hooks/useShortcutMastery";

// ── Mobile detection ────────────────────────────────────────────────────────
function useIsMobile(breakpoint = 640) {
  const [mobile, setMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false,
  );
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    setMobile(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [breakpoint]);
  return mobile;
}

// ── OS-aware modifier label ──────────────────────────────────────────────────
function _detectMac(): boolean {
  if (typeof navigator === "undefined") return false;
  if ("userAgentData" in navigator && (navigator as any).userAgentData?.platform) {
    return /mac/i.test((navigator as any).userAgentData.platform);
  }
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform) || /Macintosh/i.test(navigator.userAgent);
}
const MOD_LABEL = _detectMac() ? "⌘" : "Ctrl";

// ── Background Modes ────────────────────────────────────────────────────────

type BgMode = "image" | "white" | "dark";

const BG_MODES: { mode: BgMode; dot: string; dotActive: string; label: string }[] = [
  { mode: "image", dot: "hsla(38, 25%, 65%, 0.35)", dotActive: "hsl(38, 40%, 60%)", label: "Landscape" },
  { mode: "white", dot: "hsla(0, 0%, 30%, 0.5)", dotActive: "hsl(0, 0%, 15%)", label: "Light" },
  { mode: "dark",  dot: "hsla(0, 0%, 30%, 0.5)", dotActive: "hsl(30, 6%, 12%)", label: "Dark" },
];

/** Palette per mode — all text/chrome adapts for maximum contrast */
function palette(m: BgMode) {
  if (m === "white") return {
    wordmark: "hsla(0, 0%, 15%, 0.85)",
    greeting: "hsla(0, 0%, 10%, 0.7)",
    heading:  "hsla(0, 0%, 8%, 0.9)",
    sub:      "hsla(0, 0%, 25%, 0.6)",
    cta:      "hsla(0, 0%, 20%, 0.7)",
    ctaBorder:"hsla(0, 0%, 20%, 0.25)",
    ctaHoverBg: "hsla(0, 0%, 10%, 0.06)",
    ctaHoverText: "hsla(0, 0%, 5%, 0.9)",
    ctaHoverBorder: "hsla(0, 0%, 10%, 0.4)",
    pill:     "hsla(0, 0%, 95%, 0.7)",
    pillBorder: "hsla(0, 0%, 75%, 0.3)",
    pillText: "hsla(0, 0%, 25%, 0.6)",
    dotPulse: "hsl(0, 0%, 30%)",
    bg:       "hsl(0, 0%, 100%)",
  };
  if (m === "dark") return {
    wordmark: "hsla(0, 0%, 92%, 0.85)",
    greeting: "hsla(0, 0%, 100%, 0.65)",
    heading:  "hsla(0, 0%, 95%, 0.92)",
    sub:      "hsla(0, 0%, 80%, 0.55)",
    cta:      "hsla(0, 0%, 85%, 0.65)",
    ctaBorder:"hsla(0, 0%, 70%, 0.2)",
    ctaHoverBg: "hsla(0, 0%, 100%, 0.06)",
    ctaHoverText: "hsla(0, 0%, 95%, 0.9)",
    ctaHoverBorder: "hsla(0, 0%, 80%, 0.35)",
    pill:     "hsla(0, 0%, 10%, 0.6)",
    pillBorder: "hsla(0, 0%, 30%, 0.15)",
    pillText: "hsla(0, 0%, 80%, 0.55)",
    dotPulse: "hsl(0, 0%, 75%)",
    bg:       "hsl(0, 0%, 5%)",
  };
  // image mode
  return {
    wordmark: "hsla(0, 0%, 10%, 0.85)",
    greeting: "hsla(0, 0%, 8%, 0.65)",
    heading:  "hsla(38, 15%, 95%, 0.92)",
    sub:      "hsla(38, 12%, 80%, 0.55)",
    cta:      "hsla(38, 15%, 85%, 0.65)",
    ctaBorder:"hsla(38, 15%, 70%, 0.2)",
    ctaHoverBg: "hsla(38, 15%, 70%, 0.08)",
    ctaHoverText: "hsla(38, 15%, 95%, 0.9)",
    ctaHoverBorder: "hsla(38, 15%, 70%, 0.35)",
    pill:     "hsla(30, 8%, 10%, 0.5)",
    pillBorder: "hsla(38, 15%, 60%, 0.08)",
    pillText: "hsla(38, 12%, 80%, 0.5)",
    dotPulse: "hsl(38, 40%, 55%)",
    bg:       "transparent",
  };
}

// ── Welcome Screen ──────────────────────────────────────────────────────────
/** Syncs overlay open state into the DepthShift context */
function DepthShiftSync({ active }: { active: boolean }) {
  const { setOverlayActive } = useDepthShift();
  useEffect(() => {
    setOverlayActive(active, 3);
  }, [active, setOverlayActive]);
  return null;
}

export default function HologramOsPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [claimOpen, setClaimOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatPrompt, setChatPrompt] = useState("");
  const [legalOpen, setLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<"privacy" | "terms">("privacy");
  const { entryCount: journalEntryCount } = useFocusJournal();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [bgMode, setBgModeState] = useState<BgMode>(() => {
    const saved = localStorage.getItem("hologram-bg-mode");
    return saved === "white" || saved === "dark" || saved === "image" ? saved : "image";
  });
  const setBgMode = useCallback((m: BgMode) => {
    setBgModeState(m);
    localStorage.setItem("hologram-bg-mode", m);
  }, []);
  const [departing, setDeparting] = useState(false);
  const { greeting, name } = useGreeting();
  const triadicActivity = useTriadicActivity();
  const attention = useAttentionMode();
  const mastery = useShortcutMastery();
  const [replayGuide, setReplayGuide] = useState(0);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const ctx = useContextProjection();
  const contentTilt = useFrameTilt({ maxTilt: 0, smoothing: 0, maxShift: 0 });
  const canvasTilt = useFrameTilt({ maxTilt: 0, smoothing: 0, maxShift: 0 });
  const layerNav = useLayerNav();

  // Derive top interests for contextual suggestions (max 3)
  const contextHints = useMemo(() => {
    const entries = Object.entries(ctx.profile.interests);
    if (entries.length === 0) return [];
    return entries
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([tag]) => tag.replace(/-/g, " "));
  }, [ctx.profile.interests]);

  // Derive dominant phase
  const dominantPhase = useMemo(() => {
    const { learn, work, play } = ctx.profile.phaseAffinity;
    if (learn > work && learn > play) return "learning";
    if (work > learn && work > play) return "building";
    return "exploring";
  }, [ctx.profile.phaseAffinity]);

  const goConsole = useCallback(() => {
    setDeparting(true);
    setTimeout(() => navigate("/hologram-console"), 900);
  }, [navigate]);
  const P = useMemo(() => palette(bgMode), [bgMode]);
  const isFocus = attention.preset === "focus";

  // ── Global keyboard shortcuts ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;

      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      switch (e.key) {
        // ⌘L — Lumen AI (L = Lumen)
        case "l": case "L": e.preventDefault(); mastery.record("l"); setChatOpen(true); break;
        // ⌘B — Toggle sidebar (B = Bar/sidebar)
        case "b": case "B": e.preventDefault(); mastery.record("b"); setSidebarCollapsed(p => !p); break;
        // ⌘F — Toggle focus mode (F = Focus)
        case "f": case "F": e.preventDefault(); mastery.record("f"); attention.toggle(); break;
        // ⌘Y — Cycle style (Y = stYle)
        case "y": case "Y":
          e.preventDefault();
          mastery.record("y");
          setBgMode(BG_MODES[(BG_MODES.findIndex(b => b.mode === bgMode) + 1) % BG_MODES.length].mode);
          break;
        // ⌘M — Messages (M = Messages)
        case "m": case "M": e.preventDefault(); mastery.record("m"); /* TODO: open messages */ break;
        // ⌘H — Home (H = Home)
        case "h": case "H": e.preventDefault(); mastery.record("h"); navigate("/hologram-console"); break;
        // ⌘/ — Shortcut cheat sheet
        case "/":
          e.preventDefault();
          mastery.record("/");
          setShortcutsOpen(prev => !prev);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate, attention, bgMode, setBgMode]);

  // ── Mobile: iOS homescreen ──
  if (isMobile) return <MobileOsShell />;

  const welcomeName = name || "traveller";

  // ── Desktop: Layered frame stack ──
  return (
    <HologramViewport className="h-screen bg-background">
      {/* Depth-shift trigger: recede lower frames when overlays open */}
      <DepthShiftSync active={chatOpen || claimOpen} />
      {/* LayerNavHUD removed — focus toggle handles mode switching */}

      <div className="flex h-full overflow-hidden">
        {/* ════════════════════════════════════════════════════════════════
         *  FRAME 1 — Chrome Layer (always visible, highest priority)
         *  Sidebar + Focus toggle sit here, unaffected by content below
         * ════════════════════════════════════════════════════════════════ */}
        <div
          className="shrink-0 transition-all duration-300 ease-out overflow-hidden"
          style={{
            width: isFocus ? 0 : undefined,
            opacity: isFocus ? 0 : 1,
            pointerEvents: isFocus ? "none" : "auto",
          }}
        >
          <DesktopOsSidebar
            collapsed={isFocus ? true : sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((p) => !p)}
            onNewChat={() => setChatOpen(true)}
            onOpenChat={() => setChatOpen(true)}
            onReplayGuide={() => setShortcutsOpen(true)}
            hintOpacity={mastery.hintOpacity}
          />
        </div>

        {/* Main viewport area — contains canvas + chrome + content frames */}
        <div
          className="flex-1 relative overflow-hidden transition-all ease-in-out"
          style={{
            opacity: departing ? 0 : 1,
            transform: departing ? "scale(1.02)" : isFocus ? "scale(1.03)" : "scale(1)",
            filter: departing ? "blur(4px)" : "blur(0px)",
            transitionDuration: isFocus ? "600ms" : "400ms",
          }}
        >
          {/* ══════════════════════════════════════════════════════════
           *  FRAME 0 — Canvas Layer (background, imagery, veils)
           * ══════════════════════════════════════════════════════════ */}
          <HologramFrame layer={0} label="canvas" interactive={false} transform={canvasTilt} opacity={layerNav.layerOpacity(0)} style={{ transform: `scale(${layerNav.layerScale(0)})`, transition: "opacity 0.5s, transform 0.5s" }}>
            {/* Solid background for white/dark modes */}
            <div
              className="absolute inset-0 transition-all duration-1000 ease-in-out"
              style={{ background: P.bg, opacity: bgMode === "image" ? 0 : 1 }}
            />

            {/* Background Image — slow Ken Burns for life */}
            <div
              className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
              style={{ opacity: bgMode === "image" ? 1 : 0 }}
            >
              <img
                src={heroLandscape}
                alt="Serene landscape with misty mountains and tranquil water"
                className="w-full h-full object-cover"
                style={{
                  animation: attention.animateBackground ? "ken-burns 60s ease-out forwards" : "none",
                }}
              />
              {/* Gradient veil */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to bottom, hsla(30, 8%, 12%, 0.15) 0%, hsla(30, 6%, 10%, 0.08) 35%, hsla(25, 10%, 8%, 0.55) 100%)",
                }}
              />
            </div>
          </HologramFrame>

          {/* ══════════════════════════════════════════════════════════
           *  FRAME 1 — Chrome Layer (persistent UI controls)
           *  Background mode toggle, Day progress ring
           *  These remain visible regardless of what opens above
           * ══════════════════════════════════════════════════════════ */}
          <HologramFrame layer={1} label="chrome" interactive opacity={layerNav.layerOpacity(1)} style={{ transform: `scale(${layerNav.layerScale(1)})`, transition: "opacity 0.7s ease, transform 0.7s ease", zIndex: 400, pointerEvents: "none" }}>
            {/* Background Mode Toggle — top right */}
            <div
              className="absolute top-[3vh] right-[3vw] animate-fade-in transition-all duration-300 ease-out"
              style={{
                pointerEvents: isFocus ? "none" : "auto",
                opacity: isFocus ? 0 : 1,
                transform: isFocus ? "translateY(-10px)" : "translateY(0)",
                filter: "blur(var(--focus-blur-chrome, 0px))",
              }}
            >
              <div className="flex flex-col items-center gap-2">
                <div
                  className="flex items-center gap-0.5 px-2 py-1.5 rounded-full transition-all duration-300"
                  style={{
                    background: bgMode === "white" ? "hsla(0, 0%, 40%, 0.06)" : "hsla(0, 0%, 90%, 0.06)",
                    border: `1px solid ${bgMode === "white" ? "hsla(0, 0%, 40%, 0.12)" : "hsla(0, 0%, 70%, 0.08)"}`,
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                  }}
                >
                  {BG_MODES.map(({ mode, label }) => {
                    const isActive = bgMode === mode;
                    const dotColor = isActive
                      ? (bgMode === "white" ? "hsla(0, 0%, 15%, 0.8)" : "hsla(0, 0%, 85%, 0.85)")
                      : (bgMode === "white" ? "hsla(0, 0%, 40%, 0.3)" : "hsla(0, 0%, 70%, 0.25)");
                    return (
                      <button
                        key={mode}
                        onClick={() => setBgMode(mode)}
                        className="relative group flex items-center justify-center w-5 h-5 rounded-full transition-all duration-300"
                        aria-label={`Switch to ${label} background`}
                      >
                        <div
                          className="w-[5px] h-[5px] rounded-full transition-all duration-300 ease-out"
                          style={{
                            background: dotColor,
                            transform: isActive ? "scale(1.3)" : "scale(1)",
                            boxShadow: isActive ? `0 0 8px 1px ${dotColor}` : "none",
                          }}
                        />
                      </button>
                    );
                  })}
                </div>
                <span
                  className="tracking-[0.2em] uppercase font-light transition-colors duration-300"
                  style={{
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    fontSize: "clamp(11px, 0.8vw, 13px)",
                    color: bgMode === "white"
                      ? "hsla(0, 0%, 55%, 0.45)"
                      : "hsla(0, 0%, 70%, 0.5)",
                  }}
                >
                  Style
                </span>
              </div>
            </div>

            {/* Day Progress Ring — bottom right */}
            <div
              className="absolute bottom-[3vh] right-[3vw] animate-fade-in flex flex-col items-center gap-3 transition-all duration-300 ease-out"
              style={{
                pointerEvents: isFocus ? "none" : "auto",
                opacity: isFocus ? 0 : 1,
                transform: isFocus ? "translateY(10px)" : "translateY(0)",
              }}
            >
              <DayProgressRing balance={triadicActivity.balance ?? undefined} />
            </div>
          </HologramFrame>

          {/* ══════════════════════════════════════════════════════════
           *  FRAME 2 — Content Layer (welcome text, CTA, pills)
           *  The primary interactive surface for the welcome screen
           * ══════════════════════════════════════════════════════════ */}
          <HologramFrame layer={2} label="content" interactive={false} transform={contentTilt} opacity={layerNav.layerOpacity(2)} style={{ transform: `scale(${layerNav.layerScale(2)})`, transition: "opacity 0.5s, transform 0.5s" }}>
            {/* Logo — top center */}
            <div
              className="absolute top-[3vh] left-0 right-0 flex items-center justify-center animate-fade-in transition-all duration-300 ease-out"
              style={{
                pointerEvents: isFocus ? "none" : "auto",
                opacity: isFocus ? 0 : 1,
                transform: isFocus ? "translateY(-10px)" : "translateY(0)",
              }}
            >
              {/* SVG wordmark — geometric, open-A, ĀMAN-inspired */}
              <svg
                viewBox="0 0 360 40"
                className="transition-opacity duration-300 select-none"
                style={{
                  width: "clamp(260px, 28vw, 420px)",
                  height: "auto",
                  opacity: 0.85,
                }}
                aria-label="Hologram"
              >
                {/* All strokes use currentColor for theme adaptation */}
                <g
                  fill="none"
                  stroke={P.wordmark}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {/* H */}
                  <line x1="10" y1="6" x2="10" y2="34" />
                  <line x1="30" y1="6" x2="30" y2="34" />
                  <line x1="10" y1="20" x2="30" y2="20" />

                  {/* O */}
                  <ellipse cx="60" cy="20" rx="14" ry="14" />

                  {/* L */}
                  <line x1="94" y1="6" x2="94" y2="34" />
                  <line x1="94" y1="34" x2="114" y2="34" />

                  {/* O */}
                  <ellipse cx="144" cy="20" rx="14" ry="14" />

                  {/* G */}
                  <path d="M 198 12 A 14 14 0 1 0 198 28 L 198 20 L 188 20" />

                  {/* R */}
                  <line x1="222" y1="6" x2="222" y2="34" />
                  <path d="M 222 6 L 236 6 A 7 7 0 0 1 236 20 L 222 20" />
                  <line x1="232" y1="20" x2="242" y2="34" />

                  {/* A — open, no crossbar (ĀMAN style) */}
                  <line x1="266" y1="34" x2="280" y2="6" />
                  <line x1="280" y1="6" x2="294" y2="34" />

                  {/* M — geometric peaked */}
                  <line x1="318" y1="34" x2="318" y2="6" />
                  <line x1="318" y1="6" x2="334" y2="22" />
                  <line x1="334" y1="22" x2="350" y2="6" />
                  <line x1="350" y1="6" x2="350" y2="34" />
                </g>
              </svg>
            </div>

            {/* Welcome — centered */}
            <div className="absolute inset-0 flex flex-col items-center justify-center px-8">
              <div
                className="text-center space-y-[2.5vh] animate-fade-in transition-all duration-500 ease-out"
                style={{
                  pointerEvents: "auto",
                  maxWidth: isFocus ? "56rem" : "42rem",
                }}
              >
                <p
                  className="tracking-[0.25em] uppercase transition-all duration-500"
                  style={{
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    color: P.greeting,
                    fontWeight: 400,
                    fontSize: isFocus ? "clamp(15px, 1.6vw, 22px)" : "clamp(13px, 1.4vw, 18px)",
                    letterSpacing: "0.25em",
                  }}
                >
                  {greeting}
                </p>

                <h1
                  className="leading-[1.08] transition-all duration-500"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 300,
                    color: P.heading,
                    letterSpacing: "-0.01em",
                    fontSize: isFocus ? "clamp(48px, 6vw, 96px)" : "clamp(36px, 4.5vw, 76px)",
                  }}
                >
                  Welcome{contextHints.length > 0 ? " back" : " home"},
                  <br />
                  {welcomeName}.
                </h1>

                {/* Vertical line divider — hedosophia-inspired expand from center */}
                <div className="flex justify-center pt-[2vh] pb-[1vh]">
                  <div
                    className="relative flex items-center justify-center transition-all duration-500"
                    style={{ height: isFocus ? "clamp(80px, 10vh, 160px)" : "clamp(60px, 8vh, 120px)" }}
                  >
                    <div
                      style={{
                        width: "1px",
                        height: "100%",
                        background: bgMode === "white"
                          ? "hsla(0, 0%, 20%, 0.35)"
                          : "hsla(38, 15%, 75%, 0.35)",
                        transformOrigin: "center center",
                        animation: "line-expand 2s cubic-bezier(0.16, 1, 0.3, 1) 0.6s both",
                      }}
                    />
                  </div>
                </div>

                {/* Context interest pills */}
                {contextHints.length > 0 && (
                  <div className="flex items-center justify-center gap-3 animate-fade-in pb-[1vh]">
                    {contextHints.map((hint) => (
                      <button
                        key={hint}
                        onClick={() => {
                          setChatPrompt(`Tell me more about ${hint} — what should I explore next?`);
                          setChatOpen(true);
                        }}
                        className="transition-all duration-300 hover:scale-105"
                        style={{
                          fontFamily: "'DM Sans', system-ui, sans-serif",
                          fontSize: isFocus ? "clamp(10px, 0.7vw, 12px)" : "clamp(8px, 0.6vw, 10px)",
                          letterSpacing: "0.2em",
                          textTransform: "uppercase" as const,
                          fontWeight: 300,
                          color: bgMode === "white" ? "hsla(0, 0%, 30%, 0.5)" : "hsla(0, 0%, 80%, 0.4)",
                          padding: isFocus ? "5px 14px" : "3px 10px",
                          borderRadius: "100px",
                          border: `1px solid ${bgMode === "white" ? "hsla(0, 0%, 30%, 0.12)" : "hsla(0, 0%, 70%, 0.1)"}`,
                          background: bgMode === "white" ? "hsla(0, 0%, 90%, 0.4)" : "hsla(0, 0%, 15%, 0.25)",
                          backdropFilter: "blur(8px)",
                          cursor: "pointer",
                        }}
                      >
                        {hint}
                      </button>
                    ))}
                  </div>
                )}

                <div>
                  <button
                    onClick={goConsole}
                    className="inline-flex items-center transition-all duration-500"
                    style={{
                      fontFamily: "'DM Sans', system-ui, sans-serif",
                      fontWeight: 300,
                      fontSize: isFocus ? "clamp(12px, 1vw, 15px)" : "clamp(11px, 0.8vw, 13px)",
                      letterSpacing: "0.3em",
                      textTransform: "uppercase" as const,
                      color: P.cta,
                      border: `1px solid ${P.ctaBorder}`,
                      padding: isFocus
                        ? "clamp(14px, 1.5vw, 20px) clamp(40px, 4vw, 64px)"
                        : "clamp(12px, 1.2vw, 16px) clamp(32px, 3vw, 48px)",
                      background: "transparent",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = P.ctaHoverBg;
                      e.currentTarget.style.color = P.ctaHoverText;
                      e.currentTarget.style.borderColor = P.ctaHoverBorder;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = P.cta;
                      e.currentTarget.style.borderColor = P.ctaBorder;
                    }}
                  >
                    Enter
                  </button>
                </div>
              </div>
            </div>

            {/* AI Chat Pill — bottom center */}
            <div
              className="absolute bottom-[6vh] left-1/2 -translate-x-1/2 transition-all duration-500 ease-out"
              style={{
                pointerEvents: "auto",
                opacity: isFocus ? 0.7 : 1,
                transform: isFocus ? "translate(-50%, 0) scale(0.95)" : "translate(-50%, 0)",
              }}
            >
              <button
                onClick={() => setChatOpen(true)}
                className="relative flex items-center gap-3 px-7 py-3 rounded-full transition-all duration-300 hover:scale-105 group"
                style={{
                  background: P.pill,
                  backdropFilter: "blur(24px)",
                  WebkitBackdropFilter: "blur(24px)",
                  border: `1px solid ${P.pillBorder}`,
                }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full group-hover:scale-150 transition-transform duration-200"
                  style={{
                    background: P.dotPulse,
                    animation: "heartbeat-love 1.6s ease-in-out infinite",
                  }}
                />
                <span
                  className="tracking-[0.2em] font-light transition-colors duration-300"
                  style={{
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    color: P.pillText,
                    fontSize: "clamp(11px, 0.8vw, 13px)",
                  }}
                >
                  Lumen AI
                </span>
                {mastery.hintOpacity("l") > 0 && (
                  <span
                    className="tracking-[0.15em] uppercase font-medium transition-opacity duration-700"
                    style={{
                      fontFamily: "'DM Sans', system-ui, sans-serif",
                      color: P.pillText,
                      fontSize: "10px",
                      opacity: mastery.hintOpacity("l") * 0.4,
                    }}
                  >
                    {MOD_LABEL} L
                  </span>
                )}

                {journalEntryCount > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold tabular-nums animate-in zoom-in-50 duration-200"
                    style={{
                      background: "hsl(38, 50%, 50%)",
                      color: "hsl(38, 10%, 98%)",
                      boxShadow: "0 2px 8px hsla(38, 50%, 40%, 0.4)",
                      fontFamily: "'DM Sans', system-ui, sans-serif",
                    }}
                  >
                    {journalEntryCount > 99 ? "99+" : journalEntryCount}
                  </span>
                )}
              </button>
            </div>
          </HologramFrame>

          {/* ── Subtle legal links — Hedosophia-inspired ── */}
          <div
            className="absolute bottom-5 left-0 right-0 flex items-center justify-center gap-6 z-10"
            style={{
              opacity: "var(--focus-chrome-opacity, 1)",
              filter: "blur(var(--focus-blur-chrome, 0px))",
              transition: "opacity 0.7s ease, filter 0.7s ease",
            }}
          >
            <button
              onClick={() => { setLegalTab("privacy"); setLegalOpen(true); }}
              className="transition-opacity duration-500 hover:opacity-70"
              style={{
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontSize: "10px",
                letterSpacing: "0.15em",
                textTransform: "uppercase" as const,
                color: bgMode === "white"
                  ? "hsla(0, 0%, 40%, 0.35)"
                  : "hsla(0, 0%, 100%, 0.2)",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Privacy Policy
            </button>
            <span
              style={{
                width: "2px",
                height: "2px",
                borderRadius: "50%",
                background: bgMode === "white"
                  ? "hsla(0, 0%, 40%, 0.2)"
                  : "hsla(0, 0%, 100%, 0.12)",
              }}
            />
            <button
              onClick={() => { setLegalTab("terms"); setLegalOpen(true); }}
              className="transition-opacity duration-500 hover:opacity-70"
              style={{
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontSize: "10px",
                letterSpacing: "0.15em",
                textTransform: "uppercase" as const,
                color: bgMode === "white"
                  ? "hsla(0, 0%, 40%, 0.35)"
                  : "hsla(0, 0%, 100%, 0.2)",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Terms of Use
            </button>
          </div>

          {/* Keyframes moved to index.css for zero-recalc mounting */}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
       *  FRAME 3 — Overlay Layer (modals, chat, claim)
       *  Inside the viewport so depth recession triggers on lower frames
       * ════════════════════════════════════════════════════════════════ */}
      <HologramClaimOverlay open={claimOpen} onClose={() => setClaimOpen(false)} />
      <ShortcutCheatSheet open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <LegalPanel open={legalOpen} initialTab={legalTab} onClose={() => setLegalOpen(false)} bgMode={bgMode === "white" ? "white" : "dark"} />
      <HologramAiChat
        open={chatOpen}
        onClose={() => { setChatOpen(false); setChatPrompt(""); }}
        onPhaseChange={triadicActivity.setActivePhase}
        creatorStage={triadicActivity.creatorStage}
        replayGuideKey={replayGuide}
        initialPrompt={chatPrompt}
      />
      {/* FrameDebugOverlay removed for cleaner UI */}
    </HologramViewport>
  );
}
