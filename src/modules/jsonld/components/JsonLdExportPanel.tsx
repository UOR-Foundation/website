import { useState, useCallback } from "react";
import { emitGraph } from "@/modules/jsonld/emitter";
import { validateJsonLd } from "@/modules/jsonld/validator";
import type { JsonLdDocument } from "@/modules/jsonld/emitter";
import type { ValidationResult } from "@/modules/jsonld/validator";
import type { UORRing } from "@/modules/ring-core/ring";

interface ExportState {
  doc: JsonLdDocument | null;
  validation: ValidationResult | null;
  generating: boolean;
}

export function JsonLdExportPanel({ ring }: { ring: UORRing }) {
  const [state, setState] = useState<ExportState>({
    doc: null, validation: null, generating: false,
  });
  const [showJson, setShowJson] = useState(false);

  const generate = useCallback(() => {
    setState({ doc: null, validation: null, generating: true });
    // Defer to let UI update
    setTimeout(() => {
      const doc = emitGraph(ring);
      const validation = validateJsonLd(doc);
      setState({ doc, validation, generating: false });
      setShowJson(true);
    }, 50);
  }, [ring]);

  const download = useCallback(() => {
    if (!state.doc) return;
    const json = JSON.stringify(state.doc, null, 2);
    const blob = new Blob([json], { type: "application/ld+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uor-Q${ring.quantum}-graph.jsonld`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state.doc, ring.quantum]);

  const datumCount = state.validation?.typeCounts["schema:Datum"] ?? 0;
  const derivationCount = state.validation?.typeCounts["derivation:Record"] ?? 0;

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="text-sm font-semibold mb-3">JSON-LD Export (W3C 1.1)</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Emit a complete JSON-LD document for Q{ring.quantum} — loadable by any standard
        triplestore (Oxigraph, Jena, GraphDB).
      </p>

      <div className="flex gap-2 mb-4">
        <button
          onClick={generate}
          disabled={state.generating}
          className="btn-primary text-sm"
        >
          {state.generating ? "Generating…" : "Export JSON-LD"}
        </button>
        {state.doc && (
          <button onClick={download} className="btn-primary text-sm">
            Download .jsonld
          </button>
        )}
      </div>

      {state.validation && (
        <div className="space-y-3">
          {/* Validation status */}
          <div className="flex items-center gap-3">
            <span className={`text-sm font-bold ${state.validation.valid ? "text-green-600" : "text-destructive"}`}>
              {state.validation.valid ? "✓ VALID JSON-LD" : "✗ VALIDATION ERRORS"}
            </span>
            <span className="text-xs text-muted-foreground">
              {state.validation.nodeCount} nodes · {datumCount} datums · {derivationCount} derivations
            </span>
          </div>

          {state.validation.errors.length > 0 && (
            <div className="p-3 rounded bg-destructive/10 text-destructive text-xs font-mono">
              {state.validation.errors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          )}

          {state.validation.warnings.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                {state.validation.warnings.length} warning(s)
              </summary>
              <div className="mt-1 p-2 rounded bg-muted text-muted-foreground font-mono">
                {state.validation.warnings.map((w, i) => <p key={i}>{w}</p>)}
              </div>
            </details>
          )}

          {/* JSON-LD preview */}
          {state.doc && (
            <div>
              <button
                onClick={() => setShowJson(!showJson)}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer mb-2"
              >
                {showJson ? "▾ Hide" : "▸ Show"} JSON-LD ({(JSON.stringify(state.doc).length / 1024).toFixed(1)} KB)
              </button>
              {showJson && (
                <pre className="p-3 rounded bg-muted text-muted-foreground overflow-auto max-h-80 text-[10px] leading-tight font-mono">
                  {JSON.stringify(state.doc, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
