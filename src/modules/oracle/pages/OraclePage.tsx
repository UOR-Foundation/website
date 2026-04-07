import { useState, useRef, useEffect, useCallback } from "react";
import Layout from "@/modules/core/components/Layout";
import ReactMarkdown from "react-markdown";
import { streamOracle, type Msg } from "@/modules/oracle/lib/stream-oracle";
import {
  buildScaffold,
  processResponse,
  overallGrade,
  type SymbolicScaffold,
  type CurvatureReport,
  type AnnotatedClaim,
  type EpistemicGrade,
  DEFAULT_CONFIG,
} from "@/modules/ring-core/neuro-symbolic";
import { loadWasm } from "@/lib/wasm/uor-bridge";
import TrustScoreBar from "@/components/reasoning/TrustScoreBar";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

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
}

const OraclePage = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [trustMap, setTrustMap] = useState<Record<number, TrustData>>({});
  const [verifying, setVerifying] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [wasmReady, setWasmReady] = useState(false);

  useEffect(() => { loadWasm().then(() => setWasmReady(true)); }, []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, trustMap]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    // 1. DEDUCTIVE: Build scaffold from user query using WASM ring arithmetic
    const scaffold = buildScaffold(text.trim());

    let assistantSoFar = "";
    const assistantIndex = newMessages.length; // index where assistant msg will be

    try {
      await streamOracle({
        messages: newMessages,
        scaffoldFragment: scaffold.promptFragment,
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
          // 2. ABDUCTIVE: Verify response through WASM-powered curvature measurement
          runVerification(scaffold, assistantSoFar, assistantIndex);
        },
        onError: (err) => {
          setIsStreaming(false);
          toast.error(err);
        },
      });
    } catch {
      setIsStreaming(false);
      toast.error("Connection error. Please try again.");
    }
  }, [messages, isStreaming]);

  const runVerification = useCallback((scaffold: SymbolicScaffold, response: string, msgIndex: number) => {
    setVerifying(true);
    try {
      const { report, result } = processResponse(scaffold, response, 0, DEFAULT_CONFIG);
      
      const grade = result ? result.overallGrade : overallGrade(report.annotations);
      
      setTrustMap(prev => ({
        ...prev,
        [msgIndex]: {
          grade,
          claims: report.annotations,
          curvature: report.overallCurvature,
          converged: report.converged,
          iterations: result?.iterations ?? 1,
        },
      }));
    } catch (err) {
      console.error("Verification error:", err);
    } finally {
      setVerifying(false);
    }
  }, []);

  const handleFollowUp = useCallback((prompt: string) => {
    send(prompt);
  }, [send]);

  // Find the user query for a given assistant message index
  const getUserQuery = (assistantIdx: number): string => {
    for (let i = assistantIdx - 1; i >= 0; i--) {
      if (messages[i]?.role === "user") return messages[i].content;
    }
    return "";
  };

  // Latest trust data for sidebar
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
                    {/* Trust Score Bar for assistant messages */}
                    {msg.role === "assistant" && trustMap[i] && (
                      <div className="max-w-[85%]">
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

                {verifying && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Verifying claims...
                  </div>
                )}
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

            {/* Trust Surface Sidebar */}
            <div className="flex flex-col gap-4">
              {/* Trust Grade Card */}
              <div className="rounded-xl border border-border/40 bg-card p-5">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-4">Trust Surface</p>
                {latestTrust ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold ${
                        latestTrust.grade === "A" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" :
                        latestTrust.grade === "B" ? "bg-blue-500/15 text-blue-400 border border-blue-500/30" :
                        latestTrust.grade === "C" ? "bg-amber-500/15 text-amber-400 border border-amber-500/30" :
                        "bg-red-500/15 text-red-400 border border-red-500/30"
                      }`}>
                        {latestTrust.grade}
                      </span>
                      <div>
                        <p className="text-foreground font-semibold text-sm">
                          {latestTrust.grade === "A" ? "Proven" : latestTrust.grade === "B" ? "Verified" : latestTrust.grade === "C" ? "Plausible" : "Unverified"}
                        </p>
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
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Claims</span>
                        <span className="font-mono text-foreground">{latestTrust.claims.length}</span>
                      </div>
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
                              className={`h-2 rounded-full ${
                                g === "A" ? "bg-emerald-500" : g === "B" ? "bg-blue-500" : g === "C" ? "bg-amber-500" : "bg-red-500"
                              }`}
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
                          return (
                            <span key={g} className="text-[10px] text-muted-foreground font-mono">
                              {g}:{count}
                            </span>
                          );
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
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">How it works</p>
                <div className="space-y-3 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-[9px] shrink-0 mt-0.5">1</span>
                    <p><span className="text-foreground/80 font-medium">Scaffold</span> — Your query is analyzed and mapped to ring constraints via WASM</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-[9px] shrink-0 mt-0.5">2</span>
                    <p><span className="text-foreground/80 font-medium">Constrain</span> — Constraints are injected into the LLM prompt to guide reasoning</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-[9px] shrink-0 mt-0.5">3</span>
                    <p><span className="text-foreground/80 font-medium">Verify</span> — Each claim is graded using curvature measurement over Z/256Z</p>
                  </div>
                </div>
              </div>

              {/* Powered by footer */}
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
