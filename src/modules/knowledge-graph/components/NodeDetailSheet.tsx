/**
 * NodeDetailSheet — Slide-over panel for inspecting a selected graph node.
 * Renders as a right sidebar on desktop, bottom sheet on mobile.
 */

import { X, ExternalLink, Copy, Check } from "lucide-react";
import { useState } from "react";
import { colorForType } from "../hooks/useGraphData";
import { useIsMobile } from "@/hooks/use-mobile";

interface NodeAttrs {
  label?: string;
  nodeType?: string;
  color?: string;
  uorCid?: string;
  rdfType?: string;
  stratumLevel?: string;
  totalStratum?: number;
  qualityScore?: number;
  properties?: Record<string, unknown>;
  createdAt?: number;
  [key: string]: unknown;
}

interface Props {
  nodeId: string;
  attrs: NodeAttrs;
  edges: Array<{ source: string; target: string; predicate: string }>;
  onClose: () => void;
}

export function NodeDetailSheet({ nodeId, attrs, edges, onClose }: Props) {
  const isMobile = useIsMobile();
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(nodeId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const nt = (attrs.nodeType || "entity").toLowerCase();

  const containerClass = isMobile
    ? "fixed inset-x-0 bottom-0 z-50 max-h-[60vh] bg-card/95 backdrop-blur-xl border-t border-border/50 rounded-t-2xl shadow-2xl overflow-auto animate-in slide-in-from-bottom duration-300"
    : "absolute right-0 top-0 bottom-0 w-[320px] z-50 bg-card/95 backdrop-blur-xl border-l border-border/50 shadow-2xl overflow-auto animate-in slide-in-from-right duration-300";

  return (
    <div className={containerClass}>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ backgroundColor: colorForType(nt) }}
          >
            {nt.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">
              {attrs.label || nodeId.slice(-16)}
            </h3>
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
              {nt}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted/60 transition-colors shrink-0"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* UOR Address */}
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
            UOR Address
          </p>
          <div className="flex items-center gap-1.5">
            <code className="text-[10px] font-mono text-foreground/80 bg-muted/40 px-2 py-1 rounded flex-1 truncate">
              {nodeId}
            </code>
            <button
              onClick={copyAddress}
              className="p-1 rounded hover:bg-muted/60 transition-colors shrink-0"
              title="Copy"
            >
              {copied
                ? <Check className="w-3 h-3 text-emerald-400" />
                : <Copy className="w-3 h-3 text-muted-foreground" />
              }
            </button>
          </div>
        </div>

        {/* Attributes */}
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
            Attributes
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
            {attrs.rdfType && (
              <>
                <span className="text-muted-foreground">RDF Type</span>
                <span className="text-foreground font-mono truncate">{attrs.rdfType}</span>
              </>
            )}
            {attrs.stratumLevel && (
              <>
                <span className="text-muted-foreground">Stratum</span>
                <span className="text-foreground">{attrs.stratumLevel}</span>
              </>
            )}
            {attrs.totalStratum != null && (
              <>
                <span className="text-muted-foreground">Total Stratum</span>
                <span className="text-foreground">{attrs.totalStratum}</span>
              </>
            )}
            {attrs.qualityScore != null && (
              <>
                <span className="text-muted-foreground">Quality</span>
                <span className="text-foreground">{(attrs.qualityScore * 100).toFixed(1)}%</span>
              </>
            )}
            {attrs.uorCid && (
              <>
                <span className="text-muted-foreground">CID</span>
                <span className="text-foreground font-mono truncate text-[10px]">{attrs.uorCid}</span>
              </>
            )}
            {attrs.createdAt && (
              <>
                <span className="text-muted-foreground">Created</span>
                <span className="text-foreground">{new Date(attrs.createdAt).toLocaleDateString()}</span>
              </>
            )}
          </div>
        </div>

        {/* Connected Edges */}
        {edges.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              Connections ({edges.length})
            </p>
            <div className="space-y-1 max-h-48 overflow-auto">
              {edges.map((e, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 text-[10px] font-mono bg-muted/30 px-2 py-1 rounded"
                >
                  <span className="text-primary/80 truncate max-w-[80px]">
                    {e.source === nodeId ? "→" : "←"}
                  </span>
                  <span className="text-amber-400/80 shrink-0">{e.predicate}</span>
                  <span className="text-foreground/60 truncate">
                    {(e.source === nodeId ? e.target : e.source).split("/").pop()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Properties */}
        {attrs.properties && Object.keys(attrs.properties).length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              Properties
            </p>
            <pre className="text-[10px] font-mono text-foreground/70 bg-muted/30 p-2 rounded-lg overflow-auto max-h-32">
              {JSON.stringify(attrs.properties, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
