/**
 * ConvergenceChat — The Quantum Reasoning Interface
 * ══════════════════════════════════════════════════
 *
 * A fundamentally different interaction. Not a chatbox —
 * a convergence field where thoughts become understanding.
 *
 * Design philosophy:
 *   - The input is a thought, not a prompt
 *   - The pipeline is visible as organic process, not loading spinner
 *   - The answer emerges — it doesn't "arrive"
 *   - Every exchange leaves a coherence trace
 *   - It feels like talking to yourself, but wiser
 *
 * Architecture:
 *   Query → buildScaffold → compileCircuit → stabilizer check
 *         → Cloud AI + PGI → processResponse → computeReward
 *         → procedural habit scan → MirrorProjection update
 *         → Graded, verified answer with full trace
 *
 * @module hologram-ui/components/lumen/ConvergenceChat
 */

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Send, ArrowUp } from "lucide-react";
import { useCoherence } from "@/modules/hologram-os/hooks/useCoherence";
import {
  buildScaffold,
  processResponse,
  DEFAULT_CONFIG,
  type NeuroSymbolicResult,
  saveReasoningProof,
  computeReward,
  type RewardSignal,
  getCircuitEngine,
  getProceduralMemory,
  getMirrorProtocol,
} from "@/modules/hologram-ui/engine/reasoning";
import ConvergencePipeline, { type PipelineState, type PipelineStage } from "./ConvergencePipeline";

// ── Palette — almost invisible, warm, human ──────────────────────────
const C = {
  bg: "hsl(25, 8%, 6%)",
  text: "hsl(38, 15%, 82%)",
  textMuted: "hsl(30, 10%, 55%)",
  textDim: "hsl(30, 8%, 42%)",
  gold: "hsl(38, 50%, 55%)",
  goldMuted: "hsl(38, 35%, 48%)",
  font: "'DM Sans', sans-serif",
  fontDisplay: "'Playfair Display', serif",
} as const;

// ── Types ────────────────────────────────────────────────────────────
interface Exchange {
  id: string;
  thought: string;
  understanding: string;
  timestamp: Date;
  pipeline: PipelineState;
  meta?: {
    grade?: string;
    curvature?: number;
    iterations?: number;
    converged?: boolean;
    reward?: number;
    habitFired?: boolean;
    inferenceMs?: number;
    claims?: any[];
  };
}

// ── Component ────────────────────────────────────────────────────────

