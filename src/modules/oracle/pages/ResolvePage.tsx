/**
 * UOR Search — The address IS the content.
 *
 * Google indexes information. UOR indexes meaning.
 * One input, one answer. Address ↔ Content.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowLeft, Copy, Check, RotateCcw, Plus, Sparkles, Send, X, ShieldCheck } from "lucide-react";
import ReactMarkdown from "react-markdown";
import confetti from "canvas-confetti";
import { loadWasm } from "@/lib/wasm/uor-bridge";
import { encode, lookup, type EnrichedReceipt } from "@/lib/uor-codec";
import { allEntries } from "@/modules/oracle/lib/receipt-registry";
import { streamOracle, type Msg } from "@/modules/oracle/lib/stream-oracle";
import { toast } from "sonner";

const SURPRISE_MESSAGES = [
  "✨ Look what the universe found!",
  "🌟 This one's special.",
  "🎲 Your cosmic address awaits…",
  "🔮 The Oracle chose this for you.",
  "🪐 A corner of the address space, just for you.",
  "💫 Every address tells a story.",
];

/* ── Infinite Improbability Drive ── */
const IMPROBABILITY_SIDE_EFFECTS = [
  "A sperm whale just appeared above Magrathea",
  "All molecules in your device leapt one foot to the left",
  "239,000 lightly fried eggs materialized somewhere nearby",
  "You have been briefly turned into a penguin",
  "A small potted petunia thought \"Oh no, not again\"",
  "Your probability of existing just became finite",
  "Somewhere, a Vogon is reading poetry in your honor",
  "The answer was 42 all along, but the question changed",
];

const DONT_PANIC_MESSAGES = [
  "The Improbability Drive found this improbably relevant.",
  "Reality has been restored. Mostly.",
  "That was improbable. But then again, so is everything.",
  "The universe is rarely what it seems. Neither is this address.",
  "Don't panic — this result was always going to happen. Probably.",
  "Normality has been restored. Whatever that means.",
];

const IMPROBABILITY_EXPONENTS = [
  "2^17", "2^256", "2^4,096", "2^65,536", "2^276,709",
  "2^1,048,576", "2^∞",
];

interface Result {
  source: unknown;
  receipt: EnrichedReceipt;
}

/* ── Tiny copy button ── */
function CopyBtn({ onClick, copied, size = 12, label }: {
  onClick: () => void; copied: boolean; size?: number; label?: string;
}) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 text-muted-foreground/25 hover:text-muted-foreground/60 transition-colors" title="Copy">
      {copied ? <Check size={size} className="text-emerald-400" /> : <Copy size={size} />}
      {label && <span className="text-[10px]">{label}</span>}
    </button>
  );
}

