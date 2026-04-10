/**
 * KnowledgeSidebar — Algebrica-inspired left panel.
 * Shows Your Trail (recent navigation), Discover (backlinks),
 * and Most Explored (top nodes by reference count).
 *
 * Pulls live data from sessionStorage trail + knowledge graph store.
 */

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Compass, TrendingUp, ChevronRight, Circle } from "lucide-react";

// ── Trail storage ──────────────────────────────────────────────

const TRAIL_KEY = "uor:knowledge-trail";
const MAX_TRAIL = 8;

export interface TrailEntry {
  id: string;
  label: string;
  path?: string;
  timestamp: number;
}

export function pushTrail(entry: Omit<TrailEntry, "timestamp">) {
  try {
    const raw = sessionStorage.getItem(TRAIL_KEY);
    const trail: TrailEntry[] = raw ? JSON.parse(raw) : [];
    const filtered = trail.filter((t) => t.id !== entry.id);
    filtered.unshift({ ...entry, timestamp: Date.now() });
    sessionStorage.setItem(TRAIL_KEY, JSON.stringify(filtered.slice(0, MAX_TRAIL)));
  } catch { /* noop */ }
}

function readTrail(): TrailEntry[] {
  try {
    const raw = sessionStorage.getItem(TRAIL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ── Backlink / Discovery types ─────────────────────────────────

export interface BacklinkEntry {
  id: string;
  label: string;
  count: number;
  category?: string;
}

export interface TopNode {
  id: string;
  label: string;
  visits: number;
}

interface KnowledgeSidebarProps {
  /** Current page/concept ID for backlink discovery */
  currentId?: string;
  /** Backlinks to display in Discover section */
  backlinks?: BacklinkEntry[];
  /** Top nodes by exploration count */
  topNodes?: TopNode[];
  /** Callback when a sidebar item is clicked */
  onNavigate?: (id: string, path?: string) => void;
  /** Extra className */
  className?: string;
}

// ── Section component ──────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  count,
  children,
  defaultOpen = true,
}: {
  icon: React.ElementType;
  title: string;
  count?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left group hover:bg-white/[0.03] rounded transition-colors"
      >
        <Icon size={12} className="text-zinc-500 shrink-0" />
        <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-500 group-hover:text-zinc-300 transition-colors">
          {title}
        </span>
        {count !== undefined && (
          <span className="ml-auto text-[9px] font-mono text-zinc-700">{count}</span>
        )}
        <ChevronRight
          size={10}
          className={`text-zinc-700 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────

export default function KnowledgeSidebar({
  currentId,
  backlinks = [],
  topNodes = [],
  onNavigate,
  className = "",
}: KnowledgeSidebarProps) {
  const [trail, setTrail] = useState<TrailEntry[]>([]);

  useEffect(() => {
    setTrail(readTrail());
    // Re-read on storage events (cross-tab)
    const handler = () => setTrail(readTrail());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [currentId]);

  const timeAgo = (ts: number) => {
    const d = Date.now() - ts;
    if (d < 60_000) return "just now";
    if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`;
    return `${Math.floor(d / 3_600_000)}h ago`;
  };

  return (
    <div
      className={`w-[260px] shrink-0 border-r border-white/[0.06] bg-[hsl(220_15%_5%)] flex flex-col overflow-hidden ${className}`}
    >
      {/* Logo/Title area */}
      <div className="px-4 py-4 border-b border-white/[0.04]">
        <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-500">
          Knowledge
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        {/* ── Your Trail ────────────────────────────────────── */}
        <Section icon={Clock} title="Your Trail" count={trail.length}>
          {trail.length === 0 ? (
            <div className="px-3 py-2 text-[10px] text-zinc-700 font-mono italic">
              No trail yet — start exploring
            </div>
          ) : (
            <div className="space-y-0.5">
              {trail.map((entry, i) => (
                <button
                  key={entry.id}
                  onClick={() => onNavigate?.(entry.id, entry.path)}
                  className={`w-full text-left px-3 py-1.5 rounded flex items-center gap-2 group transition-colors ${
                    entry.id === currentId
                      ? "bg-white/[0.06] text-zinc-200"
                      : "hover:bg-white/[0.03] text-zinc-400"
                  }`}
                >
                  <span className="w-1 h-1 rounded-full bg-zinc-600 shrink-0" />
                  <span className="text-[11px] font-mono truncate flex-1 group-hover:text-zinc-200 transition-colors">
                    {entry.label}
                  </span>
                  <span className="text-[8px] font-mono text-zinc-700 shrink-0">
                    {timeAgo(entry.timestamp)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Section>

        {/* ── Discover (Backlinks) ──────────────────────────── */}
        <Section icon={Compass} title="Discover" count={backlinks.length}>
          {backlinks.length === 0 ? (
            <div className="px-3 py-2 text-[10px] text-zinc-700 font-mono italic">
              No connections found
            </div>
          ) : (
            <div className="space-y-0.5">
              {backlinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => onNavigate?.(link.id)}
                  className="w-full text-left px-3 py-1.5 rounded flex items-center gap-2 hover:bg-white/[0.03] transition-colors group"
                >
                  <Circle size={6} className="text-zinc-600 shrink-0" />
                  <span className="text-[11px] font-mono text-zinc-400 group-hover:text-zinc-200 truncate flex-1 transition-colors">
                    {link.label}
                  </span>
                  <span className="text-[9px] font-mono text-zinc-700 shrink-0 tabular-nums">
                    {link.count}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Section>

        {/* ── Most Explored ─────────────────────────────────── */}
        <Section icon={TrendingUp} title="Most Explored" count={topNodes.length} defaultOpen={false}>
          {topNodes.length === 0 ? (
            <div className="px-3 py-2 text-[10px] text-zinc-700 font-mono italic">
              No data yet
            </div>
          ) : (
            <div className="space-y-0.5">
              {topNodes.map((node, i) => (
                <button
                  key={node.id}
                  onClick={() => onNavigate?.(node.id)}
                  className="w-full text-left px-3 py-1.5 rounded flex items-center gap-2 hover:bg-white/[0.03] transition-colors group"
                >
                  <span className="text-[9px] font-mono text-zinc-700 w-3 text-right shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-400 group-hover:text-zinc-200 truncate flex-1 transition-colors">
                    {node.label}
                  </span>
                  <span className="text-[9px] font-mono text-zinc-700 shrink-0 tabular-nums">
                    {node.visits}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Footer stats */}
      <div className="px-4 py-3 border-t border-white/[0.04] flex items-center gap-3">
        <div className="flex items-baseline gap-1">
          <span className="text-[10px] font-bold text-zinc-400 tabular-nums">{trail.length}</span>
          <span className="text-[7px] font-mono uppercase tracking-widest text-zinc-700">Trail</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-[10px] font-bold text-zinc-400 tabular-nums">{backlinks.length}</span>
          <span className="text-[7px] font-mono uppercase tracking-widest text-zinc-700">Links</span>
        </div>
      </div>
    </div>
  );
}
