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
      className="absolute right-10 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3 select-none transition-all duration-500"
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
            ? (isWhite ? "hsla(200, 60%, 35%, 1)" : "hsla(200, 70%, 78%, 1)")
            : (isWhite ? "hsla(0, 0%, 15%, 0.6)" : "hsla(0, 0%, 78%, 0.7)"),
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
            ? (isWhite ? "hsla(200, 50%, 45%, 0.35)" : "hsla(200, 60%, 50%, 0.4)")
            : (isWhite ? "hsla(0, 0%, 15%, 0.1)" : "hsla(0, 0%, 50%, 0.15)"),
          border: `1px solid ${isFocus
            ? (isWhite ? "hsla(200, 50%, 40%, 0.5)" : "hsla(200, 60%, 60%, 0.5)")
            : (isWhite ? "hsla(0, 0%, 15%, 0.2)" : "hsla(0, 0%, 50%, 0.25)")}`,
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
              ? (isWhite ? "hsla(200, 60%, 40%, 1)" : "hsla(200, 70%, 65%, 1)")
              : (isWhite ? "hsla(0, 0%, 30%, 0.5)" : "hsla(0, 0%, 65%, 0.5)"),
            boxShadow: isFocus
              ? (isWhite ? "0 0 10px 2px hsla(200, 60%, 40%, 0.3)" : "0 0 10px 2px hsla(200, 70%, 60%, 0.4)")
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
            ? (isWhite ? "hsla(200, 60%, 35%, 1)" : "hsla(200, 70%, 78%, 1)")
            : (isWhite ? "hsla(0, 0%, 15%, 0.6)" : "hsla(0, 0%, 75%, 0.7)"),
        }}
      >
        {isFocus ? "On" : "Off"}
      </span>

    </button>
  );
}
