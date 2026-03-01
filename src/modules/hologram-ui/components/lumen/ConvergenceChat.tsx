/**
 * Queue — The Coherence Reasoning Interface
 * ══════════════════════════════════════════
 *
 * A fundamentally different interaction. Not a chatbox.
 * A space where thoughts become understanding.
 *
 * Design philosophy:
 *   - The input is a thought, not a prompt
 *   - The pipeline is visible as organic process, not loading spinner
 *   - The answer emerges. It doesn't "arrive"
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

import { Send, ArrowUp, Mic, MicOff, Volume2, BookOpen, Briefcase, Sparkles, Maximize2, SlidersHorizontal } from "lucide-react";
import ExchangeCard from "./ExchangeCard";
import ProModeMixer from "./ProModeMixer";
import { useCoherence } from "@/modules/hologram-os/hooks/useCoherence";
import {
  getDefaultValues,
  buildDimensionPrompt,
  type DimensionValues,
  type DimensionPreset,
} from "@/modules/hologram-ui/engine/proModeDimensions";
import { useConvergenceVoice, type VoicePhase } from "@/modules/hologram-ui/hooks/useConvergenceVoice";
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
import ShowcasePipeline, { isComplexQuestion } from "./ShowcasePipeline";
import { Sparkles as MagicIcon } from "lucide-react"; // Import magic icon

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

// ── Triadic mode definitions ─────────────────────────────────────────
type TriadicMode = "balanced" | "learn" | "work" | "play";

const TRIADIC_MODES: { key: TriadicMode; label: string; icon: React.ElementType; hue: number }[] = [
  { key: "learn", label: "Learn", icon: BookOpen, hue: 210 },
  { key: "work", label: "Work", icon: Briefcase, hue: 38 },
  { key: "play", label: "Play", icon: Sparkles, hue: 280 },
];

// ── Types ────────────────────────────────────────────────────────────
interface Exchange {
  id: string;
  thought: string;
  understanding: string;
  timestamp: Date;
  pipeline: PipelineState;
  showcase?: boolean;
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

interface ConvergenceChatProps {
  /** When true, renders inline (no fixed positioning) for use inside ProjectionShell */
  embedded?: boolean;
  /** Close callback for embedded mode */
  onClose?: () => void;
  /** Expand to fullscreen callback — shows expand icon when provided */
  onExpand?: () => void;
}

