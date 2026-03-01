/**
 * QueuePipeline — Living Breath of Thought
 * ═══════════════════════════════════════════
 *
 * Not a loading bar. Not dots. A living organism that breathes
 * while intelligence crystallizes. Each stage flows into the next
 * like thought itself: seamless, organic, inevitable.
 *
 * The animation language is biological, not mechanical:
 *   - Concentric rings that breathe and expand
 *   - Color that shifts through a warm spectrum
 *   - Motion that decelerates as clarity approaches
 *   - Presence that feels like shared attention
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

const STAGE_META: Record<PipelineStage, { label: string; hue: number; breath: string }> = {
  idle:         { label: "",               hue: 38,  breath: "" },
  decomposing:  { label: "Listening",      hue: 260, breath: "Holding your thought" },
  compiling:    { label: "Connecting",     hue: 220, breath: "Finding the shape" },
  stabilizing:  { label: "Grounding",      hue: 170, breath: "Making sure it holds" },
  reasoning:    { label: "Understanding",  hue: 38,  breath: "Letting meaning settle" },
  rewarding:    { label: "Weighing",       hue: 42,  breath: "Measuring what changed" },
  converged:    { label: "Clear",          hue: 38,  breath: "Here" },
};

const STAGE_ORDER: PipelineStage[] = [
  "decomposing", "compiling", "stabilizing", "reasoning", "rewarding", "converged",
];

export default function ConvergencePipeline({ state }: { state: PipelineState }) {
  const { stage } = state;
  const meta = STAGE_META[stage];
  const stageIdx = STAGE_ORDER.indexOf(stage);
  const progress = stageIdx >= 0 ? (stageIdx + 1) / STAGE_ORDER.length : 0;

  if (stage === "idle") return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center gap-5 select-none py-2"
    >
      {/* Central breathing organism */}
      <div className="relative flex items-center justify-center" style={{ width: 64, height: 64 }}>
        {/* Outer ring — slow breath */}
        <motion.div
          className="absolute rounded-full"
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.08, 0.2, 0.08],
          }}
          transition={{
            duration: 4 - progress * 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            width: 56,
            height: 56,
            border: `1px solid hsla(${meta.hue}, 35%, 60%, 0.2)`,
          }}
        />

        {/* Middle ring — medium breath, offset phase */}
        <motion.div
          className="absolute rounded-full"
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.12, 0.28, 0.12],
          }}
          transition={{
            duration: 3 - progress * 0.8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.4,
          }}
          style={{
            width: 36,
            height: 36,
            border: `1px solid hsla(${meta.hue}, 40%, 58%, 0.25)`,
          }}
        />

        {/* Inner core — concentrated light */}
        <motion.div
          className="absolute rounded-full"
          animate={{
            scale: [0.9, 1.1, 0.9],
            opacity: [0.5, 0.85, 0.5],
          }}
          transition={{
            duration: 2.2 - progress * 0.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.2,
          }}
          style={{
            width: 8,
            height: 8,
            background: `hsla(${meta.hue}, 45%, 60%, 0.6)`,
            boxShadow: `
              0 0 16px hsla(${meta.hue}, 45%, 55%, 0.25),
              0 0 40px hsla(${meta.hue}, 40%, 50%, 0.1)
            `,
          }}
        />

        {/* Expanding awareness ring — single slow pulse outward */}
        <motion.div
          className="absolute rounded-full"
          animate={{
            scale: [1, 3],
            opacity: [0.15, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeOut",
          }}
          style={{
            width: 20,
            height: 20,
            border: `1px solid hsla(${meta.hue}, 40%, 60%, 0.15)`,
          }}
        />
      </div>

      {/* Stage breath — the whisper of what's happening */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-1.5"
        >
          <span
            className="text-[11px] tracking-[0.2em] uppercase"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              color: `hsla(${meta.hue}, 30%, 65%, 0.5)`,
              fontWeight: 400,
            }}
          >
            {meta.label}
          </span>
          <span
            className="text-[12px] tracking-[0.04em]"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontStyle: "italic",
              color: "hsla(30, 12%, 60%, 0.35)",
              fontWeight: 300,
            }}
          >
            {meta.breath}
          </span>
        </motion.div>
      </AnimatePresence>

      {/* Progress thread — organic, not a bar */}
      <div className="flex items-center gap-1">
        {STAGE_ORDER.map((s, i) => {
          const isPast = i < stageIdx;
          const isActive = i === stageIdx;
          return (
            <motion.div
              key={s}
              animate={{
                width: isActive ? 16 : isPast ? 8 : 4,
                opacity: isPast ? 0.5 : isActive ? 0.8 : 0.1,
              }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="h-[1.5px] rounded-full"
              style={{
                background: isPast || isActive
                  ? `hsla(${STAGE_META[s].hue}, 35%, 58%, 0.6)`
                  : "hsla(0, 0%, 40%, 0.15)",
              }}
            />
          );
        })}
      </div>

      {/* Habit acceleration notice */}
      <AnimatePresence>
        {state.habitFired && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-1.5"
          >
            <span
              className="text-[10px] tracking-[0.12em]"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                color: "hsla(38, 40%, 60%, 0.45)",
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
