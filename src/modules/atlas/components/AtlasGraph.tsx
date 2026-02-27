/**
 * AtlasGraph — SpellWeb-style Force-Directed Atlas Visualization
 * ═══════════════════════════════════════════════════════════════
 *
 * Renders the 96-vertex Atlas of Resonance Classes as an interactive
 * force-directed graph using d3-force + SVG. Inspired by SpellWeb's
 * constellation aesthetic: colored halos, labeled nodes, edge filaments.
 *
 * Features:
 *   - Sign class coloring (8 hues, 12 vertices each)
 *   - Mirror pairs (τ dashed connections)
 *   - Exceptional group layer toggles (G₂ ⊂ F₄ ⊂ E₆ ⊂ E₇ ⊂ E₈)
 *   - Degree-based sizing (degree-5 vs degree-6 nodes)
 *   - Unity position highlighting (golden glow)
 *   - Hover tooltip with full vertex metadata
 *   - Zoom/pan via mouse wheel + drag
 */

import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import { getAtlas } from "@/modules/atlas/atlas";

// ── Sign-class palette (8 hues, evenly spaced on wheel) ────────────────────
const SIGN_CLASS_COLORS = [
  "hsl(0, 70%, 60%)",     // 0 — Red
  "hsl(30, 80%, 55%)",    // 1 — Orange
  "hsl(55, 75%, 50%)",    // 2 — Gold
  "hsl(120, 50%, 50%)",   // 3 — Green
  "hsl(170, 60%, 48%)",   // 4 — Teal
  "hsl(210, 70%, 58%)",   // 5 — Blue
  "hsl(265, 60%, 60%)",   // 6 — Purple
  "hsl(320, 55%, 55%)",   // 7 — Magenta
];

const SIGN_CLASS_LABELS = [
  "000", "001", "010", "011", "100", "101", "110", "111",
];

// ── Exceptional group layer definitions ────────────────────────────────────
type GroupLayer = "G₂" | "F₄" | "E₆" | "E₇" | "E₈";

const GROUP_LAYER_INFO: Record<GroupLayer, { roots: number; color: string; description: string }> = {
  "G₂": { roots: 12, color: "hsl(0, 70%, 60%)",   description: "Product: 96/8 = 12 per sign class" },
  "F₄": { roots: 48, color: "hsl(30, 80%, 55%)",  description: "Quotient: Atlas/τ mirror pairs" },
  "E₆": { roots: 72, color: "hsl(170, 60%, 48%)", description: "Filtration: degree partition" },
  "E₇": { roots: 126, color: "hsl(210, 70%, 58%)", description: "Augmentation: 96 + 30 orbits" },
  "E₈": { roots: 240, color: "hsl(265, 60%, 60%)", description: "Embedding: full Atlas → E₈" },
};

// ── Node / Link types for d3 ───────────────────────────────────────────────
interface AtlasNode extends SimulationNodeDatum {
  id: number;
  label: string;
  signClass: number;
  degree: number;
  isUnity: boolean;
  mirrorPair: number;
  d45: -1 | 0 | 1;
  e7: 0 | 1;
}

interface AtlasLink extends SimulationLinkDatum<AtlasNode> {
  isMirror?: boolean;
}

