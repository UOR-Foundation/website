/**
 * AmbientMoodWidget — Dark-frame exclusive
 * ═════════════════════════════════════════
 * A meditative mood selector with gentle glowing orbs.
 * Selecting a mood shifts the ambient feel of the dark frame.
 */

import { useState } from "react";

interface Mood {
  label: string;
  hue: number;
  message: string;
}

const MOODS: Mood[] = [
  { label: "Calm",    hue: 220, message: "Breathe in stillness." },
  { label: "Focus",   hue: 270, message: "Sharpen your intent." },
  { label: "Warm",    hue: 30,  message: "Embrace the glow." },
  { label: "Dream",   hue: 300, message: "Let your mind drift." },
];

export default function AmbientMoodWidget() {
  const [selected, setSelected] = useState(0);
  const mood = MOODS[selected];

  return (
    <div
      className="flex flex-col items-center gap-4 select-none px-6 py-5"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      {/* Mood orb */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: 72, height: 72 }}
      >
        {/* Glow */}
        <div
          className="absolute rounded-full"
          style={{
            width: 72,
            height: 72,
            background: `radial-gradient(circle, hsla(${mood.hue}, 50%, 55%, 0.25) 0%, transparent 70%)`,
            filter: "blur(12px)",
            animation: "ambient-glow-breathe 4s ease-in-out infinite",
            transition: "background 800ms ease",
          }}
        />
        {/* Core */}
        <div
          className="rounded-full"
          style={{
            width: 24,
            height: 24,
            background: `radial-gradient(circle, hsla(${mood.hue}, 55%, 65%, 0.9) 0%, hsla(${mood.hue}, 45%, 45%, 0.6) 100%)`,
            boxShadow: `0 0 20px 4px hsla(${mood.hue}, 50%, 55%, 0.3)`,
            transition: "all 800ms ease",
          }}
        />
      </div>

      {/* Message */}
      <span
        style={{
          fontSize: "12px",
          color: "hsla(0, 0%, 85%, 0.6)",
          fontStyle: "italic",
          letterSpacing: "0.04em",
          transition: "color 600ms ease",
          minHeight: 18,
          textAlign: "center",
        }}
      >
        {mood.message}
      </span>

      {/* Mood pills */}
      <div className="flex items-center gap-1.5">
        {MOODS.map((m, i) => {
          const active = i === selected;
          return (
            <button
              key={m.label}
              onClick={() => setSelected(i)}
              className="rounded-full transition-all duration-300"
              style={{
                padding: "4px 12px",
                fontSize: "10px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontWeight: active ? 500 : 400,
                color: active
                  ? `hsla(${m.hue}, 50%, 75%, 0.95)`
                  : "hsla(0, 0%, 70%, 0.45)",
                background: active
                  ? `hsla(${m.hue}, 40%, 50%, 0.15)`
                  : "transparent",
                border: `1px solid ${
                  active
                    ? `hsla(${m.hue}, 40%, 60%, 0.25)`
                    : "hsla(0, 0%, 50%, 0.12)"
                }`,
              }}
              aria-label={m.label}
            >
              {m.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
