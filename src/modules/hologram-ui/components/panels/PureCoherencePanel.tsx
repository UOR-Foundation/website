/**
 * Pure Coherence Inference Panel — End-to-End Browser Inference
 * ══════════════════════════════════════════════════════════════
 *
 * No weights. No gateway. No matrix multiply.
 * Three-scale Atlas manifold navigation → text generation.
 *
 * Pipeline:
 *   Vocabulary Partition (96 clusters) → Coherence Navigator (Fano/Edge/Vertex)
 *   → Token Emitter (stabilizer-verified sampling)
 */

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconPlayerPlay, IconPlayerStop, IconSparkles, IconAtom,
  IconBolt, IconShield, IconFlame, IconRefresh, IconGrid4x4,
  IconTypography,
} from "@tabler/icons-react";
import type { PagePalette } from "@/modules/hologram-ui/hooks/usePageTheme";
import {
  CoherenceTokenDecoder,
  type DecoderStatus,
  type GenerationToken,
  type GenerationResult,
} from "@/modules/hologram-compute/coherence-token-decoder";
import type { VertexCluster } from "@/modules/hologram-compute/vocabulary-partitioner";

// ── Types ─────────────────────────────────────────────────────

interface Props {
  P: PagePalette;
}

const DEMO_PROMPTS = [
  "The nature of consciousness is",
  "In the beginning there was",
  "Mathematics describes reality because",
  "The holographic principle states that",
  "A coherent universe requires",
];

// ── Component ─────────────────────────────────────────────────

