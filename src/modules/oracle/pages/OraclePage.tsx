import { useState, useRef, useEffect, useCallback } from "react";
import Layout from "@/modules/core/components/Layout";
import ReactMarkdown from "react-markdown";
import { streamOracle, type Msg } from "@/modules/oracle/lib/stream-oracle";
import {
  buildScaffold,
  processResponse,
  overallGrade,
  type SymbolicScaffold,
  type AnnotatedClaim,
  type EpistemicGrade,
  type NeuroSymbolicConfig,
} from "@/modules/ring-core/neuro-symbolic";
import { loadWasm } from "@/lib/wasm/uor-bridge";
import { ArrowUp, Loader2, ChevronDown, ChevronRight, Shield, RefreshCw, Eye } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

/* ── Constants ── */

const PRESETS = [
  { label: "How does memory work?", prompt: "How does memory work in the brain?" },
  { label: "Explain quantum computing", prompt: "Explain quantum computing simply." },
  { label: "What causes inflation?", prompt: "What causes inflation?" },
  { label: "How do vaccines work?", prompt: "How do vaccines work?" },
  { label: "Is cold fusion possible?", prompt: "Is cold fusion possible?" },
];

const GRADE_COLORS = {
  A: { bg: "bg-emerald-500/12", text: "text-emerald-400", border: "border-emerald-500/20", fill: "bg-emerald-400" },
  B: { bg: "bg-blue-500/12", text: "text-blue-400", border: "border-blue-500/20", fill: "bg-blue-400" },
  C: { bg: "bg-amber-500/12", text: "text-amber-400", border: "border-amber-500/20", fill: "bg-amber-400" },
  D: { bg: "bg-red-500/12", text: "text-red-400", border: "border-red-500/20", fill: "bg-red-400" },
} as const;

const GRADE_LABELS = { A: "Proven", B: "Verified", C: "Plausible", D: "Unverified" } as const;

/* ── Types ── */

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

/* ── Page ── */

