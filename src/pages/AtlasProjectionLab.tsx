/**
 * Atlas Projection Lab — AI Lab
 * ══════════════════════════════
 *
 * A full-screen AI laboratory organized into four intuitive sections:
 *   1. Discover  — Browse open-source models from HuggingFace
 *   2. Project   — Load and project a model onto the Atlas manifold
 *   3. Play      — Generate text and explore model behavior
 *   4. Benchmark — Live side-by-side performance comparison
 */

import { useState, useCallback, useRef, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconBrain, IconAtom, IconChartBar, IconPlayerPlay,
  IconLoader2, IconCheck, IconAlertTriangle, IconRocket, IconCpu,
  IconSparkles, IconEye, IconWand, IconFlask, IconArrowRight,
} from "@tabler/icons-react";
import { KP } from "@/modules/hologram-os/kernel-palette";

const MultiModelBenchmark = lazy(() => import("./MultiModelBenchmark"));
const HuggingFaceModelBrowser = lazy(() => import("./HuggingFaceModelBrowser"));
import {
  AtlasProjectionPipeline,
  MODEL_MANIFESTS,
  type PipelineStatus,
  type PipelineReport,
  type InferenceResult,
} from "@/modules/hologram-compute";
import {
  BROWSER_MODELS,
  loadHFModel,
  tokenize,
  detokenize,
  baselineInference,
  computePerplexity,
  computePerTokenNLL,
  type ModelLoadStatus,
  type LoadedHFModel,
} from "@/modules/hologram-compute/hf-model-bridge";

// ── Shared styles ────────────────────────────────────────────
const card: React.CSSProperties = {
  background: "hsla(25, 8%, 10%, 0.5)",
  border: "1px solid hsla(38, 12%, 70%, 0.08)",
  borderRadius: "20px",
  padding: "24px",
  backdropFilter: "blur(20px)",
};
const sectionTitle: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: 600,
  letterSpacing: "0.15em",
  textTransform: "uppercase" as const,
  color: KP.dim,
};
const inputStyle: React.CSSProperties = {
  background: "hsla(25, 8%, 8%, 0.6)",
  border: "1px solid hsla(38, 12%, 70%, 0.1)",
  borderRadius: "14px",
  padding: "12px 16px",
  color: KP.text,
  fontSize: "14px",
  outline: "none",
  width: "100%",
  transition: "border-color 0.2s, box-shadow 0.2s",
};
const btnPrimary: React.CSSProperties = {
  background: "linear-gradient(135deg, hsl(38, 50%, 50%), hsl(32, 55%, 42%))",
  color: "hsl(30, 20%, 95%)",
  borderRadius: "14px",
  padding: "12px 24px",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
  border: "none",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  transition: "transform 0.15s, box-shadow 0.15s",
  boxShadow: "0 4px 16px hsla(38, 50%, 40%, 0.2)",
};

// ── Tabs ──
type LabTab = "discover" | "project" | "play" | "benchmark";

