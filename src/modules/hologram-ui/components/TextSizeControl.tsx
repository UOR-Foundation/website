/**
 * TextSizeControl — Elegant text scale selector
 * ═══════════════════════════════════════════════
 *
 * Three "A" glyphs at proportional sizes — self-explanatory,
 * no label needed. The active state uses a soft pill highlight.
 */

import { type TextSize } from "@/modules/hologram-ui/hooks/useTextSize";

interface TextSizeControlProps {
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
  bgMode?: "image" | "white" | "dark";
}

const OPTIONS: { value: TextSize; fontSize: number }[] = [
  { value: "compact", fontSize: 12 },
  { value: "default", fontSize: 16 },
  { value: "large",   fontSize: 21 },
];

export default function TextSizeControl({ textSize, setTextSize, bgMode = "dark" }: TextSizeControlProps) {
  const isLight = bgMode === "white";
  const mutedColor = isLight ? "hsl(0, 0%, 52%)" : "hsl(38, 6%, 48%)";
  const activeColor = isLight ? "hsl(0, 0%, 10%)" : "hsl(38, 14%, 90%)";
  const activeBg = isLight ? "hsla(0, 0%, 0%, 0.07)" : "hsla(38, 18%, 82%, 0.1)";
  const trackBg = isLight ? "hsla(0, 0%, 0%, 0.025)" : "hsla(38, 10%, 88%, 0.035)";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        gap: 0,
        borderRadius: "10px",
        padding: "3px",
        background: trackBg,
        margin: "0 8px 4px",
      }}
    >
      {OPTIONS.map((opt) => {
        const isActive = textSize === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => setTextSize(opt.value)}
            aria-label={`Text size ${opt.value}`}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 36,
              borderRadius: "7px",
              border: "none",
              cursor: "pointer",
              transition: "background 180ms ease, color 180ms ease, transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1)",
              transform: isActive ? "scale(1.12)" : "scale(1)",
              background: isActive ? activeBg : "transparent",
              color: isActive ? activeColor : mutedColor,
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: `${opt.fontSize}px`,
              fontWeight: isActive ? 600 : 400,
              lineHeight: 1,
              letterSpacing: "-0.01em",
            }}
          >
            A
          </button>
        );
      })}
    </div>
  );
}
