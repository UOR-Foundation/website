/**
 * UOR Search — The address IS the content.
 *
 * Google indexes information. UOR indexes meaning.
 * One input, one answer. Address ↔ Content.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import SearchConstellationBg from "@/modules/oracle/components/SearchConstellationBg";
import uorHexagon from "@/assets/uor-hexagon.svg";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowLeft, Copy, Check, RotateCcw, Plus, Sparkles, Send, X, ShieldCheck, Link2, CheckCircle2, Code2, BookOpen } from "lucide-react";
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
function CopyBtn({ onClick, copied, size = 14, label }: {
  onClick: () => void; copied: boolean; size?: number; label?: string;
}) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors" title="Copy">
      {copied ? <Check size={size} className="text-emerald-400" /> : <Copy size={size} />}
      {label && <span className="text-sm">{label}</span>}
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

  // Infinite Improbability Drive state
  const [improbabilityActive, setImprobabilityActive] = useState(false);
  const [improbPhase, setImprobPhase] = useState(0);
  const [improbExponent, setImprobExponent] = useState(0);
  const [improbSideEffect, setImprobSideEffect] = useState("");
  const [drivePrePhase, setDrivePrePhase] = useState(false);
  const [drivePostPhase, setDrivePostPhase] = useState(false);

  // Chain of Proofs state
  const [selectedProofIndices, setSelectedProofIndices] = useState<Set<number>>(new Set());
  const [chainEncoding, setChainEncoding] = useState(false);
  const [chainViewMode, setChainViewMode] = useState<"human" | "machine">("human");

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<Array<{ triword: string; formatted: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggIdx, setSelectedSuggIdx] = useState(-1);

  const looksLikeIpv6 = input.trim().toLowerCase().startsWith("fd00:0075:6f72");

  // Compute suggestions when input changes (triword only, not IPv6)
  useEffect(() => {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed || looksLikeIpv6 || trimmed.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const entries = allEntries();
    const matches = entries
      .filter(e => e.receipt.triword.toLowerCase().includes(trimmed))
      .slice(0, 6)
      .map(e => ({ triword: e.receipt.triword, formatted: e.receipt.triwordFormatted }));
    setSuggestions(matches);
    setShowSuggestions(matches.length > 0);
    setSelectedSuggIdx(-1);
  }, [input]);

  const pickSuggestion = (triword: string) => {
    setInput(triword);
    setShowSuggestions(false);
    handleSearch(triword);
  };

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
    setSelectedProofIndices(new Set());
  };

  const toggleProofIndex = (idx: number) => {
    setSelectedProofIndices(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // Count assistant messages with proofs
  const proofCount = aiMessages.filter(m => m.role === "assistant" && m.proof).length;

  const encodeChain = async (overrideIndices?: Set<number>) => {
    const indices = overrideIndices ?? selectedProofIndices;
    if (indices.size === 0) return;
    setChainEncoding(true);
    try {
      // Get all assistant messages with proofs, map by their position among proof-bearing messages
      const proofMessages = aiMessages
        .map((m, i) => ({ msg: m, originalIdx: i }))
        .filter(({ msg }) => msg.role === "assistant" && msg.proof);

      const selected = [...indices].sort().map(i => proofMessages[i]);
      if (selected.length === 0) return;

      // Find the user query preceding each assistant message
      const links = selected.map(({ msg, originalIdx }, linkIdx) => {
        // Walk backwards to find the user message
        let query = "";
        for (let j = originalIdx - 1; j >= 0; j--) {
          if (aiMessages[j].role === "user") {
            query = aiMessages[j].content;
            break;
          }
        }
        return {
          "@type": "uor:ProofOfThought",
          "uor:position": linkIdx,
          "uor:query": query,
          "uor:response": msg.content,
          "uor:proofAddress": msg.proof?.triword ?? "",
          "uor:proofCid": msg.proof?.cid ?? "",
        };
      });

      const chainSource = {
        "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
        "@type": "uor:ChainOfProofs",
        "uor:links": links,
        "uor:chainLength": links.length,
        "uor:timestamp": new Date().toISOString(),
      };

      const receipt = await encode(chainSource);
      navigator.clipboard.writeText(receipt.triword);
      toast.success("Chain address copied!", {
        description: receipt.triwordFormatted,
        icon: "🔗",
      });
      setSelectedProofIndices(new Set());
    } catch (e) {
      console.warn("[Chain] Encoding failed:", e);
      toast.error("Chain encoding failed.");
    } finally {
      setChainEncoding(false);
    }
  };

  /* ── Infinite Improbability Drive — playful & light ── */
  const fireImprobabilityDrive = () => {
    const entries = allEntries();
    if (entries.length === 0) {
      toast("Nothing mapped yet. Search something first!", { icon: "🫧" });
      return;
    }

    const pick = entries[Math.floor(Math.random() * entries.length)];

    // Immediately show overlay (covers search screen completely)
    setImprobExponent(0);
    setImprobSideEffect("");
    setImprobabilityActive(true);
    setImprobPhase(1);

    // Phase 1 (0–800ms): improbability counter ticking
    let expIdx = 0;
    const expInterval = setInterval(() => {
      expIdx++;
      if (expIdx < IMPROBABILITY_EXPONENTS.length) {
        setImprobExponent(expIdx);
      } else {
        clearInterval(expInterval);
      }
    }, 110);

    // Phase 2 at 800ms: side effects
    setTimeout(() => {
      setImprobPhase(2);
      let effectIdx = 0;
      const effectInterval = setInterval(() => {
        setImprobSideEffect(
          IMPROBABILITY_SIDE_EFFECTS[effectIdx % IMPROBABILITY_SIDE_EFFECTS.length]
        );
        effectIdx++;
      }, 700);

      // Phase 3 at 2400ms: DON'T PANIC
      setTimeout(() => {
        clearInterval(effectInterval);
        setImprobPhase(3);

        // Gentle confetti
        const root = document.documentElement;
        const cs = getComputedStyle(root);
        const toHex = (v: string) => {
          const el = document.createElement("div");
          el.style.color = `hsl(${v})`;
          document.body.appendChild(el);
          const c = getComputedStyle(el).color;
          el.remove();
          return c;
        };
        const colors = [
          toHex(cs.getPropertyValue("--primary").trim()),
          toHex(cs.getPropertyValue("--accent").trim()),
          toHex(cs.getPropertyValue("--foreground").trim()),
        ];
        confetti({ particleCount: 50, spread: 90, origin: { y: 0.45 }, colors, startVelocity: 18, gravity: 0.5, ticks: 120 });

        // At 1200ms: set result BEHIND the still-opaque overlay, then fade out
        setTimeout(() => {
          setInput(pick.receipt.triword);
          setResult({ source: pick.source, receipt: pick.receipt });

          // Brief pause so React renders the result underneath
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setImprobPhase(4); // triggers fade-out

              const msg = DONT_PANIC_MESSAGES[Math.floor(Math.random() * DONT_PANIC_MESSAGES.length)];
              toast(msg, { description: pick.receipt.triwordFormatted, icon: "🌌" });

              // Cleanup after fade completes
              setTimeout(() => {
                setImprobabilityActive(false);
                setImprobPhase(0);
              }, 700);
            });
          });
        }, 1200);
      }, 1600);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" style={{ height: "100dvh" }}>
      {!result && !aiMode && <SearchConstellationBg />}
      {/* ── Infinite Improbability Drive Overlay ── */}
      <AnimatePresence>
        {improbabilityActive && (
          <motion.div
            key="improbability-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: improbPhase === 4 ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: improbPhase === 4 ? 0.6 : 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background"
          >
            {/* Subtle radial glow — purely decorative on top of solid bg */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: improbPhase === 3
                  ? "radial-gradient(ellipse at center, hsl(var(--primary) / 0.06), transparent)"
                  : "radial-gradient(ellipse at center, hsl(var(--primary) / 0.03), transparent)",
              }}
            />

            {/* Dimensional shape visualization */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {improbPhase === 1 && (
                <motion.svg width="200" height="200" viewBox="0 0 200 200" className="opacity-10">
                  <motion.line
                    x1="30" y1="100" x2="170" y2="100"
                    stroke="hsl(var(--primary))"
                    strokeWidth="0.5"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                  <motion.rect
                    x="50" y="50" width="100" height="100"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="0.3"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
                  />
                </motion.svg>
              )}

              {improbPhase === 2 && (
                <motion.div
                  className="opacity-8"
                  initial={{ scale: 1, rotateY: 0 }}
                  animate={{ scale: [1, 1.05, 0.4], rotateY: [0, 90, 270] }}
                  transition={{ duration: 1.6, ease: [0.23, 1, 0.32, 1], times: [0, 0.5, 1] }}
                  style={{ perspective: "600px", transformStyle: "preserve-3d" }}
                >
                  <div
                    className="w-20 h-20 border border-primary/20 rounded-sm"
                    style={{ transform: "rotateX(20deg) rotateY(40deg)" }}
                  />
                </motion.div>
              )}

              {improbPhase === 3 && (
                <motion.div
                  className="rounded-full"
                  initial={{ width: 6, height: 6, opacity: 0.2 }}
                  animate={{ width: 400, height: 400, opacity: 0 }}
                  transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
                  style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.1), transparent)" }}
                />
              )}
            </div>

            {/* Phase 1 & 2: counter */}
            {(improbPhase === 1 || improbPhase === 2) && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center gap-5 z-10"
              >
                <p className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground/30">
                  {improbPhase === 1 ? "Folding dimensions…" : "Traversing the address space…"}
                </p>
                <motion.p
                  key={improbExponent}
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.1 }}
                  className="font-mono text-2xl md:text-3xl font-bold text-primary/70"
                >
                  {IMPROBABILITY_EXPONENTS[improbExponent] ?? "2^∞"}
                </motion.p>
                <p className="text-[9px] font-mono text-muted-foreground/18 tracking-widest">IMPROBABILITY FACTOR</p>
              </motion.div>
            )}

            {/* Phase 2: side effects */}
            {improbPhase === 2 && improbSideEffect && (
              <motion.p
                key={improbSideEffect}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 0.35, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-8 text-center text-sm italic text-muted-foreground/35 max-w-sm px-6 z-10"
              >
                {improbSideEffect}
              </motion.p>
            )}

            {/* Phase 3: DON'T PANIC */}
            {improbPhase === 3 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 140, damping: 22 }}
                className="flex flex-col items-center gap-3 z-10"
              >
                <h2
                  className="font-display font-bold tracking-wide text-center text-primary/85"
                  style={{ fontSize: "clamp(1.8rem, 6vw, 3.2rem)" }}
                >
                  DON'T PANIC
                </h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.35 }}
                  transition={{ delay: 0.2 }}
                  className="text-xs text-muted-foreground/25 font-mono"
                >
                  Normality restoring…
                </motion.p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col overflow-hidden">

      {/* ── RESULT STATE: Search bar in header ── */}
      {result ? (
        <header className="flex items-center gap-3 px-4 md:px-6 h-16 border-b border-border/15 shrink-0">
          <button onClick={clearResult} className="text-muted-foreground/50 hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); clearResult(); setTimeout(submit, 50); } }}
              className="w-full bg-[hsl(var(--muted)/0.08)] border border-border/15 rounded-full px-4 py-2.5 pr-10 text-base font-mono text-foreground placeholder:text-muted-foreground/20 focus:outline-none focus:border-primary/25 focus:ring-1 focus:ring-primary/8 transition-all"
            />
            <button onClick={() => { clearResult(); setTimeout(submit, 50); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground/40 hover:text-foreground/60 transition-colors">
              <Search className="w-4 h-4" />
            </button>
          </div>
        </header>
      ) : null}

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 md:px-8">

          {/* ══════════════ EMPTY STATE — Homepage ══════════════ */}
          {!result && !aiMode && (
            <div
              className="relative flex flex-col items-center"
              style={{ minHeight: "100dvh", paddingTop: "calc(100dvh * 0.309)" }}
            >
              {/* Logo + Title — stacked, centered, golden ratio */}
              <div className="flex flex-col items-center" style={{ gap: "calc(1.5rem * 0.618)" }}>
                <img
                  src={uorHexagon}
                  alt="UOR"
                  className="w-20 h-20 md:w-24 md:h-24 select-none drop-shadow-[0_0_16px_hsl(var(--primary)/0.2)]"
                  draggable={false}
                  style={{ filter: "none" }}
                />
                <h1
                  className="font-display font-bold tracking-[0.03em] text-foreground select-none leading-[1.1] text-center"
                  style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", maxWidth: "min(520px, 80vw)" }}
                >
                  Universal Object Reference
                </h1>
              </div>

              {/* Search bar — golden ratio spacing from title */}
              <div
                className="w-full relative group"
                style={{ maxWidth: "min(680px, 85vw)", marginTop: "calc(3rem * 0.618)" }}
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
                    onKeyDown={(e) => {
                      if (showSuggestions && suggestions.length > 0) {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setSelectedSuggIdx(prev => Math.min(prev + 1, suggestions.length - 1));
                          return;
                        }
                        if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setSelectedSuggIdx(prev => Math.max(prev - 1, -1));
                          return;
                        }
                        if (e.key === "Enter" && selectedSuggIdx >= 0) {
                          e.preventDefault();
                          pickSuggestion(suggestions[selectedSuggIdx].triword);
                          return;
                        }
                        if (e.key === "Escape") {
                          setShowSuggestions(false);
                          return;
                        }
                      }
                      if (e.key === "Enter") { e.preventDefault(); setShowSuggestions(false); submit(); }
                    }}
                    onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                    onBlur={() => { setTimeout(() => setShowSuggestions(false), 150); }}
                    placeholder=""
                    className="flex-1 bg-transparent py-[18px] px-2 text-base text-foreground placeholder:text-muted-foreground/25 focus:outline-none"
                  />

                  {/* Right side — separator + AI Mode pill */}
                  <div className="flex items-center gap-3 pr-3 shrink-0">
                    <div className="w-px h-7 bg-[hsl(0_0%_30%)]" />
                    <button
                      onClick={() => setAiMode(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-full border border-[hsl(0_0%_28%)] hover:bg-[hsl(0_0%_22%)] transition-all"
                    >
                      <Sparkles className="w-4 h-4 text-primary/70" />
                      <span className="text-base font-semibold text-foreground/80 whitespace-nowrap">AI Mode</span>
                    </button>
                  </div>
                </div>

                {/* Autocomplete suggestions dropdown */}
                <AnimatePresence>
                  {showSuggestions && suggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-border/20 bg-[hsl(0_0%_12%)] backdrop-blur-xl shadow-2xl overflow-hidden z-50"
                    >
                      {suggestions.map((s, i) => {
                        const trimmed = input.trim().toLowerCase();
                        const idx = s.triword.toLowerCase().indexOf(trimmed);
                        const before = s.triword.slice(0, idx);
                        const match = s.triword.slice(idx, idx + trimmed.length);
                        const after = s.triword.slice(idx + trimmed.length);

                        return (
                          <button
                            key={s.triword}
                            onMouseDown={() => pickSuggestion(s.triword)}
                            onMouseEnter={() => setSelectedSuggIdx(i)}
                            className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors ${
                              i === selectedSuggIdx ? "bg-primary/10" : "hover:bg-[hsl(0_0%_16%)]"
                            }`}
                          >
                            <Search className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
                            <span className="text-sm font-mono text-foreground/70">
                              {before}<span className="text-foreground font-semibold">{match}</span>{after}
                            </span>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Dual buttons — golden ratio spacing */}
              <div
                className="flex items-center gap-4"
                style={{ marginTop: "calc(1.85rem * 1.618)" }}
              >
                <button
                  onClick={submit}
                  disabled={!input.trim() || loading}
                  className="px-7 h-12 rounded-md bg-[hsl(0_0%_15%)] hover:bg-[hsl(0_0%_22%)] hover:border-[hsl(0_0%_37%)] border border-[hsl(0_0%_22%)] text-base font-semibold text-foreground tracking-wide transition-all disabled:opacity-30"
                >
                  UOR Search
                </button>
                <button
                  onClick={fireImprobabilityDrive}
                  disabled={improbabilityActive || drivePrePhase}
                  className="px-7 h-12 rounded-md bg-[hsl(0_0%_15%)] hover:bg-[hsl(0_0%_22%)] hover:border-[hsl(0_0%_37%)] border border-[hsl(0_0%_22%)] text-base font-semibold text-foreground tracking-wide transition-all disabled:opacity-50"
                >
                  Surprise Me
                </button>
              </div>

              {/* Tagline — pinned near bottom */}
              <p
                className="absolute left-0 right-0 text-center text-lg text-foreground/50 select-none tracking-wide"
                style={{ bottom: "6vh" }}
              >
                Searching a <span className="text-primary font-semibold">near-infinite</span> address space.
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
                  <button onClick={exitAiMode} className="text-muted-foreground/50 hover:text-foreground transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-5 h-5 text-primary/80" />
                    <span className="text-base font-medium text-foreground/85">UOR Oracle</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  {proofCount >= 2 && (
                    <button
                      onClick={() => {
                        const all = new Set<number>();
                        for (let i = 0; i < proofCount; i++) all.add(i);
                        setSelectedProofIndices(all);
                        setTimeout(() => encodeChain(all), 50);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-muted-foreground/50 hover:text-foreground/70 border border-transparent hover:border-border/25 transition-all"
                      title="Encode entire conversation as a single chain address"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      Chain All
                    </button>
                  )}
                  <button onClick={exitAiMode} className="text-muted-foreground/40 hover:text-foreground/70 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
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

                {(() => {
                  // Track proof index for chain selection
                  let proofIdx = -1;
                  return aiMessages.map((msg, i) => {
                    const hasProof = msg.role === "assistant" && !!msg.proof;
                    if (hasProof) proofIdx++;
                    const currentProofIdx = proofIdx;
                    const isSelected = hasProof && selectedProofIndices.has(currentProofIdx);

                    // Check if the next assistant message also has a proof (for chain connector)
                    const nextProofExists = hasProof && aiMessages.slice(i + 1).some(m => m.role === "assistant" && m.proof);

                    return (
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
                        {hasProof && msg.proof && (
                          <div className="relative mt-2 max-w-[85%] w-full">
                            <motion.div
                              initial={{ opacity: 0, y: 6, scale: 0.97 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ type: "spring", stiffness: 300, damping: 24 }}
                              className="flex items-stretch gap-0"
                            >
                              {/* Chain connector + checkbox column */}
                              {proofCount >= 2 && (
                                <div className="flex flex-col items-center w-8 shrink-0 pt-1">
                                  {/* Always-interactive chain dot */}
                                  <button
                                    onClick={() => toggleProofIndex(currentProofIdx)}
                                    className="transition-all hover:scale-125"
                                    aria-label={isSelected ? "Deselect proof" : "Select proof for chain"}
                                  >
                                    {isSelected ? (
                                      <motion.div
                                        initial={{ scale: 0.5 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", stiffness: 500, damping: 20 }}
                                      >
                                        <CheckCircle2 className="w-4 h-4 text-primary" />
                                      </motion.div>
                                    ) : (
                                      <div className="w-2.5 h-2.5 rounded-full bg-primary/20 border border-primary/15 cursor-pointer hover:bg-primary/40 hover:border-primary/30 transition-colors" />
                                    )}
                                  </button>
                                  {/* Connector line to next proof */}
                                  {nextProofExists && (
                                    <div className="flex-1 w-px bg-primary/10 mt-1" style={{ minHeight: 24 }} />
                                  )}
                                </div>
                              )}

                              {/* Proof card */}
                              <div className={`flex-1 border rounded-xl px-4 py-3 space-y-2 transition-all ${
                                isSelected
                                  ? "border-primary/30 bg-primary/[0.06]"
                                  : "border-primary/10 bg-primary/[0.03]"
                              }`}>
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

                                {/* IPv6 address */}
                                {msg.proof.ipv6 && (
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-[10px] font-mono text-muted-foreground/40 truncate">
                                      {msg.proof.ipv6}
                                    </p>
                                    <CopyBtn
                                      onClick={() => copy(msg.proof!.ipv6, `proof-ipv6-${i}`)}
                                      copied={copied === `proof-ipv6-${i}`}
                                      size={10}
                                    />
                                  </div>
                                )}

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
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}

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

              {/* Floating chain selection bar */}
              <AnimatePresence>
                {selectedProofIndices.size > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    className="shrink-0 mx-auto mb-2"
                  >
                    <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-md">
                      <Link2 className="w-3.5 h-3.5 text-primary/70" />
                      <span className="text-sm font-medium text-foreground/80">
                        {selectedProofIndices.size} proof{selectedProofIndices.size > 1 ? "s" : ""} selected
                      </span>
                      {selectedProofIndices.size < proofCount && (
                        <button
                          onClick={() => {
                            const all = new Set<number>();
                            for (let i = 0; i < proofCount; i++) all.add(i);
                            setSelectedProofIndices(all);
                          }}
                          className="px-3 py-1 rounded-full text-[11px] font-medium text-primary/70 border border-primary/20 hover:bg-primary/10 transition-all"
                        >
                          Select All
                        </button>
                      )}
                      <button
                        onClick={() => encodeChain()}
                        disabled={chainEncoding}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
                      >
                        {chainEncoding ? "Encoding…" : "Copy Chain Address"}
                      </button>
                      <button
                        onClick={() => setSelectedProofIndices(new Set())}
                        className="text-muted-foreground/40 hover:text-foreground/60 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

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
                className="space-y-0"
                style={{ paddingTop: "calc(100vh * 0.06)" }}
              >
                {/* ADDRESS */}
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground/50 uppercase tracking-[0.15em]">Address</p>
                  <div className="flex items-baseline gap-3">
                    <h2 className="text-3xl md:text-4xl font-display font-medium text-foreground tracking-wide leading-tight">
                      {result.receipt.triwordFormatted}
                    </h2>
                    <CopyBtn onClick={() => copy(result.receipt.triword, "triword")} copied={copied === "triword"} />
                  </div>
                </motion.div>

                {/* ── Continue / Discuss in Oracle CTA — prominent at top ── */}
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 280, damping: 22, delay: 0.08 }}
                  style={{ marginTop: "calc(2rem * 1.618)" }}
                >
                  <button
                    onClick={() => {
                      const src = result.source as Record<string, unknown> | null;
                      const isOracle = src?.["@type"] === "uor:OracleExchange";
                      const isChain = src?.["@type"] === "uor:ChainOfProofs";

                      if (isChain) {
                        const links = (src?.["uor:links"] as Array<Record<string, unknown>>) ?? [];
                        const restored: Msg[] = [];
                        for (const link of links) {
                          const q = (link["uor:query"] as string) ?? "";
                          const r = (link["uor:response"] as string) ?? "";
                          if (q) restored.push({ role: "user", content: q });
                          if (r) restored.push({ role: "assistant", content: r });
                        }
                        setAiMessages(restored);
                      } else if (isOracle) {
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
                    className="w-full flex items-center justify-center gap-3 px-7 py-4 rounded-xl bg-gradient-to-r from-primary/25 to-primary/12 border border-primary/20 hover:border-primary/40 hover:from-primary/30 hover:to-primary/18 text-foreground font-bold text-base tracking-wide transition-all group shadow-[0_0_24px_-8px_hsl(var(--primary)/0.15)]"
                  >
                    <Sparkles className="w-5 h-5 text-primary group-hover:text-primary transition-colors" />
                    {(result.source as Record<string, unknown>)?.["@type"] === "uor:ChainOfProofs"
                      ? "Continue Chain in Oracle →"
                      : (result.source as Record<string, unknown>)?.["@type"] === "uor:OracleExchange"
                        ? "Continue in Oracle →"
                        : "Discuss in Oracle →"}
                  </button>
                </motion.div>

                {/* Metadata block — IPv6, CID, engine */}
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-3"
                  style={{ marginTop: "calc(2rem * 1.618)" }}
                >
                  {/* IPv6 */}
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs uppercase tracking-wider text-primary/60 font-semibold shrink-0">IPv6</span>
                    <code className="text-base font-mono text-primary tracking-wide">
                      {result.receipt.ipv6}
                    </code>
                    <CopyBtn onClick={() => copy(result.receipt.ipv6, "ipv6")} copied={copied === "ipv6"} />
                  </div>

                  {/* CID */}
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground/50 font-semibold shrink-0">CID</span>
                    <code className="text-base font-mono text-foreground/60 break-all leading-relaxed">
                      {result.receipt.cid}
                    </code>
                    <CopyBtn onClick={() => copy(result.receipt.cid, "cid")} copied={copied === "cid"} />
                  </div>

                  <div className="flex items-center gap-2 pt-0.5">
                    <div className={`w-2 h-2 rounded-full ${result.receipt.engine === "wasm" ? "bg-emerald-400" : "bg-amber-400"}`} />
                    <span className="text-base text-foreground/50 font-mono">
                      {result.receipt.engine === "wasm" ? `wasm ✓ ${result.receipt.crateVersion ?? ""}` : "ts fallback"}
                    </span>
                  </div>
                </motion.div>

                <div className="border-t border-border/10" style={{ marginTop: "calc(1.5rem * 1.618)" }} />

                {/* CONTENT — Chain of Proofs special rendering */}
                {(result.source as Record<string, unknown>)?.["@type"] === "uor:ChainOfProofs" ? (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="space-y-5" style={{ marginTop: "calc(1.5rem * 1.618)" }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Link2 className="w-4 h-4 text-primary/70" />
                        <p className="text-xs font-semibold text-primary/60 uppercase tracking-[0.15em]">Chain of Proofs</p>
                        <span className="text-base text-foreground/50 font-mono">
                          {((result.source as Record<string, unknown>)?.["uor:chainLength"] as number) ?? 0} links
                        </span>
                      </div>
                      {/* Human / Machine toggle */}
                      <div className="flex items-center rounded-full border border-border/20 overflow-hidden">
                        <button
                          onClick={() => setChainViewMode("human")}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-all ${
                            chainViewMode === "human"
                              ? "bg-primary/15 text-foreground"
                              : "text-muted-foreground/40 hover:text-foreground/60"
                          }`}
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          Human
                        </button>
                        <button
                          onClick={() => setChainViewMode("machine")}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-all ${
                            chainViewMode === "machine"
                              ? "bg-primary/15 text-foreground"
                              : "text-muted-foreground/40 hover:text-foreground/60"
                          }`}
                        >
                          <Code2 className="w-3.5 h-3.5" />
                          Machine
                        </button>
                      </div>
                    </div>

                    {chainViewMode === "human" ? (
                      <div className="space-y-0">
                        {(((result.source as Record<string, unknown>)?.["uor:links"] as Array<Record<string, unknown>>) ?? []).map((link, idx, arr) => (
                          <div key={idx} className="flex items-stretch gap-0">
                            {/* Chain connector column */}
                            <div className="flex flex-col items-center w-7 shrink-0">
                              <div className="w-3 h-3 rounded-full bg-primary/25 border border-primary/30 mt-3.5 shrink-0" />
                              {idx < arr.length - 1 && (
                                <div className="flex-1 w-px bg-primary/15" style={{ minHeight: 12 }} />
                              )}
                            </div>
                            {/* Link card */}
                            <div className="flex-1 border border-border/15 rounded-lg p-4 mb-2.5 space-y-2.5 bg-muted/5">
                              <div className="flex items-center gap-2.5">
                                <span className="text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider">Link {idx + 1}</span>
                                {link["uor:proofAddress"] && (
                                  <button
                                    onClick={() => {
                                      setInput(link["uor:proofAddress"] as string);
                                      clearResult();
                                      setTimeout(() => handleSearch(link["uor:proofAddress"] as string), 50);
                                    }}
                                    className="text-sm text-primary/60 hover:text-primary/90 transition-colors font-mono"
                                  >
                                    {link["uor:proofAddress"] as string}
                                  </button>
                                )}
                              </div>
                              {link["uor:query"] && (
                                <p className="text-base text-foreground/70 line-clamp-2">
                                  <span className="text-foreground/40 font-semibold mr-1.5">Q:</span>
                                  {link["uor:query"] as string}
                                </p>
                              )}
                              {link["uor:response"] && (
                                <p className="text-base text-foreground/55 line-clamp-3">
                                  <span className="text-foreground/40 font-semibold mr-1.5">A:</span>
                                  {(link["uor:response"] as string).slice(0, 200)}…
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Machine view — numbered markdown for AI agents */
                      (() => {
                        const src = result.source as Record<string, unknown>;
                        const links = (src?.["uor:links"] as Array<Record<string, unknown>>) ?? [];
                        const lines: string[] = [
                          `# UOR Chain of Proofs`,
                          ``,
                          `> @type: ${src["@type"] ?? "uor:ChainOfProofs"}`,
                          `> chain_length: ${src["uor:chainLength"] ?? links.length}`,
                          `> proof_address: \`${src["uor:proofAddress"] ?? "—"}\``,
                          ``,
                          `---`,
                          ``,
                        ];
                        links.forEach((link, idx) => {
                          lines.push(`## Link ${idx + 1}`);
                          lines.push(``);
                          const fields: [string, unknown][] = Object.entries(link);
                          for (const [key, val] of fields) {
                            const k = key.replace(/^uor:/, "");
                            if (typeof val === "string" && val.length > 300) {
                              lines.push(`- **${k}**: "${val.slice(0, 280)}…"`);
                            } else if (typeof val === "object" && val !== null) {
                              lines.push(`- **${k}**: \`${JSON.stringify(val)}\``);
                            } else {
                              lines.push(`- **${k}**: ${typeof val === "string" ? `"${val}"` : String(val ?? "—")}`);
                            }
                          }
                          lines.push(``);
                        });
                        lines.push(`---`);
                        lines.push(`<!-- machine-readable UOR artifact • ${new Date().toISOString()} -->`);

                        const markdown = lines.join("\n");

                        return (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono text-muted-foreground/40">.uor.md • {lines.length} lines</span>
                              <CopyBtn onClick={() => copy(markdown, "chain-md")} copied={copied === "chain-md"} label="Copy Markdown" />
                            </div>
                            <div
                              className="rounded-xl border border-border/15 bg-[hsl(var(--muted)/0.08)] overflow-hidden max-h-[55vh] overflow-y-auto"
                              style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', ui-monospace, monospace" }}
                            >
                              <div className="grid" style={{ gridTemplateColumns: "3.5rem 1fr" }}>
                                {lines.map((line, i) => (
                                  <div key={i} className="contents group">
                                    {/* Line number gutter */}
                                    <div className="text-right pr-3 py-[1px] text-muted-foreground/20 text-sm select-none border-r border-border/10 bg-muted/5 leading-relaxed">
                                      {i + 1}
                                    </div>
                                    {/* Line content */}
                                    <div className="pl-4 pr-4 py-[1px] text-sm leading-relaxed whitespace-pre-wrap break-words">
                                      {line.startsWith("# ") ? (
                                        <span className="text-primary/80 font-bold">{line}</span>
                                      ) : line.startsWith("## ") ? (
                                        <span className="text-primary/60 font-semibold">{line}</span>
                                      ) : line.startsWith("> ") ? (
                                        <span className="text-accent-foreground/50 italic">{line}</span>
                                      ) : line.startsWith("- ") ? (
                                        <span className="text-foreground/65">
                                          <span className="text-muted-foreground/40">- </span>
                                          {(() => {
                                            const m = line.match(/^- \*\*(.+?)\*\*: (.+)$/);
                                            if (m) return <><span className="text-primary/50 font-semibold">{m[1]}</span><span className="text-muted-foreground/30">: </span><span className="text-foreground/55">{m[2]}</span></>;
                                            return <span>{line.slice(2)}</span>;
                                          })()}
                                        </span>
                                      ) : line.startsWith("---") ? (
                                        <span className="text-border/30">{line}</span>
                                      ) : line.startsWith("<!--") ? (
                                        <span className="text-muted-foreground/20 italic">{line}</span>
                                      ) : (
                                        <span className="text-foreground/50">{line}</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </motion.div>
                ) : (
                  /* Standard content */
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="space-y-3" style={{ marginTop: "calc(1.5rem * 1.618)" }}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground/50 uppercase tracking-[0.15em]">Content</p>
                      <CopyBtn onClick={() => copy(JSON.stringify(result.source, null, 2), "json")} copied={copied === "json"} label="Copy" />
                    </div>
                    <pre className="text-base font-mono text-foreground/65 bg-muted/5 rounded-xl p-6 overflow-x-auto max-h-[50vh] overflow-y-auto border border-border/15 leading-relaxed whitespace-pre-wrap break-words">
                      {JSON.stringify(result.source, null, 2)}
                    </pre>
                  </motion.div>
                )}

                {/* Verify Integrity */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }} className="flex items-center gap-3" style={{ paddingTop: "calc(1rem * 1.618)" }}>
                  <button onClick={rederive} disabled={loading} className="flex items-center gap-2 text-base text-foreground/50 hover:text-foreground/80 transition-colors disabled:opacity-20">
                    <RotateCcw className="w-4 h-4" /> Verify Integrity
                  </button>
                  {rederived && (
                    <motion.span initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} className="text-base text-emerald-400/70 flex items-center gap-1.5">
                      <Check className="w-4 h-4" /> Identical
                    </motion.span>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      </div>{/* end main content wrapper */}
    </div>
  );
};

export default SearchPage;
