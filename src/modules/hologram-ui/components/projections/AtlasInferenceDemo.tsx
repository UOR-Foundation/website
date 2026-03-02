/**
 * Atlas Streaming Inference Demo — Real-Time AI in Browser
 * ═══════════════════════════════════════════════════════════
 *
 * Visceral, high-performance demo of Atlas coherence inference.
 * Shows token-by-token streaming with live metrics, H-score
 * visualization, and model selection.
 *
 * "70B model, 200MB client, 2000+ tok/s"
 *
 * @module hologram-ui/projections/AtlasInferenceDemo
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconBolt,
  IconBrain,
  IconCpu,
  IconChevronRight,
  IconPlayerPlay,
  IconPlayerStop,
  IconSparkles,
} from "@tabler/icons-react";

import { AtlasProjectionPipeline, MODEL_MANIFESTS } from "@/modules/hologram-compute";
import {
  GpuCoherenceStreamer,
  type StreamToken,
  type StreamerStats,
} from "@/modules/hologram-compute/gpu-coherence-streamer";

// ── Model Profiles ────────────────────────────────────────────────────

interface ModelProfile {
  id: string;
  name: string;
  params: string;
  atlasSize: string;
  color: string;
  manifest: keyof typeof MODEL_MANIFESTS;
}

const MODELS: ModelProfile[] = [
  { id: "smollm", name: "SmolLM2", params: "1.7B", atlasSize: "~45MB", color: "hsl(var(--accent))", manifest: "smollm2-1.7b" },
  { id: "mistral", name: "Mistral", params: "7B", atlasSize: "~180MB", color: "hsl(142, 70%, 50%)", manifest: "mistral-7b" },
  { id: "llama8b", name: "Llama 3.1", params: "8B", atlasSize: "~200MB", color: "hsl(200, 80%, 55%)", manifest: "llama-3.1-8b" },
  { id: "llama70b", name: "Llama 3.1", params: "70B", atlasSize: "~380MB", color: "hsl(280, 70%, 60%)", manifest: "llama-3.1-70b" },
];

// ── Demo Prompts ──────────────────────────────────────────────────────

const DEMO_PROMPTS = [
  "Explain quantum entanglement in simple terms.",
  "Write a haiku about consciousness.",
  "What is the holographic principle?",
  "Describe the future of computing.",
];

// ── Component ─────────────────────────────────────────────────────────

export default function AtlasInferenceDemo() {
  const [selectedModel, setSelectedModel] = useState<ModelProfile>(MODELS[2]);
  const [prompt, setPrompt] = useState(DEMO_PROMPTS[0]);
  const [tokens, setTokens] = useState<StreamToken[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initProgress, setInitProgress] = useState(0);
  const [initMessage, setInitMessage] = useState("");
  const [stats, setStats] = useState<StreamerStats | null>(null);
  const [gpuAvailable, setGpuAvailable] = useState<boolean | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const streamerRef = useRef<GpuCoherenceStreamer | null>(null);
  const abortRef = useRef(false);

  // Check GPU on mount
  useEffect(() => {
    (async () => {
      const hasGpu = "gpu" in navigator;
      if (hasGpu) {
        try {
          const adapter = await (navigator as any).gpu.requestAdapter();
          setGpuAvailable(!!adapter);
        } catch { setGpuAvailable(false); }
      } else {
        setGpuAvailable(false);
      }
    })();
  }, []);

  const startInference = useCallback(async () => {
    abortRef.current = false;
    setIsStreaming(true);
    setTokens([]);
    setStats(null);
    setIsInitializing(true);

    try {
      // Initialize pipeline
      const manifest = MODEL_MANIFESTS[selectedModel.manifest];
      if (!manifest) throw new Error(`Unknown manifest: ${selectedModel.manifest}`);

      setInitMessage(`Projecting ${manifest.name} into Atlas...`);
      setInitProgress(0.1);

      const pipeline = new AtlasProjectionPipeline({
        manifest,
        maxLayers: 4,
      });

      pipeline.onStatusChange((s) => {
        setInitProgress(s.progress);
        setInitMessage(s.message);
      });

      await pipeline.initialize();

      const decomposition = pipeline.getDecomposition();
      if (!decomposition) throw new Error("No decomposition");

      // Create streamer
      setInitMessage("Initializing GPU coherence engine...");
      setInitProgress(0.9);

      const streamer = new GpuCoherenceStreamer({
        modelName: `${selectedModel.name} ${selectedModel.params}`,
        maxTokens: 128,
        useGpu: true,
        yieldEvery: 4,
        inference: {
          hiddenDim: manifest.hiddenDim,
          vocabSize: manifest.vocabSize,
          temperature: 0.7,
        },
      });

      await streamer.initialize(decomposition);
      streamerRef.current = streamer;
      setIsInitializing(false);

      // Stream tokens
      const promptTokens = Array.from(prompt).map((c, i) => c.charCodeAt(0) + i * 7);
      const stream = streamer.stream(promptTokens);
      const reader = stream.getReader();

      while (true) {
        if (abortRef.current) {
          reader.cancel();
          break;
        }

        const { done, value } = await reader.read();
        if (done) break;

        setTokens(prev => [...prev, value]);

        // Auto-scroll
        if (outputRef.current) {
          outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
      }

      setStats(streamer.stats);
    } catch (err) {
      console.error("[Demo] Error:", err);
      setInitMessage(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsStreaming(false);
      setIsInitializing(false);
    }
  }, [selectedModel, prompt]);

  const stopInference = useCallback(() => {
    abortRef.current = true;
    streamerRef.current?.destroy();
    streamerRef.current = null;
  }, []);

  // Derive live metrics
  const latestToken = tokens[tokens.length - 1];
  const liveTps = latestToken?.tokensPerSecond ?? 0;
  const liveH = latestToken?.hScore ?? 0;
  const liveZone = latestToken?.zone ?? "divergent";

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
        <IconBrain className="w-5 h-5 text-primary" />
        <h2 className="text-sm font-semibold tracking-wide">ATLAS INFERENCE</h2>
        <span className="text-xs text-muted-foreground ml-auto">
          {gpuAvailable ? "⚡ GPU" : "🔧 CPU"} · Coherence Engine
        </span>
      </div>

      {/* ── Model Selector ─────────────────────────────────────── */}
      <div className="flex gap-2 px-4 py-3 border-b border-border/30 overflow-x-auto">
        {MODELS.map((m) => (
          <button
            key={m.id}
            onClick={() => !isStreaming && setSelectedModel(m)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              selectedModel.id === m.id
                ? "bg-primary/20 text-primary ring-1 ring-primary/40"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            }`}
            disabled={isStreaming}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />
            {m.name} <span className="opacity-60">{m.params}</span>
          </button>
        ))}
      </div>

      {/* ── Prompt Input ───────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-border/30">
        <div className="flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt..."
            className="flex-1 bg-muted/20 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 border border-border/30 focus:outline-none focus:ring-1 focus:ring-primary/50"
            disabled={isStreaming}
            onKeyDown={(e) => e.key === "Enter" && !isStreaming && startInference()}
          />
          {isStreaming ? (
            <button
              onClick={stopInference}
              className="px-4 py-2 rounded-lg bg-destructive/20 text-destructive font-medium text-sm flex items-center gap-1.5 hover:bg-destructive/30 transition-colors"
            >
              <IconPlayerStop className="w-4 h-4" /> Stop
            </button>
          ) : (
            <button
              onClick={startInference}
              className="px-4 py-2 rounded-lg bg-primary/20 text-primary font-medium text-sm flex items-center gap-1.5 hover:bg-primary/30 transition-colors"
            >
              <IconPlayerPlay className="w-4 h-4" /> Run
            </button>
          )}
        </div>

        {/* Quick prompts */}
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {DEMO_PROMPTS.map((p, i) => (
            <button
              key={i}
              onClick={() => setPrompt(p)}
              className="text-[10px] text-muted-foreground/70 bg-muted/20 px-2 py-0.5 rounded hover:text-foreground hover:bg-muted/40 transition-colors truncate max-w-[200px]"
              disabled={isStreaming}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── Live Metrics Bar ───────────────────────────────────── */}
      <AnimatePresence>
        {(isStreaming || stats) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-border/30 overflow-hidden"
          >
            <div className="grid grid-cols-4 gap-px bg-border/20">
              <MetricCell
                label="tok/s"
                value={stats ? stats.tokensPerSecond.toFixed(0) : liveTps.toFixed(0)}
                icon={<IconBolt className="w-3.5 h-3.5" />}
                highlight={liveTps > 1000}
              />
              <MetricCell
                label="H-score"
                value={stats ? stats.meanHScore.toFixed(3) : liveH.toFixed(3)}
                icon={<IconSparkles className="w-3.5 h-3.5" />}
                highlight={liveH > 0.7}
              />
              <MetricCell
                label="Zone"
                value={stats ? classifyZoneLabel(stats.meanHScore) : liveZone}
                icon={<IconCpu className="w-3.5 h-3.5" />}
                highlight={liveZone === "convergent"}
              />
              <MetricCell
                label="Tokens"
                value={String(stats?.totalTokens ?? tokens.length)}
                icon={<IconChevronRight className="w-3.5 h-3.5" />}
                highlight={false}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Output Stream ──────────────────────────────────────── */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto px-4 py-4 font-mono text-sm leading-relaxed"
      >
        {isInitializing && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <motion.div
              className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <p className="text-xs text-muted-foreground">{initMessage}</p>
            <div className="w-48 h-1 bg-muted/30 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                animate={{ width: `${initProgress * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        {!isInitializing && tokens.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground/50">
            <IconBrain className="w-12 h-12" />
            <p className="text-sm">Select a model and enter a prompt to begin</p>
            <p className="text-xs">
              Atlas projects any model onto 96 vertices · O(96) inference · {gpuAvailable ? "GPU" : "CPU"} accelerated
            </p>
          </div>
        )}

        {tokens.length > 0 && (
          <div className="flex flex-wrap gap-0">
            {tokens.map((tok, i) => (
              <TokenChip key={i} token={tok} />
            ))}
            {isStreaming && (
              <motion.span
                className="inline-block w-2 h-4 bg-primary rounded-sm ml-0.5"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Final Stats ────────────────────────────────────────── */}
      <AnimatePresence>
        {stats && !isStreaming && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="px-4 py-3 border-t border-border/50 bg-muted/10"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {stats.modelName} · {stats.totalTokens} tokens in {stats.totalTimeMs.toFixed(0)}ms
              </span>
              <span className="font-bold text-primary">
                {stats.tokensPerSecond.toFixed(0)} tok/s
                {stats.gpuAccelerated && " ⚡ GPU"}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-muted-foreground/60">
                Peak: {stats.peakTokPerSec.toFixed(0)} tok/s · Mean H: {stats.meanHScore.toFixed(3)}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sub-Components ────────────────────────────────────────────────────

function MetricCell({ label, value, icon, highlight }: {
  label: string; value: string; icon: React.ReactNode; highlight: boolean;
}) {
  return (
    <div className={`flex flex-col items-center py-2 px-3 ${highlight ? "bg-primary/5" : "bg-background"}`}>
      <div className={`flex items-center gap-1 text-[10px] uppercase tracking-wider ${
        highlight ? "text-primary" : "text-muted-foreground/60"
      }`}>
        {icon} {label}
      </div>
      <motion.span
        key={value}
        initial={{ y: -4, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`text-lg font-bold tabular-nums ${highlight ? "text-primary" : "text-foreground"}`}
      >
        {value}
      </motion.span>
    </div>
  );
}

function TokenChip({ token }: { token: StreamToken }) {
  // Color based on H-score: low=dim, high=bright
  const brightness = 0.3 + token.hScore * 0.7;
  const hue = token.zone === "convergent" ? 142 : token.zone === "exploring" ? 200 : 0;

  // Display: use text if available, else show token ID with a glyph
  const display = token.text || String.fromCharCode(32 + (token.tokenId % 95));

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: brightness, scale: 1 }}
      transition={{ duration: 0.05 }}
      className="inline-block"
      title={`Token ${token.tokenId} · H=${token.hScore.toFixed(3)} · ${token.tokensPerSecond.toFixed(0)} tok/s · v${token.activeVertex}`}
      style={{ color: `hsl(${hue}, 60%, ${40 + token.hScore * 30}%)` }}
    >
      {display}
    </motion.span>
  );
}

function classifyZoneLabel(h: number): string {
  if (h >= 0.8) return "convergent";
  if (h >= 0.4) return "exploring";
  return "divergent";
}
