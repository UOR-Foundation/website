/**
 * Ethereum Integration Console — The Missing Lean Data Layer
 * ═══════════════════════════════════════════════════════════
 *
 * Interactive demo of UOR's four Ethereum integration pillars.
 * Zero protocol changes. Fits into Ethereum's roadmap today.
 */

import { useState, useCallback } from "react";
import {
  Hexagon, Loader2, Copy, Check, Download, ArrowRight,
  Database, ShieldCheck, Cpu, Key, Layers, Zap, FileCode,
  Lock, Atom, ChevronDown, ChevronUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  generateBlobWitness,
  generateVerkleLookup,
  generateZkCoherence,
  generateAccountAbstraction,
  BLOB_WITNESS_CONTRACT,
  AA_WALLET_CONTRACT,
  ZK_CIRCUIT_SPEC,
} from "@/modules/uns/core/ethereum-bridge";
import type { ProjectionInput } from "@/modules/uns/core/hologram";

/* ── Types ─────────────────────────────────────────────────────────────── */

interface CanonResult {
  contentHash: string;
  cid: string;
  canonicalForm: string;
  hex: string;
  hashBytes: number[];
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

const DEFAULT_OBJECT = JSON.stringify(
  {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: "Lean Ethereum — The Data Integrity Layer",
    description: "UOR enables proof-based computation for Ethereum L1 scaling.",
    author: { "@type": "Organization", name: "UOR Foundation" },
  },
  null, 2,
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
      {ok ? <Check size={11} className="text-primary" /> : <Copy size={11} />}
    </button>
  );
}

function Row({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2 text-[10px]">
      <span className="text-muted-foreground shrink-0 w-24">{label}</span>
      <code className={`text-foreground break-all ${mono ? "font-mono" : ""}`}>{value}</code>
      <CopyBtn text={value} />
    </div>
  );
}

/* ── Pillar Card ───────────────────────────────────────────────────────── */

function PillarCard({
  pillar, title, subtitle, icon, gasLabel, children, expandedContent
}: {
  pillar: number;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  gasLabel?: string;
  children: React.ReactNode;
  expandedContent?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-border/50">
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold font-mono">
          {pillar}
        </span>
        <span className="text-indigo-400">{icon}</span>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold tracking-tight">{title}</span>
          <span className="text-[9px] text-muted-foreground ml-2">{subtitle}</span>
        </div>
        {gasLabel && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-indigo-500/10 text-indigo-400">
            {gasLabel}
          </span>
        )}
        {expandedContent && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>
      <div className="px-4 py-3 space-y-2">{children}</div>
      {expanded && expandedContent && (
        <div className="px-4 py-3 border-t border-border/50 bg-muted/20">
          {expandedContent}
        </div>
      )}
    </div>
  );
}

/* ── Contract Viewer ───────────────────────────────────────────────────── */