export default function ConvergenceChat({ embedded = false, onClose, onExpand }: ConvergenceChatProps = {}) {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [input, setInput] = useState("");
  const [isConverging, setIsConverging] = useState(false);
  const [pipeline, setPipeline] = useState<PipelineState>({ stage: "idle" });
  const [showcaseMode, setShowcaseMode] = useState(false);
  const [greeting, setGreeting] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const coherence = useCoherence();
  const [voiceMode, setVoiceMode] = useState(false);
  const [triadicMode, setTriadicMode] = useState<TriadicMode>("balanced");
  const [proMode, setProMode] = useState(false);
  const [dimensionValues, setDimensionValues] = useState<DimensionValues>(getDefaultValues());
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  const handleSelectPreset = useCallback((preset: DimensionPreset) => {
    setDimensionValues(preset.values);
    setActivePresetId(preset.id);
  }, []);

  const handleDimensionChange = useCallback((newValues: DimensionValues) => {
    setDimensionValues(newValues);
    setActivePresetId(null); // custom mix clears preset selection
  }, []);

  // ── Voice integration ────────────────────────────────────────────
  const voice = useConvergenceVoice({
    onTranscript: (text) => {
      setInput(text);
      // Auto-converge after voice input
      setTimeout(() => converge(text), 300);
    },
    onSpeakingStart: () => {},
    onSpeakingEnd: () => {},
  });

  // Auto-speak responses when in voice mode
  const lastExchangeRef = useRef<string | null>(null);
  useEffect(() => {
    if (!voiceMode || voice.phase === "speaking") return;
    const lastEx = exchanges[exchanges.length - 1];
    if (
      lastEx &&
      lastEx.understanding &&
      lastEx.pipeline.stage === "converged" &&
      lastEx.id !== lastExchangeRef.current
    ) {
      lastExchangeRef.current = lastEx.id;
      voice.speak(lastEx.understanding);
    }
  }, [exchanges, voiceMode, voice.phase]);

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

    // Detect showcase mode for complex questions
    const isShowcase = isComplexQuestion(thought);
    setShowcaseMode(isShowcase);

    const exchangeId = `ex-${Date.now()}`;
    const start = performance.now();

    // Initialize exchange with empty understanding
    const newExchange: Exchange = {
      id: exchangeId,
      thought,
      understanding: "",
      timestamp: new Date(),
      pipeline: { stage: "decomposing" },
      showcase: isShowcase,
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
      await sleep(isShowcase ? 900 : 400);

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
      await sleep(isShowcase ? 800 : 350);
      const circuitEngine = getCircuitEngine();
      const circuit = circuitEngine.project();
      setPipeline({ stage: "compiling", claimCount, gateCount: circuit.gateCount });
      updateExchange({ pipeline: { stage: "compiling", gateCount: circuit.gateCount } });
      await sleep(isShowcase ? 700 : 300);

      // ── Stage 3: Stabilizer check ────────────────────────────
      const stabHealth = coherence.stabilizer?.health ?? 0.95;
      setPipeline({ stage: "stabilizing", syndromeHealth: stabHealth });
      updateExchange({ pipeline: { stage: "stabilizing", syndromeHealth: stabHealth } });
      await sleep(isShowcase ? 900 : 400);

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

      // Add Pro Mode dimension prompt if any faders differ from default
      const dimPrompt = buildDimensionPrompt(dimensionValues);
      if (dimPrompt) {
        allMessages.push({ role: "system", content: dimPrompt });
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
          triadicMode: triadicMode !== "balanced" ? triadicMode : undefined,
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
      setShowcaseMode(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isConverging, exchanges, coherence]);

  // ── Follow-up question listener ─────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const q = (e as CustomEvent).detail as string;
      if (q && !isConverging) {
        setInput(q);
        setTimeout(() => converge(q), 100);
      }
    };
    window.addEventListener("lumen:follow-up", handler);
    return () => window.removeEventListener("lumen:follow-up", handler);
  }, [isConverging, converge]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      converge(input);
    }
  }, [input, converge]);

  const hasExchanges = exchanges.length > 0;


  return (
    <div
      className={embedded ? "flex flex-col w-full h-full" : "fixed inset-0 flex flex-col"}
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
            Lumen
          </span>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono" style={{ color: "hsla(38, 15%, 55%, 0.25)" }}>
            H {(coherence.h ?? 0.5).toFixed(3)}
          </span>
          {exchanges.length > 0 && (
            <span className="text-[10px] font-mono" style={{ color: "hsla(38, 15%, 55%, 0.2)" }}>
              {exchanges.length} exchange{exchanges.length !== 1 ? "s" : ""}
            </span>
          )}
          {onExpand && (
            <button
              onClick={onExpand}
              className="w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
              style={{
                color: "hsla(38, 15%, 60%, 0.4)",
                background: "hsla(38, 15%, 30%, 0.08)",
              }}
              title="Expand to full screen"
            >
              <Maximize2 className="w-3 h-3" strokeWidth={1.5} />
            </button>
          )}

          {/* Pro Mode toggle (Moved to input area) */}
        </div>
      </div>

      {/* ── Main content area with Pro Mode panel ───────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* ── Conversation column ──────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
      {/* ── Conversation — centered, serene ─────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6"
        style={{ scrollBehavior: "smooth" }}
      >
        <div style={{ maxWidth: "min(680px, 61.8%)", margin: "0 auto", padding: "clamp(16px, 3vh, 40px) 0" }}>

          {/* Welcome — when empty */}
          {!hasExchanges && !isConverging && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              className="flex flex-col items-center justify-center text-center h-full min-h-[50vh]"
            >
              {/* Breathing glyph — balanced */}
              <motion.div
                animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="mb-8"
              >
                <Sparkles
                  size={32}
                  strokeWidth={1}
                  style={{ color: "hsla(38, 30%, 60%, 0.4)" }}
                />
              </motion.div>

              <h2
                className="font-light leading-tight mb-4"
                style={{
                  fontFamily: C.fontDisplay,
                  color: "hsla(38, 20%, 85%, 0.9)",
                  letterSpacing: "-0.015em",
                  fontSize: "clamp(28px, 4.5vh, 48px)",
                }}
              >
                {greeting}
              </h2>
              <p
                className="max-w-lg leading-relaxed px-4"
                style={{
                  color: "hsla(30, 8%, 55%, 0.6)",
                  fontSize: "clamp(14px, 1.8vh, 18px)",
                  fontFamily: C.font,
                  letterSpacing: "0.01em",
                }}
              >
                This is not a prompt. It's a thought. Express it naturally,<br className="hidden sm:block" />
                and the understanding will find its shape.
              </p>
            </motion.div>
          )}

          {/* Exchanges */}
          <div className="space-y-12">
            {exchanges.map((ex, idx) => (
              <ExchangeCard
                key={ex.id}
                exchange={ex}
                isActive={idx === exchanges.length - 1 && isConverging}
                pipelineSlot={
                  ex.pipeline.stage !== "idle" && ex.pipeline.stage !== "converged" && idx === exchanges.length - 1
                    ? (
                      <div className={ex.showcase ? "py-4" : "flex justify-center py-2"}>
                        {ex.showcase ? (
                          <ShowcasePipeline state={ex.pipeline} />
                        ) : (
                          <ConvergencePipeline state={ex.pipeline} />
                        )}
                      </div>
                    )
                    : undefined
                }
              />
            ))}
          </div>

          {/* Active pipeline (when converging without exchange yet) */}
          {isConverging && pipeline.stage !== "idle" && exchanges.length > 0 && exchanges[exchanges.length - 1].pipeline.stage !== "idle" && (
            <div className={showcaseMode ? "py-6" : "flex justify-center py-6"}>
              {showcaseMode ? (
                <ShowcasePipeline state={pipeline} />
              ) : (
                <ConvergencePipeline state={pipeline} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Input — the thought field ──────────────────────── */}
      <div className="flex-shrink-0 px-6 pb-8 pt-3">
        <div style={{ maxWidth: "min(680px, 61.8%)", margin: "0 auto" }}>
          {/* Active pipeline indicator above input */}
          <AnimatePresence>
            {isConverging && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex justify-center pb-4 overflow-hidden"
              >
                {showcaseMode ? <ShowcasePipeline state={pipeline} /> : <ConvergencePipeline state={pipeline} />}
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
                placeholder={isConverging ? "Thinking…" : greeting}
                disabled={isConverging}
                rows={1}
                className="w-full bg-transparent border-none outline-none resize-none placeholder:opacity-20 leading-relaxed block"
                style={{
                  color: C.text,
                  fontFamily: C.font,
                  fontSize: "clamp(14px, 1.6vh, 17px)",
                  maxHeight: "140px",
                  letterSpacing: "0.015em",
                }}
              />
            </div>

            {/* Bottom bar */}
            <div className="flex items-center justify-end px-3 pb-2.5">
              <div className="flex items-center gap-2">
                {/* Pro Mode magical toggle */}
                <button
                  onPointerDown={() => setProMode(!proMode)}
                  className="relative group flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all duration-300"
                  style={{
                    color: proMode ? C.gold : "hsla(38, 15%, 50%, 0.4)",
                    background: proMode ? "hsla(38, 30%, 25%, 0.15)" : "transparent",
                  }}
                  title="Enter Pro Mode"
                >
                  <MagicIcon 
                    size={14} 
                    className={`transition-transform duration-500 ${proMode ? "rotate-180" : "group-hover:rotate-12"}`}
                  />
                  <span 
                    className={`text-[10px] tracking-widest uppercase font-medium transition-all duration-300 ${proMode ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 w-0 overflow-hidden"}`}
                  >
                    Pro
                  </span>
                  
                  {/* Subtle glow hint */}
                  {!proMode && (
                    <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ boxShadow: "0 0 12px hsla(38, 40%, 60%, 0.1)" }}
                    />
                  )}
                </button>

                <div className="w-[1px] h-4 mx-1" style={{ background: "hsla(38, 10%, 30%, 0.15)" }} />

                {/* Voice orb / mic button */}
                {voice.isSttAvailable && (
                  <button
                    onPointerDown={(e) => {
                      e.preventDefault();
                      if (!voiceMode) {
                        setVoiceMode(true);
                        voice.startListening();
                      } else {
                        voice.toggle();
                      }
                    }}
                    disabled={isConverging && voice.phase !== "speaking"}
                    className="relative w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 group"
                    style={{
                      background: voice.phase === "listening"
                        ? "hsla(38, 50%, 50%, 0.2)"
                        : voice.phase === "speaking"
                          ? "hsla(200, 40%, 50%, 0.15)"
                          : voiceMode
                            ? "hsla(38, 30%, 40%, 0.1)"
                            : "transparent",
                      color: voice.phase === "listening"
                        ? "hsl(38, 55%, 65%)"
                        : voice.phase === "speaking"
                          ? "hsl(200, 45%, 65%)"
                          : voiceMode
                            ? "hsl(38, 35%, 60%)"
                            : "hsla(30, 10%, 45%, 0.4)",
                    }}
                    title={voice.phase === "listening" ? "Stop listening" : "Voice input"}
                  >
                    {/* Breathing ring when listening */}
                    {voice.phase === "listening" && (
                      <motion.div
                        className="absolute inset-0 rounded-xl"
                        animate={{
                          scale: [1, 1.3 + voice.level * 0.5, 1],
                          opacity: [0.4, 0.1, 0.4],
                        }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                        style={{
                          border: "1px solid hsla(38, 50%, 55%, 0.3)",
                        }}
                      />
                    )}
                    {/* Speaking wave */}
                    {voice.phase === "speaking" && (
                      <motion.div
                        className="absolute inset-0 rounded-xl"
                        animate={{
                          scale: [1, 1.15, 1],
                          opacity: [0.3, 0.15, 0.3],
                        }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                        style={{
                          border: "1px solid hsla(200, 45%, 55%, 0.25)",
                        }}
                      />
                    )}
                    {voice.phase === "speaking" ? (
                      <Volume2 className="w-4 h-4" />
                    ) : voice.phase === "listening" ? (
                      <Mic className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </button>
                )}

                {/* Send button */}
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

            {/* Voice transcript overlay */}
            <AnimatePresence>
              {voice.phase === "listening" && voice.transcript && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="px-4 pb-2"
                >
                  <p
                    className="text-[13px] italic"
                    style={{ color: "hsla(38, 30%, 65%, 0.6)" }}
                  >
                    {voice.transcript}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Subtle attribution */}
          <div className="flex justify-center mt-3">
            <span
              className="text-[9px] tracking-[0.3em] uppercase"
              style={{ color: "hsla(38, 10%, 45%, 0.15)" }}
            >
              Powered by Hologram · Coherence reasoning
            </span>
          </div>
        </div>
      </div>
      </div>{/* end conversation column */}

        {/* ── Pro Mode panel — slides in from right ─────────────── */}
        <AnimatePresence>
          {proMode && (
            <motion.div
              initial={{ width: 0, opacity: 0, x: 20, filter: "blur(10px)" }}
              animate={{ width: 420, opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ width: 0, opacity: 0, x: 20, filter: "blur(10px)" }}
              transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
              className="relative flex-shrink-0 overflow-hidden shadow-2xl z-10"
              style={{
                borderLeft: "1px solid hsla(38, 20%, 35%, 0.15)",
                background: "hsla(25, 8%, 8%, 0.95)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div className="absolute inset-y-0 left-0 w-[1px] bg-gradient-to-b from-transparent via-orange-500/20 to-transparent opacity-50" />
              <div className="w-[420px] h-full relative">
                <ProModeMixer
                  coherenceH={coherence.h ?? 0.5}
                  values={dimensionValues}
                  onChange={handleDimensionChange}
                  activePresetId={activePresetId}
                  onSelectPreset={handleSelectPreset}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>{/* end flex row */}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
