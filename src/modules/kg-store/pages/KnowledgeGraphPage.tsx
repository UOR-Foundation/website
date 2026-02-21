import { useState, useCallback, useEffect } from "react";
import Layout from "@/modules/core/components/Layout";
import { Q0 } from "@/modules/ring-core/ring";
import { emitGraph } from "@/modules/jsonld/emitter";
import {
  ingestDatumBatch,
  ingestTriples,
  getDatum,
  getDatumByValue,
} from "../store";
import { getGraphStats, listGraphs } from "../graph-manager";
import type { GraphStats } from "../graph-manager";
import { contentAddress } from "@/modules/identity";
import { PartitionVisualizer } from "@/modules/resolver/components/PartitionVisualizer";
import { CorrelationTool } from "@/modules/resolver/components/CorrelationTool";

const KnowledgeGraphPage = () => {
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [graphs, setGraphs] = useState<string[]>([]);
  const [ingesting, setIngesting] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Lookup state
  const [lookupInput, setLookupInput] = useState("");
  const [lookupResult, setLookupResult] = useState<Record<string, unknown> | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const refreshStats = useCallback(async () => {
    try {
      const [s, g] = await Promise.all([getGraphStats(), listGraphs()]);
      setStats(s);
      setGraphs(g);
    } catch (e) {
      console.error("Failed to fetch stats:", e);
    }
  }, []);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const ingestQ0 = useCallback(async () => {
    setIngesting(true);
    setError(null);
    setProgress("Preparing Q0 ring…");

    try {
      const ring = Q0();
      if (!ring.coherenceVerified) ring.verify();

      // 1. Ingest all 256 datums
      setProgress("Ingesting 256 Q0 datums…");
      const values = Array.from({ length: 256 }, (_, i) => i);
      await ingestDatumBatch(ring, values, (done, total) => {
        setProgress(`Ingesting datums: ${done}/${total}`);
      });

      // 2. Emit JSON-LD and ingest triples
      setProgress("Emitting JSON-LD graph…");
      const doc = emitGraph(ring);

      setProgress("Decomposing into triples…");
      const graphIri = `urn:uor:graph:Q0:${new Date().toISOString().slice(0, 10)}`;
      const tripleCount = await ingestTriples(doc, graphIri);

      setProgress(`✓ Done: 256 datums + ${tripleCount} triples ingested`);
      await refreshStats();
    } catch (e) {
      setError(String(e));
      setProgress("");
    }

    setIngesting(false);
  }, [refreshStats]);

  const lookup = useCallback(async () => {
    setLookupError(null);
    setLookupResult(null);

    const input = lookupInput.trim();
    if (!input) return;

    try {
      let result;
      // If it looks like a number, try value lookup
      if (/^\d+$/.test(input)) {
        result = await getDatumByValue(parseInt(input), 0);
      } else {
        // Otherwise treat as IRI
        result = await getDatum(input);
      }

      if (!result) {
        setLookupError("No datum found");
      } else {
        setLookupResult(result as Record<string, unknown>);
      }
    } catch (e) {
      setLookupError(String(e));
    }
  }, [lookupInput]);

  return (
    <Layout>
      <section className="py-20 md:py-28">
        <div className="container max-w-4xl mx-auto px-6">
          {/* Header */}
          <div className="mb-12">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Module 6 — Knowledge Graph Store
            </p>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Knowledge Graph</h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl">
              Persistent dual-addressed storage — every datum has a UOR IRI for identity
              and a database record for querying. JSON-LD remains the canonical format.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
            <StatCard label="Datums" value={stats?.datumCount ?? 0} />
            <StatCard label="Derivations" value={stats?.derivationCount ?? 0} />
            <StatCard label="Certificates" value={stats?.certificateCount ?? 0} />
            <StatCard label="Receipts" value={stats?.receiptCount ?? 0} />
            <StatCard label="Triples" value={stats?.tripleCount ?? 0} />
          </div>

          {/* Ingest */}
          <div className="rounded-lg border border-border bg-card p-5 mb-8">
            <h3 className="text-sm font-semibold mb-3">Ingest Q0 Ring</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Ingests all 256 Q0 datums with full triadic coordinates, relation IRIs,
              coherence proof, and decomposed triples into the knowledge graph.
            </p>
            <button
              onClick={ingestQ0}
              disabled={ingesting}
              className="btn-primary text-sm"
            >
              {ingesting ? "Ingesting…" : "Ingest Q0 Ring (256 datums)"}
            </button>
            {progress && (
              <p className="text-xs text-muted-foreground mt-3 font-mono">{progress}</p>
            )}
            {error && (
              <p className="text-xs text-destructive mt-3 font-mono">{error}</p>
            )}
          </div>

          {/* Lookup */}
          <div className="rounded-lg border border-border bg-card p-5 mb-8">
            <h3 className="text-sm font-semibold mb-3">Datum Lookup</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Look up a datum by value (e.g. "42") or by IRI (e.g. "https://uor.foundation/u/U282A").
            </p>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={lookupInput}
                onChange={(e) => setLookupInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && lookup()}
                placeholder="Value or IRI…"
                className="flex-1 px-4 py-2 rounded-lg border border-border bg-card text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button onClick={lookup} className="btn-primary text-sm">
                Lookup
              </button>
            </div>
            {lookupError && (
              <p className="text-xs text-destructive font-mono">{lookupError}</p>
            )}
            {lookupResult && (
              <pre className="p-3 rounded bg-muted text-muted-foreground overflow-auto max-h-64 text-[10px] leading-tight font-mono">
                {JSON.stringify(lookupResult, null, 2)}
              </pre>
            )}
          </div>

          {/* Partition Visualizer */}
          <div className="mb-8">
            <PartitionVisualizer />
          </div>

          {/* Correlation Tool */}
          <div className="mb-8">
            <CorrelationTool />
          </div>

          {/* Named graphs */}
          {graphs.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-semibold mb-3">Named Graphs</h3>
              <div className="space-y-1">
                {graphs.map((g) => (
                  <p key={g} className="text-xs font-mono text-muted-foreground">
                    {g}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-center">
      <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default KnowledgeGraphPage;
