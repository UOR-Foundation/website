/**
 * Unified Agent Card — Visual Dashboard
 * ══════════════════════════════════════
 *
 * One descriptor → one hash → nine ecosystems.
 * Includes ONNX ↔ skill.md integrity proof.
 */

import { useState, useCallback, useMemo } from "react";
import Layout from "@/modules/core/components/Layout";
import BitcoinNav from "@/modules/bitcoin/components/BitcoinNav";
import { createUnifiedCard, verifyModelSkillCoherence, type UnifiedCard } from "@/modules/uns/core/unified-agent-card";
import {
  Bot, Copy, Check, Hash, Loader2, ShieldCheck,
  Fingerprint, Award, Cpu, FileCode, Server, Wallet, Globe, Link2,
} from "lucide-react";

const ECOSYSTEM_META = [
  { key: "identity" as const, label: "DID", sublabel: "Self-Sovereign Identity", icon: Fingerprint, color: "text-blue-400" },
  { key: "credential" as const, label: "VC", sublabel: "Verifiable Credential", icon: Award, color: "text-indigo-400" },
  { key: "onChain" as const, label: "ERC-8004", sublabel: "On-Chain Registry", icon: Link2, color: "text-sky-400" },
  { key: "model" as const, label: "ONNX", sublabel: "Model Identity", icon: Cpu, color: "text-orange-400" },
  { key: "skill" as const, label: "skill.md", sublabel: "Skill Integrity", icon: FileCode, color: "text-amber-400" },
  { key: "service" as const, label: "OASF", sublabel: "Service Descriptor", icon: Server, color: "text-rose-400" },
  { key: "payment" as const, label: "x402", sublabel: "Payment Hash", icon: Wallet, color: "text-green-400" },
  { key: "discovery" as const, label: "ActivityPub", sublabel: "Social Discovery", icon: Globe, color: "text-purple-400" },
  { key: "settlement" as const, label: "Bitcoin", sublabel: "Settlement Anchor", icon: Hash, color: "text-yellow-400" },
] as const;

const DEFAULT_AGENT = JSON.stringify({
  name: "Atlas-7",
  description: "Semantic search agent with multimodal embedding capabilities",
  capabilities: ["semantic-search", "embedding", "classification"],
  model: "atlas-7-v3.onnx",
  endpoints: ["POST /api/search", "GET /api/embed"],
  version: "3.0.0",
}, null, 2);

export default function UnifiedCardPage() {
  const [input, setInput] = useState(DEFAULT_AGENT);
  const [card, setCard] = useState<UnifiedCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    try {
      const agent = JSON.parse(input);
      const result = await createUnifiedCard(agent);
      setCard(result);
    } catch { /* invalid JSON */ }
    setLoading(false);
  }, [input]);

  const copy = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }, []);

  const proof = useMemo(() => card ? verifyModelSkillCoherence(card) : null, [card]);

  return (
    <Layout>
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-4xl mx-auto px-4 py-12">

          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono mb-4">
              <Bot size={14} />
              UNIFIED AGENT CARD
            </div>
            <h1 className="text-3xl font-bold mb-3">
              One Descriptor. One Hash. Nine Ecosystems.
            </h1>
            <p className="text-muted-foreground text-sm max-w-xl mx-auto">
              A single canonical JSON-LD object that holographically projects
              into DID, VC, ERC-8004, ONNX, skill.md, OASF, x402, ActivityPub, and Bitcoin.
            </p>
          </div>

          <BitcoinNav />

          {/* Input */}
          <div className="border border-border rounded-lg p-4 mb-6 bg-card">
            <label className="text-xs font-mono text-muted-foreground mb-2 block">
              Agent Descriptor (JSON)
            </label>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              className="w-full bg-muted/30 border border-border rounded-lg p-3 text-xs font-mono resize-none h-40 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
            <button
              onClick={handleGenerate}
              disabled={loading || !input.trim()}
              className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-mono hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Hash size={12} />}
              Generate Unified Card
            </button>
          </div>

          {card && (
            <>
              {/* Canonical Identity */}
              <div className="border border-primary/30 rounded-lg p-4 mb-6 bg-primary/5">
                <div className="text-xs font-mono text-primary/70 mb-1">Canonical SHA-256 (the ONE hash)</div>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-primary break-all flex-1">{card.hex}</code>
                  <button onClick={() => copy(card.hex, "hex")} className="text-primary/50 hover:text-primary">
                    {copied === "hex" ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              {/* Nine Ecosystems */}
              <div className="mb-8">
                <h2 className="text-sm font-bold mb-4">
                  9 Ecosystem Projections — One Registration
                </h2>
                <div className="grid gap-3">
                  {ECOSYSTEM_META.map(({ key, label, sublabel, icon: Icon, color }) => {
                    const value = card.ecosystems[key];
                    return (
                      <div key={key} className="border border-border rounded-lg p-3 bg-card hover:border-primary/20 transition-colors">
                        <div className="flex items-start gap-3">
                          <Icon size={14} className={`mt-0.5 shrink-0 ${color}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold">{label}</span>
                              <span className="text-[10px] text-muted-foreground">{sublabel}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <code className="text-[11px] font-mono text-foreground/70 break-all flex-1">
                                {value.length > 80 ? `${value.slice(0, 50)}…${value.slice(-20)}` : value}
                              </code>
                              <button onClick={() => copy(value, key)} className="text-muted-foreground hover:text-foreground shrink-0">
                                {copied === key ? <Check size={11} /> : <Copy size={11} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ONNX ↔ skill.md Integrity Proof */}
              {proof && (
                <div className={`border rounded-lg p-4 mb-8 ${
                  proof.coherent
                    ? "border-green-500/30 bg-green-500/5"
                    : "border-red-500/30 bg-red-500/5"
                }`}>
                  <h3 className="text-xs font-bold mb-3 flex items-center gap-2">
                    <ShieldCheck size={14} className={proof.coherent ? "text-green-500" : "text-red-500"} />
                    ONNX ↔ skill.md Integrity Proof
                  </h3>
                  <div className="space-y-2 text-[10px] font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-20">Model hash</span>
                      <span className="text-foreground/70">{proof.modelHash.slice(0, 24)}…</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-20">Skill hash</span>
                      <span className="text-foreground/70">{proof.skillHash.slice(0, 24)}…</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-20">Coherent</span>
                      <span className={proof.coherent ? "text-green-500" : "text-red-500"}>
                        {proof.coherent ? "✓ YES" : "✗ NO"}
                      </span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-border text-muted-foreground">
                      {proof.proof}
                    </div>
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="border border-border rounded-lg p-4 bg-card text-center">
                <div className="text-2xl font-bold text-primary">{card.projections.size}</div>
                <div className="text-[10px] font-mono text-muted-foreground">
                  total hologram projections from this single descriptor
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
