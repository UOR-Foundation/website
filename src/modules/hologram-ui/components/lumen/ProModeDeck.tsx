/**
 * ProModeDeck — Pioneer-Style DJ Controller for Lumen
 * ════════════════════════════════════════════════════
 *
 * Redesigned to "unfold" around the input text box.
 * The input stays anchored; the deck blooms outward with
 * staggered spring animations for a magical experience.
 *
 * Layout (center-outward bloom):
 *   ┌─────────────────────────────────────┐
 *   │  [Deck A]   Screen Display  [Deck B]│ ← rises up
 *   │             ─────────────           │
 *   │     Fader Groups (3 categories)     │ ← scales in
 *   │         ═══ Crossfader ═══          │ ← fades in
 *   │       ╔═══ Input Box ═══╗           │ ← stays in place
 *   └─────────────────────────────────────┘
 *
 * @module hologram-ui/components/lumen/ProModeDeck
 */

import { useState, useCallback, useMemo, useEffect, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search, Upload, X, Save } from "lucide-react";
import {
  DIMENSIONS,
  PRESETS,
  CELEBRITY_PRESETS,
  CATEGORY_META,
  getDefaultValues,
  getAllPresets,
  searchPresets,
  parsePersonaFile,
  saveCustomPreset,
  type DimensionValues,
  type DimensionCategory,
  type DimensionPreset,
} from "@/modules/hologram-ui/engine/proModeDimensions";
import { useLumenPresets } from "@/modules/hologram-ui/hooks/useLumenPresets";

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

// ── LED ─────────────────────────────────────────────────────────────

function LED({ on, color = HW.gold, size = 5 }: { on: boolean; color?: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: on ? color : "hsla(0,0%,15%,0.5)",
      boxShadow: on ? `0 0 ${size}px ${color}, 0 0 ${size * 2}px ${color}40` : "none",
      transition: "all 0.3s",
    }} />
  );
}

// ── Channel Fader (redesigned — taller, cleaner) ────────────────────

function ChannelFader({ label, value, onChange, hue, lowLabel, highLabel }: {
  label: string; value: number; onChange: (v: number) => void; hue: number; lowLabel: string; highLabel: string;
}) {
  const pct = Math.round(value * 100);
  const accent = `hsl(${hue}, 45%, 55%)`;
  return (
    <div className="flex flex-col items-center" style={{ width: 44 }}>
      <span className="text-[7px] font-medium mb-1 tracking-wider opacity-40" style={{ color: accent }}>{highLabel}</span>
      <div className="relative rounded-md flex items-center justify-center"
        style={{ width: 20, height: 80, background: HW.groove, border: `1px solid ${HW.border}`, boxShadow: "inset 0 1px 4px hsla(0,0%,0%,0.4)" }}>
        {/* Track line */}
        <div className="absolute" style={{ width: 2, top: 6, bottom: 6, left: "50%", transform: "translateX(-50%)", background: "hsla(0,0%,16%,0.5)", borderRadius: 1 }} />
        {/* Fill */}
        <div className="absolute transition-all duration-75" style={{
          width: 2, bottom: 6, left: "50%", transform: "translateX(-50%)", borderRadius: 1,
          height: `${pct * 0.72}%`, maxHeight: "calc(100% - 12px)",
          background: `linear-gradient(to top, ${accent}, hsla(${hue}, 35%, 35%, 0.2))`,
        }} />
        {/* Thumb */}
        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none transition-all duration-75" style={{
          bottom: `calc(6px + ${pct}% * 0.52)`, width: 16, height: 8, borderRadius: 2,
          background: `linear-gradient(180deg, hsl(0, 0%, 32%), hsl(0, 0%, 16%))`,
          border: `1px solid hsla(${hue}, 25%, 40%, 0.25)`,
          boxShadow: `0 0 5px hsla(${hue}, 50%, 50%, 0.15), 0 1px 2px hsla(0,0%,0%,0.5)`,
        }} />
        <input type="range" min={0} max={100} value={pct} onChange={(e) => onChange(Number(e.target.value) / 100)}
          className="absolute inset-0 opacity-0 cursor-pointer z-10"
          style={{ width: "100%", height: "100%", writingMode: "vertical-lr", direction: "rtl", margin: 0, WebkitAppearance: "slider-vertical" as never }} />
      </div>
      <span className="text-[7px] font-medium mt-1 tracking-wider opacity-40" style={{ color: accent }}>{lowLabel}</span>
      <span className="text-[10px] font-bold mt-0.5" style={{ color: accent }}>{label}</span>
    </div>
  );
}

