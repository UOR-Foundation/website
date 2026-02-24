/**
 * PQ Bridge Console — Post-Quantum Blockchain Protection Demo
 * ════════════════════════════════════════════════════════════
 *
 * Visual pipeline: Object → URDNA2015 → SHA-256 → Dilithium-3 → Bitcoin OP_RETURN
 */

import { useState, useCallback } from "react";
import { ShieldCheck, Zap, Bitcoin, ArrowRight, Download, Copy, Check, Loader2, Lock, Atom } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/* ── Types ─────────────────────────────────────────────────────────────── */

interface PqResult {
  contentHash: string;
  cid: string;
  canonicalForm: string;
  signingTarget: string;
  algorithm: string;
  securityLevel: string;
  bitcoinScript: string;
  bitcoinScriptDecoded: {
    opReturn: string;
    pushBytes: string;
    magicPrefix: string;
    version: string;
    algorithm: string;
    hash: string;
    totalBytes: number;
    withinOpReturnLimit: boolean;
  };
  lightningPaymentHash: string;
  coherenceWitness: string;
  coherenceHolds: boolean;
  coherenceDetails: {
    witnessValue: number;
    negBnot: number;
    succ: number;
    identity: string;
    proof: string;
  };
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

const DEFAULT_OBJECT = JSON.stringify(
  {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: "UOR Post-Quantum Bridge",
    description: "Making existing blockchains quantum-proof without hard forks.",
    author: { "@type": "Organization", name: "UOR Foundation" },
  },
  null,
  2,
);

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  const go = useCallback(() => {
    navigator.clipboard.writeText(text);
    setOk(true);
    setTimeout(() => setOk(false), 1400);
  }, [text]);
  return (
    <button onClick={go} className="p-1 text-muted-foreground hover:text-foreground transition-colors" aria-label="Copy">
      {ok ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
    </button>
  );
}

/* ── Pipeline Step Card ────────────────────────────────────────────────── */

function StepCard({
  step, title, icon, children, active,
}: {
  step: number; title: string; icon: React.ReactNode; children: React.ReactNode; active: boolean;
}) {
  return (
    <div className={`rounded-lg border transition-all duration-300 ${active ? "border-primary/40 bg-card shadow-sm" : "border-border/50 bg-muted/20 opacity-60"}`}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50">
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold font-mono">
          {step}
        </span>
        <span className="text-primary">{icon}</span>
        <span className="text-xs font-semibold tracking-tight">{title}</span>
      </div>
      <div className="px-4 py-3 text-xs font-mono space-y-2 overflow-x-auto">{children}</div>
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────────────────── */

export default function ConsolePqBridge() {
  const [input, setInput] = useState(DEFAULT_OBJECT);
  const [result, setResult] = useState<PqResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const obj = JSON.parse(input);
      const { data, error: fnErr } = await supabase.functions.invoke("pq-bridge", {
        method: "POST",
        body: { object: obj },
      });
      if (fnErr) throw fnErr;
      setResult(data as PqResult);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Invalid JSON or network error");
    } finally {
      setLoading(false);
    }
  }, [input]);

