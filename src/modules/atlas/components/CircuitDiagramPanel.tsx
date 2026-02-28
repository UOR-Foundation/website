/**
 * Circuit Diagram Panel
 * ═════════════════════
 *
 * Interactive SVG renderer for the categorical compiler output:
 *   1. Decomposition tree — morphisms → categorical primitives
 *   2. Primitive sequence — cup/cap/dagger/compose/edge/identity
 *   3. Optimized gate output — Clifford+T / Pauli / Clifford
 *
 * @module atlas/components/CircuitDiagramPanel
 */

import React, { useState, useMemo, useCallback } from "react";
import {
  compileFromChain,
  type CompilationResult,
  type CategoricalPrimitive,
  type CompiledGate,
  type DecomposedMorphism,
  type PrimitiveKind,
} from "@/modules/atlas/categorical-compiler";
import { getAtlas } from "@/modules/atlas/atlas";

// ── Constants ──────────────────────────────────────────────────────────────

const GATE_W = 44;
const GATE_H = 32;
const GATE_GAP = 6;
const WIRE_Y_BASE = 50;
const WIRE_SPACING = 56;
const SECTION_PAD = 20;

const PRIM_COLORS: Record<PrimitiveKind, string> = {
  identity: "hsl(210,10%,50%)",
  compose:  "hsl(200,60%,55%)",
  dagger:   "hsl(280,55%,60%)",
  cup:      "hsl(38,65%,55%)",
  cap:      "hsl(16,65%,55%)",
  edge:     "hsl(150,50%,50%)",
};

const GATE_COLORS: Record<string, string> = {
  H:    "hsl(200,60%,55%)",
  S:    "hsl(160,50%,50%)",
  "S†": "hsl(160,50%,40%)",
  T:    "hsl(38,65%,55%)",
  "T†": "hsl(38,65%,42%)",
  CNOT: "hsl(280,55%,55%)",
  CZ:   "hsl(280,40%,45%)",
  I:    "hsl(210,10%,45%)",
  X:    "hsl(0,55%,55%)",
  Y:    "hsl(30,60%,55%)",
  Z:    "hsl(220,55%,55%)",
};

type ViewMode = "tree" | "primitives" | "circuit" | "all";

// ── Helper: build reachable chain ──────────────────────────────────────────

function getReachableChain(start: number, length: number): number[] {
  const atlas = getAtlas();
  const chain = [start];
  const visited = new Set<number>([start]);
  for (let i = 0; i < length; i++) {
    const current = chain[chain.length - 1];
    const next = atlas.vertices[current].neighbors.find(n => !visited.has(n));
    if (next === undefined) break;
    chain.push(next);
    visited.add(next);
  }
  return chain;
}

// ── Decomposition Tree SVG ─────────────────────────────────────────────────

