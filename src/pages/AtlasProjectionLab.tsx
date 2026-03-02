/**
 * Atlas Projection Lab — AI Lab (Simplified)
 * ════════════════════════════════════════════
 *
 * Four sections: Discover → Project → Play → Benchmark
 */

import { useState, useCallback, useRef, useMemo, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconBrain, IconAtom, IconChartBar, IconPlayerPlay,
  IconLoader2, IconCheck, IconAlertTriangle, IconRocket, IconCpu,
  IconSparkles, IconEye, IconWand, IconFlask, IconArrowRight, IconX,
} from "@tabler/icons-react";
import { usePageTheme, type PagePalette } from "@/modules/hologram-ui/hooks/usePageTheme";

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

// ── Tabs ──
type LabTab = "discover" | "project" | "play" | "benchmark";

const TABS: { key: LabTab; label: string; icon: React.ReactNode }[] = [
  { key: "discover", label: "Discover", icon: <IconEye size={16} /> },
  { key: "project", label: "Project", icon: <IconAtom size={16} /> },
  { key: "play", label: "Play", icon: <IconWand size={16} /> },
  { key: "benchmark", label: "Benchmark", icon: <IconFlask size={16} /> },
];

interface AtlasProjectionLabProps {
  onClose?: () => void;
}

export default function AtlasProjectionLab({ onClose }: AtlasProjectionLabProps) {
  const P = usePageTheme("ai-lab");

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
        addLog(`Loading real model: ${BROWSER_MODELS[selectedModel]?.name ?? selectedModel}`);
        const loaded = await loadHFModel(selectedModel, (status) => {
          setLoadStatus(status);
          if (status.message) addLog(status.message);
        });
        loadedModelRef.current = loaded;
        manifest = loaded.manifest;
        weightLoader = loaded.weightLoader;
        addLog(`Model loaded: ${loaded.weights.size} weight tensors`);
      } else {
        addLog(`Using synthetic weights for ${manifest?.name ?? selectedModel}`);
        const profile = BROWSER_MODELS[selectedModel];
        if (profile) manifest = profile.manifest;
      }

      const pipeline = new AtlasProjectionPipeline({
        manifest, maxLayers: Math.min(manifest.layerCount, 8),
        useCompression: true, weightLoader,
      });
      pipeline.onStatusChange((status) => { setPipelineStatus(status); if (status.message) addLog(status.message); });
      pipelineRef.current = pipeline;

      if (loadedModelRef.current) {
        const loadedModel = loadedModelRef.current;
        const lmHeadWeights = loadedModel.weights.get("lm_head");
        if (lmHeadWeights) {
          pipeline.setLmHead(lmHeadWeights, loadedModel.manifest.vocabSize, loadedModel.manifest.hiddenDim);
          addLog(`✓ lm_head wired: [${loadedModel.manifest.vocabSize}×${loadedModel.manifest.hiddenDim}]`);
        }
        const { getNextTokenLogits } = await import("@/modules/hologram-compute/hf-model-bridge");
        pipeline.setLogitsCallback(async (context: number[]) => getNextTokenLogits(loadedModel, context.slice(-32)));
        addLog("✓ Real model forward-pass wired");
      }

      const benchmarkReport = await pipeline.benchmark([1, 2, 3, 4, 5], 16);
      setReport(benchmarkReport);
      addLog(`✓ Ready — ${benchmarkReport.benchmarkResult.tokensPerSecond.toFixed(0)} tok/s, ${benchmarkReport.holographicEncoding.compressionRatio.toFixed(1)}× compression`);
    } catch (error) {
      addLog(`✗ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [selectedModel, useRealModel, addLog]);

  // ── Run Inference ──────────────────────────────────────────
  const handleInfer = useCallback(async () => {
    const pipeline = pipelineRef.current;
    if (!pipeline || pipelineStatus.stage !== "ready") { addLog("Pipeline not ready."); return; }
    addLog(`Generating: "${prompt}"`);
    setPerplexityStats({ atlas: null, baseline: null });
    setPerTokenNLL({ atlas: [], baseline: [] });

    let tokenIds: number[];
    if (loadedModelRef.current) {
      tokenIds = tokenize(loadedModelRef.current, prompt);
    } else {
      tokenIds = prompt.split(/\s+/).map((w) => { let h = 0; for (let j = 0; j < w.length; j++) h = (h * 31 + w.charCodeAt(j)) & 0xFFFF; return h % 50000; });
    }

    const result = await pipeline.infer(tokenIds, 32);
    setInferenceResult(result);
    if (loadedModelRef.current) {
      const text = detokenize(loadedModelRef.current, result.tokenIds);
      setGeneratedText(text);
      addLog(`Generated: "${text}"`);
    } else {
      setGeneratedText(`[Token IDs: ${result.tokenIds.slice(0, 8).join(", ")}...]`);
    }
    addLog(`H-score: ${result.meanHScore.toFixed(4)}, ${result.tokensPerSecond.toFixed(0)} tok/s`);

    if (loadedModelRef.current) {
      setIsRunningBaseline(true);
      try {
        const baseline = await baselineInference(loadedModelRef.current, prompt, 32);
        setBaselineResult(baseline);
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
      } catch (e) {
        addLog(`Baseline skipped: ${e instanceof Error ? e.message : String(e)}`);
      } finally { setIsRunningBaseline(false); }
    }
  }, [prompt, pipelineStatus.stage, addLog]);

  const stageColor = pipelineStatus.stage === "ready" ? P.green : pipelineStatus.stage === "error" ? P.red : P.accent;

  return (
    <div style={{
      minHeight: "100vh",
      background: P.bg,
      color: P.text,
      fontFamily: P.font,
      display: "flex",
      flexDirection: "column",
    }}>
      {/* ── Compact Header ── */}
      <div style={{
        padding: "20px 32px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        borderBottom: `1px solid ${P.borderSubtle}`,
        background: P.headerGradient,
        flexShrink: 0,
      }}>
        <div style={{
          width: "40px", height: "40px", borderRadius: "12px",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: P.accentBg, border: `1px solid ${P.border}`,
        }}>
          <IconSparkles size={20} style={{ color: P.accent }} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: "20px", fontWeight: 600, fontFamily: P.serif, margin: 0, color: P.text }}>
            AI Lab
          </h1>
          <p style={{ fontSize: "12px", color: P.textMuted, margin: 0 }}>
            Discover, project, and benchmark AI models in your browser
          </p>
        </div>

        {/* Tab navigation inline */}
        <div style={{ display: "flex", gap: "2px", background: P.cardBgSubtle, borderRadius: "10px", padding: "3px" }}>
          {TABS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "8px 16px", fontSize: "13px", fontWeight: 500,
                fontFamily: P.font,
                background: activeTab === key ? P.cardBg : "transparent",
                color: activeTab === key ? P.text : P.textDim,
                border: activeTab === key ? `1px solid ${P.borderSubtle}` : "1px solid transparent",
                borderRadius: "8px",
                cursor: "pointer", transition: "all 0.2s",
                boxShadow: activeTab === key ? "0 1px 4px hsla(0,0%,0%,0.1)" : "none",
              }}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            style={{
              width: "32px", height: "32px", borderRadius: "8px",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "transparent", border: `1px solid ${P.borderSubtle}`,
              cursor: "pointer", color: P.textDim, transition: "all 0.2s",
            }}
          >
            <IconX size={14} />
          </button>
        )}
      </div>

      {/* ── Content — Full Width ── */}
      <div style={{ flex: 1, padding: "24px 32px", overflow: "auto" }}>
        <AnimatePresence mode="wait">
          {/* ── DISCOVER ── */}
          {activeTab === "discover" && (
            <motion.div key="discover" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <Suspense fallback={<LoadingPlaceholder P={P} text="Loading model browser…" />}>
                <HuggingFaceModelBrowser palette={P} />
              </Suspense>
            </motion.div>
          )}

          {/* ── PROJECT ── */}
          {activeTab === "project" && (
            <motion.div key="project" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {/* Step guide (only when idle) */}
              {pipelineStatus.stage === "idle" && (
                <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
                  {[
                    { n: "1", t: "Choose a model", d: "Pick from browser-compatible models or synthetic projections" },
                    { n: "2", t: "Initialize", d: "Downloads weights, decomposes tensors, encodes onto Atlas manifold" },
                    { n: "3", t: "Explore", d: "Head to Play or Benchmark to see results" },
                  ].map(({ n, t, d }) => (
                    <div key={n} style={{
                      flex: 1, padding: "20px", borderRadius: "14px",
                      background: P.cardBg, border: `1px solid ${P.cardBorder}`,
                      display: "flex", gap: "12px", alignItems: "flex-start",
                    }}>
                      <div style={{
                        width: "28px", height: "28px", borderRadius: "8px", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: P.accentBg, color: P.accent, fontSize: "13px", fontWeight: 700,
                        border: `1px solid ${P.border}`,
                      }}>{n}</div>
                      <div>
                        <p style={{ fontSize: "14px", color: P.text, margin: "0 0 4px", fontWeight: 600 }}>{t}</p>
                        <p style={{ fontSize: "12px", color: P.textMuted, margin: 0, lineHeight: 1.5 }}>{d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                {/* Model Selection */}
                <div style={{ padding: "24px", borderRadius: "16px", background: P.cardBg, border: `1px solid ${P.cardBorder}` }}>
                  <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: P.textMuted, marginBottom: "14px" }}>Select Model</p>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: "10px", fontSize: "14px",
                      background: P.inputBg, border: `1px solid ${P.inputBorder}`, color: P.text,
                      cursor: "pointer", outline: "none",
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

                  <label style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    marginTop: "12px", cursor: "pointer", fontSize: "13px", color: P.textMuted,
                  }}>
                    <input type="checkbox" checked={useRealModel} onChange={(e) => setUseRealModel(e.target.checked)}
                      style={{ accentColor: P.accent, width: "16px", height: "16px" }} />
                    Download real weights from HuggingFace
                  </label>

                  <button
                    onClick={handleInitialize}
                    disabled={pipelineStatus.stage !== "idle" && pipelineStatus.stage !== "ready" && pipelineStatus.stage !== "error"}
                    style={{
                      width: "100%", marginTop: "16px", padding: "12px", borderRadius: "10px",
                      background: P.btnPrimary, color: P.btnPrimaryText, border: "none",
                      fontSize: "14px", fontWeight: 600, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                      opacity: (pipelineStatus.stage !== "idle" && pipelineStatus.stage !== "ready" && pipelineStatus.stage !== "error") ? 0.5 : 1,
                    }}
                  >
                    <IconRocket size={16} />
                    {pipelineStatus.stage === "ready" ? "Re-initialize" : "Initialize Pipeline"}
                  </button>
                </div>

                {/* Status */}
                <div style={{ padding: "24px", borderRadius: "16px", background: P.cardBg, border: `1px solid ${P.cardBorder}` }}>
                  <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: P.textMuted, marginBottom: "14px" }}>Pipeline Status</p>

                  {useRealModel && loadStatus.stage !== "idle" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", fontSize: "13px", color: P.textMuted }}>
                      <StageIcon stage={loadStatus.stage} P={P} />
                      <span>{loadStatus.message}</span>
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: P.textMuted }}>
                    <StageIcon stage={pipelineStatus.stage} P={P} />
                    <span>{pipelineStatus.message}</span>
                  </div>

                  <div style={{ width: "100%", height: "4px", borderRadius: "2px", background: P.borderSubtle, marginTop: "14px", overflow: "hidden" }}>
                    <motion.div style={{ height: "100%", borderRadius: "2px", background: stageColor }}
                      animate={{ width: `${pipelineStatus.progress * 100}%` }} transition={{ duration: 0.3 }} />
                  </div>

                  {report && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginTop: "16px" }}>
                      <MetricBox label="Compression" value={`${report.holographicEncoding.compressionRatio.toFixed(1)}×`} P={P} />
                      <MetricBox label="Bekenstein" value={`${(report.holographicEncoding.bekensteinEfficiency * 100).toFixed(0)}%`} P={P} />
                      <MetricBox label="Tok/s" value={`${report.benchmarkResult.tokensPerSecond.toFixed(0)}`} P={P} />
                    </div>
                  )}

                  {pipelineStatus.stage === "ready" && (
                    <button onClick={() => setActiveTab("play")}
                      style={{
                        width: "100%", marginTop: "16px", padding: "12px", borderRadius: "10px",
                        background: `linear-gradient(135deg, ${P.green}, hsl(152, 44%, 38%))`, color: "#fff",
                        border: "none", fontSize: "14px", fontWeight: 600, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                      }}
                    >
                      <IconWand size={16} /> Ready — Start Playing <IconArrowRight size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Collapsible log */}
              <div style={{ marginTop: "16px", padding: "16px", borderRadius: "12px", background: P.cardBgSubtle, border: `1px solid ${P.borderSubtle}` }}>
                <button onClick={() => setShowLogs(p => !p)}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: P.textDim, display: "flex", alignItems: "center", gap: "6px", padding: 0 }}>
                  Pipeline Log <span style={{ fontWeight: 400 }}>{showLogs ? "▲" : `▼ ${logs.length}`}</span>
                </button>
                {showLogs && (
                  <div style={{ marginTop: "10px", maxHeight: "180px", overflowY: "auto", fontFamily: "monospace", fontSize: "11px", color: P.textDim, lineHeight: 1.7 }}>
                    {logs.length === 0 ? <span style={{ opacity: 0.5 }}>Waiting…</span> : logs.map((log, i) => (
                      <div key={i} style={{ color: log.includes("✓") ? P.green : log.includes("✗") ? P.red : P.textDim }}>{log}</div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── PLAY ── */}
          {activeTab === "play" && (
            <motion.div key="play" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {pipelineStatus.stage !== "ready" ? (
                <div style={{
                  textAlign: "center", padding: "80px 32px",
                  borderRadius: "16px", background: P.cardBg, border: `1px solid ${P.cardBorder}`,
                }}>
                  <IconAtom size={36} style={{ color: P.textDim, margin: "0 auto 16px" }} />
                  <h3 style={{ fontSize: "18px", fontWeight: 600, color: P.text, margin: "0 0 8px" }}>No model projected yet</h3>
                  <p style={{ fontSize: "14px", color: P.textMuted, margin: "0 0 20px", lineHeight: 1.6 }}>
                    Select and project a model first — it takes about 10–30 seconds.
                  </p>
                  <button onClick={() => setActiveTab("project")} style={{
                    padding: "10px 24px", borderRadius: "10px", background: P.btnPrimary,
                    color: P.btnPrimaryText, border: "none", fontSize: "14px", fontWeight: 600, cursor: "pointer",
                    display: "inline-flex", alignItems: "center", gap: "8px",
                  }}>
                    <IconRocket size={16} /> Go to Project
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {/* Prompt input */}
                  <div style={{ padding: "24px", borderRadius: "16px", background: P.cardBg, border: `1px solid ${P.cardBorder}` }}>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Type anything — the model will complete your thought…"
                        onKeyDown={(e) => e.key === "Enter" && handleInfer()}
                        style={{
                          flex: 1, padding: "12px 16px", borderRadius: "10px", fontSize: "14px",
                          background: P.inputBg, border: `1px solid ${P.inputBorder}`, color: P.text, outline: "none",
                        }}
                      />
                      <button onClick={handleInfer} style={{
                        padding: "12px 24px", borderRadius: "10px", background: P.btnPrimary,
                        color: P.btnPrimaryText, border: "none", fontSize: "14px", fontWeight: 600,
                        cursor: "pointer", display: "flex", alignItems: "center", gap: "8px",
                      }}>
                        <IconPlayerPlay size={14} /> Generate
                      </button>
                    </div>

                    {generatedText && (
                      <div style={{
                        marginTop: "16px", padding: "16px", borderRadius: "12px",
                        background: P.cardBgSubtle, border: `1px solid ${P.borderSubtle}`,
                        fontSize: "14px", fontFamily: "monospace", whiteSpace: "pre-wrap", lineHeight: 1.7,
                      }}>
                        <span style={{ color: P.textMuted }}>{prompt}</span>
                        <span style={{ color: P.accent }}>{generatedText.replace(prompt, "")}</span>
                      </div>
                    )}

                    {inferenceResult && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px", marginTop: "16px" }}>
                        <MetricBox label="Tokens" value={`${inferenceResult.tokenIds.length}`} P={P} />
                        <MetricBox label="H-score" value={inferenceResult.meanHScore.toFixed(3)} P={P} />
                        <MetricBox label="Tok/s" value={`${inferenceResult.tokensPerSecond.toFixed(0)}`} P={P} />
                        <MetricBox label="Time" value={`${inferenceResult.totalTimeMs.toFixed(0)}ms`} P={P} />
                      </div>
                    )}
                  </div>

                  {/* Comparison */}
                  {baselineResult && inferenceResult && (
                    <div style={{ padding: "24px", borderRadius: "16px", background: P.cardBg, border: `1px solid ${P.cardBorder}` }}>
                      <p style={{ fontSize: "15px", fontWeight: 600, color: P.text, marginBottom: "16px" }}>
                        Atlas vs Standard Transformer
                      </p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <ComparisonPanel P={P} title="Atlas Coherence (O(96))" accent={P.accent}
                          text={generatedText}
                          metrics={[
                            { l: "Tok/s", v: `${inferenceResult.tokensPerSecond.toFixed(0)}` },
                            { l: "Time", v: `${inferenceResult.totalTimeMs.toFixed(0)}ms` },
                            { l: "H-score", v: inferenceResult.meanHScore.toFixed(3) },
                          ]}
                          ppl={perplexityStats.atlas}
                        />
                        <ComparisonPanel P={P} title="Standard Attention (O(N²))" accent={P.textMuted}
                          text={baselineResult.text.slice(0, 200)}
                          metrics={[
                            { l: "Tok/s", v: `${baselineResult.tokensPerSecond.toFixed(0)}` },
                            { l: "Time", v: `${baselineResult.timeMs.toFixed(0)}ms` },
                            { l: "Speedup", v: `${(baselineResult.timeMs / Math.max(inferenceResult.totalTimeMs, 0.01)).toFixed(1)}×` },
                          ]}
                          ppl={perplexityStats.baseline}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ── BENCHMARK ── */}
          {activeTab === "benchmark" && (
            <motion.div key="benchmark" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <Suspense fallback={<LoadingPlaceholder P={P} text="Loading benchmark suite…" />}>
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

function LoadingPlaceholder({ P, text }: { P: PagePalette; text: string }) {
  return (
    <div style={{ padding: "48px", textAlign: "center", fontSize: "13px", color: P.textMuted, display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
      <div style={{ width: "24px", height: "24px", borderRadius: "50%", border: `2px solid ${P.border}`, borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
      {text}
    </div>
  );
}

function StageIcon({ stage, P }: { stage: string; P: PagePalette }) {
  if (stage === "ready") return <IconCheck size={14} style={{ color: P.green }} />;
  if (stage === "error") return <IconAlertTriangle size={14} style={{ color: P.red }} />;
  if (stage === "idle") return <IconAtom size={14} style={{ color: P.textDim }} />;
  return <IconLoader2 size={14} style={{ color: P.accent }} className="animate-spin" />;
}

function MetricBox({ label, value, P }: { label: string; value: string; P: PagePalette }) {
  return (
    <div style={{
      padding: "10px", borderRadius: "10px", textAlign: "center",
      background: P.cardBgSubtle, border: `1px solid ${P.borderSubtle}`,
    }}>
      <div style={{ fontSize: "10px", color: P.textMuted, marginBottom: "3px" }}>{label}</div>
      <div style={{ fontSize: "16px", fontWeight: 700, color: P.text, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

function ComparisonPanel({ P, title, accent, text, metrics, ppl }: {
  P: PagePalette; title: string; accent: string; text: string;
  metrics: { l: string; v: string }[];
  ppl: { perplexity: number; avgNLL: number } | null;
}) {
  return (
    <div style={{ padding: "18px", borderRadius: "14px", background: P.cardBgSubtle, border: `1px solid ${P.borderSubtle}` }}>
      <p style={{ fontSize: "13px", fontWeight: 600, color: accent, marginBottom: "12px" }}>{title}</p>
      <div style={{ fontSize: "13px", fontFamily: "monospace", color: P.text, lineHeight: 1.6, marginBottom: "14px", maxHeight: "80px", overflow: "hidden" }}>{text}</div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${metrics.length}, 1fr)`, gap: "6px" }}>
        {metrics.map((m) => <MetricBox key={m.l} label={m.l} value={m.v} P={P} />)}
      </div>
      {ppl && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginTop: "8px" }}>
          <MetricBox label="Perplexity" value={ppl.perplexity === Infinity ? "∞" : ppl.perplexity.toFixed(1)} P={P} />
          <MetricBox label="Avg NLL" value={ppl.avgNLL === Infinity ? "∞" : ppl.avgNLL.toFixed(3)} P={P} />
        </div>
      )}
    </div>
  );
}
