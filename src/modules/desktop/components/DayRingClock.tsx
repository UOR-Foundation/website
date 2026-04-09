/**
 * DayRingClock — Circular progress ring showing day elapsed (7 AM → 7 PM).
 * Click to toggle between time/date and day-progress percentage.
 */

import { useState } from "react";
import type { DesktopTheme } from "@/modules/desktop/hooks/useDesktopTheme";

interface Props {
  time: Date;
  theme: DesktopTheme;
  isLight: boolean;
  opacity: number;
}

/** Clamp day progress: 7:00 = 0%, 19:00 = 100% */
function getDayProgress(date: Date): number {
  const hours = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  const start = 7;
  const end = 19;
  if (hours <= start) return 0;
  if (hours >= end) return 1;
  return (hours - start) / (end - start);
}

const SIZE = 200;
const CENTER = SIZE / 2;
const RADIUS = 88;
const STROKE = 2;

const ARC_DEGREES = 280;
const GAP_START_ANGLE = 210;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ARC_LENGTH = (ARC_DEGREES / 360) * CIRCUMFERENCE;

export default function DayRingClock({ time, theme, isLight, opacity }: Props) {
  const [showProgress, setShowProgress] = useState(false);
  const progress = getDayProgress(time);
  const filledLength = progress * ARC_LENGTH;
  const pct = Math.round(progress * 100);

  const timeStr = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  const dateStr = time.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const isImmersive = theme === "immersive";

  const trackColor = isImmersive
    ? "rgba(255,255,255,0.08)"
    : isLight
      ? "rgba(0,0,0,0.06)"
      : "rgba(255,255,255,0.08)";

  const progressColor = isImmersive
    ? "rgba(255,255,255,0.55)"
    : isLight
      ? "rgba(0,0,0,0.35)"
      : "rgba(255,255,255,0.55)";

  const timeColor = isImmersive
    ? "rgba(255,255,255,0.75)"
    : isLight
      ? "rgba(0,0,0,0.65)"
      : "rgba(255,255,255,0.70)";

  const dateColor = isImmersive
    ? "rgba(255,255,255,0.35)"
    : isLight
      ? "rgba(0,0,0,0.30)"
      : "rgba(255,255,255,0.35)";

  const rotation = GAP_START_ANGLE - 90;

  return (
    <div
      className="flex flex-col items-center select-none cursor-pointer"
      style={{
        opacity,
        transition: "opacity 300ms ease-out",
      }}
      onClick={() => setShowProgress((v) => !v)}
    >
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="overflow-visible"
      >
        {/* Track */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke={trackColor}
          strokeWidth={STROKE}
          strokeDasharray={`${ARC_LENGTH} ${CIRCUMFERENCE}`}
          strokeLinecap="round"
          transform={`rotate(${rotation} ${CENTER} ${CENTER})`}
        />
        {/* Progress arc */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke={progressColor}
          strokeWidth={STROKE}
          strokeDasharray={`${filledLength} ${CIRCUMFERENCE}`}
          strokeLinecap="round"
          transform={`rotate(${rotation} ${CENTER} ${CENTER})`}
          style={{ transition: "stroke-dasharray 1s linear" }}
        />

        {showProgress ? (
          <>
            {/* Percentage */}
            <text
              x={CENTER}
              y={CENTER - 4}
              textAnchor="middle"
              dominantBaseline="central"
              fill={timeColor}
              style={{
                fontSize: "42px",
                fontFamily: "'DM Sans', -apple-system, sans-serif",
                fontWeight: 200,
                letterSpacing: "0.04em",
              }}
            >
              {pct}%
            </text>
            {/* Label */}
            <text
              x={CENTER}
              y={CENTER + 26}
              textAnchor="middle"
              dominantBaseline="central"
              fill={dateColor}
              style={{
                fontSize: "14px",
                fontFamily: "'DM Sans', -apple-system, sans-serif",
                fontWeight: 400,
                letterSpacing: "0.04em",
              }}
            >
              of the day
            </text>
          </>
        ) : (
          <>
            {/* Time */}
            <text
              x={CENTER}
              y={CENTER - 4}
              textAnchor="middle"
              dominantBaseline="central"
              fill={timeColor}
              style={{
                fontSize: "42px",
                fontFamily: "'DM Sans', -apple-system, sans-serif",
                fontWeight: 200,
                letterSpacing: "0.08em",
              }}
            >
              {timeStr}
            </text>
            {/* Date */}
            <text
              x={CENTER}
              y={CENTER + 26}
              textAnchor="middle"
              dominantBaseline="central"
              fill={dateColor}
              style={{
                fontSize: "14px",
                fontFamily: "'DM Sans', -apple-system, sans-serif",
                fontWeight: 400,
                letterSpacing: "0.04em",
              }}
            >
              {dateStr}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
