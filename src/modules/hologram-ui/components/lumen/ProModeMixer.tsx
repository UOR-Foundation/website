/**
 * ProModeMixer — The DJ Mixing Board for Lumen AI
 * ════════════════════════════════════════════════
 *
 * A beautiful, tactile interface for shaping Lumen's character.
 * Each dimension is a continuous fader. Presets load instantly.
 * Coherence sits at the center of everything.
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

// ── Palette ──────────────────────────────────────────────────────────
const M = {
  bg: "hsl(25, 8%, 8%)",
  surface: "hsla(25, 8%, 12%, 0.9)",
  surfaceHover: "hsla(38, 15%, 18%, 0.15)",
  border: "hsla(38, 15%, 25%, 0.1)",
  text: "hsl(38, 15%, 82%)",
  textMuted: "hsl(30, 10%, 55%)",
  textDim: "hsl(30, 8%, 40%)",
  gold: "hsl(38, 50%, 55%)",
  font: "'DM Sans', sans-serif",
  fontDisplay: "'Playfair Display', serif",
} as const;

// ── Fader Component ──────────────────────────────────────────────────

function Fader({
  label,
  value,
  onChange,
  lowLabel,
  highLabel,
  hue,
  description,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  lowLabel: string;
  highLabel: string;
  hue: number;
  description: string;
}) {
  const pct = Math.round(value * 100);
  const accentColor = `hsl(${hue}, 45%, 58%)`;
  const accentGlow = `hsla(${hue}, 50%, 55%, 0.25)`;
  const trackFill = `hsla(${hue}, 45%, 55%, 0.35)`;

  return (
    <div className="group py-2.5">
      {/* Label row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="text-[12px] font-medium tracking-wide"
            style={{ color: M.text }}
          >
            {label}
          </span>
          <span
            className="text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ color: accentColor }}
          >
            {pct}
          </span>
        </div>
        <span
          className="text-[10px] opacity-0 group-hover:opacity-60 transition-opacity duration-300"
          style={{ color: M.textDim }}
        >
          {description}
        </span>
      </div>

      {/* Slider track */}
      <div className="relative h-6 flex items-center">
        {/* Track background */}
        <div
          className="absolute inset-x-0 h-[3px] rounded-full"
          style={{ background: "hsla(30, 8%, 20%, 0.4)" }}
        />

        {/* Track fill */}
        <div
          className="absolute left-0 h-[3px] rounded-full transition-all duration-150"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${trackFill}, ${accentColor})`,
          }}
        />

        {/* Range input (invisible, drives the interaction) */}
        <input
          type="range"
          min={0}
          max={100}
          value={pct}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          style={{ margin: 0 }}
        />

        {/* Thumb visualization */}
        <div
          className="absolute w-3 h-3 rounded-full pointer-events-none transition-all duration-150 group-hover:scale-125"
          style={{
            left: `calc(${pct}% - 6px)`,
            background: accentColor,
            boxShadow: `0 0 8px ${accentGlow}, 0 0 2px ${accentGlow}`,
          }}
        />
      </div>

      {/* End labels */}
      <div className="flex justify-between mt-1">
        <span className="text-[9px] uppercase tracking-[0.15em]" style={{ color: M.textDim }}>
          {lowLabel}
        </span>
        <span className="text-[9px] uppercase tracking-[0.15em]" style={{ color: M.textDim }}>
          {highLabel}
        </span>
      </div>
    </div>
  );
}

// ── Preset Card ──────────────────────────────────────────────────────

function PresetCard({
  preset,
  isActive,
  onSelect,
}: {
  preset: DimensionPreset;
  isActive: boolean;
  onSelect: () => void;
}) {
  const phaseHue = preset.phase === "learn" ? 210 : preset.phase === "work" ? 38 : 280;
  const phaseColor = `hsl(${phaseHue}, 40%, 58%)`;

  return (
    <button
      onPointerDown={onSelect}
      className="flex-shrink-0 rounded-xl px-4 py-3 transition-all duration-220 text-left"
      style={{
        background: isActive
          ? `hsla(${phaseHue}, 25%, 20%, 0.35)`
          : "hsla(25, 8%, 12%, 0.4)",
        border: `1px solid ${isActive ? `hsla(${phaseHue}, 35%, 40%, 0.3)` : M.border}`,
        minWidth: 130,
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="text-[14px]"
          style={{ color: isActive ? phaseColor : M.textMuted }}
        >
          {preset.icon}
        </span>
        <span
          className="text-[12px] font-semibold"
          style={{ color: isActive ? M.text : M.textMuted }}
        >
          {preset.name}
        </span>
      </div>
      <span
        className="text-[10px] block"
        style={{ color: M.textDim }}
      >
        {preset.subtitle}
      </span>
    </button>
  );
}

// ── Coherence Orb ────────────────────────────────────────────────────

function CoherenceOrb({ coherenceH }: { coherenceH: number }) {
  const pct = Math.round(coherenceH * 100);
  const hue = 38 + coherenceH * 120; // gold → green as coherence rises

  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <div className="relative w-16 h-16 flex items-center justify-center">
        {/* Glow ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          style={{
            border: `1.5px solid hsla(${hue}, 50%, 60%, 0.3)`,
          }}
        />
        {/* Inner orb */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{
            background: `radial-gradient(circle at 40% 35%, hsla(${hue}, 50%, 55%, 0.2), hsla(${hue}, 40%, 30%, 0.08))`,
            border: `1px solid hsla(${hue}, 40%, 50%, 0.15)`,
          }}
        >
          <span
            className="font-mono text-[15px] font-medium"
            style={{ color: `hsl(${hue}, 45%, 65%)` }}
          >
            {pct}
          </span>
        </div>
      </div>
      <span
        className="text-[10px] tracking-[0.2em] uppercase"
        style={{ color: `hsla(${hue}, 30%, 55%, 0.5)` }}
      >
        Coherence
      </span>
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
  const [expandedCategory, setExpandedCategory] = useState<DimensionCategory | null>(null);

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

  const categories: DimensionCategory[] = ["reasoning", "expression", "awareness"];

  // Group presets by phase
  const presetGroups = useMemo(() => ({
    learn: PRESETS.filter(p => p.phase === "learn"),
    work: PRESETS.filter(p => p.phase === "work"),
    play: PRESETS.filter(p => p.phase === "play"),
  }), []);

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: M.bg, fontFamily: M.font }}
    >
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-5 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-1 h-1 rounded-full"
            style={{ background: M.gold }}
          />
          <span
            className="text-[11px] tracking-[0.25em] uppercase"
            style={{ color: "hsla(38, 15%, 60%, 0.4)" }}
          >
            Pro Mode
          </span>
        </div>
        <h2
          className="text-[20px] font-light"
          style={{ fontFamily: M.fontDisplay, color: M.text, letterSpacing: "-0.01em" }}
        >
          Shape your experience
        </h2>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 pb-6" style={{ scrollBehavior: "smooth" }}>

        {/* Coherence — the center of everything */}
        <CoherenceOrb coherenceH={coherenceH} />

        {/* Dimension Categories */}
        {categories.map((cat) => {
          const meta = CATEGORY_META[cat];
          const dims = groupedDimensions[cat];
          const isExpanded = expandedCategory === cat || expandedCategory === null;

          return (
            <div key={cat} className="mb-4">
              <button
                onPointerDown={() =>
                  setExpandedCategory(expandedCategory === cat ? null : cat)
                }
                className="w-full flex items-center justify-between py-2 group"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: `hsla(${meta.hue}, 45%, 55%, 0.5)` }}
                  />
                  <span
                    className="text-[11px] tracking-[0.15em] uppercase font-medium"
                    style={{ color: `hsla(${meta.hue}, 30%, 65%, 0.7)` }}
                  >
                    {meta.label}
                  </span>
                </div>
                {/* Category average */}
                <span
                  className="text-[10px] font-mono"
                  style={{ color: M.textDim }}
                >
                  {Math.round(
                    (dims.reduce((s, d) => s + (values[d.id] ?? d.defaultValue), 0) / dims.length) * 100
                  )}
                </span>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div
                      className="rounded-xl px-4 py-2"
                      style={{
                        background: "hsla(25, 8%, 10%, 0.5)",
                        border: `1px solid ${M.border}`,
                      }}
                    >
                      {dims.map((dim) => (
                        <Fader
                          key={dim.id}
                          label={dim.label}
                          value={values[dim.id] ?? dim.defaultValue}
                          onChange={(v) => handleFaderChange(dim.id, v)}
                          lowLabel={dim.lowLabel}
                          highLabel={dim.highLabel}
                          hue={dim.hue}
                          description={dim.description}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* Divider */}
        <div
          className="h-px my-4"
          style={{ background: M.border }}
        />

        {/* Presets — horizontal scrollable rails */}
        <div className="mb-2">
          <span
            className="text-[10px] tracking-[0.2em] uppercase block mb-3"
            style={{ color: M.textDim }}
          >
            Presets
          </span>

          {(["learn", "work", "play"] as const).map((phase) => {
            const phaseLabel = phase === "learn" ? "Learn" : phase === "work" ? "Work" : "Play";
            const presets = presetGroups[phase];

            return (
              <div key={phase} className="mb-3">
                <span
                  className="text-[9px] tracking-[0.2em] uppercase mb-2 block"
                  style={{
                    color: phase === "learn"
                      ? "hsla(210, 30%, 60%, 0.5)"
                      : phase === "work"
                        ? "hsla(38, 30%, 60%, 0.5)"
                        : "hsla(280, 30%, 60%, 0.5)",
                  }}
                >
                  {phaseLabel}
                </span>
                <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                  {presets.map((preset) => (
                    <PresetCard
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

        {/* Reset button */}
        <button
          onPointerDown={() => onChange(getDefaultValues())}
          className="w-full text-center py-2.5 rounded-lg transition-all duration-200"
          style={{
            color: M.textDim,
            background: "hsla(25, 8%, 14%, 0.4)",
            border: `1px solid ${M.border}`,
            fontSize: "11px",
            letterSpacing: "0.1em",
          }}
        >
          Reset to Default
        </button>
      </div>
    </div>
  );
}
