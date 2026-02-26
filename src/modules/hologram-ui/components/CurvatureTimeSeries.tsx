/**
 * CurvatureTimeSeries — Harmonic Tension Arc + Mini Stratum Histogram
 * ═══════════════════════════════════════════════════════════════════
 *
 * A combined view showing:
 *   Left:  Scrolling curvature (κ) time-series with catastrophe
 *          threshold line and event markers
 *   Right: Live mini stratum histogram synced to the current frame
 *
 * The two panels share the same data source (HarmonicLensFrame) and
 * visually demonstrate the relationship between spectral shape
 * (histogram) and its rate of change (curvature).
 *
 * @module hologram-ui/components/CurvatureTimeSeries
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity } from "lucide-react";
import { CurvatureLens } from "@/modules/audio/lenses/curvature-lens";
import type { CurvatureLensState, CatastropheEvent } from "@/modules/audio/lenses/curvature-lens";
import type { HarmonicLensFrame } from "@/modules/audio/lenses/harmonic-lens";

const VP = {
  border: "hsla(38, 15%, 30%, 0.2)",
  text: "hsl(38, 20%, 85%)",
  textDim: "hsl(30, 10%, 50%)",
  font: "'DM Sans', sans-serif",
} as const;

const GRAPH_WIDTH = 172;
const GRAPH_HEIGHT = 80;
const HIST_WIDTH = 68;
const WINDOW_SECONDS = 30;
const MAX_K = 0.3; // curvature display ceiling

interface CurvatureTimeSeriesProps {
  visible: boolean;
  stationHue: string;
  frame: HarmonicLensFrame | null;
}

export default function CurvatureTimeSeries({ visible, stationHue, frame }: CurvatureTimeSeriesProps) {
  const lensRef = useRef(new CurvatureLens());
  const [state, setState] = useState<CurvatureLensState | null>(null);
  const [currentFrame, setCurrentFrame] = useState<HarmonicLensFrame | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevStationHue = useRef(stationHue);

  // Reset lens on station change
  useEffect(() => {
    if (stationHue !== prevStationHue.current) {
      lensRef.current.reset();
      prevStationHue.current = stationHue;
    }
  }, [stationHue]);

  // Push frames into the curvature lens
  useEffect(() => {
    if (!visible || !frame) return;
    lensRef.current.push(frame);
    setState(lensRef.current.getState());
    setCurrentFrame(frame);
  }, [frame, visible]);

  // Render the time-series graph on canvas
  useEffect(() => {
    if (!state || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = GRAPH_WIDTH * dpr;
    const h = GRAPH_HEIGHT * dpr;
    canvasRef.current.width = w;
    canvasRef.current.height = h;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, GRAPH_WIDTH, GRAPH_HEIGHT);

    const window_ = lensRef.current.getWindow(WINDOW_SECONDS);
    if (window_.length < 2) return;

    const hue = parseInt(stationHue) || 220;
    const latestTime = window_[window_.length - 1].time;
    const startTime = latestTime - WINDOW_SECONDS;

    // ── Grid lines (subtle horizontal guides) ──
    ctx.strokeStyle = "hsla(30, 10%, 30%, 0.12)";
    ctx.lineWidth = 0.5;
    for (let k = 0.05; k <= MAX_K; k += 0.05) {
      const gy = GRAPH_HEIGHT * (1 - k / MAX_K);
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(GRAPH_WIDTH, gy);
      ctx.stroke();
    }

    // ── Catastrophe threshold line ──
    const thresholdY = GRAPH_HEIGHT * (1 - state.threshold / MAX_K);
    ctx.strokeStyle = "hsla(0, 55%, 50%, 0.4)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(0, thresholdY);
    ctx.lineTo(GRAPH_WIDTH, thresholdY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Threshold label
    ctx.fillStyle = "hsla(0, 45%, 55%, 0.6)";
    ctx.font = "7px 'DM Sans', sans-serif";
    ctx.fillText("4/2⁸", GRAPH_WIDTH - 22, thresholdY - 3);

    // ── RMS energy as background fill (context for the curvature curve) ──
    ctx.beginPath();
    ctx.moveTo(0, GRAPH_HEIGHT);
    for (const p of window_) {
      const x = ((p.time - startTime) / WINDOW_SECONDS) * GRAPH_WIDTH;
      const y = GRAPH_HEIGHT * (1 - Math.min(p.rmsEnergy, 1) * 0.3); // subtle energy context
      ctx.lineTo(x, y);
    }
    ctx.lineTo(((window_[window_.length - 1].time - startTime) / WINDOW_SECONDS) * GRAPH_WIDTH, GRAPH_HEIGHT);
    ctx.closePath();
    const energyGrad = ctx.createLinearGradient(0, 0, 0, GRAPH_HEIGHT);
    energyGrad.addColorStop(0, `hsla(${hue}, 25%, 40%, 0.06)`);
    energyGrad.addColorStop(1, "transparent");
    ctx.fillStyle = energyGrad;
    ctx.fill();

    // ── Curvature curve with tension gradient fill ──
    ctx.beginPath();
    ctx.moveTo(0, GRAPH_HEIGHT);
    for (const p of window_) {
      const x = ((p.time - startTime) / WINDOW_SECONDS) * GRAPH_WIDTH;
      const y = GRAPH_HEIGHT * (1 - Math.min(p.curvature / MAX_K, 1));
      ctx.lineTo(x, y);
    }
    const lastX = ((window_[window_.length - 1].time - startTime) / WINDOW_SECONDS) * GRAPH_WIDTH;
    ctx.lineTo(lastX, GRAPH_HEIGHT);
    ctx.closePath();

    const curvGrad = ctx.createLinearGradient(0, 0, 0, GRAPH_HEIGHT);
    curvGrad.addColorStop(0, `hsla(${hue}, 55%, 55%, 0.35)`);
    curvGrad.addColorStop(0.5, `hsla(${hue}, 45%, 50%, 0.12)`);
    curvGrad.addColorStop(1, "transparent");
    ctx.fillStyle = curvGrad;
    ctx.fill();

    // Stroke the curvature line
    ctx.beginPath();
    for (let i = 0; i < window_.length; i++) {
      const p = window_[i];
      const x = ((p.time - startTime) / WINDOW_SECONDS) * GRAPH_WIDTH;
      const y = GRAPH_HEIGHT * (1 - Math.min(p.curvature / MAX_K, 1));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `hsla(${hue}, 55%, 62%, 0.85)`;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.stroke();

    // ── Mean stratum trace (secondary line, faint) ──
    ctx.beginPath();
    for (let i = 0; i < window_.length; i++) {
      const p = window_[i];
      const x = ((p.time - startTime) / WINDOW_SECONDS) * GRAPH_WIDTH;
      // Normalize meanStratum [0,16] → [0,1] then scale to graph
      const y = GRAPH_HEIGHT * (1 - (p.meanStratum / 16));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `hsla(${hue + 60}, 30%, 55%, 0.25)`;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── Catastrophe event markers ──
    for (const cat of state.catastrophes) {
      if (cat.time < startTime) continue;
      const x = ((cat.time - startTime) / WINDOW_SECONDS) * GRAPH_WIDTH;
      const y = GRAPH_HEIGHT * (1 - Math.min(cat.curvature / MAX_K, 1));

      // Vertical tick mark
      ctx.strokeStyle = cat.type === "drop"
        ? "hsla(200, 60%, 55%, 0.5)"
        : cat.type === "impact"
        ? "hsla(0, 60%, 55%, 0.5)"
        : "hsla(50, 60%, 55%, 0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, GRAPH_HEIGHT);
      ctx.stroke();

      // Dot
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = cat.type === "drop"
        ? "hsla(200, 65%, 55%, 0.95)"
        : cat.type === "impact"
        ? "hsla(0, 65%, 55%, 0.95)"
        : "hsla(50, 65%, 55%, 0.95)";
      ctx.fill();
      ctx.strokeStyle = "hsla(0, 0%, 0%, 0.3)";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // ── Y-axis labels ──
    ctx.fillStyle = "hsla(30, 10%, 50%, 0.5)";
    ctx.font = "7px 'DM Sans', sans-serif";
    ctx.fillText("0", 2, GRAPH_HEIGHT - 2);
    ctx.fillText("κ " + MAX_K.toFixed(1), 2, 8);
  }, [state, stationHue]);

  if (!state) return null;

  const hue = parseInt(stationHue) || 220;
  const recentCatastrophes = state.catastrophes.slice(-3);

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
                <Activity className="w-3 h-3" style={{ color: `hsl(${hue}, 50%, 60%)` }} />
                <span className="text-[10px] tracking-[0.12em] uppercase" style={{ color: VP.textDim }}>
                  Curvature κ · Tension Arc
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Epistemic grade indicator */}
                <span
                  className="text-[8px] px-1.5 py-0.5 rounded-full"
                  style={{
                    color: state.dominantGrade === "A" ? "hsl(120, 45%, 55%)" : "hsl(40, 50%, 55%)",
                    background: state.dominantGrade === "A" ? "hsla(120, 30%, 25%, 0.2)" : "hsla(40, 30%, 25%, 0.2)",
                  }}
                >
                  Grade {state.dominantGrade}
                </span>
              </div>
            </div>

            {/* Combined: Time-Series (left) + Mini Histogram (right) */}
            <div className="flex gap-2">
              {/* Time-Series Canvas */}
              <div className="flex-1 min-w-0">
                <canvas
                  ref={canvasRef}
                  className="w-full rounded"
                  style={{
                    width: GRAPH_WIDTH,
                    height: GRAPH_HEIGHT,
                    background: "hsla(25, 8%, 6%, 0.5)",
                  }}
                />
              </div>

              {/* Mini Stratum Histogram */}
              <div
                className="flex flex-col justify-end rounded overflow-hidden"
                style={{
                  width: HIST_WIDTH,
                  height: GRAPH_HEIGHT,
                  background: "hsla(25, 8%, 6%, 0.5)",
                  padding: "4px 3px 2px",
                }}
              >
                {currentFrame && (
                  <>
                    <div className="flex items-end gap-[1px] flex-1">
                      {currentFrame.stratumHistogram.map((count, bin) => {
                        const maxCount = Math.max(...currentFrame.stratumHistogram, 1);
                        const intensity = count / maxCount;
                        const barHeight = Math.max(1, intensity * 100);
                        const hueShift = (bin - 8) * 3;
                        return (
                          <div
                            key={bin}
                            className="flex-1 rounded-t-sm transition-all duration-75"
                            style={{
                              height: `${barHeight}%`,
                              background: `hsla(${hue + hueShift}, ${30 + intensity * 30}%, ${35 + intensity * 25}%, ${0.4 + intensity * 0.5})`,
                            }}
                          />
                        );
                      })}
                    </div>
                    <div className="flex justify-between mt-0.5">
                      <span className="text-[6px]" style={{ color: VP.textDim }}>0</span>
                      <span className="text-[6px]" style={{ color: VP.textDim }}>σ</span>
                      <span className="text-[6px]" style={{ color: VP.textDim }}>16</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Legend row */}
            <div className="flex items-center gap-3 mt-1.5">
              <LegendDot color={`hsl(${hue}, 55%, 62%)`} label="κ curvature" />
              <LegendDot color={`hsl(${hue + 60}, 30%, 55%)`} dashed label="μ stratum" />
              <LegendDot color="hsl(0, 55%, 50%)" dashed label="threshold" />
            </div>

            {/* Metrics Row */}
            <div
              className="flex items-center justify-between mt-2 pt-2"
              style={{ borderTop: `1px solid ${VP.border}` }}
            >
              <MiniMetric label="κ mean" value={state.meanCurvature.toFixed(4)} />
              <MiniMetric
                label="κ peak"
                value={state.peakCurvature.toFixed(4)}
                highlight={state.peakCurvature > state.threshold}
                hue={stationHue}
              />
              <MiniMetric label="tension" value={`${(state.tensionLevel * 100).toFixed(0)}%`} />
              <MiniMetric label="events" value={`${state.catastrophes.length}`} />
              <MiniMetric label="frames" value={`${state.frameCount}`} />
            </div>

            {/* Recent Catastrophe Events */}
            {recentCatastrophes.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {recentCatastrophes.map((e, i) => (
                  <CatastropheChip key={`${e.time}-${i}`} event={e} />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function LegendDot({ color, label, dashed = false }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <div
        className="rounded-full"
        style={{
          width: dashed ? 8 : 5,
          height: dashed ? 1.5 : 5,
          background: color,
          opacity: dashed ? 0.5 : 0.8,
          borderRadius: dashed ? 1 : "50%",
        }}
      />
      <span className="text-[7px] uppercase tracking-wider" style={{ color: VP.textDim }}>
        {label}
      </span>
    </div>
  );
}

function MiniMetric({
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
        }}
      >
        {value}
      </span>
      <span className="text-[8px] tracking-wider uppercase" style={{ color: VP.textDim, fontFamily: VP.font }}>
        {label}
      </span>
    </div>
  );
}

function CatastropheChip({ event }: { event: CatastropheEvent }) {
  const colors = {
    drop: { bg: "hsla(200, 30%, 25%, 0.3)", text: "hsl(200, 50%, 60%)", icon: "▼" },
    impact: { bg: "hsla(0, 30%, 25%, 0.3)", text: "hsl(0, 50%, 60%)", icon: "▲" },
    shift: { bg: "hsla(50, 30%, 25%, 0.3)", text: "hsl(50, 50%, 60%)", icon: "◆" },
  };
  const c = colors[event.type];
  return (
    <span
      className="text-[9px] px-1.5 py-0.5 rounded-full tabular-nums"
      style={{ background: c.bg, color: c.text }}
      title={`Derivation: ${event.derivationId}\nThreshold proof: ${event.thresholdProofId}`}
    >
      {c.icon} {event.type} @ {event.time.toFixed(1)}s
    </span>
  );
}
