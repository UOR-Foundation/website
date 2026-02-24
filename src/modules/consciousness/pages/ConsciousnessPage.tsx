/**
 * Landscape of Consciousness — Interactive Visualization
 * ══════════════════════════════════════════════════════
 *
 * Force-directed graph + UOR isomorphism explorer for the
 * Closer to Truth Landscape of Consciousness taxonomy.
 *
 * @module consciousness/pages/ConsciousnessPage
 */

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Brain, ChevronDown, ChevronRight, ExternalLink,
  Filter, Info, Layers, Network, Zap,
} from "lucide-react";
import {
  THEORIES, LOC_CATEGORIES, LOC_IMPLICATIONS,
  type ConsciousnessTheory, type LocCategory,
} from "../data/landscape";
import {
  LOC_UOR_ISOMORPHISM, connectionFactorDistance, classifyMorphism,
  categoryToPartition,
} from "../data/uor-mapping";

// ── Force simulation (simple spring-force in 2D) ─────────────────────────

interface SimNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  theory: ConsciousnessTheory;
}

function useForceSimulation(
  theories: readonly ConsciousnessTheory[],
  width: number,
  height: number,
) {
  const nodesRef = useRef<SimNode[]>([]);
  const [tick, setTick] = useState(0);

  // Initialize nodes
  useEffect(() => {
    const cx = width / 2;
    const cy = height / 2;
    nodesRef.current = theories.map((t, i) => {
      // Position by axes: x = scale (quantum level), y = materialism-idealism
      const xTarget = 80 + (t.quantumLevel / 7) * (width - 160);
      const yTarget = 40 + t.materialismIdealismAxis * (height - 80);
      return {
        id: t.id,
        x: xTarget + (Math.random() - 0.5) * 40,
        y: yTarget + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0,
        theory: t,
      };
    });
    setTick(0);
  }, [theories, width, height]);

  // Run simulation
  useEffect(() => {
    let frame: number;
    let count = 0;
    const maxTicks = 200;

    const step = () => {
      const nodes = nodesRef.current;
      const alpha = Math.max(0.01, 1 - count / maxTicks);

      // Repulsion between all nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.max(10, Math.sqrt(dx * dx + dy * dy));
          const force = (600 * alpha) / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          nodes[i].vx -= fx;
          nodes[i].vy -= fy;
          nodes[j].vx += fx;
          nodes[j].vy += fy;
        }
      }

      // Attraction along connections
      for (const node of nodes) {
        for (const connId of node.theory.connections) {
          const target = nodes.find(n => n.id === connId);
          if (!target) continue;
          const dx = target.x - node.x;
          const dy = target.y - node.y;
          const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
          const force = (dist - 80) * 0.01 * alpha;
          node.vx += (dx / dist) * force;
          node.vy += (dy / dist) * force;
        }
      }

      // Gravity toward ideal positions
      for (const node of nodes) {
        const xTarget = 80 + (node.theory.quantumLevel / 7) * (width - 160);
        const yTarget = 40 + node.theory.materialismIdealismAxis * (height - 80);
        node.vx += (xTarget - node.x) * 0.02 * alpha;
        node.vy += (yTarget - node.y) * 0.02 * alpha;
      }

      // Integrate + damping
      for (const node of nodes) {
        node.vx *= 0.85;
        node.vy *= 0.85;
        node.x += node.vx;
        node.y += node.vy;
        node.x = Math.max(20, Math.min(width - 20, node.x));
        node.y = Math.max(20, Math.min(height - 20, node.y));
      }

      count++;
      setTick(count);
      if (count < maxTicks) {
        frame = requestAnimationFrame(step);
      }
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [theories, width, height]);

  return nodesRef.current;
}

// ── Component ─────────────────────────────────────────────────────────────

