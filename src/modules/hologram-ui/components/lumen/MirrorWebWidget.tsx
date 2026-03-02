/**
 * MirrorWebWidget — Inter-agent coherence visualization
 * ═════════════════════════════════════════════════════════
 *
 * Shows mirror bonds between agents with:
 *   • Force-directed mini graph of agent nodes + bond lines
 *   • Empathy scores and bond status indicators
 *   • Shared habit counts per bond
 *   • Scan button to trigger mirror observation cycle
 *
 * @module hologram-ui/components/lumen/MirrorWebWidget
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, Link2, Sparkles, RotateCw,
  ChevronDown, ChevronUp, Share2,
} from "lucide-react";
import { PP } from "@/modules/hologram-ui/theme/portal-palette";
import {
  getMirrorBonds,
  runMirrorCycle,
  type MirrorBond,
  type MirrorWebStats,
} from "@/modules/hologram-ui/engines/MirrorProtocolEngine";

const ORGANIC_EASE = [0.23, 1, 0.32, 1] as const;

const STATUS_COLORS: Record<string, string> = {
  observing: "hsl(0, 0%, 50%)",
  mirroring: "hsl(200, 45%, 60%)",
  bonded:    "hsl(38, 50%, 65%)",
};

const STATUS_LABELS: Record<string, string> = {
  observing: "Observing",
  mirroring: "Mirroring",
  bonded:    "Bonded",
};

export default function MirrorWebWidget() {
  const [bonds, setBonds] = useState<MirrorBond[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchBonds = useCallback(async () => {
    const data = await getMirrorBonds();
    setBonds(data);
    setLoading(false);
  }, []);

  const runScan = useCallback(async () => {
    setScanning(true);
    const result = await runMirrorCycle();
    setBonds(await getMirrorBonds());
    setScanning(false);
  }, []);

  useEffect(() => {
    fetchBonds();
  }, [fetchBonds]);

  const activeBonds = bonds.filter(b => b.status !== "observing");
  const avgEmpathy = bonds.length > 0
    ? bonds.reduce((s, b) => s + b.empathyScore, 0) / bonds.length
    : 0;
  const totalShared = bonds.reduce((s, b) => s + b.sharedHabitCount, 0);

  // Mini graph SVG
  const graphSize = 140;
  const cx = graphSize / 2;
  const cy = graphSize / 2;
  const nodeRadius = 8;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ease: ORGANIC_EASE }}
      className="mx-4 rounded-xl overflow-hidden"
      style={{
        background: PP.canvasSubtle,
        border: `1px solid ${PP.bloomCardBorder}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4" strokeWidth={1.5} style={{ color: PP.accent }} />
          <span
            style={{
              fontFamily: PP.font,
              fontSize: "12px",
              fontWeight: 600,
              color: PP.text,
              letterSpacing: "0.02em",
            }}
          >
            Mirror Protocol
          </span>
          <span
            className="px-1.5 py-0.5 rounded-md"
            style={{
              fontFamily: PP.font,
              fontSize: "9px",
              fontWeight: 500,
              color: PP.accent,
              background: `${PP.accent}12`,
              letterSpacing: "0.06em",
            }}
          >
            {activeBonds.length} ACTIVE
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={runScan}
            disabled={scanning}
            className="p-1.5 rounded-lg active:scale-90 transition-transform"
            style={{ background: `${PP.accent}08` }}
            title="Run mirror observation cycle"
          >
            <RotateCw
              className={`w-3.5 h-3.5 ${scanning ? "animate-spin" : ""}`}
              strokeWidth={1.5}
              style={{ color: PP.accent, opacity: 0.7 }}
            />
          </button>
          <button
            onClick={() => setExpanded(p => !p)}
            className="p-1.5 rounded-lg active:scale-90 transition-transform"
            style={{ background: `${PP.accent}08` }}
          >
            {expanded
              ? <ChevronUp className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: PP.textWhisper }} />
              : <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: PP.textWhisper }} />
            }
          </button>
        </div>
      </div>

      {/* Mini Graph + Stats */}
      <div className="flex items-center gap-4 px-4 pb-3">
        {/* SVG mini graph */}
        <div className="shrink-0" style={{ width: graphSize, height: graphSize }}>
          <svg width={graphSize} height={graphSize} viewBox={`0 0 ${graphSize} ${graphSize}`}>
            {/* Center node (self) */}
            <circle cx={cx} cy={cy} r={nodeRadius + 2} fill={`${PP.accent}20`} />
            <circle cx={cx} cy={cy} r={nodeRadius} fill={PP.accent} opacity={0.8} />
            <text
              x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="central"
              fill={PP.canvas} fontSize="7" fontWeight="700" fontFamily={PP.font}
            >
              S
            </text>

            {/* Bond nodes arranged in a circle */}
            {bonds.slice(0, 6).map((bond, i) => {
              const angle = (i / Math.min(bonds.length, 6)) * Math.PI * 2 - Math.PI / 2;
              const dist = 45;
              const nx = cx + Math.cos(angle) * dist;
              const ny = cy + Math.sin(angle) * dist;
              const color = STATUS_COLORS[bond.status] || STATUS_COLORS.observing;

              return (
                <g key={bond.id}>
                  {/* Bond line */}
                  <motion.line
                    x1={cx} y1={cy} x2={nx} y2={ny}
                    stroke={color}
                    strokeWidth={1 + bond.bondStrength * 2}
                    strokeDasharray={bond.status === "observing" ? "3,3" : "none"}
                    opacity={0.4 + bond.empathyScore * 0.5}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: i * 0.08, duration: 0.5 }}
                  />
                  {/* Node */}
                  <motion.circle
                    cx={nx} cy={ny} r={6}
                    fill={color}
                    opacity={0.7}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.08 + 0.2, type: "spring", stiffness: 300 }}
                  />
                  {/* Empathy label */}
                  <text
                    x={nx} y={ny + 14} textAnchor="middle"
                    fill={PP.textWhisper} fontSize="7" fontFamily={PP.font}
                  >
                    {(bond.empathyScore * 100).toFixed(0)}%
                  </text>
                </g>
              );
            })}

            {bonds.length === 0 && (
              <text
                x={cx} y={cy + 28} textAnchor="middle"
                fill={PP.textWhisper} fontSize="8" fontFamily={PP.font}
              >
                No bonds yet
              </text>
            )}
          </svg>
        </div>

        {/* Stats column */}
        <div className="flex-1 space-y-2.5">
          <StatRow
            icon={<Link2 className="w-3 h-3" strokeWidth={1.5} />}
            label="Bonds"
            value={`${activeBonds.length}/${bonds.length}`}
          />
          <StatRow
            icon={<Eye className="w-3 h-3" strokeWidth={1.5} />}
            label="Avg empathy"
            value={`${(avgEmpathy * 100).toFixed(0)}%`}
          />
          <StatRow
            icon={<Share2 className="w-3 h-3" strokeWidth={1.5} />}
            label="Shared habits"
            value={totalShared.toString()}
          />
          <StatRow
            icon={<Sparkles className="w-3 h-3" strokeWidth={1.5} />}
            label="Strongest"
            value={bonds[0]
              ? `${(bonds[0].empathyScore * 100).toFixed(0)}%`
              : "—"
            }
          />
        </div>
      </div>

      {/* Expanded bond list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ ease: ORGANIC_EASE }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-2">
              {bonds.length === 0 && (
                <p
                  className="text-center py-4"
                  style={{ fontFamily: PP.font, fontSize: "12px", color: PP.textWhisper }}
                >
                  No mirror bonds detected. Use the scan button to observe neighboring agents.
                </p>
              )}
              {bonds.map((bond, i) => {
                const color = STATUS_COLORS[bond.status] || STATUS_COLORS.observing;
                return (
                  <motion.div
                    key={bond.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, ease: ORGANIC_EASE }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{
                      background: `${color}08`,
                      border: `1px solid ${color}15`,
                    }}
                  >
                    <div
                      className="w-1 self-stretch rounded-full"
                      style={{ background: color, opacity: 0.5 }}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className="truncate"
                        style={{ fontFamily: PP.font, fontSize: "12px", fontWeight: 500, color: PP.text }}
                      >
                        {bond.targetAgentId}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span style={{ fontFamily: PP.font, fontSize: "10px", color: PP.textWhisper }}>
                          {STATUS_LABELS[bond.status]} · {bond.interactionCount} interactions
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span
                        className="px-1.5 py-0.5 rounded text-center"
                        style={{
                          fontFamily: PP.font,
                          fontSize: "9px",
                          fontWeight: 600,
                          color,
                          background: `${color}12`,
                          minWidth: 36,
                        }}
                      >
                        {(bond.empathyScore * 100).toFixed(0)}% emp
                      </span>
                      {bond.sharedHabitCount > 0 && (
                        <span style={{ fontFamily: PP.font, fontSize: "9px", color: PP.textWhisper }}>
                          {bond.sharedHabitCount} shared
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <div style={{ color: PP.accent, opacity: 0.6 }}>{icon}</div>
      <span style={{ fontFamily: PP.font, fontSize: "11px", color: PP.textWhisper, flex: 1 }}>{label}</span>
      <span style={{ fontFamily: PP.font, fontSize: "12px", fontWeight: 600, color: PP.text }}>{value}</span>
    </div>
  );
}
