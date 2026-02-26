/**
 * useAmbientPlayer — Headless playback hook
 * ══════════════════════════════════════════
 *
 * All playback logic, state management, persistence, and frame
 * aggregation in a single hook. The UI component becomes a pure shell.
 *
 * @module audio/hooks/useAmbientPlayer
 * @namespace audio/
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { getAudioEngine } from "../engine";
import { FeatureAggregator, generateTrackCid, persistAnalysis } from "../services/feature-persistence";
import { STATIONS, type AmbientStation } from "../stations";
import type { AudioEngineState } from "../types";
import type { HarmonicLensFrame } from "../lenses/harmonic-lens";

// ── Prefs ───────────────────────────────────────────────────────────────

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

// ── Types ───────────────────────────────────────────────────────────────

export interface AmbientState {
  playing: boolean;
  loading: boolean;
  stationHue: string;
  stationName: string;
}

export interface AmbientPlayerControls {
  // State
  playing: boolean;
  loading: boolean;
  station: AmbientStation;
  volume: number;
  muted: boolean;
  currentFrame: HarmonicLensFrame | null;
  cacheStats: { entries: number; totalBytes: number; maxBytes: number; utilization: number };

  // Actions
  togglePlayback: () => void;
  selectStation: (s: AmbientStation) => void;
  setVolume: (v: number) => void;
  setMuted: (m: boolean) => void;
  handleFrame: (frame: HarmonicLensFrame) => void;

  // Audio element (for StratumVisualizer connection)
  getAudioElement: () => HTMLAudioElement;
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useAmbientPlayer(
  onStateChange?: (state: AmbientState) => void,
): AmbientPlayerControls {
  const prefs = useRef(loadPrefs());
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [station, setStation] = useState<AmbientStation>(
    () => STATIONS.find((s) => s.id === prefs.current.stationId) ?? STATIONS[0],
  );
  const [volume, setVolumeState] = useState(() => prefs.current.volume);
  const [muted, setMuted] = useState(false);
  const [currentFrame, setCurrentFrame] = useState<HarmonicLensFrame | null>(null);
  const [cacheStats, setCacheStats] = useState({ entries: 0, totalBytes: 0, maxBytes: 1, utilization: 0 });
  const engineRef = useRef(getAudioEngine());
  const aggregatorRef = useRef(new FeatureAggregator());

  // Persist prefs
  useEffect(() => { savePrefs(station.id, volume); }, [station, volume]);

  // Report state to parent
  useEffect(() => {
    onStateChange?.({ playing, loading, stationHue: station.color, stationName: station.name });
  }, [playing, loading, station, onStateChange]);

  // Engine state listener
  useEffect(() => {
    const engine = engineRef.current;
    engine.setVolume(volume);
    return engine.onStateChange((state: AudioEngineState) => {
      switch (state) {
        case "playing": setLoading(false); setPlaying(true); break;
        case "loading": case "buffering": setLoading(true); break;
        case "paused": case "idle": setPlaying(false); setLoading(false); break;
        case "error": setPlaying(false); setLoading(false); break;
      }
    });
  }, []);

  // Poll cache stats
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

  // Frame handler
  const handleFrame = useCallback((frame: HarmonicLensFrame) => {
    setCurrentFrame(frame);
    aggregatorRef.current.push(frame);
  }, []);

  // Persist analysis
  const persistCurrentAnalysis = useCallback(async (s: AmbientStation) => {
    const agg = aggregatorRef.current;
    if (agg.frameCount < 30) return;
    const trackCid = await generateTrackCid(s.streamUrl);
    const features = agg.aggregate(trackCid);
    persistAnalysis(
      { trackCid, title: s.name, artist: "SomaFM", sourceUri: s.streamUrl, format: { codec: "mp3", sampleRate: 44100 }, genres: [s.category] },
      features,
    ).catch(() => {});
  }, []);

  const playStation = useCallback((s: AmbientStation) => {
    if (playing) persistCurrentAnalysis(station);
    aggregatorRef.current.reset();
    setCurrentFrame(null);
    setStation(s);
    setLoading(true);
    setPlaying(false);
    engineRef.current.play(s.streamUrl);
  }, [playing, station, persistCurrentAnalysis]);

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

  // ⌘+Shift+A shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        if (playing || loading) togglePlayback();
        else playStation(station);
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [playing, loading, togglePlayback, playStation, station]);

  return {
    playing, loading, station, volume, muted, currentFrame, cacheStats,
    togglePlayback,
    selectStation: playStation,
    setVolume: setVolumeState,
    setMuted,
    handleFrame,
    getAudioElement: () => engineRef.current.getAudioElement(),
  };
}
