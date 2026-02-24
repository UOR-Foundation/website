/**
 * Bitcoin × Zcash Duality Page
 * ════════════════════════════
 *
 * Visualizes the UOR holographic principle applied to the Bitcoin-Zcash
 * duality: one SHA-256 identity projected simultaneously into:
 *   - Bitcoin OP_RETURN (public, L1)
 *   - Zcash Transparent (public, L1 — identical to Bitcoin)
 *   - Zcash Shielded Memo (private, encrypted)
 *
 * This demonstrates that identity doesn't change — only visibility does.
 */

import { useState, useCallback, useMemo } from "react";
import Layout from "@/modules/core/components/Layout";
import {
  Bitcoin, Eye, EyeOff, Copy, Check, ArrowRight,
  Hash, Shield, Lock, Unlock, Info, Loader2, Braces,
} from "lucide-react";
import BitcoinNav from "@/modules/bitcoin/components/BitcoinNav";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/modules/core/ui/tooltip";
import { project } from "@/modules/uns/core/hologram";
import type { ProjectionInput } from "@/modules/uns/core/hologram";
import { singleProofHash } from "@/lib/uor-canonical";

/* ── Helpers ─────────────────────────────────────────────────── */

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

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-card p-5 md:p-7 ${className}`}>{children}</div>;
}

/* ── Hex helpers ─────────────────────────────────────────────── */

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 64; i += 2) bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  return bytes;
}

const EXAMPLE_HEX = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const EXAMPLE_CID = "bafyreigdcnuc6w4fuf5udrstk5pnwb2fhkhliahmxrpfwvcaotbnbczyse";

const EXAMPLE_JSONLD = `{
  "@context": { "schema": "https://schema.org/" },
  "@type": "schema:CreativeWork",
  "schema:name": "Private Document",
  "schema:author": "UOR Framework"
}`;

type InputMode = "hex" | "object";

/* ── Main page ───────────────────────────────────────────────── */

function ZcashDualityPage() {
  const [mode, setMode] = useState<InputMode>("hex");
  const [hexInput, setHexInput] = useState(EXAMPLE_HEX);
  const [jsonInput, setJsonInput] = useState(EXAMPLE_JSONLD);
  const [objectResult, setObjectResult] = useState<{ hex: string; hashBytes: Uint8Array; cid: string } | null>(null);
  const [objectError, setObjectError] = useState<string | null>(null);
  const [computing, setComputing] = useState(false);

  const isValidHex = /^[0-9a-f]{64}$/i.test(hexInput);

  const handleCompute = useCallback(async () => {
    setComputing(true);
    setObjectError(null);
    setObjectResult(null);
    try {
      const parsed = JSON.parse(jsonInput);
      const proof = await singleProofHash(parsed);
      setObjectResult({ hex: proof.hashHex, hashBytes: proof.hashBytes, cid: proof.cid });
    } catch (err: any) {
      setObjectError(err.message ?? "Failed to compute identity");
    } finally {
      setComputing(false);
    }
  }, [jsonInput]);

  const activeHex = mode === "hex" ? (isValidHex ? hexInput.toLowerCase() : null) : objectResult?.hex ?? null;
  const activeBytes = mode === "hex" ? (isValidHex ? hexToBytes(hexInput.toLowerCase()) : null) : objectResult?.hashBytes ?? null;

  const input: ProjectionInput | null = useMemo(() => {
    if (!activeHex || !activeBytes) return null;
    return { hashBytes: activeBytes, cid: objectResult?.cid ?? EXAMPLE_CID, hex: activeHex };
  }, [activeHex, activeBytes, objectResult]);

  const projections = useMemo(() => {
    if (!input) return null;
    return {
      bitcoin: project(input, "bitcoin"),
      zcashTransparent: project(input, "zcash-transparent"),
      zcashMemo: project(input, "zcash-memo"),
      hashlock: project(input, "bitcoin-hashlock"),
      lightning: project(input, "lightning"),
      nostr: project(input, "nostr"),
    };
  }, [input]);

  // Prove the identity equivalence
  const identityProof = useMemo(() => {
    if (!projections) return null;
    const btcHash = projections.bitcoin.value.slice(10);
    const zecHash = projections.zcashTransparent.value.slice(10);
    const memoHash = projections.zcashMemo.value.slice(6, 70);
    const nostrHash = projections.nostr.value;
    return {
      allMatch: btcHash === zecHash && zecHash === memoHash && memoHash === nostrHash,
      btcHash,
      zecHash,
      memoHash,
      nostrHash,
    };
  }, [projections]);

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 py-12 md:py-20">

          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-mono font-bold mb-4">
              <Bitcoin size={14} />
              BITCOIN × ZCASH DUALITY
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
              Privacy Duality Bridge
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              One UOR identity, two visibility modes. The same SHA-256 hash anchors
              a public proof on Bitcoin/Zcash transparent and a private proof in
              Zcash's encrypted memo field — identity doesn't change, only visibility does.
            </p>
          </div>

          <BitcoinNav />

          {/* Mode tabs */}
          <div className="flex gap-2 mb-4">
            <button onClick={() => setMode("hex")} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-mono transition-colors border ${mode === "hex" ? "bg-primary/10 border-primary/30 text-primary font-bold" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}>
              <Hash size={14} /> Raw Hash
            </button>
            <button onClick={() => setMode("object")} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-mono transition-colors border ${mode === "object" ? "bg-primary/10 border-primary/30 text-primary font-bold" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}>
              <Braces size={14} /> Generate from Object
            </button>
          </div>

          {/* Hex input */}
          {mode === "hex" && (
            <Card className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <Hash size={16} className="text-primary" />
                <span className="text-sm font-bold text-foreground">UOR Identity Hash</span>
              </div>
              <div className="flex gap-3">
                <input type="text" value={hexInput} onChange={e => setHexInput(e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 64))} placeholder="Enter 64-character hex SHA-256 hash…" className="flex-1 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40" spellCheck={false} />
                <button onClick={() => setHexInput(EXAMPLE_HEX)} className="px-4 py-3 rounded-xl text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-border transition-colors whitespace-nowrap">Example</button>
              </div>
              {hexInput.length > 0 && !isValidHex && <p className="text-xs text-destructive mt-2 font-mono">⚠ Hash must be exactly 64 hex characters ({hexInput.length}/64)</p>}
            </Card>
          )}

          {/* Object input */}
          {mode === "object" && (
            <Card className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <Braces size={16} className="text-primary" />
                <span className="text-sm font-bold text-foreground">JSON-LD Object</span>
              </div>
              <textarea value={jsonInput} onChange={e => setJsonInput(e.target.value)} rows={5} placeholder="Paste JSON-LD…" className="w-full rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y" spellCheck={false} />
              <div className="flex items-center gap-3 mt-3">
                <button onClick={handleCompute} disabled={computing} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-mono font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {computing ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                  {computing ? "Computing…" : "Compute & Project"}
                </button>
                <button onClick={() => setJsonInput(EXAMPLE_JSONLD)} className="px-4 py-2 rounded-xl text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-border transition-colors">Example</button>
              </div>
              {objectError && <p className="text-xs text-destructive mt-2 font-mono">⚠ {objectError}</p>}
              {objectResult && (
                <div className="flex items-center gap-2 mt-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs text-primary font-mono">Identity: {objectResult.hex.slice(0, 16)}…</span>
                </div>
              )}
            </Card>
          )}

          {/* Duality visualization */}
          {projections && identityProof && (
            <div className="space-y-6">

              {/* Identity proof banner */}
              {identityProof.allMatch && (
                <div className="rounded-2xl border-2 border-primary/30 bg-primary/[0.04] p-5 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-sm font-mono font-bold text-primary">IDENTITY EQUIVALENCE PROVEN</span>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground">
                    Bitcoin OP_RETURN = Zcash Transparent = Zcash Memo = Nostr Event ID
                  </p>
                  <p className="text-xs font-mono text-foreground mt-1 break-all">{identityProof.btcHash}</p>
                </div>
              )}

              {/* Two-column duality */}
              <div className="grid md:grid-cols-2 gap-6">

                {/* PUBLIC SIDE */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye size={18} className="text-primary" />
                    <h2 className="font-display text-lg font-bold text-foreground">Public Layer</h2>
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-primary/10 text-primary">TRANSPARENT</span>
                  </div>

                  {/* Bitcoin OP_RETURN */}
                  <Card>
                    <div className="flex items-center gap-2 mb-3">
                      <Bitcoin size={16} className="text-primary" />
                      <span className="text-sm font-bold text-foreground">Bitcoin OP_RETURN</span>
                      <span className="text-xs font-mono text-muted-foreground">L1</span>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/30 p-3 mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Script</span>
                        <CopyBtn text={projections.bitcoin.value} />
                      </div>
                      <p className="font-mono text-xs text-foreground break-all select-all">{projections.bitcoin.value}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Immutable on-chain timestamp. Publicly verifiable by any node.</p>
                  </Card>

                  {/* Zcash Transparent */}
                  <Card className="border-primary/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Unlock size={16} className="text-primary" />
                      <span className="text-sm font-bold text-foreground">Zcash Transparent</span>
                      <span className="text-xs font-mono text-muted-foreground">L1</span>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/30 p-3 mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Script</span>
                        <CopyBtn text={projections.zcashTransparent.value} />
                      </div>
                      <p className="font-mono text-xs text-foreground break-all select-all">{projections.zcashTransparent.value}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Check size={12} className="text-primary" />
                      <span className="text-xs font-mono text-primary">Byte-identical to Bitcoin OP_RETURN</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Same script, different chain. Zcash transparent layer IS Bitcoin script.</p>
                  </Card>

                  {/* Nostr */}
                  <Card>
                    <div className="flex items-center gap-2 mb-3">
                      <Hash size={16} className="text-primary" />
                      <span className="text-sm font-bold text-foreground">Nostr Event ID</span>
                      <span className="text-xs font-mono text-muted-foreground">NIP-01</span>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/30 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Event ID</span>
                        <CopyBtn text={projections.nostr.value} />
                      </div>
                      <p className="font-mono text-xs text-foreground break-all select-all">{projections.nostr.value}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Same 256-bit identity, natively addressable on Nostr relays.</p>
                  </Card>
                </div>

                {/* PRIVATE SIDE */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <EyeOff size={18} className="text-foreground" />
                    <h2 className="font-display text-lg font-bold text-foreground">Private Layer</h2>
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-muted text-muted-foreground">SHIELDED</span>
                  </div>

                  {/* Zcash Memo */}
                  <Card className="border-border/60 bg-card/80">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield size={16} className="text-foreground" />
                      <span className="text-sm font-bold text-foreground">Zcash Shielded Memo</span>
                      <span className="text-xs font-mono text-muted-foreground">ZIP-302</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      512-byte encrypted memo attached to a shielded (z-address) note.
                      Only the recipient can decrypt and verify the UOR identity inside.
                    </p>

                    {/* Memo structure breakdown */}
                    <div className="space-y-2 mb-3">
                      <div className="flex items-start gap-3">
                        <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-mono font-bold border bg-destructive/10 text-destructive border-destructive/30 shrink-0">f5</span>
                        <div>
                          <span className="text-sm font-bold text-foreground">Memo Type</span>
                          <p className="text-xs text-muted-foreground">ZIP-302 "no particular meaning" — avoids text collision</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-mono font-bold border bg-accent/15 text-accent-foreground border-accent/30 shrink-0">01</span>
                        <div>
                          <span className="text-sm font-bold text-foreground">UOR Protocol v1</span>
                          <p className="text-xs text-muted-foreground">Protocol version identifier</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-mono font-bold border bg-accent/15 text-accent-foreground border-accent/30 shrink-0">01</span>
                        <div>
                          <span className="text-sm font-bold text-foreground">Payload Type: SHA-256</span>
                          <p className="text-xs text-muted-foreground">Indicates a 32-byte identity hash follows</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-mono font-bold border bg-muted text-foreground border-border shrink-0 max-w-[140px] truncate">{activeHex?.slice(0, 12)}…</span>
                        <div>
                          <span className="text-sm font-bold text-foreground">SHA-256 Identity</span>
                          <p className="text-xs text-muted-foreground">The same 256-bit UOR hash — encrypted at rest</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-mono font-bold border bg-muted/50 text-muted-foreground border-border/50 shrink-0">00×477</span>
                        <div>
                          <span className="text-sm font-bold text-foreground">Zero Padding</span>
                          <p className="text-xs text-muted-foreground">Memo field is always 512 bytes</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-muted/30 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Full Memo (1024 hex)</span>
                        <CopyBtn text={projections.zcashMemo.value} />
                      </div>
                      <p className="font-mono text-xs text-muted-foreground break-all select-all max-h-20 overflow-y-auto">
                        <span className="text-destructive">f5</span>
                        <span className="text-accent-foreground">0101</span>
                        <span className="text-foreground">{projections.zcashMemo.value.slice(6, 70)}</span>
                        <span className="text-muted-foreground/40">{projections.zcashMemo.value.slice(70, 130)}…</span>
                      </p>
                    </div>
                  </Card>

                  {/* HTLC content-gating */}
                  <Card className="border-border/60 bg-card/80">
                    <div className="flex items-center gap-2 mb-3">
                      <Lock size={16} className="text-foreground" />
                      <span className="text-sm font-bold text-foreground">Content-Gated HTLC</span>
                      <span className="text-xs font-mono text-muted-foreground">BIP-199</span>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/30 p-3 mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Hash Lock</span>
                        <CopyBtn text={projections.hashlock.value} />
                      </div>
                      <p className="font-mono text-xs text-foreground break-all select-all">{projections.hashlock.value}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Reveal the object's URDNA2015 form to unlock. Content = Key.</p>
                  </Card>

                  {/* Use cases */}
                  <Card className="border-border/60 bg-card/80">
                    <h3 className="text-sm font-bold text-foreground mb-3">Privacy Use Cases</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <Shield size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-bold text-foreground">Private Proof of Possession</span>
                          <p className="text-xs text-muted-foreground">"I have this object" without revealing which object</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Lock size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-bold text-foreground">Shielded Content Delivery</span>
                          <p className="text-xs text-muted-foreground">Pay-to-reveal where the memo carries the identity</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <ArrowRight size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-bold text-foreground">Cross-Chain Identity</span>
                          <p className="text-xs text-muted-foreground">Same hash in Bitcoin (public) and Zcash memo (private)</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              {/* Architecture insight */}
              <Card className="border-primary/20 bg-primary/[0.03]">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Info size={16} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-bold text-foreground mb-2">The Duality Principle</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Zcash is the only blockchain that implements <strong className="text-foreground">base-layer duality</strong>:
                      a single transaction can exist simultaneously as public (transparent t-address) and private
                      (shielded z-address). UOR maps naturally to this architecture — the <strong className="text-foreground">same 256-bit identity</strong>{" "}
                      anchors both modes. The transparent OP_RETURN is <em>byte-identical</em> to Bitcoin's,
                      proving that Zcash's transparent layer IS Bitcoin script. The shielded memo carries the
                      same identity into privacy via{" "}
                      <code className="font-mono text-xs px-1 py-0.5 rounded bg-muted">ZIP-302</code> encryption.
                      Identity doesn't change — only its visibility does.
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-xs font-mono">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center gap-1 text-primary cursor-help">
                            <Eye size={12} /> Public: 3 projections
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Bitcoin OP_RETURN, Zcash Transparent, Nostr Event ID</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center gap-1 text-muted-foreground cursor-help">
                            <EyeOff size={12} /> Private: 2 projections
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Zcash Shielded Memo, HTLC Content-Gate</TooltipContent>
                      </Tooltip>
                    </div>
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

export default ZcashDualityPage;
