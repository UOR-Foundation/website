/**
 * DesktopWidgets — Home screen: immersive clock, greeting, rich search bar.
 * This IS the desktop — always visible when no windows are maximized.
 * Theme-aware, supports immersive/dark/light via DesktopTheme context.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ArrowRight, Plus, Lock } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { WindowState } from "@/modules/desktop/hooks/useWindowManager";
import { useDesktopTheme } from "@/modules/desktop/hooks/useDesktopTheme";
import { useAuth } from "@/hooks/use-auth";
import VoiceInput from "@/modules/oracle/components/VoiceInput";
import { isValidTriword, triwordBreakdown } from "@/lib/uor-triword";

interface Props {
  windows: WindowState[];
  onSearch?: (query: string) => void;
  onOpenApp?: (appId: string) => void;
}

type AddressKind = "triword" | "ipv6" | null;

function detectAddress(input: string): { kind: AddressKind; label: string | null } {
  const t = input.trim();
  if (!t) return { kind: null, label: null };
  const normalized = t.replace(/\s*[·.]\s*/g, ".").replace(/\s+/g, ".").toLowerCase();
  const parts = normalized.split(".");
  if (parts.length === 3 && parts.every((p) => p.length >= 2)) {
    if (isValidTriword(normalized)) {
      const bd = triwordBreakdown(normalized);
      return {
        kind: "triword",
        label: bd
          ? `${bd.observer.charAt(0).toUpperCase() + bd.observer.slice(1)}.${bd.observable.charAt(0).toUpperCase() + bd.observable.slice(1)}.${bd.context.charAt(0).toUpperCase() + bd.context.slice(1)}`
          : null,
      };
    }
  }
  if (/^[0-9a-fA-F:]+$/.test(t) && t.includes(":") && t.split(":").length >= 3) {
    return { kind: "ipv6", label: t };
  }
  return { kind: null, label: null };
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DesktopWidgets({ windows, onSearch }: Props) {
  const [time, setTime] = useState(new Date());
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { theme, isLight } = useDesktopTheme();
  const { profile } = useAuth();
  const hasMaximized = windows.some(w => w.maximized && !w.minimized);
  const hasAnyWindows = windows.some(w => !w.minimized);

  const detected = useMemo(() => detectAddress(query), [query]);
  const isAddress = detected.kind !== null;

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-focus search on desktop
  useEffect(() => {
    if (window.innerWidth >= 768) {
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, []);

  const clockStr = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  const displayName = profile?.displayName || "Explorer";

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (query.trim() && onSearch) {
      onSearch(query.trim());
      setQuery("");
    }
  }, [query, onSearch]);

  // Theme-aware colors
  const isImmersive = theme === "immersive";
  const clockColor = isImmersive ? "text-white/75" : isLight ? "text-black/70" : "text-white/75";
  const clockShadow = isImmersive
    ? "0 2px 40px rgba(0,0,0,0.4)"
    : isLight ? "0 2px 24px rgba(0,0,0,0.06)" : "0 2px 24px rgba(0,0,0,0.3)";
  const greetingColor = isImmersive ? "text-white/90" : isLight ? "text-black/35" : "text-white/40";

  // Search bar styles
  const searchBg = isImmersive
    ? (isAddress
        ? "linear-gradient(135deg, hsl(165 25% 18% / 0.6), hsl(160 20% 15% / 0.5), hsl(170 25% 17% / 0.55))"
        : "linear-gradient(135deg, hsl(200 25% 22% / 0.55), hsl(195 20% 18% / 0.45), hsl(200 30% 20% / 0.5))")
    : isLight
      ? (isAddress ? "rgba(0,180,120,0.06)" : "rgba(0,0,0,0.04)")
      : (isAddress ? "rgba(0,180,120,0.08)" : "rgba(255,255,255,0.04)");
  const searchBorder = isImmersive
    ? (isAddress ? "1px solid hsl(160 50% 50% / 0.25)" : "1px solid hsl(0 0% 100% / 0.14)")
    : isLight
      ? (isAddress ? "1px solid hsl(160 50% 50% / 0.3)" : "1px solid rgba(0,0,0,0.08)")
      : (isAddress ? "1px solid hsl(160 50% 50% / 0.25)" : "1px solid rgba(255,255,255,0.08)");
  const searchShadow = isImmersive
    ? "0 12px 48px -12px hsl(200 40% 8% / 0.7), 0 4px 16px -4px hsl(200 50% 15% / 0.3)"
    : isLight ? "0 4px 24px -8px rgba(0,0,0,0.08)" : "0 4px 24px -8px rgba(0,0,0,0.3)";
  const inputColor = isImmersive
    ? (isAddress ? "hsl(160 40% 85%)" : "hsl(0 0% 100% / 0.95)")
    : isLight
      ? (isAddress ? "hsl(160 40% 25%)" : "hsl(0 0% 0% / 0.85)")
      : (isAddress ? "hsl(160 40% 85%)" : "hsl(0 0% 100% / 0.9)");
  const placeholderColor = isImmersive ? "hsl(0 0% 100% / 0.35)" : isLight ? "hsl(0 0% 0% / 0.25)" : "hsl(0 0% 100% / 0.25)";
  const btnBgStyle = isImmersive
    ? "hsl(0 0% 100% / 0.1)"
    : isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)";
  const btnBorderStyle = isImmersive
    ? "1px solid hsl(0 0% 100% / 0.12)"
    : isLight ? "1px solid rgba(0,0,0,0.06)" : "1px solid rgba(255,255,255,0.08)";
  const btnIconColor = isImmersive ? "text-white" : isLight ? "text-black/60" : "text-white/70";

  const widgetOpacity = hasMaximized ? 0 : 1;
  const clockOpacity = hasAnyWindows ? 0.4 : 1;

  return (
    <div
      className="fixed inset-0 z-[5] flex flex-col items-center pointer-events-none"
      style={{
        paddingBottom: 60,
        opacity: widgetOpacity,
        transition: "opacity 300ms ease-out",
      }}
    >
      <div className="pointer-events-auto w-full max-w-[580px] px-6 flex flex-col items-center" style={{ marginTop: "22vh" }}>
        {/* Clock */}
        <div
          className="text-center mb-4"
          style={{
            opacity: clockOpacity,
            transition: "opacity 300ms ease-out",
          }}
        >
          <h1
            className={`${clockColor} font-bold tracking-tight leading-none select-none`}
            style={{
              fontSize: "clamp(5rem, 12vw, 10rem)",
              fontFamily: "'DM Sans', -apple-system, sans-serif",
              textShadow: clockShadow,
            }}
          >
            {clockStr}
          </h1>
          <p
            className={`${greetingColor} font-medium tracking-wide mt-3 select-none`}
            style={{
              fontSize: "clamp(1.1rem, 2.5vw, 1.75rem)",
              fontFamily: "'DM Sans', -apple-system, sans-serif",
              textShadow: isImmersive ? "0 1px 20px rgba(0,0,0,0.3)" : "none",
            }}
          >
            {getGreeting()}, {displayName}.
          </p>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSubmit} className="w-full mt-8">
          <div className="relative w-full group">
            {/* Glow ring */}
            {isImmersive && (
              <div
                className="absolute -inset-[1px] rounded-full pointer-events-none"
                style={{
                  background: isAddress
                    ? "linear-gradient(135deg, hsl(160 60% 50% / 0.3), hsl(170 50% 40% / 0.1), hsl(155 60% 55% / 0.25))"
                    : "linear-gradient(135deg, hsl(195 60% 65% / 0.25), hsl(200 40% 50% / 0.08), hsl(210 50% 60% / 0.2))",
                  filter: "blur(6px)",
                }}
              />
            )}

            {/* Address badge */}
            <AnimatePresence>
              {isAddress && (
                <motion.div
                  initial={{ opacity: 0, x: -8, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -8, scale: 0.9 }}
                  transition={{ type: "spring", damping: 25, stiffness: 400 }}
                  className="absolute left-14 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 pointer-events-none"
                >
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span className="text-[11px] font-medium tracking-wide text-emerald-400/80 uppercase">
                    {detected.kind === "triword" ? "Address" : "IPv6"}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What is your main focus today?"
              className="relative w-full rounded-full pr-24 py-4 text-base focus:outline-none transition-all duration-300"
              style={{
                paddingLeft: isAddress ? "7.5rem" : "3.5rem",
                background: searchBg,
                backdropFilter: isImmersive ? "blur(40px) saturate(1.6)" : "blur(12px)",
                WebkitBackdropFilter: isImmersive ? "blur(40px) saturate(1.6)" : "blur(12px)",
                border: searchBorder,
                boxShadow: searchShadow,
                color: inputColor,
                caretColor: isAddress ? "hsl(160 60% 60%)" : (isImmersive ? "hsl(195 70% 65%)" : undefined),
                fontFamily: isAddress ? "var(--font-mono, ui-monospace, monospace)" : "'DM Sans', -apple-system, sans-serif",
                letterSpacing: isAddress ? "0.02em" : undefined,
              }}
            />

            {/* + button */}
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10">
              <button
                type="button"
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: btnBgStyle,
                  border: btnBorderStyle,
                  color: isImmersive ? "hsl(0 0% 100% / 0.5)" : isLight ? "hsl(0 0% 0% / 0.35)" : "hsl(0 0% 100% / 0.4)",
                }}
                title="Add context"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Right-side actions */}
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
              <VoiceInput
                onTranscript={(text, isFinal) => {
                  setQuery(text);
                  if (isFinal && text.trim() && onSearch) onSearch(text.trim());
                }}
                size="sm"
                className={isImmersive
                  ? "text-white/60 hover:text-white/90 border-white/10 hover:border-white/25"
                  : isLight
                    ? "text-black/40 hover:text-black/70 border-black/10 hover:border-black/20"
                    : "text-white/50 hover:text-white/80 border-white/10 hover:border-white/20"
                }
              />
              <button
                type="submit"
                disabled={!query.trim()}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 disabled:opacity-25"
                style={{
                  background: btnBgStyle,
                  border: btnBorderStyle,
                }}
              >
                <ArrowRight className={`w-5 h-5 ${btnIconColor}`} />
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Placeholder style for placeholders */}
      <style>{`
        .pointer-events-auto input::placeholder {
          color: ${placeholderColor};
        }
      `}</style>
    </div>
  );
}
