/**
 * DesktopThemeDots — Earth / Moon / Sun screen switcher.
 *
 * 🌍 Earth = Immersive (photo wallpaper)
 * 🌙 Moon  = Dark mode
 * ☀️ Sun   = Light mode
 *
 * Each is a separate desktop screen with its own persistent layout.
 * Click or press 1/2/3 to switch. Hover reveals label.
 */

import { useState, useEffect, useCallback } from "react";
import { useDesktopTheme, type DesktopTheme } from "@/modules/platform/desktop/hooks/useDesktopTheme";
import type { WindowState } from "@/modules/platform/desktop/hooks/useWindowManager";

const DOTS: {
  id: DesktopTheme;
  label: string;
  key: string;
  colors: { fill: string; glow: string; ring: string };
}[] = [
  {
    id: "immersive",
    label: "Earth",
    key: "1",
    colors: {
      fill: "radial-gradient(circle at 38% 36%, rgba(140,180,160,0.9) 0%, rgba(90,130,110,0.85) 50%, rgba(60,100,90,0.8) 100%)",
      glow: "0 0 6px rgba(140,180,160,0.25)",
      ring: "rgba(140,180,160,0.35)",
    },
  },
  {
    id: "dark",
    label: "Moon",
    key: "2",
    colors: {
      fill: "radial-gradient(circle at 40% 38%, rgba(200,200,195,0.85) 0%, rgba(160,160,155,0.75) 55%, rgba(130,130,125,0.65) 100%)",
      glow: "0 0 6px rgba(200,200,195,0.2)",
      ring: "rgba(200,200,195,0.3)",
    },
  },
  {
    id: "light",
    label: "Sun",
    key: "3",
    colors: {
      fill: "radial-gradient(circle at 42% 40%, rgba(240,210,150,0.9) 0%, rgba(210,170,100,0.8) 55%, rgba(185,145,80,0.7) 100%)",
      glow: "0 0 6px rgba(220,190,120,0.25)",
      ring: "rgba(220,190,120,0.35)",
    },
  },
];

interface Props {
  windows?: WindowState[];
}

export default function DesktopThemeDots({ windows = [] }: Props) {
  const { theme, setTheme } = useDesktopTheme();
  const [hoveredDot, setHoveredDot] = useState<DesktopTheme | null>(null);

  const hasVisibleWindows = windows.some(w => !w.minimized);

  // Direct number key shortcuts (1/2/3) when no input is focused
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const dot = DOTS.find(d => d.key === e.key);
    if (dot && theme !== dot.id) {
      setTheme(dot.id);
    }
  }, [theme, setTheme]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return (
    <div
      className="fixed bottom-4 inset-x-0 z-[195] flex justify-center pointer-events-none"
      style={{
        opacity: hasVisibleWindows ? 0 : 1,
        transition: "opacity 200ms ease-out",
      }}
    >
      <div
        className="pointer-events-auto flex items-center gap-3 py-1.5 px-3 rounded-full relative"
        style={{
          pointerEvents: hasVisibleWindows ? "none" : "auto",
          background: "rgba(0,0,0,0.12)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        {DOTS.map(dot => {
          const active = theme === dot.id;
          const hovered = hoveredDot === dot.id;
          return (
            <div key={dot.id} className="relative flex flex-col items-center">
              {/* Hover label */}
              <span
                className="absolute -top-6 text-white/50 text-[10px] tracking-wide font-medium whitespace-nowrap select-none pointer-events-none"
                style={{
                  opacity: hovered ? 1 : 0,
                  transform: hovered ? "translateY(0)" : "translateY(3px)",
                  transition: "opacity 200ms ease-out, transform 200ms ease-out",
                }}
              >
                {dot.label}
              </span>
              <button
                onClick={() => setTheme(dot.id)}
                onMouseEnter={() => setHoveredDot(dot.id)}
                onMouseLeave={() => setHoveredDot(null)}
                aria-label={`${dot.label} (${dot.key})`}
                title={`${dot.label} — press ${dot.key}`}
                className="rounded-full"
                style={{
                  width: active ? 10 : 8,
                  height: active ? 10 : 8,
                  background: dot.colors.fill,
                  boxShadow: active ? dot.colors.glow : "none",
                  outline: active ? `1.5px solid ${dot.colors.ring}` : "1.5px solid transparent",
                  outlineOffset: 2,
                  transform: hovered && !active ? "scale(1.25)" : "scale(1)",
                  transition: "all 300ms cubic-bezier(0.16, 1, 0.3, 1)",
                  cursor: "pointer",
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
