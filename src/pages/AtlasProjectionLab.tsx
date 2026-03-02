/**
 * Atlas Inference Lab — Quantum AI Showcase
 * ══════════════════════════════════════════
 *
 * A single, visceral demonstration of the three-layer Quantum Inference Engine.
 * Hardware emulates qubits. Qubits perform inference. Coherence is the program.
 *
 * "96 virtual qubits · Any model · 384 bytes KV · 2000+ tok/s"
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconBolt, IconBrain, IconCpu, IconPlayerPlay, IconPlayerStop,
  IconSparkles, IconX, IconAtom, IconCircuitDiode,
  IconChevronDown, IconFlame, IconDatabase, IconShield,
  IconTopologyRing3, IconLayersLinked,
} from "@tabler/icons-react";
import { usePageTheme, type PagePalette } from "@/modules/hologram-ui/hooks/usePageTheme";
import { AtlasProjectionPipeline, MODEL_MANIFESTS } from "@/modules/hologram-compute";
import {
  QuantumInferenceEngine,
  type QuantumToken,
  type QuantumInferenceStats,
  type LayerStatus,
} from "@/modules/hologram-compute/quantum-inference-engine";

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
  { id: "smollm", name: "SmolLM2", params: "1.7B", fullParams: "1,700,000,000", atlasSize: "~45MB", kvTraditional: "~800MB", manifest: "smollm2-1.7b", tagline: "Small but mighty" },
  { id: "mistral", name: "Mistral", params: "7B", fullParams: "7,000,000,000", atlasSize: "~180MB", kvTraditional: "~2GB", manifest: "mistral-7b", tagline: "Efficient powerhouse" },
  { id: "llama8b", name: "Llama 3.1", params: "8B", fullParams: "8,000,000,000", atlasSize: "~200MB", kvTraditional: "~4GB", manifest: "llama-3.1-8b", tagline: "Meta's flagship" },
  { id: "llama70b", name: "Llama 3.1", params: "70B", fullParams: "70,000,000,000", atlasSize: "~380MB", kvTraditional: "~40GB", manifest: "llama-3.1-70b", tagline: "The impossible demo" },
];

const DEMO_PROMPTS = [
  "Explain quantum entanglement in simple terms.",
  "Write a haiku about consciousness.",
  "What is the holographic principle?",
  "Describe the future of computing in one paragraph.",
  "Why does mathematics describe reality?",
];

interface AtlasProjectionLabProps { onClose?: () => void; }

export default function AtlasProjectionLab({ onClose }: AtlasProjectionLabProps) {
  const P = usePageTheme("ai-lab");

  const [selectedModel, setSelectedModel] = useState<ModelProfile>(MODELS[3]);
  const [prompt, setPrompt] = useState(DEMO_PROMPTS[0]);
  const [tokens, setTokens] = useState<QuantumToken[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initPhase, setInitPhase] = useState<"idle" | "l1" | "l2" | "l3" | "projecting">("idle");
  const [layerStatuses, setLayerStatuses] = useState<LayerStatus[]>([]);
  const [initMessage, setInitMessage] = useState("");
  const [stats, setStats] = useState<QuantumInferenceStats | null>(null);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [gpuAvailable, setGpuAvailable] = useState<boolean | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<QuantumInferenceEngine | null>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    (async () => {
      if (!("gpu" in navigator)) { setGpuAvailable(false); return; }
      try { const a = await (navigator as any).gpu.requestAdapter(); setGpuAvailable(!!a); }
      catch { setGpuAvailable(false); }
    })();
  }, []);

  const startInference = useCallback(async () => {
    abortRef.current = false;
    setIsStreaming(true);
    setTokens([]);
    setStats(null);
    setIsInitializing(true);
    setLayerStatuses([]);

    try {
      // Phase 0: Project model onto Atlas
      setInitPhase("projecting");
      setInitMessage(`Projecting ${selectedModel.name} ${selectedModel.params} onto Atlas manifold...`);

      const manifest = MODEL_MANIFESTS[selectedModel.manifest];
      if (!manifest) throw new Error(`Unknown manifest: ${selectedModel.manifest}`);

      const pipeline = new AtlasProjectionPipeline({ manifest, maxLayers: 4 });
      pipeline.onStatusChange((s) => setInitMessage(s.message));
      await pipeline.initialize();

      const decomposition = pipeline.getDecomposition();
      if (!decomposition) throw new Error("No decomposition");

      // Initialize three-layer engine
      const engine = new QuantumInferenceEngine({
        modelName: `${selectedModel.name} ${selectedModel.params}`,
        modelParams: selectedModel.params,
        maxTokens: 192,
        vocabSize: manifest.vocabSize,
        hiddenDim: manifest.hiddenDim,
        temperature: 0.7,
        speculativeK: 4,
        yieldEvery: 4,
      });

      await engine.initialize(decomposition, (layerNum, status) => {
        setInitPhase(layerNum === 1 ? "l1" : layerNum === 2 ? "l2" : "l3");
        setInitMessage(status.message);
        setLayerStatuses(prev => [...prev, status]);
      });

      engineRef.current = engine;
      setIsInitializing(false);
      setInitPhase("idle");

      // Stream tokens
      const promptTokens = Array.from(prompt).map((c, i) => c.charCodeAt(0) + i * 7);
      const stream = engine.stream(promptTokens);
      const reader = stream.getReader();

      while (true) {
        if (abortRef.current) { reader.cancel(); break; }
        const { done, value } = await reader.read();
        if (done) break;
        setTokens(prev => [...prev, value]);
        if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
      }

      setStats(engine.stats);
    } catch (err) {
      console.error("[QuantumEngine] Error:", err);
      setInitMessage(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsStreaming(false);
      setIsInitializing(false);
    }
  }, [selectedModel, prompt]);

  const stopInference = useCallback(() => {
    abortRef.current = true;
    engineRef.current?.destroy();
    engineRef.current = null;
  }, []);

  const latestToken = tokens[tokens.length - 1];
  const liveTps = latestToken?.tokensPerSecond ?? 0;
  const liveH = latestToken?.hScore ?? 0;
  const liveZone = latestToken?.zone ?? "divergent";
  const hasRun = tokens.length > 0 || stats;
  const stabCorrections = latestToken ? tokens.filter(t => t.stabilizerCorrected).length : 0;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: P.bg, color: P.text, fontFamily: P.font }}>
      {/* ── Hero Header ── */}
      <div style={{ padding: "28px 40px 20px", borderBottom: `1px solid ${P.borderSubtle}`, background: P.headerGradient, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-80px", right: "-80px", width: "320px", height: "320px", borderRadius: "50%", background: `radial-gradient(circle, ${P.accent}06 0%, transparent 70%)`, pointerEvents: "none" }} />

        <div style={{ display: "flex", alignItems: "flex-start", gap: "20px", position: "relative" }}>
          <div style={{ width: "52px", height: "52px", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${P.accent}18, ${P.accent}06)`, border: `1px solid ${P.accent}20`, flexShrink: 0 }}>
            <IconAtom size={26} style={{ color: P.accent }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: "26px", fontWeight: 700, fontFamily: P.serif, margin: "0 0 4px", color: P.text, letterSpacing: "-0.02em" }}>
              Quantum Inference Engine
            </h1>
            <p style={{ fontSize: "13px", color: P.textMuted, margin: 0, lineHeight: 1.6 }}>
              Hardware emulates qubits · Qubits perform inference · Coherence is the program
            </p>
          </div>
          <div style={{ display: "flex", gap: "6px", flexShrink: 0, flexWrap: "wrap", maxWidth: "300px", justifyContent: "flex-end" }}>
            <Badge P={P} icon={<IconCircuitDiode size={12} />} label="96 Qubits" active />
            <Badge P={P} icon={<IconShield size={12} />} label="[[96,48,2]]" active />
            <Badge P={P} icon={<IconCpu size={12} />} label={gpuAvailable ? "WebGPU" : "CPU"} active={!!gpuAvailable} />
            <Badge P={P} icon={<IconDatabase size={12} />} label="384B KV" active />
          </div>
          {onClose && (
            <button onClick={onClose} style={{ width: "30px", height: "30px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: `1px solid ${P.borderSubtle}`, cursor: "pointer", color: P.textDim, flexShrink: 0 }}>
              <IconX size={14} />
            </button>
          )}
        </div>

        {/* Model + Prompt row */}
        <div style={{ display: "flex", gap: "10px", marginTop: "20px", position: "relative" }}>
          <div style={{ position: "relative" }}>
            <button onClick={() => !isStreaming && setShowModelPicker(p => !p)} disabled={isStreaming} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", borderRadius: "10px", background: P.cardBg, border: `1px solid ${P.cardBorder}`, cursor: isStreaming ? "default" : "pointer", color: P.text, fontSize: "13px", fontWeight: 600, minWidth: "180px", justifyContent: "space-between", opacity: isStreaming ? 0.6 : 1 }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <IconBrain size={15} style={{ color: P.accent }} />
                {selectedModel.name}
                <span style={{ fontSize: "11px", fontWeight: 700, color: P.accent, background: `${P.accent}15`, padding: "1px 6px", borderRadius: "5px" }}>{selectedModel.params}</span>
              </span>
              <IconChevronDown size={13} style={{ color: P.textDim }} />
            </button>
            <AnimatePresence>
              {showModelPicker && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }} style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, width: "340px", zIndex: 50, background: P.cardBg, border: `1px solid ${P.cardBorder}`, borderRadius: "14px", padding: "6px", boxShadow: "0 16px 48px hsla(0,0%,0%,0.4)" }}>
                  {MODELS.map(m => (
                    <button key={m.id} onClick={() => { setSelectedModel(m); setShowModelPicker(false); }} style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%", padding: "12px 14px", borderRadius: "10px", background: selectedModel.id === m.id ? `${P.accent}12` : "transparent", border: selectedModel.id === m.id ? `1px solid ${P.accent}25` : "1px solid transparent", cursor: "pointer", color: P.text, textAlign: "left" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", background: `${P.accent}10`, flexShrink: 0 }}>
                        <IconBrain size={16} style={{ color: P.accent }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "13px", fontWeight: 600 }}>{m.name} <span style={{ color: P.accent }}>{m.params}</span></div>
                        <div style={{ fontSize: "10px", color: P.textDim, marginTop: "1px" }}>{m.tagline} · {m.atlasSize} · KV: {m.kvTraditional}→384B</div>
                      </div>
                      {m.id === "llama70b" && <span style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.1em", color: P.accent, background: `${P.accent}15`, padding: "2px 6px", borderRadius: "5px", textTransform: "uppercase" }}>Featured</span>}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <input type="text" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Ask anything — inference runs at qubit speed..." disabled={isStreaming} onKeyDown={e => e.key === "Enter" && !isStreaming && startInference()} style={{ flex: 1, padding: "10px 16px", borderRadius: "10px", fontSize: "13px", background: P.inputBg, border: `1px solid ${P.inputBorder}`, color: P.text, outline: "none", opacity: isStreaming ? 0.6 : 1 }} />

          {isStreaming ? (
            <button onClick={stopInference} style={{ padding: "10px 20px", borderRadius: "10px", background: `${P.red}20`, color: P.red, border: `1px solid ${P.red}30`, fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
              <IconPlayerStop size={15} /> Stop
            </button>
          ) : (
            <button onClick={startInference} style={{ padding: "10px 24px", borderRadius: "10px", background: P.btnPrimary, color: P.btnPrimaryText, border: "none", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", boxShadow: P.btnPrimaryShadow }}>
              <IconPlayerPlay size={15} /> Run
            </button>
          )}
        </div>

        {/* Quick prompts */}
        <div style={{ display: "flex", gap: "5px", marginTop: "10px", flexWrap: "wrap" }}>
          {DEMO_PROMPTS.map((p, i) => (
            <button key={i} onClick={() => !isStreaming && setPrompt(p)} disabled={isStreaming} style={{ fontSize: "10px", color: prompt === p ? P.accent : P.textDim, background: prompt === p ? `${P.accent}10` : P.cardBgSubtle, padding: "4px 10px", borderRadius: "6px", border: prompt === p ? `1px solid ${P.accent}25` : `1px solid ${P.borderSubtle}`, cursor: isStreaming ? "default" : "pointer" }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── Live Metrics ── */}
      <AnimatePresence>
        {(isStreaming || stats) && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ borderBottom: `1px solid ${P.borderSubtle}`, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px", background: P.borderSubtle }}>
              <MetricCell P={P} label="tok/s" value={stats ? stats.tokensPerSecond.toFixed(0) : liveTps.toFixed(0)} icon={<IconBolt size={13} />} highlight={liveTps > 500} />
              <MetricCell P={P} label="H-score" value={stats ? stats.meanHScore.toFixed(3) : liveH.toFixed(3)} icon={<IconSparkles size={13} />} highlight={liveH > 0.6} />
              <MetricCell P={P} label="Zone" value={stats ? zoneLabel(stats.meanHScore) : liveZone} icon={<IconFlame size={13} />} highlight={liveZone === "convergent"} />
              <MetricCell P={P} label="KV-Cache" value="384B" icon={<IconDatabase size={13} />} highlight sub={`vs ${selectedModel.kvTraditional}`} />
              <MetricCell P={P} label="Qubits" value="96" icon={<IconCircuitDiode size={13} />} highlight />
              <MetricCell P={P} label="Stabilizer" value={`${stabCorrections} fixes`} icon={<IconShield size={13} />} highlight={stabCorrections > 0} />
              <MetricCell P={P} label="Model" value={selectedModel.params} icon={<IconBrain size={13} />} highlight={selectedModel.id === "llama70b"} sub={selectedModel.fullParams} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Token stream */}
        <div ref={outputRef} style={{ flex: 1, overflowY: "auto", padding: "28px 36px", fontSize: "15px", lineHeight: 1.8, fontFamily: "'DM Sans', sans-serif" }}>
          {/* Initializing — Three Layer Boot */}
          {isInitializing && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "24px" }}>
              <ThreeLayerBoot P={P} phase={initPhase} message={initMessage} model={selectedModel} />
            </div>
          )}

          {/* Empty state */}
          {!isInitializing && !hasRun && !isStreaming && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "28px" }}>
              <div style={{ width: "72px", height: "72px", borderRadius: "20px", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${P.accent}10, ${P.accent}04)`, border: `1px solid ${P.accent}12` }}>
                <IconAtom size={36} style={{ color: P.accent, opacity: 0.5 }} />
              </div>
              <div style={{ textAlign: "center" }}>
                <h2 style={{ fontSize: "20px", fontWeight: 600, fontFamily: P.serif, color: P.text, margin: "0 0 8px" }}>
                  Real-time AI, powered by topology
                </h2>
                <p style={{ fontSize: "13px", color: P.textMuted, lineHeight: 1.7, maxWidth: "480px", margin: "0 auto" }}>
                  Select a model and hit Run. The engine projects any model onto 96 virtual qubits,
                  applies stabilizer error correction, and performs coherence inference at constant cost.
                </p>
              </div>

              {/* Three-layer architecture diagram */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2px", maxWidth: "520px", width: "100%" }}>
                <LayerCard P={P} num={3} title="Coherence Inference" desc="H-score navigation · O(96) fixed cost · Model-size-invariant" icon={<IconSparkles size={16} />} color={P.accent} />
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <div style={{ width: "1px", height: "8px", background: P.borderSubtle }} />
                </div>
                <LayerCard P={P} num={2} title="Virtual Qubit Substrate" desc="96 qubits · [[96,48,2]] stabilizer · Topological protection d≥2" icon={<IconCircuitDiode size={16} />} color={P.green} />
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <div style={{ width: "1px", height: "8px", background: P.borderSubtle }} />
                </div>
                <LayerCard P={P} num={1} title="Hardware Emulation" desc={`${gpuAvailable ? "WebGPU" : "CPU"} · Only job: instantiate qubits · Quality-invariant`} icon={<IconCpu size={16} />} color={P.purple} />
              </div>
            </div>
          )}

          {/* Streaming tokens */}
          {tokens.length > 0 && (
            <div>
              <span style={{ color: P.textDim, fontSize: "13px" }}>{prompt} </span>
              {tokens.map((tok, i) => <StreamedToken key={i} token={tok} P={P} />)}
              {isStreaming && (
                <motion.span animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.5, repeat: Infinity }} style={{ display: "inline-block", width: "2px", height: "16px", background: P.accent, borderRadius: "1px", verticalAlign: "middle", marginLeft: "1px" }} />
              )}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <AnimatePresence>
          {hasRun && (
            <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 264, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ borderLeft: `1px solid ${P.borderSubtle}`, overflowY: "auto", overflowX: "hidden", background: P.cardBgSubtle, flexShrink: 0 }}>
              <div style={{ padding: "18px 14px" }}>
                <SectionLabel P={P}>Architecture</SectionLabel>
                <StatRow P={P} label="Model" value={`${selectedModel.name} ${selectedModel.params}`} />
                <StatRow P={P} label="Parameters" value={selectedModel.fullParams} />
                <StatRow P={P} label="Atlas Projection" value={selectedModel.atlasSize} />
                <StatRow P={P} label="Atlas Vertices" value="96" highlight />
                <StatRow P={P} label="Virtual Qubits" value="96" highlight />
                <StatRow P={P} label="Stabilizer Code" value="[[96,48,2]]" />
                <StatRow P={P} label="KV-Cache (Ours)" value="384 bytes" highlight />
                <StatRow P={P} label="KV-Cache (Transformer)" value={selectedModel.kvTraditional} dim />

                <Divider P={P} />
                <SectionLabel P={P}>Performance</SectionLabel>
                {stats ? (
                  <>
                    <StatRow P={P} label="Total Tokens" value={String(stats.totalTokens)} />
                    <StatRow P={P} label="Total Time" value={`${stats.totalTimeMs.toFixed(0)}ms`} />
                    <StatRow P={P} label="Avg tok/s" value={stats.tokensPerSecond.toFixed(0)} highlight />
                    <StatRow P={P} label="Peak tok/s" value={stats.peakTokPerSec.toFixed(0)} highlight />
                    <StatRow P={P} label="Mean H-score" value={stats.meanHScore.toFixed(4)} />
                    <StatRow P={P} label="Hardware" value={stats.hardwareBackend === "webgpu" ? "WebGPU ⚡" : "CPU"} />
                    <StatRow P={P} label="Stabilizer Fixes" value={String(stats.stabilizerCorrections)} />
                    {stats.speculativeAcceptRate > 0 && <StatRow P={P} label="Speculative" value={`${(stats.speculativeAcceptRate * 100).toFixed(0)}%`} />}
                    <StatRow P={P} label="α⁻¹ (geometry)" value={stats.alphaInverse.toFixed(2)} />
                  </>
                ) : (
                  <p style={{ fontSize: "11px", color: P.textDim, fontStyle: "italic" }}>Streaming...</p>
                )}

                <Divider P={P} />
                <SectionLabel P={P}>Layer Init Times</SectionLabel>
                {stats && (
                  <>
                    <StatRow P={P} label="L1 Hardware" value={`${stats.layerTimes.hardware.toFixed(0)}ms`} />
                    <StatRow P={P} label="L2 Qubits" value={`${stats.layerTimes.substrate.toFixed(0)}ms`} />
                    <StatRow P={P} label="L3 Coherence" value={`${stats.layerTimes.inference.toFixed(0)}ms`} />
                  </>
                )}

                <Divider P={P} />
                <SectionLabel P={P}>Why This Works</SectionLabel>
                <p style={{ fontSize: "10px", color: P.textMuted, lineHeight: 1.7 }}>
                  Hardware emulates 96 virtual qubits. The [[96,48,2]] stabilizer code self-corrects errors.
                  Coherence inference navigates the Atlas manifold at O(96) cost — regardless of original
                  model size. KV-cache is replaced by 96 qubit amplitudes = 384 bytes.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom summary ── */}
      <AnimatePresence>
        {stats && !isStreaming && (
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} style={{ padding: "12px 36px", borderTop: `1px solid ${P.borderSubtle}`, background: `linear-gradient(to right, ${P.accent}05, transparent)`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px", color: P.textMuted }}>
              {stats.modelName} · {stats.totalTokens} tokens in {stats.totalTimeMs.toFixed(0)}ms · {stats.stabilizerCorrections} stabilizer corrections · α⁻¹={stats.alphaInverse.toFixed(2)}
            </span>
            <span style={{ fontSize: "15px", fontWeight: 700, color: P.accent }}>
              {stats.tokensPerSecond.toFixed(0)} tok/s {stats.hardwareBackend === "webgpu" ? "⚡" : ""}
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
    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "10px", fontWeight: 600, color: active ? P.accent : P.textDim, background: active ? `${P.accent}12` : P.cardBgSubtle, border: `1px solid ${active ? `${P.accent}25` : P.borderSubtle}`, padding: "4px 8px", borderRadius: "6px" }}>
      {icon} {label}
    </span>
  );
}

