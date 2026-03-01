/**
 * ProModeDeck — Pioneer-Style DJ Controller for Lumen
 * ════════════════════════════════════════════════════
 *
 * Modeled after the Pioneer DJ Opus-Quad. Three-section layout:
 *   Left Deck (turntable + presets)
 *   Center Mixer (raised screen + input + faders + crossfader)
 *   Right Deck (turntable + presets)
 *
 * Compact height, shaped top edge, realistic hardware textures.
 *
 * @module hologram-ui/components/lumen/ProModeDeck
 */

import { useState, useCallback, useMemo, useEffect, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import {
  DIMENSIONS,
  PRESETS,
  CATEGORY_META,
  getDefaultValues,
  type DimensionValues,
  type DimensionCategory,
  type DimensionPreset,
} from "@/modules/hologram-ui/engine/proModeDimensions";

// ── Hardware Palette ────────────────────────────────────────────────
const HW = {
  body: "hsl(20, 4%, 8%)",
  bodyLight: "hsl(20, 4%, 10%)",
  surface: "hsl(20, 3%, 12%)",
  surfaceRaised: "hsl(20, 3%, 14%)",
  groove: "hsl(20, 3%, 6%)",
  border: "hsla(0, 0%, 20%, 0.2)",
  borderLight: "hsla(0, 0%, 25%, 0.15)",
  text: "hsl(40, 12%, 85%)",
  textSub: "hsl(35, 8%, 60%)",
  textDim: "hsl(30, 5%, 35%)",
  gold: "hsl(38, 55%, 52%)",
  goldGlow: "hsla(38, 60%, 50%, 0.12)",
  goldBright: "hsl(38, 65%, 60%)",
  screen: "hsl(220, 12%, 4%)",
  screenBorder: "hsla(220, 8%, 22%, 0.25)",
  deckA: "hsl(200, 50%, 55%)",
  deckAGlow: "hsla(200, 55%, 50%, 0.2)",
  deckB: "hsl(30, 60%, 52%)",
  deckBGlow: "hsla(30, 55%, 50%, 0.2)",
  green: "hsl(120, 40%, 48%)",
  red: "hsl(0, 55%, 50%)",
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

// ── LED Indicator ───────────────────────────────────────────────────

function LED({ on, color = HW.gold, size = 5 }: { on: boolean; color?: string; size?: number }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        background: on ? color : "hsla(0,0%,15%,0.5)",
        boxShadow: on ? `0 0 ${size}px ${color}, 0 0 ${size * 2}px ${color}40` : "none",
        transition: "all 0.3s",
      }}
    />
  );
}

// ── Hardware Button ─────────────────────────────────────────────────

function HWButton({
  label,
  active,
  onPress,
  accent = HW.gold,
  size = "sm",
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  accent?: string;
  size?: "sm" | "md";
}) {
  const h = size === "md" ? 28 : 22;
  return (
    <button
      onPointerDown={onPress}
      className="transition-all duration-100 active:scale-95"
      style={{
        height: h,
        padding: "0 8px",
        borderRadius: 4,
        fontSize: size === "md" ? 12 : 10,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        fontFamily: HW.font,
        color: active ? accent : HW.textDim,
        background: active
          ? `linear-gradient(180deg, hsla(0,0%,18%,0.8), hsla(0,0%,12%,0.9))`
          : `linear-gradient(180deg, hsla(0,0%,14%,0.6), hsla(0,0%,9%,0.8))`,
        border: `1px solid ${active ? `${accent}40` : HW.border}`,
        boxShadow: active
          ? `0 0 8px ${accent}25, inset 0 1px 0 hsla(0,0%,100%,0.04)`
          : "inset 0 1px 0 hsla(0,0%,100%,0.03), 0 1px 2px hsla(0,0%,0%,0.3)",
      }}
    >
      {label}
    </button>
  );
}

// ── Rotary Knob (realistic) ─────────────────────────────────────────

