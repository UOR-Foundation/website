/**
 * Whisper Mel Spectrogram — Audio Preprocessing
 * ═══════════════════════════════════════════════
 *
 * Converts raw PCM audio (16kHz mono Float32) into an 80-channel
 * log-mel spectrogram matching OpenAI Whisper's feature extraction.
 *
 * Pure TypeScript — no external dependencies.
 * Matches: openai/whisper feature_extractor.py
 *
 * @module uns/core/hologram/whisper-compiler/mel-spectrogram
 */

// ── Whisper Audio Constants ────────────────────────────────────────────────

export const SAMPLE_RATE = 16000;
export const N_FFT = 400;
export const HOP_LENGTH = 160;
export const N_MELS = 80;
export const CHUNK_LENGTH = 30; // seconds
export const N_SAMPLES = CHUNK_LENGTH * SAMPLE_RATE; // 480000
/** Max mel frames = N_SAMPLES / HOP_LENGTH = 3000 */
export const N_FRAMES = N_SAMPLES / HOP_LENGTH;

// FFT is zero-padded to next power of 2
const FFT_SIZE = 512;
const N_FREQS = FFT_SIZE / 2 + 1; // 257

// ── Hann Window ────────────────────────────────────────────────────────────

function hannWindow(length: number): Float32Array {
  const w = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / length));
  }
  return w;
}

// ── Radix-2 Cooley-Tukey FFT (in-place) ───────────────────────────────────

function fft(real: Float32Array, imag: Float32Array): void {
  const n = real.length;

  // Bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    while (j & bit) {
      j ^= bit;
      bit >>= 1;
    }
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }

  // Butterfly stages
  for (let len = 2; len <= n; len *= 2) {
    const halfLen = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wReal = Math.cos(angle);
    const wImag = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let curReal = 1;
      let curImag = 0;

      for (let j = 0; j < halfLen; j++) {
        const a = i + j;
        const b = a + halfLen;
        const tReal = real[b] * curReal - imag[b] * curImag;
        const tImag = real[b] * curImag + imag[b] * curReal;

        real[b] = real[a] - tReal;
        imag[b] = imag[a] - tImag;
        real[a] += tReal;
        imag[a] += tImag;

        // Rotate twiddle factor
        const nextReal = curReal * wReal - curImag * wImag;
        curImag = curReal * wImag + curImag * wReal;
        curReal = nextReal;
      }
    }
  }
}

// ── Mel Filterbank ─────────────────────────────────────────────────────────

function hzToMel(hz: number): number {
  return 2595 * Math.log10(1 + hz / 700);
}

function melToHz(mel: number): number {
  return 700 * (10 ** (mel / 2595) - 1);
}

/**
 * Build triangular mel filterbank matrix [N_MELS × N_FREQS].
 * Matches librosa's mel filterbank (used by Whisper).
 */
function buildMelFilterbank(): Float32Array[] {
  const melLow = hzToMel(0);
  const melHigh = hzToMel(SAMPLE_RATE / 2);

  // N_MELS + 2 evenly spaced points in mel space
  const melPoints = new Float32Array(N_MELS + 2);
  for (let i = 0; i < N_MELS + 2; i++) {
    melPoints[i] = melLow + ((melHigh - melLow) * i) / (N_MELS + 1);
  }

  // Convert back to Hz then to FFT bin indices
  const binFreqs = new Float32Array(N_MELS + 2);
  for (let i = 0; i < N_MELS + 2; i++) {
    binFreqs[i] = (melToHz(melPoints[i]) * FFT_SIZE) / SAMPLE_RATE;
  }

  const filters: Float32Array[] = [];
  for (let m = 0; m < N_MELS; m++) {
    const filter = new Float32Array(N_FREQS);
    const lo = binFreqs[m];
    const mid = binFreqs[m + 1];
    const hi = binFreqs[m + 2];

    for (let k = 0; k < N_FREQS; k++) {
      if (k >= lo && k <= mid && mid > lo) {
        filter[k] = (k - lo) / (mid - lo);
      } else if (k >= mid && k <= hi && hi > mid) {
        filter[k] = (hi - k) / (hi - mid);
      }
    }

    // Slaney normalization (matches librosa norm='slaney')
    const melWidth = melToHz(melPoints[m + 2]) - melToHz(melPoints[m]);
    if (melWidth > 0) {
      const norm = 2.0 / melWidth;
      for (let k = 0; k < N_FREQS; k++) {
        filter[k] *= norm;
      }
    }

    filters.push(filter);
  }

  return filters;
}

