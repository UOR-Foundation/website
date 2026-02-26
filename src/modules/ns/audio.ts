/**
 * audio/ — Canonical Namespace Barrel
 *
 * Content-addressed audio: ring-native DSP, segment caching,
 * and frame analysis for the Hologram audio experience.
 *
 * @namespace audio/
 */

export {
  analyzeFrame,
  frameCurvature,
  frameCatastrophe,
  AudioSegmentCache,
  globalSegmentCache,
  STATIONS,
} from "@/modules/audio";

export type {
  AudioFormatDescriptor,
  AudioFrameData,
  AudioFeatureData,
  AudioSegmentData,
  AudioTrackRecord,
  SegmentCacheEntry,
  AudioEngineState,
  AudioEngineEvents,
  SegmentCacheConfig,
  AmbientStation,
  AmbientState,
} from "@/modules/audio";
