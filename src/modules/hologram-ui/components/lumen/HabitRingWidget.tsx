/**
 * HabitRingWidget — Procedural Memory visualization in the bloom
 * ═══════════════════════════════════════════════════════════════
 *
 * Radial ring showing active habit kernels with:
 *   • Arc segments proportional to fire count
 *   • Color-coded by epistemic grade
 *   • Center readout: total acceleration factor
 *   • Expandable habit detail cards
 *
 * @module hologram-ui/components/lumen/HabitRingWidget
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, TrendingUp, Clock, ChevronDown, ChevronUp, RotateCw } from "lucide-react";
import { PP } from "@/modules/hologram-ui/theme/portal-palette";
import {
  getActiveHabits,
  runProceduralMemoryCycle,
  type HabitKernel,
} from "@/modules/hologram-ui/engines/ProceduralMemoryEngine";

const ORGANIC_EASE = [0.23, 1, 0.32, 1] as const;

const GRADE_COLORS: Record<string, string> = {
  A: "hsl(38, 50%, 65%)",
  B: "hsl(200, 45%, 60%)",
  C: "hsl(260, 35%, 55%)",
  D: "hsl(0, 0%, 50%)",
};

interface HabitRingWidgetProps {
  active: boolean;
}

export default function HabitRingWidget({ active }: HabitRingWidgetProps) {
  const [habits, setHabits] = useState<HabitKernel[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchHabits = useCallback(async () => {
    const data = await getActiveHabits();
    setHabits(data);
    setLoading(false);
  }, []);

  const runScan = useCallback(async () => {
    setScanning(true);
    const result = await runProceduralMemoryCycle();
    setHabits(result.activeHabits);
    setScanning(false);
  }, []);

  useEffect(() => {
    if (active) fetchHabits();
  }, [active, fetchHabits]);

  const totalFires = habits.reduce((s, h) => s + h.fireCount, 0);
  const totalTimeSaved = habits.reduce((s, h) => s + h.totalTimeSavedMs, 0);
  const avgAcceleration = habits.length > 0
    ? habits.reduce((s, h) => s + h.accelerationFactor, 0) / habits.length
    : 1;
  const maxFires = Math.max(...habits.map(h => h.fireCount), 1);

  // SVG ring data
  const ringRadius = 52;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * ringRadius;
  const activeHabits = habits.filter(h => h.status === "active");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ease: ORGANIC_EASE }}
      className="mx-4 rounded-xl overflow-hidden"
      style={{
        background: PP.canvasSubtle,
        border: `1px solid ${PP.bloomCardBorder}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4" strokeWidth={1.5} style={{ color: PP.accent }} />
          <span
            style={{
              fontFamily: PP.font,
              fontSize: "12px",
              fontWeight: 600,
              color: PP.text,
              letterSpacing: "0.02em",
            }}
          >
            Procedural Memory
          </span>
          <span
            className="px-1.5 py-0.5 rounded-md"
            style={{
              fontFamily: PP.font,
              fontSize: "9px",
              fontWeight: 500,
              color: PP.accent,
              background: `${PP.accent}12`,
              letterSpacing: "0.06em",
            }}
          >
            {activeHabits.length} HABIT{activeHabits.length !== 1 ? "S" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={runScan}
            disabled={scanning}
            className="p-1.5 rounded-lg active:scale-90 transition-transform"
            style={{ background: `${PP.accent}08` }}
            title="Scan for new patterns"
          >
            <RotateCw
              className={`w-3.5 h-3.5 ${scanning ? "animate-spin" : ""}`}
              strokeWidth={1.5}
              style={{ color: PP.accent, opacity: 0.7 }}
            />
          </button>
          <button
            onClick={() => setExpanded(p => !p)}
            className="p-1.5 rounded-lg active:scale-90 transition-transform"
            style={{ background: `${PP.accent}08` }}
          >
            {expanded
              ? <ChevronUp className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: PP.textWhisper }} />
              : <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: PP.textWhisper }} />
            }
          </button>
        </div>
      </div>

      {/* Ring + Stats */}
      <div className="flex items-center gap-4 px-4 pb-3">
        {/* SVG Ring */}
        <div className="relative shrink-0" style={{ width: 120, height: 120 }}>
          <svg width={120} height={120} viewBox="0 0 120 120">
            {/* Background ring */}
            <circle
              cx={60} cy={60} r={ringRadius}
              fill="none"
              stroke={PP.bloomCardBorder}
              strokeWidth={strokeWidth}
              opacity={0.4}
            />
            {/* Habit arcs */}
            {activeHabits.map((habit, i) => {
              const share = habit.fireCount / Math.max(totalFires, 1);
              const offset = activeHabits
                .slice(0, i)
                .reduce((s, h) => s + (h.fireCount / Math.max(totalFires, 1)), 0);
              const dashLen = circumference * share * 0.95;
              const dashOffset = -circumference * offset;
              const color = GRADE_COLORS[habit.epistemicGrade] || GRADE_COLORS.D;

              return (
                <motion.circle
                  key={habit.id}
                  cx={60} cy={60} r={ringRadius}
                  fill="none"
                  stroke={color}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                  strokeDashoffset={dashOffset}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.85 }}
                  transition={{ delay: i * 0.1, ease: ORGANIC_EASE }}
                  style={{ transform: "rotate(-90deg)", transformOrigin: "60px 60px" }}
                />
              );
            })}
          </svg>
          {/* Center readout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              style={{
                fontFamily: PP.font,
                fontSize: "20px",
                fontWeight: 700,
                color: PP.accent,
                lineHeight: 1,
              }}
            >
              {avgAcceleration.toFixed(1)}×
            </span>
            <span
              style={{
                fontFamily: PP.font,
                fontSize: "8px",
                color: PP.textWhisper,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginTop: 2,
              }}
            >
              Accel
            </span>
          </div>
        </div>

        {/* Stats column */}
        <div className="flex-1 space-y-2.5">
          <StatRow
            icon={<Zap className="w-3 h-3" strokeWidth={1.5} />}
            label="Total fires"
            value={totalFires.toLocaleString()}
          />
          <StatRow
            icon={<TrendingUp className="w-3 h-3" strokeWidth={1.5} />}
            label="Avg success"
            value={habits.length > 0
              ? `${Math.round(habits.reduce((s, h) => s + h.successRate, 0) / habits.length * 100)}%`
              : "—"
            }
          />
          <StatRow
            icon={<Clock className="w-3 h-3" strokeWidth={1.5} />}
            label="Time saved"
            value={totalTimeSaved > 60000
              ? `${(totalTimeSaved / 60000).toFixed(1)}m`
              : `${(totalTimeSaved / 1000).toFixed(1)}s`
            }
          />
        </div>
      </div>

      {/* Expanded habit cards */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ ease: ORGANIC_EASE }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-2">
              {habits.length === 0 && (
                <p
                  className="text-center py-4"
                  style={{ fontFamily: PP.font, fontSize: "12px", color: PP.textWhisper }}
                >
                  No habits detected yet. Use the scan button to analyze reward traces.
                </p>
              )}
              {habits.map((habit, i) => (
                <motion.div
                  key={habit.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, ease: ORGANIC_EASE }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{
                    background: `${GRADE_COLORS[habit.epistemicGrade] || GRADE_COLORS.D}08`,
                    border: `1px solid ${GRADE_COLORS[habit.epistemicGrade] || GRADE_COLORS.D}15`,
                  }}
                >
                  {/* Fire bar */}
                  <div className="w-1 self-stretch rounded-full" style={{
                    background: GRADE_COLORS[habit.epistemicGrade] || GRADE_COLORS.D,
                    opacity: 0.5,
                  }} />

                  <div className="flex-1 min-w-0">
                    <p
                      className="truncate"
                      style={{ fontFamily: PP.font, fontSize: "12px", fontWeight: 500, color: PP.text }}
                    >
                      {habit.name}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span style={{ fontFamily: PP.font, fontSize: "10px", color: PP.textWhisper }}>
                        {habit.patternActions.join(" → ")}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-0.5">
                    <span
                      className="px-1.5 py-0.5 rounded text-center"
                      style={{
                        fontFamily: PP.font,
                        fontSize: "9px",
                        fontWeight: 600,
                        color: GRADE_COLORS[habit.epistemicGrade],
                        background: `${GRADE_COLORS[habit.epistemicGrade]}12`,
                        minWidth: 24,
                      }}
                    >
                      {habit.epistemicGrade}
                    </span>
                    <span style={{ fontFamily: PP.font, fontSize: "9px", color: PP.textWhisper }}>
                      {habit.fireCount}× fired
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <div style={{ color: PP.accent, opacity: 0.6 }}>{icon}</div>
      <span style={{ fontFamily: PP.font, fontSize: "11px", color: PP.textWhisper, flex: 1 }}>{label}</span>
      <span style={{ fontFamily: PP.font, fontSize: "12px", fontWeight: 600, color: PP.text }}>{value}</span>
    </div>
  );
}
