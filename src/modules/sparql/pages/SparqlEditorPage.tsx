import { useState, useCallback } from "react";
import Layout from "@/modules/core/components/Layout";
import { executeSparql } from "../executor";
import type { SparqlResult, SparqlResultRow } from "../executor";
import type { EpistemicGrade } from "@/types/uor";

// ── Example queries ─────────────────────────────────────────────────────────

const EXAMPLES: { label: string; query: string }[] = [
  {
    label: "All triples (first 50)",
    query: `SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 50`,
  },
  {
    label: "All datums with rdf:type",
    query: `SELECT ?s ?p ?o WHERE { ?s rdf:type ?o } LIMIT 50`,
  },
  {
    label: "Find relations of a specific IRI",
    query: `SELECT ?s ?p ?o WHERE { <https://uor.foundation/u/U282A> ?p ?o } LIMIT 50`,
  },
  {
    label: "All triples with schema:stratum predicate",
    query: `SELECT ?s ?p ?o WHERE { ?s schema:stratum ?o } LIMIT 50`,
  },
  {
    label: "Filter by specific predicate value",
    query: `SELECT ?s ?p ?o WHERE { ?s schema:value ?o . FILTER(?o = "42") } LIMIT 20`,
  },
];

// ── Grade badge ─────────────────────────────────────────────────────────────

const GRADE_STYLES: Record<EpistemicGrade, string> = {
  A: "bg-green-500/20 text-green-400 border-green-500/30",
  B: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  C: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  D: "bg-red-500/20 text-red-400 border-red-500/30",
};

function GradeBadge({ grade }: { grade: EpistemicGrade }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 rounded border text-[10px] font-bold ${GRADE_STYLES[grade]}`}
    >
      {grade}
    </span>
  );
}

// ── Page component ──────────────────────────────────────────────────────────

const SparqlEditorPage = () => {
  const [query, setQuery] = useState(EXAMPLES[0].query);
  const [result, setResult] = useState<SparqlResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);

  const execute = useCallback(async () => {
    setExecuting(true);
    setError(null);
    setResult(null);
    try {
      const r = await executeSparql(query);
      setResult(r);
    } catch (e) {
      setError(String(e));
    }
    setExecuting(false);
  }, [query]);

  return (
    <Layout>
      <section className="py-20 md:py-28">
        <div className="container max-w-5xl mx-auto px-6">
          {/* Header */}
          <div className="mb-12">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Module 8 — SPARQL Query Interface
            </p>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              SPARQL Editor
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl">
              Query the UOR triple store using SPARQL-like syntax.
              Every result is enriched with an epistemic grade from the derivation chain.
            </p>
          </div>

          {/* Example queries */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                onClick={() => setQuery(ex.query)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  query === ex.query
                    ? "bg-foreground text-background"
                    : "border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {ex.label}
              </button>
            ))}
          </div>

          {/* Query editor */}
          <div className="rounded-lg border border-border bg-card p-4 mb-4">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={5}
              spellCheck={false}
              className="w-full bg-transparent text-foreground font-mono text-sm resize-none focus:outline-none placeholder:text-muted-foreground"
              placeholder="SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 50"
            />
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <button
                onClick={execute}
                disabled={executing || !query.trim()}
                className="btn-primary text-sm"
              >
                {executing ? "Executing…" : "Execute Query"}
              </button>
              {result && (
                <span className="text-xs text-muted-foreground font-mono">
                  {result.totalCount} result{result.totalCount !== 1 ? "s" : ""} · {result.executionTimeMs}ms
                </span>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 mb-4">
              <p className="text-xs text-destructive font-mono">{error}</p>
            </div>
          )}

          {/* Results table */}
          {result && result.rows.length > 0 && (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground w-8">
                        Grade
                      </th>
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">
                        Subject
                      </th>
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">
                        Predicate
                      </th>
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">
                        Object
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, i) => (
                      <tr
                        key={i}
                        className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-3 py-2">
                          <GradeBadge grade={row.epistemic_grade} />
                        </td>
                        <td className="px-3 py-2 font-mono text-foreground truncate max-w-[200px]">
                          {row.subject}
                        </td>
                        <td className="px-3 py-2 font-mono text-muted-foreground truncate max-w-[160px]">
                          {row.predicate}
                        </td>
                        <td className="px-3 py-2 font-mono text-muted-foreground truncate max-w-[200px]">
                          {row.object}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty state */}
          {result && result.rows.length === 0 && (
            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No results. Make sure triples have been ingested via the{" "}
                <a href="/knowledge-graph" className="text-primary underline">
                  Knowledge Graph
                </a>{" "}
                page first.
              </p>
            </div>
          )}

          {/* Grade legend */}
          <div className="mt-6 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="font-medium">Grade key:</span>
            <span className="flex items-center gap-1"><GradeBadge grade="A" /> Algebraically proven</span>
            <span className="flex items-center gap-1"><GradeBadge grade="B" /> Certified</span>
            <span className="flex items-center gap-1"><GradeBadge grade="C" /> Attributed</span>
            <span className="flex items-center gap-1"><GradeBadge grade="D" /> Unverified</span>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default SparqlEditorPage;
