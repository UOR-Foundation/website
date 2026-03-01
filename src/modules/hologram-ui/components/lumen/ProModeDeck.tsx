/**
 * ProModeDeck — Modular DJ Controller for Lumen
 * ═══════════════════════════════════════════════
 *
 * Every element is a draggable module that can be reordered.
 * The deck slides up from the bottom, embedding the text input
 * inside a themed console. Three screen presets visualize mix state.
 *
 * @module hologram-ui/components/lumen/ProModeDeck
 */

import { useState, useCallback, useMemo, useEffect, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, GripVertical, Eye } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  DIMENSIONS,
  PRESETS,
  CATEGORY_META,
  getDefaultValues,
  type DimensionValues,
  type DimensionCategory,
  type DimensionPreset,
} from "@/modules/hologram-ui/engine/proModeDimensions";

// ── DJ Palette ──────────────────────────────────────────────────────
const DJ = {
  chassis: "hsl(20, 6%, 5%)",
  chassisLight: "hsl(20, 5%, 7%)",
  channel: "hsl(20, 5%, 10%)",
  groove: "hsl(20, 4%, 6%)",
  border: "hsla(38, 12%, 22%, 0.12)",
  borderAccent: "hsla(38, 25%, 30%, 0.2)",
  text: "hsl(38, 12%, 82%)",
  textMuted: "hsl(30, 8%, 48%)",
  textDim: "hsl(30, 6%, 30%)",
  gold: "hsl(38, 55%, 55%)",
  goldGlow: "hsla(38, 60%, 50%, 0.15)",
  screen: "hsl(220, 15%, 5%)",
  screenBorder: "hsla(220, 10%, 18%, 0.3)",
  deckA: "hsl(200, 50%, 55%)",
  deckADim: "hsla(200, 40%, 50%, 0.3)",
  deckB: "hsl(25, 60%, 55%)",
  deckBDim: "hsla(25, 50%, 50%, 0.3)",
  red: "hsl(0, 60%, 50%)",
  green: "hsl(120, 40%, 45%)",
  font: "'DM Sans', sans-serif",
  fontDisplay: "'Playfair Display', serif",
} as const;

// ── Helpers ──────────────────────────────────────────────────────────

function blendValues(a: DimensionValues, b: DimensionValues, mix: number): DimensionValues {
  const out: DimensionValues = {};
  for (const d of DIMENSIONS) {
    const va = a[d.id] ?? d.defaultValue;
    const vb = b[d.id] ?? d.defaultValue;
    out[d.id] = va + (vb - va) * mix;
  }
  return out;
}

function presetHue(p: DimensionPreset): number {
  return p.phase === "learn" ? 210 : p.phase === "work" ? 38 : 280;
}

// ── Module Types ────────────────────────────────────────────────────

type ScreenMode = "spectrum" | "coherence" | "radar";

interface ModuleConfig {
  id: string;
  label: string;
  icon: string;
}

const ALL_MODULES: ModuleConfig[] = [
  { id: "turntable-a", label: "Deck A", icon: "◉" },
  { id: "screen", label: "Display", icon: "◻" },
  { id: "turntable-b", label: "Deck B", icon: "◉" },
  { id: "input", label: "Input", icon: "⌨" },
  { id: "faders-reasoning", label: "Reasoning", icon: "≡" },
  { id: "faders-expression", label: "Expression", icon: "≡" },
  { id: "faders-awareness", label: "Awareness", icon: "≡" },
  { id: "crossfader", label: "Crossfader", icon: "↔" },
];

const DEFAULT_ORDER = ALL_MODULES.map((m) => m.id);

const STORAGE_KEY = "hologram:deck-module-order";

function loadOrder(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as string[];
      // Ensure all modules present
      const known = new Set(DEFAULT_ORDER);
      const valid = parsed.filter((id) => known.has(id));
      for (const id of DEFAULT_ORDER) {
        if (!valid.includes(id)) valid.push(id);
      }
      return valid;
    }
  } catch {}
  return DEFAULT_ORDER;
}

// ── Sortable Module Wrapper ─────────────────────────────────────────

