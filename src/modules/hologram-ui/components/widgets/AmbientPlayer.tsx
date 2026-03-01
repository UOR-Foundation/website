/**
 * AmbientPlayer — Clean, Minimal Floating Music Player
 * ═════════════════════════════════════════════════════
 *
 * Rebuilt for reliability: plays SomaFM streams directly via HTMLAudioElement.
 * No proxy dependency, no HLS overhead. Just music.
 *
 * @module hologram-ui/components/AmbientPlayer
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music, Pause, Play, Volume2, VolumeX, ChevronDown, GripVertical } from "lucide-react";
import { useDraggablePosition } from "@/modules/hologram-ui/hooks/useDraggablePosition";
import { STATIONS, type AmbientStation } from "@/modules/audio/stations";
import { P } from "@/modules/hologram-ui/theme/palette";

// ── Types ──────────────────────────────────────────────────────────────

export interface AmbientState {
  playing: boolean;
  loading: boolean;
  stationHue: string;
  stationName: string;
}

interface AmbientPlayerProps {
  lumenOffset?: number;
  onStateChange?: (state: AmbientState) => void;
}

// ── Persistence ────────────────────────────────────────────────────────

const STORAGE_KEY = "hologram-ambient-prefs";

function loadPrefs(): { stationId: string; volume: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { stationId: STATIONS[0].id, volume: 0.63 };
}

function savePrefs(stationId: string, volume: number) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ stationId, volume })); } catch {}
}

// ── Component ──────────────────────────────────────────────────────────

export default function AmbientPlayer({ lumenOffset = 0, onStateChange }: AmbientPlayerProps) {
  const prefs = useRef(loadPrefs());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [station, setStation] = useState<AmbientStation>(
    () => STATIONS.find((s) => s.id === prefs.current.stationId) ?? STATIONS[0],
  );
  const [volume, setVolume] = useState(() => prefs.current.volume);
  const [muted, setMuted] = useState(false);
  const pillRef = useRef<HTMLDivElement>(null);

  const drag = useDraggablePosition({
    storageKey: "hologram-pos:ambient",
    defaultPos: { x: 20, y: typeof window !== "undefined" ? window.innerHeight - 70 : 700 },
    snapSize: { width: 160, height: 40 },
  });

  // Persist prefs
  useEffect(() => { savePrefs(station.id, volume); }, [station, volume]);

  // Report state to parent
  useEffect(() => {
    onStateChange?.({ playing, loading, stationHue: station.color, stationName: station.name });
  }, [playing, loading, station, onStateChange]);

  // Sync volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume;
    }
  }, [volume, muted]);

  // Close on outside click
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (pillRef.current && !pillRef.current.contains(e.target as Node)) setExpanded(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [expanded]);

  // ── Playback ─────────────────────────────────────────────────────────

  const playStation = useCallback((s: AmbientStation) => {
    // Stop current
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
    }

    setStation(s);
    setLoading(true);
    setPlaying(false);

    // Create fresh audio element for reliability
    const audio = new Audio();
    audio.preload = "none";
    audio.volume = muted ? 0 : volume;
    
    audio.addEventListener("playing", () => {
      setLoading(false);
      setPlaying(true);
    });
    audio.addEventListener("waiting", () => setLoading(true));
    audio.addEventListener("error", (e) => {
      console.warn("[AmbientPlayer] Playback error:", e);
      setLoading(false);
      setPlaying(false);
    });

    audioRef.current = audio;
    audio.src = s.streamUrl;
    audio.load();
    audio.play().catch((err) => {
      console.warn("[AmbientPlayer] Play failed:", err);
      setLoading(false);
    });
  }, [volume, muted]);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (playing || loading) {
      audio?.pause();
      setPlaying(false);
      setLoading(false);
    } else {
      playStation(station);
    }
  }, [playing, loading, station, playStation]);

  // Ctrl+Shift+; shortcut (safe, no browser collision)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === ":") {
        e.preventDefault();
        togglePlayback();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [togglePlayback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <div ref={pillRef} className="fixed z-[55]" style={{ left: drag.pos.x, top: drag.pos.y, touchAction: "none", userSelect: "none" }}>
      <AnimatePresence mode="wait">
        {expanded ? (
          <ExpandedPanel
            playing={playing}
            loading={loading}
            station={station}
            volume={volume}
            muted={muted}
            drag={drag}
            onTogglePlayback={togglePlayback}
            onSelectStation={playStation}
            onSetVolume={setVolume}
            onSetMuted={setMuted}
            onCollapse={() => setExpanded(false)}
          />
        ) : (
          <CollapsedPill
            playing={playing}
            loading={loading}
            station={station}
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
  playing, loading, station, volume, muted, drag,
  onTogglePlayback, onSelectStation, onSetVolume, onSetMuted, onCollapse,
}: {
  playing: boolean; loading: boolean; station: AmbientStation;
  volume: number; muted: boolean;
  drag: ReturnType<typeof useDraggablePosition>;
  onTogglePlayback: () => void;
  onSelectStation: (s: AmbientStation) => void;
  onSetVolume: (v: number) => void;
  onSetMuted: (m: boolean) => void;
  onCollapse: () => void;
}) {
  return (
    <motion.div
      key="expanded"
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="w-[260px] rounded-2xl overflow-hidden"
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        background: "hsla(25, 10%, 12%, 0.55)",
        backdropFilter: "blur(40px) saturate(1.4)",
        WebkitBackdropFilter: "blur(40px) saturate(1.4)",
        border: `1px solid hsla(38, 20%, 80%, 0.1)`,
        boxShadow: "0 8px 40px hsla(0, 0%, 0%, 0.3), inset 0 1px 0 hsla(38, 25%, 90%, 0.07)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 cursor-grab active:cursor-grabbing" {...drag.handlers}>
        <div className="flex items-center gap-2">
          <GripVertical className="w-3.5 h-3.5 opacity-40" style={{ color: P.textMuted }} />
          <Music className="w-4 h-4" style={{ color: P.goldMuted }} />
          <span className="text-[14px] font-medium tracking-wide" style={{ fontFamily: P.font, color: P.text }}>Ambient</span>
        </div>
        <button onClick={onCollapse} className="w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:bg-white/[0.08]" style={{ color: P.textMuted }}>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Station List */}
      <div className="px-3 pb-2">
        {(["focus", "nature"] as const).map((cat) => (
          <div key={cat} className="mb-2">
            <p className="text-[11px] tracking-[0.16em] uppercase px-1 py-1.5 font-medium" style={{ color: P.textDim }}>
              {cat === "focus" ? "Focus & Flow" : "Nature & Calm"}
            </p>
            {STATIONS.filter((s) => s.category === cat).map((s) => {
              const isActive = station.id === s.id && (playing || loading);
              return (
                <button
                  key={s.id}
                  onClick={() => onSelectStation(s)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all hover:bg-white/[0.05] group"
                  style={{ background: isActive ? `hsla(${s.color}, 25%, 30%, 0.12)` : "transparent" }}
                >
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all" style={{
                    background: isActive ? `hsla(${s.color}, 50%, 60%, 0.9)` : `hsla(${s.color}, 30%, 45%, 0.4)`,
                    boxShadow: isActive ? `0 0 8px hsla(${s.color}, 50%, 50%, 0.4)` : "none",
                  }} />
                  <span className="text-[13px] flex-1" style={{ color: isActive ? P.goldLight : P.text }}>{s.name}</span>
                  {isActive && loading && (
                    <span className="text-[10px]" style={{ color: P.textDim }}>connecting…</span>
                  )}
                  {isActive && playing && (
                    <EqBars hue={s.color} />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Volume */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderTop: `1px solid ${P.border}` }}>
        <button
          onClick={() => onSetMuted(!muted)}
          className="w-6 h-6 flex items-center justify-center transition-colors"
          style={{ color: muted ? P.textDim : P.textMuted }}
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
        <input
          type="range" min={0} max={1} step={0.01}
          value={muted ? 0 : volume}
          onChange={(e) => { onSetVolume(parseFloat(e.target.value)); if (muted) onSetMuted(false); }}
          className="flex-1 h-1.5 appearance-none rounded-full cursor-pointer"
          style={{ background: `linear-gradient(to right, ${P.goldMuted} ${(muted ? 0 : volume) * 100}%, hsla(30, 8%, 30%, 0.4) ${(muted ? 0 : volume) * 100}%)` }}
        />
        <span className="text-[12px] tabular-nums w-9 text-right font-medium" style={{ color: P.textDim }}>{Math.round((muted ? 0 : volume) * 100)}%</span>
      </div>
    </motion.div>
  );
}

// ── Collapsed Pill ─────────────────────────────────────────────────────

function CollapsedPill({
  playing, loading, station, drag, onExpand,
}: {
  playing: boolean; loading: boolean; station: AmbientStation;
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
        background: "hsla(25, 10%, 12%, 0.5)",
        backdropFilter: "blur(36px) saturate(1.4)",
        WebkitBackdropFilter: "blur(36px) saturate(1.4)",
        border: `1px solid hsla(38, 20%, 80%, 0.08)`,
        boxShadow: "0 4px 20px hsla(0, 0%, 0%, 0.2), inset 0 1px 0 hsla(38, 25%, 90%, 0.06)",
      }}
    >
      <AnimatePresence>
        {playing && (
          <motion.div
            key="glow-ring"
            initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="absolute rounded-full pointer-events-none"
            style={{ inset: -4, border: `1.5px solid hsla(${station.color}, 40%, 55%, 0.25)`, animation: "ambient-glow-breathe 1.94s ease-in-out infinite" }}
          />
        )}
      </AnimatePresence>
      <div className="flex items-center justify-center pl-2 pr-0.5 py-2.5 cursor-grab active:cursor-grabbing" {...drag.handlers} title="Drag to reposition">
        <GripVertical className="w-3 h-3 opacity-40" style={{ color: P.textMuted }} />
      </div>
      <button onClick={onExpand} className="flex items-center gap-2.5 pr-4 py-2.5" title="Ambient music (⌘⇧A)">
        {playing || loading ? (
          <>
            <EqBars hue={station.color} loading={loading} />
            <span className="text-[12px] font-medium" style={{ color: P.text }}>{loading ? "Connecting…" : station.name}</span>
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

// ── Helpers ────────────────────────────────────────────────────────────

function EqBars({ hue, loading }: { hue: string; loading?: boolean }) {
  const heights = [0.5, 0.9, 0.65, 0.4];
  return (
    <div className="flex items-end gap-[2px]" style={{ height: 14 }}>
      {heights.map((v, i) => (
        <div key={i} className="rounded-full" style={{
          width: 2,
          height: `${v * 14}px`,
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
    @keyframes ambient-glow-breathe { 0%, 100% { opacity: 0.7; } 13% { opacity: 1; } 26% { opacity: 0.75; } 39% { opacity: 0.95; } 52% { opacity: 0.7; } }
  `;
  document.head.appendChild(s);
}
