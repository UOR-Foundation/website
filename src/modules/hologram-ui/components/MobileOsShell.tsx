/**
 * MobileOsShell — Portal to Intelligence
 * ════════════════════════════════════════
 *
 * A minimal, tranquil mobile welcome screen that feels like
 * a window into aligned intelligence. No boxes, no clutter.
 * Just presence — greeting, breathing Lumen circle, and a
 * barely-there navigation gesture.
 *
 * Haptic heartbeat rhythm on Lumen press: two soft beats
 * (lub-dub) that feel alive and coherent.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home, Compass, User, Globe, Shield, Settings,
  Sparkles, ChevronUp, X,
} from "lucide-react";
import HologramClaimOverlay from "./HologramClaimOverlay";
import HologramAiChat from "./HologramAiChat";
import { useGreeting } from "@/modules/hologram-ui/hooks/useGreeting";
import heroLandscape from "@/assets/hologram-hero-landscape.jpg";

/* ── Palette ───────────────────────────────────────────────── */
const P = {
  text: "hsl(38, 15%, 90%)",
  textMuted: "hsl(38, 10%, 65%)",
  textDim: "hsl(38, 8%, 50%)",
  gold: "hsl(38, 40%, 65%)",
  goldMuted: "hsl(38, 25%, 48%)",
  fontDisplay: "'Playfair Display', serif",
  font: "'DM Sans', system-ui, sans-serif",
} as const;

/* ── Haptic heartbeat — lub-dub like a coherent, loving heart ── */
function heartbeatHaptic() {
  if (!("vibrate" in navigator)) return;
  // lub-dub pattern: short strong, pause, short soft, longer rest
  navigator.vibrate([60, 80, 40, 400, 60, 80, 40]);
}

/* ── Parallax from device orientation ──────────────────────── */
function useParallax() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handle = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      const x = Math.max(-1, Math.min(1, (e.gamma ?? 0) / 30)) * 6;
      const y = Math.max(-1, Math.min(1, ((e.beta ?? 0) - 45) / 30)) * 6;
      setOffset({ x, y });
    };
    window.addEventListener("deviceorientation", handle);
    return () => window.removeEventListener("deviceorientation", handle);
  }, []);

  return offset;
}

/* ── Stabilized typewriter ─────────────────────────────────── */
function useTypewriter(text: string, speed = 55, delay = 600) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    setStarted(false);
    const startTimer = setTimeout(() => {
      setStarted(true);
      let i = 0;
      const interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(startTimer);
  }, [text, speed, delay]);

  return { displayed, done, started };
}

/* ── Breathing messages ────────────────────────────────────── */
const WHISPERS = [
  "What's on your mind?",
  "Ready when you are.",
  "Let's think together.",
  "Your portal awaits.",
  "Breathe. Then begin.",
];

/* ── Nav items for the drawer ──────────────────────────────── */
interface NavItem {
  label: string;
  icon: React.ElementType;
  action: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home",       icon: Home,     action: "/hologram-console" },
  { label: "Apps",       icon: Compass,  action: "/console/apps" },
  { label: "Your Space", icon: User,     action: "/your-space" },
  { label: "Community",  icon: Globe,    action: "/research" },
  { label: "Identity",   icon: Shield,   action: "__claim" },
  { label: "Settings",   icon: Settings, action: "/settings" },
];