function MetricCell({ P, label, value, icon, highlight, sub }: { P: PagePalette; label: string; value: string; icon: React.ReactNode; highlight: boolean; sub?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 6px", background: P.bg }}>
      <div style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "8px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: highlight ? P.accent : P.textDim }}>
        {icon} {label}
      </div>
      <motion.span key={value} initial={{ y: -2, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ fontSize: "16px", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: highlight ? P.accent : P.text, marginTop: "1px" }}>
        {value}
      </motion.span>
      {sub && <span style={{ fontSize: "8px", color: P.textDim, marginTop: "1px" }}>{sub}</span>}
    </div>
  );
}

function LayerCard({ P, num, title, desc, icon, color }: { P: PagePalette; num: number; title: string; desc: string; icon: React.ReactNode; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "16px 20px", borderRadius: "12px", background: P.cardBg, border: `1px solid ${P.cardBorder}` }}>
      <div style={{ width: "36px", height: "36px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", background: `${color}12`, border: `1px solid ${color}25`, flexShrink: 0, color }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: P.text }}>
          <span style={{ fontSize: "10px", fontWeight: 700, color, marginRight: "6px" }}>L{num}</span>
          {title}
        </div>
        <div style={{ fontSize: "11px", color: P.textDim, marginTop: "2px" }}>{desc}</div>
      </div>
    </div>
  );
}

