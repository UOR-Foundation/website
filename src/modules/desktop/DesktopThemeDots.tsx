/**
 * DesktopThemeDots — Three small dots to switch desktop themes.
 * Only visible on the home screen (no open/visible windows).
 * Each dot has a distinct visual identity; hover reveals label.
 */

import { useState } from "react";
import { useDesktopTheme, type DesktopTheme } from "@/modules/desktop/hooks/useDesktopTheme";
import type { WindowState } from "@/modules/desktop/hooks/useWindowManager";

const DOTS: { id: DesktopTheme; label: string; bg: string; activeBg: string; border?: string }[] = [
  {
    id: "immersive",
    label: "Immersive",
    bg: "linear-gradient(135deg, rgba(99,102,241,0.6), rgba(236,72,153,0.6))",
    activeBg: "linear-gradient(135deg, #6366f1, #ec4899)",
  },
  {
    id: "dark",
    label: "Dark",
    bg: "rgba(255,255,255,0.12)",
    activeBg: "rgba(255,255,255,0.50)",
    border: "rgba(255,255,255,0.20)",
  },
  {
    id: "light",
    label: "Light",
    bg: "rgba(255,255,255,0.35)",
    activeBg: "rgba(255,255,255,0.85)",
    border: "rgba(0,0,0,0.15)",
  },
];

interface Props {
  windows?: WindowState[];
}

export default function DesktopThemeDots({ windows = [] }: Props) {
  const { theme, setTheme } = useDesktopTheme();
  const [hoveredDot, setHoveredDot] = useState<DesktopTheme | null>(null);

  // Hide when any window is open (not minimized)
  const hasVisibleWindows = windows.some(w => !w.minimized);

  return (
    <div
      className="fixed bottom-4 inset-x-0 z-[195] flex justify-center pointer-events-none"
      style={{
        opacity: hasVisibleWindows ? 0 : 1,
        transition: "opacity 200ms ease-out",
      }}
    >
      <div className="pointer-events-auto flex items-center gap-3 py-1.5 px-3 relative"
        style={{ pointerEvents: hasVisibleWindows ? "none" : "auto" }}
      >
        {DOTS.map(dot => {
          const active = theme === dot.id;
          const hovered = hoveredDot === dot.id;
          return (
            <div key={dot.id} className="relative flex flex-col items-center">
              {/* Hover label */}
              <span
                className="absolute -top-6 text-white/50 text-[10px] font-medium whitespace-nowrap select-none pointer-events-none"
                style={{
                  opacity: hovered ? 1 : 0,
                  transform: hovered ? "translateY(0)" : "translateY(4px)",
                  transition: "opacity 150ms ease-out, transform 150ms ease-out",
                }}
              >
                {dot.label}
              </span>
              <button
                onClick={() => setTheme(dot.id)}
                onMouseEnter={() => setHoveredDot(dot.id)}
                onMouseLeave={() => setHoveredDot(null)}
                aria-label={dot.label}
                title={dot.label}
                className="rounded-full transition-all duration-200 ease-out hover:opacity-80"
                style={{
                  width: active ? 9 : 8,
                  height: active ? 9 : 8,
                  background: active ? dot.activeBg : dot.bg,
                  border: dot.border ? `1px solid ${dot.border}` : "none",
                  transform: active ? "scale(1)" : "scale(0.9)",
                  boxShadow: active ? "0 0 6px rgba(255,255,255,0.15)" : "none",
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
