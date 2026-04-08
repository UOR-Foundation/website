/**
 * DesktopThemeDots — Three small dots to switch desktop themes.
 * Only visible on the home screen (no open/visible windows).
 */

import { useDesktopTheme, type DesktopTheme } from "@/modules/desktop/hooks/useDesktopTheme";
import type { WindowState } from "@/modules/desktop/hooks/useWindowManager";

const DOTS: { id: DesktopTheme; label: string; bg: string; border?: string }[] = [
  { id: "immersive", label: "Immersive", bg: "linear-gradient(135deg, #6366f1, #ec4899)" },
  { id: "dark", label: "Dark", bg: "#1a1a1a", border: "rgba(255,255,255,0.15)" },
  { id: "light", label: "Light", bg: "#f0f0f0", border: "rgba(0,0,0,0.2)" },
];

interface Props {
  windows?: WindowState[];
}

export default function DesktopThemeDots({ windows = [] }: Props) {
  const { theme, setTheme } = useDesktopTheme();

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
      <div className="pointer-events-auto flex items-center gap-2.5 py-1 px-2"
        style={{ pointerEvents: hasVisibleWindows ? "none" : "auto" }}
      >
        {DOTS.map(dot => {
          const active = theme === dot.id;
          return (
            <button
              key={dot.id}
              onClick={() => setTheme(dot.id)}
              aria-label={dot.label}
              title={dot.label}
              className="rounded-full transition-all duration-200 ease-out hover:opacity-80"
              style={{
                width: 7,
                height: 7,
                background: active ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)",
                border: "none",
                transform: active ? "scale(1)" : "scale(0.85)",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