function DecompositionTree({ decomposition }: { decomposition: DecomposedMorphism[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const treeWidth = Math.max(400, decomposition.length * 160);
  const maxDepth = Math.max(1, ...decomposition.flatMap(d => d.primitives.map(p => p.depth)));
  const treeHeight = 60 + maxDepth * 70 + 40;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${treeWidth} ${treeHeight}`}
      className="block"
    >
      {/* Title */}
      <text x={treeWidth / 2} y={18} textAnchor="middle"
        fill="hsl(38,50%,60%)" fontSize={11} fontFamily="monospace" fontWeight="bold">
        DECOMPOSITION TREE
      </text>

      {decomposition.map((dm, mIdx) => {
        const mx = 80 + mIdx * 150;
        const my = 40;
        const isHovered = hoveredIdx === mIdx;

        return (
          <g key={mIdx}
            onMouseEnter={() => setHoveredIdx(mIdx)}
            onMouseLeave={() => setHoveredIdx(null)}
            style={{ cursor: "pointer" }}
          >
            {/* Morphism root node */}
            <rect x={mx - 30} y={my} width={60} height={24} rx={4}
              fill={isHovered ? "hsla(200,60%,55%,0.3)" : "hsla(200,60%,55%,0.15)"}
              stroke="hsl(200,60%,55%)" strokeWidth={isHovered ? 1.5 : 0.8}
            />
            <text x={mx} y={my + 15} textAnchor="middle"
              fill="hsl(200,80%,70%)" fontSize={9} fontFamily="monospace">
              {dm.morphism.source}→{dm.morphism.target}
            </text>

            {/* Flags */}
            {dm.isTeleportation && (
              <text x={mx + 35} y={my + 10} fontSize={8} fill="hsl(38,65%,55%)" fontFamily="monospace">
                ⊗
              </text>
            )}
            {dm.involvesDagger && (
              <text x={mx + 35} y={my + 22} fontSize={8} fill="hsl(280,55%,60%)" fontFamily="monospace">
                †
              </text>
            )}

            {/* Primitive children */}
            {dm.primitives.map((p, pIdx) => {
              const n = dm.primitives.length;
              const px = mx + (pIdx - (n - 1) / 2) * 50;
              const py = my + 44 + p.depth * 50;
              const color = PRIM_COLORS[p.kind];

              return (
                <g key={pIdx}>
                  {/* Edge from parent */}
                  <line x1={mx} y1={my + 24} x2={px} y2={py}
                    stroke="hsla(210,10%,40%,0.5)" strokeWidth={0.7}
                    strokeDasharray={p.kind === "identity" ? "3,2" : "none"}
                  />
                  {/* Primitive node */}
                  <circle cx={px} cy={py + 8} r={10}
                    fill={`${color}22`} stroke={color} strokeWidth={isHovered ? 1.2 : 0.7}
                  />
                  <text x={px} y={py + 11} textAnchor="middle"
                    fill={color} fontSize={7} fontFamily="monospace" fontWeight="bold">
                    {p.kind === "identity" ? "id" :
                     p.kind === "compose" ? "∘" :
                     p.kind === "dagger" ? "†" :
                     p.kind === "cup" ? "η" :
                     p.kind === "cap" ? "ε" : "→"}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

// ── Primitive Sequence SVG ─────────────────────────────────────────────────

function PrimitiveSequence({ decomposition }: { decomposition: DecomposedMorphism[] }) {
  const allPrimitives = decomposition.flatMap(d => d.primitives);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const width = Math.max(400, allPrimitives.length * (GATE_W + GATE_GAP) + SECTION_PAD * 2);
  const height = 130;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      className="block"
    >
      <text x={width / 2} y={18} textAnchor="middle"
        fill="hsl(38,50%,60%)" fontSize={11} fontFamily="monospace" fontWeight="bold">
        PRIMITIVE SEQUENCE ({allPrimitives.length} primitives)
      </text>

      {/* Wire */}
      <line x1={SECTION_PAD} y1={65} x2={width - SECTION_PAD} y2={65}
        stroke="hsla(210,10%,35%,0.6)" strokeWidth={1}
      />

      {allPrimitives.map((p, i) => {
        const x = SECTION_PAD + i * (GATE_W + GATE_GAP);
        const y = 65 - GATE_H / 2;
        const color = PRIM_COLORS[p.kind];
        const isHov = hoveredIdx === i;

        const symbol = p.kind === "identity" ? "id" :
                       p.kind === "compose" ? "∘" :
                       p.kind === "dagger" ? "†" :
                       p.kind === "cup" ? "η" :
                       p.kind === "cap" ? "ε" : "→";

        return (
          <g key={i}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            style={{ cursor: "pointer" }}
          >
            <rect x={x} y={y} width={GATE_W} height={GATE_H} rx={4}
              fill={isHov ? `${color}44` : `${color}22`}
              stroke={color} strokeWidth={isHov ? 1.5 : 0.8}
            />
            <text x={x + GATE_W / 2} y={y + 14} textAnchor="middle"
              fill={color} fontSize={12} fontFamily="monospace" fontWeight="bold">
              {symbol}
            </text>
            <text x={x + GATE_W / 2} y={y + 25} textAnchor="middle"
              fill="hsla(210,10%,60%,0.7)" fontSize={7} fontFamily="monospace">
              {p.source >= 0 ? p.source : "I"}→{p.target >= 0 ? p.target : "I"}
            </text>

            {/* Tooltip on hover */}
            {isHov && (
              <g>
                <rect x={x - 10} y={y + GATE_H + 6} width={GATE_W + 20} height={20} rx={3}
                  fill="hsl(230,15%,12%)" stroke="hsla(210,10%,30%,0.5)" strokeWidth={0.5}
                />
                <text x={x + GATE_W / 2} y={y + GATE_H + 20} textAnchor="middle"
                  fill="hsl(210,10%,65%)" fontSize={7} fontFamily="monospace">
                  {p.label}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Optimized Gate Circuit SVG ─────────────────────────────────────────────

function GateCircuit({ gates, stats }: {
  gates: CompiledGate[];
  stats: CompilationResult["stats"];
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Group by qubit wires (unique vertices)
  const vertices = [...new Set(gates.map(g => g.vertex))].sort((a, b) => a - b);
  const wireMap = new Map(vertices.map((v, i) => [v, i]));
  const numWires = Math.max(1, vertices.length);

  // Max timestep
  const maxTime = gates.length > 0 ? Math.max(...gates.map(g => g.timeStep)) + 1 : 1;

  const width = Math.max(500, SECTION_PAD * 2 + maxTime * (GATE_W + GATE_GAP) + 100);
  const height = WIRE_Y_BASE + numWires * WIRE_SPACING + 60;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      className="block"
    >
      <text x={width / 2} y={18} textAnchor="middle"
        fill="hsl(38,50%,60%)" fontSize={11} fontFamily="monospace" fontWeight="bold">
        OUTPUT CIRCUIT ({gates.length} gates, ratio {stats.optimizationRatio.toFixed(2)})
      </text>

      {/* Wire labels + horizontal lines */}
      {vertices.map((v, i) => {
        const y = WIRE_Y_BASE + i * WIRE_SPACING;
        return (
          <g key={v}>
            <text x={SECTION_PAD - 4} y={y + 4} textAnchor="end"
              fill="hsl(210,10%,50%)" fontSize={9} fontFamily="monospace">
              q{v}
            </text>
            <line x1={SECTION_PAD} y1={y} x2={width - SECTION_PAD} y2={y}
              stroke="hsla(210,10%,25%,0.7)" strokeWidth={1}
            />
          </g>
        );
      })}

      {/* Gate boxes */}
      {gates.map((g, i) => {
        const wireIdx = wireMap.get(g.vertex) ?? 0;
        const x = SECTION_PAD + 30 + g.timeStep * (GATE_W + GATE_GAP);
        const y = WIRE_Y_BASE + wireIdx * WIRE_SPACING - GATE_H / 2;
        const color = GATE_COLORS[g.gate.name] ?? "hsl(210,10%,50%)";
        const isHov = hoveredIdx === i;

        return (
          <g key={i}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            style={{ cursor: "pointer" }}
          >
            <rect x={x} y={y} width={GATE_W} height={GATE_H} rx={4}
              fill={isHov ? `${color}44` : `${color}22`}
              stroke={color} strokeWidth={isHov ? 1.8 : 1}
            />
            {g.isRewritten && (
              <rect x={x} y={y} width={GATE_W} height={GATE_H} rx={4}
                fill="none" stroke="hsl(38,65%,55%)" strokeWidth={0.5}
                strokeDasharray="3,2"
              />
            )}
            <text x={x + GATE_W / 2} y={y + GATE_H / 2 + 4} textAnchor="middle"
              fill={color} fontSize={11} fontFamily="monospace" fontWeight="bold">
              {g.gate.name}
            </text>

            {isHov && (
              <g>
                <rect x={x - 15} y={y - 26} width={GATE_W + 30} height={22} rx={3}
                  fill="hsl(230,15%,12%)" stroke="hsla(210,10%,30%,0.5)" strokeWidth={0.5}
                />
                <text x={x + GATE_W / 2} y={y - 12} textAnchor="middle"
                  fill="hsl(210,10%,65%)" fontSize={7} fontFamily="monospace">
                  v{g.vertex} t={g.timeStep} d={g.rewriteDepth}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Stats bar */}
      <g transform={`translate(${SECTION_PAD}, ${height - 30})`}>
        {[
          `in: ${stats.inputMorphismCount} morph`,
          `prim: ${stats.totalPrimitives}`,
          `snake: ${stats.snakeEliminations}`,
          `†-cancel: ${stats.daggerCancellations}`,
          `id-elim: ${stats.identityEliminations}`,
          `gates: ${stats.gatesBefore}→${stats.gatesAfter}`,
        ].map((s, i) => (
          <text key={i} x={i * 110} y={0} fontSize={8} fontFamily="monospace"
            fill="hsl(210,10%,45%)">
            {s}
          </text>
        ))}
      </g>
    </svg>
  );
}

// ── Main Panel ─────────────────────────────────────────────────────────────

export default function CircuitDiagramPanel() {
  const [chainLength, setChainLength] = useState(5);
  const [startVertex, setStartVertex] = useState(0);
  const [gateSet, setGateSet] = useState<"clifford+t" | "clifford" | "pauli">("clifford+t");
  const [viewMode, setViewMode] = useState<ViewMode>("all");

  const result = useMemo(() => {
    const chain = getReachableChain(startVertex, chainLength);
    return compileFromChain(chain, gateSet);
  }, [chainLength, startVertex, gateSet]);

  const views: { key: ViewMode; label: string }[] = [
    { key: "all", label: "All" },
    { key: "tree", label: "Tree" },
    { key: "primitives", label: "Primitives" },
    { key: "circuit", label: "Circuit" },
  ];

  return (
    <div className="h-full flex flex-col bg-[hsl(230,15%,8%)]">
      {/* Controls bar */}
      <div className="shrink-0 flex items-center gap-4 px-5 py-3 border-b border-[hsla(210,15%,30%,0.3)] flex-wrap">
        <label className="text-[10px] font-mono text-[hsl(210,10%,50%)] flex items-center gap-2">
          START v
          <input
            type="number" min={0} max={95} value={startVertex}
            onChange={e => setStartVertex(Math.min(95, Math.max(0, +e.target.value)))}
            className="w-12 bg-[hsla(210,10%,15%,0.8)] text-[hsl(210,10%,75%)] text-[11px] font-mono px-1.5 py-0.5 rounded border border-[hsla(210,10%,30%,0.4)]"
          />
        </label>
        <label className="text-[10px] font-mono text-[hsl(210,10%,50%)] flex items-center gap-2">
          CHAIN
          <input
            type="range" min={2} max={15} value={chainLength}
            onChange={e => setChainLength(+e.target.value)}
            className="w-20 accent-[hsl(38,50%,55%)]"
          />
          <span className="text-[hsl(38,50%,60%)] w-4">{chainLength}</span>
        </label>
        <div className="flex items-center gap-1">
          {(["clifford+t", "clifford", "pauli"] as const).map(gs => (
            <button key={gs} onClick={() => setGateSet(gs)}
              className={`text-[10px] font-mono px-2 py-0.5 rounded transition-colors ${
                gateSet === gs
                  ? "bg-[hsla(38,50%,50%,0.2)] text-[hsl(38,50%,65%)]"
                  : "text-[hsl(210,10%,45%)] hover:text-[hsl(210,10%,65%)]"
              }`}
            >
              {gs}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 ml-auto">
          {views.map(v => (
            <button key={v.key} onClick={() => setViewMode(v.key)}
              className={`text-[10px] font-mono px-2 py-0.5 rounded transition-colors ${
                viewMode === v.key
                  ? "bg-[hsla(200,60%,55%,0.2)] text-[hsl(200,70%,65%)]"
                  : "text-[hsl(210,10%,45%)] hover:text-[hsl(210,10%,65%)]"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Diagram area */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {(viewMode === "all" || viewMode === "tree") && (
          <div className="bg-[hsla(210,10%,12%,0.5)] rounded-lg border border-[hsla(210,10%,25%,0.3)] p-3 overflow-x-auto">
            <DecompositionTree decomposition={result.decomposition} />
          </div>
        )}
        {(viewMode === "all" || viewMode === "primitives") && (
          <div className="bg-[hsla(210,10%,12%,0.5)] rounded-lg border border-[hsla(210,10%,25%,0.3)] p-3 overflow-x-auto">
            <PrimitiveSequence decomposition={result.decomposition} />
          </div>
        )}
        {(viewMode === "all" || viewMode === "circuit") && (
          <div className="bg-[hsla(210,10%,12%,0.5)] rounded-lg border border-[hsla(210,10%,25%,0.3)] p-3 overflow-x-auto">
            <GateCircuit gates={result.outputCircuit} stats={result.stats} />
          </div>
        )}
      </div>
    </div>
  );
}
