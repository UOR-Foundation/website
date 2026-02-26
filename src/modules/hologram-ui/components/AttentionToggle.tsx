/**
 * AttentionToggle — Focus Mode Toggle (Right Edge, Vertical)
 * ══════════════════════════════════════════════════════════
 *
 * Vertically oriented toggle fixed to the right edge of the viewport.
 * Binary: Open (diffuse) ↔ Focus (deep).
 */

import { useState } from "react";
import { useAttentionMode } from "@/modules/hologram-ui/hooks/useAttentionMode";

export default function AttentionToggle() {
  const { preset, toggle } = useAttentionMode();
  const [hovered, setHovered] = useState(false);

  const isFocus = preset === "focus";

  return (
    <button
      onClick={toggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={`${isFocus ? "Focus" : "Open"} mode. Click to switch.`}
      className="fixed right-5 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3 select-none transition-all duration-500"
      style={{
        zIndex: 60,
        opacity: hovered ? 1 : 0.7,
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* Label — rotated vertically */}
      <span
        className="text-[10px] font-semibold tracking-[0.2em] uppercase transition-colors duration-500"
        style={{
          writingMode: "vertical-rl",
          color: isFocus
            ? "hsla(38, 45%, 75%, 0.9)"
            : "hsla(220, 15%, 80%, 0.55)",
        }}
      >
        {isFocus ? "Focus" : "Open"}
      </span>

      {/* Toggle track — vertical */}
      <div
        className="relative rounded-full transition-all duration-500"
        style={{
          width: 16,
          height: 34,
          background: isFocus
            ? "hsla(38, 35%, 55%, 0.25)"
            : "hsla(220, 15%, 50%, 0.12)",
          border: `1px solid ${isFocus ? "hsla(38, 30%, 60%, 0.35)" : "hsla(220, 15%, 40%, 0.2)"}`,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        {/* Thumb */}
        <div
          className="absolute left-[2px] rounded-full transition-all duration-500"
          style={{
            width: 10,
            height: 10,
            top: isFocus ? 20 : 2,
            background: isFocus
              ? "hsla(38, 45%, 68%, 0.95)"
              : "hsla(220, 15%, 70%, 0.4)",
            boxShadow: isFocus
              ? "0 0 8px 1px hsla(38, 50%, 65%, 0.3)"
              : "none",
          }}
        />
      </div>
    </button>
  );
}
