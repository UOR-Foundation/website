/**
 * GraphContextBar — Algebrica-style ambient knowledge graph strip.
 * ═══════════════════════════════════════════════════════════════════
 *
 * 24px monochrome bar at the bottom of every graph-aware window.
 * Shows node/relation counts for the current app context and
 * provides a single "View in Graph" action.
 */

import { useState, useEffect, useCallback } from "react";
import { useKnowledgeTrail } from "@/modules/desktop/hooks/useKnowledgeTrail";

interface GraphContextBarProps {
  appId: string;
  onViewGraph?: () => void;
}

interface GraphCounts {
  nodes: number;
  relations: number;
}

// Apps that should NOT show the graph bar
const EXCLUDED_APPS = new Set(["system-monitor", "settings"]);

export default function GraphContextBar({ appId, onViewGraph }: GraphContextBarProps) {
  const [counts, setCounts] = useState<GraphCounts>({ nodes: 0, relations: 0 });
  const [visible, setVisible] = useState(false);
  const { push } = useKnowledgeTrail();

  useEffect(() => {
    if (EXCLUDED_APPS.has(appId)) return;

    let cancelled = false;

    (async () => {
      try {
        const { localGraphStore } = await import("@/modules/knowledge-graph");
        const stats = await localGraphStore.getStats();
        if (!cancelled) {
          setCounts({ nodes: stats.nodeCount, relations: stats.edgeCount });
          setVisible(stats.nodeCount > 0 || stats.edgeCount > 0);
        }
      } catch {
        // Graph not available — stay hidden
      }
    })();

    return () => { cancelled = true; };
  }, [appId]);

  const handleViewGraph = useCallback(() => {
    push({ id: `graph-view:${appId}`, label: `Viewed graph from ${appId}`, appId });
    if (onViewGraph) {
      onViewGraph();
    } else {
      // Open graph explorer via OS event
      window.dispatchEvent(new CustomEvent("uor:open-app", { detail: "graph-explorer" }));
    }
  }, [appId, onViewGraph, push]);

  if (EXCLUDED_APPS.has(appId) || !visible) return null;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-[5] flex items-center justify-between px-3"
      style={{
        height: 24,
        background: "hsl(0 0% 0% / 0.4)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        borderTop: "1px solid hsl(0 0% 100% / 0.06)",
      }}
    >
      <div className="flex items-center gap-3">
        {/* Node count */}
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: "hsl(0 0% 50%)" }}
          />
          <span className="text-[9px] font-mono tabular-nums" style={{ color: "hsl(0 0% 65%)" }}>
            {counts.nodes}
          </span>
          <span className="text-[7px] font-mono uppercase tracking-widest" style={{ color: "hsl(0 0% 40%)" }}>
            nodes
          </span>
        </span>

        {/* Relation count */}
        <span className="flex items-center gap-1">
          <span className="text-[9px] font-mono" style={{ color: "hsl(0 0% 40%)" }}>↔</span>
          <span className="text-[9px] font-mono tabular-nums" style={{ color: "hsl(0 0% 65%)" }}>
            {counts.relations}
          </span>
          <span className="text-[7px] font-mono uppercase tracking-widest" style={{ color: "hsl(0 0% 40%)" }}>
            relations
          </span>
        </span>

        {/* App context */}
        <span className="flex items-center gap-1">
          <span className="text-[9px] font-mono" style={{ color: "hsl(0 0% 30%)" }}>◇</span>
          <span className="text-[7px] font-mono uppercase tracking-widest" style={{ color: "hsl(0 0% 35%)" }}>
            {appId}
          </span>
        </span>
      </div>

      {/* View in Graph action */}
      <button
        onClick={handleViewGraph}
        className="text-[8px] font-mono uppercase tracking-widest transition-colors cursor-pointer"
        style={{ color: "hsl(0 0% 45%)" }}
        onMouseEnter={e => (e.currentTarget.style.color = "hsl(0 0% 75%)")}
        onMouseLeave={e => (e.currentTarget.style.color = "hsl(0 0% 45%)")}
      >
        View in Graph →
      </button>
    </div>
  );
}
