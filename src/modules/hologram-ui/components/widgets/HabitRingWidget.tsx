/**
 * Habit Ring Widget — Phase 5 Visualization
 * ═══════════════════════════════════════════
 *
 * A radial ring showing learned procedural habits.
 * Each arc represents a habit, sized by fire count,
 * colored by success rate (green = high, amber = degrading).
 *
 * Center displays the acceleration factor and total time saved.
 *
 * @module hologram-ui/components/widgets/HabitRingWidget
 */

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCoherence } from "@/modules/hologram-os/hooks/useCoherence";
import type { HabitRingEntry, ProceduralProjection } from "@/hologram/kernel/procedural-memory";

// ── Arc geometry helpers ───────────────────────────────────────────────

function polarToCart(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCart(cx, cy, r, endAngle);
  const end = polarToCart(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function successColor(rate: number): string {
  if (rate >= 0.8) return "hsl(var(--primary))";
  if (rate >= 0.5) return "hsl(45, 80%, 55%)";
  return "hsl(0, 70%, 55%)";
}

// ── Component ──────────────────────────────────────────────────────────

interface HabitRingWidgetProps {
  procedural?: ProceduralProjection;
}

export const HabitRingWidget: React.FC<HabitRingWidgetProps> = ({ procedural: externalProc }) => {
  const { procedural: hookProc } = useCoherence();
  const proc = externalProc ?? hookProc;

  // Default state when no projection
  const projection: ProceduralProjection = proc ?? {
    patternCount: 0,
    habitCount: 0,
    activeHabits: 0,
    totalFires: 0,
    totalTimeSavedMs: 0,
    meanSuccessRate: 0,
    lastFiredLabel: "",
    topHabits: [],
    isLearning: false,
    accelerationFactor: 0,
  };

  const arcs = useMemo(() => {
    if (projection.topHabits.length === 0) return [];

    const GAP = 4; // degrees between arcs
    const totalGap = GAP * projection.topHabits.length;
    const available = 360 - totalGap;
    let cursor = 0;

    return projection.topHabits.map((h) => {
      const sweep = Math.max(8, h.arcWeight * available); // min 8° for visibility
      const startAngle = cursor;
      const endAngle = cursor + sweep;
      cursor = endAngle + GAP;

      return {
        ...h,
        startAngle,
        endAngle,
        color: successColor(h.successRate),
      };
    });
  }, [projection.topHabits]);

  const timeSaved = projection.totalTimeSavedMs < 1000
    ? `${Math.round(projection.totalTimeSavedMs)}ms`
    : `${(projection.totalTimeSavedMs / 1000).toFixed(1)}s`;

  const accelPct = (projection.accelerationFactor * 100).toFixed(0);

  const cx = 64, cy = 64, r = 52;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Ring SVG */}
      <div className="relative w-32 h-32">
        <svg
          viewBox="0 0 128 128"
          className="w-full h-full"
          style={{ filter: "drop-shadow(0 0 6px hsl(var(--primary) / 0.2))" }}
        >
          {/* Background ring track */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="hsl(var(--muted) / 0.3)"
            strokeWidth={6}
          />

          {/* Habit arcs */}
          <AnimatePresence>
            {arcs.map((arc) => (
              <motion.path
                key={arc.id}
                d={describeArc(cx, cy, r, arc.startAngle, arc.endAngle)}
                fill="none"
                stroke={arc.color}
                strokeWidth={arc.active ? 6 : 3}
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: arc.active ? 1 : 0.4 }}
                exit={{ pathLength: 0, opacity: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            ))}
          </AnimatePresence>

          {/* Center text */}
          <text
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            className="fill-foreground"
            style={{ fontSize: "14px", fontWeight: 700 }}
          >
            {projection.habitCount}
          </text>
          <text
            x={cx}
            y={cy + 8}
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: "8px" }}
          >
            HABITS
          </text>
          <text
            x={cx}
            y={cy + 19}
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: "7px", opacity: 0.7 }}
          >
            {accelPct}% accel
          </text>
        </svg>

        {/* Learning pulse indicator */}
        {projection.isLearning && (
          <motion.div
            className="absolute top-0 right-0 w-3 h-3 rounded-full bg-primary"
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </div>

      {/* Stats row */}
      <div className="flex gap-3 text-[10px] text-muted-foreground">
        <span>🔥 {projection.totalFires} fires</span>
        <span>⚡ {timeSaved} saved</span>
        <span>📊 {projection.patternCount} patterns</span>
      </div>

      {/* Last fired */}
      {projection.lastFiredLabel && (
        <motion.div
          key={projection.lastFiredLabel}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 0.7, y: 0 }}
          className="text-[9px] text-muted-foreground truncate max-w-[140px]"
        >
          Last: {projection.lastFiredLabel}
        </motion.div>
      )}
    </div>
  );
};

export default HabitRingWidget;