export default function AtlasProjectionLab() {
  const [activeTab, setActiveTab] = useState<LabTab>("discover");
  const [selectedModel, setSelectedModel] = useState<string>("smollm2-135m");
  const [useRealModel, setUseRealModel] = useState(false);
  const [loadStatus, setLoadStatus] = useState<ModelLoadStatus>({ stage: "idle", progress: 0, message: "" });
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>({
    stage: "idle", progress: 0, message: "Not initialized",
    decomposition: null, holographicEncoding: null, engramEntries: 0,
  });
  const [report, setReport] = useState<PipelineReport | null>(null);
  const [inferenceResult, setInferenceResult] = useState<InferenceResult | null>(null);
  const [baselineResult, setBaselineResult] = useState<{ text: string; timeMs: number; tokensPerSecond: number; tokenIds: number[] } | null>(null);
  const [prompt, setPrompt] = useState("The fundamental nature of reality is");
  const [generatedText, setGeneratedText] = useState<string>("");
  const [isRunningBaseline, setIsRunningBaseline] = useState(false);
  const [perplexityStats, setPerplexityStats] = useState<{
    atlas: { perplexity: number; avgNLL: number } | null;
    baseline: { perplexity: number; avgNLL: number } | null;
  }>({ atlas: null, baseline: null });
  const [perTokenNLL, setPerTokenNLL] = useState<{
    atlas: { index: number; nll: number; tokenStr: string }[];
    baseline: { index: number; nll: number; tokenStr: string }[];
  }>({ atlas: [], baseline: [] });
  const loadedModelRef = useRef<LoadedHFModel | null>(null);
  const pipelineRef = useRef<AtlasProjectionPipeline | null>(null);
  const logRef = useRef<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  const addLog = useCallback((msg: string) => {
    logRef.current = [...logRef.current, `[${new Date().toLocaleTimeString()}] ${msg}`];
    setLogs([...logRef.current]);
  }, []);

  // ── Initialize Pipeline ────────────────────────────────────
  const handleInitialize = useCallback(async () => {
    try {
      addLog("Starting Atlas Projection Pipeline...");
      let manifest = MODEL_MANIFESTS[selectedModel] || MODEL_MANIFESTS["smollm2-1.7b"];
      let weightLoader: ((layer: number, matrix: any) => Float32Array | null) | undefined;

      if (useRealModel) {
        addLog(`Loading real model from HuggingFace: ${BROWSER_MODELS[selectedModel]?.name ?? selectedModel}`);
        const loaded = await loadHFModel(selectedModel, (status) => {
          setLoadStatus(status);
          if (status.message) addLog(status.message);
        });
        loadedModelRef.current = loaded;
        manifest = loaded.manifest;
        weightLoader = loaded.weightLoader;
        addLog(`Model loaded: ${loaded.weights.size} weight tensors extracted`);
      } else {
        addLog(`Using synthetic weights for ${manifest?.name ?? selectedModel}`);
        const profile = BROWSER_MODELS[selectedModel];
        if (profile) manifest = profile.manifest;
      }

      const pipeline = new AtlasProjectionPipeline({
        manifest,
        maxLayers: Math.min(manifest.layerCount, 8),
        useCompression: true,
        weightLoader,
      });

      pipeline.onStatusChange((status) => {
        setPipelineStatus(status);
        if (status.message) addLog(status.message);
      });

      pipelineRef.current = pipeline;

      if (loadedModelRef.current) {
        const loadedModel = loadedModelRef.current;
        const lmHeadWeights = loadedModel.weights.get("lm_head");
        if (lmHeadWeights) {
          const vocabSize = loadedModel.manifest.vocabSize;
          const hiddenDim = loadedModel.manifest.hiddenDim;
          pipeline.setLmHead(lmHeadWeights, vocabSize, hiddenDim);
          addLog(`✓ Real lm_head wired: [${vocabSize}×${hiddenDim}] → Atlas projection`);
        } else {
          addLog("⚠ lm_head weights not found, using fallback projection");
        }
        const { getNextTokenLogits } = await import("@/modules/hologram-compute/hf-model-bridge");
        pipeline.setLogitsCallback(async (context: number[]) => {
          return getNextTokenLogits(loadedModel, context.slice(-32));
        });
        addLog("✓ Real model forward-pass callback wired");
      }

      addLog("Running full pipeline benchmark...");
      const benchmarkReport = await pipeline.benchmark([1, 2, 3, 4, 5], 16);
      setReport(benchmarkReport);
      addLog(`✓ Pipeline ready! ${benchmarkReport.decomposition.totalBlocks} blocks projected`);
      addLog(`  Compression: ${benchmarkReport.holographicEncoding.compressionRatio.toFixed(1)}×`);
      addLog(`  Bekenstein efficiency: ${(benchmarkReport.holographicEncoding.bekensteinEfficiency * 100).toFixed(1)}%`);
      addLog(`  Benchmark: ${benchmarkReport.benchmarkResult.tokensPerSecond.toFixed(0)} tok/s`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      addLog(`✗ Error: ${msg}`);
    }
  }, [selectedModel, useRealModel, addLog]);

  // ── Run Inference ──────────────────────────────────────────
  const handleInfer = useCallback(async () => {
    const pipeline = pipelineRef.current;
    if (!pipeline || pipelineStatus.stage !== "ready") {
      addLog("Pipeline not ready. Initialize first.");
      return;
    }
    addLog(`Generating from prompt: "${prompt}"`);
    setPerplexityStats({ atlas: null, baseline: null });
    setPerTokenNLL({ atlas: [], baseline: [] });

    let tokenIds: number[];
    if (loadedModelRef.current) {
      tokenIds = tokenize(loadedModelRef.current, prompt);
      addLog(`Tokenized: ${tokenIds.length} tokens`);
    } else {
      tokenIds = prompt.split(/\s+/).map((w) => {
        let h = 0;
        for (let j = 0; j < w.length; j++) h = (h * 31 + w.charCodeAt(j)) & 0xFFFF;
        return h % 50000;
      });
      addLog(`Pseudo-tokenized: ${tokenIds.length} tokens`);
    }

    const result = await pipeline.infer(tokenIds, 32);
    setInferenceResult(result);

    if (loadedModelRef.current) {
      const text = detokenize(loadedModelRef.current, result.tokenIds);
      setGeneratedText(text);
      addLog(`Generated: "${text}"`);
    } else {
      setGeneratedText(`[Token IDs: ${result.tokenIds.slice(0, 8).join(", ")}...]`);
      addLog(`Generated ${result.tokenIds.length} tokens`);
    }
    addLog(`  H-score: ${result.meanHScore.toFixed(4)}, Speed: ${result.tokensPerSecond.toFixed(0)} tok/s`);

    if (loadedModelRef.current) {
      setIsRunningBaseline(true);
      addLog("Running standard transformer baseline...");
      try {
        const baseline = await baselineInference(loadedModelRef.current, prompt, 32);
        setBaselineResult(baseline);
        addLog(`  Baseline: ${baseline.tokensPerSecond.toFixed(0)} tok/s`);
        const speedup = (baseline.timeMs > 0 && result.totalTimeMs > 0) ? (baseline.timeMs / result.totalTimeMs).toFixed(1) : "N/A";
        addLog(`  ⚡ Coherence speedup: ${speedup}×`);

        addLog("📊 Computing perplexity...");
        const atlasFullSeq = [...tokenIds, ...result.tokenIds];
        const [atlasPpl, baselinePpl, atlasPerToken, baselinePerToken] = await Promise.all([
          computePerplexity(loadedModelRef.current!, atlasFullSeq),
          computePerplexity(loadedModelRef.current!, baseline.tokenIds),
          computePerTokenNLL(loadedModelRef.current!, atlasFullSeq),
          computePerTokenNLL(loadedModelRef.current!, baseline.tokenIds),
        ]);
        setPerplexityStats({
          atlas: { perplexity: atlasPpl.perplexity, avgNLL: atlasPpl.avgNLL },
          baseline: { perplexity: baselinePpl.perplexity, avgNLL: baselinePpl.avgNLL },
        });
        setPerTokenNLL({ atlas: atlasPerToken, baseline: baselinePerToken });
        addLog(`  📊 Atlas PPL: ${atlasPpl.perplexity.toFixed(1)}, Baseline PPL: ${baselinePpl.perplexity.toFixed(1)}`);
      } catch (e) {
        addLog(`  Baseline comparison skipped: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setIsRunningBaseline(false);
      }
    }
  }, [prompt, pipelineStatus.stage, addLog]);

  const stageColor = pipelineStatus.stage === "ready" ? KP.green : pipelineStatus.stage === "error" ? KP.red : KP.gold;

  const tabs: { key: LabTab; label: string; icon: React.ReactNode; desc: string; hint: string }[] = [
    { key: "discover", label: "Discover", icon: <IconEye size={16} />, desc: "Browse thousands of open-source AI models", hint: "Find models on HuggingFace" },
    { key: "project", label: "Project", icon: <IconAtom size={16} />, desc: "Load a model and project it onto the Atlas manifold", hint: "Initialize the pipeline" },
    { key: "play", label: "Play", icon: <IconWand size={16} />, desc: "Generate text and explore how the model thinks", hint: "Try text generation" },
    { key: "benchmark", label: "Benchmark", icon: <IconFlask size={16} />, desc: "Live performance comparison across real models", hint: "Run live benchmarks" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: KP.bg, color: KP.text, fontFamily: KP.font }}>
      {/* ── Hero Header ── */}
      <div style={{
        padding: "48px 32px 0",
        background: "linear-gradient(180deg, hsla(25, 12%, 8%, 1) 0%, hsla(25, 8%, 6%, 0) 100%)",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Ambient glow */}
        <div style={{
          position: "absolute", top: "-120px", left: "50%", transform: "translateX(-50%)",
          width: "600px", height: "300px",
          background: "radial-gradient(ellipse, hsla(38, 50%, 50%, 0.06), transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ maxWidth: "1200px", margin: "0 auto", position: "relative" }}>
          {/* Icon + Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
            <div style={{
              width: "56px", height: "56px", borderRadius: "16px",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "linear-gradient(145deg, hsla(38, 50%, 50%, 0.15), hsla(260, 30%, 50%, 0.08))",
              border: "1px solid hsla(38, 50%, 50%, 0.15)",
              boxShadow: "0 0 40px hsla(38, 50%, 50%, 0.08)",
            }}>
              <IconSparkles size={26} style={{ color: KP.gold }} />
            </div>
            <div>
              <h1 style={{
                fontSize: "32px", fontWeight: 600, fontFamily: KP.serif,
                color: KP.text, margin: 0, lineHeight: 1.2, letterSpacing: "-0.02em",
              }}>
                AI Lab
              </h1>
              <p style={{ fontSize: "14px", color: KP.muted, margin: "4px 0 0", lineHeight: 1.5 }}>
                Understand how AI models think — transparently and beautifully
              </p>
            </div>
          </div>

          {/* Mission statement */}
          <div style={{
            ...card, padding: "24px 28px", marginTop: "24px",
            background: "linear-gradient(135deg, hsla(38, 30%, 50%, 0.06), hsla(260, 20%, 50%, 0.03))",
            borderColor: "hsla(38, 30%, 50%, 0.1)",
          }}>
            <p style={{ fontSize: "15px", lineHeight: 1.8, color: KP.muted, margin: 0, maxWidth: "720px" }}>
              Most AI feels like a black box — you type something, something comes back, and you're
              asked to trust it. <span style={{ color: KP.text }}>This lab changes that.</span> It lets
              you load real open-source models right in your browser, watch how they process language
              through geometric projection, and compare their quality side by side.
              <span style={{ color: "hsl(38, 40%, 55%)" }}> Everything here is real, auditable, and yours to explore.</span>
            </p>
          </div>

          {/* ── Tab Navigation ── */}
          <div style={{ display: "flex", gap: "4px", marginTop: "32px" }}>
            {tabs.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "12px 20px", fontSize: "13px", fontWeight: 500,
                  fontFamily: KP.font,
                  background: activeTab === key ? "hsla(25, 8%, 12%, 0.8)" : "transparent",
                  color: activeTab === key ? KP.text : KP.dim,
                  border: "1px solid",
                  borderColor: activeTab === key ? "hsla(38, 12%, 70%, 0.1)" : "transparent",
                  borderBottom: activeTab === key ? "1px solid hsla(25, 8%, 12%, 0.8)" : "1px solid transparent",
                  borderRadius: "14px 14px 0 0",
                  cursor: "pointer", transition: "all 0.2s",
                  position: "relative", top: "1px",
                }}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div style={{
        borderTop: "1px solid hsla(38, 12%, 70%, 0.06)",
        padding: "32px",
        maxWidth: "1200px",
        margin: "0 auto",
      }}>
        {/* Tab header */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            {tabs.find(t => t.key === activeTab)?.icon}
            <h2 style={{ fontSize: "18px", fontWeight: 600, color: KP.text, margin: 0 }}>
              {tabs.find(t => t.key === activeTab)?.label}
            </h2>
          </div>
          <p style={{ fontSize: "13px", color: KP.dim, margin: 0 }}>
            {tabs.find(t => t.key === activeTab)?.desc}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* ════════════════════════════════════════════════════════
              DISCOVER — Browse models from HuggingFace
              ════════════════════════════════════════════════════════ */}
          {activeTab === "discover" && (
            <motion.div key="discover" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
              {/* Intro card */}
              <div style={{
                ...card, marginBottom: "24px",
                background: "linear-gradient(135deg, hsla(200, 30%, 50%, 0.04), hsla(38, 20%, 50%, 0.02))",
                borderColor: "hsla(200, 20%, 50%, 0.08)",
              }}>
                <p style={{ fontSize: "14px", color: KP.muted, margin: 0, lineHeight: 1.7 }}>
                  HuggingFace hosts over <span style={{ color: KP.text, fontWeight: 600 }}>500,000 open-source AI models</span> — 
                  from tiny 135M-parameter models that run on any phone, to massive 70B+ research models. 
                  Search by task (text generation, translation, image classification) or by name. 
                  When you find one you like, you can seed it into Hologram for local projection and inference.
                </p>
              </div>

              <Suspense fallback={<LoadingPlaceholder text="Loading model browser…" />}>
                <HuggingFaceModelBrowser />
              </Suspense>

              {/* CTA to next step */}
              <div style={{ marginTop: "24px", display: "flex", justifyContent: "center" }}>
                <button
                  onClick={() => setActiveTab("project")}
                  style={{
                    ...btnPrimary,
                    background: "transparent",
                    color: KP.gold,
                    border: `1px solid hsla(38, 40%, 50%, 0.2)`,
                    boxShadow: "none",
                  }}
                >
                  Found a model? Project it onto Atlas
                  <IconArrowRight size={14} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════
              PROJECT — Load & project a model onto Atlas manifold
              ════════════════════════════════════════════════════════ */}
          {activeTab === "project" && (
            <motion.div key="project" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
              {/* Explanation */}
              <div style={{
                ...card, marginBottom: "24px",
                background: "linear-gradient(135deg, hsla(38, 30%, 50%, 0.04), hsla(260, 20%, 50%, 0.02))",
                borderColor: "hsla(38, 20%, 50%, 0.08)",
              }}>
                <p style={{ fontSize: "14px", color: KP.muted, margin: 0, lineHeight: 1.7 }}>
                  Traditional AI models process language using <span style={{ color: KP.text }}>quadratic attention</span> — 
                  comparing every word to every other word. Atlas replaces this with a 
                  <span style={{ color: KP.gold }}> geometric manifold</span> of 96 vertices, 
                  reducing complexity from O(N²) to O(96). Select a model below, initialize the pipeline, 
                  and watch the projection happen in real time.
                </p>
              </div>

              {/* Step-by-step guide */}
              {pipelineStatus.stage === "idle" && (
                <div style={{
                  ...card, marginBottom: "24px",
                  padding: "28px",
                  background: "hsla(25, 8%, 9%, 0.4)",
                }}>
                  <h3 style={{ fontSize: "15px", fontWeight: 600, color: KP.text, margin: "0 0 16px" }}>
                    How it works
                  </h3>
                  <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
                    {[
                      { step: "1", title: "Choose a model", text: "Pick from browser-viable models (real weights) or larger synthetic projections" },
                      { step: "2", title: "Initialize", text: "The pipeline downloads weights, decomposes tensors, and encodes them on the Atlas manifold" },
                      { step: "3", title: "Explore", text: "Once projected, head to Play to generate text or Benchmark to compare performance" },
                    ].map(({ step, title, text }) => (
                      <div key={step} style={{ flex: "1 1 240px", display: "flex", gap: "14px", alignItems: "flex-start" }}>
                        <div style={{
                          width: "32px", height: "32px", borderRadius: "10px", flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: "hsla(38, 40%, 50%, 0.1)",
                          color: KP.gold, fontSize: "14px", fontWeight: 700,
                          border: "1px solid hsla(38, 40%, 50%, 0.15)",
                        }}>
                          {step}
                        </div>
                        <div>
                          <p style={{ fontSize: "13px", color: KP.text, margin: "0 0 4px", fontWeight: 500 }}>{title}</p>
                          <p style={{ fontSize: "12px", color: KP.dim, margin: 0, lineHeight: 1.6 }}>{text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Controls */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                {/* Model Selection */}
                <div style={card}>
                  <p style={sectionTitle}>Select Model</p>
                  <div style={{ marginTop: "14px" }}>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      style={{
                        ...inputStyle, cursor: "pointer",
                        appearance: "none" as const,
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 14px center",
                        paddingRight: "40px",
                      }}
                    >
                      <optgroup label="Browser-Viable (Real Weights)">
                        {Object.entries(BROWSER_MODELS).map(([id, profile]) => (
                          <option key={id} value={id}>{profile.name} ({profile.downloadSizeMB}MB)</option>
                        ))}
                      </optgroup>
                      <optgroup label="Synthetic Projection">
                        {Object.entries(MODEL_MANIFESTS).map(([id, m]) => (
                          <option key={id} value={id}>{m.name} ({(m.parameterCount / 1e9).toFixed(1)}B)</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  <label style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    marginTop: "14px", cursor: "pointer", fontSize: "13px", color: KP.muted,
                  }}>
                    <input
                      type="checkbox" checked={useRealModel}
                      onChange={(e) => setUseRealModel(e.target.checked)}
                      style={{ accentColor: KP.gold, width: "16px", height: "16px" }}
                    />
                    Download real weights from HuggingFace
                    {useRealModel && <span style={{ color: KP.gold, fontSize: "11px" }}>(~270MB)</span>}
                  </label>

                  <button
                    onClick={handleInitialize}
                    disabled={pipelineStatus.stage !== "idle" && pipelineStatus.stage !== "ready" && pipelineStatus.stage !== "error"}
                    style={{
                      ...btnPrimary, width: "100%", justifyContent: "center", marginTop: "18px",
                      opacity: (pipelineStatus.stage !== "idle" && pipelineStatus.stage !== "ready" && pipelineStatus.stage !== "error") ? 0.5 : 1,
                    }}
                  >
                    <IconRocket size={16} />
                    {pipelineStatus.stage === "ready" ? "Re-initialize" : "Initialize Pipeline"}
                  </button>
                </div>

                {/* Status */}
                <div style={card}>
                  <p style={sectionTitle}>Pipeline Status</p>

                  {useRealModel && loadStatus.stage !== "idle" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "14px", fontSize: "13px", color: KP.muted }}>
                      <StageIcon stage={loadStatus.stage} />
                      <span>{loadStatus.message}</span>
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "14px", fontSize: "13px", color: KP.muted }}>
                    <StageIcon stage={pipelineStatus.stage} />
                    <span>{pipelineStatus.message}</span>
                  </div>

                  <div style={{
                    width: "100%", height: "6px", borderRadius: "3px",
                    background: "hsla(38, 12%, 70%, 0.08)", marginTop: "14px", overflow: "hidden",
                  }}>
                    <motion.div
                      style={{ height: "100%", borderRadius: "3px", background: stageColor }}
                      animate={{ width: `${pipelineStatus.progress * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>

                  {report && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginTop: "18px" }}>
                      <Metric label="Compression" value={`${report.holographicEncoding.compressionRatio.toFixed(1)}×`} />
                      <Metric label="Bekenstein" value={`${(report.holographicEncoding.bekensteinEfficiency * 100).toFixed(0)}%`} />
                      <Metric label="Tok/s" value={`${report.benchmarkResult.tokensPerSecond.toFixed(0)}`} />
                    </div>
                  )}

                  {/* Navigate to play */}
                  {pipelineStatus.stage === "ready" && (
                    <button
                      onClick={() => setActiveTab("play")}
                      style={{
                        ...btnPrimary, width: "100%", justifyContent: "center", marginTop: "18px",
                        background: "linear-gradient(135deg, hsl(152, 44%, 45%), hsl(152, 44%, 38%))",
                        boxShadow: "0 4px 16px hsla(152, 44%, 40%, 0.2)",
                      }}
                    >
                      <IconWand size={16} />
                      Pipeline Ready — Start Playing
                      <IconArrowRight size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Reports */}
              {report && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "20px" }}>
                  <ReportPanel title="Atlas Projection" icon={<IconAtom size={14} style={{ color: KP.gold }} />} content={report.projectionReport} />
                  <ReportPanel title="Holographic Codec" icon={<IconChartBar size={14} style={{ color: KP.gold }} />} content={report.holographicReport} />
                </div>
              )}

              {/* Log */}
              <div style={{ ...card, marginTop: "20px" }}>
                <button
                  onClick={() => setShowLogs((p) => !p)}
                  style={{
                    ...sectionTitle, background: "none", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: "8px", padding: 0,
                  }}
                >
                  Pipeline Log
                  <span style={{ fontSize: "10px", color: KP.dim, fontWeight: 400 }}>
                    {showLogs ? "▲ hide" : `▼ ${logs.length} entries`}
                  </span>
                </button>
                {showLogs && (
                  <div style={{
                    marginTop: "14px", maxHeight: "200px", overflowY: "auto",
                    fontFamily: "monospace", fontSize: "11px", color: KP.dim,
                    padding: "14px", borderRadius: "12px",
                    background: "hsla(25, 8%, 6%, 0.6)",
                    border: "1px solid hsla(38, 12%, 70%, 0.06)",
                    lineHeight: 1.7,
                  }}>
                    {logs.length === 0 ? (
                      <span style={{ opacity: 0.5 }}>Waiting for initialization…</span>
                    ) : logs.map((log, i) => (
                      <div key={i} style={{ color: log.includes("✓") ? KP.green : log.includes("✗") ? KP.red : KP.dim }}>{log}</div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════
              PLAY — Generate text with the projected model
              ════════════════════════════════════════════════════════ */}
          {activeTab === "play" && (
            <motion.div key="play" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
              {pipelineStatus.stage !== "ready" ? (
                /* Not ready state */
                <div style={{
                  ...card, textAlign: "center", padding: "48px",
                  background: "hsla(25, 8%, 9%, 0.4)",
                }}>
                  <IconAtom size={40} style={{ color: KP.dim, margin: "0 auto 16px" }} />
                  <h3 style={{ fontSize: "16px", fontWeight: 600, color: KP.text, margin: "0 0 8px" }}>
                    No model projected yet
                  </h3>
                  <p style={{ fontSize: "13px", color: KP.dim, margin: "0 0 20px", maxWidth: "400px", marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
                    To generate text, you need to first select and project a model onto the Atlas manifold. 
                    This takes about 10–30 seconds depending on the model size.
                  </p>
                  <button onClick={() => setActiveTab("project")} style={btnPrimary}>
                    <IconRocket size={16} />
                    Go to Project
                  </button>
                </div>
              ) : (
                /* Ready — show inference UI */
                <>
                  <div style={{ ...card, marginBottom: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
                      <IconCpu size={16} style={{ color: KP.gold }} />
                      <span style={{ fontSize: "14px", fontWeight: 500, color: KP.text }}>Generate Text</span>
                      <span style={{ fontSize: "11px", color: KP.dim, marginLeft: "auto" }}>
                        Type a prompt and press Enter
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "10px" }}>
                      <input
                        type="text" value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Type anything — the model will complete your thought…"
                        onKeyDown={(e) => e.key === "Enter" && handleInfer()}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <button onClick={handleInfer} style={btnPrimary}>
                        <IconPlayerPlay size={14} />
                        Generate
                      </button>
                    </div>

                    {generatedText && (
                      <div style={{
                        marginTop: "18px", padding: "18px 20px", borderRadius: "14px",
                        background: "hsla(25, 8%, 8%, 0.5)",
                        border: "1px solid hsla(38, 12%, 70%, 0.08)",
                        fontSize: "14px", fontFamily: "monospace", color: KP.text,
                        whiteSpace: "pre-wrap", lineHeight: 1.7,
                      }}>
                        <span style={{ color: KP.dim }}>{prompt}</span>
                        <span style={{ color: KP.gold }}>{generatedText.replace(prompt, "")}</span>
                      </div>
                    )}

                    {inferenceResult && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px", marginTop: "18px" }}>
                        <Metric label="Tokens" value={`${inferenceResult.tokenIds.length}`} />
                        <Metric label="H-score" value={inferenceResult.meanHScore.toFixed(3)} />
                        <Metric label="Tok/s" value={`${inferenceResult.tokensPerSecond.toFixed(0)}`} />
                        <Metric label="Time" value={`${inferenceResult.totalTimeMs.toFixed(0)}ms`} />
                      </div>
                    )}

                    {inferenceResult && inferenceResult.steps.length > 0 && (
                      <div style={{ marginTop: "18px" }}>
                        <p style={{ ...sectionTitle, marginBottom: "10px" }}>Coherence Journey</p>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "56px" }}>
                          {inferenceResult.steps.map((step, i) => (
                            <div key={i} style={{
                              flex: 1, borderRadius: "3px 3px 0 0",
                              height: `${step.state.hScore * 100}%`,
                              background: step.state.zone === "convergent" ? KP.green : step.state.zone === "exploring" ? KP.gold : KP.red,
                              opacity: 0.4 + step.state.hScore * 0.6,
                              transition: "height 0.3s",
                            }} title={`Step ${i}: H=${step.state.hScore.toFixed(3)} (${step.state.zone})`} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Comparison */}
                  {baselineResult && inferenceResult && (
                    <div style={{ ...card, marginTop: "20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
                        <IconChartBar size={16} style={{ color: KP.gold }} />
                        <span style={{ fontSize: "14px", fontWeight: 500, color: KP.text }}>Atlas vs Standard Transformer</span>
                      </div>

                      {perplexityStats.atlas && perplexityStats.baseline && (
                        <div style={{
                          padding: "18px", borderRadius: "14px", marginBottom: "18px",
                          background: "linear-gradient(135deg, hsla(38, 30%, 50%, 0.04), hsla(260, 20%, 50%, 0.02))",
                          border: "1px solid hsla(38, 12%, 70%, 0.06)",
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px" }}>
                            <span style={sectionTitle}>Perplexity</span>
                            <span style={{ fontSize: "10px", color: KP.dim }}>lower = more coherent</span>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px" }}>
                            <Metric label="Atlas PPL" value={perplexityStats.atlas.perplexity === Infinity ? "∞" : perplexityStats.atlas.perplexity.toFixed(1)} />
                            <Metric label="Baseline PPL" value={perplexityStats.baseline.perplexity === Infinity ? "∞" : perplexityStats.baseline.perplexity.toFixed(1)} />
                            <Metric label="Quality Ratio" value={
                              perplexityStats.atlas.perplexity === Infinity || perplexityStats.baseline.perplexity === Infinity
                                ? "N/A" : `${(perplexityStats.atlas.perplexity / perplexityStats.baseline.perplexity).toFixed(2)}×`
                            } />
                            <QualityGradeBadge ratio={
                              perplexityStats.atlas.perplexity === Infinity || perplexityStats.baseline.perplexity === Infinity
                                ? Infinity : perplexityStats.atlas.perplexity / perplexityStats.baseline.perplexity
                            } />
                          </div>
                          {perplexityStats.atlas.perplexity !== Infinity && perplexityStats.baseline.perplexity !== Infinity && (
                            <div style={{ marginTop: "14px" }}>
                              <PerplexityBar label="Atlas" value={perplexityStats.atlas.perplexity}
                                maxVal={Math.max(perplexityStats.atlas.perplexity, perplexityStats.baseline.perplexity)} color={KP.gold} />
                              <PerplexityBar label="Baseline" value={perplexityStats.baseline.perplexity}
                                maxVal={Math.max(perplexityStats.atlas.perplexity, perplexityStats.baseline.perplexity)} color={KP.purple} />
                            </div>
                          )}
                        </div>
                      )}

                      {perTokenNLL.atlas.length > 0 && perTokenNLL.baseline.length > 0 && (
                        <NLLChart atlas={perTokenNLL.atlas} baseline={perTokenNLL.baseline} />
                      )}

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginTop: "18px" }}>
                        <ComparisonPanel
                          title="Atlas Coherence (O(96))"
                          titleColor={KP.gold}
                          text={generatedText}
                          metrics={[
                            { label: "Tok/s", value: `${inferenceResult.tokensPerSecond.toFixed(0)}` },
                            { label: "Time", value: `${inferenceResult.totalTimeMs.toFixed(0)}ms` },
                            { label: "H-score", value: inferenceResult.meanHScore.toFixed(3) },
                          ]}
                          ppl={perplexityStats.atlas}
                        />
                        <ComparisonPanel
                          title="Standard Attention (O(N²))"
                          titleColor={KP.muted}
                          text={baselineResult.text.slice(0, 200)}
                          metrics={[
                            { label: "Tok/s", value: `${baselineResult.tokensPerSecond.toFixed(0)}` },
                            { label: "Time", value: `${baselineResult.timeMs.toFixed(0)}ms` },
                            { label: "Speedup", value: `${(baselineResult.timeMs / Math.max(inferenceResult.totalTimeMs, 0.01)).toFixed(1)}×` },
                          ]}
                          ppl={perplexityStats.baseline}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════
              BENCHMARK — Live multi-model performance comparison
              ════════════════════════════════════════════════════════ */}
          {activeTab === "benchmark" && (
            <motion.div key="benchmark" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
              {/* Explanation */}
              <div style={{
                ...card, marginBottom: "24px",
                background: "linear-gradient(135deg, hsla(260, 20%, 50%, 0.04), hsla(38, 20%, 50%, 0.02))",
                borderColor: "hsla(260, 20%, 50%, 0.08)",
              }}>
                <p style={{ fontSize: "14px", color: KP.muted, margin: 0, lineHeight: 1.7 }}>
                  This benchmark downloads <span style={{ color: KP.text, fontWeight: 500 }}>three real AI models</span> from 
                  HuggingFace, runs them through both the Atlas coherence pipeline and standard transformer attention, 
                  and compares the results side by side. You'll see the actual
                  <span style={{ color: KP.gold }}> tokens per second</span>,
                  <span style={{ color: KP.gold }}> compression ratio</span>, and
                  <span style={{ color: KP.gold }}> generated text</span> — 
                  all running live in your browser. Nothing is simulated.
                </p>
              </div>

              <Suspense fallback={<LoadingPlaceholder text="Loading benchmark suite…" />}>
                <MultiModelBenchmark />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════

function LoadingPlaceholder({ text }: { text: string }) {
  return (
    <div style={{
      padding: "48px", textAlign: "center", fontSize: "13px", color: KP.dim,
      display: "flex", flexDirection: "column", alignItems: "center", gap: "12px",
    }}>
      <div style={{
        width: "24px", height: "24px", borderRadius: "50%",
        border: "2px solid hsla(38, 40%, 55%, 0.2)", borderTopColor: "transparent",
        animation: "spin 0.8s linear infinite",
      }} />
      {text}
    </div>
  );
}

function StageIcon({ stage }: { stage: string }) {
  if (stage === "ready") return <IconCheck size={14} style={{ color: KP.green }} />;
  if (stage === "error") return <IconAlertTriangle size={14} style={{ color: KP.red }} />;
  if (stage === "idle") return <IconAtom size={14} style={{ color: KP.dim }} />;
  return <IconLoader2 size={14} style={{ color: KP.gold }} className="animate-spin" />;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      padding: "12px", borderRadius: "12px", textAlign: "center",
      background: "hsla(25, 8%, 8%, 0.5)", border: "1px solid hsla(38, 12%, 70%, 0.06)",
    }}>
      <div style={{ fontSize: "10px", color: KP.dim, marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "17px", fontWeight: 700, color: KP.text, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

function PerplexityBar({ label, value, maxVal, color }: { label: string; value: number; maxVal: number; color: string }) {
  const pct = Math.min(100, (value / maxVal) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "8px" }}>
      <span style={{ fontSize: "11px", color: KP.dim, width: "56px" }}>{label}</span>
      <div style={{ flex: 1, height: "8px", borderRadius: "4px", background: "hsla(38, 12%, 70%, 0.06)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: "4px", background: color, transition: "width 0.5s" }} />
      </div>
      <span style={{ fontSize: "11px", fontFamily: "monospace", color: KP.text, width: "48px", textAlign: "right" }}>{value.toFixed(1)}</span>
    </div>
  );
}

function ComparisonPanel({ title, titleColor, text, metrics, ppl }: {
  title: string; titleColor: string; text: string;
  metrics: { label: string; value: string }[];
  ppl: { perplexity: number; avgNLL: number } | null;
}) {
  return (
    <div style={{ padding: "18px", borderRadius: "14px", background: "hsla(25, 8%, 10%, 0.5)", border: "1px solid hsla(38, 12%, 70%, 0.06)" }}>
      <p style={{ fontSize: "12px", fontWeight: 600, color: titleColor, marginBottom: "12px" }}>{title}</p>
      <div style={{ fontSize: "13px", fontFamily: "monospace", color: KP.text, lineHeight: 1.6, marginBottom: "14px" }}>{text}</div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${metrics.length}, 1fr)`, gap: "6px" }}>
        {metrics.map((m) => <Metric key={m.label} label={m.label} value={m.value} />)}
      </div>
      {ppl && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginTop: "8px" }}>
          <Metric label="Perplexity" value={ppl.perplexity === Infinity ? "∞" : ppl.perplexity.toFixed(1)} />
          <Metric label="Avg NLL" value={ppl.avgNLL === Infinity ? "∞" : ppl.avgNLL.toFixed(3)} />
        </div>
      )}
    </div>
  );
}

function ReportPanel({ title, icon, content }: { title: string; icon: React.ReactNode; content: string }) {
  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
        {icon}
        <span style={sectionTitle}>{title}</span>
      </div>
      <pre style={{
        fontSize: "11px", fontFamily: "monospace", color: KP.dim,
        whiteSpace: "pre-wrap", padding: "14px", borderRadius: "12px",
        background: "hsla(25, 8%, 6%, 0.6)", border: "1px solid hsla(38, 12%, 70%, 0.06)",
        maxHeight: "240px", overflow: "auto", lineHeight: 1.6, margin: 0,
      }}>
        {content}
      </pre>
    </div>
  );
}

function QualityGradeBadge({ ratio }: { ratio: number }) {
  let grade: string, color: string, bg: string;
  if (!isFinite(ratio)) { grade = "—"; color = KP.dim; bg = `${KP.dim}15`; }
  else if (ratio <= 1.0) { grade = "A"; color = KP.green; bg = `${KP.green}18`; }
  else if (ratio <= 1.25) { grade = "B"; color = "hsl(200, 50%, 55%)"; bg = "hsla(200, 50%, 55%, 0.12)"; }
  else if (ratio <= 2.0) { grade = "C"; color = KP.gold; bg = `${KP.gold}15`; }
  else { grade = "D"; color = KP.red; bg = `${KP.red}15`; }

  return (
    <div style={{
      padding: "12px", borderRadius: "12px", textAlign: "center",
      background: "hsla(25, 8%, 8%, 0.5)", border: "1px solid hsla(38, 12%, 70%, 0.06)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ fontSize: "10px", color: KP.dim, marginBottom: "4px" }}>Grade</div>
      <div style={{
        width: "34px", height: "34px", borderRadius: "10px",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "17px", fontWeight: 900, color, background: bg,
        border: `1px solid ${color}30`,
      }}>
        {grade}
      </div>
    </div>
  );
}

function NLLChart({ atlas, baseline }: {
  atlas: { index: number; nll: number; tokenStr: string }[];
  baseline: { index: number; nll: number; tokenStr: string }[];
}) {
  const W = 700, H = 200;
  const PAD = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const maxLen = Math.max(atlas.length, baseline.length);
  const allNLL = [...atlas.map(d => d.nll), ...baseline.map(d => d.nll)];
  const maxNLL = Math.max(...allNLL, 1);
  const minNLL = Math.min(...allNLL, 0);
  const nllRange = maxNLL - minNLL || 1;
  const toX = (i: number, total: number) => PAD.left + (i / Math.max(total - 1, 1)) * chartW;
  const toY = (nll: number) => PAD.top + (1 - (nll - minNLL) / nllRange) * chartH;
  const buildPath = (data: { nll: number }[]) =>
    data.map((d, i) => `${i === 0 ? "M" : "L"}${toX(i, data.length).toFixed(1)},${toY(d.nll).toFixed(1)}`).join(" ");
  const yTicks = 5;
  const yLabels = Array.from({ length: yTicks }, (_, i) => {
    const val = minNLL + (nllRange * i) / (yTicks - 1);
    return { val, y: toY(val) };
  });

  return (
    <div style={{ padding: "18px", borderRadius: "14px", background: "hsla(25, 8%, 10%, 0.5)", border: "1px solid hsla(38, 12%, 70%, 0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <span style={sectionTitle}>Per-Token NLL</span>
        <div style={{ display: "flex", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div style={{ width: "12px", height: "2px", borderRadius: "1px", background: KP.gold }} />
            <span style={{ fontSize: "10px", color: KP.dim }}>Atlas</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div style={{ width: "12px", height: "2px", borderRadius: "1px", background: KP.purple }} />
            <span style={{ fontSize: "10px", color: KP.dim }}>Baseline</span>
          </div>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", maxHeight: 220 }}>
        {yLabels.map((t, i) => (
          <g key={i}>
            <line x1={PAD.left} x2={W - PAD.right} y1={t.y} y2={t.y} stroke="hsla(38, 12%, 70%, 0.08)" strokeWidth={0.5} strokeDasharray="4 2" />
            <text x={PAD.left - 6} y={t.y + 3} textAnchor="end" fill={KP.dim} fontSize={9}>{t.val.toFixed(1)}</text>
          </g>
        ))}
        <text x={PAD.left + chartW / 2} y={H - 4} textAnchor="middle" fill={KP.dim} fontSize={10}>Token Position</text>
        <text x={12} y={PAD.top + chartH / 2} textAnchor="middle" fill={KP.dim} fontSize={10} transform={`rotate(-90, 12, ${PAD.top + chartH / 2})`}>NLL</text>
        {Array.from({ length: Math.min(maxLen, 8) }, (_, i) => {
          const idx = Math.round((i / Math.max(7, 1)) * (maxLen - 1));
          return <text key={i} x={toX(idx, maxLen)} y={H - PAD.bottom + 16} textAnchor="middle" fill={KP.dim} fontSize={9}>{idx}</text>;
        })}
        <path d={buildPath(baseline)} fill="none" stroke={KP.purple} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
        <path d={buildPath(atlas)} fill="none" stroke={KP.gold} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {atlas.map((d, i) => (
          <circle key={`a${i}`} cx={toX(i, atlas.length)} cy={toY(d.nll)} r={2.5} fill={KP.gold} opacity={0.6}>
            <title>{`Atlas #${d.index}: NLL=${d.nll.toFixed(3)} "${d.tokenStr}"`}</title>
          </circle>
        ))}
        {baseline.map((d, i) => (
          <circle key={`b${i}`} cx={toX(i, baseline.length)} cy={toY(d.nll)} r={2} fill={KP.purple} opacity={0.5}>
            <title>{`Baseline #${d.index}: NLL=${d.nll.toFixed(3)} "${d.tokenStr}"`}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}