function SortableModule({
  id,
  label,
  children,
  span,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  span?: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : "auto" as const,
    gridColumn: span ? `span ${span}` : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="relative group"
    >
      {/* Drag handle */}
      <div
        {...listeners}
        className="absolute top-1 right-1 z-20 opacity-0 group-hover:opacity-60 transition-opacity duration-200 cursor-grab active:cursor-grabbing p-1 rounded"
        style={{ color: DJ.textDim }}
        title={`Drag to reorder: ${label}`}
      >
        <GripVertical size={12} />
      </div>

      {/* Module card */}
      <div
        className="rounded-xl overflow-hidden h-full"
        style={{
          background: DJ.channel,
          border: `1px solid ${isDragging ? DJ.borderAccent : DJ.border}`,
          boxShadow: isDragging
            ? "0 8px 32px hsla(0,0%,0%,0.5), 0 0 0 1px hsla(38, 25%, 40%, 0.15)"
            : "0 1px 4px hsla(0,0%,0%,0.2)",
          transition: "border-color 0.2s, box-shadow 0.2s",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Screen: Spectrum View ───────────────────────────────────────────

function ScreenSpectrum({
  values,
  coherenceH,
}: {
  values: DimensionValues;
  coherenceH: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;
    const render = () => {
      if (!running) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const dims = DIMENSIONS;
      const barW = Math.floor((w - 60) / dims.length);
      const startX = Math.floor((w - barW * dims.length) / 2);
      const t = Date.now() * 0.001;

      dims.forEach((dim, i) => {
        const val = values[dim.id] ?? dim.defaultValue;
        const barH = val * (h - 36);
        const x = startX + i * barW;
        const shimmer = Math.sin(t * 2 + i * 0.5) * 0.06 + 1;
        const finalH = barH * shimmer;
        const meta = CATEGORY_META[dim.category];
        const alpha = 0.5 + val * 0.5;

        // Glow
        ctx.shadowBlur = 12;
        ctx.shadowColor = `hsla(${meta.hue}, 50%, 55%, ${alpha * 0.25})`;

        // Bar gradient
        const gradient = ctx.createLinearGradient(x, h - 12, x, h - 12 - finalH);
        gradient.addColorStop(0, `hsla(${meta.hue}, 40%, 30%, ${alpha * 0.5})`);
        gradient.addColorStop(0.5, `hsla(${meta.hue}, 50%, 50%, ${alpha * 0.8})`);
        gradient.addColorStop(1, `hsla(${meta.hue}, 60%, 65%, ${alpha})`);

        ctx.fillStyle = gradient;
        const r = Math.min(barW / 2 - 1, 4);
        const bx = x + 3;
        const bw = barW - 6;
        const by = h - 12 - finalH;
        // Rounded top
        ctx.beginPath();
        ctx.moveTo(bx, h - 12);
        ctx.lineTo(bx, by + r);
        ctx.quadraticCurveTo(bx, by, bx + r, by);
        ctx.lineTo(bx + bw - r, by);
        ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
        ctx.lineTo(bx + bw, h - 12);
        ctx.closePath();
        ctx.fill();

        // Peak indicator
        ctx.shadowBlur = 0;
        ctx.fillStyle = `hsla(${meta.hue}, 65%, 70%, ${alpha})`;
        ctx.fillRect(bx, by, bw, 2);

        // Label
        ctx.fillStyle = `hsla(${meta.hue}, 30%, 60%, 0.6)`;
        ctx.font = "11px 'DM Sans', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(dim.label.slice(0, 4).toUpperCase(), x + barW / 2, h - 1);
      });

      // Coherence line
      const lineY = h - 12 - coherenceH * (h - 36);
      ctx.beginPath();
      ctx.strokeStyle = `hsla(38, 50%, 55%, 0.2)`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.moveTo(20, lineY);
      ctx.lineTo(w - 20, lineY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Coherence label
      ctx.fillStyle = `hsla(38, 40%, 60%, 0.4)`;
      ctx.font = "10px 'DM Sans', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`H:${Math.round(coherenceH * 100)}`, 4, lineY - 4);

      frameRef.current = requestAnimationFrame(render);
    };
    render();
    return () => { running = false; cancelAnimationFrame(frameRef.current); };
  }, [values, coherenceH]);

  return (
    <canvas
      ref={canvasRef}
      width={700}
      height={140}
      className="w-full"
      style={{ height: 140 }}
    />
  );
}

// ── Screen: Coherence Orb View ──────────────────────────────────────

function ScreenCoherence({
  values,
  coherenceH,
  deckA,
  deckB,
  mix,
}: {
  values: DimensionValues;
  coherenceH: number;
  deckA: DimensionPreset | null;
  deckB: DimensionPreset | null;
  mix: number;
}) {
  const pct = Math.round(coherenceH * 100);
  const hue = 38 + coherenceH * 80;

  const catAvg = useMemo(() => {
    const cats: Record<DimensionCategory, { sum: number; count: number }> = {
      reasoning: { sum: 0, count: 0 },
      expression: { sum: 0, count: 0 },
      awareness: { sum: 0, count: 0 },
    };
    for (const d of DIMENSIONS) {
      cats[d.category].sum += values[d.id] ?? d.defaultValue;
      cats[d.category].count++;
    }
    return {
      reasoning: Math.round((cats.reasoning.sum / cats.reasoning.count) * 100),
      expression: Math.round((cats.expression.sum / cats.expression.count) * 100),
      awareness: Math.round((cats.awareness.sum / cats.awareness.count) * 100),
    };
  }, [values]);

  return (
    <div className="flex items-center justify-between px-6 py-3" style={{ height: 140 }}>
      {/* Left: Deck info */}
      <div className="flex flex-col gap-2" style={{ width: 140 }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: DJ.deckA, opacity: deckA ? 1 : 0.2 }} />
          <span className="text-[13px] font-medium" style={{ color: deckA ? DJ.deckA : DJ.textDim }}>
            {deckA ? deckA.name : "Deck A"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: DJ.deckB, opacity: deckB ? 1 : 0.2 }} />
          <span className="text-[13px] font-medium" style={{ color: deckB ? DJ.deckB : DJ.textDim }}>
            {deckB ? deckB.name : "Deck B"}
          </span>
        </div>
        <span className="text-[11px] font-mono mt-1" style={{ color: DJ.textMuted }}>
          Mix: {Math.round((1 - mix) * 100)} / {Math.round(mix * 100)}
        </span>
      </div>

      {/* Center: Coherence Orb */}
      <div className="flex flex-col items-center">
        <motion.div className="relative flex items-center justify-center" style={{ width: 72, height: 72 }}>
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{ scale: [1, 1.12, 1], opacity: [0.15, 0.3, 0.15] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            style={{ border: `1.5px solid hsla(${hue}, 45%, 55%, 0.3)` }}
          />
          <motion.div
            className="absolute rounded-full"
            animate={{ scale: [1, 1.06, 1], opacity: [0.08, 0.2, 0.08] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            style={{
              inset: -8,
              background: `radial-gradient(circle, hsla(${hue}, 45%, 50%, 0.08), transparent 70%)`,
            }}
          />
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background: `radial-gradient(circle at 40% 35%, hsla(${hue}, 50%, 45%, 0.25), hsla(${hue}, 35%, 20%, 0.1))`,
              border: `1px solid hsla(${hue}, 40%, 50%, 0.25)`,
              boxShadow: `0 0 20px hsla(${hue}, 50%, 50%, 0.1)`,
            }}
          >
            <span className="font-mono text-[22px] font-bold" style={{ color: `hsl(${hue}, 55%, 68%)` }}>
              {pct}
            </span>
          </div>
        </motion.div>
        <span className="text-[10px] tracking-[0.15em] uppercase mt-1" style={{ color: `hsla(${hue}, 30%, 55%, 0.5)` }}>
          {pct >= 80 ? "Resonant" : pct >= 60 ? "Balanced" : pct >= 40 ? "Exploring" : "Diffuse"}
        </span>
      </div>

      {/* Right: Category meters */}
      <div className="flex flex-col gap-2" style={{ width: 160 }}>
        {(["reasoning", "expression", "awareness"] as const).map((cat) => {
          const meta = CATEGORY_META[cat];
          const avg = catAvg[cat];
          return (
            <div key={cat}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] tracking-wide uppercase font-medium" style={{ color: `hsla(${meta.hue}, 35%, 60%, 0.6)` }}>{meta.label}</span>
                <span className="text-[12px] font-mono font-medium" style={{ color: `hsl(${meta.hue}, 40%, 60%)` }}>{avg}</span>
              </div>
              <div className="h-[4px] rounded-full overflow-hidden" style={{ background: `hsla(${meta.hue}, 15%, 15%, 0.4)` }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    width: `${avg}%`,
                    background: `linear-gradient(90deg, hsla(${meta.hue}, 40%, 40%, 0.6), hsl(${meta.hue}, 50%, 55%))`,
                    boxShadow: `0 0 8px hsla(${meta.hue}, 50%, 50%, 0.2)`,
                  }}
                  animate={{ width: `${avg}%` }}
                  transition={{ type: "spring", stiffness: 200, damping: 25 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Screen: Radar View ──────────────────────────────────────────────

function ScreenRadar({ values }: { values: DimensionValues }) {
  const dims = DIMENSIONS;
  const cx = 200, cy = 70, maxR = 55;
  const angleStep = (Math.PI * 2) / dims.length;

  const points = dims.map((dim, i) => {
    const val = values[dim.id] ?? dim.defaultValue;
    const angle = -Math.PI / 2 + i * angleStep;
    return {
      x: cx + Math.cos(angle) * maxR * val,
      y: cy + Math.sin(angle) * maxR * val,
      lx: cx + Math.cos(angle) * (maxR + 14),
      ly: cy + Math.sin(angle) * (maxR + 14),
      label: dim.label.slice(0, 3),
      hue: dim.hue,
      val,
    };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  return (
    <div className="flex items-center justify-center" style={{ height: 140 }}>
      <svg width={400} height={140} viewBox="0 0 400 140" className="w-full" style={{ maxWidth: 500 }}>
        {/* Grid rings */}
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <polygon
            key={r}
            points={dims.map((_, i) => {
              const a = -Math.PI / 2 + i * angleStep;
              return `${cx + Math.cos(a) * maxR * r},${cy + Math.sin(a) * maxR * r}`;
            }).join(" ")}
            fill="none"
            stroke="hsla(38, 10%, 25%, 0.15)"
            strokeWidth={0.5}
          />
        ))}
        {/* Axes */}
        {dims.map((_, i) => {
          const a = -Math.PI / 2 + i * angleStep;
          return (
            <line
              key={i}
              x1={cx} y1={cy}
              x2={cx + Math.cos(a) * maxR}
              y2={cy + Math.sin(a) * maxR}
              stroke="hsla(38, 10%, 25%, 0.1)"
              strokeWidth={0.5}
            />
          );
        })}
        {/* Fill shape */}
        <path
          d={pathD}
          fill="hsla(38, 40%, 50%, 0.08)"
          stroke="hsla(38, 50%, 60%, 0.4)"
          strokeWidth={1.5}
          style={{ filter: "drop-shadow(0 0 6px hsla(38, 50%, 55%, 0.15))" }}
        />
        {/* Vertices */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3} fill={`hsl(${p.hue}, 50%, 60%)`} opacity={0.8}>
              <animate attributeName="r" values="3;4;3" dur="2s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
            </circle>
            <text x={p.lx} y={p.ly + 3} textAnchor="middle" fill={`hsla(${p.hue}, 35%, 60%, 0.55)`} fontSize="10" fontFamily="'DM Sans', sans-serif">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── Turntable Platter Module ────────────────────────────────────────

function TurntableModule({
  side,
  preset,
  spinning,
  accentColor,
  onSelect,
  selectedId,
}: {
  side: "A" | "B";
  preset: DimensionPreset | null;
  spinning: boolean;
  accentColor: string;
  onSelect: (p: DimensionPreset) => void;
  selectedId: string | null;
}) {
  const hue = preset ? presetHue(preset) : 0;
  const phases: ("learn" | "work" | "play")[] = side === "A" ? ["learn", "work", "play"] : ["play", "work", "learn"];

  return (
    <div className="flex flex-col items-center gap-3 p-3 w-full">
      <span className="text-[11px] tracking-[0.2em] uppercase font-medium" style={{ color: accentColor }}>
        Deck {side}
      </span>

      {/* Vinyl */}
      <div className="relative flex items-center justify-center" style={{ width: 110, height: 110 }}>
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 45% 40%, hsl(20, 4%, 14%) 0%, hsl(20, 4%, 8%) 60%, hsl(20, 4%, 5%) 100%)`,
            border: `2px solid hsla(0, 0%, 18%, 0.3)`,
            boxShadow: `inset 0 0 16px hsla(0,0%,0%,0.6), 0 0 20px hsla(0,0%,0%,0.3)`,
          }}
        />
        {[30, 38, 46, 54].map((r) => (
          <div key={r} className="absolute rounded-full pointer-events-none"
            style={{ width: r, height: r, border: "0.5px solid hsla(0, 0%, 22%, 0.12)", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
        ))}
        <div className="absolute rounded-full pointer-events-none"
          style={{ inset: 2, border: `1.5px solid ${accentColor}`, opacity: spinning ? 0.3 : 0.1, transition: "opacity 0.5s" }} />
        <motion.div
          className="relative w-10 h-10 rounded-full flex items-center justify-center z-10"
          animate={spinning ? { rotate: 360 } : { rotate: 0 }}
          transition={spinning ? { duration: 2.5, repeat: Infinity, ease: "linear" } : { duration: 0.5 }}
          style={{
            background: preset
              ? `radial-gradient(circle at 40% 35%, hsla(${hue}, 40%, 30%, 0.9), hsla(${hue}, 30%, 15%, 0.95))`
              : "hsl(20, 4%, 10%)",
            border: `1.5px solid ${preset ? `hsla(${hue}, 35%, 45%, 0.4)` : "hsla(0,0%,18%,0.3)"}`,
            boxShadow: preset ? `0 0 12px hsla(${hue}, 50%, 40%, 0.15)` : "none",
          }}
        >
          {preset ? (
            <span className="text-[16px]" style={{ color: `hsl(${hue}, 45%, 65%)` }}>{preset.icon}</span>
          ) : (
            <span className="text-[11px]" style={{ color: DJ.textDim }}>—</span>
          )}
        </motion.div>
      </div>

      {/* Preset name */}
      {preset && (
        <div className="text-center">
          <span className="text-[12px] font-medium block" style={{ color: DJ.text }}>{preset.name}</span>
          <span className="text-[10px]" style={{ color: DJ.textDim }}>{preset.subtitle}</span>
        </div>
      )}

      {/* Preset grid */}
      <div className="w-full px-1">
        {phases.map((phase) => {
          const phasePresets = PRESETS.filter((p) => p.phase === phase);
          const phaseHue = phase === "learn" ? 210 : phase === "work" ? 38 : 280;
          return (
            <div key={phase} className="mb-1.5">
              <span className="text-[10px] tracking-[0.15em] uppercase block mb-1 px-1 font-medium"
                style={{ color: `hsla(${phaseHue}, 30%, 50%, 0.4)` }}>
                {phase.charAt(0).toUpperCase() + phase.slice(1)}
              </span>
              <div className="flex gap-1">
                {phasePresets.map((p) => {
                  const active = selectedId === p.id;
                  const pH = presetHue(p);
                  return (
                    <button
                      key={p.id}
                      onPointerDown={() => onSelect(p)}
                      className="flex-1 rounded-lg py-2 px-1.5 transition-all duration-150 text-center"
                      style={{
                        background: active ? `hsla(${pH}, 25%, 18%, 0.6)` : DJ.groove,
                        border: `1px solid ${active ? `hsla(${pH}, 40%, 45%, 0.35)` : DJ.border}`,
                        boxShadow: active ? `0 0 10px hsla(${pH}, 50%, 40%, 0.12)` : "none",
                      }}
                    >
                      <span className="text-[14px] block" style={{ color: active ? `hsl(${pH}, 45%, 60%)` : DJ.textDim }}>
                        {p.icon}
                      </span>
                      <span className="text-[11px] font-medium block mt-0.5" style={{ color: active ? DJ.text : DJ.textMuted }}>
                        {p.name.replace("The ", "")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Channel Fader ───────────────────────────────────────────────────

function ChannelFader({
  label,
  lowLabel,
  highLabel,
  value,
  onChange,
  hue,
}: {
  label: string;
  lowLabel: string;
  highLabel: string;
  value: number;
  onChange: (v: number) => void;
  hue: number;
}) {
  const pct = Math.round(value * 100);
  const accent = `hsl(${hue}, 45%, 55%)`;
  const accentGlow = `hsla(${hue}, 55%, 50%, 0.25)`;

  return (
    <div className="flex flex-col items-center" style={{ width: 44 }}>
      <span className="text-[8px] tracking-wider uppercase mb-1" style={{ color: `hsla(${hue}, 30%, 55%, 0.35)` }}>
        {highLabel}
      </span>
      <div
        className="relative rounded-full flex items-center justify-center"
        style={{
          width: 24,
          height: 100,
          background: DJ.groove,
          border: `1px solid ${DJ.border}`,
          boxShadow: "inset 0 2px 6px hsla(0,0%,0%,0.3)",
        }}
      >
        <div className="absolute rounded-full"
          style={{ width: 2, top: 10, bottom: 10, left: "50%", transform: "translateX(-50%)", background: "hsla(20, 4%, 14%, 0.5)" }} />
        <div className="absolute rounded-full transition-all duration-100"
          style={{ width: 2, bottom: 10, left: "50%", transform: "translateX(-50%)", height: `${pct * 0.72}%`, maxHeight: "calc(100% - 20px)", background: `linear-gradient(to top, ${accent}, hsla(${hue}, 35%, 40%, 0.15))` }} />
        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none transition-all duration-100"
          style={{
            bottom: `calc(10px + ${pct}% * 0.72)`,
            width: 18, height: 7, borderRadius: 3,
            background: `linear-gradient(180deg, hsl(22, 8%, 32%), hsl(22, 8%, 18%))`,
            border: `1px solid hsla(${hue}, 30%, 40%, 0.3)`,
            boxShadow: `0 0 6px ${accentGlow}, 0 1px 3px hsla(0,0%,0%,0.4)`,
          }}
        />
        <input type="range" min={0} max={100} value={pct}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          className="absolute inset-0 opacity-0 cursor-pointer z-10"
          style={{ width: "100%", height: "100%", writingMode: "vertical-lr", direction: "rtl", margin: 0, WebkitAppearance: "slider-vertical" }}
        />
      </div>
      <span className="text-[8px] tracking-wider uppercase mt-1" style={{ color: `hsla(${hue}, 30%, 55%, 0.35)` }}>
        {lowLabel}
      </span>
      <span className="text-[11px] font-medium mt-1" style={{ color: accent }}>{label}</span>
      <span className="text-[11px] font-mono" style={{ color: DJ.textMuted }}>{pct}</span>
    </div>
  );
}

// ── Crossfader Module ───────────────────────────────────────────────

function CrossfaderModule({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const pct = Math.round(value * 100);

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] font-medium tracking-wide" style={{ color: DJ.deckA }}>A</span>
        <span className="text-[11px] tracking-[0.2em] uppercase" style={{ color: DJ.textDim }}>Crossfader</span>
        <span className="text-[13px] font-medium tracking-wide" style={{ color: DJ.deckB }}>B</span>
      </div>
      <div className="relative h-10 flex items-center">
        <div className="absolute inset-x-0 h-[5px] rounded-full"
          style={{ background: `linear-gradient(90deg, ${DJ.deckADim}, hsla(30, 8%, 12%, 0.4), ${DJ.deckBDim})` }} />
        <div className="absolute left-0 h-[5px] rounded-full transition-all duration-75"
          style={{ width: `${100 - pct}%`, background: `linear-gradient(90deg, ${DJ.deckA}, hsla(200, 35%, 45%, 0.1))`, opacity: 0.5 }} />
        <div className="absolute right-0 h-[5px] rounded-full transition-all duration-75"
          style={{ width: `${pct}%`, background: `linear-gradient(270deg, ${DJ.deckB}, hsla(25, 35%, 45%, 0.1))`, opacity: 0.5 }} />
        <div className="absolute pointer-events-none transition-all duration-75"
          style={{
            left: `calc(${pct}% - 18px)`,
            width: 36, height: 18, borderRadius: 5,
            background: `linear-gradient(180deg, hsl(22, 8%, 32%), hsl(22, 8%, 16%))`,
            border: "1px solid hsla(38, 25%, 35%, 0.3)",
            boxShadow: "0 0 10px hsla(38, 50%, 45%, 0.12), 0 2px 6px hsla(0,0%,0%,0.5)",
            top: "50%", transform: "translateY(-50%)",
          }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ width: 14, height: 1.5, background: "hsla(38, 30%, 50%, 0.4)", borderRadius: 1 }} />
        </div>
        <input type="range" min={0} max={100} value={pct}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" style={{ margin: 0 }} />
      </div>
      <div className="flex justify-center mt-1.5">
        <span className="text-[12px] font-mono" style={{ color: DJ.textMuted }}>
          {pct === 0 ? "Pure A" : pct === 100 ? "Pure B" : pct === 50 ? "50 / 50" : `${100 - pct} / ${pct}`}
        </span>
      </div>
    </div>
  );
}

// ── Main Bottom-Sliding Deck ────────────────────────────────────────

interface ProModeDeckProps {
  open: boolean;
  onClose: () => void;
  coherenceH: number;
  values: DimensionValues;
  onChange: (values: DimensionValues) => void;
  activePresetId: string | null;
  onSelectPreset: (preset: DimensionPreset) => void;
  inputSlot?: React.ReactNode;
}

export default memo(function ProModeDeck({
  open,
  onClose,
  coherenceH,
  values,
  onChange,
  activePresetId,
  onSelectPreset,
  inputSlot,
}: ProModeDeckProps) {
  const [deckAPreset, setDeckAPreset] = useState<DimensionPreset | null>(null);
  const [deckBPreset, setDeckBPreset] = useState<DimensionPreset | null>(null);
  const [crossfader, setCrossfader] = useState(0.5);
  const [manualOverride, setManualOverride] = useState(false);
  const [moduleOrder, setModuleOrder] = useState<string[]>(loadOrder);
  const [screenMode, setScreenMode] = useState<ScreenMode>("spectrum");

  const screenModes: { key: ScreenMode; label: string }[] = [
    { key: "spectrum", label: "Spectrum" },
    { key: "coherence", label: "Coherence" },
    { key: "radar", label: "Radar" },
  ];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  useEffect(() => {
    if (manualOverride) return;
    const aVals = deckAPreset?.values ?? getDefaultValues();
    const bVals = deckBPreset?.values ?? getDefaultValues();
    const blended = blendValues(aVals, bVals, crossfader);
    onChange(blended);
    if (crossfader < 0.1 && deckAPreset) onSelectPreset(deckAPreset);
    else if (crossfader > 0.9 && deckBPreset) onSelectPreset(deckBPreset);
  }, [deckAPreset, deckBPreset, crossfader, manualOverride]);

  const handleFaderChange = useCallback(
    (dimId: string, value: number) => {
      setManualOverride(true);
      onChange({ ...values, [dimId]: value });
    },
    [values, onChange],
  );

  const handleReset = useCallback(() => {
    setDeckAPreset(null);
    setDeckBPreset(null);
    setCrossfader(0.5);
    setManualOverride(false);
    onChange(getDefaultValues());
  }, [onChange]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setModuleOrder((prev) => {
        const next = arrayMove(
          prev,
          prev.indexOf(active.id as string),
          prev.indexOf(over.id as string),
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const groupedDimensions = useMemo(() => {
    const groups: Record<DimensionCategory, typeof DIMENSIONS[number][]> = {
      reasoning: [], expression: [], awareness: [],
    };
    for (const d of DIMENSIONS) groups[d.category].push(d);
    return groups;
  }, []);

  // Module renderers
  const renderModule = useCallback((moduleId: string) => {
    switch (moduleId) {
      case "turntable-a":
        return (
          <TurntableModule
            side="A"
            preset={deckAPreset}
            spinning={!!deckAPreset && crossfader < 0.95}
            accentColor={DJ.deckA}
            onSelect={(p) => { setDeckAPreset(p); setManualOverride(false); }}
            selectedId={deckAPreset?.id ?? null}
          />
        );

      case "turntable-b":
        return (
          <TurntableModule
            side="B"
            preset={deckBPreset}
            spinning={!!deckBPreset && crossfader > 0.05}
            accentColor={DJ.deckB}
            onSelect={(p) => { setDeckBPreset(p); setManualOverride(false); }}
            selectedId={deckBPreset?.id ?? null}
          />
        );

      case "screen":
        return (
          <div className="p-2">
            {/* Screen mode tabs */}
            <div className="flex items-center justify-between px-2 pb-2">
              <div className="flex gap-1">
                {screenModes.map((mode) => (
                  <button
                    key={mode.key}
                    onPointerDown={() => setScreenMode(mode.key)}
                    className="px-2.5 py-1 rounded-md text-[11px] tracking-wider uppercase font-medium transition-all duration-200"
                    style={{
                      color: screenMode === mode.key ? DJ.gold : DJ.textDim,
                      background: screenMode === mode.key ? DJ.goldGlow : "transparent",
                      border: `1px solid ${screenMode === mode.key ? DJ.borderAccent : "transparent"}`,
                    }}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full"
                  style={{ background: coherenceH > 0.7 ? DJ.green : coherenceH > 0.4 ? DJ.gold : DJ.red, boxShadow: `0 0 6px ${coherenceH > 0.7 ? DJ.green : DJ.gold}` }} />
                <span className="text-[11px] font-mono" style={{ color: DJ.textMuted }}>H:{Math.round(coherenceH * 100)}</span>
              </div>
            </div>

            <div className="rounded-lg overflow-hidden"
              style={{
                background: DJ.screen,
                border: `1px solid ${DJ.screenBorder}`,
                boxShadow: "inset 0 2px 8px hsla(0,0%,0%,0.5), 0 0 20px hsla(38, 50%, 40%, 0.04)",
              }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={screenMode}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {screenMode === "spectrum" && (
                    <ScreenSpectrum values={values} coherenceH={coherenceH} />
                  )}
                  {screenMode === "coherence" && (
                    <ScreenCoherence values={values} coherenceH={coherenceH} deckA={deckAPreset} deckB={deckBPreset} mix={crossfader} />
                  )}
                  {screenMode === "radar" && (
                    <ScreenRadar values={values} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        );

      case "input":
        return inputSlot ? (
          <div className="p-3">{inputSlot}</div>
        ) : null;

      case "faders-reasoning":
      case "faders-expression":
      case "faders-awareness": {
        const cat = moduleId.replace("faders-", "") as DimensionCategory;
        const meta = CATEGORY_META[cat];
        const dims = groupedDimensions[cat];
        return (
          <div className="p-3">
            <div className="flex items-center gap-1.5 mb-2 px-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: `hsla(${meta.hue}, 50%, 55%, 0.5)` }} />
              <span className="text-[11px] tracking-[0.15em] uppercase font-medium" style={{ color: `hsla(${meta.hue}, 35%, 60%, 0.5)` }}>
                {meta.label}
              </span>
            </div>
            <div className="flex justify-center" style={{ gap: 6 }}>
              {dims.map((dim) => (
                <ChannelFader
                  key={dim.id}
                  label={dim.label}
                  lowLabel={dim.lowLabel}
                  highLabel={dim.highLabel}
                  value={values[dim.id] ?? dim.defaultValue}
                  onChange={(v) => handleFaderChange(dim.id, v)}
                  hue={dim.hue}
                />
              ))}
            </div>
          </div>
        );
      }

      case "crossfader":
        return (
          <CrossfaderModule
            value={crossfader}
            onChange={(v) => { setCrossfader(v); setManualOverride(false); }}
          />
        );

      default:
        return null;
    }
  }, [deckAPreset, deckBPreset, crossfader, values, coherenceH, screenMode, inputSlot, groupedDimensions, handleFaderChange]);

  // Module span sizes for grid
  const getModuleSpan = (id: string): number => {
    if (id === "screen" || id === "input" || id === "crossfader") return 3;
    return 1;
  };

  const getModuleLabel = (id: string): string => {
    return ALL_MODULES.find((m) => m.id === id)?.label ?? id;
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: "100%", opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
          className="flex flex-col"
          style={{
            background: DJ.chassis,
            fontFamily: DJ.font,
            borderTop: `1px solid ${DJ.borderAccent}`,
            boxShadow: "0 -4px 40px hsla(0,0%,0%,0.5), 0 -1px 0 hsla(38, 20%, 30%, 0.1)",
            maxHeight: "70vh",
            minHeight: 380,
          }}
        >
          {/* ── Handle Bar ─────────────────────────────────────── */}
          <div
            className="flex-shrink-0 flex items-center justify-between px-5 py-2.5 cursor-pointer"
            onPointerDown={onClose}
            style={{ borderBottom: `1px solid ${DJ.border}` }}
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full" style={{ background: DJ.gold, boxShadow: `0 0 8px ${DJ.goldGlow}` }} />
              <span className="text-[12px] tracking-[0.25em] uppercase font-medium" style={{ color: DJ.textMuted }}>
                Pro Mode
              </span>
              <span className="text-[16px] font-light" style={{ fontFamily: DJ.fontDisplay, color: DJ.text }}>
                Lumen Experience Deck
              </span>
            </div>
            <div className="flex items-center gap-2">
              {manualOverride && (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full" style={{ background: "hsla(38, 30%, 30%, 0.2)", color: DJ.gold, border: `1px solid ${DJ.borderAccent}` }}>
                  Custom Mix
                </span>
              )}
              <button
                onPointerDown={(e) => { e.stopPropagation(); handleReset(); }}
                className="text-[11px] tracking-widest uppercase px-3 py-1 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ color: DJ.textMuted, background: DJ.channel, border: `1px solid ${DJ.border}` }}
              >
                Reset
              </button>
              <ChevronDown className="w-4 h-4" style={{ color: DJ.textMuted }} />
            </div>
          </div>

          {/* ── Modular Grid ──────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: "none" }}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={moduleOrder} strategy={rectSortingStrategy}>
                <div
                  className="grid gap-2"
                  style={{
                    gridTemplateColumns: "repeat(3, 1fr)",
                    maxWidth: 900,
                    margin: "0 auto",
                  }}
                >
                  {moduleOrder.map((moduleId) => (
                    <SortableModule
                      key={moduleId}
                      id={moduleId}
                      label={getModuleLabel(moduleId)}
                      span={getModuleSpan(moduleId)}
                    >
                      {renderModule(moduleId)}
                    </SortableModule>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {/* ── Bottom status bar ───────────────────────────── */}
          <div
            className="flex-shrink-0 flex items-center justify-between px-6 py-2"
            style={{ borderTop: `1px solid ${DJ.border}`, background: DJ.chassis }}
          >
            <span className="text-[10px] tracking-[0.2em] uppercase" style={{ color: DJ.textDim }}>
              Drag modules to rearrange · Every setting shapes your experience
            </span>
            <span className="text-[10px] tracking-[0.15em] uppercase" style={{ color: DJ.textDim }}>
              Hologram · Lumen
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
