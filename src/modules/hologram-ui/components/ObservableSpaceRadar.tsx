/**
 * ObservableSpaceRadar — 7-Axis UOR Metric Radar Chart
 * ═══════════════════════════════════════════════════════════════════
 *
 * Displays all 7 UOR observable metrics as a real-time heptagonal
 * radar chart, computed from each HarmonicLensFrame:
 *
 *   1. RingMetric      — geodesic distance (frame value to prev)
 *   2. HammingMetric   — bit-level popcount distance
 *   3. CascadeLength   — succ-step traversal cost
 *   4. CatastropheThreshold — proximity to structural collapse
 *   5. Curvature       — discrete partition curvature
 *   6. Holonomy        — phase accumulation (running)
 *   7. Commutator      — non-commutativity measure
 *
 * @module hologram-ui/components/ObservableSpaceRadar
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Orbit } from "lucide-react";
import type { HarmonicLensFrame } from "@/modules/audio/lenses/harmonic-lens";

const VP = {
  border: "hsla(38, 15%, 30%, 0.2)",
  text: "hsl(38, 20%, 85%)",
  textDim: "hsl(30, 10%, 50%)",
  font: "'DM Sans', sans-serif",
} as const;

const SIZE = 160;
const CENTER = SIZE / 2;
const RADIUS = 58;

/** The 7 UOR observable metrics as radar axes. */
const AXES = [
  { label: "Ring",        angle: 0 },
  { label: "Hamming",     angle: (2 * Math.PI) / 7 },
  { label: "Cascade",     angle: (4 * Math.PI) / 7 },
  { label: "Catastrophe", angle: (6 * Math.PI) / 7 },
  { label: "Curvature",   angle: (8 * Math.PI) / 7 },
  { label: "Holonomy",    angle: (10 * Math.PI) / 7 },
  { label: "Commutator",  angle: (12 * Math.PI) / 7 },
];

function axisPoint(index: number, value: number): { x: number; y: number } {
  const a = AXES[index].angle - Math.PI / 2; // rotate so first axis is top
  return {
    x: CENTER + Math.cos(a) * RADIUS * value,
    y: CENTER + Math.sin(a) * RADIUS * value,
  };
}

/** Popcount for 8-bit XOR distance. */
function popcount8(n: number): number {
  let c = 0;
  let v = n & 0xff;
  while (v) { c += v & 1; v >>= 1; }
  return c;
}

interface MetricValues {
  ring: number;
  hamming: number;
  cascade: number;
  catastrophe: number;
  curvature: number;
  holonomy: number;
  commutator: number;
}

interface ObservableSpaceRadarProps {
  visible: boolean;
  stationHue: string;
  frame: HarmonicLensFrame | null;
}