export default function ConvergenceChat() {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [input, setInput] = useState("");
  const [isConverging, setIsConverging] = useState(false);
  const [pipeline, setPipeline] = useState<PipelineState>({ stage: "idle" });
  const [greeting, setGreeting] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const coherence = useCoherence();

  // ── Time-aware greeting ──────────────────────────────────────────
  useEffect(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) setGreeting("What's on your mind this morning?");
    else if (h >= 12 && h < 17) setGreeting("What are you thinking about?");
    else if (h >= 17 && h < 21) setGreeting("What's been on your mind?");
    else setGreeting("What would you like to understand?");
  }, []);

  // ── Auto-resize input ────────────────────────────────────────────
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 140) + "px";
    }
  }, [input]);

  // ── Scroll to latest exchange ────────────────────────────────────
  useEffect(() => {
    if (exchanges.length > 0) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      });
    }
  }, [exchanges]);

  // ── Focus input on mount ─────────────────────────────────────────
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 500);
  }, []);

  // ── Convergence: the full pipeline ───────────────────────────────
  const converge = useCallback(async (thought: string) => {
    if (!thought.trim() || isConverging) return;
    setInput("");
    setIsConverging(true);

    const exchangeId = `ex-${Date.now()}`;
    const start = performance.now();

    // Initialize exchange with empty understanding
    const newExchange: Exchange = {
      id: exchangeId,
      thought,
      understanding: "",
      timestamp: new Date(),
      pipeline: { stage: "decomposing" },
    };
    setExchanges(prev => [...prev, newExchange]);

    const updateExchange = (updates: Partial<Exchange>) => {
      setExchanges(prev =>
        prev.map(ex => ex.id === exchangeId ? { ...ex, ...updates } : ex),
      );
    };

    try {
      // ── Stage 1: Decompose into claims ───────────────────────
      setPipeline({ stage: "decomposing" });
      const scaffold = buildScaffold(thought, 0);
      const claimCount = scaffold?.constraints?.length ?? 0;
      setPipeline({ stage: "decomposing", claimCount });
      updateExchange({ pipeline: { stage: "decomposing", claimCount } });
      await sleep(400);

      // ── Stage 1.5: Check procedural habits ───────────────────
      const procMem = getProceduralMemory();
      const habitResult = procMem.tryFire(thought.split(" ").slice(0, 3).join("-"));
      if (habitResult) {
        setPipeline({ stage: "converged", habitFired: true, habitLabel: habitResult.habit.cachedResult.label, grade: habitResult.result.grade });
        updateExchange({
          understanding: `*This pattern was recognized.* The answer emerges from learned coherence.\n\n${habitResult.result.label}`,
          pipeline: { stage: "converged", habitFired: true, grade: habitResult.result.grade },
          meta: { grade: habitResult.result.grade, habitFired: true, converged: true, inferenceMs: 1 },
        });
        setIsConverging(false);
        return;
      }

      // ── Stage 2: Compile circuit ─────────────────────────────
      setPipeline({ stage: "compiling", claimCount });
      await sleep(350);
      const circuitEngine = getCircuitEngine();
      const circuit = circuitEngine.project();
      setPipeline({ stage: "compiling", claimCount, gateCount: circuit.gateCount });
      updateExchange({ pipeline: { stage: "compiling", gateCount: circuit.gateCount } });
      await sleep(300);

      // ── Stage 3: Stabilizer check ────────────────────────────
      const stabHealth = coherence.stabilizer?.health ?? 0.95;
      setPipeline({ stage: "stabilizing", syndromeHealth: stabHealth });
      updateExchange({ pipeline: { stage: "stabilizing", syndromeHealth: stabHealth } });
      await sleep(400);

      // ── Stage 4: Reasoning (Cloud AI) ────────────────────────
      setPipeline({ stage: "reasoning" });
      updateExchange({ pipeline: { stage: "reasoning" } });

      const STREAM_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hologram-ai-stream`;
      const allMessages = [
        ...exchanges.flatMap(ex => [
          { role: "user", content: ex.thought },
          { role: "assistant", content: ex.understanding },
        ]).filter(m => m.content),
        { role: "user", content: thought },
      ];

      // Add scaffold prompt if available
      if (scaffold?.promptFragment) {
        allMessages.push({ role: "system", content: scaffold.promptFragment });
      }

      const resp = await fetch(STREAM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages,
          model: "google/gemini-3-flash-preview",
          personaId: "hologram",
          skillId: "reason",
        }),
      });

      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
        throw new Error(errBody.error || `Error: ${resp.status}`);
      }
      if (!resp.body) throw new Error("No stream");

      // Stream the response
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let streamedText = "";
      let done = false;

      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "" || !line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const c = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (c) {
              streamedText += c;
              updateExchange({ understanding: streamedText });
            }
          } catch { buf = line + "\n" + buf; break; }
        }
      }

      // ── Stage 5: Evaluate (reward circuit) ───────────────────
      setPipeline({ stage: "rewarding" });
      updateExchange({ pipeline: { stage: "rewarding" } });
      await sleep(300);

      // Process neuro-symbolic result
      let nsResult: NeuroSymbolicResult | null = null;
      if (scaffold && streamedText.length > 20) {
        let iteration = 0;
        let currentResponse = streamedText;
        while (iteration < DEFAULT_CONFIG.maxIterations) {
          const { result } = processResponse(scaffold, currentResponse, iteration);
          if (result) { nsResult = result; break; }
          iteration++;
        }
        if (!nsResult) {
          const { result } = processResponse(scaffold, currentResponse, iteration);
          nsResult = result;
        }
      }

      // Compute reward
      const hBefore = coherence.h ?? 0.5;
      const rewardSignal = nsResult
        ? computeReward(
            { h: hBefore, dh: coherence.dh ?? 0, zone: "explore", phi: 0.5, epistemicGrade: "C" as const },
            {
              h: Math.min(1, hBefore + (nsResult.converged ? 0.05 : -0.02)),
              dh: nsResult.converged ? 0.05 : -0.02,
              zone: nsResult.converged ? "flow" : "explore",
              phi: nsResult.converged ? 0.7 : 0.4,
              epistemicGrade: nsResult.overallGrade,
            },
          )
        : null;

      // Feed procedural memory
      if (nsResult && rewardSignal) {
        procMem.ingest({
          actionType: thought.split(" ").slice(0, 3).join("-"),
          actionLabel: thought.slice(0, 50),
          reward: rewardSignal.reward,
          epistemicGrade: nsResult.overallGrade,
          deltaH: rewardSignal.deltaH,
          timestamp: Date.now(),
        });
      }

      // Feed mirror protocol
      const mirror = getMirrorProtocol();
      const mirrorVector = {
        values: [coherence.h ?? 0.5, coherence.dh ?? 0, coherence.phase ?? 0],
        magnitude: coherence.h ?? 0.5,
        zone: "exploring" as const,
        phase: coherence.phase ?? 0,
        gradient: coherence.dh ?? 0,
      };
      mirror.observeNeighbor(
        "convergence-chat",
        mirrorVector,
        coherence.h ?? 0.5,
      );

      // ── Stage 6: Converged ───────────────────────────────────
      const elapsed = Math.round(performance.now() - start);
      const finalGrade = nsResult?.overallGrade ?? "B";

      setPipeline({
        stage: "converged",
        grade: finalGrade,
        curvature: nsResult?.finalCurvature,
        converged: nsResult?.converged,
      });

      updateExchange({
        understanding: streamedText || "(silence)",
        pipeline: {
          stage: "converged",
          grade: finalGrade,
          curvature: nsResult?.finalCurvature,
          converged: nsResult?.converged,
        },
        meta: {
          grade: finalGrade,
          curvature: nsResult?.finalCurvature,
          iterations: nsResult?.iterations,
          converged: nsResult?.converged,
          reward: rewardSignal?.reward,
          inferenceMs: elapsed,
          claims: nsResult?.claims,
        },
      });

      // Persist proof
      if (nsResult) {
        saveReasoningProof(nsResult).catch(() => {});
      }

    } catch (e) {
      updateExchange({
        understanding: `*A disturbance in coherence.* ${e instanceof Error ? e.message : String(e)}`,
        pipeline: { stage: "idle" },
      });
    } finally {
      setIsConverging(false);
      setPipeline({ stage: "idle" });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isConverging, exchanges, coherence]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      converge(input);
    }
  }, [input, converge]);

  const hasExchanges = exchanges.length > 0;

  // Grade color helper
  const gradeColor = (g?: string) => {
    if (g === "A") return "hsla(152, 50%, 60%, 0.8)";
    if (g === "B") return "hsla(38, 45%, 60%, 0.7)";
    if (g === "C") return "hsla(30, 35%, 55%, 0.6)";
    return "hsla(0, 35%, 55%, 0.5)";
  };

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: C.bg, fontFamily: C.font }}
    >
      {/* ── Top bar — almost invisible ─────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: `hsla(${38 + (coherence.h ?? 0.5) * 160}, 50%, 60%, 0.7)`,
              boxShadow: `0 0 calc(6px + 6px * ${coherence.h ?? 0.5}) hsla(38, 50%, 55%, ${0.15 + (coherence.h ?? 0.5) * 0.3})`,
              animation: `heartbeat-love calc(1.8s + 1.2s * (1 - ${coherence.h ?? 0.5})) ease-in-out infinite`,
            }}
          />
          <span
            className="text-[11px] tracking-[0.25em] uppercase"
            style={{ color: "hsla(38, 15%, 65%, 0.3)" }}
          >
            Convergence
          </span>
        </div>

        {/* Coherence readout */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono" style={{ color: "hsla(38, 15%, 55%, 0.25)" }}>
            H {(coherence.h ?? 0.5).toFixed(3)}
          </span>
          {exchanges.length > 0 && (
            <span className="text-[10px] font-mono" style={{ color: "hsla(38, 15%, 55%, 0.2)" }}>
              {exchanges.length} exchange{exchanges.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* ── Conversation — centered, serene ─────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6"
        style={{ scrollBehavior: "smooth" }}
      >
        <div className="max-w-2xl mx-auto py-8">

          {/* Welcome — when empty */}
          {!hasExchanges && !isConverging && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
              className="flex flex-col items-center justify-center min-h-[50vh] text-center"
            >
              {/* Breathing glyph */}
              <motion.div
                animate={{ scale: [1, 1.05, 1], opacity: [0.4, 0.6, 0.4] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="mb-8"
              >
                <span
                  className="text-[28px]"
                  style={{ color: "hsla(38, 40%, 60%, 0.3)" }}
                >
                  ✦
                </span>
              </motion.div>

              <h2
                className="text-[28px] font-light leading-tight mb-3"
                style={{
                  fontFamily: C.fontDisplay,
                  color: "hsla(38, 20%, 80%, 0.85)",
                  letterSpacing: "-0.01em",
                }}
              >
                {greeting}
              </h2>
              <p
                className="text-[14px] max-w-md leading-relaxed"
                style={{ color: "hsla(30, 10%, 55%, 0.5)" }}
              >
                This is not a prompt. It's a thought. Express it naturally —
                the reasoning will converge around it.
              </p>
            </motion.div>
          )}

          {/* Exchanges */}
          <div className="space-y-12">
            {exchanges.map((ex, idx) => (
              <motion.div
                key={ex.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.7,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="space-y-4"
              >
                {/* The thought — right-aligned, minimal */}
                <div className="flex justify-end">
                  <div
                    className="max-w-[85%] px-4 py-3 rounded-2xl"
                    style={{
                      background: "hsla(38, 15%, 18%, 0.3)",
                      border: "1px solid hsla(38, 20%, 30%, 0.1)",
                      borderBottomRightRadius: "6px",
                    }}
                  >
                    <p
                      className="text-[14px] leading-[1.7] whitespace-pre-wrap"
                      style={{ color: C.text }}
                    >
                      {ex.thought}
                    </p>
                  </div>
                </div>

                {/* Pipeline visualization — shows during convergence */}
                {ex.pipeline.stage !== "idle" && ex.pipeline.stage !== "converged" && idx === exchanges.length - 1 && (
                  <div className="flex justify-center py-2">
                    <ConvergencePipeline state={ex.pipeline} />
                  </div>
                )}

                {/* The understanding — left-aligned, emerges */}
                {ex.understanding && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex gap-2"
                  >
                    {/* Coherence indicator dot */}
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2"
                      style={{
                        background: ex.meta?.grade
                          ? gradeColor(ex.meta.grade)
                          : "hsla(38, 40%, 55%, 0.4)",
                      }}
                    />

                    <div className="min-w-0 flex-1">
                      {/* Markdown response */}
                      <div
                        className="text-[14px] leading-[1.9] prose prose-invert max-w-none"
                        style={{
                          color: "hsl(30, 12%, 72%)",
                          fontFamily: C.font,
                          letterSpacing: "0.01em",
                          ['--tw-prose-headings' as string]: "hsl(38, 30%, 70%)",
                          ['--tw-prose-bold' as string]: "hsl(38, 20%, 82%)",
                          ['--tw-prose-code' as string]: "hsl(38, 60%, 60%)",
                          ['--tw-prose-links' as string]: "hsl(38, 60%, 60%)",
                          ['--tw-prose-bullets' as string]: C.goldMuted,
                        }}
                      >
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => (
                              <p className="mb-3 last:mb-0" style={{ lineHeight: "1.9" }}>{children}</p>
                            ),
                            strong: ({ children }) => (
                              <strong style={{ color: "hsl(38, 25%, 82%)", fontWeight: 500 }}>{children}</strong>
                            ),
                            em: ({ children }) => (
                              <em style={{ color: "hsl(38, 40%, 65%)", fontStyle: "italic" }}>{children}</em>
                            ),
                            h1: ({ children }) => (
                              <h1
                                className="text-[20px] font-normal tracking-wide mt-6 mb-2"
                                style={{ fontFamily: C.fontDisplay, color: "hsl(38, 35%, 68%)" }}
                              >
                                {children}
                              </h1>
                            ),
                            h2: ({ children }) => (
                              <h2
                                className="text-[17px] font-normal tracking-wide mt-5 mb-2"
                                style={{ fontFamily: C.fontDisplay, color: "hsl(38, 30%, 65%)" }}
                              >
                                {children}
                              </h2>
                            ),
                            ul: ({ children }) => (
                              <ul className="space-y-2 my-3 pl-1" style={{ listStyle: "none" }}>{children}</ul>
                            ),
                            li: ({ children }) => (
                              <li className="flex gap-2.5 items-start">
                                <span className="flex-shrink-0 mt-[10px] text-[4px]" style={{ color: C.goldMuted }}>●</span>
                                <span style={{ lineHeight: "1.85" }}>{children}</span>
                              </li>
                            ),
                            code: ({ children, className }) => {
                              if (className?.includes("language-")) {
                                return (
                                  <pre
                                    className="my-3 p-3 rounded-lg overflow-x-auto text-[13px]"
                                    style={{
                                      background: "hsla(25, 8%, 10%, 0.9)",
                                      border: "1px solid hsla(38, 15%, 25%, 0.1)",
                                    }}
                                  >
                                    <code style={{ color: "hsl(38, 30%, 70%)" }}>{children}</code>
                                  </pre>
                                );
                              }
                              return (
                                <code
                                  className="px-1.5 py-0.5 rounded text-[13px]"
                                  style={{
                                    background: "hsla(25, 8%, 15%, 0.6)",
                                    color: "hsl(38, 60%, 60%)",
                                  }}
                                >
                                  {children}
                                </code>
                              );
                            },
                          }}
                        >
                          {ex.understanding}
                        </ReactMarkdown>
                      </div>

                      {/* Convergence trace — subtle, at the bottom */}
                      {ex.meta && ex.pipeline.stage === "converged" && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.8, delay: 0.5 }}
                          className="flex items-center gap-3 mt-3 pt-2"
                          style={{ borderTop: "1px solid hsla(38, 15%, 25%, 0.06)" }}
                        >
                          {ex.meta.grade && (
                            <span
                              className="text-[9px] font-mono tracking-wider"
                              style={{ color: gradeColor(ex.meta.grade) }}
                            >
                              {ex.meta.grade}
                            </span>
                          )}
                          {ex.meta.curvature != null && (
                            <span className="text-[9px] font-mono" style={{ color: "hsla(30, 10%, 50%, 0.35)" }}>
                              κ {(ex.meta.curvature * 100).toFixed(0)}%
                            </span>
                          )}
                          {ex.meta.converged != null && (
                            <span className="text-[9px] font-mono" style={{ color: ex.meta.converged ? "hsla(152, 40%, 55%, 0.4)" : "hsla(30, 20%, 50%, 0.3)" }}>
                              {ex.meta.converged ? "converged" : "open"}
                            </span>
                          )}
                          {ex.meta.reward != null && (
                            <span className="text-[9px] font-mono" style={{ color: ex.meta.reward > 0 ? "hsla(152, 40%, 55%, 0.4)" : "hsla(0, 30%, 50%, 0.3)" }}>
                              Δ{ex.meta.reward > 0 ? "+" : ""}{ex.meta.reward.toFixed(3)}
                            </span>
                          )}
                          {ex.meta.habitFired && (
                            <span className="text-[9px] font-mono" style={{ color: "hsla(38, 45%, 60%, 0.5)" }}>
                              ⚡ habit
                            </span>
                          )}
                          {ex.meta.inferenceMs != null && (
                            <span className="text-[9px] font-mono" style={{ color: "hsla(30, 10%, 45%, 0.25)" }}>
                              {ex.meta.inferenceMs < 1000
                                ? `${ex.meta.inferenceMs}ms`
                                : `${(ex.meta.inferenceMs / 1000).toFixed(1)}s`}
                            </span>
                          )}
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Active pipeline (when converging without exchange yet) */}
          {isConverging && pipeline.stage !== "idle" && exchanges.length > 0 && exchanges[exchanges.length - 1].pipeline.stage !== "idle" && (
            <div className="flex justify-center py-6">
              <ConvergencePipeline state={pipeline} />
            </div>
          )}
        </div>
      </div>

      {/* ── Input — the thought field ──────────────────────── */}
      <div className="flex-shrink-0 px-6 pb-8 pt-3">
        <div className="max-w-2xl mx-auto">
          {/* Active pipeline indicator above input */}
          <AnimatePresence>
            {isConverging && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex justify-center pb-4 overflow-hidden"
              >
                <ConvergencePipeline state={pipeline} />
              </motion.div>
            )}
          </AnimatePresence>

          <div
            className="relative rounded-2xl overflow-hidden transition-all duration-300"
            style={{
              background: "hsla(25, 8%, 9%, 0.8)",
              border: `1px solid hsla(38, 15%, 25%, ${input.trim() ? 0.15 : 0.06})`,
              boxShadow: input.trim()
                ? "0 2px 24px hsla(25, 10%, 3%, 0.3), 0 0 0 1px hsla(38, 20%, 30%, 0.05)"
                : "0 1px 8px hsla(25, 10%, 3%, 0.1)",
            }}
          >
            <div className="px-4 pt-3 pb-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isConverging ? "Converging…" : greeting}
                disabled={isConverging}
                rows={1}
                className="w-full bg-transparent border-none outline-none resize-none text-[15px] placeholder:opacity-20 leading-relaxed block"
                style={{
                  color: C.text,
                  fontFamily: C.font,
                  maxHeight: "140px",
                  letterSpacing: "0.015em",
                }}
              />
            </div>

            {/* Bottom bar */}
            <div className="flex items-center justify-between px-3 pb-2.5">
              <div className="flex items-center gap-2">
                {/* Model indicator — whisper quiet */}
                <span
                  className="text-[10px] tracking-wider"
                  style={{ color: "hsla(38, 15%, 50%, 0.2)" }}
                >
                  coherence · quantum
                </span>
              </div>

              <button
                onClick={() => converge(input)}
                disabled={!input.trim() || isConverging}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 disabled:opacity-10"
                style={{
                  background: input.trim()
                    ? "hsla(38, 40%, 50%, 0.15)"
                    : "transparent",
                  color: input.trim()
                    ? "hsl(38, 50%, 65%)"
                    : "hsla(30, 10%, 40%, 0.3)",
                }}
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Subtle attribution */}
          <div className="flex justify-center mt-3">
            <span
              className="text-[9px] tracking-[0.3em] uppercase"
              style={{ color: "hsla(38, 10%, 45%, 0.15)" }}
            >
              Powered by Hologram · Coherence-based reasoning
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
