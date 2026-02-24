/**
 * Interoperability Map — Visual Synergy Explorer
 * ═══════════════════════════════════════════════
 *
 * Renders all 145+ hologram projections organized by ecosystem,
 * with animated connection lines showing the 15 synergy chains.
 * Click an ecosystem to focus; click a projection to see its chains.
 */

import { useState, useMemo, useCallback } from "react";
import { ECOSYSTEMS, PROJECTION_ECOSYSTEM } from "../data/ecosystem-taxonomy";
import { SYNERGY_CHAINS, CLUSTERS } from "@/modules/uns/core/hologram/synergies";
import { SPECS } from "@/modules/uns/core/hologram/specs";
import { X, Zap, Link2, Layers, ArrowRight, Info, ChevronDown, ChevronUp } from "lucide-react";
import type { SynergyChain } from "@/modules/uns/core/hologram/synergies";

// ── Bridge type → color ───────────────────────────────────────────────────

const BRIDGE_COLORS: Record<string, string> = {
  encoding: "hsl(200, 55%, 55%)",
  hash: "hsl(35, 80%, 55%)",
  protocol: "hsl(280, 55%, 55%)",
  lifecycle: "hsl(152, 44%, 50%)",
  stack: "hsl(15, 70%, 55%)",
};

// ── Component ──────────────────────────────────────────────────────────────

