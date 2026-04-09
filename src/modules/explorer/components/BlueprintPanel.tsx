/**
 * BlueprintPanel — Displays the decomposed UOR blueprint for a KG node.
 * Shows attributes, edges, UOR identity, and space definition.
 */

import { useEffect, useState } from "react";
import { Boxes, ArrowRight, Tag, Globe, Hash, Loader2, AlertCircle } from "lucide-react";
import { decomposeToBlueprint } from "@/modules/knowledge-graph/blueprint";
import type { GroundObjectBlueprint, BlueprintAttribute } from "@/modules/knowledge-graph/blueprint";

interface Props {
  uorAddress: string;
}

function AttributeRow({ attr }: { attr: BlueprintAttribute }) {
  const isRef = attr.valueType === "reference";
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/10 last:border-0">
      <div className="flex items-center gap-1.5 min-w-0 flex-shrink-0">
        {isRef ? (
          <ArrowRight className="w-3 h-3 text-primary/50 flex-shrink-0" />
        ) : (
          <Tag className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
        )}
        <code className="text-[11px] font-mono text-foreground/70 truncate max-w-[160px]">
          {attr.predicate.replace("schema:", "")}
        </code>
      </div>
      <div className="flex-1 min-w-0">
        {isRef ? (
          <code className="text-[10px] font-mono text-primary/60 break-all">
            → {attr.targetAddress ? truncateAddr(attr.targetAddress) : "—"}
          </code>
        ) : (
          <span className="text-[11px] text-foreground/60 break-all">
            {formatValue(attr.value)}
          </span>
        )}
      </div>
    </div>
  );
}

function truncateAddr(addr: string): string {
  if (addr.length <= 24) return addr;
  return `${addr.slice(0, 12)}…${addr.slice(-8)}`;
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v).slice(0, 100);
  return String(v).slice(0, 200);
}

export default function BlueprintPanel({ uorAddress }: Props) {
  const [blueprint, setBlueprint] = useState<GroundObjectBlueprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    decomposeToBlueprint(uorAddress)
      .then((bp) => { if (!cancelled) setBlueprint(bp); })
      .catch((err) => { if (!cancelled) setError(err?.message || "Blueprint unavailable"); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [uorAddress]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground/50 text-[11px] py-4">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Decomposing blueprint…
      </div>
    );
  }

  if (error || !blueprint) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground/40 text-[11px] py-3">
        <AlertCircle className="w-3.5 h-3.5" />
        {error || "No blueprint available"}
      </div>
    );
  }

  const bp = blueprint.blueprint;
  const literals = bp.attributes.filter((a) => a.valueType === "literal");
  const references = bp.attributes.filter((a) => a.valueType === "reference");

  return (
    <div className="border-t border-border/20 mt-4 pt-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Boxes className="w-3.5 h-3.5 text-primary/60" />
        <span className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider">
          Object Blueprint
        </span>
      </div>

      {/* Space Definition */}
      <div className="bg-muted/20 rounded-lg p-3 space-y-1.5">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-muted-foreground/50">Type</span>
          <code className="font-mono text-foreground/70 bg-muted/40 px-1.5 py-0.5 rounded text-[10px]">
            {bp.spaceDefinition.rdfType}
          </code>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-muted-foreground/50">Kind</span>
          <span className="text-foreground/60">{bp.spaceDefinition.kind}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-muted-foreground/50">Domain</span>
          <span className="text-foreground/60">{bp.spaceDefinition.localDomain}</span>
        </div>
      </div>

      {/* UOR Identity */}
      <div className="bg-muted/20 rounded-lg p-3 space-y-1.5">
        <div className="flex items-center gap-1.5 mb-1">
          <Hash className="w-3 h-3 text-primary/50" />
          <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">Identity</span>
        </div>
        {blueprint.uorIpv6 && (
          <div className="flex items-center gap-2 text-[11px]">
            <Globe className="w-3 h-3 text-primary/40 flex-shrink-0" />
            <code className="font-mono text-[10px] text-primary/60 break-all">{blueprint.uorIpv6}</code>
          </div>
        )}
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-muted-foreground/50 flex-shrink-0">CID</span>
          <code className="font-mono text-[10px] text-foreground/50 break-all truncate">{truncateAddr(blueprint.uorCid)}</code>
        </div>
        {blueprint.uorGlyph && (
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-muted-foreground/50 flex-shrink-0">Glyph</span>
            <code className="font-mono text-[10px] text-foreground/50">{blueprint.uorGlyph.slice(0, 24)}</code>
          </div>
        )}
      </div>

      {/* Attributes (Literals) */}
      {literals.length > 0 && (
        <div>
          <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">
            Properties ({literals.length})
          </span>
          <div className="mt-1.5 bg-muted/10 rounded-lg px-3 py-1">
            {literals.map((attr, i) => (
              <AttributeRow key={i} attr={attr} />
            ))}
          </div>
        </div>
      )}

      {/* Edges (References) */}
      {references.length > 0 && (
        <div>
          <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">
            Edges ({references.length})
          </span>
          <div className="mt-1.5 bg-muted/10 rounded-lg px-3 py-1">
            {references.map((attr, i) => (
              <AttributeRow key={i} attr={attr} />
            ))}
          </div>
        </div>
      )}

      {/* Composition Rules */}
      {bp.compositionRules.length > 0 && (
        <div className="text-[10px] text-muted-foreground/40">
          {bp.compositionRules.length} composition rule{bp.compositionRules.length > 1 ? "s" : ""}
          {bp.compositionRules.map((r, i) => (
            <span key={i} className="ml-1 font-mono text-foreground/40">
              {r.parentPredicate.replace("schema:", "")}({r.decomposition})
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
