/**
 * GraphQueryPanel — Interactive query interface for the Code Nexus graph.
 *
 * Pre-built queries + free-text entity search with results table.
 */

import { useState, useMemo } from "react";
import { Search, GitFork, ArrowDownRight, ArrowUpRight, Share2 } from "lucide-react";
import type { CodeGraphStore, QueryResult, GraphNode } from "../lib/graph-store";

interface GraphQueryPanelProps {
  store: CodeGraphStore;
}

type QueryType = "dependencies" | "impact" | "callChain" | "cluster";

const QUERY_LABELS: Record<QueryType, { label: string; icon: typeof GitFork; desc: string }> = {
  dependencies: { label: "Dependencies", icon: ArrowDownRight, desc: "What does this entity depend on?" },
  impact:       { label: "Impact",       icon: ArrowUpRight,  desc: "What depends on this entity?" },
  callChain:    { label: "Call Chain",   icon: GitFork,       desc: "Trace the full invocation chain" },
  cluster:      { label: "Cluster",      icon: Share2,        desc: "All connected entities (BFS)" },
};

export function GraphQueryPanel({ store }: GraphQueryPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<GraphNode | null>(null);
  const [activeQuery, setActiveQuery] = useState<QueryType>("dependencies");
  const [result, setResult] = useState<QueryResult | null>(null);

  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return store.search(searchTerm, 10);
  }, [searchTerm, store]);

  const handleSelectEntity = (node: GraphNode) => {
    setSelectedEntity(node);
    setSearchTerm("");
    runQuery(node.id, activeQuery);
  };

  const handleQueryChange = (qt: QueryType) => {
    setActiveQuery(qt);
    if (selectedEntity) runQuery(selectedEntity.id, qt);
  };

  const runQuery = (entityId: string, qt: QueryType) => {
    switch (qt) {
      case "dependencies": setResult(store.getDependencies(entityId)); break;
      case "impact":       setResult(store.getImpact(entityId));       break;
      case "callChain":    setResult(store.getCallChain(entityId));    break;
      case "cluster":      setResult(store.getCluster(entityId));      break;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search entities…"
          className="w-full h-9 pl-9 pr-3 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
          style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
        />
        {/* Search dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
            {searchResults.map((node) => (
              <button
                key={node.id}
                onClick={() => handleSelectEntity(node)}
                className="w-full px-3 py-2 text-left text-xs hover:bg-muted/50 flex items-center justify-between transition-colors"
              >
                <span className="text-foreground font-mono truncate">{node.name}</span>
                <span className="text-muted-foreground shrink-0 ml-2">{node.type}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected entity + query tabs */}
      {selectedEntity && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-mono">
              {selectedEntity.type}
            </span>
            <span className="text-sm text-foreground font-mono">{selectedEntity.name}</span>
            <span className="text-[10px] text-muted-foreground ml-auto font-mono" title={selectedEntity.cid}>
              {selectedEntity.cid.slice(0, 16)}…
            </span>
          </div>

          {/* Query tabs */}
          <div className="flex gap-1 flex-wrap">
            {(Object.keys(QUERY_LABELS) as QueryType[]).map((qt) => {
              const { label, icon: Icon } = QUERY_LABELS[qt];
              return (
                <button
                  key={qt}
                  onClick={() => handleQueryChange(qt)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${
                    activeQuery === qt
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                  style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
                >
                  <Icon size={12} />
                  {label}
                </button>
              );
            })}
          </div>

          {/* Results table */}
          {result && result.rows.length > 0 ? (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/30">
                    {result.columns.map((col) => (
                      <th
                        key={col}
                        className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider"
                        style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "10px" }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.slice(0, 25).map((row, i) => (
                    <tr key={i} className="border-t border-border hover:bg-muted/20 transition-colors">
                      {result.columns.map((col) => (
                        <td key={col} className="px-3 py-1.5 font-mono text-foreground">
                          {String(row[col] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.rows.length > 25 && (
                <div className="px-3 py-1.5 text-[10px] text-muted-foreground bg-muted/20">
                  Showing 25 of {result.rows.length} results
                </div>
              )}
            </div>
          ) : result ? (
            <p className="text-xs text-muted-foreground text-center py-4" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              No results for this query.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
