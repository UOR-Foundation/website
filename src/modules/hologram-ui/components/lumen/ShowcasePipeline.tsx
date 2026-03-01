/**
 * ShowcasePipeline — Expanded Guided Demo of Reasoning Stages
 * ════════════════════════════════════════════════════════════
 *
 * When a complex question triggers Showcase Mode, this component
 * replaces the compact dot pipeline with an immersive, narrated
 * stage-by-stage visualization. Each stage expands with:
 *   - A breathing glyph
 *   - A human-readable explanation of what's happening
 *   - Live data metrics from the pipeline
 *   - Smooth transitions between stages
 *
 * The effect is cinematic — like watching thought crystallize.
 */

import { motion, AnimatePresence } from "framer-motion";
import type { PipelineState, PipelineStage } from "./ConvergencePipeline";

// ── Stage narratives ─────────────────────────────────────────────────

interface StageNarrative {
  label: string;
  glyph: string;
  hue: number;
  narrative: string;
  detail: (state: PipelineState) => string | null;
}

const NARRATIVES: Record<PipelineStage, StageNarrative> = {
  idle: { label: "", glyph: "", hue: 38, narrative: "", detail: () => null },
  decomposing: {
    label: "Decomposing",
    glyph: "◇",
    hue: 280,
    narrative: "Breaking your thought into atomic claims — each one a node in the reasoning graph.",
    detail: (s) => s.claimCount != null ? `${s.claimCount} constraint${s.claimCount !== 1 ? "s" : ""} extracted` : null,
  },
  compiling: {
    label: "Compiling Circuit",
    glyph: "⊗",
    hue: 200,
    narrative: "Claims become quantum gates. The circuit topology determines how coherence flows.",
    detail: (s) => s.gateCount != null ? `${s.gateCount} gates wired` : null,
  },
  stabilizing: {
    label: "Stabilizer Check",
    glyph: "⟡",
    hue: 152,
    narrative: "Running syndrome measurements — verifying the circuit won't collapse under noise.",
    detail: (s) => s.syndromeHealth != null ? `Syndrome health: ${(s.syndromeHealth * 100).toFixed(0)}%` : null,
  },
  reasoning: {
    label: "Reasoning",
    glyph: "∿",
    hue: 38,
    narrative: "The compiled circuit fires. Inference flows through the coherence field.",
    detail: () => "Streaming from quantum reasoning kernel…",
  },
  rewarding: {
    label: "Evaluating",
    glyph: "◉",
    hue: 45,
    narrative: "Computing the reward signal — how much did coherence increase?",
    detail: (s) => s.reward != null ? `Δ${s.reward > 0 ? "+" : ""}${s.reward.toFixed(3)}` : null,
  },
  converged: {
    label: "Converged",
    glyph: "✦",
    hue: 38,
    narrative: "The answer has crystallized. Coherence is preserved.",
    detail: (s) => {
      const parts: string[] = [];
      if (s.grade) parts.push(`Grade ${s.grade}`);
      if (s.curvature != null) parts.push(`κ ${(s.curvature * 100).toFixed(0)}%`);
      if (s.converged != null) parts.push(s.converged ? "Fully converged" : "Open trace");
      return parts.length > 0 ? parts.join(" · ") : null;
    },
  },
};

const STAGE_ORDER: PipelineStage[] = [
  "decomposing", "compiling", "stabilizing", "reasoning", "rewarding", "converged",
];

// ── Component ────────────────────────────────────────────────────────

