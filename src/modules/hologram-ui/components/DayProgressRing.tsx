/**
 * DayProgressRing — Circular day-progress indicator
 * Shows percentage of the current day elapsed, tied to local device time.
 * Future: will support Learning / Working / Playing activity segments.
 */

import { useState, useEffect } from "react";

function getDayProgress(): number {
  const now = new Date();
  const seconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  return seconds / 86400;
}

const SIZE = 96;
const STROKE = 3;
const RADIUS = (SIZE - STROKE * 2) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function DayProgressRing() {
  const [progress, setProgress] = useState(getDayProgress);

  useEffect(() => {
    const id = setInterval(() => setProgress(getDayProgress()), 10_000);
    return () => clearInterval(id);
  }, []);

  const pct = Math.round(progress * 100);
  const offset = CIRCUMFERENCE * (1 - progress);

  return (
    <div className="group relative flex flex-col items-center gap-2 cursor-default select-none">
      {/* Ring container */}
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="block"
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Track — barely-there warm ring */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="hsla(38, 12%, 60%, 0.10)"
            strokeWidth={STROKE}
          />
          {/* Progress arc — warm gold, smooth animation */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="hsla(38, 35%, 62%, 0.7)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
          />
          {/* Subtle glow dot at the leading edge of the arc — heartbeat pulse */}
          <circle
            cx={SIZE / 2 + RADIUS * Math.cos(2 * Math.PI * progress)}
            cy={SIZE / 2 + RADIUS * Math.sin(2 * Math.PI * progress)}
            r={4}
            fill="hsla(38, 40%, 65%, 0.6)"
            style={{
              transition: "cx 1.2s ease-out, cy 1.2s ease-out",
              filter: "blur(2px)",
              animation: "dot-heartbeat 1.2s ease-in-out infinite",
            }}
          />
        </svg>

        {/* Slow breathing glow behind the ring */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, hsla(38, 35%, 55%, 0.08) 0%, transparent 70%)",
            animation: "ring-breathe 6s ease-in-out infinite",
          }}
        />

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-xl font-light leading-none"
            style={{
              fontFamily: "'Playfair Display', serif",
              color: "hsla(38, 15%, 92%, 0.92)",
              fontWeight: 300,
            }}
          >
            {pct}%
          </span>
        </div>
      </div>

      {/* Label — higher contrast */}
      <span
        className="text-[9px] tracking-[0.4em] uppercase"
        style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          color: "hsla(38, 15%, 80%, 0.6)",
          fontWeight: 400,
        }}
      >
        Today
      </span>

      {/* Tooltip on hover */}
      <div
        className="absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none whitespace-nowrap"
        style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontSize: "10px",
          letterSpacing: "0.12em",
          color: "hsla(38, 15%, 85%, 0.6)",
          background: "hsla(30, 8%, 10%, 0.7)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          padding: "5px 12px",
          borderRadius: "6px",
          border: "1px solid hsla(38, 15%, 60%, 0.08)",
        }}
      >
        {pct}% of your day has passed
      </div>

      {/* Keyframe for breathing glow */}
      <style>{`
        @keyframes ring-breathe {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.06); }
        }
        @keyframes dot-heartbeat {
          0%, 100% { opacity: 0.6; r: 4; }
          14% { opacity: 1; r: 5.5; }
          28% { opacity: 0.7; r: 4.2; }
          42% { opacity: 0.95; r: 5; }
          56% { opacity: 0.6; r: 4; }
        }
      `}</style>
    </div>
  );
}
