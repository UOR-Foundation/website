/**
 * MobileOsShell — iOS-style homescreen for Hologram OS (mobile only)
 * Fixed viewport, no scroll. Status bar → App grid → Dock.
 * Aman-inspired: extreme whitespace, whisper-light typography, calm palette.
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Grid3X3,
  MessageCircle,
  Compass,
  User,
  Settings,
  Sparkles,
  FileText,
  Globe,
  Shield,
  Search,
  Wifi,
  Battery,
  Signal,
} from "lucide-react";
import HologramClaimOverlay from "./HologramClaimOverlay";
import HologramAiChat from "./HologramAiChat";

/* ── Live clock (HH:MM) ────────────────────────────────────── */
function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/* ── App definition ─────────────────────────────────────────── */
interface AppIcon {
  label: string;
  icon: React.ElementType;
  action: string; // route or special action id
  color: string; // hsl bg
}

const apps: AppIcon[] = [
  { label: "Console",      icon: Grid3X3,       action: "/hologram-console", color: "220 18% 16%" },
  { label: "Your Space",   icon: User,          action: "/your-space",       color: "200 28% 38%" },
  { label: "Apps",         icon: Compass,       action: "/console/apps",     color: "152 34% 42%" },
  { label: "Framework",    icon: FileText,      action: "/standard",         color: "38 50% 44%" },
  { label: "Community",    icon: Globe,          action: "/research",         color: "260 30% 42%" },
  { label: "Identity",     icon: Shield,         action: "__claim",           color: "340 30% 42%" },
  { label: "Settings",     icon: Settings,       action: "/settings",         color: "210 10% 40%" },
  { label: "Hologram AI",  icon: Sparkles,       action: "__chat",            color: "38 45% 35%" },
];

const dockApps: AppIcon[] = [
  { label: "Console",     icon: Grid3X3,       action: "/hologram-console", color: "220 18% 16%" },
  { label: "AI",          icon: Sparkles,       action: "__chat",            color: "38 45% 35%" },
  { label: "Space",       icon: User,          action: "/your-space",       color: "200 28% 38%" },
  { label: "Search",      icon: Search,         action: "__search",          color: "210 10% 40%" },
];

/* ── Component ──────────────────────────────────────────────── */
export default function MobileOsShell() {
  const navigate = useNavigate();
  const now = useClock();
  const [claimOpen, setClaimOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const handleApp = useCallback(
    (action: string) => {
      if (action === "__claim") return setClaimOpen(true);
      if (action === "__chat") return setChatOpen(true);
      if (action === "__search") return; // placeholder
      navigate(action);
    },
    [navigate],
  );

  return (
    <div
      className="fixed inset-0 flex flex-col bg-black select-none"
      style={{ touchAction: "none", overscrollBehavior: "none" }}
    >
      {/* ── Wallpaper layer ──────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        {/* Soft gradient wallpaper — Aman-inspired muted earth tones */}
        <div
          className="w-full h-full"
          style={{
            background:
              "linear-gradient(165deg, hsl(210 20% 14%) 0%, hsl(220 18% 10%) 35%, hsl(200 15% 12%) 65%, hsl(220 20% 8%) 100%)",
          }}
        />
        {/* subtle texture overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at 50% 20%, hsla(38, 30%, 50%, 0.06) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* ── Status Bar ───────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-6 pt-3 pb-1">
        <span
          className="text-white/90 text-sm font-medium tracking-wide"
          style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
        >
          {timeStr}
        </span>
        <div className="flex items-center gap-1.5">
          <Signal className="w-3.5 h-3.5 text-white/70" />
          <Wifi className="w-3.5 h-3.5 text-white/70" />
          <Battery className="w-4.5 h-3.5 text-white/70" />
        </div>
      </header>

      {/* ── Date + Greeting ──────────────────────────────────── */}
      <div className="relative z-10 text-center pt-6 pb-8 px-8">
        <p
          className="text-white/50 text-xs tracking-[0.25em] uppercase mb-1"
          style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
        >
          {dateStr}
        </p>
        <h1
          className="text-white/90 text-2xl font-light tracking-wide"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Hologram
        </h1>
      </div>

      {/* ── App Grid ─────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex items-start justify-center px-6 pt-2">
        <div className="grid grid-cols-4 gap-x-5 gap-y-6 w-full max-w-sm">
          {apps.map((app) => (
            <button
              key={app.label}
              onClick={() => handleApp(app.action)}
              className="flex flex-col items-center gap-1.5 group"
            >
              {/* Icon container */}
              <div
                className="w-14 h-14 rounded-[16px] flex items-center justify-center transition-transform duration-200 active:scale-90"
                style={{
                  background: `linear-gradient(145deg, hsl(${app.color} / 0.85), hsl(${app.color}))`,
                  boxShadow: `0 2px 8px hsl(${app.color} / 0.3)`,
                }}
              >
                <app.icon className="w-6 h-6 text-white/90" strokeWidth={1.5} />
              </div>
              {/* Label */}
              <span
                className="text-white/70 text-[10px] tracking-wide leading-tight"
                style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
              >
                {app.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Search pill (Spotlight-style) ─────────────────── */}
      <div className="relative z-10 flex justify-center pb-4 px-8">
        <div
          className="w-full max-w-xs h-9 rounded-full flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-transform duration-150"
          style={{
            background: "hsla(0, 0%, 100%, 0.08)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid hsla(0, 0%, 100%, 0.06)",
          }}
        >
          <Search className="w-3.5 h-3.5 text-white/40" />
          <span
            className="text-white/40 text-xs tracking-wide"
            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
          >
            Search
          </span>
        </div>
      </div>

      {/* ── Dock ─────────────────────────────────────────────── */}
      <nav
        className="relative z-10 mx-4 mb-3 rounded-[24px] flex items-center justify-around py-3 px-2"
        style={{
          background: "hsla(0, 0%, 100%, 0.1)",
          backdropFilter: "blur(30px)",
          WebkitBackdropFilter: "blur(30px)",
          border: "1px solid hsla(0, 0%, 100%, 0.08)",
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
                background: `linear-gradient(145deg, hsl(${app.color} / 0.85), hsl(${app.color}))`,
                boxShadow: `0 2px 8px hsl(${app.color} / 0.25)`,
              }}
            >
              <app.icon className="w-5 h-5 text-white/90" strokeWidth={1.5} />
            </div>
          </button>
        ))}
      </nav>

      {/* ── Home indicator ───────────────────────────────────── */}
      <div className="relative z-10 flex justify-center pb-2">
        <div className="w-32 h-1 rounded-full bg-white/20" />
      </div>

      {/* ── Overlays ─────────────────────────────────────────── */}
      <HologramClaimOverlay open={claimOpen} onClose={() => setClaimOpen(false)} />
      <HologramAiChat open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