// ── Build graph data from Atlas ────────────────────────────────────────────
function buildGraphData() {
  const atlas = getAtlas();
  const nodes: AtlasNode[] = atlas.vertices.map((v) => ({
    id: v.index,
    label: `${v.label.e1}${v.label.e2}${v.label.e3}:${v.label.d45 === -1 ? "−" : v.label.d45 === 1 ? "+" : "0"}:${v.label.e6}${v.label.e7}`,
    signClass: v.signClass,
    degree: v.degree,
    isUnity: v.isUnity,
    mirrorPair: v.mirrorPair,
    d45: v.label.d45,
    e7: v.label.e7,
  }));

  const edgeSet = new Set<string>();
  const links: AtlasLink[] = [];

  // Adjacency edges
  for (const v of atlas.vertices) {
    for (const n of v.neighbors) {
      const key = `${Math.min(v.index, n)}-${Math.max(v.index, n)}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        links.push({ source: v.index, target: n });
      }
    }
  }

  // Mirror pair links (separate from adjacency)
  const mirrorSet = new Set<string>();
  for (const v of atlas.vertices) {
    const key = `${Math.min(v.index, v.mirrorPair)}-${Math.max(v.index, v.mirrorPair)}`;
    if (!mirrorSet.has(key)) {
      mirrorSet.add(key);
      links.push({ source: v.index, target: v.mirrorPair, isMirror: true });
    }
  }

  return { nodes, links };
}

// ── Get vertices belonging to each exceptional group layer ─────────────────
function getLayerVertices(layer: GroupLayer): Set<number> {
  const atlas = getAtlas();
  const indices = new Set<number>();

  switch (layer) {
    case "G₂":
      // First sign class = 12 vertices (class 0)
      atlas.vertices.filter(v => v.signClass === 0).forEach(v => indices.add(v.index));
      break;
    case "F₄":
      // One representative per mirror pair = 48
      for (const [a] of atlas.mirrorPairs()) indices.add(a);
      break;
    case "E₆":
      // Degree-5 vertices (64) + 8 from degree-6
      atlas.vertices.filter(v => v.degree === 5).forEach(v => indices.add(v.index));
      atlas.vertices.filter(v => v.degree === 6).slice(0, 8).forEach(v => indices.add(v.index));
      break;
    case "E₇":
      // All 96 vertices represent the Atlas embedding (126 roots of E₇ from R₈ irreducibles)
      atlas.vertices.forEach(v => indices.add(v.index));
      break;
    case "E₈":
      // All vertices
      atlas.vertices.forEach(v => indices.add(v.index));
      break;
  }
  return indices;
}

// ── Main Component ─────────────────────────────────────────────────────────

interface AtlasGraphProps {
  width?: number;
  height?: number;
}

export default function AtlasGraph({ width = 900, height = 700 }: AtlasGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<AtlasNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showMirrors, setShowMirrors] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [activeLayer, setActiveLayer] = useState<GroupLayer | null>(null);
  const [enabledSignClasses, setEnabledSignClasses] = useState<Set<number>>(new Set([0,1,2,3,4,5,6,7]));

  // Zoom/pan state
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  const { nodes, links } = useMemo(() => buildGraphData(), []);

  // Active layer vertex set
  const layerVertices = useMemo(
    () => activeLayer ? getLayerVertices(activeLayer) : null,
    [activeLayer],
  );

  // Run d3-force simulation
  const [simNodes, setSimNodes] = useState<AtlasNode[]>([]);
  const [simLinks, setSimLinks] = useState<AtlasLink[]>([]);

  useEffect(() => {
    const nodesCopy = nodes.map(n => ({ ...n }));
    const linksCopy = links.map(l => ({ ...l, source: l.source as number, target: l.target as number }));

    const sim = forceSimulation<AtlasNode>(nodesCopy)
      .force("link", forceLink<AtlasNode, AtlasLink>(linksCopy.filter(l => !l.isMirror))
        .id(d => d.id)
        .distance(45)
        .strength(0.4))
      .force("charge", forceManyBody().strength(-120))
      .force("center", forceCenter(width / 2, height / 2))
      .force("collide", forceCollide(14))
      .alphaDecay(0.02)
      .on("tick", () => {
        setSimNodes([...nodesCopy]);
        setSimLinks([...linksCopy]);
      });

    // Run 300 ticks immediately for initial layout
    sim.tick(300);
    setSimNodes([...nodesCopy]);
    setSimLinks([...linksCopy]);

    return () => { sim.stop(); };
  }, [nodes, links, width, height]);

  // ── Zoom handler ─────────────────────────────────────────────
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const scaleFactor = e.deltaY > 0 ? 0.92 : 1.08;
    setTransform(prev => {
      const newK = Math.max(0.3, Math.min(4, prev.k * scaleFactor));
      // Zoom toward mouse position
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return { ...prev, k: newK };
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      return {
        k: newK,
        x: mx - (mx - prev.x) * (newK / prev.k),
        y: my - (my - prev.y) * (newK / prev.k),
      };
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y };
  }, [transform]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning.current) {
      setTransform(prev => ({
        ...prev,
        x: panStart.current.tx + (e.clientX - panStart.current.x),
        y: panStart.current.ty + (e.clientY - panStart.current.y),
      }));
    }
  }, []);

  const handleMouseUp = useCallback(() => { isPanning.current = false; }, []);

  // ── Node visibility based on filters ────────────────────────
  const isNodeVisible = useCallback((node: AtlasNode) => {
    if (!enabledSignClasses.has(node.signClass)) return false;
    if (layerVertices && !layerVertices.has(node.id)) return false;
    return true;
  }, [enabledSignClasses, layerVertices]);

  const toggleSignClass = (sc: number) => {
    setEnabledSignClasses(prev => {
      const next = new Set(prev);
      if (next.has(sc)) next.delete(sc);
      else next.add(sc);
      return next;
    });
  };

  return (
    <div className="flex h-full w-full bg-[hsl(230,15%,8%)] text-[hsl(0,0%,88%)] overflow-hidden">
      {/* ── Left Sidebar ─────────────────────────────────── */}
      <div className="w-[180px] shrink-0 border-r border-[hsla(210,15%,30%,0.3)] flex flex-col gap-4 p-4 overflow-y-auto">
        {/* Header */}
        <div className="text-[11px] font-mono tracking-[0.15em] text-[hsl(210,15%,55%)] uppercase">
          Layers
        </div>

        {/* Exceptional Group Layers */}
        <div className="space-y-1.5">
          {(Object.keys(GROUP_LAYER_INFO) as GroupLayer[]).map((g) => {
            const info = GROUP_LAYER_INFO[g];
            const isActive = activeLayer === g;
            return (
              <button
                key={g}
                onClick={() => setActiveLayer(isActive ? null : g)}
                className={`w-full text-left text-[12px] px-2.5 py-1.5 rounded-md transition-all duration-150 flex items-center gap-2
                  ${isActive
                    ? "bg-[hsla(210,20%,30%,0.5)] text-white"
                    : "hover:bg-[hsla(210,20%,30%,0.2)] text-[hsl(210,10%,65%)]"
                  }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: info.color, opacity: isActive ? 1 : 0.5 }}
                />
                <span className="font-mono">{g}</span>
                <span className="ml-auto text-[10px] text-[hsl(210,10%,50%)]">{info.roots}</span>
              </button>
            );
          })}
        </div>

        {/* Sign Classes */}
        <div className="text-[11px] font-mono tracking-[0.15em] text-[hsl(210,15%,55%)] uppercase mt-2">
          Sign Classes
        </div>
        <div className="space-y-1">
          {SIGN_CLASS_COLORS.map((color, i) => {
            const enabled = enabledSignClasses.has(i);
            return (
              <button
                key={i}
                onClick={() => toggleSignClass(i)}
                className={`w-full text-left text-[11px] px-2.5 py-1 rounded-md transition-all flex items-center gap-2
                  ${enabled ? "text-[hsl(0,0%,85%)]" : "text-[hsl(210,10%,40%)] opacity-50"}`}
              >
                <span
                  className="w-3 h-3 rounded-full border-2 shrink-0"
                  style={{
                    borderColor: color,
                    background: enabled ? color : "transparent",
                    opacity: enabled ? 0.8 : 0.3,
                  }}
                />
                <span className="font-mono">{SIGN_CLASS_LABELS[i]}</span>
              </button>
            );
          })}
        </div>

        {/* Toggles */}
        <div className="text-[11px] font-mono tracking-[0.15em] text-[hsl(210,15%,55%)] uppercase mt-2">
          Display
        </div>
        <label className="flex items-center gap-2 text-[11px] cursor-pointer">
          <input
            type="checkbox"
            checked={showMirrors}
            onChange={() => setShowMirrors(p => !p)}
            className="accent-[hsl(38,60%,55%)]"
          />
          Mirror Pairs (τ)
        </label>
        <label className="flex items-center gap-2 text-[11px] cursor-pointer">
          <input
            type="checkbox"
            checked={showLabels}
            onChange={() => setShowLabels(p => !p)}
            className="accent-[hsl(38,60%,55%)]"
          />
          Labels
        </label>
      </div>

      {/* ── Graph Canvas ─────────────────────────────────── */}
      <div className="flex-1 relative">
        {/* Stats bar */}
        <div className="absolute top-3 right-4 z-10 text-[11px] font-mono text-[hsl(210,10%,50%)]">
          96 vertices · 256 edges
          {activeLayer && (
            <span className="ml-3 text-[hsl(38,60%,60%)]">
              {activeLayer} — {GROUP_LAYER_INFO[activeLayer].roots} roots
            </span>
          )}
        </div>

        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`0 0 ${width} ${height}`}
          className="cursor-grab active:cursor-grabbing"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
            {/* Edges */}
            {simLinks.map((link, i) => {
              const s = link.source as AtlasNode;
              const t = link.target as AtlasNode;
              if (!s.x || !t.x) return null;

              const sVis = isNodeVisible(s);
              const tVis = isNodeVisible(t);
              if (!sVis && !tVis) return null;

              if (link.isMirror) {
                if (!showMirrors) return null;
                return (
                  <line
                    key={`m-${i}`}
                    x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                    stroke="hsla(38, 50%, 55%, 0.2)"
                    strokeWidth={0.6}
                    strokeDasharray="3,4"
                  />
                );
              }

              return (
                <line
                  key={`e-${i}`}
                  x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                  stroke="hsla(210, 20%, 50%, 0.12)"
                  strokeWidth={0.7}
                />
              );
            })}

            {/* Nodes */}
            {simNodes.map((node) => {
              if (!node.x || !node.y) return null;
              const visible = isNodeVisible(node);
              const r = node.degree === 6 ? 8 : 6;
              const color = SIGN_CLASS_COLORS[node.signClass];

              return (
                <g
                  key={node.id}
                  style={{ opacity: visible ? 1 : 0.08, transition: "opacity 300ms" }}
                  onMouseEnter={(e) => {
                    setHoveredNode(node);
                    setMousePos({ x: e.clientX, y: e.clientY });
                  }}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  {/* Outer halo (SpellWeb-style ring) */}
                  <circle
                    cx={node.x} cy={node.y} r={r + 4}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.2}
                    opacity={0.4}
                  />

                  {/* Unity golden glow */}
                  {node.isUnity && (
                    <circle
                      cx={node.x} cy={node.y} r={r + 8}
                      fill="none"
                      stroke="hsl(38, 70%, 55%)"
                      strokeWidth={1.5}
                      opacity={0.6}
                    >
                      <animate
                        attributeName="r"
                        values={`${r + 6};${r + 10};${r + 6}`}
                        dur="3s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.6;0.3;0.6"
                        dur="3s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}

                  {/* Core node */}
                  <circle
                    cx={node.x} cy={node.y} r={r}
                    fill={color}
                    opacity={0.75}
                    className="cursor-pointer"
                  />

                  {/* Inner dot */}
                  <circle
                    cx={node.x} cy={node.y} r={2}
                    fill="hsl(0, 0%, 95%)"
                    opacity={0.8}
                  />

                  {/* Label */}
                  {showLabels && visible && (
                    <text
                      x={node.x}
                      y={node.y! + r + 12}
                      textAnchor="middle"
                      fontSize={7}
                      fontFamily="monospace"
                      fill="hsla(210, 10%, 65%, 0.7)"
                    >
                      {node.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* ── Tooltip ──────────────────────────────────────── */}
        {hoveredNode && (
          <div
            className="fixed z-50 pointer-events-none px-3 py-2 rounded-lg text-[11px] font-mono space-y-1 border"
            style={{
              left: mousePos.x + 16,
              top: mousePos.y - 8,
              background: "hsl(230, 15%, 12%)",
              borderColor: SIGN_CLASS_COLORS[hoveredNode.signClass],
              maxWidth: 260,
            }}
          >
            <div className="text-[13px] font-semibold" style={{ color: SIGN_CLASS_COLORS[hoveredNode.signClass] }}>
              Vertex {hoveredNode.id}
            </div>
            <div>Label: <span className="text-white">{hoveredNode.label}</span></div>
            <div>Degree: <span className="text-white">{hoveredNode.degree}</span></div>
            <div>Sign class: <span className="text-white">{SIGN_CLASS_LABELS[hoveredNode.signClass]} (class {hoveredNode.signClass})</span></div>
            <div>d₄₅: <span className="text-white">{hoveredNode.d45}</span></div>
            <div>Mirror pair: <span className="text-white">vertex {hoveredNode.mirrorPair}</span></div>
            {hoveredNode.isUnity && (
              <div className="text-[hsl(38,70%,55%)] font-semibold">★ Unity Position</div>
            )}
          </div>
        )}
      </div>

      {/* ── Right Sidebar (Legend) ───────────────────────── */}
      <div className="w-[200px] shrink-0 border-l border-[hsla(210,15%,30%,0.3)] flex flex-col gap-3 p-4 overflow-y-auto">
        <div className="text-[11px] font-mono tracking-[0.15em] text-[hsl(210,15%,55%)] uppercase">
          Atlas of Resonance
        </div>
        <div className="text-[10px] text-[hsl(210,10%,50%)] leading-relaxed">
          96 vertices from 2⁵ × 3 label space.
          Adjacency: Hamming-1 flips (excluding e₇).
          Mirror involution τ flips e₇.
        </div>

        <div className="text-[11px] font-mono tracking-[0.15em] text-[hsl(210,15%,55%)] uppercase mt-2">
          Exceptional Chain
        </div>
        <div className="space-y-2 text-[10px]">
          {(Object.keys(GROUP_LAYER_INFO) as GroupLayer[]).map((g) => {
            const info = GROUP_LAYER_INFO[g];
            return (
              <div key={g} className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full mt-0.5 shrink-0" style={{ background: info.color }} />
                <div>
                  <span className="font-mono text-white">{g}</span>
                  <span className="text-[hsl(210,10%,50%)] ml-1">({info.roots})</span>
                  <div className="text-[9px] text-[hsl(210,10%,45%)]">{info.description}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-[11px] font-mono tracking-[0.15em] text-[hsl(210,15%,55%)] uppercase mt-3">
          Edges
        </div>
        <div className="flex flex-wrap gap-2 text-[10px]">
          <span className="text-[hsl(210,20%,55%)]">adjacency</span>
          <span className="text-[hsl(38,50%,55%)]">mirror τ</span>
        </div>

        <div className="text-[11px] font-mono tracking-[0.15em] text-[hsl(210,15%,55%)] uppercase mt-3">
          Identity
        </div>
        <div className="text-[10px] text-[hsl(210,10%,50%)] leading-relaxed font-mono">
          neg(bnot(x)) ≡ succ(x)
        </div>
        <div className="text-[9px] text-[hsl(210,10%,40%)] leading-relaxed">
          Two involutions compose to one successor step — isomorphic to Atlas Hamming-1 adjacency.
        </div>
      </div>
    </div>
  );
}
