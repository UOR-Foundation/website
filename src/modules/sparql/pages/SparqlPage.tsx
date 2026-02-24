import { useState, useCallback, useEffect } from "react";
import Layout from "@/modules/core/components/Layout";
import { Database, Loader2, Play, Info, Copy, Check, ChevronDown, ChevronUp, CheckCircle2, XCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/modules/core/ui/tooltip";

const SPARQL_FN = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "erwfuxphwcvynxhfbvql"}.supabase.co/functions/v1/uor-sparql`;

/* ── helpers ──────────────────────────────────────────────── */

function CopyBtn({ text }: { text: string }) {
  const [c, setC] = useState(false);
  const h = useCallback(() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 1400); }, [text]);
  return <button onClick={h} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors" aria-label="Copy">{c ? <Check size={13} className="text-primary" /> : <Copy size={13} />}</button>;
}

function Ref({ label, tip }: { label: string; tip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-0.5 text-xs font-mono text-primary/60 cursor-help border-b border-dotted border-primary/30">{label} <Info size={10} /></span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">{tip}</TooltipContent>
    </Tooltip>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-card p-5 md:p-7 ${className}`}>{children}</div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-xl md:text-2xl font-bold text-foreground mb-4">{children}</h2>;
}

/* ── constants ────────────────────────────────────────────── */

const PRESETS: { label: string; tag: string; query: string; graph?: string }[] = [
  {
    label: "CoordinateQuery: IrreducibleSet",
    tag: "coordinate",
    query: `SELECT * WHERE { GRAPH partition:IrreducibleSet { ?x ?p ?o } } LIMIT 16`,
    graph: "partition:IrreducibleSet",
  },
  {
    label: "ASK: Critical Identity",
    tag: "ask",
    query: `ASK { partition:criticalIdentity proof:holds true }`,
  },
  {
    label: "MetricQuery: All Strata",
    tag: "metric",
    query: `SELECT ?x ?stratum WHERE { ?x schema:stratum ?stratum } LIMIT 24`,
  },
  {
    label: "RepresentationQuery: Canonical Forms",
    tag: "representation",
    query: `SELECT ?x ?canonical WHERE { ?x resolver:canonicalForm ?canonical } LIMIT 16`,
  },
  {
    label: "Fiber: Stratum k=4 (F₄=70)",
    tag: "fiber",
    query: `SELECT ?x WHERE { ?x schema:stratum 4 }`,
  },
];

const RESOLVERS = [
  { name: "DihedralFactorizationResolver", complexity: "sublinear" },
  { name: "CanonicalFormResolver", complexity: "convergent" },
  { name: "EvaluationResolver", complexity: "O(2ⁿ)" },
];

const FORMATS: { label: string; accept: string; key: string }[] = [
  { label: "JSON", accept: "application/sparql-results+json", key: "json" },
  { label: "JSON-LD", accept: "application/ld+json", key: "jsonld" },
  { label: "Turtle", accept: "text/turtle", key: "turtle" },
];

const FIBERS = [1, 8, 28, 56, 70, 56, 28, 8, 1]; // C(8,k) for k=0..8

const PARTITIONS: { name: string; graph: string; desc: string }[] = [
  { name: "IrreducibleSet", graph: "partition:IrreducibleSet", desc: "No nontrivial factorisation" },
  { name: "ReducibleSet", graph: "partition:ReducibleSet", desc: "Expressible as products of irreducibles" },
  { name: "UnitSet", graph: "partition:UnitSet", desc: "Multiplicatively invertible (odd integers at Q0)" },
  { name: "ExteriorSet", graph: "partition:ExteriorSet", desc: "Exterior to the type's carrier" },
];

/* ── Section 1: Query Editor ─────────────────────────────── */

