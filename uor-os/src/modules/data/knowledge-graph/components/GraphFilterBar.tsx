/**
 * GraphFilterBar — Node-type toggles + search for the graph explorer.
 */

import { Search, Filter, RefreshCw } from "lucide-react";
import { colorForType } from "../hooks/useGraphData";

interface Props {
  nodeTypes: string[];
  hiddenTypes: Set<string>;
  onToggleType: (type: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  nodeCount: number;
  edgeCount: number;
  loading: boolean;
}

export function GraphFilterBar({
  nodeTypes, hiddenTypes, onToggleType,
  searchQuery, onSearchChange,
  onRefresh, nodeCount, edgeCount, loading,
}: Props) {
  return (
    <div className="flex flex-col gap-3 p-3 bg-card/80 backdrop-blur-md border border-border/50 rounded-xl shadow-lg">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search nodes…"
          className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted/50 border border-border/30 rounded-lg
            text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono">
        <span>{nodeCount.toLocaleString()} nodes</span>
        <span>·</span>
        <span>{edgeCount.toLocaleString()} edges</span>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="ml-auto p-1 rounded hover:bg-muted/60 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Type filters */}
      {nodeTypes.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            <Filter className="w-3 h-3" />
            Node Types
          </div>
          <div className="flex flex-wrap gap-1">
            {nodeTypes.map((t) => {
              const hidden = hiddenTypes.has(t);
              return (
                <button
                  key={t}
                  onClick={() => onToggleType(t)}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium
                    border transition-all duration-150
                    ${hidden
                      ? "opacity-40 border-border/30 bg-transparent text-muted-foreground"
                      : "border-border/50 bg-muted/40 text-foreground"
                    }
                  `}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: colorForType(t) }}
                  />
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
