import { useState, useCallback, useEffect } from "react";
import { buildIndex, resolveEntity, findSimilar } from "@/modules/semantic-index";
import type { SemanticIndex, EntityResolution, SimilarEntry } from "@/modules/semantic-index";
import { getDatum } from "@/modules/kg-store/store";
import type { EpistemicGrade } from "@/types/uor";

const GRADE_STYLES: Record<EpistemicGrade, string> = {
  A: "bg-green-500/20 text-green-400 border-green-500/30",
  B: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  C: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  D: "bg-red-500/20 text-red-400 border-red-500/30",
};

export function EntitySearch() {
  const [index, setIndex] = useState<SemanticIndex | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [resolution, setResolution] = useState<EntityResolution | null>(null);
  const [datumDetail, setDatumDetail] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Build index on mount
  useEffect(() => {
    setLoading(true);
    buildIndex(0)
      .then(setIndex)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const search = useCallback(async () => {
    if (!index || !query.trim()) return;
    setError(null);
    setDatumDetail(null);

    const res = resolveEntity(query.trim(), index);
    setResolution(res);

    // If we got a match, fetch full datum detail
    if (res.iri) {
      try {
        const datum = await getDatum(res.iri);
        if (datum) setDatumDetail(datum as Record<string, unknown>);
      } catch (e) {
        // Non-critical — just skip detail
      }
    }
  }, [index, query]);

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="text-sm font-semibold mb-1">Entity Search</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Resolve text, value, hex, glyph, or IRI to a canonical entity.
        {index && (
          <span className="ml-1 text-primary">
            · {index.entries.length} entities indexed
          </span>
        )}
      </p>

      {loading && (
        <p className="text-xs text-muted-foreground font-mono mb-3">Building index…</p>
      )}

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="42, 0x2A, ⠪, or IRI…"
          disabled={!index}
          className="flex-1 px-4 py-2 rounded-lg border border-border bg-card text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
        />
        <button onClick={search} disabled={!index} className="btn-primary text-sm">
          Resolve
        </button>
      </div>

      {error && (
        <p className="text-xs text-destructive font-mono mb-3">{error}</p>
      )}

      {resolution && (
        <div className="space-y-4">
          {/* Match result */}
          <div className="flex items-start gap-3 p-3 rounded bg-muted/50">
            <span
              className={`inline-flex items-center justify-center w-7 h-7 rounded border text-[10px] font-bold flex-shrink-0 ${
                GRADE_STYLES[resolution.grade]
              }`}
            >
              {resolution.grade}
            </span>
            <div className="flex-1 min-w-0">
              {resolution.iri ? (
                <>
                  <p className="text-xs font-mono text-foreground truncate">{resolution.iri}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {resolution.matchType === "exact" ? "Exact match" : "Fuzzy match"} ·
                    confidence {(resolution.confidence * 100).toFixed(1)}%
                    {resolution.entry && ` · value=${resolution.entry.value} · glyph="${resolution.entry.glyph}" · stratum=${resolution.entry.totalStratum}`}
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">No match found</p>
              )}
            </div>
          </div>

          {/* Full datum detail */}
          {datumDetail && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Datum Record</p>
              <pre className="p-3 rounded bg-muted text-muted-foreground overflow-auto max-h-48 text-[10px] leading-tight font-mono">
                {JSON.stringify(datumDetail, null, 2)}
              </pre>
            </div>
          )}

          {/* Similar entities */}
          {resolution.similar.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">
                Similar Entities (by fidelity)
              </p>
              <div className="space-y-1">
                {resolution.similar.map((s) => (
                  <div
                    key={s.entry.iri}
                    className="flex items-center gap-2 p-2 rounded bg-muted/30 text-xs"
                  >
                    <div className="w-16 h-2.5 bg-muted rounded-sm overflow-hidden flex-shrink-0">
                      <div
                        className="h-full bg-primary/60 rounded-sm"
                        style={{ width: `${s.fidelity * 100}%` }}
                      />
                    </div>
                    <span className="font-mono text-foreground w-12 text-right flex-shrink-0">
                      {(s.fidelity * 100).toFixed(0)}%
                    </span>
                    <span className="font-mono text-muted-foreground">
                      val={s.entry.value}
                    </span>
                    <span className="font-mono text-muted-foreground truncate">
                      {s.entry.iri}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
