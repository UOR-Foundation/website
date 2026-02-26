/**
 * audio module barrel export.
 *
 * @namespace audio/
 * @version 3.0.0 — derivation chain upgrade
 */

// Types
export type {
  AudioFormatDescriptor,
  AudioFrameData,
  AudioFeatureData,
  AudioSegmentData,
  AudioTrackRecord,
  SegmentCacheEntry,
  AudioEngineState,
  AudioEngineEvents,
} from "./types";

// Segment cache
export { AudioSegmentCache, globalSegmentCache } from "./segment-cache";
export type { SegmentCacheConfig } from "./segment-cache";

// Frame analyzer (ring-native DSP)
export { analyzeFrame, frameCurvature, frameCatastrophe } from "./frame-analyzer";

// Audio engine (HLS + native streaming)
export { AudioEngine, getAudioEngine } from "./engine";
export type { AudioEngineConfig } from "./engine";

// Lenses (v2 — with derivation chains)
export { HarmonicLens } from "./lenses/harmonic-lens";
export type { HarmonicLensFrame } from "./lenses/harmonic-lens";
export { CurvatureLens } from "./lenses/curvature-lens";
export type { CurvaturePoint, CatastropheEvent, CurvatureLensState } from "./lenses/curvature-lens";
export { HolonomyLens } from "./lenses/holonomy-lens";
export type { HolonomyPoint, HolonomyLoop, HolonomyLensState } from "./lenses/holonomy-lens";
export { GenreFingerprint, GENRE_REGIONS } from "./lenses/genre-fingerprint";
export type { GenreCoordinate, GenreClassification, GenreRegion } from "./lenses/genre-fingerprint";

// Services
export { FeatureAggregator, generateTrackCid, persistAnalysis, loadFeatures, hasPersistedFeatures, persistRawFeatures } from "./services/feature-persistence";
export type { PersistedTrack, AggregatedFeatures } from "./services/feature-persistence";

// Stations data
export { STATIONS } from "./stations";
export type { AmbientStation } from "./stations";

// Hooks
export { useAmbientPlayer } from "./hooks/useAmbientPlayer";
export type { AmbientState, AmbientPlayerControls } from "./hooks/useAmbientPlayer";
