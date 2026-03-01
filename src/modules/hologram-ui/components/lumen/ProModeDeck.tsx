/**
 * ProModeDeck — Bottom-Sliding DJ Controller for Lumen
 * ═════════════════════════════════════════════════════
 *
 * Slides up from the bottom of the chat, replacing the text input
 * with a full DJ deck experience. Messages remain visible above.
 *
 * Layout (bottom panel, ~55-60% height):
 *   ┌─────────────────────────────────────────────────┐
 *   │ [Deck A Presets]  [Spectrum + Input]  [Deck B]  │
 *   │ [Turntable A]     [Faders + Xfader]  [Turn B]  │
 *   └─────────────────────────────────────────────────┘
 */

import { useState, useCallback, useMemo, useEffect, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown } from "lucide-react";
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

// ── Spectrum Visualizer (center screen) ─────────────────────────────

function SpectrumVisualizer({
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
      const barW = Math.floor((w - 40) / dims.length);
      const startX = Math.floor((w - barW * dims.length) / 2);

      const t = Date.now() * 0.001;
      dims.forEach((dim, i) => {
        const val = values[dim.id] ?? dim.defaultValue;
        const barH = val * (h - 24);
        const x = startX + i * barW;
        const shimmer = Math.sin(t * 2 + i * 0.5) * 0.08 + 1;
        const finalH = barH * shimmer;
        const meta = CATEGORY_META[dim.category];
        const alpha = 0.5 + val * 0.5;

        ctx.shadowBlur = 8;
        ctx.shadowColor = `hsla(${meta.hue}, 50%, 55%, ${alpha * 0.3})`;

        const gradient = ctx.createLinearGradient(x, h - 8, x, h - 8 - finalH);
        gradient.addColorStop(0, `hsla(${meta.hue}, 40%, 35%, ${alpha * 0.6})`);
        gradient.addColorStop(0.5, `hsla(${meta.hue}, 50%, 50%, ${alpha * 0.8})`);
        gradient.addColorStop(1, `hsla(${meta.hue}, 55%, 60%, ${alpha})`);

        ctx.fillStyle = gradient;
        ctx.fillRect(x + 2, h - 8 - finalH, barW - 4, finalH);

        ctx.shadowBlur = 0;
        ctx.fillStyle = `hsla(${meta.hue}, 60%, 65%, ${alpha})`;
        ctx.fillRect(x + 2, h - 10 - finalH, barW - 4, 2);

        ctx.fillStyle = `hsla(${meta.hue}, 25%, 55%, 0.5)`;
        ctx.font = "9px 'DM Sans', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(dim.label.slice(0, 5).toUpperCase(), x + barW / 2, h - 0);
      });

      const lineY = h - 8 - coherenceH * (h - 24);
      ctx.beginPath();
      ctx.strokeStyle = `hsla(38, 50%, 55%, 0.25)`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.moveTo(10, lineY);
      ctx.lineTo(w - 10, lineY);
      ctx.stroke();
      ctx.setLineDash([]);

      frameRef.current = requestAnimationFrame(render);
    };
    render();
    return () => { running = false; cancelAnimationFrame(frameRef.current); };
  }, [values, coherenceH]);

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: DJ.screen,
        border: `1px solid ${DJ.screenBorder}`,
        boxShadow: "inset 0 2px 8px hsla(0,0%,0%,0.5), 0 0 20px hsla(38, 50%, 40%, 0.04)",
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-1"
        style={{ borderBottom: `1px solid hsla(220, 10%, 12%, 0.5)` }}
      >
        <div className="flex items-center gap-3">
          <span className="text-[10px] tracking-[0.2em] uppercase font-medium" style={{ color: DJ.gold }}>
            Spectrum
          </span>
          {deckA && (
            <span className="text-[11px] font-medium" style={{ color: DJ.deckA }}>
              {deckA.icon} {deckA.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {deckB && (
            <span className="text-[11px] font-medium" style={{ color: DJ.deckB }}>
              {deckB.name} {deckB.icon}
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono" style={{ color: `hsla(38, 40%, 55%, 0.6)` }}>
              H:{Math.round(coherenceH * 100)}
            </span>
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: coherenceH > 0.7 ? DJ.green : coherenceH > 0.4 ? DJ.gold : DJ.red,
                boxShadow: `0 0 6px ${coherenceH > 0.7 ? DJ.green : DJ.gold}`,
              }}
            />
          </div>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={600}
        height={90}
        className="w-full"
        style={{ height: 90 }}
      />
    </div>
  );
}

// ── Turntable Platter ───────────────────────────────────────────────

function Turntable({
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
  const phases = side === "A" ? ["learn", "work", "play"] : ["play", "work", "learn"];

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      {/* Vinyl platter */}
      <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 45% 40%, hsl(20, 4%, 14%) 0%, hsl(20, 4%, 8%) 60%, hsl(20, 4%, 5%) 100%)`,
            border: `2px solid hsla(0, 0%, 18%, 0.3)`,
            boxShadow: `inset 0 0 20px hsla(0,0%,0%,0.6), 0 0 30px hsla(0,0%,0%,0.3)`,
          }}
        />

        {[35, 45, 55, 65].map((r) => (
          <div
            key={r}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: r, height: r,
              border: "0.5px solid hsla(0, 0%, 22%, 0.15)",
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}

        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: 2,
            border: `1.5px solid ${accentColor}`,
            opacity: spinning ? 0.35 : 0.12,
            transition: "opacity 0.5s",
          }}
        />

        <motion.div
          className="relative w-12 h-12 rounded-full flex items-center justify-center z-10"
          animate={spinning ? { rotate: 360 } : { rotate: 0 }}
          transition={spinning ? { duration: 2.5, repeat: Infinity, ease: "linear" } : { duration: 0.5 }}
          style={{
            background: preset
              ? `radial-gradient(circle at 40% 35%, hsla(${hue}, 40%, 30%, 0.9), hsla(${hue}, 30%, 15%, 0.95))`
              : "hsl(20, 4%, 10%)",
            border: `1.5px solid ${preset ? `hsla(${hue}, 35%, 45%, 0.4)` : "hsla(0,0%,18%,0.3)"}`,
            boxShadow: preset ? `0 0 15px hsla(${hue}, 50%, 40%, 0.15)` : "none",
          }}
        >
          {preset ? (
            <span className="text-lg" style={{ color: `hsl(${hue}, 45%, 65%)` }}>{preset.icon}</span>
          ) : (
            <span className="text-[10px]" style={{ color: DJ.textDim }}>—</span>
          )}
        </motion.div>

        {spinning && (
          <motion.div
            className="absolute pointer-events-none"
            animate={{ rotate: 360 }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
            style={{ inset: 8 }}
          >
            <div
              className="absolute rounded-full"
              style={{
                width: 4, height: 4,
                background: accentColor, top: 0, left: "50%",
                transform: "translateX(-50%)",
                boxShadow: `0 0 6px ${accentColor}`,
              }}
            />
          </motion.div>
        )}
      </div>

      {/* Preset selector grid */}
      <div className="w-full px-1">
        {(phases as ("learn" | "work" | "play")[]).map((phase) => {
          const phasePresets = PRESETS.filter((p) => p.phase === phase);
          const phaseLabel = phase === "learn" ? "Learn" : phase === "work" ? "Work" : "Play";
          const phaseHue = phase === "learn" ? 210 : phase === "work" ? 38 : 280;
          return (
            <div key={phase} className="mb-1">
              <span
                className="text-[9px] tracking-[0.15em] uppercase block mb-0.5 px-1 font-medium"
                style={{ color: `hsla(${phaseHue}, 30%, 50%, 0.45)` }}
              >
                {phaseLabel}
              </span>
              <div className="flex gap-1">
                {phasePresets.map((p) => {
                  const active = selectedId === p.id;
                  const pH = presetHue(p);
                  return (
                    <button
                      key={p.id}
                      onPointerDown={() => onSelect(p)}
                      className="flex-1 rounded-md py-1.5 px-1 transition-all duration-150 text-center"
                      style={{
                        background: active ? `hsla(${pH}, 25%, 18%, 0.6)` : DJ.channel,
                        border: `1px solid ${active ? `hsla(${pH}, 40%, 45%, 0.35)` : DJ.border}`,
                        boxShadow: active ? `0 0 8px hsla(${pH}, 50%, 40%, 0.1)` : "none",
                      }}
                    >
                      <span className="text-[13px] block" style={{ color: active ? `hsl(${pH}, 45%, 60%)` : DJ.textDim }}>
                        {p.icon}
                      </span>
                      <span className="text-[10px] font-medium block mt-0.5" style={{ color: active ? DJ.text : DJ.textMuted }}>
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

// ── Vertical Channel Fader ──────────────────────────────────────────

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
    <div className="flex flex-col items-center" style={{ width: 50 }}>
      <span className="text-[8px] tracking-wider uppercase mb-1" style={{ color: `hsla(${hue}, 30%, 55%, 0.4)` }}>
        {highLabel}
      </span>

      <div
        className="relative rounded-full flex items-center justify-center"
        style={{
          width: 28,
          height: 110,
          background: DJ.groove,
          border: `1px solid ${DJ.border}`,
          boxShadow: "inset 0 2px 6px hsla(0,0%,0%,0.3)",
        }}
      >
        <div
          className="absolute rounded-full"
          style={{ width: 2, top: 10, bottom: 10, left: "50%", transform: "translateX(-50%)", background: "hsla(20, 4%, 14%, 0.5)" }}
        />

        {[0.2, 0.4, 0.6, 0.8].map((threshold) => (
          <div
            key={threshold}
            className="absolute rounded-full"
            style={{
              width: 3, height: 3, right: 3,
              bottom: `${10 + threshold * 80}%`,
              background: pct / 100 >= threshold ? `hsla(${hue}, 50%, 55%, 0.7)` : "hsla(0, 0%, 15%, 0.4)",
              boxShadow: pct / 100 >= threshold ? `0 0 3px hsla(${hue}, 50%, 55%, 0.4)` : "none",
              transition: "background 0.15s, box-shadow 0.15s",
            }}
          />
        ))}

        <div
          className="absolute rounded-full transition-all duration-100"
          style={{
            width: 3, bottom: 10, left: "50%",
            transform: "translateX(-50%)",
            height: `${pct * 0.75}%`,
            maxHeight: "calc(100% - 20px)",
            background: `linear-gradient(to top, ${accent}, hsla(${hue}, 35%, 40%, 0.15))`,
          }}
        />

        <div
          className="absolute left-1/2 -translate-x-1/2 pointer-events-none transition-all duration-100"
          style={{
            bottom: `calc(10px + ${pct}% * 0.72)`,
            width: 22, height: 8, borderRadius: 3,
            background: `linear-gradient(180deg, hsl(22, 8%, 32%), hsl(22, 8%, 18%))`,
            border: `1px solid hsla(${hue}, 30%, 40%, 0.3)`,
            boxShadow: `0 0 6px ${accentGlow}, 0 1px 3px hsla(0,0%,0%,0.4)`,
          }}
        >
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ width: 8, height: 1, background: `hsla(${hue}, 30%, 50%, 0.5)`, borderRadius: 1 }}
          />
        </div>

        <input
          type="range"
          min={0} max={100} value={pct}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          className="absolute inset-0 opacity-0 cursor-pointer z-10"
          style={{ width: "100%", height: "100%", writingMode: "vertical-lr", direction: "rtl", margin: 0, WebkitAppearance: "slider-vertical" }}
        />
      </div>

      <span className="text-[8px] tracking-wider uppercase mt-1" style={{ color: `hsla(${hue}, 30%, 55%, 0.4)` }}>
        {lowLabel}
      </span>

      <span className="text-[10px] font-medium mt-1" style={{ color: accent }}>{label}</span>
      <span className="text-[10px] font-mono" style={{ color: DJ.textMuted }}>{pct}</span>
    </div>
  );
}

// ── Rotary Knob ─────────────────────────────────────────────────────

function RotaryKnob({
  label,
  value,
  onChange,
  hue,
  size = 48,
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
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;

    const onMove = (ev: PointerEvent) => {
      const delta = (centerY - ev.clientY) / 100;
      onChange(Math.max(0, Math.min(1, value + delta)));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [value, onChange]);

  return (
    <div className="flex flex-col items-center" style={{ width: size + 16 }}>
      <div
        className="relative rounded-full cursor-pointer"
        style={{
          width: size, height: size,
          background: `radial-gradient(circle at 40% 35%, hsl(20, 5%, 18%), hsl(20, 5%, 10%))`,
          border: `1.5px solid hsla(0, 0%, 20%, 0.3)`,
          boxShadow: `0 2px 6px hsla(0,0%,0%,0.4), inset 0 1px 2px hsla(0,0%,100%,0.03)`,
        }}
        onPointerDown={handleDrag}
      >
        <svg className="absolute inset-0" viewBox="0 0 40 40" style={{ width: size, height: size }}>
          <circle cx="20" cy="20" r="16" fill="none" stroke={`hsla(${hue}, 20%, 30%, 0.2)`} strokeWidth="2" strokeDasharray="75.4" strokeDashoffset="18.85" transform="rotate(135 20 20)" />
          <circle cx="20" cy="20" r="16" fill="none" stroke={accent} strokeWidth="2" strokeDasharray="75.4" strokeDashoffset={75.4 - value * 56.55} transform="rotate(135 20 20)" style={{ filter: `drop-shadow(0 0 3px ${accent})`, transition: "stroke-dashoffset 0.1s" }} />
        </svg>

        <div
          className="absolute"
          style={{
            top: "50%", left: "50%",
            width: 2, height: size / 2 - 6,
            background: accent, borderRadius: 1,
            transformOrigin: "bottom center",
            transform: `translate(-50%, -100%) rotate(${angle}deg)`,
            transition: "transform 0.1s",
            boxShadow: `0 0 4px ${accent}`,
          }}
        />

        <div className="absolute rounded-full" style={{ width: 4, height: 4, top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: `hsla(0, 0%, 30%, 0.6)` }} />
      </div>
      <span className="text-[9px] font-medium mt-1.5" style={{ color: accent }}>{label}</span>
      <span className="text-[9px] font-mono" style={{ color: DJ.textMuted }}>{pct}</span>
    </div>
  );
}

// ── Crossfader ──────────────────────────────────────────────────────

function DeckCrossfader({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const pct = Math.round(value * 100);

  return (
    <div className="rounded-xl px-5 py-2" style={{ background: DJ.channel, border: `1px solid ${DJ.border}` }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] font-medium tracking-wide" style={{ color: DJ.deckA }}>A</span>
        <span className="text-[10px] tracking-[0.2em] uppercase" style={{ color: DJ.textDim }}>Crossfader</span>
        <span className="text-[12px] font-medium tracking-wide" style={{ color: DJ.deckB }}>B</span>
      </div>

      <div className="relative h-10 flex items-center">
        <div className="absolute inset-x-0 h-[5px] rounded-full" style={{ background: `linear-gradient(90deg, ${DJ.deckADim}, hsla(30, 8%, 12%, 0.4), ${DJ.deckBDim})` }} />
        <div className="absolute left-0 h-[5px] rounded-full transition-all duration-75" style={{ width: `${100 - pct}%`, background: `linear-gradient(90deg, ${DJ.deckA}, hsla(200, 35%, 45%, 0.1))`, opacity: 0.5 }} />
        <div className="absolute right-0 h-[5px] rounded-full transition-all duration-75" style={{ width: `${pct}%`, background: `linear-gradient(270deg, ${DJ.deckB}, hsla(25, 35%, 45%, 0.1))`, opacity: 0.5 }} />

        <div
          className="absolute pointer-events-none transition-all duration-75"
          style={{
            left: `calc(${pct}% - 18px)`,
            width: 36, height: 18, borderRadius: 5,
            background: `linear-gradient(180deg, hsl(22, 8%, 32%), hsl(22, 8%, 16%))`,
            border: "1px solid hsla(38, 25%, 35%, 0.3)",
            boxShadow: "0 0 10px hsla(38, 50%, 45%, 0.12), 0 2px 6px hsla(0,0%,0%,0.5)",
            top: "50%", transform: "translateY(-50%)",
          }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: 14, height: 1.5, background: "hsla(38, 30%, 50%, 0.4)", borderRadius: 1 }} />
        </div>

        <input type="range" min={0} max={100} value={pct} onChange={(e) => onChange(Number(e.target.value) / 100)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" style={{ margin: 0 }} />
      </div>

      <div className="flex justify-center mt-1">
        <span className="text-[11px] font-mono" style={{ color: DJ.textMuted }}>
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
  /** Input field to embed in the center screen */
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

  const categories: DimensionCategory[] = ["reasoning", "expression", "awareness"];

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
            maxHeight: "65vh",
            minHeight: 400,
          }}
        >
          {/* ── Handle Bar — drag to collapse ─────────────────── */}
          <div
            className="flex-shrink-0 flex items-center justify-between px-5 py-2 cursor-pointer"
            onPointerDown={onClose}
            style={{ borderBottom: `1px solid ${DJ.border}` }}
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full" style={{ background: DJ.gold, boxShadow: `0 0 8px ${DJ.goldGlow}` }} />
              <span className="text-[12px] tracking-[0.25em] uppercase font-medium" style={{ color: DJ.textMuted }}>
                Pro Mode
              </span>
              <span className="text-[15px] font-light" style={{ fontFamily: DJ.fontDisplay, color: DJ.text }}>
                Lumen Experience Deck
              </span>
            </div>
            <div className="flex items-center gap-2">
              {manualOverride && (
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "hsla(38, 30%, 30%, 0.2)", color: DJ.gold, border: `1px solid ${DJ.borderAccent}` }}>
                  Custom Mix
                </span>
              )}
              <button
                onPointerDown={(e) => { e.stopPropagation(); handleReset(); }}
                className="text-[10px] tracking-widest uppercase px-3 py-1 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ color: DJ.textMuted, background: DJ.channel, border: `1px solid ${DJ.border}` }}
              >
                Reset
              </button>
              <ChevronDown className="w-4 h-4" style={{ color: DJ.textMuted }} />
            </div>
          </div>

          {/* ── Main Body: 3-column layout ──────────────────── */}
          <div className="flex-1 flex overflow-hidden min-h-0">

            {/* ── Left Deck ──────────────────────────────────── */}
            <div
              className="flex flex-col items-center overflow-y-auto py-3 px-3"
              style={{ width: 220, minWidth: 200, borderRight: `1px solid ${DJ.border}`, scrollbarWidth: "none" }}
            >
              <Turntable
                side="A"
                preset={deckAPreset}
                spinning={!!deckAPreset && crossfader < 0.95}
                accentColor={DJ.deckA}
                onSelect={(p) => { setDeckAPreset(p); setManualOverride(false); }}
                selectedId={deckAPreset?.id ?? null}
              />
            </div>

            {/* ── Center: Screen + Faders + Crossfader ───────── */}
            <div
              className="flex-1 flex flex-col overflow-y-auto py-3 px-4"
              style={{ background: DJ.chassisLight, scrollbarWidth: "none" }}
            >
              {/* Spectrum screen */}
              <div className="flex-shrink-0 mb-3">
                <SpectrumVisualizer
                  values={values}
                  coherenceH={coherenceH}
                  deckA={deckAPreset}
                  deckB={deckBPreset}
                  mix={crossfader}
                />
              </div>

              {/* Embedded input slot (text field from chat) */}
              {inputSlot && (
                <div className="flex-shrink-0 mb-3">
                  {inputSlot}
                </div>
              )}

              {/* Knobs row */}
              <div className="flex justify-center gap-3 mb-3">
                {DIMENSIONS.slice(0, 4).map((dim) => (
                  <RotaryKnob
                    key={dim.id}
                    label={dim.label}
                    value={values[dim.id] ?? dim.defaultValue}
                    onChange={(v) => handleFaderChange(dim.id, v)}
                    hue={dim.hue}
                    size={48}
                  />
                ))}
              </div>

              {/* Channel faders in a horizontal row */}
              <div className="flex gap-3 justify-center flex-wrap mb-3">
                {categories.map((cat) => {
                  const meta = CATEGORY_META[cat];
                  const dims = groupedDimensions[cat];
                  return (
                    <div key={cat} className="flex-shrink-0">
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: `hsla(${meta.hue}, 50%, 55%, 0.5)` }} />
                        <span className="text-[10px] tracking-[0.15em] uppercase font-medium" style={{ color: `hsla(${meta.hue}, 35%, 60%, 0.5)` }}>
                          {meta.label}
                        </span>
                      </div>
                      <div
                        className="flex justify-center rounded-lg px-3 py-2"
                        style={{ background: DJ.channel, border: `1px solid ${DJ.border}`, gap: 4 }}
                      >
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
                })}
              </div>

              {/* Crossfader */}
              <div className="flex-shrink-0">
                <DeckCrossfader
                  value={crossfader}
                  onChange={(v) => { setCrossfader(v); setManualOverride(false); }}
                />
              </div>
            </div>

            {/* ── Right Deck ─────────────────────────────────── */}
            <div
              className="flex flex-col items-center overflow-y-auto py-3 px-3"
              style={{ width: 220, minWidth: 200, borderLeft: `1px solid ${DJ.border}`, scrollbarWidth: "none" }}
            >
              <Turntable
                side="B"
                preset={deckBPreset}
                spinning={!!deckBPreset && crossfader > 0.05}
                accentColor={DJ.deckB}
                onSelect={(p) => { setDeckBPreset(p); setManualOverride(false); }}
                selectedId={deckBPreset?.id ?? null}
              />
            </div>

          </div>

          {/* ── Bottom status bar ───────────────────────────── */}
          <div
            className="flex-shrink-0 flex items-center justify-center px-6 py-1.5"
            style={{ borderTop: `1px solid ${DJ.border}`, background: DJ.chassis }}
          >
            <span className="text-[10px] tracking-[0.2em] uppercase" style={{ color: DJ.textDim }}>
              Hologram · Lumen Experience Deck · Every setting shapes your experience
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