const SearchPage = () => {
  const [aiMode, setAiMode] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const aiInputRef = useRef<HTMLInputElement>(null);
  const aiScrollRef = useRef<HTMLDivElement>(null);

  const [input, setInput] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [wasmReady, setWasmReady] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [rederived, setRederived] = useState(false);

  // AI Mode state
  const [aiMessages, setAiMessages] = useState<Msg[]>([]);
  const [aiStreaming, setAiStreaming] = useState(false);
  const [aiInput, setAiInput] = useState("");

  const looksLikeIpv6 = input.trim().toLowerCase().startsWith("fd00:0075:6f72");

  useEffect(() => { loadWasm().then(() => setWasmReady(true)); }, []);
  useEffect(() => { if (!result && !aiMode) inputRef.current?.focus(); }, [result, aiMode]);

  useEffect(() => {
    const addr = searchParams.get("w") ?? searchParams.get("cid") ?? searchParams.get("id");
    if (addr) { setInput(addr); handleSearch(addr); }
  }, [searchParams]);

  // Auto-scroll AI chat
  useEffect(() => {
    if (aiScrollRef.current) {
      aiScrollRef.current.scrollTop = aiScrollRef.current.scrollHeight;
    }
  }, [aiMessages]);

  const handleSearch = async (address: string) => {
    const trimmed = address.trim();
    if (!trimmed) return;
    setLoading(true); setResult(null); setRederived(false);
    try {
      const entry = lookup(trimmed);
      if (entry) {
        setResult({ source: entry.source, receipt: entry.receipt });
      } else {
        toast("Address not found. Paste content to create an entry.", { icon: "📝" });
      }
    } catch { toast.error("Search failed."); }
    finally { setLoading(false); }
  };

  const submit = () => {
    handleSearch(input);
  };

  const rederive = async () => {
    if (!result?.source) return;
    setLoading(true);
    try {
      const receipt = await encode(result.source);
      setRederived(receipt.cid === result.receipt.cid);
      toast.success("Deterministic ✓ — identical address.");
    } catch { toast.error("Re-derivation failed."); }
    finally { setLoading(false); }
  };

  const copy = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }, []);

  const clearResult = () => { setResult(null); setRederived(false); setInput(""); };

  /* ── AI Oracle ── */
  const sendAiMessage = async () => {
    const trimmed = aiInput.trim();
    if (!trimmed || aiStreaming) return;

    const userMsg: Msg = { role: "user", content: trimmed };
    const updatedMessages = [...aiMessages, userMsg];
    setAiMessages(updatedMessages);
    setAiInput("");
    setAiStreaming(true);

    let assistantSoFar = "";

    await streamOracle({
      messages: updatedMessages,
      onDelta: (chunk) => {
        assistantSoFar += chunk;
        setAiMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      },
      onDone: async () => {
        setAiStreaming(false);
        // Compute UOR proof for this Q&A exchange
        try {
          const proofSource = {
            "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
            "@type": "uor:OracleExchange",
            "uor:query": trimmed,
            "uor:response": assistantSoFar,
            "uor:timestamp": new Date().toISOString(),
          };
          const receipt = await encode(proofSource);
          // Attach proof to the last assistant message
          setAiMessages(prev => prev.map((m, i) =>
            i === prev.length - 1 && m.role === "assistant"
              ? { ...m, proof: receipt }
              : m
          ));
        } catch (e) {
          console.warn("[Oracle] Proof generation failed:", e);
        }
      },
      onError: (err) => {
        toast.error(err);
        setAiStreaming(false);
      },
    });
  };

  const exitAiMode = () => {
    setAiMode(false);
    setAiMessages([]);
    setAiInput("");
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" style={{ height: "100dvh" }}>
      {/* Loading bar */}
      <AnimatePresence>
        {(loading || aiStreaming) && (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute top-0 left-0 right-0 h-0.5 bg-primary/60 origin-left z-[60]"
          />
        )}
      </AnimatePresence>

      {/* ── RESULT STATE: Search bar in header ── */}
      {result ? (
        <header className="flex items-center gap-3 px-4 md:px-6 h-14 border-b border-border/15 shrink-0">
          <button onClick={clearResult} className="text-muted-foreground/40 hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); clearResult(); setTimeout(submit, 50); } }}
              className="w-full bg-[hsl(var(--muted)/0.08)] border border-border/15 rounded-full px-4 py-2 pr-10 text-sm font-mono text-foreground placeholder:text-muted-foreground/20 focus:outline-none focus:border-primary/25 focus:ring-1 focus:ring-primary/8 transition-all"
            />
            <button onClick={() => { clearResult(); setTimeout(submit, 50); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground/30 hover:text-foreground/60 transition-colors">
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>
      ) : null}

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 md:px-6">

          {/* ══════════════ EMPTY STATE — Homepage ══════════════ */}
          {!result && !aiMode && (
            <div
              className="relative flex flex-col items-center"
              style={{ minHeight: "100dvh", paddingTop: "38.2vh" }}
            >
              {/* Brand wordmark — single confident line */}
              <h1
                className="font-display font-bold tracking-[0.025em] text-foreground select-none leading-none whitespace-nowrap"
                style={{ fontSize: "clamp(2.6rem, 5.5vw, 4rem)" }}
              >
                UOR Semantic Web Search
              </h1>

              {/* Search bar — golden ratio spacing from title */}
              <div
                className="w-full relative group"
                style={{ maxWidth: "min(720px, 85vw)", marginTop: "calc(4rem * 0.618)" }}
              >
                <div className="relative flex items-center bg-[hsl(0_0%_15%)] border border-[hsl(0_0%_22%)] hover:border-[hsl(0_0%_37%)] rounded-full transition-all duration-500 focus-within:border-primary/30 focus-within:shadow-[0_0_20px_-4px_hsl(var(--primary)/0.25),0_0_60px_-12px_hsl(var(--primary)/0.1)]">
                  {/* Left + icon */}
                  <button className="pl-5 pr-2 py-[18px] text-muted-foreground/50 hover:text-foreground/70 transition-colors shrink-0">
                    <Plus className="w-6 h-6" />
                  </button>

                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
                    placeholder=""
                    className="flex-1 bg-transparent py-[18px] px-2 text-lg text-foreground placeholder:text-muted-foreground/25 focus:outline-none"
                  />

                  {/* Right side — separator + AI Mode pill */}
                  <div className="flex items-center gap-3 pr-3 shrink-0">
                    <div className="w-px h-7 bg-[hsl(0_0%_30%)]" />
                    <button
                      onClick={() => setAiMode(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-full border border-[hsl(0_0%_28%)] hover:bg-[hsl(0_0%_22%)] transition-all"
                    >
                      <Sparkles className="w-4 h-4 text-primary/70" />
                      <span className="text-sm font-semibold text-foreground/80 whitespace-nowrap">AI Mode</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Dual buttons — golden ratio spacing */}
              <div
                className="flex items-center gap-4"
                style={{ marginTop: "1.85rem" }}
              >
                <button
                  onClick={submit}
                  disabled={!input.trim() || loading}
                  className="px-7 h-12 rounded-md bg-[hsl(0_0%_15%)] hover:bg-[hsl(0_0%_22%)] hover:border-[hsl(0_0%_37%)] border border-[hsl(0_0%_22%)] text-[15px] font-semibold text-foreground tracking-wide transition-all disabled:opacity-30"
                >
                  UOR Search
                </button>
                <button
                  onClick={() => {
                    const entries = allEntries();
                    if (entries.length === 0) {
                      toast("Nothing mapped yet. Search something first!", { icon: "🫧" });
                      return;
                    }
                    const pick = entries[Math.floor(Math.random() * entries.length)];

                    const colors = ["#FFD700", "#A855F7", "#3B82F6", "#F472B6", "#34D399"];
                    confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 }, colors, startVelocity: 30, gravity: 0.8, ticks: 120 });
                    setTimeout(() => confetti({ particleCount: 40, spread: 120, origin: { y: 0.5 }, colors, startVelocity: 15, gravity: 0.6, ticks: 100 }), 200);

                    const msg = SURPRISE_MESSAGES[Math.floor(Math.random() * SURPRISE_MESSAGES.length)];
                    toast(msg, { description: pick.receipt.triwordFormatted });

                    setTimeout(() => {
                      setInput(pick.receipt.triword);
                      setResult({ source: pick.source, receipt: pick.receipt });
                    }, 400);
                  }}
                  className="px-7 h-12 rounded-md bg-[hsl(0_0%_15%)] hover:bg-[hsl(0_0%_22%)] hover:border-[hsl(0_0%_37%)] border border-[hsl(0_0%_22%)] text-[15px] font-semibold text-foreground tracking-wide transition-all"
                >
                  Surprise Me
                </button>
              </div>

              {/* Tagline — pinned near bottom */}
              <p
                className="absolute left-0 right-0 text-center text-[14px] text-muted-foreground/30 select-none"
                style={{ bottom: "6vh" }}
              >
                Searching a <span className="text-foreground/50 font-medium">near-infinite</span> address space.
              </p>
            </div>
          )}

          {/* ══════════════ AI MODE — Oracle ══════════════ */}
          {!result && aiMode && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col"
              style={{ height: "100dvh" }}
            >
              {/* AI Mode header */}
              <div className="flex items-center justify-between py-5 shrink-0">
                <div className="flex items-center gap-3">
                  <button onClick={exitAiMode} className="text-muted-foreground/40 hover:text-foreground transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary/70" />
                    <span className="text-sm font-medium text-foreground/80">UOR Oracle</span>
                  </div>
                </div>
                <button onClick={exitAiMode} className="text-muted-foreground/30 hover:text-foreground/60 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Messages area */}
              <div ref={aiScrollRef} className="flex-1 overflow-y-auto space-y-6 pb-4 min-h-0">
                {aiMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center pt-[20vh] text-center">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                      <Sparkles className="w-6 h-6 text-primary/60" />
                    </div>
                    <h2 className="text-lg font-display font-medium text-foreground/80 mb-2">Ask the Oracle</h2>
                    <p className="text-sm text-muted-foreground/40 max-w-sm">
                      Ask anything. The Oracle reasons through your question with epistemic rigor and content-addressable proofs.
                    </p>
                  </div>
                )}

                {aiMessages.map((msg, i) => (
                  <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <div className={`max-w-[85%] ${
                      msg.role === "user"
                        ? "bg-primary/15 rounded-2xl rounded-br-md px-4 py-3"
                        : "prose prose-invert prose-sm max-w-none"
                    }`}>
                      {msg.role === "user" ? (
                        <p className="text-sm text-foreground/90">{msg.content}</p>
                      ) : (
                        <div className="text-sm text-foreground/75 leading-relaxed [&>p]:mb-3 [&>ul]:mb-3 [&>ol]:mb-3">
                          <ReactMarkdown>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>

                    {/* UOR Proof Card — appears below each completed assistant message */}
                    {msg.role === "assistant" && msg.proof && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 24 }}
                        className="mt-2 max-w-[85%] w-full"
                      >
                        <div className="border border-primary/10 rounded-xl bg-primary/[0.03] px-4 py-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/70" />
                            <span className="text-[11px] font-semibold text-emerald-400/70 uppercase tracking-[0.12em]">Proof of Thought</span>
                          </div>

                          {/* Triword address */}
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-display text-foreground/80 tracking-wide">
                              {msg.proof.triwordFormatted}
                            </span>
                            <CopyBtn
                              onClick={() => copy(msg.proof!.triword, `proof-triword-${i}`)}
                              copied={copied === `proof-triword-${i}`}
                              size={10}
                            />
                          </div>

                          {/* Compact proof details */}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono text-muted-foreground/40">
                            <span title="Content Identifier">
                              CID: {msg.proof.cid.slice(0, 16)}…
                            </span>
                            <span title="Glyph">
                              {msg.proof.glyph}
                            </span>
                            <span title="Ring partition">
                              Ring: {msg.proof.ringPartition}
                            </span>
                            <span title="Engine">
                              {msg.proof.engine === "wasm" ? "⚙ WASM" : "⚙ TS"}
                            </span>
                          </div>

                          {/* Clickable to navigate to full proof */}
                          <button
                            onClick={() => {
                              setInput(msg.proof!.triword);
                              exitAiMode();
                              setTimeout(() => handleSearch(msg.proof!.triword), 100);
                            }}
                            className="text-[10px] text-primary/50 hover:text-primary/80 transition-colors underline underline-offset-2"
                          >
                            View full proof →
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                ))}

                {aiStreaming && aiMessages[aiMessages.length - 1]?.role !== "assistant" && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-1.5 px-3 py-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse [animation-delay:150ms]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse [animation-delay:300ms]" />
                    </div>
                  </div>
                )}
              </div>

              {/* AI input bar — fixed at bottom */}
              <div className="shrink-0 pb-6 pt-3">
                <div className="relative flex items-center bg-[hsl(0_0%_19%)] border border-[hsl(0_0%_19%)] hover:border-[hsl(0_0%_37%)] rounded-full transition-all focus-within:border-[hsl(0_0%_37%)] focus-within:shadow-[0_1px_6px_0_hsl(0_0%_0%/0.3)]">
                  <input
                    ref={aiInputRef}
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAiMessage(); } }}
                    placeholder="Ask the Oracle anything…"
                    className="flex-1 bg-transparent py-[14px] pl-5 pr-2 text-base text-foreground placeholder:text-muted-foreground/30 focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={sendAiMessage}
                    disabled={!aiInput.trim() || aiStreaming}
                    className="mr-2 p-2 rounded-full bg-primary/20 hover:bg-primary/30 text-foreground/70 transition-all disabled:opacity-20"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══════════════ RESULT STATE — SERP ══════════════ */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 260, damping: 20, mass: 0.8 }}
                className="py-8 space-y-5"
              >
                {/* ADDRESS */}
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-3">
                  <p className="text-[10px] font-semibold text-muted-foreground/35 uppercase tracking-[0.15em]">Address</p>
                  <div className="flex items-baseline gap-3">
                    <h2 className="text-2xl md:text-3xl font-display font-medium text-foreground tracking-wide leading-tight">
                      {result.receipt.triwordFormatted}
                    </h2>
                    <CopyBtn onClick={() => copy(result.receipt.triword, "triword")} copied={copied === "triword"} />
                  </div>

                  {/* IPv6 */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-primary/40 font-semibold shrink-0">IPv6</span>
                    <code className="text-[12px] font-mono text-primary/70 tracking-wide">
                      {result.receipt.ipv6}
                    </code>
                    <CopyBtn onClick={() => copy(result.receipt.ipv6, "ipv6")} copied={copied === "ipv6"} size={10} />
                  </div>

                  {/* CID */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/30 font-semibold shrink-0">CID</span>
                    <code className="text-[11px] font-mono text-muted-foreground/30 break-all leading-relaxed">
                      {result.receipt.cid}
                    </code>
                    <CopyBtn onClick={() => copy(result.receipt.cid, "cid")} copied={copied === "cid"} size={10} />
                  </div>

                  <div className="flex items-center gap-1.5 pt-0.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${result.receipt.engine === "wasm" ? "bg-emerald-400" : "bg-amber-400"}`} />
                    <span className="text-[10px] text-muted-foreground/30 font-mono">
                      {result.receipt.engine === "wasm" ? `wasm ✓ ${result.receipt.crateVersion ?? ""}` : "ts fallback"}
                    </span>
                  </div>
                </motion.div>

                {/* ── Continue / Discuss in Oracle CTA ── */}
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 280, damping: 22, delay: 0.08 }}
                >
                  <button
                    onClick={() => {
                      const src = result.source as Record<string, unknown> | null;
                      const isOracle = src?.["@type"] === "uor:OracleExchange";

                      if (isOracle) {
                        const query = (src?.["uor:query"] as string) ?? "";
                        const response = (src?.["uor:response"] as string) ?? "";
                        setAiMessages([
                          { role: "user", content: query },
                          { role: "assistant", content: response, proof: result.receipt },
                        ]);
                      } else {
                        const summary = JSON.stringify(result.source, null, 2).slice(0, 600);
                        setAiMessages([
                          {
                            role: "user",
                            content: `I discovered this content-addressed object:\n\n\`\`\`json\n${summary}\n\`\`\`\n\nHelp me understand or build on it.`,
                          },
                        ]);
                      }

                      setResult(null);
                      setRederived(false);
                      setAiMode(true);
                      setTimeout(() => aiInputRef.current?.focus(), 150);
                    }}
                    className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/15 hover:border-primary/30 hover:from-primary/25 hover:to-primary/15 text-foreground/85 font-semibold text-sm tracking-wide transition-all group"
                  >
                    <Sparkles className="w-4 h-4 text-primary/70 group-hover:text-primary transition-colors" />
                    {(result.source as Record<string, unknown>)?.["@type"] === "uor:OracleExchange"
                      ? "Continue in Oracle →"
                      : "Discuss in Oracle →"}
                  </button>
                </motion.div>

                <div className="border-t border-border/10" />

                {/* CONTENT */}
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold text-muted-foreground/35 uppercase tracking-[0.15em]">Content</p>
                    <CopyBtn onClick={() => copy(JSON.stringify(result.source, null, 2), "json")} copied={copied === "json"} label="Copy" />
                  </div>
                  <pre className="text-sm font-mono text-foreground/65 bg-muted/5 rounded-xl p-5 overflow-x-auto max-h-[45vh] overflow-y-auto border border-border/10 leading-relaxed whitespace-pre-wrap break-words">
                    {JSON.stringify(result.source, null, 2)}
                  </pre>
                </motion.div>

                {/* Verify */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }} className="flex items-center gap-3 pt-1">
                  <button onClick={rederive} disabled={loading} className="flex items-center gap-1.5 text-xs text-muted-foreground/30 hover:text-foreground/60 transition-colors disabled:opacity-20">
                    <RotateCcw className="w-3 h-3" /> Verify determinism
                  </button>
                  {rederived && (
                    <motion.span initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} className="text-xs text-emerald-400/60 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Identical
                    </motion.span>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