// ── Persona Card ────────────────────────────────────────────────────

function PersonaCard({ preset: p, active, hue: pH, accentColor, onSelect }: {
  preset: DimensionPreset; active: boolean; hue: number; accentColor: string;
  onSelect: (p: DimensionPreset) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="relative">
      <button
        onPointerDown={() => onSelect(p)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-all duration-100 text-left active:scale-[0.98]"
        style={{
          background: active ? `hsla(${pH}, 22%, 16%, 0.7)` : hovered ? `hsla(${pH}, 15%, 13%, 0.4)` : "transparent",
          border: active ? `1px solid hsla(${pH}, 40%, 45%, 0.3)` : "1px solid transparent",
        }}
      >
        <span className="text-[18px] flex-shrink-0" style={{
          filter: active ? `drop-shadow(0 0 4px hsla(${pH}, 50%, 50%, 0.3))` : "none",
        }}>{p.icon}</span>
        <div className="flex-1 min-w-0">
          <span className="text-[12px] font-semibold block truncate"
            style={{ color: active ? HW.text : HW.textSub }}>{p.name}</span>
          <span className="text-[10px] block truncate"
            style={{ color: active ? HW.textSub : HW.textDim }}>{p.subtitle}</span>
        </div>
        {active && <LED on size={4} color={accentColor} />}
      </button>

      {/* Quote tooltip on hover */}
      <AnimatePresence>
        {hovered && p.quote && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 2, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="absolute left-1/2 -translate-x-1/2 z-50 pointer-events-none"
            style={{ bottom: "calc(100% + 6px)", width: "max(180px, 100%)", maxWidth: "220px" }}
          >
            <div className="rounded-lg px-3 py-2.5 shadow-lg"
              style={{
                background: `linear-gradient(135deg, hsla(${pH}, 18%, 12%, 0.95), hsla(${pH}, 12%, 8%, 0.95))`,
                border: `1px solid hsla(${pH}, 30%, 35%, 0.3)`,
                backdropFilter: "blur(12px)",
              }}>
              <p className="text-[10px] leading-relaxed italic" style={{ color: `hsla(${pH}, 20%, 78%, 0.9)`, fontFamily: HW.fontDisplay }}>
                {p.quote}
              </p>
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 rotate-45"
                style={{ background: `hsla(${pH}, 12%, 8%, 0.95)`, borderRight: `1px solid hsla(${pH}, 30%, 35%, 0.3)`, borderBottom: `1px solid hsla(${pH}, 30%, 35%, 0.3)` }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Deck Search Panel ───────────────────────────────────────────────

function DeckSearchPanel({ side, accentColor, onSelect, selectedId, cloudPresets, onSavePreset }: {
  side: "A" | "B"; accentColor: string; onSelect: (p: DimensionPreset) => void; selectedId: string | null;
  cloudPresets: DimensionPreset[]; onSavePreset: (p: DimensionPreset) => void;
}) {
  const [query, setQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const allPresets = useMemo(() => [...getAllPresets(), ...cloudPresets.filter(cp => !getAllPresets().some(ap => ap.id === cp.id))], [cloudPresets]);
  const results = useMemo(() => searchPresets(query, allPresets), [query, allPresets]);

  const handleFileImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const preset = parsePersonaFile(reader.result as string);
        saveCustomPreset(preset);
        onSavePreset(preset);
        onSelect(preset);
      } catch (err) { console.error("Failed to import persona:", err); }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, [onSelect, onSavePreset]);

  const grouped = useMemo(() => {
    const groups: Record<string, DimensionPreset[]> = { "Archetypes": [], "Personalities": [], "Saved": [] };
    for (const p of results) {
      if (p.imported || cloudPresets.some(cp => cp.id === p.id)) groups["Saved"].push(p);
      else if (CELEBRITY_PRESETS.some((c) => c.id === p.id)) groups["Personalities"].push(p);
      else groups["Archetypes"].push(p);
    }
    return groups;
  }, [results, cloudPresets]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: `1px solid ${HW.border}` }}>
        <LED on size={6} color={accentColor} />
        <span className="text-[11px] tracking-[0.2em] uppercase font-bold" style={{ color: accentColor }}>Deck {side}</span>
      </div>

      <div className="px-3 py-2" style={{ borderBottom: `1px solid ${HW.border}` }}>
        <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5" style={{ background: HW.groove, border: `1px solid ${HW.border}` }}>
          <Search size={12} style={{ color: HW.textDim, flexShrink: 0 }} />
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search personas…"
            className="flex-1 bg-transparent border-none outline-none text-[12px] font-medium"
            style={{ color: HW.text, fontFamily: HW.font, caretColor: accentColor }} />
          {query && (
            <button onPointerDown={() => setQuery("")} className="opacity-50 hover:opacity-100">
              <X size={10} style={{ color: HW.textSub }} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 mt-1.5">
          <button onPointerDown={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wider uppercase transition-all hover:opacity-100 opacity-60"
            style={{ color: accentColor, background: `${accentColor}12`, border: `1px solid ${accentColor}20` }}>
            <Upload size={9} /> Import .json
          </button>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileImport} />
          <span className="text-[9px] font-mono" style={{ color: HW.textDim }}>{results.length}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-1.5" style={{ scrollbarWidth: "none" }}>
        {Object.entries(grouped).map(([group, presets]) => {
          if (presets.length === 0) return null;
          return (
            <div key={group} className="mb-2.5">
              <span className="text-[9px] tracking-[0.15em] uppercase block mb-1 px-1 font-bold"
                style={{ color: `${accentColor}60` }}>{group}</span>
              <div className="space-y-0.5">
                {presets.map((p) => (
                  <PersonaCard key={p.id} preset={p} active={selectedId === p.id} hue={presetHue(p)} accentColor={accentColor} onSelect={onSelect} />
                ))}
              </div>
            </div>
          );
        })}
        {results.length === 0 && (
          <div className="text-center py-4">
            <span className="text-[11px]" style={{ color: HW.textDim }}>No personas match "{query}"</span>
          </div>
        )}
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
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    let running = true;
    const render = () => {
      if (!running) return;
      const w = canvas.width, h = canvas.height; ctx.clearRect(0, 0, w, h);
      const dims = DIMENSIONS;
      const barW = Math.floor((w - 60) / dims.length);
      const startX = Math.floor((w - barW * dims.length) / 2);
      const t = Date.now() * 0.001;
      dims.forEach((dim, i) => {
        const val = values[dim.id] ?? dim.defaultValue;
        const barH = val * (h - 32);
        const x = startX + i * barW;
        const shimmer = Math.sin(t * 2.5 + i * 0.6) * 0.05 + 1;
        const finalH = barH * shimmer;
        const meta = CATEGORY_META[dim.category];
        const alpha = 0.5 + val * 0.5;
        ctx.shadowBlur = 12; ctx.shadowColor = `hsla(${meta.hue}, 55%, 55%, ${alpha * 0.25})`;
        const gradient = ctx.createLinearGradient(x, h - 10, x, h - 10 - finalH);
        gradient.addColorStop(0, `hsla(${meta.hue}, 35%, 28%, ${alpha * 0.4})`);
        gradient.addColorStop(0.4, `hsla(${meta.hue}, 50%, 50%, ${alpha * 0.7})`);
        gradient.addColorStop(1, `hsla(${meta.hue}, 60%, 65%, ${alpha})`);
        ctx.fillStyle = gradient;
        const bx = x + 3, bw = barW - 6, by = h - 10 - finalH, r = Math.min(bw / 2, 4);
        ctx.beginPath(); ctx.moveTo(bx, h - 10); ctx.lineTo(bx, by + r);
        ctx.quadraticCurveTo(bx, by, bx + r, by); ctx.lineTo(bx + bw - r, by);
        ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r); ctx.lineTo(bx + bw, h - 10); ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = `hsla(${meta.hue}, 65%, 72%, ${alpha})`; ctx.fillRect(bx, by, bw, 2);
        ctx.fillStyle = `hsla(${meta.hue}, 25%, 55%, 0.6)`; ctx.font = "bold 10px 'DM Sans', sans-serif";
        ctx.textAlign = "center"; ctx.fillText(dim.label.slice(0, 7), x + barW / 2, h - 1);
      });
      const lineY = h - 10 - coherenceH * (h - 32);
      ctx.beginPath(); ctx.strokeStyle = "hsla(38, 50%, 55%, 0.2)"; ctx.lineWidth = 1; ctx.setLineDash([3, 5]);
      ctx.moveTo(16, lineY); ctx.lineTo(w - 16, lineY); ctx.stroke(); ctx.setLineDash([]);
      frameRef.current = requestAnimationFrame(render);
    };
    render();
    return () => { running = false; cancelAnimationFrame(frameRef.current); };
  }, [values, coherenceH]);
  return <canvas ref={canvasRef} width={700} height={110} className="w-full" style={{ height: 110 }} />;
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
    <div className="flex items-center justify-between px-6 py-3" style={{ height: 110 }}>
      {/* Deck info */}
      <div className="flex flex-col gap-1.5" style={{ width: 140 }}>
        <div className="flex items-center gap-2.5">
          <LED on={!!deckA} color={HW.deckA} size={6} />
          <span className="text-[12px] font-semibold truncate" style={{ color: deckA ? HW.deckA : HW.textDim }}>
            {deckA ? deckA.name : "Deck A"}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <LED on={!!deckB} color={HW.deckB} size={6} />
          <span className="text-[12px] font-semibold truncate" style={{ color: deckB ? HW.deckB : HW.textDim }}>
            {deckB ? deckB.name : "Deck B"}
          </span>
        </div>
        <span className="text-[11px] font-mono mt-1" style={{ color: HW.textDim }}>
          Mix {Math.round((1 - mix) * 100)}/{Math.round(mix * 100)}
        </span>
      </div>

      {/* Coherence orb */}
      <motion.div className="relative flex items-center justify-center" style={{ width: 64, height: 64 }}>
        <motion.div className="absolute inset-0 rounded-full"
          animate={{ scale: [1, 1.1, 1], opacity: [0.12, 0.25, 0.12] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          style={{ border: `1.5px solid hsla(${hue}, 45%, 55%, 0.3)` }} />
        <div className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: `radial-gradient(circle at 40% 35%, hsla(${hue}, 50%, 45%, 0.2), hsla(${hue}, 30%, 18%, 0.08))`, border: `1px solid hsla(${hue}, 40%, 50%, 0.2)` }}>
          <span className="font-mono text-[18px] font-bold" style={{ color: `hsl(${hue}, 55%, 68%)` }}>{pct}</span>
        </div>
      </motion.div>

      {/* Category meters */}
      <div className="flex flex-col gap-2" style={{ width: 160 }}>
        {(["reasoning", "expression", "awareness"] as const).map((cat) => {
          const meta = CATEGORY_META[cat]; const avg = catAvg[cat];
          return (
            <div key={cat}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] tracking-wide uppercase font-semibold" style={{ color: `hsla(${meta.hue}, 35%, 58%, 0.6)` }}>{meta.label}</span>
                <span className="text-[11px] font-mono font-semibold" style={{ color: `hsl(${meta.hue}, 40%, 58%)` }}>{avg}</span>
              </div>
              <div className="h-[4px] rounded-full overflow-hidden" style={{ background: `hsla(${meta.hue}, 10%, 12%, 0.5)` }}>
                <div className="h-full rounded-full transition-all duration-300" style={{
                  width: `${avg}%`, background: `linear-gradient(90deg, hsla(${meta.hue}, 40%, 38%, 0.5), hsl(${meta.hue}, 50%, 55%))`,
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
  const cx = 175, cy = 55, maxR = 46;
  const angleStep = (Math.PI * 2) / dims.length;
  const points = dims.map((dim, i) => {
    const val = values[dim.id] ?? dim.defaultValue;
    const angle = -Math.PI / 2 + i * angleStep;
    return {
      x: cx + Math.cos(angle) * maxR * val, y: cy + Math.sin(angle) * maxR * val,
      lx: cx + Math.cos(angle) * (maxR + 14), ly: cy + Math.sin(angle) * (maxR + 14),
      label: dim.label.slice(0, 5), hue: dim.hue, val,
    };
  });
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
  return (
    <div className="flex items-center justify-center" style={{ height: 110 }}>
      <svg width={350} height={110} viewBox="0 0 350 110" className="w-full" style={{ maxWidth: 450 }}>
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <polygon key={r} points={dims.map((_, i) => { const a = -Math.PI / 2 + i * angleStep; return `${cx + Math.cos(a) * maxR * r},${cy + Math.sin(a) * maxR * r}`; }).join(" ")}
            fill="none" stroke="hsla(38, 10%, 25%, 0.12)" strokeWidth={0.5} />
        ))}
        <path d={pathD} fill="hsla(38, 40%, 50%, 0.06)" stroke="hsla(38, 50%, 60%, 0.35)" strokeWidth={1.5}
          style={{ filter: "drop-shadow(0 0 4px hsla(38, 50%, 55%, 0.1))" }} />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3} fill={`hsl(${p.hue}, 50%, 60%)`} opacity={0.8} />
            <text x={p.lx} y={p.ly + 3} textAnchor="middle" fill={`hsla(${p.hue}, 30%, 58%, 0.55)`} fontSize="8" fontFamily="'DM Sans', sans-serif">{p.label}</text>
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
    <div className="px-5 py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold" style={{ color: HW.deckA }}>A</span>
        <span className="text-[9px] tracking-[0.2em] uppercase font-semibold" style={{ color: HW.textDim }}>Crossfader</span>
        <span className="text-[10px] font-bold" style={{ color: HW.deckB }}>B</span>
      </div>
      <div className="relative h-7 flex items-center">
        <div className="absolute inset-x-0 h-[3px] rounded-full" style={{ background: `linear-gradient(90deg, ${HW.deckAGlow}, hsla(0,0%,10%,0.4), ${HW.deckBGlow})` }} />
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
      <div className="flex justify-center mt-1">
        <span className="text-[9px] font-mono" style={{ color: HW.textDim }}>
          {pct === 0 ? "Pure A" : pct === 100 ? "Pure B" : pct === 50 ? "50 / 50" : `${100 - pct} / ${pct}`}
        </span>
      </div>
    </div>
  );
}

// ── Save Current Mix Button ─────────────────────────────────────────

function SaveMixButton({ values, onSave }: { values: DimensionValues; onSave: (name: string) => void }) {
  const [showInput, setShowInput] = useState(false);
  const [name, setName] = useState("");

  if (!showInput) {
    return (
      <button onPointerDown={() => setShowInput(true)}
        className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold tracking-wider uppercase transition-all hover:opacity-100 opacity-60"
        style={{ color: HW.gold, background: HW.goldGlow, border: `1px solid ${HW.gold}25` }}>
        <Save size={9} /> Save Mix
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input type="text" value={name} onChange={(e) => setName(e.target.value)}
        placeholder="Mix name…" autoFocus
        className="px-2 py-0.5 rounded text-[10px] bg-transparent border outline-none w-24"
        style={{ color: HW.text, borderColor: HW.gold + "40", fontFamily: HW.font, caretColor: HW.gold }}
        onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) { onSave(name.trim()); setShowInput(false); setName(""); } }} />
      <button onPointerDown={() => { if (name.trim()) { onSave(name.trim()); setShowInput(false); setName(""); } }}
        className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: HW.gold, background: HW.goldGlow }}>✓</button>
      <button onPointerDown={() => { setShowInput(false); setName(""); }}
        className="text-[9px] px-1 py-0.5 rounded" style={{ color: HW.textDim }}>✕</button>
    </div>
  );
}

