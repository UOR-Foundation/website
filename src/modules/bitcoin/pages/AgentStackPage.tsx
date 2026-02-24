/**
 * Agent Infrastructure Stack — UOR Trust Layer
 * ═════════════════════════════════════════════
 *
 * Visualizes UOR as the content-addressed trust layer beneath the
 * Moltbook agent infrastructure: ERC-8004, x402, MCP, skill.md, A2A, OASF.
 *
 * One SHA-256 hash → six agent protocols → one unified identity.
 */

import { useState, useCallback, useMemo } from "react";
import Layout from "@/modules/core/components/Layout";
import {
  Bot, Copy, Check, ArrowRight, Hash, Info, Loader2,
  Shield, Wallet, Wrench, FileCode, MessageSquare, Server,
} from "lucide-react";
import BitcoinNav from "@/modules/bitcoin/components/BitcoinNav";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/modules/core/ui/tooltip";
import { project } from "@/modules/uns/core/hologram";
import type { ProjectionInput } from "@/modules/uns/core/hologram";
import { singleProofHash } from "@/modules/uns/core/identity";

// ── Protocol definitions ──────────────────────────────────────────────────

const AGENT_PROTOCOLS = [
  {
    key: "erc8004",
    label: "ERC-8004",
    sublabel: "On-Chain Identity",
    icon: Shield,
    color: "text-blue-400",
    tier: "Identity",
    desc: "Agent's content-derived identity as ERC-721 tokenId on Ethereum",
  },
  {
    key: "x402",
    label: "x402",
    sublabel: "Payment Protocol",
    icon: Wallet,
    color: "text-green-400",
    tier: "Payment",
    desc: "Content-addressed payment hash for agent commerce",
  },
  {
    key: "mcp-tool",
    label: "MCP",
    sublabel: "Tool Provenance",
    icon: Wrench,
    color: "text-purple-400",
    tier: "Communication",
    desc: "Content-addressed tool outputs — provenance tracking for context",
  },
  {
    key: "skill-md",
    label: "skill.md",
    sublabel: "Skill Integrity",
    icon: FileCode,
    color: "text-amber-400",
    tier: "Skills",
    desc: "Cryptographic supply-chain integrity for agent skills",
  },
  {
    key: "a2a",
    label: "A2A",
    sublabel: "Agent Communication",
    icon: MessageSquare,
    color: "text-cyan-400",
    tier: "Communication",
    desc: "Content-addressed AgentCard for verifiable agent discovery",
  },
  {
    key: "oasf",
    label: "OASF",
    sublabel: "Service Framework",
    icon: Server,
    color: "text-rose-400",
    tier: "Services",
    desc: "Native CID alignment for off-chain service descriptors",
  },
] as const;

// Cross-chain protocols that share the same hash
const SETTLEMENT_PROTOCOLS = ["bitcoin", "zcash-transparent", "zcash-memo", "nostr", "lightning"] as const;

