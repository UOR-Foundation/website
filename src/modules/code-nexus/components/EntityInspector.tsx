/**
 * EntityInspector — Side panel showing UOR identity and relationships
 * for a selected graph node.
 */

import { X, ArrowDownRight, ArrowUpRight, Hash, FileCode, Layers } from "lucide-react";
import type { CodeGraphStore, GraphNode, GraphEdge } from "../lib/graph-store";

interface EntityInspectorProps {
  node: GraphNode;
  store: CodeGraphStore;
  onClose: () => void;
}

export function EntityInspector({ node, store, onClose }: EntityInspectorProps) {
  const outgoing = store.outgoing.get(node.id) ?? [];
  const incoming = store.incoming.get(node.id) ?? [];

  const shortName = (id: string) => {
    const parts = id.split("::");
    return parts[parts.length - 1] ?? id;
  };

  return (
    <div className="w-full max-w-sm bg-card border border-border rounded-xl p-4 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-mono">
              {node.type}
            </span>
            <h3 className="text-sm font-medium text-foreground truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {node.name}
            </h3>
          </div>
          {node.filePath && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <FileCode size={10} />
              <span className="truncate font-mono">{node.filePath}:{node.line}</span>
            </div>
          )}
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-0.5">
          <X size={14} />
        </button>
      </div>

      {/* UOR Identity */}
      <div className="space-y-1.5">
        <h4 className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          UOR Identity
        </h4>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[10px]">
            <Hash size={10} className="text-primary shrink-0" />
            <span className="text-muted-foreground font-mono truncate" title={node.cid}>
              CID: {node.cid.slice(0, 28)}…
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px]">
            <Layers size={10} className="text-primary shrink-0" />
            <span className="text-muted-foreground font-mono truncate" title={node.iri}>
              IRI: {node.iri.split(":").slice(-2).join(":")}
            </span>
          </div>
        </div>
      </div>

      {/* Outgoing relationships */}
      {outgoing.length > 0 && (
        <RelationList
          title="Outgoing"
          icon={ArrowDownRight}
          edges={outgoing}
          getLabel={(e) => `${e.type} → ${shortName(e.target)}`}
        />
      )}

      {/* Incoming relationships */}
      {incoming.length > 0 && (
        <RelationList
          title="Incoming"
          icon={ArrowUpRight}
          edges={incoming}
          getLabel={(e) => `${shortName(e.source)} → ${e.type}`}
        />
      )}

      {outgoing.length === 0 && incoming.length === 0 && (
        <p className="text-[11px] text-muted-foreground text-center py-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          No relationships found.
        </p>
      )}
    </div>
  );
}

function RelationList({
  title,
  icon: Icon,
  edges,
  getLabel,
}: {
  title: string;
  icon: typeof ArrowDownRight;
  edges: GraphEdge[];
  getLabel: (e: GraphEdge) => string;
}) {
  const MAX = 8;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Icon size={10} className="text-muted-foreground" />
        <h4 className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {title} ({edges.length})
        </h4>
      </div>
      <div className="space-y-0.5 max-h-28 overflow-y-auto">
        {edges.slice(0, MAX).map((e, i) => (
          <div key={i} className="text-[10px] font-mono text-foreground/70 py-0.5 px-2 rounded bg-muted/20">
            {getLabel(e)}
          </div>
        ))}
        {edges.length > MAX && (
          <span className="text-[10px] text-muted-foreground pl-2">+{edges.length - MAX} more</span>
        )}
      </div>
    </div>
  );
}
