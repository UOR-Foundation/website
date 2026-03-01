/**
 * DimensionSparklines — Per-dimension evolution sparklines
 * ════════════════════════════════════════════════════════
 *
 * Shows how each resonance dimension (expertise, density, formality,
 * warmth, pace) has evolved over time as individual sparklines.
 *
 * @module hologram-ui/components/lumen/DimensionSparklines
 */

import { useRef, useEffect, useCallback, useState } from "react";
import { motion } from "framer-motion";
import type { ResonanceSnapshot } from "@/modules/hologram-ui/engine/resonanceObserver";

type DimKey = "expertise" | "density" | "formality" | "warmth" | "pace";

interface DimMeta {
  key: DimKey;
  label: string;
  lowLabel: string;
  highLabel: string;
  hue: number;
}

const DIMS: DimMeta[] = [
  { key: "expertise", label: "Expertise", lowLabel: "Accessible", highLabel: "Technical", hue: 210 },
  { key: "density", label: "Density", lowLabel: "Concise", highLabel: "Thorough", hue: 38 },
  { key: "formality", label: "Register", lowLabel: "Casual", highLabel: "Formal", hue: 160 },
  { key: "warmth", label: "Warmth", lowLabel: "Analytical", highLabel: "Warm", hue: 25 },
  { key: "pace", label: "Pace", lowLabel: "Exploratory", highLabel: "Direct", hue: 280 },
];

