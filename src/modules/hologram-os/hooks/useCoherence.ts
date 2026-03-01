/**
 * useCoherence — Wave-Coherence UI Primitive
 * ═══════════════════════════════════════════
 *
 * Derives coherence wave state from the kernel's ProjectionFrame.
 * This is the React bridge to the ∂H/∂t gradient field, enabling
 * UI elements to animate toward coherence without managing state.
 *
 * All values are pure projections — no additional React state needed.
 *
 * Usage:
 *   const { h, dh, phase, amplitude } = useCoherence();
 *   // h = current H-score (0–1)
 *   // dh = coherence gradient (-1 to +1)
 *   // phase = breathing cycle position (0–1)
 *   // amplitude = gradient magnitude
 *
 * @module hologram-os/hooks/useCoherence
 */

import { useMemo } from "react";
import { getKernelProjector, type ProjectionFrame, type CoherenceGradient, type ApertureWave, type RewardProjection, type StabilizerProjection, type CircuitProjection } from "../projection-engine";
import { useKernel } from "./useKernel";

export interface CoherenceState {
  /** Current system H-score (0–1) */
  readonly h: number;
  /** Coherence gradient ∂H/∂t: positive = rising, negative = decaying */
  readonly dh: number;
  /** Normalized breathing phase (0–1) */
  readonly phase: number;
  /** Gradient magnitude — how strongly coherence is changing */
  readonly amplitude: number;
  /** Full coherence gradient object */
  readonly gradient: CoherenceGradient;
  /** Aperture wave function */
  readonly wave: ApertureWave;
  /** Per-field coherence contributions */
  readonly contributions: CoherenceGradient["contributions"];
  /** Reward circuit projection — the basal ganglia signal */
  readonly reward: RewardProjection;
  /** Stabilizer syndrome projection — the immune system signal */
  readonly stabilizer: StabilizerProjection;
  /** Circuit compiler projection — the prefrontal cortex pipeline */
  readonly circuit: CircuitProjection;
}

const DEFAULT_GRADIENT: CoherenceGradient = {
  dh: 0,
  amplitude: 0,
  phase: 0,
  contributions: { panels: 0, processes: 0, attention: 0 },
};

const DEFAULT_WAVE: ApertureWave = { center: 0.3, width: 0.3, phase: 0 };

const DEFAULT_REWARD: RewardProjection = {
  ema: 0, cumulative: 0, count: 0, trend: "stable", lastReward: 0, temperature: 1.0,
};

const DEFAULT_STABILIZER: StabilizerProjection = {
  syndromeWeight: 0, health: 1, correctionApplied: false, totalCorrections: 0,
  totalExtractions: 0, fanoViolations: 0, zone: "convergent", errorRate: 0,
};

const DEFAULT_CIRCUIT: CircuitProjection = {
  active: false, gateCount: 0, gatesCompleted: 0, gatesRunning: 0, meanH: 0,
  converged: false, currentGate: "", progress: 0,
  gateCounts: {} as CircuitProjection["gateCounts"],
  totalExecutions: 0, latencyEma: 0,
};

/**
 * useCoherence — read coherence wave state from the kernel.
 * Zero additional state — purely derived from ProjectionFrame.
 */
export function useCoherence(): CoherenceState {
  const { frame } = useKernel();

  return useMemo(() => {
    if (!frame) {
      return {
        h: 0, dh: 0, phase: 0, amplitude: 0,
        gradient: DEFAULT_GRADIENT,
        wave: DEFAULT_WAVE,
        contributions: DEFAULT_GRADIENT.contributions,
        reward: DEFAULT_REWARD,
        stabilizer: DEFAULT_STABILIZER,
        circuit: DEFAULT_CIRCUIT,
      };
    }

    const g = frame.coherenceGradient;
    return {
      h: frame.systemCoherence.meanH,
      dh: g.dh,
      phase: g.phase,
      amplitude: g.amplitude,
      gradient: g,
      wave: frame.apertureWave,
      contributions: g.contributions,
      reward: frame.rewardProjection,
      stabilizer: frame.stabilizerProjection,
      circuit: frame.circuitProjection,
    };
  }, [frame]);
}
