/**
 * TrustGraphVisualization — Interactive Fano-Plane Trust Graph
 * ═════════════════════════════════════════════════════════════
 *
 * Renders the user's trust network as a Fano-plane (PG(2,2)) topology
 * using d3-force. Seven nodes map to the 7 points; 7 Fano lines show
 * the collinear attestation channels.
 *
 * Shows: attestation count, bidirectional bonds, composite trust scores.
 *
 * @module your-space/components/TrustGraphVisualization
 */

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import * as d3Force from "d3-force";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

// ── Fano Plane Topology ──────────────────────────────────────────────────────
// 7 points, 7 lines (each line = 3 collinear points)
const FANO_LINES: [number, number, number][] = [
  [0, 1, 3],
  [1, 2, 4],
  [2, 3, 5],
  [3, 4, 6],
  [4, 5, 0],
  [5, 6, 1],
  [6, 0, 2],
];

// Canonical positions for the 7 Fano points (unit circle + center)
const FANO_POSITIONS = (cx: number, cy: number, r: number) => {
  const pts: { x: number; y: number }[] = [];
  // 6 outer points evenly spaced, 1 center
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  pts.push({ x: cx, y: cy }); // Center node (index 6)
  return pts;
};

// ── Node roles mapped to the 7 points ────────────────────────────────────────
const NODE_ROLES = [
  "You",
  "Integrity",
  "Expertise",
  "Reliability",
  "Social",
  "Temporal",
  "Composite",
] as const;

type NodeRole = (typeof NODE_ROLES)[number];

const ROLE_DESCRIPTIONS: Record<NodeRole, string> = {
  "You": "Your sovereign identity",
  "Integrity": "Φ individual coherence",
  "Expertise": "Domain attestations received",
  "Reliability": "Behavioral consistency",
  "Social": "Φ social — PageRank score",
  "Temporal": "τ temporal depth",
  "Composite": "Overall trust score",
};

// ── Types ────────────────────────────────────────────────────────────────────

