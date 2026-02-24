/**
 * Interactive Knowledge Graph — Force-directed visualization
 * ════════════════════════════════════════════════════════════
 *
 * UOR sits at the center. 10 canonical categories orbit it.
 * Click a category to expand its projections.
 * Synergy chain edges connect standards across categories.
 * Every node links back to UOR — confirming canonical encoding.
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
import { X, ZoomIn, ZoomOut, Maximize2, Info, Layers } from "lucide-react";

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

export function KnowledgeGraph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<Simulation<GraphNode, GraphLink> | null>(null);

  const [dimensions, setDimensions] = useState({ width: 900, height: 600 });
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [, setTick] = useState(0); // Force re-render on sim tick

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

    // UOR center
    nodes.push({
      id: "uor",
      label: "UOR",
      type: "uor",
      color: UOR_COLOR,
      radius: 28,
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
        radius: 18,
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
            radius: 7,
            fidelity: spec?.fidelity,
          });
          nodeSet.add(p);
        }
        links.push({ source: catId, target: p, type: "category" });
      }
    }

    // Synergy chain edges between expanded projections
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

    // Pin UOR at center
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
            if (d.type === "canonical") return 150;
            if (d.type === "category") return 70;
            return 110;
          })
          .strength(d => {
            if (d.type === "canonical") return 0.6;
            if (d.type === "category") return 0.3;
            return 0.08;
          })
      )
      .force("charge", forceManyBody<GraphNode>().strength(d => {
        if (d.type === "uor") return -800;
        if (d.type === "category") return -250;
        return -25;
      }))
      .force("center", forceCenter(dimensions.width / 2, dimensions.height / 2).strength(0.03))
      .force("collision", forceCollide<GraphNode>().radius(d => d.radius + 5))
      .force("radial", forceRadial<GraphNode>(
        d => {
          if (d.type === "uor") return 0;
          if (d.type === "category") return Math.min(dimensions.width, dimensions.height) * 0.3;
          return Math.min(dimensions.width, dimensions.height) * 0.42;
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

  // ── Highlighted nodes for selected ─────────────────────────────────
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Knowledge Graph
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Click a category to expand · Click any node to trace connections back to UOR
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => handleZoom(0.2)} className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground transition-colors" title="Zoom in">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={() => handleZoom(-0.2)} className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground transition-colors" title="Zoom out">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={resetView} className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground transition-colors" title="Reset view">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Graph Canvas */}
      <div
        ref={containerRef}
        className="relative bg-card border border-border rounded-xl overflow-hidden touch-none"
        style={{ height: "min(65vh, 620px)", cursor: isDragging ? "grabbing" : "grab" }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <svg width={dimensions.width} height={dimensions.height} className="w-full h-full select-none">
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
              let strokeWidth = 0.6;
              let dashArray: string | undefined;

              if (link.type === "canonical") {
                stroke = UOR_COLOR;
                strokeWidth = isHighlighted ? 2.5 : 1.5;
              } else if (link.type === "synergy") {
                stroke = SYNERGY_COLOR;
                strokeWidth = isHighlighted ? 1.8 : 0.7;
                dashArray = "4,3";
              } else {
                const srcNode = typeof link.source === "object" ? link.source : null;
                stroke = srcNode?.color || "hsl(220,15%,40%)";
                strokeWidth = isHighlighted ? 1.5 : 0.6;
              }

              return (
                <line
                  key={i}
                  x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  strokeDasharray={dashArray}
                  opacity={isDimmed ? 0.06 : link.type === "synergy" ? 0.35 : 0.45}
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
                  {/* Glow */}
                  {(node.type === "uor" || isSelected) && (
                    <circle r={node.radius + 10} fill={node.color} opacity={0.12} />
                  )}

                  {/* Expanded ring */}
                  {isExpanded && (
                    <circle r={node.radius + 4} fill="none" stroke={node.color} strokeWidth={1.5} opacity={0.4} strokeDasharray="3,2" />
                  )}

                  {/* Main circle */}
                  <circle
                    r={isHovered ? node.radius + 2 : node.radius}
                    fill={node.color}
                    opacity={node.type === "projection" ? 0.85 : 1}
                    stroke={isSelected ? "hsl(0,0%,100%)" : "transparent"}
                    strokeWidth={isSelected ? 2.5 : 0}
                  />

                  {/* Lossless dot */}
                  {node.type === "projection" && node.fidelity === "lossless" && (
                    <circle cx={node.radius * 0.65} cy={-node.radius * 0.65} r={2.5} fill="hsl(152, 60%, 55%)" />
                  )}

                  {/* Labels */}
                  {node.type === "uor" && (
                    <text textAnchor="middle" dy="0.35em" fill="white" fontSize="11" fontWeight="700" fontFamily="'DM Sans', sans-serif" letterSpacing="0.1em">
                      UOR
                    </text>
                  )}
                  {node.type === "category" && (
                    <text textAnchor="middle" dy={node.radius + 14} fill="hsl(var(--foreground))" fontSize="10" fontWeight="600" fontFamily="'DM Sans', sans-serif" opacity={isDimmed ? 0.2 : 0.85}>
                      {node.label}
                    </text>
                  )}
                  {node.type === "projection" && (isHovered || isSelected) && (
                    <text textAnchor="middle" dy={node.radius + 11} fill="hsl(var(--foreground))" fontSize="8.5" fontWeight="500" fontFamily="monospace" opacity={0.9}>
                      {node.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2 space-y-1">
          <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Legend</div>
          {[
            { color: UOR_COLOR, label: "UOR Hub", size: "w-3 h-3" },
            { color: "hsl(var(--primary))", label: "Category", size: "w-2.5 h-2.5" },
            { color: "hsl(var(--muted-foreground))", label: "Projection", size: "w-2 h-2" },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
              <span className={`${item.size} rounded-full shrink-0`} style={{ backgroundColor: item.color }} />
              {item.label}
            </div>
          ))}
          <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
            <svg width="14" height="6"><line x1="0" y1="3" x2="14" y2="3" stroke={SYNERGY_COLOR} strokeWidth="1" strokeDasharray="2,2" /></svg>
            Synergy Edge
          </div>
        </div>
      </div>

      {/* ── Selection Detail ────────────────────────────────────────── */}
      {selectedNode && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedNode.color }} />
              <span className="text-sm font-semibold text-foreground font-mono">{selectedNode.label}</span>
              {selectedNode.type === "projection" && (
                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-[10px] text-primary font-mono">
                  {selectedNode.fidelity || "lossy"}
                </span>
              )}
            </div>
            <button onClick={() => setSelectedNode(null)} className="p-1 hover:bg-secondary rounded-lg text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Canonical path */}
          <div className="mb-3 bg-card border border-border rounded-lg p-3">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Info className="w-3 h-3" />
              Canonical Path to UOR
            </div>
            <div className="flex items-center gap-1.5 flex-wrap text-xs font-mono">
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold">UOR</span>
              <span className="text-muted-foreground">→</span>
              {selectedNode.type === "projection" && selectedNode.categoryId && (
                <>
                  <span
                    className="px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: `${ECOSYSTEMS.find(e => e.id === selectedNode.categoryId)?.color || "hsl(220,15%,50%)"}20`,
                      color: ECOSYSTEMS.find(e => e.id === selectedNode.categoryId)?.color,
                    }}
                  >
                    {ECOSYSTEMS.find(e => e.id === selectedNode.categoryId)?.label}
                  </span>
                  <span className="text-muted-foreground">→</span>
                </>
              )}
              <span className="px-2 py-0.5 rounded" style={{ backgroundColor: `${selectedNode.color}20`, color: selectedNode.color }}>
                {selectedNode.label}
              </span>
            </div>
            {selectedNode.type === "projection" && (
              <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
                This standard is a deterministic projection of a single UOR canonical hash. 
                Identity is derived from content — not location — ensuring verifiable interoperability.
              </p>
            )}
            {selectedNode.type === "category" && (
              <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
                {ECOSYSTEMS.find(e => e.id === selectedNode.id)?.description}
              </p>
            )}
          </div>

          {/* Synergy chains */}
          {selectedChains.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Connected Synergy Chains ({selectedChains.length})
              </div>
              <div className="grid gap-2 sm:grid-cols-2 max-h-[200px] overflow-y-auto">
                {selectedChains.slice(0, 8).map(chain => (
                  <div key={chain.name} className="bg-card border border-border rounded-lg p-2.5">
                    <div className="text-[11px] font-medium text-foreground mb-1">{chain.name}</div>
                    <div className="flex flex-wrap items-center gap-0.5">
                      {chain.projections.map((p, i) => (
                        <span key={p} className="flex items-center gap-0.5">
                          <span className={`text-[9px] font-mono ${p === selectedNode.id ? "text-primary font-bold" : "text-muted-foreground"}`}>
                            {p}
                          </span>
                          {i < chain.projections.length - 1 && <span className="text-muted-foreground/30 text-[9px]">→</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {selectedChains.length > 8 && (
                  <div className="flex items-center justify-center text-[10px] text-muted-foreground">+{selectedChains.length - 8} more</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
