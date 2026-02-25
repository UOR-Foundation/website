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

// ── Welcome Screen ──────────────────────────────────────────────────────────

export default function HologramOsPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [claimOpen, setClaimOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const { greeting, name } = useGreeting();

  const goConsole = useCallback(() => navigate("/hologram-console"), [navigate]);

  // ── Mobile: iOS homescreen ──
  if (isMobile) return <MobileOsShell />;

  // Personal welcome line
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
          {/* Background Image — slow Ken Burns for life */}
          <div className="absolute inset-0">
            <img
              src={heroLandscape}
              alt="Serene landscape with misty mountains and tranquil water"
              className="w-full h-full object-cover"
              style={{
                animation: "ken-burns 30s ease-in-out infinite alternate",
              }}
            />
            {/* Gradient: soft earth-toned veil — warmer than pure black */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, hsla(30, 8%, 12%, 0.15) 0%, hsla(30, 6%, 10%, 0.08) 35%, hsla(25, 10%, 8%, 0.55) 100%)",
              }}
            />
          </div>

          {/* ── Logo — top center, Aman-style wordmark ──────────── */}
          <div className="absolute top-0 left-0 right-0 z-10 flex justify-center pt-10 animate-fade-in">
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 400,
                fontSize: "15px",
                letterSpacing: "0.55em",
                textTransform: "uppercase" as const,
                color: "hsla(38, 15%, 88%, 0.85)",
              }}
            >
              Hologram
            </span>
          </div>

          {/* ── Welcome — centered, intimate, personal ─────────── */}
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-white px-8">
            <div className="text-center max-w-2xl space-y-8 animate-fade-in">
              {/* Time greeting — whisper-quiet, Aman-style label */}
              <p
                className="text-xs md:text-sm tracking-[0.45em] uppercase"
                style={{
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  color: "hsla(38, 20%, 85%, 0.5)",
                  fontWeight: 400,
                }}
              >
                {greeting}
              </p>

              {/* Personal welcome — large, light, serene serif */}
              <h1
                className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl leading-[1.1]"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 300,
                  color: "hsla(38, 15%, 92%, 0.92)",
                  letterSpacing: "-0.01em",
                }}
              >
                Welcome home,
                <br />
                {welcomeName}
              </h1>

              {/* Warm subtext — earth-toned, generous line height */}
              <p
                className="text-base md:text-lg leading-[1.8] max-w-md mx-auto"
                style={{
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  fontWeight: 300,
                  color: "hsla(38, 12%, 78%, 0.5)",
                }}
              >
                Everything is as you left it.
                <br />
                Take your time.
              </p>

              {/* Gentle CTA — Aman-style: thin border, generous padding, quiet text */}
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
                    color: "hsla(38, 15%, 82%, 0.6)",
                    border: "1px solid hsla(38, 15%, 70%, 0.2)",
                    padding: "16px 48px",
                    background: "transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "hsla(38, 15%, 70%, 0.08)";
                    e.currentTarget.style.color = "hsla(38, 15%, 90%, 0.85)";
                    e.currentTarget.style.borderColor = "hsla(38, 15%, 70%, 0.35)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "hsla(38, 15%, 82%, 0.6)";
                    e.currentTarget.style.borderColor = "hsla(38, 15%, 70%, 0.2)";
                  }}
                >
                  Begin
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* AI Chat Pill — bottom center, barely there */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={() => setChatOpen(true)}
            className="flex items-center gap-3 px-7 py-3 rounded-full transition-all duration-500 hover:scale-105 group"
            style={{
              background: "hsla(30, 8%, 10%, 0.5)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid hsla(38, 15%, 60%, 0.08)",
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full group-hover:scale-150 transition-transform duration-500"
              style={{ background: "hsl(38, 40%, 55%)" }}
            />
            <span
              className="text-[13px] tracking-[0.2em] font-light"
              style={{
                fontFamily: "'DM Sans', system-ui, sans-serif",
                color: "hsla(38, 12%, 78%, 0.45)",
              }}
            >
              Hologram Intelligence
            </span>
          </button>
        </div>

        {/* Day Progress Ring — bottom right */}
        <div className="absolute bottom-8 right-8 z-20 animate-fade-in">
          <DayProgressRing />
        </div>
      </div>

      {/* Overlays */}
      <HologramClaimOverlay open={claimOpen} onClose={() => setClaimOpen(false)} />
      <HologramAiChat open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