function RotaryKnob({
  label,
  value,
  onChange,
  hue,
  size = 40,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hue: number;
  size?: number;
}) {
  const pct = Math.round(value * 100);
  const accent = `hsl(${hue}, 45%, 55%)`;
  const angle = -135 + value * 270;

  const handleDrag = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startVal = value;
    const onMove = (ev: PointerEvent) => {
      const delta = (startY - ev.clientY) / 120;
      onChange(Math.max(0, Math.min(1, startVal + delta)));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [value, onChange]);

  return (
    <div className="flex flex-col items-center" style={{ width: size + 12 }}>
      <div
        className="relative rounded-full cursor-pointer"
        style={{
          width: size, height: size,
          background: `radial-gradient(circle at 38% 32%, hsl(0, 0%, 22%), hsl(0, 0%, 10%))`,
          border: `1.5px solid hsla(0, 0%, 28%, 0.4)`,
          boxShadow: `0 2px 6px hsla(0,0%,0%,0.5), inset 0 1px 2px hsla(0,0%,100%,0.04)`,
        }}
        onPointerDown={handleDrag}
      >
        {/* Arc track */}
        <svg className="absolute inset-0" viewBox="0 0 40 40" style={{ width: size, height: size }}>
          <circle cx="20" cy="20" r="16" fill="none" stroke="hsla(0,0%,20%,0.3)" strokeWidth="2"
            strokeDasharray="75.4" strokeDashoffset="18.85" transform="rotate(135 20 20)" />
          <circle cx="20" cy="20" r="16" fill="none" stroke={accent} strokeWidth="2"
            strokeDasharray="75.4" strokeDashoffset={75.4 - value * 56.55} transform="rotate(135 20 20)"
            style={{ filter: `drop-shadow(0 0 3px ${accent})`, transition: "stroke-dashoffset 0.08s" }} />
        </svg>
        {/* Pointer */}
        <div className="absolute" style={{
          top: "50%", left: "50%",
          width: 2, height: size / 2 - 6,
          background: accent, borderRadius: 1,
          transformOrigin: "bottom center",
          transform: `translate(-50%, -100%) rotate(${angle}deg)`,
          transition: "transform 0.08s",
          boxShadow: `0 0 4px ${accent}`,
        }} />
        {/* Center dot */}
        <div className="absolute rounded-full" style={{ width: 3, height: 3, top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "hsla(0,0%,35%,0.6)" }} />
      </div>
      <span className="text-[10px] font-semibold mt-1 tracking-wide" style={{ color: accent }}>{label}</span>
      <span className="text-[9px] font-mono" style={{ color: HW.textDim }}>{pct}</span>
    </div>
  );
}

// ── Vertical Channel Fader ──────────────────────────────────────────

function ChannelFader({
  label, value, onChange, hue,
}: {
  label: string; value: number; onChange: (v: number) => void; hue: number;
}) {
  const pct = Math.round(value * 100);
  const accent = `hsl(${hue}, 45%, 55%)`;

  return (
    <div className="flex flex-col items-center" style={{ width: 36 }}>
      <div
        className="relative rounded-md flex items-center justify-center"
        style={{
          width: 20, height: 80,
          background: HW.groove,
          border: `1px solid ${HW.border}`,
          boxShadow: "inset 0 1px 4px hsla(0,0%,0%,0.4)",
        }}
      >
        {/* Center track */}
        <div className="absolute" style={{ width: 2, top: 8, bottom: 8, left: "50%", transform: "translateX(-50%)", background: "hsla(0,0%,16%,0.5)", borderRadius: 1 }} />
        {/* Fill */}
        <div className="absolute transition-all duration-75" style={{
          width: 2, bottom: 8, left: "50%", transform: "translateX(-50%)", borderRadius: 1,
          height: `${pct * 0.7}%`, maxHeight: "calc(100% - 16px)",
          background: `linear-gradient(to top, ${accent}, hsla(${hue}, 35%, 35%, 0.2))`,
        }} />
        {/* LED dots */}
        {[0.25, 0.5, 0.75].map((t) => (
          <div key={t} className="absolute" style={{
            width: 3, height: 3, borderRadius: "50%", right: 2,
            bottom: `${8 + t * 62}%`,
            background: pct / 100 >= t ? `hsla(${hue}, 55%, 55%, 0.8)` : "hsla(0,0%,15%,0.3)",
            boxShadow: pct / 100 >= t ? `0 0 3px hsla(${hue}, 55%, 55%, 0.5)` : "none",
            transition: "all 0.1s",
          }} />
        ))}
        {/* Thumb cap */}
        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none transition-all duration-75" style={{
          bottom: `calc(8px + ${pct}% * 0.56)`,
          width: 16, height: 8, borderRadius: 2,
          background: `linear-gradient(180deg, hsl(0, 0%, 30%), hsl(0, 0%, 16%))`,
          border: `1px solid hsla(${hue}, 25%, 40%, 0.25)`,
          boxShadow: `0 0 4px hsla(${hue}, 50%, 50%, 0.15), 0 1px 2px hsla(0,0%,0%,0.5)`,
        }}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: 6, height: 1, background: `hsla(${hue}, 30%, 50%, 0.4)`, borderRadius: 1 }} />
        </div>
        <input type="range" min={0} max={100} value={pct}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          className="absolute inset-0 opacity-0 cursor-pointer z-10"
          style={{ width: "100%", height: "100%", writingMode: "vertical-lr", direction: "rtl", margin: 0, WebkitAppearance: "slider-vertical" }} />
      </div>
      <span className="text-[11px] font-semibold mt-1.5" style={{ color: accent }}>{label}</span>
      <span className="text-[9px] font-mono" style={{ color: HW.textDim }}>{pct}</span>
    </div>
  );
}

