/**
 * AmbientPlayer — Floating Mini-Pill Music Player
 * ════════════════════════════════════════════════
 *
 * A minimal, delightful ambient radio player for Hologram OS.
 * Streams curated internet radio stations (SomaFM) — zero login,
 * zero API keys, instant playback via HTML5 <audio>.
 *
 * UI: A small floating pill in the bottom-left. Expands on click
 * to reveal station selector and volume. Collapses back to a
 * breathing indicator when playing.
 *
 * @module hologram-ui/components/AmbientPlayer
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music, Pause, Play, Volume2, VolumeX, ChevronDown, GripVertical, BarChart3, Database, Activity, Hexagon, Orbit, RotateCcw } from "lucide-react";
import { useDraggablePosition } from "@/modules/hologram-ui/hooks/useDraggablePosition";
import { getAudioEngine, type AudioEngineState, FeatureAggregator, generateTrackCid, persistAnalysis } from "@/modules/audio";
import type { HarmonicLensFrame } from "@/modules/audio";
import StratumVisualizer from "./StratumVisualizer";
import CurvatureTimeSeries from "./CurvatureTimeSeries";
import GenreRadar from "./GenreRadar";
import ObservableSpaceRadar from "./ObservableSpaceRadar";
import HolonomyVisualizer from "./HolonomyVisualizer";

// ── Palette (consistent with OS) ──────────────────────────────────────────
const P = {
  surface: "hsla(25, 10%, 10%, 0.88)",
  surfaceLight: "hsla(30, 8%, 22%, 0.8)",
  border: "hsla(38, 15%, 30%, 0.25)",
  goldLight: "hsl(38, 60%, 60%)",
  goldMuted: "hsl(38, 40%, 45%)",
  goldBg: "hsla(38, 50%, 40%, 0.15)",
  text: "hsl(38, 20%, 85%)",
  textMuted: "hsl(30, 10%, 60%)",
  textDim: "hsl(30, 10%, 50%)",
  font: "'DM Sans', sans-serif",
  fontDisplay: "'Playfair Display', serif",
} as const;

// ── Curated Stations ──────────────────────────────────────────────────────
export interface AmbientStation {
  id: string;
  name: string;
  description: string;
  category: "focus" | "nature";
  streamUrl: string;
  color: string; // hue for accent
}

const STATIONS: AmbientStation[] = [
  // Focus & Flow — using highest quality AAC streams (256kbps)
  {
    id: "drone-zone",
    name: "Drone Zone",
    description: "Atmospheric textures with minimal beats",
    category: "focus",
    streamUrl: "https://ice2.somafm.com/dronezone-256-mp3",
    color: "220",
  },
  {
    id: "deep-space",
    name: "Deep Space One",
    description: "Deep ambient electronic & space music",
    category: "focus",
    streamUrl: "https://ice2.somafm.com/deepspaceone-256-mp3",
    color: "260",
  },
  {
    id: "groove-salad",
    name: "Groove Salad",
    description: "Ambient & downtempo with a groove",
    category: "focus",
    streamUrl: "https://ice2.somafm.com/groovesalad-256-mp3",
    color: "140",
  },
  {
    id: "fluid",
    name: "Fluid",
    description: "Smooth instrumental jazz & bossa nova",
    category: "focus",
    streamUrl: "https://ice2.somafm.com/fluid-256-mp3",
    color: "30",
  },
  // Nature & Calm
  {
    id: "mission-control",
    name: "Mission Control",
    description: "NASA comm with ambient music",
    category: "nature",
    streamUrl: "https://ice2.somafm.com/missioncontrol-256-mp3",
    color: "200",
  },
  {
    id: "sleep",
    name: "SleepBot",
    description: "Ambient soundscapes for deep relaxation",
    category: "nature",
    streamUrl: "https://ice2.somafm.com/vaporwaves-256-mp3",
    color: "280",
  },
];

// ── Component ──────────────────────────────────────────────────────────────

export interface AmbientState {
  playing: boolean;
  loading: boolean;
  stationHue: string;
  stationName: string;
}

interface AmbientPlayerProps {
  /** When LUMEN AI is open, offset the pill */
  lumenOffset?: number;
  /** Report ambient state changes for visual effects */
  onStateChange?: (state: AmbientState) => void;
}

