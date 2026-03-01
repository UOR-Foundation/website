/**
 * Knowledge Graph Explorer — Interactive Force-Directed Network
 * ═══════════════════════════════════════════════════════════════
 *
 * Renders the user's knowledge triples as a living, force-directed
 * graph. Nodes are subjects/objects, edges are predicates.
 * Touch-draggable, zoomable, with gentle ambient animation.
 *
 * @module hologram-ui/components/lumen/KnowledgeGraphExplorer
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Network, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";

// ── Types ────────────────────────────────────────────────────────────

interface GraphNode extends SimulationNodeDatum {
  id: string;
  label: string;
  type: "self" | "predicate" | "object";
  predicate?: string;
  count: number;
}

interface GraphLink extends SimulationLinkDatum<GraphNode> {
  predicate: string;
}

interface KnowledgeGraphExplorerProps {
  userId: string;
}

// ── Predicate color map ──────────────────────────────────────────────

const PRED_COLORS: Record<string, string> = {
  "interested-in": "hsl(38, 55%, 55%)",
  "works-on": "hsl(200, 50%, 55%)",
  "expertise-in": "hsl(142, 40%, 55%)",
  "goal": "hsl(280, 45%, 60%)",
  "prefers": "hsl(340, 45%, 55%)",
  "context": "hsl(25, 50%, 55%)",
};

function predColor(p: string): string {
  return PRED_COLORS[p] ?? "hsl(38, 30%, 50%)";
}

// ── Component ────────────────────────────────────────────────────────

export default function KnowledgeGraphExplorer({ userId }: KnowledgeGraphExplorerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const simRef = useRef<ReturnType<typeof forceSimulation<GraphNode>> | null>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);
  const dragRef = useRef<{ node: GraphNode; active: boolean } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [nodeCount, setNodeCount] = useState(0);
  const offsetRef = useRef({ x: 0, y: 0 });

  // ── Load triples and build graph ──────────────────────────────────
  const buildGraph = useCallback(async () => {
    const { data } = await supabase
      .from("messenger_context_graph")
      .select("triple_subject, triple_predicate, triple_object, confidence")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(80);

    if (!data || data.length === 0) {
      nodesRef.current = [];
      linksRef.current = [];
      setNodeCount(0);
      return;
    }

    const nodeMap = new Map<string, GraphNode>();

    // Always add self node
    nodeMap.set("user:self", {
      id: "user:self",
      label: "You",
      type: "self",
      count: data.length,
    });

    // Build nodes and links
    const links: GraphLink[] = [];

    for (const triple of data) {
      const objId = `${triple.triple_predicate}:${triple.triple_object}`;

      if (!nodeMap.has(objId)) {
        nodeMap.set(objId, {
          id: objId,
          label: triple.triple_object,
          type: "object",
          predicate: triple.triple_predicate,
          count: 1,
        });
      } else {
        nodeMap.get(objId)!.count++;
      }

      links.push({
        source: "user:self",
        target: objId,
        predicate: triple.triple_predicate,
      });
    }

    nodesRef.current = Array.from(nodeMap.values());
    linksRef.current = links;
    setNodeCount(nodesRef.current.length);

    // Build simulation
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);

    simRef.current?.stop();
    simRef.current = forceSimulation<GraphNode>(nodesRef.current)
      .force("link", forceLink<GraphNode, GraphLink>(linksRef.current).id(d => d.id).distance(60).strength(0.4))
      .force("charge", forceManyBody().strength(-120))
      .force("center", forceCenter(w / 2, h / 2))
      .force("collide", forceCollide(22))
      .alphaDecay(0.02)
      .velocityDecay(0.3);
  }, [userId]);

  useEffect(() => {
    buildGraph();
    return () => { simRef.current?.stop(); };
  }, [buildGraph]);

  // ── Render loop ───────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const observer = new ResizeObserver(resize);
    if (canvas.parentElement) observer.observe(canvas.parentElement);

    let t = 0;
    const draw = () => {
      t += 0.005;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      ctx.save();
      ctx.translate(offsetRef.current.x, offsetRef.current.y);
      ctx.scale(zoom, zoom);

      const nodes = nodesRef.current;
      const links = linksRef.current;

      // Draw links
      for (const link of links) {
        const s = link.source as GraphNode;
        const tgt = link.target as GraphNode;
        if (s.x == null || s.y == null || tgt.x == null || tgt.y == null) continue;

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(tgt.x, tgt.y);
        const c = predColor(link.predicate);
        ctx.strokeStyle = c.replace(")", ", 0.18)").replace("hsl(", "hsla(");
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw nodes
      for (const node of nodes) {
        if (node.x == null || node.y == null) continue;

        const isHovered = hoveredNode?.id === node.id;
        const pulse = Math.sin(t * 2 + (node.count ?? 1)) * 0.5 + 0.5;

        if (node.type === "self") {
          // Central self node
          const r = 10 + pulse * 2;
          const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 2);
          grad.addColorStop(0, "hsla(38, 55%, 55%, 0.3)");
          grad.addColorStop(1, "hsla(38, 55%, 55%, 0)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(node.x, node.y, r * 2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "hsl(38, 55%, 55%)";
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "hsl(25, 8%, 8%)";
          ctx.font = "bold 8px 'DM Sans', sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("You", node.x, node.y);
        } else {
          // Object nodes
          const color = predColor(node.predicate ?? "");
          const r = 5 + Math.min(node.count, 5) * 1 + (isHovered ? 2 : 0);

          if (isHovered) {
            const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 2.5);
            grad.addColorStop(0, color.replace(")", ", 0.2)").replace("hsl(", "hsla("));
            grad.addColorStop(1, "transparent");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(node.x, node.y, r * 2.5, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.fillStyle = color.replace(")", `, ${0.6 + pulse * 0.2})`).replace("hsl(", "hsla(");
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
          ctx.fill();

          // Label
          ctx.fillStyle = `hsla(38, 15%, 82%, ${isHovered ? 0.95 : 0.55})`;
          ctx.font = `${isHovered ? "500" : "400"} ${isHovered ? 10 : 9}px 'DM Sans', sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          const label = node.label.length > 18 ? node.label.slice(0, 16) + "…" : node.label;
          ctx.fillText(label, node.x, node.y + r + 3);
        }
      }

      ctx.restore();
      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      observer.disconnect();
    };
  }, [zoom, hoveredNode]);

  // ── Mouse/Touch interactions ──────────────────────────────────────
  const getNodeAtPos = useCallback((cx: number, cy: number): GraphNode | null => {
    const x = (cx - offsetRef.current.x) / zoom;
    const y = (cy - offsetRef.current.y) / zoom;
    for (const node of nodesRef.current) {
      if (node.x == null || node.y == null) continue;
      const dx = node.x - x;
      const dy = node.y - y;
      if (dx * dx + dy * dy < 15 * 15) return node;
    }
    return null;
  }, [zoom]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const node = getNodeAtPos(e.clientX - rect.left, e.clientY - rect.top);
    if (node) {
      dragRef.current = { node, active: true };
      node.fx = node.x;
      node.fy = node.y;
      simRef.current?.alphaTarget(0.3).restart();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  }, [getNodeAtPos]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    if (dragRef.current?.active) {
      const node = dragRef.current.node;
      node.fx = (cx - offsetRef.current.x) / zoom;
      node.fy = (cy - offsetRef.current.y) / zoom;
    } else {
      setHoveredNode(getNodeAtPos(cx, cy));
    }
  }, [zoom, getNodeAtPos]);

  const handlePointerUp = useCallback(() => {
    if (dragRef.current) {
      dragRef.current.node.fx = null;
      dragRef.current.node.fy = null;
      dragRef.current = null;
      simRef.current?.alphaTarget(0);
    }
  }, []);

  const height = expanded ? 320 : 180;

  if (nodeCount === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h3
          className="text-xs font-medium tracking-widest uppercase flex items-center gap-2"
          style={{ color: "hsl(30, 10%, 55%)" }}
        >
          <Network size={12} /> Graph Explorer
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom(z => Math.min(2, z + 0.2))}
            className="p-1 rounded transition-colors"
            style={{ color: "hsl(30, 10%, 55%)" }}
          >
            <ZoomIn size={12} />
          </button>
          <button
            onClick={() => setZoom(z => Math.max(0.4, z - 0.2))}
            className="p-1 rounded transition-colors"
            style={{ color: "hsl(30, 10%, 55%)" }}
          >
            <ZoomOut size={12} />
          </button>
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1 rounded transition-colors"
            style={{ color: expanded ? "hsl(38, 50%, 55%)" : "hsl(30, 10%, 55%)" }}
          >
            <Maximize2 size={12} />
          </button>
        </div>
      </div>

      <motion.div
        animate={{ height }}
        transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
        className="relative rounded-xl overflow-hidden"
        style={{
          background: "hsla(25, 8%, 6%, 0.8)",
          border: "1px solid hsla(38, 30%, 40%, 0.1)",
        }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          style={{ touchAction: "none" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />

        {/* Legend */}
        <div className="absolute bottom-2 left-2 flex flex-wrap gap-x-3 gap-y-1">
          {Object.entries(PRED_COLORS).map(([key, color]) => (
            <div key={key} className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
              <span className="text-[9px]" style={{ color: "hsla(38, 15%, 65%, 0.4)" }}>
                {key.replace("-", " ")}
              </span>
            </div>
          ))}
        </div>

        {/* Hovered node tooltip */}
        <AnimatePresence>
          {hoveredNode && hoveredNode.type !== "self" && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-2 right-2 px-2.5 py-1.5 rounded-lg"
              style={{
                background: "hsla(25, 8%, 10%, 0.9)",
                border: "1px solid hsla(38, 30%, 40%, 0.15)",
              }}
            >
              <p className="text-xs" style={{ color: predColor(hoveredNode.predicate ?? "") }}>
                {hoveredNode.predicate?.replace("-", " ")}
              </p>
              <p className="text-xs font-medium" style={{ color: "hsl(38, 15%, 82%)" }}>
                {hoveredNode.label}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
