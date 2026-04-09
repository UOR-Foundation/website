/**
 * BlueprintPanel — Displays the decomposed UOR blueprint for a KG node.
 * Shows attributes, edges, UOR identity, and space definition.
 * Supports export to .json and import (drag-and-drop) to materialize nodes.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Boxes, ArrowRight, Tag, Globe, Hash, Loader2, AlertCircle,
  Download, Upload, CheckCircle2,
} from "lucide-react";
import {
  decomposeToBlueprint,
  serializeBlueprint,
  deserializeBlueprint,
  materializeFromBlueprint,
} from "@/modules/knowledge-graph/blueprint";
import { localGraphStore } from "@/modules/knowledge-graph/local-store";
import type { GroundObjectBlueprint, BlueprintAttribute } from "@/modules/knowledge-graph/blueprint";
import { toast } from "sonner";

interface Props {
  uorAddress: string;
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function truncateAddr(addr: string): string {
  if (addr.length <= 24) return addr;
  return `${addr.slice(0, 12)}…${addr.slice(-8)}`;
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v).slice(0, 100);
  return String(v).slice(0, 200);
}

function downloadJson(data: string, filename: string) {
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ── Sub-components ───────────────────────────────────────────────────────── */

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

/* ── Import drop-zone ─────────────────────────────────────────────────────── */

function ImportDropZone({ onImported }: { onImported: () => void }) {
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ label: string; address: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".json")) {
      toast.error("Only .json blueprint files are supported");
      return;
    }
    setImporting(true);
    try {
      const text = await file.text();
      const ground = deserializeBlueprint(text);
      const { node, edges } = await materializeFromBlueprint(ground.blueprint);

      // Persist to KG
      await localGraphStore.putNode(node);
      for (const edge of edges) {
        await localGraphStore.putEdge(edge);
      }

      setResult({ label: node.label, address: truncateAddr(node.uorAddress) });
      toast.success(`Materialized node "${node.label}"`);
      onImported();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Import failed";
      toast.error(msg);
    } finally {
      setImporting(false);
    }
  }, [onImported]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="mt-4 space-y-2">
      <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">
        Import Blueprint
      </span>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed
          py-6 px-4 cursor-pointer transition-colors
          ${dragging
            ? "border-primary/60 bg-primary/5"
            : "border-border/30 bg-muted/10 hover:border-primary/30 hover:bg-muted/20"}
        `}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />

        {importing ? (
          <Loader2 className="w-5 h-5 animate-spin text-primary/60" />
        ) : result ? (
          <>
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <span className="text-[11px] text-foreground/70">{result.label}</span>
            <code className="text-[9px] font-mono text-muted-foreground/50">{result.address}</code>
          </>
        ) : (
          <>
            <Upload className="w-5 h-5 text-muted-foreground/40" />
            <span className="text-[11px] text-muted-foreground/50">
              Drop a <code className="font-mono">.json</code> blueprint or click to browse
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Main panel ───────────────────────────────────────────────────────────── */

export default function BlueprintPanel({ uorAddress }: Props) {
  const [blueprint, setBlueprint] = useState<GroundObjectBlueprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    decomposeToBlueprint(uorAddress)
      .then(setBlueprint)
      .catch((err) => setError(err?.message || "Blueprint unavailable"))
      .finally(() => setLoading(false));
  }, [uorAddress]);

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

  /* Export handler */
  const handleExport = useCallback(() => {
    if (!blueprint) return;
    const json = serializeBlueprint(blueprint);
    const safeName = blueprint.blueprint.spaceDefinition.kind.replace(/[^a-z0-9]/gi, "-");
    downloadJson(json, `blueprint-${safeName}-${Date.now()}.json`);
    toast.success("Blueprint exported");
  }, [blueprint]);

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
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground/40 text-[11px] py-3">
          <AlertCircle className="w-3.5 h-3.5" />
          {error || "No blueprint available"}
        </div>
        <ImportDropZone onImported={load} />
      </div>
    );
  }

  const bp = blueprint.blueprint;
  const literals = bp.attributes.filter((a) => a.valueType === "literal");
  const references = bp.attributes.filter((a) => a.valueType === "reference");

  return (
    <div className="border-t border-border/20 mt-4 pt-4 space-y-4">
      {/* Header + Export */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Boxes className="w-3.5 h-3.5 text-primary/60" />
          <span className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider">
            Object Blueprint
          </span>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium
                     bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <Download className="w-3 h-3" />
          Export .json
        </button>
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

      {/* Import drop zone */}
      <ImportDropZone onImported={load} />
    </div>
  );
}
