/**
 * Hologram OS — Welcome Screen
 * ═════════════════════════════
 *
 * Desktop: Claude-style sidebar + serene sanctuary hero (Aman-inspired).
 * Mobile: iOS-style homescreen shell.
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import heroLandscape from "@/assets/hologram-hero-landscape.jpg";
import HologramClaimOverlay from "@/modules/hologram-ui/components/HologramClaimOverlay";
import HologramAiChat from "@/modules/hologram-ui/components/HologramAiChat";
import MobileOsShell from "@/modules/hologram-ui/components/MobileOsShell";
import DesktopOsSidebar from "@/modules/hologram-ui/components/DesktopOsSidebar";
import { useGreeting } from "@/modules/hologram-ui/hooks/useGreeting";

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
          {/* Background Image */}
          <div className="absolute inset-0">
            <img
              src={heroLandscape}
              alt="Serene landscape with misty mountains and tranquil water"
              className="w-full h-full object-cover"
              style={{
                animation: "ken-burns 30s ease-in-out infinite alternate",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/5 to-black/45" />
          </div>

          {/* ── Welcome — centered, intimate, personal ─────────── */}
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-white px-8">
            <div className="text-center max-w-lg space-y-5 animate-fade-in">
              {/* Greeting */}
              <p
                className="text-sm md:text-base tracking-[0.35em] uppercase text-white/50 font-medium"
                style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
              >
                {greeting}
              </p>

              {/* Personal welcome */}
              <h1
                className="text-5xl md:text-6xl lg:text-7xl font-light leading-[1.15] text-white/95"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Welcome home,
                <br />
                {welcomeName}
              </h1>

              {/* Warm subtext */}
              <p
                className="text-[14px] leading-relaxed text-white/50 max-w-sm mx-auto font-light"
                style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
              >
                Everything is as you left it.
                <br />
                Take your time.
              </p>

              {/* Gentle CTA */}
              <div className="pt-4">
                <button
                  onClick={goConsole}
                  className="inline-flex items-center border border-white/25 text-white/60 bg-transparent px-7 py-2.5 text-[12px] tracking-[0.2em] uppercase hover:bg-white/10 hover:text-white/90 hover:border-white/40 transition-all duration-700"
                  style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
                >
                  Begin
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* AI Chat Pill — bottom center */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={() => setChatOpen(true)}
            className="flex items-center gap-3 px-7 py-3 rounded-full transition-all duration-300 hover:scale-105 group"
            style={{
              background: "hsla(0, 0%, 0%, 0.45)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid hsla(0, 0%, 100%, 0.08)",
            }}
          >
            <div
              className="w-2 h-2 rounded-full group-hover:scale-125 transition-transform"
              style={{ background: "hsl(38, 50%, 55%)" }}
            />
            <span
              className="text-white/55 text-[13px] tracking-[0.15em] font-light"
              style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
            >
              Hologram AI
            </span>
          </button>
        </div>
      </div>

      {/* Overlays */}
      <HologramClaimOverlay open={claimOpen} onClose={() => setClaimOpen(false)} />
      <HologramAiChat open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
