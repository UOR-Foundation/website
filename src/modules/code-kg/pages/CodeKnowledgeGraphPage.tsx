import { useState, useCallback } from "react";
import Layout from "@/modules/core/components/Layout";
import { Q0 } from "@/modules/ring-core/ring";
import { analyzeTypeScript } from "../analyzer";
import { ingestCodeGraph, exportToKgStore } from "../bridge";
import { buildVisualization, ENTITY_COLORS, ENTITY_STROKE } from "../visualizer";
import type { CodeGraphResult } from "../bridge";
import type { VisualizationData } from "../visualizer";
import type { EpistemicGrade } from "@/types/uor";

const GRADE_STYLES: Record<EpistemicGrade, string> = {
  A: "bg-green-500/20 text-green-400 border-green-500/30",
  B: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  C: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  D: "bg-red-500/20 text-red-400 border-red-500/30",
};

const EXAMPLE_CODE = `// Example TypeScript code for analysis
interface UserProfile {
  id: string;
  name: string;
  email: string;
}

class UserService {
  private users: UserProfile[] = [];

  async getUser(id: string): Promise<UserProfile | undefined> {
    return this.users.find(u => u.id === id);
  }

  async createUser(profile: UserProfile): Promise<void> {
    this.users.push(profile);
  }
}

function validateEmail(email: string): boolean {
  return email.includes("@");
}

const MAX_USERS = 1000;

export { UserService, validateEmail };
`;

const CodeKnowledgeGraphPage = () => {
  const [code, setCode] = useState(EXAMPLE_CODE);
  const [result, setResult] = useState<CodeGraphResult | null>(null);
  const [vizData, setVizData] = useState<VisualizationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{ triplesIngested: number; derivationsIngested: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async () => {
    setLoading(true);
    setError(null);
    setExportResult(null);
    try {
      const ring = Q0();
      const analysis = await analyzeTypeScript(code);
      const graphResult = await ingestCodeGraph(ring, analysis);
      setResult(graphResult);
      setVizData(buildVisualization(graphResult, 600, 400));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [code]);

  const exportToKG = useCallback(async () => {
    if (!result) return;
    setExporting(true);
    setError(null);
    try {
      const res = await exportToKgStore(result, 0);
      setExportResult(res);
    } catch (e) {
      setError(String(e));
    } finally {
      setExporting(false);
    }
  }, [result]);

  return (
    <Layout>
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
            Code → Knowledge Graph
          </h1>
          <p className="text-muted-foreground mb-8 max-w-2xl">
            Transform TypeScript/JavaScript source code into a UOR-grounded knowledge graph.
            Every code entity receives a canonical derivation and IRI.
          </p>

          {/* Code Editor */}
          <div className="mb-6">
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Source Code
            </label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={14}
              className="w-full px-4 py-3 rounded-lg border border-border bg-card text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
              placeholder="Paste TypeScript or JavaScript code here…"
            />
          </div>

          <div className="flex gap-3 mb-8">
            <button
              onClick={analyze}
              disabled={loading || !code.trim()}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {loading ? "Analyzing…" : "Analyze & Derive"}
            </button>
            {result && (
              <button
                onClick={exportToKG}
                disabled={exporting}
                className="px-4 py-2 rounded-lg border border-primary/30 text-primary text-sm hover:bg-primary/10 transition-colors disabled:opacity-50"
              >
                {exporting ? "Exporting…" : "Export to Knowledge Graph"}
              </button>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive font-mono mb-4">{error}</p>
          )}

          {exportResult && (
            <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/10 text-green-400 text-sm mb-6">
              Exported: {exportResult.derivationsIngested} derivations, {exportResult.triplesIngested} triples ingested to Knowledge Graph.
            </div>
          )}

          {result && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Entities Table */}
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="text-sm font-semibold mb-3">
                  Entities ({result.totalEntities})
                </h3>
                <div className="space-y-2 max-h-80 overflow-auto">
                  {result.derivedEntities.map((de) => (
                    <div
                      key={de.entity.name}
                      className="flex items-start gap-2 p-2 rounded bg-muted/30"
                    >
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded border text-[9px] font-bold flex-shrink-0 ${
                          GRADE_STYLES[de.derivation.epistemicGrade as EpistemicGrade]
                        }`}
                      >
                        {de.derivation.epistemicGrade}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-semibold text-foreground">
                            {de.entity.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            {de.entity.type}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">
                          {de.iri}
                        </p>
                        <p className="text-[10px] font-mono text-muted-foreground truncate">
                          derivation: {de.derivation.derivationId.slice(-16)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Relations Table */}
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="text-sm font-semibold mb-3">
                  Relations ({result.totalRelations})
                </h3>
                <div className="space-y-1 max-h-80 overflow-auto">
                  {result.relations.map((rel, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2 rounded bg-muted/30 text-xs"
                    >
                      <span className="font-mono text-foreground">{rel.source}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        {rel.type}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-mono text-foreground">{rel.target}</span>
                    </div>
                  ))}
                  {result.relations.length === 0 && (
                    <p className="text-xs text-muted-foreground">No relations detected.</p>
                  )}
                </div>
              </div>

              {/* SVG Graph Visualization */}
              {vizData && vizData.nodes.length > 0 && (
                <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5">
                  <h3 className="text-sm font-semibold mb-3">Graph Visualization</h3>
                  <svg
                    viewBox={`0 0 ${vizData.width} ${vizData.height}`}
                    className="w-full h-auto"
                    style={{ maxHeight: 420 }}
                  >
                    {/* Edges */}
                    {vizData.edges.map((edge, i) => (
                      <line
                        key={`e-${i}`}
                        x1={edge.sourceX}
                        y1={edge.sourceY}
                        x2={edge.targetX}
                        y2={edge.targetY}
                        className="stroke-muted-foreground/30"
                        strokeWidth={1.5}
                        markerEnd="url(#arrowhead)"
                      />
                    ))}
                    {/* Arrowhead marker */}
                    <defs>
                      <marker
                        id="arrowhead"
                        viewBox="0 0 10 7"
                        refX="10"
                        refY="3.5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto-start-reverse"
                      >
                        <polygon
                          points="0 0, 10 3.5, 0 7"
                          className="fill-muted-foreground/40"
                        />
                      </marker>
                    </defs>
                    {/* Nodes */}
                    {vizData.nodes.map((node) => (
                      <g key={node.id}>
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={20}
                          className={`${ENTITY_COLORS[node.type] ?? "fill-muted"} ${ENTITY_STROKE[node.type] ?? "stroke-muted-foreground"} opacity-80`}
                          strokeWidth={2}
                        />
                        <text
                          x={node.x}
                          y={node.y + 32}
                          textAnchor="middle"
                          className="fill-foreground text-[10px] font-mono"
                        >
                          {node.label}
                        </text>
                        <text
                          x={node.x}
                          y={node.y + 4}
                          textAnchor="middle"
                          className="fill-white text-[8px] font-bold"
                        >
                          {node.grade}
                        </text>
                      </g>
                    ))}
                  </svg>
                  <div className="flex gap-4 mt-3 flex-wrap">
                    {Object.entries(ENTITY_COLORS).map(([type, cls]) => (
                      <div key={type} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span className={`w-3 h-3 rounded-full ${cls}`} />
                        {type}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* JSON-LD Output */}
              <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5">
                <h3 className="text-sm font-semibold mb-3">JSON-LD Document</h3>
                <pre className="p-3 rounded bg-muted text-muted-foreground overflow-auto max-h-64 text-[10px] leading-tight font-mono">
                  {JSON.stringify(result.document, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default CodeKnowledgeGraphPage;
