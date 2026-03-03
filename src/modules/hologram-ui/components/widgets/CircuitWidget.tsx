/**
 * CircuitWidget — Compact neuro-symbolic pipeline monitor.
 *
 * Shows the circuit compiler's live state: gate progress,
 * mean coherence, convergence status, and execution latency.
 * Connects to the kernel via useCoherence().
 */

import { useCoherence } from "@/modules/hologram-os/hooks/useCoherence";
import type { GateType } from "@/modules/hologram-ui/engine/reasoning";

const GATE_ICONS: Record<GateType, string> = {
  EXTRACT: "⬡",
  CONSTRAIN: "⬢",
  INFER: "◇",
  MEASURE: "△",
  GATE: "⊞",
  COMPOSE: "⊗",
  CERTIFY: "✦",
  REWARD: "♦",
};

const GATE_COLORS: Record<GateType, string> = {
  EXTRACT: "text-primary",
  CONSTRAIN: "text-primary",
  INFER: "text-accent-foreground",
  MEASURE: "text-muted-foreground",
  GATE: "text-primary",
  COMPOSE: "text-accent-foreground",
  CERTIFY: "text-primary",
  REWARD: "text-primary",
};

export function CircuitWidget() {
  const { circuit } = useCoherence();

  if (!circuit.active && circuit.totalExecutions === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2 text-xs text-muted-foreground">
        <span className="font-mono">⊘</span>
        <span>Circuit idle</span>
      </div>
    );
  }

  const progressPct = Math.round(circuit.progress * 100);
  const gradeColor = circuit.meanH >= 0.85 ? "text-primary"
    : circuit.meanH >= 0.7 ? "text-accent-foreground"
    : circuit.meanH >= 0.5 ? "text-muted-foreground"
    : "text-destructive";

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card/60 px-3 py-2 min-w-[160px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
          Circuit
        </span>
        <div className="flex items-center gap-1">
          {circuit.converged && (
            <span className="text-[10px] px-1 py-0.5 rounded bg-primary/10 text-primary font-mono">✓</span>
          )}
          <span className="text-[10px] font-mono text-muted-foreground">
            #{circuit.totalExecutions}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Gate icons row */}
      {circuit.active && (
        <div className="flex gap-0.5 flex-wrap">
          {Object.entries(circuit.gateCounts).map(([type, counts]) => {
            const c = counts as { done: number; total: number };
            return (
            <span
              key={type}
              className={`text-[10px] font-mono ${
                c.done === c.total
                  ? GATE_COLORS[type as GateType]
                  : "text-muted-foreground/40"
              }`}
              title={`${type}: ${c.done}/${c.total}`}
            >
              {GATE_ICONS[type as GateType] ?? "?"}
            </span>
            );
          })}
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className={`font-mono ${gradeColor}`}>
          H:{(circuit.meanH * 100).toFixed(0)}%
        </span>
        <span className="font-mono">
          {circuit.latencyEma.toFixed(1)}ms
        </span>
        <span>
          {circuit.gatesCompleted}/{circuit.gateCount}
        </span>
      </div>
    </div>
  );
}

export default CircuitWidget;
