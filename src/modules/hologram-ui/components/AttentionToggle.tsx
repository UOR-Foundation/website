/**
 * AttentionToggle — Focus Mode Toggle (Top-Right)
 * ════════════════════════════════════════════════
 *
 * A prominent, self-describing toggle fixed to the top-right.
 * Binary: Open (diffuse) ↔ Focus (deep).
 *
 * @module hologram-ui/components/AttentionToggle
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
      className="fixed top-5 right-5 flex items-center gap-2.5 select-none transition-all duration-500"
      style={{
        zIndex: 60,
        opacity: hovered ? 1 : 0.75,
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* Label */}
      <span
        className="text-[11px] font-semibold tracking-[0.15em] uppercase transition-colors duration-500"
        style={{
          color: isFocus
            ? "hsla(38, 45%, 75%, 0.9)"
            : "hsla(220, 15%, 80%, 0.65)",
        }}
      >
        {isFocus ? "Focus" : "Open"}
      </span>

      {/* Toggle track */}
      <div
        className="relative rounded-full transition-all duration-500"
        style={{
          width: 36,
          height: 18,
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
          className="absolute top-[2px] rounded-full transition-all duration-500"
          style={{
            width: 12,
            height: 12,
            left: isFocus ? 20 : 2,
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
