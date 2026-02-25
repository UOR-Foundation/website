/**
 * Hologram OS — Welcome Screen
 * ═════════════════════════════
 *
 * Desktop: Claude-style sidebar + serene hero (Aman-inspired).
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

// ── Live Clock ──────────────────────────────────────────────────────────────
function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// ── Welcome Screen ──────────────────────────────────────────────────────────

export default function HologramOsPage() {
  const navigate = useNavigate();
  const now = useLiveClock();
  const isMobile = useIsMobile();
  const [claimOpen, setClaimOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { greeting, name } = useGreeting();

  const goConsole = useCallback(() => navigate("/hologram-console"), [navigate]);

  // ── Mobile: iOS homescreen ──
  if (isMobile) return <MobileOsShell />;

  // ── Desktop: sidebar + hero ──
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
        {/* Hero Section — full bleed */}
        <main className="flex-1 relative">
          {/* Background Image */}
          <div className="absolute inset-0">
            <img
              src={heroLandscape}
              alt="Serene landscape with misty mountains and tranquil water"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/50" />
          </div>

          {/* Top bar — minimal, floating */}
          <header className="relative z-10 flex items-center justify-between px-8 pt-6">
            <div />
            <div className="flex items-center gap-4">
              <button
                onClick={() => setClaimOpen(true)}
                className="text-white/70 text-[13px] tracking-wider hover:text-white transition-colors"
                style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
              >
                Claim Your ID
              </button>
            </div>
          </header>

          {/* Hero Content — bottom left, Aman-style editorial */}
          <div className="absolute bottom-16 left-10 right-10 z-10 text-white">
            <div className="max-w-xl">
              <p
                className="text-[11px] tracking-[0.3em] uppercase mb-4 text-white/50"
                style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
              >
                {greeting}{name ? `, ${name}` : ""}
              </p>
              <h2
                className="text-4xl lg:text-5xl font-light leading-[1.15] mb-6 text-white/95"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Explore the universe of
                <br />
                Hologram Apps
              </h2>
              <button
                onClick={goConsole}
                className="inline-flex items-center border border-white/40 text-white/80 bg-transparent px-7 py-2.5 text-[13px] tracking-wider hover:bg-white hover:text-black transition-all duration-500"
                style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
              >
                Discover Now
              </button>
            </div>
          </div>

          {/* Bottom bar — clock + status */}
          <div className="absolute bottom-6 left-10 right-10 z-10 flex items-end justify-between text-white">
            {/* Left: playback dots */}
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-1 h-1 bg-white/80 rounded-full" />
                <div className="w-1 h-1 bg-white/30 rounded-full" />
                <div className="w-1 h-1 bg-white/30 rounded-full" />
              </div>
            </div>

            {/* Right: clock */}
            <div className="text-right">
              <div
                className="text-lg font-light tracking-wider text-white/70"
                style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
              >
                {formatTime(now)}
              </div>
              <div
                className="text-[11px] tracking-wider text-white/40"
                style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
              >
                {formatDate(now)}
              </div>
            </div>
          </div>
        </main>

        {/* AI Chat Pill — bottom center */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={() => setChatOpen(true)}
            className="flex items-center gap-2 px-5 py-2 rounded-full transition-all duration-300 hover:scale-105 group"
            style={{
              background: "hsla(0, 0%, 0%, 0.55)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid hsla(0, 0%, 100%, 0.1)",
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full group-hover:scale-125 transition-transform"
              style={{ background: "hsl(38, 50%, 55%)" }}
            />
            <span
              className="text-white/70 text-[12px] tracking-wider"
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
