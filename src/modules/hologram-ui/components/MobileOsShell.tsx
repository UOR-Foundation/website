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
  Sparkles, ChevronUp, X, Download,
} from "lucide-react";
import MySpacePanel from "./MySpacePanel";
import HologramAiChat from "./HologramAiChat";
import PwaInstallBanner from "./PwaInstallBanner";
import { useGreeting } from "@/modules/hologram-ui/hooks/useGreeting";
import { usePwaInstall } from "@/modules/hologram-ui/hooks/usePwaInstall";
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

/* ── Parallax via direct DOM mutation (bypasses React, no re-renders) ── */
function useParallax(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let rafId = 0;
    let lastX = 0, lastY = 0;

    const handle = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      const x = Math.max(-1, Math.min(1, (e.gamma ?? 0) / 30)) * 6;
      const y = Math.max(-1, Math.min(1, ((e.beta ?? 0) - 45) / 30)) * 6;
      // Skip if unchanged (within 0.5px)
      if (Math.abs(x - lastX) < 0.5 && Math.abs(y - lastY) < 0.5) return;
      lastX = x; lastY = y;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        el.style.transform = `translate(${x}px, ${y}px) scale(1.05)`;
      });
    };
    window.addEventListener("deviceorientation", handle);
    return () => {
      window.removeEventListener("deviceorientation", handle);
      cancelAnimationFrame(rafId);
    };
  }, [ref]);
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
  { label: "My Space",   icon: Shield,   action: "__myspace" },
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
  const parallaxRef = useRef<HTMLDivElement | null>(null);
  useParallax(parallaxRef);
  const { greeting, name } = useGreeting();
  const pwa = usePwaInstall();

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
      if (action === "__claim" || action === "__myspace") return setClaimOpen(true);
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
      {/* ── Layer 0: Background — living landscape (parallax via ref, zero React renders) ── */}
      <div
        ref={parallaxRef}
        className="absolute inset-0"
        style={{ transform: "translate(0px, 0px) scale(1.05)", willChange: "transform", transition: "transform 1.5s ease-out" }}
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
        <div className="flex items-center justify-center pt-[env(safe-area-inset-top,16px)] mt-8">
          <p
            className="text-[9px] tracking-[0.6em] uppercase"
            style={{ color: "hsla(38, 15%, 85%, 0.35)", fontFamily: P.font }}
          >
            Hologram
          </p>
        </div>

        {/* Center: Greeting + LUMEN AI circle */}
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          {/* Greeting */}
          <div className="text-center mb-2">
            <p
              className="text-[13px] tracking-[0.35em] uppercase mb-3"
              style={{ color: "hsla(38, 15%, 80%, 0.45)", fontFamily: P.font }}
            >
              {greeting}
            </p>
            <h1
              className="text-[36px] font-light leading-[1.2] tracking-[0.01em]"
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
              height: "clamp(40px, 8vh, 72px)",
              background: "linear-gradient(to bottom, transparent, hsla(38, 20%, 65%, 0.25), transparent)",
              animation: "breathe-line 4s ease-in-out infinite, line-extend 1.8s cubic-bezier(0.22, 1, 0.36, 1) 0.6s both",
              transformOrigin: "top",
            }}
          />

          {/* ── LUMEN AI Circle — the portal ────────────────── */}
          <button
            onClick={handleLumenPress}
            className="relative flex items-center justify-center mb-4 active:scale-95 transition-transform duration-300"
            style={{
              width: 72,
              height: 72,
              animation: "portal-emanate 0.8s cubic-bezier(0.22, 1, 0.36, 1) 2.4s both",
            }}
            aria-label="Open LUMEN AI"
          >
            {/* Outer breathing ring */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                border: "1px solid hsla(38, 25%, 65%, 0.15)",
                animation: "portal-breathe 4s ease-in-out infinite 3.2s",
              }}
            />
            {/* Secondary ring — offset phase */}
            <div
              className="absolute rounded-full"
              style={{
                inset: -6,
                border: "1px solid hsla(38, 25%, 65%, 0.06)",
                animation: "portal-breathe 4s ease-in-out infinite 5.2s",
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
              className="text-[20px] font-light italic text-center"
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
                  className="mobile-drawer-btn w-full flex items-center gap-4 py-4 px-4 rounded-2xl active:scale-[0.98] active:bg-[hsla(38,12%,90%,0.06)] transition-all duration-200"
                  style={{
                    color: P.text,
                    fontFamily: P.font,
                    touchAction: "manipulation",
                    WebkitTapHighlightColor: "transparent",
                    animation: "stagger-fade-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
                    animationDelay: `${80 + i * 60}ms`,
                  }}
                >
                  <item.icon className="w-5 h-5" strokeWidth={1.3} style={{ color: P.goldMuted }} />
                  <span className="text-[16px] font-light tracking-wide">{item.label}</span>
                </button>
              ))}
            </nav>

            {/* LUMEN AI shortcut at bottom of drawer */}
            <div className="px-6 pb-4 space-y-2">
              {/* Install Hologram — only if installable */}
              {pwa.canInstall && !pwa.isStandalone && (
                <button
                  onClick={() => { setDrawerOpen(false); pwa.install(); }}
                  className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl active:scale-[0.97] transition-all duration-200"
                  style={{
                    background: "hsla(38, 25%, 40%, 0.1)",
                    border: "1px solid hsla(38, 20%, 45%, 0.08)",
                    color: P.goldMuted,
                    fontFamily: P.font,
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
                  background: "hsla(38, 20%, 30%, 0.12)",
                  border: "1px solid hsla(38, 20%, 45%, 0.1)",
                  color: P.gold,
                  fontFamily: P.font,
                }}
              >
                <Sparkles className="w-4 h-4" strokeWidth={1.5} />
                <span className="text-[15px] font-light tracking-wide">Open LUMEN AI</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Overlays ──────────────────────────────────────────── */}
      {claimOpen && (
        <div className="fixed inset-0 z-50" style={{ background: "hsl(25 10% 8%)" }}>
          <MySpacePanel onClose={() => setClaimOpen(false)} />
        </div>
      )}
      <HologramAiChat open={chatOpen} onClose={() => setChatOpen(false)} />

      {/* ── PWA Install Banner ────────────────────────────────── */}
      <PwaInstallBanner pwa={pwa} />

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
        @keyframes line-extend {
          0% { clip-path: inset(0 0 100% 0); opacity: 0; }
          100% { clip-path: inset(0 0 0% 0); opacity: 1; }
        }
        @keyframes portal-emanate {
          0% { transform: scale(0); opacity: 0; }
          40% { transform: scale(0.15); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
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
