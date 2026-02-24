/**
 * Interoperability Map — Clean Progressive-Disclosure Explorer
 * ═════════════════════════════════════════════════════════════
 *
 * 10 canonical categories, expandable on click.
 * Select a projection to see its synergy chains.
 * Designed for clarity, trust, and impact.
 */

import { useState, useMemo, useCallback } from "react";
import { ECOSYSTEMS } from "../data/ecosystem-taxonomy";
import { SYNERGY_CHAINS, CLUSTERS } from "@/modules/uns/core/hologram/synergies";
import { SPECS } from "@/modules/uns/core/hologram/specs";
import {
  X, Zap, Link2, Layers, ChevronDown, ChevronRight,
  ArrowRight, Info,
} from "lucide-react";
import type { SynergyChain } from "@/modules/uns/core/hologram/synergies";

// ── Bridge type → color ────────────────────────────────────────────
const BRIDGE_COLORS: Record<string, string> = {
  encoding: "hsl(200, 55%, 55%)",
  hash: "hsl(35, 80%, 55%)",
  protocol: "hsl(280, 55%, 55%)",
  lifecycle: "hsl(152, 44%, 50%)",
  stack: "hsl(15, 70%, 55%)",
};

export function InteroperabilityMap() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [activeProjection, setActiveProjection] = useState<string | null>(null);
  const [activeChain, setActiveChain] = useState<SynergyChain | null>(null);
  const [showAllChains, setShowAllChains] = useState(false);
  const [showClusters, setShowClusters] = useState(false);

  const totalProjections = SPECS.size;
  const totalChains = SYNERGY_CHAINS.length;
  const totalClusters = Object.keys(CLUSTERS).length;

  // Chains relevant to active projection
  const relevantChains = useMemo(() => {
    if (!activeProjection) return [];
    return SYNERGY_CHAINS.filter(c => c.projections.includes(activeProjection));
  }, [activeProjection]);

  // Highlighted projections (from active chain)
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

  const clearSelection = useCallback(() => {
    setActiveProjection(null);
    setActiveChain(null);
  }, []);

  return (
    <div className="space-y-8">
      {/* ── Stats ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Projections", value: totalProjections, icon: Layers },
          { label: "Categories", value: ECOSYSTEMS.length, icon: Zap },
          { label: "Synergy Chains", value: totalChains, icon: Link2 },
          { label: "Shared Clusters", value: totalClusters, icon: Info },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{value}</div>
              <div className="text-sm text-muted-foreground font-medium">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Active Selection Banner ────────────────────────────────── */}
      {(activeProjection || activeChain) && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                {activeProjection
                  ? `"${activeProjection}" — ${relevantChains.length} synergy chain${relevantChains.length !== 1 ? "s" : ""}`
                  : activeChain?.name}
              </span>
            </div>
            <button onClick={clearSelection} className="p-1 hover:bg-secondary rounded-lg text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chain detail */}
          {activeChain && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{activeChain.description}</p>
              <div className="flex flex-wrap items-center gap-1">
                {activeChain.projections.map((p, i) => (
                  <span key={p} className="flex items-center gap-0.5">
                    <button
                      onClick={() => handleProjectionClick(p)}
                      className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-xs hover:bg-primary/20 transition-colors"
                    >
                      {p}
                    </button>
                    {i < activeChain.projections.length - 1 && (
                      <ArrowRight className="w-3 h-3 text-muted-foreground/40" />
                    )}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground/70 italic">{activeChain.capability}</p>
              <div className="grid gap-2 sm:grid-cols-2 mt-2">
                {activeChain.bridges.slice(0, 4).map((b, i) => (
                  <div key={i} className="bg-card border border-border rounded-lg p-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: BRIDGE_COLORS[b.type] || "hsl(220,15%,50%)" }} />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{b.type}</span>
                    </div>
                    <p className="text-[11px] text-foreground/70 leading-relaxed">{b.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Relevant chains for projection */}
          {activeProjection && relevantChains.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {relevantChains.slice(0, 6).map(chain => (
                <button
                  key={chain.name}
                  onClick={() => handleChainClick(chain)}
                  className="text-left bg-card border border-border rounded-lg p-3 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Link2 className="w-3 h-3 text-primary shrink-0" />
                    <span className="text-xs font-medium text-foreground">{chain.name}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{chain.projections.length}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{chain.description}</p>
                </button>
              ))}
              {relevantChains.length > 6 && (
                <div className="flex items-center justify-center text-xs text-muted-foreground">
                  +{relevantChains.length - 6} more chains
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Category Grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ECOSYSTEMS.map(eco => {
          const isExpanded = expandedCategory === eco.id;
          const validProjections = eco.projections.filter(p => SPECS.has(p));
          const pendingCount = eco.projections.length - validProjections.length;
          const dimmed = highlightedProjections.size > 0;

          return (
            <div
              key={eco.id}
              className={`bg-card border rounded-xl overflow-hidden transition-all duration-200 ${
                isExpanded ? "md:col-span-2 border-primary/30 shadow-sm" : "border-border hover:border-primary/20"
              }`}
            >
              {/* Header — always visible */}
              <button
                onClick={() => setExpandedCategory(prev => prev === eco.id ? null : eco.id)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-secondary/30 transition-colors"
              >
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0"
                  style={{ backgroundColor: eco.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-foreground">{eco.label}</span>
                    <span className="px-2 py-0.5 rounded bg-secondary text-xs font-mono font-semibold text-muted-foreground">
                      {validProjections.length}
                    </span>
                  </div>
                  {!isExpanded && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{eco.description}</p>
                  )}
                </div>
                {isExpanded
                  ? <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
                  : <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                }
              </button>

              {/* Expanded — projections */}
              {isExpanded && (
                <div className="px-5 pb-5 animate-in fade-in slide-in-from-top-2 duration-200">
                  <p className="text-sm text-foreground leading-relaxed mb-2">{eco.description}</p>
                  <div className="bg-secondary/50 border border-border rounded-lg p-3 mb-4">
                    <div className="text-xs font-bold text-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-primary" />
                      UOR Expression
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{eco.uorExpression}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {validProjections.map(p => {
                      const isActive = activeProjection === p;
                      const isHighlighted = highlightedProjections.has(p);
                      const isDimmed = dimmed && !isHighlighted;
                      const spec = SPECS.get(p);

                      return (
                        <button
                          key={p}
                          onClick={(e) => { e.stopPropagation(); handleProjectionClick(p); }}
                          className={`
                            px-3 py-2 rounded-lg text-sm font-mono font-semibold
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
                          title={spec?.spec || p}
                        >
                          {p}
                          {spec && (
                            <span className={`ml-1.5 text-xs ${
                              isActive ? "text-primary-foreground/70" :
                              isHighlighted ? "text-primary/60" :
                              "text-muted-foreground/50"
                            }`}>
                              {spec.fidelity === "lossless" ? "●" : "○"}
                            </span>
                          )}
                        </button>
                      );
                    })}
                    {pendingCount > 0 && (
                      <span className="px-3 py-2 rounded-lg text-xs text-muted-foreground/40 italic">
                        +{pendingCount} pending
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Browse All Synergy Chains ──────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setShowAllChains(prev => !prev)}
          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-secondary/30 transition-colors"
        >
          <Link2 className="w-5 h-5 text-primary shrink-0" />
          <span className="text-base font-bold text-foreground">Synergy Chains</span>
          <span className="px-2 py-0.5 rounded bg-secondary text-xs font-mono font-semibold text-muted-foreground">
            {totalChains}
          </span>
          <span className="text-sm text-muted-foreground ml-1 hidden sm:inline">
            — Cross-protocol relationships documented
          </span>
          <div className="flex-1" />
          {showAllChains
            ? <ChevronDown className="w-5 h-5 text-muted-foreground" />
            : <ChevronRight className="w-5 h-5 text-muted-foreground" />
          }
        </button>
        {showAllChains && (
          <div className="border-t border-border divide-y divide-border max-h-[500px] overflow-y-auto">
            {SYNERGY_CHAINS.map(chain => (
              <button
                key={chain.name}
                onClick={() => handleChainClick(chain)}
                className={`w-full text-left px-5 py-3.5 transition-colors ${
                  activeChain?.name === chain.name ? "bg-primary/5" : "hover:bg-secondary/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Link2 className={`w-4 h-4 shrink-0 ${
                    activeChain?.name === chain.name ? "text-primary" : "text-muted-foreground"
                  }`} />
                  <span className="text-sm font-semibold text-foreground">{chain.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{chain.projections.length} nodes</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1 ml-6 line-clamp-1">{chain.description}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Shared Component Clusters ──────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setShowClusters(prev => !prev)}
          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-secondary/30 transition-colors"
        >
          <Info className="w-5 h-5 text-primary shrink-0" />
          <span className="text-base font-bold text-foreground">Shared Clusters</span>
          <span className="px-2 py-0.5 rounded bg-secondary text-xs font-mono font-semibold text-muted-foreground">
            {totalClusters}
          </span>
          <span className="text-sm text-muted-foreground ml-1 hidden sm:inline">
            — Standards sharing underlying identity components
          </span>
          <div className="flex-1" />
          {showClusters
            ? <ChevronDown className="w-5 h-5 text-muted-foreground" />
            : <ChevronRight className="w-5 h-5 text-muted-foreground" />
          }
        </button>
        {showClusters && (
          <div className="border-t border-border divide-y divide-border max-h-[400px] overflow-y-auto">
            {Object.entries(CLUSTERS).map(([cluster, members]) => (
              <div key={cluster} className="px-5 py-3.5">
                <div className="text-sm font-semibold text-foreground mb-2">{cluster}</div>
                <div className="flex flex-wrap gap-1.5">
                  {members.map(m => (
                    <span
                      key={m}
                      onClick={() => handleProjectionClick(m)}
                      className="px-2 py-1 rounded bg-secondary text-xs font-mono font-medium text-muted-foreground cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
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
  );
}
