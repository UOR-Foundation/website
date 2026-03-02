/**
 * MobileOsShell — The Portal
 * ═══════════════════════════════════════════════════════════════════
 *
 * The device screen is a portal into Hologram. Designed for ubiquitous
 * presence, voice-first interaction, instant response, and context-aware
 * ambient intelligence.
 *
 * Architecture:
 *   ┌─────────────────────────────┐
 *   │        The Void             │  ← canvas (dark or light)
 *   │                             │
 *   │     ◇ your identity mark   │  ← subtle personal anchor
 *   │                             │
 *   │   "Good evening."          │  ← ambient whisper (contextual)
 *   │                             │
 *   │     ┌──────────┐            │
 *   │     │ BLOOM    │            │  ← manifested content (on demand)
 *   │     │ SURFACE  │            │
 *   │     └──────────┘            │
 *   │                             │
 *   │         ◉                   │  ← Lumen orb (tap to speak)
 *   │      LUMEN                  │
 *   └─────────────────────────────┘
 *
 * Golden Ratio (φ = 1.618) governs all proportions.
 * Orb positioned at screen height × 0.618 from top.
 *
 * Resting state: void + glyph + whisper + breathing orb.
 * Content blooms upward from orb when summoned.
 * Triple dismissal: swipe down, voice "done", auto-fade.
 *
 * New users: typographic narrative in the void.
 *
 * @module hologram-ui/components/shell/MobileOsShell
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home, User, Globe, Settings, LayoutGrid,
  Sparkles, X, Download, ChevronUp, Sun, Moon, Ear, EarOff,
  Fingerprint, Inbox, Terminal, Beaker, Atom, Code2, Package,
} from "lucide-react";
import { useWakeWord } from "@/modules/hologram-ui/hooks/useWakeWord";
import MySpacePanel from "../MySpacePanel";
import MobileLumenBloom from "../lumen/MobileLumenBloom";
import PwaInstallBanner from "../PwaInstallBanner";
import { useGreeting } from "@/modules/hologram-ui/hooks/useGreeting";
import { usePwaInstall } from "@/modules/hologram-ui/hooks/usePwaInstall";
import { useAmbientWhisper } from "@/modules/hologram-ui/hooks/useAmbientWhisper";
import { usePortalCoherence } from "@/modules/hologram-ui/hooks/usePortalCoherence";
import { PP, GR } from "@/modules/hologram-ui/theme/portal-palette";
import { getPrimeTheme, setPrimeTheme } from "@/modules/hologram-ui/theme/prime-palette";
import { supabase } from "@/integrations/supabase/client";

// ── Golden Ratio Helpers ──────────────────────────────────────────────
const ORB_SIZE = 80;
const ORB_BREATH_SIZE = ORB_SIZE + GR.lg; // eslint-disable-line @typescript-eslint/no-unused-vars

// ── Haptic feedback — warm, responsive ─────────────────────────────────
function heartbeatHaptic() {
  if (!("vibrate" in navigator)) return;
  navigator.vibrate([60, 80, 40, 400, 60, 80, 40]);
}

function softHaptic() {
  if (!("vibrate" in navigator)) return;
  navigator.vibrate(15);
}

// ── Console zones — Sanctuary → Explore → Create ──────────────────────
interface ConsoleItem {
  label: string;
  icon: React.ElementType;
  action: string;
  iconColor?: string;
}

interface ConsoleZone {
  label: string;
  items: ConsoleItem[];
}

const CONSOLE_ZONES: ConsoleZone[] = [
  {
    label: "Sanctuary",
    items: [
      { label: "Home",     icon: Home,        action: "/hologram-os" },
      { label: "My Space", icon: Fingerprint,  action: "__myspace" },
    ],
  },
  {
    label: "Explore",
    items: [
      { label: "Apps",     icon: LayoutGrid,  action: "/hologram-os?open=explore" },
      { label: "Web",      icon: Globe,       action: "/research" },
      { label: "Messages", icon: Inbox,       action: "__messages" },
    ],
  },
  {
    label: "Create",
    items: [
      { label: "Terminal",    icon: Terminal,  action: "__terminal" },
      { label: "Jupyter",     icon: Beaker,    action: "__jupyter",     iconColor: "hsl(34, 35%, 70%)" },
      { label: "AI Lab",      icon: Sparkles,  action: "__ailab",       iconColor: "hsl(260, 60%, 65%)" },
      { label: "Quantum Lab", icon: Atom,      action: "__quantum",     iconColor: "hsl(200, 60%, 60%)" },
      { label: "Code",        icon: Code2,     action: "__code",        iconColor: "hsl(210, 80%, 60%)" },
      { label: "Packages",    icon: Package,   action: "__packages",    iconColor: "hsl(38, 50%, 55%)" },
    ],
  },
];

// ── New User Narrative ─────────────────────────────────────────────────
const NARRATIVE_LINES = [
  "Welcome.",
  "This is your space — yours alone.",
  "An intelligence that serves you.",
  "Never the other way around.",
  "Tap the light below to begin.",
];

function useNarrative(isNewUser: boolean) {
  const [lineIndex, setLineIndex] = useState(-1);
  const [charIndex, setCharIndex] = useState(0);
  const [complete, setComplete] = useState(!isNewUser);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!isNewUser || complete) return;

    // Initial pause before narrative begins
    const startDelay = setTimeout(() => {
      setStarted(true);
      setLineIndex(0);
      setCharIndex(0);
    }, 1200);

    return () => clearTimeout(startDelay);
  }, [isNewUser, complete]);

  useEffect(() => {
    if (!started || lineIndex < 0 || lineIndex >= NARRATIVE_LINES.length) return;

    const line = NARRATIVE_LINES[lineIndex];
    if (charIndex < line.length) {
      const timer = setTimeout(() => setCharIndex(c => c + 1), 55);
      return () => clearTimeout(timer);
    }

    // Line complete — pause, then advance
    if (lineIndex < NARRATIVE_LINES.length - 1) {
      const pause = setTimeout(() => {
        setLineIndex(l => l + 1);
        setCharIndex(0);
      }, 1600); // φ-inspired pause
      return () => clearTimeout(pause);
    }

    // All lines done
    const finishPause = setTimeout(() => setComplete(true), 2400);
    return () => clearTimeout(finishPause);
  }, [started, lineIndex, charIndex]);

  return {
    isActive: started && !complete,
    complete,
    currentLine: lineIndex >= 0 ? NARRATIVE_LINES[lineIndex]?.slice(0, charIndex) ?? "" : "",
    previousLines: lineIndex > 0 ? NARRATIVE_LINES.slice(0, lineIndex) : [],
    lineIndex,
    typing: lineIndex >= 0 && lineIndex < NARRATIVE_LINES.length && charIndex < (NARRATIVE_LINES[lineIndex]?.length ?? 0),
  };
}

// ── Component ──────────────────────────────────────────────────────────
export default function MobileOsShell() {
  const navigate = useNavigate();
  const [claimOpen, setClaimOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [userGlyph, setUserGlyph] = useState<string | null>(null);
  const [themeKey, setThemeKey] = useState(getPrimeTheme());
  const [orbY, setOrbY] = useState<number | undefined>(undefined);
  const [alwaysListening, setAlwaysListening] = useState(false);
  const orbRef = useRef<HTMLButtonElement>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPressRef = useRef(false);

  const { name } = useGreeting();
  const whisper = useAmbientWhisper();
  const pwa = usePwaInstall();
  const narrative = useNarrative(isNewUser);
  const coherence = usePortalCoherence();

  // ── Wake Word: "Hi Lumen" ──────────────────────────────────────────
  const handleWake = useCallback(() => {
    if (orbRef.current) {
      const rect = orbRef.current.getBoundingClientRect();
      setOrbY(rect.top + rect.height / 2);
    }
    heartbeatHaptic();
    setChatOpen(true);
  }, []);

  const wakeWord = useWakeWord({
    onWake: handleWake,
    wakePhrase: "hi lumen",
    enabled: alwaysListening && !chatOpen,
  });

  // Check if user is new (no glyph yet)
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        setIsNewUser(true);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("uor_glyph, uor_canonical_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      setUserGlyph(data?.uor_glyph ?? null);
      setIsNewUser(!data?.uor_canonical_id);
    });
  }, []);

  // Prevent scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // ── Swipe-up for drawer ──────────────────────────────────────────
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const y = e.touches[0].clientY;
    if (y > window.innerHeight - 120) {
      touchStartY.current = y;
      touchStartTime.current = Date.now();
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    const dt = Date.now() - touchStartTime.current;
    touchStartY.current = null;
    if ((dy > 40 && dt < 400) || dy > 80) {
      setDrawerOpen(true);
      softHaptic();
    }
  }, []);

  // ── Orb tap — instant Lumen activation ─────────────────────────────
  const handleOrbPointerDown = useCallback(() => {
    didLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      didLongPressRef.current = true;
      setAlwaysListening(prev => {
        const next = !prev;
        if (navigator.vibrate) navigator.vibrate(next ? [30, 60, 30] : 15);
        return next;
      });
    }, 600);
  }, []);

  const handleOrbPointerUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleLumenTap = useCallback(() => {
    if (didLongPressRef.current) {
      didLongPressRef.current = false;
      return;
    }
    // Capture orb position for bloom origin
    if (orbRef.current) {
      const rect = orbRef.current.getBoundingClientRect();
      setOrbY(rect.top + rect.height / 2);
    }
    softHaptic();
    setChatOpen(true);
  }, []);

  const handleNav = useCallback(
    (action: string) => {
      setDrawerOpen(false);
      softHaptic();
      if (action === "__claim" || action === "__myspace") return setClaimOpen(true);
      if (action === "__chat") return setChatOpen(true);
      if (action === "__messages") return setChatOpen(true); // opens Lumen for now
      // Dev tools — open Lumen with context
      if (["__terminal", "__jupyter", "__ailab", "__quantum", "__code", "__packages"].includes(action)) {
        return setChatOpen(true);
      }
      navigate(action);
    },
    [navigate],
  );

  const toggleTheme = useCallback(() => {
    const next = getPrimeTheme() === "dark" ? "light" : "dark";
    setPrimeTheme(next);
    setThemeKey(next);
    softHaptic();
  }, []);

  const isDark = themeKey === "dark";

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 flex flex-col select-none overflow-hidden"
      style={{
        background: PP.canvas,
        touchAction: "pan-x",
        overscrollBehavior: "none",
        transition: "background 0.6s ease",
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ════════════════════════════════════════════════════════════
           THE VOID — the canvas IS the portal
           ════════════════════════════════════════════════════════════ */}

      <div className="relative z-10 flex flex-col h-full">

        {/* ── Top bar: theme toggle (minimal) ─────────────────────── */}
        <div
          className="flex items-center justify-between px-6"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 16px) + 12px)" }}
        >
          <p
            className="tracking-[0.35em] uppercase"
            style={{
              fontFamily: PP.fontDisplay,
              fontSize: "14px",
              fontWeight: 500,
              color: PP.textSecondary,
              letterSpacing: "0.35em",
            }}
          >
            Hologram
          </p>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full active:scale-90 transition-transform duration-200"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? (
              <Sun className="w-5 h-5" strokeWidth={1.4} style={{ color: PP.textSecondary }} />
            ) : (
              <Moon className="w-5 h-5" strokeWidth={1.4} style={{ color: PP.textSecondary }} />
            )}
          </button>
        </div>

        {/* ── Center: The living void ──────────────────────────────── */}
        <div
          className="flex-1 flex flex-col items-center justify-center px-8"
          style={{ paddingBottom: `${GR.xxxl}px` }}
        >
          {/* ── New User Narrative (typographic journey) ────────── */}
          {narrative.isActive && (
            <div className="flex flex-col items-center gap-8 max-w-[320px]">
              {/* Previous lines — fading */}
              {narrative.previousLines.map((line, i) => (
                <p
                  key={i}
                  className="text-center leading-relaxed"
                  style={{
                    fontFamily: PP.fontDisplay,
                    fontSize: "28px",
                    fontWeight: 300,
                    color: PP.narrativeFade,
                    transition: "color 1s ease",
                  }}
                >
                  {line}
                </p>
              ))}
              {/* Current line — typing */}
              <p
                className="text-center leading-relaxed"
                style={{
                  fontFamily: PP.fontDisplay,
                  fontSize: "28px",
                  fontWeight: 300,
                  color: PP.narrativeText,
                  minHeight: "40px",
                }}
              >
                {narrative.currentLine}
                {narrative.typing && (
                  <span
                    style={{
                      opacity: 0.4,
                      animation: "portal-blink-caret 0.8s step-end infinite",
                    }}
                  >
                    ▎
                  </span>
                )}
              </p>
            </div>
          )}

          {/* ── Resting State (post-narrative or returning user) ──── */}
          {(narrative.complete || !isNewUser) && (
            <>
               {/* Identity mark — your personal anchor */}
               {userGlyph && (
               <div
                  className="flex items-center justify-center mb-6"
                  style={{
                    width: GR.xxxl,
                    height: GR.xxxl,
                    fontSize: "48px",
                    color: PP.accent,
                    textShadow: `0 0 30px ${PP.glyphGlow}`,
                    animation: "portal-glyph-breathe 6s ease-in-out infinite",
                    userSelect: "none",
                    opacity: 0.6,
                  }}
                >
                  {userGlyph}
                </div>
              )}

              {/* Greeting — personalized, warm */}
              {name && (
              <h1
                  className="text-center mb-4"
                  style={{
                    fontFamily: PP.fontDisplay,
                    fontSize: "38px",
                    fontWeight: 300,
                    color: PP.text,
                    letterSpacing: "-0.01em",
                    lineHeight: 1.2,
                    animation: "portal-fade-up 1s cubic-bezier(0.23, 1, 0.32, 1) both",
                    animationDelay: "0.3s",
                  }}
                >
                  {name}
                </h1>
              )}

              {/* Ambient whisper — contextually prioritized */}
              <p
                className="text-center"
                style={{
                  fontFamily: PP.font,
                  fontSize: "17px",
                  fontWeight: 400,
                  color: PP.textSecondary,
                  letterSpacing: "0.01em",
                  lineHeight: 1.7,
                  animation: "portal-fade-up 1s cubic-bezier(0.23, 1, 0.32, 1) both",
                  animationDelay: "0.6s",
                  maxWidth: "280px",
                }}
              >
                {whisper.text}
              </p>
            </>
          )}
        </div>

        {/* ── Lumen Orb — your point of contact ─────────────────── */}
        <div
          className="flex flex-col items-center"
          style={{
            paddingBottom: `calc(env(safe-area-inset-bottom, 16px) + ${GR.xl}px)`,
          }}
        >
          {/* Resonance indicator — subtle arc above orb */}
          {coherence.resonanceConfidence > 0.15 && (
            <div
              className="mb-3 flex items-center gap-2"
              style={{
                animation: "portal-fade-up 0.8s cubic-bezier(0.23, 1, 0.32, 1) both",
                animationDelay: "1.2s",
              }}
            >
              <div
                className="h-[2px] rounded-full"
                style={{
                  width: `${32 + coherence.resonanceScore * 40}px`,
                  background: `linear-gradient(90deg, transparent, ${PP.accent}, transparent)`,
                  opacity: 0.15 + coherence.resonanceScore * 0.35,
                  transition: "all 1.5s ease",
                }}
              />
            </div>
          )}

          <button
            ref={orbRef}
            onClick={handleLumenTap}
            onPointerDown={handleOrbPointerDown}
            onPointerUp={handleOrbPointerUp}
            onPointerLeave={handleOrbPointerUp}
            className="relative flex items-center justify-center active:scale-95 transition-transform duration-300"
            style={{
              width: ORB_SIZE,
              height: ORB_SIZE,
              touchAction: "none",
              animation: "portal-orb-emanate 0.9s cubic-bezier(0.23, 1, 0.32, 1) 0.6s both",
            }}
            aria-label={alwaysListening ? "Listening for 'Hi Lumen' — tap to open" : "Open Lumen"}
          >
            {/* Wake word sentinel ring — visible when always-listening */}
            {alwaysListening && (
              <div
                className="absolute rounded-full pointer-events-none"
                style={{
                  inset: -(GR.xl),
                  border: `1.5px solid hsla(185, 40%, 55%, ${wakeWord.isDetecting ? 0.35 : 0.12})`,
                  animation: "portal-wake-sentinel 4s ease-in-out infinite",
                  transition: "border-color 0.5s ease",
                }}
              />
            )}
            {/* Outer breathing ring — synced to coherence */}
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                inset: -(GR.md),
                border: `1px solid ${PP.orbBreathRing}`,
                animation: `portal-orb-breathe var(--portal-breath-duration, 5s) ease-in-out infinite`,
              }}
            />
            {/* Secondary ring — offset phase */}
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                inset: -(GR.lg),
                border: `1px solid ${PP.orbBreathRing}`,
                opacity: 0.5,
                animation: `portal-orb-breathe var(--portal-breath-duration, 5s) ease-in-out infinite calc(var(--portal-breath-duration, 5s) / 2)`,
              }}
            />
            {/* Coherence glow field */}
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                inset: -4,
                background: `radial-gradient(circle, ${PP.orbGlow}, transparent 70%)`,
                opacity: `var(--portal-glow-intensity, 0.15)`,
                transition: "opacity 1.5s ease",
              }}
            />
            {/* Center point */}
            <div
              className="rounded-full"
              style={{
                width: 14,
                height: 14,
                background: PP.orbCenter,
                boxShadow: `0 0 ${12 + coherence.hScore * 16}px ${PP.orbGlow}`,
                transition: "box-shadow 1.5s ease",
              }}
            />
          </button>

          {/* Orb label + listening indicator */}
          <div className="mt-3 flex items-center gap-2 justify-center">
            {alwaysListening && (
              <Ear
                className="w-3 h-3"
                strokeWidth={1.5}
                style={{
                  color: wakeWord.isDetecting ? "hsla(185, 50%, 60%, 0.8)" : PP.textWhisper,
                  opacity: wakeWord.isDetecting ? 1 : 0.5,
                  transition: "all 0.3s ease",
                }}
              />
            )}
            <p
              className="tracking-[0.35em] uppercase text-center"
              style={{
                fontFamily: PP.font,
                fontSize: "13px",
                fontWeight: 500,
                color: PP.textSecondary,
                animation: "portal-fade-up 1s cubic-bezier(0.23, 1, 0.32, 1) both",
                animationDelay: "1s",
              }}
            >
              {alwaysListening ? "Listening" : "Lumen"}
            </p>
          </div>

          {/* Drawer handle */}
          <button
            onClick={() => { setDrawerOpen(true); softHaptic(); }}
            className="mt-4 flex flex-col items-center gap-1 py-2 px-8 active:scale-95 transition-transform duration-200"
            aria-label="Open navigation"
          >
            <ChevronUp
              className="w-5 h-5"
              strokeWidth={1}
              style={{
                color: PP.textWhisper,
                opacity: 0.3,
                animation: "portal-gentle-float 3s ease-in-out infinite",
              }}
            />
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
           NAVIGATION DRAWER — slides up from bottom
           ════════════════════════════════════════════════════════════ */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            onClick={() => setDrawerOpen(false)}
            style={{
              background: PP.backdropColor,
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              animation: "portal-fade-in 0.3s ease-out both",
            }}
          />
          {/* Panel */}
          <div
            className="relative z-10 rounded-t-[28px] overflow-hidden"
            style={{
              background: PP.drawerBg,
              backdropFilter: "blur(40px)",
              WebkitBackdropFilter: "blur(40px)",
              border: `1px solid ${PP.drawerBorder}`,
              borderBottom: "none",
              animation: "portal-slide-up 0.35s cubic-bezier(0.23, 1, 0.32, 1) both",
              paddingBottom: "env(safe-area-inset-bottom, 16px)",
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div
                className="w-10 h-1 rounded-full"
                style={{ background: PP.orbBreathRing }}
              />
            </div>

            {/* Header bar */}
            <div className="flex items-center justify-between px-6 pt-2 pb-3">
              <p
                className="tracking-[0.3em] uppercase"
                style={{
                  fontFamily: PP.fontDisplay,
                  fontSize: "12px",
                  fontWeight: 500,
                  color: PP.textSecondary,
                  letterSpacing: "0.3em",
                }}
              >
                Console
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setDrawerOpen(false); navigate("/settings"); }}
                  className="p-2 rounded-full active:scale-90 transition-transform"
                  style={{ color: PP.textSecondary }}
                >
                  <Settings className="w-4 h-4" strokeWidth={1.3} />
                </button>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 rounded-full active:scale-90 transition-transform"
                  style={{ color: PP.textSecondary }}
                >
                  <X className="w-4 h-4" strokeWidth={1.3} />
                </button>
              </div>
            </div>

            {/* Console zones */}
            <nav className="px-5 pb-3" style={{ fontFamily: PP.font }}>
              {CONSOLE_ZONES.map((zone, zi) => (
                <div key={zone.label} style={{ marginBottom: `${GR.lg}px` }}>
                  {/* Zone label */}
                  <p
                    className="tracking-[0.25em] uppercase mb-2 px-3"
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      color: PP.textWhisper,
                      letterSpacing: "0.25em",
                      animation: "portal-stagger-in 0.4s cubic-bezier(0.23, 1, 0.32, 1) both",
                      animationDelay: `${50 + zi * 80}ms`,
                    }}
                  >
                    {zone.label}
                  </p>
                  {/* Items grid — 2 or 3 columns */}
                  <div
                    className="grid gap-1.5"
                    style={{
                      gridTemplateColumns: zone.items.length <= 2 ? "1fr 1fr" : "1fr 1fr 1fr",
                    }}
                  >
                    {zone.items.map((item, i) => (
                      <button
                        key={item.label}
                        onClick={() => handleNav(item.action)}
                        className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl active:scale-[0.95] transition-all duration-200"
                        style={{
                          color: PP.text,
                          touchAction: "manipulation",
                          WebkitTapHighlightColor: "transparent",
                          background: "transparent",
                          animation: "portal-stagger-in 0.4s cubic-bezier(0.23, 1, 0.32, 1) both",
                          animationDelay: `${100 + zi * 80 + i * 50}ms`,
                        }}
                      >
                        <div
                          className="flex items-center justify-center rounded-xl"
                          style={{
                            width: `${GR.xxl}px`,
                            height: `${GR.xxl}px`,
                            background: `${PP.accent}08`,
                            border: `1px solid ${PP.accent}0a`,
                          }}
                        >
                          <item.icon
                            className="w-5 h-5"
                            strokeWidth={1.2}
                            style={{ color: item.iconColor || PP.accentMuted }}
                          />
                        </div>
                        <span
                          className="text-center leading-tight"
                          style={{
                            fontSize: "12px",
                            fontWeight: 400,
                            color: PP.textSecondary,
                            letterSpacing: "0.02em",
                          }}
                        >
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            {/* Primary action */}
            <div className="px-5 pb-4 space-y-2">
              {(pwa.canInstall || pwa.isIosSafari) && !pwa.isStandalone && (
                <button
                  onClick={() => { setDrawerOpen(false); pwa.canInstall ? pwa.install() : window.location.assign("/install"); }}
                  className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl active:scale-[0.97] transition-all duration-200"
                  style={{
                    background: `${PP.accent}0a`,
                    border: `1px solid ${PP.accent}0d`,
                    color: PP.accentMuted,
                    fontFamily: PP.font,
                  }}
                >
                  <Download className="w-4 h-4" strokeWidth={1.5} />
                  <span className="text-[13px] font-light tracking-wide">Install Hologram</span>
                </button>
              )}
              <button
                onClick={() => { setDrawerOpen(false); setChatOpen(true); heartbeatHaptic(); }}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl active:scale-[0.97] transition-all duration-200"
                style={{
                  background: `${PP.accent}12`,
                  border: `1px solid ${PP.accent}15`,
                  color: PP.accent,
                  fontFamily: PP.font,
                }}
              >
                <Sparkles className="w-4 h-4" strokeWidth={1.5} />
                <span className="text-[14px] font-light tracking-wide">Open Lumen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
           OVERLAYS
           ════════════════════════════════════════════════════════════ */}
      {claimOpen && (
        <div className="fixed inset-0 z-50" style={{ background: PP.canvas }}>
          <MySpacePanel onClose={() => setClaimOpen(false)} />
        </div>
      )}
      <MobileLumenBloom open={chatOpen} onClose={() => setChatOpen(false)} orbY={orbY} />
      <PwaInstallBanner pwa={pwa} />

      {/* ════════════════════════════════════════════════════════════
           PORTAL KEYFRAMES
           ════════════════════════════════════════════════════════════ */}
      <style>{`
        @keyframes portal-orb-breathe {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.06); opacity: 0.5; }
        }
        @keyframes portal-orb-emanate {
          0% { transform: scale(0); opacity: 0; }
          40% { transform: scale(0.2); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes portal-glyph-breathe {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.02); }
        }
        @keyframes portal-fade-up {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes portal-gentle-float {
          0%, 100% { transform: translateY(0); opacity: 0.3; }
          50% { transform: translateY(-3px); opacity: 0.5; }
        }
        @keyframes portal-fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes portal-slide-up {
          0% { transform: translateY(100%); }
          100% { transform: translateY(0); }
        }
        @keyframes portal-stagger-in {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes portal-blink-caret {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes portal-wake-sentinel {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.08); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
