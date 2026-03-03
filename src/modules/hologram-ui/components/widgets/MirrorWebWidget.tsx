/**
 * MirrorWebWidget — Mirror Coherence Protocol Visualization
 * ══════════════════════════════════════════════════════════
 *
 * Displays agent-to-agent coherence bonds, empathy scores,
 * and shared habit counts as an interconnected web.
 */

import { useMemo } from "react";
import { useCoherence } from "@/modules/hologram-os/hooks/useCoherence";
import type { MirrorBondEntry } from "@/hologram/kernel/agents/mirror-protocol";

export default function MirrorWebWidget() {
  const { mirror } = useCoherence();

  const bonds = mirror.topBonds;
  const hasData = mirror.bondCount > 0;

  // Unique agents for node placement
  const agents = useMemo(() => {
    const set = new Set<string>();
    for (const b of bonds) {
      set.add(b.agentA);
      set.add(b.agentB);
    }
    return Array.from(set);
  }, [bonds]);

  // Place agents in a circle
  const cx = 80, cy = 70, radius = 50;
  const nodePositions = useMemo(() => {
    const map: Record<string, { x: number; y: number }> = {};
    agents.forEach((a, i) => {
      const angle = (2 * Math.PI * i) / Math.max(1, agents.length) - Math.PI / 2;
      map[a] = {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      };
    });
    return map;
  }, [agents]);

  const empathyColor = (e: number) => {
    if (e >= 0.7) return "hsl(var(--primary))";
    if (e >= 0.5) return "hsl(38, 40%, 62%)";
    return "hsl(var(--muted-foreground))";
  };

  return (
    <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-3 w-full max-w-[220px] select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">
          Mirror Web
        </span>
        <span className={`text-[10px] font-mono ${mirror.collaborativeMode ? "text-primary" : "text-muted-foreground"}`}>
          {mirror.collaborativeMode ? "COLLAB" : "SOLO"}
        </span>
      </div>

      {/* SVG Web */}
      <svg viewBox="0 0 160 140" className="w-full h-auto mb-2">
        {/* Bonds as lines */}
        {bonds.map((bond, i) => {
          const a = nodePositions[bond.agentA];
          const b = nodePositions[bond.agentB];
          if (!a || !b) return null;
          return (
            <line
              key={i}
              x1={a.x} y1={a.y}
              x2={b.x} y2={b.y}
              stroke={empathyColor(bond.empathy)}
              strokeWidth={1 + bond.strength * 2}
              strokeOpacity={bond.active ? 0.7 : 0.2}
              strokeDasharray={bond.active ? undefined : "3,3"}
            />
          );
        })}

        {/* Agent nodes */}
        {agents.map((agent, i) => {
          const pos = nodePositions[agent];
          if (!pos) return null;
          const shortLabel = agent.length > 8 ? agent.slice(-6) : agent;
          return (
            <g key={agent}>
              <circle
                cx={pos.x} cy={pos.y} r={6}
                fill="hsl(var(--primary) / 0.2)"
                stroke="hsl(var(--primary))"
                strokeWidth={1.5}
              />
              <text
                x={pos.x} y={pos.y + 14}
                textAnchor="middle"
                className="fill-muted-foreground"
                style={{ fontSize: "6px", fontFamily: "monospace" }}
              >
                {shortLabel}
              </text>
            </g>
          );
        })}

        {/* Center stats */}
        <text
          x={cx} y={cy - 4}
          textAnchor="middle"
          className="fill-foreground"
          style={{ fontSize: "12px", fontWeight: 700, fontFamily: "monospace" }}
        >
          {mirror.meanEmpathy.toFixed(2)}
        </text>
        <text
          x={cx} y={cy + 8}
          textAnchor="middle"
          className="fill-muted-foreground"
          style={{ fontSize: "6px", fontFamily: "monospace" }}
        >
          empathy
        </text>
      </svg>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-1 text-center">
        <div>
          <div className="text-[11px] font-mono font-bold text-foreground">{mirror.bondCount}</div>
          <div className="text-[7px] text-muted-foreground uppercase">bonds</div>
        </div>
        <div>
          <div className="text-[11px] font-mono font-bold text-foreground">{mirror.activeBonds}</div>
          <div className="text-[7px] text-muted-foreground uppercase">active</div>
        </div>
        <div>
          <div className="text-[11px] font-mono font-bold text-foreground">{mirror.totalSharedHabits}</div>
          <div className="text-[7px] text-muted-foreground uppercase">shared</div>
        </div>
      </div>

      {/* Network coherence bar */}
      <div className="mt-2">
        <div className="flex justify-between text-[7px] text-muted-foreground mb-0.5">
          <span>Network H</span>
          <span>{mirror.networkCoherence.toFixed(3)}</span>
        </div>
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${Math.min(100, mirror.networkCoherence * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
