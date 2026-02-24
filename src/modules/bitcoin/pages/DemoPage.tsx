/**
 * End-to-End UOR → Bitcoin Demo
 * ═════════════════════════════
 *
 * Interactive demo showing the full pipeline:
 *   1. User enters a JSON object
 *   2. UOR certificate is generated (URDNA2015 → SHA-256 → boundary → coherence)
 *   3. All three Bitcoin projections are computed from the certificate hash
 *   4. Lightning settlement flow is visualized step-by-step
 */

import { useState, useCallback } from "react";
import Layout from "@/modules/core/components/Layout";
import {
  Bitcoin, Zap, Lock, FileText, Check, Copy, ArrowRight,
  ArrowDown, Shield, Hash, Eye, ChevronDown, ChevronUp,
  Sparkles, Globe, Radio,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/modules/core/ui/tooltip";
import { generateCertificate } from "@/modules/certificate/generate";
import { project } from "@/modules/uns/core/hologram";
import type { ProjectionInput } from "@/modules/uns/core/hologram";
import type { UorCertificate } from "@/modules/certificate/types";

/* ── Helpers ─────────────────────────────────────────────────── */

function CopyBtn({ text, label = "Copy" }: { text: string; label?: string }) {
  const [c, setC] = useState(false);
  const h = useCallback(() => {
    navigator.clipboard.writeText(text);
    setC(true);
    setTimeout(() => setC(false), 1400);
  }, [text]);
  return (
    <button onClick={h} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
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
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">{tip}</TooltipContent>
    </Tooltip>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-card p-5 md:p-7 ${className}`}>{children}</div>;
}

function StepBadge({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">{n}</span>
      <span className="text-sm font-bold text-foreground uppercase tracking-wider">{label}</span>
    </div>
  );
}

function PipelineArrow() {
  return (
    <div className="flex justify-center py-3">
      <ArrowDown size={20} className="text-primary/40" />
    </div>
  );
}

/* ── Default example object ──────────────────────────────────── */

const EXAMPLE_OBJ = {
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  name: "UOR Framework Whitepaper",
  author: "UOR Foundation",
  datePublished: "2025-01-15",
  description: "The Universal Object Reference — a single canonical identity for every digital object.",
};

/* ── Main Component ──────────────────────────────────────────── */

function DemoPage() {
  const [jsonInput, setJsonInput] = useState(JSON.stringify(EXAMPLE_OBJ, null, 2));
  const [cert, setCert] = useState<UorCertificate | null>(null);
  const [projections, setProjections] = useState<Record<string, { value: string; fidelity: string }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [showCert, setShowCert] = useState(false);
  const [preimageRevealed, setPreimageRevealed] = useState(false);

  const run = useCallback(async () => {
    setError(null);
    setLoading(true);
    setStep(0);
    setCert(null);
    setProjections(null);
    setPreimageRevealed(false);

    try {
      const obj = JSON.parse(jsonInput);

      // Step 1: generate certificate
      setStep(1);
      const certificate = await generateCertificate("demo:object", obj);
      setCert(certificate);

      // Step 2: extract hash bytes from CID/canonicalPayload and project
      setStep(2);
      // Extract hex from the certificate's sourceHash or CID
      // We need to re-derive the hash bytes from the canonical payload
      const { singleProofHash } = await import("@/lib/uor-canonical");
      const proof = await singleProofHash(obj);
      const hex = Array.from(proof.hashBytes).map((b: number) => b.toString(16).padStart(2, "0")).join("");

      const input: ProjectionInput = {
        hashBytes: proof.hashBytes,
        cid: proof.cid,
        hex,
      };

      const btc = project(input, "bitcoin");
      const hashlock = project(input, "bitcoin-hashlock");
      const lightning = project(input, "lightning");
      const nostr = project(input, "nostr");
      const nostrNote = project(input, "nostr-note");

      setProjections({
        bitcoin: btc,
        "bitcoin-hashlock": hashlock,
        lightning,
        nostr,
        "nostr-note": nostrNote,
      });

      setStep(3);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [jsonInput]);

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-20">

          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-mono font-bold mb-4">
              <Sparkles size={14} />
              END-TO-END DEMO
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
              Object → Certificate → Bitcoin → Lightning
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Enter any JSON object. Watch as UOR generates a self-verifying certificate,
              projects it into three Bitcoin protocol layers, and demonstrates how revealing
              the canonical form settles a Lightning payment.
            </p>
          </div>

          {/* Step 1: Input */}
          <Card className="mb-2">
            <StepBadge n={1} label="Source Object" />
            <textarea
              value={jsonInput}
              onChange={e => setJsonInput(e.target.value)}
              rows={8}
              className="w-full rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
              spellCheck={false}
            />
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-muted-foreground">
                Any valid JSON. The object is canonicalized via <Ref label="URDNA2015" tip="W3C RDF Dataset Normalization — produces identical N-Quads regardless of key order, whitespace, or prefix expansion." /> then hashed with <Ref label="SHA-256" tip="The same hash function used by Bitcoin. One hash, two protocols, zero translation." />.
              </p>
              <button
                onClick={run}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? "Processing…" : "Generate Certificate →"}
              </button>
            </div>
            {error && (
              <p className="text-xs text-destructive mt-3 font-mono">⚠ {error}</p>
            )}
          </Card>

          {step >= 1 && <PipelineArrow />}

          {/* Step 2: Certificate */}
          {cert && (
            <>
              <Card className="mb-2 border-primary/20">
                <StepBadge n={2} label="UOR Certificate" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="rounded-xl bg-muted/30 border border-border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield size={14} className="text-primary" />
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider">Identity</span>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground break-all mb-1">
                      <span className="text-foreground font-bold">CID:</span> {cert["cert:cid"]}
                    </p>
                    <CopyBtn text={cert["cert:cid"]} label="Copy CID" />
                  </div>
                  <div className="rounded-xl bg-muted/30 border border-border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Hash size={14} className="text-primary" />
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider">Source Hash</span>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground break-all mb-1">
                      {cert["cert:sourceHash"]}
                    </p>
                    <CopyBtn text={cert["cert:sourceHash"]} label="Copy Hash" />
                  </div>
                </div>

                {/* Coherence */}
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Check size={14} className="text-primary" />
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">Coherence Gate</span>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground">
                    <span className="text-primary font-bold">neg(bnot({cert["cert:coherence"].witness}))</span> = {cert["cert:coherence"].negBnot} ≡ <span className="text-primary font-bold">succ({cert["cert:coherence"].witness})</span> = {cert["cert:coherence"].succ}
                    {cert["cert:coherence"].holds ? (
                      <span className="ml-2 text-primary font-bold">✓ HOLDS</span>
                    ) : (
                      <span className="ml-2 text-destructive font-bold">✗ FAILED</span>
                    )}
                  </p>
                </div>

                {/* Boundary */}
                <div className="rounded-xl bg-muted/30 border border-border p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe size={14} className="text-primary" />
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">Boundary</span>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground">
                    Type: <span className="text-foreground">{cert["cert:boundary"].declaredType}</span> · Keys: <span className="text-foreground">{cert["cert:boundary"].keys.join(", ")}</span> · Fields: <span className="text-foreground">{cert["cert:boundary"].fieldCount}</span>
                  </p>
                </div>

                <button
                  onClick={() => setShowCert(!showCert)}
                  className="flex items-center gap-2 text-sm font-body text-primary hover:text-primary/80 transition-colors"
                >
                  {showCert ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  Full Certificate JSON
                </button>
                {showCert && (
                  <div className="mt-3 rounded-xl bg-muted/30 border border-border p-4 relative">
                    <div className="absolute top-2 right-2">
                      <CopyBtn text={JSON.stringify(cert, null, 2)} label="Copy JSON" />
                    </div>
                    <pre className="text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap max-h-96">
                      {JSON.stringify(cert, null, 2)}
                    </pre>
                  </div>
                )}
              </Card>

              <PipelineArrow />
            </>
          )}

          {/* Step 3: Bitcoin Projections */}
          {projections && (
            <>
              <Card className="mb-2">
                <StepBadge n={3} label="Bitcoin Protocol Projections" />
                <p className="text-sm text-muted-foreground mb-5">
                  The same SHA-256 hash from the certificate is projected into three Bitcoin protocol layers.
                  All three are <span className="text-primary font-bold">lossless</span> — they preserve the full 256-bit identity.
                </p>

                <div className="space-y-4">
                  {/* OP_RETURN */}
                  <div className="rounded-xl bg-muted/30 border border-border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText size={14} className="text-primary" />
                      <span className="text-sm font-bold text-foreground">L1: OP_RETURN Commitment</span>
                      <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-mono bg-primary/10 text-primary">On-Chain Timestamp</span>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground break-all mb-2 select-all">{projections.bitcoin.value}</p>
                    <CopyBtn text={projections.bitcoin.value} label="Copy Script" />
                  </div>

                  {/* HTLC */}
                  <div className="rounded-xl bg-muted/30 border border-border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock size={14} className="text-primary" />
                      <span className="text-sm font-bold text-foreground">L1: HTLC Hash Lock</span>
                      <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-mono bg-accent/10 text-accent-foreground">Content-Gated UTXO</span>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground break-all mb-2 select-all">{projections["bitcoin-hashlock"].value}</p>
                    <CopyBtn text={projections["bitcoin-hashlock"].value} label="Copy Script" />
                  </div>

                  {/* Lightning */}
                  <div className="rounded-xl bg-muted/30 border border-border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap size={14} className="text-primary" />
                      <span className="text-sm font-bold text-foreground">L2: Lightning Payment Hash</span>
                      <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-mono bg-destructive/10 text-destructive">BOLT-11</span>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground break-all mb-2 select-all">{projections.lightning.value}</p>
                    <CopyBtn text={projections.lightning.value} label="Copy Tagged Field" />
                  </div>

                  {/* Nostr */}
                  <div className="rounded-xl bg-muted/30 border border-border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Radio size={14} className="text-primary" />
                      <span className="text-sm font-bold text-foreground">Social: Nostr Event ID</span>
                      <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-mono bg-primary/10 text-primary">NIP-01</span>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground break-all mb-1 select-all">{projections.nostr.value}</p>
                    <p className="text-xs font-mono text-muted-foreground break-all mb-2 select-all">{projections["nostr-note"].value}</p>
                    <CopyBtn text={projections["nostr-note"].value} label="Copy note1..." />
                  </div>
                </div>
              </Card>

              <PipelineArrow />

              {/* Step 4: Lightning Settlement Flow */}
              <Card className="border-primary/20 bg-gradient-to-b from-card to-primary/[0.03]">
                <StepBadge n={4} label="Lightning Settlement Flow" />
                <p className="text-sm text-muted-foreground mb-6">
                  A Lightning HTLC is locked to the UOR payment hash. The only way to settle
                  it is to reveal the <strong className="text-foreground">preimage</strong> — which IS the URDNA2015 canonical bytes
                  of the original object. Content delivery = payment settlement.
                </p>

                {/* Settlement visualization */}
                <div className="space-y-4">
                  {/* Step A: Invoice created */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Zap size={16} className="text-primary" />
                    </div>
                    <div className="flex-1 rounded-xl bg-muted/30 border border-border p-4">
                      <p className="text-sm font-bold text-foreground mb-1">Invoice Created</p>
                      <p className="text-xs text-muted-foreground mb-2">
                        Sender creates a Lightning invoice with <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">payment_hash</code> = SHA-256(canonical_bytes).
                        The HTLC route is established across the Lightning Network.
                      </p>
                      <div className="rounded-lg bg-background/60 border border-border p-3">
                        <p className="text-xs font-mono text-muted-foreground break-all">
                          <span className="text-primary font-bold">payment_hash:</span> {projections.nostr.value}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step B: HTLC locked */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <Lock size={16} className="text-accent-foreground" />
                    </div>
                    <div className="flex-1 rounded-xl bg-muted/30 border border-border p-4">
                      <p className="text-sm font-bold text-foreground mb-1">HTLC Locked</p>
                      <p className="text-xs text-muted-foreground">
                        Sats are locked in an HTLC along the route. Each hop holds the condition:
                        <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono ml-1">SHA256(preimage) == payment_hash</code>.
                        The payment is pending until the preimage is revealed.
                      </p>
                    </div>
                  </div>

                  {/* Step C: Preimage reveal */}
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${preimageRevealed ? "bg-primary/20" : "bg-muted"}`}>
                      <Eye size={16} className={preimageRevealed ? "text-primary" : "text-muted-foreground"} />
                    </div>
                    <div className={`flex-1 rounded-xl border p-4 transition-colors ${preimageRevealed ? "bg-primary/5 border-primary/30" : "bg-muted/30 border-border"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-bold text-foreground">Reveal Preimage</p>
                        <button
                          onClick={() => setPreimageRevealed(!preimageRevealed)}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                            preimageRevealed
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted border border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {preimageRevealed ? "✓ Preimage Revealed" : "Reveal Canonical Form"}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        The preimage IS the URDNA2015 canonical N-Quads of the source object.
                        Delivering the content reveals the preimage. Click to simulate.
                      </p>
                      {preimageRevealed && cert && (
                        <div className="rounded-lg bg-background/60 border border-primary/20 p-3 animate-in fade-in duration-300">
                          <p className="text-xs font-mono text-primary font-bold mb-1">preimage (URDNA2015 N-Quads):</p>
                          <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                            {cert["cert:canonicalPayload"]}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step D: Settlement */}
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${preimageRevealed ? "bg-primary" : "bg-muted"}`}>
                      <Check size={16} className={preimageRevealed ? "text-primary-foreground" : "text-muted-foreground"} />
                    </div>
                    <div className={`flex-1 rounded-xl border p-4 transition-all ${preimageRevealed ? "bg-primary/5 border-primary/30" : "bg-muted/20 border-border opacity-50"}`}>
                      <p className="text-sm font-bold text-foreground mb-1">
                        {preimageRevealed ? "⚡ Payment Settled!" : "Awaiting Preimage…"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {preimageRevealed ? (
                          <>
                            <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">SHA256(canonical_bytes)</code> =={" "}
                            <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">payment_hash</code>.
                            Every hop in the HTLC chain settles atomically. The sender received the content,
                            the recipient received the sats. <strong className="text-primary">Content delivery IS payment settlement.</strong>
                          </>
                        ) : (
                          "The HTLC chain remains locked until the canonical form is revealed."
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Insight: Cross-protocol alignment */}
              <div className="mt-6">
                <Card className="border-primary/20 bg-primary/[0.02]">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Bitcoin size={16} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display text-sm font-bold text-foreground mb-2">
                        One Hash · Five Protocols · Zero Translation
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        The same SHA-256 identity appears as a <strong className="text-foreground">Bitcoin OP_RETURN</strong> commitment
                        (immutable timestamping), a <strong className="text-foreground">hash-lock UTXO</strong> (content-gated spending),
                        a <strong className="text-foreground">Lightning payment hash</strong> (micropayment settlement),
                        a <strong className="text-foreground">Nostr event ID</strong> (social relay indexing),
                        and a <strong className="text-foreground">Nostr note1...</strong> (human-readable reference).
                        Bitcoin's <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">OP_SHA256</code> performs
                        single SHA-256 — identical to UOR's canonical hash. No adapter, no bridge, no wrapper.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </>
          )}

        </div>
      </div>
    </Layout>
  );
}

export default DemoPage;