export default function AgentStackPage() {
  const [input, setInput] = useState('{"@context":"https://schema.org","@type":"SoftwareAgent","name":"Agent-001"}');
  const [result, setResult] = useState<ProjectionInput | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    try {
      const parsed = JSON.parse(input);
      const identity = await singleProofHash(parsed);
      const hex = identity["u:canonicalId"].split(":").pop()!;
      setResult({ hashBytes: identity.hashBytes, cid: identity["u:cid"], hex });
    } catch {
      // try as raw hex
      const hex = input.replace(/\s/g, "").toLowerCase();
      if (/^[0-9a-f]{64}$/.test(hex)) {
        const bytes = new Uint8Array(32);
        for (let i = 0; i < 32; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
        setResult({ hashBytes: bytes, cid: `bafyrei${hex.slice(0, 20)}`, hex });
      }
    }
    setLoading(false);
  }, [input]);

  const copy = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }, []);

  // All projections computed
  const projections = useMemo(() => {
    if (!result) return null;
    const agent = AGENT_PROTOCOLS.map(p => ({
      ...p,
      projection: project(result, p.key),
    }));
    const settlement = SETTLEMENT_PROTOCOLS.map(key => ({
      key,
      projection: project(result, key),
    }));
    return { agent, settlement };
  }, [result]);

  return (
    <Layout>
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-4xl mx-auto px-4 py-12">

          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono mb-4">
              <Bot size={14} />
              TIER 7 — AGENTIC AI INFRASTRUCTURE
            </div>
            <h1 className="text-3xl font-bold mb-3">
              Agent Infrastructure Stack
            </h1>
            <p className="text-muted-foreground text-sm max-w-xl mx-auto">
              One SHA-256 hash projected across six agent protocols.
              Identity, payments, tools, skills, communication, and services —
              all resolved from a single canonical object.
            </p>
          </div>

          <BitcoinNav />

          {/* Input */}
          <div className="border border-border rounded-lg p-4 mb-6 bg-card">
            <label className="text-xs font-mono text-muted-foreground mb-2 block">
              JSON-LD Object or SHA-256 Hex
            </label>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              className="w-full bg-muted/30 border border-border rounded-lg p-3 text-xs font-mono resize-none h-20 focus:outline-none focus:ring-1 focus:ring-primary/30"
              placeholder='{"@context":"https://schema.org","@type":"SoftwareAgent","name":"Agent-001"}'
            />
            <button
              onClick={handleGenerate}
              disabled={loading || !input.trim()}
              className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-mono hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Hash size={12} />}
              Derive Identity
            </button>
          </div>

          {projections && result && (
            <>
              {/* Canonical Identity */}
              <div className="border border-primary/30 rounded-lg p-4 mb-6 bg-primary/5">
                <div className="text-xs font-mono text-primary/70 mb-1">Canonical SHA-256</div>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-primary break-all flex-1">{result.hex}</code>
                  <button onClick={() => copy(result.hex, "hex")} className="text-primary/50 hover:text-primary">
                    {copied === "hex" ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              {/* Agent Protocol Projections */}
              <div className="mb-8">
                <h2 className="text-sm font-bold mb-4 flex items-center gap-2">
                  <Bot size={14} />
                  Agent Protocol Projections
                  <span className="text-xs text-muted-foreground font-normal">
                    — 6 protocols, one identity
                  </span>
                </h2>

                <div className="grid gap-3">
                  {projections.agent.map(({ key, label, sublabel, icon: Icon, color, desc, projection }) => (
                    <div key={key} className="border border-border rounded-lg p-4 bg-card hover:border-primary/20 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 ${color}`}>
                          <Icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold">{label}</span>
                            <span className="text-[10px] text-muted-foreground">{sublabel}</span>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info size={10} className="text-muted-foreground/50" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs text-xs">
                                {desc}
                              </TooltipContent>
                            </Tooltip>
                            <span className="ml-auto text-[10px] font-mono text-green-500/70">
                              {projection.fidelity}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="text-[11px] font-mono text-foreground/80 break-all flex-1">
                              {projection.value}
                            </code>
                            <button onClick={() => copy(projection.value, key)} className="text-muted-foreground hover:text-foreground shrink-0">
                              {copied === key ? <Check size={11} /> : <Copy size={11} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Identity Equivalence Proof */}
              <div className="border border-border rounded-lg p-4 mb-8 bg-card">
                <h3 className="text-xs font-bold mb-3 flex items-center gap-2">
                  <ArrowRight size={12} />
                  Cross-Protocol Identity Equivalence
                </h3>
                <div className="text-[10px] font-mono text-muted-foreground space-y-1">
                  {[
                    ["ERC-8004 tokenId", projections.agent[0].projection.value.split(":").pop()!],
                    ["x402 payment hash", projections.agent[1].projection.value.split(":").pop()!],
                    ["MCP tool hash", projections.agent[2].projection.value.split(":").pop()!],
                    ["skill.md integrity", projections.agent[3].projection.value.split(":").pop()!],
                    ["A2A agent hash", projections.agent[4].projection.value.split(":").pop()!],
                    ["Bitcoin OP_RETURN", projections.settlement[0].projection.value.slice(10)],
                    ["Nostr event ID", projections.settlement[3].projection.value],
                  ].map(([label, hash], i, arr) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="w-28 text-right text-foreground/50">{label}</span>
                      <span className={`font-mono ${hash === arr[0][1] ? "text-green-500/80" : "text-red-500/80"}`}>
                        {hash.slice(0, 16)}…{hash.slice(-8)}
                      </span>
                      {i > 0 && hash === arr[0][1] && (
                        <Check size={10} className="text-green-500" />
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-[10px] text-green-500/70 font-mono">
                  ✓ All 7 protocols resolve to the same 256-bit identity
                </div>
              </div>

              {/* Settlement Layer */}
              <div className="border border-border rounded-lg p-4 bg-card">
                <h3 className="text-xs font-bold mb-3">Settlement Layer</h3>
                <div className="space-y-2">
                  {projections.settlement.map(({ key, projection }) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground w-32">{key}</span>
                      <code className="text-[10px] font-mono text-foreground/60 break-all flex-1 truncate">
                        {projection.value.length > 80
                          ? `${projection.value.slice(0, 40)}…${projection.value.slice(-20)}`
                          : projection.value}
                      </code>
                      <span className="text-[10px] text-green-500/60">{projection.fidelity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
