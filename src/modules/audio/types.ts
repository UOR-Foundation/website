/**
 * Audio Module — Runtime Types
 * ═══════════════════════════════════════════════════════════════════
 *
 * Concrete data shapes for the audio: namespace runtime.
 * These are plain objects (not interfaces with methods) for serialization.
 *
 * @module audio/types
 * @namespace audio/
 */

/** Audio sample format descriptor. */
export interface AudioFormatDescriptor {
  bitsPerSample: number;
  channels: number;
  sampleRate: number;
  codec: string;
}

/** A content-addressed audio frame (analysis window). */
export interface AudioFrameData {
  frameIndex: number;
  frameSize: number;
  duration: number;
  offsetSeconds: number;
  frameCid: string;
  stratumHistogram: number[];
  meanStratum: number;
  peakAmplitude: number;
  rmsEnergy: number;
  zeroCrossingRate: number;
  spectralCentroid: number;
}

/** An extracted audio feature. */
export interface AudioFeatureData {
  featureId: string;
  label: string;
  value: number;
  confidence: number;
  unit: string;
  frameRange: [number, number];
  lensId: string;
  derivationId: string;
}

/** A content-addressed audio segment for streaming. */
export interface AudioSegmentData {
  segmentIndex: number;
  segmentCid: string;
  duration: number;
  byteOffset: number;
  byteLength: number;
  bitrate: number;
  frameCids: string[];
  cached: boolean;
}

/** A complete audio track record. */
export interface AudioTrackRecord {
  trackCid: string;
  uorAddress: string;
  ipv6Address: string;
  title: string;
  artist: string;
  album: string;
  durationSeconds: number;
  format: AudioFormatDescriptor;
  segments: AudioSegmentData[];
  features: AudioFeatureData[];
  derivationId: string;
  sourceUri: string;
  genres: string[];
  ingestedAt: string;
}

/** Segment cache entry with content-addressed key. */
export interface SegmentCacheEntry {
  segmentCid: string;
  data: ArrayBuffer;
  cachedAt: number;
  accessCount: number;
  lastAccessedAt: number;
  byteLength: number;
}

/** Audio engine state. */
export type AudioEngineState =
  | "idle"
  | "loading"
  | "buffering"
  | "playing"
  | "paused"
  | "error";

/** Audio engine events. */
export interface AudioEngineEvents {
  stateChange: (state: AudioEngineState) => void;
  frameAnalyzed: (frame: AudioFrameData) => void;
  segmentCached: (segment: AudioSegmentData) => void;
  trackLoaded: (track: AudioTrackRecord) => void;
  featureExtracted: (feature: AudioFeatureData) => void;
  error: (error: Error) => void;
}
