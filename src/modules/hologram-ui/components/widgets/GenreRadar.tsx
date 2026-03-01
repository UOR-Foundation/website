/**
 * GenreRadar — Real-Time Genre Fingerprint Display
 * ═══════════════════════════════════════════════════════════════════
 *
 * Shows the current station's position in 3D UOR observable space
 * as a triangular radar chart:
 *   - Cascade (rhythmic momentum)
 *   - Curvature (harmonic complexity)
 *   - Timbre (timbral diversity)
 *
 * Includes genre classification with confidence indicator.
 *
 * @module hologram-ui/components/GenreRadar
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hexagon } from "lucide-react";
import { GenreFingerprint } from "@/modules/audio/lenses/genre-fingerprint";
import type { GenreClassification } from "@/modules/audio/lenses/genre-fingerprint";
import type { HarmonicLensFrame } from "@/modules/audio/lenses/harmonic-lens";

const VP = {
  border: "hsla(38, 15%, 30%, 0.2)",
  text: "hsl(38, 20%, 85%)",
  textDim: "hsl(30, 10%, 50%)",
  font: "'DM Sans', sans-serif",
} as const;

const RADAR_SIZE = 80;
const CENTER = RADAR_SIZE / 2;
const RADIUS = 32;

// Triangle vertices for 3 axes (cascade, curvature, timbre)
const AXES = [
  { angle: -Math.PI / 2, label: "Cascade" },
  { angle: -Math.PI / 2 + (2 * Math.PI / 3), label: "Curvature" },
  { angle: -Math.PI / 2 + (4 * Math.PI / 3), label: "Hamming" },
];

function axisPoint(axisIndex: number, value: number): { x: number; y: number } {
  const a = AXES[axisIndex].angle;
  return {
    x: CENTER + Math.cos(a) * RADIUS * value,
    y: CENTER + Math.sin(a) * RADIUS * value,
  };
}

interface GenreRadarProps {
  visible: boolean;
  stationHue: string;
  frame: HarmonicLensFrame | null;
}

export default function GenreRadar({ visible, stationHue, frame }: GenreRadarProps) {
  const fpRef = useRef(new GenreFingerprint());
  const [classification, setClassification] = useState<GenreClassification | null>(null);

  useEffect(() => {
    if (!visible || !frame) return;
    fpRef.current.push(frame);
    setClassification(fpRef.current.classify());
  }, [frame, visible]);

  if (!classification) return null;

  const { coordinate, genre, confidence } = classification;
  const values = [coordinate.cascade, coordinate.curvature, coordinate.hamming];
  const hue = parseInt(stationHue) || 220;

  // Build radar polygon path
  const points = values.map((v, i) => axisPoint(i, v));
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + " Z";

  // Grid rings at 0.33 and 0.66
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
                <Hexagon className="w-3 h-3" style={{ color: `hsl(${genre.color}, 50%, 55%)` }} />
                <span className="text-[10px] tracking-[0.16em] uppercase" style={{ color: VP.textDim }}>
                  Genre Fingerprint
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                  style={{
                    color: `hsl(${genre.color}, 50%, 65%)`,
                    background: `hsla(${genre.color}, 30%, 25%, 0.3)`,
                  }}
                >
                  {genre.label}
                </span>
                <span className="text-[9px] tabular-nums" style={{ color: VP.textDim }}>
                  {(confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Radar Chart */}
            <div className="flex items-center justify-center">
              <svg width={RADAR_SIZE} height={RADAR_SIZE} viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}>
                {/* Grid rings */}
                {gridRings.map((r) => {
                  const ringPoints = AXES.map((_, i) => axisPoint(i, r));
                  const d = ringPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + " Z";
                  return <path key={r} d={d} fill="none" stroke="hsla(30, 10%, 30%, 0.2)" strokeWidth={0.5} />;
                })}

                {/* Axis lines */}
                {AXES.map((a, i) => {
                  const end = axisPoint(i, 1);
                  return (
                    <line
                      key={i}
                      x1={CENTER} y1={CENTER}
                      x2={end.x} y2={end.y}
                      stroke="hsla(30, 10%, 30%, 0.15)"
                      strokeWidth={0.5}
                    />
                  );
                })}

                {/* Data polygon */}
                <path
                  d={pathD}
                  fill={`hsla(${hue}, 40%, 50%, 0.15)`}
                  stroke={`hsla(${hue}, 50%, 60%, 0.7)`}
                  strokeWidth={1.5}
                />

                {/* Data points */}
                {points.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={`hsl(${hue}, 50%, 60%)`} />
                ))}

                {/* Axis labels */}
                {AXES.map((a, i) => {
                  const labelPos = axisPoint(i, 1.25);
                  return (
                    <text
                      key={i}
                      x={labelPos.x}
                      y={labelPos.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="hsl(30, 10%, 50%)"
                      fontSize={7}
                      fontFamily="'DM Sans', sans-serif"
                    >
                      {a.label}
                    </text>
                  );
                })}
              </svg>
            </div>

            {/* Coordinate Values */}
            <div className="flex items-center justify-between mt-1 pt-1.5" style={{ borderTop: `1px solid ${VP.border}` }}>
              <CoordValue label="Cascade" value={coordinate.cascade} />
              <CoordValue label="Curvature" value={coordinate.curvature} />
              <CoordValue label="Hamming" value={coordinate.hamming} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CoordValue({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] tabular-nums font-medium" style={{ color: VP.text, fontFamily: VP.font }}>
        {value.toFixed(2)}
      </span>
      <span className="text-[8px] tracking-wider uppercase" style={{ color: VP.textDim, fontFamily: VP.font }}>
        {label}
      </span>
    </div>
  );
}
