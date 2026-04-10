/**
 * GraphQuickView — Inline Algebrica-style 1-hop concept map overlay.
 * ═══════════════════════════════════════════════════════════════════
 *
 * Renders a compact radial graph centered on the current content node.
 * Dismissible with Escape or click-outside. Monochrome, frosted glass.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ConceptMap, { type ConceptNode, type ConceptEdge } from "@/modules/data/knowledge-graph/components/ConceptMap";
import StatBlock from "@/modules/platform/core/components/StatBlock";

interface GraphQuickViewProps {
  open: boolean;
  onClose: () => void;
  /** UOR address or label to center on */
  centerLabel?: string;
  centerAddress?: string;
}

export default function GraphQuickView({ open, onClose, centerLabel, centerAddress }: GraphQuickViewProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [center, setCenter] = useState<ConceptNode | null>(null);
  const [neighbors, setNeighbors] = useState<ConceptNode[]>([]);
  const [edges, setEdges] = useState<ConceptEdge[]>([]);
  const [stats, setStats] = useState({ nodes: 0, relations: 0, chain: 0 });

  // Load graph data when opened
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      try {
        const { localGraphStore } = await import("@/modules/data/knowledge-graph");
        const allNodes = await localGraphStore.getAllNodes();
        const graphStats = await localGraphStore.getStats();

        if (cancelled) return;

        // Find center node
        let centerNode = centerAddress
          ? allNodes.find(n => n.uorAddress === centerAddress)
          : allNodes.find(n => n.label.toLowerCase().includes((centerLabel || "").toLowerCase()));

        if (!centerNode && allNodes.length > 0) {
          centerNode = allNodes[0];
        }

        if (!centerNode) {
          setCenter({ id: "empty", label: centerLabel || "No nodes", type: "empty" });
          setNeighbors([]);
          setEdges([]);
          setStats({ nodes: graphStats.nodeCount, relations: graphStats.edgeCount, chain: 0 });
          return;
        }

        setCenter({
          id: centerNode.uorAddress,
          label: centerNode.label,
          type: centerNode.nodeType,
        });

        // Get 1-hop neighbors via edges
        const subjectEdges = await localGraphStore.queryBySubject(centerNode.uorAddress);
        const objectEdges = await localGraphStore.queryByObject(centerNode.uorAddress);

        const neighborMap = new Map<string, ConceptNode>();
        const conceptEdges: ConceptEdge[] = [];

        for (const edge of [...subjectEdges, ...objectEdges]) {
          const neighborAddr = edge.subject === centerNode.uorAddress ? edge.object : edge.subject;
          const neighborNode = allNodes.find(n => n.uorAddress === neighborAddr);
          if (neighborNode && !neighborMap.has(neighborAddr)) {
            neighborMap.set(neighborAddr, {
              id: neighborAddr,
              label: neighborNode.label,
              type: neighborNode.nodeType,
            });
          }
          conceptEdges.push({
            from: edge.subject,
            to: edge.object,
            relation: edge.predicate.split("/").pop() || edge.predicate,
          });
        }

        if (!cancelled) {
          setNeighbors(Array.from(neighborMap.values()).slice(0, 12));
          setEdges(conceptEdges);
          setStats({
            nodes: graphStats.nodeCount,
            relations: graphStats.edgeCount,
            chain: Math.min(subjectEdges.length + objectEdges.length, 99),
          });
        }
      } catch {
        // Silently handle graph errors
      }
    })();

    return () => { cancelled = true; };
  }, [open, centerLabel, centerAddress]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Click outside
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  }, [onClose]);

  const handleNodeClick = useCallback((id: string) => {
    window.dispatchEvent(new CustomEvent("uor:open-app", { detail: "graph-explorer" }));
    onClose();
  }, [onClose]);

  const handleFullGraph = useCallback(() => {
    window.dispatchEvent(new CustomEvent("uor:open-app", { detail: "graph-explorer" }));
    onClose();
  }, [onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlayRef}
          className="absolute inset-0 z-[20] flex items-center justify-center"
          style={{
            background: "hsl(0 0% 0% / 0.7)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleOverlayClick}
        >
          <motion.div
            className="relative"
            style={{
              background: "hsl(0 0% 4%)",
              border: "1px solid hsl(0 0% 100% / 0.08)",
              borderRadius: 12,
              maxWidth: 520,
              width: "90%",
            }}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "hsl(0 0% 45%)" }}>
                Knowledge Graph
              </span>
              <button
                onClick={handleFullGraph}
                className="text-[8px] font-mono uppercase tracking-widest transition-colors cursor-pointer"
                style={{ color: "hsl(0 0% 40%)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "hsl(0 0% 70%)")}
                onMouseLeave={e => (e.currentTarget.style.color = "hsl(0 0% 40%)")}
              >
                Full Graph →
              </button>
            </div>

            {/* Concept Map */}
            <div className="flex justify-center px-4 py-2">
              {center && (
                <ConceptMap
                  center={center}
                  neighbors={neighbors}
                  edges={edges}
                  onNodeClick={handleNodeClick}
                  width={460}
                  height={260}
                />
              )}
            </div>

            {/* Stats strip */}
            <div
              className="flex items-center gap-4 px-4 py-2"
              style={{ borderTop: "1px solid hsl(0 0% 100% / 0.06)" }}
            >
              <StatBlock value={stats.nodes} label="Nodes" />
              <StatBlock value={stats.relations} label="Relations" />
              <StatBlock value={stats.chain} label="Connections" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
