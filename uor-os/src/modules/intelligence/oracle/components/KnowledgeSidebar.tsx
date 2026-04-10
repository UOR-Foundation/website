/**
 * KnowledgeSidebar — Algebrica-inspired living context panel.
 *
 * Monochrome aesthetic with three collapsible sections:
 *   1. Your Trail — breadcrumb of recently visited topics
 *   2. Discover — adjacency-index neighbors of the current topic
 *   3. Most Explored — top topics from the attention tracker
 *
 * Features Algebrica-style stat blocks (Depth · Breadth · Focus)
 * and a monochrome zinc-scale palette.
 */

import { useState, useEffect, useMemo } from "react";
import { getSearchHistory, type SearchHistoryEntry } from "@/modules/intelligence/oracle/lib/search-history";
import { loadProfile } from "@/modules/intelligence/oracle/lib/attention-tracker";
import { adjacencyIndex } from "@/modules/data/knowledge-graph/lib/adjacency-index";
import { ChevronLeft, Clock, Compass, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  currentTopic?: string;
  onNavigate: (topic: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function KnowledgeSidebar({
  currentTopic,
  onNavigate,
  collapsed = false,
  onToggleCollapse,
}: Props) {
  const [trail, setTrail] = useState<SearchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await getSearchHistory(10);
      if (!cancelled) {
        setTrail(entries);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [currentTopic]);

  // Related concepts from adjacency index
  const related = useMemo(() => {
    if (!currentTopic || !adjacencyIndex.isInitialized()) return [];
    const normalizedTopic = currentTopic.toLowerCase();
    const neighbors = adjacencyIndex.getNeighbors(normalizedTopic);
    if (neighbors.length === 0) {
      const outgoing = adjacencyIndex.getOutgoing(normalizedTopic);
      const incoming = adjacencyIndex.getIncoming(normalizedTopic);
      return [...new Set([...outgoing, ...incoming])].slice(0, 8).map((n) => ({
        id: n,
        label: n.split("/").pop() || n.slice(-20),
        connections: adjacencyIndex.getNeighbors(n).length,
      }));
    }
    return neighbors.slice(0, 8).map((n) => ({
      id: n,
      label: n.split("/").pop() || n.slice(-20),
      connections: adjacencyIndex.getNeighbors(n).length,
    }));
  }, [currentTopic]);

  // Most explored from attention profile
  const mostExplored = useMemo(() => {
    const profile = loadProfile();
    const dwells = profile.sessionDwells;
    return Object.entries(dwells)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([topic, seconds]) => ({ topic, seconds: Math.round(seconds) }));
  }, [currentTopic]);

  // Algebrica stats
  const stats = useMemo(() => ({
    depth: trail.length,
    breadth: related.length,
    focus: mostExplored.length > 0 ? mostExplored[0]?.seconds ?? 0 : 0,
  }), [trail, related, mostExplored]);

  if (collapsed) {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={onToggleCollapse}
        className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#141414] hover:bg-[#1c1c1e] border border-[#1c1c1e] transition-colors"
        title="Show Knowledge Sidebar"
      >
        <Compass className="w-3.5 h-3.5 text-[#52525b]" />
      </motion.button>
    );
  }

  return (
    <motion.aside
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col gap-0 bg-[#0c0c0c]/90 backdrop-blur-xl border border-[#1c1c1e] rounded-xl overflow-hidden"
      style={{ width: 260, maxHeight: "calc(100vh - 160px)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#1c1c1e]">
        <span className="text-[10px] font-semibold text-[#52525b] uppercase tracking-[0.12em]">
          Context
        </span>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="text-[#3f3f46] hover:text-[#71717a] transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Algebrica stat blocks */}
      <div className="flex items-center divide-x divide-[#1c1c1e] border-b border-[#1c1c1e]">
        <StatCell label="Depth" value={stats.depth} />
        <StatCell label="Breadth" value={stats.breadth} />
        <StatCell label="Focus" value={`${stats.focus}s`} />
      </div>

      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {/* ── Your Trail ── */}
        <SidebarSection icon={Clock} title="Your Trail" count={trail.length}>
          {loading ? (
            <div className="text-[10px] text-[#27272a] animate-pulse px-3.5 py-2">Loading…</div>
          ) : trail.length === 0 ? (
            <div className="text-[10px] text-[#27272a] italic px-3.5 py-2">No explorations yet</div>
          ) : (
            <div className="flex flex-col">
              {trail.map((entry, i) => (
                <button
                  key={`${entry.keyword}-${i}`}
                  onClick={() => onNavigate(entry.keyword)}
                  className="group flex items-center gap-2 px-3.5 py-1.5 hover:bg-[#141414] transition-colors text-left"
                >
                  {/* Trail connector */}
                  <div className="flex flex-col items-center" style={{ width: 10 }}>
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        entry.keyword === currentTopic
                          ? "bg-[#d4d4d8]"
                          : "bg-[#27272a] group-hover:bg-[#3f3f46]"
                      }`}
                    />
                    {i < trail.length - 1 && (
                      <span className="w-px flex-1 bg-[#1c1c1e] mt-0.5" style={{ minHeight: 8 }} />
                    )}
                  </div>
                  <span
                    className={`text-[11px] truncate ${
                      entry.keyword === currentTopic
                        ? "text-[#d4d4d8] font-medium"
                        : "text-[#52525b] group-hover:text-[#a1a1aa]"
                    }`}
                  >
                    {entry.keyword}
                  </span>
                </button>
              ))}
            </div>
          )}
        </SidebarSection>

        {/* ── Discover (Related Concepts) ── */}
        {related.length > 0 && (
          <SidebarSection icon={Compass} title="Discover" count={related.length}>
            <div className="flex flex-col">
              {related.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onNavigate(r.label)}
                  className="group flex items-center justify-between px-3.5 py-1.5 hover:bg-[#141414] transition-colors"
                >
                  <span className="text-[11px] text-[#52525b] group-hover:text-[#a1a1aa] truncate">
                    {r.label}
                  </span>
                  <span className="text-[9px] text-[#27272a] font-mono shrink-0 ml-2 tabular-nums">
                    {r.connections}
                  </span>
                </button>
              ))}
            </div>
          </SidebarSection>
        )}

        {/* ── Most Explored ── */}
        {mostExplored.length > 0 && (
          <SidebarSection icon={TrendingUp} title="Most Explored" count={mostExplored.length}>
            <div className="flex flex-col">
              {mostExplored.map((m) => {
                // Bar width proportional to max
                const maxSec = mostExplored[0].seconds || 1;
                const pct = Math.min(100, (m.seconds / maxSec) * 100);

                return (
                  <button
                    key={m.topic}
                    onClick={() => onNavigate(m.topic)}
                    className="group relative flex items-center justify-between px-3.5 py-1.5 hover:bg-[#141414] transition-colors overflow-hidden"
                  >
                    {/* Background bar */}
                    <div
                      className="absolute inset-y-0 left-0 bg-[#141414] group-hover:bg-[#1c1c1e] transition-colors"
                      style={{ width: `${pct}%` }}
                    />
                    <span className="relative text-[11px] text-[#52525b] group-hover:text-[#a1a1aa] truncate">
                      {m.topic}
                    </span>
                    <span className="relative text-[9px] text-[#27272a] font-mono shrink-0 ml-2 tabular-nums">
                      {m.seconds}s
                    </span>
                  </button>
                );
              })}
            </div>
          </SidebarSection>
        )}
      </div>
    </motion.aside>
  );
}

/* ── Stat Cell ── */

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center flex-1 py-2">
      <span className="text-[13px] font-mono font-semibold text-[#a1a1aa] tabular-nums">
        {value}
      </span>
      <span className="text-[8px] font-medium uppercase tracking-[0.14em] text-[#3f3f46] mt-0.5">
        {label}
      </span>
    </div>
  );
}

/* ── Section wrapper ── */

function SidebarSection({
  icon: Icon,
  title,
  count,
  children,
}: {
  icon: React.ElementType;
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border-b border-[#1c1c1e] last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-1.5 px-3.5 py-2 text-left hover:bg-[#141414] transition-colors"
      >
        <Icon className="w-3 h-3 text-[#3f3f46]" />
        <span className="text-[9px] font-semibold text-[#3f3f46] uppercase tracking-[0.12em] flex-1">
          {title}
        </span>
        {count !== undefined && count > 0 && (
          <span className="text-[9px] text-[#27272a] font-mono tabular-nums">{count}</span>
        )}
        <svg
          className={`w-2.5 h-2.5 text-[#27272a] transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