function QueryEditor({
  onResult,
}: {
  onResult: (r: any, format: string, resolver: string) => void;
}) {
  const [query, setQuery] = useState(PRESETS[0].query);
  const [graph, setGraph] = useState(PRESETS[0].graph || "");
  const [resolver, setResolver] = useState(RESOLVERS[1].name);
  const [format, setFormat] = useState(FORMATS[0]);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(SPARQL_FN, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: format.accept },
        body: JSON.stringify({ query, graph: graph || undefined, resolver }),
      });
      const ct = r.headers.get("content-type") || "";
      let data: any;
      if (ct.includes("turtle") || ct.includes("text/")) {
        data = { _turtle: await r.text() };
      } else {
        data = await r.json();
      }
      onResult(data, format.key, resolver);
    } catch (e) {
      console.error(e);
      onResult({ error: String(e) }, format.key, resolver);
    }
    setLoading(false);
  }, [query, graph, resolver, format, onResult]);

  const selectPreset = (p: typeof PRESETS[0]) => {
    setQuery(p.query);
    setGraph(p.graph || "");
  };

  return (
    <Card>
      <SectionTitle>Query Editor</SectionTitle>

      {/* Presets */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {PRESETS.map((p) => (
          <button
            key={p.tag}
            onClick={() => selectPreset(p)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-body transition-colors ${
              query === p.query
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Query textarea */}
      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[80px] resize-y mb-4"
        spellCheck={false}
      />

      {/* Controls row */}
      <div className="flex flex-wrap items-end gap-4 mb-4">
        {/* Resolver */}
        <div>
          <label className="block text-xs font-body text-muted-foreground mb-1">Resolver</label>
          <select
            value={resolver}
            onChange={(e) => setResolver(e.target.value)}
            className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
          >
            {RESOLVERS.map((r) => (
              <option key={r.name} value={r.name}>
                {r.name} ({r.complexity})
              </option>
            ))}
          </select>
        </div>

        {/* Format */}
        <div>
          <label className="block text-xs font-body text-muted-foreground mb-1">Format</label>
          <div className="flex gap-1">
            {FORMATS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFormat(f)}
                className={`px-3 py-2 rounded-lg border text-xs font-mono transition-colors ${
                  format.key === f.key
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={run}
        disabled={loading}
        className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-body font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Run Query
      </button>
    </Card>
  );
}

/* ── Section 2: Results Panel ─────────────────────────────── */

function ResultsPanel({
  result,
  format,
  resolver,
}: {
  result: any;
  format: string;
  resolver: string;
}) {
  const [showRaw, setShowRaw] = useState(false);

  if (!result) return null;

  const meta = result._meta || {};
  const complexity = RESOLVERS.find((r) => r.name === resolver)?.complexity || meta.complexity || "";
  const isTurtle = !!result._turtle;
  const isAsk = result.boolean !== undefined;
  const bindings = result?.results?.bindings;
  const vars = result?.head?.vars;
  const graph = result?.["@graph"];
  const fiber = meta.fiberSize !== undefined;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <SectionTitle>Results</SectionTitle>
        <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-muted text-muted-foreground border border-border">
          {resolver} · {complexity}
        </span>
      </div>

      {/* ASK result */}
      {isAsk && (
        <div className="flex items-center gap-3 mb-4">
          {result.boolean ? (
            <>
              <CheckCircle2 size={20} className="text-primary" />
              <span className="font-display font-bold text-primary text-lg">TRUE</span>
            </>
          ) : (
            <>
              <XCircle size={20} className="text-destructive" />
              <span className="font-display font-bold text-destructive text-lg">FALSE</span>
            </>
          )}
          <span className="text-xs text-muted-foreground">Critical identity holds universally</span>
        </div>
      )}

      {/* Fiber info */}
      {fiber && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 mb-4 text-xs font-mono">
          <span className="text-foreground font-bold">F<sub>{meta.stratum}</sub></span>
          <span className="text-muted-foreground"> = C(8,{meta.stratum}) = </span>
          <span className="text-primary font-bold">{meta.fiberSize}</span>
          <span className="text-muted-foreground"> elements (actual: {meta.actual})</span>
        </div>
      )}

      {/* SELECT table */}
      {bindings && vars && bindings.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-left">
                {vars.map((v: string) => (
                  <th key={v} className="px-3 py-2 font-body font-semibold text-muted-foreground text-xs">?{v}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bindings.slice(0, 64).map((b: any, i: number) => (
                <tr key={i} className="border-t border-border hover:bg-muted/20 transition-colors">
                  {vars.map((v: string) => (
                    <td key={v} className="px-3 py-1.5 font-mono text-xs text-foreground">
                      {b[v]?.value ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {bindings.length > 64 && (
            <p className="text-xs text-muted-foreground p-2">Showing 64 of {bindings.length} results</p>
          )}
        </div>
      )}

      {/* JSON-LD @graph table */}
      {graph && Array.isArray(graph) && graph.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-left">
                {Object.keys(graph[0]).filter(k => !k.startsWith("_")).map((k) => (
                  <th key={k} className="px-3 py-2 font-body font-semibold text-muted-foreground text-xs">{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {graph.slice(0, 64).map((row: any, i: number) => (
                <tr key={i} className="border-t border-border hover:bg-muted/20 transition-colors">
                  {Object.keys(graph[0]).filter(k => !k.startsWith("_")).map((k) => (
                    <td key={k} className="px-3 py-1.5 font-mono text-xs text-foreground">
                      {typeof row[k] === "object" ? JSON.stringify(row[k]) : String(row[k] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Turtle raw */}
      {isTurtle && (
        <div className="relative mb-4">
          <pre className="bg-muted/50 rounded-xl p-4 overflow-x-auto text-xs font-mono text-foreground/80 leading-relaxed max-h-72 whitespace-pre-wrap">
            {result._turtle}
          </pre>
          <div className="absolute top-2 right-2"><CopyBtn text={result._turtle} /></div>
        </div>
      )}

      {/* Raw toggle */}
      {!isTurtle && (
        <>
          <button onClick={() => setShowRaw(!showRaw)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            {showRaw ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Raw response
          </button>
          {showRaw && (
            <div className="relative mt-2">
              <pre className="bg-muted/50 rounded-xl p-4 overflow-x-auto text-xs font-mono text-foreground/80 leading-relaxed max-h-64">
                {JSON.stringify(result, null, 2)}
              </pre>
              <div className="absolute top-2 right-2"><CopyBtn text={JSON.stringify(result, null, 2)} /></div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

/* ── Section 3: Fiber Bundle Explorer ─────────────────────── */

function FiberExplorer({
  onFiberClick,
}: {
  onFiberClick: (k: number) => void;
}) {
  const maxF = Math.max(...FIBERS);
  return (
    <Card>
      <div className="flex items-start justify-between mb-2">
        <SectionTitle>Discrete Fiber Bundle</SectionTitle>
        <Ref label="§5.1" tip="σ : Rₙ → {0,…,n} is the stratum projection. Fiber Fₖ = {x : popcount(x) = k}. bnot maps Fₖ → Fₙ₋ₖ." />
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        σ : R₈ → {"{0,…,8}"} — click a bar to query that fiber via SPARQL.
      </p>

      {/* Bar chart */}
      <div className="flex items-end gap-2 h-40 mb-3">
        {FIBERS.map((size, k) => {
          const h = Math.max(4, (size / maxF) * 100);
          return (
            <button
              key={k}
              onClick={() => onFiberClick(k)}
              className="flex-1 flex flex-col items-center gap-1 group"
              title={`F${k} = C(8,${k}) = ${size}`}
            >
              <span className="text-[10px] font-mono text-primary font-bold">{size}</span>
              <div
                className="w-full rounded-t bg-primary/30 group-hover:bg-primary/50 transition-colors"
                style={{ height: `${h}%` }}
              />
              <span className="text-[10px] font-mono text-muted-foreground">k={k}</span>
            </button>
          );
        })}
      </div>

      {/* bnot note */}
      <div className="rounded-lg bg-muted/20 border border-border p-3 text-xs text-muted-foreground font-body">
        <span className="font-mono text-foreground font-medium">bnot</span> maps F<sub>k</sub> → F<sub>n−k</sub> (reflection: k ↦ 8−k on the base space).
        <div className="flex items-center gap-1.5 mt-2 font-mono text-[10px] flex-wrap">
          {[0, 1, 2, 3, 4].map((k) => (
            <span key={k} className="flex items-center gap-0.5">
              F<sub>{k}</sub><span className="text-primary">↔</span>F<sub>{8 - k}</sub>
              {k < 4 && <span className="text-muted-foreground/30 mx-1">·</span>}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}

/* ── Section 4: Partition Named Graphs ────────────────────── */

function PartitionGraphs({
  onBrowse,
}: {
  onBrowse: (graph: string) => void;
}) {
  const [cardinalities, setCardinalities] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Try to get partition data
        const r = await fetch(`https://api.uor.foundation/v1/bridge/partition`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type_definition: { "@type": "type:PrimitiveType", "type:bitWidth": 8 } }),
        });
        if (r.ok) {
          const d = await r.json();
          const p = d?.partition || d?.summary || d;
          const cards: Record<string, number | null> = {};
          for (const part of PARTITIONS) {
            const key = part.name;
            const found = Object.entries(p).find(
              ([k]) => k.toLowerCase().includes(key.toLowerCase().replace("set", ""))
            );
            cards[key] = found ? ((found[1] as any)?.count ?? (found[1] as any)?.cardinality ?? (Array.isArray(found[1]) ? (found[1] as any[]).length : null)) : null;
          }
          setCardinalities(cards);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  return (
    <Card>
      <div className="flex items-start justify-between mb-2">
        <SectionTitle>Partition Named Graphs</SectionTitle>
        <Ref label="§4.1" tip="Partition classes form named graphs: IrreducibleSet, ReducibleSet, UnitSet, ExteriorSet. |I|+|R|+|U|+|E| = 256." />
      </div>
      {loading && <Loader2 size={14} className="animate-spin text-primary mb-3" />}

      <div className="grid sm:grid-cols-2 gap-3">
        {PARTITIONS.map((p) => (
          <div key={p.name} className="rounded-xl border border-border p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-bold text-foreground">{p.graph}</span>
              {cardinalities[p.name] != null && (
                <span className="text-xs font-mono text-primary font-bold">|{cardinalities[p.name]}|</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{p.desc}</p>
            <button
              onClick={() => onBrowse(p.graph)}
              className="self-start px-3 py-1 rounded-lg bg-primary/10 text-primary text-xs font-body font-medium hover:bg-primary/20 transition-colors"
            >
              Browse
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ── Page ─────────────────────────────────────────────────── */

const SparqlPage = () => {
  const [result, setResult] = useState<any>(null);
  const [format, setFormat] = useState("json");
  const [resolver, setResolver] = useState("CanonicalFormResolver");
  const [queryOverride, setQueryOverride] = useState<{ query: string; graph?: string } | null>(null);

  const handleResult = useCallback((r: any, f: string, res: string) => {
    setResult(r);
    setFormat(f);
    setResolver(res);
  }, []);

  const handleFiber = useCallback((k: number) => {
    setQueryOverride({ query: `SELECT ?x WHERE { ?x schema:stratum ${k} }` });
  }, []);

  const handleBrowse = useCallback((graph: string) => {
    setQueryOverride({
      query: `SELECT * WHERE { GRAPH ${graph} { ?x ?p ?o } } LIMIT 16`,
      graph,
    });
  }, []);

  // Auto-run when override changes — handled by editor picking up new preset
  // We use a key trick instead
  const [editorKey, setEditorKey] = useState(0);
  useEffect(() => {
    if (queryOverride) setEditorKey((k) => k + 1);
  }, [queryOverride]);

  return (
    <Layout>
      <section className="bg-[hsl(var(--primary))] py-12 md:py-16">
        <div className="container max-w-4xl">
          <div className="flex items-center gap-3 mb-3">
            <Database size={28} className="text-primary-foreground/80" />
            <h1 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground">
              SPARQL Query Interface
            </h1>
          </div>
          <p className="text-sm md:text-base text-primary-foreground/70 font-body max-w-2xl">
            Query UOR named graphs — partition classes, fiber bundles, canonical forms — via SPARQL over the live Q0 instance graph.
          </p>
        </div>
      </section>

      <section className="py-10 md:py-14">
        <div className="container max-w-4xl space-y-8">
          <QueryEditorControlled
            key={editorKey}
            onResult={handleResult}
            initialQuery={queryOverride?.query}
            initialGraph={queryOverride?.graph}
          />
          <ResultsPanel result={result} format={format} resolver={resolver} />
          <FiberExplorer onFiberClick={handleFiber} />
          <PartitionGraphs onBrowse={handleBrowse} />
        </div>
      </section>
    </Layout>
  );
};

/** Wrapper that accepts initial values and auto-runs if provided */
function QueryEditorControlled({
  onResult,
  initialQuery,
  initialGraph,
}: {
  onResult: (r: any, format: string, resolver: string) => void;
  initialQuery?: string;
  initialGraph?: string;
}) {
  const [query, setQuery] = useState(initialQuery || PRESETS[0].query);
  const [graph, setGraph] = useState(initialGraph || PRESETS[0].graph || "");
  const [resolver, setResolver] = useState(RESOLVERS[1].name);
  const [format, setFormat] = useState(FORMATS[0]);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async (q?: string, g?: string) => {
    setLoading(true);
    try {
      const r = await fetch(SPARQL_FN, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: format.accept },
        body: JSON.stringify({ query: q || query, graph: (g || graph) || undefined, resolver }),
      });
      const ct = r.headers.get("content-type") || "";
      let data: any;
      if (ct.includes("turtle") || ct.includes("text/")) {
        data = { _turtle: await r.text() };
      } else {
        data = await r.json();
      }
      onResult(data, format.key, resolver);
    } catch (e) {
      onResult({ error: String(e) }, format.key, resolver);
    }
    setLoading(false);
  }, [query, graph, resolver, format, onResult]);

  // Auto-run if initial values provided
  useEffect(() => {
    if (initialQuery) run(initialQuery, initialGraph);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectPreset = (p: typeof PRESETS[0]) => {
    setQuery(p.query);
    setGraph(p.graph || "");
  };

  return (
    <Card>
      <SectionTitle>Query Editor</SectionTitle>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {PRESETS.map((p) => (
          <button
            key={p.tag}
            onClick={() => selectPreset(p)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-body transition-colors ${
              query === p.query
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[80px] resize-y mb-4"
        spellCheck={false}
      />

      <div className="flex flex-wrap items-end gap-4 mb-4">
        <div>
          <label className="block text-xs font-body text-muted-foreground mb-1">Resolver</label>
          <select
            value={resolver}
            onChange={(e) => setResolver(e.target.value)}
            className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
          >
            {RESOLVERS.map((r) => (
              <option key={r.name} value={r.name}>
                {r.name} ({r.complexity})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-body text-muted-foreground mb-1">Format</label>
          <div className="flex gap-1">
            {FORMATS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFormat(f)}
                className={`px-3 py-2 rounded-lg border text-xs font-mono transition-colors ${
                  format.key === f.key
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={() => run()}
        disabled={loading}
        className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-body font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Run Query
      </button>
    </Card>
  );
}

export default SparqlPage;
