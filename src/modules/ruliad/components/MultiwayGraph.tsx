/**
 * MultiwayGraph — animated SVG visualization of multiway branching & merging.
 *
 * Shows how UOR projections branch from a single content-addressed identity
 * and how different computational paths merge when they produce the same hash
 * (multiway confluence via content addressing).
 *
 * Pure SVG — no external dependencies.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────

interface MWNode {
  id: string;
  label: string;
  x: number;
  y: number;
  generation: number;
  /** If set, this node merged with another (same hash) */
  mergedWith?: string;
  color: string;
  radius: number;
  opacity: number;
  birthTick: number;
}

interface MWEdge {
  from: string;
  to: string;
  birthTick: number;
  isMerge: boolean;
}

// ── Projection samples (real UOR projection names) ────────────────────────

const PROJECTIONS = [
  { name: "did:uor", short: "DID", color: "hsl(220,60%,55%)" },
  { name: "activitypub", short: "AP", color: "hsl(280,55%,55%)" },
  { name: "at-proto", short: "AT", color: "hsl(200,55%,50%)" },
  { name: "ipfs-cid", short: "CID", color: "hsl(152,44%,50%)" },
  { name: "bitcoin", short: "BTC", color: "hsl(35,80%,55%)" },
  { name: "nostr", short: "NOS", color: "hsl(340,55%,55%)" },
  { name: "gs1-gtin", short: "GS1", color: "hsl(0,60%,55%)" },
  { name: "oci-ref", short: "OCI", color: "hsl(170,50%,45%)" },
];

// ── Deterministic multiway graph generation ───────────────────────────────

function buildMultiwayGraph(tick: number): { nodes: MWNode[]; edges: MWEdge[] } {
  const nodes: MWNode[] = [];
  const edges: MWEdge[] = [];

  const cx = 400;
  const startY = 40;
  const genSpacing = 80;

  // Generation 0: Root identity (the canonical hash)
  const rootId = "root";
  nodes.push({
    id: rootId,
    label: "H(x)",
    x: cx,
    y: startY,
    generation: 0,
    color: "hsl(var(--primary))",
    radius: 10,
    opacity: 1,
    birthTick: 0,
  });

  // Generation 1: Branching — projections diverge from root
  const maxBranches = Math.min(tick, PROJECTIONS.length);
  const gen1Nodes: MWNode[] = [];
  const gen1Width = 700;
  const gen1Start = cx - gen1Width / 2;

  for (let i = 0; i < maxBranches; i++) {
    const proj = PROJECTIONS[i];
    const nodeId = `g1-${i}`;
    const xPos = gen1Start + (gen1Width / (maxBranches)) * (i + 0.5);
    const node: MWNode = {
      id: nodeId,
      label: proj.short,
      x: xPos,
      y: startY + genSpacing,
      generation: 1,
      color: proj.color,
      radius: 7,
      opacity: Math.min(1, (tick - i) * 0.5),
      birthTick: i + 1,
    };
    nodes.push(node);
    gen1Nodes.push(node);
    edges.push({ from: rootId, to: nodeId, birthTick: i + 1, isMerge: false });
  }

  if (tick < 4) return { nodes, edges };

  // Generation 2: Further branching (each projection can fork into sub-representations)
  const gen2Nodes: MWNode[] = [];
  const forkPairs = [
    [0, ["JSON-LD", "N-Quads"]],
    [2, ["Handle", "PLC"]],
    [3, ["CIDv1", "CIDv0"]],
    [4, ["P2PKH", "Taproot"]],
  ] as const;

  let gen2Count = 0;
  for (const [parentIdx, labels] of forkPairs) {
    if (parentIdx >= gen1Nodes.length) continue;
    const parent = gen1Nodes[parentIdx];
    const forkTick = maxBranches + gen2Count;
    if (tick < forkTick) break;

    for (let j = 0; j < labels.length; j++) {
      const nodeId = `g2-${gen2Count}`;
      const offset = (j - 0.5) * 50;
      const node: MWNode = {
        id: nodeId,
        label: labels[j] as string,
        x: parent.x + offset,
        y: startY + genSpacing * 2,
        generation: 2,
        color: parent.color,
        radius: 5,
        opacity: Math.min(1, (tick - forkTick) * 0.4),
        birthTick: forkTick,
      };
      nodes.push(node);
      gen2Nodes.push(node);
      edges.push({ from: parent.id, to: nodeId, birthTick: forkTick, isMerge: false });
      gen2Count++;
    }
  }

  if (tick < maxBranches + 6) return { nodes, edges };

  // Generation 3: MERGING — confluence! Different paths produce the same hash
  const mergeTick = maxBranches + 6;
  const mergeGroups = [
    { sources: ["g2-0", "g2-2"], label: "≡ H₁", x: cx - 120 },
    { sources: ["g2-3", "g2-5"], label: "≡ H₂", x: cx + 120 },
  ];

  for (let m = 0; m < mergeGroups.length; m++) {
    const mg = mergeGroups[m];
    const mTick = mergeTick + m * 2;
    if (tick < mTick) break;

    const mergeNodeId = `merge-${m}`;
    nodes.push({
      id: mergeNodeId,
      label: mg.label,
      x: mg.x,
      y: startY + genSpacing * 3,
      generation: 3,
      mergedWith: mg.sources.join("+"),
      color: "hsl(152,44%,50%)",
      radius: 9,
      opacity: Math.min(1, (tick - mTick) * 0.3),
      birthTick: mTick,
    });

    for (const src of mg.sources) {
      if (nodes.find(n => n.id === src)) {
        edges.push({ from: src, to: mergeNodeId, birthTick: mTick, isMerge: true });
      }
    }
  }

  if (tick < mergeTick + 5) return { nodes, edges };

  // Generation 4: Final convergence — all paths reconverge to canonical identity
  const convergeTick = mergeTick + 5;
  if (tick >= convergeTick) {
    const convergeId = "converge";
    nodes.push({
      id: convergeId,
      label: "H(x) ✓",
      x: cx,
      y: startY + genSpacing * 4,
      generation: 4,
      color: "hsl(var(--primary))",
      radius: 10,
      opacity: Math.min(1, (tick - convergeTick) * 0.25),
      birthTick: convergeTick,
    });

    // All merge nodes and remaining gen2 nodes converge
    for (const n of nodes) {
      if (n.generation === 3 || (n.generation === 2 && !edges.some(e => e.from === n.id && nodes.find(nn => nn.id === e.to)?.generation === 3))) {
        if (n.id !== convergeId) {
          edges.push({ from: n.id, to: convergeId, birthTick: convergeTick, isMerge: true });
        }
      }
    }
  }

  return { nodes, edges };
}

