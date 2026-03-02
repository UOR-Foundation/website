/**
 * Atlas Projection Lab — Interactive Model Projection Dashboard
 * ══════════════════════════════════════════════════════════════
 *
 * End-to-end testing page for the Atlas model projection pipeline.
 * Load real models, project through Atlas, run coherence inference,
 * and compare with baseline transformer inference.
 */

import { useState, useCallback, useRef, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconBrain, IconAtom, IconChartBar, IconPlayerPlay, IconLoader2, IconCheck, IconAlertTriangle, IconRocket, IconCpu } from "@tabler/icons-react";

const MultiModelBenchmark = lazy(() => import("./MultiModelBenchmark"));
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

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export default function AtlasProjectionLab() {
  // Model selection
  const [selectedModel, setSelectedModel] = useState<string>("smollm2-135m");
  const [useRealModel, setUseRealModel] = useState(false);

  // Loading state
  const [loadStatus, setLoadStatus] = useState<ModelLoadStatus>({ stage: "idle", progress: 0, message: "" });
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>({
    stage: "idle", progress: 0, message: "Not initialized",
    decomposition: null, holographicEncoding: null, engramEntries: 0,
  });

  // Results
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

  // Refs
  const loadedModelRef = useRef<LoadedHFModel | null>(null);
  const pipelineRef = useRef<AtlasProjectionPipeline | null>(null);
  const logRef = useRef<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    logRef.current = [...logRef.current, `[${new Date().toLocaleTimeString()}] ${msg}`];
    setLogs([...logRef.current]);
  }, []);

  // ── Initialize Pipeline ────────────────────────────────────
  const handleInitialize = useCallback(async () => {
    try {
      addLog("Starting Atlas Projection Pipeline...");

      // Determine manifest
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
        // Use existing manifests — pick the profile's manifest if available
        const profile = BROWSER_MODELS[selectedModel];
        if (profile) manifest = profile.manifest;
      }

      // Create and initialize the Atlas pipeline
      const pipeline = new AtlasProjectionPipeline({
        manifest,
        maxLayers: Math.min(manifest.layerCount, 8), // Cap for browser perf
        useCompression: true,
        weightLoader,
      });

      // Subscribe to status updates
      pipeline.onStatusChange((status) => {
        setPipelineStatus(status);
        if (status.message) addLog(status.message);
      });

      pipelineRef.current = pipeline;

      // Wire real lm_head weights into the coherence engine
      if (loadedModelRef.current) {
        const loadedModel = loadedModelRef.current;

        // 1. Direct lm_head projection — extract the real lm_head.weight tensor
        //    and project it into Atlas space for native O(96) vocabulary lookup
        const lmHeadWeights = loadedModel.weights.get("lm_head");
        if (lmHeadWeights) {
          const vocabSize = loadedModel.manifest.vocabSize;
          const hiddenDim = loadedModel.manifest.hiddenDim;
          pipeline.setLmHead(lmHeadWeights, vocabSize, hiddenDim);
          addLog(`✓ Real lm_head wired: [${vocabSize}×${hiddenDim}] → Atlas projection`);
        } else {
          addLog("⚠ lm_head weights not found, using fallback projection");
        }

        // 2. Also wire the full forward pass callback as secondary path
        //    (used when lm_head projection alone isn't sufficient)
        const { getNextTokenLogits } = await import("@/modules/hologram-compute/hf-model-bridge");
        pipeline.setLogitsCallback(async (context: number[]) => {
          return getNextTokenLogits(loadedModel, context.slice(-32));
        });
        addLog("✓ Real model forward-pass callback wired as secondary path");
      }

      // Run the full benchmark
      addLog("Running full pipeline benchmark...");
      const benchmarkReport = await pipeline.benchmark([1, 2, 3, 4, 5], 16);
      setReport(benchmarkReport);

      addLog(`✓ Pipeline ready! ${benchmarkReport.decomposition.totalBlocks} blocks projected`);
      addLog(`  Compression: ${benchmarkReport.holographicEncoding.compressionRatio.toFixed(1)}×`);
      addLog(`  Bekenstein efficiency: ${(benchmarkReport.holographicEncoding.bekensteinEfficiency * 100).toFixed(1)}%`);
      addLog(`  Benchmark: ${benchmarkReport.benchmarkResult.tokensPerSecond.toFixed(0)} tok/s`);
      addLog(`  Total time: ${benchmarkReport.totalTimeMs.toFixed(0)}ms`);

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

    // Tokenize
    let tokenIds: number[];
    if (loadedModelRef.current) {
      tokenIds = tokenize(loadedModelRef.current, prompt);
      addLog(`Tokenized: ${tokenIds.length} tokens`);
    } else {
      // Simple hash-based tokenization for synthetic mode
      tokenIds = prompt.split(/\s+/).map((w, i) => {
        let h = 0;
        for (let j = 0; j < w.length; j++) h = (h * 31 + w.charCodeAt(j)) & 0xFFFF;
        return h % 50000;
      });
      addLog(`Pseudo-tokenized: ${tokenIds.length} tokens`);
    }

    const result = await pipeline.infer(tokenIds, 32);
    setInferenceResult(result);

    // Detokenize
    if (loadedModelRef.current) {
      const text = detokenize(loadedModelRef.current, result.tokenIds);
      setGeneratedText(text);
      addLog(`Generated: "${text}"`);
    } else {
      setGeneratedText(`[Token IDs: ${result.tokenIds.slice(0, 8).join(", ")}...]`);
      addLog(`Generated ${result.tokenIds.length} tokens`);
    }

    addLog(`  H-score: ${result.meanHScore.toFixed(4)}`);
    addLog(`  Speed: ${result.tokensPerSecond.toFixed(0)} tok/s`);
    addLog(`  Time: ${result.totalTimeMs.toFixed(1)}ms`);

    // Auto-run baseline comparison if real model loaded
    if (loadedModelRef.current) {
      setIsRunningBaseline(true);
      addLog("Running standard transformer baseline for comparison...");
      try {
        const baseline = await baselineInference(loadedModelRef.current, prompt, 32);
        setBaselineResult(baseline);
        addLog(`  Baseline: "${baseline.text.slice(0, 80)}..."`);
        addLog(`  Baseline: ${baseline.tokensPerSecond.toFixed(0)} tok/s (${baseline.timeMs.toFixed(0)}ms)`);
        const speedup = (baseline.timeMs > 0 && result.totalTimeMs > 0) 
          ? (baseline.timeMs / result.totalTimeMs).toFixed(1) 
          : "N/A";
        addLog(`  ⚡ Coherence speedup: ${speedup}× over standard attention`);

        // Compute perplexity for both outputs
        addLog("📊 Computing perplexity (evaluating output quality)...");
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

        addLog(`  📊 Atlas PPL: ${atlasPpl.perplexity.toFixed(1)} (NLL: ${atlasPpl.avgNLL.toFixed(3)}, ${atlasPpl.tokenCount} tokens)`);
        addLog(`  📊 Baseline PPL: ${baselinePpl.perplexity.toFixed(1)} (NLL: ${baselinePpl.avgNLL.toFixed(3)}, ${baselinePpl.tokenCount} tokens)`);

        const pplRatio = atlasPpl.perplexity / Math.max(baselinePpl.perplexity, 0.01);
        if (pplRatio < 1.5) {
          addLog(`  ✓ Atlas quality within ${((pplRatio - 1) * 100).toFixed(0)}% of transformer baseline`);
        } else {
          addLog(`  ⚠ Atlas perplexity ${pplRatio.toFixed(1)}× higher than baseline`);
        }
      } catch (e) {
        addLog(`  Baseline comparison skipped: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setIsRunningBaseline(false);
      }
    }
  }, [prompt, pipelineStatus.stage, addLog]);

  // ── Render ─────────────────────────────────────────────────
  const stageIcon = (stage: string) => {
    if (stage === "ready") return <IconCheck className="w-4 h-4 text-emerald-400" />;
    if (stage === "error") return <IconAlertTriangle className="w-4 h-4 text-red-400" />;
    if (stage === "idle") return <IconAtom className="w-4 h-4 text-muted-foreground" />;
    return <IconLoader2 className="w-4 h-4 text-amber-400 animate-spin" />;
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <IconBrain className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Lab</h1>
            <p className="text-sm text-muted-foreground">
              Project open-source LLMs onto the Atlas manifold — coherence-guided inference
            </p>
          </div>
        </div>

        {/* Multi-Model Benchmark */}
        <Suspense fallback={<div className="text-muted-foreground text-sm font-mono p-4">Loading multi-model benchmark…</div>}>
          <MultiModelBenchmark />
        </Suspense>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Model Selection */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Model Selection</h2>

            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full p-2 rounded-lg bg-background border border-border text-foreground text-sm"
            >
              <optgroup label="Browser-Viable (Real Weights)">
                {Object.entries(BROWSER_MODELS).map(([id, profile]) => (
                  <option key={id} value={id}>
                    {profile.name} ({profile.downloadSizeMB}MB)
                  </option>
                ))}
              </optgroup>
              <optgroup label="Synthetic Projection (Manifest Only)">
                {Object.entries(MODEL_MANIFESTS).map(([id, m]) => (
                  <option key={id} value={id}>
                    {m.name} ({(m.parameterCount / 1e9).toFixed(1)}B params)
                  </option>
                ))}
              </optgroup>
            </select>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={useRealModel}
                onChange={(e) => setUseRealModel(e.target.checked)}
                className="rounded accent-primary"
              />
              <span className="text-muted-foreground">
                Load real weights from HuggingFace
                {useRealModel && <span className="text-amber-400 ml-1">(downloads model)</span>}
              </span>
            </label>

            <button
              onClick={handleInitialize}
              disabled={pipelineStatus.stage !== "idle" && pipelineStatus.stage !== "ready" && pipelineStatus.stage !== "error"}
              className="w-full py-2 px-4 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <IconRocket className="w-4 h-4" />
              Initialize Pipeline
            </button>
          </div>

          {/* Status Panel */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pipeline Status</h2>

            {/* Model Load Status */}
            {useRealModel && loadStatus.stage !== "idle" && (
              <div className="flex items-center gap-2 text-sm">
                {stageIcon(loadStatus.stage)}
                <span className="text-muted-foreground">{loadStatus.message}</span>
              </div>
            )}

            {/* Pipeline Status */}
            <div className="flex items-center gap-2 text-sm">
              {stageIcon(pipelineStatus.stage)}
              <span className="text-muted-foreground">{pipelineStatus.message}</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                animate={{ width: `${(pipelineStatus.progress * 100)}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Key Metrics */}
            {report && (
              <div className="grid grid-cols-3 gap-2 text-center">
                <MetricCard
                  label="Compression"
                  value={`${report.holographicEncoding.compressionRatio.toFixed(1)}×`}
                />
                <MetricCard
                  label="Bekenstein"
                  value={`${(report.holographicEncoding.bekensteinEfficiency * 100).toFixed(0)}%`}
                />
                <MetricCard
                  label="Tok/s"
                  value={`${report.benchmarkResult.tokensPerSecond.toFixed(0)}`}
                />
              </div>
            )}
          </div>
        </div>

        {/* Inference */}
        <AnimatePresence>
          {pipelineStatus.stage === "ready" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-card p-4 space-y-3"
            >
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <IconCpu className="w-4 h-4" />
                Coherence Inference
              </h2>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter prompt..."
                  className="flex-1 p-2 rounded-lg bg-background border border-border text-foreground text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleInfer()}
                />
                <button
                  onClick={handleInfer}
                  className="py-2 px-4 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 flex items-center gap-2"
                >
                  <IconPlayerPlay className="w-4 h-4" />
                  Generate
                </button>
              </div>

              {/* Output */}
              {generatedText && (
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-sm font-mono text-foreground whitespace-pre-wrap">{generatedText}</p>
                </div>
              )}

              {/* Inference Metrics */}
              {inferenceResult && (
                <div className="grid grid-cols-4 gap-2 text-center">
                  <MetricCard label="Tokens" value={`${inferenceResult.tokenIds.length}`} />
                  <MetricCard label="H-score" value={inferenceResult.meanHScore.toFixed(3)} />
                  <MetricCard label="Tok/s" value={`${inferenceResult.tokensPerSecond.toFixed(0)}`} />
                  <MetricCard label="Time" value={`${inferenceResult.totalTimeMs.toFixed(0)}ms`} />
                </div>
              )}

              {/* Coherence Journey */}
              {inferenceResult && inferenceResult.steps.length > 0 && (
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase">Coherence Journey</h3>
                  <div className="flex items-end gap-[2px] h-16">
                    {inferenceResult.steps.map((step, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t-sm"
                        style={{
                          height: `${step.state.hScore * 100}%`,
                          backgroundColor: `hsl(var(${step.state.zone === "convergent"
                            ? "--primary"
                            : step.state.zone === "exploring"
                              ? "--accent"
                              : "--destructive"}))`,
                          opacity: 0.7 + step.state.hScore * 0.3,
                        }}
                        title={`Step ${i}: H=${step.state.hScore.toFixed(3)} (${step.state.zone})`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Step 0</span>
                    <span>Step {inferenceResult.steps.length - 1}</span>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Baseline Comparison */}
        {baselineResult && inferenceResult && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <IconChartBar className="w-4 h-4" />
              Coherence vs Standard Transformer
            </h2>

            {/* Perplexity Summary Bar */}
            {perplexityStats.atlas && perplexityStats.baseline && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Perplexity Comparison</span>
                  <span className="text-xs text-muted-foreground">(lower = more coherent)</span>
                </div>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <MetricCard
                    label="Atlas PPL"
                    value={perplexityStats.atlas.perplexity === Infinity ? "∞" : perplexityStats.atlas.perplexity.toFixed(1)}
                  />
                  <MetricCard
                    label="Baseline PPL"
                    value={perplexityStats.baseline.perplexity === Infinity ? "∞" : perplexityStats.baseline.perplexity.toFixed(1)}
                  />
                  <MetricCard
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
                {/* Visual perplexity bar comparison */}
                {perplexityStats.atlas.perplexity !== Infinity && perplexityStats.baseline.perplexity !== Infinity && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-16">Atlas</span>
                      <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{
                            width: `${Math.min(100, (perplexityStats.baseline.perplexity / Math.max(perplexityStats.atlas.perplexity, perplexityStats.baseline.perplexity)) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-foreground w-12 text-right">{perplexityStats.atlas.perplexity.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-16">Baseline</span>
                      <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent transition-all"
                          style={{
                            width: `${Math.min(100, (perplexityStats.atlas.perplexity / Math.max(perplexityStats.atlas.perplexity, perplexityStats.baseline.perplexity)) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-foreground w-12 text-right">{perplexityStats.baseline.perplexity.toFixed(1)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Per-Token NLL Line Chart */}
            {perTokenNLL.atlas.length > 0 && perTokenNLL.baseline.length > 0 && (
              <NLLChart atlas={perTokenNLL.atlas} baseline={perTokenNLL.baseline} />
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-border p-3 space-y-2">
                <h3 className="text-xs font-semibold text-primary">Atlas Coherence (O(96))</h3>
                <div className="text-sm font-mono text-foreground">{generatedText}</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <MetricCard label="Tok/s" value={`${inferenceResult.tokensPerSecond.toFixed(0)}`} />
                  <MetricCard label="Time" value={`${inferenceResult.totalTimeMs.toFixed(0)}ms`} />
                  <MetricCard label="H-score" value={inferenceResult.meanHScore.toFixed(3)} />
                </div>
                {perplexityStats.atlas && (
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <MetricCard label="Perplexity" value={perplexityStats.atlas.perplexity === Infinity ? "∞" : perplexityStats.atlas.perplexity.toFixed(1)} />
                    <MetricCard label="Avg NLL" value={perplexityStats.atlas.avgNLL === Infinity ? "∞" : perplexityStats.atlas.avgNLL.toFixed(3)} />
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-border p-3 space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground">Standard Attention (O(N²))</h3>
                <div className="text-sm font-mono text-foreground">{baselineResult.text.slice(0, 200)}</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <MetricCard label="Tok/s" value={`${baselineResult.tokensPerSecond.toFixed(0)}`} />
                  <MetricCard label="Time" value={`${baselineResult.timeMs.toFixed(0)}ms`} />
                  <MetricCard label="Speedup" value={`${(baselineResult.timeMs / Math.max(inferenceResult.totalTimeMs, 0.01)).toFixed(1)}×`} />
                </div>
                {perplexityStats.baseline && (
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <MetricCard label="Perplexity" value={perplexityStats.baseline.perplexity === Infinity ? "∞" : perplexityStats.baseline.perplexity.toFixed(1)} />
                    <MetricCard label="Avg NLL" value={perplexityStats.baseline.avgNLL === Infinity ? "∞" : perplexityStats.baseline.avgNLL.toFixed(3)} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Reports */}
        {report && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ReportPanel title="Atlas Projection" icon={<IconAtom className="w-4 h-4" />} content={report.projectionReport} />
            <ReportPanel title="Holographic Codec" icon={<IconChartBar className="w-4 h-4" />} content={report.holographicReport} />
          </div>
        )}

        {/* Live Log */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pipeline Log</h2>
          <div className="h-48 overflow-y-auto font-mono text-xs text-muted-foreground space-y-0.5 bg-muted/30 rounded-lg p-2">
            {logs.length === 0 ? (
              <p className="opacity-50">Waiting for pipeline initialization...</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className={log.includes("✓") ? "text-emerald-400" : log.includes("✗") ? "text-red-400" : ""}>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded-lg bg-muted/50">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-bold text-foreground">{value}</div>
    </div>
  );
}

function ReportPanel({ title, icon, content }: { title: string; icon: React.ReactNode; content: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        {icon}
        {title}
      </h2>
      <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap bg-muted/30 rounded-lg p-3 overflow-auto max-h-64">
        {content}
      </pre>
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
  const W = 700;
  const H = 200;
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

  const atlasPath = buildPath(atlas);
  const baselinePath = buildPath(baseline);

  // Y-axis ticks
  const yTicks = 5;
  const yLabels = Array.from({ length: yTicks }, (_, i) => {
    const val = minNLL + (nllRange * i) / (yTicks - 1);
    return { val, y: toY(val) };
  });

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase">Per-Token NLL Over Sequence</span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-primary rounded-full" />
            <span className="text-[10px] text-muted-foreground">Atlas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-accent rounded-full" />
            <span className="text-[10px] text-muted-foreground">Baseline</span>
          </div>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ maxHeight: 220 }}>
        {/* Grid lines */}
        {yLabels.map((t, i) => (
          <g key={i}>
            <line x1={PAD.left} x2={W - PAD.right} y1={t.y} y2={t.y} className="stroke-border" strokeWidth={0.5} strokeDasharray="4 2" />
            <text x={PAD.left - 6} y={t.y + 3} textAnchor="end" className="fill-muted-foreground" fontSize={9}>{t.val.toFixed(1)}</text>
          </g>
        ))}

        {/* Axis labels */}
        <text x={PAD.left + chartW / 2} y={H - 4} textAnchor="middle" className="fill-muted-foreground" fontSize={10}>Token Position</text>
        <text x={12} y={PAD.top + chartH / 2} textAnchor="middle" className="fill-muted-foreground" fontSize={10} transform={`rotate(-90, 12, ${PAD.top + chartH / 2})`}>NLL</text>

        {/* X-axis ticks */}
        {Array.from({ length: Math.min(maxLen, 8) }, (_, i) => {
          const idx = Math.round((i / Math.max(7, 1)) * (maxLen - 1));
          return (
            <text key={i} x={toX(idx, maxLen)} y={H - PAD.bottom + 16} textAnchor="middle" className="fill-muted-foreground" fontSize={9}>
              {idx}
            </text>
          );
        })}

        {/* Baseline line */}
        <path d={baselinePath} fill="none" className="stroke-accent" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />

        {/* Atlas line */}
        <path d={atlasPath} fill="none" className="stroke-primary" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {/* Hover dots — atlas */}
        {atlas.map((d, i) => (
          <circle key={`a${i}`} cx={toX(i, atlas.length)} cy={toY(d.nll)} r={2.5} className="fill-primary" opacity={0.6}>
            <title>{`Atlas #${d.index}: NLL=${d.nll.toFixed(3)} "${d.tokenStr}"`}</title>
          </circle>
        ))}

        {/* Hover dots — baseline */}
        {baseline.map((d, i) => (
          <circle key={`b${i}`} cx={toX(i, baseline.length)} cy={toY(d.nll)} r={2} className="fill-accent" opacity={0.5}>
            <title>{`Baseline #${d.index}: NLL=${d.nll.toFixed(3)} "${d.tokenStr}"`}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}

function QualityGradeBadge({ ratio }: { ratio: number }) {
  let grade: string;
  let color: string;
  let label: string;

  if (!isFinite(ratio)) {
    grade = "—";
    color = "bg-muted text-muted-foreground";
    label = "No data";
  } else if (ratio <= 1.0) {
    grade = "A";
    color = "bg-emerald-500/15 text-emerald-500 border-emerald-500/30";
    label = "Superior";
  } else if (ratio <= 1.25) {
    grade = "B";
    color = "bg-sky-500/15 text-sky-500 border-sky-500/30";
    label = "Near-parity";
  } else if (ratio <= 2.0) {
    grade = "C";
    color = "bg-amber-500/15 text-amber-500 border-amber-500/30";
    label = "Acceptable";
  } else {
    grade = "D";
    color = "bg-red-500/15 text-red-500 border-red-500/30";
    label = "Degraded";
  }

  return (
    <div className="p-2 rounded-lg bg-muted/50 flex flex-col items-center justify-center">
      <div className="text-xs text-muted-foreground">Grade</div>
      <div className={`mt-1 w-9 h-9 rounded-lg border flex items-center justify-center text-lg font-black ${color}`}>
        {grade}
      </div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
