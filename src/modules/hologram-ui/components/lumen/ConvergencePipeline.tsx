/**
 * ConvergencePipeline — Living Reasoning Visualization
 * ═════════════════════════════════════════════════════
 *
 * Renders the quantum reasoning pipeline as a breathing,
 * organic process: Circuit → Stabilizer → Reward → Habit → Grade.
 * Each stage pulses with coherence-driven animation.
 */

import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";

export type PipelineStage =
  | "idle"
  | "decomposing"    // Breaking query into claims
  | "compiling"      // Building circuit from claims
  | "stabilizing"    // Syndrome checks
  | "reasoning"      // LLM inference
  | "rewarding"      // Computing reward signal
  | "converged";     // Answer ready

export interface PipelineState {
  stage: PipelineStage;
  claimCount?: number;
  gateCount?: number;
  syndromeHealth?: number;
  reward?: number;
  grade?: string;
  habitFired?: boolean;
  habitLabel?: string;
  curvature?: number;
  iterations?: number;
  converged?: boolean;
}

const STAGE_META: Record<PipelineStage, { label: string; glyph: string; hue: number }> = {
  idle:         { label: "",                glyph: "",  hue: 38  },
  decomposing:  { label: "Decomposing",     glyph: "◇", hue: 280 },
  compiling:    { label: "Compiling",       glyph: "⊗", hue: 200 },
  stabilizing:  { label: "Verifying",       glyph: "⟡", hue: 152 },
  reasoning:    { label: "Reasoning",       glyph: "∿", hue: 38  },
  rewarding:    { label: "Evaluating",      glyph: "◉", hue: 45  },
  converged:    { label: "Converged",       glyph: "✦", hue: 38  },
};

const STAGE_ORDER: PipelineStage[] = [
  "decomposing", "compiling", "stabilizing", "reasoning", "rewarding", "converged",
];

export default function ConvergencePipeline({ state }: { state: PipelineState }) {
  const { stage } = state;
  const meta = STAGE_META[stage];
  const stageIdx = STAGE_ORDER.indexOf(stage);

  if (stage === "idle") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center gap-3 select-none"
    >
      {/* Pipeline dots */}
      <div className="flex items-center gap-2">
        {STAGE_ORDER.map((s, i) => {
          const sMeta = STAGE_META[s];
          const isActive = i === stageIdx;
          const isPast = i < stageIdx;
          const isFuture = i > stageIdx;

          return (
            <div key={s} className="flex items-center gap-2">
              <motion.div
                className="relative flex items-center justify-center"
                animate={{
                  scale: isActive ? [1, 1.15, 1] : 1,
                }}
                transition={isActive ? {
                  duration: 1.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                } : {}}
              >
                <div
                  className="w-2 h-2 rounded-full transition-all duration-500"
                  style={{
                    background: isPast
                      ? `hsla(${sMeta.hue}, 40%, 55%, 0.7)`
                      : isActive
                        ? `hsla(${sMeta.hue}, 50%, 60%, 0.9)`
                        : `hsla(0, 0%, 40%, 0.15)`,
                    boxShadow: isActive
                      ? `0 0 12px hsla(${sMeta.hue}, 50%, 55%, 0.4)`
                      : "none",
                  }}
                />
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    animate={{ scale: [1, 2.5], opacity: [0.4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                    style={{
                      border: `1px solid hsla(${sMeta.hue}, 50%, 60%, 0.3)`,
                    }}
                  />
                )}
              </motion.div>

              {/* Connector line */}
              {i < STAGE_ORDER.length - 1 && (
                <div
                  className="w-4 h-[1px] transition-all duration-500"
                  style={{
                    background: isPast
                      ? `hsla(38, 30%, 50%, 0.3)`
                      : `hsla(0, 0%, 40%, 0.08)`,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Active stage label */}
      <motion.div
        key={stage}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-2"
      >
        <span
          className="text-[10px] tracking-[0.25em] uppercase"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            color: `hsla(${meta.hue}, 35%, 65%, 0.6)`,
          }}
        >
          {meta.glyph} {meta.label}
        </span>

        {/* Contextual micro-data */}
        {stage === "decomposing" && state.claimCount != null && (
          <span className="text-[9px] font-mono" style={{ color: "hsla(280, 30%, 60%, 0.4)" }}>
            {state.claimCount} claims
          </span>
        )}
        {stage === "compiling" && state.gateCount != null && (
          <span className="text-[9px] font-mono" style={{ color: "hsla(200, 30%, 60%, 0.4)" }}>
            {state.gateCount} gates
          </span>
        )}
        {stage === "stabilizing" && state.syndromeHealth != null && (
          <span className="text-[9px] font-mono" style={{ color: "hsla(152, 35%, 55%, 0.5)" }}>
            {(state.syndromeHealth * 100).toFixed(0)}% health
          </span>
        )}
        {stage === "converged" && state.grade && (
          <span
            className="text-[9px] font-mono px-1.5 py-0.5 rounded-md"
            style={{
              color: state.grade === "A" ? "hsla(152, 50%, 60%, 0.8)" : "hsla(38, 40%, 60%, 0.7)",
              background: state.grade === "A" ? "hsla(152, 40%, 30%, 0.15)" : "hsla(38, 30%, 30%, 0.12)",
            }}
          >
            Grade {state.grade}
          </span>
        )}
      </motion.div>

      {/* Habit acceleration notice */}
      <AnimatePresence>
        {state.habitFired && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-1.5"
          >
            <div
              className="w-1 h-1 rounded-full"
              style={{ background: "hsla(38, 50%, 60%, 0.7)" }}
            />
            <span
              className="text-[9px] tracking-[0.15em]"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                color: "hsla(38, 40%, 60%, 0.5)",
              }}
            >
              Habit recognized · instant
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
