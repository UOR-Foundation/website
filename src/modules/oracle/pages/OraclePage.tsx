import { useState, useRef, useEffect, useCallback } from "react";
import Layout from "@/modules/core/components/Layout";
import ReactMarkdown from "react-markdown";
import { streamOracle, type Msg } from "@/modules/oracle/lib/stream-oracle";
import {
  buildScaffold,
  processResponse,
  overallGrade,
  buildRefinementPrompt,
  type SymbolicScaffold,
  type CurvatureReport,
  type AnnotatedClaim,
  type EpistemicGrade,
  type NeuroSymbolicConfig,
} from "@/modules/ring-core/neuro-symbolic";
import { loadWasm } from "@/lib/wasm/uor-bridge";
import TrustScoreBar from "@/components/reasoning/TrustScoreBar";
import { ArrowRight, Loader2, Sparkles, ChevronDown, ChevronRight, Shield, RefreshCw, Eye } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const PRESETS = [
  { label: "Memory", prompt: "How does memory work in the brain?" },
  { label: "Quantum Computing", prompt: "Explain quantum computing simply." },
  { label: "Inflation", prompt: "What causes inflation?" },
  { label: "Vaccines", prompt: "How do vaccines work?" },
  { label: "Cold Fusion", prompt: "Is cold fusion possible?" },
  { label: "What is UOR?", prompt: "What is the UOR Framework and how does it work?" },
];

/** Per-message trust metadata */
interface TrustData {
  grade: EpistemicGrade;
  claims: AnnotatedClaim[];
  curvature: number;
  converged: boolean;
  iterations: number;
  proof?: {
    proofId: string;
    state: string;
    stepsCount: number;
    premisesCount: number;
    constraintsCount: number;
    quantum: number;
    certified: boolean;
  };
}

