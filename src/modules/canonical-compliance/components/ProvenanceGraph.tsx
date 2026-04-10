import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { ALL_ATOMS, ATOM_INDEX, type AtomCategory } from "../atoms";
import { PROVENANCE_REGISTRY, SYSTEM_LAYERS } from "../provenance-map";
import { type AuditFinding } from "../audit";
import { type SelectedNode } from "./NodeDetailPanel";
import { type ZoomLevel } from "./ZoomControls";

const CATEGORY_COLORS: Record<AtomCategory, string> = {
  PrimitiveOp: "hsl(0 0% 65%)",
  Space: "hsl(210 15% 60%)",
  CoreType: "hsl(160 30% 50%)",
  IdentityPipeline: "hsl(35 60% 55%)",
  Morphism: "hsl(270 25% 60%)",
  Algebraic: "hsl(340 30% 55%)",
  Enforcement: "hsl(200 50% 55%)",
  Certificate: "hsl(45 70% 55%)",
  Observable: "hsl(180 40% 50%)",
};

const LAYER_COLORS: Record<string, string> = {
  engine: "hsl(160 40% 45%)",
  names: "hsl(210 50% 50%)",
  build: "hsl(35 60% 50%)",
  services: "hsl(270 40% 55%)",
};

interface GraphNode {
  id: string;
  label: string;
  type: "atom" | "module" | "export" | "layer";
  category?: AtomCategory;
  layerId?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

interface GraphEdge {
  source: string;
  target: string;
  predicate: string;
}

interface ProvenanceGraphProps {
  findings: AuditFinding[];
  selectedCategory: AtomCategory | null;
  search: string;
  onNodeSelect: (node: SelectedNode) => void;
  zoomLevel?: ZoomLevel;
  zoomContext?: { layerId?: string; module?: string; finding?: AuditFinding };
}

export default function ProvenanceGraph({ findings, selectedCategory, search, onNodeSelect, zoomLevel = 3, zoomContext }: ProvenanceGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const animRef = useRef<number>(0);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [viewBox, setViewBox] = useState({ x: -600, y: -400, w: 1200, h: 800 });
  const dragRef = useRef<{ nodeId: string | null; startX: number; startY: number; panStart?: { x: number; y: number } }>({ nodeId: null, startX: 0, startY: 0 });

  // Build graph data based on zoom level
  const { initialNodes, initialEdges } = useMemo(() => {
    const n: GraphNode[] = [];
    const e: GraphEdge[] = [];
    const nodeSet = new Set<string>();

    if (zoomLevel === 3) {
      // System level: show layers + inter-layer edges
      for (const layer of SYSTEM_LAYERS) {
        n.push({
          id: `layer:${layer.id}`, label: layer.label, type: "layer", layerId: layer.id,
          x: (Math.random() - 0.5) * 400, y: (Math.random() - 0.5) * 300,
          vx: 0, vy: 0, r: 24,
        });
      }
      // Connect layers sequentially (Engine → Names → Build → Services)
      for (let i = 0; i < SYSTEM_LAYERS.length - 1; i++) {
        e.push({ source: `layer:${SYSTEM_LAYERS[i].id}`, target: `layer:${SYSTEM_LAYERS[i + 1].id}`, predicate: "feeds" });
      }
    } else if (zoomLevel === 2) {
      // Module level
      const filterMods = zoomContext?.layerId
        ? SYSTEM_LAYERS.find((l) => l.id === zoomContext.layerId)?.modules
        : undefined;
      for (const mod of PROVENANCE_REGISTRY) {
        if (filterMods && !filterMods.includes(mod.module)) continue;
        const modId = `mod:${mod.module}`;
        const layer = SYSTEM_LAYERS.find((l) => l.modules.includes(mod.module));
        n.push({
          id: modId, label: mod.module, type: "module", layerId: layer?.id,
          x: (Math.random() - 0.5) * 600, y: (Math.random() - 0.5) * 400,
          vx: 0, vy: 0, r: 14,
        });
        nodeSet.add(modId);
      }
      // Connect modules that share atoms
      const modAtoms = new Map<string, Set<string>>();
      for (const mod of PROVENANCE_REGISTRY) {
        if (filterMods && !filterMods.includes(mod.module)) continue;
        modAtoms.set(mod.module, new Set(mod.exports.flatMap((ex) => ex.atoms)));
      }
      const modList = Array.from(modAtoms.keys());
      for (let i = 0; i < modList.length; i++) {
        for (let j = i + 1; j < modList.length; j++) {
          const shared = [...modAtoms.get(modList[i])!].filter((a) => modAtoms.get(modList[j])!.has(a));
          if (shared.length > 0) {
            e.push({ source: `mod:${modList[i]}`, target: `mod:${modList[j]}`, predicate: "shares" });
          }
        }
      }
    } else if (zoomLevel === 1) {
      // Pipeline level: exports + atoms
      const filterModule = zoomContext?.module;
      for (const mod of PROVENANCE_REGISTRY) {
        if (filterModule && mod.module !== filterModule) continue;
        for (const exp of mod.exports) {
          const expId = `exp:${mod.module}/${exp.export}`;
          n.push({
            id: expId, label: exp.export, type: "export",
            x: (Math.random() - 0.5) * 600, y: (Math.random() - 0.5) * 400,
            vx: 0, vy: 0, r: 8,
          });
          for (const atomId of exp.atoms) {
            const aId = `atom:${atomId}`;
            if (!nodeSet.has(aId)) {
              const atom = ATOM_INDEX.get(atomId);
              if (atom) {
                n.push({ id: aId, label: atom.label, type: "atom", category: atom.category, x: (Math.random() - 0.5) * 600, y: (Math.random() - 0.5) * 400, vx: 0, vy: 0, r: 6 });
                nodeSet.add(aId);
              }
            }
            e.push({ source: expId, target: aId, predicate: "derivedFrom" });
          }
        }
      }
    } else {
      // Primitive level (L0): full atom + export graph (original behavior)
      for (const atom of ALL_ATOMS) {
        const id = `atom:${atom.id}`;
        n.push({ id, label: atom.label, type: "atom", category: atom.category, x: (Math.random() - 0.5) * 800, y: (Math.random() - 0.5) * 600, vx: 0, vy: 0, r: 6 });
        nodeSet.add(id);
      }
      for (const mod of PROVENANCE_REGISTRY) {
        const modId = `mod:${mod.module}`;
        if (!nodeSet.has(modId)) {
          n.push({ id: modId, label: mod.module, type: "module", x: (Math.random() - 0.5) * 800, y: (Math.random() - 0.5) * 600, vx: 0, vy: 0, r: 14 });
          nodeSet.add(modId);
        }
        for (const exp of mod.exports) {
          const expId = `exp:${mod.module}/${exp.export}`;
          n.push({ id: expId, label: exp.export, type: "export", x: (Math.random() - 0.5) * 800, y: (Math.random() - 0.5) * 600, vx: 0, vy: 0, r: 4 });
          e.push({ source: expId, target: modId, predicate: "belongsTo" });
          for (const atomId of exp.atoms) {
            e.push({ source: expId, target: `atom:${atomId}`, predicate: "derivedFrom" });
          }
        }
      }
    }

    return { initialNodes: n, initialEdges: e };
  }, [zoomLevel, zoomContext]);

  // Init simulation
  useEffect(() => {
    setNodes([...initialNodes]);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges]);

  // Force simulation
  useEffect(() => {
    if (nodes.length === 0) return;

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    let iteration = 0;
    const maxIterations = 300;

    function tick() {
      if (iteration >= maxIterations) return;
      iteration++;

      const alpha = 1 - iteration / maxIterations;
      const repulsion = 800 * alpha;
      const attraction = 0.008 * alpha;
      const centering = 0.002;

      // Repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = b.x - a.x || 0.1;
          const dy = b.y - a.y || 0.1;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = repulsion / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx -= fx; a.vy -= fy;
          b.vx += fx; b.vy += fy;
        }
      }

      // Attraction (edges)
      for (const edge of edges) {
        const s = nodeMap.get(edge.source);
        const t = nodeMap.get(edge.target);
        if (!s || !t) continue;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 80) * attraction;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        s.vx += fx; s.vy += fy;
        t.vx -= fx; t.vy -= fy;
      }

      // Centering + damping
      for (const n of nodes) {
        n.vx -= n.x * centering;
        n.vy -= n.y * centering;
        n.vx *= 0.85;
        n.vy *= 0.85;
        n.x += n.vx;
        n.y += n.vy;
      }

      setNodes([...nodes]);
      animRef.current = requestAnimationFrame(tick);
    }

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [nodes.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredNodes = useMemo(() => {
    return nodes.map((n) => {
      let visible = true;
      if (selectedCategory && n.type === "atom" && n.category !== selectedCategory) visible = false;
      if (search) {
        const q = search.toLowerCase();
        if (!n.label.toLowerCase().includes(q) && !n.id.toLowerCase().includes(q)) visible = false;
      }
      return { ...n, visible };
    });
  }, [nodes, selectedCategory, search]);

  const getNodeColor = useCallback((node: GraphNode) => {
    if (node.type === "layer" && node.layerId) return LAYER_COLORS[node.layerId] || "hsl(0 0% 50%)";
    if (node.type === "atom" && node.category) return CATEGORY_COLORS[node.category];
    if (node.type === "module") {
      if (node.layerId) return LAYER_COLORS[node.layerId] || "hsl(210 20% 50%)";
      return "hsl(210 20% 50%)";
    }
    return "hsl(0 0% 45%)";
  }, []);

  const handleNodeClick = useCallback((node: GraphNode) => {
    if (node.type === "layer") {
      // Layer nodes don't map to SelectedNode, but we can show the first module
      const layer = SYSTEM_LAYERS.find((l) => l.id === node.layerId);
      if (layer) onNodeSelect({ type: "module", module: layer.modules[0], description: layer.description });
    } else if (node.type === "atom") {
      const atom = ATOM_INDEX.get(node.id.replace("atom:", ""));
      if (atom) onNodeSelect({ type: "atom", atom });
    } else if (node.type === "module") {
      const mod = PROVENANCE_REGISTRY.find((m) => `mod:${m.module}` === node.id);
      if (mod) onNodeSelect({ type: "module", module: mod.module, description: mod.description });
    } else {
      const parts = node.id.replace("exp:", "").split("/");
      const moduleName = parts[0];
      const exportName = parts.slice(1).join("/");
      const finding = findings.find((f) => f.module === moduleName && f.export === exportName);
      onNodeSelect({ type: "export", module: moduleName, exportName, finding });
    }
  }, [findings, onNodeSelect]);

  // Zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const scale = e.deltaY > 0 ? 1.1 : 0.9;
    setViewBox((v) => ({
      x: v.x + (v.w * (1 - scale)) / 2,
      y: v.y + (v.h * (1 - scale)) / 2,
      w: v.w * scale,
      h: v.h * scale,
    }));
  }, []);

  // Pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as SVGElement).tagName === "svg" || (e.target as SVGElement).tagName === "rect") {
      dragRef.current = { nodeId: null, startX: e.clientX, startY: e.clientY, panStart: { x: viewBox.x, y: viewBox.y } };
    }
  }, [viewBox]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragRef.current.panStart && !dragRef.current.nodeId) {
      const dx = (e.clientX - dragRef.current.startX) * (viewBox.w / (svgRef.current?.clientWidth || 1));
      const dy = (e.clientY - dragRef.current.startY) * (viewBox.h / (svgRef.current?.clientHeight || 1));
      setViewBox((v) => ({
        ...v,
        x: dragRef.current.panStart!.x - dx,
        y: dragRef.current.panStart!.y - dy,
      }));
    }
  }, [viewBox.w, viewBox.h]);

  const handleMouseUp = useCallback(() => {
    dragRef.current = { nodeId: null, startX: 0, startY: 0 };
  }, []);

  return (
    <div className="w-full h-full relative">
      {/* HUD Stats */}
      <div className="absolute top-4 left-4 flex gap-4 z-10">
        {[
          { label: "Nodes", value: nodes.length },
          { label: "Relations", value: edges.length },
          { label: "Atoms", value: ALL_ATOMS.length },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-lg font-bold text-zinc-200 tabular-nums">{s.value}</div>
            <div className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex gap-3 z-10">
        {(zoomLevel === 3
          ? SYSTEM_LAYERS.map((l) => ({ label: l.label, color: LAYER_COLORS[l.id] }))
          : [
              { label: "Primitive", color: "hsl(160 30% 50%)" },
              { label: "Module", color: "hsl(210 20% 50%)" },
              { label: "Pipeline", color: "hsl(0 0% 45%)" },
            ]
        ).map((l) => (
          <div key={l.label} className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
            {l.label}
          </div>
        ))}
      </div>

      <svg
        ref={svgRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <rect x={viewBox.x} y={viewBox.y} width={viewBox.w} height={viewBox.h} fill="transparent" />

        {/* Edges */}
        {edges.map((e, i) => {
          const s = filteredNodes.find((n) => n.id === e.source);
          const t = filteredNodes.find((n) => n.id === e.target);
          if (!s || !t || !s.visible || !t.visible) return null;
          const highlighted = hoveredNode === e.source || hoveredNode === e.target;
          return (
            <line
              key={i}
              x1={s.x} y1={s.y} x2={t.x} y2={t.y}
              stroke={highlighted ? "hsl(0 0% 40%)" : "hsl(0 0% 18%)"}
              strokeWidth={highlighted ? 1.5 : 0.5}
              opacity={hoveredNode && !highlighted ? 0.1 : 1}
            />
          );
        })}

        {/* Nodes */}
        {filteredNodes.map((node) => {
          if (!node.visible) return null;
          const color = getNodeColor(node);
          const isHovered = hoveredNode === node.id;
          const dimmed = hoveredNode && !isHovered &&
            !edges.some((e) => (e.source === hoveredNode && e.target === node.id) || (e.target === hoveredNode && e.source === node.id));

          return (
            <g
              key={node.id}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={() => handleNodeClick(node)}
              className="cursor-pointer"
              opacity={dimmed ? 0.15 : 1}
            >
              {node.type === "layer" ? (
                <rect
                  x={node.x - node.r * 1.5} y={node.y - node.r * 0.8}
                  width={node.r * 3} height={node.r * 1.6}
                  rx={6} fill={color} stroke={isHovered ? "white" : "none"} strokeWidth={2}
                  opacity={isHovered ? 1 : 0.85}
                />
              ) : node.type === "module" ? (
                <rect
                  x={node.x - node.r} y={node.y - node.r * 0.7}
                  width={node.r * 2} height={node.r * 1.4}
                  rx={3} fill={color} stroke={isHovered ? "white" : "none"} strokeWidth={1.5}
                  opacity={isHovered ? 1 : 0.8}
                />
              ) : node.type === "export" ? (
                <polygon
                  points={`${node.x},${node.y - node.r * 1.5} ${node.x + node.r * 1.5},${node.y} ${node.x},${node.y + node.r * 1.5} ${node.x - node.r * 1.5},${node.y}`}
                  fill={color} stroke={isHovered ? "white" : "none"} strokeWidth={1}
                  opacity={isHovered ? 1 : 0.7}
                />
              ) : (
                <circle
                  cx={node.x} cy={node.y} r={node.r}
                  fill={color} stroke={isHovered ? "white" : "none"} strokeWidth={1.5}
                  opacity={isHovered ? 1 : 0.85}
                />
              )}
              {isHovered && (
                <text
                  x={node.x} y={node.y - node.r - 6}
                  textAnchor="middle" fill="hsl(0 0% 85%)" fontSize={10} fontFamily="monospace"
                >
                  {node.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