function MiniSparkline({
  meta,
  points,
  currentValue,
}: {
  meta: DimMeta;
  points: number[];
  currentValue: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hovered, setHovered] = useState<{ x: number; val: number; idx: number } | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = parent.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = rect.width;
    const h = rect.height;
    const pad = { top: 3, bottom: 3, left: 2, right: 2 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;

    ctx.clearRect(0, 0, w, h);

    // All points including current
    const all = [...points, currentValue];
    if (all.length < 2) {
      // Just draw current value as a dot
      const y = pad.top + plotH * (1 - currentValue);
      ctx.fillStyle = `hsla(${meta.hue}, 45%, 55%, 0.5)`;
      ctx.beginPath();
      ctx.arc(w / 2, y, 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    const xOf = (i: number) => pad.left + (i / (all.length - 1)) * plotW;
    const yOf = (v: number) => pad.top + plotH * (1 - v);

    // Area fill
    ctx.beginPath();
    ctx.moveTo(xOf(0), yOf(all[0]));
    for (let i = 1; i < all.length; i++) {
      const px = xOf(i - 1), cx = xOf(i);
      const cpx = (px + cx) / 2;
      ctx.bezierCurveTo(cpx, yOf(all[i - 1]), cpx, yOf(all[i]), cx, yOf(all[i]));
    }
    ctx.lineTo(xOf(all.length - 1), h - pad.bottom);
    ctx.lineTo(xOf(0), h - pad.bottom);
    ctx.closePath();
    const areaGrad = ctx.createLinearGradient(0, pad.top, 0, h - pad.bottom);
    areaGrad.addColorStop(0, `hsla(${meta.hue}, 45%, 55%, 0.1)`);
    areaGrad.addColorStop(1, `hsla(${meta.hue}, 45%, 55%, 0.01)`);
    ctx.fillStyle = areaGrad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(xOf(0), yOf(all[0]));
    for (let i = 1; i < all.length; i++) {
      const px = xOf(i - 1), cx = xOf(i);
      const cpx = (px + cx) / 2;
      ctx.bezierCurveTo(cpx, yOf(all[i - 1]), cpx, yOf(all[i]), cx, yOf(all[i]));
    }
    ctx.strokeStyle = `hsla(${meta.hue}, 50%, 55%, 0.7)`;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.stroke();

    // End dot (current)
    const lastX = xOf(all.length - 1);
    const lastY = yOf(all[all.length - 1]);
    ctx.fillStyle = `hsla(${meta.hue}, 55%, 55%, 0.3)`;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `hsl(${meta.hue}, 55%, 60%)`;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 2, 0, Math.PI * 2);
    ctx.fill();

    // Hovered dot
    if (hovered && hovered.idx >= 0 && hovered.idx < all.length) {
      const hx = xOf(hovered.idx);
      const hy = yOf(all[hovered.idx]);
      ctx.fillStyle = `hsl(${meta.hue}, 50%, 55%)`;
      ctx.beginPath();
      ctx.arc(hx, hy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [points, currentValue, meta.hue, hovered]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas?.parentElement) return;
    const obs = new ResizeObserver(draw);
    obs.observe(canvas.parentElement);
    return () => obs.disconnect();
  }, [draw]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const all = [...points, currentValue];
    if (all.length < 2) return;
    const x = e.clientX - rect.left;
    const ratio = (x - 2) / (rect.width - 4);
    const idx = Math.round(ratio * (all.length - 1));
    if (idx >= 0 && idx < all.length) {
      setHovered({ x, val: all[idx], idx });
    }
  }, [points, currentValue]);

  const all = [...points, currentValue];
  const trend = all.length >= 2 ? all[all.length - 1] - all[0] : 0;

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-0.5">
        <div className="flex items-center gap-1.5">
          <div
            className="w-1 h-1 rounded-full"
            style={{ background: `hsl(${meta.hue}, 50%, 55%)` }}
          />
          <span className="text-[10px] font-medium" style={{ color: `hsla(${meta.hue}, 35%, 60%, 0.7)` }}>
            {meta.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {hovered ? (
            <span className="text-[9px] font-mono" style={{ color: `hsl(${meta.hue}, 45%, 55%)` }}>
              {Math.round(hovered.val * 100)}%
            </span>
          ) : (
            <>
              <span className="text-[9px] font-mono" style={{ color: "hsl(38, 15%, 82%)" }}>
                {Math.round(currentValue * 100)}%
              </span>
              {all.length >= 3 && (
                <span
                  className="text-[8px]"
                  style={{ color: trend > 0.05 ? "hsl(142, 40%, 55%)" : trend < -0.05 ? "hsl(0, 50%, 55%)" : "hsl(30, 10%, 50%)" }}
                >
                  {trend > 0.05 ? "↑" : trend < -0.05 ? "↓" : "·"}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      <div
        className="relative rounded-lg overflow-hidden"
        style={{
          height: 28,
          background: "hsla(25, 8%, 6%, 0.5)",
          border: `1px solid hsla(${meta.hue}, 20%, 30%, 0.08)`,
        }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ touchAction: "none", cursor: "crosshair" }}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHovered(null)}
        />
        {/* Low/high labels on hover */}
        <span
          className="absolute left-1 bottom-0.5 text-[7px] opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: `hsla(${meta.hue}, 25%, 55%, 0.3)` }}
        >
          {meta.lowLabel}
        </span>
        <span
          className="absolute right-1 top-0.5 text-[7px] opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: `hsla(${meta.hue}, 25%, 55%, 0.3)` }}
        >
          {meta.highLabel}
        </span>
      </div>
    </div>
  );
}

interface DimensionSparklinesProps {
  history: ResonanceSnapshot[];
  currentProfile: {
    expertiseLevel: number;
    densityPreference: number;
    formalityRegister: number;
    warmthPreference: number;
    pacePreference: number;
  };
}

export default function DimensionSparklines({ history, currentProfile }: DimensionSparklinesProps) {
  const snapshotsWithDims = (history || []).filter((s) => s.d);

  if (snapshotsWithDims.length < 1 && !currentProfile) return null;

  const currentValues: Record<DimKey, number> = {
    expertise: currentProfile.expertiseLevel,
    density: currentProfile.densityPreference,
    formality: currentProfile.formalityRegister,
    warmth: currentProfile.warmthPreference,
    pace: currentProfile.pacePreference,
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
    >
      <h3
        className="text-xs font-medium tracking-widest uppercase mb-3 flex items-center gap-2"
        style={{ color: "hsl(30, 10%, 55%)" }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        Dimension Evolution
      </h3>
      <div className="space-y-2">
        {DIMS.map((dim) => (
          <MiniSparkline
            key={dim.key}
            meta={dim}
            points={snapshotsWithDims.map((s) => s.d![dim.key])}
            currentValue={currentValues[dim.key]}
          />
        ))}
      </div>
    </motion.section>
  );
}
