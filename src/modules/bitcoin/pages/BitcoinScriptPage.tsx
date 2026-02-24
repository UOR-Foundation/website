/**
 * Bitcoin Script Inspector
 * ═══════════════════════
 *
 * Renders all three Bitcoin-layer hologram projections for any UOR object
 * with opcode-by-opcode breakdown and copy-to-clipboard.
 *
 * Layers:
 *   L1 OP_RETURN  — On-chain timestamping (bitcoin projection)
 *   L1 HTLC       — Content-gated spending (bitcoin-hashlock projection)
 *   L2 Lightning   — Content-gated micropayments (lightning projection)
 */

import { useState, useCallback, useMemo } from "react";
import Layout from "@/modules/core/components/Layout";
import { Bitcoin, Copy, Check, Info, Zap, Lock, FileText, ArrowRight, Hash, ChevronDown, ChevronUp, Braces, Loader2 } from "lucide-react";
import BitcoinNav from "@/modules/bitcoin/components/BitcoinNav";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/modules/core/ui/tooltip";
import { project, PROJECTIONS } from "@/modules/uns/core/hologram";
import type { ProjectionInput } from "@/modules/uns/core/hologram";
import { singleProofHash } from "@/lib/uor-canonical";

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

/* ── Opcode types ────────────────────────────────────────────── */

interface OpcodeSegment {
  hex: string;
  label: string;
  description: string;
  color: "opcode" | "length" | "data" | "magic";
}

const OPCODE_COLORS: Record<OpcodeSegment["color"], string> = {
  opcode: "bg-primary/15 text-primary border-primary/30",
  length: "bg-accent/15 text-accent border-accent/30",
  data:   "bg-muted text-foreground border-border",
  magic:  "bg-destructive/10 text-destructive border-destructive/30",
};

/* ── Script parsers ──────────────────────────────────────────── */

function parseOpReturn(script: string): OpcodeSegment[] {
  return [
    { hex: "6a",     label: "OP_RETURN",       description: "Marks output as provably unspendable — data carrier only", color: "opcode" },
    { hex: "24",     label: "OP_PUSHBYTES_36", description: "Push the next 36 bytes onto the stack (0x24 = 36)", color: "length" },
    { hex: "554f52", label: '"UOR"',           description: "Protocol magic prefix: ASCII 'U'(55) 'O'(4f) 'R'(52)", color: "magic" },
    { hex: script.slice(10), label: "SHA-256 Hash", description: "Full 256-bit UOR canonical identity (32 bytes, lossless)", color: "data" },
  ];
}

function parseHashLock(script: string): OpcodeSegment[] {
  return [
    { hex: "a8",   label: "OP_SHA256",        description: "Hash the top stack item with SHA-256 — identical to UOR's hash function", color: "opcode" },
    { hex: "20",   label: "OP_PUSHBYTES_32",  description: "Push the next 32 bytes onto the stack (0x20 = 32)", color: "length" },
    { hex: script.slice(4, 68), label: "SHA-256 Hash", description: "The UOR identity hash — preimage is the URDNA2015 canonical bytes", color: "data" },
    { hex: "87",   label: "OP_EQUAL",         description: "Compare: SHA256(preimage) === hash? If true, script succeeds", color: "opcode" },
  ];
}

function parseLightning(tagged: string): OpcodeSegment[] {
  return [
    { hex: "p",  label: "Tag Type",     description: "BOLT-11 tag 'p' (type=1): payment_hash field", color: "opcode" },
    { hex: "p5", label: "Data Length",   description: "52 five-bit groups (1×32 + 20 = 52, encoding 256 bits)", color: "length" },
    { hex: tagged.slice(3), label: "Payment Hash (bech32)", description: "256-bit SHA-256 hash in bech32 5-bit encoding — the preimage settles the payment", color: "data" },
  ];
}

/* ── Script card component ───────────────────────────────────── */

