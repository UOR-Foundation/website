/**
 * Audio Frame Analyzer — Ring-Native DSP
 * ═══════════════════════════════════════════════════════════════════
 *
 * Extracts UOR-native features from audio frames WITHOUT external
 * DSP libraries. Every metric maps to ring arithmetic:
 *
 *   stratum (popcount) → energy distribution
 *   spectrum (bit positions) → harmonic partials
 *   curvature (frame deltas) → tension/resolution
 *
 * @module audio/frame-analyzer
 * @namespace audio/
 */

import type { AudioFrameData } from "./types";

/**
 * Compute the popcount (Hamming weight) of a 16-bit integer.
 * This IS the stratum in UOR ring arithmetic.
 */
function popcount16(x: number): number {
  x = x - ((x >> 1) & 0x5555);
  x = (x & 0x3333) + ((x >> 2) & 0x3333);
  x = (x + (x >> 4)) & 0x0f0f;
  return (x + (x >> 8)) & 0x1f;
}

/**
 * Compute bit positions set in a 16-bit integer.
 * This IS the spectrum in UOR ring arithmetic.
 */
function bitPositions16(x: number): number[] {
  const positions: number[] = [];
  for (let i = 0; i < 16; i++) {
    if (x & (1 << i)) positions.push(i);
  }
  return positions;
}

/**
 * Analyze a raw PCM audio frame (Float32Array from Web Audio API)
 * and produce a UOR-native AudioFrameData.
 *
 * @param samples  Float32 PCM samples [-1, 1]
 * @param frameIndex  Index of this frame in the track
 * @param sampleRate  Sample rate (Hz)
 * @param offsetSeconds  Time offset from track start
 */
export function analyzeFrame(
  samples: Float32Array,
  frameIndex: number,
  sampleRate: number,
  offsetSeconds: number,
): AudioFrameData {
  const frameSize = samples.length;
  const duration = frameSize / sampleRate;

  // Convert float samples to 16-bit integers for ring analysis
  let peakAmplitude = 0;
  let rmsSum = 0;
  let zeroCrossings = 0;
  const stratumHistogram = new Array(17).fill(0); // 0-16 possible strata for 16-bit

  for (let i = 0; i < frameSize; i++) {
    const floatSample = samples[i];
    const absSample = Math.abs(floatSample);

    // Peak
    if (absSample > peakAmplitude) peakAmplitude = absSample;

    // RMS
    rmsSum += floatSample * floatSample;

    // Zero crossings
    if (i > 0 && ((samples[i - 1] >= 0) !== (floatSample >= 0))) {
      zeroCrossings++;
    }

    // Convert to unsigned 16-bit for ring analysis
    const int16 = Math.round((floatSample + 1) * 32767.5) & 0xffff;
    const stratum = popcount16(int16);
    stratumHistogram[stratum]++;
  }

  const rmsEnergy = Math.sqrt(rmsSum / frameSize);
  const zeroCrossingRate = zeroCrossings / frameSize;
  const meanStratum = stratumHistogram.reduce((sum, count, idx) => sum + count * idx, 0) / frameSize;

  // Spectral centroid approximation from zero-crossing rate
  // ZCR ≈ 2 * f_centroid / sampleRate for band-limited signals
  const spectralCentroid = (zeroCrossingRate * sampleRate) / 2;

  // Frame CID placeholder — will be computed by canonical pipeline
  const frameCid = `frame:${frameIndex}:pending`;

  return {
    frameIndex,
    frameSize,
    duration,
    offsetSeconds,
    frameCid,
    stratumHistogram,
    meanStratum,
    peakAmplitude,
    rmsEnergy,
    zeroCrossingRate,
    spectralCentroid,
  };
}

/**
 * Compute curvature between two adjacent frames.
 * Maps to UOR CurvatureObservable — measures the rate of
 * change in spectral energy distribution.
 *
 * High curvature = chord change, drop, transition.
 * Low curvature = sustained texture, drone.
 */
export function frameCurvature(a: AudioFrameData, b: AudioFrameData): number {
  let deltaSum = 0;
  const len = Math.min(a.stratumHistogram.length, b.stratumHistogram.length);
  for (let i = 0; i < len; i++) {
    const diff = (b.stratumHistogram[i] || 0) - (a.stratumHistogram[i] || 0);
    deltaSum += diff * diff;
  }
  // Normalize by frame size
  const norm = Math.max(a.frameSize, b.frameSize, 1);
  return Math.sqrt(deltaSum) / norm;
}

/**
 * Detect catastrophe threshold crossing between frames.
 * Maps to UOR CatastropheObservable — a sudden discontinuity
 * in the energy landscape (a "drop" in musical terms).
 *
 * @returns ratio of energy change; > 2.0 is catastrophic
 */
export function frameCatastrophe(a: AudioFrameData, b: AudioFrameData): number {
  if (a.rmsEnergy < 0.001) return b.rmsEnergy > 0.01 ? Infinity : 0;
  return b.rmsEnergy / a.rmsEnergy;
}
