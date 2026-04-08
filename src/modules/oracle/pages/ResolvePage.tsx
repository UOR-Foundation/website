/**
 * UOR Search — The address IS the content.
 *
 * Google indexes information. UOR indexes meaning.
 * One input, one answer. Address ↔ Content.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import SearchConstellationBg from "@/modules/oracle/components/SearchConstellationBg";
import uorHexagon from "@/assets/uor-hexagon.png";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowLeft, Copy, Check, RotateCcw, Plus, Sparkles, Send, X, ShieldCheck, Link2, CheckCircle2, Code2, BookOpen, Globe, GitFork } from "lucide-react";
import ReactMarkdown from "react-markdown";
import confetti from "canvas-confetti";
import { loadWasm } from "@/lib/wasm/uor-bridge";
import { encode, lookup, type EnrichedReceipt } from "@/lib/uor-codec";
import { allEntries, lookupReceipt } from "@/modules/oracle/lib/receipt-registry";
import { singleProofHash } from "@/lib/uor-canonical";
import { streamOracle, type Msg } from "@/modules/oracle/lib/stream-oracle";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AddressSocialStats, AddressDiscussion, AddressProvenance } from "@/modules/oracle/components/AddressCommunity";
import { useAuth } from "@/hooks/use-auth";

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

/* ── Canonical concept: near-infinite addressing ── */
const NEAR_INFINITE_CONCEPT = {
  "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
  "@type": "uor:Concept",
  "@id": "uor:concept:near-infinite-addressing",
  "uor:label": "Near-Infinite Addressing",
  "uor:definition": "The UOR framework leverages IPv6 Unique Local Addressing (fd00:0075:6f72::/48) to provide a near-infinite content-addressed namespace. IPv6's 128-bit address space yields ~3.4 × 10³⁸ unique addresses — enough to assign a distinct, deterministic identifier to every discrete semantic object ever conceived. Each address is derived from the SHA-256 hash of canonicalized content, truncated to 128 bits and projected into the ULA range. This creates a decentralized, DNS-independent substrate where every concept, datum, proof, or relationship occupies a stable, collision-resistant coordinate. The result is a programmable semantic web: both humans and AI agents can reference, compose, and verify meaning through universal addresses that are simultaneously routable (Layer 4) and content-verifiable (Layer 1).",
  "uor:properties": {
    "address_space_size": "2¹²⁸ ≈ 3.4 × 10³⁸",
    "prefix": "fd00:0075:6f72::/48",
    "prefix_encoding": "0075:6f72 = 'uor' in ASCII",
    "hash_algorithm": "SHA-256 → 128-bit truncation",
    "addressing_model": "Content-addressed, deterministic, collision-resistant",
    "identity_forms": ["derivation_id (256-bit)", "CID (dag-json/sha2-256)", "IPv6 ULA (128-bit)", "Braille glyph"],
    "key_insight": "Identity and routing converge — what something IS determines where it LIVES in the address space"
  },
  "uor:enables": [
    "Programmable semantics — meaning becomes addressable and composable",
    "Machine-readable semantic web — AI agents navigate via stable addresses",
    "Human-readable semantic web — triword addresses provide intuitive naming",
    "Decentralized identity — no DNS dependency, no central registry",
    "Semantic substrate — a universal coordinate system for knowledge"
  ]
};

interface Result {
  source: unknown;
  receipt: EnrichedReceipt;
  /** Whether this content was already known (confirmed) vs newly discovered */
  isConfirmed?: boolean;
  /** How many times this content has been confirmed */
  confirmations?: number;
  /** When the content was first discovered (ms since epoch) */
  originalTimestamp?: number;
}

/* ── Human-readable content renderer ── */
const HUMAN_LABEL_MAP: Record<string, string> = {
  "@context": "Schema",
  "@type": "Type",
  "@id": "Identifier",
  "uor:label": "Label",
  "uor:definition": "Definition",
  "uor:content": "Content",
  
  "uor:query": "Query",
  "uor:response": "Response",
  "uor:timestamp": "Timestamp",
  "uor:properties": "Properties",
  "uor:enables": "Enables",
  "uor:chainLength": "Chain Length",
  "uor:links": "Links",
  "uor:position": "Position",
  "uor:proofAddress": "Proof Address",
  "uor:proofCid": "Proof CID",
};

function humanLabel(key: string): string {
  return HUMAN_LABEL_MAP[key] ?? key.replace(/^(uor|schema):/, "").replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()).trim();
}

function renderHumanContent(source: unknown): string {
  const src = source as Record<string, unknown> | null;
  if (!src || typeof src !== "object") return String(source);

  const lines: string[] = [];
  for (const [key, value] of Object.entries(src)) {
    if (key === "@context") continue; // skip schema URL in human view
    const label = humanLabel(key);
    if (typeof value === "string") {
      lines.push(`${label}: ${value}`);
    } else if (Array.isArray(value)) {
      lines.push(`${label}:`);
      value.forEach(v => lines.push(`  • ${typeof v === "string" ? v : JSON.stringify(v)}`));
    } else if (typeof value === "object" && value !== null) {
      lines.push(`${label}:`);
      for (const [k, v] of Object.entries(value)) {
        lines.push(`  ${humanLabel(k)}: ${typeof v === "string" ? v : JSON.stringify(v)}`);
      }
    } else {
      lines.push(`${label}: ${String(value)}`);
    }
  }
  return lines.join("\n");
}

