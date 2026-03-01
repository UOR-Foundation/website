/**
 * ConvergencePipeline — Quiet Presence of Thought
 * ════════════════════════════════════════════════
 *
 * Not a loading bar. Not busy animation. A still, intelligent
 * presence that communicates depth through restraint.
 *
 * Design: A single dot breathes slowly. One word whispers
 * the current state. Nothing more. The discipline of silence
 * conveys more intelligence than motion ever could.
 */

import { motion, AnimatePresence } from "framer-motion";

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

const STAGE_META: Record<PipelineStage, { label: string; breath: string }> = {
  idle:         { label: "",               breath: "" },
  decomposing:  { label: "Listening",      breath: "Holding your thought" },
  compiling:    { label: "Connecting",     breath: "Finding the shape" },
  stabilizing:  { label: "Grounding",      breath: "Making sure it holds" },
  reasoning:    { label: "Understanding",  breath: "Letting meaning settle" },
  rewarding:    { label: "Weighing",       breath: "Measuring what changed" },
  converged:    { label: "Clear",          breath: "Here" },
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center gap-4 select-none py-3"
    >
      {/* Single quiet dot — breathes with long, calm rhythm */}
      <div className="relative flex items-center justify-center" style={{ width: 40, height: 40 }}>
        {/* Soft halo — barely visible, slow */}
        <motion.div
          className="absolute rounded-full"
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.06, 0.12, 0.06],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            width: 32,
            height: 32,
            border: "1px solid hsla(38, 30%, 55%, 0.12)",
          }}
        />

        {/* Core dot — steady, calm pulse */}
        <motion.div
          className="rounded-full"
          animate={{
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            width: 5,
            height: 5,
            background: "hsla(38, 35%, 58%, 0.7)",
            boxShadow: "0 0 12px hsla(38, 35%, 55%, 0.15)",
          }}
        />
      </div>

      {/* Stage whisper — single line, minimal */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="flex flex-col items-center gap-1"
        >
          <span
            className="text-[10px] tracking-[0.25em] uppercase"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              color: "hsla(38, 20%, 60%, 0.35)",
              fontWeight: 400,
            }}
          >
            {meta.label}
          </span>
          {stage !== "converged" && (
            <span
              className="text-[11px] tracking-[0.03em]"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontStyle: "italic",
                color: "hsla(30, 12%, 55%, 0.22)",
                fontWeight: 300,
              }}
            >
              {meta.breath}
            </span>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Progress — quiet dots, not bars */}
      <div className="flex items-center gap-1.5">
        {STAGE_ORDER.map((s, i) => {
          const isPast = i < stageIdx;
          const isActive = i === stageIdx;
          return (
            <motion.div
              key={s}
              animate={{
                opacity: isPast ? 0.35 : isActive ? 0.6 : 0.06,
                scale: isActive ? 1 : 0.8,
              }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="rounded-full"
              style={{
                width: 3,
                height: 3,
                background: isPast || isActive
                  ? "hsla(38, 30%, 58%, 0.7)"
                  : "hsla(0, 0%, 40%, 0.3)",
              }}
            />
          );
        })}
      </div>

      {/* Habit notice — whisper quiet */}
      <AnimatePresence>
        {state.habitFired && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span
              className="text-[9px] tracking-[0.12em]"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                color: "hsla(38, 25%, 55%, 0.25)",
                fontStyle: "italic",
              }}
            >
              This pattern is familiar
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
