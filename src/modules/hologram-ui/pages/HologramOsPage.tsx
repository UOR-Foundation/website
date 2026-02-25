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

import { useState, useEffect, useCallback } from "react";
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
    wordmark: "hsla(30, 8%, 22%, 0.8)",
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
    wordmark: "hsla(38, 15%, 82%, 0.75)",
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
    wordmark: "hsla(38, 15%, 88%, 0.85)",
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
  const [bgMode, setBgMode] = useState<BgMode>("image");
  const { greeting, name } = useGreeting();
  const triadicActivity = useTriadicActivity();

  const goConsole = useCallback(() => navigate("/hologram-console"), [navigate]);
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
      <div className="flex-1 flex flex-col overflow-hidden relative">
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

          {/* ── Background Mode Toggle — top right, 3 dots ────── */}
          <div className="absolute top-10 right-10 z-20 flex items-center gap-2.5 animate-fade-in">
            {BG_MODES.map(({ mode, dot, dotActive }) => {
              const isActive = bgMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setBgMode(mode)}
                  className="relative group p-1.5 rounded-full transition-all duration-500"
                  aria-label={`Switch to ${mode} background`}
                  style={{ background: "transparent" }}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full transition-all duration-700 ease-in-out"
                    style={{
                      background: isActive ? dotActive : dot,
                      transform: isActive ? "scale(1.35)" : "scale(1)",
                      boxShadow: isActive
                        ? `0 0 12px 2px ${dotActive}40`
                        : "none",
                    }}
                  />
                  {/* Gentle ring on hover */}
                  <div
                    className="absolute inset-0 rounded-full transition-all duration-500 opacity-0 group-hover:opacity-100"
                    style={{
                      border: `1px solid ${dot}`,
                      transform: "scale(1.6)",
                    }}
                  />
                </button>
              );
            })}
          </div>

          {/* ── Logo — top center ──────────── */}
          <div className="absolute top-0 left-0 right-0 z-10 flex justify-center pt-10 animate-fade-in">
            <span
              className="transition-colors duration-700"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 400,
                fontSize: "15px",
                letterSpacing: "0.55em",
                textTransform: "uppercase" as const,
                color: P.wordmark,
              }}
            >
              Hologram
            </span>
          </div>

          {/* ── Welcome — centered ─────────── */}
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-8">
            <div className="text-center max-w-2xl space-y-8 animate-fade-in">
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

              <p
                className="text-base md:text-lg leading-[1.8] max-w-md mx-auto transition-colors duration-700"
                style={{
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  fontWeight: 300,
                  color: P.sub,
                }}
              >
                Everything is as you left it.
                <br />
                Take your time.
              </p>

              <div className="pt-8">
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
                  Begin
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
