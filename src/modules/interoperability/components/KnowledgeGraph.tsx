/**
 * Interactive Knowledge Graph — Force-directed visualization
 * ════════════════════════════════════════════════════════════
 *
 * UOR sits at the center. 12 canonical categories orbit it.
 * Click a category to expand its projections.
 * Synergy chain edges connect standards across categories.
 * Every node links back to UOR — confirming canonical encoding.
 *
 * Key thesis: Everything is an object addressable by its attributes.
 * UOR is THE interoperability layer connecting all standards.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceRadial,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import { ECOSYSTEMS, PROJECTION_ECOSYSTEM } from "../data/ecosystem-taxonomy";
import { SYNERGY_CHAINS } from "@/modules/uns/core/hologram/synergies";
import { SPECS } from "@/modules/uns/core/hologram/specs";
import { X, ZoomIn, ZoomOut, Maximize2, Info, Layers, ArrowRight, Link2 } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────
interface GraphNode extends SimulationNodeDatum {
  id: string;
  label: string;
  type: "uor" | "category" | "projection";
  color: string;
  categoryId?: string;
  radius: number;
  fidelity?: string;
}

interface GraphLink extends SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  type: "canonical" | "category" | "synergy";
  chainName?: string;
}

// ── Constants ────────────────────────────────────────────────────────
const UOR_COLOR = "hsl(220, 70%, 55%)";
const SYNERGY_COLOR = "hsl(35, 80%, 55%)";
const LOSSLESS_COLOR = "hsl(152, 60%, 55%)";

export function KnowledgeGraph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<Simulation<GraphNode, GraphLink> | null>(null);

  const [dimensions, setDimensions] = useState({ width: 900, height: 650 });
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [, setTick] = useState(0);

  // ── Responsive sizing ──────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setDimensions({ width: Math.max(width, 300), height: Math.max(height, 400) });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ── Build graph data ───────────────────────────────────────────────
  const { nodes, links } = useMemo(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeSet = new Set<string>();

    // UOR center — large hub
    nodes.push({
      id: "uor",
      label: "UOR",
      type: "uor",
      color: UOR_COLOR,
      radius: 38,
    });
    nodeSet.add("uor");

    // Category nodes
    for (const eco of ECOSYSTEMS) {
      nodes.push({
        id: eco.id,
        label: eco.label,
        type: "category",
        color: eco.color,
        categoryId: eco.id,
        radius: 22,
      });
      nodeSet.add(eco.id);
      links.push({ source: "uor", target: eco.id, type: "canonical" });
    }

    // Expanded projection nodes
    for (const catId of expandedCategories) {
      const eco = ECOSYSTEMS.find(e => e.id === catId);
      if (!eco) continue;
      const validProjections = eco.projections.filter(p => SPECS.has(p));
      for (const p of validProjections) {
        if (!nodeSet.has(p)) {
          const spec = SPECS.get(p);
          nodes.push({
            id: p,
            label: p,
            type: "projection",
            color: eco.color,
            categoryId: eco.id,
            radius: 9,
            fidelity: spec?.fidelity,
          });
          nodeSet.add(p);
        }
        links.push({ source: catId, target: p, type: "category" });
      }
    }

    // Synergy chain edges
    if (expandedCategories.size > 0) {
      const seenEdges = new Set<string>();
      for (const chain of SYNERGY_CHAINS) {
        const visibleProjections = chain.projections.filter(p => nodeSet.has(p));
        for (let i = 0; i < visibleProjections.length - 1; i++) {
          const a = visibleProjections[i];
          const b = visibleProjections[i + 1];
          const edgeKey = [a, b].sort().join("|");
          if (!seenEdges.has(edgeKey)) {
            seenEdges.add(edgeKey);
            links.push({ source: a, target: b, type: "synergy", chainName: chain.name });
          }
        }
      }
    }

    return { nodes, links };
  }, [expandedCategories]);

  // ── Synergy chains for selected node ───────────────────────────────
  const selectedChains = useMemo(() => {
    if (!selectedNode) return [];
    return SYNERGY_CHAINS.filter(c => c.projections.includes(selectedNode.id));
  }, [selectedNode]);

  // ── Force simulation ───────────────────────────────────────────────
  useEffect(() => {
    if (simRef.current) simRef.current.stop();

    const uorNode = nodes.find(n => n.id === "uor");
    if (uorNode) {
      uorNode.fx = dimensions.width / 2;
      uorNode.fy = dimensions.height / 2;
    }

    const sim = forceSimulation<GraphNode>(nodes)
      .force(
        "link",
        forceLink<GraphNode, GraphLink>(links)
          .id(d => d.id)
          .distance(d => {
            if (d.type === "canonical") return 170;
            if (d.type === "category") return 80;
            return 120;
          })
          .strength(d => {
            if (d.type === "canonical") return 0.6;
            if (d.type === "category") return 0.3;
            return 0.08;
          })
      )
      .force("charge", forceManyBody<GraphNode>().strength(d => {
        if (d.type === "uor") return -1000;
        if (d.type === "category") return -300;
        return -30;
      }))
      .force("center", forceCenter(dimensions.width / 2, dimensions.height / 2).strength(0.03))
      .force("collision", forceCollide<GraphNode>().radius(d => d.radius + 8))
      .force("radial", forceRadial<GraphNode>(
        d => {
          if (d.type === "uor") return 0;
          if (d.type === "category") return Math.min(dimensions.width, dimensions.height) * 0.32;
          return Math.min(dimensions.width, dimensions.height) * 0.46;
        },
        dimensions.width / 2,
        dimensions.height / 2,
      ).strength(d => {
        if (d.type === "uor") return 1;
        if (d.type === "category") return 0.4;
        return 0.12;
      }))
      .alphaDecay(0.025)
      .velocityDecay(0.45);

    sim.on("tick", () => setTick(t => t + 1));
    simRef.current = sim;
    return () => { sim.stop(); };
  }, [nodes, links, dimensions]);

  // ── Interaction handlers ───────────────────────────────────────────
  const handleNodeClick = useCallback((node: GraphNode, e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.type === "category") {
      setExpandedCategories(prev => {
        const next = new Set(prev);
        if (next.has(node.id)) next.delete(node.id);
        else next.add(node.id);
        return next;
      });
    }
    setSelectedNode(prev => prev?.id === node.id ? null : node);
  }, []);

  const handleZoom = useCallback((delta: number) => {
    setTransform(prev => ({
      ...prev,
      k: Math.max(0.3, Math.min(3, prev.k + delta)),
    }));
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    handleZoom(e.deltaY > 0 ? -0.08 : 0.08);
  }, [handleZoom]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-node]")) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  }, [transform.x, transform.y]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !dragStart) return;
    setTransform(prev => ({
      ...prev,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    }));
  }, [isDragging, dragStart]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  const resetView = useCallback(() => {
    setTransform({ x: 0, y: 0, k: 1 });
  }, []);

  // ── Highlighted nodes ─────────────────────────────────────────────
  const highlightedNodeIds = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    const set = new Set<string>([selectedNode.id, "uor"]);
    for (const chain of selectedChains) {
      for (const p of chain.projections) set.add(p);
    }
    if (selectedNode.categoryId) set.add(selectedNode.categoryId);
    return set;
  }, [selectedNode, selectedChains]);

  // ── Helpers ────────────────────────────────────────────────────────
  const getNodeId = (n: string | GraphNode): string => typeof n === "object" ? n.id : n;
  const getNodePos = (n: string | GraphNode): { x: number; y: number } | null => {
    if (typeof n === "object" && n.x != null && n.y != null) return { x: n.x, y: n.y };
    return null;
  };

  const hasSelection = selectedNode !== null;

  // Category for a projection
  const getCategoryForNode = (node: GraphNode) => {
    if (node.type === "category") return ECOSYSTEMS.find(e => e.id === node.id);
    if (node.categoryId) return ECOSYSTEMS.find(e => e.id === node.categoryId);
    return null;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Universal Knowledge Graph
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            UOR is the interoperability layer — every standard is a projection of one canonical identity.
            <br className="hidden sm:block" />
            <span className="text-foreground/70 font-medium">Click a category</span> to expand ·{" "}
            <span className="text-foreground/70 font-medium">Click any node</span> to trace its path back to UOR
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => handleZoom(0.2)} className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors" title="Zoom in">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={() => handleZoom(-0.2)} className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors" title="Zoom out">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={resetView} className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors" title="Reset view">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Graph Canvas */}
      <div
        ref={containerRef}
        className="relative bg-card border border-border rounded-xl overflow-hidden touch-none"
        style={{ height: "min(72vh, 700px)", cursor: isDragging ? "grabbing" : "grab" }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <svg width={dimensions.width} height={dimensions.height} className="w-full h-full select-none">
          <defs>
            {/* Glow filter for UOR hub */}
            <filter id="uor-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
            {/* ── Links ─────────────────────────────────────── */}
            {links.map((link, i) => {
              const src = getNodePos(link.source);
              const tgt = getNodePos(link.target);
              if (!src || !tgt) return null;

              const srcId = getNodeId(link.source);
              const tgtId = getNodeId(link.target);
              const isHighlighted = hasSelection && highlightedNodeIds.has(srcId) && highlightedNodeIds.has(tgtId);
              const isDimmed = hasSelection && !isHighlighted;

              let stroke = "hsl(220,15%,40%)";
              let strokeWidth = 1;
              let dashArray: string | undefined;

              if (link.type === "canonical") {
                stroke = UOR_COLOR;
                strokeWidth = isHighlighted ? 3.5 : 2;
              } else if (link.type === "synergy") {
                stroke = SYNERGY_COLOR;
                strokeWidth = isHighlighted ? 2.5 : 1;
                dashArray = "6,4";
              } else {
                const srcNode = typeof link.source === "object" ? link.source : null;
                stroke = srcNode?.color || "hsl(220,15%,40%)";
                strokeWidth = isHighlighted ? 2 : 0.8;
              }

              return (
                <line
                  key={i}
                  x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  strokeDasharray={dashArray}
                  opacity={isDimmed ? 0.06 : link.type === "synergy" ? 0.45 : 0.55}
                />
              );
            })}

            {/* ── Nodes ─────────────────────────────────────── */}
            {nodes.map(node => {
              if (node.x == null || node.y == null) return null;
              const isHovered = hoveredNode?.id === node.id;
              const isSelected = selectedNode?.id === node.id;
              const isHighlighted = highlightedNodeIds.has(node.id);
              const isDimmed = hasSelection && !isHighlighted;
              const isExpanded = node.type === "category" && expandedCategories.has(node.id);

              return (
                <g
                  key={node.id}
                  data-node
                  transform={`translate(${node.x},${node.y})`}
                  onClick={(e) => handleNodeClick(node, e)}
                  onPointerEnter={() => setHoveredNode(node)}
                  onPointerLeave={() => setHoveredNode(null)}
                  className="cursor-pointer"
                  opacity={isDimmed ? 0.12 : 1}
                >
                  {/* Outer glow for UOR */}
                  {node.type === "uor" && (
                    <>
                      <circle r={node.radius + 18} fill={node.color} opacity={0.08} />
                      <circle r={node.radius + 10} fill={node.color} opacity={0.15} />
                    </>
                  )}

                  {/* Selection glow */}
                  {isSelected && node.type !== "uor" && (
                    <circle r={node.radius + 12} fill={node.color} opacity={0.15} />
                  )}

                  {/* Expanded ring */}
                  {isExpanded && (
                    <circle r={node.radius + 5} fill="none" stroke={node.color} strokeWidth={2} opacity={0.5} strokeDasharray="4,3" />
                  )}

                  {/* Main circle */}
                  <circle
                    r={isHovered ? node.radius + 3 : node.radius}
                    fill={node.color}
                    opacity={node.type === "projection" ? 0.9 : 1}
                    stroke={isSelected ? "hsl(0,0%,100%)" : "transparent"}
                    strokeWidth={isSelected ? 3 : 0}
                    filter={node.type === "uor" ? "url(#uor-glow)" : undefined}
                  />

                  {/* Lossless indicator */}
                  {node.type === "projection" && node.fidelity === "lossless" && (
                    <circle cx={node.radius * 0.7} cy={-node.radius * 0.7} r={3.5} fill={LOSSLESS_COLOR} stroke="hsl(0,0%,100%)" strokeWidth={1} />
                  )}

                  {/* ── Labels ─────────────────────────────── */}
                  {node.type === "uor" && (
                    <>
                      <text textAnchor="middle" dy="-0.1em" fill="white" fontSize="16" fontWeight="800" fontFamily="'DM Sans', sans-serif" letterSpacing="0.12em">
                        UOR
                      </text>
                      <text textAnchor="middle" dy="1.3em" fill="white" fontSize="8" fontWeight="500" fontFamily="'DM Sans', sans-serif" opacity={0.7}>
                        Canonical Hub
                      </text>
                    </>
                  )}
                  {node.type === "category" && (
                    <text
                      textAnchor="middle"
                      dy={node.radius + 18}
                      fill="hsl(var(--foreground))"
                      fontSize="13"
                      fontWeight="700"
                      fontFamily="'DM Sans', sans-serif"
                      opacity={isDimmed ? 0.2 : 1}
                    >
                      {node.label}
                    </text>
                  )}
                  {node.type === "projection" && (
                    <text
                      textAnchor="middle"
                      dy={node.radius + 14}
                      fill="hsl(var(--foreground))"
                      fontSize="11"
                      fontWeight="600"
                      fontFamily="monospace"
                      opacity={isDimmed ? 0.15 : (isHovered || isSelected) ? 1 : 0.7}
                    >
                      {node.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* ── Legend — high contrast, readable ─────────────────── */}
        <div className="absolute bottom-4 left-4 bg-card border border-border rounded-xl px-4 py-3 space-y-2 shadow-lg">
          <div className="text-xs font-bold text-foreground uppercase tracking-wider mb-1">Legend</div>
          {[
            { color: UOR_COLOR, label: "UOR — Canonical Hub", size: "w-4 h-4" },
            { color: "hsl(var(--primary))", label: "Category Domain", size: "w-3.5 h-3.5" },
            { color: "hsl(var(--muted-foreground))", label: "Standard / Projection", size: "w-3 h-3" },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2 text-sm text-foreground font-medium">
              <span className={`${item.size} rounded-full shrink-0`} style={{ backgroundColor: item.color }} />
              {item.label}
            </div>
          ))}
          <div className="flex items-center gap-2 text-sm text-foreground font-medium">
            <svg width="18" height="8"><line x1="0" y1="4" x2="18" y2="4" stroke={UOR_COLOR} strokeWidth="2" /></svg>
            Canonical Link
          </div>
          <div className="flex items-center gap-2 text-sm text-foreground font-medium">
            <svg width="18" height="8"><line x1="0" y1="4" x2="18" y2="4" stroke={SYNERGY_COLOR} strokeWidth="1.5" strokeDasharray="3,2" /></svg>
            Synergy Chain
          </div>
          <div className="flex items-center gap-2 text-sm text-foreground font-medium">
            <span className="w-3 h-3 rounded-full shrink-0 border-2" style={{ backgroundColor: LOSSLESS_COLOR, borderColor: "white" }} />
            Lossless Fidelity
          </div>
        </div>
      </div>

      {/* ── Selection Detail Panel ────────────────────────────────── */}
      {selectedNode && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 sm:p-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 rounded-full" style={{ backgroundColor: selectedNode.color }} />
              <span className="text-lg font-bold text-foreground font-mono">{selectedNode.label}</span>
              {selectedNode.type === "projection" && (
                <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                  selectedNode.fidelity === "lossless"
                    ? "bg-green-500/15 text-green-600"
                    : "bg-orange-500/15 text-orange-600"
                }`}>
                  {selectedNode.fidelity === "lossless" ? "● Lossless" : "○ Lossy"}
                </span>
              )}
              {selectedNode.type === "category" && (
                <span className="px-2 py-0.5 rounded-md bg-secondary text-xs font-semibold text-muted-foreground">
                  Domain
                </span>
              )}
            </div>
            <button onClick={() => setSelectedNode(null)} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ── Canonical Path to UOR — always visible ──────────── */}
          <div className="mb-5 bg-card border border-border rounded-xl p-4 sm:p-5">
            <div className="text-sm font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-primary" />
              Canonical Path to UOR
            </div>

            {/* Visual chain */}
            <div className="flex items-center gap-2 flex-wrap text-sm font-mono mb-4">
              <span className="px-3 py-1 rounded-lg font-bold text-white" style={{ backgroundColor: UOR_COLOR }}>
                UOR
              </span>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              {selectedNode.type === "projection" && selectedNode.categoryId && (() => {
                const cat = getCategoryForNode(selectedNode);
                return cat ? (
                  <>
                    <span
                      className="px-3 py-1 rounded-lg font-semibold"
                      style={{
                        backgroundColor: `${cat.color}20`,
                        color: cat.color,
                      }}
                    >
                      {cat.label}
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </>
                ) : null;
              })()}
              <span
                className="px-3 py-1 rounded-lg font-bold"
                style={{
                  backgroundColor: `${selectedNode.color}25`,
                  color: selectedNode.color,
                }}
              >
                {selectedNode.label}
              </span>
            </div>

            {/* Explanation */}
            {selectedNode.type === "uor" && (
              <div className="space-y-2">
                <p className="text-sm text-foreground leading-relaxed font-medium">
                  The Universal Object Reference is the canonical hub at the center of this graph.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Every standard, framework, and protocol in this map is a <strong className="text-foreground">deterministic projection</strong> of a single UOR canonical identity.
                  UOR treats everything as an object addressable by its intrinsic attributes — not by location — unlocking complete interoperability across all systems.
                </p>
              </div>
            )}
            {selectedNode.type === "projection" && (
              <div className="space-y-2">
                <p className="text-sm text-foreground leading-relaxed">
                  <strong>{selectedNode.label}</strong> is a {selectedNode.fidelity === "lossless" ? "lossless" : "lossy"} projection of its UOR canonical hash.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This means <strong className="text-foreground">{selectedNode.label}</strong>'s identity is derived from its content attributes — not from any registry, server, or namespace.
                  Any system that computes the same canonical encoding will arrive at the same UOR identity, enabling <strong className="text-foreground">trustless verification</strong> and seamless cross-protocol interoperability.
                </p>
                {(() => {
                  const spec = SPECS.get(selectedNode.id);
                  return spec ? (
                    <p className="text-xs text-muted-foreground/80 italic mt-1">
                      Fidelity: {spec.fidelity}
                    </p>
                  ) : null;
                })()}
              </div>
            )}
            {selectedNode.type === "category" && (
              <div className="space-y-2">
                <p className="text-sm text-foreground leading-relaxed font-medium">
                  {getCategoryForNode(selectedNode)?.description}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Every standard within this domain connects back to UOR through a canonical encoding chain.
                  Click individual projections to see their specific derivation path.
                </p>
              </div>
            )}
          </div>

          {/* ── Synergy Chains ──────────────────────────────────── */}
          {selectedChains.length > 0 && (
            <div>
              <div className="text-sm font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-primary" />
                Cross-Protocol Synergy Chains ({selectedChains.length})
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                These chains show how <strong className="text-foreground">{selectedNode.label}</strong> connects to other standards through shared UOR identity components.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 max-h-[300px] overflow-y-auto">
                {selectedChains.slice(0, 8).map(chain => (
                  <div key={chain.name} className="bg-card border border-border rounded-xl p-4">
                    <div className="text-sm font-semibold text-foreground mb-2">{chain.name}</div>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{chain.description}</p>
                    <div className="flex flex-wrap items-center gap-1">
                      {chain.projections.map((p, i) => (
                        <span key={p} className="flex items-center gap-1">
                          <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                            p === selectedNode.id
                              ? "bg-primary/15 text-primary font-bold"
                              : "text-muted-foreground"
                          }`}>
                            {p}
                          </span>
                          {i < chain.projections.length - 1 && (
                            <ArrowRight className="w-3 h-3 text-muted-foreground/40" />
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {selectedChains.length > 8 && (
                  <div className="flex items-center justify-center text-sm text-muted-foreground">
                    +{selectedChains.length - 8} more chains
                  </div>
                )}
              </div>
            </div>
          )}

          {/* No chains message */}
          {selectedChains.length === 0 && selectedNode.type === "projection" && (
            <div className="text-sm text-muted-foreground italic">
              No synergy chains currently documented for this projection. Its canonical identity still links directly to UOR.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
