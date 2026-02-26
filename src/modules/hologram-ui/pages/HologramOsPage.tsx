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
import { GripVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroLandscape from "@/assets/hologram-hero-landscape.jpg";
import HologramClaimOverlay from "@/modules/hologram-ui/components/HologramClaimOverlay";
import HologramAiChat from "@/modules/hologram-ui/components/HologramAiChat";
import HologramBrowser from "@/modules/hologram-ui/components/HologramBrowser";
import MobileOsShell from "@/modules/hologram-ui/components/MobileOsShell";
import DesktopOsSidebar from "@/modules/hologram-ui/components/DesktopOsSidebar";
import ShortcutCheatSheet from "@/modules/hologram-ui/components/ShortcutCheatSheet";
import LegalPanel from "@/modules/hologram-ui/components/LegalPanel";
import HologramFrame, { HologramViewport, OverlayFrame, useDepthShift } from "@/modules/hologram-ui/components/HologramFrame";
import AttentionToggle from "@/modules/hologram-ui/components/AttentionToggle";
import ModularSnapGrid from "@/modules/hologram-ui/components/ModularSnapGrid";
import SnapGuideOverlay from "@/modules/hologram-ui/components/SnapGuideOverlay";
import AmbientPlayer, { type AmbientState } from "@/modules/hologram-ui/components/AmbientPlayer";
import { useModularPanel } from "@/modules/hologram-ui/hooks/useModularPanel";
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
import { useContextBeacon } from "@/modules/hologram-ui/hooks/useScreenContext";
import { useDraggablePosition } from "@/modules/hologram-ui/hooks/useDraggablePosition";

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
    greeting: "hsla(0, 0%, 10%, 0.75)",
    heading:  "hsla(0, 0%, 5%, 0.92)",
    sub:      "hsla(0, 0%, 20%, 0.7)",
    cta:      "hsla(0, 0%, 15%, 0.8)",
    ctaBorder:"hsla(0, 0%, 20%, 0.3)",
    ctaHoverBg: "hsla(0, 0%, 10%, 0.06)",
    ctaHoverText: "hsla(0, 0%, 5%, 0.95)",
    ctaHoverBorder: "hsla(0, 0%, 10%, 0.5)",
    pill:     "hsla(0, 0%, 95%, 0.7)",
    pillBorder: "hsla(0, 0%, 75%, 0.3)",
    pillText: "hsla(0, 0%, 25%, 0.7)",
    dotPulse: "hsl(0, 0%, 30%)",
    bg:       "hsl(0, 0%, 100%)",
  };
  if (m === "dark") return {
    wordmark: "hsla(0, 0%, 92%, 0.9)",
    greeting: "hsla(0, 0%, 100%, 0.75)",
    heading:  "hsla(0, 0%, 97%, 0.95)",
    sub:      "hsla(0, 0%, 85%, 0.7)",
    cta:      "hsla(0, 0%, 90%, 0.8)",
    ctaBorder:"hsla(0, 0%, 70%, 0.25)",
    ctaHoverBg: "hsla(0, 0%, 100%, 0.08)",
    ctaHoverText: "hsla(0, 0%, 97%, 0.95)",
    ctaHoverBorder: "hsla(0, 0%, 80%, 0.4)",
    pill:     "hsla(0, 0%, 10%, 0.6)",
    pillBorder: "hsla(0, 0%, 30%, 0.15)",
    pillText: "hsla(0, 0%, 85%, 0.7)",
    dotPulse: "hsl(0, 0%, 80%)",
    bg:       "hsl(0, 0%, 5%)",
  };
  // image mode — text must read clearly over photography
  return {
    wordmark: "hsla(0, 0%, 98%, 0.9)",
    greeting: "hsla(0, 0%, 95%, 0.8)",
    heading:  "hsla(0, 0%, 100%, 0.95)",
    sub:      "hsla(38, 12%, 90%, 0.75)",
    cta:      "hsla(38, 15%, 92%, 0.85)",
    ctaBorder:"hsla(38, 15%, 80%, 0.3)",
    ctaHoverBg: "hsla(38, 15%, 70%, 0.1)",
    ctaHoverText: "hsla(38, 15%, 98%, 0.95)",
    ctaHoverBorder: "hsla(38, 15%, 80%, 0.45)",
    pill:     "hsla(30, 8%, 10%, 0.5)",
    pillBorder: "hsla(38, 15%, 60%, 0.08)",
    pillText: "hsla(38, 12%, 90%, 0.7)",
    dotPulse: "hsl(38, 45%, 60%)",
    bg:       "transparent",
  };
}

