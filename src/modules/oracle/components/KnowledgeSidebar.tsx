/**
 * KnowledgeSidebar — Living context panel inspired by Algebrica's sidebar.
 *
 * Three sections:
 * 1. Your Trail — breadcrumb of recently visited topics
 * 2. Related Concepts — adjacency-index neighbors of the current topic
 * 3. Most Explored — top topics from the attention tracker
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { getSearchHistory, type SearchHistoryEntry } from "@/modules/oracle/lib/search-history";
import { loadProfile } from "@/modules/oracle/lib/attention-tracker";
import { adjacencyIndex } from "@/modules/knowledge-graph/lib/adjacency-index";
import { ChevronLeft, Clock, Compass, TrendingUp } from "lucide-react";

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
    // Search for nodes matching topic
    const neighbors = adjacencyIndex.getNeighbors(normalizedTopic);
    if (neighbors.length === 0) {
      // Try broader search
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

  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/30 hover:bg-muted/50 border border-border/20 transition-colors"
        title="Show Knowledge Sidebar"
      >
        <Compass className="w-3.5 h-3.5 text-muted-foreground/60" />
      </button>
    );
  }

  return (
    <aside
      className="flex flex-col gap-0 bg-card/40 backdrop-blur-md border border-border/20 rounded-xl overflow-hidden"
      style={{ width: 260, maxHeight: "calc(100vh - 160px)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/15">
        <span
          className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider"
        >
          Context
        </span>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {/* ── Your Trail ── */}
        <SidebarSection icon={Clock} title="Your Trail" count={trail.length}>
          {loading ? (
            <div className="text-[10px] text-muted-foreground/30 animate-pulse px-3.5 py-1">Loading…</div>
          ) : trail.length === 0 ? (
            <div className="text-[10px] text-muted-foreground/30 italic px-3.5 py-1">No explorations yet</div>
          ) : (
            <div className="flex flex-col">
              {trail.map((entry, i) => (
                <button
                  key={`${entry.keyword}-${i}`}
                  onClick={() => onNavigate(entry.keyword)}
                  className="group flex items-center gap-2 px-3.5 py-1.5 hover:bg-muted/30 transition-colors text-left"
                >
                  {/* Vertical dot connector */}
                  <div className="flex flex-col items-center" style={{ width: 10 }}>
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        entry.keyword === currentTopic
                          ? "bg-foreground"
                          : "bg-muted-foreground/30 group-hover:bg-muted-foreground/50"
                      }`}
                    />
                    {i < trail.length - 1 && (
                      <span className="w-px flex-1 bg-border/30 mt-0.5" style={{ minHeight: 8 }} />
                    )}
                  </div>
                  <span
                    className={`text-xs truncate ${
                      entry.keyword === currentTopic
                        ? "text-foreground font-medium"
                        : "text-muted-foreground/60 group-hover:text-foreground/80"
                    }`}
                  >
                    {entry.keyword}
                  </span>
                </button>
              ))}
            </div>
          )}
        </SidebarSection>

        {/* ── Related Concepts ── */}
        {related.length > 0 && (
          <SidebarSection icon={Compass} title="Discover" count={related.length}>
            <div className="flex flex-col">
              {related.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onNavigate(r.label)}
                  className="group flex items-center justify-between px-3.5 py-1.5 hover:bg-muted/30 transition-colors"
                >
                  <span className="text-xs text-muted-foreground/60 group-hover:text-foreground/80 truncate">
                    {r.label}
                  </span>
                  <span className="text-[9px] text-muted-foreground/30 font-mono shrink-0 ml-2">
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
              {mostExplored.map((m) => (
                <button
                  key={m.topic}
                  onClick={() => onNavigate(m.topic)}
                  className="group flex items-center justify-between px-3.5 py-1.5 hover:bg-muted/30 transition-colors"
                >
                  <span className="text-xs text-muted-foreground/60 group-hover:text-foreground/80 truncate">
                    {m.topic}
                  </span>
                  <span className="text-[9px] text-muted-foreground/30 font-mono shrink-0 ml-2">
                    {m.seconds}s
                  </span>
                </button>
              ))}
            </div>
          </SidebarSection>
        )}
      </div>
    </aside>
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
    <div className="border-b border-border/10 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-1.5 px-3.5 py-2 text-left hover:bg-muted/20 transition-colors"
      >
        <Icon className="w-3 h-3 text-muted-foreground/40" />
        <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider flex-1">
          {title}
        </span>
        {count !== undefined && count > 0 && (
          <span className="text-[9px] text-muted-foreground/30 font-mono">{count}</span>
        )}
        <svg
          className={`w-2.5 h-2.5 text-muted-foreground/30 transition-transform ${open ? "rotate-0" : "-rotate-90"}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && children}
    </div>
  );
}
