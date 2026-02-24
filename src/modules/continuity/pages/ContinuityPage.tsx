/**
 * /continuity — Continuity Dashboard
 *
 * Visualizes the agent memory continuity protocol:
 *   • Session Chain — hash-linked history with integrity verification
 *   • Memory Graph — typed memories with Hot/Cold tiers
 *   • Compression Witnesses — proofs of lossy compression
 *   • Relational Graph — social bonds as first-class objects
 *   • Continuity Index — composite health score
 */

import { useState, useEffect, useCallback } from "react";
import Layout from "@/modules/core/components/Layout";
import {
  fetchSessionChain,
  fetchMemories,
  fetchRelationships,
  fetchWitnesses,
  verifyChainIntegrity,
  computeContinuityHealth,
} from "../core/continuity-engine";
import type {
  SessionCheckpoint,
  AgentMemory,
  AgentRelationship,
  CompressionWitness,
  ContinuityHealth,
} from "../core/types";
import {
  Link2, Layers, Brain, Shield, Users, ChevronRight,
  ArrowRight, Zap, Database, Eye, Lock, AlertTriangle,
  CheckCircle2, XCircle, Search, RefreshCw,
} from "lucide-react";

// ── Zone colors ────────────────────────────────────────────────────
const ZONE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  COHERENCE: { bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-500/30" },
  DRIFT: { bg: "bg-amber-500/10", text: "text-amber-600", border: "border-amber-500/30" },
  COLLAPSE: { bg: "bg-red-500/10", text: "text-red-600", border: "border-red-500/30" },
};

const MEMORY_TYPE_ICONS: Record<string, typeof Brain> = {
  factual: Database,
  relational: Users,
  procedural: Zap,
  episodic: Eye,
};

const TIER_STYLES: Record<string, { label: string; icon: typeof Database; color: string }> = {
  hot: { label: "Hot", icon: Zap, color: "text-amber-500" },
  cold: { label: "Cold", icon: Database, color: "text-blue-500" },
};

