/**
 * StratumVisualizer — Real-Time Ring Histogram
 * ═══════════════════════════════════════════════════════════════════
 *
 * Renders the HarmonicLens output as an animated stratum histogram.
 * 17 vertical bars (bins 0-16) showing energy distribution across
 * the ring's Hamming weight spectrum.
 *
 * The visualization IS the UOR analysis — not a decoration, but
 * a direct projection of ring arithmetic applied to audio.
 *
 * @module hologram-ui/components/StratumVisualizer
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HarmonicLens, type HarmonicLensFrame } from "@/modules/audio/lenses/harmonic-lens";
import { getAudioEngine } from "@/modules/audio";

// ── Palette ────────────────────────────────────────────────────────────────
const VP = {
  surface: "hsla(25, 10%, 8%, 0.95)",
  border: "hsla(38, 15%, 30%, 0.2)",
  text: "hsl(38, 20%, 85%)",
  textDim: "hsl(30, 10%, 50%)",
  font: "'DM Sans', sans-serif",
} as const;

// Bin labels for the 17 stratum levels
const BIN_LABELS = [
  "0", "1", "2", "3", "4", "5", "6", "7", "8",
  "9", "10", "11", "12", "13", "14", "15", "16",
];

// Color gradient: low stratum (cool/sparse) → high stratum (warm/dense)
function binColor(bin: number, hue: string, intensity: number): string {
  const saturation = 30 + intensity * 30;
  const lightness = 35 + intensity * 25;
  const alpha = 0.4 + intensity * 0.5;
  // Shift hue slightly per bin for depth
  const hueShift = (bin - 8) * 3;
  return `hsla(${parseInt(hue) + hueShift}, ${saturation}%, ${lightness}%, ${alpha})`;
}

function binGlow(bin: number, hue: string, intensity: number): string {
  const hueShift = (bin - 8) * 3;
  return `0 0 ${Math.round(intensity * 8)}px hsla(${parseInt(hue) + hueShift}, 50%, 55%, ${intensity * 0.3})`;
}

interface StratumVisualizerProps {
  /** Whether audio is currently playing. */
  playing: boolean;
  /** Station accent hue for coloring. */
  stationHue: string;
  /** Whether the visualizer panel is visible. */
  visible: boolean;
  /** Callback fired with each analyzed frame (for downstream lenses). */
  onFrame?: (frame: HarmonicLensFrame) => void;
}

export default function StratumVisualizer({ playing, stationHue, visible, onFrame }: StratumVisualizerProps) {
  const lensRef = useRef<HarmonicLens | null>(null);
  const rafRef = useRef<number>(0);
  const [frame, setFrame] = useState<HarmonicLensFrame | null>(null);
  const [isReal, setIsReal] = useState(false);
  const connectedRef = useRef(false);

  // Connect lens to audio engine
  const connectLens = useCallback(() => {
    if (connectedRef.current) return;
    const engine = getAudioEngine();
    const audio = engine.getAudioElement();
    const lens = new HarmonicLens();
    const success = lens.connect(audio);
    if (success) {
      lens.resume();
      lensRef.current = lens;
      connectedRef.current = true;
    }
  }, []);

  // Animation loop
  useEffect(() => {
    if (!visible || !playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    connectLens();

    const tick = () => {
      const lens = lensRef.current;
      if (lens) {
        const f = lens.read();
        setFrame(f);
        setIsReal(lens.isRealData);
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    // Throttle to ~30fps for performance
    let lastTime = 0;
    const throttledTick = () => {
      const now = performance.now();
      if (now - lastTime >= 33) {
        lastTime = now;
        const lens = lensRef.current;
        if (lens) {
        const f = lens.read();
          setFrame(f);
          setIsReal(lens.isRealData);
          onFrame?.(f);
        }
      }
      rafRef.current = requestAnimationFrame(throttledTick);
    };

    rafRef.current = requestAnimationFrame(throttledTick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [visible, playing, connectLens]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lensRef.current?.disconnect();
      connectedRef.current = false;
    };
  }, []);

  if (!frame) return null;

  const maxCount = Math.max(...frame.stratumHistogram, 1);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          style={{
            borderTop: `1px solid ${VP.border}`,
            overflow: "hidden",
          }}
        >
          <div className="px-3 pt-3 pb-2">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-[10px] tracking-[0.16em] uppercase"
                style={{ color: VP.textDim, fontFamily: VP.font }}
              >
                Stratum Histogram
              </span>
              <span
                className="text-[9px] tracking-wide"
                style={{ color: VP.textDim, fontFamily: VP.font }}
              >
                {isReal ? "LIVE" : "MODELED"}
              </span>
            </div>

            {/* Histogram Bars */}
            <div
              className="flex items-end gap-[2px] justify-between"
              style={{ height: 72 }}
            >
              {frame.stratumHistogram.map((count, bin) => {
                const intensity = count / maxCount;
                const barHeight = Math.max(2, intensity * 68);
                return (
                  <div
                    key={bin}
                    className="flex-1 flex flex-col items-center gap-0.5"
                  >
                    <div
                      className="w-full rounded-t-sm transition-all duration-75"
                      style={{
                        height: barHeight,
                        minHeight: 2,
                        background: binColor(bin, stationHue, intensity),
                        boxShadow: intensity > 0.5 ? binGlow(bin, stationHue, intensity) : "none",
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Bin Labels (sparse) */}
            <div className="flex justify-between mt-1 px-0">
              {BIN_LABELS.map((label, i) => (
                <span
                  key={i}
                  className="text-[7px] text-center flex-1"
                  style={{
                    color: VP.textDim,
                    fontFamily: VP.font,
                    opacity: i % 4 === 0 ? 1 : 0.4,
                  }}
                >
                  {i % 4 === 0 ? label : ""}
                </span>
              ))}
            </div>

            {/* Metrics Row */}
            <div
              className="flex items-center justify-between mt-2 pt-2"
              style={{ borderTop: `1px solid ${VP.border}` }}
            >
              <Metric label="μ stratum" value={frame.meanStratum.toFixed(1)} />
              <Metric label="energy" value={(frame.rmsEnergy * 100).toFixed(0) + "%"} />
              <Metric label="centroid" value={`bin ${frame.centroidBin}`} />
              <Metric
                label="κ curvature"
                value={frame.curvature.toFixed(3)}
                highlight={frame.curvature > 0.1}
                hue={stationHue}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Metric Chip ────────────────────────────────────────────────────────────
function Metric({
  label,
  value,
  highlight = false,
  hue = "38",
}: {
  label: string;
  value: string;
  highlight?: boolean;
  hue?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className="text-[10px] tabular-nums font-medium"
        style={{
          color: highlight ? `hsl(${hue}, 60%, 60%)` : VP.text,
          fontFamily: VP.font,
          transition: "color 150ms",
        }}
      >
        {value}
      </span>
      <span
        className="text-[8px] tracking-wider uppercase"
        style={{ color: VP.textDim, fontFamily: VP.font }}
      >
        {label}
      </span>
    </div>
  );
}
