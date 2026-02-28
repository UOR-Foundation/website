/**
 * TextSizeControl — User text size preference selector
 * ═════════════════════════════════════════════════════
 *
 * Three levels that scale all Hologram text proportionally.
 * The system serves the human's visual comfort — not the reverse.
 */

import { type TextSize } from "@/modules/hologram-ui/hooks/useTextSize";

interface TextSizeControlProps {
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
  /** Palette mode for styling */
  bgMode?: "image" | "white" | "dark";
}

const OPTIONS: { value: TextSize; label: string; preview: string }[] = [
  { value: "compact", label: "Compact", preview: "A" },
  { value: "default", label: "Default", preview: "A" },
  { value: "large",   label: "Large",   preview: "A" },
];

export default function TextSizeControl({ textSize, setTextSize, bgMode = "dark" }: TextSizeControlProps) {
  const isLight = bgMode === "white";
  const mutedColor = isLight ? "hsl(0, 0%, 45%)" : "hsl(38, 8%, 55%)";
  const activeColor = isLight ? "hsl(0, 0%, 12%)" : "hsl(38, 15%, 88%)";
  const activeBg = isLight ? "hsla(0, 0%, 0%, 0.06)" : "hsla(38, 20%, 85%, 0.1)";

  return (
    <div style={{ padding: "var(--holo-space-3) var(--holo-space-4)" }}>
      <p
        style={{
          fontSize: "var(--holo-text-xs)",
          color: mutedColor,
          marginBottom: "var(--holo-space-2)",
          letterSpacing: "0.08em",
          textTransform: "uppercase" as const,
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}
      >
        Text Size
      </p>
      <div
        style={{
          display: "flex",
          gap: "var(--holo-space-1)",
          borderRadius: "10px",
          padding: "3px",
          background: isLight ? "hsla(0, 0%, 0%, 0.03)" : "hsla(38, 12%, 90%, 0.04)",
        }}
      >
        {OPTIONS.map((opt) => {
          const isActive = textSize === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setTextSize(opt.value)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "2px",
                padding: "var(--holo-space-2) var(--holo-space-1)",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                transition: "all 200ms ease",
                background: isActive ? activeBg : "transparent",
                color: isActive ? activeColor : mutedColor,
                fontFamily: "'DM Sans', system-ui, sans-serif",
              }}
            >
              <span
                style={{
                  fontSize: opt.value === "compact" ? "13px" : opt.value === "large" ? "19px" : "16px",
                  fontWeight: 500,
                  lineHeight: 1,
                }}
              >
                {opt.preview}
              </span>
              <span style={{ fontSize: "10px", opacity: 0.7 }}>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