const OraclePage = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [trustMap, setTrustMap] = useState<Record<number, TrustData>>({});
  const [verifying, setVerifying] = useState(false);
  const [refiningIteration, setRefiningIteration] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [wasmReady, setWasmReady] = useState(false);

  // Controls
  const [precision, setPrecision] = useState(60);
  const [autoRefine, setAutoRefine] = useState(true);
  const [scrutinyIdx, setScrutinyIdx] = useState(1);

  // Expandable sections per message
  const [expandedProofs, setExpandedProofs] = useState<Set<number>>(new Set());
  const [expandedClaims, setExpandedClaims] = useState<Set<number>>(new Set());

  const temperature = 0.7 - (precision / 100) * 0.5;

  useEffect(() => { loadWasm().then(() => setWasmReady(true)); }, []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, trustMap]);

  const toggle = (set: Set<number>, idx: number) => {
    const s = new Set(set);
    s.has(idx) ? s.delete(idx) : s.add(idx);
    return s;
  };

  const latestTrustIdx = Object.keys(trustMap).map(Number).sort((a, b) => b - a)[0];
  const latestTrust = latestTrustIdx !== undefined ? trustMap[latestTrustIdx] : null;

  /* ── Send ── */

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
      toast.error("Connection error.");
    }
  }, [messages, isStreaming, temperature]);

  /* ── Verification loop ── */

  const runVerificationLoop = useCallback(async (
    scaffold: SymbolicScaffold, response: string, msgIndex: number,
    iteration: number, currentMessages: Msg[],
  ) => {
    setVerifying(true);
    setRefiningIteration(iteration > 0 ? iteration : null);

    const config: NeuroSymbolicConfig = {
      maxIterations: autoRefine ? 3 : 1, quantum: 0, certifyOnConvergence: true,
    };

    try {
      const { report, refinementPrompt, result } = processResponse(scaffold, response, iteration, config);
      const grade = result ? result.overallGrade : overallGrade(report.annotations);
      const proofData = result?.proof ?? report.proof;

      setTrustMap(prev => ({
        ...prev,
        [msgIndex]: {
          grade, claims: report.annotations, curvature: report.overallCurvature,
          converged: report.converged, iterations: iteration + 1,
          proof: {
            proofId: proofData.proofId, state: proofData.state,
            stepsCount: proofData.steps.length, premisesCount: proofData.premises.length,
            constraintsCount: scaffold.constraints.length, quantum: proofData.quantum,
            certified: proofData.certificate !== null,
          },
        },
      }));

      if (autoRefine && refinementPrompt && (grade === "C" || grade === "D") && iteration < 2) {
        setRefiningIteration(iteration + 1);
        setIsStreaming(true);
        const refinementMsg: Msg = { role: "user", content: refinementPrompt };
        const updatedMessages = [...currentMessages, { role: "assistant" as const, content: response }, refinementMsg];
        let refinedSoFar = "";

        await streamOracle({
          messages: updatedMessages, scaffoldFragment: scaffold.promptFragment,
          temperature: Math.max(0.15, temperature - 0.1),
          onDelta: (chunk) => {
            refinedSoFar += chunk;
            setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, content: refinedSoFar } : m));
          },
          onDone: () => {
            setIsStreaming(false);
            runVerificationLoop(scaffold, refinedSoFar, msgIndex, iteration + 1, updatedMessages);
          },
          onError: (err) => { setIsStreaming(false); setRefiningIteration(null); toast.error(err); },
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

  /* ── Render ── */

  return (
    <Layout>
      <div className="min-h-screen bg-background pt-20">
        <div className="w-full max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-10">

          {/* ── Header ── */}
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h1 className="font-display font-bold text-foreground text-2xl md:text-3xl tracking-tight">
                Oracle
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Every claim verified. Every answer graded.
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${wasmReady ? "bg-emerald-400" : "bg-amber-400"} animate-pulse`} />
              <span className="text-xs font-mono text-muted-foreground/60">
                {wasmReady ? "Engine ready" : "Loading..."}
              </span>
            </div>
          </div>

          <div className="flex gap-5">
            {/* ══════════════════ MAIN CHAT AREA ══════════════════ */}
            <div className="flex-1 min-w-0 flex flex-col rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm overflow-hidden" style={{ height: "calc(100vh - 160px)" }}>
              <div ref={scrollRef} className="flex-1 overflow-y-auto">
                {/* Empty state */}
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center px-6">
                    <p className="text-foreground font-display font-semibold text-xl mb-2">Ask anything</p>
                    <p className="text-muted-foreground/70 text-sm mb-10 max-w-sm leading-relaxed">
                      Answers are structurally verified through algebraic constraints. Each claim is individually graded.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {PRESETS.map((p) => (
                        <button
                          key={p.label}
                          onClick={() => send(p.prompt)}
                          className="px-4 py-2.5 rounded-full border border-border/40 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Messages */}
                <div className="px-5 md:px-8 py-6 space-y-6">
                  {messages.map((msg, i) => (
                    <div key={i}>
                      {msg.role === "user" ? (
                        <div className="flex justify-end">
                          <div className="max-w-[75%] rounded-2xl rounded-br-md bg-primary/10 border border-primary/10 px-5 py-3">
                            <p className="text-sm text-foreground leading-relaxed">{msg.content}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="max-w-none">
                          <div className="oracle-prose">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>

                          {/* ── Trust bar + controls ── */}
                          {trustMap[i] && (
                            <motion.div
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.4 }}
                              className="mt-5 pt-4 border-t border-border/15"
                            >
                              {/* Grade bar */}
                              <div className="flex items-center gap-3 mb-3">
                                <div className="flex gap-[1px] flex-1 h-2 rounded-full overflow-hidden">
                                  {trustMap[i].claims.map((claim, ci) => (
                                    <motion.div
                                      key={ci}
                                      initial={{ scaleX: 0 }}
                                      animate={{ scaleX: 1 }}
                                      transition={{ delay: ci * 0.02, duration: 0.25 }}
                                      className={`h-full ${GRADE_COLORS[claim.grade].fill} origin-left cursor-pointer hover:opacity-100 transition-opacity`}
                                      style={{ width: `${100 / trustMap[i].claims.length}%`, opacity: 0.6 }}
                                      onClick={() => setExpandedClaims(prev => toggle(prev, i))}
                                    />
                                  ))}
                                </div>
                                <motion.span
                                  key={trustMap[i].grade}
                                  initial={{ scale: 0.7 }}
                                  animate={{ scale: 1 }}
                                  className={`text-sm font-mono font-bold ${GRADE_COLORS[trustMap[i].grade].text}`}
                                >
                                  {trustMap[i].grade}
                                </motion.span>
                              </div>

                              {/* Inline actions */}
                              <div className="flex items-center gap-5 text-xs text-muted-foreground/60">
                                <button
                                  onClick={() => setExpandedClaims(prev => toggle(prev, i))}
                                  className="flex items-center gap-1.5 hover:text-foreground/80 transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  {trustMap[i].claims.filter(c => c.grade <= "B").length}/{trustMap[i].claims.length} claims verified
                                </button>
                                {trustMap[i].iterations > 1 && (
                                  <span className="text-primary/70">Refined {trustMap[i].iterations}×</span>
                                )}
                                <button
                                  onClick={() => setExpandedProofs(prev => toggle(prev, i))}
                                  className="flex items-center gap-1.5 hover:text-foreground/80 transition-colors ml-auto"
                                >
                                  <Shield className="w-3.5 h-3.5" />
                                  Proof trail
                                  {expandedProofs.has(i) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                </button>
                              </div>

                              {/* ── Claim X-Ray ── */}
                              <AnimatePresence>
                                {expandedClaims.has(i) && (
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                    <div className="mt-3 rounded-xl border border-border/20 bg-background/30 p-4 space-y-2 max-h-80 overflow-y-auto">
                                      {trustMap[i].claims.map((claim, ci) => (
                                        <div key={ci} className={`flex items-start gap-3 rounded-lg p-3 ${GRADE_COLORS[claim.grade].bg} border ${GRADE_COLORS[claim.grade].border}`}>
                                          <span className={`text-xs font-bold font-mono ${GRADE_COLORS[claim.grade].text} shrink-0 mt-0.5`}>{claim.grade}</span>
                                          <div className="min-w-0">
                                            <p className="text-sm text-foreground/85 leading-relaxed">{claim.text}</p>
                                            <p className="text-xs text-muted-foreground/50 mt-1">{claim.source}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              {/* ── Proof Trail ── */}
                              <AnimatePresence>
                                {expandedProofs.has(i) && trustMap[i].proof && (
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                    <div className="mt-3 rounded-xl border border-border/20 bg-background/30 p-4">
                                      <div className="space-y-3">
                                        {[
                                          { label: "Query", detail: `${trustMap[i].proof!.premisesCount} key terms extracted` },
                                          { label: "Scaffold", detail: `${trustMap[i].proof!.constraintsCount} verification constraints built` },
                                          { label: "Response", detail: `${trustMap[i].claims.length} individual claims identified` },
                                          { label: "Verify", detail: `${trustMap[i].proof!.stepsCount} checks, ${(trustMap[i].curvature * 100).toFixed(1)}% alignment` },
                                          { label: "Result", detail: `${GRADE_LABELS[trustMap[i].grade]}${trustMap[i].proof!.certified ? ", certified" : ""}` },
                                        ].map((step, si) => (
                                          <div key={si} className="flex items-center gap-3">
                                            <div className={`w-1.5 h-1.5 rounded-full ${si === 4 ? GRADE_COLORS[trustMap[i].grade].fill : "bg-primary/40"}`} />
                                            <span className="text-sm font-medium text-foreground/70 w-20 shrink-0">{step.label}</span>
                                            <span className="text-sm text-muted-foreground/60">{step.detail}</span>
                                          </div>
                                        ))}
                                      </div>
                                      <div className="mt-3 pt-2 border-t border-border/10 text-xs font-mono text-muted-foreground/30">
                                        {trustMap[i].proof!.proofId.slice(0, 28)}
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Streaming indicator */}
                  {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
                    <div className="flex justify-start py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary/50" />
                    </div>
                  )}

                  {/* Verification status */}
                  <AnimatePresence>
                    {(verifying || refiningIteration !== null) && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-xs text-muted-foreground/60 py-1">
                        {refiningIteration !== null ? (
                          <><RefreshCw className="w-3.5 h-3.5 animate-spin text-primary/60" /><span>Improving answer <span className="text-primary/70 font-mono">{refiningIteration + 1}/3</span></span></>
                        ) : (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Verifying claims...</span></>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* ── Input ── */}
              <div className="border-t border-border/15 p-4">
                <div className="flex gap-2 items-end max-w-3xl mx-auto">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                    placeholder="Ask anything..."
                    rows={1}
                    className="flex-1 bg-transparent border border-border/30 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/30 resize-none focus:outline-none focus:border-primary/30 transition-colors"
                  />
                  <button
                    onClick={() => send(input)}
                    disabled={isStreaming || !input.trim()}
                    className="p-3 rounded-xl bg-primary text-primary-foreground disabled:opacity-20 hover:bg-primary/90 transition-colors"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* ══════════════════ SIDEBAR ══════════════════ */}
            <div className="hidden lg:flex flex-col gap-3 w-[280px] shrink-0">

              {/* Controls */}
              <div className="rounded-2xl border border-border/20 bg-card/40 backdrop-blur-sm p-5 space-y-5">
                {/* Precision */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground/80">Answer precision</span>
                    <span className="text-xs font-mono text-muted-foreground/60">
                      {precision < 30 ? "Creative" : precision < 70 ? "Balanced" : "Exact"}
                    </span>
                  </div>
                  <input
                    type="range" min={0} max={100} value={precision}
                    onChange={(e) => setPrecision(Number(e.target.value))}
                    className="w-full h-1.5 bg-muted/40 rounded-full appearance-none cursor-pointer accent-primary"
                  />
                  <p className="text-xs text-muted-foreground/40 mt-1.5">Controls how focused the response will be</p>
                </div>

                {/* Auto-Refine */}
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-primary/60" />
                      <span className="text-sm font-medium text-foreground/80">Self-improve</span>
                    </div>
                    <button
                      onClick={() => setAutoRefine(!autoRefine)}
                      className={`w-9 h-5 rounded-full transition-colors relative ${autoRefine ? "bg-primary/80" : "bg-muted/50"}`}
                    >
                      <span className={`absolute top-[3px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform ${autoRefine ? "left-[18px]" : "left-[3px]"}`} />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground/40 mt-1.5">Automatically re-checks and improves weak answers</p>
                </div>

                {/* Scrutiny */}
                <div>
                  <span className="text-sm font-medium text-foreground/80 mb-2 block">Verification strictness</span>
                  <div className="flex gap-1.5">
                    {[
                      { label: "Relaxed", desc: "Broader tolerance" },
                      { label: "Standard", desc: "Default checks" },
                      { label: "Strict", desc: "Maximum rigor" },
                    ].map(({ label }, li) => (
                      <button
                        key={label}
                        onClick={() => setScrutinyIdx(li)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          scrutinyIdx === li
                            ? "bg-primary/12 text-primary border border-primary/20"
                            : "text-muted-foreground/50 hover:text-muted-foreground/70"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground/40 mt-1.5">How strictly each claim is evaluated</p>
                </div>
              </div>

              {/* Trust surface */}
              {latestTrust && (
                <motion.div
                  key={latestTrust.grade + latestTrust.curvature}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-border/20 bg-card/40 backdrop-blur-sm p-5"
                >
                  <p className="text-xs font-medium text-muted-foreground/50 uppercase tracking-wider mb-3">Latest result</p>
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`w-11 h-11 rounded-lg flex items-center justify-center text-lg font-bold ${GRADE_COLORS[latestTrust.grade].bg} ${GRADE_COLORS[latestTrust.grade].text} border ${GRADE_COLORS[latestTrust.grade].border}`}>
                      {latestTrust.grade}
                    </span>
                    <div>
                      <p className="text-foreground text-sm font-semibold">{GRADE_LABELS[latestTrust.grade]}</p>
                      <p className="text-muted-foreground/50 text-xs">
                        {latestTrust.claims.filter(c => c.grade <= "B").length} of {latestTrust.claims.length} claims grounded
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    {[
                      ["Alignment", `${(latestTrust.curvature * 100).toFixed(1)}%`],
                      ["Converged", latestTrust.converged ? "Yes" : "No"],
                      ["Iterations", `${latestTrust.iterations}`],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-muted-foreground/50">{k}</span>
                        <span className="font-mono text-foreground/70">{v}</span>
                      </div>
                    ))}
                  </div>
                  {/* Mini distribution */}
                  <div className="flex gap-[2px] mt-4 h-1.5 rounded-full overflow-hidden">
                    {(["A", "B", "C", "D"] as const).map(g => {
                      const count = latestTrust.claims.filter(c => c.grade === g).length;
                      if (!count) return null;
                      return <div key={g} className={`h-full ${GRADE_COLORS[g].fill} opacity-50`} style={{ width: `${(count / latestTrust.claims.length) * 100}%` }} />;
                    })}
                  </div>
                </motion.div>
              )}

              {/* How it works */}
              <div className="rounded-2xl border border-border/20 bg-card/40 backdrop-blur-sm p-5 space-y-4">
                <p className="text-xs font-medium text-muted-foreground/50 uppercase tracking-wider">How it works</p>
                {[
                  { icon: Eye, label: "Individual claim grading", sub: "Every sentence is verified on its own" },
                  { icon: RefreshCw, label: "Answers that self-improve", sub: "Weak responses are automatically refined" },
                  { icon: Shield, label: "Full proof trail", sub: "A verifiable audit for every answer" },
                ].map(({ icon: Icon, label, sub }) => (
                  <div key={label} className="flex items-start gap-3">
                    <Icon className="w-4 h-4 text-primary/50 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-foreground/75 font-medium leading-snug">{label}</p>
                      <p className="text-xs text-muted-foreground/45 leading-snug mt-0.5">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default OraclePage;
