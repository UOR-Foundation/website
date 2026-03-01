/**
 * AttentionToggle — Focus Mode Toggle (Right Edge, Vertical)
 * ══════════════════════════════════════════════════════════
 *
 * Vertically oriented toggle fixed to the right edge of the viewport.
 * Shows "Focus Mode" label with OFF/ON state and keyboard shortcut hint.
 */

import { useState } from "react";
import { useAttentionMode } from "@/modules/hologram-ui/hooks/useAttentionMode";

interface AttentionToggleProps {
  bgMode?: "image" | "white" | "dark";
}

export default function AttentionToggle({ bgMode = "dark" }: AttentionToggleProps) {
  const { preset, toggle } = useAttentionMode();
  const [hovered, setHovered] = useState(false);

  const isFocus = preset === "focus";
  const isWhite = bgMode === "white";

  return (
    <button
      onClick={toggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={`Focus ${isFocus ? "On" : "Off"}. Click to toggle.`}
      className="flex flex-col items-center gap-3 select-none transition-all duration-500"
      style={{
        zIndex: 60,
        opacity: 1,
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* "Focus" label — vertical */}
      <span
        className="font-medium tracking-[0.35em] uppercase transition-colors duration-500"
        style={{
          writingMode: "vertical-rl",
          fontSize: "12px",
          color: isFocus
            ? (isWhite ? "hsla(200, 55%, 30%, 1)" : "hsla(200, 70%, 82%, 1)")
            : (isWhite ? "hsla(0, 0%, 10%, 0.85)" : "hsla(0, 0%, 90%, 0.8)"),
          textShadow: isWhite ? "none" : "0 1px 4px hsla(0, 0%, 0%, 0.5)",
        }}
      >
        Focus
      </span>

      {/* Toggle track — vertical */}
      <div
        className="relative rounded-full transition-all duration-500"
        style={{
          width: 18,
          height: 38,
          background: isFocus
            ? (isWhite ? "hsla(200, 50%, 45%, 0.4)" : "hsla(200, 60%, 50%, 0.5)")
            : (isWhite ? "hsla(0, 0%, 10%, 0.2)" : "hsla(0, 0%, 10%, 0.45)"),
          border: `1px solid ${isFocus
            ? (isWhite ? "hsla(200, 50%, 35%, 0.6)" : "hsla(200, 60%, 65%, 0.55)")
            : (isWhite ? "hsla(0, 0%, 10%, 0.35)" : "hsla(0, 0%, 80%, 0.25)")}`,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow: "0 2px 8px hsla(0, 0%, 0%, 0.3)",
        }}
      >
        {/* Thumb */}
        <div
          className="absolute left-[3px] rounded-full transition-all duration-500"
          style={{
            width: 10,
            height: 10,
            top: isFocus ? 23 : 3,
            background: isFocus
              ? (isWhite ? "hsla(200, 60%, 40%, 1)" : "hsla(200, 70%, 70%, 1)")
              : (isWhite ? "hsla(0, 0%, 15%, 0.8)" : "hsla(0, 0%, 85%, 0.7)"),
            boxShadow: isFocus
              ? (isWhite ? "0 0 12px 3px hsla(200, 60%, 40%, 0.35)" : "0 0 12px 3px hsla(200, 70%, 60%, 0.5)")
              : "0 0 4px hsla(0, 0%, 0%, 0.2)",
          }}
        />
      </div>


    </button>
  );
}
