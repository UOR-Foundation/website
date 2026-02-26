/**
 * AmbientPlayer — Floating Mini-Pill Music Player (UI Shell)
 * ══════════════════════════════════════════════════════════
 *
 * Pure presentation component. All logic lives in useAmbientPlayer hook.
 * Stations data lives in audio/stations.ts. Palette in theme/palette.ts.
 *
 * @module hologram-ui/components/AmbientPlayer
 */

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music, Pause, Play, Volume2, VolumeX, ChevronDown, GripVertical, BarChart3, Database, Activity, Hexagon, Orbit, RotateCcw } from "lucide-react";
import { useDraggablePosition } from "@/modules/hologram-ui/hooks/useDraggablePosition";
import { useAmbientPlayer, type AmbientState } from "@/modules/audio/hooks/useAmbientPlayer";
import { STATIONS, type AmbientStation } from "@/modules/audio/stations";
import { P } from "@/modules/hologram-ui/theme/palette";
import StratumVisualizer from "./StratumVisualizer";
import CurvatureTimeSeries from "./CurvatureTimeSeries";
import GenreRadar from "./GenreRadar";
import ObservableSpaceRadar from "./ObservableSpaceRadar";
import HolonomyVisualizer from "./HolonomyVisualizer";

export type { AmbientState };

interface AmbientPlayerProps {
  lumenOffset?: number;
  onStateChange?: (state: AmbientState) => void;
}