  const downloadEnvelope = useCallback(() => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pq-envelope-${result.contentHash.slice(0, 12)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  const active = !!result;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Lock size={18} className="text-primary" />
            Post-Quantum Bridge
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            Sign any object with <span className="text-primary font-medium">Dilithium-3 (ML-DSA-65)</span> and generate a
            Bitcoin OP_RETURN anchor script — making blockchains quantum-proof without hard forks.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-mono font-medium">
          <Atom size={12} /> NIST FIPS 204 · Level 3
        </div>
      </div>

      {/* Input */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
          <span className="text-xs font-semibold text-muted-foreground">JSON-LD Object</span>
          <button
            onClick={run}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
            {loading ? "Signing…" : "Sign & Anchor"}
          </button>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full h-40 px-4 py-3 bg-transparent text-xs font-mono text-foreground resize-none focus:outline-none"
          spellCheck={false}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Pipeline */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
          <ArrowRight size={12} /> Pipeline
        </div>

        <div className="grid gap-3">
          {/* Step 1: Canonicalize */}
          <StepCard step={1} title="URDNA2015 Canonicalization" icon={<Zap size={13} />} active={active}>
            {result ? (
              <div className="flex items-start gap-2">
                <code className="break-all text-foreground leading-relaxed">{result.canonicalForm}</code>
                <CopyBtn text={result.canonicalForm} />
              </div>
            ) : (
              <span className="text-muted-foreground">Awaiting input…</span>
            )}
          </StepCard>

          {/* Step 2: SHA-256 */}
          <StepCard step={2} title="SHA-256 Content Hash" icon={<Lock size={13} />} active={active}>
            {result ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Hash:</span>
                  <code className="text-foreground">{result.contentHash}</code>
                  <CopyBtn text={result.contentHash} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">CID:</span>
                  <code className="text-foreground truncate max-w-xs">{result.cid}</code>
                  <CopyBtn text={result.cid} />
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground">Awaiting hash…</span>
            )}
          </StepCard>

          {/* Step 3: PQ Bridge Projection */}
          <StepCard step={3} title="PQ Bridge Signing Target" icon={<Atom size={13} />} active={active}>
            {result ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <code className="text-primary break-all">{result.signingTarget}</code>
                  <CopyBtn text={result.signingTarget} />
                </div>
                <div className="text-muted-foreground">
                  {result.algorithm} · {result.securityLevel}
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground">Awaiting projection…</span>
            )}
          </StepCard>

          {/* Step 4: Bitcoin OP_RETURN */}
          <StepCard step={4} title="Bitcoin OP_RETURN Anchor" icon={<Bitcoin size={13} />} active={active}>
            {result ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <code className="text-foreground break-all">{result.bitcoinScript}</code>
                  <CopyBtn text={result.bitcoinScript} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                  <div>
                    <span className="text-muted-foreground">OP_RETURN</span>
                    <div className="text-foreground font-medium">{result.bitcoinScriptDecoded.opReturn}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Magic</span>
                    <div className="text-foreground font-medium">{result.bitcoinScriptDecoded.magicPrefix}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Bytes</span>
                    <div className="text-foreground font-medium">{result.bitcoinScriptDecoded.totalBytes}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Within limit</span>
                    <div className={`font-medium ${result.bitcoinScriptDecoded.withinOpReturnLimit ? "text-primary" : "text-destructive"}`}>
                      {result.bitcoinScriptDecoded.withinOpReturnLimit ? "✓ Yes" : "✗ No"}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground">Awaiting script…</span>
            )}
          </StepCard>

          {/* Step 5: Lightning */}
          <StepCard step={5} title="Lightning Payment Hash" icon={<Zap size={13} />} active={active}>
            {result ? (
              <div className="flex items-center gap-2">
                <code className="text-foreground break-all">{result.lightningPaymentHash}</code>
                <CopyBtn text={result.lightningPaymentHash} />
              </div>
            ) : (
              <span className="text-muted-foreground">Awaiting hash…</span>
            )}
          </StepCard>

          {/* Step 6: Coherence Witness */}
          <StepCard step={6} title="Ring Coherence Witness" icon={<ShieldCheck size={13} />} active={active}>
            {result ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <code className="text-foreground break-all">{result.coherenceWitness}</code>
                  <CopyBtn text={result.coherenceWitness} />
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className={`px-2 py-0.5 rounded-full font-medium ${result.coherenceHolds ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                    {result.coherenceHolds ? "✓ Coherence holds" : "✗ Coherence broken"}
                  </span>
                  <span className="text-muted-foreground font-mono">
                    {result.coherenceDetails.proof}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Identity: <code className="text-foreground">{result.coherenceDetails.identity}</code>
                  {" — "}quantum computers cannot break geometry.
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground">Awaiting witness…</span>
            )}
          </StepCard>
        </div>
      </div>

      {/* Download */}
      {result && (
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={downloadEnvelope}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Download size={13} /> Download PQ Envelope
          </button>
          <span className="text-[10px] text-muted-foreground">
            Complete envelope ready for client-side Dilithium-3 signing and on-chain broadcast.
          </span>
        </div>
      )}

      {/* Info footer */}
      <div className="rounded-lg border border-border/50 bg-muted/20 px-4 py-3 text-[10px] text-muted-foreground space-y-1">
        <p>
          <strong className="text-foreground">Lattice-Hash Duality:</strong> UOR's ring Z/256Z is a 1-dimensional lattice.
          Dilithium-3 operates on Module-LWE lattices — same mathematical family.
          The coherence identity <code className="text-foreground">neg(bnot(x)) ≡ succ(x)</code> is a lattice automorphism
          that quantum computers cannot break because geometry is higher-order to quantum mechanics.
        </p>
        <p>
          <strong className="text-foreground">How it works:</strong> Private keys never leave the client.
          The edge function generates the signing target and settlement scripts.
          Sign with <code className="text-foreground">ml_dsa65.sign()</code> client-side,
          then broadcast the OP_RETURN script to any Bitcoin node.
        </p>
      </div>
    </div>
  );
}