/* ── Component ─────────────────────────────────────────────── */
export default function MobileOsShell() {
  const navigate = useNavigate();
  const [claimOpen, setClaimOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pressing, setPressing] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const parallax = useParallax();
  const { greeting, name } = useGreeting();

  /* ── Swipe-up gesture for drawer ─────────────────────────── */
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only detect swipes starting in the bottom 120px of the screen
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

    // Swipe up: at least 40px distance, under 400ms, or slow drag > 80px
    if ((dy > 40 && dt < 400) || dy > 80) {
      setDrawerOpen(true);
      heartbeatHaptic();
    }
  }, []);

  // Random whisper on mount
  const [whisper] = useState(() => WHISPERS[Math.floor(Math.random() * WHISPERS.length)]);
  const typed = useTypewriter(whisper, 50, 1800);

  const handleLumenPress = useCallback(() => {
    setPressing(true);
    heartbeatHaptic();

    // Open after heartbeat completes (~700ms)
    pressTimer.current = setTimeout(() => {
      setPressing(false);
      setChatOpen(true);
    }, 750);
  }, []);

  const handleNav = useCallback(
    (action: string) => {
      setDrawerOpen(false);
      if (action === "__claim") return setClaimOpen(true);
      if (action === "__chat") return setChatOpen(true);
      navigate(action);
    },
    [navigate],
  );

  // Prevent scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      className="fixed inset-0 flex flex-col select-none overflow-hidden"
      style={{ touchAction: "pan-x", overscrollBehavior: "none" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Layer 0: Background — living landscape ──────────── */}
      <div
        className="absolute inset-0 transition-transform duration-[1.5s] ease-out"
        style={{ transform: `translate(${parallax.x}px, ${parallax.y}px) scale(1.05)` }}
      >
        <img
          src={heroLandscape}
          alt=""
          className="w-full h-full object-cover"
          style={{
            animation: "ken-burns-breathe 60s cubic-bezier(0.25, 0.1, 0.25, 1) forwards",
          }}
        />
        {/* Bottom vignette for text legibility */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, hsla(25, 8%, 5%, 0.1) 0%, hsla(25, 8%, 5%, 0.15) 30%, hsla(25, 8%, 5%, 0.65) 75%, hsla(25, 8%, 5%, 0.85) 100%)",
          }}
        />
        {/* Top vignette for branding */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, hsla(25, 8%, 5%, 0.4) 0%, transparent 25%)",
          }}
        />
      </div>

      {/* ── Layer 1: Content — greeting + Lumen portal ──────── */}
      <div className="relative z-10 flex flex-col h-full">

        {/* Top: Branding — whisper quiet */}
        <div className="flex items-center justify-center pt-[env(safe-area-inset-top,16px)] mt-4">
          <p
            className="text-[9px] tracking-[0.6em] uppercase"
            style={{ color: "hsla(38, 15%, 85%, 0.35)", fontFamily: P.font }}
          >
            Hologram
          </p>
        </div>

        {/* Center: Greeting + Lumen AI circle */}
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          {/* Greeting */}
          <div className="text-center mb-2">
            <p
              className="text-[11px] tracking-[0.35em] uppercase mb-3"
              style={{ color: "hsla(38, 15%, 80%, 0.45)", fontFamily: P.font }}
            >
              {greeting}
            </p>
            <h1
              className="text-[32px] font-light leading-[1.2] tracking-[0.01em]"
              style={{ fontFamily: P.fontDisplay, color: P.text }}
            >
              Welcome{name ? `,` : "."}<br />
              {name ? `${name}.` : ""}
            </h1>
          </div>

          {/* Vertical breath line */}
          <div
            className="w-px my-6"
            style={{
              height: "clamp(28px, 6vh, 56px)",
              background: "linear-gradient(to bottom, transparent, hsla(38, 20%, 65%, 0.25), transparent)",
              animation: "breathe-line 4s ease-in-out infinite",
            }}
          />

          {/* ── Lumen AI Circle — the portal ────────────────── */}
          <button
            onClick={handleLumenPress}
            className="relative flex items-center justify-center mb-4 active:scale-95 transition-transform duration-300"
            style={{ width: 72, height: 72 }}
            aria-label="Open Lumen AI"
          >
            {/* Outer breathing ring */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                border: "1px solid hsla(38, 25%, 65%, 0.15)",
                animation: "portal-breathe 4s ease-in-out infinite",
              }}
            />
            {/* Secondary ring — offset phase */}
            <div
              className="absolute rounded-full"
              style={{
                inset: -6,
                border: "1px solid hsla(38, 25%, 65%, 0.06)",
                animation: "portal-breathe 4s ease-in-out infinite 2s",
              }}
            />
            {/* Inner glow */}
            <div
              className="absolute rounded-full"
              style={{
                inset: 8,
                background: pressing
                  ? "radial-gradient(circle, hsla(38, 35%, 55%, 0.25), transparent 70%)"
                  : "radial-gradient(circle, hsla(38, 35%, 55%, 0.08), transparent 70%)",
                transition: "all 0.3s ease",
              }}
            />
            {/* Center dot */}
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: P.gold,
                opacity: pressing ? 1 : 0.7,
                boxShadow: pressing
                  ? `0 0 16px hsla(38, 40%, 55%, 0.5), 0 0 32px hsla(38, 40%, 55%, 0.2)`
                  : `0 0 8px hsla(38, 40%, 55%, 0.2)`,
                transition: "all 0.3s ease",
              }}
            />
          </button>

          {/* Label */}
          <p
            className="text-[14px] tracking-[0.4em] uppercase mb-2"
            style={{ color: "hsla(38, 20%, 75%, 0.5)", fontFamily: P.font }}
          >
            LUMEN AI
          </p>

          {/* Typewriter whisper */}
          <div className="h-5 flex items-center justify-center">
            <p
              className="text-[18px] font-light italic text-center"
              style={{
                fontFamily: P.fontDisplay,
                color: "hsla(38, 15%, 80%, 0.55)",
              }}
            >
              {typed.displayed}
              {typed.started && !typed.done && (
                <span style={{ opacity: 0.4, animation: "blink-caret 0.8s step-end infinite" }}>▎</span>
              )}
            </p>
          </div>
        </div>

        {/* Bottom: Drawer handle — swipe up for nav */}
        <div className="flex flex-col items-center pb-2" style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}>
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center gap-1 py-3 px-8 active:scale-95 transition-transform duration-200"
            aria-label="Open navigation"
          >
            <ChevronUp
              className="w-5 h-5"
              strokeWidth={1}
              style={{
                color: "hsla(38, 15%, 75%, 0.25)",
                animation: "gentle-float 3s ease-in-out infinite",
              }}
            />
          </button>
          {/* Home indicator */}
          <div
            className="w-24 h-[3px] rounded-full"
            style={{ background: "hsla(38, 12%, 60%, 0.12)" }}
          />
        </div>
      </div>

      {/* ── Navigation Drawer — slides up from bottom ──────── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            onClick={() => setDrawerOpen(false)}
            style={{
              background: "hsla(25, 8%, 5%, 0.6)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              animation: "fade-in-drawer 0.3s ease-out both",
            }}
          />
          {/* Drawer panel */}
          <div
            className="relative z-10 rounded-t-[28px] overflow-hidden"
            style={{
              background: "hsla(25, 10%, 12%, 0.95)",
              backdropFilter: "blur(40px)",
              WebkitBackdropFilter: "blur(40px)",
              border: "1px solid hsla(38, 12%, 25%, 0.15)",
              borderBottom: "none",
              animation: "slide-up-drawer 0.35s cubic-bezier(0.22, 1, 0.36, 1) both",
              paddingBottom: "env(safe-area-inset-bottom, 16px)",
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div
                className="w-10 h-1 rounded-full"
                style={{ background: "hsla(38, 12%, 60%, 0.2)" }}
              />
            </div>

            {/* Close */}
            <div className="flex justify-end px-5 pb-2">
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-full active:scale-90 transition-transform"
                style={{ color: P.textDim }}
              >
                <X className="w-5 h-5" strokeWidth={1.2} />
              </button>
            </div>

            {/* Nav items — spacious, touch-friendly */}
            <nav className="px-6 pb-6 space-y-1">
              {NAV_ITEMS.map((item, i) => (
                <button
                  key={item.label}
                  onClick={() => handleNav(item.action)}
                  className="w-full flex items-center gap-4 py-4 px-4 rounded-2xl active:scale-[0.98] transition-all duration-200"
                  style={{
                    color: P.text,
                    fontFamily: P.font,
                    animation: "stagger-fade-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
                    animationDelay: `${80 + i * 60}ms`,
                  }}
                  onTouchStart={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "hsla(38, 12%, 90%, 0.06)";
                  }}
                  onTouchEnd={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  <item.icon className="w-5 h-5" strokeWidth={1.3} style={{ color: P.goldMuted }} />
                  <span className="text-[16px] font-light tracking-wide">{item.label}</span>
                </button>
              ))}
            </nav>

            {/* Lumen AI shortcut at bottom of drawer */}
            <div className="px-6 pb-4">
              <button
                onClick={() => { setDrawerOpen(false); setChatOpen(true); heartbeatHaptic(); }}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl active:scale-[0.97] transition-all duration-200"
                style={{
                  background: "hsla(38, 20%, 30%, 0.12)",
                  border: "1px solid hsla(38, 20%, 45%, 0.1)",
                  color: P.gold,
                  fontFamily: P.font,
                }}
              >
                <Sparkles className="w-4 h-4" strokeWidth={1.5} />
                <span className="text-[15px] font-light tracking-wide">Open Lumen AI</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Overlays ──────────────────────────────────────────── */}
      <HologramClaimOverlay open={claimOpen} onClose={() => setClaimOpen(false)} />
      <HologramAiChat open={chatOpen} onClose={() => setChatOpen(false)} />

      {/* ── Injected styles ───────────────────────────────────── */}
      <style>{`
        @keyframes portal-breathe {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.6; }
        }
        @keyframes breathe-line {
          0%, 100% { opacity: 0.3; transform: scaleY(1); }
          50% { opacity: 0.6; transform: scaleY(1.15); }
        }
        @keyframes gentle-float {
          0%, 100% { transform: translateY(0); opacity: 0.25; }
          50% { transform: translateY(-3px); opacity: 0.45; }
        }
        @keyframes fade-in-drawer {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes slide-up-drawer {
          0% { transform: translateY(100%); }
          100% { transform: translateY(0); }
        }
        @keyframes stagger-fade-in {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink-caret {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