// ── Turntable Platter ───────────────────────────────────────────────

function Platter({
  side, preset, spinning, accentColor, onSelect, selectedId,
}: {
  side: "A" | "B";
  preset: DimensionPreset | null;
  spinning: boolean;
  accentColor: string;
  onSelect: (p: DimensionPreset) => void;
  selectedId: string | null;
}) {
  const hue = preset ? presetHue(preset) : 0;

  return (
    <div className="flex flex-col items-center w-full">
      {/* Platter */}
      <div className="relative flex items-center justify-center mb-3" style={{ width: 130, height: 130 }}>
        {/* Outer ring — gold accent like Pioneer */}
        <div className="absolute rounded-full" style={{
          inset: 0,
          border: `2px solid ${accentColor}`,
          opacity: spinning ? 0.35 : 0.12,
          transition: "opacity 0.5s",
        }} />
        {/* Body */}
        <div className="absolute rounded-full" style={{
          inset: 3,
          background: `radial-gradient(circle at 45% 38%, hsl(0, 0%, 16%) 0%, hsl(0, 0%, 9%) 55%, hsl(0, 0%, 6%) 100%)`,
          boxShadow: `inset 0 0 20px hsla(0,0%,0%,0.6), 0 4px 16px hsla(0,0%,0%,0.4)`,
        }} />
        {/* Grooves */}
        {[32, 40, 48, 56].map((r) => (
          <div key={r} className="absolute rounded-full pointer-events-none"
            style={{ width: r, height: r, border: "0.5px solid hsla(0,0%,20%,0.1)", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
        ))}
        {/* Center label disc */}
        <motion.div
          className="relative w-12 h-12 rounded-full flex items-center justify-center z-10"
          animate={spinning ? { rotate: 360 } : { rotate: 0 }}
          transition={spinning ? { duration: 2, repeat: Infinity, ease: "linear" } : { duration: 0.4 }}
          style={{
            background: preset
              ? `radial-gradient(circle at 40% 35%, hsla(${hue}, 40%, 28%, 0.9), hsla(${hue}, 25%, 12%, 0.95))`
              : `radial-gradient(circle at 40% 35%, hsl(0,0%,15%), hsl(0,0%,8%))`,
            border: `1px solid ${preset ? `hsla(${hue}, 35%, 45%, 0.3)` : "hsla(0,0%,20%,0.3)"}`,
            boxShadow: preset ? `0 0 12px hsla(${hue}, 50%, 40%, 0.12)` : "none",
          }}
        >
          {preset ? (
            <span className="text-[18px]" style={{ color: `hsl(${hue}, 45%, 65%)` }}>{preset.icon}</span>
          ) : (
            <span className="text-[12px] font-medium" style={{ color: HW.textDim }}>—</span>
          )}
        </motion.div>
        {/* Spinning dot */}
        {spinning && (
          <motion.div className="absolute pointer-events-none" animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} style={{ inset: 10 }}>
            <div className="absolute rounded-full" style={{ width: 4, height: 4, background: accentColor, top: 0, left: "50%", transform: "translateX(-50%)", boxShadow: `0 0 6px ${accentColor}` }} />
          </motion.div>
        )}
      </div>

      {/* Deck label + preset name */}
      <div className="text-center mb-2">
        <span className="text-[11px] tracking-[0.2em] uppercase font-semibold" style={{ color: accentColor }}>Deck {side}</span>
        {preset && <span className="text-[13px] font-medium block mt-0.5" style={{ color: HW.text }}>{preset.name}</span>}
      </div>

      {/* Presets — compact grid */}
      <div className="w-full space-y-1.5 px-1">
        {(["learn", "work", "play"] as const).map((phase) => {
          const phasePresets = PRESETS.filter((p) => p.phase === phase);
          const phaseHue = phase === "learn" ? 210 : phase === "work" ? 38 : 280;
          return (
            <div key={phase}>
              <span className="text-[10px] tracking-[0.15em] uppercase block mb-1 px-0.5 font-semibold"
                style={{ color: `hsla(${phaseHue}, 35%, 55%, 0.45)` }}>
                {phase}
              </span>
              <div className="flex gap-1">
                {phasePresets.map((p) => {
                  const active = selectedId === p.id;
                  const pH = presetHue(p);
                  return (
                    <button key={p.id} onPointerDown={() => onSelect(p)}
                      className="flex-1 rounded-md py-1.5 px-1 transition-all duration-100 text-center active:scale-95"
                      style={{
                        background: active ? `hsla(${pH}, 22%, 16%, 0.7)` : HW.groove,
                        border: `1px solid ${active ? `hsla(${pH}, 40%, 45%, 0.3)` : HW.border}`,
                        boxShadow: active ? `0 0 8px hsla(${pH}, 50%, 45%, 0.1)` : "none",
                      }}>
                      <span className="text-[15px] block" style={{ color: active ? `hsl(${pH}, 45%, 62%)` : HW.textDim }}>{p.icon}</span>
                      <span className="text-[12px] font-semibold block mt-0.5" style={{ color: active ? HW.text : HW.textSub }}>
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

// ── Screen Views ────────────────────────────────────────────────────

type ScreenMode = "spectrum" | "coherence" | "radar";

function ScreenSpectrum({ values, coherenceH }: { values: DimensionValues; coherenceH: number }) {
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
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const dims = DIMENSIONS;
      const barW = Math.floor((w - 40) / dims.length);
      const startX = Math.floor((w - barW * dims.length) / 2);
      const t = Date.now() * 0.001;

      dims.forEach((dim, i) => {
        const val = values[dim.id] ?? dim.defaultValue;
        const barH = val * (h - 28);
        const x = startX + i * barW;
        const shimmer = Math.sin(t * 2.5 + i * 0.6) * 0.05 + 1;
        const finalH = barH * shimmer;
        const meta = CATEGORY_META[dim.category];
        const alpha = 0.5 + val * 0.5;

        ctx.shadowBlur = 10;
        ctx.shadowColor = `hsla(${meta.hue}, 55%, 55%, ${alpha * 0.2})`;

        const gradient = ctx.createLinearGradient(x, h - 8, x, h - 8 - finalH);
        gradient.addColorStop(0, `hsla(${meta.hue}, 35%, 28%, ${alpha * 0.4})`);
        gradient.addColorStop(0.4, `hsla(${meta.hue}, 50%, 50%, ${alpha * 0.7})`);
        gradient.addColorStop(1, `hsla(${meta.hue}, 60%, 65%, ${alpha})`);
        ctx.fillStyle = gradient;

        const bx = x + 2, bw = barW - 4, by = h - 8 - finalH;
        const r = Math.min(bw / 2, 3);
        ctx.beginPath();
        ctx.moveTo(bx, h - 8); ctx.lineTo(bx, by + r);
        ctx.quadraticCurveTo(bx, by, bx + r, by);
        ctx.lineTo(bx + bw - r, by);
        ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
        ctx.lineTo(bx + bw, h - 8); ctx.closePath(); ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = `hsla(${meta.hue}, 65%, 72%, ${alpha})`;
        ctx.fillRect(bx, by, bw, 1.5);

        ctx.fillStyle = `hsla(${meta.hue}, 25%, 55%, 0.55)`;
        ctx.font = "bold 10px 'DM Sans', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(dim.label.slice(0, 5).toUpperCase(), x + barW / 2, h);
      });

      const lineY = h - 8 - coherenceH * (h - 28);
      ctx.beginPath();
      ctx.strokeStyle = "hsla(38, 50%, 55%, 0.18)";
      ctx.lineWidth = 1; ctx.setLineDash([3, 5]);
      ctx.moveTo(14, lineY); ctx.lineTo(w - 14, lineY); ctx.stroke(); ctx.setLineDash([]);

      frameRef.current = requestAnimationFrame(render);
    };
    render();
    return () => { running = false; cancelAnimationFrame(frameRef.current); };
  }, [values, coherenceH]);

  return <canvas ref={canvasRef} width={600} height={100} className="w-full" style={{ height: 100 }} />;
}

function ScreenCoherence({ values, coherenceH, deckA, deckB, mix }: {
  values: DimensionValues; coherenceH: number;
  deckA: DimensionPreset | null; deckB: DimensionPreset | null; mix: number;
}) {
  const pct = Math.round(coherenceH * 100);
  const hue = 38 + coherenceH * 80;

  const catAvg = useMemo(() => {
    const cats: Record<DimensionCategory, { sum: number; count: number }> = {
      reasoning: { sum: 0, count: 0 }, expression: { sum: 0, count: 0 }, awareness: { sum: 0, count: 0 },
    };
    for (const d of DIMENSIONS) { cats[d.category].sum += values[d.id] ?? d.defaultValue; cats[d.category].count++; }
    return {
      reasoning: Math.round((cats.reasoning.sum / cats.reasoning.count) * 100),
      expression: Math.round((cats.expression.sum / cats.expression.count) * 100),
      awareness: Math.round((cats.awareness.sum / cats.awareness.count) * 100),
    };
  }, [values]);

  return (
    <div className="flex items-center justify-between px-5 py-3" style={{ height: 100 }}>
      <div className="flex flex-col gap-1.5" style={{ width: 120 }}>
        <div className="flex items-center gap-2">
          <LED on={!!deckA} color={HW.deckA} />
          <span className="text-[12px] font-semibold" style={{ color: deckA ? HW.deckA : HW.textDim }}>{deckA ? deckA.name : "Deck A"}</span>
        </div>
        <div className="flex items-center gap-2">
          <LED on={!!deckB} color={HW.deckB} />
          <span className="text-[12px] font-semibold" style={{ color: deckB ? HW.deckB : HW.textDim }}>{deckB ? deckB.name : "Deck B"}</span>
        </div>
        <span className="text-[11px] font-mono" style={{ color: HW.textDim }}>Mix {Math.round((1 - mix) * 100)}/{Math.round(mix * 100)}</span>
      </div>

      <motion.div className="relative flex items-center justify-center" style={{ width: 60, height: 60 }}>
        <motion.div className="absolute inset-0 rounded-full"
          animate={{ scale: [1, 1.1, 1], opacity: [0.12, 0.25, 0.12] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          style={{ border: `1.5px solid hsla(${hue}, 45%, 55%, 0.3)` }} />
        <div className="w-11 h-11 rounded-full flex items-center justify-center"
          style={{ background: `radial-gradient(circle at 40% 35%, hsla(${hue}, 50%, 45%, 0.2), hsla(${hue}, 30%, 18%, 0.08))`, border: `1px solid hsla(${hue}, 40%, 50%, 0.2)` }}>
          <span className="font-mono text-[20px] font-bold" style={{ color: `hsl(${hue}, 55%, 68%)` }}>{pct}</span>
        </div>
      </motion.div>

      <div className="flex flex-col gap-1.5" style={{ width: 140 }}>
        {(["reasoning", "expression", "awareness"] as const).map((cat) => {
          const meta = CATEGORY_META[cat]; const avg = catAvg[cat];
          return (
            <div key={cat}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] tracking-wide uppercase font-semibold" style={{ color: `hsla(${meta.hue}, 35%, 58%, 0.55)` }}>{meta.label}</span>
                <span className="text-[11px] font-mono font-semibold" style={{ color: `hsl(${meta.hue}, 40%, 58%)` }}>{avg}</span>
              </div>
              <div className="h-[3px] rounded-full overflow-hidden" style={{ background: `hsla(${meta.hue}, 10%, 12%, 0.5)` }}>
                <div className="h-full rounded-full transition-all duration-300" style={{
                  width: `${avg}%`, background: `linear-gradient(90deg, hsla(${meta.hue}, 40%, 38%, 0.5), hsl(${meta.hue}, 50%, 55%))`,
                  boxShadow: `0 0 6px hsla(${meta.hue}, 50%, 50%, 0.15)`,
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScreenRadar({ values }: { values: DimensionValues }) {
  const dims = DIMENSIONS;
  const cx = 150, cy = 50, maxR = 40;
  const angleStep = (Math.PI * 2) / dims.length;

  const points = dims.map((dim, i) => {
    const val = values[dim.id] ?? dim.defaultValue;
    const angle = -Math.PI / 2 + i * angleStep;
    return { x: cx + Math.cos(angle) * maxR * val, y: cy + Math.sin(angle) * maxR * val,
      lx: cx + Math.cos(angle) * (maxR + 12), ly: cy + Math.sin(angle) * (maxR + 12),
      label: dim.label.slice(0, 3), hue: dim.hue, val };
  });
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  return (
    <div className="flex items-center justify-center" style={{ height: 100 }}>
      <svg width={300} height={100} viewBox="0 0 300 100" className="w-full" style={{ maxWidth: 400 }}>
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <polygon key={r} points={dims.map((_, i) => { const a = -Math.PI / 2 + i * angleStep; return `${cx + Math.cos(a) * maxR * r},${cy + Math.sin(a) * maxR * r}`; }).join(" ")}
            fill="none" stroke="hsla(38, 10%, 25%, 0.12)" strokeWidth={0.5} />
        ))}
        <path d={pathD} fill="hsla(38, 40%, 50%, 0.06)" stroke="hsla(38, 50%, 60%, 0.35)" strokeWidth={1.5}
          style={{ filter: "drop-shadow(0 0 4px hsla(38, 50%, 55%, 0.1))" }} />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={2.5} fill={`hsl(${p.hue}, 50%, 60%)`} opacity={0.8} />
            <text x={p.lx} y={p.ly + 3} textAnchor="middle" fill={`hsla(${p.hue}, 30%, 58%, 0.5)`} fontSize="8" fontFamily="'DM Sans', sans-serif">{p.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── Crossfader ──────────────────────────────────────────────────────

function Crossfader({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const pct = Math.round(value * 100);
  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] font-bold tracking-wide" style={{ color: HW.deckA }}>A</span>
        <span className="text-[10px] tracking-[0.2em] uppercase font-semibold" style={{ color: HW.textDim }}>Crossfader</span>
        <span className="text-[12px] font-bold tracking-wide" style={{ color: HW.deckB }}>B</span>
      </div>
      <div className="relative h-8 flex items-center">
        <div className="absolute inset-x-0 h-[4px] rounded-full" style={{ background: `linear-gradient(90deg, ${HW.deckAGlow}, hsla(0,0%,10%,0.4), ${HW.deckBGlow})` }} />
        <div className="absolute pointer-events-none transition-all duration-75" style={{
          left: `calc(${pct}% - 16px)`, width: 32, height: 14, borderRadius: 4,
          background: `linear-gradient(180deg, hsl(0,0%,30%), hsl(0,0%,14%))`,
          border: "1px solid hsla(38, 20%, 35%, 0.25)",
          boxShadow: "0 0 8px hsla(38, 50%, 45%, 0.08), 0 2px 4px hsla(0,0%,0%,0.5)",
          top: "50%", transform: "translateY(-50%)",
        }}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: 12, height: 1, background: "hsla(38, 30%, 50%, 0.35)", borderRadius: 1 }} />
        </div>
        <input type="range" min={0} max={100} value={pct} onChange={(e) => onChange(Number(e.target.value) / 100)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" style={{ margin: 0 }} />
      </div>
      <div className="flex justify-center mt-0.5">
        <span className="text-[11px] font-mono" style={{ color: HW.textDim }}>
          {pct === 0 ? "Pure A" : pct === 100 ? "Pure B" : pct === 50 ? "50 / 50" : `${100 - pct} / ${pct}`}
        </span>
      </div>
    </div>
  );
}

// ── Main Deck Component ─────────────────────────────────────────────

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
  open, onClose, coherenceH, values, onChange, activePresetId, onSelectPreset, inputSlot,
}: ProModeDeckProps) {
  const [deckAPreset, setDeckAPreset] = useState<DimensionPreset | null>(null);
  const [deckBPreset, setDeckBPreset] = useState<DimensionPreset | null>(null);
  const [crossfader, setCrossfader] = useState(0.5);
  const [manualOverride, setManualOverride] = useState(false);
  const [screenMode, setScreenMode] = useState<ScreenMode>("spectrum");

  useEffect(() => {
    if (manualOverride) return;
    const aVals = deckAPreset?.values ?? getDefaultValues();
    const bVals = deckBPreset?.values ?? getDefaultValues();
    const blended = blendValues(aVals, bVals, crossfader);
    onChange(blended);
    if (crossfader < 0.1 && deckAPreset) onSelectPreset(deckAPreset);
    else if (crossfader > 0.9 && deckBPreset) onSelectPreset(deckBPreset);
  }, [deckAPreset, deckBPreset, crossfader, manualOverride]);

  const handleFaderChange = useCallback((dimId: string, v: number) => {
    setManualOverride(true);
    onChange({ ...values, [dimId]: v });
  }, [values, onChange]);

  const handleReset = useCallback(() => {
    setDeckAPreset(null); setDeckBPreset(null); setCrossfader(0.5);
    setManualOverride(false); onChange(getDefaultValues());
  }, [onChange]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); onClose(); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const groupedDimensions = useMemo(() => {
    const g: Record<DimensionCategory, typeof DIMENSIONS[number][]> = { reasoning: [], expression: [], awareness: [] };
    for (const d of DIMENSIONS) g[d.category].push(d);
    return g;
  }, []);

  const categories: DimensionCategory[] = ["reasoning", "expression", "awareness"];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: "100%", opacity: 0.6 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 32, stiffness: 320, mass: 0.7 }}
          className="flex flex-col relative"
          style={{
            fontFamily: HW.font,
            maxHeight: "52vh",
            minHeight: 340,
          }}
        >
          {/* ── Shaped top edge ────────────────────────────────── */}
          <div className="absolute -top-[1px] left-0 right-0 h-[2px] z-10"
            style={{ background: `linear-gradient(90deg, transparent 5%, ${HW.gold}30 20%, ${HW.gold}50 50%, ${HW.gold}30 80%, transparent 95%)` }} />

          {/* ── Body with subtle shape ─────────────────────────── */}
          <div style={{
            background: `linear-gradient(180deg, ${HW.bodyLight} 0%, ${HW.body} 100%)`,
            borderTop: `1px solid hsla(0,0%,18%,0.3)`,
            boxShadow: "0 -8px 40px hsla(0,0%,0%,0.6), 0 -2px 0 hsla(38, 20%, 25%, 0.06)",
          }}>

            {/* ── Top bar ───────────────────────────────────────── */}
            <div className="flex items-center justify-between px-5 py-1.5 cursor-pointer" onPointerDown={onClose}
              style={{ borderBottom: `1px solid ${HW.border}` }}>
              <div className="flex items-center gap-3">
                <LED on size={6} color={HW.gold} />
                <span className="text-[11px] tracking-[0.25em] uppercase font-semibold" style={{ color: HW.textDim }}>Pro Mode</span>
                <span className="text-[15px] font-light" style={{ fontFamily: HW.fontDisplay, color: HW.text }}>Lumen Experience Deck</span>
              </div>
              <div className="flex items-center gap-2">
                {manualOverride && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: HW.goldGlow, color: HW.gold, border: `1px solid ${HW.gold}25` }}>Custom</span>
                )}
                <HWButton label="Reset" onPress={handleReset} size="sm" />
                <ChevronDown size={14} style={{ color: HW.textDim }} />
              </div>
            </div>

            {/* ── Three-column layout ──────────────────────────── */}
            <div className="flex min-h-0" style={{ height: "calc(52vh - 70px)", maxHeight: 420 }}>

              {/* ── LEFT DECK ──────────────────────────────────── */}
              <div className="flex-shrink-0 overflow-y-auto py-2 px-3"
                style={{ width: 190, borderRight: `1px solid ${HW.border}`, scrollbarWidth: "none" }}>
                <Platter side="A" preset={deckAPreset} spinning={!!deckAPreset && crossfader < 0.95}
                  accentColor={HW.deckA}
                  onSelect={(p) => { setDeckAPreset(p); setManualOverride(false); }}
                  selectedId={deckAPreset?.id ?? null} />
              </div>

              {/* ── CENTER MIXER ───────────────────────────────── */}
              <div className="flex-1 flex flex-col min-w-0 overflow-y-auto" style={{ scrollbarWidth: "none" }}>

                {/* Raised screen area */}
                <div className="flex-shrink-0 mx-3 mt-2 rounded-lg overflow-hidden"
                  style={{
                    background: HW.screen,
                    border: `1px solid ${HW.screenBorder}`,
                    boxShadow: "inset 0 2px 8px hsla(0,0%,0%,0.6), 0 2px 12px hsla(0,0%,0%,0.3)",
                  }}>
                  {/* Screen tabs */}
                  <div className="flex items-center justify-between px-3 py-1" style={{ borderBottom: "1px solid hsla(220,8%,14%,0.5)" }}>
                    <div className="flex gap-0.5">
                      {(["spectrum", "coherence", "radar"] as const).map((m) => (
                        <button key={m} onPointerDown={() => setScreenMode(m)}
                          className="px-2 py-0.5 rounded text-[10px] tracking-wider uppercase font-semibold transition-all duration-150"
                          style={{
                            color: screenMode === m ? HW.goldBright : HW.textDim,
                            background: screenMode === m ? HW.goldGlow : "transparent",
                          }}>
                          {m}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <LED on={coherenceH > 0.7} color={HW.green} size={4} />
                      <LED on={coherenceH > 0.4 && coherenceH <= 0.7} color={HW.gold} size={4} />
                      <LED on={coherenceH <= 0.4} color={HW.red} size={4} />
                      <span className="text-[10px] font-mono font-semibold ml-1" style={{ color: HW.textSub }}>H:{Math.round(coherenceH * 100)}</span>
                    </div>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div key={screenMode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                      {screenMode === "spectrum" && <ScreenSpectrum values={values} coherenceH={coherenceH} />}
                      {screenMode === "coherence" && <ScreenCoherence values={values} coherenceH={coherenceH} deckA={deckAPreset} deckB={deckBPreset} mix={crossfader} />}
                      {screenMode === "radar" && <ScreenRadar values={values} />}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Input slot */}
                {inputSlot && <div className="flex-shrink-0 mx-3 mt-2">{inputSlot}</div>}

                {/* Knobs row */}
                <div className="flex-shrink-0 flex justify-center gap-2 mx-3 mt-2 py-1.5 rounded-lg"
                  style={{ background: HW.surface, border: `1px solid ${HW.border}` }}>
                  {DIMENSIONS.slice(0, 4).map((dim) => (
                    <RotaryKnob key={dim.id} label={dim.label}
                      value={values[dim.id] ?? dim.defaultValue}
                      onChange={(v) => handleFaderChange(dim.id, v)}
                      hue={dim.hue} size={36} />
                  ))}
                </div>

                {/* Fader strip */}
                <div className="flex-shrink-0 flex justify-center gap-2 mx-3 mt-1.5">
                  {categories.map((cat) => {
                    const meta = CATEGORY_META[cat];
                    const dims = groupedDimensions[cat];
                    return (
                      <div key={cat} className="flex-shrink-0 rounded-lg px-2 py-1.5"
                        style={{ background: HW.surface, border: `1px solid ${HW.border}` }}>
                        <div className="flex items-center gap-1 mb-1 px-0.5">
                          <LED on size={4} color={`hsl(${meta.hue}, 50%, 55%)`} />
                          <span className="text-[9px] tracking-[0.15em] uppercase font-semibold" style={{ color: `hsla(${meta.hue}, 35%, 58%, 0.5)` }}>{meta.label}</span>
                        </div>
                        <div className="flex justify-center" style={{ gap: 2 }}>
                          {dims.map((dim) => (
                            <ChannelFader key={dim.id} label={dim.label}
                              value={values[dim.id] ?? dim.defaultValue}
                              onChange={(v) => handleFaderChange(dim.id, v)}
                              hue={dim.hue} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Crossfader */}
                <div className="flex-shrink-0 mx-3 mt-1.5 mb-2 rounded-lg"
                  style={{ background: HW.surface, border: `1px solid ${HW.border}` }}>
                  <Crossfader value={crossfader} onChange={(v) => { setCrossfader(v); setManualOverride(false); }} />
                </div>
              </div>

              {/* ── RIGHT DECK ─────────────────────────────────── */}
              <div className="flex-shrink-0 overflow-y-auto py-2 px-3"
                style={{ width: 190, borderLeft: `1px solid ${HW.border}`, scrollbarWidth: "none" }}>
                <Platter side="B" preset={deckBPreset} spinning={!!deckBPreset && crossfader > 0.05}
                  accentColor={HW.deckB}
                  onSelect={(p) => { setDeckBPreset(p); setManualOverride(false); }}
                  selectedId={deckBPreset?.id ?? null} />
              </div>

            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
