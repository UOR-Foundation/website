import { useState, useRef, useEffect, useCallback } from "react";
import Layout from "@/modules/core/components/Layout";
import ReactMarkdown from "react-markdown";
import { streamOracle, type Msg } from "@/modules/oracle/lib/stream-oracle";
import { executeExpression, extractWasmBlocks, type SymbolicResult } from "@/modules/oracle/lib/symbolic-engine";
import { loadWasm, engineType, crateVersion } from "@/lib/wasm/uor-bridge";
import { ArrowRight, Copy, Check, Cpu, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

const PRESETS = [
  { label: "Identity Fraud", prompt: "How does UOR prevent identity fraud in multi-agent systems?" },
  { label: "Prompt Injection", prompt: "How can UOR detect prompt injection attacks structurally?" },
  { label: "Data Verification", prompt: "How do I verify data hasn't been tampered with across systems?" },
  { label: "Agent Coordination", prompt: "How does UOR help AI agents coordinate without custom protocols?" },
  { label: "Content Quality", prompt: "How can I score content quality using UOR's partition analysis?" },
  { label: "Critical Identity", prompt: "Show me the critical identity neg(bnot(x)) = succ(x) and why it matters." },
];

const OraclePage = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [symbolicResults, setSymbolicResults] = useState<SymbolicResult[]>([]);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, symbolicResults]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);
    setSymbolicResults([]);

    let assistantSoFar = "";

    try {
      await streamOracle({
        messages: newMessages,
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
          const blocks = extractWasmBlocks(assistantSoFar);
          const results = blocks.map(expr => executeExpression(expr)).filter(Boolean) as SymbolicResult[];
          setSymbolicResults(results);
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

  const handleCopy = () => {
    navigator.clipboard.writeText("cargo add uor-foundation");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background pt-20">
        <div className="container px-4 md:px-[5%] py-8 md:py-12 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <p className="font-body font-semibold tracking-[0.2em] uppercase text-foreground/70 mb-3" style={{ fontSize: "var(--text-label)" }}>
              Neuro-Symbolic AI
            </p>
            <h1 className="font-display font-bold text-foreground mb-3" style={{ fontSize: "var(--text-section-heading)" }}>
              UOR Oracle
            </h1>
            <p className="text-muted-foreground font-body max-w-2xl" style={{ fontSize: "var(--text-body)" }}>
              Ask anything about the UOR Framework. Every answer is anchored to the canonical{" "}
              <a href="https://crates.io/crates/uor-foundation" target="_blank" rel="noopener" className="text-primary hover:underline">
                Rust crate
              </a>{" "}
              and verified by live ring computations.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chat Panel */}
            <div className="lg:col-span-2 flex flex-col rounded-xl border border-border/40 bg-card overflow-hidden" style={{ minHeight: "65vh" }}>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-5">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center py-16">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Cpu className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-foreground font-display font-semibold text-lg mb-2">Ask the Oracle</p>
                    <p className="text-muted-foreground text-sm max-w-md mb-8">
                      Describe your problem in plain language. The Oracle identifies which UOR layer solves it and proves it with live computation.
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
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
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
                ))}

                {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
                  <div className="flex justify-start">
                    <div className="bg-muted/30 rounded-xl px-4 py-3">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-border/30 p-4">
                <div className="flex gap-3 items-end">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                    placeholder="Ask about UOR..."
                    rows={1}
                    className="flex-1 bg-background/50 border border-border/40 rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:border-primary/40 transition-colors"
                  />
                  <button onClick={() => send(input)} disabled={isStreaming || !input.trim()} className="p-3 rounded-lg bg-primary text-primary-foreground disabled:opacity-30 hover:bg-primary/90 transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Symbolic Panel */}
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-border/40 bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Symbolic Engine</p>
                </div>
                {symbolicResults.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 font-mono">Computations appear here when the Oracle references ring operations.</p>
                ) : (
                  <div className="space-y-4">
                    {symbolicResults.map((r, i) => (
                      <div key={i} className="rounded-lg border border-border/30 bg-background/50 p-3">
                        <p className="font-mono text-xs text-primary mb-1">{r.expression}</p>
                        <p className="font-mono text-lg text-foreground font-bold">{String(r.value)}</p>
                        <div className="mt-2 space-y-1">
                          {Object.entries(r.details).map(([k, v]) => (
                            <p key={k} className="text-xs text-muted-foreground font-mono">
                              {k}: {typeof v === "object" ? JSON.stringify(v) : String(v)}
                            </p>
                          ))}
                        </div>
                        <div className="mt-2 pt-2 border-t border-border/20 flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground/50 font-mono">{r.traitRef}</span>
                          <a href={r.docsUrl} target="_blank" rel="noopener" className="text-primary hover:underline"><ExternalLink className="w-3 h-3" /></a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border/40 bg-card p-5">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Source of Truth</p>
                <a href="https://crates.io/crates/uor-foundation" target="_blank" rel="noopener" className="text-sm text-primary hover:underline font-mono block mb-3">
                  crates.io/crates/uor-foundation
                </a>
                <button onClick={handleCopy} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-mono hover:bg-primary/15 transition-colors">
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  cargo add uor-foundation
                </button>
              </div>

              <div className="rounded-xl border border-border/40 bg-card p-5">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">14 Namespaces</p>
                <div className="space-y-1.5">
                  {[
                    { ns: "u/", label: "Addressing", space: "K" },
                    { ns: "schema/", label: "Datum, Triad", space: "K" },
                    { ns: "op/", label: "Ring ops", space: "K" },
                    { ns: "partition/", label: "Decomposition", space: "B" },
                    { ns: "observable/", label: "Metrics", space: "B" },
                    { ns: "proof/", label: "Proofs", space: "B" },
                    { ns: "cert/", label: "Certificates", space: "B" },
                    { ns: "morphism/", label: "Transforms", space: "U" },
                  ].map((n) => (
                    <div key={n.ns} className="flex items-center gap-2 text-xs font-mono">
                      <span className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold ${
                        n.space === "K" ? "bg-primary/15 text-primary" : n.space === "B" ? "bg-accent/15 text-accent" : "bg-green-500/15 text-green-400"
                      }`}>{n.space}</span>
                      <span className="text-foreground/70">{n.ns}</span>
                      <span className="text-muted-foreground/50 ml-auto">{n.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default OraclePage;