export default function PureCoherencePanel({ P }: Props) {
  const [prompt, setPrompt] = useState(DEMO_PROMPTS[0]);
  const [status, setStatus] = useState<DecoderStatus>({ stage: "idle", progress: 0, message: "Not initialized" });
  const [tokens, setTokens] = useState<GenerationToken[]>([]);
  const [fullText, setFullText] = useState("");
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(64);
  const [activeTab, setActiveTab] = useState<"stream" | "clusters">("stream");
  const [hoveredCluster, setHoveredCluster] = useState<number | null>(null);

  const decoderRef = useRef<CoherenceTokenDecoder | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Initialize decoder
  const initialize = useCallback(async () => {
    const decoder = new CoherenceTokenDecoder({ temperature, maxTokens });
    decoder.onStatus(setStatus);
    decoderRef.current = decoder;
    await decoder.initialize();
  }, [temperature, maxTokens]);

  // Auto-initialize on mount
  useEffect(() => {
    initialize().catch(console.error);
    return () => { decoderRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generate = useCallback(async () => {
    const decoder = decoderRef.current;
    if (!decoder || status.stage !== "ready") return;

    setTokens([]);
    setFullText("");
    setResult(null);
    setIsGenerating(true);

    try {
      const res = await decoder.generate(prompt, (tok, text) => {
        setTokens(prev => [...prev, tok]);
        setFullText(text);
        if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
      });
      setResult(res);
    } catch (err) {
      console.error("[PureCoherence] Generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, status.stage]);

  const isReady = status.stage === "ready";
  const isLoading = status.stage === "loading-tokenizer" || status.stage === "partitioning";
  const hasTokens = tokens.length > 0;

  // Live metrics from latest token
  const latest = tokens.length > 0 ? tokens[tokens.length - 1] : null;
  const meanH = tokens.length > 0 ? tokens.reduce((s, t) => s + t.hScore, 0) / tokens.length : 0;
  const meanFano = tokens.length > 0 ? tokens.reduce((s, t) => s + t.fanoChannelsActive, 0) / tokens.length : 0;
  const totalSyndromes = tokens.reduce((s, t) => s + t.syndromeCount, 0);
  const totalStabRejected = tokens.reduce((s, t) => s + t.rejectedByStabilizer, 0);
  const parityCleanRate = tokens.length > 0 ? tokens.filter(t => t.parityClean).length / tokens.length : 0;
  const meanPhaseAlign = tokens.length > 0 ? tokens.reduce((s, t) => s + t.phaseAlignment, 0) / tokens.length : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: P.bg }}>
      {/* ── Header ── */}
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${P.borderSubtle}`, background: `linear-gradient(135deg, ${P.accent}06, transparent)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", background: `${P.green}15`, border: `1px solid ${P.green}25` }}>
            <IconAtom size={18} style={{ color: P.green }} />
          </div>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: 700, fontFamily: P.serif, color: P.text, margin: 0 }}>
              Pure Coherence Inference
            </h2>
            <p style={{ fontSize: "10px", color: P.textMuted, margin: 0 }}>
              No weights · No gateway · Three-scale Atlas navigation · SmolLM2 1.7B vocabulary
            </p>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
            <Badge P={P} label="O(96)" active />
            <Badge P={P} label="~50MB" active />
            <Badge P={P} label="Browser-only" active />
          </div>
        </div>

        {/* Status bar */}
        {isLoading && (
          <div style={{ marginBottom: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", marginBottom: "4px" }}>
              <span style={{ color: P.accent, fontWeight: 600 }}>{status.message}</span>
              <span style={{ color: P.textDim }}>{(status.progress * 100).toFixed(0)}%</span>
            </div>
            <div style={{ height: "3px", borderRadius: "2px", background: `${P.accent}15`, overflow: "hidden" }}>
              <motion.div animate={{ width: `${status.progress * 100}%` }} transition={{ duration: 0.3 }}
                style={{ height: "100%", borderRadius: "2px", background: P.accent }} />
            </div>
          </div>
        )}

        {/* Prompt + controls */}
        <div style={{ display: "flex", gap: "6px" }}>
          <input type="text" value={prompt} onChange={e => setPrompt(e.target.value)}
            disabled={isGenerating || isLoading}
            onKeyDown={e => e.key === "Enter" && isReady && !isGenerating && generate()}
            placeholder="Enter a prompt…"
            style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", fontSize: "12px", background: P.inputBg, border: `1px solid ${P.inputBorder}`, color: P.text, outline: "none" }} />

          <select value={maxTokens} onChange={e => setMaxTokens(Number(e.target.value))} disabled={isGenerating}
            style={{ padding: "8px 6px", borderRadius: "8px", fontSize: "11px", background: P.cardBg, border: `1px solid ${P.cardBorder}`, color: P.text, cursor: "pointer" }}>
            {[16, 32, 64, 128].map(n => <option key={n} value={n}>{n} tok</option>)}
          </select>

          <select value={temperature} onChange={e => setTemperature(Number(e.target.value))} disabled={isGenerating}
            style={{ padding: "8px 6px", borderRadius: "8px", fontSize: "11px", background: P.cardBg, border: `1px solid ${P.cardBorder}`, color: P.text, cursor: "pointer" }}>
            {[0.3, 0.5, 0.7, 0.9, 1.2].map(t => <option key={t} value={t}>T={t}</option>)}
          </select>

          {isGenerating ? (
            <button onClick={() => {}}
              style={{ padding: "8px 14px", borderRadius: "8px", background: `${P.red}20`, color: P.red, border: `1px solid ${P.red}30`, fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
              <IconPlayerStop size={13} /> Stop
            </button>
          ) : (
            <button onClick={generate} disabled={!isReady}
              style={{ padding: "8px 16px", borderRadius: "8px", background: isReady ? P.btnPrimary : P.cardBg, color: isReady ? P.btnPrimaryText : P.textDim, border: isReady ? "none" : `1px solid ${P.cardBorder}`, fontSize: "12px", fontWeight: 600, cursor: isReady ? "pointer" : "default", display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
              <IconPlayerPlay size={13} /> {isReady ? "Generate" : "Loading…"}
            </button>
          )}

          {status.stage === "error" && (
            <button onClick={initialize}
              style={{ padding: "8px 12px", borderRadius: "8px", background: P.cardBg, color: P.textDim, border: `1px solid ${P.cardBorder}`, fontSize: "11px", cursor: "pointer", display: "flex", alignItems: "center", gap: "3px" }}>
              <IconRefresh size={12} /> Retry
            </button>
          )}
        </div>

        {/* Quick prompts */}
        <div style={{ display: "flex", gap: "4px", marginTop: "8px", flexWrap: "wrap" }}>
          {DEMO_PROMPTS.map((p, i) => (
            <button key={i} onClick={() => !isGenerating && setPrompt(p)} disabled={isGenerating}
              style={{ fontSize: "9px", color: prompt === p ? P.accent : P.textDim, background: prompt === p ? `${P.accent}10` : "transparent", padding: "2px 7px", borderRadius: "4px", border: prompt === p ? `1px solid ${P.accent}25` : `1px solid ${P.borderSubtle}`, cursor: isGenerating ? "default" : "pointer" }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── Metrics Bar ── */}
      <AnimatePresence>
        {(hasTokens || isGenerating) && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            style={{ borderBottom: `1px solid ${P.borderSubtle}`, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px", background: P.borderSubtle }}>
              <MiniMetric P={P} label="H-score" value={latest?.hScore.toFixed(3) ?? "—"} highlight={!!latest && latest.hScore > 0.5} icon={<IconSparkles size={10} />} />
              <MiniMetric P={P} label="Zone" value={latest?.zone ?? "—"} highlight={latest?.zone === "convergent"} icon={<IconFlame size={10} />} />
              <MiniMetric P={P} label="∂H/∂t" value={latest?.dHdt.toFixed(4) ?? "—"} highlight={!!latest && latest.dHdt > 0} icon={<IconBolt size={10} />} />
              <MiniMetric P={P} label="Active V" value={latest?.activeVertices.toString() ?? "—"} highlight={!!latest && latest.activeVertices > 10} icon={<IconAtom size={10} />} />
              <MiniMetric P={P} label="Fano Ch." value={latest?.fanoChannelsActive.toString() ?? "—"} highlight={!!latest && latest.fanoChannelsActive > 3} />
              <MiniMetric P={P} label="Syndromes" value={totalSyndromes.toString()} highlight={totalSyndromes === 0} icon={<IconShield size={10} />} />
              <MiniMetric P={P} label="Tokens" value={`${tokens.length}/${maxTokens}`} highlight={false} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tab bar ── */}
      {isReady && (
        <div style={{ display: "flex", borderBottom: `1px solid ${P.borderSubtle}`, background: P.cardBgSubtle }}>
          {([
            { key: "stream" as const, label: "Token Stream", icon: <IconTypography size={11} /> },
            { key: "clusters" as const, label: "Vocab Clusters", icon: <IconGrid4x4 size={11} /> },
          ]).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{
                display: "flex", alignItems: "center", gap: "4px", padding: "7px 14px",
                fontSize: "10px", fontWeight: activeTab === tab.key ? 700 : 500,
                color: activeTab === tab.key ? P.accent : P.textDim,
                background: activeTab === tab.key ? P.bg : "transparent",
                borderBottom: activeTab === tab.key ? `2px solid ${P.accent}` : "2px solid transparent",
                border: "none", borderTop: "none", cursor: "pointer",
              }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Main Content ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div ref={outputRef} style={{ flex: 1, overflowY: "auto", padding: activeTab === "clusters" ? "12px" : "20px 24px", fontSize: "14px", lineHeight: 1.85 }}>

          {/* ── Clusters tab ── */}
          {activeTab === "clusters" && isReady && decoderRef.current && (
            <VocabClusterHeatmap P={P} decoder={decoderRef.current} hoveredCluster={hoveredCluster} setHoveredCluster={setHoveredCluster} />
          )}

          {/* ── Stream tab ── */}
          {activeTab === "stream" && (
            <>
              {/* Empty state */}
              {!hasTokens && !isGenerating && isReady && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "20px" }}>
                  <div style={{ width: "56px", height: "56px", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", background: `${P.green}08`, border: `1px solid ${P.green}12` }}>
                    <IconAtom size={28} style={{ color: P.green, opacity: 0.5 }} />
                  </div>
                  <div style={{ textAlign: "center", maxWidth: "420px" }}>
                    <h3 style={{ fontSize: "18px", fontWeight: 600, fontFamily: P.serif, color: P.text, margin: "0 0 8px" }}>
                      Pure Coherence Inference
                    </h3>
                    <p style={{ fontSize: "12px", color: P.textMuted, lineHeight: 1.7 }}>
                      Text generation via three-scale Atlas manifold navigation.
                      No weight tensors are loaded — token selection is driven entirely by
                      coherence gradient descent through 96 Atlas vertex clusters.
                    </p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", maxWidth: "400px", width: "100%" }}>
                    {[
                      { label: "Engram Vocabulary Cache", desc: `${status.partitionStats?.totalTokens?.toLocaleString() ?? "49K"} tokens → ${status.partitionStats?.activeClusters ?? 96} clusters`, color: P.purple },
                      { label: "Coherence Navigator", desc: "Fano routing · Edge diffusion · Vertex sharpening", color: P.accent },
                      { label: "Token Emitter", desc: "τ-mirror verified sampling · Prescience modulation", color: P.green },
                    ].map((layer, i) => (
                      <div key={i}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "8px", background: P.cardBg, border: `1px solid ${P.cardBorder}` }}>
                          <div style={{ width: "24px", height: "24px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", background: `${layer.color}12`, border: `1px solid ${layer.color}25`, fontSize: "10px", fontWeight: 800, color: layer.color, flexShrink: 0 }}>
                            {i + 1}
                          </div>
                          <div>
                            <div style={{ fontSize: "12px", fontWeight: 600, color: P.text }}>{layer.label}</div>
                            <div style={{ fontSize: "10px", color: P.textDim }}>{layer.desc}</div>
                          </div>
                        </div>
                        {i < 2 && <div style={{ display: "flex", justifyContent: "center" }}><div style={{ width: "1px", height: "4px", background: P.borderSubtle }} /></div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Loading state */}
              {isLoading && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "16px" }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    style={{ width: "32px", height: "32px", borderRadius: "50%", border: `3px solid ${P.accent}20`, borderTopColor: P.accent }} />
                  <p style={{ fontSize: "12px", color: P.textMuted }}>{status.message}</p>
                </div>
              )}

              {/* Token output */}
              {hasTokens && (
                <div>
                  <div style={{ marginBottom: "8px" }}>
                    <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: P.textDim }}>Prompt</span>
                  </div>
                  <p style={{ color: P.textDim, fontSize: "13px", marginBottom: "14px", paddingBottom: "10px", borderBottom: `1px solid ${P.borderSubtle}` }}>{prompt}</p>
                  <div style={{ marginBottom: "6px" }}>
                    <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: P.green }}>
                      Pure Coherence · SmolLM2 1.7B Vocabulary · No Weights
                    </span>
                  </div>
                  <div>
                    {tokens.map((tok, i) => (
                      <CoherenceStreamToken key={i} token={tok} P={P} />
                    ))}
                    {isGenerating && (
                      <motion.span animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.5, repeat: Infinity }}
                        style={{ display: "inline-block", width: "2px", height: "14px", background: P.green, borderRadius: "1px", verticalAlign: "middle", marginLeft: "1px" }} />
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Right sidebar (diagnostics) ── */}
        <AnimatePresence>
          {(hasTokens || result) && activeTab === "stream" && (
            <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 220, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
              style={{ borderLeft: `1px solid ${P.borderSubtle}`, overflowY: "auto", overflowX: "hidden", background: P.cardBgSubtle, flexShrink: 0 }}>
              <div style={{ padding: "14px 10px" }}>
                <SectionLabel P={P}>Pipeline</SectionLabel>
                <StatRow P={P} label="Mode" value="Pure Coherence" highlight />
                <StatRow P={P} label="Vocabulary" value={`${status.partitionStats?.totalTokens?.toLocaleString() ?? "—"} tokens`} />
                <StatRow P={P} label="Active Clusters" value={`${status.partitionStats?.activeClusters ?? "—"}/96`} />
                <StatRow P={P} label="Cluster Entropy" value={status.partitionStats?.partitionEntropy?.toFixed(2) ?? "—"} />
                <StatRow P={P} label="Weights Loaded" value="0 bytes" highlight />
                <StatRow P={P} label="Matrix Multiplies" value="0" highlight />

                <Divider P={P} />
                <SectionLabel P={P}>Navigation</SectionLabel>
                <StatRow P={P} label="Mean H-score" value={meanH.toFixed(3)} highlight={meanH > 0.5} />
                <StatRow P={P} label="Latest Zone" value={latest?.zone ?? "—"} highlight={latest?.zone === "convergent"} />
                <StatRow P={P} label="∂H/∂t" value={latest?.dHdt.toFixed(4) ?? "—"} highlight={!!latest && latest.dHdt > 0} />
                <StatRow P={P} label="Avg Fano Channels" value={meanFano.toFixed(1)} />
                <StatRow P={P} label="Total Syndromes" value={totalSyndromes.toString()} highlight={totalSyndromes === 0} />
                <StatRow P={P} label="Active Vertices" value={latest?.activeVertices?.toString() ?? "—"} />

                <Divider P={P} />
                <SectionLabel P={P}>Emitter (Phase 3)</SectionLabel>
                <StatRow P={P} label="Strategy" value={latest?.samplingStrategy ?? "—"} highlight />
                <StatRow P={P} label="Parity Clean" value={`${(parityCleanRate * 100).toFixed(0)}%`} highlight={parityCleanRate > 0.8} />
                <StatRow P={P} label="Stab. Rejected" value={totalStabRejected.toString()} highlight={totalStabRejected > 0} />
                <StatRow P={P} label="Phase Align φ̄" value={meanPhaseAlign.toFixed(2)} highlight={meanPhaseAlign > 0.6} />
                <StatRow P={P} label="H-contrib" value={latest?.hScoreContrib?.toFixed(3) ?? "—"} />

                {result && (
                  <>
                    <Divider P={P} />
                    <SectionLabel P={P}>Performance</SectionLabel>
                    <StatRow P={P} label="Tokens" value={result.tokens.length.toString()} />
                    <StatRow P={P} label="Total Time" value={`${result.totalTimeMs.toFixed(0)}ms`} />
                    <StatRow P={P} label="tok/s" value={result.tokensPerSecond.toFixed(0)} highlight />
                    <StatRow P={P} label="Mean H̄" value={result.meanHScore.toFixed(3)} />
                    <StatRow P={P} label="Pure Coherence" value="✓" highlight />
                  </>
                )}

                <Divider P={P} />
                <SectionLabel P={P}>How It Works</SectionLabel>
                <p style={{ fontSize: "9px", color: P.textMuted, lineHeight: 1.7 }}>
                  Phase 3 enhanced emitter: tokens pass through a stabilizer filter
                  (τ-mirror parity check), coherence bias (H-score maximizing power law),
                  and phase modulation (cos² envelope scanning sign classes via φ).
                  Three strategies compose: filter → score → sample.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom summary ── */}
      <AnimatePresence>
        {result && !isGenerating && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            style={{ padding: "8px 24px", borderTop: `1px solid ${P.borderSubtle}`, background: `linear-gradient(to right, ${P.green}05, transparent)`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "10px", color: P.textMuted }}>
              Pure Coherence · {result.tokens.length} tokens in {result.totalTimeMs.toFixed(0)}ms · H̄={result.meanHScore.toFixed(3)} · {totalSyndromes} syndromes · 0 bytes of weights
            </span>
            <span style={{ fontSize: "13px", fontWeight: 700, color: P.green }}>
              {result.tokensPerSecond.toFixed(0)} tok/s 🧬
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Vocabulary Cluster Heatmap
// ═══════════════════════════════════════════════════════════════

const SIGN_CLASS_LABELS = ["sc₀", "sc₁", "sc₂", "sc₃", "sc₄", "sc₅", "sc₆", "sc₇"];
const SIGN_CLASS_HUES = [200, 160, 120, 80, 40, 320, 280, 240];

function VocabClusterHeatmap({
  P, decoder, hoveredCluster, setHoveredCluster,
}: {
  P: PagePalette;
  decoder: CoherenceTokenDecoder;
  hoveredCluster: number | null;
  setHoveredCluster: (v: number | null) => void;
}) {
  const partitioner = decoder.getPartitioner();
  const stats = partitioner.getStats();
  const clusters = useMemo(() => partitioner.getAllClusters(), [partitioner]);

  // Compute derived stats
  const maxSize = useMemo(() => Math.max(...clusters.map(c => c.size), 1), [clusters]);
  const maxEntropy = useMemo(() => Math.max(...clusters.map(c => c.entropy), 0.01), [clusters]);

  const hovered = hoveredCluster !== null ? clusters[hoveredCluster] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", height: "100%" }}>
      {/* Summary stats bar */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {[
          { label: "Total Tokens", value: stats?.totalTokens?.toLocaleString() ?? "—" },
          { label: "Active Clusters", value: `${stats?.activeClusters ?? 0}/96` },
          { label: "Mean Size", value: stats?.meanClusterSize?.toFixed(0) ?? "—" },
          { label: "Std Dev", value: stats?.stdClusterSize?.toFixed(0) ?? "—" },
          { label: "Min/Max", value: `${stats?.minClusterSize ?? 0}/${stats?.maxClusterSize ?? 0}` },
          { label: "Entropy", value: stats?.partitionEntropy?.toFixed(2) ?? "—" },
        ].map(s => (
          <div key={s.label} style={{ padding: "4px 10px", borderRadius: "6px", background: P.cardBg, border: `1px solid ${P.cardBorder}`, display: "flex", gap: "6px", alignItems: "baseline" }}>
            <span style={{ fontSize: "8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: P.textDim }}>{s.label}</span>
            <span style={{ fontSize: "12px", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: P.text }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Heatmap grid: 12 rows × 8 columns (96 vertices) */}
      <div style={{ display: "flex", gap: "12px", flex: 1, minHeight: 0 }}>
        {/* Grid */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
          {/* Column headers (sign classes) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "2px", marginBottom: "2px" }}>
            {SIGN_CLASS_LABELS.map((sc, i) => (
              <div key={i} style={{ textAlign: "center", fontSize: "7px", fontWeight: 700, color: `hsl(${SIGN_CLASS_HUES[i]}, 50%, 55%)`, letterSpacing: "0.05em" }}>
                {sc}
              </div>
            ))}
          </div>

          {/* Grid cells */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "2px", flex: 1 }}>
            {clusters.map((cluster, idx) => {
              const sizeRatio = cluster.size / maxSize;
              const entropyRatio = cluster.entropy / maxEntropy;
              const sc = idx % 8;
              const hue = SIGN_CLASS_HUES[sc];
              const isHovered = hoveredCluster === idx;

              // Color: saturation from size, lightness from entropy
              const sat = 20 + sizeRatio * 60;
              const light = 85 - sizeRatio * 55;
              const alpha = 0.15 + sizeRatio * 0.85;

              return (
                <motion.div
                  key={idx}
                  onMouseEnter={() => setHoveredCluster(idx)}
                  onMouseLeave={() => setHoveredCluster(null)}
                  whileHover={{ scale: 1.08, zIndex: 10 }}
                  style={{
                    position: "relative",
                    borderRadius: "4px",
                    background: `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`,
                    border: isHovered
                      ? `2px solid hsl(${hue}, 70%, 50%)`
                      : `1px solid hsla(${hue}, 30%, 50%, 0.15)`,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "2px",
                    minHeight: "32px",
                    transition: "border 0.15s",
                  }}
                >
                  <span style={{
                    fontSize: "8px", fontWeight: 800,
                    color: sizeRatio > 0.5 ? `hsl(${hue}, 20%, 95%)` : `hsl(${hue}, 50%, 40%)`,
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {cluster.size}
                  </span>
                  <span style={{
                    fontSize: "6px",
                    color: sizeRatio > 0.5 ? `hsl(${hue}, 20%, 80%)` : `hsl(${hue}, 30%, 55%)`,
                  }}>
                    v{idx}
                  </span>
                </motion.div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "6px", justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div style={{ width: "24px", height: "6px", borderRadius: "3px", background: "linear-gradient(to right, hsla(200,30%,85%,0.3), hsla(200,70%,35%,1))" }} />
              <span style={{ fontSize: "7px", color: P.textDim }}>Cluster size</span>
            </div>
            <span style={{ fontSize: "7px", color: P.textDim }}>·</span>
            <span style={{ fontSize: "7px", color: P.textDim }}>12 rows × 8 sign classes = 96 Atlas vertices</span>
          </div>
        </div>

        {/* Detail panel for hovered cluster */}
        <div style={{
          width: "220px", flexShrink: 0, borderRadius: "8px",
          background: P.cardBg, border: `1px solid ${P.cardBorder}`,
          padding: "12px", overflowY: "auto", overflowX: "hidden",
        }}>
          {hovered ? (
            <ClusterDetail P={P} cluster={hovered} maxSize={maxSize} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "8px" }}>
              <IconGrid4x4 size={20} style={{ color: P.textDim, opacity: 0.3 }} />
              <p style={{ fontSize: "10px", color: P.textDim, textAlign: "center" }}>
                Hover a cell to inspect cluster tokens, entropy, and coherence distribution
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ClusterDetail({ P, cluster, maxSize }: { P: PagePalette; cluster: VertexCluster; maxSize: number }) {
  const sc = cluster.vertexIndex % 8;
  const hue = SIGN_CLASS_HUES[sc];
  const topTokens = cluster.tokens.slice(0, 20);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{
          width: "28px", height: "28px", borderRadius: "7px",
          background: `hsl(${hue}, 50%, 40%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "10px", fontWeight: 800, color: "#fff",
        }}>
          {cluster.vertexIndex}
        </div>
        <div>
          <div style={{ fontSize: "12px", fontWeight: 700, color: P.text }}>Vertex {cluster.vertexIndex}</div>
          <div style={{ fontSize: "9px", color: `hsl(${hue}, 50%, 55%)` }}>
            Sign class {sc} · {SIGN_CLASS_LABELS[sc]}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
        {[
          { label: "Tokens", value: cluster.size.toString() },
          { label: "Entropy", value: cluster.entropy.toFixed(2) },
          { label: "Fill %", value: `${((cluster.size / maxSize) * 100).toFixed(0)}%` },
          { label: "Row", value: `${Math.floor(cluster.vertexIndex / 8)}` },
        ].map(s => (
          <div key={s.label} style={{ padding: "3px 6px", borderRadius: "4px", background: P.cardBgSubtle, border: `1px solid ${P.borderSubtle}` }}>
            <div style={{ fontSize: "7px", fontWeight: 600, textTransform: "uppercase", color: P.textDim, letterSpacing: "0.05em" }}>{s.label}</div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: P.text, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Weight distribution bar */}
      <div>
        <div style={{ fontSize: "7px", fontWeight: 700, textTransform: "uppercase", color: P.textDim, marginBottom: "3px", letterSpacing: "0.1em" }}>
          Weight Distribution
        </div>
        <div style={{ height: "12px", borderRadius: "3px", overflow: "hidden", display: "flex", background: P.cardBgSubtle, border: `1px solid ${P.borderSubtle}` }}>
          {topTokens.slice(0, 8).map((t, i) => {
            const totalW = topTokens.reduce((s, tk) => s + tk.weight, 0);
            const w = totalW > 0 ? (t.weight / totalW) * 100 : 0;
            return (
              <div key={i} style={{
                width: `${w}%`, height: "100%",
                background: `hsl(${hue}, ${50 + i * 5}%, ${45 + i * 5}%)`,
                minWidth: w > 0.5 ? "1px" : 0,
              }}
                title={`"${t.tokenString}" — ${(w).toFixed(1)}%`}
              />
            );
          })}
        </div>
      </div>

      {/* Top tokens list */}
      <div>
        <div style={{ fontSize: "7px", fontWeight: 700, textTransform: "uppercase", color: P.textDim, marginBottom: "4px", letterSpacing: "0.1em" }}>
          Top Tokens ({cluster.size} total)
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
          {topTokens.map((t, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: "6px", padding: "2px 4px",
              borderRadius: "3px",
              background: i % 2 === 0 ? "transparent" : P.cardBgSubtle,
              fontSize: "9px",
            }}>
              <span style={{ width: "16px", textAlign: "right", fontWeight: 600, color: P.textDim, fontVariantNumeric: "tabular-nums", fontSize: "8px" }}>
                #{t.rank}
              </span>
              <span style={{
                flex: 1, fontFamily: "monospace", color: P.text, fontWeight: 500,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                maxWidth: "100px",
              }}
                title={t.tokenString}
              >
                {JSON.stringify(t.tokenString)}
              </span>
              {/* Weight bar */}
              <div style={{ width: "40px", height: "4px", borderRadius: "2px", background: P.cardBgSubtle, overflow: "hidden", flexShrink: 0 }}>
                <div style={{
                  width: `${(t.weight / (topTokens[0]?.weight || 1)) * 100}%`,
                  height: "100%", borderRadius: "2px",
                  background: `hsl(${hue}, 55%, 50%)`,
                }} />
              </div>
              <span style={{ fontSize: "7px", color: P.textDim, fontVariantNumeric: "tabular-nums", width: "28px", textAlign: "right" }}>
                {t.weight.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════

function Badge({ P, label, active }: { P: PagePalette; label: string; active: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", fontSize: "8px", fontWeight: 600, color: active ? P.green : P.textDim, background: active ? `${P.green}12` : P.cardBgSubtle, border: `1px solid ${active ? `${P.green}25` : P.borderSubtle}`, padding: "2px 6px", borderRadius: "4px" }}>
      {label}
    </span>
  );
}

function MiniMetric({ P, label, value, highlight, icon }: { P: PagePalette; label: string; value: string; highlight: boolean; icon?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "6px 3px", background: P.bg }}>
      <div style={{ display: "flex", alignItems: "center", gap: "2px", fontSize: "7px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: highlight ? P.green : P.textDim }}>
        {icon} {label}
      </div>
      <span style={{ fontSize: "13px", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: highlight ? P.green : P.text, marginTop: "1px" }}>
        {value}
      </span>
    </div>
  );
}

function CoherenceStreamToken({ token, P }: { token: GenerationToken; P: PagePalette }) {
  const hue = token.zone === "convergent" ? 142 : token.zone === "exploring" ? 38 : 0;
  const lightness = 45 + token.hScore * 25;
  const opacity = 0.5 + token.hScore * 0.5;
  const saturation = 30 + token.probability * 40;

  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity }}
      transition={{ duration: 0.03 }}
      title={`H=${token.hScore.toFixed(3)} · zone=${token.zone} · ∂H/∂t=${token.dHdt.toFixed(4)} · v=${token.activeVertices} · fano=${token.fanoChannelsActive} · syn=${token.syndromeCount} · p=${token.probability.toFixed(3)} · φ-align=${token.phaseAlignment.toFixed(2)} · parity=${token.parityClean ? "✓" : "✗"} · stab-rej=${token.rejectedByStabilizer} · ${token.samplingStrategy} · ${token.timeMs.toFixed(1)}ms`}
      style={{
        color: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
        display: "inline",
        textShadow: token.hScore > 0.6 ? `0 0 6px hsla(${hue}, 50%, 50%, 0.15)` : "none",
      }}>
      {token.text}
    </motion.span>
  );
}

function StatRow({ P, label, value, highlight }: { P: PagePalette; label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 0", fontSize: "10px" }}>
      <span style={{ color: P.textDim }}>{label}</span>
      <span style={{ fontWeight: highlight ? 700 : 500, fontVariantNumeric: "tabular-nums", color: highlight ? P.green : P.text }}>{value}</span>
    </div>
  );
}

function SectionLabel({ P, children }: { P: PagePalette; children: React.ReactNode }) {
  return <p style={{ fontSize: "7px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: P.textDim, marginBottom: "6px", marginTop: "0" }}>{children}</p>;
}

function Divider({ P }: { P: PagePalette }) {
  return <div style={{ height: "1px", background: P.borderSubtle, margin: "10px 0" }} />;
}
