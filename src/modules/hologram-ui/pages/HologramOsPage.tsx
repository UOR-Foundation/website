/**
 * Hologram OS — Welcome Screen
 * ═════════════════════════════
 *
 * A fullscreen, serene welcome screen inspired by luxury resort aesthetics.
 * Hides all technical complexity behind a clean, human-centered interface.
 * The console is accessible via "Discover Now" → /hologram-console.
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Search } from "lucide-react";
import heroLandscape from "@/assets/hologram-hero-landscape.jpg";
import HologramClaimOverlay from "@/modules/hologram-ui/components/HologramClaimOverlay";

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
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ── Welcome Screen ──────────────────────────────────────────────────────────

export default function HologramOsPage() {
  const navigate = useNavigate();
  const now = useLiveClock();
  const [menuOpen, setMenuOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);

  const goConsole = useCallback(() => navigate("/hologram-console"), [navigate]);

  return (
    <div className="h-screen overflow-hidden bg-background">
      {/* ── Top Navigation Bar ─────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-10 h-16 bg-transparent">
        {/* Left: Menu + Search */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 text-white/90 hover:text-white transition-colors"
          >
            <Menu className="w-5 h-5" />
            <span className="text-sm font-light tracking-wide hidden sm:inline">Menu</span>
          </button>
          <button className="text-white/80 hover:text-white transition-colors">
            <Search className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Brand */}
        <button
          onClick={() => navigate("/")}
          className="absolute left-1/2 transform -translate-x-1/2 text-white text-lg sm:text-xl font-light tracking-[0.35em] hover:opacity-80 transition-opacity"
        >
          HOLOGRAM
        </button>

        {/* Right: Language + CTA */}
        <div className="flex items-center gap-4">
          <span className="text-white/80 text-sm font-light tracking-wide hidden sm:inline border-b border-white/30 pb-0.5 cursor-pointer hover:text-white hover:border-white transition-all">
            English
          </span>
          <button
onClick={() => setClaimOpen(true)}
            className="bg-foreground text-background px-5 py-2 text-sm font-light tracking-wide hover:opacity-90 transition-opacity"
          >
            Claim Your ID
          </button>
        </div>
      </header>

      {/* ── Menu Overlay ───────────────────────────────────────────────── */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setMenuOpen(false)}
        >
          <nav className="text-center space-y-6" onClick={(e) => e.stopPropagation()}>
            {[
              { label: "Console", path: "/hologram-console" },
              { label: "Your Space", path: "/your-space" },
              { label: "Applications", path: "/console/apps" },
              { label: "UOR Framework", path: "/standard" },
              { label: "Community", path: "/research" },
            ].map((item) => (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setMenuOpen(false); }}
                className="block w-full text-white text-2xl md:text-3xl font-light tracking-wider hover:opacity-70 transition-opacity"
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* ── Hero Section ───────────────────────────────────────────────── */}
      <main>
        <section className="relative h-screen overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0">
            <img
              src={heroLandscape}
              alt="Serene landscape with misty mountains and tranquil water"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
          </div>

          {/* Hero Content — bottom left */}
          <div className="absolute bottom-20 left-8 right-8 text-white">
            <div className="max-w-2xl">
              <p className="text-sm font-light tracking-[0.2em] uppercase mb-4 opacity-90">
                Experiences &amp; Applications
              </p>
              <h2
                className="text-4xl md:text-5xl font-light leading-tight mb-6 text-white"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Explore the universe of
                <br />
                Hologram Apps
              </h2>
              <button
                onClick={goConsole}
                className="inline-flex items-center justify-center border border-white text-white bg-transparent px-8 py-3 text-sm font-light tracking-wide hover:bg-white hover:text-black transition-all duration-500"
              >
                Discover Now
              </button>
            </div>
          </div>

          {/* Bottom Left — Playback indicator */}
          <div className="absolute bottom-8 left-8 flex items-center gap-4 text-white">
            <button className="hover:bg-white/10 rounded w-10 h-10 flex items-center justify-center transition-colors">
              <div className="w-3 h-3 bg-white" />
            </button>
            <div className="text-sm font-light tracking-wide opacity-80">00:31</div>
            <div className="flex gap-2">
              <div className="w-1 h-1 bg-white rounded-full" />
              <div className="w-1 h-1 bg-white/50 rounded-full" />
              <div className="w-1 h-1 bg-white/50 rounded-full" />
            </div>
          </div>

          {/* Bottom Right — Clock + Date */}
          <div className="absolute bottom-8 right-8 text-white text-right">
            <div className="text-lg font-light tracking-wide">{formatTime(now)}</div>
            <div className="text-sm font-light tracking-wide opacity-80">{formatDate(now)}</div>
          </div>
        </section>
      </main>

      {/* ── Lumen Voice Assistant Pill ─────────────────────────────────── */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
        <button className="bg-black/70 border border-white/20 rounded-full px-5 py-2.5 backdrop-blur-sm hover:bg-black/80 transition-all duration-300 shadow-lg hover:shadow-xl group">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full group-hover:bg-white" />
            <span className="text-white text-sm font-mono tracking-wide">Lumen Voice Assistant</span>
          </div>
        </button>
      </div>

      {/* ── Claim Your ID Overlay ──────────────────────────────────────── */}
      <HologramClaimOverlay open={claimOpen} onClose={() => setClaimOpen(false)} />
    </div>
  );
}
