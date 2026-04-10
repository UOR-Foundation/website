import { useState, useMemo } from "react";
import { Q0, Q1 } from "@/modules/ring-core/ring";
import { computePartition } from "@/modules/resolver/partition";
import type { PartitionResult, ClosureMode } from "@/modules/resolver/partition";

const QUANTUM_OPTIONS = [
  { label: "Q0 (8-bit)", quantum: 0 },
  { label: "Q1 (16-bit)", quantum: 1 },
] as const;

const CLOSURE_MODES: { label: string; value: ClosureMode }[] = [
  { label: "One Step", value: "oneStep" },
  { label: "Fixed Point", value: "fixedPoint" },
  { label: "Graph Closed", value: "graphClosed" },
];

export function PartitionVisualizer() {
  const [quantumIdx, setQuantumIdx] = useState(0);
  const [closureMode, setClosureMode] = useState<ClosureMode>("oneStep");

  const ring = quantumIdx === 0 ? Q0() : Q1();
  const partition = useMemo(
    () => computePartition(ring, undefined, closureMode),
    [ring.quantum, closureMode]
  );

  const total = partition.units.length + partition.exterior.length +
    partition.irreducible.length + partition.reducible.length;

  const sets = [
    { label: "Units", count: partition.units.length, color: "bg-primary/70" },
    { label: "Exterior", count: partition.exterior.length, color: "bg-muted-foreground/40" },
    { label: "Irreducible", count: partition.irreducible.length, color: "bg-primary/40" },
    { label: "Reducible", count: partition.reducible.length, color: "bg-muted-foreground/20" },
  ];

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="text-sm font-semibold mb-3">Partition Visualizer</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Every element of Z/(2<sup>{ring.bits}</sup>)Z falls into exactly one of four disjoint sets.
      </p>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex gap-1.5">
          {QUANTUM_OPTIONS.map((opt, i) => (
            <button
              key={opt.quantum}
              onClick={() => setQuantumIdx(i)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                quantumIdx === i
                  ? "bg-foreground text-background"
                  : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {CLOSURE_MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setClosureMode(m.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                closureMode === m.value
                  ? "bg-foreground text-background"
                  : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Set bars */}
      <div className="space-y-2 mb-4">
        {sets.map((s) => (
          <div key={s.label} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-20">{s.label}</span>
            <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden relative">
              <div
                className={`h-full ${s.color} rounded-sm transition-all duration-300`}
                style={{ width: `${total > 0 ? (s.count / total) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs font-mono text-foreground w-16 text-right">
              {s.count.toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      {/* Closure verification */}
      <div className="flex items-center gap-2 text-xs">
        <span className={partition.closureVerified ? "text-green-600 font-bold" : "text-destructive font-bold"}>
          {partition.closureVerified ? "✓" : "✗"}
        </span>
        <span className="text-muted-foreground">
          Closure ({closureMode}): {partition.closureVerified ? "verified" : `${partition.closureErrors.length} error(s)`}
        </span>
        <span className="text-muted-foreground">· {total.toLocaleString()} elements total</span>
      </div>
    </div>
  );
}