// Cache the filterbank — it's constant
let _cachedFilterbank: Float32Array[] | null = null;

function getMelFilterbank(): Float32Array[] {
  if (!_cachedFilterbank) {
    _cachedFilterbank = buildMelFilterbank();
  }
  return _cachedFilterbank;
}

// ── STFT + Mel Spectrogram ─────────────────────────────────────────────────

/**
 * Compute log-mel spectrogram from raw PCM audio.
 *
 * Input:  Float32Array of 16kHz mono PCM samples (any length, padded/trimmed to 30s)
 * Output: Float32Array of shape [N_MELS × N_FRAMES] = [80 × 3000] row-major
 *
 * The output matches OpenAI Whisper's preprocessing:
 *   log_spec = log10(max(mel, 1e-10))
 *   log_spec = max(log_spec, log_spec.max() - 8.0)
 *   log_spec = (log_spec + 4.0) / 4.0
 */
export function computeMelSpectrogram(audio: Float32Array): Float32Array {
  const start = performance.now();

  // Pad or trim to exactly 30 seconds
  const padded = new Float32Array(N_SAMPLES);
  const copyLen = Math.min(audio.length, N_SAMPLES);
  padded.set(audio.subarray(0, copyLen));

  const window = hannWindow(N_FFT);
  const filters = getMelFilterbank();
  const nFrames = N_FRAMES; // 3000

  // Output: [N_MELS, nFrames] row-major
  const mel = new Float32Array(N_MELS * nFrames);

  // Reusable FFT buffers
  const real = new Float32Array(FFT_SIZE);
  const imag = new Float32Array(FFT_SIZE);

  for (let frame = 0; frame < nFrames; frame++) {
    const start = frame * HOP_LENGTH;

    // Apply window and zero-pad to FFT_SIZE
    real.fill(0);
    imag.fill(0);
    for (let i = 0; i < N_FFT && start + i < N_SAMPLES; i++) {
      real[i] = padded[start + i] * window[i];
    }

    // In-place FFT
    fft(real, imag);

    // Power spectrum → mel filterbank
    for (let m = 0; m < N_MELS; m++) {
      let sum = 0;
      const f = filters[m];
      for (let k = 0; k < N_FREQS; k++) {
        const power = real[k] * real[k] + imag[k] * imag[k];
        sum += f[k] * power;
      }
      mel[m * nFrames + frame] = sum;
    }
  }

  // Log-mel with Whisper-specific normalization
  // Step 1: log10(max(mel, 1e-10))
  for (let i = 0; i < mel.length; i++) {
    mel[i] = Math.log10(Math.max(mel[i], 1e-10));
  }

  // Step 2: clamp to max - 8.0
  let maxVal = -Infinity;
  for (let i = 0; i < mel.length; i++) {
    if (mel[i] > maxVal) maxVal = mel[i];
  }
  for (let i = 0; i < mel.length; i++) {
    mel[i] = Math.max(mel[i], maxVal - 8.0);
  }

  // Step 3: normalize to [-1, 1] range
  for (let i = 0; i < mel.length; i++) {
    mel[i] = (mel[i] + 4.0) / 4.0;
  }

  const elapsed = Math.round(performance.now() - start);
  console.log(
    `[MelSpectrogram] Computed ${N_MELS}×${nFrames} in ${elapsed}ms ` +
    `(${copyLen} samples, ${(copyLen / SAMPLE_RATE).toFixed(1)}s audio)`
  );

  return mel;
}

/**
 * Resample audio from any sample rate to 16kHz.
 * Uses simple linear interpolation.
 */
export function resampleTo16kHz(
  audio: Float32Array,
  sourceSampleRate: number,
): Float32Array {
  if (sourceSampleRate === SAMPLE_RATE) return audio;

  const ratio = SAMPLE_RATE / sourceSampleRate;
  const outputLength = Math.round(audio.length * ratio);
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const srcIdx = i / ratio;
    const lo = Math.floor(srcIdx);
    const hi = Math.min(lo + 1, audio.length - 1);
    const frac = srcIdx - lo;
    output[i] = audio[lo] * (1 - frac) + audio[hi] * frac;
  }

  return output;
}
