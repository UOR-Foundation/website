/**
 * DesktopThemeDots — Three small dots to switch desktop themes.
 */

import { motion } from "framer-motion";
import { useDesktopTheme, type DesktopTheme } from "@/modules/desktop/hooks/useDesktopTheme";

const DOTS: { id: DesktopTheme; label: string; bg: string; border?: string }[] = [
  { id: "immersive", label: "Immersive", bg: "linear-gradient(135deg, #6366f1, #ec4899)" },
  { id: "dark", label: "Dark", bg: "#1a1a1a", border: "rgba(255,255,255,0.15)" },
  { id: "light", label: "Light", bg: "#f0f0f0", border: "rgba(0,0,0,0.2)" },
];

export default function DesktopThemeDots() {
  const { theme, setTheme } = useDesktopTheme();

  return (
    <div className="fixed bottom-[68px] inset-x-0 z-[195] flex justify-center pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-2 py-1.5 px-3 rounded-full"
        style={{
          background: "rgba(128,128,128,0.12)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        {DOTS.map(dot => {
          const active = theme === dot.id;
          return (
            <motion.button
              key={dot.id}
              onClick={() => setTheme(dot.id)}
              aria-label={dot.label}
              title={dot.label}
              animate={{
                scale: active ? 1.25 : 1,
                opacity: active ? 1 : 0.55,
              }}
              whileHover={{ scale: active ? 1.3 : 1.15, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              className="w-[10px] h-[10px] rounded-full"
              style={{
                background: dot.bg,
                border: `1.5px solid ${dot.border || "transparent"}`,
                boxShadow: active ? "0 0 8px rgba(255,255,255,0.15)" : "none",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
