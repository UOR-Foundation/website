/**
 * ProModeDeck — Pioneer-Style DJ Controller for Lumen
 * ════════════════════════════════════════════════════
 *
 * 12 experiential dimensions across 3 categories.
 * Searchable persona library on each deck + cloud-synced presets.
 *
 * @module hologram-ui/components/lumen/ProModeDeck
 */

import { useState, useCallback, useMemo, useEffect, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search, Upload, X, Save, Heart } from "lucide-react";
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

// ── Rotary Knob ─────────────────────────────────────────────────────

function RotaryKnob({ label, value, onChange, hue, size = 34 }: {
  label: string; value: number; onChange: (v: number) => void; hue: number; size?: number;
}) {
  const accent = `hsl(${hue}, 45%, 55%)`;
  const angle = -135 + value * 270;

  const handleDrag = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const startY = e.clientY; const startVal = value;
    const onMove = (ev: PointerEvent) => { onChange(Math.max(0, Math.min(1, startVal + (startY - ev.clientY) / 120))); };
    const onUp = () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
    window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp);
  }, [value, onChange]);

  return (
    <div className="flex flex-col items-center gap-0.5" style={{ width: size + 14 }}>
      <div className="relative rounded-full cursor-pointer"
        style={{
          width: size, height: size,
          background: `radial-gradient(circle at 38% 32%, hsl(0, 0%, 22%), hsl(0, 0%, 10%))`,
          border: `1.5px solid hsla(0, 0%, 28%, 0.4)`,
          boxShadow: `0 2px 6px hsla(0,0%,0%,0.5), inset 0 1px 2px hsla(0,0%,100%,0.04)`,
        }} onPointerDown={handleDrag}>
        <svg className="absolute inset-0" viewBox="0 0 40 40" style={{ width: size, height: size }}>
          <circle cx="20" cy="20" r="16" fill="none" stroke="hsla(0,0%,20%,0.3)" strokeWidth="2"
            strokeDasharray="75.4" strokeDashoffset="18.85" transform="rotate(135 20 20)" />
          <circle cx="20" cy="20" r="16" fill="none" stroke={accent} strokeWidth="2"
            strokeDasharray="75.4" strokeDashoffset={75.4 - value * 56.55} transform="rotate(135 20 20)"
            style={{ filter: `drop-shadow(0 0 3px ${accent})`, transition: "stroke-dashoffset 0.08s" }} />
        </svg>
        <div className="absolute" style={{
          top: "50%", left: "50%", width: 2, height: size / 2 - 6, background: accent, borderRadius: 1,
          transformOrigin: "bottom center", transform: `translate(-50%, -100%) rotate(${angle}deg)`,
          transition: "transform 0.08s", boxShadow: `0 0 4px ${accent}`,
        }} />
      </div>
      <span className="text-[9px] font-semibold tracking-wide text-center leading-tight" style={{ color: accent }}>{label}</span>
    </div>
  );
}

// ── Channel Fader ───────────────────────────────────────────────────

