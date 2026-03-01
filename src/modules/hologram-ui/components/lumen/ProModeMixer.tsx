/**
 * ProModeMixer — The DJ Deck for Lumen AI
 * ════════════════════════════════════════
 *
 * Inspired by Pioneer DJ controllers. Vertical channel-strip faders,
 * a central live display, and preset decks. Every label is human-first.
 *
 * @module hologram-ui/components/lumen/ProModeMixer
 */

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DIMENSIONS,
  PRESETS,
  CATEGORY_META,
  getDefaultValues,
  type DimensionValues,
  type DimensionCategory,
  type DimensionPreset,
} from "@/modules/hologram-ui/engine/proModeDimensions";

// ── Palette — dark hardware surface ──────────────────────────────────
const DJ = {
  chassis: "hsl(20, 6%, 7%)",
  surface: "hsl(22, 6%, 10%)",
  channel: "hsl(20, 5%, 12%)",
  bezel: "hsl(22, 8%, 15%)",
  groove: "hsl(20, 4%, 6%)",
  border: "hsla(38, 12%, 22%, 0.15)",
  text: "hsl(38, 12%, 78%)",
  textMuted: "hsl(30, 8%, 50%)",
  textDim: "hsl(30, 6%, 35%)",
  gold: "hsl(38, 55%, 55%)",
  goldGlow: "hsla(38, 60%, 50%, 0.35)",
  screen: "hsl(220, 15%, 6%)",
  screenText: "hsl(38, 25%, 70%)",
  font: "'DM Sans', sans-serif",
  fontDisplay: "'Playfair Display', serif",
} as const;

// ── Vertical Fader (channel strip) ───────────────────────────────────

function VerticalFader({
  label,
  value,
  onChange,
  lowLabel,
  highLabel,
  hue,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  lowLabel: string;
  highLabel: string;
  hue: number;
}) {
  const pct = Math.round(value * 100);
  const accentColor = `hsl(${hue}, 45%, 55%)`;
  const accentGlow = `hsla(${hue}, 55%, 50%, 0.4)`;

  return (
    <div className="flex flex-col items-center" style={{ width: 52 }}>
      {/* Top label */}
      <span
        className="text-[8px] tracking-[0.12em] uppercase mb-1 text-center leading-tight"
        style={{ color: DJ.textDim, height: 20, display: "flex", alignItems: "center" }}
      >
        {highLabel}
      </span>

      {/* Fader track */}
      <div
        className="relative rounded-full flex items-center justify-center"
        style={{
          width: 28,
          height: 120,
          background: DJ.groove,
          border: `1px solid ${DJ.border}`,
        }}
      >
        {/* Track groove */}
        <div
          className="absolute rounded-full"
          style={{
            width: 3,
            top: 10,
            bottom: 10,
            left: "50%",
            transform: "translateX(-50%)",
            background: "hsla(20, 4%, 16%, 0.6)",
          }}
        />

        {/* Fill from bottom */}
        <div
          className="absolute rounded-full transition-all duration-150"
          style={{
            width: 3,
            bottom: 10,
            left: "50%",
            transform: "translateX(-50%)",
            height: `${pct}%`,
            maxHeight: "calc(100% - 20px)",
            background: `linear-gradient(to top, ${accentColor}, hsla(${hue}, 40%, 45%, 0.3))`,
          }}
        />

        {/* Thumb knob */}
        <div
          className="absolute left-1/2 -translate-x-1/2 pointer-events-none transition-all duration-150"
          style={{
            bottom: `calc(10px + ${pct}% * 0.8)`,
            width: 20,
            height: 8,
            borderRadius: 3,
            background: `linear-gradient(180deg, hsl(22, 8%, 28%), hsl(22, 8%, 18%))`,
            border: `1px solid hsla(${hue}, 30%, 40%, 0.3)`,
            boxShadow: `0 0 6px ${accentGlow}, 0 1px 3px hsla(0,0%,0%,0.5)`,
          }}
        />

        {/* Invisible range input (vertical) */}
        <input
          type="range"
          min={0}
          max={100}
          value={pct}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          className="absolute inset-0 opacity-0 cursor-pointer z-10"
          style={{
            width: "100%",
            height: "100%",
            writingMode: "vertical-lr",
            direction: "rtl",
            margin: 0,
            WebkitAppearance: "slider-vertical",
          }}
        />
      </div>

      {/* Bottom label */}
      <span
        className="text-[8px] tracking-[0.12em] uppercase mt-1 text-center leading-tight"
        style={{ color: DJ.textDim, height: 20, display: "flex", alignItems: "center" }}
      >
        {lowLabel}
      </span>

      {/* Dimension name + value */}
      <div className="flex flex-col items-center mt-1.5">
        <span
          className="text-[10px] font-medium tracking-wide"
          style={{ color: accentColor }}
        >
          {label}
        </span>
        <span
          className="text-[9px] font-mono"
          style={{ color: DJ.textMuted }}
        >
          {pct}
        </span>
      </div>
    </div>
  );
}

