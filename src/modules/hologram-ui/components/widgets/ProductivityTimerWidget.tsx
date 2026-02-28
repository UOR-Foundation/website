/**
 * ProductivityTimerWidget — Light-frame exclusive
 * ════════════════════════════════════════════════
 * Simple Pomodoro-style focus timer with start/pause/reset.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { sf } from "@/modules/hologram-ui/utils/scaledFontSize";

const FOCUS_DURATION = 25 * 60; // 25 minutes

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function ProductivityTimerWidget() {
  const [remaining, setRemaining] = useState(FOCUS_DURATION);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const toggle = useCallback(() => setRunning((r) => !r), []);
  const reset = useCallback(() => {
    setRunning(false);
    setRemaining(FOCUS_DURATION);
  }, []);

  const progress = 1 - remaining / FOCUS_DURATION;
  const circumference = 2 * Math.PI * 38;
  const dashOffset = circumference * (1 - progress);

  return (
    <div
      className="flex flex-col items-center gap-3 select-none px-6 py-5"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      {/* Ring */}
      <div className="relative flex items-center justify-center" style={{ width: 96, height: 96 }}>
        <svg width={96} height={96} viewBox="0 0 96 96" className="absolute inset-0">
          {/* Track */}
          <circle
            cx={48} cy={48} r={38}
            fill="none"
            stroke="hsla(0, 0%, 0%, 0.12)"
            strokeWidth={3}
          />
          {/* Progress */}
          <circle
            cx={48} cy={48} r={38}
            fill="none"
            stroke="hsla(0, 0%, 15%, 0.7)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 48 48)"
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>

        {/* Time */}
        <span
          style={{
            fontSize: remaining === 0 ? sf(14) : sf(22),
            fontWeight: 300,
            color: "hsla(0, 0%, 10%, 0.85)",
            fontFamily: "'Playfair Display', serif",
            letterSpacing: "0.04em",
          }}
        >
          {remaining === 0 ? "Done ✓" : formatTime(remaining)}
        </span>
      </div>

      {/* Label */}
      <span
        style={{
          fontSize: sf(12),
          letterSpacing: "0.35em",
          textTransform: "uppercase",
          color: "hsla(0, 0%, 15%, 0.7)",
          fontWeight: 500,
        }}
      >
        Focus Session
      </span>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggle}
          className="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 hover:scale-110"
          style={{
            background: running ? "hsla(0, 0%, 0%, 0.08)" : "hsla(0, 0%, 0%, 0.1)",
            color: "hsla(0, 0%, 10%, 0.8)",
          }}
          aria-label={running ? "Pause" : "Start"}
        >
          {running ? <Pause size={14} strokeWidth={1.8} /> : <Play size={14} strokeWidth={1.8} />}
        </button>
        <button
          onClick={reset}
          className="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 hover:scale-110"
          style={{
            background: "hsla(0, 0%, 0%, 0.07)",
            color: "hsla(0, 0%, 10%, 0.65)",
          }}
          aria-label="Reset"
        >
          <RotateCcw size={13} strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}
