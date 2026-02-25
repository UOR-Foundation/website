/**
 * MobileOsShell — Hologram OS homescreen (mobile only)
 * ═════════════════════════════════════════════════════
 *
 * Aman-inspired: serene, noble, deeply personal.
 * No status bar (the phone provides that). Discreet branding.
 * Maximum breathing room, balanced composition, inviting warmth.
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
  color: string;
}

const apps: AppIcon[] = [
  { label: "Console",     icon: Grid3X3,  action: "/hologram-console", color: "220 16% 18%" },
  { label: "Your Space",  icon: User,     action: "/your-space",       color: "200 20% 32%" },
  { label: "Apps",        icon: Compass,  action: "/console/apps",     color: "160 22% 34%" },
  { label: "Framework",   icon: FileText, action: "/standard",         color: "38 35% 38%" },
  { label: "Community",   icon: Globe,    action: "/research",         color: "250 18% 36%" },
  { label: "Identity",    icon: Shield,   action: "__claim",           color: "340 20% 34%" },
  { label: "Settings",    icon: Settings, action: "/settings",         color: "210 8% 34%" },
  { label: "Hologram AI", icon: Sparkles, action: "__chat",            color: "38 30% 30%" },
];

const dockApps: AppIcon[] = [
  { label: "Console", icon: Grid3X3,  action: "/hologram-console", color: "220 16% 18%" },
  { label: "AI",      icon: Sparkles, action: "__chat",            color: "38 30% 30%" },
  { label: "Space",   icon: User,     action: "/your-space",       color: "200 20% 32%" },
  { label: "Search",  icon: Search,   action: "__search",          color: "210 8% 34%" },
];

/* ── Parallax hook (gyroscope + touch fallback) ────────────── */
function useParallax() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const touchRef = useRef({ active: false, startX: 0, startY: 0 });

  useEffect(() => {
    // Try DeviceOrientation (gyroscope) first
    let hasGyro = false;
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      hasGyro = true;
      // gamma: left-right tilt (-90..90), beta: front-back tilt (-180..180)
      // Normalize to a subtle range (-1..1) then scale to pixels
      const x = Math.max(-1, Math.min(1, (e.gamma ?? 0) / 30)) * 8;
      const y = Math.max(-1, Math.min(1, ((e.beta ?? 0) - 45) / 30)) * 8;
      setOffset({ x, y });
    };

    window.addEventListener("deviceorientation", handleOrientation);

    // Touch fallback — tracks finger position relative to screen center
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
      // Ease back to center
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
        background:
          "linear-gradient(168deg, hsl(220 18% 11%) 0%, hsl(220 16% 8%) 40%, hsl(210 14% 9%) 70%, hsl(220 18% 6%) 100%)",
      }}
    >
      {/* Subtle warmth overlay — parallax-responsive */}
      <div
        className="absolute inset-0 z-0 pointer-events-none transition-transform duration-700 ease-out"
        style={{
          transform: `translate(${parallax.x}px, ${parallax.y}px)`,
          background:
            "radial-gradient(ellipse at 50% 30%, hsla(38, 25%, 45%, 0.06) 0%, transparent 65%)",
        }}
      />
      {/* Secondary cool accent — moves opposite for depth */}
      <div
        className="absolute inset-0 z-0 pointer-events-none transition-transform duration-1000 ease-out"
        style={{
          transform: `translate(${-parallax.x * 0.6}px, ${-parallax.y * 0.6}px)`,
          background:
            "radial-gradient(ellipse at 30% 70%, hsla(210, 20%, 40%, 0.03) 0%, transparent 50%)",
        }}
      />

      {/* ── Branding + Greeting ───────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center pt-14 pb-2 gap-1">
        <p
          className="text-white/30 text-xs tracking-[0.45em] uppercase font-medium"
          style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
        >
          Hologram
        </p>
        <p
          className="text-white/50 text-base font-light tracking-wide"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {greeting}{name ? `, ${name}` : ""}
        </p>
      </div>

      {/* ── App Grid ─────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-8">
        <div className="grid grid-cols-4 gap-x-6 gap-y-7 w-full max-w-xs">
          {apps.map((app) => (
            <button
              key={app.label}
              onClick={() => handleApp(app.action)}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div
                className="w-[54px] h-[54px] rounded-[15px] flex items-center justify-center transition-transform duration-200 active:scale-90"
                style={{
                  background: `linear-gradient(150deg, hsl(${app.color} / 0.7), hsl(${app.color} / 0.9))`,
                  boxShadow: `0 1px 6px hsl(${app.color} / 0.2), inset 0 1px 0 hsla(0, 0%, 100%, 0.06)`,
                }}
              >
                <app.icon className="w-[22px] h-[22px] text-white/80" strokeWidth={1.4} />
              </div>
              <span
                className="text-white/50 text-[10px] tracking-wide leading-tight"
                style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
              >
                {app.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Search pill ──────────────────────────────────────── */}
      <div className="relative z-10 flex justify-center pb-3.5 px-10">
        <div
          className="w-full max-w-[260px] h-8 rounded-full flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-transform duration-150"
          style={{
            background: "hsla(0, 0%, 100%, 0.06)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid hsla(0, 0%, 100%, 0.04)",
          }}
        >
          <Search className="w-3 h-3 text-white/30" />
          <span
            className="text-white/30 text-[11px] tracking-wider"
            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
          >
            Search
          </span>
        </div>
      </div>

      {/* ── Dock ─────────────────────────────────────────────── */}
      <nav
        className="relative z-10 mx-5 mb-2 rounded-[22px] flex items-center justify-around py-2.5 px-2"
        style={{
          background: "hsla(0, 0%, 100%, 0.07)",
          backdropFilter: "blur(30px)",
          WebkitBackdropFilter: "blur(30px)",
          border: "1px solid hsla(0, 0%, 100%, 0.05)",
        }}
      >
        {dockApps.map((app) => (
          <button
            key={app.label}
            onClick={() => handleApp(app.action)}
            className="flex flex-col items-center active:scale-90 transition-transform duration-150"
          >
            <div
              className="w-11 h-11 rounded-[13px] flex items-center justify-center"
              style={{
                background: `linear-gradient(150deg, hsl(${app.color} / 0.7), hsl(${app.color} / 0.9))`,
                boxShadow: `0 1px 5px hsl(${app.color} / 0.18), inset 0 1px 0 hsla(0, 0%, 100%, 0.05)`,
              }}
            >
              <app.icon className="w-[18px] h-[18px] text-white/80" strokeWidth={1.4} />
            </div>
          </button>
        ))}
      </nav>

      {/* ── Home indicator ───────────────────────────────────── */}
      <div className="relative z-10 flex justify-center pb-1.5 pt-1">
        <div className="w-28 h-[3px] rounded-full bg-white/15" />
      </div>

      {/* ── Overlays ─────────────────────────────────────────── */}
      <HologramClaimOverlay open={claimOpen} onClose={() => setClaimOpen(false)} />
      <HologramAiChat open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