// ── Stagger Variants ────────────────────────────────────────────────

const bloomContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
  exit: {
    transition: { staggerChildren: 0.03, staggerDirection: -1 },
  },
};

const bloomScreen = {
  hidden: { opacity: 0, y: 20, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, damping: 28, stiffness: 300 } },
  exit: { opacity: 0, y: 10, scale: 0.98, transition: { duration: 0.15 } },
};

const bloomFaders = {
  hidden: { opacity: 0, y: 16, scale: 0.94 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, damping: 26, stiffness: 280 } },
  exit: { opacity: 0, y: 8, scale: 0.97, transition: { duration: 0.12 } },
};

const bloomCrossfader = {
  hidden: { opacity: 0, scaleX: 0.7 },
  visible: { opacity: 1, scaleX: 1, transition: { type: "spring" as const, damping: 24, stiffness: 260 } },
  exit: { opacity: 0, scaleX: 0.8, transition: { duration: 0.1 } },
};

const bloomSide = {
  hidden: (side: "left" | "right") => ({ opacity: 0, x: side === "left" ? -40 : 40 }),
  visible: { opacity: 1, x: 0, transition: { type: "spring" as const, damping: 28, stiffness: 260, delay: 0.12 } },
  exit: (side: "left" | "right") => ({ opacity: 0, x: side === "left" ? -20 : 20, transition: { duration: 0.12 } }),
};

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
  const { presets: cloudPresets, savePreset, isAuthenticated } = useLumenPresets();

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

  const handleSaveMix = useCallback((name: string) => {
    const preset: DimensionPreset = {
      id: `mix-${Date.now()}`, name, subtitle: "Custom Mix", icon: "💎",
      phase: "work", values: { ...values }, tags: ["custom", "mix"], imported: true,
    };
    savePreset(preset);
    saveCustomPreset(preset);
  }, [values, savePreset]);

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
          className="flex-shrink-0 relative"
          style={{ fontFamily: HW.font }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Gold accent line at top */}
          <div className="absolute -top-[1px] left-0 right-0 h-[2px] z-10"
            style={{ background: `linear-gradient(90deg, transparent 5%, ${HW.gold}25 20%, ${HW.gold}40 50%, ${HW.gold}25 80%, transparent 95%)` }} />

          {/* Main body */}
          <div style={{
            background: `linear-gradient(180deg, ${HW.bodyLight} 0%, ${HW.body} 100%)`,
            borderTop: `1px solid hsla(0,0%,18%,0.3)`,
            boxShadow: "0 -8px 40px hsla(0,0%,0%,0.5)",
          }}>
            {/* Top bar — clickable to collapse */}
            <div className="flex items-center justify-between px-5 py-2 cursor-pointer select-none" onPointerDown={onClose}
              style={{ borderBottom: `1px solid ${HW.border}` }}>
              <div className="flex items-center gap-3">
                <LED on size={6} color={HW.gold} />
                <span className="text-[10px] tracking-[0.25em] uppercase font-semibold" style={{ color: HW.textDim }}>Pro Mode</span>
                <span className="text-[14px] font-light" style={{ fontFamily: HW.fontDisplay, color: HW.text }}>Lumen Experience Deck</span>
              </div>
              <div className="flex items-center gap-2">
                {isAuthenticated && <SaveMixButton values={values} onSave={handleSaveMix} />}
                {manualOverride && (
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold" style={{ background: HW.goldGlow, color: HW.gold, border: `1px solid ${HW.gold}25` }}>Custom</span>
                )}
                <button onPointerDown={(e) => { e.stopPropagation(); handleReset(); }}
                  className="text-[9px] tracking-wider uppercase font-semibold px-2 py-0.5 rounded transition-all hover:opacity-100 opacity-60"
                  style={{ color: HW.textDim, background: `hsla(0,0%,14%,0.6)`, border: `1px solid ${HW.border}` }}>
                  Reset
                </button>
                <ChevronDown size={14} style={{ color: HW.textDim }} />
              </div>
            </div>

            {/* Three-column layout with staggered bloom */}
            <motion.div
              className="flex"
              style={{ height: "clamp(320px, 44vh, 420px)" }}
              variants={bloomContainer}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* LEFT DECK — slides in from left */}
              <motion.div
                className="flex-shrink-0 overflow-hidden flex flex-col"
                style={{ width: 200, borderRight: `1px solid ${HW.border}` }}
                custom="left"
                variants={bloomSide}
              >
                <DeckSearchPanel side="A" accentColor={HW.deckA}
                  onSelect={(p) => { setDeckAPreset(p); setManualOverride(false); }}
                  selectedId={deckAPreset?.id ?? null}
                  cloudPresets={cloudPresets}
                  onSavePreset={savePreset} />
              </motion.div>

              {/* CENTER — screen + faders + crossfader + input */}
              <div className="flex-1 flex flex-col min-w-0 overflow-y-auto" style={{ scrollbarWidth: "none" }}>

                {/* Screen — blooms first */}
                <motion.div variants={bloomScreen}
                  className="flex-shrink-0 mx-4 mt-3 rounded-xl overflow-hidden"
                  style={{
                    background: HW.screen,
                    border: `1px solid ${HW.screenBorder}`,
                    boxShadow: "inset 0 2px 8px hsla(0,0%,0%,0.6), 0 2px 16px hsla(0,0%,0%,0.3)",
                  }}>
                  {/* Screen tab bar */}
                  <div className="flex items-center justify-between px-4 py-1.5" style={{ borderBottom: "1px solid hsla(220,8%,14%,0.5)" }}>
                    <div className="flex gap-1">
                      {(["spectrum", "coherence", "radar"] as const).map((m) => (
                        <button key={m} onPointerDown={() => setScreenMode(m)}
                          className="px-2.5 py-1 rounded-md text-[10px] tracking-wider uppercase font-semibold transition-all"
                          style={{
                            color: screenMode === m ? HW.goldBright : HW.textDim,
                            background: screenMode === m ? HW.goldGlow : "transparent",
                          }}>
                          {m}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <LED on={coherenceH > 0.7} color={HW.green} size={5} />
                      <LED on={coherenceH > 0.4 && coherenceH <= 0.7} color={HW.gold} size={5} />
                      <LED on={coherenceH <= 0.4} color={HW.red} size={5} />
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
                </motion.div>

                {/* Faders — bloom second */}
                <motion.div variants={bloomFaders}
                  className="flex-shrink-0 flex items-start justify-center gap-3 mx-4 mt-3">
                  {categories.map((cat) => {
                    const meta = CATEGORY_META[cat];
                    const dims = groupedDimensions[cat];
                    return (
                      <div key={cat} className="flex-shrink-0 rounded-xl px-3 py-2" style={{ background: HW.surface, border: `1px solid ${HW.border}` }}>
                        <div className="flex items-center gap-1.5 mb-1.5 justify-center">
                          <LED on size={4} color={`hsl(${meta.hue}, 50%, 55%)`} />
                          <span className="text-[9px] tracking-[0.15em] uppercase font-bold" style={{ color: `hsla(${meta.hue}, 35%, 58%, 0.6)` }}>{meta.label}</span>
                        </div>
                        <div className="flex justify-center gap-0.5">
                          {dims.map((dim) => (
                            <ChannelFader key={dim.id} label={dim.label}
                              value={values[dim.id] ?? dim.defaultValue}
                              onChange={(v) => handleFaderChange(dim.id, v)} hue={dim.hue}
                              lowLabel={dim.lowLabel} highLabel={dim.highLabel} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>

                {/* Crossfader — bloom third */}
                <motion.div variants={bloomCrossfader}
                  className="flex-shrink-0 mx-4 mt-2 rounded-xl" style={{ background: HW.surface, border: `1px solid ${HW.border}` }}>
                  <Crossfader value={crossfader} onChange={(v) => { setCrossfader(v); setManualOverride(false); }} />
                </motion.div>

                {/* Input slot — always visible, anchored */}
                {inputSlot && (
                  <motion.div
                    className="flex-shrink-0 mx-4 mt-2 mb-3"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 1 }}
                  >
                    {inputSlot}
                  </motion.div>
                )}
              </div>

              {/* RIGHT DECK — slides in from right */}
              <motion.div
                className="flex-shrink-0 overflow-hidden flex flex-col"
                style={{ width: 200, borderLeft: `1px solid ${HW.border}` }}
                custom="right"
                variants={bloomSide}
              >
                <DeckSearchPanel side="B" accentColor={HW.deckB}
                  onSelect={(p) => { setDeckBPreset(p); setManualOverride(false); }}
                  selectedId={deckBPreset?.id ?? null}
                  cloudPresets={cloudPresets}
                  onSavePreset={savePreset} />
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