function ChannelFader({ label, value, onChange, hue, lowLabel, highLabel }: {
  label: string; value: number; onChange: (v: number) => void; hue: number; lowLabel: string; highLabel: string;
}) {
  const pct = Math.round(value * 100);
  const accent = `hsl(${hue}, 45%, 55%)`;
  return (
    <div className="flex flex-col items-center" style={{ width: 40 }}>
      <span className="text-[7px] font-medium mb-0.5 tracking-wider" style={{ color: `hsla(${hue}, 25%, 50%, 0.4)` }}>{highLabel}</span>
      <div className="relative rounded-md flex items-center justify-center"
        style={{ width: 18, height: 60, background: HW.groove, border: `1px solid ${HW.border}`, boxShadow: "inset 0 1px 4px hsla(0,0%,0%,0.4)" }}>
        <div className="absolute" style={{ width: 2, top: 5, bottom: 5, left: "50%", transform: "translateX(-50%)", background: "hsla(0,0%,16%,0.5)", borderRadius: 1 }} />
        <div className="absolute transition-all duration-75" style={{
          width: 2, bottom: 5, left: "50%", transform: "translateX(-50%)", borderRadius: 1,
          height: `${pct * 0.7}%`, maxHeight: "calc(100% - 10px)",
          background: `linear-gradient(to top, ${accent}, hsla(${hue}, 35%, 35%, 0.2))`,
        }} />
        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none transition-all duration-75" style={{
          bottom: `calc(5px + ${pct}% * 0.45)`, width: 14, height: 7, borderRadius: 2,
          background: `linear-gradient(180deg, hsl(0, 0%, 30%), hsl(0, 0%, 16%))`,
          border: `1px solid hsla(${hue}, 25%, 40%, 0.25)`,
          boxShadow: `0 0 4px hsla(${hue}, 50%, 50%, 0.15), 0 1px 2px hsla(0,0%,0%,0.5)`,
        }} />
        <input type="range" min={0} max={100} value={pct} onChange={(e) => onChange(Number(e.target.value) / 100)}
          className="absolute inset-0 opacity-0 cursor-pointer z-10"
          style={{ width: "100%", height: "100%", writingMode: "vertical-lr", direction: "rtl", margin: 0, WebkitAppearance: "slider-vertical" as never }} />
      </div>
      <span className="text-[7px] font-medium mt-0.5 tracking-wider" style={{ color: `hsla(${hue}, 25%, 50%, 0.4)` }}>{lowLabel}</span>
      <span className="text-[10px] font-bold mt-0.5" style={{ color: accent }}>{label}</span>
    </div>
  );
}