export default function ConsciousnessPage() {
  const [selectedCategory, setSelectedCategory] = useState<LocCategory | "all">("all");
  const [selectedTheory, setSelectedTheory] = useState<ConsciousnessTheory | null>(null);
  const [showIsomorphism, setShowIsomorphism] = useState(false);
  const [showImplications, setShowImplications] = useState(false);

  const filteredTheories = useMemo(() =>
    selectedCategory === "all"
      ? THEORIES
      : THEORIES.filter(t => t.category === selectedCategory),
    [selectedCategory],
  );

  const svgWidth = 900;
  const svgHeight = 520;
  const nodes = useForceSimulation(filteredTheories, svgWidth, svgHeight);

  const getCategoryMeta = useCallback((id: LocCategory) =>
    LOC_CATEGORIES.find(c => c.id === id), [],
  );

  // Build edges
  const edges = useMemo(() => {
    const result: { from: SimNode; to: SimNode; distance: number }[] = [];
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    for (const node of nodes) {
      for (const connId of node.theory.connections) {
        const target = nodeMap.get(connId);
        if (target && node.id < connId) {
          result.push({
            from: node,
            to: target,
            distance: connectionFactorDistance(
              node.theory.connectionFactors,
              target.theory.connectionFactors,
            ),
          });
        }
      }
    }
    return result;
  }, [nodes]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <Brain className="w-5 h-5 text-primary" />
          <h1 className="text-sm font-semibold tracking-tight">Landscape of Consciousness × UOR</h1>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground">
            {THEORIES.length} theories · {LOC_CATEGORIES.length} categories · 5 morphism dimensions
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Hero */}
        <section className="space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Consciousness as a UOR Domain
          </h2>
          <p className="text-muted-foreground text-sm max-w-3xl leading-relaxed">
            The{" "}
            <a
              href="https://loc.closertotruth.com/interactive"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Closer to Truth Landscape of Consciousness
            </a>
            {" "}maps 300+ theories across 10 categories, connected by 5 structural factors.
            This is not merely a projection — it's a <strong>complete domain instantiation</strong> of the UOR framework,
            where every theory is a content-addressed datum, every category is a context, and every
            connection is a morphism in a 5-dimensional factor space.
          </p>
          <Link
            to="/consciousness/god-conjecture"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
          >
            <span className="text-base">צ</span>
            God Conjecture × UOR — The Tzimtzum Discovery
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </section>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setSelectedCategory("all"); setSelectedTheory(null); }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedCategory === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            All ({THEORIES.length})
          </button>
          {LOC_CATEGORIES.map(cat => {
            const count = THEORIES.filter(t => t.category === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => { setSelectedCategory(cat.id); setSelectedTheory(null); }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                  selectedCategory === cat.id
                    ? "border-transparent text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
                style={selectedCategory === cat.id ? { background: cat.color } : {}}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Force Graph */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Theory Network</h3>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono">
              <span>x: Quantum Level (Q0→Q7)</span>
              <span>y: Materialism → Idealism</span>
              <span>size: Scholarly Interest</span>
            </div>
          </div>

          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full" style={{ minHeight: 350 }}>
            {/* Background axis labels */}
            <text x={svgWidth / 2} y={svgHeight - 8} textAnchor="middle" fontSize={9} fill="hsl(var(--muted-foreground))" opacity={0.5}>
              Order of Magnitude: Quantum → Cellular → Neuronal → Neural Net → Brain → Body → Extended Mind → Universe
            </text>
            <text x={8} y={svgHeight / 2} textAnchor="middle" fontSize={9} fill="hsl(var(--muted-foreground))" opacity={0.5} transform={`rotate(-90, 8, ${svgHeight / 2})`}>
              Materialism ← → Idealism
            </text>

            {/* Edges */}
            {edges.map((e, i) => (
              <line
                key={i}
                x1={e.from.x}
                y1={e.from.y}
                x2={e.to.x}
                y2={e.to.y}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={Math.max(0.3, 1.5 - e.distance * 2)}
                opacity={Math.max(0.1, 0.5 - e.distance * 0.5)}
              />
            ))}

            {/* Nodes */}
            {nodes.map(node => {
              const cat = getCategoryMeta(node.theory.category);
              const isSelected = selectedTheory?.id === node.id;
              const r = 3 + node.theory.scholarlyInterest * 0.7;
              return (
                <g
                  key={node.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedTheory(isSelected ? null : node.theory)}
                >
                  {isSelected && (
                    <circle
                      cx={node.x} cy={node.y} r={r + 5}
                      fill="none" stroke={cat?.color || "hsl(var(--primary))"} strokeWidth={1.5}
                      opacity={0.6}
                    >
                      <animate attributeName="r" values={`${r + 4};${r + 7};${r + 4}`} dur="1.5s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={r}
                    fill={cat?.color || "hsl(var(--primary))"}
                    opacity={0.85}
                    stroke={isSelected ? "hsl(var(--foreground))" : "none"}
                    strokeWidth={isSelected ? 1.5 : 0}
                  />
                  {(isSelected || r > 7) && (
                    <text
                      x={node.x}
                      y={node.y - r - 4}
                      textAnchor="middle"
                      fontSize={isSelected ? 10 : 8}
                      fill="hsl(var(--foreground))"
                      fontWeight={isSelected ? 600 : 400}
                    >
                      {node.theory.name.length > 25
                        ? node.theory.name.slice(0, 22) + "…"
                        : node.theory.name}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 px-5 py-2.5 border-t border-border text-[10px] text-muted-foreground">
            {LOC_CATEGORIES.map(cat => (
              <span key={cat.id} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                {cat.name}
              </span>
            ))}
          </div>
        </div>

        {/* Selected Theory Detail */}
        {selectedTheory && (
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full text-primary-foreground font-medium"
                  style={{ background: getCategoryMeta(selectedTheory.category)?.color }}
                >
                  {getCategoryMeta(selectedTheory.category)?.name}
                </span>
                <h3 className="text-lg font-bold mt-2">{selectedTheory.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{selectedTheory.description}</p>
              </div>
              <a
                href={selectedTheory.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* UOR Mapping */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-secondary/50 rounded-lg p-3">
                <div className="text-muted-foreground">Quantum Level</div>
                <div className="font-mono font-bold text-sm mt-0.5">
                  Q{selectedTheory.quantumLevel}
                  <span className="text-muted-foreground font-normal ml-1">
                    ({selectedTheory.scale})
                  </span>
                </div>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3">
                <div className="text-muted-foreground">Ring Partition</div>
                <div className="font-mono font-bold text-sm mt-0.5">
                  {categoryToPartition(selectedTheory.materialismIdealismAxis)}
                </div>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3">
                <div className="text-muted-foreground">Scholarly Interest</div>
                <div className="font-mono font-bold text-sm mt-0.5">
                  {selectedTheory.scholarlyInterest}/10
                </div>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3">
                <div className="text-muted-foreground">Complexity (Stratum)</div>
                <div className="font-mono font-bold text-sm mt-0.5">
                  {selectedTheory.complexity}/10
                </div>
              </div>
            </div>

            {/* Connection Factors (5D Morphism Vector) */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                Morphism Vector (5 Connection Factors)
              </h4>
              <div className="space-y-1.5">
                {[
                  { label: "Metaphysical Assumptions", value: selectedTheory.connectionFactors.metaphysicalAssumptions },
                  { label: "Locus / Level", value: selectedTheory.connectionFactors.locusLevel },
                  { label: "Methods of Study", value: selectedTheory.connectionFactors.methodsOfStudy },
                  { label: "Confidence in Discernment", value: selectedTheory.connectionFactors.confidenceInDiscernment },
                  { label: "Implications Openness", value: selectedTheory.connectionFactors.implicationsOpenness },
                ].map(f => (
                  <div key={f.label} className="flex items-center gap-3 text-xs">
                    <span className="w-40 text-muted-foreground">{f.label}</span>
                    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${f.value * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-right font-mono">{(f.value * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Connected Theories */}
            {selectedTheory.connections.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                  Connected Theories (Morphism Links)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTheory.connections.map(connId => {
                    const conn = THEORIES.find(t => t.id === connId);
                    if (!conn) return null;
                    const morphType = classifyMorphism(selectedTheory.quantumLevel, conn.quantumLevel);
                    const dist = connectionFactorDistance(selectedTheory.connectionFactors, conn.connectionFactors);
                    return (
                      <button
                        key={connId}
                        onClick={() => setSelectedTheory(conn)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/50 hover:bg-secondary text-xs transition-colors"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: getCategoryMeta(conn.category)?.color }}
                        />
                        <span>{conn.name}</span>
                        <span className="text-muted-foreground font-mono text-[9px]">
                          {morphType === "ProjectionHomomorphism" ? "π" : morphType === "InclusionHomomorphism" ? "ι" : "id"}
                          {" "}d={dist.toFixed(2)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Implications (Entailment Cones) */}
            {selectedTheory.implications.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                  Entailment Cones (Implications)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTheory.implications.map(imp => {
                    const meta = LOC_IMPLICATIONS.find(i => i.id === imp);
                    return (
                      <span key={imp} className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium">
                        {meta?.name || imp}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* UOR Structural Isomorphism Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowIsomorphism(!showIsomorphism)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-secondary/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">LoC → UOR Structural Isomorphism</h3>
              <span className="text-[10px] text-muted-foreground font-mono">
                {LOC_UOR_ISOMORPHISM.length} mappings
              </span>
            </div>
            {showIsomorphism ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {showIsomorphism && (
            <div className="border-t border-border divide-y divide-border">
              {LOC_UOR_ISOMORPHISM.map((mapping, i) => (
                <div key={i} className="px-5 py-3 grid grid-cols-[auto_1fr_1fr_2fr] gap-4 text-xs items-start">
                  <span className="text-lg">{mapping.icon}</span>
                  <div>
                    <div className="font-semibold">{mapping.locConcept}</div>
                    <div className="text-muted-foreground text-[10px]">LoC</div>
                  </div>
                  <div>
                    <div className="font-semibold text-primary">{mapping.uorPrimitive}</div>
                    <div className="text-muted-foreground text-[10px]">UOR</div>
                  </div>
                  <div className="text-muted-foreground leading-relaxed">{mapping.proof}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category → UOR Context Mapping */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Category → UOR Context Mapping</h3>
          </div>
          <div className="divide-y divide-border">
            {LOC_CATEGORIES.map(cat => (
              <div key={cat.id} className="px-5 py-3 grid grid-cols-[auto_1fr_1fr] gap-4 text-xs items-start">
                <span className="w-3 h-3 rounded-full mt-0.5" style={{ background: cat.color }} />
                <div>
                  <div className="font-semibold">{cat.name}</div>
                  <div className="text-muted-foreground mt-0.5">{cat.uorContextDescription}</div>
                </div>
                <div>
                  <div className="font-mono text-primary">{categoryToPartition(cat.spectrumPosition)}</div>
                  <div className="text-muted-foreground mt-0.5">{cat.ringPartitionAnalogy}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Implications → Entailment Cones */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowImplications(!showImplications)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-secondary/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Implications as Entailment Cones</h3>
            </div>
            {showImplications ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {showImplications && (
            <div className="border-t border-border divide-y divide-border">
              {LOC_IMPLICATIONS.map(imp => {
                const supporting = THEORIES.filter(t => t.implications.includes(imp.id));
                return (
                  <div key={imp.id} className="px-5 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-sm">{imp.name}</div>
                        <div className="text-xs text-muted-foreground">{imp.description}</div>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">
                        {supporting.length} theories
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {supporting.map(t => (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTheory(t)}
                          className="px-2 py-0.5 rounded text-[10px] bg-secondary/50 hover:bg-secondary transition-colors"
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Attribution */}
        <div className="text-center text-xs text-muted-foreground py-4 border-t border-border">
          Data sourced from the{" "}
          <a href="https://loc.closertotruth.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Landscape of Consciousness
          </a>
          {" "}by the Kuhn Foundation / Closer to Truth. UOR structural mapping by the UOR Foundation.
        </div>
      </main>
    </div>
  );
}
