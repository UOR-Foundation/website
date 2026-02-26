/**
 * AttentionToggle — Focus Mode Toggle (Right Edge, Vertical)
 * ══════════════════════════════════════════════════════════
 *
 * Vertically oriented toggle fixed to the right edge of the viewport.
 * Shows "Focus Mode" label with OFF/ON state and keyboard shortcut hint.
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
      aria-label={`Focus ${isFocus ? "On" : "Off"}. Click to toggle.`}
      className="absolute right-5 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3 select-none transition-all duration-500"
      style={{
        zIndex: 60,
        opacity: hovered ? 1 : 0.9,
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* "Focus" label — vertical */}
      <span
        className="text-[12px] font-medium tracking-[0.2em] uppercase transition-colors duration-500"
        style={{
          writingMode: "vertical-rl",
          color: isFocus
            ? "hsla(200, 70%, 78%, 1)"
            : "hsla(0, 0%, 78%, 0.7)",
        }}
      >
        Focus
      </span>

      {/* Toggle track — vertical */}
      <div
        className="relative rounded-full transition-all duration-500"
        style={{
          width: 16,
          height: 34,
          background: isFocus
            ? "hsla(200, 60%, 50%, 0.4)"
            : "hsla(0, 0%, 50%, 0.15)",
          border: `1px solid ${isFocus ? "hsla(200, 60%, 60%, 0.5)" : "hsla(0, 0%, 50%, 0.25)"}`,
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
              ? "hsla(200, 70%, 65%, 1)"
              : "hsla(0, 0%, 65%, 0.5)",
            boxShadow: isFocus
              ? "0 0 10px 2px hsla(200, 70%, 60%, 0.4)"
              : "none",
          }}
        />
      </div>

      {/* OFF / ON label — vertical */}
      <span
        className="text-[12px] font-semibold tracking-[0.15em] uppercase transition-colors duration-500"
        style={{
          writingMode: "vertical-rl",
          color: isFocus
            ? "hsla(200, 70%, 78%, 1)"
            : "hsla(0, 0%, 75%, 0.7)",
        }}
      >
        {isFocus ? "On" : "Off"}
      </span>

    </button>
  );
}
