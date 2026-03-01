/**
 * ProModeMixer — Dual-Deck DJ Mixer for Lumen AI
 * ═══════════════════════════════════════════════
 *
 * Two turntable decks (A & B) each load a persona preset.
 * A central crossfader blends between them. The blended
 * values flow into the channel faders and shape Lumen's character.
 *
 * Layout (top → bottom):
 *   1. Header
 *   2. Dual Deck Selector  [Deck A] ←→ [Deck B]
 *   3. Live Display Screen (blended metrics)
 *   4. Crossfader (A ←→ B)
 *   5. Channel Strip Faders (blended output, manually overridable)
 *   6. Reset
 *
 * @module hologram-ui/components/lumen/ProModeMixer
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import {
  DIMENSIONS,
  PRESETS,
  CATEGORY_META,
  getDefaultValues,
  type DimensionValues,
  type DimensionCategory,
  type DimensionPreset,
} from "@/modules/hologram-ui/engine/proModeDimensions";

// ── Palette ──────────────────────────────────────────────────────────
const DJ = {
  chassis: "hsl(20, 6%, 7%)",
  channel: "hsl(20, 5%, 12%)",
  groove: "hsl(20, 4%, 6%)",
  border: "hsla(38, 12%, 22%, 0.15)",
  text: "hsl(38, 12%, 78%)",
  textMuted: "hsl(30, 8%, 50%)",
  textDim: "hsl(30, 6%, 35%)",
  gold: "hsl(38, 55%, 55%)",
  screen: "hsl(220, 15%, 6%)",
  deckA: "hsl(200, 45%, 55%)",
  deckB: "hsl(25, 55%, 55%)",
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

// ── Turntable Deck ───────────────────────────────────────────────────

function TurntableDeck({
  side,
  preset,
  spinning,
  accentColor,
}: {
  side: "A" | "B";
  preset: DimensionPreset | null;
  spinning: boolean;
  accentColor: string;
}) {
  return (
    <div className="flex flex-col items-center" style={{ flex: 1, minWidth: 0 }}>
      {/* Deck label */}
      <span
        className="text-[8px] tracking-[0.2em] uppercase mb-1.5 font-medium"
        style={{ color: accentColor }}
      >
        Deck {side}
      </span>

      {/* Vinyl platter */}
      <div
        className="relative rounded-full flex items-center justify-center"
        style={{
          width: 80,
          height: 80,
          background: `radial-gradient(circle, hsl(20, 4%, 14%) 30%, hsl(20, 4%, 8%) 70%)`,
          border: `2px solid hsla(0, 0%, 20%, 0.3)`,
          boxShadow: `inset 0 0 12px hsla(0,0%,0%,0.5)`,
        }}
      >
        {/* Grooves */}
        {[24, 30, 36].map((r) => (
          <div
            key={r}
            className="absolute rounded-full"
            style={{
              width: r,
              height: r,
              border: "0.5px solid hsla(0, 0%, 25%, 0.2)",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}

        {/* Center label */}
        <motion.div
          className="w-8 h-8 rounded-full flex items-center justify-center z-10"
          animate={spinning ? { rotate: 360 } : { rotate: 0 }}
          transition={spinning ? { duration: 3, repeat: Infinity, ease: "linear" } : { duration: 0.5 }}
          style={{
            background: preset
              ? `radial-gradient(circle, hsla(${presetHue(preset)}, 35%, 25%, 0.8), hsla(${presetHue(preset)}, 25%, 15%, 0.9))`
              : "hsl(20, 4%, 10%)",
            border: `1px solid ${preset ? `hsla(${presetHue(preset)}, 30%, 40%, 0.4)` : "hsla(0,0%,20%,0.3)"}`,
          }}
        >
          {preset ? (
            <span className="text-[12px]" style={{ color: `hsl(${presetHue(preset)}, 40%, 65%)` }}>
              {preset.icon}
            </span>
          ) : (
            <span className="text-[8px]" style={{ color: DJ.textDim }}>—</span>
          )}
        </motion.div>

        {/* Gold ring accent */}
        {preset && (
          <div
            className="absolute inset-0 rounded-full"
            style={{
              border: `1.5px solid ${accentColor}`,
              opacity: 0.2,
            }}
          />
        )}
      </div>

      {/* Preset name */}
      <div className="mt-2 text-center" style={{ minHeight: 28 }}>
        {preset ? (
          <>
            <span className="text-[10px] font-medium block" style={{ color: DJ.text }}>
              {preset.name}
            </span>
            <span className="text-[8px] block" style={{ color: DJ.textDim }}>
              {preset.subtitle}
            </span>
          </>
        ) : (
          <span className="text-[9px] italic" style={{ color: DJ.textDim }}>
            Load a preset
          </span>
        )}
      </div>
    </div>
  );
}

// ── Preset Selector (horizontal scroll) ──────────────────────────────

function PresetSelector({
  side,
  selectedId,
  onSelect,
  accentColor,
}: {
  side: "A" | "B";
  selectedId: string | null;
  onSelect: (preset: DimensionPreset) => void;
  accentColor: string;
}) {
  return (
    <div>
      <span className="text-[8px] tracking-[0.15em] uppercase block mb-1.5" style={{ color: accentColor }}>
        Load into Deck {side}
      </span>
      <div className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {PRESETS.map((p) => {
          const active = selectedId === p.id;
          const hue = presetHue(p);
          return (
            <button
              key={p.id}
              onPointerDown={() => onSelect(p)}
              className="flex-shrink-0 rounded-md px-2 py-1.5 transition-all duration-150 text-left"
              style={{
                background: active ? `hsla(${hue}, 20%, 16%, 0.5)` : DJ.channel,
                border: `1px solid ${active ? `hsla(${hue}, 35%, 40%, 0.3)` : DJ.border}`,
                minWidth: 70,
              }}
            >
              <div className="flex items-center gap-1">
                <span className="text-[10px]" style={{ color: active ? `hsl(${hue}, 40%, 60%)` : DJ.textDim }}>
                  {p.icon}
                </span>
                <span className="text-[9px] font-medium" style={{ color: active ? DJ.text : DJ.textMuted }}>
                  {p.name.replace("The ", "")}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Crossfader ───────────────────────────────────────────────────────

function Crossfader({
  value,
  onChange,
}: {
  value: number; // 0 = full A, 1 = full B
  onChange: (v: number) => void;
}) {
  const pct = Math.round(value * 100);

  return (
    <div
      className="rounded-xl px-4 py-3"
      style={{
        background: DJ.channel,
        border: `1px solid ${DJ.border}`,
      }}
    >
      {/* Labels */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-medium tracking-wide" style={{ color: DJ.deckA }}>A</span>
        <span className="text-[8px] tracking-[0.15em] uppercase" style={{ color: DJ.textDim }}>
          Crossfader
        </span>
        <span className="text-[9px] font-medium tracking-wide" style={{ color: DJ.deckB }}>B</span>
      </div>

      {/* Track */}
      <div className="relative h-8 flex items-center">
        {/* Background groove */}
        <div
          className="absolute inset-x-0 h-[4px] rounded-full"
          style={{
            background: `linear-gradient(90deg, hsla(200, 40%, 40%, 0.2), hsla(30, 8%, 16%, 0.4), hsla(25, 40%, 40%, 0.2))`,
          }}
        />

        {/* A-side fill */}
        <div
          className="absolute left-0 h-[4px] rounded-full transition-all duration-100"
          style={{
            width: `${100 - pct}%`,
            background: `linear-gradient(90deg, ${DJ.deckA}, hsla(200, 35%, 45%, 0.2))`,
            opacity: 0.5,
          }}
        />

        {/* B-side fill */}
        <div
          className="absolute right-0 h-[4px] rounded-full transition-all duration-100"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(270deg, ${DJ.deckB}, hsla(25, 35%, 45%, 0.2))`,
            opacity: 0.5,
          }}
        />

        {/* Thumb */}
        <div
          className="absolute pointer-events-none transition-all duration-100"
          style={{
            left: `calc(${pct}% - 14px)`,
            width: 28,
            height: 14,
            borderRadius: 4,
            background: `linear-gradient(180deg, hsl(22, 8%, 30%), hsl(22, 8%, 18%))`,
            border: "1px solid hsla(38, 25%, 35%, 0.3)",
            boxShadow: "0 0 8px hsla(38, 50%, 45%, 0.15), 0 2px 4px hsla(0,0%,0%,0.4)",
            top: "50%",
            transform: "translateY(-50%)",
          }}
        >
          {/* Grip line */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ width: 10, height: 1, background: "hsla(38, 30%, 50%, 0.4)", borderRadius: 1 }}
          />
        </div>

        {/* Invisible input */}
        <input
          type="range"
          min={0}
          max={100}
          value={pct}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          style={{ margin: 0 }}
        />
      </div>

      {/* Blend label */}
      <div className="flex justify-center mt-1.5">
        <span className="text-[9px] font-mono" style={{ color: DJ.textMuted }}>
          {pct === 0 ? "Pure A" : pct === 100 ? "Pure B" : pct === 50 ? "50 / 50" : `${100 - pct} / ${pct}`}
        </span>
      </div>
    </div>
  );
}

// ── Compact Vertical Fader ───────────────────────────────────────────

function MiniVerticalFader({
  label,
  value,
  onChange,
  hue,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hue: number;
}) {
  const pct = Math.round(value * 100);
  const accentColor = `hsl(${hue}, 45%, 55%)`;
  const accentGlow = `hsla(${hue}, 55%, 50%, 0.35)`;

  return (
    <div className="flex flex-col items-center" style={{ width: 36 }}>
      {/* Fader track */}
      <div
        className="relative rounded-full flex items-center justify-center"
        style={{
          width: 22,
          height: 80,
          background: DJ.groove,
          border: `1px solid ${DJ.border}`,
        }}
      >
        <div
          className="absolute rounded-full"
          style={{ width: 2, top: 8, bottom: 8, left: "50%", transform: "translateX(-50%)", background: "hsla(20, 4%, 16%, 0.5)" }}
        />
        <div
          className="absolute rounded-full transition-all duration-120"
          style={{
            width: 2,
            bottom: 8,
            left: "50%",
            transform: "translateX(-50%)",
            height: `${pct * 0.72}%`,
            maxHeight: "calc(100% - 16px)",
            background: `linear-gradient(to top, ${accentColor}, hsla(${hue}, 35%, 40%, 0.2))`,
          }}
        />
        <div
          className="absolute left-1/2 -translate-x-1/2 pointer-events-none transition-all duration-120"
          style={{
            bottom: `calc(8px + ${pct}% * 0.56)`,
            width: 16,
            height: 6,
            borderRadius: 2,
            background: `linear-gradient(180deg, hsl(22, 8%, 28%), hsl(22, 8%, 18%))`,
            border: `1px solid hsla(${hue}, 30%, 40%, 0.25)`,
            boxShadow: `0 0 4px ${accentGlow}`,
          }}
        />
        <input
          type="range"
          min={0}
          max={100}
          value={pct}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          className="absolute inset-0 opacity-0 cursor-pointer z-10"
          style={{ width: "100%", height: "100%", writingMode: "vertical-lr", direction: "rtl", margin: 0, WebkitAppearance: "slider-vertical" }}
        />
      </div>
      <span className="text-[7px] font-medium tracking-wide mt-1" style={{ color: accentColor }}>
        {label}
      </span>
      <span className="text-[7px] font-mono" style={{ color: DJ.textMuted }}>{pct}</span>
    </div>
  );
}

// ── Live Display Screen ──────────────────────────────────────────────

function LiveDisplay({
  coherenceH,
  values,
  deckA,
  deckB,
  mix,
}: {
  coherenceH: number;
  values: DimensionValues;
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
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: DJ.screen,
        border: "1px solid hsla(220, 10%, 18%, 0.4)",
        boxShadow: "inset 0 1px 4px hsla(0,0%,0%,0.4), 0 0 12px hsla(38, 50%, 40%, 0.05)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5" style={{ borderBottom: "1px solid hsla(220, 10%, 15%, 0.5)" }}>
        <span className="text-[8px] tracking-[0.2em] uppercase" style={{ color: DJ.textDim }}>Live Mix</span>
        <div className="flex items-center gap-2">
          {deckA && <span className="text-[8px]" style={{ color: DJ.deckA }}>{deckA.name.replace("The ", "")}</span>}
          {deckA && deckB && <span className="text-[7px]" style={{ color: DJ.textDim }}>×</span>}
          {deckB && <span className="text-[8px]" style={{ color: DJ.deckB }}>{deckB.name.replace("The ", "")}</span>}
        </div>
      </div>

      <div className="px-3 py-2.5">
        {/* Coherence orb */}
        <div className="flex items-center justify-center gap-3 mb-2.5">
          <motion.div className="relative flex items-center justify-center" style={{ width: 44, height: 44 }}>
            <motion.div
              className="absolute inset-0 rounded-full"
              animate={{ scale: [1, 1.08, 1], opacity: [0.2, 0.35, 0.2] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              style={{ border: `1px solid hsla(${hue}, 45%, 55%, 0.3)` }}
            />
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{
                background: `radial-gradient(circle at 40% 35%, hsla(${hue}, 50%, 50%, 0.2), hsla(${hue}, 35%, 25%, 0.05))`,
                border: `1px solid hsla(${hue}, 35%, 45%, 0.2)`,
              }}
            >
              <span className="font-mono text-[14px] font-semibold" style={{ color: `hsl(${hue}, 50%, 65%)` }}>
                {pct}
              </span>
            </div>
          </motion.div>
          <div className="flex flex-col">
            <span className="text-[9px] tracking-[0.15em] uppercase" style={{ color: `hsla(${hue}, 30%, 55%, 0.6)` }}>
              Coherence
            </span>
            <span className="text-[8px]" style={{ color: DJ.textDim }}>
              {pct >= 80 ? "Resonant" : pct >= 60 ? "Balanced" : pct >= 40 ? "Exploring" : "Diffuse"}
            </span>
          </div>
        </div>

        {/* Category meters */}
        <div className="space-y-1.5">
          {(["reasoning", "expression", "awareness"] as const).map((cat) => {
            const meta = CATEGORY_META[cat];
            const avg = catAvg[cat];
            return (
              <div key={cat}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[8px] tracking-[0.1em] uppercase" style={{ color: `hsla(${meta.hue}, 30%, 55%, 0.55)` }}>{meta.label}</span>
                  <span className="text-[8px] font-mono" style={{ color: DJ.textMuted }}>{avg}</span>
                </div>
                <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "hsla(220, 8%, 12%, 0.8)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    animate={{ width: `${avg}%` }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    style={{
                      background: `linear-gradient(90deg, hsla(${meta.hue}, 40%, 40%, 0.3), hsl(${meta.hue}, 45%, 55%))`,
                      boxShadow: `0 0 4px hsla(${meta.hue}, 50%, 50%, 0.15)`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────

interface ProModeMixerProps {
  coherenceH: number;
  values: DimensionValues;
  onChange: (values: DimensionValues) => void;
  activePresetId: string | null;
  onSelectPreset: (preset: DimensionPreset) => void;
}

export default function ProModeMixer({
  coherenceH,
  values,
  onChange,
  activePresetId,
  onSelectPreset,
}: ProModeMixerProps) {
  // Dual-deck state
  const [deckAPreset, setDeckAPreset] = useState<DimensionPreset | null>(null);
  const [deckBPreset, setDeckBPreset] = useState<DimensionPreset | null>(null);
  const [crossfader, setCrossfader] = useState(0.5);
  const [manualOverride, setManualOverride] = useState(false);

  // When either deck or crossfader changes → blend and emit
  useEffect(() => {
    if (manualOverride) return;
    const aVals = deckAPreset?.values ?? getDefaultValues();
    const bVals = deckBPreset?.values ?? getDefaultValues();
    const blended = blendValues(aVals, bVals, crossfader);
    onChange(blended);

    // Also report active preset for external consumers
    if (crossfader < 0.1 && deckAPreset) onSelectPreset(deckAPreset);
    else if (crossfader > 0.9 && deckBPreset) onSelectPreset(deckBPreset);
  }, [deckAPreset, deckBPreset, crossfader, manualOverride]);

  const handleLoadDeckA = useCallback((p: DimensionPreset) => {
    setDeckAPreset(p);
    setManualOverride(false);
  }, []);

  const handleLoadDeckB = useCallback((p: DimensionPreset) => {
    setDeckBPreset(p);
    setManualOverride(false);
  }, []);

  const handleCrossfaderChange = useCallback((v: number) => {
    setCrossfader(v);
    setManualOverride(false);
  }, []);

  const handleFaderChange = useCallback(
    (dimId: string, value: number) => {
      setManualOverride(true);
      onChange({ ...values, [dimId]: value });
    },
    [values, onChange],
  );

  const groupedDimensions = useMemo(() => {
    const groups: Record<DimensionCategory, typeof DIMENSIONS[number][]> = {
      reasoning: [], expression: [], awareness: [],
    };
    for (const d of DIMENSIONS) groups[d.category].push(d);
    return groups;
  }, []);

  const categories: DimensionCategory[] = ["reasoning", "expression", "awareness"];

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: DJ.chassis, fontFamily: DJ.font }}
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 pt-4 pb-1.5">
        <div className="flex items-center gap-2 mb-0.5">
          <div className="w-1 h-1 rounded-full" style={{ background: DJ.gold }} />
          <span className="text-[9px] tracking-[0.3em] uppercase" style={{ color: "hsla(38, 15%, 55%, 0.35)" }}>
            Pro Mode
          </span>
        </div>
        <h2
          className="text-[16px] font-light"
          style={{ fontFamily: DJ.fontDisplay, color: DJ.text, letterSpacing: "-0.01em" }}
        >
          Mix your experience
        </h2>
      </div>

      {/* ── Scrollable content ──────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pb-6" style={{ scrollBehavior: "smooth" }}>

        {/* ── Dual Turntables ────────────────────────────────── */}
        <div
          className="flex items-start justify-center gap-4 py-3 rounded-xl mb-3"
          style={{ background: DJ.channel, border: `1px solid ${DJ.border}` }}
        >
          <TurntableDeck
            side="A"
            preset={deckAPreset}
            spinning={!!deckAPreset && crossfader < 0.95}
            accentColor={DJ.deckA}
          />
          {/* Center divider */}
          <div className="flex flex-col items-center pt-6">
            <div style={{ width: 1, height: 50, background: DJ.border }} />
            <span className="text-[7px] tracking-[0.2em] uppercase mt-1" style={{ color: DJ.textDim }}>
              MIX
            </span>
          </div>
          <TurntableDeck
            side="B"
            preset={deckBPreset}
            spinning={!!deckBPreset && crossfader > 0.05}
            accentColor={DJ.deckB}
          />
        </div>

        {/* ── Deck Selectors ─────────────────────────────────── */}
        <div className="space-y-2.5 mb-3">
          <PresetSelector side="A" selectedId={deckAPreset?.id ?? null} onSelect={handleLoadDeckA} accentColor={DJ.deckA} />
          <PresetSelector side="B" selectedId={deckBPreset?.id ?? null} onSelect={handleLoadDeckB} accentColor={DJ.deckB} />
        </div>

        {/* ── Crossfader ─────────────────────────────────────── */}
        <div className="mb-3">
          <Crossfader value={crossfader} onChange={handleCrossfaderChange} />
        </div>

        {/* ── Live Display ────────────────────────────────────── */}
        <div className="mb-3">
          <LiveDisplay
            coherenceH={coherenceH}
            values={values}
            deckA={deckAPreset}
            deckB={deckBPreset}
            mix={crossfader}
          />
        </div>

        {/* ── Channel Faders (blended output, overridable) ──── */}
        <div className="space-y-2 mb-3">
          {categories.map((cat) => {
            const meta = CATEGORY_META[cat];
            const dims = groupedDimensions[cat];
            return (
              <div key={cat}>
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <div className="w-1 h-1 rounded-full" style={{ background: `hsla(${meta.hue}, 45%, 55%, 0.5)` }} />
                  <span className="text-[8px] tracking-[0.15em] uppercase font-medium" style={{ color: `hsla(${meta.hue}, 30%, 60%, 0.5)` }}>
                    {meta.label}
                  </span>
                  {manualOverride && (
                    <span className="text-[7px] px-1 py-0.5 rounded" style={{ background: "hsla(38, 30%, 30%, 0.2)", color: DJ.textDim }}>
                      custom
                    </span>
                  )}
                </div>
                <div
                  className="flex justify-center rounded-lg px-2 py-2"
                  style={{ background: DJ.channel, border: `1px solid ${DJ.border}`, gap: 2 }}
                >
                  {dims.map((dim) => (
                    <MiniVerticalFader
                      key={dim.id}
                      label={dim.label}
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

        {/* ── Reset ─────────────────────────────────────────── */}
        <button
          onPointerDown={() => {
            setDeckAPreset(null);
            setDeckBPreset(null);
            setCrossfader(0.5);
            setManualOverride(false);
            onChange(getDefaultValues());
          }}
          className="w-full text-center py-2 rounded-lg transition-all duration-200 active:scale-[0.98]"
          style={{
            color: DJ.textDim,
            background: DJ.channel,
            border: `1px solid ${DJ.border}`,
            fontSize: "10px",
            letterSpacing: "0.12em",
          }}
        >
          Reset All
        </button>
      </div>
    </div>
  );
}