interface FanoNode {
  id: string;
  index: number;
  role: NodeRole;
  value: number; // 0–1
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface FanoLink {
  source: string;
  target: string;
  fanoLine: number; // which Fano line
  isBidirectional: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

interface TrustGraphVisualizationProps {
  isDark: boolean;
}

export function TrustGraphVisualization({ isDark }: TrustGraphVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ w: 420, h: 340 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [trustData, setTrustData] = useState<{
    attestationsReceived: number;
    attestationsGiven: number;
    bidirectionalBonds: number;
    avgTrust: number;
    relationshipCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Measure container
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const ro = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      if (width > 0) setDimensions({ w: width, h: Math.max(300, width * 0.78) });
    });
    ro.observe(svg.parentElement!);
    return () => ro.disconnect();
  }, []);

  // Fetch trust-related data from agent_relationships
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }
      const userId = session.user.id;

      // Fetch relationships where user is agent or target
      const [{ data: asAgent }, { data: asTarget }] = await Promise.all([
        supabase
          .from("agent_relationships")
          .select("target_id, trust_score, interaction_count, relationship_type")
          .eq("agent_id", userId)
          .limit(50),
        supabase
          .from("agent_relationships")
          .select("agent_id, trust_score, interaction_count, relationship_type")
          .eq("target_id", userId)
          .limit(50),
      ]);

      const given = asAgent?.length ?? 0;
      const received = asTarget?.length ?? 0;

      // Bidirectional bonds: where both parties attest each other
      const targetsGiven = new Set((asAgent ?? []).map((r) => r.target_id));
      const agentsReceived = new Set((asTarget ?? []).map((r) => r.agent_id));
      let biCount = 0;
      for (const t of targetsGiven) if (agentsReceived.has(t)) biCount++;

      // Average trust
      const allScores = [
        ...(asAgent ?? []).map((r) => r.trust_score),
        ...(asTarget ?? []).map((r) => r.trust_score),
      ];
      const avgTrust = allScores.length > 0
        ? allScores.reduce((s, v) => s + v, 0) / allScores.length
        : 0.5;

      setTrustData({
        attestationsReceived: received,
        attestationsGiven: given,
        bidirectionalBonds: biCount,
        avgTrust,
        relationshipCount: given + received,
      });
      setLoading(false);
    })();
  }, []);

  // Build Fano-plane graph data
  const { nodes, links } = useMemo(() => {
    const cx = dimensions.w / 2;
    const cy = dimensions.h / 2;
    const radius = Math.min(dimensions.w, dimensions.h) * 0.34;
    const positions = FANO_POSITIONS(cx, cy, radius);

    // Derive node values from trust data
    const t = trustData;
    const phiInd = t ? Math.min(1, t.avgTrust) : 0.5;
    const phiSoc = t ? Math.min(1, t.attestationsReceived / Math.max(1, t.attestationsReceived + 5)) : 0;
    const tauTemp = t ? Math.min(1, t.relationshipCount / 20) : 0;
    const expertise = t ? Math.min(1, t.attestationsGiven / 10) : 0;
    const reliability = t ? Math.min(1, t.bidirectionalBonds / 5) : 0;
    const composite = 0.3 * phiInd + 0.4 * phiSoc + 0.3 * tauTemp;

    const values = [1, phiInd, expertise, reliability, phiSoc, tauTemp, composite];

    const ns: FanoNode[] = NODE_ROLES.map((role, i) => ({
      id: `fano-${i}`,
      index: i,
      role,
      value: values[i],
      x: positions[i].x,
      y: positions[i].y,
    }));

    // Build edges from Fano lines — each line connects its 3 points pairwise
    const ls: FanoLink[] = [];
    FANO_LINES.forEach((line, li) => {
      for (let a = 0; a < 3; a++) {
        for (let b = a + 1; b < 3; b++) {
          const srcIdx = line[a];
          const tgtIdx = line[b];
          // Deduplicate
          const key = `${Math.min(srcIdx, tgtIdx)}-${Math.max(srcIdx, tgtIdx)}`;
          if (!ls.some((l) => `${Math.min(parseInt(l.source.split("-")[1]), parseInt(l.target.split("-")[1]))}-${Math.max(parseInt(l.source.split("-")[1]), parseInt(l.target.split("-")[1]))}` === key)) {
            ls.push({
              source: `fano-${srcIdx}`,
              target: `fano-${tgtIdx}`,
              fanoLine: li,
              isBidirectional: (trustData?.bidirectionalBonds ?? 0) > 0 && Math.random() > 0.5,
            });
          }
        }
      }
    });

    return { nodes: ns, links: ls };
  }, [dimensions, trustData]);

  // Run simulation
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  useEffect(() => {
    if (nodes.length === 0) return;

    const simNodes = nodes.map((n) => ({ ...n }));
    const simLinks = links.map((l) => ({ ...l }));

    const sim = d3Force
      .forceSimulation(simNodes as any)
      .force(
        "link",
        d3Force.forceLink(simLinks as any).id((d: any) => d.id).distance(60).strength(0.4)
      )
      .force("charge", d3Force.forceManyBody().strength(-60))
      .force("center", d3Force.forceCenter(dimensions.w / 2, dimensions.h / 2))
      .force("collision", d3Force.forceCollide().radius(24))
      .alpha(0.6)
      .alphaDecay(0.04);

    sim.on("tick", () => {
      const map = new Map<string, { x: number; y: number }>();
      for (const n of simNodes) {
        map.set(n.id, { x: (n as any).x ?? 0, y: (n as any).y ?? 0 });
      }
      setPositions(new Map(map));
    });

    return () => { sim.stop(); };
  }, [nodes, links, dimensions]);

  // Node radius based on value
  const getRadius = useCallback((node: FanoNode) => {
    const base = node.role === "You" ? 22 : node.role === "Composite" ? 18 : 14;
    return base * (0.6 + node.value * 0.4);
  }, []);

  // Colors from design system
  const getNodeColor = useCallback((role: NodeRole) => {
    switch (role) {
      case "You":         return "hsl(var(--primary))";
      case "Composite":   return "hsl(38, 40%, 50%)";
      case "Integrity":   return "hsl(var(--accent))";
      case "Expertise":   return "hsl(210, 60%, 55%)";
      case "Reliability": return "hsl(142, 55%, 48%)";
      case "Social":      return "hsl(280, 50%, 55%)";
      case "Temporal":    return "hsl(25, 55%, 50%)";
      default:            return "hsl(var(--muted-foreground))";
    }
  }, []);

  const selectedData = selectedNode
    ? nodes.find((n) => n.id === selectedNode)
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "Given", value: String(trustData?.attestationsGiven ?? 0) },
          { label: "Received", value: String(trustData?.attestationsReceived ?? 0) },
          { label: "Bonds", value: String(trustData?.bidirectionalBonds ?? 0) },
          { label: "Trust", value: `${Math.round((trustData?.avgTrust ?? 0.5) * 1000)}` },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center p-2 rounded-lg bg-muted/50 border border-border">
            <span className="text-foreground text-sm font-body font-semibold">{s.value}</span>
            <span className="text-muted-foreground text-[10px] font-body">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Graph */}
      <div className="relative w-full" style={{ minHeight: 280 }}>
        <svg
          ref={svgRef}
          className="w-full"
          style={{ height: dimensions.h, touchAction: "none" }}
          viewBox={`0 0 ${dimensions.w} ${dimensions.h}`}
        >
          {/* Fano line arcs — curved paths connecting collinear triples */}
          {FANO_LINES.map((line, li) => {
            const p0 = positions.get(`fano-${line[0]}`);
            const p1 = positions.get(`fano-${line[1]}`);
            const p2 = positions.get(`fano-${line[2]}`);
            if (!p0 || !p1 || !p2) return null;

            // Draw a curved path through all 3 points
            const mx = (p0.x + p1.x + p2.x) / 3;
            const my = (p0.y + p1.y + p2.y) / 3;

            // Offset midpoint for curve
            const cx2 = mx + (mx - dimensions.w / 2) * 0.15;
            const cy2 = my + (my - dimensions.h / 2) * 0.15;

            const isHighlighted = selectedNode && line.some((idx) => `fano-${idx}` === selectedNode);

            return (
              <g key={`fano-line-${li}`} opacity={isHighlighted ? 0.5 : 0.12}>
                <line x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y}
                  stroke="hsl(var(--border))" strokeWidth={isHighlighted ? 1.5 : 1} />
                <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                  stroke="hsl(var(--border))" strokeWidth={isHighlighted ? 1.5 : 1} />
                <line x1={p2.x} y1={p2.y} x2={p0.x} y2={p0.y}
                  stroke="hsl(var(--border))" strokeWidth={isHighlighted ? 1.5 : 1} />
              </g>
            );
          })}

          {/* Edge links with direction arrows */}
          {links.map((link, i) => {
            const s = positions.get(link.source);
            const t = positions.get(link.target);
            if (!s || !t) return null;

            const isHighlighted =
              selectedNode === link.source || selectedNode === link.target;

            return (
              <line
                key={`link-${i}`}
                x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                stroke={link.isBidirectional ? "hsl(38, 40%, 50%)" : "hsl(var(--border))"}
                strokeWidth={isHighlighted ? 2 : link.isBidirectional ? 1.5 : 0.8}
                strokeDasharray={link.isBidirectional ? "" : "3,3"}
                opacity={isHighlighted ? 0.7 : 0.25}
                style={{ transition: "opacity 0.3s" }}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const pos = positions.get(node.id) ?? { x: dimensions.w / 2, y: dimensions.h / 2 };
            const r = getRadius(node);
            const color = getNodeColor(node.role);
            const isHovered = hoveredNode === node.id;
            const isSelected = selectedNode === node.id;
            const opacity = node.value > 0.01 ? 0.4 + node.value * 0.6 : 0.2;

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x},${pos.y})`}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => setSelectedNode(isSelected ? null : node.id)}
                style={{ cursor: "pointer" }}
              >
                {/* Glow for high-value nodes */}
                {node.value > 0.5 && (
                  <circle
                    r={r + 6}
                    fill={color}
                    opacity={(isHovered || isSelected) ? 0.2 : 0.08}
                    style={{ filter: "blur(6px)", transition: "opacity 0.3s" }}
                  />
                )}

                {/* Selection ring */}
                {isSelected && (
                  <circle
                    r={r + 4}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.5}
                    opacity={0.6}
                  />
                )}

                {/* Main circle */}
                <circle
                  r={isHovered ? r + 2 : r}
                  fill={color}
                  stroke={color}
                  strokeWidth={node.role === "You" ? 2.5 : 1}
                  opacity={isHovered || isSelected ? 1 : opacity}
                  style={{ transition: "r 0.2s, opacity 0.3s" }}
                />

                {/* Score label inside */}
                <text
                  y={node.role === "You" ? 1 : 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="hsl(var(--primary-foreground))"
                  fontSize={node.role === "You" ? 11 : 9}
                  fontFamily="'DM Sans', system-ui, sans-serif"
                  fontWeight={600}
                  opacity={0.9}
                >
                  {node.role === "You" ? "◈" : Math.round(node.value * 100)}
                </text>

                {/* Role label below */}
                <text
                  y={r + 13}
                  textAnchor="middle"
                  fill="hsl(var(--muted-foreground))"
                  fontSize={9}
                  fontFamily="'DM Sans', system-ui, sans-serif"
                  fontWeight={400}
                  opacity={isHovered || isSelected ? 1 : 0.65}
                  style={{ transition: "opacity 0.3s" }}
                >
                  {node.role}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Bidirectional bond indicator */}
        {!selectedData && (trustData?.bidirectionalBonds ?? 0) > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5 text-[10px] text-muted-foreground font-body">
            <span className="inline-block w-3 h-0.5 rounded" style={{ background: "hsl(38, 40%, 50%)" }} />
            bidirectional bond
          </div>
        )}
      </div>

      {/* Selected node detail */}
      {selectedData && (
        <div className="p-3 rounded-lg border border-border bg-muted/40 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ background: getNodeColor(selectedData.role) }}
            />
            <span className="text-foreground font-body text-sm font-semibold">{selectedData.role}</span>
            <span className="text-muted-foreground text-xs font-body ml-auto">
              {Math.round(selectedData.value * 1000)} / 1000
            </span>
          </div>
          <p className="text-muted-foreground text-xs font-body leading-relaxed">
            {ROLE_DESCRIPTIONS[selectedData.role]}
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground font-body">
        {(["Integrity", "Expertise", "Reliability", "Social", "Temporal", "Composite"] as NodeRole[]).map((role) => (
          <span key={role} className="flex items-center gap-1">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: getNodeColor(role) }}
            />
            {role}
          </span>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground font-body leading-relaxed">
        Fano-plane topology (PG(2,2)) — 7 trust dimensions connected by 7 collinear attestation channels. 
        Composite score = 0.3·Φ<sub>individual</sub> + 0.4·Φ<sub>social</sub> + 0.3·τ<sub>temporal</sub>.
      </p>
    </div>
  );
}
