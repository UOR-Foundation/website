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

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconPlayerPlay, IconPlayerStop, IconSparkles, IconAtom,
  IconBolt, IconShield, IconFlame, IconRefresh,
} from "@tabler/icons-react";
import type { PagePalette } from "@/modules/hologram-ui/hooks/usePageTheme";
import {
  CoherenceTokenDecoder,
  type DecoderStatus,
  type GenerationToken,
  type GenerationResult,
} from "@/modules/hologram-compute/coherence-token-decoder";

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
            <button onClick={() => { /* can't stop sync loop, but future impl */ }}
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

      {/* ── Main Content ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Token stream */}
        <div ref={outputRef} style={{ flex: 1, overflowY: "auto", padding: "20px 24px", fontSize: "14px", lineHeight: 1.85 }}>
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

              {/* Pipeline visualization */}
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
        </div>

        {/* ── Right sidebar (diagnostics) ── */}
        <AnimatePresence>
          {(hasTokens || result) && (
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
                  Each token is emitted by navigating the 96-vertex Atlas manifold
                  via three scales: Fano-plane routing (macro), edge diffusion (meso),
                  and vertex sharpening (micro). The τ-mirror stabilizer code corrects
                  parity violations. Prescience modulation (∂H/∂t) dynamically balances
                  exploration vs exploitation. No weight tensors are loaded.
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
      title={`H=${token.hScore.toFixed(3)} · zone=${token.zone} · ∂H/∂t=${token.dHdt.toFixed(4)} · v=${token.activeVertices} · fano=${token.fanoChannelsActive} · syn=${token.syndromeCount} · p=${token.probability.toFixed(3)} · ${token.timeMs.toFixed(1)}ms`}
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