// ── Component ─────────────────────────────────────────────────────────────

export default function MultiwayGraph() {
  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const maxTick = 28;

  useEffect(() => {
    if (!playing) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setTick(t => {
        if (t >= maxTick) {
          // Loop after a pause
          return 0;
        }
        return t + 1;
      });
    }, 400);
    return () => clearInterval(intervalRef.current);
  }, [playing]);

  const { nodes, edges } = useMemo(() => buildMultiwayGraph(tick), [tick]);

  const handleReset = useCallback(() => {
    setTick(0);
    setPlaying(true);
  }, []);

  // Find edge endpoints
  const getNode = useCallback((id: string) => nodes.find(n => n.id === id), [nodes]);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div>
          <h3 className="font-semibold text-sm">Multiway Graph</h3>
          <p className="text-xs text-muted-foreground">Branching & merging of UOR projections via content addressing</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPlaying(p => !p)}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-mono text-muted-foreground ml-2">
            t={tick}/{maxTick}
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <svg viewBox="0 0 800 420" className="w-full" style={{ minHeight: 300 }}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5"
            markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--muted-foreground))" opacity={0.4} />
          </marker>
          <marker id="merge-arrow" viewBox="0 0 10 10" refX="8" refY="5"
            markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(152,44%,50%)" opacity={0.6} />
          </marker>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Edges */}
        {edges.map((edge, i) => {
          const from = getNode(edge.from);
          const to = getNode(edge.to);
          if (!from || !to) return null;
          const age = tick - edge.birthTick;
          const opacity = Math.min(0.7, age * 0.15);

          return (
            <line
              key={`e-${i}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={edge.isMerge ? "hsl(152,44%,50%)" : "hsl(var(--muted-foreground))"}
              strokeWidth={edge.isMerge ? 1.5 : 1}
              strokeDasharray={edge.isMerge ? "4 3" : "none"}
              opacity={opacity}
              markerEnd={edge.isMerge ? "url(#merge-arrow)" : "url(#arrow)"}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map(node => (
          <g key={node.id} filter={node.mergedWith ? "url(#glow)" : undefined}>
            {/* Outer glow for merge nodes */}
            {node.mergedWith && (
              <circle
                cx={node.x}
                cy={node.y}
                r={node.radius + 4}
                fill="hsl(152,44%,50%)"
                opacity={node.opacity * 0.15}
              >
                <animate attributeName="r" values={`${node.radius + 3};${node.radius + 6};${node.radius + 3}`} dur="2s" repeatCount="indefinite" />
              </circle>
            )}
            {/* Node circle */}
            <circle
              cx={node.x}
              cy={node.y}
              r={node.radius}
              fill={node.color}
              opacity={node.opacity}
              stroke={node.generation === 0 || node.generation === 4 ? "hsl(var(--primary-foreground))" : "none"}
              strokeWidth={node.generation === 0 || node.generation === 4 ? 1.5 : 0}
            />
            {/* Label */}
            <text
              x={node.x}
              y={node.y + node.radius + 14}
              textAnchor="middle"
              fill="hsl(var(--muted-foreground))"
              fontSize={node.generation <= 1 ? 11 : 9}
              fontFamily="monospace"
              opacity={node.opacity}
            >
              {node.label}
            </text>
          </g>
        ))}

        {/* Generation labels */}
        {[
          { y: 40, label: "Identity (SHA-256)" },
          { y: 120, label: "Branch: Projections" },
          { y: 200, label: "Branch: Sub-representations" },
          { y: 280, label: "Merge: Confluence (H₁ = H₂)" },
          { y: 360, label: "Converge: Canonical Identity ✓" },
        ].map((gen, i) => (
          tick >= (i === 0 ? 0 : i === 1 ? 1 : i === 2 ? 5 : i === 3 ? 15 : 20) && (
            <text
              key={gen.label}
              x={12}
              y={gen.y + 4}
              fill="hsl(var(--muted-foreground))"
              fontSize={9}
              opacity={0.5}
              fontFamily="sans-serif"
            >
              {gen.label}
            </text>
          )
        ))}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-5 py-3 border-t border-border text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-6 h-px bg-muted-foreground" />
          Branch (projection)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-6 h-px border-t border-dashed" style={{ borderColor: "hsl(152,44%,50%)" }} />
          <span style={{ color: "hsl(152,44%,50%)" }}>Merge (confluence)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(152,44%,50%)" }} />
          <span>Content-addressed identity match</span>
        </span>
        <span className="ml-auto font-mono">
          {nodes.length} nodes · {edges.length} edges
        </span>
      </div>
    </div>
  );
}
