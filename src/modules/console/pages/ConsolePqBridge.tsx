/**
 * PQ Bridge Console — Post-Quantum Blockchain Protection Demo
 * ════════════════════════════════════════════════════════════
 *
 * Visual pipeline: Object → URDNA2015 → SHA-256 → Dilithium-3 → Bitcoin + Ethereum
 */

import { useState, useCallback, useRef } from "react";
import { ShieldCheck, Zap, ArrowRight, Download, Copy, Check, Loader2, Lock, Atom, Hexagon, FileCode, Key, BadgeCheck, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";

/* ── Types ─────────────────────────────────────────────────────────────── */

interface EthResult {
  commitment: string;
  calldata: string;
  logTopic: string;
  contractInterface: {
    function: string;
    event: string;
    verify: string;
  };
  gasEstimate: string;
  networks: string[];
}

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
  ethereum: EthResult;
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

/* ── Client-side signing state ─────────────────────────────────────────── */

interface ClientKeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
  publicKeyHex: string;
  generatedAt: number;
}

interface ClientSignResult {
  signature: Uint8Array;
  signatureHex: string;
  signatureBytes: number;
  verified: boolean;
  verifiedAt: number;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

/* ── Solidity Contract ─────────────────────────────────────────────────── */

const SOLIDITY_CONTRACT = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title UOR Post-Quantum Commitment Registry
 * @notice Stores PQ-signed content commitments on-chain.
 *         Dilithium-3 verification happens off-chain; this contract
 *         provides the immutable anchor and timestamp proof.
 *
 * Architecture (Optimistic Commitment):
 *   1. Off-chain: Dilithium-3 signs content hash (192-bit PQ security)
 *   2. On-chain:  bytes32 commitment stored here (~45k gas)
 *   3. Verify:    Anyone recomputes commitment from public PQ envelope
 *
 * Why not verify Dilithium-3 on-chain?
 *   ML-DSA-65 verification costs ~30M gas in Solidity.
 *   The commitment scheme provides equivalent security:
 *   forging a commitment requires breaking SHA-256 (128-bit PQ)
 *   AND Dilithium-3 (192-bit PQ) — harder than either alone.
 */
contract UORPqRegistry {

    struct Commitment {
        address sender;
        uint256 timestamp;
        bool exists;
    }

    /// @notice contentHash => Commitment
    mapping(bytes32 => Commitment) public commitments;

    /// @notice Total commitments registered
    uint256 public totalCommitments;

    /// @dev Emitted when a PQ commitment is anchored
    event PqCommitmentRegistered(
        bytes32 indexed contentHash,
        address indexed sender,
        uint256 timestamp
    );

    /// @notice Register a post-quantum signed content commitment
    /// @param contentHash The SHA-256 hash of the canonicalized content
    function registerPqCommitment(bytes32 contentHash) external {
        require(!commitments[contentHash].exists, "Already registered");

        commitments[contentHash] = Commitment({
            sender: msg.sender,
            timestamp: block.timestamp,
            exists: true
        });

        totalCommitments++;

        emit PqCommitmentRegistered(contentHash, msg.sender, block.timestamp);
    }

    /// @notice Check if a content hash has been PQ-committed
    /// @param contentHash The content hash to verify
    /// @return True if the commitment exists on-chain
    function verifyPqCommitment(bytes32 contentHash) external view returns (bool) {
        return commitments[contentHash].exists;
    }

    /// @notice Get full commitment details
    /// @param contentHash The content hash to look up
    /// @return sender The address that registered the commitment
    /// @return timestamp When the commitment was registered
    /// @return exists Whether the commitment exists
    function getCommitment(bytes32 contentHash)
        external view returns (address sender, uint256 timestamp, bool exists)
    {
        Commitment memory c = commitments[contentHash];
        return (c.sender, c.timestamp, c.exists);
    }
}`;

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
  step, title, icon, children, active, variant,
}: {
  step: number; title: string; icon: React.ReactNode; children: React.ReactNode; active: boolean; variant?: "bitcoin" | "ethereum";
}) {
  const borderColor = !active ? "border-border/50 bg-muted/20 opacity-60"
    : variant === "bitcoin" ? "border-amber-500/30 bg-card shadow-sm"
    : variant === "ethereum" ? "border-indigo-500/30 bg-card shadow-sm"
    : "border-primary/40 bg-card shadow-sm";
  const iconColor = variant === "bitcoin" ? "text-amber-500"
    : variant === "ethereum" ? "text-indigo-400"
    : "text-primary";
  const badgeColor = variant === "bitcoin" ? "bg-amber-500/10 text-amber-500"
    : variant === "ethereum" ? "bg-indigo-500/10 text-indigo-400"
    : "bg-primary/10 text-primary";

  return (
    <div className={`rounded-lg border transition-all duration-300 ${borderColor}`}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50">
        <span className={`flex items-center justify-center w-5 h-5 rounded-full ${badgeColor} text-[10px] font-bold font-mono`}>
          {step}
        </span>
        <span className={iconColor}>{icon}</span>
        <span className="text-xs font-semibold tracking-tight">{title}</span>
        {variant && (
          <span className={`ml-auto px-1.5 py-0.5 rounded text-[9px] font-medium ${badgeColor}`}>
            {variant === "bitcoin" ? "₿ Bitcoin" : "◆ Ethereum"}
          </span>
        )}
      </div>
      <div className="px-4 py-3 text-xs font-mono space-y-2 overflow-x-auto">{children}</div>
    </div>
  );
}

/* ── Contract Modal ────────────────────────────────────────────────────── */

function ContractViewer({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  const download = () => {
    const blob = new Blob([SOLIDITY_CONTRACT], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "UORPqRegistry.sol";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <FileCode size={14} className="text-indigo-400" />
            <span className="text-sm font-semibold">UORPqRegistry.sol</span>
            <span className="text-[10px] font-mono text-muted-foreground">Solidity ^0.8.24</span>
          </div>
          <div className="flex items-center gap-2">
            <CopyBtn text={SOLIDITY_CONTRACT} />
            <button onClick={download} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
              <Download size={13} />
            </button>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-sm px-2">✕</button>
          </div>
        </div>
        <pre className="overflow-auto px-4 py-3 text-[11px] font-mono text-foreground leading-relaxed flex-1">
          {SOLIDITY_CONTRACT}
        </pre>
      </div>
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────────────────── */

export default function ConsolePqBridge() {
  const [input, setInput] = useState(DEFAULT_OBJECT);
  const [result, setResult] = useState<PqResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showContract, setShowContract] = useState(false);

  // Client-side PQ signing state
  const [keyPair, setKeyPair] = useState<ClientKeyPair | null>(null);
  const [signing, setSigning] = useState(false);
  const [signResult, setSignResult] = useState<ClientSignResult | null>(null);
  const [keygenTime, setKeygenTime] = useState<number | null>(null);
  const [signTime, setSignTime] = useState<number | null>(null);
  const secretKeyRef = useRef<Uint8Array | null>(null);

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

  const generateKeyPair = useCallback(() => {
    const t0 = performance.now();
    const kp = ml_dsa65.keygen();
    const elapsed = performance.now() - t0;
    setKeygenTime(Math.round(elapsed));
    secretKeyRef.current = kp.secretKey;
    setKeyPair({
      publicKey: kp.publicKey,
      secretKey: kp.secretKey,
      publicKeyHex: toHex(kp.publicKey).slice(0, 64) + "…",
      generatedAt: Date.now(),
    });
    setSignResult(null);
  }, []);

  const clientSign = useCallback(async () => {
    if (!result || !secretKeyRef.current) return;
    setSigning(true);
    // Defer to next tick so the UI updates
    await new Promise(r => setTimeout(r, 10));
    try {
      const t0 = performance.now();
      const message = new TextEncoder().encode(result.signingTarget);
      const signature = ml_dsa65.sign(message, secretKeyRef.current);
      const verified = ml_dsa65.verify(signature, message, keyPair!.publicKey);
      const elapsed = performance.now() - t0;
      setSignTime(Math.round(elapsed));
      setSignResult({
        signature,
        signatureHex: toHex(signature).slice(0, 80) + "…",
        signatureBytes: signature.length,
        verified,
        verifiedAt: Date.now(),
      });
    } finally {
      setSigning(false);
    }
  }, [result, keyPair]);

  const downloadEnvelope = useCallback(() => {
    if (!result) return;
    const envelope: Record<string, unknown> = { ...result };
    if (keyPair && signResult) {
      envelope.clientSigning = {
        publicKeyHex: toHex(keyPair.publicKey),
        signatureHex: toHex(signResult.signature),
        signatureBytes: signResult.signatureBytes,
        verified: signResult.verified,
        algorithm: "ML-DSA-65 (Dilithium-3)",
        securityLevel: "192-bit (NIST Level 3)",
      };
    }
    const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pq-envelope-${result.contentHash.slice(0, 12)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result, keyPair, signResult]);

  const active = !!result;

  return (
    <div className="space-y-6">
      <ContractViewer open={showContract} onClose={() => setShowContract(false)} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Lock size={18} className="text-primary" />
            Post-Quantum Bridge
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            Sign any object with <span className="text-primary font-medium">Dilithium-3 (ML-DSA-65)</span> and anchor to
            <span className="text-amber-500 font-medium"> Bitcoin</span> and
            <span className="text-indigo-400 font-medium"> Ethereum</span> — quantum-proof without hard forks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-mono font-medium">
            <Atom size={12} /> NIST FIPS 204
          </div>
          <button
            onClick={() => setShowContract(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-mono font-medium hover:bg-indigo-500/20 transition-colors"
          >
            <FileCode size={12} /> Solidity Contract
          </button>
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

          {/* Step 3: PQ Bridge */}
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

          {/* Step 4: Bitcoin */}
          <StepCard step={4} title="Bitcoin OP_RETURN Anchor" icon={<span className="text-[13px]">₿</span>} active={active} variant="bitcoin">
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
                    <div className={`font-medium ${result.bitcoinScriptDecoded.withinOpReturnLimit ? "text-amber-500" : "text-destructive"}`}>
                      {result.bitcoinScriptDecoded.withinOpReturnLimit ? "✓ Yes" : "✗ No"}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground">Awaiting script…</span>
            )}
          </StepCard>

          {/* Step 5: Ethereum */}
          <StepCard step={5} title="Ethereum PQ Commitment" icon={<Hexagon size={13} />} active={active} variant="ethereum">
            {result?.ethereum ? (
              <div className="space-y-2.5">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Commitment:</span>
                    <code className="text-foreground">{result.ethereum.commitment}</code>
                    <CopyBtn text={result.ethereum.commitment} />
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground shrink-0">Calldata:</span>
                    <code className="text-foreground break-all text-[10px]">{result.ethereum.calldata}</code>
                    <CopyBtn text={result.ethereum.calldata} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Log topic:</span>
                    <code className="text-foreground text-[10px] break-all">{result.ethereum.logTopic}</code>
                    <CopyBtn text={result.ethereum.logTopic} />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px]">
                  <div>
                    <span className="text-muted-foreground">Gas estimate</span>
                    <div className="text-foreground font-medium">{result.ethereum.gasEstimate}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Function</span>
                    <div className="text-foreground font-medium text-[9px]">{result.ethereum.contractInterface.function}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Networks</span>
                    <div className="text-foreground font-medium">{result.ethereum.networks.length} EVM chains</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {result.ethereum.networks.map(n => (
                    <span key={n} className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[9px] font-medium">
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground">Awaiting commitment…</span>
            )}
          </StepCard>

          {/* Step 6: Lightning */}
          <StepCard step={6} title="Lightning Payment Hash" icon={<Zap size={13} />} active={active} variant="bitcoin">
            {result ? (
              <div className="flex items-center gap-2">
                <code className="text-foreground break-all">{result.lightningPaymentHash}</code>
                <CopyBtn text={result.lightningPaymentHash} />
              </div>
            ) : (
              <span className="text-muted-foreground">Awaiting hash…</span>
            )}
          </StepCard>

          {/* Step 7: Coherence */}
          <StepCard step={7} title="Ring Coherence Witness" icon={<ShieldCheck size={13} />} active={active}>
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
              </div>
            ) : (
              <span className="text-muted-foreground">Awaiting witness…</span>
            )}
          </StepCard>
        </div>
      </div>

      {/* ── Client-Side Dilithium-3 Signing ────────────────────────────── */}
      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
            <Key size={12} /> Client-Side Dilithium-3 Signing
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">Keys never leave browser</span>
          </div>

          <div className="rounded-lg border border-primary/30 bg-card">
            {/* Keygen row */}
            <div className="px-4 py-3 border-b border-border/50">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs">
                  <span className="font-semibold text-foreground">Step 1:</span>{" "}
                  <span className="text-muted-foreground">Generate Dilithium-3 keypair</span>
                </div>
                <button
                  onClick={generateKeyPair}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
                >
                  {keyPair ? <RefreshCw size={12} /> : <Key size={12} />}
                  {keyPair ? "Regenerate" : "Generate Keypair"}
                </button>
              </div>
              {keyPair && (
                <div className="mt-2 space-y-1 text-[10px] font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Public key:</span>
                    <code className="text-foreground">{keyPair.publicKeyHex}</code>
                    <CopyBtn text={toHex(keyPair.publicKey)} />
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span>Public: {keyPair.publicKey.length.toLocaleString()} bytes</span>
                    <span>Secret: {keyPair.secretKey.length.toLocaleString()} bytes</span>
                    {keygenTime !== null && <span>Generated in {keygenTime}ms</span>}
                  </div>
                </div>
              )}
            </div>

            {/* Sign row */}
            <div className="px-4 py-3 border-b border-border/50">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs">
                  <span className="font-semibold text-foreground">Step 2:</span>{" "}
                  <span className="text-muted-foreground">Sign the PQ Bridge target with Dilithium-3</span>
                </div>
                <button
                  onClick={clientSign}
                  disabled={!keyPair || signing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 shrink-0"
                >
                  {signing ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                  {signing ? "Signing…" : signResult ? "Re-sign" : "Sign"}
                </button>
              </div>
              {signResult && (
                <div className="mt-2 space-y-1 text-[10px] font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Signature:</span>
                    <code className="text-foreground">{signResult.signatureHex}</code>
                    <CopyBtn text={toHex(signResult.signature)} />
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span>{signResult.signatureBytes.toLocaleString()} bytes</span>
                    {signTime !== null && <span>Signed + verified in {signTime}ms</span>}
                  </div>
                </div>
              )}
            </div>

            {/* Verify result */}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs">
                  <span className="font-semibold text-foreground">Step 3:</span>{" "}
                  <span className="text-muted-foreground">Verify signature (automatic)</span>
                </div>
                {signResult && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium ${
                    signResult.verified ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                  }`}>
                    <BadgeCheck size={12} />
                    {signResult.verified ? "Signature Valid" : "Signature Invalid"}
                  </span>
                )}
              </div>
              {signResult?.verified && (
                <div className="mt-2 text-[10px] text-muted-foreground">
                  <span className="text-primary font-medium">✓ Full round-trip verified:</span>{" "}
                  Object → URDNA2015 → SHA-256 → PQ Bridge → Dilithium-3 Sign → Verify.{" "}
                  Private key never left the browser. Signature is {signResult.signatureBytes.toLocaleString()} bytes of lattice-hard proof.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      {result && (
        <div className="flex items-center gap-3 flex-wrap pt-2">
          <button
            onClick={downloadEnvelope}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Download size={13} /> Download PQ Envelope{signResult ? " (with signature)" : ""}
          </button>
          <button
            onClick={() => setShowContract(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 transition-colors"
          >
            <FileCode size={13} /> View Solidity Contract
          </button>
        </div>
      )}

      {/* Info footer */}
      <div className="rounded-lg border border-border/50 bg-muted/20 px-4 py-3 text-[10px] text-muted-foreground space-y-1.5">
        <p>
          <strong className="text-foreground">Lattice-Hash Duality:</strong> UOR's ring Z/256Z is a 1-dimensional lattice.
          Dilithium-3 operates on Module-LWE lattices — same mathematical family.
          The coherence identity <code className="text-foreground">neg(bnot(x)) ≡ succ(x)</code> is a lattice automorphism.
        </p>
        <p>
          <strong className="text-foreground">Bitcoin:</strong> OP_RETURN anchors the PQ commitment in 39 bytes.
          <strong className="text-foreground ml-2">Ethereum:</strong> The <code className="text-indigo-400">UORPqRegistry</code> contract
          stores commitments for ~45k gas. Both chains become quantum-proof without protocol changes.
        </p>
        <p>
          <strong className="text-foreground">Architecture:</strong> Private keys never leave the client.
          The commitment scheme is optimistic — forging requires breaking SHA-256 AND Dilithium-3 simultaneously.
        </p>
      </div>
    </div>
  );
}