// ── Persona Card with hover quote ────────────────────────────────────

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
        className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 transition-all duration-100 text-left active:scale-[0.98]"
        style={{
          background: active ? `hsla(${pH}, 22%, 16%, 0.7)` : hovered ? `hsla(${pH}, 15%, 13%, 0.4)` : "transparent",
          border: active ? `1px solid hsla(${pH}, 40%, 45%, 0.3)` : "1px solid transparent",
        }}
      >
        <span className="text-[16px] flex-shrink-0" style={{
          filter: active ? `drop-shadow(0 0 4px hsla(${pH}, 50%, 50%, 0.3))` : "none",
        }}>{p.icon}</span>
        <div className="flex-1 min-w-0">
          <span className="text-[12px] font-semibold block truncate"
            style={{ color: active ? HW.text : HW.textSub }}>{p.name}</span>
          <span className="text-[9px] block truncate"
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
            style={{
              bottom: "calc(100% + 6px)",
              width: "max(180px, 100%)",
              maxWidth: "220px",
            }}
          >
            <div
              className="rounded-lg px-3 py-2.5 shadow-lg"
              style={{
                background: `linear-gradient(135deg, hsla(${pH}, 18%, 12%, 0.95), hsla(${pH}, 12%, 8%, 0.95))`,
                border: `1px solid hsla(${pH}, 30%, 35%, 0.3)`,
                backdropFilter: "blur(12px)",
              }}
            >
              <p className="text-[10px] leading-relaxed italic"
                style={{ color: `hsla(${pH}, 20%, 78%, 0.9)`, fontFamily: HW.fontDisplay }}>
                {p.quote}
              </p>
              {/* Tiny arrow */}
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 rotate-45"
                style={{
                  background: `hsla(${pH}, 12%, 8%, 0.95)`,
                  borderRight: `1px solid hsla(${pH}, 30%, 35%, 0.3)`,
                  borderBottom: `1px solid hsla(${pH}, 30%, 35%, 0.3)`,
                }}
              />
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
      } catch (err) {
        console.error("Failed to import persona:", err);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, [onSelect, onSavePreset]);

  const grouped = useMemo(() => {
    const groups: Record<string, DimensionPreset[]> = {
      "Archetypes": [], "Personalities": [], "Saved": [],
    };
    for (const p of results) {
      if (p.imported || cloudPresets.some(cp => cp.id === p.id)) groups["Saved"].push(p);
      else if (CELEBRITY_PRESETS.some((c) => c.id === p.id)) groups["Personalities"].push(p);
      else groups["Archetypes"].push(p);
    }
    return groups;
  }, [results, cloudPresets]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-2 py-1.5" style={{ borderBottom: `1px solid ${HW.border}` }}>
        <LED on size={6} color={accentColor} />
        <span className="text-[12px] tracking-[0.2em] uppercase font-bold" style={{ color: accentColor }}>Deck {side}</span>
      </div>

      <div className="px-2 py-1.5" style={{ borderBottom: `1px solid ${HW.border}` }}>
        <div className="flex items-center gap-1.5 rounded-md px-2 py-1" style={{
          background: HW.groove, border: `1px solid ${HW.border}`,
        }}>
          <Search size={12} style={{ color: HW.textDim, flexShrink: 0 }} />
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search personas…"
            className="flex-1 bg-transparent border-none outline-none text-[12px] font-medium"
            style={{ color: HW.text, fontFamily: HW.font, caretColor: accentColor }}
          />
          {query && (
            <button onPointerDown={() => setQuery("")} className="opacity-50 hover:opacity-100">
              <X size={10} style={{ color: HW.textSub }} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 mt-1">
          <button onPointerDown={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wider uppercase transition-all hover:opacity-100 opacity-60"
            style={{ color: accentColor, background: `${accentColor}12`, border: `1px solid ${accentColor}20` }}>
            <Upload size={9} /> Import .json
          </button>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileImport} />
          <span className="text-[9px] font-mono" style={{ color: HW.textDim }}>{results.length}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-1.5 py-1" style={{ scrollbarWidth: "none" }}>
        {Object.entries(grouped).map(([group, presets]) => {
          if (presets.length === 0) return null;
          return (
            <div key={group} className="mb-2">
              <span className="text-[9px] tracking-[0.15em] uppercase block mb-1 px-1 font-bold"
                style={{ color: `${accentColor}60` }}>
                {group}
              </span>
              <div className="space-y-0.5">
                {presets.map((p) => {
                  const active = selectedId === p.id;
                  const pH = presetHue(p);
                  return (
                    <PersonaCard key={p.id} preset={p} active={active} hue={pH} accentColor={accentColor} onSelect={onSelect} />
                  );
                })}
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
        ctx.shadowBlur = 10; ctx.shadowColor = `hsla(${meta.hue}, 55%, 55%, ${alpha * 0.2})`;
        const gradient = ctx.createLinearGradient(x, h - 8, x, h - 8 - finalH);
        gradient.addColorStop(0, `hsla(${meta.hue}, 35%, 28%, ${alpha * 0.4})`);
        gradient.addColorStop(0.4, `hsla(${meta.hue}, 50%, 50%, ${alpha * 0.7})`);
        gradient.addColorStop(1, `hsla(${meta.hue}, 60%, 65%, ${alpha})`);
        ctx.fillStyle = gradient;
        const bx = x + 2, bw = barW - 4, by = h - 8 - finalH, r = Math.min(bw / 2, 3);
        ctx.beginPath(); ctx.moveTo(bx, h - 8); ctx.lineTo(bx, by + r);
        ctx.quadraticCurveTo(bx, by, bx + r, by); ctx.lineTo(bx + bw - r, by);
        ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r); ctx.lineTo(bx + bw, h - 8); ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = `hsla(${meta.hue}, 65%, 72%, ${alpha})`; ctx.fillRect(bx, by, bw, 1.5);
        ctx.fillStyle = `hsla(${meta.hue}, 25%, 55%, 0.55)`; ctx.font = "bold 9px 'DM Sans', sans-serif";
        ctx.textAlign = "center"; ctx.fillText(dim.label.slice(0, 6), x + barW / 2, h);
      });
      const lineY = h - 8 - coherenceH * (h - 28);
      ctx.beginPath(); ctx.strokeStyle = "hsla(38, 50%, 55%, 0.18)"; ctx.lineWidth = 1; ctx.setLineDash([3, 5]);
      ctx.moveTo(14, lineY); ctx.lineTo(w - 14, lineY); ctx.stroke(); ctx.setLineDash([]);
      frameRef.current = requestAnimationFrame(render);
    };
    render();
    return () => { running = false; cancelAnimationFrame(frameRef.current); };
  }, [values, coherenceH]);
  return <canvas ref={canvasRef} width={600} height={80} className="w-full" style={{ height: 80 }} />;
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
    <div className="flex items-center justify-between px-4 py-2" style={{ height: 80 }}>
      <div className="flex flex-col gap-1" style={{ width: 110 }}>
        <div className="flex items-center gap-2">
          <LED on={!!deckA} color={HW.deckA} />
          <span className="text-[11px] font-semibold truncate" style={{ color: deckA ? HW.deckA : HW.textDim }}>
            {deckA ? deckA.name : "Deck A"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <LED on={!!deckB} color={HW.deckB} />
          <span className="text-[11px] font-semibold truncate" style={{ color: deckB ? HW.deckB : HW.textDim }}>
            {deckB ? deckB.name : "Deck B"}
          </span>
        </div>
        <span className="text-[10px] font-mono" style={{ color: HW.textDim }}>
          Mix {Math.round((1 - mix) * 100)}/{Math.round(mix * 100)}
        </span>
      </div>
      <motion.div className="relative flex items-center justify-center" style={{ width: 50, height: 50 }}>
        <motion.div className="absolute inset-0 rounded-full"
          animate={{ scale: [1, 1.1, 1], opacity: [0.12, 0.25, 0.12] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          style={{ border: `1.5px solid hsla(${hue}, 45%, 55%, 0.3)` }} />
        <div className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: `radial-gradient(circle at 40% 35%, hsla(${hue}, 50%, 45%, 0.2), hsla(${hue}, 30%, 18%, 0.08))`, border: `1px solid hsla(${hue}, 40%, 50%, 0.2)` }}>
          <span className="font-mono text-[16px] font-bold" style={{ color: `hsl(${hue}, 55%, 68%)` }}>{pct}</span>
        </div>
      </motion.div>
      <div className="flex flex-col gap-1" style={{ width: 120 }}>
        {(["reasoning", "expression", "awareness"] as const).map((cat) => {
          const meta = CATEGORY_META[cat]; const avg = catAvg[cat];
          return (
            <div key={cat}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] tracking-wide uppercase font-semibold" style={{ color: `hsla(${meta.hue}, 35%, 58%, 0.55)` }}>{meta.label}</span>
                <span className="text-[10px] font-mono font-semibold" style={{ color: `hsl(${meta.hue}, 40%, 58%)` }}>{avg}</span>
              </div>
              <div className="h-[3px] rounded-full overflow-hidden" style={{ background: `hsla(${meta.hue}, 10%, 12%, 0.5)` }}>
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
  const cx = 150, cy = 42, maxR = 34;
  const angleStep = (Math.PI * 2) / dims.length;
  const points = dims.map((dim, i) => {
    const val = values[dim.id] ?? dim.defaultValue;
    const angle = -Math.PI / 2 + i * angleStep;
    return {
      x: cx + Math.cos(angle) * maxR * val, y: cy + Math.sin(angle) * maxR * val,
      lx: cx + Math.cos(angle) * (maxR + 12), ly: cy + Math.sin(angle) * (maxR + 12),
      label: dim.label.slice(0, 4), hue: dim.hue, val,
    };
  });
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
  return (
    <div className="flex items-center justify-center" style={{ height: 80 }}>
      <svg width={300} height={84} viewBox="0 0 300 84" className="w-full" style={{ maxWidth: 400 }}>
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <polygon key={r} points={dims.map((_, i) => { const a = -Math.PI / 2 + i * angleStep; return `${cx + Math.cos(a) * maxR * r},${cy + Math.sin(a) * maxR * r}`; }).join(" ")}
            fill="none" stroke="hsla(38, 10%, 25%, 0.12)" strokeWidth={0.5} />
        ))}
        <path d={pathD} fill="hsla(38, 40%, 50%, 0.06)" stroke="hsla(38, 50%, 60%, 0.35)" strokeWidth={1.5}
          style={{ filter: "drop-shadow(0 0 4px hsla(38, 50%, 55%, 0.1))" }} />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={2.5} fill={`hsl(${p.hue}, 50%, 60%)`} opacity={0.8} />
            <text x={p.lx} y={p.ly + 3} textAnchor="middle" fill={`hsla(${p.hue}, 30%, 58%, 0.5)`} fontSize="7" fontFamily="'DM Sans', sans-serif">{p.label}</text>
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
    <div className="px-4 py-1">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] font-bold" style={{ color: HW.deckA }}>A</span>
        <span className="text-[8px] tracking-[0.2em] uppercase font-semibold" style={{ color: HW.textDim }}>Crossfader</span>
        <span className="text-[10px] font-bold" style={{ color: HW.deckB }}>B</span>
      </div>
      <div className="relative h-6 flex items-center">
        <div className="absolute inset-x-0 h-[3px] rounded-full" style={{ background: `linear-gradient(90deg, ${HW.deckAGlow}, hsla(0,0%,10%,0.4), ${HW.deckBGlow})` }} />
        <div className="absolute pointer-events-none transition-all duration-75" style={{
          left: `calc(${pct}% - 14px)`, width: 28, height: 12, borderRadius: 3,
          background: `linear-gradient(180deg, hsl(0,0%,30%), hsl(0,0%,14%))`,
          border: "1px solid hsla(38, 20%, 35%, 0.25)",
          boxShadow: "0 0 8px hsla(38, 50%, 45%, 0.08), 0 2px 4px hsla(0,0%,0%,0.5)",
          top: "50%", transform: "translateY(-50%)",
        }}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: 10, height: 1, background: "hsla(38, 30%, 50%, 0.35)", borderRadius: 1 }} />
        </div>
        <input type="range" min={0} max={100} value={pct} onChange={(e) => onChange(Number(e.target.value) / 100)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" style={{ margin: 0 }} />
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
        onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) { onSave(name.trim()); setShowInput(false); setName(""); } }}
      />
      <button onPointerDown={() => { if (name.trim()) { onSave(name.trim()); setShowInput(false); setName(""); } }}
        className="text-[9px] font-bold px-1.5 py-0.5 rounded"
        style={{ color: HW.gold, background: HW.goldGlow }}>✓</button>
      <button onPointerDown={() => { setShowInput(false); setName(""); }}
        className="text-[9px] px-1 py-0.5 rounded" style={{ color: HW.textDim }}>✕</button>
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
          initial={{ y: "100%", opacity: 0.6 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 32, stiffness: 320, mass: 0.7 }}
          className="flex flex-col relative"
          style={{ fontFamily: HW.font, maxHeight: "46vh", minHeight: 280 }}
        >
          {/* Gold accent line */}
          <div className="absolute -top-[1px] left-0 right-0 h-[2px] z-10"
            style={{ background: `linear-gradient(90deg, transparent 5%, ${HW.gold}30 20%, ${HW.gold}50 50%, ${HW.gold}30 80%, transparent 95%)` }} />

          <div className="h-full" style={{
            background: `linear-gradient(180deg, ${HW.bodyLight} 0%, ${HW.body} 100%)`,
            borderTop: `1px solid hsla(0,0%,18%,0.3)`,
            boxShadow: "0 -8px 40px hsla(0,0%,0%,0.6), 0 -2px 0 hsla(38, 20%, 25%, 0.06)",
          }}>
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 py-1 cursor-pointer" onPointerDown={onClose}
              style={{ borderBottom: `1px solid ${HW.border}` }}>
              <div className="flex items-center gap-3">
                <LED on size={6} color={HW.gold} />
                <span className="text-[10px] tracking-[0.25em] uppercase font-semibold" style={{ color: HW.textDim }}>Pro Mode</span>
                <span className="text-[13px] font-light" style={{ fontFamily: HW.fontDisplay, color: HW.text }}>Lumen Experience Deck</span>
              </div>
              <div className="flex items-center gap-2">
                {isAuthenticated && <SaveMixButton values={values} onSave={handleSaveMix} />}
                {manualOverride && (
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold" style={{ background: HW.goldGlow, color: HW.gold, border: `1px solid ${HW.gold}25` }}>Custom</span>
                )}
                <button onPointerDown={handleReset}
                  className="text-[9px] tracking-wider uppercase font-semibold px-2 py-0.5 rounded transition-all hover:opacity-100 opacity-60"
                  style={{ color: HW.textDim, background: `hsla(0,0%,14%,0.6)`, border: `1px solid ${HW.border}` }}>
                  Reset
                </button>
                <ChevronDown size={14} style={{ color: HW.textDim }} />
              </div>
            </div>

            {/* Three-column layout */}
            <div className="flex min-h-0" style={{ height: "calc(46vh - 42px)", maxHeight: 360 }}>

              {/* LEFT DECK */}
              <div className="flex-shrink-0 overflow-hidden flex flex-col"
                style={{ width: 190, borderRight: `1px solid ${HW.border}` }}>
                <DeckSearchPanel side="A" accentColor={HW.deckA}
                  onSelect={(p) => { setDeckAPreset(p); setManualOverride(false); }}
                  selectedId={deckAPreset?.id ?? null}
                  cloudPresets={cloudPresets}
                  onSavePreset={savePreset} />
              </div>

              {/* CENTER MIXER */}
              <div className="flex-1 flex flex-col min-w-0 overflow-y-auto" style={{ scrollbarWidth: "none" }}>

                {/* Screen */}
                <div className="flex-shrink-0 mx-2 mt-1.5 rounded-lg overflow-hidden"
                  style={{
                    background: HW.screen, border: `1px solid ${HW.screenBorder}`,
                    boxShadow: "inset 0 2px 8px hsla(0,0%,0%,0.6), 0 2px 12px hsla(0,0%,0%,0.3)",
                  }}>
                  <div className="flex items-center justify-between px-3 py-0.5" style={{ borderBottom: "1px solid hsla(220,8%,14%,0.5)" }}>
                    <div className="flex gap-0.5">
                      {(["spectrum", "coherence", "radar"] as const).map((m) => (
                        <button key={m} onPointerDown={() => setScreenMode(m)}
                          className="px-2 py-0.5 rounded text-[9px] tracking-wider uppercase font-semibold transition-all"
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
                      <span className="text-[9px] font-mono font-semibold ml-1" style={{ color: HW.textSub }}>H:{Math.round(coherenceH * 100)}</span>
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
                {inputSlot && <div className="flex-shrink-0 mx-2 mt-1">{inputSlot}</div>}

                {/* Faders — 3 category groups */}
                <div className="flex-shrink-0 flex items-start justify-center gap-1.5 mx-2 mt-1">
                  {categories.map((cat) => {
                    const meta = CATEGORY_META[cat];
                    const dims = groupedDimensions[cat];
                    return (
                      <div key={cat} className="flex-shrink-0 rounded-lg px-1 py-1" style={{ background: HW.surface, border: `1px solid ${HW.border}` }}>
                        <div className="flex items-center gap-1 mb-0.5 px-0.5 justify-center">
                          <LED on size={3} color={`hsl(${meta.hue}, 50%, 55%)`} />
                          <span className="text-[8px] tracking-[0.15em] uppercase font-semibold" style={{ color: `hsla(${meta.hue}, 35%, 58%, 0.5)` }}>{meta.label}</span>
                        </div>
                        <div className="flex justify-center gap-0">
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
                </div>

                {/* Crossfader */}
                <div className="flex-shrink-0 mx-2 mt-1 mb-1 rounded-lg" style={{ background: HW.surface, border: `1px solid ${HW.border}` }}>
                  <Crossfader value={crossfader} onChange={(v) => { setCrossfader(v); setManualOverride(false); }} />
                </div>
              </div>

              {/* RIGHT DECK */}
              <div className="flex-shrink-0 overflow-hidden flex flex-col"
                style={{ width: 190, borderLeft: `1px solid ${HW.border}` }}>
                <DeckSearchPanel side="B" accentColor={HW.deckB}
                  onSelect={(p) => { setDeckBPreset(p); setManualOverride(false); }}
                  selectedId={deckBPreset?.id ?? null}
                  cloudPresets={cloudPresets}
                  onSavePreset={savePreset} />
              </div>

            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
