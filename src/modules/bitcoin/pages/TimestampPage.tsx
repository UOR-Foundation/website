/**
 * OP_RETURN Timestamping Utility
 * ══════════════════════════════
 *
 * Generates a complete raw Bitcoin transaction template anchoring
 * any UOR certificate to the blockchain via OP_RETURN. Provides
 * field-by-field breakdown, copy-to-clipboard, and live certificate
 * generation from arbitrary JSON-LD input.
 *
 * @module bitcoin/pages/TimestampPage
 */

import { useState, useCallback, useMemo } from "react";
import Layout from "@/modules/core/components/Layout";
import {
  Bitcoin, Copy, Check, Info, ArrowRight, Hash,
  ChevronDown, ChevronUp, AlertTriangle, Shield, Clock,
  FileText, Layers,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/modules/core/ui/tooltip";
import BitcoinNav from "@/modules/bitcoin/components/BitcoinNav";
import { buildOpReturnTx, type TxTemplateOutput, type TxField } from "../lib/tx-template";
import { generateCertificate } from "@/modules/certificate/generate";

/* ── Shared helpers ──────────────────────────────────────────── */

function CopyBtn({ text, label = "Copy" }: { text: string; label?: string }) {
  const [c, setC] = useState(false);
  const h = useCallback(() => {
    navigator.clipboard.writeText(text);
    setC(true);
    setTimeout(() => setC(false), 1400);
  }, [text]);
  return (
    <button onClick={h} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors" aria-label={label}>
      {c ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
      {c ? "Copied" : label}
    </button>
  );
}

function Ref({ label, tip }: { label: string; tip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-0.5 text-xs font-mono text-primary/60 cursor-help border-b border-dotted border-primary/30">
          {label} <Info size={10} />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">{tip}</TooltipContent>
    </Tooltip>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-card p-5 md:p-7 ${className}`}>{children}</div>;
}

/* ── Category styling ────────────────────────────────────────── */

const CATEGORY_STYLES: Record<TxField["category"], { label: string; color: string }> = {
  header:          { label: "Header",          color: "bg-muted text-muted-foreground border-border" },
  input:           { label: "Input",           color: "bg-accent/10 text-accent-foreground border-accent/30" },
  "output-opreturn": { label: "OP_RETURN",     color: "bg-primary/10 text-primary border-primary/30" },
  "output-change": { label: "Change",          color: "bg-secondary/50 text-secondary-foreground border-secondary" },
  footer:          { label: "Footer",          color: "bg-muted text-muted-foreground border-border" },
};

/* ── Example data ────────────────────────────────────────────── */

const EXAMPLE_JSON = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  "name": "UOR Framework Specification",
  "version": "1.0.0",
  "author": "UOR Foundation",
}, null, 2);

/* ── Field row component ─────────────────────────────────────── */

function FieldRow({ field }: { field: TxField }) {
  const style = CATEGORY_STYLES[field.category];
  const isWarning = field.description.startsWith("⚠");

  return (
    <div className="flex items-start gap-3 py-2">
      <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${style.color}`}>
        {style.label}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-bold text-foreground">{field.name}</span>
          <CopyBtn text={field.hex} label="Hex" />
        </div>
        <p className={`text-xs leading-relaxed ${isWarning ? "text-destructive" : "text-muted-foreground"}`}>
          {field.description}
        </p>
        <p className="font-mono text-xs text-foreground/70 break-all mt-0.5 select-all">
          {field.hex.length > 48 ? field.hex.slice(0, 24) + "…" + field.hex.slice(-24) : field.hex}
        </p>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────── */

type InputMode = "hash" | "json";

function TimestampPage() {
  const [mode, setMode] = useState<InputMode>("json");
  const [hexInput, setHexInput] = useState("");
  const [jsonInput, setJsonInput] = useState(EXAMPLE_JSON);
  const [feeSats, setFeeSats] = useState(300);
  const [inputSats, setInputSats] = useState(10000);
  const [txResult, setTxResult] = useState<TxTemplateOutput | null>(null);
  const [certHash, setCertHash] = useState<string | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFields, setShowFields] = useState(false);

  const isValidHex = /^[0-9a-f]{64}$/i.test(hexInput);

  const handleBuild = useCallback(async () => {
    setIsBuilding(true);
    setError(null);
    setTxResult(null);

    try {
      let hash: string;

      if (mode === "hash") {
        if (!isValidHex) throw new Error("Enter a valid 64-char hex SHA-256 hash");
        hash = hexInput.toLowerCase();
      } else {
        // Parse JSON, generate certificate, extract CID hash
        const parsed = JSON.parse(jsonInput);
        const subject = parsed["@type"] || parsed.type || "UOR Object";
        const cert = await generateCertificate(subject, parsed);
        // Extract the hex from the CID — use the sourceHash which is already hex
        hash = cert["cert:sourceHash"];
        setCertHash(hash);
      }

      const result = await buildOpReturnTx({
        identityHash: hash,
        inputSats,
        feeSats,
      });

      setTxResult(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsBuilding(false);
    }
  }, [mode, hexInput, jsonInput, isValidHex, inputSats, feeSats]);

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-20">

          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-mono font-bold mb-4">
              <Bitcoin size={14} />
              OP_RETURN × UOR TIMESTAMP
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
              Timestamping Utility
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Anchor any UOR object to the Bitcoin blockchain. Generate a complete raw transaction
              template with an OP_RETURN output carrying the object's SHA-256 canonical identity —
              an immutable, globally-timestamped proof of existence.
            </p>
          </div>

          <BitcoinNav />

          {/* Input mode toggle */}
          <div className="flex justify-center gap-2 mb-6">
            <button
              onClick={() => setMode("json")}
              className={`px-4 py-2 rounded-xl text-sm font-mono transition-colors border ${
                mode === "json"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              <FileText size={14} className="inline mr-1.5 -mt-0.5" />
              JSON-LD Object
            </button>
            <button
              onClick={() => setMode("hash")}
              className={`px-4 py-2 rounded-xl text-sm font-mono transition-colors border ${
                mode === "hash"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              <Hash size={14} className="inline mr-1.5 -mt-0.5" />
              Raw SHA-256 Hash
            </button>
          </div>

          {/* Input card */}
          <Card className="mb-6">
            {mode === "json" ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <FileText size={16} className="text-primary" />
                  <span className="text-sm font-bold text-foreground">JSON-LD Object</span>
                  <Ref label="URDNA2015" tip="The object will be canonicalized using W3C URDNA2015, then hashed with SHA-256 to produce the identity embedded in the OP_RETURN." />
                </div>
                <textarea
                  value={jsonInput}
                  onChange={e => setJsonInput(e.target.value)}
                  rows={8}
                  className="w-full rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
                  spellCheck={false}
                  placeholder='{"@context": "https://schema.org", "@type": "Thing", ...}'
                />
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Hash size={16} className="text-primary" />
                  <span className="text-sm font-bold text-foreground">SHA-256 Identity Hash</span>
                  <Ref label="SHA-256" tip="The 256-bit SHA-256 hash of an object's URDNA2015 canonical form." />
                </div>
                <input
                  type="text"
                  value={hexInput}
                  onChange={e => setHexInput(e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 64))}
                  placeholder="Enter 64-character hex SHA-256 hash…"
                  className="w-full rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  spellCheck={false}
                />
                {hexInput.length > 0 && !isValidHex && (
                  <p className="text-xs text-destructive mt-2 font-mono">
                    ⚠ Hash must be exactly 64 hex characters ({hexInput.length}/64)
                  </p>
                )}
              </>
            )}

            {/* Fee controls */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-1 block">Input (sats)</label>
                <input
                  type="number"
                  value={inputSats}
                  onChange={e => setInputSats(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-1 block">Fee (sats)</label>
                <input
                  type="number"
                  value={feeSats}
                  onChange={e => setFeeSats(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            {/* Build button */}
            <button
              onClick={handleBuild}
              disabled={isBuilding || (mode === "hash" && !isValidHex)}
              className="mt-5 w-full py-3 rounded-xl bg-primary text-primary-foreground font-mono font-bold text-sm hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isBuilding ? (
                <>
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Building Transaction…
                </>
              ) : (
                <>
                  <Bitcoin size={16} />
                  Generate OP_RETURN Transaction
                </>
              )}
            </button>

            {error && (
              <div className="mt-4 p-3 rounded-xl border border-destructive/30 bg-destructive/5 flex items-start gap-2">
                <AlertTriangle size={14} className="text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive font-mono">{error}</p>
              </div>
            )}
          </Card>

          {/* Pipeline */}
          {txResult && (
            <div className="flex items-center justify-center gap-2 mb-6 text-xs font-mono text-muted-foreground flex-wrap">
              <span className="px-2 py-1 rounded bg-muted border border-border">
                {mode === "json" ? "JSON-LD" : "Hash"}
              </span>
              <ArrowRight size={12} />
              {mode === "json" && (
                <>
                  <span className="px-2 py-1 rounded bg-muted border border-border">URDNA2015</span>
                  <ArrowRight size={12} />
                </>
              )}
              <span className="px-2 py-1 rounded bg-primary/10 border border-primary/30 text-primary font-bold">SHA-256</span>
              <ArrowRight size={12} />
              <span className="px-2 py-1 rounded bg-muted border border-border">OP_RETURN</span>
              <ArrowRight size={12} />
              <span className="px-2 py-1 rounded bg-destructive/10 border border-destructive/30 text-destructive font-bold">₿ Raw Tx</span>
            </div>
          )}

          {/* Result */}
          {txResult && (
            <div className="space-y-6">

              {/* Summary card */}
              <Card>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Shield size={20} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground">Transaction Template</h3>
                    <p className="text-xs text-muted-foreground">
                      {txResult.isTemplate ? "Template — replace placeholders before broadcast" : "Ready for signing"}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-5">
                  <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                    <p className="text-xs font-mono text-muted-foreground mb-1">Size</p>
                    <p className="text-lg font-bold font-mono text-foreground">{txResult.rawTx.length / 2}</p>
                    <p className="text-[10px] text-muted-foreground">bytes</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                    <p className="text-xs font-mono text-muted-foreground mb-1">Fee</p>
                    <p className="text-lg font-bold font-mono text-foreground">{txResult.feeSats}</p>
                    <p className="text-[10px] text-muted-foreground">satoshis</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                    <p className="text-xs font-mono text-muted-foreground mb-1">Change</p>
                    <p className="text-lg font-bold font-mono text-foreground">{txResult.changeSats.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">satoshis</p>
                  </div>
                </div>

                {/* Template txid */}
                <div className="rounded-xl border border-border bg-muted/30 p-4 mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Template Txid</span>
                    <CopyBtn text={txResult.txid} label="Copy Txid" />
                  </div>
                  <p className="font-mono text-sm text-foreground break-all leading-relaxed select-all">{txResult.txid}</p>
                  {txResult.isTemplate && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      ⚠ This txid will change when you replace placeholders with real UTXO data
                    </p>
                  )}
                </div>

                {/* Raw transaction */}
                <div className="rounded-xl border border-border bg-muted/30 p-4 mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Raw Transaction</span>
                    <CopyBtn text={txResult.rawTx} label="Copy Raw Tx" />
                  </div>
                  <p className="font-mono text-xs text-foreground break-all leading-relaxed select-all max-h-32 overflow-y-auto">
                    {txResult.rawTx}
                  </p>
                </div>

                {/* OP_RETURN script only */}
                <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-primary uppercase tracking-wider">OP_RETURN ScriptPubKey</span>
                    <CopyBtn text={txResult.opReturnScript} label="Copy Script" />
                  </div>
                  <p className="font-mono text-sm text-foreground break-all leading-relaxed select-all">{txResult.opReturnScript}</p>
                </div>
              </Card>

              {/* Field-by-field breakdown */}
              <Card>
                <button
                  onClick={() => setShowFields(!showFields)}
                  className="flex items-center gap-2 text-sm font-body text-primary hover:text-primary/80 transition-colors w-full"
                >
                  <Layers size={16} />
                  <span className="font-bold">Field-by-Field Breakdown</span>
                  <span className="text-xs text-muted-foreground ml-1">({txResult.fields.length} fields)</span>
                  <span className="ml-auto">
                    {showFields ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </span>
                </button>

                {showFields && (
                  <div className="mt-4 divide-y divide-border">
                    {txResult.fields.map((field, i) => (
                      <FieldRow key={i} field={field} />
                    ))}
                  </div>
                )}
              </Card>

              {/* Template warning */}
              {txResult.isTemplate && (
                <Card className="border-destructive/20 bg-destructive/[0.03]">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                      <AlertTriangle size={16} className="text-destructive" />
                    </div>
                    <div>
                      <h3 className="font-display text-sm font-bold text-foreground mb-2">Before Broadcasting</h3>
                      <ol className="text-sm text-muted-foreground leading-relaxed space-y-1 list-decimal list-inside">
                        <li>Replace the <strong className="text-foreground">placeholder txid</strong> with a real UTXO you control</li>
                        <li>Replace the <strong className="text-foreground">change scriptPubKey</strong> with your P2WPKH address</li>
                        <li>Sign the transaction with your private key</li>
                        <li>Broadcast via <code className="font-mono text-xs px-1 py-0.5 rounded bg-muted">bitcoin-cli sendrawtransaction</code> or any node</li>
                      </ol>
                    </div>
                  </div>
                </Card>
              )}

              {/* Insight panel */}
              <Card className="border-primary/20 bg-primary/[0.03]">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock size={16} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-bold text-foreground mb-2">Proof of Existence</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Once broadcast and confirmed, this transaction creates an{" "}
                      <strong className="text-foreground">immutable, globally-timestamped</strong> proof
                      that this UOR object existed at a specific moment in time. The Bitcoin blockchain
                      provides the timestamp — no trusted third party, no centralized authority. Anyone
                      can independently verify the OP_RETURN output contains the object's SHA-256 identity
                      and reconstruct the full verification chain:{" "}
                      <code className="font-mono text-xs px-1 py-0.5 rounded bg-muted">
                        Object → URDNA2015 → SHA-256 → OP_RETURN → Block Header
                      </code>
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}

export default TimestampPage;
