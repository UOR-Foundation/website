/**
 * MirrorWeb — Mirror Coherence Protocol Visualization
 * ════════════════════════════════════════════════════
 *
 * A compact force-directed web showing mirror bonds between agents.
 * Bond lines pulse with empathy strength; nodes glow when collaborative
 * learning is active. Integrates into the ExchangeCard trust surface.
 *
 * 3-6-9 Mapping:
 *   3 — STRUCTURE:  Bond count + node topology (who mirrors whom)
 *   6 — EVOLUTION:  Empathy scores + prediction error (agents learning each other)
 *   9 — COMPLETION: Collaborative mode + shared habits (collective intelligence)
 *
 * @module hologram-ui/components/lumen/MirrorWeb
 */

import { memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { MirrorProjection, MirrorBondEntry } from "@/hologram/kernel/mirror-protocol";

// ── Constants ────────────────────────────────────────────────────────────

const WEB_SIZE = 64;
const CENTER = WEB_SIZE / 2;
const NODE_RADIUS = 4;
const ORBIT_RADIUS = 20;

/** Distribute nodes evenly around the center */
function nodePosition(index: number, total: number): [number, number] {
  const angle = (index / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2;
  return [
    CENTER + ORBIT_RADIUS * Math.cos(angle),
    CENTER + ORBIT_RADIUS * Math.sin(angle),
  ];
}

/** Empathy → color */
function empathyColor(empathy: number, active: boolean): string {
  if (!active) return "hsla(220, 10%, 40%, 0.15)";
  if (empathy >= 0.8) return "hsla(270, 40%, 60%, 0.6)";
  if (empathy >= 0.6) return "hsla(200, 35%, 55%, 0.5)";
  if (empathy >= 0.3) return "hsla(38, 30%, 50%, 0.35)";
  return "hsla(0, 20%, 45%, 0.25)";
}

/** Empathy → stroke width */
function bondWidth(strength: number): number {
  return 0.5 + strength * 2.5;
}

// ── Component ────────────────────────────────────────────────────────────

interface MirrorWebProps {
  projection: MirrorProjection;
  /** Aperture-driven scale (0.5–1.0) */
  scale?: number;
}

function MirrorWebInner({ projection, scale = 1 }: MirrorWebProps) {
  const {
    bondCount,
    activeBonds,
    meanEmpathy,
    totalSharedHabits,
    topBonds,
    collaborativeMode,
    networkCoherence,
  } = projection;

  // Collect unique agent IDs from bonds for node placement
  const { agents, agentPositions } = useMemo(() => {
    const agentSet = new Set<string>();
    for (const bond of topBonds) {
      agentSet.add(bond.agentA);
      agentSet.add(bond.agentB);
    }
    const agents = Array.from(agentSet);
    const positions = new Map<string, [number, number]>();
    agents.forEach((id, i) => {
      positions.set(id, nodePosition(i, agents.length));
    });
    return { agents, agentPositions: positions };
  }, [topBonds]);

  // Bond lines with positions
  const lines = useMemo(() => {
    return topBonds.map(bond => {
      const posA = agentPositions.get(bond.agentA) ?? [CENTER, CENTER];
      const posB = agentPositions.get(bond.agentB) ?? [CENTER, CENTER];
      return { bond, x1: posA[0], y1: posA[1], x2: posB[0], y2: posB[1] };
    });
  }, [topBonds, agentPositions]);

  const scaledSize = WEB_SIZE * scale;

  if (bondCount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2"
      title={`Mirror Protocol: ${bondCount} bonds, ${activeBonds} active, empathy ${(meanEmpathy * 100).toFixed(0)}%`}
    >
      {/* The Web SVG */}
      <motion.svg
        width={scaledSize}
        height={scaledSize}
        viewBox={`0 0 ${WEB_SIZE} ${WEB_SIZE}`}
        className="flex-shrink-0"
        animate={collaborativeMode ? {
          filter: [
            "drop-shadow(0 0 2px hsla(270, 40%, 60%, 0.0))",
            "drop-shadow(0 0 5px hsla(270, 40%, 60%, 0.2))",
            "drop-shadow(0 0 2px hsla(270, 40%, 60%, 0.0))",
          ],
        } : undefined}
        transition={collaborativeMode ? { duration: 3, repeat: Infinity, ease: "easeInOut" } : undefined}
      >
        {/* Bond lines */}
        {lines.map(({ bond, x1, y1, x2, y2 }, i) => (
          <motion.line
            key={`${bond.agentA}-${bond.agentB}`}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={empathyColor(bond.empathy, bond.active)}
            strokeWidth={bondWidth(bond.strength)}
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: i * 0.06 }}
          />
        ))}

        {/* Shared habit indicators (small dots on bond midpoints) */}
        {lines
          .filter(l => l.bond.sharedHabits > 0)
          .map(({ bond, x1, y1, x2, y2 }) => (
            <motion.circle
              key={`sh-${bond.agentA}-${bond.agentB}`}
              cx={(x1 + x2) / 2}
              cy={(y1 + y2) / 2}
              r={1.5}
              fill="hsla(270, 40%, 65%, 0.5)"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          ))
        }

        {/* Agent nodes */}
        {agents.map((id, i) => {
          const [cx, cy] = agentPositions.get(id)!;
          const isSelf = id === "convergence-chat";
          return (
            <g key={id}>
              <motion.circle
                cx={cx} cy={cy}
                r={isSelf ? NODE_RADIUS + 1 : NODE_RADIUS}
                fill={isSelf ? "hsla(270, 30%, 45%, 0.25)" : "hsla(200, 20%, 35%, 0.2)"}
                stroke={isSelf ? "hsla(270, 35%, 55%, 0.4)" : "hsla(200, 15%, 45%, 0.2)"}
                strokeWidth={0.5}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              />
              {/* Label (truncated ID) */}
              <text
                x={cx} y={cy + 0.5}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isSelf ? "hsla(270, 25%, 70%, 0.6)" : "hsla(200, 15%, 60%, 0.35)"}
                fontSize="3"
                fontFamily="system-ui, monospace"
              >
                {isSelf ? "self" : id.slice(0, 3)}
              </text>
            </g>
          );
        })}

        {/* Network coherence center indicator */}
        <circle
          cx={CENTER} cy={CENTER}
          r={2}
          fill={`hsla(270, 30%, 55%, ${Math.max(0.05, networkCoherence * 0.4)})`}
        />
      </motion.svg>

      {/* Compact stats */}
      {scale >= 0.75 && (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span
              className="text-[8px] font-mono tracking-wider"
              style={{ color: "hsla(270, 20%, 60%, 0.5)" }}
            >
              {activeBonds}/{bondCount} bonds
            </span>
            {collaborativeMode && (
              <motion.span
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-[7px]"
                style={{ color: "hsla(270, 35%, 60%, 0.5)" }}
              >
                collab
              </motion.span>
            )}
          </div>
          {totalSharedHabits > 0 && (
            <span
              className="text-[7px] font-mono tracking-wider"
              style={{ color: "hsla(270, 25%, 55%, 0.35)" }}
            >
              {totalSharedHabits} shared · {(meanEmpathy * 100).toFixed(0)}% empathy
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default memo(MirrorWebInner);
