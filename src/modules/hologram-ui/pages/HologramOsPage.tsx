/**
 * Hologram OS — Welcome Screen
 * ═════════════════════════════
 *
 * Desktop: Sidebar + full-bleed sanctuary hero (Aman-inspired).
 * Mobile: iOS-style homescreen shell.
 *
 * Design language: extreme restraint, muted earth tones,
 * generous whitespace, ultra-light serif, barely-there chrome.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import heroLandscape from "@/assets/hologram-hero-landscape.jpg";
import HologramClaimOverlay from "@/modules/hologram-ui/components/HologramClaimOverlay";
import HologramAiChat from "@/modules/hologram-ui/components/HologramAiChat";
import MobileOsShell from "@/modules/hologram-ui/components/MobileOsShell";
import DesktopOsSidebar from "@/modules/hologram-ui/components/DesktopOsSidebar";
import { useGreeting } from "@/modules/hologram-ui/hooks/useGreeting";
import DayProgressRing from "@/modules/hologram-ui/components/DayProgressRing";
import { useTriadicActivity } from "@/modules/hologram-ui/hooks/useTriadicActivity";

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

// ── Background Modes ────────────────────────────────────────────────────────

type BgMode = "image" | "white" | "dark";

const BG_MODES: { mode: BgMode; dot: string; dotActive: string; label: string }[] = [
  { mode: "image", dot: "hsla(38, 25%, 65%, 0.35)", dotActive: "hsl(38, 40%, 60%)", label: "Landscape" },
  { mode: "white", dot: "hsla(0, 0%, 80%, 0.5)", dotActive: "hsl(0, 0%, 95%)", label: "Light" },
  { mode: "dark",  dot: "hsla(0, 0%, 30%, 0.5)", dotActive: "hsl(30, 6%, 12%)", label: "Dark" },
];

/** Palette per mode — all text/chrome adapts */
function palette(m: BgMode) {
  if (m === "white") return {
    wordmark: "hsla(30, 8%, 18%, 0.9)",
    greeting: "hsla(30, 8%, 40%, 0.6)",
    heading:  "hsla(30, 10%, 15%, 0.9)",
    sub:      "hsla(30, 6%, 35%, 0.55)",
    cta:      "hsla(30, 8%, 28%, 0.6)",
    ctaBorder:"hsla(30, 8%, 40%, 0.2)",
    ctaHoverBg: "hsla(30, 8%, 40%, 0.06)",
    ctaHoverText: "hsla(30, 10%, 12%, 0.85)",
    ctaHoverBorder: "hsla(30, 8%, 40%, 0.35)",
    pill:     "hsla(30, 8%, 90%, 0.7)",
    pillBorder: "hsla(30, 8%, 60%, 0.12)",
    pillText: "hsla(30, 8%, 30%, 0.5)",
    dotPulse: "hsl(38, 40%, 45%)",
    bg:       "hsl(0, 0%, 98%)",
  };
  if (m === "dark") return {
    wordmark: "hsla(38, 15%, 88%, 0.9)",
    greeting: "hsla(38, 15%, 70%, 0.45)",
    heading:  "hsla(38, 12%, 90%, 0.9)",
    sub:      "hsla(38, 10%, 70%, 0.45)",
    cta:      "hsla(38, 12%, 75%, 0.55)",
    ctaBorder:"hsla(38, 12%, 50%, 0.18)",
    ctaHoverBg: "hsla(38, 12%, 50%, 0.08)",
    ctaHoverText: "hsla(38, 15%, 90%, 0.85)",
    ctaHoverBorder: "hsla(38, 12%, 50%, 0.3)",
    pill:     "hsla(30, 8%, 8%, 0.6)",
    pillBorder: "hsla(38, 12%, 40%, 0.1)",
    pillText: "hsla(38, 10%, 72%, 0.4)",
    dotPulse: "hsl(38, 40%, 55%)",
    bg:       "hsl(30, 6%, 7%)",
  };
  // image mode
  return {
    wordmark: "hsla(38, 15%, 92%, 0.92)",
    greeting: "hsla(38, 20%, 85%, 0.5)",
    heading:  "hsla(38, 15%, 92%, 0.92)",
    sub:      "hsla(38, 12%, 78%, 0.5)",
    cta:      "hsla(38, 15%, 82%, 0.6)",
    ctaBorder:"hsla(38, 15%, 70%, 0.2)",
    ctaHoverBg: "hsla(38, 15%, 70%, 0.08)",
    ctaHoverText: "hsla(38, 15%, 90%, 0.85)",
    ctaHoverBorder: "hsla(38, 15%, 70%, 0.35)",
    pill:     "hsla(30, 8%, 10%, 0.5)",
    pillBorder: "hsla(38, 15%, 60%, 0.08)",
    pillText: "hsla(38, 12%, 78%, 0.45)",
    dotPulse: "hsl(38, 40%, 55%)",
    bg:       "transparent",
  };
}

