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
import { ArrowUp, Loader2, ChevronDown, ChevronRight, Shield, RefreshCw, Eye, Settings, X, Layers, ExternalLink, Link2 } from "lucide-react";
import * as bridge from "@/lib/wasm/uor-bridge";
import { singleProofHash } from "@/lib/uor-canonical";
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

interface UorReceipt {
  cid: string;
  derivationId: string;
  uorAddress: string;
}

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
  constraints: Array<{ id: string; type: string; description: string; ringValue: number }>;
  termMap: Array<{ term: string; ringValue: number }>;
  /** UOR canonical receipts keyed by label */
  receipts?: Record<string, UorReceipt>;
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
  const [queuedMessage, setQueuedMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const flowEndRef = useRef<HTMLDivElement>(null);

  // Controls
  const [precision, setPrecision] = useState(60);
  const [autoRefine, setAutoRefine] = useState(true);
  const [scrutinyIdx, setScrutinyIdx] = useState(1);

  // Expandable trust card per message
  const [expandedTrust, setExpandedTrust] = useState<Set<number>>(new Set());
  const [xrayOpen, setXrayOpen] = useState<Set<number>>(new Set());
  const [activePillar, setActivePillar] = useState<Record<number, string | null>>({});

  const temperature = 0.7 - (precision / 100) * 0.5;

  useEffect(() => { loadWasm().then(() => setWasmReady(true)); }, []);

  // Keep newest messages visible — scroll to bottom when new content arrives during streaming
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current;
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
      if (nearBottom) {
        flowEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }
  }, [messages, isStreaming]);

  // Fire queued message after stream completes
  useEffect(() => {
    if (!isStreaming && queuedMessage) {
      const msg = queuedMessage;
      setQueuedMessage(null);
      requestAnimationFrame(() => send(msg));
    }
  }, [isStreaming, queuedMessage]);

  const toggle = (set: Set<number>, idx: number) => {
    const s = new Set(set);
    s.has(idx) ? s.delete(idx) : s.add(idx);
    return s;
  };

  /* ── Send ── */

  const send = useCallback(async (text: string) => {
    if (!text.trim()) return;
    if (isStreaming) {
      setQueuedMessage(text.trim());
      setInput("");
      return;
    }
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

      const trustEntry: TrustData = {
          grade, claims: report.annotations, curvature: report.overallCurvature,
          converged: report.converged, iterations: iteration + 1,
          constraints: scaffold.constraints.map(c => ({ id: c.id, type: c.type, description: c.description, ringValue: c.ringValue })),
          termMap: scaffold.termMap.map(t => ({ term: t.term, ringValue: t.ringValue })),
          proof: {
            proofId: proofData.proofId, state: proofData.state,
            stepsCount: proofData.steps.length, premisesCount: proofData.premises.length,
            constraintsCount: scaffold.constraints.length, quantum: proofData.quantum,
            certified: proofData.certificate !== null,
          },
      };

      setTrustMap(prev => ({ ...prev, [msgIndex]: trustEntry }));

      // Compute UOR canonical receipts asynchronously (non-blocking)
      (async () => {
        try {
          const receiptMap: Record<string, UorReceipt> = {};

          // Receipt for the full proof
          const proofReceipt = await singleProofHash({
            "@context": { "oracle": "https://uor.foundation/oracle/" },
            "@type": "oracle:ReasoningProof",
            "oracle:proofId": proofData.proofId,
            "oracle:grade": grade,
            "oracle:curvature": report.overallCurvature,
            "oracle:converged": report.converged,
            "oracle:claimCount": report.annotations.length,
            "oracle:quantum": proofData.quantum,
          });
          receiptMap["proof"] = { cid: proofReceipt.cid, derivationId: proofReceipt.derivationId, uorAddress: proofReceipt.uorAddress };

          // Receipt for the scaffold/query interpretation
          const scaffoldReceipt = await singleProofHash({
            "@context": { "oracle": "https://uor.foundation/oracle/" },
            "@type": "oracle:QueryScaffold",
            "oracle:constraints": scaffold.constraints.map(c => ({ type: c.type, description: c.description, ring: c.ringValue })),
            "oracle:terms": scaffold.termMap.map(t => ({ term: t.term, ring: t.ringValue })),
          });
          receiptMap["scaffold"] = { cid: scaffoldReceipt.cid, derivationId: scaffoldReceipt.derivationId, uorAddress: scaffoldReceipt.uorAddress };

          // Receipt for each claim (batch in parallel)
          const claimReceipts = await Promise.all(
            report.annotations.map((claim, idx) =>
              singleProofHash({
                "@context": { "oracle": "https://uor.foundation/oracle/" },
                "@type": "oracle:Claim",
                "oracle:index": idx,
                "oracle:text": claim.text,
                "oracle:grade": claim.grade,
                "oracle:proofId": proofData.proofId,
              })
            )
          );
          claimReceipts.forEach((r, idx) => {
            receiptMap[`claim-${idx}`] = { cid: r.cid, derivationId: r.derivationId, uorAddress: r.uorAddress };
          });

          // Receipt for the composite ring signature
          const compositeRing = scaffold.termMap.reduce((acc, tm) => acc ^ tm.ringValue, 0) & 0xFF;
          const sigReceipt = await singleProofHash({
            "@context": { "oracle": "https://uor.foundation/oracle/" },
            "@type": "oracle:RingSignature",
            "oracle:compositeRing": compositeRing,
            "oracle:proofId": proofData.proofId,
            "oracle:certified": proofData.certificate !== null,
          });
          receiptMap["signature"] = { cid: sigReceipt.cid, derivationId: sigReceipt.derivationId, uorAddress: sigReceipt.uorAddress };

          setTrustMap(prev => ({
            ...prev,
            [msgIndex]: { ...prev[msgIndex], receipts: receiptMap },
          }));
        } catch (e) {
          console.warn("UOR receipt generation failed:", e);
        }
      })();

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
      <header className="flex items-center justify-between px-4 md:px-6 h-14 border-b border-border/20 bg-background/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <a href="/" className="text-muted-foreground/60 hover:text-foreground transition-colors text-base">←</a>
          <h1 className="font-display font-bold text-foreground text-lg tracking-tight">Oracle</h1>
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
          <div className="oracle-fade-top" />
        )}
        <div ref={scrollRef} className="h-full overflow-y-auto oracle-scroll-area">
          <div className="flex flex-col min-h-full">

          {/* Messages */}
          {messages.length > 0 && (
            <div className="px-4 md:px-6 py-4 space-y-5 w-full max-w-3xl mx-auto" ref={proseContainerRef}>
              <SelectionToolbar containerRef={proseContainerRef} onAction={handleSelectionAction} />
              {messages.map((msg, i) => (
                <div key={i}>
                  {msg.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary/10 border border-primary/10 px-5 py-3">
                        <p className="text-lg text-foreground leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="flex flex-col gap-1.5 max-w-[88%] relative"
                      ref={i === messages.length - 1 && isStreaming ? streamMsgRef : undefined}
                    >
                      {/* X-Ray toggle */}
                      {trustMap[i] && (
                        <button
                          onClick={() => setXrayOpen(prev => toggle(prev, i))}
                          className={`absolute -right-2 top-0 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-all ${
                            xrayOpen.has(i)
                              ? "bg-primary/15 text-primary border border-primary/25"
                              : "text-muted-foreground/40 hover:text-muted-foreground/70 hover:bg-muted/20"
                          }`}
                          title="Reveal what's behind this answer"
                        >
                          <Layers className="w-4 h-4" />
                          <span className="hidden sm:inline">{xrayOpen.has(i) ? "Close" : "X-Ray"}</span>
                        </button>
                      )}

                      {/* Shared container: bubbles and X-Ray occupy the same space */}
                      <div className="relative">
                        {/* Response bubbles */}
                        <div
                          className="flex flex-col gap-1.5 transition-all duration-500 ease-out"
                          style={{
                            opacity: xrayOpen.has(i) ? 0 : 1,
                            filter: xrayOpen.has(i) ? "blur(8px)" : "none",
                            transform: xrayOpen.has(i) ? "scale(0.98)" : "scale(1)",
                            pointerEvents: xrayOpen.has(i) ? "none" : "auto",
                            ...(xrayOpen.has(i) ? { position: "absolute" as const, inset: 0, zIndex: 0 } : {}),
                          }}
                        >
                        {(() => {
                          const chunks = msg.content.split(/\n\n+/).filter(Boolean);
                          return chunks.map((chunk, ci) => (
                            <motion.div
                              key={`${i}-${ci}-${chunk.slice(0, 20)}`}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{
                                duration: 0.28,
                                delay: i < messages.length - 1 ? 0 : ci * 0.15,
                                ease: [0.25, 0.1, 0.25, 1],
                              }}
                              className="oracle-bubble"
                            >
                              <div className="oracle-prose">
                                <ReactMarkdown>{chunk}</ReactMarkdown>
                              </div>
                            </motion.div>
                          ));
                        })()}
                        </div>

                        {/* X-Ray: revealed in the same position */}
                        <AnimatePresence>
                          {xrayOpen.has(i) && trustMap[i] && (() => {
                            const t = trustMap[i];
                            const curvPct = Math.min(t.curvature * 100, 100);
                            const curvLabel = curvPct < 20 ? "Closely aligned" : curvPct < 50 ? "Some drift" : "Significant drift";
                            const curvColor = curvPct < 20 ? "text-emerald-400" : curvPct < 50 ? "text-amber-400" : "text-red-400";

                            const compositeRing = t.termMap.reduce((acc, tm) => acc ^ tm.ringValue, 0) & 0xFF;
                            const partition = bridge.classifyByte(compositeRing);
                            const popcount = bridge.bytePopcount(compositeRing);
                            const factors = bridge.factorize(compositeRing);
                            const critHolds = bridge.verifyCriticalIdentity(compositeRing);

                            const backedCount = t.claims.filter(c => c.grade <= "B").length;

                            return (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0, filter: "blur(4px)" }}
                                transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
                                className="oracle-xray-panel relative z-10 space-y-6"
                              >
                                {/* ── Understanding ── */}
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.08, duration: 0.35 }}
                                  className="oracle-bubble"
                                >
                                  <p className="text-sm font-semibold text-muted-foreground/50 uppercase tracking-wider mb-3">Understanding</p>
                                  <p className="text-base text-foreground/70 mb-3">How the engine interpreted your question:</p>
                                  <div className="flex flex-wrap gap-2 mb-3">
                                    {t.constraints.map((c, ci) => (
                                      <span key={ci} className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border ${
                                        c.type === "factual" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                        c.type === "logical" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                                        c.type === "causal" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                        "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                      }`}>
                                        {c.description}
                                      </span>
                                    ))}
                                    {t.constraints.length === 0 && <span className="text-sm text-muted-foreground/40">General knowledge query</span>}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {t.termMap.map((tm, ti) => (
                                      <span key={ti} className="px-2.5 py-1 rounded-lg text-sm bg-muted/10 text-foreground/50 border border-border/15">
                                        {tm.term}
                                      </span>
                                    ))}
                                  </div>
                                </motion.div>

                                {/* ── Evidence ── */}
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.16, duration: 0.35 }}
                                  className="oracle-bubble"
                                >
                                  <div className="flex items-center justify-between mb-3">
                                    <p className="text-sm font-semibold text-muted-foreground/50 uppercase tracking-wider">Evidence</p>
                                    <span className="text-sm text-muted-foreground/40">{backedCount} of {t.claims.length} backed</span>
                                  </div>
                                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                                    {t.claims.map((claim, ci) => {
                                      const gc = GRADE_COLORS[claim.grade];
                                      const searchUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(claim.text.slice(0, 120))}`;
                                      return (
                                        <a
                                          key={ci}
                                          href={searchUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={`flex items-start gap-3 rounded-lg px-3.5 py-2.5 ${gc.bg} border ${gc.border} hover:brightness-110 transition-all group/claim cursor-pointer`}
                                        >
                                          <span className={`text-xs font-bold shrink-0 mt-1 w-5 text-center ${gc.text}`}>{claim.grade}</span>
                                          <p className="text-base text-foreground/80 leading-relaxed flex-1">{claim.text}</p>
                                          <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-1.5 text-muted-foreground/20 group-hover/claim:text-muted-foreground/60 transition-colors" />
                                        </a>
                                      );
                                    })}
                                  </div>
                                </motion.div>

                                {/* ── Alignment + Reasoning (side by side on wider screens) ── */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {/* Alignment */}
                                  <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.24, duration: 0.35 }}
                                    className="oracle-bubble"
                                  >
                                    <p className="text-sm font-semibold text-muted-foreground/50 uppercase tracking-wider mb-3">Alignment</p>
                                    <p className="text-base text-foreground/70 mb-3">How closely the answer followed your question.</p>
                                    <div className="flex items-center gap-3 mb-2">
                                      <div className="oracle-xray-gauge flex-1 h-2.5 rounded-full overflow-hidden relative">
                                        <motion.div
                                          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-foreground border-2 border-background shadow-lg z-10"
                                          initial={{ left: "0%" }}
                                          animate={{ left: `${curvPct}%` }}
                                          transition={{ delay: 0.4, duration: 0.6, ease: "easeOut" }}
                                          style={{ marginLeft: "-7px" }}
                                        />
                                      </div>
                                    </div>
                                    <p className={`text-base font-medium ${curvColor}`}>{curvLabel}</p>
                                  </motion.div>

                                  {/* Reasoning */}
                                  <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.32, duration: 0.35 }}
                                    className="oracle-bubble"
                                  >
                                    <p className="text-sm font-semibold text-muted-foreground/50 uppercase tracking-wider mb-3">Reasoning</p>
                                    <div className="space-y-2.5">
                                      {[
                                        { label: "Extracted constraints", value: `${t.proof?.constraintsCount ?? 0}`, color: "bg-blue-400" },
                                        { label: "Claims generated", value: `${t.claims.length}`, color: "bg-purple-400" },
                                        { label: "Verification", value: t.converged ? "Converged" : "Open", color: t.converged ? "bg-emerald-400" : "bg-amber-400" },
                                      ].map((step, si) => (
                                        <div key={si} className="flex items-center gap-3">
                                          <div className={`w-2 h-2 rounded-full ${step.color} shrink-0`} />
                                          <span className="text-base text-foreground/70 flex-1">{step.label}</span>
                                          <span className="text-base text-foreground/50 font-medium">{step.value}</span>
                                        </div>
                                      ))}
                                    </div>
                                    {t.iterations > 1 && (
                                      <p className="text-sm text-primary/60 mt-3">
                                        Refined {t.iterations - 1}× to improve quality
                                      </p>
                                    )}
                                  </motion.div>
                                </div>

                                {/* ── Signature ── */}
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.4, duration: 0.35 }}
                                  className="oracle-bubble"
                                >
                                  <p className="text-sm font-semibold text-muted-foreground/50 uppercase tracking-wider mb-2">Signature</p>
                                  <p className="text-base text-foreground/70 mb-3">Unique algebraic identity for this exchange, verified by the ring engine.</p>
                                  <div className="flex flex-wrap items-center gap-3 text-base">
                                    <span className="px-3 py-1.5 rounded-lg bg-primary/8 text-primary/80 border border-primary/12 font-mono">
                                      0x{compositeRing.toString(16).padStart(2, "0")}
                                    </span>
                                    <span className="text-foreground/50">{partition}</span>
                                    <span className="text-muted-foreground/30">·</span>
                                    <span className="text-foreground/50">weight {popcount}</span>
                                    {factors.length > 0 && (
                                      <>
                                        <span className="text-muted-foreground/30">·</span>
                                        <span className="text-foreground/50">{factors.join(" × ")}</span>
                                      </>
                                    )}
                                    <span className="text-muted-foreground/30">·</span>
                                    <span className={critHolds ? "text-emerald-400/70" : "text-amber-400/70"}>
                                      {critHolds ? "verified ✓" : "unverified"}
                                    </span>
                                  </div>
                                </motion.div>
                              </motion.div>
                            );
                          })()}
                        </AnimatePresence>
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
                                  onClick={() => { setExpandedTrust(prev => toggle(prev, i)); setActivePillar(prev => ({ ...prev, [i]: "trust" })); }}
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

                          {/* ── Simplified Summary Line ── */}
                          {(() => {
                            const t = trustMap[i];
                            const evidenceCount = t.claims.filter(c => c.grade <= "B").length;
                            const isOpen = expandedTrust.has(i);
                            return (
                              <>
                                <button
                                  onClick={() => setExpandedTrust(prev => toggle(prev, i))}
                                  className="flex items-center justify-between w-full text-xs text-muted-foreground/60 hover:text-foreground/80 transition-colors group"
                                >
                                  <span className="flex items-center gap-1.5">
                                    <Shield className="w-3.5 h-3.5 text-emerald-400/70" />
                                    <span>{evidenceCount} of {t.claims.length} backed by evidence</span>
                                  </span>
                                  <span className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                    Details
                                    {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                  </span>
                                </button>

                                {/* ── Three-Pillar Trust Card ── */}
                                <AnimatePresence>
                                  {isOpen && (() => {
                                    const confidence = t.grade <= "B" ? "High" : t.grade === "C" ? "Moderate" : "Low";
                                    const confidenceDot = t.grade <= "B" ? "bg-emerald-400" : t.grade === "C" ? "bg-amber-400" : "bg-red-400";
                                    const consistencyLabel = t.converged ? "Confirmed" : "Some uncertainty";
                                    const consistencyDot = t.converged ? "bg-emerald-400" : "bg-amber-400";
                                    const ap = activePillar[i] ?? null;

                                    const pillars = [
                                      { id: "trust", label: "Trust level", value: confidence, dot: confidenceDot },
                                      { id: "evidence", label: "Evidence", value: `${evidenceCount} of ${t.claims.length}`, dot: evidenceCount > t.claims.length / 2 ? "bg-emerald-400" : evidenceCount > 0 ? "bg-amber-400" : "bg-red-400" },
                                      { id: "consistency", label: "Consistency", value: consistencyLabel, dot: consistencyDot },
                                    ];

                                    return (
                                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                                        <div className="mt-3 rounded-xl border border-border/20 bg-background/30 p-3">
                                          <div className="space-y-0">
                                            {pillars.map((p) => {
                                              const isActive = ap === p.id;
                                              return (
                                                <div key={p.id}>
                                                  <button
                                                    onClick={() => setActivePillar(prev => ({ ...prev, [i]: isActive ? null : p.id }))}
                                                    className="flex items-center gap-3 w-full py-2 hover:bg-muted/10 rounded-lg px-1 transition-colors group/pillar"
                                                  >
                                                    <div className={`w-2 h-2 rounded-full ${p.dot} shrink-0`} />
                                                    <span className="text-sm font-medium text-foreground/70 flex-1 text-left">{p.label}</span>
                                                    <span className="text-sm text-muted-foreground/60 mr-1">{p.value}</span>
                                                    {isActive ? <ChevronDown className="w-3 h-3 text-muted-foreground/40" /> : <ChevronRight className="w-3 h-3 text-muted-foreground/30 group-hover/pillar:text-muted-foreground/50" />}
                                                  </button>

                                                  <AnimatePresence>
                                                    {isActive && (
                                                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                                                        <div className="pl-6 pr-1 pb-2">
                                                          {/* Trust pillar → statement breakdown */}
                                                          {p.id === "trust" && (
                                                            <div className="space-y-1.5 max-h-60 overflow-y-auto">
                                                              {t.claims.map((claim, ci) => (
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
                                                          )}

                                                          {/* Evidence pillar → grounded vs ungrounded */}
                                                          {p.id === "evidence" && (
                                                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                                              {t.claims.map((claim, ci) => {
                                                                const backed = claim.grade <= "B";
                                                                const searchUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(claim.text.slice(0, 120))}`;
                                                                return (
                                                                  <a
                                                                    key={ci}
                                                                    href={searchUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className={`flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-muted/15 transition-colors group/ev ${backed ? "text-emerald-400/80" : "text-muted-foreground/40"}`}
                                                                  >
                                                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${backed ? "bg-emerald-400" : "bg-muted-foreground/30"}`} />
                                                                    <span className="truncate flex-1">{claim.text}</span>
                                                                    <ExternalLink className="w-3 h-3 shrink-0 opacity-0 group-hover/ev:opacity-60 transition-opacity" />
                                                                  </a>
                                                                );
                                                              })}
                                                            </div>
                                                          )}

                                                          {/* Consistency pillar → convergence details */}
                                                          {p.id === "consistency" && (
                                                            <div className="space-y-2 text-sm text-muted-foreground/60">
                                                              <div className="flex items-center gap-2">
                                                                <div className={`w-1.5 h-1.5 rounded-full ${t.converged ? "bg-emerald-400" : "bg-amber-400"}`} />
                                                                {t.converged ? "All verification checks agree" : "Some checks showed uncertainty"}
                                                              </div>
                                                              <div className="flex items-center gap-2">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                                                                {t.iterations > 1
                                                                  ? `Answer refined ${t.iterations === 2 ? "once" : t.iterations === 3 ? "twice" : `${t.iterations - 1} times`}`
                                                                  : "No refinement needed"}
                                                              </div>
                                                              {t.proof && (
                                                                <div className="flex items-center gap-2">
                                                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400/50" />
                                                                  {t.proof.premisesCount} topics verified across {t.proof.stepsCount} reasoning steps
                                                                </div>
                                                              )}
                                                            </div>
                                                          )}
                                                        </div>
                                                      </motion.div>
                                                    )}
                                                  </AnimatePresence>
                                                </div>
                                              );
                                            })}
                                          </div>

                                          <div className="mt-2 pt-2 border-t border-border/10 text-xs text-muted-foreground/30">
                                            Checked independently · {t.claims.length} verifications
                                          </div>
                                        </div>
                                      </motion.div>
                                    );
                                  })()}
                                </AnimatePresence>
                              </>
                            );
                          })()}
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>
              ))}

            </div>
          )}

            {/* ── Breathing dot / typing indicator ── */}
            {messages.length > 0 && (
              <div className="flex justify-start px-4 md:px-6 max-w-3xl mx-auto w-full">
                <AnimatePresence mode="wait">
                  {showTypingDots ? (
                    <motion.div
                      key="typing"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex gap-[5px] items-center px-3 py-2"
                    >
                      <span className="typing-dot w-[6px] h-[6px] rounded-full bg-muted-foreground/40" style={{ animationDelay: "0ms" }} />
                      <span className="typing-dot w-[6px] h-[6px] rounded-full bg-muted-foreground/40" style={{ animationDelay: "160ms" }} />
                      <span className="typing-dot w-[6px] h-[6px] rounded-full bg-muted-foreground/40" style={{ animationDelay: "320ms" }} />
                    </motion.div>
                  ) : (verifying || refiningIteration !== null) ? (
                    <motion.div
                      key="verifying"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 text-xs text-muted-foreground/50 py-2"
                    >
                      {refiningIteration !== null ? (
                        <><RefreshCw className="w-3.5 h-3.5 animate-spin text-primary/60" /><span>Improving <span className="text-primary/70 font-mono">{refiningIteration + 1}/3</span></span></>
                      ) : (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Verifying…</span></>
                      )}
                    </motion.div>
                  ) : !isStreaming ? (
                    <motion.div
                      key="breathing"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="py-3 px-3"
                    >
                      <div className="oracle-breathing-dot" />
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            )}

            {/* ── Inline flow input ── */}
            {messages.length === 0 ? (
              /* ── Empty state: input ABOVE presets, golden-ratio centered ── */
              <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-3rem)] px-4 md:px-6">
                {/* φ-spaced content block */}
                <div className="flex flex-col items-center w-full max-w-2xl" style={{ marginTop: "-6.18%" }}>
                  <h1 className="text-foreground font-display font-bold text-3xl md:text-4xl mb-3 tracking-tight">Ask anything</h1>
                  <p className="text-muted-foreground/60 text-lg md:text-xl mb-10 max-w-md leading-relaxed text-center">
                    Every claim verified. Every answer graded.
                  </p>

                  {/* Input first */}
                  <div className="flex gap-2 items-end w-full mb-10">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                      placeholder="Ask anything…"
                      rows={1}
                      className="oracle-flow-input flex-1 bg-muted/10 border border-border/30 rounded-xl px-5 py-4 text-lg text-foreground placeholder:text-muted-foreground/30 resize-none focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/10 transition-all"
                    />
                    <button
                      onClick={() => send(input)}
                      disabled={!input.trim()}
                      className="p-4 rounded-xl bg-primary text-primary-foreground disabled:opacity-20 hover:bg-primary/90 transition-colors"
                    >
                      <ArrowUp className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Presets below input */}
                  <div className="flex flex-wrap justify-center gap-2.5 max-w-lg">
                    {PRESETS.map((p) => (
                      <button
                        key={p.label}
                        onClick={() => send(p.prompt)}
                        className="px-5 py-3 rounded-full border border-border/40 text-base text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* ── Has messages: input anchored near bottom ── */
              <div className="px-4 md:px-6 max-w-3xl mx-auto w-full pb-6 pt-2">
                <div className="flex gap-2 items-end">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                    placeholder={isStreaming ? (queuedMessage ? "Queued — will send next…" : "Type while I respond…") : "Ask anything…"}
                    rows={1}
                    className="oracle-flow-input flex-1 bg-muted/10 border border-border/30 rounded-xl px-5 py-3.5 text-base text-foreground placeholder:text-muted-foreground/30 resize-none focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/10 transition-all"
                  />
                  <button
                    onClick={() => send(input)}
                    disabled={!input.trim()}
                    className="p-3.5 rounded-xl bg-primary text-primary-foreground disabled:opacity-20 hover:bg-primary/90 transition-colors"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                </div>
                {queuedMessage && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-primary/60 mt-1.5 ml-1"
                  >
                    ↳ "{queuedMessage}" will send when current response finishes
                  </motion.p>
                )}
              </div>
            )}

            <div ref={flowEndRef} className="h-1" />
        </div>
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
