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
      onDone: () => setAiStreaming(false),
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
        <div className="max-w-2xl mx-auto px-4 md:px-6">

          {/* ══════════════ EMPTY STATE — Homepage ══════════════ */}
          {!result && !aiMode && (
            <div
              className="flex flex-col items-center"
              style={{ paddingTop: "38.2vh" }}
            >
              {/* Brand wordmark */}
              <h1
                className="font-display font-medium tracking-[0.05em] text-foreground select-none leading-none"
                style={{ fontSize: "clamp(4rem, 8vw, 7rem)" }}
              >
                UOR
              </h1>
              <p className="text-[13px] text-muted-foreground/35 tracking-[0.08em] mt-2 select-none">
                Semantic Web Search
              </p>

              {/* Search bar */}
              <div
                className="w-full max-w-[582px] relative group"
                style={{ marginTop: "calc(3.5rem * 0.618)" }}
              >
                <div className="relative flex items-center bg-[hsl(0_0%_19%)] border border-[hsl(0_0%_19%)] hover:border-[hsl(0_0%_37%)] rounded-full transition-all focus-within:border-[hsl(0_0%_37%)] focus-within:shadow-[0_1px_6px_0_hsl(0_0%_0%/0.3)]">
                  {/* Left + icon */}
                  <button className="pl-4 pr-1 py-[14px] text-muted-foreground/50 hover:text-foreground/70 transition-colors shrink-0">
                    <Plus className="w-5 h-5" />
                  </button>

                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
                    placeholder=""
                    className="flex-1 bg-transparent py-[14px] px-2 text-base text-foreground placeholder:text-muted-foreground/25 focus:outline-none"
                  />

                  {/* Right side — separator + AI Mode pill */}
                  <div className="flex items-center gap-2 pr-2 shrink-0">
                    <div className="w-px h-6 bg-[hsl(0_0%_37%)]" />
                    <button
                      onClick={() => setAiMode(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[hsl(0_0%_30%)] hover:bg-[hsl(0_0%_24%)] transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-primary/70" />
                      <span className="text-xs font-medium text-foreground/80 whitespace-nowrap">AI Mode</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Dual buttons */}
              <div
                className="flex items-center gap-3"
                style={{ marginTop: "calc(2rem * 0.618)" }}
              >
                <button
                  onClick={submit}
                  disabled={!input.trim() || loading}
                  className="px-5 h-9 rounded-[4px] bg-[hsl(0_0%_19%)] hover:bg-[hsl(0_0%_24%)] hover:border-[hsl(0_0%_37%)] border border-transparent text-[14px] font-medium text-foreground transition-all disabled:opacity-30"
                >
                  UOR Search
                </button>
                <button
                  onClick={() => {
                    const entries = allEntries();
                    if (entries.length === 0) {
                      toast("Nothing mapped yet — search something first!", { icon: "🫧" });
                      return;
                    }
                    const pick = entries[Math.floor(Math.random() * entries.length)];

                    // 🎉 Confetti burst
                    const colors = ["#FFD700", "#A855F7", "#3B82F6", "#F472B6", "#34D399"];
                    confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 }, colors, startVelocity: 30, gravity: 0.8, ticks: 120 });
                    setTimeout(() => confetti({ particleCount: 40, spread: 120, origin: { y: 0.5 }, colors, startVelocity: 15, gravity: 0.6, ticks: 100 }), 200);

                    // Playful toast
                    const msg = SURPRISE_MESSAGES[Math.floor(Math.random() * SURPRISE_MESSAGES.length)];
                    toast(msg, { description: pick.receipt.triwordFormatted });

                    // Show result with a brief delay for the confetti moment
                    setTimeout(() => {
                      setInput(pick.receipt.triword);
                      setResult({ source: pick.source, receipt: pick.receipt });
                    }, 400);
                  }}
                  className="px-5 h-9 rounded-[4px] bg-[hsl(0_0%_19%)] hover:bg-[hsl(0_0%_24%)] hover:border-[hsl(0_0%_37%)] border border-transparent text-[14px] font-medium text-foreground transition-all"
                >
                  Surprise Me
                </button>
              </div>

              {/* Address space count */}
              <p className="text-[13px] text-muted-foreground/40 mt-5">
                Searching across <span className="text-foreground/60 font-medium">340 undecillion</span> possible addresses
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
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
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