const GRADE_COLORS = {
  A: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30", fill: "bg-emerald-500" },
  B: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30", fill: "bg-blue-500" },
  C: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30", fill: "bg-amber-500" },
  D: { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30", fill: "bg-red-500" },
} as const;

const GRADE_LABELS = { A: "Proven", B: "Verified", C: "Plausible", D: "Unverified" };

const SCRUTINY_LEVELS = [
  { label: "Lenient", epsilon: 0.1, desc: "Accepts most claims" },
  { label: "Standard", epsilon: 0.01, desc: "Balanced checking" },
  { label: "Strict", epsilon: 0.001, desc: "Highest rigor" },
] as const;

const OraclePage = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [trustMap, setTrustMap] = useState<Record<number, TrustData>>({});
  const [verifying, setVerifying] = useState(false);
  const [refiningIteration, setRefiningIteration] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [wasmReady, setWasmReady] = useState(false);

  // ── Controls ──
  const [precision, setPrecision] = useState(60); // 0-100 → maps to temp 0.7-0.2
  const [autoRefine, setAutoRefine] = useState(true);
  const [scrutinyIdx, setScrutinyIdx] = useState(1); // 0=Lenient, 1=Standard, 2=Strict

  // ── Proof trail toggle per message ──
  const [expandedProofs, setExpandedProofs] = useState<Set<number>>(new Set());
  const [expandedClaims, setExpandedClaims] = useState<Set<number>>(new Set());

  const temperature = 0.7 - (precision / 100) * 0.5; // 0.7 → 0.2
  const scrutiny = SCRUTINY_LEVELS[scrutinyIdx];

  useEffect(() => { loadWasm().then(() => setWasmReady(true)); }, []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, trustMap]);

  const toggleProof = (idx: number) =>
    setExpandedProofs(prev => { const s = new Set(prev); s.has(idx) ? s.delete(idx) : s.add(idx); return s; });
  const toggleClaims = (idx: number) =>
    setExpandedClaims(prev => { const s = new Set(prev); s.has(idx) ? s.delete(idx) : s.add(idx); return s; });

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    const scaffold = buildScaffold(text.trim());
    let assistantSoFar = "";
    const assistantIndex = newMessages.length;

    try {
      await streamOracle({
        messages: newMessages,
        scaffoldFragment: scaffold.promptFragment,
        temperature,
        onDelta: (chunk) => {
          assistantSoFar += chunk;
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
            }
            return [...prev, { role: "assistant", content: assistantSoFar }];
          });
        },
        onDone: () => {
          setIsStreaming(false);
          runVerificationLoop(scaffold, assistantSoFar, assistantIndex, 0, newMessages);
        },
        onError: (err) => { setIsStreaming(false); toast.error(err); },
      });
    } catch {
      setIsStreaming(false);
      toast.error("Connection error. Please try again.");
    }
  }, [messages, isStreaming, temperature]);

  const runVerificationLoop = useCallback(async (
    scaffold: SymbolicScaffold,
    response: string,
    msgIndex: number,
    iteration: number,
    currentMessages: Msg[],
  ) => {
    setVerifying(true);
    setRefiningIteration(iteration > 0 ? iteration : null);

    const config: NeuroSymbolicConfig = {
      maxIterations: autoRefine ? 3 : 1,
      quantum: 0,
      certifyOnConvergence: true,
    };

    try {
      const { report, refinementPrompt, result } = processResponse(scaffold, response, iteration, config);
      const grade = result ? result.overallGrade : overallGrade(report.annotations);

      const proofData = result?.proof ?? report.proof;
      setTrustMap(prev => ({
        ...prev,
        [msgIndex]: {
          grade,
          claims: report.annotations,
          curvature: report.overallCurvature,
          converged: report.converged,
          iterations: iteration + 1,
          proof: {
            proofId: proofData.proofId,
            state: proofData.state,
            stepsCount: proofData.steps.length,
            premisesCount: proofData.premises.length,
            constraintsCount: scaffold.constraints.length,
            quantum: proofData.quantum,
            certified: proofData.certificate !== null,
          },
        },
      }));

      // AUTO-REFINE: if grade is C or D and we have iterations left, re-prompt
      if (autoRefine && refinementPrompt && (grade === "C" || grade === "D") && iteration < 2) {
        setRefiningIteration(iteration + 1);
        setIsStreaming(true);

        const refinementMsg: Msg = { role: "user", content: refinementPrompt };
        const updatedMessages = [...currentMessages, { role: "assistant" as const, content: response }, refinementMsg];

        let refinedSoFar = "";
        await streamOracle({
          messages: updatedMessages,
          scaffoldFragment: scaffold.promptFragment,
          temperature: Math.max(0.15, temperature - 0.1), // tighter on refine
          onDelta: (chunk) => {
            refinedSoFar += chunk;
            setMessages(prev =>
              prev.map((m, i) => i === msgIndex ? { ...m, content: refinedSoFar } : m)
            );
          },
          onDone: () => {
            setIsStreaming(false);
            runVerificationLoop(scaffold, refinedSoFar, msgIndex, iteration + 1, updatedMessages);
          },
          onError: (err) => {
            setIsStreaming(false);
            setRefiningIteration(null);
            toast.error(err);
          },
        });
        return;
      }
    } catch (err) {
      console.error("Verification error:", err);
    } finally {
      setVerifying(false);
      setRefiningIteration(null);
    }
  }, [autoRefine, temperature]);

  const handleFollowUp = useCallback((prompt: string) => { send(prompt); }, [send]);

  const getUserQuery = (assistantIdx: number): string => {
    for (let i = assistantIdx - 1; i >= 0; i--) {
      if (messages[i]?.role === "user") return messages[i].content;
    }
    return "";
  };

  const latestTrustIdx = Object.keys(trustMap).map(Number).sort((a, b) => b - a)[0];
  const latestTrust = latestTrustIdx !== undefined ? trustMap[latestTrustIdx] : null;

  return (
    <Layout>
      <div className="min-h-screen bg-background pt-20">
        <div className="container px-4 md:px-[5%] py-8 md:py-12 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <p className="font-body font-semibold tracking-[0.2em] uppercase text-foreground/70 mb-3" style={{ fontSize: "var(--text-label)" }}>
              Structurally Verified AI
            </p>
            <h1 className="font-display font-bold text-foreground mb-3" style={{ fontSize: "var(--text-section-heading)" }}>
              Ask Anything
            </h1>
            <p className="text-muted-foreground font-body max-w-2xl" style={{ fontSize: "var(--text-body)" }}>
              Every answer is constrained by the UOR verification engine and graded for accuracy. Ask any question — the framework works behind the scenes.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chat Panel */}
            <div className="lg:col-span-2 flex flex-col rounded-xl border border-border/40 bg-card overflow-hidden" style={{ minHeight: "65vh" }}>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-5">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center py-16">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Sparkles className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-foreground font-display font-semibold text-lg mb-2">Ask any question</p>
                    <p className="text-muted-foreground text-sm max-w-md mb-8">
                      Every response is verified through the UOR symbolic engine. Claims are individually graded for accuracy and interpretability.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                      {PRESETS.map((p) => (
                        <button
                          key={p.label}
                          onClick={() => send(p.prompt)}
                          className="px-3 py-1.5 rounded-full border border-border/60 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i}>
                    <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-xl px-4 py-3 ${msg.role === "user" ? "bg-primary/15 text-foreground" : "bg-muted/30 text-foreground"}`}>
                        {msg.role === "assistant" ? (
                          <div className="prose prose-invert prose-sm max-w-none [&_pre]:bg-background/50 [&_pre]:border [&_pre]:border-border/30 [&_pre]:rounded-lg [&_code]:text-primary/90 [&_a]:text-primary [&_a]:no-underline hover:[&_a]:underline">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-sm">{msg.content}</p>
                        )}
                      </div>
                    </div>

                    {/* ── TRUST MAP: Visual claim grade bar ── */}
                    {msg.role === "assistant" && trustMap[i] && (
                      <div className="max-w-[85%] mt-1.5 space-y-1.5">
                        {/* Grade bar */}
                        <div className="flex items-center gap-2">
                          <div className="flex gap-[2px] flex-1 h-2 rounded-full overflow-hidden bg-muted/20">
                            {trustMap[i].claims.map((claim, ci) => {
                              const pct = 100 / trustMap[i].claims.length;
                              const colors = GRADE_COLORS[claim.grade];
                              return (
                                <motion.div
                                  key={ci}
                                  initial={{ scaleX: 0 }}
                                  animate={{ scaleX: 1 }}
                                  transition={{ delay: ci * 0.03, duration: 0.3 }}
                                  className={`h-full ${colors.fill} origin-left cursor-pointer hover:brightness-125 transition-all`}
                                  style={{ width: `${pct}%`, opacity: 0.75 }}
                                  title={`"${claim.text.slice(0, 50)}..." → Grade ${claim.grade}`}
                                  onClick={() => toggleClaims(i)}
                                />
                              );
                            })}
                          </div>
                          <span className={`text-[10px] font-mono font-bold ${GRADE_COLORS[trustMap[i].grade].text}`}>
                            {trustMap[i].grade}
                          </span>
                        </div>

                        {/* Compact info row */}
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono">
                          <button onClick={() => toggleClaims(i)} className="flex items-center gap-1 hover:text-foreground transition-colors">
                            <Eye className="w-3 h-3" />
                            {trustMap[i].claims.filter(c => c.grade <= "B").length}/{trustMap[i].claims.length} verified
                          </button>
                          <span>curvature {(trustMap[i].curvature * 100).toFixed(1)}%</span>
                          {trustMap[i].iterations > 1 && (
                            <span className="text-primary">{trustMap[i].iterations}× refined</span>
                          )}
                          <button onClick={() => toggleProof(i)} className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto">
                            <Shield className="w-3 h-3" />
                            Proof
                            {expandedProofs.has(i) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          </button>
                        </div>

                        {/* ── EXPANDABLE: Per-claim X-ray ── */}
                        <AnimatePresence>
                          {expandedClaims.has(i) && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="rounded-lg border border-border/30 bg-background/40 p-3 space-y-1.5 max-h-64 overflow-y-auto">
                                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Claim-by-Claim X-Ray</p>
                                {trustMap[i].claims.map((claim, ci) => {
                                  const colors = GRADE_COLORS[claim.grade];
                                  return (
                                    <div key={ci} className={`flex items-start gap-2 rounded-md p-2 ${colors.bg} border ${colors.border}`}>
                                      <span className={`text-[10px] font-bold font-mono ${colors.text} shrink-0 mt-0.5`}>{claim.grade}</span>
                                      <div className="min-w-0">
                                        <p className="text-[11px] text-foreground/90 leading-relaxed">{claim.text}</p>
                                        <p className="text-[9px] text-muted-foreground mt-0.5 font-mono">
                                          {claim.source} · curv {(claim.curvature * 100).toFixed(1)}%
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* ── EXPANDABLE: Proof Trail ── */}
                        <AnimatePresence>
                          {expandedProofs.has(i) && trustMap[i].proof && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="rounded-lg border border-border/30 bg-background/40 p-3">
                                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-3">Reasoning Receipt</p>
                                <div className="space-y-2">
                                  {/* Timeline steps */}
                                  {[
                                    { label: "Query", detail: `${trustMap[i].proof!.premisesCount} terms extracted`, icon: "→" },
                                    { label: "Scaffold", detail: `${trustMap[i].proof!.constraintsCount} constraints derived`, icon: "◆" },
                                    { label: "Response", detail: `${trustMap[i].claims.length} claims extracted`, icon: "◇" },
                                    { label: "Verification", detail: `${trustMap[i].proof!.stepsCount} D→I→A steps · curvature ${(trustMap[i].curvature * 100).toFixed(1)}%`, icon: "◈" },
                                    { label: "Grade", detail: `${GRADE_LABELS[trustMap[i].grade]} (${trustMap[i].grade})${trustMap[i].proof!.certified ? " · Certified ✓" : ""}`, icon: "●" },
                                  ].map((step, si) => (
                                    <div key={si} className="flex items-start gap-2">
                                      <div className="flex flex-col items-center">
                                        <span className="text-primary text-[10px] font-mono">{step.icon}</span>
                                        {si < 4 && <div className="w-px h-3 bg-border/40" />}
                                      </div>
                                      <div>
                                        <span className="text-[10px] font-medium text-foreground">{step.label}</span>
                                        <span className="text-[10px] text-muted-foreground ml-2">{step.detail}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-3 pt-2 border-t border-border/20 flex items-center gap-2 text-[9px] font-mono text-muted-foreground/60">
                                  <span>proof:{trustMap[i].proof!.proofId.slice(0, 24)}</span>
                                  <span>·</span>
                                  <span>q{trustMap[i].proof!.quantum}</span>
                                  <span>·</span>
                                  <span>{trustMap[i].proof!.state}</span>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* TrustScoreBar (existing component) */}
                        <TrustScoreBar
                          grade={trustMap[i].grade}
                          claims={trustMap[i].claims}
                          iterations={trustMap[i].iterations}
                          converged={trustMap[i].converged}
                          curvature={trustMap[i].curvature}
                          onSendFollowUp={handleFollowUp}
                          userQuery={getUserQuery(i)}
                          messageContent={msg.content}
                        />
                      </div>
                    )}
                  </div>
                ))}

                {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
                  <div className="flex justify-start">
                    <div className="bg-muted/30 rounded-xl px-4 py-3">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    </div>
                  </div>
                )}

                {/* Verification / Refinement status */}
                <AnimatePresence>
                  {(verifying || refiningIteration !== null) && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 text-xs text-muted-foreground px-2"
                    >
                      {refiningIteration !== null ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin text-primary" />
                          <span>Auto-refining... <span className="text-primary font-mono">iteration {refiningIteration + 1}/3</span></span>
                        </>
                      ) : (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Verifying claims through WASM engine...</span>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="border-t border-border/30 p-4">
                <div className="flex gap-3 items-end">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                    placeholder="Ask anything..."
                    rows={1}
                    className="flex-1 bg-background/50 border border-border/40 rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:border-primary/40 transition-colors"
                  />
                  <button onClick={() => send(input)} disabled={isStreaming || !input.trim()} className="p-3 rounded-lg bg-primary text-primary-foreground disabled:opacity-30 hover:bg-primary/90 transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* ── SIDEBAR: Controls + Trust Surface ── */}
            <div className="flex flex-col gap-4">

              {/* ── CONTROLS CARD ── */}
              <div className="rounded-xl border border-border/40 bg-card p-5">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-4">Engine Controls</p>
                <div className="space-y-5">

                  {/* 1. Precision slider */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-foreground">Precision</label>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {precision < 30 ? "Balanced" : precision < 70 ? "Focused" : "Maximum"}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={precision}
                      onChange={(e) => setPrecision(Number(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
                    />
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      How precise should the answer be?
                    </p>
                  </div>

                  {/* 2. Auto-Refine toggle */}
                  <div>
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                          <RefreshCw className="w-3 h-3 text-primary" />
                          Auto-Refine
                        </label>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                          Automatically improve low-trust answers
                        </p>
                      </div>
                      <button
                        onClick={() => setAutoRefine(!autoRefine)}
                        className={`w-9 h-5 rounded-full transition-colors relative ${autoRefine ? "bg-primary" : "bg-muted"}`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${autoRefine ? "left-[18px]" : "left-0.5"}`} />
                      </button>
                    </div>
                  </div>

                  {/* 3. Scrutiny selector */}
                  <div>
                    <label className="text-xs font-medium text-foreground mb-2 block">Scrutiny</label>
                    <div className="flex gap-1">
                      {SCRUTINY_LEVELS.map((level, li) => (
                        <button
                          key={level.label}
                          onClick={() => setScrutinyIdx(li)}
                          className={`flex-1 py-1.5 px-2 rounded-md text-[10px] font-mono transition-all ${
                            scrutinyIdx === li
                              ? "bg-primary/15 text-primary border border-primary/30"
                              : "bg-muted/30 text-muted-foreground border border-transparent hover:bg-muted/50"
                          }`}
                        >
                          {level.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {scrutiny.desc}
                    </p>
                  </div>
                </div>
              </div>

              {/* ── TRUST GRADE CARD ── */}
              <div className="rounded-xl border border-border/40 bg-card p-5">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-4">Trust Surface</p>
                {latestTrust ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <motion.span
                        key={latestTrust.grade}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold ${GRADE_COLORS[latestTrust.grade].bg} ${GRADE_COLORS[latestTrust.grade].text} border ${GRADE_COLORS[latestTrust.grade].border}`}
                      >
                        {latestTrust.grade}
                      </motion.span>
                      <div>
                        <p className="text-foreground font-semibold text-sm">{GRADE_LABELS[latestTrust.grade]}</p>
                        <p className="text-muted-foreground text-xs">
                          {latestTrust.claims.filter(c => c.grade <= "B").length}/{latestTrust.claims.length} claims grounded
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Curvature</span>
                        <span className="font-mono text-foreground">{(latestTrust.curvature * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Convergence</span>
                        <span className={`font-mono ${latestTrust.converged ? "text-emerald-400" : "text-amber-400"}`}>
                          {latestTrust.converged ? "✓ Yes" : "○ No"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Iterations</span>
                        <span className="font-mono text-foreground">{latestTrust.iterations}</span>
                      </div>
                      {latestTrust.proof?.certified && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Certificate</span>
                          <span className="font-mono text-emerald-400">✓ Certified</span>
                        </div>
                      )}
                    </div>

                    {/* Grade distribution */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Grade distribution</p>
                      <div className="flex gap-1">
                        {(["A", "B", "C", "D"] as const).map(g => {
                          const count = latestTrust.claims.filter(c => c.grade === g).length;
                          if (count === 0) return null;
                          const pct = (count / latestTrust.claims.length) * 100;
                          return (
                            <div
                              key={g}
                              className={`h-2 rounded-full ${GRADE_COLORS[g].fill}`}
                              style={{ width: `${pct}%`, minWidth: "6px", opacity: 0.7 }}
                              title={`${g}: ${count} (${pct.toFixed(0)}%)`}
                            />
                          );
                        })}
                      </div>
                      <div className="flex gap-3 mt-2 flex-wrap">
                        {(["A", "B", "C", "D"] as const).map(g => {
                          const count = latestTrust.claims.filter(c => c.grade === g).length;
                          if (count === 0) return null;
                          return <span key={g} className="text-[10px] text-muted-foreground font-mono">{g}:{count}</span>;
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground/60 font-mono">
                    Ask a question to see the trust analysis. Every claim is graded A–D using WASM-powered ring verification.
                  </p>
                )}
              </div>

              {/* How it works */}
              <div className="rounded-xl border border-border/40 bg-card p-5">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">What makes this different</p>
                <div className="space-y-3 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <Eye className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p><span className="text-foreground/80 font-medium">Epistemic X-Ray</span> — Every claim is individually graded, not just the whole response</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <RefreshCw className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p><span className="text-foreground/80 font-medium">Self-Correcting</span> — Low-grade answers are automatically refined against algebraic constraints</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p><span className="text-foreground/80 font-medium">Proof Trail</span> — Every answer produces a machine-verifiable audit trail</p>
                  </div>
                </div>
              </div>

              {/* Powered by */}
              <div className="rounded-xl border border-border/40 bg-card p-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${wasmReady ? "bg-emerald-500" : "bg-amber-500"}`} />
                  <span className="text-[10px] font-mono text-muted-foreground/60">
                    {wasmReady ? "WASM engine active" : "Loading WASM..."}
                  </span>
                </div>
                <a
                  href="https://crates.io/crates/uor-foundation"
                  target="_blank"
                  rel="noopener"
                  className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors mt-1.5 block font-mono"
                >
                  Powered by uor-foundation
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default OraclePage;