export function InteroperabilityMap() {
  const [activeEcosystem, setActiveEcosystem] = useState<string | null>(null);
  const [activeProjection, setActiveProjection] = useState<string | null>(null);
  const [activeChain, setActiveChain] = useState<SynergyChain | null>(null);
  const [expandedClusters, setExpandedClusters] = useState(false);

  // Stats
  const totalProjections = SPECS.size;
  const totalChains = SYNERGY_CHAINS.length;
  const totalClusters = Object.keys(CLUSTERS).length;
  const totalEcosystems = ECOSYSTEMS.length;

  // Which chains involve the active projection?
  const relevantChains = useMemo(() => {
    if (!activeProjection) return SYNERGY_CHAINS;
    return SYNERGY_CHAINS.filter(c => c.projections.includes(activeProjection));
  }, [activeProjection]);

  // Which projections are highlighted?
  const highlightedProjections = useMemo(() => {
    const set = new Set<string>();
    if (activeChain) {
      for (const p of activeChain.projections) set.add(p);
    } else if (activeProjection) {
      set.add(activeProjection);
      for (const chain of relevantChains) {
        for (const p of chain.projections) set.add(p);
      }
    }
    return set;
  }, [activeChain, activeProjection, relevantChains]);

  const handleProjectionClick = useCallback((name: string) => {
    setActiveProjection(prev => prev === name ? null : name);
    setActiveChain(null);
  }, []);

  const handleChainClick = useCallback((chain: SynergyChain) => {
    setActiveChain(prev => prev?.name === chain.name ? null : chain);
    setActiveProjection(null);
  }, []);

  const clearAll = useCallback(() => {
    setActiveEcosystem(null);
    setActiveProjection(null);
    setActiveChain(null);
  }, []);

  const ecosystemsToShow = activeEcosystem
    ? ECOSYSTEMS.filter(e => e.id === activeEcosystem)
    : ECOSYSTEMS;

  return (
    <div className="space-y-6">
      {/* ── Stats Bar ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Projections", value: totalProjections, icon: Layers },
          { label: "Ecosystems", value: totalEcosystems, icon: Zap },
          { label: "Synergy Chains", value: totalChains, icon: Link2 },
          { label: "Shared Clusters", value: totalClusters, icon: Info },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-xl font-bold text-foreground">{value}</div>
              <div className="text-[11px] text-muted-foreground">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Ecosystem Filter Pills ─────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={clearAll}
          className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium ${
            !activeEcosystem
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          All Ecosystems
        </button>
        {ECOSYSTEMS.map(eco => (
          <button
            key={eco.id}
            onClick={() => setActiveEcosystem(prev => prev === eco.id ? null : eco.id)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium flex items-center gap-1.5 ${
              activeEcosystem === eco.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: eco.color }} />
            {eco.label}
            <span className="opacity-60">({eco.projections.length})</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Ecosystem Grid ───────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {ecosystemsToShow.map(eco => (
            <EcosystemCard
              key={eco.id}
              ecosystem={eco}
              activeProjection={activeProjection}
              highlightedProjections={highlightedProjections}
              onProjectionClick={handleProjectionClick}
            />
          ))}
        </div>

        {/* ── Right: Synergy Chains Panel ─────────────────────────── */}
        <div className="space-y-4">
          {/* Active selection info */}
          {(activeProjection || activeChain) && (
            <div className="bg-card border border-border rounded-xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-secondary/40">
                <Zap className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground">
                  {activeProjection ? `Synergies for "${activeProjection}"` : activeChain?.name}
                </span>
                <div className="flex-1" />
                <button onClick={clearAll} className="p-0.5 hover:bg-secondary rounded text-muted-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {activeChain && (
                <div className="px-3 py-3 text-xs text-muted-foreground border-b border-border space-y-2">
                  <p className="text-foreground/80">{activeChain.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {activeChain.projections.map((p, i) => (
                      <span key={p} className="flex items-center gap-0.5">
                        <span
                          className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono text-[10px] cursor-pointer hover:bg-primary/20"
                          onClick={() => handleProjectionClick(p)}
                        >
                          {p}
                        </span>
                        {i < activeChain.projections.length - 1 && (
                          <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
                        )}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-foreground/60 italic mt-2">{activeChain.capability}</p>
                </div>
              )}
              {activeChain?.bridges.map((b, i) => (
                <div key={i} className="px-3 py-2 border-b border-border last:border-b-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: BRIDGE_COLORS[b.type] || "hsl(220, 15%, 50%)" }}
                    />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {b.type}
                    </span>
                    <span className="text-[10px] font-mono text-primary ml-auto">{b.sharedComponent}</span>
                  </div>
                  <p className="text-[11px] text-foreground/70">{b.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* Synergy Chain List */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-3 py-2.5 border-b border-border bg-secondary/40">
              <span className="text-xs font-semibold text-foreground">
                {activeProjection ? `${relevantChains.length} Relevant Chains` : `All ${totalChains} Synergy Chains`}
              </span>
            </div>
            <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
              {(activeProjection ? relevantChains : SYNERGY_CHAINS).map(chain => (
                <button
                  key={chain.name}
                  onClick={() => handleChainClick(chain)}
                  className={`w-full text-left px-3 py-2.5 transition-colors ${
                    activeChain?.name === chain.name
                      ? "bg-primary/10"
                      : "hover:bg-secondary/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Link2 className={`w-3 h-3 shrink-0 ${activeChain?.name === chain.name ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-xs font-medium text-foreground">{chain.name}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{chain.projections.length} nodes</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 ml-5">{chain.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Shared Component Clusters */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedClusters(prev => !prev)}
              className="w-full flex items-center gap-2 px-3 py-2.5 border-b border-border bg-secondary/40 hover:bg-secondary/60 transition-colors"
            >
              <span className="text-xs font-semibold text-foreground">Shared Component Clusters</span>
              <span className="text-[10px] text-muted-foreground">({totalClusters})</span>
              <div className="flex-1" />
              {expandedClusters ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
            {expandedClusters && (
              <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
                {Object.entries(CLUSTERS).map(([cluster, members]) => (
                  <div key={cluster} className="px-3 py-2">
                    <div className="text-[10px] font-semibold text-foreground/80 mb-1">{cluster}</div>
                    <div className="flex flex-wrap gap-1">
                      {members.map(m => (
                        <span
                          key={m}
                          onClick={() => handleProjectionClick(m)}
                          className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-mono text-muted-foreground cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Ecosystem Card ────────────────────────────────────────────────────────

function EcosystemCard({
  ecosystem,
  activeProjection,
  highlightedProjections,
  onProjectionClick,
}: {
  ecosystem: (typeof ECOSYSTEMS)[number];
  activeProjection: string | null;
  highlightedProjections: Set<string>;
  onProjectionClick: (name: string) => void;
}) {
  // Only show projections that actually exist in the registry
  const validProjections = ecosystem.projections.filter(p => SPECS.has(p));
  const dimmed = highlightedProjections.size > 0;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ecosystem.color }} />
        <span className="text-sm font-semibold text-foreground">{ecosystem.label}</span>
        <span className="text-[10px] text-muted-foreground font-mono">
          {validProjections.length} projection{validProjections.length !== 1 ? "s" : ""}
        </span>
        <div className="flex-1" />
        <span className="text-[10px] text-muted-foreground hidden sm:block">{ecosystem.description}</span>
      </div>
      <div className="px-4 py-3 flex flex-wrap gap-1.5">
        {validProjections.map(p => {
          const isActive = activeProjection === p;
          const isHighlighted = highlightedProjections.has(p);
          const isDimmed = dimmed && !isHighlighted;
          const spec = SPECS.get(p)!;

          return (
            <button
              key={p}
              onClick={() => onProjectionClick(p)}
              className={`
                group relative px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-medium
                border transition-all duration-150
                ${isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                  : isHighlighted
                    ? "bg-primary/15 text-primary border-primary/30 shadow-sm"
                    : isDimmed
                      ? "bg-secondary/50 text-muted-foreground/40 border-border/50"
                      : "bg-secondary text-foreground border-border hover:border-primary/40 hover:bg-primary/5"
                }
              `}
              title={spec.spec}
            >
              {p}
              <span className={`ml-1 text-[9px] ${
                isActive ? "text-primary-foreground/70" :
                isHighlighted ? "text-primary/60" :
                "text-muted-foreground/50"
              }`}>
                {spec.fidelity === "lossless" ? "●" : "○"}
              </span>
            </button>
          );
        })}
        {ecosystem.projections.length > validProjections.length && (
          <span className="px-2.5 py-1.5 rounded-lg text-[10px] text-muted-foreground/40 italic">
            +{ecosystem.projections.length - validProjections.length} pending
          </span>
        )}
      </div>
    </div>
  );
}