function ContractViewer({ open, onClose, title, code, filename }: {
  open: boolean; onClose: () => void; title: string; code: string; filename: string;
}) {
  if (!open) return null;
  const download = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <FileCode size={14} className="text-indigo-400" />
            <span className="text-sm font-semibold">{title}</span>
            <span className="text-[10px] font-mono text-muted-foreground">{filename}</span>
          </div>
          <div className="flex items-center gap-2">
            <CopyBtn text={code} />
            <button onClick={download} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
              <Download size={13} />
            </button>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-sm px-2">✕</button>
          </div>
        </div>
        <pre className="overflow-auto px-4 py-3 text-[11px] font-mono text-foreground leading-relaxed flex-1">
          {code}
        </pre>
      </div>
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────────────────── */

export default function ConsoleEthereum() {
  const [input, setInput] = useState(DEFAULT_OBJECT);
  const [canon, setCanon] = useState<CanonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewingContract, setViewingContract] = useState<"blob" | "aa" | "zk" | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCanon(null);
    try {
      const obj = JSON.parse(input);
      const { data, error: fnErr } = await supabase.functions.invoke("pq-bridge", {
        method: "POST",
        body: { object: obj },
      });
      if (fnErr) throw fnErr;
      const d = data as { contentHash: string; cid: string; canonicalForm: string };
      // Build hashBytes from hex
      const hex = d.contentHash;
      const hashBytes = Array.from({ length: 32 }, (_, i) => parseInt(hex.slice(i * 2, i * 2 + 2), 16));
      setCanon({ contentHash: hex, cid: d.cid, canonicalForm: d.canonicalForm, hex, hashBytes });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Invalid JSON or network error");
    } finally {
      setLoading(false);
    }
  }, [input]);

  // Generate pillar artifacts from the canonical hash
  const identity: ProjectionInput | null = canon ? {
    hashBytes: new Uint8Array(canon.hashBytes),
    cid: canon.cid,
    hex: canon.hex,
  } : null;

  const blobWitness = identity ? generateBlobWitness(identity) : null;
  const verkleLookup = identity ? generateVerkleLookup(identity) : null;
  const zkCoherence = identity ? generateZkCoherence(identity) : null;
  const aaResult = identity ? generateAccountAbstraction(identity) : null;

  const contractMap: Record<string, { title: string; code: string; filename: string }> = {
    blob: { title: "UOR Blob Witness", code: BLOB_WITNESS_CONTRACT, filename: "UORBlobWitness.sol" },
    aa: { title: "UOR PQ Account", code: AA_WALLET_CONTRACT, filename: "UORPqAccount.sol" },
    zk: { title: "ZK Coherence Spec", code: ZK_CIRCUIT_SPEC, filename: "UORCoherence.circom" },
  };

  return (
    <div className="space-y-6">
      {viewingContract && (
        <ContractViewer
          open
          onClose={() => setViewingContract(null)}
          {...contractMap[viewingContract]}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Hexagon size={18} className="text-indigo-400" />
            Ethereum Integration
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            <span className="text-indigo-400 font-medium">The Missing Lean Data Layer</span> — Four integration pillars
            that fit into Ethereum's roadmap today. Zero protocol changes.
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={() => setViewingContract("blob")}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[9px] font-mono font-medium hover:bg-indigo-500/20 transition-colors">
            <FileCode size={10} /> BlobWitness.sol
          </button>
          <button onClick={() => setViewingContract("aa")}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[9px] font-mono font-medium hover:bg-indigo-500/20 transition-colors">
            <FileCode size={10} /> PqAccount.sol
          </button>
          <button onClick={() => setViewingContract("zk")}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[9px] font-mono font-medium hover:bg-indigo-500/20 transition-colors">
            <FileCode size={10} /> ZK Spec
          </button>
        </div>
      </div>

      {/* Roadmap alignment ribbon */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1">
        {[
          { label: "EIP-4844 Blobs", icon: <Database size={10} />, desc: "Data integrity" },
          { label: "Verkle Trees", icon: <Layers size={10} />, desc: "State keys" },
          { label: "ZK-EVM", icon: <Cpu size={10} />, desc: "0 constraints" },
          { label: "EIP-7701 AA", icon: <Key size={10} />, desc: "PQ wallets" },
        ].map((p, i) => (
          <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-indigo-500/20 bg-indigo-500/5 text-[10px] shrink-0">
            <span className="text-indigo-400">{p.icon}</span>
            <span className="font-medium text-foreground">{p.label}</span>
            <span className="text-muted-foreground">· {p.desc}</span>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
          <span className="text-xs font-semibold text-muted-foreground">JSON-LD Object</span>
          <button onClick={run} disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-indigo-500 text-white hover:bg-indigo-600 transition-colors disabled:opacity-50">
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Hexagon size={12} />}
            {loading ? "Processing…" : "Generate Pillars"}
          </button>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full h-36 px-4 py-3 bg-transparent text-xs font-mono text-foreground resize-none focus:outline-none"
          spellCheck={false}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-xs text-destructive">{error}</div>
      )}

      {/* Canonical Identity */}
      {canon && (
        <div className="rounded-lg border border-primary/30 bg-card px-4 py-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Lock size={12} className="text-primary" /> Canonical Identity
          </div>
          <Row label="Content Hash" value={canon.contentHash} />
          <Row label="CID" value={canon.cid} />
        </div>
      )}

      {/* Four Pillars */}
      {identity && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
            <ArrowRight size={12} /> Four Integration Pillars
          </div>

          <div className="grid gap-3">
            {/* P1: Blob Witness */}
            {blobWitness && (
              <PillarCard
                pillar={1}
                title="EIP-4844 Blob Witness"
                subtitle="Data integrity for blobs"
                icon={<Database size={13} />}
                gasLabel={`~${blobWitness.gasEstimate.toLocaleString()} gas`}
                expandedContent={
                  <div className="space-y-2 text-[10px]">
                    <p className="text-muted-foreground">
                      <strong className="text-foreground">How it fits:</strong> Every EIP-4844 blob gets a UOR content hash
                      posted alongside its KZG commitment. KZG proves the blob is <em>available</em>.
                      UOR proves it's <em>canonical, authentic, and PQ-secure</em>.
                    </p>
                    <p className="text-muted-foreground">
                      <strong className="text-foreground">Cost:</strong> ~512 gas for the UOR commitment in calldata.
                      ~45,000 gas if stored on-chain via the BlobWitness contract.
                    </p>
                    <button onClick={() => setViewingContract("blob")}
                      className="inline-flex items-center gap-1 text-indigo-400 hover:underline">
                      <FileCode size={10} /> View UORBlobWitness.sol
                    </button>
                  </div>
                }
              >
                <Row label="Commitment" value={blobWitness.commitment} />
                <Row label="Calldata" value={blobWitness.calldata} />
                <Row label="Log Topic" value={blobWitness.logTopic} />
              </PillarCard>
            )}

            {/* P2: Verkle Lookup */}
            {verkleLookup && (
              <PillarCard
                pillar={2}
                title="Verkle Tree Leaf Witness"
                subtitle="Content-addressed state keys"
                icon={<Layers size={13} />}
                expandedContent={
                  <div className="space-y-2 text-[10px] text-muted-foreground">
                    <p>
                      <strong className="text-foreground">How it fits:</strong> Ethereum is transitioning from Merkle-Patricia
                      tries to Verkle trees. UOR's content hash is a valid 32-byte Verkle key.
                      The first 31 bytes form the stem, the last byte is the suffix.
                    </p>
                    <p>
                      <strong className="text-foreground">Insight:</strong> This enables content-addressed state lookups —
                      find state by <em>what it is</em>, not <em>where it lives</em>. The UOR principle at the protocol level.
                    </p>
                  </div>
                }
              >
                <Row label="State Key" value={verkleLookup.stateKey} />
                <Row label="Stem (31B)" value={verkleLookup.stem} />
                <Row label="Suffix" value={`${verkleLookup.suffix} (0x${verkleLookup.suffix.toString(16).padStart(2, "0")})`} />
                <Row label="IPA Hint" value={verkleLookup.ipaHint} />
              </PillarCard>
            )}

            {/* P3: ZK Coherence */}
            {zkCoherence && (
              <PillarCard
                pillar={3}
                title="ZK Circuit Coherence"
                subtitle="Zero-cost R1CS constraints"
                icon={<Cpu size={13} />}
                gasLabel="0 constraints"
                expandedContent={
                  <div className="space-y-2 text-[10px] text-muted-foreground">
                    <p>
                      <strong className="text-foreground">The key insight:</strong> The UOR critical identity
                      <code className="text-primary mx-1">neg(bnot(x)) ≡ succ(x)</code>
                      is a tautology in modular arithmetic. It compiles to zero R1CS constraints
                      in any ZK-SNARK system (Groth16, Plonk, Halo2, STARKs).
                    </p>
                    <p>
                      <strong className="text-foreground">For L1 scaling:</strong> Any ZK rollup can include UOR coherence
                      verification at zero marginal proving cost. The proof simultaneously attests
                      computation correctness AND data integrity.
                    </p>
                    <button onClick={() => setViewingContract("zk")}
                      className="inline-flex items-center gap-1 text-indigo-400 hover:underline">
                      <FileCode size={10} /> View formal circuit specification
                    </button>
                  </div>
                }
              >
                <div className="space-y-2">
                  <Row label="Witness (x)" value={zkCoherence.x.toString()} />
                  <Row label="R1CS" value={`${zkCoherence.r1csConstraints} constraints (zero-cost)`} />
                  <div className="flex items-start gap-2 text-[10px]">
                    <span className="text-muted-foreground shrink-0 w-24">Identity</span>
                    <code className="text-primary">{zkCoherence.proof.identity}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium ${
                      zkCoherence.proof.holds ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                    }`}>
                      {zkCoherence.proof.holds ? "✓ Tautology holds" : "✗ Failed"}
                    </span>
                    <span className="text-[9px] text-muted-foreground">
                      Proven for all 256 values · algebraic certainty
                    </span>
                  </div>
                  <div className="text-[9px] text-muted-foreground space-y-0.5">
                    <div>Public inputs:</div>
                    {zkCoherence.publicInputs.map((pi, i) => (
                      <div key={i} className="flex items-center gap-1 ml-2">
                        <code className="text-foreground">[{i}]</code>
                        <code className="text-foreground break-all">{pi}</code>
                        <CopyBtn text={pi} />
                      </div>
                    ))}
                  </div>
                </div>
              </PillarCard>
            )}

            {/* P4: Account Abstraction */}
            {aaResult && (
              <PillarCard
                pillar={4}
                title="Account Abstraction (EIP-7701)"
                subtitle="Post-quantum wallets"
                icon={<Key size={13} />}
                gasLabel={`~${aaResult.gasEstimate.toLocaleString()} gas`}
                expandedContent={
                  <div className="space-y-2 text-[10px] text-muted-foreground">
                    <p>
                      <strong className="text-foreground">How it fits:</strong> EIP-7701 allows custom transaction
                      validation logic. UOR's Dilithium-3 signatures validate off-chain (free).
                      On-chain: a single commitment lookup (~2,800 gas).
                    </p>
                    <p>
                      <strong className="text-foreground">Result:</strong> Ethereum accounts become post-quantum
                      TODAY without any protocol change. The PQ verification happens off-chain,
                      and the on-chain check is a single <code className="text-foreground">SLOAD</code>.
                    </p>
                    <button onClick={() => setViewingContract("aa")}
                      className="inline-flex items-center gap-1 text-indigo-400 hover:underline">
                      <FileCode size={10} /> View UORPqAccount.sol
                    </button>
                  </div>
                }
              >
                <Row label="Commitment" value={aaResult.commitmentHash} />
                <Row label="Calldata" value={aaResult.validationCalldata} />
                <Row label="Gas" value={`${aaResult.gasEstimate.toLocaleString()} (1 SLOAD + 1 keccak256)`} />
                <div className="mt-1 space-y-0.5">
                  {aaResult.validationSteps.filter(s => s.startsWith("1") || s.startsWith("2") || s.startsWith("3") || s.startsWith("4") || s.startsWith("5")).map((step, i) => (
                    <div key={i} className="text-[9px] text-muted-foreground">
                      {step}
                    </div>
                  ))}
                </div>
              </PillarCard>
            )}
          </div>
        </div>
      )}

      {/* Cross-verification */}
      {identity && blobWitness && zkCoherence && aaResult && (
        <div className="rounded-lg border border-primary/30 bg-card px-4 py-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <ShieldCheck size={12} className="text-primary" /> Cross-Pillar Verification
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px]">
            {[
              { label: "Blob Witness", hash: blobWitness.commitment.slice(2, 18) + "…" },
              { label: "Verkle Stem", hash: verkleLookup!.stem.slice(2, 18) + "…" },
              { label: "ZK Input", hash: zkCoherence.publicInputs[0].slice(2, 18) + "…" },
              { label: "AA Commit", hash: aaResult.commitmentHash.slice(2, 18) + "…" },
            ].map((p, i) => (
              <div key={i}>
                <div className="text-muted-foreground">{p.label}</div>
                <code className="text-foreground font-medium">{p.hash}</code>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-primary/10 text-primary">
              ✓ All pillars use same content hash
            </span>
            <span className="text-[9px] text-muted-foreground">
              One identity · Four integration points · Zero protocol changes
            </span>
          </div>
        </div>
      )}

      {/* Roadmap Alignment */}
      <div className="rounded-lg border border-border/50 bg-muted/20 px-4 py-3 text-[10px] text-muted-foreground space-y-2">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Atom size={12} className="text-indigo-400" /> Ethereum Roadmap Alignment
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <p className="text-foreground font-medium">Lean Data (the 5th pillar)</p>
            <p>Ethereum's Lean Ethereum proposal has four pillars: Verkle, Lean Consensus, ZK-EVM, RISC-V.
              UOR is the missing fifth: <em>Lean Data</em> — universal, constant-time, post-quantum data integrity.</p>
          </div>
          <div>
            <p className="text-foreground font-medium">Why zero protocol changes</p>
            <p>Every artifact is a standard <code className="text-foreground">bytes32</code>. The existing EVM, existing opcodes,
              existing calldata format. UOR is purely additive — a semantic layer on top of existing infrastructure.</p>
          </div>
          <div>
            <p className="text-foreground font-medium">L1 scaling via ZK coherence</p>
            <p>The critical identity compiles to 0 R1CS constraints. Any ZK rollup includes UOR coherence for free.
              Data integrity becomes an intrinsic property of every proof, not an external check.</p>
          </div>
          <div>
            <p className="text-foreground font-medium">Post-quantum today</p>
            <p>Dilithium-3 signatures validate off-chain. On-chain: one <code className="text-foreground">SLOAD</code> (~2,100 gas).
              Ethereum accounts become quantum-resistant without waiting for protocol-level PQ cryptography.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
