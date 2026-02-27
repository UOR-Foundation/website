/**
 * useVoiceCoherence — Speech Quality Feedback
 * ═════════════════════════════════════════════
 *
 * Analyzes audio level stream to derive real-time speech quality metrics:
 *  - intensity:  Current volume (0-1)
 *  - steadiness: How consistent the volume is (0=erratic, 1=steady)
 *  - pace:       Speaking rate proxy (0=silent/slow, 1=rapid-fire)
 *  - coherence:  Composite score (0=chaotic, 1=harmonious)
 *
 * The coherence score drives a color spectrum:
 *  ≥0.7  → Green-gold  (harmonious, clear)
 *  0.4-0.7 → Amber      (moderate, could slow down)
 *  <0.4  → Warm red    (erratic, needs improvement)
 *
 * @module hologram-ui/hooks/useVoiceCoherence
 */

import { useRef, useCallback, useMemo } from "react";

export interface VoiceCoherenceMetrics {
  intensity: number;
  steadiness: number;
  pace: number;
  coherence: number;
  /** HSL hue for the coherence spectrum (0-150) */
  hue: number;
  /** Human-readable label */
  label: "harmonious" | "moderate" | "erratic" | "silent";
}

const HISTORY_SIZE = 30; // ~0.5s at 60fps
const SILENT_THRESHOLD = 0.02;

export function useVoiceCoherence() {
  const historyRef = useRef<number[]>([]);
  const crossingsRef = useRef(0);
  const prevAboveMeanRef = useRef(false);

  /** Push a new audio level sample and compute metrics */
  const analyze = useCallback((level: number): VoiceCoherenceMetrics => {
    const history = historyRef.current;
    history.push(level);
    if (history.length > HISTORY_SIZE) history.shift();

    // Silent — no speech
    if (level < SILENT_THRESHOLD && history.every(h => h < SILENT_THRESHOLD)) {
      crossingsRef.current = 0;
      return { intensity: 0, steadiness: 1, pace: 0, coherence: 1, hue: 150, label: "silent" };
    }

    const n = history.length;
    const intensity = level;

    // Steadiness: inverse of normalized standard deviation
    const mean = history.reduce((a, b) => a + b, 0) / n;
    const variance = history.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
    const stdDev = Math.sqrt(variance);
    const normalizedStd = mean > 0 ? stdDev / mean : 0;
    const steadiness = Math.max(0, Math.min(1, 1 - normalizedStd * 1.5));

    // Pace: count zero-crossings around the mean (rapid changes = high pace)
    const aboveMean = level > mean;
    if (aboveMean !== prevAboveMeanRef.current) {
      crossingsRef.current++;
    }
    prevAboveMeanRef.current = aboveMean;

    // Normalize crossings per window
    const maxCrossings = HISTORY_SIZE * 0.6;
    const pace = Math.min(1, crossingsRef.current / maxCrossings);

    // Decay crossings over time
    if (history.length >= HISTORY_SIZE) {
      crossingsRef.current = Math.max(0, crossingsRef.current - 0.5);
    }

    // Coherence: weighted blend — steady speech at moderate pace = high coherence
    const pacePenalty = pace > 0.7 ? (pace - 0.7) * 2 : 0; // penalize very rapid speech
    const coherence = Math.max(0, Math.min(1, steadiness * 0.7 + (1 - pacePenalty) * 0.3));

    // Map coherence to hue: 0 (red) → 38 (amber) → 90 (gold) → 150 (green)
    const hue = Math.round(coherence * 150);

    const label: VoiceCoherenceMetrics["label"] =
      coherence >= 0.7 ? "harmonious" :
      coherence >= 0.4 ? "moderate" : "erratic";

    return { intensity, steadiness, pace, coherence, hue, label };
  }, []);

  /** Reset state */
  const reset = useCallback(() => {
    historyRef.current = [];
    crossingsRef.current = 0;
    prevAboveMeanRef.current = false;
  }, []);

  return useMemo(() => ({ analyze, reset }), [analyze, reset]);
}
