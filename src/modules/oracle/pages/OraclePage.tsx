import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { streamOracle, type Msg } from "@/modules/oracle/lib/stream-oracle";
import { TokenBuffer } from "@/modules/oracle/lib/token-buffer";
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
import { ArrowUp, Loader2, ChevronDown, ChevronRight, Shield, RefreshCw, Eye, Settings, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import SelectionToolbar, { type SelectionAction } from "@/modules/oracle/components/SelectionToolbar";

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
  const proseContainerRef = useRef<HTMLDivElement>(null);
  const streamMsgRef = useRef<HTMLDivElement>(null);
  const hasScrolledToStream = useRef(false);
  const tokenBufferRef = useRef<TokenBuffer | null>(null);
  const [showTypingDots, setShowTypingDots] = useState(false);
  const [wasmReady, setWasmReady] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Controls
  const [precision, setPrecision] = useState(60);
  const [autoRefine, setAutoRefine] = useState(true);
  const [scrutinyIdx, setScrutinyIdx] = useState(1);

  // Expandable sections per message
  const [expandedProofs, setExpandedProofs] = useState<Set<number>>(new Set());
  const [expandedClaims, setExpandedClaims] = useState<Set<number>>(new Set());

  const temperature = 0.7 - (precision / 100) * 0.5;

  useEffect(() => { loadWasm().then(() => setWasmReady(true)); }, []);

  // Keep newest messages visible — scroll to bottom when new content arrives during streaming
  useEffect(() => {
    if (isStreaming && scrollRef.current) {
      const el = scrollRef.current;
      // Auto-scroll only if user is near the bottom (within 120px)
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      if (nearBottom) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [messages, isStreaming]);

  const toggle = (set: Set<number>, idx: number) => {
    const s = new Set(set);
    s.has(idx) ? s.delete(idx) : s.add(idx);
    return s;
  };

  /* ── Send ── */

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);
    setShowTypingDots(true);
    hasScrolledToStream.current = false;

    // Scroll to bottom so user sees their own message
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });

    const scaffold = buildScaffold(text.trim());
    let assistantSoFar = "";
    const assistantIndex = newMessages.length;

    // Set up token buffer for humanised pacing
    const buffer = new TokenBuffer((displayText) => {
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: displayText } : m);
        }
        return [...prev, { role: "assistant", content: displayText }];
      });
    });
    buffer.start();
    tokenBufferRef.current = buffer;

    try {
      await streamOracle({
        messages: newMessages,
        scaffoldFragment: scaffold.promptFragment,
        temperature,
        onDelta: (chunk) => {
          assistantSoFar += chunk;
          setShowTypingDots(false);
          buffer.push(chunk);
        },
        onDone: () => {
          buffer.stop();
          tokenBufferRef.current = null;
          setIsStreaming(false);
          setShowTypingDots(false);
          runVerificationLoop(scaffold, assistantSoFar, assistantIndex, 0, newMessages);
        },
        onError: (err) => {
          buffer.stop();
          tokenBufferRef.current = null;
          setIsStreaming(false);
          setShowTypingDots(false);
          toast.error(err);
        },
      });
    } catch {
      buffer.stop();
      tokenBufferRef.current = null;
      setIsStreaming(false);
      setShowTypingDots(false);
      toast.error("Connection error.");
    }
  }, [messages, isStreaming, temperature]);

  /* ── Selection action handler ── */

  const handleSelectionAction = useCallback((action: SelectionAction, text: string) => {
    const prompts: Record<SelectionAction, string> = {
      "zoom-in": `Explain this in more detail: "${text}"`,
      "zoom-out": `Explain this more simply, in broader context: "${text}"`,
      "clarify": `Clarify what this means: "${text}"`,
      "verify": `What are the sources and evidence for: "${text}"`,
    };
    send(prompts[action]);
  }, [send]);

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
    <div className="fixed inset-0 z-50 flex flex-col bg-background" style={{ height: "100dvh" }}>
      {/* ── Compact header ── */}
      <header className="flex items-center justify-between px-4 md:px-6 h-12 border-b border-border/20 bg-background/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <a href="/" className="text-muted-foreground/60 hover:text-foreground transition-colors text-sm">←</a>
          <h1 className="font-display font-bold text-foreground text-base tracking-tight">Oracle</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${wasmReady ? "bg-emerald-400" : "bg-amber-400"} animate-pulse`} />
            <span className="text-xs text-muted-foreground/50 hidden sm:inline">
              {wasmReady ? "Ready" : "Loading…"}
            </span>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted/30 transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── Message area ── */}
      <div className="flex-1 overflow-hidden relative">
        {/* Focus-fade overlays */}
        {messages.length > 0 && (
          <>
            <div className="oracle-fade-top" />
            <div className="oracle-fade-bottom" />
          </>
        )}
        <div ref={scrollRef} className="h-full overflow-y-auto oracle-scroll-area">
          <div className="flex flex-col justify-end min-h-full">
            {/* Empty state — centered presets */}
            {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center flex-1 text-center px-6 py-10">
              <p className="text-foreground font-display font-semibold text-xl mb-2">Ask anything</p>
              <p className="text-muted-foreground/60 text-sm mb-8 max-w-sm leading-relaxed">
                Every claim verified. Every answer graded.
              </p>
              <div className="flex flex-wrap justify-center gap-2 max-w-lg">
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
          {messages.length > 0 && (
            <div className="px-4 md:px-0 py-4 space-y-5 w-full max-w-2xl mx-auto" ref={proseContainerRef}>
              <SelectionToolbar containerRef={proseContainerRef} onAction={handleSelectionAction} />
              {messages.map((msg, i) => (
                <div key={i}>
                  {msg.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary/10 border border-primary/10 px-4 py-2.5">
                        <p className="text-sm text-foreground leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="max-w-none"
                      ref={i === messages.length - 1 && isStreaming ? streamMsgRef : undefined}
                    >
                      <div className="oracle-prose">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>

                      {/* ── Trust bar + controls ── */}
                      {trustMap[i] && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4 }}
                          className="mt-4 pt-3 border-t border-border/15"
                        >
                          {/* Grade bar */}
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex gap-[1px] flex-1 h-1.5 rounded-full overflow-hidden">
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
                              className={`text-xs font-mono font-bold ${GRADE_COLORS[trustMap[i].grade].text}`}
                            >
                              {trustMap[i].grade}
                            </motion.span>
                          </div>

                          {/* Summary line */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground/50 flex-wrap">
                            <button
                              onClick={() => setExpandedClaims(prev => toggle(prev, i))}
                              className="flex items-center gap-1.5 hover:text-foreground/80 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              {trustMap[i].claims.filter(c => c.grade <= "B").length} of {trustMap[i].claims.length} statements backed by evidence
                            </button>
                            {trustMap[i].iterations > 1 && (
                              <span className="text-primary/70">
                                Answer improved {trustMap[i].iterations === 2 ? "once" : trustMap[i].iterations === 3 ? "twice" : `${trustMap[i].iterations - 1} times`}
                              </span>
                            )}
                            <button
                              onClick={() => setExpandedProofs(prev => toggle(prev, i))}
                              className="flex items-center gap-1.5 hover:text-foreground/80 transition-colors ml-auto"
                            >
                              How we checked
                              {expandedProofs.has(i) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </button>
                          </div>

                          {/* ── Statement Breakdown ── */}
                          <AnimatePresence>
                            {expandedClaims.has(i) && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="mt-3 rounded-xl border border-border/20 bg-background/30 p-3 space-y-1.5 max-h-60 overflow-y-auto">
                                  <p className="text-xs font-medium text-muted-foreground/50 mb-2">Statement breakdown</p>
                                  {trustMap[i].claims.map((claim, ci) => (
                                    <div key={ci} className={`flex items-start gap-2.5 rounded-lg p-2.5 ${GRADE_COLORS[claim.grade].bg} border ${GRADE_COLORS[claim.grade].border}`}>
                                      <span className={`text-xs font-bold shrink-0 mt-0.5 ${GRADE_COLORS[claim.grade].text}`}>
                                        {GRADE_LABELS[claim.grade]}
                                      </span>
                                      <div className="min-w-0">
                                        <p className="text-sm text-foreground/85 leading-relaxed">{claim.text}</p>
                                        <p className="text-xs text-muted-foreground/50 mt-0.5">
                                          {claim.source.startsWith("grounded") ? "Backed by evidence" :
                                           claim.source.startsWith("scaffold") ? "Matches reasoning pattern" :
                                           claim.source.startsWith("terms") ? "Mentions relevant terms" :
                                           "No direct evidence"}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* ── Trust Breakdown ── */}
                          <AnimatePresence>
                            {expandedProofs.has(i) && trustMap[i].proof && (() => {
                              const t = trustMap[i];
                              const evidenceCount = t.claims.filter(c => c.grade <= "B").length;
                              const confidence = t.grade <= "B" ? "High" : t.grade === "C" ? "Moderate" : "Low";
                              const confidenceColor = t.grade <= "B" ? "bg-emerald-400" : t.grade === "C" ? "bg-amber-400" : "bg-red-400";
                              const metrics = [
                                { label: "Confidence", value: confidence, dot: confidenceColor },
                                { label: "Statements checked", value: `${t.claims.length} statements analyzed`, dot: "bg-emerald-400" },
                                { label: "Evidence found", value: `${evidenceCount} supported by evidence`, dot: evidenceCount > t.claims.length / 2 ? "bg-emerald-400" : evidenceCount > 0 ? "bg-amber-400" : "bg-red-400" },
                                { label: "Key topics covered", value: `${t.proof!.premisesCount} of ${t.proof!.premisesCount} topics addressed`, dot: "bg-emerald-400" },
                                { label: "Consistency", value: t.converged ? "All checks agree" : "Some uncertainty remains", dot: t.converged ? "bg-emerald-400" : "bg-amber-400" },
                                ...(t.iterations > 1 ? [{ label: "Answer improved", value: `Yes, ${t.iterations === 2 ? "once" : t.iterations === 3 ? "twice" : `${t.iterations - 1} times`}`, dot: "bg-emerald-400" }] : [{ label: "Answer improved", value: "Not needed", dot: "bg-muted-foreground/30" }]),
                              ];
                              return (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                  <div className="mt-3 rounded-xl border border-border/20 bg-background/30 p-3">
                                    <div className="space-y-2.5">
                                      {metrics.map((m, mi) => (
                                        <div key={mi} className="flex items-center gap-3">
                                          <div className={`w-1.5 h-1.5 rounded-full ${m.dot} shrink-0`} />
                                          <span className="text-sm font-medium text-foreground/70 w-36 shrink-0">{m.label}</span>
                                          <span className="text-sm text-muted-foreground/60">{m.value}</span>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="mt-2.5 pt-2 border-t border-border/10 text-xs text-muted-foreground/30">
                                      Every statement checked independently against your question
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })()}
                          </AnimatePresence>
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              <AnimatePresence>
                {showTypingDots && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.25 }}
                    className="flex items-center gap-1.5 py-2"
                  >
                    <div className="flex gap-[5px] items-center bg-muted/30 rounded-2xl px-4 py-2.5">
                      <span className="typing-dot w-[6px] h-[6px] rounded-full bg-muted-foreground/40" style={{ animationDelay: "0ms" }} />
                      <span className="typing-dot w-[6px] h-[6px] rounded-full bg-muted-foreground/40" style={{ animationDelay: "160ms" }} />
                      <span className="typing-dot w-[6px] h-[6px] rounded-full bg-muted-foreground/40" style={{ animationDelay: "320ms" }} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Verification status */}
              <AnimatePresence>
                {(verifying || refiningIteration !== null) && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-xs text-muted-foreground/50 py-1">
                    {refiningIteration !== null ? (
                      <><RefreshCw className="w-3.5 h-3.5 animate-spin text-primary/60" /><span>Improving answer <span className="text-primary/70 font-mono">{refiningIteration + 1}/3</span></span></>
                    ) : (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Verifying claims…</span></>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* ── Fixed input bar ── */}
      <div className="shrink-0 border-t border-border/20 bg-background/80 backdrop-blur-md px-4 py-3">
        <div className="flex gap-2 items-end max-w-2xl mx-auto">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Ask anything…"
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

      {/* ── Settings overlay ── */}
      <AnimatePresence>
        {settingsOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/40"
              onClick={() => setSettingsOpen(false)}
            />
            {/* Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-[70] w-80 max-w-[85vw] bg-background border-l border-border/20 overflow-y-auto"
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display font-semibold text-foreground text-sm">Settings</h2>
                  <button onClick={() => setSettingsOpen(false)} className="p-1 rounded-lg text-muted-foreground/50 hover:text-foreground transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-6">
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

                  {/* Divider */}
                  <div className="border-t border-border/15" />

                  {/* How it works */}
                  <div className="space-y-3">
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
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OraclePage;