// ── Welcome Screen ──────────────────────────────────────────────────────────

export default function HologramOsPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [claimOpen, setClaimOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
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

  const goConsole = useCallback(() => {
    setDeparting(true);
    setTimeout(() => navigate("/hologram-console"), 900);
  }, [navigate]);
  const P = palette(bgMode);

  // ── Mobile: iOS homescreen ──
  if (isMobile) return <MobileOsShell />;

  const welcomeName = name || "traveller";

  // ── Desktop: sidebar + sanctuary hero ──
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <DesktopOsSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((p) => !p)}
        onNewChat={() => setChatOpen(true)}
        onOpenChat={() => setChatOpen(true)}
      />

      {/* Main content area */}
      <div
        className="flex-1 flex flex-col overflow-hidden relative transition-all ease-in-out"
        style={{
          opacity: departing ? 0 : 1,
          transform: departing ? "scale(1.02)" : "scale(1)",
          filter: departing ? "blur(4px)" : "blur(0px)",
          transitionDuration: "900ms",
        }}
      >
        <main className="flex-1 relative">
          {/* Solid background for white/dark modes */}
          <div
            className="absolute inset-0 transition-all duration-1000 ease-in-out"
            style={{ background: P.bg, opacity: bgMode === "image" ? 0 : 1, zIndex: 1 }}
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
                animation: "ken-burns 30s ease-in-out infinite alternate",
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

          {/* ── Background Mode Toggle — top right, minimal pill ────── */}
          <div className="absolute top-10 right-10 z-20 animate-fade-in">
            <div
              className="flex items-center gap-1 px-3 py-2 rounded-full transition-all duration-700"
              style={{
                background: bgMode === "white" ? "hsla(30, 8%, 40%, 0.06)" : "hsla(30, 8%, 90%, 0.06)",
                border: `1px solid ${bgMode === "white" ? "hsla(30, 8%, 40%, 0.1)" : "hsla(38, 15%, 70%, 0.08)"}`,
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
              }}
            >
              {BG_MODES.map(({ mode, label }) => {
                const isActive = bgMode === mode;
                const dotColor = isActive
                  ? (bgMode === "white" ? "hsla(30, 10%, 25%, 0.7)" : "hsla(38, 35%, 75%, 0.85)")
                  : (bgMode === "white" ? "hsla(30, 8%, 50%, 0.25)" : "hsla(38, 15%, 70%, 0.2)");
                return (
                  <button
                    key={mode}
                    onClick={() => setBgMode(mode)}
                    className="relative group flex items-center justify-center w-7 h-7 rounded-full transition-all duration-500"
                    aria-label={`Switch to ${label} background`}
                  >
                    <div
                      className="w-[6px] h-[6px] rounded-full transition-all duration-700 ease-in-out"
                      style={{
                        background: dotColor,
                        transform: isActive ? "scale(1.3)" : "scale(1)",
                        boxShadow: isActive ? `0 0 10px 1px ${dotColor}` : "none",
                      }}
                    />
                    {/* Tooltip on hover */}
                    <div
                      className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none whitespace-nowrap"
                      style={{
                        fontFamily: "'DM Sans', system-ui, sans-serif",
                        fontSize: "9px",
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        color: bgMode === "white" ? "hsla(30, 8%, 35%, 0.5)" : "hsla(38, 15%, 80%, 0.45)",
                        background: bgMode === "white" ? "hsla(30, 8%, 95%, 0.8)" : "hsla(30, 8%, 10%, 0.7)",
                        backdropFilter: "blur(12px)",
                        WebkitBackdropFilter: "blur(12px)",
                        padding: "3px 8px",
                        borderRadius: "4px",
                        border: `1px solid ${bgMode === "white" ? "hsla(30, 8%, 60%, 0.1)" : "hsla(38, 15%, 60%, 0.08)"}`,
                      }}
                    >
                      {label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Logo — top center ──────────── */}
          <div className="absolute top-0 left-0 right-0 z-10 flex justify-center pt-10 animate-fade-in">
            <span
              className="transition-colors duration-700"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 400,
                fontSize: "22px",
                letterSpacing: "0.45em",
                textTransform: "uppercase" as const,
                color: P.wordmark,
              }}
            >
              Hologram
            </span>
          </div>

          {/* ── Welcome — centered ─────────── */}
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-8">
            <div className="text-center max-w-2xl space-y-6 animate-fade-in">
              <p
                className="text-xs md:text-sm tracking-[0.45em] uppercase transition-colors duration-700"
                style={{
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  color: P.greeting,
                  fontWeight: 400,
                }}
              >
                {greeting}
              </p>

              <h1
                className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl leading-[1.1] transition-colors duration-700"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 300,
                  color: P.heading,
                  letterSpacing: "-0.01em",
                }}
              >
                Welcome home,
                <br />
                {welcomeName}
              </h1>

              {/* Hedosophia-inspired vertical line divider */}
              <div className="flex justify-center pt-4 pb-2">
                <div
                  className="w-px overflow-hidden"
                  style={{ height: "64px" }}
                >
                  <div
                    className="w-full"
                    style={{
                      height: "100%",
                      background: `linear-gradient(to bottom, transparent 0%, ${
                        bgMode === "white" ? "hsla(30, 8%, 30%, 0.2)" : "hsla(38, 20%, 80%, 0.2)"
                      } 40%, ${
                        bgMode === "white" ? "hsla(30, 8%, 30%, 0.2)" : "hsla(38, 20%, 80%, 0.2)"
                      } 60%, transparent 100%)`,
                      animation: "line-reveal 2.5s ease-out forwards",
                    }}
                  />
                </div>
              </div>

              <div>
                <button
                  onClick={goConsole}
                  className="inline-flex items-center transition-all duration-700"
                  style={{
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    fontWeight: 300,
                    fontSize: "13px",
                    letterSpacing: "0.3em",
                    textTransform: "uppercase" as const,
                    color: P.cta,
                    border: `1px solid ${P.ctaBorder}`,
                    padding: "16px 48px",
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
        </main>

        {/* AI Chat Pill */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={() => setChatOpen(true)}
            className="flex items-center gap-3 px-7 py-3 rounded-full transition-all duration-700 hover:scale-105 group"
            style={{
              background: P.pill,
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: `1px solid ${P.pillBorder}`,
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full group-hover:scale-150 transition-transform duration-500"
              style={{
                background: P.dotPulse,
                animation: "heartbeat-love 1.6s ease-in-out infinite",
              }}
            />
            <span
              className="text-[13px] tracking-[0.2em] font-light transition-colors duration-700"
              style={{
                fontFamily: "'DM Sans', system-ui, sans-serif",
                color: P.pillText,
              }}
            >
              Hologram Intelligence
            </span>
          </button>
        </div>

        {/* Heartbeat keyframe */}
        <style>{`
          @keyframes heartbeat-love {
            0%   { transform: scale(1);    opacity: 0.8; }
            10%  { transform: scale(1.45); opacity: 1; }
            22%  { transform: scale(1);    opacity: 0.8; }
            32%  { transform: scale(1.25); opacity: 0.95; }
            44%  { transform: scale(1);    opacity: 0.8; }
            100% { transform: scale(1);    opacity: 0.8; }
          }
          @keyframes line-reveal {
            0%   { opacity: 0; transform: scaleY(0); transform-origin: top; }
            40%  { opacity: 1; transform: scaleY(1); transform-origin: top; }
            100% { opacity: 1; transform: scaleY(1); }
          }
        `}</style>

        {/* Day Progress Ring */}
        <div className="absolute bottom-8 right-8 z-20 animate-fade-in">
          <DayProgressRing balance={triadicActivity.balance ?? undefined} />
        </div>
      </div>

      {/* Overlays */}
      <HologramClaimOverlay open={claimOpen} onClose={() => setClaimOpen(false)} />
      <HologramAiChat open={chatOpen} onClose={() => setChatOpen(false)} onPhaseChange={triadicActivity.setActivePhase} creatorStage={triadicActivity.creatorStage} />
    </div>
  );
}