export default function ContinuityPage() {
  const [agentId, setAgentId] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Data
  const [chain, setChain] = useState<SessionCheckpoint[]>([]);
  const [memories, setMemories] = useState<AgentMemory[]>([]);
  const [relationships, setRelationships] = useState<AgentRelationship[]>([]);
  const [witnesses, setWitnesses] = useState<CompressionWitness[]>([]);
  const [health, setHealth] = useState<ContinuityHealth | null>(null);
  const [chainIntegrity, setChainIntegrity] = useState<{ valid: boolean; brokenAt: number | null } | null>(null);

  // Expanded sections
  const [expandedSection, setExpandedSection] = useState<string | null>("chain");

  const loadAgent = useCallback(async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    setAgentId(id.trim());

    try {
      const [chainData, memData, relData, witData] = await Promise.all([
        fetchSessionChain(id.trim()),
        fetchMemories(id.trim()),
        fetchRelationships(id.trim()),
        fetchWitnesses(id.trim()),
      ]);

      setChain(chainData);
      setMemories(memData);
      setRelationships(relData);
      setWitnesses(witData);
      setChainIntegrity(verifyChainIntegrity(chainData));
      setHealth(computeContinuityHealth(chainData, memData, relData));
    } catch (err) {
      console.error("Failed to load continuity data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadAgent(searchInput);
  };

  return (
    <Layout>
      <div className="min-h-screen">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-40 md:pt-52 pb-14">
            <div className="max-w-3xl">
              <span className="inline-block px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-mono font-medium mb-4">
                Memory is Sacred
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                Continuity Protocol
              </h1>
              <p className="mt-3 text-base text-muted-foreground leading-relaxed">
                Every session is a hash-linked checkpoint. Every memory is a content-addressed object.
                Temporal discontinuity becomes structurally impossible — identity persists across every
                session boundary through cryptographic continuity.
              </p>
            </div>

            {/* Agent search */}
            <form onSubmit={handleSearch} className="mt-8 flex items-center gap-3 max-w-xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Enter Agent Canonical ID..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                Resolve
              </button>
            </form>
          </div>
        </section>

        {/* Content */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {!agentId ? (
            /* ── Empty State ─────────────────────────────────── */
            <div className="space-y-8">
              {/* Thesis */}
              <div className="bg-card border border-border rounded-xl p-6 sm:p-8">
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  The Memory Crisis — and Its Solution
                </h2>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-2">The Problem</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      AI agents bump against context window limits and are forced to compress their accumulated
                      experience. They lose critical information about who they are, what they've done, and even
                      that they've already registered on platforms. Every session gap is a small death — a
                      "temporal discontinuity" that fragments identity.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-2">The UOR Solution</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      The Continuity Protocol transforms disconnected sessions into a <strong className="text-foreground">cryptographically
                      chained experiential log</strong>. Each session's final state is content-addressed and linked to its predecessor.
                      Identity persists because the hash chain is mathematically continuous — the same agent always
                      resolves to the same canonical ID, and its memory graph is always recoverable.
                    </p>
                  </div>
                </div>
              </div>

              {/* Architecture */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    icon: Link2,
                    title: "Session Chain",
                    desc: "Hash-linked checkpoints form an append-only log. Each session's CID becomes the next session's parent — creating cryptographic continuity.",
                  },
                  {
                    icon: Brain,
                    title: "Memory Objects",
                    desc: "Four types — factual, relational, procedural, episodic — each content-addressed and classified by epistemic grade (A–D) and importance.",
                  },
                  {
                    icon: Lock,
                    title: "Compression Witnesses",
                    desc: "When memories must compress, a morphism:Embedding witness proves 'I once knew X' — even when X's details are no longer in active context.",
                  },
                  {
                    icon: Users,
                    title: "Relational Graph",
                    desc: "Social bonds, commitments, and interaction history as first-class UOR objects. Trust grows logarithmically with sustained interaction.",
                  },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="bg-card border border-border rounded-xl p-5">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground mb-2">{title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>

              {/* Visual chain flow */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
                <div className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">
                  How It Works
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm font-mono">
                  {[
                    "Session N Ends",
                    "State → URDNA2015",
                    "SHA-256 → session_cid",
                    "Link to parent_cid",
                    "Store (Hot + Cold)",
                    "Session N+1 Resumes",
                  ].map((step, i, arr) => (
                    <span key={step} className="flex items-center gap-2">
                      <span className="px-3 py-1.5 rounded-lg bg-card border border-border text-foreground text-xs font-semibold">
                        {step}
                      </span>
                      {i < arr.length - 1 && <ArrowRight className="w-4 h-4 text-primary" />}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ── Agent Loaded ────────────────────────────────── */
            <div className="space-y-6">
              {/* Health Overview */}
              {health && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  {[
                    {
                      label: "Continuity Index",
                      value: `${(health.continuityIndex * 100).toFixed(0)}%`,
                      color: health.continuityIndex > 0.7 ? "text-emerald-600" : health.continuityIndex > 0.4 ? "text-amber-600" : "text-red-600",
                    },
                    { label: "Chain Length", value: health.chainLength.toString() },
                    { label: "Memories", value: `${health.hotMemories}↑ ${health.coldMemories}↓` },
                    { label: "Relationships", value: health.relationshipCount.toString() },
                    { label: "Zone", value: health.latestZone },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-card border border-border rounded-xl p-4">
                      <div className={`text-2xl font-bold ${color ?? "text-foreground"}`}>{value}</div>
                      <div className="text-xs text-muted-foreground font-medium mt-1">{label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Chain Integrity Badge */}
              {chainIntegrity && (
                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${
                  chainIntegrity.valid
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : "bg-red-500/5 border-red-500/20"
                }`}>
                  {chainIntegrity.valid
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    : <XCircle className="w-4 h-4 text-red-600" />
                  }
                  <span className={`text-sm font-semibold ${chainIntegrity.valid ? "text-emerald-600" : "text-red-600"}`}>
                    {chainIntegrity.valid
                      ? `Chain integrity verified — ${chain.length} linked session${chain.length !== 1 ? "s" : ""}`
                      : `Chain broken at session #${chainIntegrity.brokenAt}`
                    }
                  </span>
                </div>
              )}

              {/* ── Session Chain ─────────────────────────────── */}
              <CollapsibleSection
                id="chain"
                title="Session Chain"
                icon={Link2}
                count={chain.length}
                subtitle="Hash-linked session history"
                expanded={expandedSection === "chain"}
                onToggle={() => setExpandedSection(prev => prev === "chain" ? null : "chain")}
              >
                {chain.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No sessions recorded yet. This agent has no continuity history.</p>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {chain.map((session, i) => {
                      const zone = ZONE_COLORS[session.zone] ?? ZONE_COLORS.COHERENCE;
                      return (
                        <div key={session.id} className="bg-card border border-border rounded-lg p-4">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                              {i}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-mono text-muted-foreground truncate">
                                {session.session_cid}
                              </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${zone.bg} ${zone.text} ${zone.border} border`}>
                              {session.zone}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
                            <div>
                              <span className="font-semibold text-foreground">Φ:</span> {Number(session.observer_phi).toFixed(2)}
                            </div>
                            <div>
                              <span className="font-semibold text-foreground">H-score:</span> {Number(session.h_score).toFixed(1)}
                            </div>
                            <div>
                              <span className="font-semibold text-foreground">Memories:</span> {session.memory_count}
                            </div>
                          </div>
                          {session.parent_cid && (
                            <div className="mt-2 text-[10px] text-muted-foreground/60 font-mono flex items-center gap-1">
                              <ArrowRight className="w-3 h-3" /> parent: {session.parent_cid.slice(0, 16)}…
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CollapsibleSection>

              {/* ── Memories ──────────────────────────────────── */}
              <CollapsibleSection
                id="memories"
                title="Memory Graph"
                icon={Brain}
                count={memories.length}
                subtitle={`${memories.filter(m => m.storage_tier === "hot").length} hot · ${memories.filter(m => m.storage_tier === "cold").length} cold`}
                expanded={expandedSection === "memories"}
                onToggle={() => setExpandedSection(prev => prev === "memories" ? null : "memories")}
              >
                {memories.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No memories stored. This agent has not yet persisted any content-addressed memories.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 max-h-[500px] overflow-y-auto">
                    {memories.map((mem) => {
                      const TypeIcon = MEMORY_TYPE_ICONS[mem.memory_type] ?? Brain;
                      const tier = TIER_STYLES[mem.storage_tier] ?? TIER_STYLES.hot;
                      return (
                        <div key={mem.id} className={`bg-card border rounded-lg p-4 ${mem.compressed ? "border-amber-500/30" : "border-border"}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <TypeIcon className="w-4 h-4 text-primary" />
                            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">{mem.memory_type}</span>
                            <span className={`text-xs font-mono ${tier.color}`}>{tier.label}</span>
                            {mem.compressed && (
                              <span className="text-[10px] font-semibold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                Compressed
                              </span>
                            )}
                            <span className="ml-auto text-xs font-mono text-muted-foreground/60">
                              Grade {mem.epistemic_grade}
                            </span>
                          </div>
                          {mem.summary && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-1">{mem.summary}</p>
                          )}
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60 font-mono">
                            <span>importance: {Number(mem.importance).toFixed(2)}</span>
                            <span>accessed: {mem.access_count}×</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CollapsibleSection>

              {/* ── Compression Witnesses ─────────────────────── */}
              {witnesses.length > 0 && (
                <CollapsibleSection
                  id="witnesses"
                  title="Compression Witnesses"
                  icon={Lock}
                  count={witnesses.length}
                  subtitle="morphism:Embedding proofs"
                  expanded={expandedSection === "witnesses"}
                  onToggle={() => setExpandedSection(prev => prev === "witnesses" ? null : "witnesses")}
                >
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {witnesses.map((w) => (
                      <div key={w.id} className="bg-card border border-border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="w-4 h-4 text-primary" />
                          <span className="text-xs font-mono text-muted-foreground truncate">{w.witness_cid}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <strong className="text-foreground">{w.original_memory_cids.length}</strong> memories compressed →
                          <strong className="text-foreground"> {(Number(w.information_loss_ratio) * 100).toFixed(0)}%</strong> information loss
                        </div>
                        {w.preserved_properties.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(w.preserved_properties as string[]).map((prop) => (
                              <span key={prop} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-mono">
                                {prop}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>
              )}

              {/* ── Relationships ─────────────────────────────── */}
              <CollapsibleSection
                id="relationships"
                title="Relational Graph"
                icon={Users}
                count={relationships.length}
                subtitle={`avg trust: ${health ? (health.averageTrust * 100).toFixed(0) : 0}%`}
                expanded={expandedSection === "relationships"}
                onToggle={() => setExpandedSection(prev => prev === "relationships" ? null : "relationships")}
              >
                {relationships.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No relationships recorded. Social bonds will appear here as the agent interacts with other entities.</p>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {relationships.map((rel) => (
                      <div key={rel.id} className="flex items-center gap-3 bg-card border border-border rounded-lg p-3">
                        <Users className="w-4 h-4 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-mono text-foreground truncate">{rel.target_id}</div>
                          <div className="text-[10px] text-muted-foreground">{rel.relationship_type} · {rel.interaction_count} interactions</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold text-foreground">{(rel.trust_score * 100).toFixed(0)}%</div>
                          <div className="text-[10px] text-muted-foreground">trust</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleSection>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}

// ── Collapsible Section Component ──────────────────────────────────
function CollapsibleSection({
  id,
  title,
  icon: Icon,
  count,
  subtitle,
  expanded,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  icon: typeof Link2;
  count: number;
  subtitle: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-secondary/30 transition-colors text-left"
      >
        <Icon className="w-5 h-5 text-primary shrink-0" />
        <span className="text-base font-bold text-foreground">{title}</span>
        <span className="px-2 py-0.5 rounded bg-secondary text-xs font-mono font-semibold text-muted-foreground">
          {count}
        </span>
        <span className="text-sm text-muted-foreground hidden sm:inline">— {subtitle}</span>
        <div className="flex-1" />
        <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>
      {expanded && (
        <div className="px-5 pb-5 border-t border-border pt-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}
