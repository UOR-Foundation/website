/**
 * AttentionToggle — Focus ↔ Diffuse Toggle Near the Day Progress Ring
 * ═══════════════════════════════════════════════════════════════════
 *
 * A minimal, elegant toggle that sits near the ring. Two states
 * represented by a single pill with a sliding indicator.
 *
 * @module hologram-ui/components/AttentionToggle
 */

import { useAttentionMode } from "@/modules/hologram-ui/hooks/useAttentionMode";

export default function AttentionToggle() {
  const { preset, toggle } = useAttentionMode();
  const isFocus = preset === "focus";

  return (
    <button
      onClick={toggle}
      className="group flex items-center gap-2 transition-all duration-700"
      aria-label={`Switch to ${isFocus ? "diffuse" : "focus"} mode`}
      title={isFocus ? "Focus · Deep, distraction-free" : "Diffuse · Open, receptive"}
    >
      {/* Label */}
      <span
        className="text-[8px] tracking-[0.3em] uppercase transition-all duration-700"
        style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          color: isFocus
            ? "hsla(38, 15%, 80%, 0.5)"
            : "hsla(38, 15%, 80%, 0.35)",
        }}
      >
        {isFocus ? "Focus" : "Diffuse"}
      </span>

      {/* Pill */}
      <div
        className="relative w-7 h-[14px] rounded-full transition-all duration-700"
        style={{
          background: isFocus
            ? "hsla(38, 20%, 40%, 0.15)"
            : "hsla(38, 20%, 50%, 0.12)",
          border: `1px solid ${isFocus
            ? "hsla(38, 25%, 55%, 0.2)"
            : "hsla(38, 15%, 60%, 0.12)"
          }`,
        }}
      >
        {/* Sliding dot */}
        <div
          className="absolute top-[2px] w-[8px] h-[8px] rounded-full transition-all duration-700 ease-in-out"
          style={{
            left: isFocus ? "2px" : "15px",
            background: isFocus
              ? "hsla(38, 35%, 65%, 0.8)"
              : "hsla(38, 25%, 60%, 0.5)",
            boxShadow: isFocus
              ? "0 0 6px 1px hsla(38, 40%, 60%, 0.3)"
              : "0 0 4px 1px hsla(38, 25%, 55%, 0.15)",
          }}
        />
      </div>
    </button>
  );
}
