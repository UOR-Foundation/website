/**
 * TriAxisDashboard — Geometric Reasoning Dashboard
 *
 * Phase 6: Visualizes the three reasoning axes as dashboard panels.
 *
 * Layout:
 *   ┌─────────────┬──────────────┬──────────────┐
 *   │  Vertical   │  Horizontal  │   Diagonal   │
 *   │ (Deductive) │ (Inductive)  │ (Abductive)  │
 *   │   ↓ depth   │  → breadth   │  ↗ curvature │
 *   └─────────────┴──────────────┴──────────────┘
 */

import type { ReasoningSession } from "@/modules/ring-core/reason-command";
import { getTriAxisPanels } from "@/modules/ring-core/reason-command";
import type { Panel } from "@/modules/hologram-os/runtime";

interface TriAxisDashboardProps {
  session: ReasoningSession;
}

function AxisColumn({
  title,
  icon,
  mode,
  panels,
  color,
}: {
  title: string;
  icon: string;
  mode: string;
  panels: Panel[];
  color: string;
}) {
  const avg = panels.length > 0
    ? panels.reduce((s, p) => s + p.value, 0) / panels.length
    : 0;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <div>
          <h3 className="text-sm font-semibold text-card-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{mode}</p>
        </div>
      </div>

      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(100, avg * 100)}%`,
            backgroundColor: color,
          }}
        />
      </div>

      <div className="text-xs text-muted-foreground">
        {panels.length} steps · avg {(avg * 100).toFixed(1)}%
      </div>

      {panels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {panels.slice(-6).map((p, i) => (
            <span
              key={`${p.id}-${i}`}
              className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono bg-muted text-muted-foreground"
            >
              {p.label.replace("Step", "").slice(0, 3)} {(p.value * 100).toFixed(0)}%
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TriAxisDashboard({ session }: TriAxisDashboardProps) {
  const { vertical, horizontal, diagonal } = getTriAxisPanels(session);
  const proof = session.proof;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Geometric Reasoning
        </h2>
        {proof && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {proof.state}
            {proof.certificate && " ✓"}
          </span>
        )}
      </div>

      {/* Tri-axis panels */}
      <div className="grid grid-cols-3 gap-2">
        <AxisColumn
          title="Vertical"
          icon="↓"
          mode="Deductive"
          panels={vertical}
          color="hsl(var(--primary))"
        />
        <AxisColumn
          title="Horizontal"
          icon="→"
          mode="Inductive"
          panels={horizontal}
          color="hsl(var(--accent))"
        />
        <AxisColumn
          title="Diagonal"
          icon="↗"
          mode="Abductive"
          panels={diagonal}
          color="hsl(var(--destructive))"
        />
      </div>

      {/* Proof summary */}
      {proof && (
        <div className="text-xs text-muted-foreground border-t border-border pt-2 flex gap-4">
          <span>Fibers: {proof.budget.pinnedCount}/{proof.budget.totalFibers}</span>
          <span>Steps: {proof.steps.length}</span>
          <span>Strategy: {session.strategy}</span>
        </div>
      )}
    </div>
  );
}
