/**
 * IntelligencePanel — Natural language query interface for Code Nexus.
 *
 * Ask questions about your codebase in plain English.
 * The AI interprets, the graph executes, results appear inline.
 */

import { useState, useRef } from "react";
import { Sparkles, Send, Loader2 } from "lucide-react";
import type { CodeGraphStore, QueryResult, GraphNode } from "../lib/graph-store";
import { askCodeNexus, type BridgeResult } from "../lib/intelligence-bridge";

interface IntelligencePanelProps {
  store: CodeGraphStore;
  onSelectNode?: (node: GraphNode) => void;
}

export function IntelligencePanel({ store, onSelectNode }: IntelligencePanelProps) {
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BridgeResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAsk = async () => {
    const q = question.trim();
    if (!q || isLoading) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await askCodeNexus(store, q);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  const suggestions = [
    "What are the most connected entities?",
    "What depends on the main class?",
    "Show all interfaces",
    "Trace the call chain from the entry point",
  ];

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Input */}
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <Sparkles size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/60" />
          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your codebase…"
            disabled={isLoading}
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors disabled:opacity-50"
            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
          />
        </div>
        <button
          onClick={handleAsk}
          disabled={isLoading || !question.trim()}
          className="h-9 w-9 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center transition-colors disabled:opacity-30"
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </div>

      {/* Suggestions (when no result) */}
      {!result && !error && !isLoading && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => { setQuestion(s); }}
              className="px-2.5 py-1 rounded-md bg-muted/50 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-destructive text-center py-2" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
          {error}
        </p>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-3 animate-fade-in">
          {/* Interpretation */}
          <div className="px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-xs text-foreground leading-relaxed" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              {result.response.interpretation}
            </p>
          </div>

          {/* Operation results */}
          {result.results.map((r, i) => (
            <div key={i} className="space-y-1">
              <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {r.label}
              </h4>
              <ResultView data={r.data} onSelectNode={onSelectNode} store={store} />
            </div>
          ))}

          {/* Insight */}
          {result.response.insight && (
            <p className="text-[11px] text-muted-foreground italic leading-relaxed px-1" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              💡 {result.response.insight}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Result renderer ─────────────────────────────────────────────────────────

function ResultView({ data, onSelectNode, store }: {
  data: QueryResult | GraphNode[] | Record<string, number>;
  onSelectNode?: (node: GraphNode) => void;
  store: CodeGraphStore;
}) {
  // GraphNode[]
  if (Array.isArray(data)) {
    if (data.length === 0) return <EmptyResult />;
    return (
      <div className="flex flex-wrap gap-1">
        {data.slice(0, 20).map((node: GraphNode) => (
          <button
            key={node.id}
            onClick={() => onSelectNode?.(node)}
            className="px-2 py-1 rounded bg-card border border-border text-xs font-mono text-foreground hover:border-primary/30 transition-colors"
          >
            <span className="text-muted-foreground mr-1">{node.type}</span>
            {node.name}
          </button>
        ))}
      </div>
    );
  }

  // QueryResult (has columns + rows)
  if ("columns" in data && "rows" in data) {
    const qr = data as QueryResult;
    if (qr.rows.length === 0) return <EmptyResult />;
    return (
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/30">
              {qr.columns.map((col) => (
                <th key={col} className="px-3 py-1.5 text-left font-medium text-muted-foreground uppercase tracking-wider" style={{ fontSize: "10px" }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {qr.rows.slice(0, 20).map((row, i) => (
              <tr key={i} className="border-t border-border hover:bg-muted/20 transition-colors">
                {qr.columns.map((col) => {
                  const val = String(row[col] ?? "");
                  const node = store.nodes.get(val) ?? store.search(val, 1)[0];
                  return (
                    <td key={col} className="px-3 py-1.5 font-mono text-foreground">
                      {node && onSelectNode ? (
                        <button onClick={() => onSelectNode(node)} className="text-primary hover:underline">{val}</button>
                      ) : val}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Stats (Record<string, number>)
  const stats = data as Record<string, number>;
  return (
    <div className="grid grid-cols-3 gap-2">
      {Object.entries(stats).map(([k, v]) => (
        <div key={k} className="px-3 py-2 rounded-lg bg-card border border-border text-center">
          <div className="text-sm font-mono text-foreground">{v}</div>
          <div className="text-[10px] text-muted-foreground">{k}</div>
        </div>
      ))}
    </div>
  );
}

function EmptyResult() {
  return (
    <p className="text-xs text-muted-foreground text-center py-3" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      No results found.
    </p>
  );
}
