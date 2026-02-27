/**
 * AudioCaptureWorklet — GPU-compositor-thread audio capture
 * ═══════════════════════════════════════════════════════════
 *
 * Runs on the dedicated AudioWorklet thread (not main thread),
 * eliminating jank and delivering perfectly timed PCM samples.
 *
 * Messages:
 *   port → main: { type: 'pcm', samples: Float32Array }
 *   port → main: { type: 'level', level: number }  (0..1)
 *   port → main: { type: 'silence', duration: number }  (seconds of consecutive silence)
 *
 * Config (via processorOptions):
 *   silenceThreshold: RMS below which = silence (default 0.01)
 *   silenceAutoStopSec: seconds of silence before posting 'silence' event (default 1.5)
 */
class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const opts = options?.processorOptions ?? {};
    this._silenceThreshold = opts.silenceThreshold ?? 0.01;
    this._silenceAutoStopSec = opts.silenceAutoStopSec ?? 1.5;
    this._silentFrames = 0;
    this._hasSentSilence = false;
    this._frameCount = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0] || input[0].length === 0) return true;

    const samples = input[0];

    // Send PCM data to main thread
    this.port.postMessage({ type: 'pcm', samples: new Float32Array(samples) });

    // Compute RMS for level metering
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    const rms = Math.sqrt(sum / samples.length);

    // Send level every ~4 frames (~85ms at 128 samples/frame @ 48kHz)
    this._frameCount++;
    if (this._frameCount % 4 === 0) {
      this.port.postMessage({ type: 'level', level: Math.min(rms * 5, 1) });
    }

    // VAD: track consecutive silence
    if (rms < this._silenceThreshold) {
      // Each frame is 128 samples; at sampleRate Hz that's 128/sampleRate seconds
      this._silentFrames++;
      const silenceSec = (this._silentFrames * 128) / sampleRate;

      if (silenceSec >= this._silenceAutoStopSec && !this._hasSentSilence) {
        this.port.postMessage({ type: 'silence', duration: silenceSec });
        this._hasSentSilence = true;
      }
    } else {
      this._silentFrames = 0;
      this._hasSentSilence = false;
    }

    return true;
  }
}

registerProcessor('audio-capture-processor', AudioCaptureProcessor);
