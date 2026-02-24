/**
 * Force-Directed Synergy Graph
 * ════════════════════════════
 *
 * Renders all 147+ projections as nodes and synergies as edges
 * using d3-force simulation with React SVG rendering.
 * Clickable nodes reveal provenance chains and complementary pairs.
 */

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import { coherenceGate, type Synergy, type Cluster } from "@/modules/uns/core/hologram/coherence-gate";
import { X, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────

interface GraphNode extends SimulationNodeDatum {
  id: string;
  tier: string;
  synergyCount: number;
}

interface GraphLink extends SimulationLinkDatum<GraphNode> {
  type: Synergy["type"];
  source: string;
  target: string;
}

interface SelectedNode {
  node: GraphNode;
  synergies: Synergy[];
  position: { x: number; y: number };
}

// ── Tier colors — HSL matching design system ─────────────────────────────

const TIER_COLORS: Record<string, string> = {
  lossless: "hsl(220, 60%, 55%)",
  agentic: "hsl(280, 55%, 55%)",
  settlement: "hsl(35, 80%, 55%)",
  "semantic-web": "hsl(200, 50%, 50%)",
  language: "hsl(152, 44%, 50%)",
  "markup-config": "hsl(170, 50%, 45%)",
  federation: "hsl(340, 55%, 55%)",
  "social-web": "hsl(0, 60%, 55%)",
  native: "hsl(210, 30%, 50%)",
  industry: "hsl(45, 60%, 50%)",
  other: "hsl(220, 15%, 50%)",
};

const SYNERGY_COLORS: Record<string, string> = {
  "identity-equivalence": "hsl(220, 60%, 60%)",
  "settlement-bridge": "hsl(35, 80%, 60%)",
  "discovery-channel": "hsl(152, 44%, 56%)",
  "provenance-chain": "hsl(280, 55%, 60%)",
  "complementary-pair": "hsl(200, 50%, 55%)",
  "trust-amplification": "hsl(0, 60%, 60%)",
};

// ── Graph Component ──────────────────────────────────────────────────────

export function SynergyGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 600 });
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [selected, setSelected] = useState<SelectedNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [filterTier, setFilterTier] = useState<string | null>(null);

  // Build the report once
  const report = useMemo(() => coherenceGate(), []);

  // Build graph data from coherence gate
  const { graphNodes, graphLinks, tiers } = useMemo(() => {
    // Find the tier for each projection
    const tierMap = new Map<string, string>();
    for (const cluster of report.clusters) {
      if (cluster.property === "shared architectural tier") {
        for (const m of cluster.members) {
          tierMap.set(m, cluster.name);
        }
      }
    }

    // Count synergies per node
    const synCount = new Map<string, number>();
    for (const s of report.synergies) {
      for (const p of s.projections) {
        synCount.set(p, (synCount.get(p) || 0) + 1);
      }
    }

    // Collect unique projection names from clusters
    const allNames = new Set<string>();
    for (const c of report.clusters) {
      for (const m of c.members) allNames.add(m);
    }

    const gNodes: GraphNode[] = [...allNames].map(id => ({
      id,
      tier: tierMap.get(id) || "other",
      synergyCount: synCount.get(id) || 0,
    }));

    // Build links (only between nodes that exist)
    const nodeSet = new Set(gNodes.map(n => n.id));
    const gLinks: GraphLink[] = [];
    const seen = new Set<string>();
    for (const s of report.synergies) {
      const [a, b] = s.projections;
      if (!nodeSet.has(a) || !nodeSet.has(b)) continue;
      const key = `${a}-${b}-${s.type}`;
      if (seen.has(key)) continue;
      seen.add(key);
      gLinks.push({ source: a, target: b, type: s.type });
    }

    const uniqueTiers = [...new Set(gNodes.map(n => n.tier))].sort();

    return { graphNodes: gNodes, graphLinks: gLinks, tiers: uniqueTiers };
  }, [report]);

  // Run simulation
  useEffect(() => {
    const nodesCopy = graphNodes.map(n => ({ ...n }));
    const linksCopy = graphLinks.map(l => ({ ...l }));

    const sim = forceSimulation(nodesCopy)
      .force("link", forceLink<GraphNode, GraphLink>(linksCopy).id(d => d.id).distance(60).strength(0.3))
      .force("charge", forceManyBody().strength(-80))
      .force("center", forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force("collide", forceCollide(12));

    // Run synchronously for 200 ticks
    sim.stop();
    for (let i = 0; i < 200; i++) sim.tick();

    setNodes(nodesCopy);
    setLinks(linksCopy);

    return () => { sim.stop(); };
  }, [graphNodes, graphLinks, dimensions]);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setDimensions({ width, height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Node click handler
  const handleNodeClick = useCallback((node: GraphNode) => {
    const nodeSynergies = report.synergies.filter(s =>
      s.projections.includes(node.id)
    );
    setSelected({
      node,
      synergies: nodeSynergies,
      position: { x: node.x || 0, y: node.y || 0 },
    });
  }, [report.synergies]);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as Element).closest(".graph-node")) return;
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y });
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setPan({
      x: dragStart.panX + (e.clientX - dragStart.x) / zoom,
      y: dragStart.panY + (e.clientY - dragStart.y) / zoom,
    });
  }, [dragging, dragStart, zoom]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  // Filter
  const visibleNodes = filterTier ? nodes.filter(n => n.tier === filterTier) : nodes;
  const visibleIds = new Set(visibleNodes.map(n => n.id));
  const visibleLinks = links.filter(l => {
    const src = typeof l.source === "object" ? (l.source as GraphNode).id : l.source;
    const tgt = typeof l.target === "object" ? (l.target as GraphNode).id : l.target;
    return visibleIds.has(src) && visibleIds.has(tgt);
  });

  const nodeRadius = (n: GraphNode) => Math.max(4, Math.min(12, 4 + n.synergyCount * 0.5));

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-secondary/30 flex-wrap">
        <span className="text-sm font-semibold text-foreground mr-2">Synergy Graph</span>
        <span className="text-xs text-muted-foreground">
          {visibleNodes.length} nodes · {visibleLinks.length} edges
        </span>
        <div className="flex-1" />

        {/* Tier filter pills */}
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setFilterTier(null)}
            className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${
              !filterTier ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          {tiers.map(t => (
            <button
              key={t}
              onClick={() => setFilterTier(filterTier === t ? null : t)}
              className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                filterTier === t ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1 ml-2">
          <button onClick={() => setZoom(z => Math.max(0.3, z - 0.2))} className="p-1 rounded hover:bg-secondary text-muted-foreground">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] text-muted-foreground w-8 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="p-1 rounded hover:bg-secondary text-muted-foreground">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="p-1 rounded hover:bg-secondary text-muted-foreground">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Graph area */}
      <div
        ref={containerRef}
        className="relative h-[500px] sm:h-[600px] cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full h-full"
        >
          <g transform={`translate(${pan.x * zoom}, ${pan.y * zoom}) scale(${zoom})`}>
            {/* Edges */}
            {visibleLinks.map((l, i) => {
              const src = l.source as unknown as GraphNode;
              const tgt = l.target as unknown as GraphNode;
              if (!src.x || !tgt.x) return null;
              const isHighlighted = hoveredNode && (src.id === hoveredNode || tgt.id === hoveredNode);
              return (
                <line
                  key={i}
                  x1={src.x}
                  y1={src.y}
                  x2={tgt.x}
                  y2={tgt.y}
                  stroke={isHighlighted ? SYNERGY_COLORS[l.type] || "hsl(220,15%,50%)" : "hsl(220, 15%, 30%)"}
                  strokeWidth={isHighlighted ? 1.5 : 0.4}
                  strokeOpacity={isHighlighted ? 0.9 : 0.15}
                />
              );
            })}

            {/* Nodes */}
            {visibleNodes.map(n => {
              const r = nodeRadius(n);
              const isHovered = hoveredNode === n.id;
              const isSelected = selected?.node.id === n.id;
              return (
                <g
                  key={n.id}
                  className="graph-node"
                  transform={`translate(${n.x || 0}, ${n.y || 0})`}
                  onClick={(e) => { e.stopPropagation(); handleNodeClick(n); }}
                  onMouseEnter={() => setHoveredNode(n.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  style={{ cursor: "pointer" }}
                >
                  <circle
                    r={isHovered || isSelected ? r + 2 : r}
                    fill={TIER_COLORS[n.tier] || TIER_COLORS.other}
                    stroke={isSelected ? "hsl(0, 0%, 100%)" : isHovered ? "hsl(0, 0%, 90%)" : "none"}
                    strokeWidth={isSelected ? 2 : 1}
                    opacity={isHovered || isSelected ? 1 : 0.8}
                  />
                  {(isHovered || isSelected || (zoom > 1.5 && r > 5)) && (
                    <text
                      y={-r - 4}
                      textAnchor="middle"
                      fill="hsl(210, 15%, 80%)"
                      fontSize={Math.max(8, 10 / zoom)}
                      fontFamily="monospace"
                      fontWeight={isHovered ? "bold" : "normal"}
                    >
                      {n.id}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Selected node detail panel */}
        {selected && (
          <div className="absolute top-3 right-3 w-80 max-h-[calc(100%-24px)] bg-card/95 backdrop-blur-sm border border-border rounded-xl shadow-xl overflow-hidden z-10 animate-in fade-in slide-in-from-right-4 duration-200">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-secondary/40">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: TIER_COLORS[selected.node.tier] || TIER_COLORS.other }}
              />
              <span className="font-mono text-sm font-bold text-foreground truncate">{selected.node.id}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{selected.node.tier}</span>
              <div className="flex-1" />
              <button onClick={() => setSelected(null)} className="p-0.5 hover:bg-secondary rounded text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border">
              {selected.synergies.length} synergies · {selected.node.synergyCount} connections
            </div>
            <div className="overflow-y-auto max-h-[380px] divide-y divide-border">
              {selected.synergies.map((s, i) => {
                const other = s.projections[0] === selected.node.id ? s.projections[1] : s.projections[0];
                return (
                  <div key={i} className="px-3 py-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: SYNERGY_COLORS[s.type] }}
                      />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {s.type.replace(/-/g, " ")}
                      </span>
                      <span className="text-[10px] font-mono text-primary ml-auto">{other}</span>
                    </div>
                    <p className="text-xs text-foreground/80 leading-relaxed">{s.insight}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 italic">{s.useCase}</p>
                  </div>
                );
              })}
              {selected.synergies.length === 0 && (
                <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                  No synergies found for this projection
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-4 py-2 border-t border-border bg-secondary/20 flex-wrap">
        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Tiers:</span>
        {Object.entries(TIER_COLORS).filter(([t]) => tiers.includes(t)).map(([tier, color]) => (
          <button
            key={tier}
            onClick={() => setFilterTier(filterTier === tier ? null : tier)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
            {tier}
          </button>
        ))}
      </div>
    </div>
  );
}
