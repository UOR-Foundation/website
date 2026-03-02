/**
 * ConvergenceDashboard — Unified view of all Quantum-AI phases
 * ══════════════════════════════════════════════════════════════
 *
 * Six phase cards in a biological-mathematical symmetry:
 *   Phase 1: Reward Circuit (Basal Ganglia)
 *   Phase 2: Stabilizer Engine (Immune System)
 *   Phase 3: Circuit Compiler (Corpus Callosum)
 *   Phase 4: Multi-Kernel Compositor (Supervisor)
 *   Phase 5: Procedural Memory (Cerebellum)
 *   Phase 6: Mirror Protocol (Mirror Neurons)
 *
 * Each card shows live aggregate metrics pulled from the database.
 *
 * @module hologram-ui/components/lumen/ConvergenceDashboard
 */

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Activity, Shield, Cpu, Layers, Zap, Eye,
  RefreshCw, TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PP } from "@/modules/hologram-ui/theme/portal-palette";

const ORGANIC_EASE = [0.23, 1, 0.32, 1] as const;

// ── Phase definitions ───────────────────────────────────────────

interface PhaseData {
  id: string;
  phase: number;
  name: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  metrics: { label: string; value: string }[];
  health: number; // 0-1
}

// ── Component ────────────────────────────────────────────────────

