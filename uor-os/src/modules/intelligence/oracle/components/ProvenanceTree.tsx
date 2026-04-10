/**
 * ProvenanceTree — Visual fork ancestry & descendant tree.
 *
 * Renders an interactive SVG tree showing:
 *   - Full ancestor chain (root → … → current node)
 *   - Descendant tree (current node → children → grandchildren)
 * Clicking any node navigates to that address.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GitFork, Loader2, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";

interface TreeNode {
  cid: string;
  fork_note: string | null;
  created_at: string | null;
  depth: number;
  children: TreeNode[];
}

interface LineageNode {
  cid: string;
  fork_note: string | null;
  created_at: string | null;
  depth: number;
  isCurrent: boolean;
}

interface ProvenanceData {
  root: string;
  lineage: LineageNode[];
  descendants: TreeNode[];
  totalAncestors: number;
  totalDescendants: number;
}

interface Props {
  cid: string;
  onNavigate: (cid: string) => void;
}

const NODE_COLORS = {
  root: "hsl(38, 50%, 55%)",
  ancestor: "hsl(210, 25%, 55%)",
  current: "hsl(150, 60%, 50%)",
  descendant: "hsl(280, 40%, 60%)",
};

function shortCid(cid: string): string {
  if (cid.length <= 14) return cid;
  return cid.slice(0, 8) + "…" + cid.slice(-4);
}

function timeAgo(date: string | null): string {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/* ── Single tree node ── */
function TreeNodeItem({
  cid,
  label,
  note,
  time,
  color,
  isCurrent,
  indent,
  isLast,
  hasChildren,
  expanded,
  onToggle,
  onNavigate,
}: {
  cid: string;
  label: string;
  note: string | null;
  time: string | null;
  color: string;
  isCurrent: boolean;
  indent: number;
  isLast: boolean;
  hasChildren: boolean;
  expanded: boolean;
  onToggle: () => void;
  onNavigate: (cid: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-start group"
      style={{ paddingLeft: indent * 24 }}
    >
      {/* Tree branch lines */}
      <div className="flex items-center shrink-0 mr-1">
        {indent > 0 && (
          <span className="text-muted-foreground/20 font-mono text-xs select-none mr-1">
            {isLast ? "└─" : "├─"}
          </span>
        )}
        {hasChildren && (
          <button onClick={onToggle} className="p-0.5 hover:bg-muted/20 rounded transition-colors">
            {expanded ? (
              <ChevronDown className="w-3 h-3 text-muted-foreground/40" />
            ) : (
              <ChevronRight className="w-3 h-3 text-muted-foreground/40" />
            )}
          </button>
        )}
      </div>

      {/* Node dot */}
      <div className="flex items-center gap-2 min-w-0 py-1">
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-offset-1"
          style={{
            backgroundColor: color,
            boxShadow: isCurrent ? `0 0 8px ${color}40, 0 0 0 2px hsl(var(--background)), 0 0 0 4px ${color}` : "none",
          }}
        />

        {/* CID label */}
        <button
          onClick={() => !isCurrent && onNavigate(cid)}
          disabled={isCurrent}
          className={`font-mono text-xs truncate transition-colors ${
            isCurrent
              ? "text-foreground/90 font-semibold cursor-default"
              : "text-foreground/55 hover:text-primary cursor-pointer"
          }`}
          title={cid}
        >
          {label}
        </button>

        {isCurrent && (
          <span className="text-[9px] font-mono uppercase tracking-wider bg-primary/15 text-primary/70 px-1.5 py-0.5 rounded-sm shrink-0">
            you are here
          </span>
        )}

        {note && (
          <span className="text-[10px] text-muted-foreground/30 italic truncate max-w-[120px]">
            {note}
          </span>
        )}

        {time && (
          <span className="text-[10px] text-muted-foreground/20 shrink-0">
            {timeAgo(time)}
          </span>
        )}

        {!isCurrent && (
          <ExternalLink className="w-3 h-3 text-muted-foreground/15 group-hover:text-muted-foreground/40 transition-colors shrink-0" />
        )}
      </div>
    </motion.div>
  );
}

/* ── Recursive descendant renderer ── */
function DescendantBranch({
  node,
  indent,
  isLast,
  onNavigate,
}: {
  node: TreeNode;
  indent: number;
  isLast: boolean;
  onNavigate: (cid: string) => void;
}) {
  const [expanded, setExpanded] = useState(indent < 2);

  return (
    <>
      <TreeNodeItem
        cid={node.cid}
        label={shortCid(node.cid)}
        note={node.fork_note}
        time={node.created_at}
        color={NODE_COLORS.descendant}
        isCurrent={false}
        indent={indent}
        isLast={isLast}
        hasChildren={node.children.length > 0}
        expanded={expanded}
        onToggle={() => setExpanded((e) => !e)}
        onNavigate={onNavigate}
      />
      <AnimatePresence>
        {expanded &&
          node.children.map((child, i) => (
            <DescendantBranch
              key={child.cid}
              node={child}
              indent={indent + 1}
              isLast={i === node.children.length - 1}
              onNavigate={onNavigate}
            />
          ))}
      </AnimatePresence>
    </>
  );
}

/* ── Main ProvenanceTree component ── */
export default function ProvenanceTree({ cid, onNavigate }: Props) {
  const [data, setData] = useState<ProvenanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTree, setShowTree] = useState(true);

  useEffect(() => {
    if (!cid) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/provenance-tree?cid=${encodeURIComponent(cid)}`,
          { headers: { apikey: anonKey } }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [cid]);

  const isEmpty = !data || (data.totalAncestors === 0 && data.totalDescendants === 0);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground/40 text-xs font-mono py-4">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Tracing provenance chain…
      </div>
    );
  }

  if (error || isEmpty) return null;

  return (
    <div className="space-y-3">
      {/* Header */}
      <button
        onClick={() => setShowTree((s) => !s)}
        className="flex items-center gap-2 group w-full"
      >
        <GitFork className="w-3.5 h-3.5 text-primary/50" />
        <span className="text-xs font-semibold text-primary/60 uppercase tracking-[0.15em]">
          Provenance Tree
        </span>
        <span className="text-[10px] text-muted-foreground/30 font-mono">
          {data!.totalAncestors > 0 && `${data!.totalAncestors} ancestor${data!.totalAncestors > 1 ? "s" : ""}`}
          {data!.totalAncestors > 0 && data!.totalDescendants > 0 && " · "}
          {data!.totalDescendants > 0 && `${data!.totalDescendants} fork${data!.totalDescendants > 1 ? "s" : ""}`}
        </span>
        <ChevronDown
          className={`w-3 h-3 text-muted-foreground/30 ml-auto transition-transform ${showTree ? "" : "-rotate-90"}`}
        />
      </button>

      <AnimatePresence>
        {showTree && data && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border border-border/10 rounded-xl bg-muted/3 p-4 space-y-0.5 max-h-[400px] overflow-y-auto">
              {/* Legend */}
              <div className="flex items-center gap-4 mb-3 pb-3 border-b border-border/10">
                {data.totalAncestors > 0 && (
                  <>
                    <LegendDot color={NODE_COLORS.root} label="Root" />
                    <LegendDot color={NODE_COLORS.ancestor} label="Ancestor" />
                  </>
                )}
                <LegendDot color={NODE_COLORS.current} label="Current" />
                {data.totalDescendants > 0 && (
                  <LegendDot color={NODE_COLORS.descendant} label="Fork" />
                )}
              </div>

              {/* Ancestor lineage */}
              {data.lineage.map((node, i) => (
                <TreeNodeItem
                  key={node.cid + i}
                  cid={node.cid}
                  label={shortCid(node.cid)}
                  note={node.fork_note}
                  time={node.created_at}
                  color={
                    node.isCurrent
                      ? NODE_COLORS.current
                      : i === 0
                        ? NODE_COLORS.root
                        : NODE_COLORS.ancestor
                  }
                  isCurrent={node.isCurrent}
                  indent={i}
                  isLast={i === data.lineage.length - 1 && data.descendants.length === 0}
                  hasChildren={false}
                  expanded={false}
                  onToggle={() => {}}
                  onNavigate={onNavigate}
                />
              ))}

              {/* Descendants */}
              {data.descendants.map((node, i) => (
                <DescendantBranch
                  key={node.cid}
                  node={node}
                  indent={data.lineage.length}
                  isLast={i === data.descendants.length - 1}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[10px] text-muted-foreground/40">{label}</span>
    </div>
  );
}
