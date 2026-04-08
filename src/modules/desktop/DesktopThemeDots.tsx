/**
 * DesktopThemeDots — Three small dots to switch desktop themes.
 * 
 * Revolut-inspired: CSS transitions only, no framer-motion springs.
 */

import { useDesktopTheme, type DesktopTheme } from "@/modules/desktop/hooks/useDesktopTheme";

const DOTS: { id: DesktopTheme; label: string; bg: string; border?: string }[] = [
  { id: "immersive", label: "Immersive", bg: "linear-gradient(135deg, #6366f1, #ec4899)" },
  { id: "dark", label: "Dark", bg: "#1a1a1a", border: "rgba(255,255,255,0.15)" },
  { id: "light", label: "Light", bg: "#f0f0f0", border: "rgba(0,0,0,0.2)" },
];

export default function DesktopThemeDots() {
  const { theme, setTheme } = useDesktopTheme();

  return (
    <div className="fixed bottom-5 inset-x-0 z-[195] flex justify-center pointer-events-none">
      <div
        className="pointer-events-auto flex items-center gap-2 py-1.5 px-3 rounded-full"
        style={{
          background: "rgba(128,128,128,0.10)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        {DOTS.map(dot => {
          const active = theme === dot.id;
          return (
            <button
              key={dot.id}
              onClick={() => setTheme(dot.id)}
              aria-label={dot.label}
              title={dot.label}
              className="rounded-full transition-all duration-150 ease-out"
              style={{
                width: active ? 12 : 10,
                height: active ? 12 : 10,
                background: dot.bg,
                border: `1.5px solid ${dot.border || "transparent"}`,
                opacity: active ? 1 : 0.5,
                boxShadow: active ? "0 0 6px rgba(255,255,255,0.1)" : "none",
                transform: active ? "scale(1)" : "scale(1)",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
