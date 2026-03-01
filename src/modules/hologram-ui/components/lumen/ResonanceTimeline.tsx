/**
 * Resonance Timeline — Sparkline History Visualization
 * ═════════════════════════════════════════════════════
 *
 * Renders the user's resonance history as an organic sparkline
 * with convergence rate overlay, making the invisible feedback
 * loop evolution visible and beautiful.
 *
 * @module hologram-ui/components/lumen/ResonanceTimeline
 */

import { useRef, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { ResonanceSnapshot } from "@/modules/hologram-ui/engine/resonanceObserver";

interface ResonanceTimelineProps {
  history: ResonanceSnapshot[];
  currentScore: number;
  convergenceRate: number;
}

export default function ResonanceTimeline({
  history,
  currentScore,
  convergenceRate,
}: ResonanceTimelineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{
    snapshot: ResonanceSnapshot;
    x: number;
    y: number;
    index: number;
  } | null>(null);

  // Build the data points — include current state as the last point
  const points: ResonanceSnapshot[] = [
    ...(history || []),
    { t: Date.now(), r: currentScore, c: convergenceRate, s: 0, x: 0, n: 0 },
  ];

  const drawSparkline = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length < 2) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (!rect) return;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = rect.width;
    const h = rect.height;
    const pad = { top: 8, bottom: 8, left: 4, right: 4 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Find range
    const minR = Math.min(...points.map(p => p.r), 0);
    const maxR = Math.max(...points.map(p => p.r), 1);
    const range = maxR - minR || 1;

    const xOf = (i: number) => pad.left + (i / (points.length - 1)) * plotW;
    const yOf = (v: number) => pad.top + plotH - ((v - minR) / range) * plotH;

    // ── Draw convergence rate as a subtle fill ───────────────────
    ctx.beginPath();
    const midY = yOf(0.5);
    for (let i = 0; i < points.length; i++) {
      const x = xOf(i);
      const cVal = points[i].c;
      // Map convergence to a subtle displacement above/below midline
      const cy = midY - cVal * plotH * 2;
      if (i === 0) ctx.moveTo(x, cy);
      else ctx.lineTo(x, cy);
    }
    // Close the fill back to midline
    for (let i = points.length - 1; i >= 0; i--) {
      ctx.lineTo(xOf(i), midY);
    }
    ctx.closePath();
    const convGrad = ctx.createLinearGradient(0, pad.top, 0, h - pad.bottom);
    convGrad.addColorStop(0, "hsla(142, 40%, 55%, 0.08)");
    convGrad.addColorStop(0.5, "hsla(142, 40%, 55%, 0.02)");
    convGrad.addColorStop(1, "hsla(0, 50%, 55%, 0.06)");
    ctx.fillStyle = convGrad;
    ctx.fill();

    // ── Draw area fill under resonance curve ─────────────────────
    ctx.beginPath();
    ctx.moveTo(xOf(0), yOf(points[0].r));
    for (let i = 1; i < points.length; i++) {
      const prevX = xOf(i - 1);
      const currX = xOf(i);
      const cpX = (prevX + currX) / 2;
      ctx.bezierCurveTo(cpX, yOf(points[i - 1].r), cpX, yOf(points[i].r), currX, yOf(points[i].r));
    }
    ctx.lineTo(xOf(points.length - 1), h - pad.bottom);
    ctx.lineTo(xOf(0), h - pad.bottom);
    ctx.closePath();
    const areaGrad = ctx.createLinearGradient(0, pad.top, 0, h - pad.bottom);
    areaGrad.addColorStop(0, "hsla(38, 50%, 55%, 0.12)");
    areaGrad.addColorStop(1, "hsla(38, 50%, 55%, 0.01)");
    ctx.fillStyle = areaGrad;
    ctx.fill();

    // ── Draw resonance score line ────────────────────────────────
    ctx.beginPath();
    ctx.moveTo(xOf(0), yOf(points[0].r));
    for (let i = 1; i < points.length; i++) {
      const prevX = xOf(i - 1);
      const currX = xOf(i);
      const cpX = (prevX + currX) / 2;
      ctx.bezierCurveTo(cpX, yOf(points[i - 1].r), cpX, yOf(points[i].r), currX, yOf(points[i].r));
    }
    const lineGrad = ctx.createLinearGradient(pad.left, 0, w - pad.right, 0);
    lineGrad.addColorStop(0, "hsla(38, 40%, 50%, 0.3)");
    lineGrad.addColorStop(0.5, "hsla(38, 55%, 55%, 0.7)");
    lineGrad.addColorStop(1, "hsla(38, 55%, 55%, 0.9)");
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.stroke();

    // ── Draw dots at data points ─────────────────────────────────
    for (let i = 0; i < points.length; i++) {
      const x = xOf(i);
      const y = yOf(points[i].r);
      const isLast = i === points.length - 1;
      const isHovered = hoveredPoint?.index === i;

      if (isLast || isHovered) {
        // Glow
        const glowR = isLast ? 6 : 5;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, glowR);
        glow.addColorStop(0, `hsla(38, 55%, 55%, ${isLast ? 0.3 : 0.2})`);
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, glowR, 0, Math.PI * 2);
        ctx.fill();

        // Dot
        ctx.fillStyle = isLast ? "hsl(38, 55%, 60%)" : "hsl(38, 50%, 55%)";
        ctx.beginPath();
        ctx.arc(x, y, isLast ? 2.5 : 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (points.length <= 15) {
        // Show small dots when few points
        ctx.fillStyle = "hsla(38, 50%, 55%, 0.25)";
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── Baseline reference at 0.5 ────────────────────────────────
    ctx.setLineDash([2, 4]);
    ctx.strokeStyle = "hsla(38, 15%, 55%, 0.08)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(pad.left, yOf(0.5));
    ctx.lineTo(w - pad.right, yOf(0.5));
    ctx.stroke();
    ctx.setLineDash([]);
  }, [points, hoveredPoint]);

  useEffect(() => {
    drawSparkline();
  }, [drawSparkline]);

  // Resize handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas?.parentElement) return;
    const observer = new ResizeObserver(drawSparkline);
    observer.observe(canvas.parentElement);
    return () => observer.disconnect();
  }, [drawSparkline]);

  // Mouse interaction
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas || points.length < 2) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pad = 4;
      const plotW = rect.width - pad * 2;
      const ratio = (x - pad) / plotW;
      const idx = Math.round(ratio * (points.length - 1));
      if (idx >= 0 && idx < points.length) {
        const plotH = rect.height - 16;
        const minR = Math.min(...points.map(p => p.r), 0);
        const maxR = Math.max(...points.map(p => p.r), 1);
        const range = maxR - minR || 1;
        const px = pad + (idx / (points.length - 1)) * plotW;
        const py = 8 + plotH - ((points[idx].r - minR) / range) * plotH;
        setHoveredPoint({ snapshot: points[idx], x: px, y: py, index: idx });
      }
    },
    [points],
  );

  const handlePointerLeave = useCallback(() => setHoveredPoint(null), []);

  if (points.length < 2) return null;

  // Trend icon
  const TrendIcon =
    convergenceRate > 0.005 ? TrendingUp :
    convergenceRate < -0.005 ? TrendingDown :
    Minus;

  const trendColor =
    convergenceRate > 0.005 ? "hsl(142, 40%, 55%)" :
    convergenceRate < -0.005 ? "hsl(0, 50%, 55%)" :
    "hsl(30, 10%, 55%)";

  const trendLabel =
    convergenceRate > 0.005 ? "Converging" :
    convergenceRate < -0.005 ? "Drifting" :
    "Stable";

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h3
          className="text-xs font-medium tracking-widest uppercase flex items-center gap-2"
          style={{ color: "hsl(30, 10%, 55%)" }}
        >
          <TrendIcon size={12} style={{ color: trendColor }} /> Resonance History
        </h3>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px]" style={{ color: trendColor }}>
            {trendLabel}
          </span>
          <span className="text-[10px]" style={{ color: "hsl(30, 10%, 55%)" }}>
            · {points.length - 1} reflections
          </span>
        </div>
      </div>

      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          background: "hsla(25, 8%, 6%, 0.6)",
          border: "1px solid hsla(38, 30%, 40%, 0.08)",
          height: 80,
        }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ touchAction: "none", cursor: "crosshair" }}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        />

        {/* Tooltip */}
        {hoveredPoint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute pointer-events-none px-2 py-1 rounded-lg"
            style={{
              left: Math.min(hoveredPoint.x, (canvasRef.current?.parentElement?.clientWidth || 200) - 100),
              top: Math.max(0, hoveredPoint.y - 44),
              background: "hsla(25, 8%, 10%, 0.92)",
              border: "1px solid hsla(38, 30%, 40%, 0.15)",
              zIndex: 10,
            }}
          >
            <p className="text-[10px] font-medium" style={{ color: "hsl(38, 50%, 55%)" }}>
              {Math.round(hoveredPoint.snapshot.r * 100)}% resonance
            </p>
            <p className="text-[9px]" style={{ color: "hsl(30, 10%, 55%)" }}>
              {hoveredPoint.snapshot.n} exchanges · {
                new Date(hoveredPoint.snapshot.t).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })
              }
            </p>
          </motion.div>
        )}

        {/* Y-axis labels */}
        <span
          className="absolute text-[8px] left-1.5 top-1"
          style={{ color: "hsla(38, 15%, 65%, 0.2)" }}
        >
          1.0
        </span>
        <span
          className="absolute text-[8px] left-1.5 bottom-0.5"
          style={{ color: "hsla(38, 15%, 65%, 0.2)" }}
        >
          0
        </span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-1.5">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 rounded-full" style={{ background: "hsl(38, 55%, 55%)" }} />
          <span className="text-[9px]" style={{ color: "hsla(38, 15%, 65%, 0.4)" }}>
            resonance
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-sm" style={{ background: "hsla(142, 40%, 55%, 0.15)" }} />
          <span className="text-[9px]" style={{ color: "hsla(38, 15%, 65%, 0.4)" }}>
            convergence
          </span>
        </div>
      </div>
    </section>
  );
}
