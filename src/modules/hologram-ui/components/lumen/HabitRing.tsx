/**
 * Habit Ring — Procedural Memory Visualization
 * ═════════════════════════════════════════════
 *
 * A radial arc visualization of the cerebellar habit system.
 * Each habit is a proportional arc in a ring, colored by success rate
 * and annotated with fire count. The ring pulses gently when new habits
 * are being learned (isLearning = true).
 *
 * 3-6-9 Mapping:
 *   3 — STRUCTURE:  Pattern count + habit count (what the cerebellum tracks)
 *   6 — EVOLUTION:  Learning indicator + acceleration factor (the system improving)
 *   9 — COMPLETION: Success rate + time saved (verified operational benefit)
 *
 * @module hologram-ui/components/lumen/HabitRing
 */

import { memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ProceduralProjection, HabitRingEntry } from "@/hologram/kernel/procedural-memory";

// ── Constants ────────────────────────────────────────────────────────────

const RING_SIZE = 64;
const RING_CENTER = RING_SIZE / 2;
const RING_RADIUS = 24;
const RING_STROKE = 4;
const INNER_RADIUS = RING_RADIUS - RING_STROKE / 2;
const TAU = Math.PI * 2;

const GRADE_COLORS: Record<string, string> = {
  A: "hsla(152, 45%, 55%, 0.7)",
  B: "hsla(200, 40%, 55%, 0.65)",
  C: "hsla(38, 40%, 55%, 0.5)",
  D: "hsla(0, 30%, 50%, 0.4)",
};

function habitColor(entry: HabitRingEntry): string {
  if (!entry.active) return "hsla(220, 10%, 40%, 0.3)";
  if (entry.successRate >= 0.9) return GRADE_COLORS.A;
  if (entry.successRate >= 0.7) return GRADE_COLORS.B;
  if (entry.successRate >= 0.4) return GRADE_COLORS.C;
  return GRADE_COLORS.D;
}

/** Convert polar to cartesian */
function polarToCart(angle: number, radius: number): [number, number] {
  return [
    RING_CENTER + radius * Math.cos(angle - Math.PI / 2),
    RING_CENTER + radius * Math.sin(angle - Math.PI / 2),
  ];
}

/** SVG arc path */
function arcPath(startAngle: number, endAngle: number, radius: number): string {
  const [sx, sy] = polarToCart(startAngle, radius);
  const [ex, ey] = polarToCart(endAngle, radius);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${sx} ${sy} A ${radius} ${radius} 0 ${largeArc} 1 ${ex} ${ey}`;
}

// ── Component ────────────────────────────────────────────────────────────

interface HabitRingProps {
  projection: ProceduralProjection;
  /** Aperture-driven scale (0.5–1.0) */
  scale?: number;
}

function HabitRingInner({ projection, scale = 1 }: HabitRingProps) {
  const { topHabits, habitCount, patternCount, isLearning, totalTimeSavedMs, accelerationFactor, meanSuccessRate } = projection;

  const arcs = useMemo(() => {
    if (topHabits.length === 0) return [];

    let currentAngle = 0;
    const GAP = 0.04; // Small gap between arcs
    const totalGap = GAP * topHabits.length;
    const availableAngle = TAU - totalGap;

    return topHabits.map((entry) => {
      const startAngle = currentAngle;
      const sweep = entry.arcWeight * availableAngle;
      const endAngle = startAngle + sweep;
      currentAngle = endAngle + GAP;

      return {
        entry,
        path: arcPath(startAngle, endAngle, RING_RADIUS),
        color: habitColor(entry),
        startAngle,
        endAngle,
      };
    });
  }, [topHabits]);

  const scaledSize = RING_SIZE * scale;

  if (habitCount === 0 && patternCount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2"
      title={`Procedural Memory: ${habitCount} habits, ${patternCount} patterns tracked`}
    >
      {/* The Ring SVG */}
      <motion.svg
        width={scaledSize}
        height={scaledSize}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        className="flex-shrink-0"
        animate={isLearning ? {
          filter: [
            "drop-shadow(0 0 2px hsla(38, 40%, 55%, 0.0))",
            "drop-shadow(0 0 4px hsla(38, 40%, 55%, 0.25))",
            "drop-shadow(0 0 2px hsla(38, 40%, 55%, 0.0))",
          ],
        } : undefined}
        transition={isLearning ? { duration: 3, repeat: Infinity, ease: "easeInOut" } : undefined}
      >
        {/* Background ring */}
        <circle
          cx={RING_CENTER}
          cy={RING_CENTER}
          r={RING_RADIUS}
          fill="none"
          stroke="hsla(220, 10%, 25%, 0.15)"
          strokeWidth={RING_STROKE}
        />

        {/* Habit arcs */}
        {arcs.map(({ entry, path, color }, i) => (
          <motion.path
            key={entry.id}
            d={path}
            fill="none"
            stroke={color}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: i * 0.08, ease: "easeOut" }}
          />
        ))}

        {/* Center text — acceleration factor */}
        <text
          x={RING_CENTER}
          y={RING_CENTER - 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill="hsla(38, 15%, 65%, 0.6)"
          fontSize="8"
          fontFamily="system-ui, monospace"
          fontWeight="500"
        >
          {habitCount > 0 ? `${(accelerationFactor * 100).toFixed(0)}%` : patternCount.toString()}
        </text>
        <text
          x={RING_CENTER}
          y={RING_CENTER + 7}
          textAnchor="middle"
          dominantBaseline="central"
          fill="hsla(38, 15%, 55%, 0.35)"
          fontSize="5"
          fontFamily="system-ui, monospace"
        >
          {habitCount > 0 ? "accel" : "patterns"}
        </text>
      </motion.svg>

      {/* Compact stats — visible only at higher detail levels */}
      {scale >= 0.75 && (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span
              className="text-[8px] font-mono tracking-wider"
              style={{ color: "hsla(38, 15%, 65%, 0.5)" }}
            >
              {habitCount} habit{habitCount !== 1 ? "s" : ""}
            </span>
            {isLearning && (
              <motion.span
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-[7px]"
                style={{ color: "hsla(38, 40%, 55%, 0.5)" }}
              >
                learning
              </motion.span>
            )}
          </div>
          {habitCount > 0 && (
            <span
              className="text-[7px] font-mono tracking-wider"
              style={{ color: "hsla(152, 30%, 55%, 0.4)" }}
            >
              {(meanSuccessRate * 100).toFixed(0)}% success · {formatTimeSaved(totalTimeSavedMs)}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}

function formatTimeSaved(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export default memo(HabitRingInner);