// ── Time-aware Lumen subtitle ───────────────────────────────────────────────
function getLumenSubtitle(): string {
  const h = new Date().getHours();
  if (h >= 22 || h < 5)  return "Wind down. I\u2019m here if you need me.";
  if (h >= 5 && h < 7)   return "The world is still quiet. A good time to think.";
  if (h >= 7 && h < 10)  return "A fresh start. What matters to you today?";
  if (h >= 10 && h < 12) return "Your companion, here whenever you\u2019re ready.";
  if (h >= 12 && h < 14) return "Take a breath. I\u2019ll be here when you return.";
  if (h >= 14 && h < 17) return "Deep in the day. Let\u2019s make it count.";
  if (h >= 17 && h < 20) return "The day is unwinding. Reflect, or keep going.";
  return "Evening light. A gentle space to explore.";
}

// ── Typewriter text — reveals characters one by one ─────────────────────────
function TypewriterText({ text, delay = 2400, speed = 45 }: { text: string; delay?: number; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setStarted(false);
    setDone(false);
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [text, delay]);

  useEffect(() => {
    if (!started || displayed.length >= text.length) return;
    const t = setTimeout(() => {
      const next = text.slice(0, displayed.length + 1);
      setDisplayed(next);
      if (next.length >= text.length) setDone(true);
    }, speed);
    return () => clearTimeout(t);
  }, [started, displayed, text, speed]);

  return (
    <span style={{ position: "relative", display: "inline" }}>
      {/* Invisible full text reserves the final layout height — no jumps */}
      <span style={{ visibility: "hidden" }} aria-hidden="true">{text}</span>
      {/* Visible typed portion overlaid exactly on top */}
      <span style={{ position: "absolute", left: 0, top: 0 }}>
        {displayed}
        {started && !done && (
          <span style={{ opacity: 0.5, animation: "blink-caret 0.8s step-end infinite" }}>▎</span>
        )}
        {done && (
          <span style={{ animation: "blink-caret 0.8s step-end 2, fade-out 0.6s ease-out 1.6s forwards", opacity: 0.5 }}>▎</span>
        )}
      </span>
    </span>
  );
}


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
  const [browserOpen, setBrowserOpen] = useState(false);
  const [pillGlow, setPillGlow] = useState(false);
  const [ambientState, setAmbientState] = useState<AmbientState>({ playing: false, loading: false, stationHue: "220", stationName: "" });
  const lumenPillDrag = useDraggablePosition({ storageKey: "hologram-pos:lumen-pill", defaultPos: { x: 0, y: 0 }, mode: "offset", snapSize: { width: 160, height: 44 } });
  const dayRingDrag = useDraggablePosition({ storageKey: "hologram-pos:day-ring", defaultPos: { x: 0, y: 0 }, mode: "offset", snapSize: { width: 64, height: 64 } });
  const lumenPanel = useModularPanel({
    storageKey: "lumen-ai",
    defaultWidth: 340,
    constraints: { minWidth: 280, maxWidth: 600 },
    snap: true,
    dockSide: "right",
  });
  const [chatPrompt, setChatPrompt] = useState("");
  const [legalOpen, setLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<"privacy" | "terms">("privacy");
  const { entryCount: journalEntryCount } = useFocusJournal();
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

  // Register context beacon so Lumini.AI knows what the user is viewing
  useContextBeacon({
    id: "hologram-home",
    title: `Hologram Home — ${greeting}`,
    summary: `User is on the Hologram OS welcome screen. Background: ${bgMode}. ${attention.preset === "focus" ? "Focus mode is active." : ""}`,
    contentType: "dashboard",
    metadata: {
      creatorStage: triadicActivity.creatorStage,
      focusMode: attention.preset === "focus",
      bgMode,
    },
  });
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

      // ⌘⇧R — Reset all element positions
      if (mod && e.shiftKey && (e.key === "r" || e.key === "R")) {
        e.preventDefault();
        lumenPillDrag.resetPosition();
        dayRingDrag.resetPosition();
        Object.keys(localStorage).filter(k => k.startsWith("hologram-pos:")).forEach(k => localStorage.removeItem(k));
        window.location.reload();
        return;
      }

      if (!mod) return;

      switch (e.key) {
        // ⌘L — Lumen AI (L = Lumen)
        case "l": case "L": e.preventDefault(); mastery.record("l"); setChatOpen(true); break;
        // ⌘B — reserved for sidebar (handled internally now)
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
      {/* Depth-shift trigger: recede lower frames only for claim overlay */}
      <DepthShiftSync active={claimOpen} />
      {/* LayerNavHUD removed — focus toggle handles mode switching */}

      <div className="flex h-full overflow-hidden">
        {/* ════════════════════════════════════════════════════════════════
         *  FRAME 1 — Chrome Layer (always visible, highest priority)
         *  Sidebar + Focus toggle sit here, unaffected by content below
         * ════════════════════════════════════════════════════════════════ */}
        <div
          className="shrink-0 overflow-visible"
          style={{
            width: isFocus ? 0 : undefined,
            opacity: isFocus ? 0 : 1,
            pointerEvents: isFocus ? "none" : "auto",
            transition: isFocus ? "all 300ms ease-out" : "none",
          }}
        >
          <DesktopOsSidebar
            onNewChat={() => setChatOpen(true)}
            onOpenChat={() => setChatOpen(true)}
            onOpenBrowser={() => { setBrowserOpen(true); setChatOpen(false); }}
            onReplayGuide={() => setShortcutsOpen(true)}
            hintOpacity={mastery.hintOpacity}
          />
        </div>

        {/* Main viewport area — contains canvas + chrome + content frames */}
        <div
          className={`flex-1 relative overflow-hidden z-0 ${lumenPanel.isResizing ? "" : "transition-all ease-in-out"}`}
          style={{
            opacity: departing ? 0 : 1,
            transform: departing ? "scale(1.02)" : isFocus ? "scale(1.03)" : "scale(1)",
            filter: departing ? "blur(4px)" : "none",
            transitionDuration: lumenPanel.isResizing ? "0ms" : isFocus ? "600ms" : "400ms",
            marginRight: chatOpen ? `${lumenPanel.width}px` : "0px",
          }}
        >
          {/* Focus toggle — lives inside content area so it shifts with Lumen */}
          <AttentionToggle />
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
                  animation: bgMode === "image" ? "ken-burns-breathe 27s cubic-bezier(0.25, 0.1, 0.25, 1) forwards" : "none",
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
              {/* Ambient music glow — subtle color wash */}
              <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-[2s] ease-in-out"
                style={{
                  opacity: ambientState.playing ? 1 : 0,
                  background: `radial-gradient(ellipse 120% 80% at 50% 100%, hsla(${ambientState.stationHue}, 40%, 35%, 0.12) 0%, hsla(${ambientState.stationHue}, 30%, 25%, 0.06) 40%, transparent 70%)`,
                  animation: ambientState.playing ? "ambient-glow-breathe 8s ease-in-out infinite" : "none",
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
              className="absolute top-[3vh] right-6 animate-fade-in transition-all duration-300 ease-out"
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

            {/* Day Progress Ring — bottom right, draggable */}
            <div
              className="absolute bottom-[3vh] right-6 animate-fade-in flex items-center gap-2 transition-all duration-300 ease-out"
              style={{
                pointerEvents: isFocus ? "none" : "auto",
                opacity: isFocus ? 0 : 1,
                transform: isFocus
                  ? `translate(${dayRingDrag.pos.x}px, ${dayRingDrag.pos.y + 10}px)`
                  : `translate(${dayRingDrag.pos.x}px, ${dayRingDrag.pos.y}px)`,
                touchAction: "none",
                userSelect: "none",
              }}
            >
              <div
                className="cursor-grab active:cursor-grabbing opacity-0 hover:opacity-40 transition-opacity duration-300"
                {...dayRingDrag.handlers}
                title="Drag to reposition"
              >
                <GripVertical className="w-3 h-3" style={{ color: "hsla(0, 0%, 80%, 0.6)" }} />
              </div>
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
                  width: "clamp(200px, 22vw, 340px)",
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
                className="text-center space-y-[3.5vh] animate-fade-in transition-all duration-500 ease-out"
                style={{
                  textShadow: bgMode === "image" ? "0 1px 8px hsla(0, 0%, 0%, 0.5), 0 0 30px hsla(0, 0%, 0%, 0.2)" : "none",
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

                {/* Lumen AI — the magic moment, the only CTA */}
                <div
                  className="flex flex-col items-center gap-[1.8vh]"
                  style={{
                    animation: "stagger-fade-in 1.4s cubic-bezier(0.16, 1, 0.3, 1) 1.6s both",
                  }}
                >
                  <button
                    onClick={() => { setChatPrompt(""); setChatOpen(true); }}
                    className="group flex flex-col items-center transition-all duration-700 hover:scale-[1.03]"
                    style={{ cursor: "pointer", background: "none", border: "none", gap: isFocus ? "clamp(20px, 3vh, 36px)" : "clamp(16px, 2.5vh, 28px)" }}
                  >
                    {/* Breathing glyph — the heart of Lumen */}
                    <div className="relative flex items-center justify-center" style={{ width: isFocus ? "clamp(64px, 6vw, 88px)" : "clamp(52px, 5vw, 72px)", height: isFocus ? "clamp(64px, 6vw, 88px)" : "clamp(52px, 5vw, 72px)" }}>
                      {/* Outer ring — soft pulse */}
                      <div
                        className="absolute rounded-full transition-all duration-700 group-hover:scale-125"
                        style={{
                          width: isFocus ? "clamp(64px, 6vw, 88px)" : "clamp(52px, 5vw, 72px)",
                          height: isFocus ? "clamp(64px, 6vw, 88px)" : "clamp(52px, 5vw, 72px)",
                          border: `1px solid ${bgMode === "white" ? "hsla(38, 30%, 50%, 0.2)" : "hsla(38, 25%, 75%, 0.2)"}`,
                          animation: "lumen-ring-enter 1.2s cubic-bezier(0.16, 1, 0.3, 1) 1.8s both, ambient-glow-breathe 6s ease-in-out 3s infinite",
                        }}
                      />
                      {/* Inner dot — alive */}
                      <div
                        className="rounded-full transition-all duration-700 group-hover:scale-110"
                        style={{
                          width: isFocus ? "clamp(8px, 0.8vw, 12px)" : "clamp(6px, 0.6vw, 10px)",
                          height: isFocus ? "clamp(8px, 0.8vw, 12px)" : "clamp(6px, 0.6vw, 10px)",
                          background: bgMode === "white"
                            ? "hsla(38, 45%, 50%, 0.75)"
                            : "hsla(38, 50%, 60%, 0.7)",
                          boxShadow: bgMode === "white"
                            ? "0 0 20px hsla(38, 40%, 50%, 0.4)"
                            : "0 0 24px hsla(38, 50%, 55%, 0.35)",
                          animation: "lumen-dot-enter 1.4s cubic-bezier(0.16, 1, 0.3, 1) 1.8s both, heartbeat-love 2.4s ease-in-out 3.2s infinite",
                        }}
                      />
                    </div>

                    {/* Name — Lumen */}
                    <span
                      className="tracking-[0.35em] uppercase transition-all duration-500 group-hover:tracking-[0.45em]"
                      style={{
                        fontFamily: "'DM Sans', system-ui, sans-serif",
                        fontWeight: 400,
                        fontSize: isFocus ? "clamp(12px, 1vw, 15px)" : "clamp(11px, 0.85vw, 13px)",
                        color: bgMode === "white"
                          ? "hsla(30, 10%, 25%, 0.7)"
                          : "hsla(38, 15%, 88%, 0.7)",
                      }}
                    >
                      Lumen AI
                    </span>

                    {/* Typewriter subtitle */}
                    <p
                      className="tracking-[0.08em] transition-all duration-500"
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontWeight: 300,
                        fontStyle: "italic",
                        fontSize: isFocus ? "clamp(14px, 1.2vw, 20px)" : "clamp(12px, 1vw, 17px)",
                        color: bgMode === "white" ? "hsla(0, 0%, 25%, 0.6)" : "hsla(38, 12%, 85%, 0.6)",
                        maxWidth: "30ch",
                        lineHeight: 1.6,
                        animation: "stagger-fade-in 1s cubic-bezier(0.16, 1, 0.3, 1) 2.2s both",
                      }}
                    >
                      <TypewriterText text={getLumenSubtitle()} />
                    </p>
                  </button>
                </div>
              </div>
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
                  ? "hsla(30, 10%, 35%, 0.55)"
                  : "hsla(38, 15%, 85%, 0.55)",
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
                  ? "hsla(30, 10%, 35%, 0.3)"
                  : "hsla(38, 15%, 85%, 0.3)",
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
                  ? "hsla(30, 10%, 35%, 0.55)"
                  : "hsla(38, 15%, 85%, 0.55)",
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
      <ModularSnapGrid visible={lumenPanel.isResizing} />
      <HologramAiChat
        open={chatOpen}
        onClose={() => { setChatOpen(false); setChatPrompt(""); setPillGlow(true); setTimeout(() => setPillGlow(false), 1800); }}
        onPhaseChange={triadicActivity.setActivePhase}
        creatorStage={triadicActivity.creatorStage}
        replayGuideKey={replayGuide}
        initialPrompt={chatPrompt}
        panelWidth={lumenPanel.width}
        resizeHandleProps={lumenPanel.resizeHandleProps}
        isResizing={lumenPanel.isResizing}
      />
      {/* FrameDebugOverlay removed for cleaner UI */}
      <AmbientPlayer lumenOffset={chatOpen ? lumenPanel.width : 0} onStateChange={setAmbientState} />
      {/* ── Browser Panel (full-bleed overlay) ── */}
      {browserOpen && (
        <OverlayFrame layer={3} open={browserOpen}>
          <div
            className="fixed inset-0 z-[500] flex"
            style={{ background: "hsl(25, 8%, 10%)" }}
          >
            <HologramBrowser
              onClose={() => setBrowserOpen(false)}
              onSendToLumen={({ title, url, markdown }) => {
                const truncated = markdown.length > 4000 ? markdown.slice(0, 4000) + "\n\n…[truncated]" : markdown;
                setChatPrompt(`I'm reading "${title}" (${url}). Here's the page content:\n\n${truncated}\n\nPlease summarize the key points and insights from this page.`);
                setBrowserOpen(false);
                setChatOpen(true);
              }}
            />
          </div>
        </OverlayFrame>
      )}
      <SnapGuideOverlay />
    </HologramViewport>
  );
}
