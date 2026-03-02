/**
 * MobileOsShell — The Portal
 * ═══════════════════════════════════════════════════════════════════
 *
 * The device screen is a portal into Hologram. Inspired by the Star Trek
 * computer: ubiquitous presence, voice-first interaction, instant response,
 * context-aware ambient intelligence.
 *
 * Architecture:
 *   ┌─────────────────────────────┐
 *   │        The Void             │  ← canvas (dark or light)
 *   │                             │
 *   │     ◇ sovereign glyph      │  ← subtle identity anchor
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

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home, Compass, User, Globe, Shield, Settings,
  Sparkles, X, Download, ChevronUp, Sun, Moon,
} from "lucide-react";
import MySpacePanel from "../MySpacePanel";
import HologramAiChat from "../HologramAiChat";
import PwaInstallBanner from "../PwaInstallBanner";
import { useGreeting } from "@/modules/hologram-ui/hooks/useGreeting";
import { usePwaInstall } from "@/modules/hologram-ui/hooks/usePwaInstall";
import { useAmbientWhisper } from "@/modules/hologram-ui/hooks/useAmbientWhisper";
import { PP, GR, PHI_INV } from "@/modules/hologram-ui/theme/portal-palette";
import { getPrimeTheme, setPrimeTheme } from "@/modules/hologram-ui/theme/prime-palette";
import { supabase } from "@/integrations/supabase/client";

// ── Golden Ratio Helpers ──────────────────────────────────────────────
const ORB_SIZE = 68;
const ORB_BREATH_SIZE = ORB_SIZE + GR.lg;

// ── Haptic heartbeat — coherent, loving pulse ──────────────────────────
function heartbeatHaptic() {
  if (!("vibrate" in navigator)) return;
  navigator.vibrate([60, 80, 40, 400, 60, 80, 40]);
}

function softHaptic() {
  if (!("vibrate" in navigator)) return;
  navigator.vibrate(15);
}

// ── Nav items ──────────────────────────────────────────────────────────
interface NavItem {
  label: string;
  icon: React.ElementType;
  action: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home",       icon: Home,     action: "/hologram-console" },
  { label: "Explore",    icon: Compass,  action: "/console/apps" },
  { label: "Your Space", icon: User,     action: "/your-space" },
  { label: "Community",  icon: Globe,    action: "/research" },
  { label: "My Space",   icon: Shield,   action: "__myspace" },
  { label: "Settings",   icon: Settings, action: "/settings" },
];

// ── New User Narrative ─────────────────────────────────────────────────
const NARRATIVE_LINES = [
  "This is your space.",
  "Nothing here belongs to anyone but you.",
  "An intelligence that serves you. Never the other way around.",
  "Let's begin.",
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
  const [pressing, setPressing] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [userGlyph, setUserGlyph] = useState<string | null>(null);
  const [themeKey, setThemeKey] = useState(getPrimeTheme());
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { name } = useGreeting();
  const whisper = useAmbientWhisper();
  const pwa = usePwaInstall();
  const narrative = useNarrative(isNewUser);

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

  // ── Orb press ──────────────────────────────────────────────────────
  const handleLumenPress = useCallback(() => {
    setPressing(true);
    heartbeatHaptic();
    pressTimer.current = setTimeout(() => {
      setPressing(false);
      setChatOpen(true);
    }, 750);
  }, []);

  const handleNav = useCallback(
    (action: string) => {
      setDrawerOpen(false);
      if (action === "__claim" || action === "__myspace") return setClaimOpen(true);
      if (action === "__chat") return setChatOpen(true);
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
            className="tracking-[0.5em] uppercase"
            style={{
              fontFamily: PP.font,
              fontSize: "10px",
              color: PP.textWhisper,
              opacity: 0.5,
              letterSpacing: "0.5em",
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
              <Sun className="w-4 h-4" strokeWidth={1.2} style={{ color: PP.textWhisper, opacity: 0.5 }} />
            ) : (
              <Moon className="w-4 h-4" strokeWidth={1.2} style={{ color: PP.textWhisper, opacity: 0.5 }} />
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
            <div className="flex flex-col items-center gap-6 max-w-[280px]">
              {/* Previous lines — fading */}
              {narrative.previousLines.map((line, i) => (
                <p
                  key={i}
                  className="text-center leading-relaxed"
                  style={{
                    fontFamily: PP.fontDisplay,
                    fontSize: "22px",
                    fontWeight: 300,
                    color: PP.narrativeFade,
                    transition: "color 0.8s ease",
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
                  fontSize: "22px",
                  fontWeight: 300,
                  color: PP.narrativeText,
                  minHeight: "34px",
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
              {/* Sovereign glyph — floating subtly */}
              {userGlyph && (
                <div
                  className="flex items-center justify-center mb-8"
                  style={{
                    width: GR.xxxl,
                    height: GR.xxxl,
                    fontSize: "42px",
                    color: PP.glyphColor,
                    textShadow: `0 0 40px ${PP.glyphGlow}`,
                    animation: "portal-glyph-breathe 6s ease-in-out infinite",
                    userSelect: "none",
                  }}
                >
                  {userGlyph}
                </div>
              )}

              {/* Greeting — personalized, warm */}
              {name && (
                <h1
                  className="text-center mb-3"
                  style={{
                    fontFamily: PP.fontDisplay,
                    fontSize: "32px",
                    fontWeight: 300,
                    color: PP.text,
                    letterSpacing: "0.01em",
                    lineHeight: 1.3,
                    animation: "portal-fade-up 0.8s cubic-bezier(0.23, 1, 0.32, 1) both",
                    animationDelay: "0.2s",
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
                  fontSize: "16px",
                  fontWeight: 400,
                  color: PP.textWhisper,
                  letterSpacing: "0.02em",
                  lineHeight: 1.6,
                  animation: "portal-fade-up 0.8s cubic-bezier(0.23, 1, 0.32, 1) both",
                  animationDelay: "0.5s",
                  maxWidth: "260px",
                }}
              >
                {whisper.text}
              </p>
            </>
          )}
        </div>

        {/* ── Lumen Orb — the soul of the portal ──────────────────── */}
        <div
          className="flex flex-col items-center"
          style={{
            paddingBottom: `calc(env(safe-area-inset-bottom, 16px) + ${GR.xl}px)`,
          }}
        >
          <button
            onClick={handleLumenPress}
            className="relative flex items-center justify-center active:scale-95 transition-transform duration-300"
            style={{
              width: ORB_SIZE,
              height: ORB_SIZE,
              animation: "portal-orb-emanate 0.9s cubic-bezier(0.23, 1, 0.32, 1) 0.6s both",
            }}
            aria-label="Open Lumen"
          >
            {/* Outer breathing ring */}
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                inset: -(GR.md),
                border: `1px solid ${PP.orbBreathRing}`,
                animation: "portal-orb-breathe 5s ease-in-out infinite",
              }}
            />
            {/* Secondary ring — offset phase */}
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                inset: -(GR.lg),
                border: `1px solid ${PP.orbBreathRing}`,
                opacity: 0.5,
                animation: "portal-orb-breathe 5s ease-in-out infinite 2.5s",
              }}
            />
            {/* Glow field */}
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                inset: -4,
                background: `radial-gradient(circle, ${pressing ? PP.orbGlow.replace("0.12", "0.3").replace("0.1", "0.25") : PP.orbGlow}, transparent 70%)`,
                transition: "all 0.4s ease",
              }}
            />
            {/* Center point */}
            <div
              className="rounded-full"
              style={{
                width: 10,
                height: 10,
                background: PP.orbCenter,
                opacity: pressing ? 1 : 0.8,
                boxShadow: pressing
                  ? `0 0 20px ${PP.orbGlow}, 0 0 40px ${PP.orbGlow}`
                  : `0 0 12px ${PP.orbGlow}`,
                transition: "all 0.4s ease",
              }}
            />
          </button>

          {/* Orb label */}
          <p
            className="mt-3 tracking-[0.4em] uppercase text-center"
            style={{
              fontFamily: PP.font,
              fontSize: "11px",
              color: PP.textWhisper,
              opacity: 0.6,
              animation: "portal-fade-up 0.8s cubic-bezier(0.23, 1, 0.32, 1) both",
              animationDelay: "0.9s",
            }}
          >
            Lumen
          </p>

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
            <div className="flex justify-center pt-3 pb-2">
              <div
                className="w-10 h-1 rounded-full"
                style={{ background: PP.orbBreathRing }}
              />
            </div>

            {/* Close */}
            <div className="flex justify-end px-5 pb-2">
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-full active:scale-90 transition-transform"
                style={{ color: PP.textSecondary }}
              >
                <X className="w-5 h-5" strokeWidth={1.2} />
              </button>
            </div>

            {/* Nav items */}
            <nav className="px-6 pb-4 space-y-1">
              {NAV_ITEMS.map((item, i) => (
                <button
                  key={item.label}
                  onClick={() => handleNav(item.action)}
                  className="w-full flex items-center gap-4 py-4 px-4 rounded-2xl active:scale-[0.98] transition-all duration-200"
                  style={{
                    color: PP.text,
                    fontFamily: PP.font,
                    touchAction: "manipulation",
                    WebkitTapHighlightColor: "transparent",
                    animation: "portal-stagger-in 0.4s cubic-bezier(0.23, 1, 0.32, 1) both",
                    animationDelay: `${80 + i * 60}ms`,
                  }}
                >
                  <item.icon className="w-5 h-5" strokeWidth={1.3} style={{ color: PP.accentMuted }} />
                  <span className="text-[16px] font-light tracking-wide">{item.label}</span>
                </button>
              ))}
            </nav>

            {/* Actions */}
            <div className="px-6 pb-4 space-y-2">
              {pwa.canInstall && !pwa.isStandalone && (
                <button
                  onClick={() => { setDrawerOpen(false); pwa.install(); }}
                  className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl active:scale-[0.97] transition-all duration-200"
                  style={{
                    background: `${PP.accent}12`,
                    border: `1px solid ${PP.accent}15`,
                    color: PP.accentMuted,
                    fontFamily: PP.font,
                  }}
                >
                  <Download className="w-4 h-4" strokeWidth={1.5} />
                  <span className="text-[14px] font-light tracking-wide">Install Hologram</span>
                </button>
              )}
              <button
                onClick={() => { setDrawerOpen(false); setChatOpen(true); heartbeatHaptic(); }}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl active:scale-[0.97] transition-all duration-200"
                style={{
                  background: `${PP.accent}15`,
                  border: `1px solid ${PP.accent}18`,
                  color: PP.accent,
                  fontFamily: PP.font,
                }}
              >
                <Sparkles className="w-4 h-4" strokeWidth={1.5} />
                <span className="text-[15px] font-light tracking-wide">Open Lumen</span>
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
      <HologramAiChat open={chatOpen} onClose={() => setChatOpen(false)} />
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
      `}</style>
    </div>
  );
}
