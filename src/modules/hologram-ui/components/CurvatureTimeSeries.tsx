/**
 * CurvatureTimeSeries — Real-Time Harmonic Tension Graph
 * ═══════════════════════════════════════════════════════════════════
 *
 * Renders the CurvatureLens output as a scrolling time-series graph.
 * Shows curvature (κ) over time with:
 *   - Catastrophe threshold line (ring-derived at 4/2^8)
 *   - Catastrophe event markers (drops, impacts, shifts)
 *   - Tension gradient fill under the curve
 *
 * @module hologram-ui/components/CurvatureTimeSeries
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity } from "lucide-react";
import { CurvatureLens } from "@/modules/audio/lenses/curvature-lens";
import type { CurvatureLensState, CatastropheEvent } from "@/modules/audio/lenses/curvature-lens";
import type { HarmonicLensFrame } from "@/modules/audio/lenses/harmonic-lens";

const VP = {
  surface: "hsla(25, 10%, 8%, 0.95)",
  border: "hsla(38, 15%, 30%, 0.2)",
  text: "hsl(38, 20%, 85%)",
  textDim: "hsl(30, 10%, 50%)",
  font: "'DM Sans', sans-serif",
} as const;

const GRAPH_WIDTH = 252;
const GRAPH_HEIGHT = 56;
const WINDOW_SECONDS = 30;

interface CurvatureTimeSeriesProps {
  visible: boolean;
  stationHue: string;
  /** The parent passes frames from HarmonicLens. */
  frame: HarmonicLensFrame | null;
}

export default function CurvatureTimeSeries({ visible, stationHue, frame }: CurvatureTimeSeriesProps) {
  const lensRef = useRef(new CurvatureLens());
  const [state, setState] = useState<CurvatureLensState | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Push frames into the curvature lens
  useEffect(() => {
    if (!visible || !frame) return;
    lensRef.current.push(frame);
    setState(lensRef.current.getState());
  }, [frame, visible]);

  // Render the graph on canvas
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

    const latestTime = window_[window_.length - 1].time;
    const startTime = latestTime - WINDOW_SECONDS;

    // Scale curvature: max 0.3 for display (higher values clamp)
    const maxK = 0.3;
    const hue = parseInt(stationHue) || 220;

    // Draw threshold line
    const thresholdY = GRAPH_HEIGHT * (1 - state.threshold / maxK);
    ctx.strokeStyle = `hsla(0, 50%, 50%, 0.3)`;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, thresholdY);
    ctx.lineTo(GRAPH_WIDTH, thresholdY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw curvature curve with gradient fill
    ctx.beginPath();
    ctx.moveTo(0, GRAPH_HEIGHT);

    for (let i = 0; i < window_.length; i++) {
      const p = window_[i];
      const x = ((p.time - startTime) / WINDOW_SECONDS) * GRAPH_WIDTH;
      const y = GRAPH_HEIGHT * (1 - Math.min(p.curvature / maxK, 1));
      if (i === 0) {
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    // Close path for fill
    const lastX = ((window_[window_.length - 1].time - startTime) / WINDOW_SECONDS) * GRAPH_WIDTH;
    ctx.lineTo(lastX, GRAPH_HEIGHT);
    ctx.closePath();

    // Gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, GRAPH_HEIGHT);
    grad.addColorStop(0, `hsla(${hue}, 50%, 55%, 0.3)`);
    grad.addColorStop(1, `hsla(${hue}, 50%, 55%, 0.02)`);
    ctx.fillStyle = grad;
    ctx.fill();

    // Stroke the line
    ctx.beginPath();
    for (let i = 0; i < window_.length; i++) {
      const p = window_[i];
      const x = ((p.time - startTime) / WINDOW_SECONDS) * GRAPH_WIDTH;
      const y = GRAPH_HEIGHT * (1 - Math.min(p.curvature / maxK, 1));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `hsla(${hue}, 50%, 60%, 0.8)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw catastrophe markers
    for (const cat of state.catastrophes) {
      if (cat.time < startTime) continue;
      const x = ((cat.time - startTime) / WINDOW_SECONDS) * GRAPH_WIDTH;
      const y = GRAPH_HEIGHT * (1 - Math.min(cat.curvature / maxK, 1));

      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = cat.type === "drop"
        ? "hsla(200, 60%, 55%, 0.9)"
        : cat.type === "impact"
        ? "hsla(0, 60%, 55%, 0.9)"
        : "hsla(50, 60%, 55%, 0.9)";
      ctx.fill();
    }
  }, [state, stationHue]);

  if (!state) return null;

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
                <Activity className="w-3 h-3" style={{ color: `hsl(${stationHue}, 50%, 60%)` }} />
                <span className="text-[10px] tracking-[0.16em] uppercase" style={{ color: VP.textDim }}>
                  Curvature κ
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] tabular-nums" style={{ color: VP.textDim }}>
                  threshold: {state.threshold.toFixed(4)}
                </span>
              </div>
            </div>

            {/* Canvas Graph */}
            <canvas
              ref={canvasRef}
              className="w-full rounded"
              style={{
                width: GRAPH_WIDTH,
                height: GRAPH_HEIGHT,
                background: "hsla(25, 8%, 6%, 0.5)",
              }}
            />

            {/* Metrics Row */}
            <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: `1px solid ${VP.border}` }}>
              <MiniMetric label="κ mean" value={state.meanCurvature.toFixed(4)} />
              <MiniMetric label="κ peak" value={state.peakCurvature.toFixed(4)} highlight={state.peakCurvature > state.threshold} hue={stationHue} />
              <MiniMetric label="tension" value={`${(state.tensionLevel * 100).toFixed(0)}%`} />
              <MiniMetric label="events" value={`${state.catastrophes.length}`} />
            </div>

            {/* Recent Catastrophe Events */}
            {recentCatastrophes.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {recentCatastrophes.map((e, i) => (
                  <CatastropheChip key={i} event={e} hue={stationHue} />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MiniMetric({ label, value, highlight = false, hue = "38" }: { label: string; value: string; highlight?: boolean; hue?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] tabular-nums font-medium" style={{ color: highlight ? `hsl(${hue}, 60%, 60%)` : VP.text, fontFamily: VP.font }}>
        {value}
      </span>
      <span className="text-[8px] tracking-wider uppercase" style={{ color: VP.textDim, fontFamily: VP.font }}>
        {label}
      </span>
    </div>
  );
}

function CatastropheChip({ event, hue }: { event: CatastropheEvent; hue: string }) {
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
    >
      {c.icon} {event.type} @ {event.time.toFixed(1)}s
    </span>
  );
}
