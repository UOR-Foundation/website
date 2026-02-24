/**
 * Coherence Gate — Visual Report
 * ═══════════════════════════════
 *
 * Invoke the gate, see the full cross-framework synergy map.
 */

import { useMemo } from "react";
import Layout from "@/modules/core/components/Layout";
import BitcoinNav from "@/modules/bitcoin/components/BitcoinNav";
import { coherenceGate, type Synergy, type SynergyType } from "@/modules/uns/core/hologram/coherence-gate";
import {
  Zap, Link, Search, GitBranch, Puzzle, ShieldCheck, Lightbulb, Layers,
} from "lucide-react";

const TYPE_META: Record<SynergyType, { icon: typeof Zap; color: string; label: string }> = {
  "identity-equivalence": { icon: Link, color: "text-blue-400", label: "Identity Equivalence" },
  "settlement-bridge": { icon: ShieldCheck, color: "text-amber-400", label: "Settlement Bridge" },
  "discovery-channel": { icon: Search, color: "text-green-400", label: "Discovery Channel" },
  "provenance-chain": { icon: GitBranch, color: "text-purple-400", label: "Provenance Chain" },
  "complementary-pair": { icon: Puzzle, color: "text-cyan-400", label: "Complementary Pair" },
  "trust-amplification": { icon: Zap, color: "text-rose-400", label: "Trust Amplification" },
};

function SynergyCard({ synergy }: { synergy: Synergy }) {
  const meta = TYPE_META[synergy.type];
  const Icon = meta.icon;
  return (
    <div className="border border-border rounded-lg p-4 bg-card hover:border-primary/20 transition-colors">
      <div className="flex items-start gap-3">
        <Icon size={14} className={`mt-0.5 shrink-0 ${meta.color}`} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {synergy.projections[0]}
            </span>
            <span className="text-[10px] text-muted-foreground">↔</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {synergy.projections[1]}
            </span>
            <span className={`text-[10px] font-medium ml-auto ${meta.color}`}>{meta.label}</span>
          </div>
          <p className="text-xs text-foreground/80 mb-1">{synergy.insight}</p>
          <p className="text-[10px] text-muted-foreground">{synergy.useCase}</p>
          <p className="text-[10px] font-mono text-primary/50 mt-1">{synergy.implementation}</p>
        </div>
      </div>
    </div>
  );
}

export default function CoherenceGatePage() {
  const report = useMemo(() => coherenceGate(), []);

  const byType = useMemo(() => {
    const map = new Map<SynergyType, Synergy[]>();
    for (const s of report.synergies) {
      if (!map.has(s.type)) map.set(s.type, []);
      map.get(s.type)!.push(s);
    }
    return map;
  }, [report]);

  return (
    <Layout>
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-4xl mx-auto px-4 py-12">

          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono mb-4">
              <Zap size={14} />
              COHERENCE GATE
            </div>
            <h1 className="text-3xl font-bold mb-3">
              Cross-Framework Synergy Report
            </h1>
            <p className="text-muted-foreground text-sm max-w-xl mx-auto">
              One invocation analyzes the entire hologram projection registry.
              Every cross-framework synergy, cluster, and opportunity — discovered automatically.
            </p>
          </div>

          <BitcoinNav />

          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { label: "Projections", value: report.totalProjections },
              { label: "Lossless", value: report.losslessCount },
              { label: "Synergies", value: report.synergies.length },
              { label: "Opportunities", value: report.opportunities.length },
            ].map(({ label, value }) => (
              <div key={label} className="border border-border rounded-lg p-3 bg-card text-center">
                <div className="text-2xl font-bold text-primary">{value}</div>
                <div className="text-[10px] font-mono text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>

          {/* Opportunities */}
          <div className="border border-primary/30 rounded-lg p-4 mb-8 bg-primary/5">
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Lightbulb size={14} className="text-primary" />
              Implementation Opportunities
            </h2>
            <div className="space-y-2">
              {report.opportunities.map((opp, i) => (
                <div key={i} className="text-xs text-foreground/80 flex gap-2">
                  <span className="text-primary font-mono shrink-0">{i + 1}.</span>
                  <span>{opp}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Clusters */}
          <div className="border border-border rounded-lg p-4 mb-8 bg-card">
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Layers size={14} />
              Projection Clusters
            </h2>
            <div className="space-y-3">
              {report.clusters.slice(0, 10).map(cluster => (
                <div key={cluster.name}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold">{cluster.name}</span>
                    <span className="text-[10px] text-muted-foreground">— {cluster.property}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {cluster.members.map(m => (
                      <span key={m} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Synergies by type */}
          {[...byType.entries()].map(([type, synergies]) => (
            <div key={type} className="mb-8">
              <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
                {(() => { const Icon = TYPE_META[type].icon; return <Icon size={14} className={TYPE_META[type].color} />; })()}
                {TYPE_META[type].label}
                <span className="text-[10px] text-muted-foreground font-normal ml-1">
                  ({synergies.length})
                </span>
              </h2>
              <div className="grid gap-3">
                {synergies.map((s, i) => (
                  <SynergyCard key={i} synergy={s} />
                ))}
              </div>
            </div>
          ))}

          {/* Footer */}
          <div className="text-center text-[10px] font-mono text-muted-foreground mt-12">
            Generated {report.timestamp} · {report.totalProjections} projections · {report.synergies.length} synergies
          </div>
        </div>
      </div>
    </Layout>
  );
}