function ScriptCard({
  title,
  icon: Icon,
  tier,
  spec,
  specUrl,
  segments,
  rawScript,
  description,
  fidelity,
}: {
  title: string;
  icon: React.ElementType;
  tier: string;
  spec: string;
  specUrl: string;
  segments: OpcodeSegment[];
  rawScript: string;
  description: string;
  fidelity: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">{tier}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-primary/10 text-primary">
            {fidelity}
          </span>
          <Ref label={spec} tip={`Specification: ${specUrl}`} />
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-5">{description}</p>

      {/* Raw script with copy */}
      <div className="rounded-xl border border-border bg-muted/30 p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Raw Script</span>
          <CopyBtn text={rawScript} label="Copy Script" />
        </div>
        <p className="font-mono text-sm text-foreground break-all leading-relaxed select-all">{rawScript}</p>
      </div>

      {/* Opcode breakdown */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-body text-primary hover:text-primary/80 transition-colors mb-3"
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        Opcode-by-Opcode Breakdown
      </button>

      {expanded && (
        <div className="space-y-2">
          {segments.map((seg, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                {i > 0 && <ArrowRight size={10} className="text-muted-foreground/40" />}
                <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-mono font-bold border ${OPCODE_COLORS[seg.color]}`}>
                  {seg.hex.length > 24 ? seg.hex.slice(0, 12) + "…" + seg.hex.slice(-12) : seg.hex}
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-sm font-bold text-foreground">{seg.label}</span>
                <p className="text-xs text-muted-foreground leading-relaxed">{seg.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ── Hash input ──────────────────────────────────────────────── */

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 64; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

const EXAMPLE_HEX = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const EXAMPLE_CID = "bafyreigdcnuc6w4fuf5udrstk5pnwb2fhkhliahmxrpfwvcaotbnbczyse";

const EXAMPLE_JSONLD = `{
  "@context": { "schema": "https://schema.org/" },
  "@type": "schema:Article",
  "schema:name": "Hello World",
  "schema:author": "UOR Framework"
}`;

type InputMode = "hex" | "object";

/* ── Main page ───────────────────────────────────────────────── */

function BitcoinScriptPage() {
  const [mode, setMode] = useState<InputMode>("hex");
  const [hexInput, setHexInput] = useState(EXAMPLE_HEX);
  const [jsonInput, setJsonInput] = useState(EXAMPLE_JSONLD);
  const [objectResult, setObjectResult] = useState<{ hex: string; hashBytes: Uint8Array; cid: string; nquads: string } | null>(null);
  const [objectError, setObjectError] = useState<string | null>(null);
  const [computing, setComputing] = useState(false);

  const isValidHex = /^[0-9a-f]{64}$/i.test(hexInput);

  const handleComputeFromObject = useCallback(async () => {
    setComputing(true);
    setObjectError(null);
    setObjectResult(null);
    try {
      const parsed = JSON.parse(jsonInput);
      const proof = await singleProofHash(parsed);
      setObjectResult({
        hex: proof.hashHex,
        hashBytes: proof.hashBytes,
        cid: proof.cid,
        nquads: proof.nquads,
      });
    } catch (err: any) {
      setObjectError(err.message ?? "Failed to compute identity");
    } finally {
      setComputing(false);
    }
  }, [jsonInput]);

  const activeHex = mode === "hex" ? (isValidHex ? hexInput.toLowerCase() : null) : objectResult?.hex ?? null;
  const activeBytes = mode === "hex"
    ? (isValidHex ? hexToBytes(hexInput.toLowerCase()) : null)
    : objectResult?.hashBytes ?? null;

  const input: ProjectionInput | null = useMemo(() => {
    if (!activeHex || !activeBytes) return null;
    return { hashBytes: activeBytes, cid: objectResult?.cid ?? EXAMPLE_CID, hex: activeHex };
  }, [activeHex, activeBytes, objectResult]);

  const scripts = useMemo(() => {
    if (!input) return null;
    return {
      bitcoin: project(input, "bitcoin"),
      hashlock: project(input, "bitcoin-hashlock"),
      lightning: project(input, "lightning"),
    };
  }, [input]);

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-20">

          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-mono font-bold mb-4">
              <Bitcoin size={14} />
              BITCOIN × UOR HOLOGRAM
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
              Script Inspector
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Every UOR object projects into three Bitcoin protocol layers. Enter a SHA-256 hash
              to inspect the OP_RETURN commitment, HTLC hash-lock, and Lightning payment hash —
              opcode by opcode.
            </p>
          </div>

          <BitcoinNav />

          {/* Mode tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMode("hex")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-mono transition-colors border ${mode === "hex" ? "bg-primary/10 border-primary/30 text-primary font-bold" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
            >
              <Hash size={14} /> Raw Hash
            </button>
            <button
              onClick={() => setMode("object")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-mono transition-colors border ${mode === "object" ? "bg-primary/10 border-primary/30 text-primary font-bold" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
            >
              <Braces size={14} /> Generate from Object
            </button>
          </div>

          {/* Hash input (hex mode) */}
          {mode === "hex" && (
            <Card className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <Hash size={16} className="text-primary" />
                <span className="text-sm font-bold text-foreground">UOR Identity Hash</span>
                <Ref label="SHA-256" tip="The 256-bit SHA-256 hash of an object's URDNA2015 canonical form. This is the atomic identity from which all projections are derived." />
              </div>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={hexInput}
                  onChange={e => setHexInput(e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 64))}
                  placeholder="Enter 64-character hex SHA-256 hash…"
                  className="flex-1 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  spellCheck={false}
                />
                <button
                  onClick={() => setHexInput(EXAMPLE_HEX)}
                  className="px-4 py-3 rounded-xl text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-border transition-colors whitespace-nowrap"
                >
                  Example
                </button>
              </div>
              {hexInput.length > 0 && !isValidHex && (
                <p className="text-xs text-destructive mt-2 font-mono">
                  ⚠ Hash must be exactly 64 lowercase hex characters ({hexInput.length}/64)
                </p>
              )}
              {isValidHex && (
                <div className="flex items-center gap-2 mt-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs text-primary font-mono">Identity locked — 3 projections active</span>
                </div>
              )}
            </Card>
          )}

          {/* Object input (generate mode) */}
          {mode === "object" && (
            <Card className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <Braces size={16} className="text-primary" />
                <span className="text-sm font-bold text-foreground">JSON-LD Object</span>
                <Ref label="URDNA2015" tip="Your object is canonicalized via W3C URDNA2015, hashed with SHA-256, and the resulting identity is projected into Bitcoin scripts." />
              </div>
              <textarea
                value={jsonInput}
                onChange={e => setJsonInput(e.target.value)}
                rows={6}
                placeholder="Paste a JSON-LD object…"
                className="w-full rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
                spellCheck={false}
              />
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={handleComputeFromObject}
                  disabled={computing}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-mono font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {computing ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                  {computing ? "Computing…" : "Compute Identity & Project"}
                </button>
                <button
                  onClick={() => setJsonInput(EXAMPLE_JSONLD)}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-border transition-colors"
                >
                  Example
                </button>
              </div>
              {objectError && (
                <p className="text-xs text-destructive mt-2 font-mono">⚠ {objectError}</p>
              )}
              {objectResult && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-xs text-primary font-mono">Identity computed — 3 projections active</span>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">SHA-256</span>
                      <CopyBtn text={objectResult.hex} label="Copy" />
                    </div>
                    <p className="font-mono text-xs text-foreground break-all select-all">{objectResult.hex}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">N-Quads</span>
                      <CopyBtn text={objectResult.nquads} label="Copy" />
                    </div>
                    <p className="font-mono text-xs text-muted-foreground break-all select-all whitespace-pre-wrap max-h-24 overflow-y-auto">{objectResult.nquads}</p>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Pipeline visualization */}
          {scripts && (
            <div className="flex items-center justify-center gap-2 mb-8 text-xs font-mono text-muted-foreground flex-wrap">
              {mode === "object" && (
                <>
                  <span className="px-2 py-1 rounded bg-accent/10 border border-accent/30 text-accent-foreground font-bold">JSON-LD</span>
                  <ArrowRight size={12} />
                </>
              )}
              <span className="px-2 py-1 rounded bg-muted border border-border">Object</span>
              <ArrowRight size={12} />
              <span className="px-2 py-1 rounded bg-muted border border-border">URDNA2015</span>
              <ArrowRight size={12} />
              <span className="px-2 py-1 rounded bg-primary/10 border border-primary/30 text-primary font-bold">SHA-256</span>
              <ArrowRight size={12} />
              <span className="px-2 py-1 rounded bg-muted border border-border">Hologram</span>
              <ArrowRight size={12} />
              <span className="px-2 py-1 rounded bg-destructive/10 border border-destructive/30 text-destructive font-bold">₿ Bitcoin</span>
            </div>
          )}

          {/* Script cards */}
          {scripts && (
            <div className="space-y-6">

              {/* L1: OP_RETURN */}
              <ScriptCard
                title="OP_RETURN Commitment"
                icon={FileText}
                tier="Layer 1 — On-Chain Timestamping"
                spec="BIP-141"
                specUrl="https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki"
                rawScript={scripts.bitcoin.value}
                segments={parseOpReturn(scripts.bitcoin.value)}
                fidelity="LOSSLESS"
                description="Embeds the full 256-bit UOR identity into a standard OP_RETURN output. Creates an immutable, globally-timestamped proof of existence on the Bitcoin blockchain. The 'UOR' magic prefix enables protocol identification by indexers."
              />

              {/* L1: HTLC */}
              <ScriptCard
                title="HTLC Hash Lock"
                icon={Lock}
                tier="Layer 1 — Content-Gated Spending"
                spec="BIP-199"
                specUrl="https://github.com/bitcoin/bips/blob/master/bip-0199.mediawiki"
                rawScript={scripts.hashlock.value}
                segments={parseHashLock(scripts.hashlock.value)}
                fidelity="LOSSLESS"
                description="A Bitcoin UTXO locked to a UOR identity. To spend these sats, reveal the URDNA2015 canonical bytes of the object — the content IS the key. Bitcoin's OP_SHA256 performs single SHA-256, identical to UOR's hash function."
              />

              {/* L2: Lightning */}
              <ScriptCard
                title="Lightning Payment Hash"
                icon={Zap}
                tier="Layer 2 — Content-Gated Micropayments"
                spec="BOLT-11"
                specUrl="https://github.com/lightning/bolts/blob/master/11-payment-encoding.md"
                rawScript={scripts.lightning.value}
                segments={parseLightning(scripts.lightning.value)}
                fidelity="LOSSLESS"
                description="The BOLT-11 'p' tagged field in native bech32 wire encoding. A Lightning HTLC locked to this hash settles when the UOR canonical bytes are revealed — content delivery IS payment settlement, at sub-second latency."
              />

              {/* Insight panel */}
              <Card className="border-primary/20 bg-primary/[0.03]">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Info size={16} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-bold text-foreground mb-2">The SHA-256 Alignment</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      All three projections embed the <strong className="text-foreground">same 256-bit identity</strong> in
                      three protocol-native formats. Bitcoin's <code className="font-mono text-xs px-1 py-0.5 rounded bg-muted">OP_SHA256</code> opcode
                      performs single SHA-256 — identical to UOR's canonical hash. No translation layer, no double-hashing,
                      no protocol adapter. The UOR canonical bytes of any object ARE a valid Bitcoin hash-lock preimage.
                      Revealing the object's URDNA2015 form simultaneously <strong className="text-foreground">proves its identity</strong> and{" "}
                      <strong className="text-foreground">settles the payment</strong>.
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

export default BitcoinScriptPage;