function renderHumanView(source: unknown): React.ReactNode {
  const src = source as Record<string, unknown> | null;
  if (!src || typeof src !== "object") {
    return <p className="text-base text-foreground/70">{String(source)}</p>;
  }

  const entries = Object.entries(src).filter(([key]) => key !== "@context");

  return (
    <div className="space-y-4">
      {entries.map(([key, value]) => {
        const label = humanLabel(key);

        // Type badge
        if (key === "@type") {
          const typeStr = String(value).replace(/^uor:/, "");
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-widest text-primary/50">{typeStr}</span>
            </div>
          );
        }

        // Long text (definition, response, content)
        if (typeof value === "string" && value.length > 120) {
          return (
            <div key={key} className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider">{label}</p>
              <p className="text-base text-foreground/75 leading-relaxed">{value}</p>
            </div>
          );
        }

        // Short string
        if (typeof value === "string") {
          return (
            <div key={key} className="flex items-baseline gap-3">
              <span className="text-sm font-medium text-muted-foreground/50 shrink-0">{label}</span>
              <span className="text-base text-foreground/75 font-mono">{value}</span>
            </div>
          );
        }

        // Array — bullet list
        if (Array.isArray(value)) {
          return (
            <div key={key} className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider">{label}</p>
              <ul className="space-y-1 pl-1">
                {value.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="text-primary/40 mt-1.5 shrink-0">•</span>
                    <span className="text-base text-foreground/70 leading-relaxed">
                      {typeof item === "string" ? item : JSON.stringify(item)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        }

        // Nested object — key/value pairs
        if (typeof value === "object" && value !== null) {
          return (
            <div key={key} className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider">{label}</p>
              <div className="space-y-1.5 pl-3 border-l border-border/15">
                {Object.entries(value).map(([k, v]) => (
                  <div key={k} className="flex items-baseline gap-3">
                    <span className="text-sm text-muted-foreground/45 shrink-0">{humanLabel(k)}</span>
                    <span className="text-sm text-foreground/65 font-mono break-all">
                      {typeof v === "string" ? v : JSON.stringify(v)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        // Number / boolean
        return (
          <div key={key} className="flex items-baseline gap-3">
            <span className="text-sm font-medium text-muted-foreground/50 shrink-0">{label}</span>
            <span className="text-base text-foreground/75 font-mono">{String(value)}</span>
          </div>
        );
      })}
    </div>
  );
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

  // Encode mode state
  const [encodeMode, setEncodeMode] = useState(false);
  const [encodeText, setEncodeText] = useState("");
  const encodeRef = useRef<HTMLTextAreaElement>(null);

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
  const [contentViewMode, setContentViewMode] = useState<"human" | "machine">("human");

  // IPFS Inscribe state
  const [inscribing, setInscribing] = useState(false);
  const [inscribeResult, setInscribeResult] = useState<{ ipfsHash: string; gatewayUrl: string } | null>(null);

  // Fork state
  const [forkModalOpen, setForkModalOpen] = useState(false);
  const [forkNote, setForkNote] = useState("");
  const [forking, setForking] = useState(false);
  const { user } = useAuth();

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

  useEffect(() => { loadWasm().then(async () => { setWasmReady(true); const { reEnrichAll } = await import("@/modules/oracle/lib/receipt-registry"); await reEnrichAll(); await encode(NEAR_INFINITE_CONCEPT); }); }, []);
  useEffect(() => { if (!result && !aiMode) inputRef.current?.focus(); }, [result, aiMode]);

  useEffect(() => {
    if (!wasmReady) return;
    const addr = searchParams.get("w") ?? searchParams.get("cid") ?? searchParams.get("id");
    if (addr) { setInput(addr); handleSearch(addr); }
  }, [searchParams, wasmReady]);

  // Auto-scroll AI chat
  useEffect(() => {
    if (aiScrollRef.current) {
      aiScrollRef.current.scrollTop = aiScrollRef.current.scrollHeight;
    }
  }, [aiMessages]);

  /** If a receipt was created with TS fallback but WASM is now ready, re-encode to upgrade */
  const ensureWasmReceipt = async (source: unknown, receipt: EnrichedReceipt): Promise<EnrichedReceipt> => {
    if (receipt.engine === "typescript" && wasmReady) {
      try {
        const upgraded = await encode(source);
        if (upgraded.engine === "wasm") return upgraded;
      } catch { /* keep original */ }
    }
    return receipt;
  };

  const handleSearch = async (address: string) => {
    const trimmed = address.trim();
    if (!trimmed) return;
    setLoading(true); setResult(null); setRederived(false);
    try {
      const entry = lookup(trimmed);
      if (entry) {
        const upgraded = await ensureWasmReceipt(entry.source, entry.receipt);
        setResult({ source: entry.source, receipt: upgraded });
      } else {
        toast("Address not found. Paste content to create an entry.", { icon: "📝" });
      }
    } catch { toast.error("Search failed."); }
    finally { setLoading(false); }
  };

  const submit = () => {
    handleSearch(input);
  };

  const handleEncode = async () => {
    const text = encodeText.trim();
    if (!text) return;
    setLoading(true);
    try {
      const sourceObj = {
        "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
        "@type": "uor:UserContent",
        "uor:content": text,
      };

      // Pre-check: does this content already have an address?
      const proof = await singleProofHash(sourceObj);
      const existing = lookupReceipt(proof.cid);

      if (existing) {
        // Content confirmed — same address, same content
        existing.confirmations = (existing.confirmations || 1) + 1;
        const upgraded = await ensureWasmReceipt(existing.source, existing.receipt);
        setResult({
          source: existing.source,
          receipt: upgraded,
          isConfirmed: true,
          confirmations: existing.confirmations,
          originalTimestamp: existing.createdAt,
        });
        setInput(existing.receipt.triword);
        setEncodeMode(false);
        setEncodeText("");
        toast("Address confirmed.", {
          description: "Same content, same address.",
          icon: "✓",
        });
      } else {
        // New content — address discovered
        const receipt = await encode(sourceObj);
        setResult({
          source: sourceObj,
          receipt,
          isConfirmed: false,
        });
        setInput(receipt.triword);
        setEncodeMode(false);
        setEncodeText("");
        confetti({ particleCount: 60, spread: 55, origin: { y: 0.6 }, colors: ["hsl(142,70%,45%)", "hsl(217,91%,60%)", "hsl(280,65%,60%)"] });
        toast("Address discovered.", { description: receipt.triwordFormatted, icon: "✨" });
      }
    } catch (err) { console.error("[Encode] Failed:", err); toast.error("Encoding failed: " + (err instanceof Error ? err.message : String(err))); }
    finally { setLoading(false); }
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

  const clearResult = () => { setResult(null); setRederived(false); setInput(""); setContentViewMode("human"); setInscribeResult(null); setForkModalOpen(false); setForkNote(""); };

  /** Fork the current result */
  const handleFork = async () => {
    if (!result || !user || forking) return;
    setForking(true);
    try {
      const src = result.source as Record<string, unknown>;
      const forkObj = {
        "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
        "@type": "uor:Fork",
        "uor:forkedFrom": {
          "uor:cid": result.receipt.cid,
          "uor:triword": result.receipt.triword,
          "uor:forkedAt": new Date().toISOString(),
        },
        "uor:content": src,
        ...(forkNote.trim() ? { "uor:forkNote": forkNote.trim() } : {}),
      };

      const forkReceipt = await encode(forkObj);

      // Record fork relationship
      const { error } = await supabase.functions.invoke("address-social", {
        method: "POST",
        body: { action: "fork", parentCid: result.receipt.cid, childCid: forkReceipt.cid, note: forkNote.trim() || null },
      });
      if (error) throw error;

      setForkModalOpen(false);
      setForkNote("");

      // Navigate to the new fork
      setResult({ source: forkObj, receipt: forkReceipt, isConfirmed: false });
      setInput(forkReceipt.triword);
      navigate(`/search?w=${encodeURIComponent(forkReceipt.triword)}`, { replace: true });

      confetti({ particleCount: 40, spread: 45, origin: { y: 0.6 }, colors: ["hsl(142,70%,45%)", "hsl(217,91%,60%)"] });
      toast("Fork created.", { description: forkReceipt.triwordFormatted, icon: "⑂" });
    } catch (err) {
      console.error("[Fork] Failed:", err);
      toast.error("Fork failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setForking(false);
    }
  };

  /** Inscribe the current result to IPFS via Pinata */
  const inscribeToIpfs = async () => {
    if (!result || inscribing) return;
    setInscribing(true);
    try {
      const { data, error } = await supabase.functions.invoke("inscribe-ipfs", {
        body: { source: result.source, receipt: result.receipt },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Inscription failed");
      setInscribeResult({ ipfsHash: data.ipfsHash, gatewayUrl: data.gatewayUrl });
      toast("Inscribed on IPFS.", {
        description: `Hash: ${data.ipfsHash.slice(0, 16)}…`,
        icon: "🌐",
      });
    } catch (err) {
      console.error("[Inscribe] Failed:", err);
      toast.error("IPFS inscription failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setInscribing(false);
    }
  };

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
          let receipt = await encode(proofSource);
          receipt = await ensureWasmReceipt(proofSource, receipt);
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

    // Phase 1 (0–1400ms): improbability counter ticking
    let expIdx = 0;
    const expInterval = setInterval(() => {
      expIdx++;
      if (expIdx < IMPROBABILITY_EXPONENTS.length) {
        setImprobExponent(expIdx);
      } else {
        clearInterval(expInterval);
      }
    }, 180);

    // Phase 2 at 1400ms: side effects
    setTimeout(() => {
      setImprobPhase(2);
      let effectIdx = 0;
      const effectInterval = setInterval(() => {
        setImprobSideEffect(
          IMPROBABILITY_SIDE_EFFECTS[effectIdx % IMPROBABILITY_SIDE_EFFECTS.length]
        );
        effectIdx++;
      }, 1200);

      // Phase 3 at 3800ms: DON'T PANIC
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

        // At 1800ms: set result BEHIND the still-opaque overlay, then fade out
        setTimeout(async () => {
          const upgraded = await ensureWasmReceipt(pick.source, pick.receipt);
          setInput(pick.receipt.triword);
          setResult({ source: pick.source, receipt: upgraded });

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
        }, 1800);
      }, 2400);
    }, 1400);
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
                <p className="text-base md:text-lg font-mono uppercase tracking-[0.25em] text-muted-foreground/40">
                  {improbPhase === 1 ? "Folding dimensions…" : "Traversing the address space…"}
                </p>
                <motion.p
                  key={improbExponent}
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                  className="font-mono text-4xl md:text-5xl font-bold text-primary/70"
                >
                  {IMPROBABILITY_EXPONENTS[improbExponent] ?? "2^∞"}
                </motion.p>
                <p className="text-sm md:text-base font-mono text-muted-foreground/30 tracking-widest">IMPROBABILITY FACTOR</p>
              </motion.div>
            )}

            {/* Phase 2: side effects */}
            {improbPhase === 2 && improbSideEffect && (
              <motion.p
                key={improbSideEffect}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 0.35, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-10 text-center text-lg md:text-xl italic text-muted-foreground/45 max-w-md px-6 z-10"
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
                  className="text-base text-muted-foreground/35 font-mono"
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

      {/* ── RESULT STATE: Persistent search bar header ── */}
      {result ? (
        <header className="flex items-center justify-center px-4 md:px-6 h-16 shrink-0 border-b border-border/10">
          <div className="w-full max-w-4xl relative">
            <button
              onClick={clearResult}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground/40 hover:text-foreground transition-colors z-10"
              title="Back to search"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); clearResult(); setTimeout(submit, 50); } }}
              placeholder="Search an address…"
              className="w-full bg-muted/10 border border-border/15 rounded-full pl-10 pr-10 py-2.5 text-base font-mono text-foreground placeholder:text-muted-foreground/25 focus:outline-none focus:border-primary/25 focus:ring-1 focus:ring-primary/10 transition-all text-center"
            />
            <button
              onClick={() => { clearResult(); setTimeout(submit, 50); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground/40 hover:text-foreground/60 transition-colors"
              title="Search"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </header>
      ) : null}

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 md:px-12 lg:px-16">

          {/* ══════════════ EMPTY STATE — Homepage ══════════════ */}
          {!result && !aiMode && (
            <div
              className="relative flex flex-col items-center"
              style={{ minHeight: "100dvh", paddingTop: "calc(100dvh * 0.146)" }}
            >
              {/* Logo + Title — stacked, centered, φ gap */}
              <div className="flex flex-col items-center" style={{ gap: "calc(1rem * 1.618)" }}>
                <img
                  src={uorHexagon}
                  alt="UOR"
                  className="select-none drop-shadow-[0_0_16px_hsl(var(--primary)/0.2)]"
                  draggable={false}
                  style={{ width: "calc(3rem * 1.618 * 1.618)", height: "calc(3rem * 1.618 * 1.618)", filter: "none" }}
                />
                <h1
                  className="font-display font-bold tracking-[0.03em] text-foreground select-none leading-[1.1] text-center"
                  style={{ fontSize: "clamp(2.2rem, 5vw, 3.75rem)", maxWidth: "min(618px, 85vw)" }}
                >
                  Universal Object Reference
                </h1>
              </div>

              {/* Search bar — φ spacing from title */}
              <div
                className="w-full relative group"
                style={{ maxWidth: "min(618px, 85vw)", marginTop: "calc(1rem * 1.618 * 1.618)" }}
              >
                {/* Animated border glow — rotating conic gradient, always subtly alive */}
                <div
                  className={`absolute -inset-[1px] transition-opacity duration-700 blur-[0.5px] group-hover:blur-[1px] group-focus-within:blur-[1px] ${encodeMode ? "rounded-[17px]" : "rounded-full"}`}
                  style={{
                    background: "conic-gradient(from var(--search-glow-angle, 0deg), transparent 0%, hsl(var(--primary) / 0.4) 10%, transparent 20%, hsl(var(--primary) / 0.15) 40%, transparent 50%, hsl(45 80% 60% / 0.3) 60%, transparent 70%, hsl(var(--primary) / 0.25) 85%, transparent 100%)",
                    animation: "searchGlowRotate 6s linear infinite",
                    opacity: 0.25,
                  }}
                />
                {/* Outer ambient glow */}
                <div
                  className={`absolute -inset-[3px] opacity-0 group-hover:opacity-60 group-focus-within:opacity-80 transition-opacity duration-1000 blur-lg ${encodeMode ? "rounded-[20px]" : "rounded-full"}`}
                  style={{
                    background: "conic-gradient(from var(--search-glow-angle, 0deg), transparent 0%, hsl(var(--primary) / 0.12) 15%, transparent 30%, hsl(45 70% 55% / 0.1) 55%, transparent 70%, hsl(var(--primary) / 0.08) 90%, transparent 100%)",
                    animation: "searchGlowRotate 6s linear infinite",
                  }}
                />
                <div className="relative z-10 flex items-center bg-[hsl(0_0%_11%/0.92)] backdrop-blur-xl border border-[hsl(0_0%_22%/0.5)] hover:border-[hsl(0_0%_35%/0.7)] transition-all duration-500 focus-within:border-primary/25 shadow-[0_4px_40px_-10px_hsl(0_0%_0%/0.6),inset_0_1px_0_0_hsl(0_0%_100%/0.05),inset_0_-1px_0_0_hsl(0_0%_0%/0.2)] rounded-full">
                  {/* Left + icon — opens encode overlay */}
                  <button
                    onClick={() => setEncodeMode(true)}
                    className="pl-[28px] pr-[10px] py-[17px] text-muted-foreground/50 hover:text-foreground/70 transition-all shrink-0"
                    title="Encode content"
                  >
                    <Plus className="w-5 h-5" />
                  </button>

                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (showSuggestions && suggestions.length > 0) {
                        if (e.key === "ArrowDown") { e.preventDefault(); setSelectedSuggIdx(prev => Math.min(prev + 1, suggestions.length - 1)); return; }
                        if (e.key === "ArrowUp") { e.preventDefault(); setSelectedSuggIdx(prev => Math.max(prev - 1, -1)); return; }
                        if (e.key === "Enter" && selectedSuggIdx >= 0) { e.preventDefault(); pickSuggestion(suggestions[selectedSuggIdx].triword); return; }
                        if (e.key === "Escape") { setShowSuggestions(false); return; }
                      }
                      if (e.key === "Enter") { e.preventDefault(); setShowSuggestions(false); submit(); }
                    }}
                    onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                    onBlur={() => { setTimeout(() => setShowSuggestions(false), 150); }}
                    placeholder=""
                    className="flex-1 bg-transparent py-[17px] px-[6px] text-base text-foreground placeholder:text-muted-foreground/25 focus:outline-none caret-primary"
                  />

                  {/* Right side — separator + AI Mode pill */}
                  <div className="flex items-center gap-[10px] pr-[17px] shrink-0">
                    <div className="w-px h-[28px] bg-[hsl(0_0%_30%)]" />
                    <button
                      onClick={() => setAiMode(true)}
                      className="flex items-center gap-[6px] px-[17px] py-[10px] rounded-full border border-[hsl(0_0%_28%)] hover:bg-[hsl(0_0%_22%)] transition-all"
                    >
                      <Sparkles className="w-[14px] h-[14px] text-primary/70" />
                      <span className="text-sm font-semibold text-foreground/80 whitespace-nowrap">AI Mode</span>
                    </button>
                  </div>
                </div>

                {/* Autocomplete suggestions dropdown */}
                <AnimatePresence>
                  {showSuggestions && suggestions.length > 0 && !encodeMode && (
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
              <AnimatePresence>
                {!encodeMode && (
                  <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="flex items-center"
                    style={{ marginTop: "calc(1rem * 1.618 * 1.618)", gap: "calc(1rem * 1.618)" }}
                  >
                    <button
                      onClick={submit}
                      disabled={!input.trim() || loading}
                      className="rounded-md bg-[hsl(0_0%_15%)] hover:bg-[hsl(0_0%_22%)] hover:border-[hsl(0_0%_37%)] border border-[hsl(0_0%_22%)] text-base font-semibold text-foreground tracking-wide transition-all disabled:opacity-30"
                      style={{ paddingInline: "calc(1rem * 1.618)", height: "calc(1rem * 1.618 * 1.618)" }}
                    >
                      UOR Search
                    </button>
                    <button
                      onClick={fireImprobabilityDrive}
                      disabled={improbabilityActive || drivePrePhase}
                      className="rounded-md bg-muted/15 hover:bg-muted/25 hover:border-primary/20 border border-border/20 text-base font-semibold text-foreground tracking-wide transition-all disabled:opacity-50"
                      style={{ paddingInline: "calc(1rem * 1.618)", height: "calc(1rem * 1.618 * 1.618)" }}
                    >
                      Surprise Me
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tagline — pinned near bottom */}
              <p
                className="absolute left-0 right-0 text-center text-lg text-foreground/50 select-none tracking-wide"
                style={{ bottom: "calc(1rem * 1.618 * 1.618 * 1.618)" }}
              >
                Searching a{" "}
                <button
                  onClick={async () => {
                    const entry = allEntries().find(e => (e.source as Record<string, unknown>)?.["@id"] === "uor:concept:near-infinite-addressing");
                    if (entry) {
                      setInput(entry.receipt.triword);
                      handleSearch(entry.receipt.triword);
                    } else {
                      const receipt = await encode(NEAR_INFINITE_CONCEPT);
                      setInput(receipt.triword);
                      setResult({ source: NEAR_INFINITE_CONCEPT, receipt });
                    }
                  }}
                  className="text-primary font-semibold hover:text-primary/90 transition-colors cursor-pointer"
                  title="Resolve the canonical definition of near-infinite addressing"
                >
                  near-infinite
                </button>{" "}
                address space.
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
              <div ref={aiScrollRef} className="flex-1 overflow-y-auto space-y-8 pb-6 min-h-0">
                {aiMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center text-center" style={{ paddingTop: "calc(100dvh * 0.236)" }}>
                    <div className="rounded-2xl bg-primary/10 flex items-center justify-center" style={{ width: "calc(1rem * 1.618 * 1.618 * 1.618)", height: "calc(1rem * 1.618 * 1.618 * 1.618)", marginBottom: "calc(1rem * 1.618)" }}>
                      <Sparkles className="w-8 h-8 text-primary/60" />
                    </div>
                    <h2 className="font-display font-semibold text-foreground/80 tracking-[0.06em] uppercase" style={{ fontSize: "clamp(1.4rem, 3vw, 1.8rem)", marginBottom: "calc(0.5rem * 1.618)" }}>
                      Ask the Oracle
                    </h2>
                    <p className="text-base text-muted-foreground/45 leading-relaxed" style={{ maxWidth: "min(480px, 75vw)" }}>
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
                        <div className={`max-w-[88%] ${
                          msg.role === "user"
                            ? "bg-primary/15 rounded-2xl rounded-br-md px-5 py-4"
                            : "prose prose-invert prose-base max-w-none"
                        }`}>
                          {msg.role === "user" ? (
                            <p className="text-base text-foreground/90 leading-relaxed">{msg.content}</p>
                          ) : (
                            <div className="text-base text-foreground/75 leading-[1.75] [&>p]:mb-4 [&>ul]:mb-4 [&>ol]:mb-4 [&>h2]:text-lg [&>h3]:text-base [&>h2]:font-semibold [&>h3]:font-semibold [&>h2]:mt-6 [&>h3]:mt-5">
                              <ReactMarkdown>
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>

                        {/* UOR Proof Card — appears below each completed assistant message */}
                        {hasProof && msg.proof && (
                          <div className="relative mt-3 max-w-[88%] w-full">
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

              {/* AI input bar — styled to match search bar */}
              <div className="shrink-0 pt-3" style={{ paddingBottom: "calc(1rem * 1.618 * 1.618)" }}>
                <div className="relative group">
                  {/* Animated border glow — same as search bar */}
                  <div
                    className="absolute -inset-[1px] rounded-full blur-[0.5px] group-hover:blur-[1px] group-focus-within:blur-[1px] transition-opacity duration-700"
                    style={{
                      background: "conic-gradient(from var(--search-glow-angle, 0deg), transparent 0%, hsl(var(--primary) / 0.4) 10%, transparent 20%, hsl(var(--primary) / 0.15) 40%, transparent 50%, hsl(45 80% 60% / 0.3) 60%, transparent 70%, hsl(var(--primary) / 0.25) 85%, transparent 100%)",
                      animation: "searchGlowRotate 6s linear infinite",
                      opacity: 0.25,
                    }}
                  />
                  <div className="relative z-10 flex items-center bg-[hsl(0_0%_11%/0.92)] backdrop-blur-xl border border-[hsl(0_0%_22%/0.5)] hover:border-[hsl(0_0%_35%/0.7)] transition-all duration-500 focus-within:border-primary/25 shadow-[0_4px_40px_-10px_hsl(0_0%_0%/0.6),inset_0_1px_0_0_hsl(0_0%_100%/0.05),inset_0_-1px_0_0_hsl(0_0%_0%/0.2)] rounded-full">
                    <input
                      ref={aiInputRef}
                      type="text"
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAiMessage(); } }}
                      placeholder="Ask the Oracle anything…"
                      className="flex-1 bg-transparent py-[17px] pl-[28px] pr-[6px] text-base text-foreground placeholder:text-muted-foreground/25 focus:outline-none caret-primary"
                      autoFocus
                    />
                    <button
                      onClick={sendAiMessage}
                      disabled={!aiInput.trim() || aiStreaming}
                      className="mr-[17px] p-[10px] rounded-full text-foreground/60 hover:text-foreground/90 transition-all disabled:opacity-20"
                    >
                      <Send className="w-[18px] h-[18px]" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══════════════ RESULT STATE — SERP ══════════════ */}
          <AnimatePresence>
            {result && (() => {
              const src = result.source as Record<string, unknown> | null;
              const typeRaw = String(src?.["@type"] ?? "Unknown").replace(/^uor:/, "");
              const glyphChars = result.receipt.glyph?.slice(0, 2) || "⠿⠿";
              const triwordParts = result.receipt.triword.split(".");
              const triwordDisplay = triwordParts.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" · ");

              return (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 260, damping: 20, mass: 0.8 }}
                className="space-y-0 pb-24"
                style={{ paddingTop: "calc(100vh * 0.04)" }}
              >
                {/* ═══ 1. PROFILE HEADER ═══ */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 }}
                  className="flex items-start gap-5"
                >
                  {/* Glyph Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-[72px] h-[72px] rounded-full bg-primary/8 border-2 border-primary/20 flex items-center justify-center shadow-[0_0_24px_-6px_hsl(var(--primary)/0.2)]">
                      <span className="text-2xl tracking-widest text-primary/80 font-mono select-none">{glyphChars}</span>
                    </div>
                    {/* Engine status dot */}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background ${result.receipt.engine === "wasm" ? "bg-emerald-400" : "bg-muted-foreground/30"}`} title={result.receipt.engine === "wasm" ? `WASM ${result.receipt.crateVersion ?? ""}` : "TS engine"} />
                  </div>

                  {/* Name + badges */}
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Triword display name */}
                    <div className="flex items-baseline gap-3">
                      <h1 className="text-3xl md:text-4xl font-display font-semibold text-foreground tracking-wide leading-tight truncate">
                        {triwordDisplay}
                      </h1>
                      <CopyBtn onClick={() => copy(result.receipt.triword, "triword")} copied={copied === "triword"} />
                    </div>

                    {/* Type badge + status + timestamp */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.1em] bg-accent/10 text-accent-foreground/70 border border-accent/15">
                        {typeRaw}
                      </span>
                      {result.isConfirmed !== undefined && (
                        result.isConfirmed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.1em] bg-primary/10 text-primary/80 border border-primary/20">
                            <Check className="w-3 h-3" />
                            Confirmed{result.confirmations && result.confirmations > 1 ? ` × ${result.confirmations}` : ""}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.1em] bg-emerald-500/10 text-emerald-400/80 border border-emerald-500/20">
                            <Sparkles className="w-3 h-3" />
                            Discovered
                          </span>
                        )
                      )}
                      {result.originalTimestamp && (
                        <span className="text-xs text-muted-foreground/35">
                          First seen {(() => {
                            const diff = Date.now() - result.originalTimestamp;
                            if (diff < 60000) return "just now";
                            if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
                            if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
                            return `${Math.floor(diff / 86400000)}d ago`;
                          })()}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* ═══ PROVENANCE BANNER (if this is a fork) ═══ */}
                {typeRaw === "Fork" && (src as Record<string, unknown>)?.["uor:forkedFrom"] && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 }}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-primary/15 bg-primary/5"
                    style={{ marginTop: "calc(0.75rem * 1.618)" }}
                  >
                    <GitFork className="w-4 h-4 text-primary/50 shrink-0" />
                    <span className="text-sm text-foreground/60">
                      Forked from{" "}
                      <button
                        onClick={() => {
                          const parent = ((src as Record<string, unknown>)?.["uor:forkedFrom"] as Record<string, unknown>);
                          const parentTriword = parent?.["uor:triword"] as string;
                          const parentCid = parent?.["uor:cid"] as string;
                          const addr = parentTriword || parentCid;
                          if (addr) { setInput(addr); clearResult(); setTimeout(() => handleSearch(addr), 50); }
                        }}
                        className="font-mono text-primary/80 hover:text-primary transition-colors"
                      >
                        {(() => {
                          const parent = ((src as Record<string, unknown>)?.["uor:forkedFrom"] as Record<string, unknown>);
                          const tw = parent?.["uor:triword"] as string;
                          if (tw) return tw.split(".").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" · ");
                          return (parent?.["uor:cid"] as string)?.slice(0, 20) + "…";
                        })()}
                      </button>
                    </span>
                  </motion.div>
                )}

                {/* ═══ 2. SOCIAL STATS + REACTIONS ═══ */}
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 }}
                  className="border-t border-b border-border/10 py-5"
                  style={{ marginTop: "calc(1.5rem * 1.618)" }}
                >
                  <AddressSocialStats cid={result.receipt.cid} onForkClick={() => { if (!user) { toast("Sign in to fork", { icon: "🔒" }); return; } setForkModalOpen(true); }} />
                </motion.div>

                {/* ═══ 3. IDENTITY CARD ═══ */}
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.09 }}
                  style={{ marginTop: "calc(1.5rem * 1.618)" }}
                >
                  <p className="text-xs font-semibold text-primary/60 uppercase tracking-[0.15em] mb-3">Identity</p>
                  <div className="rounded-xl border border-border/15 bg-muted/5 divide-y divide-border/10 overflow-hidden">
                    {/* IPv6 */}
                    <div className="flex items-center justify-between px-5 py-3">
                      <span className="text-xs uppercase tracking-wider text-muted-foreground/50 font-semibold w-16 shrink-0">IPv6</span>
                      <code className="text-sm font-mono text-primary/80 flex-1 truncate mx-3">{result.receipt.ipv6}</code>
                      <CopyBtn onClick={() => copy(result.receipt.ipv6, "ipv6")} copied={copied === "ipv6"} />
                    </div>
                    {/* CID */}
                    <div className="flex items-center justify-between px-5 py-3">
                      <span className="text-xs uppercase tracking-wider text-muted-foreground/50 font-semibold w-16 shrink-0">CID</span>
                      <code className="text-sm font-mono text-foreground/55 flex-1 truncate mx-3">{result.receipt.cid}</code>
                      <CopyBtn onClick={() => copy(result.receipt.cid, "cid")} copied={copied === "cid"} />
                    </div>
                    {/* Triword */}
                    <div className="flex items-center justify-between px-5 py-3">
                      <span className="text-xs uppercase tracking-wider text-muted-foreground/50 font-semibold w-16 shrink-0">Triword</span>
                      <code className="text-sm font-mono text-foreground/55 flex-1 truncate mx-3">{result.receipt.triword}</code>
                      <CopyBtn onClick={() => copy(result.receipt.triword, "triword2")} copied={copied === "triword2"} />
                    </div>
                    {/* Engine */}
                    <div className="flex items-center justify-between px-5 py-3">
                      <span className="text-xs uppercase tracking-wider text-muted-foreground/50 font-semibold w-16 shrink-0">Engine</span>
                      <span className="text-sm font-mono text-foreground/45 flex-1 mx-3">
                        {result.receipt.engine === "wasm" ? `wasm · ${result.receipt.crateVersion ?? ""}` : "typescript"}
                      </span>
                      <div className={`w-2 h-2 rounded-full ${result.receipt.engine === "wasm" ? "bg-emerald-400" : "bg-muted-foreground/20"}`} />
                    </div>
                  </div>
                </motion.div>

                {/* ═══ 4. ACTION BAR ═══ */}
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 }}
                  className="flex items-center gap-3 flex-wrap"
                  style={{ marginTop: "calc(1.5rem * 1.618)" }}
                >
                  {/* Discuss in Oracle */}
                  <button
                    onClick={() => {
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
                        setAiMessages([{ role: "user", content: `I discovered this content-addressed object:\n\n\`\`\`json\n${summary}\n\`\`\`\n\nHelp me understand or build on it.` }]);
                      }
                      setResult(null);
                      setRederived(false);
                      setAiMode(true);
                      setTimeout(() => aiInputRef.current?.focus(), 150);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/20 hover:border-primary/35 text-sm font-semibold text-foreground/85 transition-all shadow-[0_0_16px_-6px_hsl(var(--primary)/0.15)]"
                  >
                    <Sparkles className="w-4 h-4 text-primary" />
                    {src?.["@type"] === "uor:ChainOfProofs" ? "Continue Chain →" : src?.["@type"] === "uor:OracleExchange" ? "Continue in Oracle →" : "Discuss in Oracle →"}
                  </button>

                  {/* Inscribe */}
                  <button
                    onClick={inscribeToIpfs}
                    disabled={inscribing || !!inscribeResult}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border/20 text-sm font-medium text-foreground/60 hover:text-foreground/80 hover:border-border/35 transition-all disabled:opacity-30"
                  >
                    <Globe className="w-4 h-4" />
                    {inscribing ? "Inscribing…" : inscribeResult ? "Inscribed ✓" : "Inscribe on IPFS"}
                  </button>
                  {inscribeResult && (
                    <a href={inscribeResult.gatewayUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary/60 hover:text-primary/90 transition-colors underline underline-offset-2">
                      View on IPFS →
                    </a>
                  )}

                  {/* Verify */}
                  <button
                    onClick={rederive}
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border/20 text-sm font-medium text-foreground/60 hover:text-foreground/80 hover:border-border/35 transition-all disabled:opacity-30"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Verify Integrity
                  </button>
                  {rederived && (
                    <motion.span initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} className="text-sm text-emerald-400/70 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Identical
                    </motion.span>
                  )}
                </motion.div>

                {/* ═══ 5. CONTENT ═══ */}
                {src?.["@type"] === "uor:ChainOfProofs" ? (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-5" style={{ marginTop: "calc(1.5rem * 1.618)" }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Link2 className="w-4 h-4 text-primary/70" />
                        <p className="text-xs font-semibold text-primary/60 uppercase tracking-[0.15em]">Chain of Proofs</p>
                        <span className="text-base text-foreground/50 font-mono">
                          {(src?.["uor:chainLength"] as number) ?? 0} links
                        </span>
                      </div>
                      <div className="flex items-center rounded-full border border-border/20 overflow-hidden">
                        <button onClick={() => setContentViewMode("human")} className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-all ${contentViewMode === "human" ? "bg-primary/15 text-foreground" : "text-muted-foreground/40 hover:text-foreground/60"}`}>
                          <BookOpen className="w-3.5 h-3.5" /> Human
                        </button>
                        <button onClick={() => setContentViewMode("machine")} className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-all ${contentViewMode === "machine" ? "bg-primary/15 text-foreground" : "text-muted-foreground/40 hover:text-foreground/60"}`}>
                          <Code2 className="w-3.5 h-3.5" /> Machine
                        </button>
                      </div>
                    </div>

                    {contentViewMode === "human" ? (
                      <div className="space-y-0">
                        {(((src?.["uor:links"] as Array<Record<string, unknown>>) ?? []).map((link, idx, arr) => (
                          <div key={idx} className="flex items-stretch gap-0">
                            <div className="flex flex-col items-center w-7 shrink-0">
                              <div className="w-3 h-3 rounded-full bg-primary/25 border border-primary/30 mt-3.5 shrink-0" />
                              {idx < arr.length - 1 && <div className="flex-1 w-px bg-primary/15" style={{ minHeight: 12 }} />}
                            </div>
                            <div className="flex-1 border border-border/15 rounded-lg p-4 mb-2.5 space-y-2.5 bg-muted/5">
                              <div className="flex items-center gap-2.5">
                                <span className="text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider">Link {idx + 1}</span>
                                {link["uor:proofAddress"] && (
                                  <button onClick={() => { setInput(link["uor:proofAddress"] as string); clearResult(); setTimeout(() => handleSearch(link["uor:proofAddress"] as string), 50); }} className="text-sm text-primary/60 hover:text-primary/90 transition-colors font-mono">
                                    {link["uor:proofAddress"] as string}
                                  </button>
                                )}
                              </div>
                              {link["uor:query"] && <p className="text-base text-foreground/70 line-clamp-2"><span className="text-foreground/40 font-semibold mr-1.5">Q:</span>{link["uor:query"] as string}</p>}
                              {link["uor:response"] && <p className="text-base text-foreground/55 line-clamp-3"><span className="text-foreground/40 font-semibold mr-1.5">A:</span>{(link["uor:response"] as string).slice(0, 200)}…</p>}
                            </div>
                          </div>
                        )))}
                      </div>
                    ) : (
                      (() => {
                        const links = (src?.["uor:links"] as Array<Record<string, unknown>>) ?? [];
                        const lines: string[] = [`# UOR Chain of Proofs`, ``, `> @type: ${src?.["@type"] ?? "uor:ChainOfProofs"}`, `> chain_length: ${src?.["uor:chainLength"] ?? links.length}`, ``, `---`, ``];
                        links.forEach((link, idx) => {
                          lines.push(`## Link ${idx + 1}`, ``);
                          for (const [key, val] of Object.entries(link)) {
                            const k = key.replace(/^uor:/, "");
                            if (typeof val === "string" && val.length > 300) lines.push(`- **${k}**: "${val.slice(0, 280)}…"`);
                            else if (typeof val === "object" && val !== null) lines.push(`- **${k}**: \`${JSON.stringify(val)}\``);
                            else lines.push(`- **${k}**: ${typeof val === "string" ? `"${val}"` : String(val ?? "—")}`);
                          }
                          lines.push(``);
                        });
                        lines.push(`---`, `<!-- machine-readable UOR artifact • ${new Date().toISOString()} -->`);
                        const markdown = lines.join("\n");

                        return (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono text-muted-foreground/40">.uor.md · {lines.length} lines</span>
                              <CopyBtn onClick={() => copy(markdown, "chain-md")} copied={copied === "chain-md"} label="Copy Markdown" />
                            </div>
                            <div className="rounded-xl border border-border/15 bg-[hsl(var(--muted)/0.08)] overflow-hidden max-h-[55vh] overflow-y-auto" style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', ui-monospace, monospace" }}>
                              <div className="grid" style={{ gridTemplateColumns: "3.5rem 1fr" }}>
                                {lines.map((line, i) => (
                                  <div key={i} className="contents group">
                                    <div className="text-right pr-3 py-[1px] text-muted-foreground/20 text-sm select-none border-r border-border/10 bg-muted/5 leading-relaxed">{i + 1}</div>
                                    <div className="pl-4 pr-4 py-[1px] text-sm leading-relaxed whitespace-pre-wrap break-words">
                                      {line.startsWith("# ") ? <span className="text-primary/80 font-bold">{line}</span> : line.startsWith("## ") ? <span className="text-primary/60 font-semibold">{line}</span> : line.startsWith("> ") ? <span className="text-accent-foreground/50 italic">{line}</span> : line.startsWith("- ") ? (
                                        <span className="text-foreground/65"><span className="text-muted-foreground/40">- </span>{(() => { const m = line.match(/^- \*\*(.+?)\*\*: (.+)$/); if (m) return <><span className="text-primary/50 font-semibold">{m[1]}</span><span className="text-muted-foreground/30">: </span><span className="text-foreground/55">{m[2]}</span></>; return <span>{line.slice(2)}</span>; })()}</span>
                                      ) : line.startsWith("---") ? <span className="text-border/30">{line}</span> : line.startsWith("<!--") ? <span className="text-muted-foreground/20 italic">{line}</span> : <span className="text-foreground/50">{line}</span>}
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
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-4" style={{ marginTop: "calc(1.5rem * 1.618)" }}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-primary/60 uppercase tracking-[0.15em]">Content</p>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center rounded-full border border-border/20 overflow-hidden">
                          <button onClick={() => setContentViewMode("human")} className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-all ${contentViewMode === "human" ? "bg-primary/15 text-foreground" : "text-muted-foreground/40 hover:text-foreground/60"}`}>
                            <BookOpen className="w-3.5 h-3.5" /> Human
                          </button>
                          <button onClick={() => setContentViewMode("machine")} className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-all ${contentViewMode === "machine" ? "bg-primary/15 text-foreground" : "text-muted-foreground/40 hover:text-foreground/60"}`}>
                            <Code2 className="w-3.5 h-3.5" /> Machine
                          </button>
                        </div>
                        <CopyBtn onClick={() => copy(contentViewMode === "machine" ? JSON.stringify(result.source, null, 2) : renderHumanContent(result.source), "json")} copied={copied === "json"} label="Copy" />
                      </div>
                    </div>

                    <AnimatePresence mode="wait">
                      {contentViewMode === "human" ? (
                        <motion.div key="human-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="bg-muted/5 rounded-xl p-6 border border-border/15 space-y-4 max-h-[60vh] overflow-y-auto">
                          {renderHumanView(result.source)}
                        </motion.div>
                      ) : (
                        <motion.div key="machine-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                          {(() => {
                            const raw = JSON.stringify(result.source, null, 2);
                            const lines = raw.split("\n");
                            return (
                              <div className="space-y-2">
                                <span className="text-xs font-mono text-muted-foreground/40">.json · {lines.length} lines</span>
                                <div className="rounded-xl border border-border/15 bg-[hsl(var(--muted)/0.08)] overflow-hidden max-h-[60vh] overflow-y-auto" style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', ui-monospace, monospace" }}>
                                  <div className="grid" style={{ gridTemplateColumns: "3.5rem 1fr" }}>
                                    {lines.map((line, i) => (
                                      <div key={i} className="contents group">
                                        <div className="text-right pr-3 py-[1px] text-muted-foreground/20 text-sm select-none border-r border-border/10 bg-muted/5 leading-relaxed">{i + 1}</div>
                                        <div className="pl-4 pr-4 py-[1px] text-sm leading-relaxed whitespace-pre-wrap break-words">
                                          {line.includes('": "') ? (() => { const m = line.match(/^(\s*)"(.+?)":\s*"(.*)"(,?)$/); if (m) return <span><span className="text-foreground/25">{m[1]}</span><span className="text-primary/60">"{m[2]}"</span><span className="text-muted-foreground/30">: </span><span className="text-foreground/55">"{m[3]}"</span><span className="text-muted-foreground/20">{m[4]}</span></span>; return <span className="text-foreground/55">{line}</span>; })()
                                          : line.includes('": ') ? (() => { const m = line.match(/^(\s*)"(.+?)":\s*(.+)$/); if (m) return <span><span className="text-foreground/25">{m[1]}</span><span className="text-primary/60">"{m[2]}"</span><span className="text-muted-foreground/30">: </span><span className="text-accent-foreground/60">{m[3]}</span></span>; return <span className="text-foreground/55">{line}</span>; })()
                                          : line.trim() === "{" || line.trim() === "}" || line.trim() === "}," || line.trim() === "[" || line.trim() === "]" || line.trim() === "]," ? <span className="text-muted-foreground/30">{line}</span>
                                          : <span className="text-foreground/50">{line}</span>}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* ═══ 6. DISCUSSION ═══ */}
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 }}
                  style={{ marginTop: "calc(1.5rem * 1.618)" }}
                >
                  <AddressDiscussion cid={result.receipt.cid} />
                </motion.div>

              </motion.div>
              );
            })()}
          </AnimatePresence>
        </div>
      </div>
      </div>{/* end main content wrapper */}

      {/* ══════════════ ENCODE OVERLAY ══════════════ */}
      <AnimatePresence>
        {encodeMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] flex items-center justify-center"
            onClick={(e) => { if (e.target === e.currentTarget) { setEncodeMode(false); setEncodeText(""); } }}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-[hsl(0_0%_4%/0.85)] backdrop-blur-md" />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="relative z-10 w-full border border-[hsl(0_0%_18%/0.6)] bg-[hsl(0_0%_7%/0.97)] backdrop-blur-xl rounded-2xl shadow-[0_24px_80px_-12px_hsl(0_0%_0%/0.8),inset_0_1px_0_0_hsl(0_0%_100%/0.04)]"
              style={{ maxWidth: "min(860px, 92vw)", maxHeight: "88vh" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between" style={{ padding: "calc(1.5rem * 1.618) 2.5rem calc(0.5rem * 1.618)" }}>
                <div className="flex items-center" style={{ gap: "calc(0.5rem * 1.618)" }}>
                  <div className="w-2.5 h-2.5 rounded-full bg-primary/60" />
                  <h2 className="text-lg font-display font-semibold text-foreground/90 tracking-[0.1em] uppercase">
                    Encode
                  </h2>
                </div>
                <div className="flex items-center" style={{ gap: "calc(1rem * 1.618)" }}>
                  <span className="text-sm font-mono text-muted-foreground/35 tracking-wide">
                    WASM · URDNA2015 · SHA-256
                  </span>
                  <button
                    onClick={() => { setEncodeMode(false); setEncodeText(""); }}
                    className="text-muted-foreground/40 hover:text-foreground/70 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Editor area */}
              <div style={{ padding: "0 2.5rem", paddingTop: "calc(0.75rem * 1.618)" }}>
                <div className="relative rounded-xl border border-[hsl(0_0%_15%/0.8)] bg-[hsl(0_0%_5%)] overflow-hidden">
                  <div className="flex">
                    {/* Line numbers */}
                    <div className="shrink-0 select-none border-r border-[hsl(0_0%_13%)]" style={{ padding: "1.5rem 0.875rem 1.5rem 1.25rem" }} aria-hidden>
                      {Array.from({ length: Math.max((encodeText.split("\n").length), 16) }, (_, i) => (
                        <div key={i} className="text-sm font-mono text-muted-foreground/20 leading-[1.75] text-right tabular-nums" style={{ minWidth: "1.75rem" }}>
                          {i + 1}
                        </div>
                      ))}
                    </div>
                    {/* Textarea */}
                    <textarea
                      ref={encodeRef}
                      value={encodeText}
                      onChange={(e) => setEncodeText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleEncode(); }
                        if (e.key === "Escape") { setEncodeMode(false); setEncodeText(""); }
                        if (e.key === "Tab") {
                          e.preventDefault();
                          const start = e.currentTarget.selectionStart;
                          const end = e.currentTarget.selectionEnd;
                          const val = e.currentTarget.value;
                          setEncodeText(val.substring(0, start) + "  " + val.substring(end));
                          setTimeout(() => { e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 2; }, 0);
                        }
                      }}
                      placeholder="Paste or type content here…"
                      spellCheck={false}
                      className="flex-1 bg-transparent text-base font-mono text-foreground/80 placeholder:text-muted-foreground/20 focus:outline-none resize-none leading-[1.75] caret-primary"
                      style={{ padding: "1.5rem", minHeight: "calc(16 * 1.75 * 1rem + 3rem)" }}
                      autoFocus
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between" style={{ padding: "calc(1rem * 1.618) 2.5rem" }}>
                <span className="text-sm font-mono text-muted-foreground/35">
                  {encodeText.length > 0 ? `${encodeText.length} chars · ${encodeText.split("\n").length} lines` : "⌘+Enter to encode"}
                </span>
                <div className="flex items-center" style={{ gap: "calc(0.5rem * 1.618)" }}>
                  <button
                    onClick={() => { setEncodeMode(false); setEncodeText(""); }}
                    className="px-5 py-2.5 rounded-lg text-base font-medium text-muted-foreground/45 hover:text-foreground/70 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEncode}
                    disabled={!encodeText.trim() || loading}
                    className="flex items-center gap-2.5 rounded-lg bg-primary/90 hover:bg-primary text-primary-foreground font-semibold text-base tracking-wide transition-all disabled:opacity-30 shadow-[0_0_24px_-4px_hsl(var(--primary)/0.35)]"
                    style={{ paddingInline: "calc(1.25rem * 1.618)", paddingBlock: "calc(0.625rem * 1.618)" }}
                  >
                    <Sparkles className="w-4 h-4" />
                    Encode
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchPage;