export default function ObservableSpaceRadar({ visible, stationHue, frame }: ObservableSpaceRadarProps) {
  const prevByteRef = useRef<number | null>(null);
  const holonomyAccumRef = useRef(0);
  const [metrics, setMetrics] = useState<MetricValues | null>(null);

  useEffect(() => {
    if (!visible || !frame) return;

    // Extract a representative byte from the frame (mean stratum quantized to 0-255)
    const currentByte = Math.round(frame.meanStratum * 255) & 0xff;
    const prevByte = prevByteRef.current ?? currentByte;

    // 1. RingMetric: geodesic distance on Z/256Z
    const forward = ((currentByte - prevByte) % 256 + 256) % 256;
    const backward = ((prevByte - currentByte) % 256 + 256) % 256;
    const ringDist = Math.min(forward, backward);
    const ring = ringDist / 128; // normalize to [0, 1], max = 128

    // 2. HammingMetric: popcount(XOR)
    const hammingDist = popcount8(currentByte ^ prevByte);
    const hamming = hammingDist / 8; // normalize, max = 8

    // 3. CascadeLength: forward succ-steps
    const cascade = forward / 256; // normalize

    // 4. CatastropheThreshold proximity: how close is irreducible density to collapse?
    // Use curvature proximity: closer to threshold = higher
    const threshold = 4 / 256; // 0.015625
    const catastrophe = Math.min(1, frame.curvature > 0 ? threshold / frame.curvature : 1);

    // 5. Curvature: already computed by HarmonicLens, normalize (0.3+ = 1.0)
    const curvature = Math.min(1, frame.curvature / 0.3);

    // 6. Holonomy: running phase accumulation (mod 256), normalized
    holonomyAccumRef.current = (holonomyAccumRef.current + ringDist) % 256;
    const holonomy = holonomyAccumRef.current / 128; // normalize, wraps at 2.0 → clamp
    const holonomyClamped = Math.min(1, holonomy);

    // 7. Commutator: |neg(bnot(x)) - bnot(neg(x))| in the ring
    // neg(bnot(x)) = neg(255 - x) = (256 - (255 - x)) % 256 = (x + 1) % 256
    // bnot(neg(x)) = bnot((256 - x) % 256) = 255 - ((256 - x) % 256)
    // For any x: commutator = |(x+1) - (255 - (256-x)%256)| = 2 always
    // So use the energy-based commutator: |RMS_change * centroid_change| normalized
    const commutatorRaw = Math.abs(frame.rmsEnergy * frame.centroidBin);
    const commutatorVal = Math.min(1, commutatorRaw * 4); // scale up for visibility

    prevByteRef.current = currentByte;

    setMetrics({
      ring,
      hamming,
      cascade,
      catastrophe,
      curvature,
      holonomy: holonomyClamped,
      commutator: commutatorVal,
    });
  }, [frame, visible]);

  if (!metrics) return null;

  const values = [
    metrics.ring,
    metrics.hamming,
    metrics.cascade,
    metrics.catastrophe,
    metrics.curvature,
    metrics.holonomy,
    metrics.commutator,
  ];

  const hue = parseInt(stationHue) || 220;

  // Build heptagon polygon
  const points = values.map((v, i) => axisPoint(i, v));
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + " Z";

  // Grid rings at 0.33, 0.66, 1.0
  const gridRings = [0.33, 0.66, 1.0];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          style={{ borderTop: `1px solid ${VP.border}`, overflow: "hidden" }}
        >
          <div className="px-3 pt-3 pb-2">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Orbit className="w-3 h-3" style={{ color: `hsl(${hue}, 50%, 60%)` }} />
                <span className="text-[10px] tracking-[0.16em] uppercase" style={{ color: VP.textDim }}>
                  Observable Space
                </span>
              </div>
              <span className="text-[9px] tabular-nums" style={{ color: VP.textDim }}>
                7 metrics · Z/256Z
              </span>
            </div>

            {/* Radar Chart */}
            <div className="flex items-center justify-center">
              <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
                {/* Grid rings */}
                {gridRings.map((r) => {
                  const ringPts = AXES.map((_, i) => axisPoint(i, r));
                  const d = ringPts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + " Z";
                  return <path key={r} d={d} fill="none" stroke="hsla(30, 10%, 30%, 0.15)" strokeWidth={0.5} />;
                })}

                {/* Axis lines */}
                {AXES.map((_, i) => {
                  const end = axisPoint(i, 1);
                  return (
                    <line
                      key={i}
                      x1={CENTER} y1={CENTER}
                      x2={end.x} y2={end.y}
                      stroke="hsla(30, 10%, 30%, 0.12)"
                      strokeWidth={0.5}
                    />
                  );
                })}

                {/* Data polygon — glow layer */}
                <path
                  d={pathD}
                  fill={`hsla(${hue}, 40%, 50%, 0.08)`}
                  stroke={`hsla(${hue}, 50%, 60%, 0.3)`}
                  strokeWidth={3}
                  style={{ filter: `blur(2px)` }}
                />

                {/* Data polygon — sharp layer */}
                <path
                  d={pathD}
                  fill={`hsla(${hue}, 40%, 50%, 0.12)`}
                  stroke={`hsla(${hue}, 50%, 60%, 0.7)`}
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                />

                {/* Data points */}
                {points.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={2.5}
                    fill={`hsl(${hue}, 50%, 60%)`}
                    stroke={`hsl(${hue}, 50%, 80%)`}
                    strokeWidth={0.5}
                  />
                ))}

                {/* Axis labels */}
                {AXES.map((a, i) => {
                  const labelPos = axisPoint(i, 1.22);
                  return (
                    <text
                      key={i}
                      x={labelPos.x}
                      y={labelPos.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="hsl(30, 10%, 50%)"
                      fontSize={6.5}
                      fontFamily="'DM Sans', sans-serif"
                    >
                      {a.label}
                    </text>
                  );
                })}
              </svg>
            </div>

            {/* Metric Values Grid */}
            <div
              className="grid grid-cols-4 gap-x-2 gap-y-1 mt-1.5 pt-2"
              style={{ borderTop: `1px solid ${VP.border}` }}
            >
              <MetricCell label="Ring" value={metrics.ring} hue={hue} />
              <MetricCell label="Hamming" value={metrics.hamming} hue={hue} />
              <MetricCell label="Cascade" value={metrics.cascade} hue={hue} />
              <MetricCell label="Catastrophe" value={metrics.catastrophe} hue={hue} alert={metrics.catastrophe > 0.8} />
              <MetricCell label="Curvature" value={metrics.curvature} hue={hue} />
              <MetricCell label="Holonomy" value={metrics.holonomy} hue={hue} />
              <MetricCell label="Commutator" value={metrics.commutator} hue={hue} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MetricCell({ label, value, hue, alert = false }: { label: string; value: number; hue: number; alert?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-0.5">
      <span
        className="text-[10px] tabular-nums font-medium"
        style={{
          color: alert ? "hsl(0, 60%, 60%)" : `hsl(${hue}, 40%, 70%)`,
          fontFamily: VP.font,
        }}
      >
        {value.toFixed(2)}
      </span>
      <span className="text-[7px] tracking-wider uppercase leading-none" style={{ color: VP.textDim, fontFamily: VP.font }}>
        {label}
      </span>
    </div>
  );
}
