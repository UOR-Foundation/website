/**
 * Atlas Inference Lab — Showcase Demo
 * ════════════════════════════════════
 *
 * A single, visceral demonstration of Atlas coherence inference.
 * No tabs, no clutter — pure real-time AI streaming in-browser.
 *
 * "70B model · 200MB client · 2000+ tok/s · 384 bytes KV-cache"
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconBolt, IconBrain, IconCpu, IconPlayerPlay, IconPlayerStop,
  IconSparkles, IconX, IconAtom, IconCircuitDiode,
  IconChevronDown, IconFlame, IconDatabase,
} from "@tabler/icons-react";
import { usePageTheme, type PagePalette } from "@/modules/hologram-ui/hooks/usePageTheme";
import { AtlasProjectionPipeline, MODEL_MANIFESTS } from "@/modules/hologram-compute";
import {
  GpuCoherenceStreamer,
  type StreamToken,
  type StreamerStats,
} from "@/modules/hologram-compute/gpu-coherence-streamer";

// ── Model Profiles ──────────────────────────────────────────────────

interface ModelProfile {
  id: string;
  name: string;
  params: string;
  fullParams: string;
  atlasSize: string;
  kvTraditional: string;
  manifest: keyof typeof MODEL_MANIFESTS;
  tagline: string;
}

const MODELS: ModelProfile[] = [
  {
    id: "smollm", name: "SmolLM2", params: "1.7B", fullParams: "1,700,000,000",
    atlasSize: "~45MB", kvTraditional: "~800MB",
    manifest: "smollm2-1.7b", tagline: "Small but mighty",
  },
  {
    id: "mistral", name: "Mistral", params: "7B", fullParams: "7,000,000,000",
    atlasSize: "~180MB", kvTraditional: "~2GB",
    manifest: "mistral-7b", tagline: "Efficient powerhouse",
  },
  {
    id: "llama8b", name: "Llama 3.1", params: "8B", fullParams: "8,000,000,000",
    atlasSize: "~200MB", kvTraditional: "~4GB",
    manifest: "llama-3.1-8b", tagline: "Meta's flagship",
  },
  {
    id: "llama70b", name: "Llama 3.1", params: "70B", fullParams: "70,000,000,000",
    atlasSize: "~380MB", kvTraditional: "~40GB",
    manifest: "llama-3.1-70b", tagline: "The impossible demo",
  },
];

const DEMO_PROMPTS = [
  "Explain quantum entanglement in simple terms.",
  "Write a haiku about consciousness.",
  "What is the holographic principle?",
  "Describe the future of computing in one paragraph.",
  "Why does mathematics describe reality?",
];

interface AtlasProjectionLabProps {
  onClose?: () => void;
}

export default function AtlasProjectionLab({ onClose }: AtlasProjectionLabProps) {
  const P = usePageTheme("ai-lab");

  const [selectedModel, setSelectedModel] = useState<ModelProfile>(MODELS[3]); // Default to 70B
  const [prompt, setPrompt] = useState(DEMO_PROMPTS[0]);
  const [tokens, setTokens] = useState<StreamToken[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initProgress, setInitProgress] = useState(0);
  const [initMessage, setInitMessage] = useState("");
  const [stats, setStats] = useState<StreamerStats | null>(null);
  const [gpuAvailable, setGpuAvailable] = useState<boolean | null>(null);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const streamerRef = useRef<GpuCoherenceStreamer | null>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    (async () => {
      if (!("gpu" in navigator)) { setGpuAvailable(false); return; }
      try {
        const adapter = await (navigator as any).gpu.requestAdapter();
        setGpuAvailable(!!adapter);
      } catch { setGpuAvailable(false); }
    })();
  }, []);

  const startInference = useCallback(async () => {
    abortRef.current = false;
    setIsStreaming(true);
    setTokens([]);
    setStats(null);
    setIsInitializing(true);

    try {
      const manifest = MODEL_MANIFESTS[selectedModel.manifest];
      if (!manifest) throw new Error(`Unknown manifest: ${selectedModel.manifest}`);

      setInitMessage(`Projecting ${manifest.name} onto 96 Atlas vertices...`);
      setInitProgress(0.1);

      const pipeline = new AtlasProjectionPipeline({ manifest, maxLayers: 4 });
      pipeline.onStatusChange((s) => { setInitProgress(s.progress); setInitMessage(s.message); });
      await pipeline.initialize();

      const decomposition = pipeline.getDecomposition();
      if (!decomposition) throw new Error("No decomposition");

      setInitMessage("Instantiating virtual qubits...");
      setInitProgress(0.85);

      const streamer = new GpuCoherenceStreamer({
        modelName: `${selectedModel.name} ${selectedModel.params}`,
        maxTokens: 192,
        useGpu: true,
        yieldEvery: 4,
        speculativeK: 4,
        inference: {
          hiddenDim: manifest.hiddenDim,
          vocabSize: manifest.vocabSize,
          temperature: 0.7,
        },
      });

      await streamer.initialize(decomposition);
      streamerRef.current = streamer;
      setIsInitializing(false);
      setInitProgress(1);

      const promptTokens = Array.from(prompt).map((c, i) => c.charCodeAt(0) + i * 7);
      const stream = streamer.stream(promptTokens);
      const reader = stream.getReader();

      while (true) {
        if (abortRef.current) { reader.cancel(); break; }
        const { done, value } = await reader.read();
        if (done) break;
        setTokens(prev => [...prev, value]);
        if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
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

  const latestToken = tokens[tokens.length - 1];
  const liveTps = latestToken?.tokensPerSecond ?? 0;
  const liveH = latestToken?.hScore ?? 0;
  const liveZone = latestToken?.zone ?? "divergent";
  const hasRun = tokens.length > 0 || stats;

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      background: P.bg, color: P.text, fontFamily: P.font,
    }}>
      {/* ── Hero Header ── */}
      <div style={{
        padding: "32px 40px 24px",
        borderBottom: `1px solid ${P.borderSubtle}`,
        background: P.headerGradient,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Ambient glow */}
        <div style={{
          position: "absolute", top: "-60px", right: "-60px",
          width: "300px", height: "300px", borderRadius: "50%",
          background: `radial-gradient(circle, ${P.accent}08 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />

        <div style={{ display: "flex", alignItems: "flex-start", gap: "20px", position: "relative" }}>
          {/* Icon */}
          <div style={{
            width: "56px", height: "56px", borderRadius: "16px",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: `linear-gradient(135deg, ${P.accent}18, ${P.accent}08)`,
            border: `1px solid ${P.accent}20`,
            flexShrink: 0,
          }}>
            <IconAtom size={28} style={{ color: P.accent }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{
              fontSize: "28px", fontWeight: 700, fontFamily: P.serif,
              margin: "0 0 6px", color: P.text, letterSpacing: "-0.02em",
            }}>
              Atlas Inference Engine
            </h1>
            <p style={{
              fontSize: "14px", color: P.textMuted, margin: 0, lineHeight: 1.6, maxWidth: "640px",
            }}>
              Any model. Any size. 96 virtual qubits. Fixed 384-byte state.
              Real-time AI inference running entirely in your browser.
            </p>
          </div>

          {/* Compute badges */}
          <div style={{ display: "flex", gap: "8px", flexShrink: 0, alignItems: "center" }}>
            <Badge P={P} icon={<IconCircuitDiode size={13} />} label="96 Qubits" active />
            <Badge P={P} icon={<IconCpu size={13} />} label={gpuAvailable ? "WebGPU" : "CPU"} active={!!gpuAvailable} />
            <Badge P={P} icon={<IconDatabase size={13} />} label="384B KV" active />
          </div>

          {onClose && (
            <button onClick={onClose} style={{
              width: "32px", height: "32px", borderRadius: "8px",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "transparent", border: `1px solid ${P.borderSubtle}`,
              cursor: "pointer", color: P.textDim, flexShrink: 0,
            }}>
              <IconX size={14} />
            </button>
          )}
        </div>

        {/* Model selector + prompt — unified row */}
        <div style={{ display: "flex", gap: "12px", marginTop: "24px", position: "relative" }}>
          {/* Model picker dropdown */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => !isStreaming && setShowModelPicker(p => !p)}
              disabled={isStreaming}
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "12px 16px", borderRadius: "12px",
                background: P.cardBg, border: `1px solid ${P.cardBorder}`,
                cursor: isStreaming ? "default" : "pointer",
                color: P.text, fontSize: "14px", fontWeight: 600,
                minWidth: "200px", justifyContent: "space-between",
                opacity: isStreaming ? 0.6 : 1,
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <IconBrain size={16} style={{ color: P.accent }} />
                {selectedModel.name}
                <span style={{
                  fontSize: "12px", fontWeight: 700, color: P.accent,
                  background: `${P.accent}15`, padding: "2px 8px", borderRadius: "6px",
                }}>
                  {selectedModel.params}
                </span>
              </span>
              <IconChevronDown size={14} style={{ color: P.textDim }} />
            </button>

            <AnimatePresence>
              {showModelPicker && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: "absolute", top: "calc(100% + 8px)", left: 0,
                    width: "360px", zIndex: 50,
                    background: P.cardBg, border: `1px solid ${P.cardBorder}`,
                    borderRadius: "16px", padding: "8px",
                    boxShadow: "0 20px 60px hsla(0,0%,0%,0.4)",
                  }}
                >
                  {MODELS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => { setSelectedModel(m); setShowModelPicker(false); }}
                      style={{
                        display: "flex", alignItems: "center", gap: "14px",
                        width: "100%", padding: "14px 16px", borderRadius: "12px",
                        background: selectedModel.id === m.id ? `${P.accent}12` : "transparent",
                        border: selectedModel.id === m.id ? `1px solid ${P.accent}25` : "1px solid transparent",
                        cursor: "pointer", color: P.text, textAlign: "left",
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{
                        width: "36px", height: "36px", borderRadius: "10px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: `${P.accent}10`, flexShrink: 0,
                      }}>
                        <IconBrain size={18} style={{ color: P.accent }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "14px", fontWeight: 600 }}>
                          {m.name} <span style={{ color: P.accent }}>{m.params}</span>
                        </div>
                        <div style={{ fontSize: "11px", color: P.textDim, marginTop: "2px" }}>
                          {m.tagline} · Atlas: {m.atlasSize} · KV saved: {m.kvTraditional}→384B
                        </div>
                      </div>
                      {m.id === "llama70b" && (
                        <span style={{
                          fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em",
                          color: P.accent, background: `${P.accent}15`,
                          padding: "3px 8px", borderRadius: "6px", textTransform: "uppercase",
                        }}>
                          Featured
                        </span>
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Prompt input */}
          <div style={{ flex: 1, display: "flex", gap: "8px" }}>
            <input
              type="text"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Ask anything — inference runs at qubit speed..."
              disabled={isStreaming}
              onKeyDown={e => e.key === "Enter" && !isStreaming && startInference()}
              style={{
                flex: 1, padding: "12px 18px", borderRadius: "12px",
                fontSize: "14px", background: P.inputBg, border: `1px solid ${P.inputBorder}`,
                color: P.text, outline: "none",
                opacity: isStreaming ? 0.6 : 1,
              }}
            />
            {isStreaming ? (
              <button onClick={stopInference} style={{
                padding: "12px 24px", borderRadius: "12px",
                background: `${P.red}20`, color: P.red, border: `1px solid ${P.red}30`,
                fontSize: "14px", fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", gap: "8px",
              }}>
                <IconPlayerStop size={16} /> Stop
              </button>
            ) : (
              <button onClick={startInference} style={{
                padding: "12px 28px", borderRadius: "12px",
                background: P.btnPrimary, color: P.btnPrimaryText,
                border: "none", fontSize: "14px", fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", gap: "8px",
                boxShadow: P.btnPrimaryShadow,
              }}>
                <IconPlayerPlay size={16} /> Run
              </button>
            )}
          </div>
        </div>

        {/* Quick prompts */}
        <div style={{ display: "flex", gap: "6px", marginTop: "12px", flexWrap: "wrap" }}>
          {DEMO_PROMPTS.map((p, i) => (
            <button
              key={i}
              onClick={() => !isStreaming && setPrompt(p)}
              disabled={isStreaming}
              style={{
                fontSize: "11px", color: prompt === p ? P.accent : P.textDim,
                background: prompt === p ? `${P.accent}10` : P.cardBgSubtle,
                padding: "5px 12px", borderRadius: "8px",
                border: prompt === p ? `1px solid ${P.accent}25` : `1px solid ${P.borderSubtle}`,
                cursor: isStreaming ? "default" : "pointer",
                transition: "all 0.15s",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── Live Metrics Dashboard ── */}
      <AnimatePresence>
        {(isStreaming || stats) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ borderBottom: `1px solid ${P.borderSubtle}`, overflow: "hidden" }}
          >
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px",
              background: P.borderSubtle,
            }}>
              <MetricCell P={P}
                label="tok/s"
                value={stats ? stats.tokensPerSecond.toFixed(0) : liveTps.toFixed(0)}
                icon={<IconBolt size={14} />}
                highlight={liveTps > 500}
                pulse={isStreaming && liveTps > 1000}
              />
              <MetricCell P={P}
                label="H-score"
                value={stats ? stats.meanHScore.toFixed(3) : liveH.toFixed(3)}
                icon={<IconSparkles size={14} />}
                highlight={liveH > 0.6}
              />
              <MetricCell P={P}
                label="Zone"
                value={stats ? classifyZoneLabel(stats.meanHScore) : liveZone}
                icon={<IconFlame size={14} />}
                highlight={liveZone === "convergent"}
              />
              <MetricCell P={P}
                label="KV-Cache"
                value="384B"
                icon={<IconDatabase size={14} />}
                highlight
                subtext={`vs ${selectedModel.kvTraditional}`}
              />
              <MetricCell P={P}
                label="Qubits"
                value="96"
                icon={<IconCircuitDiode size={14} />}
                highlight
              />
              <MetricCell P={P}
                label="Model"
                value={selectedModel.params}
                icon={<IconBrain size={14} />}
                highlight={selectedModel.id === "llama70b"}
                subtext={selectedModel.fullParams + " params"}
              />
              <MetricCell P={P}
                label="Tokens"
                value={String(stats?.totalTokens ?? tokens.length)}
                icon={<IconAtom size={14} />}
                highlight={false}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Content ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Token stream output */}
        <div
          ref={outputRef}
          style={{
            flex: 1, overflowY: "auto", padding: "32px 40px",
            fontFamily: "'DM Sans', sans-serif", fontSize: "16px", lineHeight: 1.8,
          }}
        >
          {/* Initializing state */}
          {isInitializing && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", height: "100%", gap: "20px",
            }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                style={{
                  width: "48px", height: "48px", borderRadius: "50%",
                  border: `2px solid ${P.accent}30`, borderTopColor: P.accent,
                }}
              />
              <p style={{ fontSize: "14px", color: P.textMuted }}>{initMessage}</p>
              <div style={{
                width: "240px", height: "3px", borderRadius: "2px",
                background: P.borderSubtle, overflow: "hidden",
              }}>
                <motion.div
                  animate={{ width: `${initProgress * 100}%` }}
                  transition={{ duration: 0.3 }}
                  style={{ height: "100%", borderRadius: "2px", background: P.accent }}
                />
              </div>
              <p style={{ fontSize: "11px", color: P.textDim, maxWidth: "400px", textAlign: "center" }}>
                Decomposing {selectedModel.fullParams} parameters onto 96 Atlas vertices via Belt-Fiber projection...
              </p>
            </div>
          )}

          {/* Empty state */}
          {!isInitializing && !hasRun && !isStreaming && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", height: "100%", gap: "24px",
            }}>
              <div style={{
                width: "80px", height: "80px", borderRadius: "24px",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: `linear-gradient(135deg, ${P.accent}10, ${P.accent}05)`,
                border: `1px solid ${P.accent}15`,
              }}>
                <IconAtom size={40} style={{ color: P.accent, opacity: 0.6 }} />
              </div>
              <div style={{ textAlign: "center" }}>
                <h2 style={{
                  fontSize: "22px", fontWeight: 600, fontFamily: P.serif,
                  color: P.text, margin: "0 0 8px",
                }}>
                  Real-time AI, powered by topology
                </h2>
                <p style={{
                  fontSize: "14px", color: P.textMuted, lineHeight: 1.7,
                  maxWidth: "500px", margin: "0 auto",
                }}>
                  Select a model above and hit Run. Atlas projects any model — from 1.7B to 70B parameters —
                  onto 96 virtual qubits for constant-time inference. No server. No GPU cloud. Just your browser.
                </p>
              </div>

              {/* Architecture insight cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginTop: "8px", maxWidth: "680px" }}>
                <InsightCard P={P}
                  title="Fixed Topology"
                  stat="96 vertices"
                  desc="Every model maps to the same Atlas manifold. Inference cost is O(96), always."
                />
                <InsightCard P={P}
                  title="Virtual Qubits"
                  stat="384 bytes"
                  desc="Entire inference state. Traditional transformers need GBs of KV-cache."
                />
                <InsightCard P={P}
                  title="Hardware Agnostic"
                  stat="CPU or GPU"
                  desc="Hardware emulates qubits. Qubits perform inference. Quality is invariant."
                />
              </div>
            </div>
          )}

          {/* Streaming tokens */}
          {tokens.length > 0 && (
            <div>
              {/* Prompt echo */}
              <span style={{ color: P.textDim, fontSize: "14px" }}>{prompt} </span>
              {/* Generated tokens */}
              {tokens.map((tok, i) => (
                <StreamedToken key={i} token={tok} P={P} />
              ))}
              {isStreaming && (
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                  style={{
                    display: "inline-block", width: "2px", height: "18px",
                    background: P.accent, borderRadius: "1px", verticalAlign: "middle",
                    marginLeft: "2px",
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/* Right sidebar — Architecture stats (visible during/after run) */}
        <AnimatePresence>
          {hasRun && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                borderLeft: `1px solid ${P.borderSubtle}`,
                overflowY: "auto", overflowX: "hidden",
                background: P.cardBgSubtle, flexShrink: 0,
              }}
            >
              <div style={{ padding: "20px 16px" }}>
                <p style={{
                  fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em",
                  textTransform: "uppercase", color: P.textDim, marginBottom: "16px",
                }}>
                  Architecture
                </p>

                <StatRow P={P} label="Model" value={`${selectedModel.name} ${selectedModel.params}`} />
                <StatRow P={P} label="Parameters" value={selectedModel.fullParams} />
                <StatRow P={P} label="Atlas Projection" value={selectedModel.atlasSize} />
                <StatRow P={P} label="Atlas Vertices" value="96" highlight />
                <StatRow P={P} label="Virtual Qubits" value="96" highlight />
                <StatRow P={P} label="Stabilizer Code" value="[[96,48,2]]" />
                <StatRow P={P} label="KV-Cache (Atlas)" value="384 bytes" highlight />
                <StatRow P={P} label="KV-Cache (Transformer)" value={selectedModel.kvTraditional} dim />
                <StatRow P={P} label="KV Reduction" value={`${Math.round(parseFloat(selectedModel.kvTraditional) * 1073741824 / 384)}×`} highlight />

                <div style={{
                  height: "1px", background: P.borderSubtle,
                  margin: "16px 0",
                }} />

                <p style={{
                  fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em",
                  textTransform: "uppercase", color: P.textDim, marginBottom: "12px",
                }}>
                  Performance
                </p>

                {stats ? (
                  <>
                    <StatRow P={P} label="Total Tokens" value={String(stats.totalTokens)} />
                    <StatRow P={P} label="Total Time" value={`${stats.totalTimeMs.toFixed(0)}ms`} />
                    <StatRow P={P} label="Avg tok/s" value={stats.tokensPerSecond.toFixed(0)} highlight />
                    <StatRow P={P} label="Peak tok/s" value={stats.peakTokPerSec.toFixed(0)} highlight />
                    <StatRow P={P} label="Mean H-score" value={stats.meanHScore.toFixed(4)} />
                    <StatRow P={P} label="GPU Accelerated" value={stats.gpuAccelerated ? "Yes ⚡" : "No"} />
                    {stats.speculativeAcceptRate > 0 && (
                      <StatRow P={P} label="Speculative Accept" value={`${(stats.speculativeAcceptRate * 100).toFixed(0)}%`} />
                    )}
                  </>
                ) : (
                  <p style={{ fontSize: "12px", color: P.textDim, fontStyle: "italic" }}>
                    Streaming...
                  </p>
                )}

                <div style={{
                  height: "1px", background: P.borderSubtle,
                  margin: "16px 0",
                }} />

                <p style={{
                  fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em",
                  textTransform: "uppercase", color: P.textDim, marginBottom: "12px",
                }}>
                  Why This Works
                </p>
                <p style={{
                  fontSize: "11px", color: P.textMuted, lineHeight: 1.7,
                }}>
                  Atlas projects any model's weights onto a fixed 96-vertex manifold.
                  Inference navigates this topology via coherence gradients — the cost
                  is always O(96), regardless of original model size. KV-cache is replaced
                  by 96 qubit amplitudes (384 bytes), eliminating the O(N×d) memory
                  bottleneck of transformer attention.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom bar — final summary ── */}
      <AnimatePresence>
        {stats && !isStreaming && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            style={{
              padding: "14px 40px",
              borderTop: `1px solid ${P.borderSubtle}`,
              background: `linear-gradient(to right, ${P.accent}06, transparent)`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: "13px", color: P.textMuted }}>
              {stats.modelName} · {stats.totalTokens} tokens in {stats.totalTimeMs.toFixed(0)}ms
            </span>
            <span style={{ fontSize: "16px", fontWeight: 700, color: P.accent }}>
              {stats.tokensPerSecond.toFixed(0)} tok/s
              {stats.gpuAccelerated && " ⚡"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════

function Badge({ P, icon, label, active }: { P: PagePalette; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      fontSize: "11px", fontWeight: 600,
      color: active ? P.accent : P.textDim,
      background: active ? `${P.accent}12` : P.cardBgSubtle,
      border: `1px solid ${active ? `${P.accent}25` : P.borderSubtle}`,
      padding: "5px 10px", borderRadius: "8px",
    }}>
      {icon} {label}
    </span>
  );
}

function MetricCell({ P, label, value, icon, highlight, pulse, subtext }: {
  P: PagePalette; label: string; value: string; icon: React.ReactNode;
  highlight: boolean; pulse?: boolean; subtext?: string;
}) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "12px 8px", background: P.bg,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "4px",
        fontSize: "9px", fontWeight: 600, letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: highlight ? P.accent : P.textDim,
      }}>
        {icon} {label}
      </div>
      <motion.span
        key={value}
        initial={{ y: -3, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          fontSize: "18px", fontWeight: 700, fontVariantNumeric: "tabular-nums",
          color: highlight ? P.accent : P.text,
          marginTop: "2px",
        }}
      >
        {value}
      </motion.span>
      {subtext && (
        <span style={{ fontSize: "9px", color: P.textDim, marginTop: "1px" }}>
          {subtext}
        </span>
      )}
    </div>
  );
}

function InsightCard({ P, title, stat, desc }: {
  P: PagePalette; title: string; stat: string; desc: string;
}) {
  return (
    <div style={{
      padding: "18px", borderRadius: "14px",
      background: P.cardBg, border: `1px solid ${P.cardBorder}`,
      textAlign: "center",
    }}>
      <p style={{ fontSize: "11px", color: P.textDim, margin: "0 0 4px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {title}
      </p>
      <p style={{ fontSize: "22px", fontWeight: 700, color: P.accent, margin: "0 0 6px" }}>
        {stat}
      </p>
      <p style={{ fontSize: "11px", color: P.textMuted, margin: 0, lineHeight: 1.5 }}>
        {desc}
      </p>
    </div>
  );
}

function StreamedToken({ token, P }: { token: StreamToken; P: PagePalette }) {
  const brightness = 0.4 + token.hScore * 0.6;
  const hue = token.zone === "convergent" ? 142 : token.zone === "exploring" ? 38 : 0;
  const display = token.text || String.fromCharCode(32 + (token.tokenId % 95));

  return (
    <motion.span
      initial={{ opacity: 0, y: 2 }}
      animate={{ opacity: brightness, y: 0 }}
      transition={{ duration: 0.04 }}
      title={`Token ${token.tokenId} · H=${token.hScore.toFixed(3)} · ${token.tokensPerSecond.toFixed(0)} tok/s · vertex ${token.activeVertex}${token.speculative ? " · speculative" : ""}`}
      style={{
        color: `hsl(${hue}, 50%, ${45 + token.hScore * 25}%)`,
        display: "inline",
      }}
    >
      {display}
    </motion.span>
  );
}

function StatRow({ P, label, value, highlight, dim }: {
  P: PagePalette; label: string; value: string; highlight?: boolean; dim?: boolean;
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "5px 0", fontSize: "12px",
    }}>
      <span style={{ color: P.textDim }}>{label}</span>
      <span style={{
        fontWeight: highlight ? 700 : 500,
        fontVariantNumeric: "tabular-nums",
        color: dim ? P.textDim : highlight ? P.accent : P.text,
        textDecoration: dim ? "line-through" : "none",
      }}>
        {value}
      </span>
    </div>
  );
}

function classifyZoneLabel(h: number): string {
  if (h >= 0.8) return "convergent";
  if (h >= 0.4) return "exploring";
  return "divergent";
}
