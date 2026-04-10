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
import { useDesktopTheme, type DesktopTheme } from "@/modules/desktop/hooks/useDesktopTheme";
import type { WindowState } from "@/modules/desktop/hooks/useWindowManager";

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
      fill: "radial-gradient(circle at 35% 35%, #4db8ff 0%, #1a7a3a 40%, #0d5e2a 70%, #1a3a5e 100%)",
      glow: "0 0 10px rgba(77,184,255,0.5), 0 0 20px rgba(26,122,58,0.3)",
      ring: "rgba(77,184,255,0.6)",
    },
  },
  {
    id: "dark",
    label: "Moon",
    key: "2",
    colors: {
      fill: "radial-gradient(circle at 40% 38%, #e8e8e0 0%, #c8c8b8 45%, #9a9a8a 80%, #787870 100%)",
      glow: "0 0 8px rgba(200,200,190,0.35), 0 0 16px rgba(200,200,190,0.15)",
      ring: "rgba(220,220,210,0.5)",
    },
  },
  {
    id: "light",
    label: "Sun",
    key: "3",
    colors: {
      fill: "radial-gradient(circle at 45% 42%, #fff7d0 0%, #ffcc33 40%, #ff9900 75%, #e07000 100%)",
      glow: "0 0 12px rgba(255,204,51,0.5), 0 0 24px rgba(255,153,0,0.25)",
      ring: "rgba(255,204,51,0.6)",
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
        className="pointer-events-auto flex items-center gap-4 py-2 px-4 rounded-full relative"
        style={{
          pointerEvents: hasVisibleWindows ? "none" : "auto",
          background: "rgba(0,0,0,0.15)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {DOTS.map(dot => {
          const active = theme === dot.id;
          const hovered = hoveredDot === dot.id;
          return (
            <div key={dot.id} className="relative flex flex-col items-center">
              {/* Hover label */}
              <span
                className="absolute -top-7 text-white/60 text-[11px] font-medium whitespace-nowrap select-none pointer-events-none"
                style={{
                  opacity: hovered ? 1 : 0,
                  transform: hovered ? "translateY(0)" : "translateY(4px)",
                  transition: "opacity 150ms ease-out, transform 150ms ease-out",
                }}
              >
                {dot.label}
                <span className="ml-1 text-white/30 text-[10px]">{dot.key}</span>
              </span>
              <button
                onClick={() => setTheme(dot.id)}
                onMouseEnter={() => setHoveredDot(dot.id)}
                onMouseLeave={() => setHoveredDot(null)}
                aria-label={`${dot.label} (${dot.key})`}
                title={`${dot.label} — press ${dot.key}`}
                className="rounded-full transition-all duration-300 ease-out"
                style={{
                  width: active ? 16 : 12,
                  height: active ? 16 : 12,
                  background: dot.colors.fill,
                  boxShadow: active ? dot.colors.glow : "none",
                  outline: active ? `2px solid ${dot.colors.ring}` : "2px solid transparent",
                  outlineOffset: 2,
                  transform: hovered && !active ? "scale(1.2)" : "scale(1)",
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