export default function ConvergenceDashboard() {
  const [phases, setPhases] = useState<PhaseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    const [
      { data: rewardTraces },
      { data: habits },
      { data: mirrors },
      { data: proofs },
      { data: sessions },
      { data: compressions },
    ] = await Promise.all([
      supabase.from("reward_traces").select("reward, epistemic_grade, cumulative_reward").order("created_at", { ascending: false }).limit(100),
      supabase.from("habit_kernels").select("status, fire_count, success_rate, total_time_saved_ms, acceleration_factor").limit(50),
      supabase.from("mirror_bonds").select("status, empathy_score, shared_habit_count, bond_strength, interaction_count").limit(50),
      supabase.from("reasoning_proofs").select("converged, iterations, overall_grade, final_curvature").order("created_at", { ascending: false }).limit(50),
      supabase.from("agent_session_chains").select("h_score, zone, observer_phi, memory_count").order("created_at", { ascending: false }).limit(20),
      supabase.from("agent_compression_witnesses").select("information_loss_ratio, morphism_type").limit(50),
    ]);

    const rt = rewardTraces ?? [];
    const hk = habits ?? [];
    const mb = mirrors ?? [];
    const rp = proofs ?? [];
    const sc = sessions ?? [];
    const cw = compressions ?? [];

    // Phase 1 — Reward Circuit
    const avgReward = rt.length > 0 ? rt.reduce((s, r) => s + Number(r.reward), 0) / rt.length : 0;
    const cumReward = rt.length > 0 ? Number(rt[0]?.cumulative_reward ?? 0) : 0;
    const gradeA = rt.filter(r => r.epistemic_grade === "A").length;

    // Phase 2 — Stabilizer Engine (syndrome checks from proofs)
    const convergedCount = rp.filter(p => p.converged).length;
    const avgCurvature = rp.length > 0 ? rp.reduce((s, p) => s + Number(p.final_curvature), 0) / rp.length : 0;

    // Phase 3 — Circuit Compiler
    const totalIterations = rp.reduce((s, p) => s + (p.iterations ?? 0), 0);
    const avgIterations = rp.length > 0 ? totalIterations / rp.length : 0;

    // Phase 4 — Multi-Kernel Compositor
    const avgH = sc.length > 0 ? sc.reduce((s, c) => s + Number(c.h_score), 0) / sc.length : 0;
    const avgPhi = sc.length > 0 ? sc.reduce((s, c) => s + Number(c.observer_phi), 0) / sc.length : 0;
    const totalMemories = sc.reduce((s, c) => s + (c.memory_count ?? 0), 0);

    // Phase 5 — Procedural Memory
    const activeHabits = hk.filter(h => h.status === "active").length;
    const totalFires = hk.reduce((s, h) => s + (h.fire_count ?? 0), 0);
    const totalTimeSaved = hk.reduce((s, h) => s + (h.total_time_saved_ms ?? 0), 0);
    const avgAccel = hk.length > 0 ? hk.reduce((s, h) => s + Number(h.acceleration_factor ?? 1), 0) / hk.length : 1;

    // Phase 6 — Mirror Protocol
    const activeBonds = mb.filter(m => m.status !== "observing").length;
    const avgEmpathy = mb.length > 0 ? mb.reduce((s, m) => s + Number(m.empathy_score), 0) / mb.length : 0;
    const totalShared = mb.reduce((s, m) => s + (m.shared_habit_count ?? 0), 0);

    setPhases([
      {
        id: "reward",
        phase: 1,
        name: "Reward Circuit",
        subtitle: "Basal Ganglia",
        icon: Activity,
        color: "hsl(38, 55%, 55%)",
        health: Math.min(1, avgReward * 2),
        metrics: [
          { label: "Avg Reward", value: avgReward.toFixed(3) },
          { label: "Cumulative", value: cumReward.toFixed(1) },
          { label: "Grade A", value: `${gradeA}/${rt.length}` },
          { label: "Traces", value: rt.length.toString() },
        ],
      },
      {
        id: "stabilizer",
        phase: 2,
        name: "Stabilizer Engine",
        subtitle: "Immune System",
        icon: Shield,
        color: "hsl(200, 50%, 55%)",
        health: rp.length > 0 ? convergedCount / rp.length : 0,
        metrics: [
          { label: "Converged", value: `${convergedCount}/${rp.length}` },
          { label: "Avg Curvature", value: avgCurvature.toFixed(4) },
          { label: "Compressions", value: cw.length.toString() },
          { label: "Loss Ratio", value: cw.length > 0 ? (cw.reduce((s, c) => s + Number(c.information_loss_ratio), 0) / cw.length).toFixed(3) : "—" },
        ],
      },
      {
        id: "compiler",
        phase: 3,
        name: "Circuit Compiler",
        subtitle: "Corpus Callosum",
        icon: Cpu,
        color: "hsl(280, 45%, 60%)",
        health: Math.min(1, rp.length > 0 ? convergedCount / rp.length : 0),
        metrics: [
          { label: "Proofs", value: rp.length.toString() },
          { label: "Avg Iters", value: avgIterations.toFixed(1) },
          { label: "Total Iters", value: totalIterations.toString() },
          { label: "Top Grade", value: rp.length > 0 ? rp.reduce((best, p) => p.overall_grade < best ? p.overall_grade : best, "D") : "—" },
        ],
      },
      {
        id: "compositor",
        phase: 4,
        name: "Multi-Kernel",
        subtitle: "Supervisor",
        icon: Layers,
        color: "hsl(160, 45%, 50%)",
        health: Math.min(1, avgH),
        metrics: [
          { label: "Avg H-Score", value: avgH.toFixed(3) },
          { label: "Avg φ", value: avgPhi.toFixed(2) },
          { label: "Sessions", value: sc.length.toString() },
          { label: "Memories", value: totalMemories.toString() },
        ],
      },
      {
        id: "procedural",
        phase: 5,
        name: "Procedural Memory",
        subtitle: "Cerebellum",
        icon: Zap,
        color: "hsl(45, 60%, 55%)",
        health: Math.min(1, activeHabits / Math.max(1, hk.length)),
        metrics: [
          { label: "Active", value: `${activeHabits}/${hk.length}` },
          { label: "Fires", value: totalFires.toString() },
          { label: "Time Saved", value: totalTimeSaved < 1000 ? `${totalTimeSaved}ms` : `${(totalTimeSaved / 1000).toFixed(1)}s` },
          { label: "Accel", value: `${((avgAccel - 1) * 100).toFixed(0)}%` },
        ],
      },
      {
        id: "mirror",
        phase: 6,
        name: "Mirror Protocol",
        subtitle: "Mirror Neurons",
        icon: Eye,
        color: "hsl(320, 40%, 60%)",
        health: avgEmpathy,
        metrics: [
          { label: "Bonds", value: `${activeBonds}/${mb.length}` },
          { label: "Avg Empathy", value: `${(avgEmpathy * 100).toFixed(0)}%` },
          { label: "Shared", value: totalShared.toString() },
          { label: "Interactions", value: mb.reduce((s, m) => s + (m.interaction_count ?? 0), 0).toString() },
        ],
      },
    ]);

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  // Overall convergence score
  const overallHealth = phases.length > 0
    ? phases.reduce((s, p) => s + p.health, 0) / phases.length
    : 0;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto py-3 gap-3">
      {/* Header */}
      <div className="flex items-center justify-between mx-4 mb-1">
        <div>
          <h2
            style={{
              fontFamily: PP.fontDisplay,
              fontSize: "18px",
              fontWeight: 600,
              color: PP.text,
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
            }}
          >
            Convergence
          </h2>
          <p
            style={{
              fontFamily: PP.font,
              fontSize: "11px",
              color: PP.textWhisper,
              marginTop: 2,
            }}
          >
            Quantum-AI Phase Dashboard
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Overall health indicator */}
          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: overallHealth > 0.5
                  ? "hsl(140, 50%, 50%)"
                  : overallHealth > 0.2
                    ? "hsl(45, 60%, 55%)"
                    : "hsl(0, 50%, 55%)",
                boxShadow: `0 0 6px ${overallHealth > 0.5 ? "hsl(140, 50%, 50%)" : "hsl(45, 60%, 55%)"}40`,
              }}
            />
            <span
              style={{
                fontFamily: PP.font,
                fontSize: "12px",
                fontWeight: 600,
                color: PP.text,
              }}
            >
              {(overallHealth * 100).toFixed(0)}%
            </span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1.5 rounded-lg active:scale-90 transition-transform"
            style={{ background: `${PP.accent}08` }}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
              strokeWidth={1.5}
              style={{ color: PP.accent, opacity: 0.7 }}
            />
          </button>
        </div>
      </div>

      {/* Convergence Arc — overall progress bar */}
      <div className="mx-4">
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: `${PP.accent}12` }}
        >
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${overallHealth * 100}%` }}
            transition={{ duration: 1, ease: ORGANIC_EASE }}
            style={{
              background: `linear-gradient(90deg, hsl(200, 50%, 55%), ${PP.accent}, hsl(320, 40%, 60%))`,
            }}
          />
        </div>
      </div>

      {/* Phase Cards Grid */}
      <div className="grid grid-cols-2 gap-2.5 mx-4">
        {phases.map((phase, i) => (
          <PhaseCard key={phase.id} phase={phase} index={i} />
        ))}
      </div>

      {/* Architecture note */}
      <div
        className="mx-4 mt-1 rounded-xl px-4 py-3"
        style={{
          background: PP.canvasSubtle,
          border: `1px solid ${PP.bloomCardBorder}`,
        }}
      >
        <p
          style={{
            fontFamily: PP.font,
            fontSize: "10px",
            color: PP.textWhisper,
            lineHeight: 1.6,
          }}
        >
          <span style={{ color: PP.accent, fontWeight: 600 }}>Biological symmetry</span>
          {" "}— Each phase maps to a neural subsystem: basal ganglia reward
          signals, immune-system stabilizers, corpus callosum circuit compilation,
          supervisory kernel composition, cerebellar habit acceleration, and
          mirror-neuron empathy bonds. Together they form a self-verifiable
          reasoning substrate.
        </p>
      </div>
    </div>
  );
}

// ── Phase Card ──────────────────────────────────────────────────

function PhaseCard({ phase, index }: { phase: PhaseData; index: number }) {
  const Icon = phase.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, ease: ORGANIC_EASE }}
      className="rounded-xl overflow-hidden"
      style={{
        background: PP.canvasSubtle,
        border: `1px solid ${PP.bloomCardBorder}`,
      }}
    >
      {/* Health bar */}
      <div
        className="h-0.5"
        style={{ background: `${phase.color}15` }}
      >
        <motion.div
          className="h-full"
          initial={{ width: 0 }}
          animate={{ width: `${phase.health * 100}%` }}
          transition={{ delay: index * 0.06 + 0.3, duration: 0.6, ease: ORGANIC_EASE }}
          style={{ background: phase.color }}
        />
      </div>

      <div className="px-3 py-2.5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: `${phase.color}15` }}
          >
            <Icon className="w-3 h-3" strokeWidth={1.8} style={{ color: phase.color }} />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="truncate"
              style={{
                fontFamily: PP.font,
                fontSize: "11px",
                fontWeight: 600,
                color: PP.text,
                lineHeight: 1.2,
              }}
            >
              {phase.name}
            </p>
            <p
              style={{
                fontFamily: PP.font,
                fontSize: "8px",
                color: PP.textWhisper,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {phase.subtitle}
            </p>
          </div>
          <span
            className="shrink-0 px-1 py-0.5 rounded"
            style={{
              fontFamily: PP.font,
              fontSize: "8px",
              fontWeight: 600,
              color: phase.color,
              background: `${phase.color}12`,
            }}
          >
            P{phase.phase}
          </span>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          {phase.metrics.map((m) => (
            <div key={m.label} className="flex items-baseline justify-between gap-1">
              <span
                style={{
                  fontFamily: PP.font,
                  fontSize: "9px",
                  color: PP.textWhisper,
                }}
              >
                {m.label}
              </span>
              <span
                style={{
                  fontFamily: PP.font,
                  fontSize: "10px",
                  fontWeight: 600,
                  color: PP.text,
                }}
              >
                {m.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