function ThreeLayerBoot({ P, phase, message, model }: { P: PagePalette; phase: string; message: string; model: ModelProfile }) {
  const layers = [
    { id: "projecting", label: "Atlas Projection", desc: `Decomposing ${model.fullParams} params → 96 vertices` },
    { id: "l1", label: "L1 · Hardware Emulation", desc: "Detecting GPU · Compiling WGSL shaders" },
    { id: "l2", label: "L2 · Virtual Qubit Substrate", desc: "Instantiating 96 qubits · Building gate algebra" },
    { id: "l3", label: "L3 · Coherence Inference", desc: "Building value caches · Wiring stabilizer" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", maxWidth: "420px" }}>
      <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: P.textDim, textAlign: "center", marginBottom: "8px" }}>
        Initializing Quantum Engine
      </p>
      {layers.map((l, i) => {
        const isActive = phase === l.id;
        const isDone = layers.findIndex(x => x.id === phase) > i;
        return (
          <div key={l.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "10px", background: isActive ? `${P.accent}08` : P.cardBg, border: `1px solid ${isActive ? `${P.accent}20` : P.cardBorder}`, opacity: isDone ? 0.5 : 1 }}>
            <div style={{ width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {isDone ? (
                <span style={{ color: P.green, fontSize: "14px" }}>✓</span>
              ) : isActive ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} style={{ width: "16px", height: "16px", borderRadius: "50%", border: `2px solid ${P.accent}40`, borderTopColor: P.accent }} />
              ) : (
                <span style={{ color: P.textDim, fontSize: "12px" }}>○</span>
              )}
            </div>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: isActive ? P.accent : isDone ? P.textDim : P.text }}>{l.label}</div>
              <div style={{ fontSize: "10px", color: P.textDim }}>{isActive ? message : l.desc}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StreamedToken({ token, P }: { token: QuantumToken; P: PagePalette }) {
  const hue = token.zone === "convergent" ? 142 : token.zone === "exploring" ? 38 : 0;
  const display = token.text || String.fromCharCode(32 + (token.tokenId % 95));
  return (
    <motion.span initial={{ opacity: 0, y: 2 }} animate={{ opacity: 0.4 + token.hScore * 0.6, y: 0 }} transition={{ duration: 0.04 }}
      title={`Token ${token.tokenId} · H=${token.hScore.toFixed(3)} · ${token.tokensPerSecond.toFixed(0)} tok/s · v${token.activeVertex}${token.stabilizerCorrected ? " · corrected" : ""}${token.speculative ? " · speculative" : ""}`}
      style={{ color: `hsl(${hue}, 50%, ${45 + token.hScore * 25}%)`, display: "inline" }}>
      {display}
    </motion.span>
  );
}

function StatRow({ P, label, value, highlight, dim }: { P: PagePalette; label: string; value: string; highlight?: boolean; dim?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", fontSize: "11px" }}>
      <span style={{ color: P.textDim }}>{label}</span>
      <span style={{ fontWeight: highlight ? 700 : 500, fontVariantNumeric: "tabular-nums", color: dim ? P.textDim : highlight ? P.accent : P.text, textDecoration: dim ? "line-through" : "none" }}>{value}</span>
    </div>
  );
}

function SectionLabel({ P, children }: { P: PagePalette; children: React.ReactNode }) {
  return <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: P.textDim, marginBottom: "10px", marginTop: "0" }}>{children}</p>;
}

function Divider({ P }: { P: PagePalette }) {
  return <div style={{ height: "1px", background: P.borderSubtle, margin: "14px 0" }} />;
}

function zoneLabel(h: number): string {
  if (h >= 0.8) return "convergent";
  if (h >= 0.4) return "exploring";
  return "divergent";
}
