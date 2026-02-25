/**
 * MobileOsShell — Hologram OS homescreen (mobile only)
 * ═════════════════════════════════════════════════════
 *
 * Aman-inspired: serene, noble, deeply personal.
 * Muted earth tones, generous spacing, whisper-quiet chrome.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Grid3X3,
  Compass,
  User,
  Settings,
  Sparkles,
  FileText,
  Globe,
  Shield,
  Search,
} from "lucide-react";
import HologramClaimOverlay from "./HologramClaimOverlay";
import HologramAiChat from "./HologramAiChat";
import { useGreeting } from "@/modules/hologram-ui/hooks/useGreeting";

/* ── App definition ─────────────────────────────────────────── */
interface AppIcon {
  label: string;
  icon: React.ElementType;
  action: string;
  color: string; // HSL values
}

// Earth-toned, muted palette — inspired by Aman's natural materials
const apps: AppIcon[] = [
  { label: "Console",     icon: Grid3X3,  action: "/hologram-console", color: "30 12% 22%" },
  { label: "Your Space",  icon: User,     action: "/your-space",       color: "25 18% 28%" },
  { label: "Apps",        icon: Compass,  action: "/console/apps",     color: "45 16% 26%" },
  { label: "Framework",   icon: FileText, action: "/standard",         color: "38 22% 30%" },
  { label: "Community",   icon: Globe,    action: "/research",         color: "20 14% 30%" },
  { label: "Identity",    icon: Shield,   action: "__claim",           color: "15 16% 28%" },
  { label: "Settings",    icon: Settings, action: "/settings",         color: "30 8% 26%" },
  { label: "Intelligence", icon: Sparkles, action: "__chat",            color: "38 25% 28%" },
];

const dockApps: AppIcon[] = [
  { label: "Console", icon: Grid3X3,  action: "/hologram-console", color: "30 12% 22%" },
  { label: "AI",      icon: Sparkles, action: "__chat",            color: "38 25% 28%" },
  { label: "Space",   icon: User,     action: "/your-space",       color: "25 18% 28%" },
  { label: "Search",  icon: Search,   action: "__search",          color: "30 8% 26%" },
];

/* ── Parallax hook (gyroscope + touch fallback) ────────────── */
function useParallax() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const touchRef = useRef({ active: false, startX: 0, startY: 0 });

  useEffect(() => {
    let hasGyro = false;
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      hasGyro = true;
      const x = Math.max(-1, Math.min(1, (e.gamma ?? 0) / 30)) * 8;
      const y = Math.max(-1, Math.min(1, ((e.beta ?? 0) - 45) / 30)) * 8;
      setOffset({ x, y });
    };

    window.addEventListener("deviceorientation", handleOrientation);

    const handleTouchMove = (e: TouchEvent) => {
      if (hasGyro) return;
      const touch = e.touches[0];
      if (!touch) return;
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const x = ((touch.clientX - cx) / cx) * 6;
      const y = ((touch.clientY - cy) / cy) * 6;
      setOffset({ x, y });
    };

    const handleTouchEnd = () => {
      if (hasGyro) return;
      setOffset({ x: 0, y: 0 });
    };

    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  return offset;
}

