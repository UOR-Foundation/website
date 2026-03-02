/**
 * Atlas Projection Lab — AI Lab
 * ══════════════════════════════
 *
 * End-to-end model projection dashboard styled with the Hologram
 * Kernel Palette for visual harmony with the rest of the OS.
 *
 * WHY:  Understand how AI models think — make their reasoning visible.
 * HOW:  Project open-source LLMs onto a geometric manifold for coherence-guided inference.
 * WHAT: Load models, benchmark, generate, and compare side-by-side.
 */

import { useState, useCallback, useRef, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconBrain, IconAtom, IconChartBar, IconPlayerPlay,
  IconLoader2, IconCheck, IconAlertTriangle, IconRocket, IconCpu,
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
const card = {
  background: KP.card,
  border: `1px solid ${KP.border}`,
  borderRadius: "16px",
  padding: "20px",
};
const sectionTitle: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: 600,
  letterSpacing: "0.15em",
  textTransform: "uppercase" as const,
  color: KP.dim,
};
const inputStyle: React.CSSProperties = {
  background: "transparent",
  border: `1px solid ${KP.border}`,
  borderRadius: "12px",
  padding: "10px 14px",
  color: KP.text,
  fontSize: "13px",
  outline: "none",
  width: "100%",
};
const btnPrimary: React.CSSProperties = {
  background: KP.gold,
  color: KP.bg,
  borderRadius: "12px",
  padding: "10px 20px",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
  border: "none",
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

export default function AtlasProjectionLab() {
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
  const [prompt, setPrompt] = useState("The universe is made of");
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

  return (
    <div style={{ minHeight: "100vh", background: KP.bg, color: KP.text, fontFamily: KP.font, padding: "32px 24px" }}>
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>
        {/* ── Header ── */}
        <div style={{ marginBottom: "40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "12px" }}>
            <div
              style={{
                width: "48px", height: "48px", borderRadius: "14px",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: `linear-gradient(145deg, ${KP.gold}22, ${KP.purple}15)`,
                border: `1px solid ${KP.gold}25`,
              }}
            >
              <IconBrain size={24} style={{ color: KP.gold }} />
            </div>
            <div>
              <h1
                style={{
                  fontSize: "26px", fontWeight: 600, fontFamily: KP.serif,
                  color: KP.text, margin: 0, lineHeight: 1.2,
                }}
              >
                AI Lab
              </h1>
              <p style={{ fontSize: "13px", color: KP.muted, margin: "4px 0 0" }}>
                See how models think. Project, benchmark, generate.
              </p>
            </div>
          </div>

          {/* Why · How · What */}
          <div
            style={{
              ...card,
              padding: "16px 20px",
              background: `linear-gradient(135deg, ${KP.gold}08, ${KP.purple}06)`,
              borderColor: `${KP.gold}15`,
            }}
          >
            <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
              {[
                { label: "Why", text: "Make AI reasoning visible and auditable" },
                { label: "How", text: "Project model weights onto a geometric manifold" },
                { label: "What", text: "Load real models, run inference, compare quality" },
              ].map((item) => (
                <div key={item.label} style={{ flex: "1 1 200px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: KP.gold }}>
                    {item.label}
                  </span>
                  <p style={{ fontSize: "12px", color: KP.muted, margin: "4px 0 0", lineHeight: 1.5 }}>
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Model Browser ── */}
        <Suspense fallback={<LoadingPlaceholder text="Loading model browser…" />}>
          <HuggingFaceModelBrowser />
        </Suspense>

        <div style={{ height: "16px" }} />

        {/* ── Multi-Model Benchmark ── */}
        <Suspense fallback={<LoadingPlaceholder text="Loading benchmark…" />}>
          <MultiModelBenchmark />
        </Suspense>

        <div style={{ height: "24px" }} />

        {/* ── Controls ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {/* Model Selection */}
          <div style={card}>
            <p style={sectionTitle}>Model</p>
            <div style={{ marginTop: "12px" }}>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                style={{
                  ...inputStyle,
                  cursor: "pointer",
                  appearance: "none" as const,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 12px center",
                  paddingRight: "36px",
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

            <label style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px", cursor: "pointer", fontSize: "12px", color: KP.muted }}>
              <input
                type="checkbox"
                checked={useRealModel}
                onChange={(e) => setUseRealModel(e.target.checked)}
                style={{ accentColor: KP.gold }}
              />
              Load real weights from HuggingFace
              {useRealModel && <span style={{ color: KP.gold, marginLeft: "4px" }}>(downloads model)</span>}
            </label>

            <button
              onClick={handleInitialize}
              disabled={pipelineStatus.stage !== "idle" && pipelineStatus.stage !== "ready" && pipelineStatus.stage !== "error"}
              style={{
                ...btnPrimary,
                width: "100%",
                justifyContent: "center",
                marginTop: "16px",
                opacity: (pipelineStatus.stage !== "idle" && pipelineStatus.stage !== "ready" && pipelineStatus.stage !== "error") ? 0.5 : 1,
              }}
            >
              <IconRocket size={16} />
              Initialize Pipeline
            </button>
          </div>

          {/* Status */}
          <div style={card}>
            <p style={sectionTitle}>Status</p>

            {useRealModel && loadStatus.stage !== "idle" && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px", fontSize: "12px", color: KP.muted }}>
                <StageIcon stage={loadStatus.stage} />
                <span>{loadStatus.message}</span>
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px", fontSize: "12px", color: KP.muted }}>
              <StageIcon stage={pipelineStatus.stage} />
              <span>{pipelineStatus.message}</span>
            </div>

            {/* Progress bar */}
            <div style={{ width: "100%", height: "6px", borderRadius: "3px", background: `${KP.border}`, marginTop: "12px", overflow: "hidden" }}>
              <motion.div
                style={{ height: "100%", borderRadius: "3px", background: stageColor }}
                animate={{ width: `${pipelineStatus.progress * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Metrics */}
            {report && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginTop: "16px" }}>
                <Metric label="Compression" value={`${report.holographicEncoding.compressionRatio.toFixed(1)}×`} />
                <Metric label="Bekenstein" value={`${(report.holographicEncoding.bekensteinEfficiency * 100).toFixed(0)}%`} />
                <Metric label="Tok/s" value={`${report.benchmarkResult.tokensPerSecond.toFixed(0)}`} />
              </div>
            )}
          </div>
        </div>

        {/* ── Inference ── */}
        <AnimatePresence>
          {pipelineStatus.stage === "ready" && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ ...card, marginTop: "16px" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                <IconCpu size={16} style={{ color: KP.gold }} />
                <span style={sectionTitle}>Coherence Inference</span>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter a prompt…"
                  onKeyDown={(e) => e.key === "Enter" && handleInfer()}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button onClick={handleInfer} style={btnPrimary}>
                  <IconPlayerPlay size={14} />
                  Generate
                </button>
              </div>

              {generatedText && (
                <div
                  style={{
                    marginTop: "16px", padding: "14px 16px", borderRadius: "12px",
                    background: `${KP.surface}`, border: `1px solid ${KP.border}`,
                    fontSize: "13px", fontFamily: "monospace", color: KP.text,
                    whiteSpace: "pre-wrap", lineHeight: 1.6,
                  }}
                >
                  {generatedText}
                </div>
              )}

              {inferenceResult && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px", marginTop: "16px" }}>
                  <Metric label="Tokens" value={`${inferenceResult.tokenIds.length}`} />
                  <Metric label="H-score" value={inferenceResult.meanHScore.toFixed(3)} />
                  <Metric label="Tok/s" value={`${inferenceResult.tokensPerSecond.toFixed(0)}`} />
                  <Metric label="Time" value={`${inferenceResult.totalTimeMs.toFixed(0)}ms`} />
                </div>
              )}

              {/* Coherence Journey */}
              {inferenceResult && inferenceResult.steps.length > 0 && (
                <div style={{ marginTop: "16px" }}>
                  <p style={{ ...sectionTitle, marginBottom: "8px" }}>Coherence Journey</p>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "48px" }}>
                    {inferenceResult.steps.map((step, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          borderRadius: "2px 2px 0 0",
                          height: `${step.state.hScore * 100}%`,
                          background: step.state.zone === "convergent" ? KP.green
                            : step.state.zone === "exploring" ? KP.gold : KP.red,
                          opacity: 0.5 + step.state.hScore * 0.5,
                        }}
                        title={`Step ${i}: H=${step.state.hScore.toFixed(3)} (${step.state.zone})`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Comparison ── */}
        {baselineResult && inferenceResult && (
          <div style={{ ...card, marginTop: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <IconChartBar size={16} style={{ color: KP.gold }} />
              <span style={sectionTitle}>Atlas vs Standard Transformer</span>
            </div>

            {/* Perplexity */}
            {perplexityStats.atlas && perplexityStats.baseline && (
              <div
                style={{
                  padding: "16px", borderRadius: "12px", marginBottom: "16px",
                  background: `linear-gradient(135deg, ${KP.gold}06, ${KP.purple}04)`,
                  border: `1px solid ${KP.border}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                  <span style={{ ...sectionTitle }}>Perplexity</span>
                  <span style={{ fontSize: "10px", color: KP.dim }}>lower = more coherent</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px" }}>
                  <Metric
                    label="Atlas PPL"
                    value={perplexityStats.atlas.perplexity === Infinity ? "∞" : perplexityStats.atlas.perplexity.toFixed(1)}
                  />
                  <Metric
                    label="Baseline PPL"
                    value={perplexityStats.baseline.perplexity === Infinity ? "∞" : perplexityStats.baseline.perplexity.toFixed(1)}
                  />
                  <Metric
                    label="Quality Ratio"
                    value={
                      perplexityStats.atlas.perplexity === Infinity || perplexityStats.baseline.perplexity === Infinity
                        ? "N/A"
                        : `${(perplexityStats.atlas.perplexity / perplexityStats.baseline.perplexity).toFixed(2)}×`
                    }
                  />
                  <QualityGradeBadge
                    ratio={
                      perplexityStats.atlas.perplexity === Infinity || perplexityStats.baseline.perplexity === Infinity
                        ? Infinity
                        : perplexityStats.atlas.perplexity / perplexityStats.baseline.perplexity
                    }
                  />
                </div>

                {/* Visual bars */}
                {perplexityStats.atlas.perplexity !== Infinity && perplexityStats.baseline.perplexity !== Infinity && (
                  <div style={{ marginTop: "12px" }}>
                    <PerplexityBar
                      label="Atlas"
                      value={perplexityStats.atlas.perplexity}
                      maxVal={Math.max(perplexityStats.atlas.perplexity, perplexityStats.baseline.perplexity)}
                      color={KP.gold}
                    />
                    <PerplexityBar
                      label="Baseline"
                      value={perplexityStats.baseline.perplexity}
                      maxVal={Math.max(perplexityStats.atlas.perplexity, perplexityStats.baseline.perplexity)}
                      color={KP.purple}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Per-Token NLL */}
            {perTokenNLL.atlas.length > 0 && perTokenNLL.baseline.length > 0 && (
              <NLLChart atlas={perTokenNLL.atlas} baseline={perTokenNLL.baseline} />
            )}

            {/* Side-by-side */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "16px" }}>
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

        {/* ── Reports ── */}
        {report && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "16px" }}>
            <ReportPanel title="Atlas Projection" icon={<IconAtom size={14} style={{ color: KP.gold }} />} content={report.projectionReport} />
            <ReportPanel title="Holographic Codec" icon={<IconChartBar size={14} style={{ color: KP.gold }} />} content={report.holographicReport} />
          </div>
        )}

        {/* ── Log (collapsible) ── */}
        <div style={{ ...card, marginTop: "16px" }}>
          <button
            onClick={() => setShowLogs((p) => !p)}
            style={{
              ...sectionTitle,
              background: "none", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", gap: "6px", padding: 0,
            }}
          >
            Pipeline Log
            <span style={{ fontSize: "10px", color: KP.dim, fontWeight: 400 }}>
              {showLogs ? "▲ hide" : `▼ ${logs.length} entries`}
            </span>
          </button>

          {showLogs && (
            <div
              style={{
                marginTop: "12px", maxHeight: "180px", overflowY: "auto",
                fontFamily: "monospace", fontSize: "11px", color: KP.dim,
                padding: "12px", borderRadius: "10px",
                background: `${KP.surface}`,
                border: `1px solid ${KP.border}`,
                lineHeight: 1.6,
              }}
            >
              {logs.length === 0 ? (
                <span style={{ opacity: 0.5 }}>Waiting for initialization…</span>
              ) : (
                logs.map((log, i) => (
                  <div key={i} style={{ color: log.includes("✓") ? KP.green : log.includes("✗") ? KP.red : KP.dim }}>
                    {log}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Sub-components — all using KP palette
// ═══════════════════════════════════════════════════════════════

function LoadingPlaceholder({ text }: { text: string }) {
  return (
    <div style={{ padding: "24px", textAlign: "center", fontSize: "12px", color: KP.dim }}>
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
    <div
      style={{
        padding: "10px", borderRadius: "10px", textAlign: "center",
        background: KP.card, border: `1px solid ${KP.border}`,
      }}
    >
      <div style={{ fontSize: "10px", color: KP.dim, marginBottom: "2px" }}>{label}</div>
      <div style={{ fontSize: "16px", fontWeight: 700, color: KP.text, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

function PerplexityBar({ label, value, maxVal, color }: { label: string; value: number; maxVal: number; color: string }) {
  const pct = Math.min(100, (value / maxVal) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
      <span style={{ fontSize: "10px", color: KP.dim, width: "56px" }}>{label}</span>
      <div style={{ flex: 1, height: "8px", borderRadius: "4px", background: `${KP.border}`, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: "4px", background: color, transition: "width 0.5s" }} />
      </div>
      <span style={{ fontSize: "10px", fontFamily: "monospace", color: KP.text, width: "48px", textAlign: "right" }}>{value.toFixed(1)}</span>
    </div>
  );
}

function ComparisonPanel({ title, titleColor, text, metrics, ppl }: {
  title: string; titleColor: string; text: string;
  metrics: { label: string; value: string }[];
  ppl: { perplexity: number; avgNLL: number } | null;
}) {
  return (
    <div style={{ padding: "16px", borderRadius: "12px", background: KP.card, border: `1px solid ${KP.border}` }}>
      <p style={{ fontSize: "11px", fontWeight: 600, color: titleColor, marginBottom: "10px" }}>{title}</p>
      <div style={{ fontSize: "12px", fontFamily: "monospace", color: KP.text, lineHeight: 1.5, marginBottom: "12px" }}>{text}</div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${metrics.length}, 1fr)`, gap: "6px" }}>
        {metrics.map((m) => <Metric key={m.label} label={m.label} value={m.value} />)}
      </div>
      {ppl && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginTop: "6px" }}>
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
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        {icon}
        <span style={sectionTitle}>{title}</span>
      </div>
      <pre
        style={{
          fontSize: "11px", fontFamily: "monospace", color: KP.dim,
          whiteSpace: "pre-wrap", padding: "12px", borderRadius: "10px",
          background: KP.surface, border: `1px solid ${KP.border}`,
          maxHeight: "240px", overflow: "auto", lineHeight: 1.5, margin: 0,
        }}
      >
        {content}
      </pre>
    </div>
  );
}

function QualityGradeBadge({ ratio }: { ratio: number }) {
  let grade: string, color: string, bg: string;

  if (!isFinite(ratio)) {
    grade = "—"; color = KP.dim; bg = `${KP.dim}15`;
  } else if (ratio <= 1.0) {
    grade = "A"; color = KP.green; bg = `${KP.green}18`;
  } else if (ratio <= 1.25) {
    grade = "B"; color = "hsl(200, 50%, 55%)"; bg = "hsla(200, 50%, 55%, 0.12)";
  } else if (ratio <= 2.0) {
    grade = "C"; color = KP.gold; bg = `${KP.gold}15`;
  } else {
    grade = "D"; color = KP.red; bg = `${KP.red}15`;
  }

  return (
    <div
      style={{
        padding: "10px", borderRadius: "10px", textAlign: "center",
        background: KP.card, border: `1px solid ${KP.border}`,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}
    >
      <div style={{ fontSize: "10px", color: KP.dim, marginBottom: "4px" }}>Grade</div>
      <div
        style={{
          width: "32px", height: "32px", borderRadius: "8px",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "16px", fontWeight: 900, color, background: bg,
          border: `1px solid ${color}30`,
        }}
      >
        {grade}
      </div>
    </div>
  );
}

// ── Per-Token NLL Line Chart ──────────────────────────────────

function NLLChart({
  atlas,
  baseline,
}: {
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
    <div style={{ padding: "16px", borderRadius: "12px", background: KP.card, border: `1px solid ${KP.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
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
            <line x1={PAD.left} x2={W - PAD.right} y1={t.y} y2={t.y} stroke={KP.border.replace("hsla", "hsla")} strokeWidth={0.5} strokeDasharray="4 2" />
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
