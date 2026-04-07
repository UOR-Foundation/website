/**
 * UOR Resolve — Address ↔ Content.
 *
 * Google-search UX: one input, one answer.
 *   Address → Content: paste a triword or CID → see the data
 *   Content → Address: paste JSON → see its deterministic address
 *
 * All computation goes through WASM Rust (uor-foundation crate).
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowLeft, Copy, Check, RotateCcw, ArrowRightLeft } from "lucide-react";
import { loadWasm, engineType, crateVersion } from "@/lib/wasm/uor-bridge";
import { lookupReceipt, computeAndRegister, type EnrichedReceipt } from "@/modules/oracle/lib/receipt-registry";
import { formatTriword, isValidTriword } from "@/lib/uor-triword";
import { toast } from "sonner";

interface Result {
  source: unknown;
  receipt: EnrichedReceipt;
}

const ResolvePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [input, setInput] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [wasmReady, setWasmReady] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [rederived, setRederived] = useState(false);

  // Detect mode from input content
  const looksLikeJson = input.trimStart().startsWith("{") || input.trimStart().startsWith("[");

  useEffect(() => { loadWasm().then(() => setWasmReady(true)); }, []);

  // Auto-resolve from URL params
  useEffect(() => {
    const addr = searchParams.get("w") ?? searchParams.get("cid") ?? searchParams.get("id");
    if (addr) {
      setInput(addr);
      handleResolve(addr);
    }
  }, [searchParams]);

  const handleResolve = async (address: string) => {
    const trimmed = address.trim();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);
    setRederived(false);
    try {
      const entry = lookupReceipt(trimmed);
      if (entry) {
        setResult({ source: entry.source, receipt: entry.receipt });
      } else {
        toast("Address not in session. Paste JSON to create an entry.", { icon: "📝" });
      }
    } catch {
      toast.error("Failed to resolve.");
    } finally {
      setLoading(false);
    }
  };

  const handleEncode = async (jsonStr: string) => {
    setLoading(true);
    setResult(null);
    setRederived(false);
    try {
      const parsed = JSON.parse(jsonStr);
      const receipt = await computeAndRegister(parsed);
      setResult({ source: parsed, receipt });
      setInput(receipt.triword);
    } catch {
      toast.error("Invalid JSON.");
    } finally {
      setLoading(false);
    }
  };

  const submit = () => {
    if (looksLikeJson) handleEncode(input);
    else handleResolve(input);
  };

  const rederive = async () => {
    if (!result?.source) return;
    setLoading(true);
    try {
      const receipt = await computeAndRegister(result.source);
      setRederived(receipt.cid === result.receipt.cid);
      toast.success("Deterministic ✓ — identical address.");
    } catch {
      toast.error("Re-derivation failed.");
    } finally {
      setLoading(false);
    }
  };

  const copy = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" style={{ height: "100dvh" }}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-6 h-12 border-b border-border/15 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground/50 hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="font-display font-bold text-foreground text-base tracking-tight">Resolve</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${wasmReady ? "bg-emerald-400" : "bg-amber-400"} animate-pulse`} />
          <span className="text-[11px] text-muted-foreground/40 hidden sm:inline font-mono">
            {wasmReady ? `wasm · ${crateVersion() ?? "ok"}` : "loading…"}
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto px-4 md:px-6">

          {/* ── Search state ── */}
          {!result && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center pt-[20vh]"
            >
              <div className="text-3xl mb-8 opacity-20 select-none tracking-[0.3em]">⠕⠗⠁⠉⠇⠑</div>

              <div className="w-full relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
                  placeholder={looksLikeJson ? "Paste JSON → get its address…" : 'Address or JSON  (e.g. meadow.steep.keep)'}
                  rows={looksLikeJson ? 6 : 2}
                  className="w-full bg-muted/5 border border-border/20 rounded-2xl px-5 py-4 pr-14 text-sm text-foreground font-mono placeholder:text-muted-foreground/20 resize-none focus:outline-none focus:border-primary/25 focus:ring-1 focus:ring-primary/8 transition-all"
                />
                <button
                  onClick={submit}
                  disabled={!input.trim() || loading}
                  className="absolute right-3 top-3 p-2.5 rounded-xl bg-primary text-primary-foreground disabled:opacity-15 hover:bg-primary/90 transition-colors"
                >
                  {looksLikeJson ? <ArrowRightLeft className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                </button>
              </div>

              <p className="text-xs text-muted-foreground/25 mt-4 text-center">
                {looksLikeJson ? "Content → Address" : "Address → Content"} · auto-detected
              </p>

              {loading && (
                <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground/30">
                  <div className="w-3.5 h-3.5 border-2 border-primary/25 border-t-primary rounded-full animate-spin" />
                  Computing…
                </div>
              )}
            </motion.div>
          )}

          {/* ── Result ── */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="py-8 space-y-6"
              >
                {/* New search */}
                <button
                  onClick={() => { setResult(null); setRederived(false); setInput(""); }}
                  className="text-xs text-muted-foreground/35 hover:text-foreground/60 transition-colors flex items-center gap-1.5"
                >
                  <Search className="w-3 h-3" /> New search
                </button>

                {/* ADDRESS */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="space-y-2"
                >
                  <p className="text-[10px] font-semibold text-muted-foreground/35 uppercase tracking-[0.15em]">Address</p>

                  <div className="flex items-baseline gap-3">
                    <h2 className="text-2xl md:text-3xl font-serif font-medium text-foreground tracking-wide leading-tight">
                      {result.receipt.triwordFormatted}
                    </h2>
                    <CopyBtn
                      onClick={() => copy(result.receipt.triword, "triword")}
                      copied={copied === "triword"}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <code className="text-[11px] font-mono text-muted-foreground/30 break-all leading-relaxed">
                      {result.receipt.cid}
                    </code>
                    <CopyBtn
                      onClick={() => copy(result.receipt.cid, "cid")}
                      copied={copied === "cid"}
                      size={10}
                    />
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${result.receipt.engine === "wasm" ? "bg-emerald-400" : "bg-amber-400"}`} />
                    <span className="text-[10px] text-muted-foreground/30 font-mono">
                      {result.receipt.engine === "wasm" ? `wasm ✓ ${result.receipt.crateVersion ?? ""}` : "ts fallback"}
                    </span>
                  </div>
                </motion.div>

                {/* Divider */}
                <div className="border-t border-border/10" />

                {/* CONTENT */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold text-muted-foreground/35 uppercase tracking-[0.15em]">Content</p>
                    <CopyBtn
                      onClick={() => copy(JSON.stringify(result.source, null, 2), "json")}
                      copied={copied === "json"}
                      label="Copy"
                    />
                  </div>

                  <pre className="text-sm font-mono text-foreground/65 bg-muted/5 rounded-xl p-5 overflow-x-auto max-h-[45vh] overflow-y-auto border border-border/10 leading-relaxed whitespace-pre-wrap break-words">
                    {JSON.stringify(result.source, null, 2)}
                  </pre>
                </motion.div>

                {/* Re-derive */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-3 pt-2"
                >
                  <button
                    onClick={rederive}
                    disabled={loading}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground/30 hover:text-foreground/60 transition-colors disabled:opacity-20"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Verify determinism
                  </button>
                  {rederived && (
                    <motion.span
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-xs text-emerald-400/60 flex items-center gap-1"
                    >
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

/* ── Tiny copy button ── */
function CopyBtn({ onClick, copied, size = 12, label }: {
  onClick: () => void;
  copied: boolean;
  size?: number;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 text-muted-foreground/25 hover:text-muted-foreground/60 transition-colors"
      title="Copy"
    >
      {copied
        ? <Check size={size} className="text-emerald-400" />
        : <Copy size={size} />
      }
      {label && <span className="text-[10px]">{label}</span>}
    </button>
  );
}

export default ResolvePage;