const STORAGE_KEY = "hologram-ambient-prefs";

function loadPrefs(): { stationId: string; volume: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { stationId: STATIONS[0].id, volume: 0.4 };
}

function savePrefs(stationId: string, volume: number) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ stationId, volume })); } catch {}
}

export default function AmbientPlayer({ lumenOffset = 0, onStateChange }: AmbientPlayerProps) {
  const prefs = useRef(loadPrefs());
  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [station, setStation] = useState<AmbientStation>(
    () => STATIONS.find((s) => s.id === prefs.current.stationId) ?? STATIONS[0],
  );
  const [volume, setVolume] = useState(() => prefs.current.volume);
  const [muted, setMuted] = useState(false);
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [showCurvature, setShowCurvature] = useState(false);
  const [showGenre, setShowGenre] = useState(false);
  const [showObservable, setShowObservable] = useState(false);
  const [showHolonomy, setShowHolonomy] = useState(false);
  const [cacheStats, setCacheStats] = useState({ entries: 0, totalBytes: 0, maxBytes: 1, utilization: 0 });
  const [currentFrame, setCurrentFrame] = useState<HarmonicLensFrame | null>(null);
  const engineRef = useRef(getAudioEngine());
  const aggregatorRef = useRef(new FeatureAggregator());
  const pillRef = useRef<HTMLDivElement>(null);

  // Draggable position — default to bottom-left
  const drag = useDraggablePosition({
    storageKey: "hologram-pos:ambient",
    defaultPos: { x: 20, y: typeof window !== "undefined" ? window.innerHeight - 70 : 700 },
    snapSize: { width: 160, height: 40 },
  });

  // Persist prefs on change
  useEffect(() => { savePrefs(station.id, volume); }, [station, volume]);

  // Report state to parent for visual effects
  useEffect(() => {
    onStateChange?.({ playing, loading, stationHue: station.color, stationName: station.name });
  }, [playing, loading, station, onStateChange]);

  // Subscribe to engine state changes
  useEffect(() => {
    const engine = engineRef.current;
    engine.setVolume(volume);

    const unsub = engine.onStateChange((state: AudioEngineState) => {
      switch (state) {
        case "playing":
          setLoading(false);
          setPlaying(true);
          break;
        case "loading":
        case "buffering":
          setLoading(true);
          break;
        case "paused":
        case "idle":
          setPlaying(false);
          setLoading(false);
          break;
        case "error":
          setPlaying(false);
          setLoading(false);
          break;
      }
    });

    return () => {
      unsub();
    };
  }, []);

  // Poll cache stats every 2s while playing
  useEffect(() => {
    if (!playing) return;
    const tick = () => setCacheStats(engineRef.current.getCacheStats());
    tick();
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, [playing]);


  // Sync volume
  useEffect(() => {
    engineRef.current.setVolume(muted ? 0 : volume);
  }, [volume, muted]);

  // Handle frame from StratumVisualizer → relay to CurvatureLens & GenreRadar + aggregate for persistence
  const handleFrame = useCallback((frame: HarmonicLensFrame) => {
    setCurrentFrame(frame);
    aggregatorRef.current.push(frame);
  }, []);

  // Persist aggregated features when switching stations or stopping
  const persistCurrentAnalysis = useCallback(async (s: AmbientStation) => {
    const agg = aggregatorRef.current;
    if (agg.frameCount < 30) return; // Need at least ~1s of data
    const trackCid = await generateTrackCid(s.streamUrl);
    const features = agg.aggregate(trackCid);
    persistAnalysis(
      { trackCid, title: s.name, artist: "SomaFM", sourceUri: s.streamUrl, format: { codec: "mp3", sampleRate: 44100 }, genres: [s.category] },
      features,
    ).catch(() => {});
  }, []);

  const playStation = useCallback(
    (s: AmbientStation) => {
      // Persist previous station's analysis before switching
      if (playing) persistCurrentAnalysis(station);
      aggregatorRef.current.reset();
      setCurrentFrame(null);
      setStation(s);
      setLoading(true);
      setPlaying(false);
      engineRef.current.play(s.streamUrl);
    },
    [playing, station, persistCurrentAnalysis],
  );

  const togglePlayback = useCallback(() => {
    const engine = engineRef.current;
    if (playing || loading) {
      engine.pause();
      setPlaying(false);
      setLoading(false);
    } else {
      setLoading(true);
      engine.play(station.streamUrl);
    }
  }, [playing, loading, station]);

  const selectStation = useCallback(
    (s: AmbientStation) => {
      playStation(s);
    },
    [playStation],
  );

  // Close on outside click
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (pillRef.current && !pillRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [expanded]);

  // ⌘+Shift+A shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        if (playing || loading) {
          togglePlayback();
        } else {
          setExpanded(true);
          playStation(station);
        }
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [playing, loading, togglePlayback, playStation, station]);

  // Determine if panel should open upward (when near bottom of viewport)
  const openUpward = drag.pos.y > (typeof window !== "undefined" ? window.innerHeight * 0.45 : 400);

  return (
    <div
      ref={pillRef}
      className="fixed z-[55]"
      style={{
        left: drag.pos.x,
        top: drag.pos.y,
        touchAction: "none",
        userSelect: "none",
      }}
    >
      <AnimatePresence mode="wait">
        {expanded ? (
          // ── Expanded Panel ──────────────────────────────────────────
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
            {/* Header — drag handle */}
            <div
              className="flex items-center justify-between px-4 py-3 cursor-grab active:cursor-grabbing"
              {...drag.handlers}
            >
              <div className="flex items-center gap-2">
                <GripVertical className="w-3.5 h-3.5 opacity-40" style={{ color: P.textMuted }} />
                <Music className="w-4 h-4" style={{ color: P.goldMuted }} />
                <span
                  className="text-[14px] font-medium tracking-wide"
                  style={{ fontFamily: P.font, color: P.text }}
                >
                  Ambient
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowVisualizer((v) => !v)}
                  className="w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:bg-white/[0.08]"
                  style={{ color: showVisualizer ? P.goldLight : P.textMuted }}
                  title="Stratum Histogram"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setShowCurvature((v) => !v)}
                  className="w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:bg-white/[0.08]"
                  style={{ color: showCurvature ? P.goldLight : P.textMuted }}
                  title="Curvature κ Time-Series"
                >
                  <Activity className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setShowGenre((v) => !v)}
                  className="w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:bg-white/[0.08]"
                  style={{ color: showGenre ? P.goldLight : P.textMuted }}
                  title="Genre Fingerprint"
                >
                  <Hexagon className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setShowObservable((v) => !v)}
                  className="w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:bg-white/[0.08]"
                  style={{ color: showObservable ? P.goldLight : P.textMuted }}
                  title="Observable Space (7 Metrics)"
                >
                  <Orbit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setShowHolonomy((v) => !v)}
                  className="w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:bg-white/[0.08]"
                  style={{ color: showHolonomy ? P.goldLight : P.textMuted }}
                  title="Holonomy · Tonal Drift"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setExpanded(false)}
                  className="w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:bg-white/[0.08]"
                  style={{ color: P.textMuted }}
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Now Playing */}
            {(playing || loading) && (
              <div
                className="mx-3 mb-2 px-3 py-2.5 rounded-xl flex items-center gap-3"
                style={{ background: `hsla(${station.color}, 30%, 30%, 0.15)` }}
              >
                {/* Equalizer bars */}
                <div className="flex items-end gap-[2px] h-4">
                  {[0.6, 1, 0.7, 0.4].map((h, i) => (
                    <div
                      key={i}
                      className="w-[2.5px] rounded-full"
                      style={{
                        height: `${h * 16}px`,
                        background: `hsla(${station.color}, 50%, 60%, 0.8)`,
                        animation: `ambient-eq ${0.6 + i * 0.15}s ease-in-out infinite alternate`,
                      }}
                    />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate" style={{ color: P.text }}>
                    {station.name}
                  </p>
                  <p className="text-[11px] truncate" style={{ color: P.textDim }}>
                    {station.description}
                  </p>
                </div>
                <button
                  onClick={togglePlayback}
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors hover:bg-white/[0.1]"
                  style={{ color: P.goldLight }}
                >
                  <Pause className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Stations */}
            <div className="px-3 pb-2 max-h-[240px] overflow-y-auto lumen-scroll">
              {(["focus", "nature"] as const).map((cat) => (
                <div key={cat} className="mb-2">
                  <p
                    className="text-[11px] tracking-[0.16em] uppercase px-1 py-1.5"
                    style={{ color: P.textDim }}
                  >
                    {cat === "focus" ? "Focus & Flow" : "Nature & Calm"}
                  </p>
                  {STATIONS.filter((s) => s.category === cat).map((s) => {
                    const isActive = station.id === s.id && playing;
                    return (
                      <button
                        key={s.id}
                        onClick={() => selectStation(s)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all hover:bg-white/[0.05]"
                        style={{
                          background: isActive ? `hsla(${s.color}, 25%, 30%, 0.12)` : "transparent",
                        }}
                      >
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{
                            background: isActive
                              ? `hsla(${s.color}, 50%, 60%, 0.9)`
                              : `hsla(${s.color}, 30%, 45%, 0.4)`,
                            boxShadow: isActive ? `0 0 6px hsla(${s.color}, 50%, 50%, 0.4)` : "none",
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px]" style={{ color: isActive ? P.goldLight : P.text }}>
                            {s.name}
                          </p>
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
              <div
                className="flex items-center gap-2 mx-3 mb-2 px-3 py-2 rounded-xl"
                style={{ background: "hsla(200, 20%, 20%, 0.2)" }}
              >
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
                  {/* Utilization bar */}
                  <div
                    className="mt-1 h-[3px] rounded-full overflow-hidden"
                    style={{ background: "hsla(200, 15%, 30%, 0.3)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(cacheStats.utilization * 100, 100)}%`,
                        background: cacheStats.utilization > 0.8
                          ? "hsl(0, 50%, 55%)"
                          : "hsl(200, 50%, 55%)",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Volume */}
            <div
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderTop: `1px solid ${P.border}` }}
            >
              <button
                onClick={() => setMuted((m) => !m)}
                className="w-6 h-6 flex items-center justify-center"
                style={{ color: muted ? P.textDim : P.textMuted }}
              >
                {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={muted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  if (muted) setMuted(false);
                }}
                className="flex-1 h-1 appearance-none rounded-full cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${P.goldMuted} ${(muted ? 0 : volume) * 100}%, hsla(30, 8%, 30%, 0.4) ${(muted ? 0 : volume) * 100}%)`,
                }}
              />
              <span className="text-[11px] tabular-nums w-8 text-right" style={{ color: P.textDim }}>
                {Math.round((muted ? 0 : volume) * 100)}%
              </span>
            </div>

            {/* Stratum Histogram Visualizer */}
            <StratumVisualizer
              playing={playing}
              stationHue={station.color}
              visible={showVisualizer && (playing || loading)}
              onFrame={handleFrame}
            />

            {/* Curvature Time-Series */}
            <CurvatureTimeSeries
              visible={showCurvature && (playing || loading)}
              stationHue={station.color}
              frame={currentFrame}
            />

            {/* Genre Fingerprint Radar */}
            <GenreRadar
              visible={showGenre && (playing || loading)}
              stationHue={station.color}
              frame={currentFrame}
            />

            {/* Observable Space — 7 UOR Metrics */}
            <ObservableSpaceRadar
              visible={showObservable && (playing || loading)}
              stationHue={station.color}
              frame={currentFrame}
            />

            {/* Holonomy — Tonal Drift Ring */}
            <HolonomyVisualizer
              visible={showHolonomy && (playing || loading)}
              stationHue={station.color}
              frame={currentFrame}
            />
          </motion.div>
        ) : (
          // ── Collapsed Pill ──────────────────────────────────────────
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
            {/* Breathing glow ring when playing */}
            <AnimatePresence>
              {playing && (
                <motion.div
                  key="glow-ring"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    inset: -4,
                    border: `1.5px solid hsla(${station.color}, 40%, 55%, 0.25)`,
                    animation: "ambient-glow-breathe 3s ease-in-out infinite",
                  }}
                />
              )}
            </AnimatePresence>
            {/* Drag grip */}
            <div
              className="flex items-center justify-center pl-2 pr-0.5 py-2.5 cursor-grab active:cursor-grabbing"
              {...drag.handlers}
              title="Drag to reposition"
            >
              <GripVertical className="w-3 h-3 opacity-40" style={{ color: P.textMuted }} />
            </div>
            <button
              onClick={() => { if (!drag.wasDragged()) setExpanded(true); }}
              className="flex items-center gap-2.5 pr-4 py-2.5"
              title="Ambient music (⌘⇧A)"
            >
              {playing || loading ? (
                <>
                  {/* Breathing equalizer */}
                  <div className="flex items-end gap-[2px] h-3.5">
                    {[0.5, 0.9, 0.65, 0.4].map((h, i) => (
                      <div
                        key={i}
                        className="w-[2px] rounded-full"
                        style={{
                          height: `${h * 14}px`,
                          background: `hsla(${station.color}, 50%, 60%, ${loading ? 0.4 : 0.8})`,
                          animation: loading
                            ? `ambient-eq 0.8s ease-in-out infinite alternate`
                            : `ambient-eq ${0.6 + i * 0.15}s ease-in-out infinite alternate`,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-[12px] font-medium" style={{ color: P.text }}>
                    {loading ? "Connecting…" : station.name}
                  </span>
                  {playing && cacheStats.entries > 0 && (
                    <span
                      className="text-[10px] tabular-nums px-1.5 py-0.5 rounded-full"
                      style={{
                        color: "hsl(200, 40%, 65%)",
                        background: "hsla(200, 30%, 25%, 0.35)",
                      }}
                      title={`${cacheStats.entries} content-addressed segments in memory (${(cacheStats.totalBytes / (1024 * 1024)).toFixed(1)} MB)`}
                    >
                      {cacheStats.entries}⬡
                    </span>
                  )}
                </>
              ) : (
                <>
                  <Music className="w-3.5 h-3.5" style={{ color: P.goldMuted }} />
                  <span className="text-[12px]" style={{ color: P.textMuted }}>
                    Ambient
                  </span>
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Equalizer keyframes ──────────────────────────────────────────────────
const eqStyle = document.createElement("style");
eqStyle.textContent = `
  @keyframes ambient-eq {
    0% { transform: scaleY(0.4); }
    100% { transform: scaleY(1); }
  }
  @keyframes ambient-glow-breathe {
    0%, 100% { opacity: 0.7; }
    50% { opacity: 1; }
  }
`;
if (!document.querySelector("[data-ambient-eq]")) {
  eqStyle.setAttribute("data-ambient-eq", "");
  document.head.appendChild(eqStyle);
}
