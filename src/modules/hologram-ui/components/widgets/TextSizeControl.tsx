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

/* Golden ratio sizing: 13 × φ⁰ ≈ 13, 13 × φ¹ ≈ 21, 13 × φ² ≈ 34 — but capped for legibility */
const OPTIONS: { value: TextSize; fontSize: number }[] = [
  { value: "compact", fontSize: 13 },
  { value: "default", fontSize: 18 },
  { value: "large",   fontSize: 24 },
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
        gap: 5,           /* GR.xs — golden ratio smallest step */
        borderRadius: "13px",  /* GR.md */
        padding: "5px 8px",   /* GR.xs / GR.sm */
        background: trackBg,
        margin: "0 13px 5px", /* GR.md horizontal, GR.xs bottom */
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
              height: 42,           /* ~GR.xl × φ⁻¹ ≈ 34 × 1.24, comfortable touch target */
              minWidth: 42,
              borderRadius: "8px",
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