export default function ShowcasePipeline({ state }: { state: PipelineState }) {
  const { stage } = state;
  const stageIdx = STAGE_ORDER.indexOf(stage);

  if (stage === "idle") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-lg mx-auto select-none"
    >
      {/* Vertical timeline */}
      <div className="relative pl-6">
        {/* Vertical line */}
        <div
          className="absolute left-[7px] top-0 bottom-0 w-[1px]"
          style={{ background: "hsla(38, 20%, 40%, 0.08)" }}
        />

        {STAGE_ORDER.map((s, i) => {
          const n = NARRATIVES[s];
          const isActive = i === stageIdx;
          const isPast = i < stageIdx;
          const isFuture = i > stageIdx;
          const detailText = (isActive || isPast) ? n.detail(state) : null;

          return (
            <motion.div
              key={s}
              initial={{ opacity: 0, x: -8 }}
              animate={{
                opacity: isFuture ? 0.15 : 1,
                x: 0,
              }}
              transition={{
                duration: 0.5,
                delay: isActive ? 0.1 : 0,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="relative flex items-start gap-4 pb-5 last:pb-0"
            >
              {/* Dot on timeline */}
              <div className="relative flex-shrink-0 z-10" style={{ marginTop: 2 }}>
                <motion.div
                  animate={isActive ? {
                    scale: [1, 1.4, 1],
                    opacity: [0.9, 1, 0.9],
                  } : {}}
                  transition={isActive ? {
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  } : {}}
                >
                  <div
                    className="w-[14px] h-[14px] rounded-full flex items-center justify-center text-[8px] transition-all duration-500"
                    style={{
                      background: isPast
                        ? `hsla(${n.hue}, 40%, 50%, 0.15)`
                        : isActive
                          ? `hsla(${n.hue}, 50%, 50%, 0.2)`
                          : "hsla(0, 0%, 30%, 0.05)",
                      border: `1px solid ${
                        isPast
                          ? `hsla(${n.hue}, 40%, 55%, 0.4)`
                          : isActive
                            ? `hsla(${n.hue}, 50%, 60%, 0.6)`
                            : "hsla(0, 0%, 40%, 0.1)"
                      }`,
                      boxShadow: isActive
                        ? `0 0 12px hsla(${n.hue}, 50%, 55%, 0.25), 0 0 4px hsla(${n.hue}, 50%, 55%, 0.15)`
                        : "none",
                      color: isPast || isActive
                        ? `hsla(${n.hue}, 45%, 65%, 0.8)`
                        : "hsla(0, 0%, 40%, 0.2)",
                    }}
                  >
                    {n.glyph}
                  </div>
                </motion.div>

                {/* Ripple for active */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    animate={{ scale: [1, 2.8], opacity: [0.3, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                    style={{
                      border: `1px solid hsla(${n.hue}, 50%, 60%, 0.2)`,
                    }}
                  />
                )}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 pt-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className="text-[10px] tracking-[0.2em] uppercase font-medium transition-all duration-500"
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      color: isPast
                        ? `hsla(${n.hue}, 35%, 60%, 0.5)`
                        : isActive
                          ? `hsla(${n.hue}, 45%, 65%, 0.8)`
                          : "hsla(0, 0%, 45%, 0.2)",
                    }}
                  >
                    {n.label}
                  </span>

                  {/* Checkmark for past stages */}
                  {isPast && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-[9px]"
                      style={{ color: `hsla(${n.hue}, 40%, 55%, 0.5)` }}
                    >
                      ✓
                    </motion.span>
                  )}
                </div>

                {/* Narrative text — only for active stage */}
                <AnimatePresence mode="wait">
                  {isActive && (
                    <motion.p
                      key={`${s}-narr`}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.4 }}
                      className="text-[12px] leading-[1.7] mb-1"
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        color: "hsla(30, 12%, 65%, 0.6)",
                        maxWidth: "36ch",
                      }}
                    >
                      {n.narrative}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Detail metric */}
                {detailText && (isActive || isPast) && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[9px] font-mono tracking-wide"
                    style={{
                      color: isActive
                        ? `hsla(${n.hue}, 40%, 60%, 0.6)`
                        : `hsla(${n.hue}, 30%, 55%, 0.35)`,
                    }}
                  >
                    {detailText}
                  </motion.span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ── Complexity heuristic ─────────────────────────────────────────────

/**
 * Detect if a question is "complex" enough to trigger Showcase Mode.
 * Heuristics:
 *   - Word count ≥ 12
 *   - Contains causal/analytical keywords
 *   - Multiple clauses (commas, semicolons)
 *   - Question mark present
 */
export function isComplexQuestion(text: string): boolean {
  const words = text.trim().split(/\s+/).length;
  if (words >= 18) return true;

  const hasAnalytical = /\b(why|how|explain|compare|contrast|analyze|derive|prove|what if|implications?|consequence|relationship|between|fundamental|principle|paradox|theory)\b/i.test(text);
  const hasClauses = (text.match(/[,;:—–]/g) || []).length >= 2;
  const hasQuestion = text.includes("?");

  // Complex if analytical + reasonably long, or multi-clause question
  if (hasAnalytical && words >= 10) return true;
  if (hasClauses && hasQuestion && words >= 8) return true;

  return false;
}