/* ── Component ──────────────────────────────────────────────── */
export default function MobileOsShell() {
  const navigate = useNavigate();
  const [claimOpen, setClaimOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const parallax = useParallax();
  const { greeting, name } = useGreeting();

  const handleApp = useCallback(
    (action: string) => {
      if (action === "__claim") return setClaimOpen(true);
      if (action === "__chat") return setChatOpen(true);
      if (action === "__search") return;
      navigate(action);
    },
    [navigate],
  );

  return (
    <div
      className="fixed inset-0 flex flex-col select-none"
      style={{
        touchAction: "none",
        overscrollBehavior: "none",
        // Warm earth gradient — stone, sand, deep walnut
        background:
          "linear-gradient(168deg, hsl(25 12% 12%) 0%, hsl(30 10% 9%) 40%, hsl(28 8% 7%) 70%, hsl(25 12% 5%) 100%)",
      }}
    >
      {/* Subtle warmth overlay — parallax-responsive */}
      <div
        className="absolute inset-0 z-0 pointer-events-none transition-transform duration-700 ease-out"
        style={{
          transform: `translate(${parallax.x}px, ${parallax.y}px)`,
          background:
            "radial-gradient(ellipse at 50% 25%, hsla(38, 30%, 50%, 0.06) 0%, transparent 60%)",
        }}
      />
      {/* Secondary cool accent — natural stone tone */}
      <div
        className="absolute inset-0 z-0 pointer-events-none transition-transform duration-1000 ease-out"
        style={{
          transform: `translate(${-parallax.x * 0.6}px, ${-parallax.y * 0.6}px)`,
          background:
            "radial-gradient(ellipse at 30% 70%, hsla(25, 15%, 35%, 0.04) 0%, transparent 50%)",
        }}
      />

      {/* ── Branding + Greeting — generous top spacing ─────────── */}
      <div className="relative z-10 flex flex-col items-center pt-16 pb-4 gap-2">
        <p
          className="text-[10px] tracking-[0.5em] uppercase"
          style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            color: "hsla(38, 15%, 70%, 0.3)",
            fontWeight: 400,
          }}
        >
          Hologram
        </p>
        <p
          className="text-lg font-light tracking-wide"
          style={{
            fontFamily: "'Playfair Display', serif",
            color: "hsla(38, 15%, 82%, 0.5)",
          }}
        >
          {greeting}{name ? `, ${name}` : ""}
        </p>
      </div>

      {/* ── App Grid — centered, generous spacing ────────────── */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-10">
        <div className="grid grid-cols-4 gap-x-7 gap-y-8 w-full max-w-xs">
          {apps.map((app) => (
            <button
              key={app.label}
              onClick={() => handleApp(app.action)}
              className="flex flex-col items-center gap-2 group"
            >
              <div
                className="w-14 h-14 rounded-[16px] flex items-center justify-center transition-transform duration-200 active:scale-90"
                style={{
                  background: `linear-gradient(150deg, hsl(${app.color} / 0.75), hsl(${app.color} / 0.95))`,
                  boxShadow: `0 2px 8px hsl(${app.color} / 0.15), inset 0 1px 0 hsla(38, 20%, 80%, 0.06)`,
                }}
              >
                <app.icon
                  className="w-[22px] h-[22px]"
                  strokeWidth={1.3}
                  style={{ color: "hsla(38, 15%, 85%, 0.7)" }}
                />
              </div>
              <span
                className="text-[10px] tracking-wide leading-tight"
                style={{
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  color: "hsla(38, 12%, 70%, 0.45)",
                }}
              >
                {app.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Search pill — barely there ────────────────────────── */}
      <div className="relative z-10 flex justify-center pb-4 px-10">
        <div
          className="w-full max-w-[260px] h-9 rounded-full flex items-center justify-center gap-2.5 cursor-pointer active:scale-95 transition-transform duration-150"
          style={{
            background: "hsla(38, 10%, 50%, 0.06)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid hsla(38, 15%, 60%, 0.06)",
          }}
        >
          <Search className="w-3.5 h-3.5" style={{ color: "hsla(38, 12%, 70%, 0.25)" }} />
          <span
            className="text-[11px] tracking-[0.15em]"
            style={{
              fontFamily: "'DM Sans', system-ui, sans-serif",
              color: "hsla(38, 12%, 70%, 0.25)",
            }}
          >
            Search
          </span>
        </div>
      </div>

      {/* ── Dock — warm earth glass ──────────────────────────── */}
      <nav
        className="relative z-10 mx-6 mb-2 rounded-[24px] flex items-center justify-around py-3 px-2"
        style={{
          background: "hsla(30, 10%, 20%, 0.35)",
          backdropFilter: "blur(30px)",
          WebkitBackdropFilter: "blur(30px)",
          border: "1px solid hsla(38, 15%, 60%, 0.06)",
        }}
      >
        {dockApps.map((app) => (
          <button
            key={app.label}
            onClick={() => handleApp(app.action)}
            className="flex flex-col items-center active:scale-90 transition-transform duration-150"
          >
            <div
              className="w-12 h-12 rounded-[14px] flex items-center justify-center"
              style={{
                background: `linear-gradient(150deg, hsl(${app.color} / 0.7), hsl(${app.color} / 0.9))`,
                boxShadow: `0 1px 6px hsl(${app.color} / 0.12), inset 0 1px 0 hsla(38, 20%, 80%, 0.05)`,
              }}
            >
              <app.icon
                className="w-5 h-5"
                strokeWidth={1.3}
                style={{ color: "hsla(38, 15%, 85%, 0.7)" }}
              />
            </div>
          </button>
        ))}
      </nav>

      {/* ── Home indicator ───────────────────────────────────── */}
      <div className="relative z-10 flex justify-center pb-2 pt-1">
        <div
          className="w-28 h-[3px] rounded-full"
          style={{ background: "hsla(38, 12%, 60%, 0.12)" }}
        />
      </div>

      {/* ── Overlays ─────────────────────────────────────────── */}
      <HologramClaimOverlay open={claimOpen} onClose={() => setClaimOpen(false)} />
      <HologramAiChat open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
