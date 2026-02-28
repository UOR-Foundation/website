/**
 * Code-to-Knowledge-Graph — Interactive Visualization
 * ════════════════════════════════════════════════════
 *
 * Self-reflective: parses the UOR framework's own module structure
 * into a knowledge graph and renders it as a force-directed visualization.
 *
 * @module code-kg/pages/CodeKgPage
 */

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  IconCode, IconGraph, IconZoomIn, IconRefresh, IconBrain,
  IconFileCode, IconFunction, IconBox, IconArrowRight,
  IconCircleDot, IconLink,
} from "@tabler/icons-react";
import {
  PageShell, StatCard, DashboardGrid, MetricBar, InfoCard, DataTable,
  type DataTableColumn,
} from "@/modules/core/ui/shared-dashboard";
import {
  buildCodeGraph, computeStats, graphToTriples,
  UOR_MODULE_SOURCES,
  type CodeGraph, type CodeNode, type CodeEdge, type GraphStats,
} from "@/modules/code-kg";

// ── Colors by node kind ─────────────────────────────────────────────────────

const KIND_COLORS: Record<string, string> = {
  file: "hsl(210, 50%, 55%)",
  module: "hsl(260, 50%, 55%)",
  function: "hsl(152, 44%, 50%)",
  class: "hsl(35, 80%, 55%)",
  interface: "hsl(280, 55%, 55%)",
  import: "hsl(var(--muted-foreground))",
  export: "hsl(45, 70%, 50%)",
  type: "hsl(190, 50%, 50%)",
  variable: "hsl(0, 0%, 60%)",
};

const KIND_ICONS: Record<string, typeof IconCode> = {
  file: IconFileCode,
  function: IconFunction,
  class: IconBox,
  interface: IconCircleDot,
  type: IconCircleDot,
  import: IconLink,
  export: IconArrowRight,
};

// ── Force-directed graph ────────────────────────────────────────────────────

