/**
 * UOR Resolve — Content-Addressed Proof Lookup & Universal Encoder/Decoder.
 *
 * Paste a CID, derivation ID, or three-word address → see the original data,
 * all five identity forms, and WASM ring verification. Or paste raw JSON to encode it live.
 *
 * Every computation passes through the WASM Rust ring engine
 * (uor-foundation crate) for algebraic verification.
 */

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowLeft, CheckCircle2, XCircle, Copy, RotateCcw, Layers, Cpu, Hash, Globe, Braces, MapPin } from "lucide-react";
import { loadWasm, engineType, crateVersion, classifyByte, factorize, verifyCriticalIdentity, bytePopcount, byteBasis } from "@/lib/wasm/uor-bridge";
import { singleProofHash, type SingleProofResult } from "@/lib/uor-canonical";
import { lookupReceipt, computeAndRegister, type EnrichedReceipt, type RegistryEntry } from "@/modules/oracle/lib/receipt-registry";
import { canonicalToTriword, formatTriword, triwordBreakdown, isValidTriword, triwordToPrefix } from "@/lib/uor-triword";
import { toast } from "sonner";

/* ── Types ── */

interface ResolveResult {
  source: unknown;
  receipt: EnrichedReceipt;
  fromRegistry: boolean;
}

/* ── Page ── */

const ResolvePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [query, setQuery] = useState(searchParams.get("w") ?? searchParams.get("cid") ?? searchParams.get("id") ?? "");
  const [result, setResult] = useState<ResolveResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [wasmReady, setWasmReady] = useState(false);
  const [mode, setMode] = useState<"resolve" | "encode">("resolve");
  const [encodeInput, setEncodeInput] = useState("");
  const [rederived, setRederived] = useState(false);

  useEffect(() => { loadWasm().then(() => setWasmReady(true)); }, []);

  // Auto-resolve if address was passed via URL
  useEffect(() => {
    const addr = searchParams.get("w") ?? searchParams.get("cid") ?? searchParams.get("id");
    if (addr) {
      setQuery(addr);
      resolve(addr);
    }
  }, [searchParams]);

  /** Resolve a CID, derivation ID, or triword */
  const resolve = async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);
    setRederived(false);

    try {
      // Check registry (handles CID, derivationId, triword)
      const entry = lookupReceipt(trimmed);
      if (entry) {
        setResult({ source: entry.source, receipt: entry.receipt, fromRegistry: true });
      } else {
        // Check if it's a valid triword even if not in registry
        const normalized = trimmed.toLowerCase().replace(/\s*[·]\s*/g, ".").replace(/\s+/g, ".").trim();
        if (isValidTriword(normalized)) {
          const prefix = triwordToPrefix(normalized);
          const breakdown = triwordBreakdown(normalized);
          toast.info(
            `Triword "${formatTriword(normalized)}" maps to hash prefix 0x${prefix?.toUpperCase()}. Not yet in session registry — encode an object to claim this address.`
          );
          setMode("encode");
        } else {
          setMode("encode");
          toast.info("Address not found in session. Paste JSON below to encode it.");
        }
      }
    } catch (e) {
      console.error("Resolve error:", e);
      toast.error("Failed to resolve address.");
    } finally {
      setLoading(false);
    }
  };

  /** Encode raw JSON into a UOR address */
  const encode = async (jsonStr: string) => {
    setLoading(true);
    setResult(null);
    setRederived(false);

    try {
      const parsed = JSON.parse(jsonStr);
      const receipt = await computeAndRegister(parsed);
      setResult({ source: parsed, receipt, fromRegistry: false });
      setQuery(receipt.triword);
      toast.success(`Encoded → ${receipt.triwordFormatted} (${receipt.engine === "wasm" ? "WASM Rust" : "TypeScript"} engine)`);
    } catch (e) {
      console.error("Encode error:", e);
      toast.error("Invalid JSON. Please check your input.");
    } finally {
      setLoading(false);
    }
  };

  /** Re-derive from source to prove determinism */
  const rederive = async () => {
    if (!result?.source) return;
    setLoading(true);
    try {
      const receipt = await computeAndRegister(result.source);
      const matches = receipt.cid === result.receipt.cid;
      setRederived(true);
      if (matches) {
        toast.success("Deterministic ✓ — Same input produced identical address.");
      } else {
        toast.error("Mismatch detected. This should not happen.");
      }
    } catch (e) {
      toast.error("Re-derivation failed.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" style={{ height: "100dvh" }}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-6 h-14 border-b border-border/20 bg-background/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground/60 hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-display font-bold text-foreground text-lg tracking-tight">UOR Resolve</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${wasmReady ? "bg-emerald-400" : "bg-amber-400"} animate-pulse`} />
          <span className="text-xs text-muted-foreground/50 hidden sm:inline">
            {wasmReady ? `WASM · ${crateVersion() ?? "ready"}` : "Loading…"}
          </span>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 md:px-6">

          {/* ── Search / Empty State ── */}
          {!result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              className="flex flex-col items-center pt-[18vh]"
            >
              {/* Glyph */}
              <div className="text-4xl mb-6 opacity-30 select-none">⠕⠗⠁⠉⠇⠑</div>

              {/* Mode tabs */}
              <div className="flex gap-1 mb-6 p-1 rounded-xl bg-muted/10 border border-border/15">
                <button
                  onClick={() => setMode("resolve")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    mode === "resolve" ? "bg-primary/12 text-primary" : "text-muted-foreground/50 hover:text-foreground/70"
                  }`}
                >
                  <Search className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                  Resolve
                </button>
                <button
                  onClick={() => setMode("encode")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    mode === "encode" ? "bg-primary/12 text-primary" : "text-muted-foreground/50 hover:text-foreground/70"
                  }`}
                >
                  <Hash className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                  Encode
                </button>
              </div>

              {mode === "resolve" ? (
                <>
                  <div className="w-full relative">
                    <textarea
                      ref={inputRef}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); resolve(query); } }}
                      placeholder="Paste a CID, derivation ID, or triword (e.g. meadow.steep.keep)…"
                      rows={2}
                      className="resolve-search-input w-full bg-muted/8 border border-border/25 rounded-2xl px-5 py-4 pr-14 text-base text-foreground font-mono placeholder:text-muted-foreground/25 resize-none focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/10 transition-all"
                    />
                    <button
                      onClick={() => resolve(query)}
                      disabled={!query.trim() || loading}
                      className="absolute right-3 top-3 p-2.5 rounded-xl bg-primary text-primary-foreground disabled:opacity-20 hover:bg-primary/90 transition-colors"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground/30 mt-4">
                    Resolve any content-addressed proof by CID, derivation ID, or three-word address.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-full">
                    <textarea
                      value={encodeInput}
                      onChange={(e) => setEncodeInput(e.target.value)}
                      placeholder={'Paste JSON to encode…\n\n{\n  "@type": "example",\n  "name": "Hello"\n}'}
                      rows={8}
                      className="resolve-search-input w-full bg-muted/8 border border-border/25 rounded-2xl px-5 py-4 text-sm text-foreground font-mono placeholder:text-muted-foreground/20 resize-none focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/10 transition-all"
                    />
                    <button
                      onClick={() => encode(encodeInput)}
                      disabled={!encodeInput.trim() || loading}
                      className="mt-3 w-full py-3 rounded-xl bg-primary text-primary-foreground disabled:opacity-20 hover:bg-primary/90 transition-colors text-sm font-medium"
                    >
                      {loading ? "Encoding…" : "Encode via WASM Rust Engine"}
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground/30 mt-4">
                    Object → URDNA2015 → SHA-256 → Triword · CID · Glyph · IPv6 · Ring
                  </p>
                </>
              )}

              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-8 flex items-center gap-2 text-sm text-muted-foreground/40"
                >
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span>Computing canonical identity…</span>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── Result ── */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                className="py-8 space-y-6"
              >
                {/* Back to search */}
                <button
                  onClick={() => { setResult(null); setRederived(false); }}
                  className="text-sm text-muted-foreground/40 hover:text-foreground/70 transition-colors flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" /> New lookup
                </button>

                {/* ── Triword Hero ── */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.02 }}
                  className="resolve-identity-card rounded-2xl border border-primary/15 bg-primary/5 p-6 text-center space-y-3"
                >
                  <div className="flex items-center justify-center gap-2">
                    <MapPin className="w-4 h-4 text-primary/50" />
                    <p className="text-xs font-semibold text-primary/50 uppercase tracking-wider">UOR Address</p>
                  </div>
                  <p className="text-2xl md:text-3xl font-serif font-medium text-foreground tracking-wide">
                    {result.receipt.triwordFormatted}
                  </p>
                  <p className="text-sm font-mono text-muted-foreground/40">{result.receipt.triword}</p>
                  {result.receipt.triwordDimensions && (
                    <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground/40 pt-1">
                      <span><span className="text-primary/50">Observer:</span> {result.receipt.triwordDimensions.observer}</span>
                      <span className="opacity-30">·</span>
                      <span><span className="text-primary/50">Observable:</span> {result.receipt.triwordDimensions.observable}</span>
                      <span className="opacity-30">·</span>
                      <span><span className="text-primary/50">Context:</span> {result.receipt.triwordDimensions.context}</span>
                    </div>
                  )}
                  <button
                    onClick={() => copyToClipboard(result.receipt.triword, "Triword address")}
                    className="inline-flex items-center gap-1.5 text-xs text-primary/40 hover:text-primary/70 transition-colors mt-1"
                  >
                    <Copy className="w-3 h-3" /> Copy address
                  </button>
                </motion.div>

                {/* ── Identity Card ── */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="resolve-identity-card rounded-2xl border border-border/15 bg-muted/5 p-6 space-y-5"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-muted-foreground/50 uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4" /> Identity
                    </p>
                    {result.fromRegistry && (
                      <span className="text-xs text-emerald-400/60 bg-emerald-500/8 px-2 py-0.5 rounded-full">from registry</span>
                    )}
                  </div>

                  <div className="space-y-4">
                    {/* Triword */}
                    <IdentityRow
                      label="Triword"
                      value={result.receipt.triwordFormatted}
                      icon={<MapPin className="w-3.5 h-3.5 text-primary/50" />}
                      onCopy={() => copyToClipboard(result.receipt.triword, "Triword")}
                    />
                    {/* CID */}
                    <IdentityRow
                      label="CID"
                      value={result.receipt.cid}
                      mono
                      onCopy={() => copyToClipboard(result.receipt.cid, "CID")}
                    />
                    {/* Derivation ID */}
                    <IdentityRow
                      label="Derivation"
                      value={result.receipt.derivationId}
                      mono
                      onCopy={() => copyToClipboard(result.receipt.derivationId, "Derivation ID")}
                    />
                    {/* Braille Glyph */}
                    <IdentityRow
                      label="Glyph"
                      value={result.receipt.glyph}
                      onCopy={() => copyToClipboard(result.receipt.glyph, "Glyph")}
                    />
                    {/* IPv6 */}
                    <IdentityRow
                      label="IPv6"
                      value={result.receipt.ipv6}
                      mono
                      icon={<Globe className="w-3.5 h-3.5 text-blue-400/50" />}
                      onCopy={() => copyToClipboard(result.receipt.ipv6, "IPv6")}
                    />
                  </div>
                </motion.div>

                {/* ── WASM Verification ── */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="resolve-identity-card rounded-2xl border border-border/15 bg-muted/5 p-6 space-y-4"
                >
                  <p className="text-sm font-semibold text-muted-foreground/50 uppercase tracking-wider flex items-center gap-2">
                    <Cpu className="w-4 h-4" /> WASM Ring Verification
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <VerifyCell
                      label="Ring Byte"
                      value={`0x${result.receipt.ringByte.toString(16).padStart(2, "0").toUpperCase()}`}
                    />
                    <VerifyCell
                      label="Partition"
                      value={result.receipt.ringPartition}
                    />
                    <VerifyCell
                      label="Factors"
                      value={result.receipt.ringFactors.length > 0 ? result.receipt.ringFactors.join(" × ") : "Prime / 0-1"}
                    />
                    <VerifyCell
                      label="Popcount"
                      value={`${result.receipt.ringPopcount} / 8 bits`}
                    />
                    <VerifyCell
                      label="Critical Identity"
                      value={result.receipt.ringCriticalIdentity ? "Holds ✓" : "Fails ✗"}
                      positive={result.receipt.ringCriticalIdentity}
                    />
                    <VerifyCell
                      label="Basis"
                      value={result.receipt.ringBasis.map(b => `0x${b.toString(16).padStart(2, "0")}`).join(", ")}
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2 border-t border-border/10">
                    <div className={`w-2 h-2 rounded-full ${result.receipt.engine === "wasm" ? "bg-emerald-400" : "bg-amber-400"}`} />
                    <span className="text-sm text-foreground/60">
                      Engine: <span className="font-mono text-foreground/80">
                        {result.receipt.engine === "wasm"
                          ? `uor-foundation ${result.receipt.crateVersion ?? ""} (WASM)`
                          : "TypeScript fallback"
                        }
                      </span>
                    </span>
                  </div>
                </motion.div>

                {/* ── Original Data ── */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="resolve-identity-card rounded-2xl border border-border/15 bg-muted/5 p-6 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-muted-foreground/50 uppercase tracking-wider flex items-center gap-2">
                      <Braces className="w-4 h-4" /> Original Data
                    </p>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(result.source, null, 2), "Source JSON")}
                      className="text-xs text-muted-foreground/40 hover:text-foreground/60 transition-colors flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>

                  <pre className="text-sm font-mono text-foreground/70 bg-background/40 rounded-xl p-4 overflow-x-auto max-h-64 overflow-y-auto border border-border/10 leading-relaxed">
                    {JSON.stringify(result.source, null, 2)}
                  </pre>
                </motion.div>

                {/* ── N-Quads (Canonical Form) ── */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="resolve-identity-card rounded-2xl border border-border/15 bg-muted/5 p-6 space-y-4"
                >
                  <p className="text-sm font-semibold text-muted-foreground/50 uppercase tracking-wider">
                    URDNA2015 Canonical N-Quads
                  </p>
                  <pre className="text-xs font-mono text-foreground/50 bg-background/40 rounded-xl p-4 overflow-x-auto max-h-48 overflow-y-auto border border-border/10 whitespace-pre-wrap break-all leading-relaxed">
                    {result.receipt.nquads || "(empty — atomic value)"}
                  </pre>
                </motion.div>

                {/* ── Re-derive button ── */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center gap-3"
                >
                  <button
                    onClick={rederive}
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl border border-border/20 text-sm text-muted-foreground/60 hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all disabled:opacity-30"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Re-derive to prove determinism
                  </button>
                  {rederived && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-sm text-emerald-400/70 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Deterministic — identical address
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

/* ── Sub-components ── */

function IdentityRow({ label, value, mono, icon, onCopy }: {
  label: string;
  value: string;
  mono?: boolean;
  icon?: React.ReactNode;
  onCopy: () => void;
}) {
  return (
    <div className="group flex items-start gap-3">
      <span className="text-xs text-muted-foreground/40 uppercase tracking-wider w-20 shrink-0 pt-1">{label}</span>
      <div className="flex items-start gap-2 flex-1 min-w-0">
        {icon}
        <span className={`text-sm text-foreground/80 break-all ${mono ? "font-mono" : "font-serif"}`}>{value}</span>
      </div>
      <button
        onClick={onCopy}
        className="opacity-0 group-hover:opacity-60 transition-opacity p-1 rounded hover:bg-muted/20"
        title="Copy"
      >
        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}

function VerifyCell({ label, value, positive }: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl bg-background/30 border border-border/10 px-4 py-3">
      <p className="text-xs text-muted-foreground/40 mb-1">{label}</p>
      <p className={`text-sm font-mono ${positive === true ? "text-emerald-400/80" : positive === false ? "text-red-400/70" : "text-foreground/70"}`}>
        {value}
      </p>
    </div>
  );
}

export default ResolvePage;