export default function AmbientPlayer({ lumenOffset = 0, onStateChange }: AmbientPlayerProps) {
  const ctrl = useAmbientPlayer(onStateChange);
  const [expanded, setExpanded] = useState(false);
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [showCurvature, setShowCurvature] = useState(false);
  const [showGenre, setShowGenre] = useState(false);
  const [showObservable, setShowObservable] = useState(false);
  const [showHolonomy, setShowHolonomy] = useState(false);
  const pillRef = useRef<HTMLDivElement>(null);

  const drag = useDraggablePosition({
    storageKey: "hologram-pos:ambient",
    defaultPos: { x: 20, y: typeof window !== "undefined" ? window.innerHeight - 70 : 700 },
    snapSize: { width: 160, height: 40 },
  });

  // Close on outside click
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (pillRef.current && !pillRef.current.contains(e.target as Node)) setExpanded(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [expanded]);

  const openUpward = drag.pos.y > (typeof window !== "undefined" ? window.innerHeight * 0.45 : 400);
  const { playing, loading, station, volume, muted, currentFrame, cacheStats } = ctrl;

  return (
    <div ref={pillRef} className="fixed z-[55]" style={{ left: drag.pos.x, top: drag.pos.y, touchAction: "none", userSelect: "none" }}>
      <AnimatePresence mode="wait">
        {expanded ? (
          <ExpandedPanel
            ctrl={ctrl}
            drag={drag}
            openUpward={openUpward}
            showVisualizer={showVisualizer} setShowVisualizer={setShowVisualizer}
            showCurvature={showCurvature} setShowCurvature={setShowCurvature}
            showGenre={showGenre} setShowGenre={setShowGenre}
            showObservable={showObservable} setShowObservable={setShowObservable}
            showHolonomy={showHolonomy} setShowHolonomy={setShowHolonomy}
            onCollapse={() => setExpanded(false)}
          />
        ) : (
          <CollapsedPill
            playing={playing}
            loading={loading}
            station={station}
            cacheStats={cacheStats}
            drag={drag}
            onExpand={() => { if (!drag.wasDragged()) setExpanded(true); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Expanded Panel ─────────────────────────────────────────────────────

function ExpandedPanel({
  ctrl, drag, openUpward,
  showVisualizer, setShowVisualizer,
  showCurvature, setShowCurvature,
  showGenre, setShowGenre,
  showObservable, setShowObservable,
  showHolonomy, setShowHolonomy,
  onCollapse,
}: {
  ctrl: ReturnType<typeof useAmbientPlayer>;
  drag: ReturnType<typeof useDraggablePosition>;
  openUpward: boolean;
  showVisualizer: boolean; setShowVisualizer: (v: boolean) => void;
  showCurvature: boolean; setShowCurvature: (v: boolean) => void;
  showGenre: boolean; setShowGenre: (v: boolean) => void;
  showObservable: boolean; setShowObservable: (v: boolean) => void;
  showHolonomy: boolean; setShowHolonomy: (v: boolean) => void;
  onCollapse: () => void;
}) {
  const { playing, loading, station, volume, muted, currentFrame, cacheStats } = ctrl;

  return (
    <motion.div
      key="expanded"
      initial={{ opacity: 0, y: openUpward ? -8 : 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: openUpward ? -8 : 8, scale: 0.95 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="w-[280px] rounded-2xl overflow-hidden"
      style={{
        ...(openUpward ? { position: "absolute", bottom: 0 } : {}),
        background: P.surface,
        backdropFilter: "blur(40px) saturate(1.3)",
        WebkitBackdropFilter: "blur(40px) saturate(1.3)",
        border: `1px solid ${P.border}`,
        boxShadow: "0 8px 40px hsla(0, 0%, 0%, 0.5)",
      }}
    >
      {/* Header with drag + visualizer toggles */}
      <div className="flex items-center justify-between px-4 py-3 cursor-grab active:cursor-grabbing" {...drag.handlers}>
        <div className="flex items-center gap-2">
          <GripVertical className="w-3.5 h-3.5 opacity-40" style={{ color: P.textMuted }} />
          <Music className="w-4 h-4" style={{ color: P.goldMuted }} />
          <span className="text-[14px] font-medium tracking-wide" style={{ fontFamily: P.font, color: P.text }}>Ambient</span>
        </div>
        <div className="flex items-center gap-1">
          <ToggleBtn on={showVisualizer} set={setShowVisualizer} Icon={BarChart3} title="Stratum Histogram" />
          <ToggleBtn on={showCurvature} set={setShowCurvature} Icon={Activity} title="Curvature κ" />
          <ToggleBtn on={showGenre} set={setShowGenre} Icon={Hexagon} title="Genre Fingerprint" />
          <ToggleBtn on={showObservable} set={setShowObservable} Icon={Orbit} title="Observable Space" />
          <ToggleBtn on={showHolonomy} set={setShowHolonomy} Icon={RotateCcw} title="Holonomy" />
          <button onClick={onCollapse} className="w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:bg-white/[0.08]" style={{ color: P.textMuted }}>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Now Playing */}
      {(playing || loading) && (
        <div className="mx-3 mb-2 px-3 py-2.5 rounded-xl flex items-center gap-3" style={{ background: `hsla(${station.color}, 30%, 30%, 0.15)` }}>
          <EqBars hue={station.color} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium truncate" style={{ color: P.text }}>{station.name}</p>
            <p className="text-[11px] truncate" style={{ color: P.textDim }}>{station.description}</p>
          </div>
          <button onClick={ctrl.togglePlayback} className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors hover:bg-white/[0.1]" style={{ color: P.goldLight }}>
            <Pause className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Station List */}
      <div className="px-3 pb-2 max-h-[240px] overflow-y-auto lumen-scroll">
        {(["focus", "nature"] as const).map((cat) => (
          <div key={cat} className="mb-2">
            <p className="text-[11px] tracking-[0.16em] uppercase px-1 py-1.5" style={{ color: P.textDim }}>
              {cat === "focus" ? "Focus & Flow" : "Nature & Calm"}
            </p>
            {STATIONS.filter((s) => s.category === cat).map((s) => {
              const isActive = station.id === s.id && playing;
              return (
                <button
                  key={s.id}
                  onClick={() => ctrl.selectStation(s)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all hover:bg-white/[0.05]"
                  style={{ background: isActive ? `hsla(${s.color}, 25%, 30%, 0.12)` : "transparent" }}
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{
                    background: isActive ? `hsla(${s.color}, 50%, 60%, 0.9)` : `hsla(${s.color}, 30%, 45%, 0.4)`,
                    boxShadow: isActive ? `0 0 6px hsla(${s.color}, 50%, 50%, 0.4)` : "none",
                  }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px]" style={{ color: isActive ? P.goldLight : P.text }}>{s.name}</p>
                  </div>
                  {!isActive && station.id !== s.id && (
                    <Play className="w-3 h-3 opacity-0 group-hover:opacity-100" style={{ color: P.textDim }} />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Cache Stats */}
      {playing && cacheStats.entries > 0 && (
        <div className="flex items-center gap-2 mx-3 mb-2 px-3 py-2 rounded-xl" style={{ background: "hsla(200, 20%, 20%, 0.2)" }}>
          <Database className="w-3 h-3 flex-shrink-0" style={{ color: "hsl(200, 50%, 55%)" }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium" style={{ color: "hsl(200, 30%, 70%)" }}>
                {cacheStats.entries} segment{cacheStats.entries !== 1 ? "s" : ""} cached
              </span>
              <span className="text-[10px] tabular-nums" style={{ color: P.textDim }}>
                {cacheStats.totalBytes < 1024 * 1024
                  ? `${(cacheStats.totalBytes / 1024).toFixed(0)} KB`
                  : `${(cacheStats.totalBytes / (1024 * 1024)).toFixed(1)} MB`}
              </span>
            </div>
            <div className="mt-1 h-[3px] rounded-full overflow-hidden" style={{ background: "hsla(200, 15%, 30%, 0.3)" }}>
              <div className="h-full rounded-full transition-all duration-500" style={{
                width: `${Math.min(cacheStats.utilization * 100, 100)}%`,
                background: cacheStats.utilization > 0.8 ? "hsl(0, 50%, 55%)" : "hsl(200, 50%, 55%)",
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Volume */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderTop: `1px solid ${P.border}` }}>
        <button onClick={() => ctrl.setMuted(!muted)} className="w-6 h-6 flex items-center justify-center" style={{ color: muted ? P.textDim : P.textMuted }}>
          {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
        <input
          type="range" min={0} max={1} step={0.01}
          value={muted ? 0 : volume}
          onChange={(e) => { ctrl.setVolume(parseFloat(e.target.value)); if (muted) ctrl.setMuted(false); }}
          className="flex-1 h-1 appearance-none rounded-full cursor-pointer"
          style={{ background: `linear-gradient(to right, ${P.goldMuted} ${(muted ? 0 : volume) * 100}%, hsla(30, 8%, 30%, 0.4) ${(muted ? 0 : volume) * 100}%)` }}
        />
        <span className="text-[11px] tabular-nums w-8 text-right" style={{ color: P.textDim }}>{Math.round((muted ? 0 : volume) * 100)}%</span>
      </div>

      {/* Visualizer panels */}
      <StratumVisualizer playing={playing} stationHue={station.color} visible={showVisualizer && (playing || loading)} onFrame={ctrl.handleFrame} />
      <CurvatureTimeSeries visible={showCurvature && (playing || loading)} stationHue={station.color} frame={currentFrame} />
      <GenreRadar visible={showGenre && (playing || loading)} stationHue={station.color} frame={currentFrame} />
      <ObservableSpaceRadar visible={showObservable && (playing || loading)} stationHue={station.color} frame={currentFrame} />
      <HolonomyVisualizer visible={showHolonomy && (playing || loading)} stationHue={station.color} frame={currentFrame} />
    </motion.div>
  );
}

// ── Collapsed Pill ─────────────────────────────────────────────────────

function CollapsedPill({
  playing, loading, station, cacheStats, drag, onExpand,
}: {
  playing: boolean; loading: boolean; station: AmbientStation;
  cacheStats: { entries: number; totalBytes: number };
  drag: ReturnType<typeof useDraggablePosition>;
  onExpand: () => void;
}) {
  return (
    <motion.div
      key="collapsed"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
      className="relative flex items-center rounded-full"
      style={{
        background: P.surface,
        backdropFilter: "blur(30px) saturate(1.3)",
        WebkitBackdropFilter: "blur(30px) saturate(1.3)",
        border: `1px solid ${P.border}`,
        boxShadow: "0 4px 20px hsla(0, 0%, 0%, 0.3)",
      }}
    >
      <AnimatePresence>
        {playing && (
          <motion.div
            key="glow-ring"
            initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="absolute rounded-full pointer-events-none"
            style={{ inset: -4, border: `1.5px solid hsla(${station.color}, 40%, 55%, 0.25)`, animation: "ambient-glow-breathe 3s ease-in-out infinite" }}
          />
        )}
      </AnimatePresence>
      <div className="flex items-center justify-center pl-2 pr-0.5 py-2.5 cursor-grab active:cursor-grabbing" {...drag.handlers} title="Drag to reposition">
        <GripVertical className="w-3 h-3 opacity-40" style={{ color: P.textMuted }} />
      </div>
      <button onClick={onExpand} className="flex items-center gap-2.5 pr-4 py-2.5" title="Ambient music (⌘⇧A)">
        {playing || loading ? (
          <>
            <EqBars hue={station.color} small loading={loading} />
            <span className="text-[12px] font-medium" style={{ color: P.text }}>{loading ? "Connecting…" : station.name}</span>
            {playing && cacheStats.entries > 0 && (
              <span className="text-[10px] tabular-nums px-1.5 py-0.5 rounded-full"
                style={{ color: "hsl(200, 40%, 65%)", background: "hsla(200, 30%, 25%, 0.35)" }}
                title={`${cacheStats.entries} content-addressed segments (${(cacheStats.totalBytes / (1024 * 1024)).toFixed(1)} MB)`}
              >
                {cacheStats.entries}⬡
              </span>
            )}
          </>
        ) : (
          <>
            <Music className="w-3.5 h-3.5" style={{ color: P.goldMuted }} />
            <span className="text-[12px]" style={{ color: P.textMuted }}>Ambient</span>
          </>
        )}
      </button>
    </motion.div>
  );
}

// ── Tiny helpers ───────────────────────────────────────────────────────

function ToggleBtn({ on, set, Icon, title }: { on: boolean; set: (v: boolean) => void; Icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <button onClick={() => set(!on)} className="w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:bg-white/[0.08]" style={{ color: on ? P.goldLight : P.textMuted }} title={title}>
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

function EqBars({ hue, small, loading }: { hue: string; small?: boolean; loading?: boolean }) {
  const heights = small ? [0.5, 0.9, 0.65, 0.4] : [0.6, 1, 0.7, 0.4];
  const h = small ? 14 : 16;
  return (
    <div className="flex items-end gap-[2px]" style={{ height: h }}>
      {heights.map((v, i) => (
        <div key={i} className="rounded-full" style={{
          width: small ? 2 : 2.5,
          height: `${v * h}px`,
          background: `hsla(${hue}, 50%, 60%, ${loading ? 0.4 : 0.8})`,
          animation: `ambient-eq ${loading ? 0.8 : 0.6 + i * 0.15}s ease-in-out infinite alternate`,
        }} />
      ))}
    </div>
  );
}

// ── Inject keyframes ──────────────────────────────────────────────────

if (typeof document !== "undefined" && !document.querySelector("[data-ambient-eq]")) {
  const s = document.createElement("style");
  s.setAttribute("data-ambient-eq", "");
  s.textContent = `
    @keyframes ambient-eq { 0% { transform: scaleY(0.4); } 100% { transform: scaleY(1); } }
    @keyframes ambient-glow-breathe { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }
  `;
  document.head.appendChild(s);
}
