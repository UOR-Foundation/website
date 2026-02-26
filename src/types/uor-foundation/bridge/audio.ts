/**
 * UOR Foundation v2.0.0 — bridge::audio
 *
 * Canonical audio types: content-addressed audio data as ring elements.
 * Music IS ring arithmetic — samples are datums, frames are triads,
 * tracks are derivation chains.
 *
 * @see Phase 1 of Hologram Audio Architecture
 * @namespace audio/
 */

/**
 * AudioSampleFormat — bit depth and encoding of audio samples.
 */
export interface AudioSampleFormat {
  /** Bits per sample (8, 16, 24, 32). Maps to UOR quantum level. */
  bitsPerSample(): number;
  /** Number of channels (1=mono, 2=stereo). */
  channels(): number;
  /** Sample rate in Hz (44100, 48000, 96000). */
  sampleRate(): number;
  /** Encoding codec identifier (e.g., "pcm", "mp3", "aac", "flac", "opus"). */
  codec(): string;
}

/**
 * AudioDatum — a single audio sample as a UOR ring element.
 *
 * Every audio sample is a datum in Z/(2^n)Z where n = bitsPerSample.
 * The stratum (popcount) correlates with amplitude energy.
 * The spectrum (bit positions) reveals harmonic partials.
 *
 * This is the atomic unit of the audio: namespace.
 */
export interface AudioDatum {
  /** Raw sample value in the ring. */
  value(): number;
  /** Quantum level (= bitsPerSample - 1). */
  quantum(): number;
  /** Channel index (0 = left, 1 = right). */
  channel(): number;
  /** Sample index within the parent frame. */
  sampleIndex(): number;
  /** Popcount / Hamming weight — correlates with energy. */
  stratum(): number;
  /** Bit positions set — reveals harmonic structure. */
  spectrum(): number[];
}

/**
 * AudioFrame — a windowed collection of AudioDatums.
 *
 * Analogous to a Triad: aggregates datum-level metrics across
 * a fixed window (typically 2048 or 4096 samples) for analysis.
 * Each frame is content-addressed via its aggregate hash.
 */
export interface AudioFrame {
  /** Frame index within the parent track. */
  frameIndex(): number;
  /** Number of samples in this frame. */
  frameSize(): number;
  /** Duration of this frame in seconds. */
  duration(): number;
  /** Timestamp offset from track start (seconds). */
  offsetSeconds(): number;
  /** Content-addressed identifier (CID) of this frame's data. */
  frameCid(): string;
  /** Aggregate stratum histogram — spectral energy distribution. */
  stratumHistogram(): number[];
  /** Mean stratum across all samples — average energy. */
  meanStratum(): number;
  /** Peak amplitude (max absolute sample value). */
  peakAmplitude(): number;
  /** RMS energy level. */
  rmsEnergy(): number;
  /** Zero-crossing rate — correlates with brightness/noisiness. */
  zeroCrossingRate(): number;
  /** Spectral centroid — perceived "brightness" (Hz). */
  spectralCentroid(): number;
}

/**
 * AudioFeature — an extracted observable from audio analysis.
 *
 * Maps to UOR CascadeObservable: each feature is a measurable
 * property extracted through a specific lens projection.
 */
export interface AudioFeature {
  /** Feature type identifier (e.g., "bpm", "key", "spectral_centroid"). */
  featureId(): string;
  /** Human-readable label. */
  label(): string;
  /** Numeric value of the feature. */
  value(): number;
  /** Confidence score [0, 1]. */
  confidence(): number;
  /** Unit of measurement (e.g., "Hz", "BPM", "dB"). */
  unit(): string;
  /** Frame range this feature was extracted from. */
  frameRange(): [number, number];
  /** The lens that produced this feature. */
  lensId(): string;
  /** Derivation ID linking to the extraction proof. */
  derivationId(): string;
}

/**
 * AudioSegment — a content-addressed chunk of audio for streaming.
 *
 * HLS/DASH segment mapped to the UOR address space. Each segment
 * is independently verifiable and cacheable by its CID.
 */
export interface AudioSegment {
  /** Segment index in the stream. */
  segmentIndex(): number;
  /** Content-addressed identifier. */
  segmentCid(): string;
  /** Duration in seconds. */
  duration(): number;
  /** Byte offset in the source stream. */
  byteOffset(): number;
  /** Byte length of this segment. */
  byteLength(): number;
  /** Bitrate of this segment (kbps). */
  bitrate(): number;
  /** Ordered frame CIDs contained in this segment. */
  frameCids(): string[];
  /** Whether this segment has been cached locally. */
  cached(): boolean;
}

/**
 * AudioTrack — a complete audio object with canonical identity.
 *
 * The top-level container: metadata + ordered segments + derivation chain.
 * Every track has a single UOR canonical identity derived from its content.
 */
export interface AudioTrack {
  /** Track canonical identifier (CIDv1 of content hash). */
  trackCid(): string;
  /** UOR address (Braille glyph). */
  uorAddress(): string;
  /** IPv6 content address. */
  ipv6Address(): string;
  /** Human-readable title. */
  title(): string;
  /** Artist / creator. */
  artist(): string;
  /** Album or collection. */
  album(): string;
  /** Total duration in seconds. */
  durationSeconds(): number;
  /** Sample format specification. */
  format(): AudioSampleFormat;
  /** Ordered segments composing this track. */
  segments(): AudioSegment[];
  /** Extracted features (populated by lens analysis). */
  features(): AudioFeature[];
  /** Derivation ID of the canonical ingest. */
  derivationId(): string;
  /** Source URI (stream URL, file path, etc.). */
  sourceUri(): string;
  /** Genre tags (may be empty until lens analysis). */
  genres(): string[];
  /** Timestamp of canonical ingest. */
  ingestedAt(): string;
}

/**
 * AudioLensProjection — result of projecting audio through a lens.
 *
 * Captures the lens identity, input track, and extracted features
 * as a verifiable derivation.
 */
export interface AudioLensProjection {
  /** Which lens produced this projection. */
  lensId(): string;
  /** Input track CID. */
  trackCid(): string;
  /** Derivation ID of this projection. */
  derivationId(): string;
  /** Features extracted by this lens. */
  features(): AudioFeature[];
  /** Frame-level detail (optional, for visualization). */
  frameAnalysis(): Array<{
    frameIndex: number;
    frameCid: string;
    values: Record<string, number>;
  }>;
  /** Epistemic grade of the analysis. */
  epistemicGrade(): string;
  /** Timestamp. */
  timestamp(): string;
}
