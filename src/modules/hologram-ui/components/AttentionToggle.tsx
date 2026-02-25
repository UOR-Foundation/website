/**
 * AttentionToggle — Binary Focus Mode Toggle (Right Edge)
 * ═══════════════════════════════════════════════════════
 *
 * A minimal toggle fixed to the right edge of the viewport.
 * Always accessible (z-[60]) — floats above modals and overlays.
 * Binary: Diffuse (open) ↔ Focus (deep).
 *
 * @module hologram-ui/components/AttentionToggle
 */

import { useState } from "react";
import { Settings } from "lucide-react";
import ContextPreferencesPanel from "./ContextPreferencesPanel";
import { useAttentionMode } from "@/modules/hologram-ui/hooks/useAttentionMode";

export default function AttentionToggle() {
  const { preset, toggle } = useAttentionMode();
  const [hovered, setHovered] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);

  const isFocus = preset === "focus";
  const restOpacity = hovered ? 1 : 0.6;

  return (
    <div
      className="fixed right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3 select-none"
      style={{
        zIndex: 60,
        opacity: restOpacity,
        transition: "opacity 0.5s ease",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Title label */}
      <span
        style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontSize: 8,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontWeight: 500,
          color: "hsla(38, 15%, 85%, 0.7)",
          writingMode: "vertical-rl",
          textOrientation: "mixed",
        }}
      >
        Focus Mode
      </span>

      {/* ON / OFF state label */}
      <span
        style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontSize: 8,
          letterSpacing: "0.15em",
          fontWeight: 600,
          color: isFocus ? "hsla(38, 45%, 70%, 0.9)" : "hsla(38, 15%, 70%, 0.55)",
        }}
      >
        {isFocus ? "ON" : "OFF"}
      </span>

      {/* Toggle pill */}
      <button
        onClick={toggle}
        aria-label={`Focus mode: ${isFocus ? "on" : "off"}. Click to toggle.`}
        className="relative rounded-full transition-all duration-500"
        style={{
          width: 12,
          height: 28,
          background: isFocus
            ? "hsla(38, 35%, 55%, 0.25)"
            : "hsla(38, 15%, 50%, 0.1)",
          border: `1px solid hsla(38, 20%, 55%, ${isFocus ? 0.3 : 0.1})`,
        }}
      >
        {/* Thumb */}
        <div
          className="absolute left-[1px] rounded-full transition-all duration-500"
          style={{
            width: 8,
            height: 8,
            top: isFocus ? 17 : 1,
            background: isFocus
              ? "hsla(38, 40%, 65%, 0.9)"
              : "hsla(38, 20%, 65%, 0.35)",
            boxShadow: isFocus
              ? "0 0 6px 1px hsla(38, 50%, 65%, 0.35)"
              : "none",
          }}
        />
      </button>

      {/* Context preferences */}
      <button
        onClick={() => setContextOpen(true)}
        className="p-1 rounded-full transition-opacity duration-400"
        style={{
          opacity: hovered ? 0.5 : 0.15,
          color: "hsl(38, 15%, 75%)",
        }}
        title="Signal context preferences"
      >
        <Settings size={10} />
      </button>

      <ContextPreferencesPanel open={contextOpen} onClose={() => setContextOpen(false)} />
    </div>
  );
}