// ── Live Display Screen ──────────────────────────────────────────────

function LiveDisplay({
  coherenceH,
  values,
  activePresetName,
}: {
  coherenceH: number;
  values: DimensionValues;
  activePresetName: string | null;
}) {
  const pct = Math.round(coherenceH * 100);
  const hue = 38 + coherenceH * 80;

  // Compute category averages
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
        border: `1px solid hsla(220, 10%, 18%, 0.4)`,
        boxShadow: "inset 0 1px 4px hsla(0,0%,0%,0.4), 0 0 12px hsla(38, 50%, 40%, 0.05)",
      }}
    >
      {/* Screen header */}
      <div
        className="flex items-center justify-between px-3 py-1.5"
        style={{ borderBottom: "1px solid hsla(220, 10%, 15%, 0.5)" }}
      >
        <span className="text-[8px] tracking-[0.2em] uppercase" style={{ color: DJ.textDim }}>
          Live Mix
        </span>
        {activePresetName && (
          <span className="text-[9px] font-medium" style={{ color: `hsl(${hue}, 40%, 60%)` }}>
            {activePresetName}
          </span>
        )}
      </div>

      {/* Main display content */}
      <div className="px-3 py-3">
        {/* Coherence — large center metric */}
        <div className="flex items-center justify-center gap-3 mb-3">
          <motion.div
            className="relative flex items-center justify-center"
            style={{ width: 52, height: 52 }}
          >
            {/* Breathing ring */}
            <motion.div
              className="absolute inset-0 rounded-full"
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              style={{ border: `1px solid hsla(${hue}, 45%, 55%, 0.3)` }}
            />
            {/* Orb */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: `radial-gradient(circle at 40% 35%, hsla(${hue}, 50%, 50%, 0.2), hsla(${hue}, 35%, 25%, 0.05))`,
                border: `1px solid hsla(${hue}, 35%, 45%, 0.2)`,
              }}
            >
              <span
                className="font-mono text-[16px] font-semibold"
                style={{ color: `hsl(${hue}, 50%, 65%)` }}
              >
                {pct}
              </span>
            </div>
          </motion.div>
          <div className="flex flex-col">
            <span className="text-[10px] tracking-[0.15em] uppercase" style={{ color: `hsla(${hue}, 30%, 55%, 0.6)` }}>
              Coherence
            </span>
            <span className="text-[9px]" style={{ color: DJ.textDim }}>
              {pct >= 80 ? "Resonant" : pct >= 60 ? "Balanced" : pct >= 40 ? "Exploring" : "Diffuse"}
            </span>
          </div>
        </div>

        {/* Category meters — horizontal bars like a level meter */}
        <div className="space-y-2">
          {(["reasoning", "expression", "awareness"] as const).map((cat) => {
            const meta = CATEGORY_META[cat];
            const avg = catAvg[cat];
            return (
              <div key={cat}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[9px] tracking-[0.1em] uppercase" style={{ color: `hsla(${meta.hue}, 30%, 55%, 0.6)` }}>
                    {meta.label}
                  </span>
                  <span className="text-[9px] font-mono" style={{ color: DJ.textMuted }}>
                    {avg}
                  </span>
                </div>
                <div
                  className="h-1 rounded-full overflow-hidden"
                  style={{ background: "hsla(220, 8%, 12%, 0.8)" }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    animate={{ width: `${avg}%` }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    style={{
                      background: `linear-gradient(90deg, hsla(${meta.hue}, 40%, 40%, 0.4), hsl(${meta.hue}, 45%, 55%))`,
                      boxShadow: `0 0 6px hsla(${meta.hue}, 50%, 50%, 0.2)`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Individual dimension readout — tiny LED-style indicators */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 justify-center">
          {DIMENSIONS.map((d) => {
            const v = Math.round((values[d.id] ?? d.defaultValue) * 100);
            return (
              <div key={d.id} className="flex items-center gap-1">
                <div
                  className="w-1 h-1 rounded-full"
                  style={{
                    background: `hsl(${d.hue}, 45%, ${40 + v * 0.25}%)`,
                    boxShadow: v > 70 ? `0 0 4px hsla(${d.hue}, 50%, 55%, 0.4)` : "none",
                  }}
                />
                <span className="text-[8px] font-mono" style={{ color: DJ.textDim }}>
                  {d.label.slice(0, 3).toUpperCase()}
                </span>
                <span className="text-[8px] font-mono" style={{ color: DJ.textMuted }}>
                  {v}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Preset Deck Card ─────────────────────────────────────────────────

function PresetDeck({
  preset,
  isActive,
  onSelect,
}: {
  preset: DimensionPreset;
  isActive: boolean;
  onSelect: () => void;
}) {
  const phaseHue = preset.phase === "learn" ? 210 : preset.phase === "work" ? 38 : 280;

  return (
    <button
      onPointerDown={onSelect}
      className="flex-shrink-0 rounded-lg px-3 py-2 transition-all duration-200 text-left"
      style={{
        background: isActive
          ? `hsla(${phaseHue}, 20%, 16%, 0.5)`
          : DJ.channel,
        border: `1px solid ${isActive
          ? `hsla(${phaseHue}, 35%, 40%, 0.3)`
          : DJ.border}`,
        minWidth: 110,
        boxShadow: isActive
          ? `0 0 8px hsla(${phaseHue}, 40%, 45%, 0.15), inset 0 0 12px hsla(${phaseHue}, 30%, 30%, 0.1)`
          : "none",
      }}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <span
          className="text-[13px]"
          style={{ color: isActive ? `hsl(${phaseHue}, 40%, 60%)` : DJ.textDim }}
        >
          {preset.icon}
        </span>
        <span
          className="text-[11px] font-medium"
          style={{ color: isActive ? DJ.text : DJ.textMuted }}
        >
          {preset.name}
        </span>
      </div>
      <span className="text-[9px] block" style={{ color: DJ.textDim }}>
        {preset.subtitle}
      </span>
    </button>
  );
}

// ── Category Channel Strip ───────────────────────────────────────────

function ChannelStrip({
  category,
  dimensions,
  values,
  onFaderChange,
}: {
  category: DimensionCategory;
  dimensions: typeof DIMENSIONS[number][];
  values: DimensionValues;
  onFaderChange: (id: string, v: number) => void;
}) {
  const meta = CATEGORY_META[category];

  return (
    <div>
      {/* Category header */}
      <div className="flex items-center gap-1.5 mb-2 px-1">
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: `hsla(${meta.hue}, 45%, 55%, 0.5)` }}
        />
        <span
          className="text-[9px] tracking-[0.18em] uppercase font-medium"
          style={{ color: `hsla(${meta.hue}, 30%, 60%, 0.6)` }}
        >
          {meta.label}
        </span>
      </div>

      {/* Fader row */}
      <div
        className="flex justify-center rounded-xl px-2 py-3"
        style={{
          background: DJ.channel,
          border: `1px solid ${DJ.border}`,
          gap: 4,
        }}
      >
        {dimensions.map((dim) => (
          <VerticalFader
            key={dim.id}
            label={dim.label}
            value={values[dim.id] ?? dim.defaultValue}
            onChange={(v) => onFaderChange(dim.id, v)}
            lowLabel={dim.lowLabel}
            highLabel={dim.highLabel}
            hue={dim.hue}
          />
        ))}
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
  const handleFaderChange = useCallback(
    (dimId: string, value: number) => {
      onChange({ ...values, [dimId]: value });
    },
    [values, onChange],
  );

  const groupedDimensions = useMemo(() => {
    const groups: Record<DimensionCategory, typeof DIMENSIONS[number][]> = {
      reasoning: [],
      expression: [],
      awareness: [],
    };
    for (const d of DIMENSIONS) groups[d.category].push(d);
    return groups;
  }, []);

  const activePresetName = useMemo(() => {
    if (!activePresetId) return null;
    return PRESETS.find(p => p.id === activePresetId)?.name ?? null;
  }, [activePresetId]);

  const presetGroups = useMemo(() => ({
    learn: PRESETS.filter(p => p.phase === "learn"),
    work: PRESETS.filter(p => p.phase === "work"),
    play: PRESETS.filter(p => p.phase === "play"),
  }), []);

  const categories: DimensionCategory[] = ["reasoning", "expression", "awareness"];

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        background: DJ.chassis,
        fontFamily: DJ.font,
      }}
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-0.5">
          <div className="w-1 h-1 rounded-full" style={{ background: DJ.gold }} />
          <span
            className="text-[9px] tracking-[0.3em] uppercase"
            style={{ color: "hsla(38, 15%, 55%, 0.35)" }}
          >
            Pro Mode
          </span>
        </div>
        <h2
          className="text-[17px] font-light"
          style={{ fontFamily: DJ.fontDisplay, color: DJ.text, letterSpacing: "-0.01em" }}
        >
          Your mixing deck
        </h2>
      </div>

      {/* ── Scrollable content ──────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pb-6" style={{ scrollBehavior: "smooth" }}>

        {/* ── Central Display Screen ────────────────────────── */}
        <div className="mb-4">
          <LiveDisplay
            coherenceH={coherenceH}
            values={values}
            activePresetName={activePresetName}
          />
        </div>

        {/* ── Channel Strips ────────────────────────────────── */}
        <div className="space-y-3 mb-4">
          {categories.map((cat) => (
            <ChannelStrip
              key={cat}
              category={cat}
              dimensions={groupedDimensions[cat]}
              values={values}
              onFaderChange={handleFaderChange}
            />
          ))}
        </div>

        {/* ── Divider ───────────────────────────────────────── */}
        <div className="h-px my-3" style={{ background: DJ.border }} />

        {/* ── Preset Decks ──────────────────────────────────── */}
        <div className="mb-3">
          <span
            className="text-[9px] tracking-[0.2em] uppercase block mb-2"
            style={{ color: DJ.textDim }}
          >
            Presets
          </span>

          {(["learn", "work", "play"] as const).map((phase) => {
            const phaseLabel = phase === "learn" ? "Learn" : phase === "work" ? "Work" : "Play";
            return (
              <div key={phase} className="mb-2.5">
                <span
                  className="text-[8px] tracking-[0.2em] uppercase mb-1.5 block"
                  style={{
                    color: phase === "learn"
                      ? "hsla(210, 30%, 55%, 0.45)"
                      : phase === "work"
                        ? "hsla(38, 30%, 55%, 0.45)"
                        : "hsla(280, 30%, 55%, 0.45)",
                  }}
                >
                  {phaseLabel}
                </span>
                <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                  {presetGroups[phase].map((preset) => (
                    <PresetDeck
                      key={preset.id}
                      preset={preset}
                      isActive={activePresetId === preset.id}
                      onSelect={() => onSelectPreset(preset)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Reset ─────────────────────────────────────────── */}
        <button
          onPointerDown={() => onChange(getDefaultValues())}
          className="w-full text-center py-2 rounded-lg transition-all duration-200 active:scale-[0.98]"
          style={{
            color: DJ.textDim,
            background: DJ.channel,
            border: `1px solid ${DJ.border}`,
            fontSize: "10px",
            letterSpacing: "0.12em",
          }}
        >
          Reset to Default
        </button>
      </div>
    </div>
  );
}