interface SimNode {
  id: string;
  kind: string;
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

function useForceLayout(
  nodes: SimNode[], edges: CodeEdge[], width: number, height: number,
) {
  const ref = useRef(nodes);
  const [, tick] = useState(0);

  useEffect(() => {
    ref.current = nodes.map((n, i) => ({
      ...n,
      x: ref.current[i]?.x ?? n.x,
      y: ref.current[i]?.y ?? n.y,
      vx: ref.current[i]?.vx ?? 0,
      vy: ref.current[i]?.vy ?? 0,
    }));
  }, [nodes]);

  useEffect(() => {
    let id: number;
    const step = () => {
      const ns = ref.current;
      const cx = width / 2;
      const cy = height / 2;

      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const dx = ns[i].x - ns[j].x;
          const dy = ns[i].y - ns[j].y;
          const d = Math.max(5, Math.sqrt(dx * dx + dy * dy));
          const f = 600 / (d * d);
          ns[i].vx += (dx / d) * f;
          ns[i].vy += (dy / d) * f;
          ns[j].vx -= (dx / d) * f;
          ns[j].vy -= (dy / d) * f;
        }
      }

      for (const e of edges) {
        const s = ns.find(n => n.id === e.source);
        const t = ns.find(n => n.id === e.target);
        if (!s || !t) continue;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const f = (d - 80) * 0.004;
        s.vx += (dx / d) * f;
        s.vy += (dy / d) * f;
        t.vx -= (dx / d) * f;
        t.vy -= (dy / d) * f;
      }

      for (const n of ns) {
        n.vx += (cx - n.x) * 0.002;
        n.vy += (cy - n.y) * 0.002;
        n.vx *= 0.88;
        n.vy *= 0.88;
        n.x = Math.max(20, Math.min(width - 20, n.x + n.vx));
        n.y = Math.max(20, Math.min(height - 20, n.y + n.vy));
      }

      tick(t => t + 1);
      id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [edges, width, height]);

  return ref.current;
}

// ── Graph SVG ───────────────────────────────────────────────────────────────

function GraphView({
  graph, selected, onSelect,
}: {
  graph: CodeGraph;
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const W = 750;
  const H = 480;

  // Filter to only file + important nodes for clarity
  const visibleKinds = new Set(["file", "function", "class", "interface", "export", "type"]);
  const visibleNodes = graph.nodes.filter(n => visibleKinds.has(n.kind));
  const visibleIds = new Set(visibleNodes.map(n => n.id));
  const visibleEdges = graph.edges.filter(
    e => visibleIds.has(e.source) && visibleIds.has(e.target) && e.kind === "contains"
  );

  const simNodes: SimNode[] = visibleNodes.map(n => ({
    id: n.id,
    kind: n.kind,
    label: n.name,
    x: W / 2 + (Math.random() - 0.5) * 400,
    y: H / 2 + (Math.random() - 0.5) * 300,
    vx: 0,
    vy: 0,
    radius: n.kind === "file" ? 10 : n.kind === "class" ? 7 : 4,
  }));

  const layoutNodes = useForceLayout(simNodes, visibleEdges, W, H);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl bg-card border border-border" style={{ maxHeight: 480 }}>
      <defs>
        <filter id="ckg-glow">
          <feGaussianBlur stdDeviation="2.5" result="g" />
          <feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Edges */}
      {visibleEdges.map((e, i) => {
        const s = layoutNodes.find(n => n.id === e.source);
        const t = layoutNodes.find(n => n.id === e.target);
        if (!s || !t) return null;
        const hl = selected === e.source || selected === e.target;
        return (
          <line
            key={i}
            x1={s.x} y1={s.y} x2={t.x} y2={t.y}
            stroke={hl ? "hsl(var(--primary))" : "hsl(var(--border))"}
            strokeWidth={hl ? 1.2 : 0.5}
            strokeOpacity={hl ? 0.7 : 0.2}
          />
        );
      })}

      {/* Nodes */}
      {layoutNodes.map(n => {
        const isSel = selected === n.id;
        const color = KIND_COLORS[n.kind] ?? "hsl(var(--muted-foreground))";
        return (
          <g key={n.id} onClick={() => onSelect(isSel ? null : n.id)} className="cursor-pointer">
            <circle
              cx={n.x} cy={n.y} r={n.radius}
              fill={isSel ? color : `${color}`}
              fillOpacity={isSel ? 1 : 0.7}
              stroke={isSel ? "hsl(var(--foreground))" : color}
              strokeWidth={isSel ? 2 : 0.5}
              filter={isSel ? "url(#ckg-glow)" : undefined}
            />
            {(n.kind === "file" || isSel) && (
              <text
                x={n.x} y={n.y - n.radius - 4}
                textAnchor="middle"
                fill="hsl(var(--foreground))"
                fontSize={isSel ? 9 : 7}
                fontFamily="var(--font-mono, monospace)"
                opacity={isSel ? 1 : 0.6}
              >
                {n.label.length > 20 ? n.label.slice(0, 18) + "…" : n.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function CodeKgPage() {
  const [graph, setGraph] = useState<CodeGraph | null>(null);
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [tripleCount, setTripleCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const analyze = useCallback(() => {
    setIsRunning(true);
    setSelected(null);
    setTimeout(() => {
      const files = UOR_MODULE_SOURCES.map(m => ({ path: m.path, content: m.content }));
      const g = buildCodeGraph(files);
      const s = computeStats(g);
      const triples = graphToTriples(g);
      setGraph(g);
      setStats(s);
      setTripleCount(triples.length);
      setIsRunning(false);
    }, 100);
  }, []);

  const selectedNode = useMemo(
    () => graph?.nodes.find(n => n.id === selected) ?? null,
    [graph, selected],
  );

  const topFileCols = useMemo<DataTableColumn<{ path: string; entityCount: number; [k: string]: unknown }>[]>(() => [
    {
      key: "path", label: "File",
      render: (r) => {
        const name = r.path.split("/").pop() ?? r.path;
        return <span className="font-semibold">{name}</span>;
      },
    },
    { key: "entityCount", label: "Entities", align: "right", mono: true },
  ], []);

  return (
    <PageShell
      title="Code → Knowledge Graph"
      subtitle="Bevel × UOR"
      icon={<IconGraph size={18} />}
      badge="Self-Reflective"
      actions={
        <button
          onClick={analyze}
          disabled={isRunning}
          className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          {isRunning ? <>Parsing…</> : <><IconCode size={12} /> Analyze Codebase</>}
        </button>
      }
    >
      {/* Hero */}
      <section className="space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Code That Understands Itself
        </h2>
        <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
          Inspired by{" "}
          <a href="https://github.com/Bevel-Software/code-to-knowledge-graph" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Bevel's Code-to-Knowledge-Graph
          </a>
          , this engine parses TypeScript source code into UOR-native knowledge graph triples.
          Click <strong>Analyze Codebase</strong> to make the UOR framework understand its own structure.
        </p>
      </section>

      {graph && stats ? (
        <>
          {/* Stats */}
          <DashboardGrid cols={4}>
            <StatCard
              label="Files Parsed"
              value={graph.metadata.fileCount}
              icon={<IconFileCode size={16} />}
              sublabel="TypeScript modules"
            />
            <StatCard
              label="Graph Nodes"
              value={graph.metadata.nodeCount}
              icon={<IconCircleDot size={16} />}
              sublabel={`${Object.keys(stats.nodesByKind).length} kinds`}
            />
            <StatCard
              label="Graph Edges"
              value={graph.metadata.edgeCount}
              icon={<IconLink size={16} />}
              sublabel={`${Object.keys(stats.edgesByKind).length} relationship types`}
            />
            <StatCard
              label="UOR Triples"
              value={tripleCount}
              icon={<IconBrain size={16} />}
              sublabel="Content-addressable"
            />
          </DashboardGrid>

          {/* Node kind breakdown */}
          <section className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <IconZoomIn size={16} className="text-primary" />
              Entity Distribution
            </h3>
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              {Object.entries(stats.nodesByKind)
                .sort((a, b) => (b[1] as number) - (a[1] as number))
                .map(([kind, count]) => (
                  <MetricBar
                    key={kind}
                    label={kind.charAt(0).toUpperCase() + kind.slice(1)}
                    value={(count as number) / graph.metadata.nodeCount}
                    color={KIND_COLORS[kind] ?? "hsl(var(--muted-foreground))"}
                    sublabel={`${count} entities`}
                  />
                ))}
            </div>
          </section>

          {/* Graph visualization */}
          <section className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <IconGraph size={16} className="text-primary" />
              Knowledge Graph
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <GraphView graph={graph} selected={selected} onSelect={setSelected} />
              </div>
              <div>
                {selectedNode ? (
                  <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ background: KIND_COLORS[selectedNode.kind] }}
                      />
                      <span className="font-semibold text-sm">{selectedNode.name}</span>
                      <span className="ml-auto px-2 py-0.5 rounded-full bg-secondary text-[10px] font-mono">
                        {selectedNode.kind}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground truncate">
                      {selectedNode.filePath}
                    </div>
                    <div className="space-y-1 text-[10px]">
                      <div className="font-semibold text-muted-foreground uppercase tracking-wider">
                        Connections
                      </div>
                      {graph.edges
                        .filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
                        .slice(0, 8)
                        .map((e, i) => {
                          const other = e.source === selectedNode.id ? e.target : e.source;
                          const otherNode = graph.nodes.find(n => n.id === other);
                          const dir = e.source === selectedNode.id ? "→" : "←";
                          return (
                            <div key={i} className="flex items-center gap-1 text-muted-foreground">
                              <span>{dir}</span>
                              <span className="font-medium text-foreground">
                                {otherNode?.name ?? other.split(":").pop()}
                              </span>
                              <span className="ml-auto text-[9px] font-mono">{e.kind}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-xl p-4 text-center text-xs text-muted-foreground">
                    <IconGraph size={32} className="mx-auto mb-2 opacity-30" />
                    <p>Click a node to inspect its connections</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Top files table */}
          <section className="space-y-3">
            <h3 className="font-semibold text-sm">Most Complex Files</h3>
            <DataTable
              columns={topFileCols}
              data={stats.topFiles as any}
              getKey={(r) => r.path}
            />
          </section>
        </>
      ) : (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <IconCode size={48} className="mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground">
            Click <strong>Analyze Codebase</strong> to parse the UOR framework's module structure into a knowledge graph
          </p>
        </div>
      )}

      {/* Architecture */}
      <section className="space-y-3">
        <h3 className="font-semibold text-sm">Integration Architecture</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoCard
            title="Why It's a Projection"
            icon={<IconGraph size={16} />}
            badge="Discovery"
            badgeColor="hsl(280, 60%, 55%)"
            defaultOpen
          >
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Bevel's Code-to-Knowledge-Graph transforms source code into graph triples.
              In UOR terms, this is a <strong>structural projection</strong>: mapping the
              identity of code entities (functions, classes, imports) into the hologram's
              knowledge graph namespace. Each entity gets a content-addressed IRI.
            </p>
          </InfoCard>

          <InfoCard
            title="Self-Reflective Architecture"
            icon={<IconBrain size={16} />}
            badge="Meta"
          >
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              This implementation is <strong>self-reflective</strong>: it parses the UOR
              framework's own module structure, producing a knowledge graph of itself.
              The system literally understands its own architecture — ring-core, identity,
              hologram, trust, observer, consciousness — as a navigable graph.
            </p>
          </InfoCard>

          <InfoCard
            title="Entity → UOR Triple"
            icon={<IconArrowRight size={16} />}
            badge="Mapping"
          >
            <div className="space-y-1 text-[10px] font-mono">
              <div className="flex justify-between"><span>File</span><span>→ code:file</span></div>
              <div className="flex justify-between"><span>Function</span><span>→ code:function</span></div>
              <div className="flex justify-between"><span>Class</span><span>→ code:class</span></div>
              <div className="flex justify-between"><span>Interface</span><span>→ code:interface</span></div>
              <div className="flex justify-between"><span>Import</span><span>→ code:imports</span></div>
              <div className="flex justify-between"><span>Contains</span><span>→ code:contains</span></div>
              <div className="flex justify-between"><span>Extends</span><span>→ code:extends</span></div>
            </div>
          </InfoCard>

          <InfoCard
            title="Bevel Compatibility"
            icon={<IconCode size={16} />}
            badge="Interop"
          >
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              The triple format is compatible with Bevel's graph model. If you run
              Bevel's JVM parser on this codebase, the resulting Neo4j graph would
              contain the same structural relationships — files, functions, classes,
              imports — that this client-side engine extracts. Same structure, two runtimes.
            </p>
          </InfoCard>
        </div>
      </section>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground py-4 border-t border-border">
        Inspired by{" "}
        <a href="https://github.com/Bevel-Software/code-to-knowledge-graph" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          Bevel Software's Code-to-Knowledge-Graph
        </a>{" "}
        (MPL-2.0). Client-side TypeScript implementation with UOR content-addressing.
      </div>
    </PageShell>
  );
}
