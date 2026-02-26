/**
 * audio module barrel export.
 *
 * @namespace audio/
 * @version 1.0.0
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
